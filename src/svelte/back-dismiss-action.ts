import { BackDismiss } from '../core/manager';
import type { BackDismissEntry, BackDismissOptions } from '../core/types';

/**
 * Svelte action that makes the mobile back button (and Escape key) close your overlay.
 *
 * Apply it to any element inside an `{#if}` block. When the element mounts,
 * it registers a back-dismiss handler. When it unmounts, the handler is cleaned up.
 *
 * @param node - The DOM element (provided automatically by Svelte).
 * @param onClose - Callback that closes the overlay, or an options object.
 *
 * @example Basic usage (Svelte 4)
 * ```svelte
 * <script>
 *   import { backDismiss } from 'back-dismiss/svelte';
 *   let open = false;
 * </script>
 *
 * {#if open}
 *   <div use:backDismiss={() => open = false} class="modal">
 *     <h2>Hello!</h2>
 *     <button on:click={() => open = false}>Close</button>
 *   </div>
 * {/if}
 * ```
 *
 * @example Basic usage (Svelte 5)
 * ```svelte
 * <script>
 *   import { backDismiss } from 'back-dismiss/svelte';
 *   let open = $state(false);
 * </script>
 *
 * {#if open}
 *   <div use:backDismiss={() => open = false} class="modal">
 *     <h2>Hello!</h2>
 *     <button onclick={() => open = false}>Close</button>
 *   </div>
 * {/if}
 * ```
 *
 * @example With options
 * ```svelte
 * <div use:backDismiss={{ onClose: () => open = false, id: 'settings-modal' }}>
 * ```
 */
export function backDismiss(
  _node: HTMLElement,
  onCloseOrOptions: (() => void) | BackDismissOptions,
): { update: (param: (() => void) | BackDismissOptions) => void; destroy: () => void } {
  let entry: BackDismissEntry | null = null;

  function activate(param: (() => void) | BackDismissOptions): void {
    // Clean up any existing entry before creating a new one
    if (entry) {
      entry.dismiss();
      entry = null;
    }

    if (typeof param === 'function') {
      entry = BackDismiss.push(param);
    } else {
      entry = BackDismiss.push({
        onClose: param.onClose,
        onCancel: param.onCancel,
        id: param.id,
      });
    }
  }

  // Push onto the stack when the element mounts
  activate(onCloseOrOptions);

  return {
    // Called when action parameters change reactively
    update(param: (() => void) | BackDismissOptions) {
      activate(param);
    },
    // Called when the element is removed from the DOM
    destroy() {
      if (entry) {
        entry.dismiss();
        entry = null;
      }
    },
  };
}
