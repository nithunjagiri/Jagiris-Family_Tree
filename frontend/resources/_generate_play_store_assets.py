"""Generate Google Play Console listing graphics from the approved medallion logo.

Outputs (under docs/play-store/assets/):
  - play-icon-512.png          (512x512 high-res icon)
  - feature-graphic-1024x500.png
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
SRC = Path(__file__).resolve().parent / "kutumbam-final-full-name.png"
OUT = ROOT / "docs" / "play-store" / "assets"
NAVY = (15, 23, 42, 255)
WHITE = (255, 255, 255, 255)


def fit_square(im: Image.Image, size: int, fill=NAVY, cover: float = 0.86) -> Image.Image:
    cover = min(cover, 1.0)
    canvas = Image.new("RGBA", (size, size), fill)
    target = int(size * cover)
    ratio = im.width / max(im.height, 1)
    if ratio >= 1:
        nw, nh = target, max(1, int(target / ratio))
    else:
        nh, nw = target, max(1, int(target * ratio))
    resized = im.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((size - nw) // 2, (size - nh) // 2), resized)
    return canvas


def make_feature(im: Image.Image, width=1024, height=500) -> Image.Image:
    canvas = Image.new("RGBA", (width, height), NAVY)
    logo_h = int(height * 0.72)
    logo = fit_square(im, logo_h, fill=NAVY, cover=0.92)
    x = (width - logo_h) // 2
    y = (height - logo_h) // 2 - 10
    canvas.paste(logo, (x, y), logo)

    draw = ImageDraw.Draw(canvas)
    title = "Jagiri's Kutumbam"
    try:
        font = ImageFont.truetype("arial.ttf", 28)
    except OSError:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), title, font=font)
    tw = bbox[2] - bbox[0]
    draw.text(((width - tw) // 2, height - 48), title, fill=WHITE, font=font)
    return canvas.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    src = Image.open(SRC).convert("RGBA")
    icon = fit_square(src, 512, cover=0.86)
    # Play high-res icon: 32-bit PNG; keep opaque navy background (no transparency needed)
    icon_rgb = Image.new("RGBA", (512, 512), NAVY)
    icon_rgb.paste(icon, (0, 0), icon)
    icon_path = OUT / "play-icon-512.png"
    icon_rgb.save(icon_path, format="PNG")

    feature = make_feature(src)
    feature_path = OUT / "feature-graphic-1024x500.png"
    feature.save(feature_path, format="PNG")

    print(f"Wrote {icon_path} ({icon_rgb.size})")
    print(f"Wrote {feature_path} ({feature.size})")


if __name__ == "__main__":
    main()
