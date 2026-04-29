export type PromptOpts = {
  title: string;
  label?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type PromptState = {
  open: boolean;
  value: string;
  opts: Required<PromptOpts>;
};

const DEFAULTS: Required<PromptOpts> = {
  title: "",
  label: "",
  initialValue: "",
  confirmLabel: "Save",
  cancelLabel: "Cancel",
};

export const promptState = $state<PromptState>({
  open: false,
  value: "",
  opts: { ...DEFAULTS },
});

let resolver: ((value: string | null) => void) | null = null;

export function showPrompt(opts: PromptOpts): Promise<string | null> {
  promptState.opts = { ...DEFAULTS, ...opts };
  promptState.value = promptState.opts.initialValue;
  promptState.open = true;
  return new Promise<string | null>((resolve) => {
    resolver = resolve;
  });
}

export function resolvePrompt(value: string | null) {
  promptState.open = false;
  if (resolver) {
    const r = resolver;
    resolver = null;
    r(value);
  }
}
