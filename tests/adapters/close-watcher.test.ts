import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  CloseWatcherAdapter,
  supportsCloseWatcher,
} from '../../src/core/adapters/close-watcher';

// Mock CloseWatcher since jsdom doesn't implement it
class MockCloseWatcher extends EventTarget {
  static instances: MockCloseWatcher[] = [];

  oncancel: ((ev: Event) => void) | null = null;
  onclose: ((ev: Event) => void) | null = null;
  destroyed = false;

  constructor() {
    super();
    MockCloseWatcher.instances.push(this);
  }

  requestClose(): void {
    const cancelEvent = new Event('cancel', { cancelable: true });
    this.oncancel?.(cancelEvent);
    this.dispatchEvent(cancelEvent);

    if (!cancelEvent.defaultPrevented) {
      const closeEvent = new Event('close');
      this.onclose?.(closeEvent);
      this.dispatchEvent(closeEvent);
    }
  }

  close(): void {
    const closeEvent = new Event('close');
    this.onclose?.(closeEvent);
    this.dispatchEvent(closeEvent);
  }

  destroy(): void {
    this.destroyed = true;
    this.oncancel = null;
    this.onclose = null;
  }
}

describe('CloseWatcherAdapter', () => {
  beforeEach(() => {
    MockCloseWatcher.instances = [];
    // Install mock CloseWatcher on globalThis
    (globalThis as Record<string, unknown>).CloseWatcher =
      MockCloseWatcher as unknown as typeof CloseWatcher;
  });

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).CloseWatcher;
  });

  it('should create a CloseWatcher on activate', () => {
    const adapter = new CloseWatcherAdapter();
    adapter.activate(vi.fn());

    expect(MockCloseWatcher.instances).toHaveLength(1);
  });

  it('should call onDismiss when close event fires', () => {
    const adapter = new CloseWatcherAdapter();
    const onDismiss = vi.fn();
    adapter.activate(onDismiss);

    const watcher = MockCloseWatcher.instances[0];
    watcher.close();

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should call onDismiss on requestClose when not cancelled', () => {
    const adapter = new CloseWatcherAdapter();
    const onDismiss = vi.fn();
    adapter.activate(onDismiss);

    const watcher = MockCloseWatcher.instances[0];
    watcher.requestClose();

    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('should not call onDismiss when cancel prevents close', () => {
    const adapter = new CloseWatcherAdapter();
    const onDismiss = vi.fn();
    const onCancel = vi.fn().mockReturnValue(false);

    adapter.activate(onDismiss, onCancel);

    const watcher = MockCloseWatcher.instances[0];

    // Manually trigger cancel with preventDefault
    const cancelEvent = new Event('cancel', { cancelable: true });
    watcher.dispatchEvent(cancelEvent);

    // The adapter's cancel listener should have been called
    expect(onCancel).toHaveBeenCalled();
  });

  it('should destroy the watcher on deactivate', () => {
    const adapter = new CloseWatcherAdapter();
    adapter.activate(vi.fn());

    const watcher = MockCloseWatcher.instances[0];
    adapter.deactivate();

    expect(watcher.destroyed).toBe(true);
  });

  it('should be idempotent — multiple deactivate calls are safe', () => {
    const adapter = new CloseWatcherAdapter();
    adapter.activate(vi.fn());

    adapter.deactivate();
    adapter.deactivate();
    adapter.deactivate();

    // Should not throw
    expect(MockCloseWatcher.instances).toHaveLength(1);
    expect(MockCloseWatcher.instances[0].destroyed).toBe(true);
  });

  it('should not call onDismiss after deactivate', () => {
    const adapter = new CloseWatcherAdapter();
    const onDismiss = vi.fn();
    adapter.activate(onDismiss);

    const watcher = MockCloseWatcher.instances[0];
    adapter.deactivate();

    // Try to fire close after deactivation
    const closeEvent = new Event('close');
    watcher.dispatchEvent(closeEvent);

    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('should be idempotent — multiple activate calls are safe', () => {
    const adapter = new CloseWatcherAdapter();
    const onDismiss = vi.fn();
    adapter.activate(onDismiss);
    adapter.activate(onDismiss); // Should not create a second watcher

    expect(MockCloseWatcher.instances).toHaveLength(1);
  });
});

describe('supportsCloseWatcher', () => {
  afterEach(() => {
    delete (globalThis as Record<string, unknown>).CloseWatcher;
  });

  it('should return true when CloseWatcher is available', () => {
    (globalThis as Record<string, unknown>).CloseWatcher = MockCloseWatcher;
    expect(supportsCloseWatcher()).toBe(true);
  });

  it('should return false when CloseWatcher is not available', () => {
    delete (globalThis as Record<string, unknown>).CloseWatcher;
    expect(supportsCloseWatcher()).toBe(false);
  });
});
