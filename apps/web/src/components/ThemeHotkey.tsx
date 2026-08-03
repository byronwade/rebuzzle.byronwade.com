"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest("[contenteditable=true]"));
}

/**
 * Safe dark-mode shortcut: plain `d`, or Cmd/Ctrl+Shift+D.
 * Ignored while focus is in form fields or contenteditable nodes.
 */
export function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;

      const isChord =
        (event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "d";
      const isPlainD =
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        event.key.toLowerCase() === "d";

      if (!isChord && !isPlainD) return;

      event.preventDefault();
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resolvedTheme, setTheme]);

  return null;
}
