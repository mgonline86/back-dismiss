import type { Adapter } from '../types';

/**
 * Adapter that uses the W3C CloseWatcher API.
 *
 * CloseWatcher intercepts platform "close" signals:
 * - Android: hardware/gesture back button
 * - Desktop: Escape key
 *
 * This adapter does NOT modify the browser's history stack,
 * keeping the URL and navigation state completely clean.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher
 * @internal
 */
export class CloseWatcherAdapter implements Adapter {
  private watcher: CloseWatcher | null = null;
  private active = false;

  activate(
    onDismiss: () => void,
    onCancel?: () => boolean | Promise<boolean>,
  ): void {
    if (this.active) return;

    if (typeof globalThis === 'undefined' || !('CloseWatcher' in globalThis)) {
      throw new Error(
        '[back-dismiss] CloseWatcher API is not available in this browser.',
      );
    }

    this.watcher = new CloseWatcher();
    this.active = true;

    this.watcher.addEventListener('close', () => {
      if (!this.active) return;
      this.active = false;
      this.watcher = null;
      onDismiss();
    });

    if (onCancel) {
      this.watcher.addEventListener('cancel', (event) => {
        const result = onCancel();
        // CloseWatcher cancel event requires synchronous preventDefault.
        // If the callback returns false synchronously, prevent the close.
        if (result === false) {
          event.preventDefault();
        }
      });
    }
  }

  deactivate(): void {
    if (!this.active) return;
    this.active = false;
    this.watcher?.destroy();
    this.watcher = null;
  }

  destroy(): void {
    this.deactivate();
  }
}

/**
 * Check whether the current environment supports the CloseWatcher API.
 */
export function supportsCloseWatcher(): boolean {
  return typeof globalThis !== 'undefined' && 'CloseWatcher' in globalThis;
}
