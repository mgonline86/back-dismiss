import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { HistoryAdapter } from '../../src/core/adapters/history';

describe('HistoryAdapter', () => {
  let originalState: unknown;
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalState = window.history.state;
    pushStateSpy = vi.spyOn(window.history, 'pushState');
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    // Restore original state
    window.history.replaceState(originalState, '');
  });

  it('should push a history state on activate', () => {
    const adapter = new HistoryAdapter(1);
    const onDismiss = vi.fn();

    adapter.activate(onDismiss);

    expect(pushStateSpy).toHaveBeenCalledOnce();
    const pushedState = pushStateSpy.mock.calls[0][0];
    expect(pushedState).toHaveProperty('__back_dismiss_depth', 1);
  });

  it('should preserve existing history.state when pushing', () => {
    // Simulate a framework router state
    window.history.replaceState({ __NEXT_DATA__: { foo: 'bar' } }, '');

    const adapter = new HistoryAdapter(1);
    adapter.activate(vi.fn());

    const pushedState = pushStateSpy.mock.calls[0][0];
    expect(pushedState).toHaveProperty('__NEXT_DATA__');
    expect(pushedState.__NEXT_DATA__).toEqual({ foo: 'bar' });
    expect(pushedState).toHaveProperty('__back_dismiss_depth', 1);
  });

  it('should add a popstate listener on activate', () => {
    const adapter = new HistoryAdapter(1);
    adapter.activate(vi.fn());

    expect(addEventSpy).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function),
    );
  });

  it('should call onDismiss when popstate fires with lower depth', () => {
    const adapter = new HistoryAdapter(1);
    const onDismiss = vi.fn();

    adapter.activate(onDismiss);

    // Simulate back button: state goes to no back-dismiss depth
    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should not call onDismiss when popstate fires with same or higher depth', () => {
    const adapter = new HistoryAdapter(1);
    const onDismiss = vi.fn();

    adapter.activate(onDismiss);

    // Simulate forward or same-level navigation
    Object.defineProperty(window.history, 'state', {
      value: { __back_dismiss_depth: 2 },
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(
      new PopStateEvent('popstate', {
        state: { __back_dismiss_depth: 2 },
      }),
    );

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should remove listener and call history.back() on deactivate', () => {
    const adapter = new HistoryAdapter(1);
    adapter.activate(vi.fn());

    // Set current state to match our depth
    Object.defineProperty(window.history, 'state', {
      value: { __back_dismiss_depth: 1 },
      writable: true,
      configurable: true,
    });

    adapter.deactivate();

    expect(removeEventSpy).toHaveBeenCalledWith(
      'popstate',
      expect.any(Function),
    );
    expect(backSpy).toHaveBeenCalledOnce();
  });

  it('should not call history.back() on deactivate if state already popped', () => {
    const adapter = new HistoryAdapter(1);
    adapter.activate(vi.fn());

    // State was already popped by the browser (back button was pressed)
    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });

    adapter.deactivate();

    expect(backSpy).not.toHaveBeenCalled();
  });

  it('should be idempotent — multiple deactivate calls are safe', () => {
    const adapter = new HistoryAdapter(1);
    adapter.activate(vi.fn());

    Object.defineProperty(window.history, 'state', {
      value: { __back_dismiss_depth: 1 },
      writable: true,
      configurable: true,
    });

    adapter.deactivate();
    adapter.deactivate();
    adapter.deactivate();

    // history.back() should only be called once
    expect(backSpy).toHaveBeenCalledOnce();
  });

  it('should re-push state when onCancel returns false', () => {
    const adapter = new HistoryAdapter(1);
    const onDismiss = vi.fn();
    const onCancel = vi.fn().mockReturnValue(false);

    adapter.activate(onDismiss, onCancel);

    // Simulate back button press
    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onDismiss).not.toHaveBeenCalled();
    // Should re-push to "undo" the back navigation
    expect(pushStateSpy).toHaveBeenCalledTimes(2); // Initial push + re-push
  });

  it('should call onDismiss when onCancel returns true', () => {
    const adapter = new HistoryAdapter(1);
    const onDismiss = vi.fn();
    const onCancel = vi.fn().mockReturnValue(true);

    adapter.activate(onDismiss, onCancel);

    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

    expect(onCancel).toHaveBeenCalledOnce();
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should handle multiple adapters at different depths', () => {
    const adapter1 = new HistoryAdapter(1);
    const adapter2 = new HistoryAdapter(2);
    const onDismiss1 = vi.fn();
    const onDismiss2 = vi.fn();

    adapter1.activate(onDismiss1);
    adapter2.activate(onDismiss2);

    // Simulate back from depth 2 to depth 1
    Object.defineProperty(window.history, 'state', {
      value: { __back_dismiss_depth: 1 },
      writable: true,
      configurable: true,
    });

    window.dispatchEvent(
      new PopStateEvent('popstate', {
        state: { __back_dismiss_depth: 1 },
      }),
    );

    expect(onDismiss2).toHaveBeenCalledOnce();
    expect(onDismiss1).not.toHaveBeenCalled();

    adapter1.deactivate();
    adapter2.deactivate();
  });
});
