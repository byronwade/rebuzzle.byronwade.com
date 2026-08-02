# Third-party pictogram candidates

Rebuzzle vendors a small diagnostic-only subset of Google Material Symbols from
`google/material-design-icons` at commit
`50f0603134ce7b70b2d71b686cc13e8b57ccb74c`.

- License: Apache License 2.0
- Variant: Material Symbols Rounded, filled, 20px optical master
- Upstream: <https://github.com/google/material-design-icons>
- Vendored license: [licenses/material-design-icons-APACHE-2.0.txt](licenses/material-design-icons-APACHE-2.0.txt)

Each path comes from
`symbols/web/<symbol>/materialsymbolsrounded/<symbol>_fill1_20px.svg` at the
pinned commit. The path data is copied without geometric modification; Rebuzzle
only wraps it in a sanitized 64px SVG using the product ink color.

Only path data required for the quarantined replacement candidates is included.
These symbols are not publication eligible merely because they are vendored.
Each candidate must pass Rebuzzle's blind multi-model tests at 36px and 72px,
then the [blind human naming panel](HUMAN_ICON_RECOGNITION.md), before its
quarantine entry can be removed.
