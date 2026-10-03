import type { Adapter } from '../types';

/**
 * Key used in `history.state` to track back-dismiss stack depth.
 * Prefixed with double underscore to avoid collisions with user state.
 * @internal
 */
const BD_STATE_KEY = '__back_dismiss_depth';

/**
 * Adapter that uses the History API (pushState / popstate).
 *
 * This is the universal fallback that works in ALL browsers.
 * When activated, it pushes a dummy history entry. When the user
 * presses back, `popstate` fires and we close the overlay.
 *
 * Key design decisions:
 * - Merges with existing `window.history.state` to avoid breaking
 *   framework routers (Next.js, Nuxt, etc.)
 * - Uses a guard flag (`isDeactivating`) to prevent infinite loops
 *   when `history.back()` is called programmatically during cleanup.
 * - Tracks depth to correctly handle nested overlays.
 *
 * @internal
 */
export class HistoryAdapter implements Adapter {
  private popstateHandler: ((e: PopStateEvent) => void) | null = null;
  private isDeactivating = false;
  private active = false;
  private readonly depth: number;

  constructor(depth: number) {
    this.depth = depth;
  }

  activate(
    onDismiss: () => void,
    onCancel?: () => boolean | Promise<boolean>,
  ): void {
    if (this.active) return;
    if (typeof window === 'undefined') return; // SSR guard

    this.active = true;

    // Merge with existing state to preserve framework router state
    const existingState = window.history.state ?? {};
    window.history.pushState(
      { ...existingState, [BD_STATE_KEY]: this.depth },
      '',
    );

    this.popstateHandler = (_event: PopStateEvent) => {
      // Ignore events triggered by our own deactivate() call
      if (this.isDeactivating) return;
      if (!this.active) return;

      const currentDepth = window.history.state?.[BD_STATE_KEY] ?? 0;

      // The user pressed back — our depth entry was popped
      if (currentDepth < this.depth) {
        if (onCancel) {
          const result = onCancel();

          if (result instanceof Promise) {
            result.then((allowed) => {
              if (allowed === false) {
                // Re-push to "undo" the back navigation
                this.rePush();
              } else {
                this.active = false;
                onDismiss();
              }
            });
            return;
          }

          if (result === false) {
            // Re-push to "undo" the back navigation
            this.rePush();
            return;
          }
        }

        this.active = false;
        onDismiss();
      }
    };

    window.addEventListener('popstate', this.popstateHandler);
  }

  deactivate(): void {
    if (!this.active) return;
    if (typeof window === 'undefined') return; // SSR guard

    this.active = false;
    this.isDeactivating = true;

    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }

    // Pop our history entry if it's still the current one
    const currentDepth = window.history.state?.[BD_STATE_KEY] ?? 0;
    if (currentDepth === this.depth) {
      window.history.back();
    }

    // Reset the guard flag after the popstate from history.back() fires
    // Use a microtask + timeout to handle both sync and async browser behavior
    Promise.resolve().then(() => {
      setTimeout(() => {
        this.isDeactivating = false;
      }, 0);
    });
  }

  destroy(): void {
    this.deactivate();
  }

  /**
   * Re-push the history entry after a cancelled back navigation.
   * This effectively "undoes" the back press.
   */
  private rePush(): void {
    const existingState = window.history.state ?? {};
    window.history.pushState(
      { ...existingState, [BD_STATE_KEY]: this.depth },
      '',
    );
  }
}
