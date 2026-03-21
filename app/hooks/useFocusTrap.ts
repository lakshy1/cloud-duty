import { RefObject, useEffect } from "react";

type FocusTrapOptions = {
  onEscape?: () => void;
};

export function useFocusTrap<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  options?: FocusTrapOptions
) {
  const onEscape = options?.onEscape;
  useEffect(() => {
    if (!active) return;
    const panel = ref.current;
    if (!panel) return;

    const selector =
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
    const focusable = Array.from(panel.querySelectorAll<HTMLElement>(selector));
    const first = focusable[0] ?? panel;
    const last = focusable[focusable.length - 1] ?? panel;
    const previous = document.activeElement as HTMLElement | null;

    panel.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) {
        onEscape();
      }
      if (event.key === "Tab") {
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    panel.addEventListener("keydown", onKeyDown);
    return () => {
      panel.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [active, onEscape, ref]);
}
