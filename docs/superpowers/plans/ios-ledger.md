# Implementation ledger

- User approved autonomous implementation and Thorbis design. Dedicated clone, branch `feat/native-ios`, base `205f317`; original web app preserved.
- CodeGraph initialized locally; index excluded from source delivery.
- Implemented SwiftUI iPhone/iPad app, Swift 6 core package, Xcode project, Inter typography and Thorbis light/dark tokens.
- Implemented server-authoritative daily play, guest/login identity, restore before retry after ambiguous submission, daily-only server guard, local drafts/hints, spoiler-free sharing, local journal/notes/export, real account statistics, StoreKit non-consumable Plus, optional local reminders, account deletion.
- Backend adds authenticated session restore, sanitized public visuals, native guest token response, deletion and stale-account rejection. No deployment performed.
- Review findings fixed: guest expiry recovery, account data isolation after failed decoding, local deletion coverage, legacy difficulty decoding, journal navigation reset/owner guard, rollover retry, SVG fallback.
- Verified core package: 6 tests. Signed iOS26 simulator runtime: 11 tests, including purchase/relaunch/refund and lost-response reconciliation. Backend: 160 suites/863 tests, TypeScript and 15 changed files Biome clean.
- UI fixtures replace the transport only in DEBUG; runtime model and actual views remain exercised. Release builds exclude fixture server and credentials. Four UI tests pass on iPhone16Pro/iOS18.2 and iPad Pro M5/iOS26.0, including largest accessibility text. Evidence listed in Release/Verification.md.
- Unsigned generic iOS archive builds. No valid distribution signing identity is installed on this Mac. No real App Store product, upload, TestFlight validation, hosted CI result, live deletion or production deployment is claimed.
- Release documents distinguish implemented source, local evidence, and outstanding Apple/production requirements. Keep this branch reviewable; no automatic merge or release.

- Follow-up: added real server reaction/word-match feedback to native play and safe atomic persistence/session restore. Added core8 tests, StoreKit direct success/failure recovery/pending approval tests, canonical SVG ink adaptation and DEBUG-only unit host isolation. Initial PR CI and preview deployment passed; new commit evidence is in Release/Verification.md.
