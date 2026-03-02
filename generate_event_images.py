from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from pathlib import Path


ROOT = Path(__file__).resolve().parent
IMAGES_DIR = ROOT / "images"


EVENT_IMAGE_PLAN = [
    ("event-ai-robotics.jpg", "image1.jpg", (18, 36, 82)),
    ("event-creative-arts.jpg", "image2.jpg", (102, 25, 102)),
    ("event-sports-festival.jpg", "image3.jpg", (20, 83, 45)),
    ("event-entrepreneurship.jpg", "image4.jpg", (92, 58, 13)),
    ("event-career-fair.jpg", "image5.jpg", (20, 42, 94)),
    ("event-health-wellness.jpg", "campus image.jpg", (3, 105, 110)),
    ("event-green-campus.jpg", "image2.jpg", (12, 99, 53)),
    ("event-cultural-night.jpg", "image4.jpg", (122, 28, 93)),
]


def enhance_image(src_path: Path, tint_rgb: tuple[int, int, int]) -> Image.Image:
    image = Image.open(src_path).convert("RGB")

    # Standard 16:9 hero/card friendly resolution
    image = ImageOps.fit(image, (1600, 900), method=Image.Resampling.LANCZOS)

    # Improve sharpness/clarity
    image = ImageEnhance.Contrast(image).enhance(1.15)
    image = ImageEnhance.Color(image).enhance(1.18)
    image = ImageEnhance.Brightness(image).enhance(1.05)
    image = image.filter(ImageFilter.UnsharpMask(radius=1.8, percent=170, threshold=2))

    # Subtle event-specific tint for differentiation
    tint_layer = Image.new("RGB", image.size, tint_rgb)
    image = Image.blend(image, tint_layer, 0.10)

    return image


def main() -> None:
    for output_name, source_name, tint in EVENT_IMAGE_PLAN:
        src = IMAGES_DIR / source_name
        out = IMAGES_DIR / output_name

        if not src.exists():
            print(f"Skipping {output_name} (missing source: {source_name})")
            continue

        enhanced = enhance_image(src, tint)
        enhanced.save(out, format="JPEG", quality=95, optimize=True)
        print(f"Generated: {out.name}")


if __name__ == "__main__":
    main()
