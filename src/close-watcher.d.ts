/**
 * Type declarations for the CloseWatcher API.
 *
 * The CloseWatcher API is a W3C/WHATWG standard for handling platform
 * "close" signals (Android back button, Escape key).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher
 */

declare class CloseWatcher extends EventTarget {
  constructor();

  /** Request close. Fires 'cancel' then 'close' events. */
  requestClose(): void;

  /** Close immediately. Fires 'close' event. */
  close(): void;

  /** Destroy this watcher without firing events. */
  destroy(): void;

  oncancel: ((this: CloseWatcher, ev: Event) => void) | null;
  onclose: ((this: CloseWatcher, ev: Event) => void) | null;

  addEventListener(
    type: 'cancel',
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: 'close',
    listener: (ev: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions,
  ): void;

  removeEventListener(
    type: 'cancel',
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: 'close',
    listener: (ev: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions,
  ): void;
}
