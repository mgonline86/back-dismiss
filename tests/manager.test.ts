import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BackDismiss } from '../src/core/manager';

describe('BackDismiss Manager', () => {
  let pushStateSpy: ReturnType<typeof vi.spyOn>;
  let backSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Force history adapter (no CloseWatcher in jsdom)
    BackDismiss.configure({ adapter: 'history' });
    BackDismiss.clear();

    pushStateSpy = vi.spyOn(window.history, 'pushState');
    backSpy = vi.spyOn(window.history, 'back').mockImplementation(() => {});
  });

  afterEach(() => {
    BackDismiss.clear();
    vi.restoreAllMocks();
  });

  describe('push()', () => {
    it('should accept a function shorthand', () => {
      const onClose = vi.fn();
      const entry = BackDismiss.push(onClose);

      expect(entry).toBeDefined();
      expect(entry.id).toBeTruthy();
      expect(typeof entry.dismiss).toBe('function');
    });

    it('should accept a full options object', () => {
      const entry = BackDismiss.push({
        onClose: vi.fn(),
        id: 'test-modal',
      });

      expect(entry.id).toBe('test-modal');
    });

    it('should auto-generate IDs when not provided', () => {
      const entry1 = BackDismiss.push(vi.fn());
      const entry2 = BackDismiss.push(vi.fn());

      expect(entry1.id).not.toBe(entry2.id);
      expect(entry1.id).toMatch(/^bd-\d+$/);
    });

    it('should increase stack depth', () => {
      expect(BackDismiss.depth()).toBe(0);

      BackDismiss.push(vi.fn());
      expect(BackDismiss.depth()).toBe(1);

      BackDismiss.push(vi.fn());
      expect(BackDismiss.depth()).toBe(2);
    });

    it('should push a history state', () => {
      BackDismiss.push(vi.fn());
      expect(pushStateSpy).toHaveBeenCalledOnce();
    });
  });

  describe('pop()', () => {
    it('should decrease stack depth', () => {
      BackDismiss.push(vi.fn());
      BackDismiss.push(vi.fn());
      expect(BackDismiss.depth()).toBe(2);

      BackDismiss.pop();
      expect(BackDismiss.depth()).toBe(1);

      BackDismiss.pop();
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should be a no-op on empty stack', () => {
      expect(BackDismiss.depth()).toBe(0);
      BackDismiss.pop(); // Should not throw
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should pop by ID', () => {
      const entry1 = BackDismiss.push({
        onClose: vi.fn(),
        id: 'first',
      });
      const entry2 = BackDismiss.push({
        onClose: vi.fn(),
        id: 'second',
      });

      // Pop the first (not top) entry
      BackDismiss.pop('first');
      expect(BackDismiss.depth()).toBe(1);

      // The remaining entry should be 'second'
      BackDismiss.pop();
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should ignore non-existent IDs', () => {
      BackDismiss.push(vi.fn());
      BackDismiss.pop('non-existent');
      expect(BackDismiss.depth()).toBe(1);
    });
  });

  describe('entry.dismiss()', () => {
    it('should remove the entry from the stack', () => {
      const entry = BackDismiss.push(vi.fn());
      expect(BackDismiss.depth()).toBe(1);

      entry.dismiss();
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should be idempotent', () => {
      const entry = BackDismiss.push(vi.fn());
      entry.dismiss();
      entry.dismiss(); // Should not throw
      expect(BackDismiss.depth()).toBe(0);
    });
  });

  describe('clear()', () => {
    it('should remove all entries', () => {
      BackDismiss.push(vi.fn());
      BackDismiss.push(vi.fn());
      BackDismiss.push(vi.fn());
      expect(BackDismiss.depth()).toBe(3);

      BackDismiss.clear();
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should be safe on empty stack', () => {
      BackDismiss.clear(); // Should not throw
      expect(BackDismiss.depth()).toBe(0);
    });
  });

  describe('back button simulation (popstate)', () => {
    it('should call onClose when back button fires', () => {
      const onClose = vi.fn();
      BackDismiss.push(onClose);

      // Simulate back: set state to depth 0 and fire popstate
      Object.defineProperty(window.history, 'state', {
        value: {},
        writable: true,
        configurable: true,
      });
      window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));

      expect(onClose).toHaveBeenCalledOnce();
      expect(BackDismiss.depth()).toBe(0);
    });

    it('should close only the topmost overlay (LIFO)', () => {
      const onClose1 = vi.fn();
      const onClose2 = vi.fn();

      BackDismiss.push(onClose1);
      BackDismiss.push(onClose2);

      // Simulate back: go from depth 2 to depth 1
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

      expect(onClose2).toHaveBeenCalledOnce();
      expect(onClose1).not.toHaveBeenCalled();
      expect(BackDismiss.depth()).toBe(1);
    });
  });

  describe('configure()', () => {
    it('should merge config', () => {
      BackDismiss.configure({ preventAppExit: true });
      // No direct way to read config, but it should not throw
    });

    it('should allow switching adapters', () => {
      BackDismiss.configure({ adapter: 'history' });
      const entry = BackDismiss.push(vi.fn());
      expect(entry).toBeDefined();
      entry.dismiss();
    });
  });
});
