# DiscipleOS brand assets

This package contains copies only. The originals used by the app were not moved,
renamed, deleted, or modified. Build-output copies from `dist/public` are
intentionally excluded.

## Current

Source: `artifacts/discipleos/public`

| Package file | Original | Format / dimensions | Status |
|---|---|---|---|
| `current/discipline-that-moves-mountains.png` | `public/discipline-that-moves-mountains.png` | PNG, 1672×941 | Current mountain hero |
| `current/splash.jpg` | `public/splash.jpg` | JPEG, 941×1672 | Current launch splash |
| `current/favicon-16.png` | `public/favicon-16.png` | PNG, 16×16 | Current favicon |
| `current/favicon-32.png` | `public/favicon-32.png` | PNG, 32×32 | Current favicon |
| `current/favicon-64.png` | `public/favicon-64.png` | PNG, 64×64 | Current favicon |
| `current/favicon.svg` | `public/favicon.svg` | SVG, declared 512×512; embeds `favicon-64.png` | Current but not directly linked by the active HTML |
| `current/apple-touch-icon.png` | `public/apple-touch-icon.png` | PNG, 180×180 | Current Apple touch icon |
| `current/icon-192.png` | `public/icon-192.png` | PNG, 192×192 | Current PWA icon |
| `current/icon-512.png` | `public/icon-512.png` | PNG, 512×512 | Current PWA icon |

## Legacy

Sources: `.migration-backup/public` and `.migration-backup/app`

| Package file | Original | Format / dimensions | Status |
|---|---|---|---|
| `legacy/public/splash.png` | `.migration-backup/public/splash.png` | PNG, 1024×1536 | Legacy purple splash |
| `legacy/public/FAVICON.ico` | `.migration-backup/public/FAVICON.ico` | ICO containing PNG images at 16×16, 24×24, and 32×32 | Legacy favicon |
| `legacy/app/favicon.ico` | `.migration-backup/app/favicon.ico` | ICO containing PNG images at 16×16, 24×24, and 32×32 | Legacy favicon duplicate |
| `legacy/public/apple-touch-icon.png` | `.migration-backup/public/apple-touch-icon.png` | PNG, 180×180 | Legacy purple Apple touch icon |
| `legacy/public/icon-192.png` | `.migration-backup/public/icon-192.png` | PNG, 192×192 | Legacy purple PWA icon |
| `legacy/public/icon-512.png` | `.migration-backup/public/icon-512.png` | PNG, 512×512 | Legacy purple PWA icon |

## Duplicate notes

- Each current package file has a matching byte-identical build copy in
  `artifacts/discipleos/dist/public`; those build copies are not included here.
- `.migration-backup/public/FAVICON.ico` and
  `.migration-backup/app/favicon.ico` are byte-identical and both are retained
  in the legacy section because they are separate original paths.
- Current and legacy files with matching names and dimensions are different
  image content and are not duplicates.