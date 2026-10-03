/**
 * Options for pushing an overlay onto the back-dismiss stack.
 */
export interface BackDismissOptions {
  /**
   * Called when the user presses the back button or Escape key.
   * This callback must close the overlay.
   */
  onClose: () => void;

  /**
   * Called before closing. Return `false` (or a Promise resolving to `false`)
   * to prevent the close — useful for "Discard unsaved changes?" prompts.
   *
   * Note: When using the CloseWatcher adapter, only synchronous return values
   * are supported (async cancel cannot preventDefault synchronously).
   */
  onCancel?: () => boolean | Promise<boolean>;

  /**
   * Optional identifier for debugging and targeted removal.
   */
  id?: string;
}

/**
 * Handle returned by `BackDismiss.push()`. Use it to manually dismiss
 * the overlay or check its identity.
 */
export interface BackDismissEntry {
  /** Manually dismiss this overlay entry (cleans up adapters). */
  dismiss: () => void;

  /** The ID of this entry (user-provided or auto-generated). */
  readonly id: string;
}

/**
 * Global configuration for the BackDismiss manager.
 */
export interface BackDismissConfig {
  /**
   * Preferred adapter strategy.
   * - `'auto'` — Use CloseWatcher if available, else History API (recommended).
   * - `'close-watcher'` — Force CloseWatcher (throws if unavailable).
   * - `'history'` — Force History API.
   * @default 'auto'
   */
  adapter?: 'auto' | 'close-watcher' | 'history';

  /**
   * Prevent the app from exiting when `history.length <= 1`.
   * Useful for standalone PWAs where a back press on the last entry
   * would exit the app.
   * @default false
   */
  preventAppExit?: boolean;
}

/**
 * Internal adapter interface. Each adapter manages a single overlay's
 * relationship with the browser's "back" mechanism.
 * @internal
 */
export interface Adapter {
  /** Start intercepting back actions. */
  activate(
    onDismiss: () => void,
    onCancel?: () => boolean | Promise<boolean>,
  ): void;

  /** Stop intercepting and clean up (called on normal UI close). */
  deactivate(): void;

  /** Full teardown — called when the entry is removed from the stack. */
  destroy(): void;
}
