/**
 * Ref-counted document scroll lock.
 *
 * Multiple callers (VisualViewportShell + KeyboardAwareLayout) used to each
 * save-and-restore `overflow` independently. React runs child cleanups before
 * parent cleanups, so the second restore wrote back `"hidden"` and left
 * html/body locked after leaving the game page — signup, login, and other
 * scrolling routes could not scroll.
 */

let lockCount = 0;
let savedRootOverflow: string | null = null;
let savedBodyOverflow: string | null = null;
let savedBodyOverscroll: string | null = null;

function canUseDocument(): boolean {
  return typeof document !== "undefined";
}

export function acquireDocumentScrollLock(): void {
  if (!canUseDocument()) return;

  if (lockCount === 0) {
    const root = document.documentElement;
    const body = document.body;
    savedRootOverflow = root.style.overflow;
    savedBodyOverflow = body.style.overflow;
    savedBodyOverscroll = body.style.overscrollBehavior;
    root.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
  }

  lockCount += 1;
}

export function releaseDocumentScrollLock(): void {
  if (!canUseDocument() || lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const root = document.documentElement;
  const body = document.body;
  root.style.overflow = savedRootOverflow ?? "";
  body.style.overflow = savedBodyOverflow ?? "";
  body.style.overscrollBehavior = savedBodyOverscroll ?? "";
  savedRootOverflow = null;
  savedBodyOverflow = null;
  savedBodyOverscroll = null;
}

/**
 * Force-release leftover inline locks. Used by scrolling (non-game) layouts
 * so a prior game-page lock cannot survive client navigation.
 *
 * Only clears the signature this module writes (`overflow: hidden` plus
 * `overscroll-behavior: none`) so we don't fight an open dialog.
 */
export function clearDocumentScrollLock(): void {
  if (!canUseDocument()) {
    lockCount = 0;
    savedRootOverflow = null;
    savedBodyOverflow = null;
    savedBodyOverscroll = null;
    return;
  }

  const root = document.documentElement;
  const body = document.body;

  if (lockCount > 0) {
    root.style.overflow = savedRootOverflow ?? "";
    body.style.overflow = savedBodyOverflow ?? "";
    body.style.overscrollBehavior = savedBodyOverscroll ?? "";
  } else if (body.style.overscrollBehavior === "none" && body.style.overflow === "hidden") {
    root.style.overflow = "";
    body.style.overflow = "";
    body.style.overscrollBehavior = "";
  }

  lockCount = 0;
  savedRootOverflow = null;
  savedBodyOverflow = null;
  savedBodyOverscroll = null;
}

export function getDocumentScrollLockCount(): number {
  return lockCount;
}
