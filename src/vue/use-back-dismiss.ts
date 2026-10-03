import { watch, onUnmounted, isRef, type Ref } from 'vue';
import { BackDismiss } from '../core/manager';
import type { BackDismissEntry } from '../core/types';

/**
 * Options for the `useBackDismiss` composable.
 */
export interface UseBackDismissOptions {
  /**
   * Called before closing. Return `false` to prevent the close.
   * Useful for "Discard unsaved changes?" confirmation prompts.
   */
  onCancel?: () => boolean | Promise<boolean>;

  /**
   * Optional ID for this entry (useful for debugging).
   */
  id?: string;
}

/**
 * Vue 3 composable that makes the mobile back button (and Escape key) close your overlay.
 *
 * Add one line to any modal, drawer, sheet, or sidebar component.
 * Works with Vuetify, Quasar, Element Plus, Headless UI, or any custom overlay.
 *
 * @param isOpen - A ref or getter returning whether the overlay is currently open.
 * @param onClose - Callback that closes the overlay.
 * @param options - Optional configuration (cancel veto, ID).
 *
 * @example
 * ```vue
 * <script setup>
 * import { ref } from 'vue';
 * import { useBackDismiss } from 'back-dismiss/vue';
 *
 * const open = ref(false);
 * useBackDismiss(open, () => { open.value = false; });
 * </script>
 * ```
 *
 * @example
 * ```vue
 * <script setup>
 * import { useBackDismiss } from 'back-dismiss/vue';
 *
 * const props = defineProps<{ modelValue: boolean }>();
 * const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
 *
 * // Works with v-model pattern
 * useBackDismiss(
 *   () => props.modelValue,
 *   () => emit('update:modelValue', false),
 * );
 * </script>
 * ```
 */
export function useBackDismiss(
  isOpen: Ref<boolean> | (() => boolean),
  onClose: () => void,
  options?: UseBackDismissOptions,
): void {
  let entry: BackDismissEntry | null = null;

  // Support both Ref<boolean> and getter functions
  const source = isRef(isOpen) ? isOpen : isOpen;

  watch(
    source,
    (open: boolean) => {
      if (open) {
        // Push onto the stack when opened
        entry = BackDismiss.push({
          onClose,
          onCancel: options?.onCancel,
          id: options?.id,
        });
      } else if (entry) {
        // Dismiss when closed programmatically (X button, backdrop click)
        entry.dismiss();
        entry = null;
      }
    },
    { immediate: true },
  );

  // Clean up if the component unmounts while the overlay is still open
  onUnmounted(() => {
    if (entry) {
      entry.dismiss();
      entry = null;
    }
  });
}
