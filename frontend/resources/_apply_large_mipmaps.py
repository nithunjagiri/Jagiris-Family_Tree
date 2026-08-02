"""Overwrite Android launcher mipmaps with the large prepared emblem (post capacitor-assets)."""
from PIL import Image
from pathlib import Path

frontend = Path(__file__).resolve().parents[1]
res = frontend / "android" / "app" / "src" / "main" / "res"
src = Image.open(frontend / "resources" / "icon-only.png").convert("RGBA")
bg = Image.new("RGBA", src.size, (15, 23, 42, 255))

# Android density pixel sizes for ic_launcher
SIZES = {
    "mipmap-ldpi": 36,
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

# Adaptive layer sizes (foreground/background)
FG_SIZES = {
    "mipmap-ldpi": 81,
    "mipmap-mdpi": 108,
    "mipmap-hdpi": 162,
    "mipmap-xhdpi": 216,
    "mipmap-xxhdpi": 324,
    "mipmap-xxxhdpi": 432,
}


def resize(im: Image.Image, size: int) -> Image.Image:
    return im.resize((size, size), Image.Resampling.LANCZOS)


for folder, size in SIZES.items():
    d = res / folder
    if not d.is_dir():
        continue
    icon = resize(src, size)
    icon.save(d / "ic_launcher.png")
    # Round: same full emblem (launcher mask rounds it)
    icon.save(d / "ic_launcher_round.png")
    print(f"{folder}: ic_launcher {size}px")

for folder, size in FG_SIZES.items():
    d = res / folder
    if not d.is_dir():
        continue
    resize(src, size).save(d / "ic_launcher_foreground.png")
    resize(bg, size).save(d / "ic_launcher_background.png")
    print(f"{folder}: adaptive layers {size}px")

print("mipmaps applied")
