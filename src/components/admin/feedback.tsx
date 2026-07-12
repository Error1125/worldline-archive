/**
 * v5.4 Admin feedback primitives.
 *
 * - Toast stack (non-blocking result feedback)
 * - Accessible Dialog service: confirm / prompt promises that replace
 *   window.confirm / window.prompt
 * - Mobile navigation Drawer
 * - Shared focus-trap stack + body scroll lock
 *
 * The focus traps are kept in a module-level stack so that a Dialog opened on
 * top of the Drawer takes over Tab / Escape handling; closing it hands focus
 * management back to the Drawer underneath.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { AdminIcon, Btn, Input } from "./ui";

/* ------------------------------------------------------------------ */
/* Motion preference                                                    */
/* ------------------------------------------------------------------ */

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false,
  );
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ */
/* Focus trap stack                                                     */
/* ------------------------------------------------------------------ */

const FOCUSABLE_SEL = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

type TrapEntry = { el: HTMLElement; onEscape?: () => void };
const trapStack: TrapEntry[] = [];
let trapListenerInstalled = false;

function installTrapListener() {
  if (trapListenerInstalled) return;
  trapListenerInstalled = true;
  document.addEventListener("keydown", (e) => {
    const top = trapStack[trapStack.length - 1];
    if (!top) return;
    if (e.key === "Escape") {
      e.stopPropagation();
      top.onEscape?.();
      return;
    }
    if (e.key !== "Tab") return;
    const nodes = Array.from(top.el.querySelectorAll<HTMLElement>(FOCUSABLE_SEL)).filter(
      (n) => n.offsetParent !== null || n === document.activeElement,
    );
    if (nodes.length === 0) {
      e.preventDefault();
      top.el.focus();
      return;
    }
    const first = nodes[0]!;
    const last = nodes[nodes.length - 1]!;
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey) {
      if (active === first || !top.el.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last || !top.el.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  });
}

/**
 * Traps focus inside the referenced element while `active`, restores focus to
 * the previously focused element on release, and routes Escape to the top of
 * the stack only.
 */
function useFocusTrap(
  active: boolean,
  opts: { onEscape?: () => void; initialFocus?: () => HTMLElement | null },
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;
  useEffect(() => {
    if (!active) return undefined;
    const el = ref.current;
    if (!el) return undefined;
    installTrapListener();
    const restoreTo = document.activeElement as HTMLElement | null;
    const entry: TrapEntry = { el, onEscape: () => optsRef.current.onEscape?.() };
    trapStack.push(entry);
    const target =
      optsRef.current.initialFocus?.() ??
      el.querySelector<HTMLElement>(FOCUSABLE_SEL) ??
      el;
    // Wait a frame so enter animations don't fight the scroll-into-view.
    const raf = requestAnimationFrame(() => target.focus({ preventScroll: true }));
    return () => {
      cancelAnimationFrame(raf);
      const idx = trapStack.indexOf(entry);
      if (idx >= 0) trapStack.splice(idx, 1);
      if (restoreTo && document.contains(restoreTo)) {
        restoreTo.focus({ preventScroll: true });
      }
    };
  }, [active]);
  return ref;
}

/** Locks body scroll while any caller holds the lock (ref-counted). */
let scrollLocks = 0;
let savedOverflow = "";
function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return undefined;
    if (scrollLocks === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    }
    scrollLocks += 1;
    return () => {
      scrollLocks -= 1;
      if (scrollLocks === 0) document.body.style.overflow = savedOverflow;
    };
  }, [active]);
}

/* ------------------------------------------------------------------ */
/* Toast                                                                */
/* ------------------------------------------------------------------ */

export type ToastTone = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: number;
  key?: string;
  tone: ToastTone;
  title: string;
  message?: string;
  leaving: boolean;
};

