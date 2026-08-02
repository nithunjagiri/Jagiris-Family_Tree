"""Build Capacitor icon/splash sources from the approved final medallion logo.

Preserves the full JAGIRI'S / KUTUMBAM circular emblem (no aggressive crop/zoom).
"""
from PIL import Image
from pathlib import Path

out_dir = Path(__file__).resolve().parent
src = Image.open(out_dir / "kutumbam-final-full-name.png").convert("RGBA")

NAVY = (15, 23, 42, 255)


def fit_square(im: Image.Image, size=1024, fill=NAVY, cover=0.94) -> Image.Image:
    """Center the full emblem on a square canvas. cover must be <= 1.0 to avoid cropping."""
    cover = min(cover, 1.0)
    canvas = Image.new("RGBA", (size, size), fill)
    target = int(size * cover)
    im_ratio = im.width / max(im.height, 1)
    if im_ratio >= 1:
        nw, nh = target, max(1, int(target / im_ratio))
    else:
        nh, nw = target, max(1, int(target * im_ratio))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    x = (size - nw) // 2
    y = (size - nh) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


# Full approved logo — slight zoom-out so circle edges clear the rounded mask
icon_full = fit_square(src, cover=0.86)
icon_full.save(out_dir / "icon-only.png")
icon_full.save(out_dir / "icon.png")
icon_full.save(out_dir / "logo.png")
icon_full.save(out_dir / "icon-foreground.png")

Image.new("RGBA", (1024, 1024), NAVY).save(out_dir / "icon-background.png")


def make_splash(size=2732, logo_ratio=0.48, bg_rgb=(15, 23, 42)):
    canvas = Image.new("RGBA", (size, size), (*bg_rgb, 255))
    logo_size = int(size * logo_ratio)
    logo = fit_square(src, size=logo_size, fill=(*bg_rgb, 255), cover=1.0)
    x = (size - logo_size) // 2
    y = (size - logo_size) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


make_splash(bg_rgb=(15, 23, 42)).save(out_dir / "splash.png")
make_splash(bg_rgb=(3, 7, 18)).save(out_dir / "splash-dark.png")

print("Restored full medallion logo (no crop).")
for name in [
    "icon-only.png",
    "icon-foreground.png",
    "icon-background.png",
    "splash.png",
    "splash-dark.png",
    "logo.png",
    "icon.png",
]:
    im = Image.open(out_dir / name)
    print(f"  {name}: {im.size} {im.mode}")
