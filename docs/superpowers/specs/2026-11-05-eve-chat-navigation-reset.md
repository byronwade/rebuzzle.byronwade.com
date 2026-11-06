# Eve Chat and Navigation Reset

## Why this pass exists

The previous chat-first navigation pass removed the tab bar and added a left drawer, but the user says the menu and navigation still feel poor and the home screen still does not feel like a real chat. The reference pattern was applied at the shell level without giving the game itself one clear conversational structure.

## Product intent

Make the daily puzzle feel like one ongoing conversation with Eve. Keep the clue board as the central game object, but present Eve's prompt, the board, guesses, nudges, and feedback as turns in one readable thread. Make navigation compact and predictable, with a clear path back to today's puzzle from every destination and a useful, unmistakable one-time Plus offer.

## Design references

- [ChatGPT conversation](https://mobbin.com/screens/10f190d9-afcf-456a-b86b-ceadedcc14ab?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): simple assistant turns, right-aligned player messages, and a persistent bottom composer.
- [ChatGPT navigation drawer](https://mobbin.com/screens/fe939291-d13d-4014-8bb5-dd937d035a93?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): compact icon rows, concise grouping, and stable bottom actions.
- [The New Yorker daily games](https://mobbin.com/screens/d233b67d-5b1f-41c0-92e9-7ebdffa5f76a?utm_source=chatgpt&utm_medium=ai-assistant&utm_source_platform=mcp): one featured daily game with other puzzles discoverable nearby.

## Design decisions

### Daily conversation

- The home header identifies the active thread as Eve's daily puzzle, with the drawer control on the left and Help on the right.
- Keep the date and earned level compact as thread context.
- Eve's opener introduces the clue board as an attachment. The board remains the one strong framed surface because its visual clue must be clear and tappable for study.
- Keep reset time as quiet inline metadata below the board.
- Keep the three-guess progress visible once, in a compact game HUD.
- Render a submitted guess as one right-aligned player bubble. Render Eve's feedback as an unboxed assistant turn with a compact feedback badge/meter. Nudges use the same assistant-turn style.
- Keep the answer composer anchored, with the keyboard dismissal affordance and hint action intact.
- Preserve the existing puzzle, hint, score, sound, animation, and feedback logic.

### Navigation drawer

- Keep the familiar left slide-over pattern, but reduce the oversized category hierarchy and row height.
- Show a compact Rebuzzle identity row, a clearly selected Today item with the current date, and concise destinations for Journey, Past puzzles, and Puzzle journal.
- Keep Profile & settings pinned above the purchase area.
- Make Plus a compact but clear call to action: localized StoreKit price when loaded, “one-time purchase,” no-subscription reassurance, and archive/journal/insights benefits.
- For an owner, replace the offer with a direct Puzzle journal/collection shortcut.
- Keep selection, route behavior, deep links, independent stacks, and accessibility behavior intact.

## Out of scope

- Do not change the puzzle engine, scoring, attempt limits, hint rules, purchase identifier, or StoreKit transaction behavior.
- Do not add a new puzzle mode or fake recent-puzzle history.
- Do not add or run automated tests in this pass. Build the Debug Simulator target and inspect the home, drawer, and a submitted-guess thread manually.

## Acceptance criteria

- The first screen reads as a conversation with Eve before the player submits a guess.
- Guess and Eve feedback turns are easy to distinguish without stacking nested cards around every message.
- The clue board remains large enough to read, with study, difficulty, and countdown still accessible.
- The drawer uses compact rows and its primary destinations and one-time Plus value are obvious at a glance.
- Users can return to Today from the drawer while preserving the existing puzzle session.
- Dynamic Type, VoiceOver labels, keyboard dismissal, and Reduce Motion behavior remain supported.
