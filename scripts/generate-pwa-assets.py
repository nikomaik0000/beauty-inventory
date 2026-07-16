"""
PWA icon + iOS splash-screen generator for Beauty Inventory.

Draws every image from the app's own design tokens (lib/theme.ts /
app/globals.css) — an accent-soft badge with an accent-strong sparkle,
the same colors as the logo mark in components/site-header.tsx. No
external image assets, no network calls.

Usage:
    pip install Pillow
    python3 scripts/generate-pwa-assets.py

Run from the repo root. Re-run any time the icon/splash design needs to
change — it's a plain generator script, not part of the Next.js build.
"""
import math
import os
from PIL import Image, ImageDraw

BG_PAGE = "#FAF8F4"       # --color-background
ACCENT_SOFT = "#EFE7D9"   # --color-accent-soft (icon badge fill)
ACCENT_STRONG = "#A7815B" # --color-accent-strong (sparkle mark)

_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_ICONS = os.path.join(_REPO_ROOT, "public", "icons")
OUT_SPLASH = os.path.join(_REPO_ROOT, "public", "splash")
OUT_FAVICON_ICO = os.path.join(_REPO_ROOT, "public", "favicon.ico")


def sparkle_polygon(cx, cy, outer_r, inner_r, rotation_deg=-90):
    """4-point sparkle/star polygon (8 vertices, alternating outer/inner
    radius), matching the general silhouette of the Lucide `Sparkles` mark
    already used in the site header — simplified to one glyph so it stays
    legible down to 16x16 favicon size."""
    pts = []
    for i in range(8):
        r = outer_r if i % 2 == 0 else inner_r
        angle = math.radians(rotation_deg + i * 45)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    return pts


def draw_icon(size, bg, fg, star_ratio, corner_radius_ratio=0.0):
    """Full-bleed square icon: bg fills edge-to-edge (required for the
    maskable icon's safe zone, and kept consistent across all icon
    variants so nothing gets double-rounded by the OS on top of a
    pre-rounded PNG)."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    if corner_radius_ratio > 0:
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=size * corner_radius_ratio, fill=bg)
    else:
        draw.rectangle([0, 0, size - 1, size - 1], fill=bg)
    cx = cy = size / 2
    outer_r = size * star_ratio
    inner_r = outer_r * 0.42
    draw.polygon(sparkle_polygon(cx, cy, outer_r, inner_r), fill=fg)
    return img


def save_png(img, path):
    img.save(path, "PNG")
    print("wrote", path, img.size)


def gen_icons():
    os.makedirs(OUT_ICONS, exist_ok=True)
    # Standard / "any" purpose icons — edge-to-edge accent-soft bg, no
    # pre-baked rounding (iOS/Android apply their own mask on top).
    save_png(draw_icon(192, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.30), f"{OUT_ICONS}/icon-192.png")
    save_png(draw_icon(512, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.30), f"{OUT_ICONS}/icon-512.png")
    # Maskable: content must sit inside the inner 80%-diameter safe circle
    # (radius = 0.4 * size from center) — star_ratio kept comfortably
    # inside that, at 0.24, so no launcher's crop shape clips the mark.
    save_png(draw_icon(512, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.24), f"{OUT_ICONS}/icon-maskable-512.png")
    # Apple touch icon — iOS rounds this itself; must stay square/edge-to-edge.
    save_png(draw_icon(180, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.30), f"{OUT_ICONS}/apple-touch-icon.png")
    # Browser-tab favicons (kept simple/high-contrast for tiny sizes).
    save_png(draw_icon(32, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.34), f"{OUT_ICONS}/favicon-32.png")
    save_png(draw_icon(16, ACCENT_SOFT, ACCENT_STRONG, star_ratio=0.36), f"{OUT_ICONS}/favicon-16.png")
    # .ico bundling both sizes for maximum browser/OS compatibility.
    icon32 = Image.open(f"{OUT_ICONS}/favicon-32.png")
    icon32.save(OUT_FAVICON_ICO, sizes=[(16, 16), (32, 32)])
    print("wrote", OUT_FAVICON_ICO)


# iOS apple-touch-startup-image sizes: (css_width, css_height, dpr).
# Physical PNG = css * dpr. Portrait only — manifest already locks
# orientation to portrait-primary. Covers iPhone SE through the current
# iPhone 16 generation, plus one common iPad size.
SPLASH_DEVICES = [
    (375, 667, 2, "iphone-se-8"),          # iPhone SE 2nd/3rd gen, 6/7/8
    (390, 844, 3, "iphone-12-14"),         # iPhone 12/12 Pro/13/13 Pro/14
    (393, 852, 3, "iphone-14pro-16"),      # iPhone 14 Pro/15/15 Pro/16
    (402, 874, 3, "iphone-16pro"),         # iPhone 16 Pro
    (428, 926, 3, "iphone-12-14-plusmax"), # iPhone 12/13 Pro Max, 14 Plus
    (430, 932, 3, "iphone-14-16-plusmax"), # iPhone 14 Pro Max/15 Pro Max/15+/16+
    (440, 956, 3, "iphone-16promax"),      # iPhone 16 Pro Max
    (834, 1194, 2, "ipad-11"),             # iPad Air/Pro 11"
]


def draw_splash(px_w, px_h):
    img = Image.new("RGB", (px_w, px_h), BG_PAGE)
    draw = ImageDraw.Draw(img)
    short_side = min(px_w, px_h)
    badge = short_side * 0.26
    cx, cy = px_w / 2, px_h / 2
    r = badge * 0.22  # corner radius for the centered logo badge
    draw.rounded_rectangle(
        [cx - badge / 2, cy - badge / 2, cx + badge / 2, cy + badge / 2],
        radius=r,
        fill=ACCENT_SOFT,
    )
    draw.polygon(sparkle_polygon(cx, cy, badge * 0.30, badge * 0.30 * 0.42), fill=ACCENT_STRONG)
    return img


def gen_splash():
    os.makedirs(OUT_SPLASH, exist_ok=True)
    for css_w, css_h, dpr, slug in SPLASH_DEVICES:
        px_w, px_h = css_w * dpr, css_h * dpr
        img = draw_splash(px_w, px_h)
        path = f"{OUT_SPLASH}/{slug}-{px_w}x{px_h}.png"
        save_png(img, path)


if __name__ == "__main__":
    gen_icons()
    gen_splash()
