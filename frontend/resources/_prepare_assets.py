"""One-shot helper: build Capacitor icon/splash sources from the final logo."""
from PIL import Image
from pathlib import Path

out_dir = Path(__file__).resolve().parent
src = Image.open(out_dir / "kutumbam-final-full-name.png").convert("RGBA")

src.save(out_dir / "icon-only.png")
src.save(out_dir / "icon.png")
src.save(out_dir / "logo.png")

# Adaptive background: deep navy matching the emblem
Image.new("RGBA", (1024, 1024), (15, 23, 42, 255)).save(out_dir / "icon-background.png")

# Adaptive foreground: emblem with safe-zone padding
fg = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
scale = 0.82
new_size = int(1024 * scale)
resized = src.resize((new_size, new_size), Image.Resampling.LANCZOS)
offset = ((1024 - new_size) // 2, (1024 - new_size) // 2)
fg.paste(resized, offset, resized)
fg.save(out_dir / "icon-foreground.png")


def make_splash(size=2732, logo_ratio=0.42, bg_rgb=(15, 23, 42)):
    canvas = Image.new("RGBA", (size, size), (*bg_rgb, 255))
    logo_size = int(size * logo_ratio)
    logo = src.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    x = (size - logo_size) // 2
    y = (size - logo_size) // 2
    canvas.paste(logo, (x, y), logo)
    return canvas


make_splash(bg_rgb=(15, 23, 42)).save(out_dir / "splash.png")
make_splash(bg_rgb=(3, 7, 18)).save(out_dir / "splash-dark.png")

print("Assets ready:")
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
