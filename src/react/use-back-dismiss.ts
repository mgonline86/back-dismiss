import { useEffect, useRef } from 'react';
import { BackDismiss } from '../core/manager';
import type { BackDismissEntry } from '../core/types';

/**
 * Options for the `useBackDismiss` hook.
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
 * React hook that makes the mobile back button (and Escape key) close your overlay.
 *
 * Add one line to any modal, drawer, sheet, or sidebar component.
 * Works with MUI, shadcn/ui, Bootstrap, Headless UI, or any custom overlay.
 *
 * @param isOpen - Whether the overlay is currently open.
 * @param onClose - Callback that closes the overlay.
 * @param options - Optional configuration (cancel veto, ID).
 *
 * @example
 * ```tsx
 * // MUI Dialog
 * function SettingsDialog({ open, onClose }) {
 *   useBackDismiss(open, onClose);
 *   return <Dialog open={open} onClose={onClose}>...</Dialog>;
 * }
 *
 * // shadcn/ui Sheet
 * function SideMenu({ open, onOpenChange }) {
 *   useBackDismiss(open, () => onOpenChange(false));
 *   return <Sheet open={open} onOpenChange={onOpenChange}>...</Sheet>;
 * }
 *
 * // With unsaved changes guard
 * function EditForm({ open, onClose }) {
 *   const [dirty, setDirty] = useState(false);
 *   useBackDismiss(open, onClose, {
 *     onCancel: () => !dirty || confirm('Discard changes?'),
 *   });
 *   return open ? <form>...</form> : null;
 * }
 * ```
 */
export function useBackDismiss(
  isOpen: boolean,
  onClose: () => void,
  options?: UseBackDismissOptions,
): void {
  // Use refs to keep callbacks fresh without re-triggering the effect.
  // This avoids the common React pitfall where unstable callback references
  // cause the effect to re-run on every render.
  const onCloseRef = useRef(onClose);
  const onCancelRef = useRef(options?.onCancel);
  const entryRef = useRef<BackDismissEntry | null>(null);

  onCloseRef.current = onClose;
  onCancelRef.current = options?.onCancel;

  useEffect(() => {
    if (!isOpen) return;

    // Push onto the back-dismiss stack
    entryRef.current = BackDismiss.push({
      onClose: () => onCloseRef.current(),
      onCancel: onCancelRef.current
        ? () => onCancelRef.current!()
        : undefined,
      id: options?.id,
    });

    // Cleanup: dismiss when the overlay closes or component unmounts
    return () => {
      if (entryRef.current) {
        entryRef.current.dismiss();
        entryRef.current = null;
      }
    };
    // Only re-run when open state or ID changes — not on callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, options?.id]);
}
