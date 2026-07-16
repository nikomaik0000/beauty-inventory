PWA icons — generated in Phase 6A from the app's own design tokens
(accent-soft badge #EFE7D9 + accent-strong sparkle #A7815B, same colors
as the logo mark in components/site-header.tsx). No external assets.

  icon-192.png            192x192   manifest "any" icon
  icon-512.png            512x512   manifest "any" icon
  icon-maskable-512.png   512x512   manifest "maskable" icon (content
                                     kept inside the 80%-diameter safe
                                     zone so Android's adaptive-icon
                                     crop never clips it)
  apple-touch-icon.png    180x180   iOS home screen icon (referenced
                                     via <link rel="apple-touch-icon">
                                     in app/layout.tsx — iOS rounds the
                                     corners itself, so this stays a
                                     plain edge-to-edge square)
  favicon-32.png / favicon-16.png   browser tab icons (also bundled
                                     into /public/favicon.ico)

iOS splash screens live in /public/splash/ instead (they're full-canvas
device-sized images referenced by media query, not manifest icons).

To regenerate or restyle any of these: run
`python3 scripts/generate-pwa-assets.py` from the repo root (needs
`pip install Pillow`). It's a plain generator script, not part of the
Next.js build — re-run it whenever the brand colors or icon design
change and commit the resulting PNGs like any other binary asset.
