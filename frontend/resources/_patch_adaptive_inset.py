"""Use a modest adaptive inset so the full medallion stays visible (not tiny, not cropped)."""
from pathlib import Path

INSET = "10%"  # small padding so gold circle is not clipped by rounded launcher masks

android_res = Path(__file__).resolve().parents[1] / "android" / "app" / "src" / "main" / "res"
files = [
    android_res / "mipmap-anydpi-v26" / "ic_launcher.xml",
    android_res / "mipmap-anydpi-v26" / "ic_launcher_round.xml",
]

template = f"""<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background>
        <inset android:drawable="@mipmap/ic_launcher_background" android:inset="{INSET}" />
    </background>
    <foreground>
        <inset android:drawable="@mipmap/ic_launcher_foreground" android:inset="{INSET}" />
    </foreground>
</adaptive-icon>
"""

for path in files:
    if not path.exists():
        print(f"skip (missing): {path}")
        continue
    path.write_text(template, encoding="utf-8")
    print(f"patched ({INSET}): {path}")
