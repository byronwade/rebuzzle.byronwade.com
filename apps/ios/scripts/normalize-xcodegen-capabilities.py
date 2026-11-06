#!/usr/bin/env python3
"""Keep XcodeGen's App Groups target metadata as a native PBX dictionary."""

from pathlib import Path


project_file = Path(__file__).resolve().parents[1] / "Rebuzzle.xcodeproj/project.pbxproj"
lines = project_file.read_text().splitlines()
rewritten = []
repaired = 0
already_native = 0

for line in lines:
    trimmed = line.lstrip()
    if trimmed.startswith("SystemCapabilities = \"") and "com.apple.ApplicationGroups.iOS" in line:
        indent = line[: len(line) - len(trimmed)]
        rewritten.extend(
            [
                f"{indent}SystemCapabilities = {{",
                f"{indent}\tcom.apple.ApplicationGroups.iOS = {{",
                f"{indent}\t\tenabled = 1;",
                f"{indent}\t}};",
                f"{indent}}};",
            ]
        )
        repaired += 1
    else:
        rewritten.append(line)
        if trimmed == "com.apple.ApplicationGroups.iOS = {":
            already_native += 1

if repaired not in (0, 2) or (repaired == 0 and already_native != 2):
    raise SystemExit(
        "Expected App Groups metadata for both Rebuzzle targets; "
        f"found {repaired} XcodeGen strings and {already_native} native entries."
    )

if repaired:
    project_file.write_text("\n".join(rewritten) + "\n")
