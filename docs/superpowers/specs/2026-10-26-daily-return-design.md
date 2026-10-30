# Daily return experience

Build on native SwiftUI/iOS 18 and the Thorbis visual system. User has authorized implementation and TestFlight delivery without further questions.

Make the next puzzle an inviting, trustworthy moment: server-deadline countdown in clear hours/minutes/seconds, zero-clamped, with a refreshing/retry state after expiry. Preserve active gameplay and existing midnight refresh. Dates with and without fractions must parse.

Daily reminders remain opt-in, at a user-selected local time. Refresh permission status on return, expose denied permission guidance, suppress today's reminder after confirmed completion, and schedule up to 60 upcoming days when the app is used. Calendar-based scheduling handles DST and avoids fixed 24-hour arithmetic. Use varied friendly copy without fake scarcity or guilt. Show the actual next scheduled date and scheduling failures; do not silently claim success.

One return route opens Play at its root from notification taps, widget links, and Siri/Shortcuts. Retain drafts and completion state. Add a small/medium Home Screen and rectangular Lock Screen widget showing the local daily reset countdown; it explicitly describes the reset schedule and does not pretend to know account completion or server publishing state. No shared credentials or app-group data required. Add discovery/instructions in reminder settings.

Scope excludes an always-running Live Activity (a day-long wait is not an active event), unsolicited notification enrollment, and artificial urgency. Existing haptics/sharing remain.

Apple API references: [timer intervals](https://developer.apple.com/documentation/swiftui/text/init(timerinterval:pausetime:countsdown:showshours:)), [WidgetKit extension](https://developer.apple.com/documentation/widgetkit/creating-a-widget-extension), [App Shortcuts](https://developer.apple.com/design/human-interface-guidelines/app-shortcuts).
