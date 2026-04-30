// Toast-style notifications with a bounded display window and a queue.
//
// Usage: call `notify({ kind, title, body })` from anywhere; the
// `Notifications.svelte` component subscribes to `notifications` and
// renders the visible items in a corner of the page.
//
// Behaviour:
//   - At most MAX_VISIBLE notifications are on screen at once.
//   - Each visible item dismisses after TTL_MS milliseconds.
//   - Anything posted while the visible window is full is queued and
//     promoted in FIFO order as soon as a slot opens up.

export type NotificationKind = "info" | "success" | "error";

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
};

export const MAX_VISIBLE = 3;
export const TTL_MS = 3000;

const queue: Notification[] = [];
const visible = $state<Notification[]>([]);

// Re-exported as a `$state` reference so the component reacts.
export const notifications = visible;

export function notify(input: Omit<Notification, "id">): string {
  const item: Notification = {
    ...input,
    id: crypto.randomUUID(),
  };
  if (visible.length < MAX_VISIBLE) {
    promote(item);
  } else {
    queue.push(item);
  }
  return item.id;
}

export function dismiss(id: string): void {
  const i = visible.findIndex((n) => n.id === id);
  if (i === -1) return;
  visible.splice(i, 1);
  // Promote the next queued notification, if any.
  const next = queue.shift();
  if (next) promote(next);
}

function promote(item: Notification) {
  visible.push(item);
  // setTimeout fires off the microtask queue; safe in SSR-skipped client code.
  setTimeout(() => dismiss(item.id), TTL_MS);
}
