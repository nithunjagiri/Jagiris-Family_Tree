# Jagiri's Kutumbam — Android icon sources

Source of truth for the Android launcher icon and splash assets.

## Approved logo

- `kutumbam-final-full-name.png` — final Banyan medallion with **JAGIRI'S** / **KUTUMBAM**
- Capacitor inputs (do not edit by hand unless regenerating intentionally):
  - `icon-only.png`, `icon-foreground.png`, `icon-background.png`
  - `splash.png`, `splash-dark.png`
  - `logo.png` / `icon.png` (easy-mode aliases of the final mark)

## Regenerate Android mipmaps

Uses the full approved medallion (`kutumbam-final-full-name.png`) — circle + tree +
**JAGIRI'S / KUTUMBAM** — without cropping the design.

```bash
npm run icons:android
```

Requires a local Capacitor Android project (`frontend/android/`, gitignored).

Then rebuild:

```bash
npm run apk:release
```

If the home-screen icon does not update after install, uninstall the previous APK first (Android may cache launcher icons).