type ToastApi = {
  push: (tone: ToastTone, title: string, opts?: { message?: string; key?: string }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TOAST_MS: Record<ToastTone, number> = {
  success: 3800,
  info: 4200,
  warning: 5200,
  error: 7000,
};

const TOAST_ICON: Record<ToastTone, string> = {
  success: "check",
  info: "info",
  warning: "warn",
  error: "warn",
};

const TOAST_COLOR: Record<ToastTone, string> = {
  success: "var(--ia-success)",
  info: "var(--ia-neon)",
  warning: "var(--ia-warning)",
  error: "var(--ia-danger)",
};

let toastSeq = 1;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const remove = useCallback((id: number) => {
    const timers = timersRef.current;
    const t = timers.get(id);
    if (t) clearTimeout(t);
    timers.delete(id);
    if (reducedRef.current) {
      setItems((cur) => cur.filter((i) => i.id !== id));
      return;
    }
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, leaving: true } : i)));
    const gone = setTimeout(() => {
      setItems((cur) => cur.filter((i) => i.id !== id));
    }, 150);
    timers.set(id, gone);
  }, []);

  const push = useCallback(
    (tone: ToastTone, title: string, opts?: { message?: string; key?: string }) => {
      const id = toastSeq++;
      setItems((cur) => {
        let next = cur;
        if (opts?.key) {
          // Same-key toast refreshes instead of stacking duplicates.
          next = next.filter((i) => {
            if (i.key !== opts.key) return true;
            const t = timersRef.current.get(i.id);
            if (t) clearTimeout(t);
            timersRef.current.delete(i.id);
            return false;
          });
        }
        next = [...next, { id, key: opts?.key, tone, title, message: opts?.message, leaving: false }];
        while (next.length > 4) {
          const drop = next[0]!;
          const t = timersRef.current.get(drop.id);
          if (t) clearTimeout(t);
          timersRef.current.delete(drop.id);
          next = next.slice(1);
        }
        return next;
      });
      const timer = setTimeout(() => remove(id), TOAST_MS[tone]);
      timersRef.current.set(id, timer);
    },
    [remove],
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (t, m) => push("success", t, { message: m, key: t }),
      error: (t, m) => push("error", t, { message: m, key: t }),
      warning: (t, m) => push("warning", t, { message: m, key: t }),
      info: (t, m) => push("info", t, { message: m, key: t }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 top-3 z-[90] flex flex-col items-center gap-2 px-3 md:inset-x-auto md:right-5 md:items-end"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-xl border border-[var(--ia-line-strong)] bg-[var(--ia-bg-2)]/95 px-3.5 py-2.5 shadow-[0_14px_40px_rgba(2,6,20,0.55)] backdrop-blur ${
              item.leaving ? "adm-toast-out" : "adm-toast-in"
            }`}
            style={{ borderLeft: `3px solid ${TOAST_COLOR[item.tone]}` }}
          >
            <span className="mt-0.5 shrink-0" style={{ color: TOAST_COLOR[item.tone] }}>
              <AdminIcon name={TOAST_ICON[item.tone]} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-[var(--ia-ink)]">{item.title}</p>
              {item.message ? (
                <p className="mt-0.5 break-words text-xs leading-relaxed text-[var(--ia-mist)]">
                  {item.message}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(item.id)}
              className="adm-ring clickable -mr-1 -mt-0.5 shrink-0 rounded-md p-1 text-[var(--ia-mist)] transition-colors hover:text-[var(--ia-ink)]"
              aria-label="关闭通知"
            >
              <AdminIcon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Dialog service (confirm / prompt)                                    */
/* ------------------------------------------------------------------ */

export type ConfirmOptions = {
  title: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /**
   * When present, the confirm button stays disabled until the user types the
   * exact `expected` value (used for irreversible deletions).
   */
  confirmInput?: {
    label: string;
    expected: string;
    placeholder?: string;
    help?: string;
  };
};

export type PromptOptions = {
  title: string;
  message?: React.ReactNode;
  label?: string;
  placeholder?: string;
  initial?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  validate?: (value: string) => string | null;
};

type DialogApi = {
  confirm: (opts: ConfirmOptions) => Promise<boolean>;
  prompt: (opts: PromptOptions) => Promise<string | null>;
};

const DialogContext = createContext<DialogApi | null>(null);

type DialogTask =
  | { kind: "confirm"; opts: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "prompt"; opts: PromptOptions; resolve: (v: string | null) => void };

let dialogSeq = 1;

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<Array<DialogTask & { id: number }>>([]);
  const [closing, setClosing] = useState(false);
  const reduced = usePrefersReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;

  const current = queue[0] ?? null;

  const finish = useCallback((result: boolean | string | null) => {
    setQueue((cur) => {
      const head = cur[0];
      if (!head) return cur;
      if (head.kind === "confirm") head.resolve(Boolean(result));
      else head.resolve(typeof result === "string" ? result : null);
      return cur;
    });
    const pop = () => {
      setClosing(false);
      setQueue((cur) => cur.slice(1));
    };
    if (reducedRef.current) pop();
    else {
      setClosing(true);
      setTimeout(pop, 125);
    }
  }, []);

  const confirm = useCallback(
    (opts: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setQueue((cur) => [...cur, { id: dialogSeq++, kind: "confirm", opts, resolve }]);
      }),
    [],
  );
  const prompt = useCallback(
    (opts: PromptOptions) =>
      new Promise<string | null>((resolve) => {
        setQueue((cur) => [...cur, { id: dialogSeq++, kind: "prompt", opts, resolve }]);
      }),
    [],
  );

  const api = useMemo<DialogApi>(() => ({ confirm, prompt }), [confirm, prompt]);

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current ? (
        <DialogHost key={current.id} task={current} closing={closing} onFinish={finish} />
      ) : null}
    </DialogContext.Provider>
  );
}

function DialogHost({
  task,
  closing,
  onFinish,
}: {
  task: DialogTask & { id: number };
  closing: boolean;
  onFinish: (result: boolean | string | null) => void;
}) {
  const isConfirm = task.kind === "confirm";
  const confirmOpts = isConfirm ? (task as Extract<DialogTask, { kind: "confirm" }>).opts : null;
  const promptOpts = !isConfirm ? (task as Extract<DialogTask, { kind: "prompt" }>).opts : null;
  const danger = Boolean(confirmOpts?.danger);
  const needsInput = Boolean(confirmOpts?.confirmInput) || !isConfirm;

  const [value, setValue] = useState(promptOpts?.initial ?? "");
  const [error, setError] = useState<string | null>(null);
  const closingRef = useRef(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const confirmRef = useRef<HTMLButtonElement | null>(null);

  const cancel = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onFinish(isConfirm ? false : null);
  }, [isConfirm, onFinish]);

  const confirmEnabled = confirmOpts?.confirmInput
    ? value.trim() === confirmOpts.confirmInput.expected
    : true;

  const submit = useCallback(() => {
    if (closingRef.current) return;
    if (isConfirm) {
      if (!confirmEnabled) return;
      closingRef.current = true;
      onFinish(true);
      return;
    }
    const v = value;
    const err = promptOpts?.validate?.(v) ?? null;
    if (err) {
      setError(err);
      inputRef.current?.focus();
      return;
    }
    closingRef.current = true;
    onFinish(v);
  }, [isConfirm, confirmEnabled, value, promptOpts, onFinish]);

  const trapRef = useFocusTrap(true, {
    onEscape: cancel,
    initialFocus: () => {
      if (needsInput) return inputRef.current;
      if (danger) return cancelRef.current;
      return confirmRef.current;
    },
  });
  useBodyScrollLock(true);

  const titleId = `adm-dialog-title-${task.id}`;
  const descId = `adm-dialog-desc-${task.id}`;
  const message = confirmOpts?.message ?? promptOpts?.message;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        className={`absolute inset-0 bg-[rgba(3,6,16,0.62)] backdrop-blur-[2px] ${closing ? "adm-overlay-out" : "adm-overlay-in"}`}
        onClick={cancel}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={message ? descId : undefined}
        tabIndex={-1}
        className={`relative w-full max-w-sm rounded-2xl border border-[var(--ia-line-strong)] bg-[var(--ia-bg-2)] p-5 shadow-[0_24px_70px_rgba(2,6,20,0.65)] outline-none ${closing ? "adm-dialog-out" : "adm-dialog-in"}`}
      >
        <div className="flex items-start gap-3">
          {danger ? (
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[var(--ia-danger)]/40 bg-[var(--ia-danger)]/10 text-[var(--ia-danger)]">
              <AdminIcon name="warn" className="h-4 w-4" />
            </span>
          ) : null}
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-base font-semibold text-[var(--ia-ink)]">
              {isConfirm ? confirmOpts!.title : promptOpts!.title}
            </h2>
            {message ? (
              <div id={descId} className="mt-1.5 text-sm leading-relaxed text-[var(--ia-mist)]">
                {message}
              </div>
            ) : null}
          </div>
        </div>

        {isConfirm && confirmOpts?.confirmInput ? (
          <div className="mt-4">
            <label className="mb-1.5 block text-xs text-[var(--ia-mist)]">
              {confirmOpts.confirmInput.label}
            </label>
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={confirmOpts.confirmInput.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              autoComplete="off"
              spellCheck={false}
            />
            {confirmOpts.confirmInput.help ? (
              <p className="mt-1.5 text-xs text-[var(--ia-mist)]">
                {confirmOpts.confirmInput.help}
              </p>
            ) : null}
          </div>
        ) : null}

        {!isConfirm ? (
          <div className="mt-4">
            {promptOpts?.label ? (
              <label className="mb-1.5 block text-xs text-[var(--ia-mist)]">
                {promptOpts.label}
              </label>
            ) : null}
            <Input
              ref={inputRef}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError(null);
              }}
              placeholder={promptOpts?.placeholder}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              autoComplete="off"
            />
            {error ? <p className="mt-1.5 text-xs text-[var(--ia-danger)]">{error}</p> : null}
          </div>
        ) : null}

        <div className="mt-5 flex justify-end gap-2">
          <Btn ref={cancelRef} kind="secondary" size="sm" onClick={cancel}>
            {(isConfirm ? confirmOpts!.cancelLabel : promptOpts?.cancelLabel) ?? "取消"}
          </Btn>
          <Btn
            ref={confirmRef}
            kind={danger ? "danger" : "primary"}
            size="sm"
            disabled={isConfirm ? !confirmEnabled : false}
            onClick={submit}
          >
            {(isConfirm ? confirmOpts!.confirmLabel : promptOpts?.confirmLabel) ?? "确定"}
          </Btn>
        </div>
      </div>
    </div>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog must be used within DialogProvider");
  return ctx;
}

/* ------------------------------------------------------------------ */
/* Drawer (mobile navigation)                                           */
/* ------------------------------------------------------------------ */

export function Drawer({
  open,
  onClose,
  title,
  id,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  id?: string;
  children: React.ReactNode;
}) {
  const reduced = usePrefersReducedMotion();
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setClosing(false);
      setMounted(true);
      return undefined;
    }
    if (!mounted) return undefined;
    if (reduced) {
      setMounted(false);
      return undefined;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      setMounted(false);
    }, 175);
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, reduced]);

  const trapRef = useFocusTrap(mounted && !closing, { onEscape: onClose });
  useBodyScrollLock(mounted);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[70] md:hidden">
      <div
        className={`absolute inset-0 bg-[rgba(3,6,16,0.58)] backdrop-blur-[2px] ${closing ? "adm-overlay-out" : "adm-overlay-in"}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={trapRef}
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className={`absolute inset-y-0 left-0 flex w-[min(84vw,320px)] flex-col border-r border-[var(--ia-line-strong)] bg-[var(--ia-bg-2)] outline-none ${closing ? "adm-drawer-out" : "adm-drawer-in"}`}
      >
        {children}
      </div>
    </div>
  );
}
