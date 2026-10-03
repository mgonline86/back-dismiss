# back-dismiss

> Make the mobile back button close your overlays instead of navigating away.

[![npm version](https://img.shields.io/npm/v/back-dismiss)](https://www.npmjs.com/package/back-dismiss)
[![bundle size](https://img.shields.io/bundlephobia/minzip/back-dismiss)](https://bundlephobia.com/package/back-dismiss)
[![license](https://img.shields.io/npm/l/back-dismiss)](./LICENSE)

A tiny (~2KB), zero-dependency library that intercepts the mobile back button (and Escape key) to close modals, drawers, and side menus — instead of navigating away from your page.

## The Problem

When a user opens a modal or side menu on mobile and presses the **back button**, they expect the overlay to close. Instead, the browser navigates to the previous page. 😩

## The Solution

Add **one line** to any overlay component:

```jsx
useBackDismiss(open, onClose);
```

Now the back button closes the overlay. On every device, every browser. ✅

## Features

- 🌍 **Universal browser support** — Uses [CloseWatcher API](https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher) where available, falls back to History API
- ⚡ **Tiny** — ~2KB min+gzip, zero dependencies
- 📱 **Mobile-first** — Built for Android back button, iOS gestures, and desktop Escape key
- 🪆 **Nested overlays** — Automatic LIFO stack (sidebar → modal → dialog → back × 3)
- 🛡️ **Framework-safe** — Preserves router state (works with Next.js, Nuxt, React Router, etc.)
- 🔌 **Works everywhere** — npm, CDN, React hook, vanilla JS
- ♿ **SSR-safe** — No-op during server-side rendering

## Installation

### npm / yarn / pnpm

```bash
npm install back-dismiss
```

### CDN (no build step)

```html
<script src="https://cdn.jsdelivr.net/npm/back-dismiss/dist/back-dismiss.min.js"></script>
```

## Quick Start

### React (one-line integration)

```jsx
import { useBackDismiss } from 'back-dismiss/react';

function MyModal({ open, onClose }) {
  useBackDismiss(open, onClose);

  return open ? (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Hello!</h2>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  ) : null;
}
```

### Vanilla JavaScript

```js
import { BackDismiss } from 'back-dismiss';

function openModal() {
  modal.style.display = 'block';
  BackDismiss.push(() => closeModal());
}

function closeModal() {
  modal.style.display = 'none';
  BackDismiss.pop();
}
```

### CDN / Script Tag

```html
<script src="https://cdn.jsdelivr.net/npm/back-dismiss/dist/back-dismiss.min.js"></script>
<script>
  function openModal() {
    document.getElementById('modal').style.display = 'block';
    BackDismiss.push(() => closeModal());
  }

  function closeModal() {
    document.getElementById('modal').style.display = 'none';
    BackDismiss.pop();
  }
</script>
```

## Framework Integration

### shadcn/ui (Sheet / Dialog / Drawer)

```jsx
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useBackDismiss } from 'back-dismiss/react';

function SideMenu({ open, onOpenChange }) {
  useBackDismiss(open, () => onOpenChange(false));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <h2>Menu</h2>
      </SheetContent>
    </Sheet>
  );
}
```

### MUI (Dialog / Drawer)

```jsx
import { Dialog } from '@mui/material';
import { useBackDismiss } from 'back-dismiss/react';

function SettingsDialog({ open, onClose }) {
  useBackDismiss(open, onClose);

  return (
    <Dialog open={open} onClose={onClose}>
      <h2>Settings</h2>
    </Dialog>
  );
}
```

### Bootstrap (React)

```jsx
import { Modal } from 'react-bootstrap';
import { useBackDismiss } from 'back-dismiss/react';

function InfoModal({ show, onHide }) {
  useBackDismiss(show, onHide);

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Info</Modal.Title>
      </Modal.Header>
      <Modal.Body>Content here</Modal.Body>
    </Modal>
  );
}
```

### Bootstrap (Vanilla JS + CDN)

```html
<script src="https://cdn.jsdelivr.net/npm/back-dismiss/dist/back-dismiss.min.js"></script>
<script>
  const modalEl = document.getElementById('myModal');

  modalEl.addEventListener('shown.bs.modal', () => {
    BackDismiss.push(() => bootstrap.Modal.getInstance(modalEl).hide());
  });

  modalEl.addEventListener('hidden.bs.modal', () => {
    BackDismiss.pop();
  });
</script>
```

## Best Practices (Keeping it DRY)

You shouldn't have to copy-paste `useBackDismiss` into every single file that has a modal. Instead, use one of these two patterns to apply it globally:

### 1. The Reusable Wrapper Component (Recommended)
Create a wrapper around your UI library's dialog *once*, and use your wrapper throughout your app.

```jsx
// components/AppDialog.jsx
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useBackDismiss } from 'back-dismiss/react';

export function AppDialog({ open, onOpenChange, children }) {
  // Applied once, works everywhere this component is used
  useBackDismiss(open, () => onOpenChange(false));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>{children}</DialogContent>
    </Dialog>
  );
}
```

### 2. Global Modal Manager (State-driven)
If your app uses global state (Zustand, Context, Redux) to manage modals, put the hook inside your global provider.

```jsx
// components/GlobalModalProvider.jsx
import { useBackDismiss } from 'back-dismiss/react';
import { useModalStore } from '@/store';

export function GlobalModalProvider() {
  const { isOpen, activeModal, closeModal } = useModalStore();

  // One hook controls the back button for the entire app!
  useBackDismiss(isOpen, closeModal);

  return (
    <>
      {activeModal === 'LOGIN' && <LoginModal onClose={closeModal} />}
      {activeModal === 'SETTINGS' && <SettingsModal onClose={closeModal} />}
    </>
  );
}
```

## Advanced Usage

### Unsaved Changes Guard

```jsx
function EditForm({ open, onClose }) {
  const [dirty, setDirty] = useState(false);

  useBackDismiss(open, onClose, {
    onCancel: () => {
      if (dirty) return confirm('Discard unsaved changes?');
      return true; // Allow close
    },
  });

  return open ? (
    <form>
      <input onChange={() => setDirty(true)} />
    </form>
  ) : null;
}
```

### Nested Overlays

Overlays automatically stack. Each back press closes the topmost one:

```js
// User opens sidebar
BackDismiss.push(() => closeSidebar());

// User opens modal from sidebar
BackDismiss.push(() => closeModal());

// User opens confirm dialog from modal
BackDismiss.push(() => closeConfirmDialog());

// 1st Back → closes confirm dialog
// 2nd Back → closes modal
// 3rd Back → closes sidebar
```

### Global Configuration

```js
import { BackDismiss } from 'back-dismiss';

BackDismiss.configure({
  // Force a specific adapter
  adapter: 'auto', // 'auto' | 'close-watcher' | 'history'

  // Prevent app exit in standalone PWAs
  preventAppExit: false,
});
```

### Manual Entry Management

```js
const entry = BackDismiss.push({
  onClose: () => sidebar.close(),
  id: 'main-sidebar',
});

// Check stack depth
console.log(BackDismiss.depth()); // 1

// Manually dismiss
entry.dismiss();

// Or pop by ID
BackDismiss.pop('main-sidebar');

// Clear all entries (e.g., on route change)
BackDismiss.clear();
```

## API Reference

### `BackDismiss` (Core)

| Method | Description |
|---|---|
| `push(onClose)` | Push a close callback. Returns a `BackDismissEntry`. |
| `push(options)` | Push with full options (`onClose`, `onCancel`, `id`). |
| `pop()` | Remove the topmost entry. |
| `pop(id)` | Remove a specific entry by ID. |
| `depth()` | Get the number of active entries. |
| `clear()` | Remove all entries. |
| `configure(config)` | Update global settings. |

### `useBackDismiss(isOpen, onClose, options?)` (React Hook)

| Parameter | Type | Description |
|---|---|---|
| `isOpen` | `boolean` | Whether the overlay is currently open. |
| `onClose` | `() => void` | Callback to close the overlay. |
| `options.onCancel` | `() => boolean` | Return `false` to prevent closing. |
| `options.id` | `string` | Optional identifier for debugging. |

## How It Works

`back-dismiss` uses a **tiered strategy** to intercept the back button:

1. **[CloseWatcher API](https://developer.mozilla.org/en-US/docs/Web/API/CloseWatcher)** (preferred) — A W3C standard that intercepts platform "close" signals (Android back button, Escape key) without polluting browser history. Supported in Chrome 120+, Safari 26.2+, Firefox 147+.

2. **[History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API)** (fallback) — Pushes a dummy history entry when an overlay opens. When the user presses back, `popstate` fires and the overlay closes. Works in all browsers. Carefully preserves existing `history.state` to avoid breaking framework routers.

## Browser Support

| Browser | Method Used |
|---|---|
| Chrome 120+ / Edge / Opera | CloseWatcher |
| Safari 26.2+ (iOS & macOS) | CloseWatcher |
| Firefox 147+ | CloseWatcher |
| Older browsers | History API fallback |

## License

[MIT](./LICENSE)
