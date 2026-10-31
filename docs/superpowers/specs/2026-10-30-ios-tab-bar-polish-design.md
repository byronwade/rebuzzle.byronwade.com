# iOS: tab bar polish

Keep the native TabView (Play / Journey / You) and make it feel like Rebuzzle.

- **Icons:** one style. Each tab shows the outline symbol when unselected and the filled one when selected
  (`puzzlepiece`, `map`, `person.crop.circle`), so all three read the same weight.
- **Tint:** the selected tab uses `Theme.ink` instead of system blue. Content inside each tab keeps
  `Theme.accent` so buttons and links don't change.
- **Minimize on scroll:** on iOS 26, `.tabBarMinimizeBehavior(.onScrollDown)`. iOS 18–25 keeps the
  standard bar.
- **Today dot:** Play shows a badge while today's daily puzzle is loaded and not yet finished
  (`model.daily != nil && !model.completedCurrentPuzzle`). It never shows during load or on error.
- **Haptic:** a selection haptic on tab change, respecting the existing `haptics` setting.

Testing: existing UI tests keep tapping tabs by label. Screenshots in light and dark with the dot
showing and hidden.
