import type {
  BackDismissOptions,
  BackDismissEntry,
  BackDismissConfig,
  Adapter,
} from './types';
import {
  CloseWatcherAdapter,
  supportsCloseWatcher,
} from './adapters/close-watcher';
import { HistoryAdapter } from './adapters/history';

// ---------------------------------------------------------------------------
// Internal state
// ---------------------------------------------------------------------------

type PushArg = (() => void) | BackDismissOptions;

interface StackEntry {
  id: string;
  adapter: Adapter;
  options: BackDismissOptions;
}

let config: BackDismissConfig = {
  adapter: 'auto',
  preventAppExit: false,
};

const stack: StackEntry[] = [];
let idCounter = 0;
let isDismissing = false;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function createAdapter(depth: number): Adapter {
  const preference = config.adapter ?? 'auto';

  if (
    preference === 'close-watcher' ||
    (preference === 'auto' && supportsCloseWatcher())
  ) {
    try {
      return new CloseWatcherAdapter();
    } catch {
      // CloseWatcher construction failed — fall through to history
      if (preference === 'close-watcher') {
        throw new Error(
          '[back-dismiss] CloseWatcher adapter was explicitly requested but is not available.',
        );
      }
    }
  }

  return new HistoryAdapter(depth);
}

function normalizeOptions(arg: PushArg): BackDismissOptions {
  if (typeof arg === 'function') {
    return { onClose: arg };
  }
  return arg;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Push an overlay onto the back-dismiss stack.
 *
 * When the user presses the back button (or Escape), the **topmost** overlay's
 * `onClose` callback is invoked.
 *
 * @param arg - A close callback function, or a full options object.
 * @returns A handle that can be used to manually dismiss the overlay.
 *
 * @example
 * ```js
 * // Simple — just a callback
 * BackDismiss.push(() => modal.close());
 *
 * // Full options
 * const entry = BackDismiss.push({
 *   onClose: () => modal.close(),
 *   onCancel: () => confirm('Discard changes?'),
 *   id: 'edit-modal',
 * });
 *
 * // Later: manual dismiss
 * entry.dismiss();
 * ```
 */
function push(arg: PushArg): BackDismissEntry {
  const options = normalizeOptions(arg);
  const id = options.id ?? `bd-${++idCounter}`;
  const depth = stack.length + 1;
  const adapter = createAdapter(depth);

  const entry: StackEntry = { id, adapter, options };
  stack.push(entry);

  const handleDismiss = () => {
    // Remove this entry from the stack (it might already be removed)
    const idx = stack.indexOf(entry);
    if (idx !== -1) {
      stack.splice(idx, 1);
    }
    // Guard: if onClose calls pop(), it should be a no-op since
    // the entry was already removed by the back button.
    isDismissing = true;
    options.onClose();
    isDismissing = false;
  };

  adapter.activate(handleDismiss, options.onCancel);

  return {
    id,
    dismiss: () => pop(id),
  };
}

/**
 * Pop the topmost overlay from the stack, or a specific one by ID.
 *
 * This should be called when the overlay is closed normally by the user
 * (e.g., clicking X, clicking the backdrop, etc.) to clean up the
 * back-dismiss entry.
 *
 * If the overlay was already closed by a back-button press, calling `pop()`
 * is a safe no-op.
 *
 * @param id - Optional ID to remove a specific entry. If omitted, removes the topmost.
 */
function pop(id?: string): void {
  // If called inside an onClose triggered by the back button,
  // the entry was already removed — skip to avoid popping the next one.
  if (isDismissing) return;

  let entry: StackEntry | undefined;

  if (id) {
    const idx = stack.findIndex((e) => e.id === id);
    if (idx !== -1) {
      entry = stack[idx];
      stack.splice(idx, 1);
    }
  } else {
    entry = stack.pop();
  }

  if (entry) {
    entry.adapter.deactivate();
  }
}

/**
 * Get the current stack depth (number of active overlay entries).
 */
function depth(): number {
  return stack.length;
}

/**
 * Update global configuration.
 *
 * @example
 * ```js
 * BackDismiss.configure({ adapter: 'history', preventAppExit: true });
 * ```
 */
function configure(newConfig: Partial<BackDismissConfig>): void {
  config = { ...config, ...newConfig };
}

/**
 * Clear all entries from the stack. Useful during route changes
 * or full-page transitions to ensure a clean state.
 */
function clear(): void {
  // Deactivate in reverse order (LIFO)
  while (stack.length > 0) {
    const entry = stack.pop()!;
    entry.adapter.deactivate();
  }
}

/**
 * The main BackDismiss manager.
 *
 * A singleton that manages a LIFO stack of overlay entries. Each entry
 * represents an open overlay (modal, drawer, sidebar, etc.) that should
 * be dismissed when the user presses the back button or Escape key.
 *
 * @example
 * ```js
 * import { BackDismiss } from 'back-dismiss';
 *
 * // When opening an overlay
 * BackDismiss.push(() => closeMyModal());
 *
 * // When closing normally (X button, backdrop click)
 * BackDismiss.pop();
 * ```
 */
export const BackDismiss = {
  push,
  pop,
  depth,
  configure,
  clear,
} as const;

export type { PushArg };
