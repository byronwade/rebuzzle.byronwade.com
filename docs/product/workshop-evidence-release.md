# Canonical board and publication evidence release

This implements the first two priorities from the workshop review: dependable publication evidence and a frozen board presentation shared by reviewers and players. It does not complete the original-art collection, semantic relationship editor, Apex Studio concepts or editorial benchmark.

## Behavior
- New Studio review compiles hydrated layers to a bounded, versioned PNG. Browser and native clients display that exact image, preserving its aspect ratio and colors. Review profiles resize the same image rather than laying out the pieces again.
- Unsupported or unrenderable artwork prevents approval. Remote image tiles must be converted to supported inline artwork before this path can publish; no layer is silently omitted.
- Publication requires completed board-aware model critique and complete blind and editorial reviewer quorum at every required viewport. Disabled, failed or partial review infrastructure returns Review pending. Draft saving remains available.
- Evidence binds content, hydrated assets, image bytes and policy/renderer versions. Draft updates clear old approval; persistence compares the saved revision before attaching review or publication. Promotion checks matching evidence and retains the demanding-daily gates.
- Studio shows the frozen reviewed preview. The live drag canvas is still a separate editing surface; full editing geometry parity remains future work.
- iOS build 11 validates PNG bounds, dimensions and SHA256 before rendering. Invalid artifacts show an unavailable state instead of a different legacy clue. Older clients receive an update-required response when a daily uses the new contract.
- Existing published puzzles without the optional artifact continue using the legacy renderer. No daily puzzle data was rewritten.

## Verification
- Web: 173 Jest suites / 996 tests passed; TypeScript passed; lint passed with ten existing warnings and one configuration notice.
- Native core: 22 tests passed. Hosted application: 29 tests passed. All 15 gameplay UI tests passed, including canonical valid/invalid presentation and legacy keyboard regression. Release archive results are recorded below after completion.
- Real web component displayed the shared 768×248 fixture at 375 and 768 CSS pixels. Native gameplay and Study screenshots show the same frozen image. These are local fixture checks, not observations of human puzzle enjoyment.
- Independent presentation review found no blocking findings. Publication review found a partial editorial-quorum status issue; the fix and scoped re-review passed.

## Release status
Pending final archive, TestFlight processing and production deployment verification.

## Decisions and limits
Inline PNG avoids a mutable external-artwork dependency but increases payload size; decoded images are capped at 1 MiB and dimensions at 2048 pixels. The first slice provides frozen reviewed preview parity while retaining the existing editor. No model was trained, no editorial corpus fabricated and no increased human difficulty or enjoyment claimed.
