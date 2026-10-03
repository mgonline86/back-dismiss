import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBackDismiss } from '../../src/react/use-back-dismiss';
import { BackDismiss } from '../../src/core/manager';

describe('useBackDismiss', () => {
  beforeEach(() => {
    BackDismiss.configure({ adapter: 'history' });
    BackDismiss.clear();
    vi.spyOn(window.history, 'pushState');
    vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    BackDismiss.clear();
    vi.restoreAllMocks();
  });

  it('should push to stack when isOpen becomes true', () => {
    expect(BackDismiss.depth()).toBe(0);

    renderHook(() => useBackDismiss(true, vi.fn()));

    expect(BackDismiss.depth()).toBe(1);
  });

  it('should not push to stack when isOpen is false', () => {
    renderHook(() => useBackDismiss(false, vi.fn()));

    expect(BackDismiss.depth()).toBe(0);
  });

  it('should clean up when isOpen becomes false', () => {
    const { rerender } = renderHook(
      ({ isOpen }) => useBackDismiss(isOpen, vi.fn()),
      { initialProps: { isOpen: true } },
    );

    expect(BackDismiss.depth()).toBe(1);

    rerender({ isOpen: false });

    expect(BackDismiss.depth()).toBe(0);
  });

  it('should clean up on unmount', () => {
    const { unmount } = renderHook(() => useBackDismiss(true, vi.fn()));

    expect(BackDismiss.depth()).toBe(1);

    unmount();

    expect(BackDismiss.depth()).toBe(0);
  });

  it('should call onClose when back button fires', () => {
    const onClose = vi.fn();
    renderHook(() => useBackDismiss(true, onClose));

    // Simulate back button
    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('should use the latest onClose callback (ref stability)', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    const { rerender } = renderHook(
      ({ onClose }) => useBackDismiss(true, onClose),
      { initialProps: { onClose: onClose1 } },
    );

    // Update the callback
    rerender({ onClose: onClose2 });

    // Stack should still be depth 1 (not re-pushed)
    expect(BackDismiss.depth()).toBe(1);

    // Simulate back — should call the latest callback
    Object.defineProperty(window.history, 'state', {
      value: {},
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
    });

    expect(onClose1).not.toHaveBeenCalled();
    expect(onClose2).toHaveBeenCalledOnce();
  });

  it('should accept options with id', () => {
    renderHook(() =>
      useBackDismiss(true, vi.fn(), { id: 'test-modal' }),
    );

    expect(BackDismiss.depth()).toBe(1);
  });

  it('should handle rapid open/close toggling', () => {
    const onClose = vi.fn();
    const { rerender } = renderHook(
      ({ isOpen }) => useBackDismiss(isOpen, onClose),
      { initialProps: { isOpen: false } },
    );

    // Rapid toggling
    rerender({ isOpen: true });
    expect(BackDismiss.depth()).toBe(1);

    rerender({ isOpen: false });
    expect(BackDismiss.depth()).toBe(0);

    rerender({ isOpen: true });
    expect(BackDismiss.depth()).toBe(1);

    rerender({ isOpen: false });
    expect(BackDismiss.depth()).toBe(0);
  });

  it('should handle multiple hooks simultaneously', () => {
    const onClose1 = vi.fn();
    const onClose2 = vi.fn();

    renderHook(() => useBackDismiss(true, onClose1, { id: 'modal-1' }));
    renderHook(() => useBackDismiss(true, onClose2, { id: 'modal-2' }));

    expect(BackDismiss.depth()).toBe(2);
  });
});
