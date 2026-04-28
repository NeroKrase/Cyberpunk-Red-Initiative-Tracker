export type ConfirmOpts = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type ConfirmState = {
  open: boolean;
  opts: Required<Omit<ConfirmOpts, "message">> & { message?: string };
};

const DEFAULTS = {
  title: "",
  confirmLabel: "Delete",
  cancelLabel: "Cancel",
};

export const confirmState = $state<ConfirmState>({
  open: false,
  opts: { ...DEFAULTS },
});

let resolver: ((value: boolean) => void) | null = null;

export function showConfirm(opts: ConfirmOpts): Promise<boolean> {
  confirmState.opts = { ...DEFAULTS, ...opts };
  confirmState.open = true;
  return new Promise<boolean>((resolve) => {
    resolver = resolve;
  });
}

export function resolveConfirm(value: boolean) {
  confirmState.open = false;
  if (resolver) {
    const r = resolver;
    resolver = null;
    r(value);
  }
}
