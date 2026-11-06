# Fast First Puzzle Paint Implementation Plan

> **For agentic workers:** Implement this focused SwiftUI change in the current worktree and preserve all existing staged, unstaged, and untracked work.

**Goal:** Make a new daily round feel ready while its visual clues render, without showing an empty board or a misleading recovery action.

**Architecture:** Keep the existing sanitized SVG `WKWebView` renderer and puzzle layout. Show each pictogram's already-provided fallback immediately, and reveal its SVG only after WebKit finishes loading. While daily/session setup is still running, keep the composer disabled but label its status as preparation; preserve “Refresh progress” for an actual recovery state.

**Tech Stack:** Swift 6, SwiftUI, `UIViewRepresentable`, `WKNavigationDelegate`.

**Spec:** Based on the live iPhone 17 Pro Simulator capture from a cold launch and the existing daily gameplay contract in `apps/ios/Rebuzzle/Features/TodayView.swift`.

## Global Constraints

- Preserve iOS 18+, the current puzzle data model, SVG allowlist, board geometry, answer privacy, and API behavior.
- Add no dependencies, permissions, scoring changes, or new motion.
- Do not add or run automated tests; verify with a simulator build and manual fixture interaction.
- Preserve all pre-existing user changes in the shared worktree.

## Review Focus

- Cold SVG load: the clue remains interpretable from its system-rendered emoji fallback before the vector view is ready.
- SVG parse/render failure: the fallback stays visible rather than leaving a blank clue slot.
- Puzzle updates: an old render completion never replaces the fallback for a newer SVG source.
- VoiceOver: the fallback and final vector remain one readable clue, without duplicate announcements.
- Startup and recovery: loading copy is honest while `model.busy`; “Refresh progress” remains available after a recoverable failure.

---

### Task 1: Keep pictograms visible during SVG first paint

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/VisualBoard.swift`

- [ ] Add a completion callback to `SVGVectorView` through its `WKNavigationDelegate` coordinator.
- [ ] In `VisualLayerView`, display `emojiFallback` in the system font until the matching SVG source has finished loading, then show the sanitized SVG.
- [ ] Keep the fallback if rendering fails, and ignore stale completion callbacks when the layer's source changes.

### Task 2: Distinguish startup preparation from recovery

**Files:**
- Modify: `apps/ios/Rebuzzle/Features/TodayView.swift`
- Modify: `apps/ios/Rebuzzle/Features/GuessComposer.swift`

- [ ] While the composer recovery action is loading, label it “Loading your game…” or “Syncing progress…” as appropriate and expose the same clear wording to VoiceOver.
- [ ] Keep “Refresh progress” and its existing action when setup is no longer running and the session needs recovery.

### Task 3: Verify the first-play presentation

**Files:**
- No additional source files.

- [ ] Build the Debug iOS Simulator target.
- [ ] Launch with `--ui-fixture` on iPhone 17 Pro and capture the first screen before SVG completion; confirm both fallbacks and the preparation label are visible.
- [ ] Confirm the same puzzle swaps to its SVG illustrations when they finish loading, without changing the answer or board layout.
- [ ] Launch with an invalid SVG fixture if available and confirm its fallback remains visible.
- [ ] Confirm the solved/reveal flow and the recovery action remain available; record any unsupported simulator-only observations.
