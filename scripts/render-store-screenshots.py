from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "store-assets" / "source"
SIZE = (1320, 2868)

ZH_FONT = "/System/Library/Fonts/STHeiti Medium.ttc"
ZH_DISPLAY = "/System/Library/Fonts/Supplemental/Songti.ttc"
EN_FONT = "/System/Library/Fonts/SFNS.ttf"

SPECS = {
    "zh": [
        ("app-form-zh.png", "认识你自己", "输入出生资料，免费获得专属人生使用说明书", (360, 78, 920, 720)),
        ("app-result-zh.png", "你的能量，一图看懂", "64 闸门、36 通道、9 大中心，生成属于你的完整图谱", (300, 80, 980, 720)),
        ("app-detail-zh.png", "不止看图，更懂自己", "围绕优势、天赋、使命、决策与关系，给你一份走心解读", (280, 35, 1000, 700)),
        ("app-history-zh.png", "每一次探索，都留在身边", "本地历史记录，随时离线重看，不需要注册账号", (330, 220, 950, 510)),
        ("app-privacy-zh.png", "你的资料，只属于你", "本地保存、隐私模式、随时清除，把选择权交还给你", (330, 150, 950, 585)),
    ],
    "en": [
        ("app-form-en.png", "Know yourself", "Turn birth details into a personal Life Manual, free", (360, 78, 920, 720)),
        ("app-result-en.png", "See your energy clearly", "64 gates, 36 channels, and 9 centers in one personal chart", (300, 80, 980, 720)),
        ("app-detail-en.png", "More than a chart", "A thoughtful reading of your gifts, purpose, decisions, and relationships", (280, 35, 1000, 700)),
        ("app-history-en.png", "Your insights stay with you", "Private local history you can reopen offline, with no account", (330, 220, 950, 510)),
        ("app-privacy-en.png", "Your data belongs to you", "Local storage, Privacy Mode, and clear controls for deletion", (330, 150, 950, 585)),
    ],
}


def cover(image, size):
    ratio = max(size[0] / image.width, size[1] / image.height)
    scaled = image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)
    x = (scaled.width - size[0]) // 2
    y = (scaled.height - size[1]) // 2
    return scaled.crop((x, y, x + size[0], y + size[1]))


def contain(image, max_size):
    ratio = min(max_size[0] / image.width, max_size[1] / image.height)
    return image.resize((round(image.width * ratio), round(image.height * ratio)), Image.Resampling.LANCZOS)


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0], size[1]), radius=radius, fill=255)
    return mask


def fit_font(text, path, max_width, start_size, min_size=42):
    for size in range(start_size, min_size - 1, -2):
        font = ImageFont.truetype(path, size)
        if ImageDraw.Draw(Image.new("RGB", (1, 1))).textbbox((0, 0), text, font=font)[2] <= max_width:
            return font
    return ImageFont.truetype(path, min_size)


def render(lang, index, spec, background):
    filename, title, subtitle, crop = spec
    canvas = background.copy().convert("RGB")
    veil = Image.new("RGBA", SIZE, (5, 4, 8, 35))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), veil)
    draw = ImageDraw.Draw(canvas)

    body_path = ZH_FONT if lang == "zh" else EN_FONT
    display_path = ZH_DISPLAY if lang == "zh" else EN_FONT
    brand_font = ImageFont.truetype(body_path, 34)
    title_font = fit_font(title, display_path, 1110, 106 if lang == "zh" else 96)
    subtitle_font = fit_font(subtitle, body_path, 1080, 39, 30)

    draw.text((SIZE[0] // 2, 150), "PLUTO  LIFE  MANUAL", font=brand_font, fill=(207, 173, 121, 255), anchor="mm")
    draw.line((560, 205, 760, 205), fill=(207, 173, 121, 150), width=2)
    draw.text((SIZE[0] // 2, 330), title, font=title_font, fill=(248, 239, 224, 255), anchor="mm")
    draw.text((SIZE[0] // 2, 475), subtitle, font=subtitle_font, fill=(207, 195, 184, 255), anchor="mm")

    source = Image.open(SOURCE / filename).convert("RGB").crop(crop)
    source = contain(source, (1100, 1800))
    frame_pad = 26
    frame_size = (source.width + frame_pad * 2, source.height + frame_pad * 2)
    frame = Image.new("RGBA", frame_size, (13, 10, 16, 255))
    frame.paste(source, (frame_pad, frame_pad))
    mask = rounded_mask(frame_size, 42)

    shadow = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    x = (SIZE[0] - frame_size[0]) // 2
    y = 690 if index < 3 else 820
    shadow_draw.rounded_rectangle((x - 28, y - 20, x + frame_size[0] + 28, y + frame_size[1] + 46), radius=58, fill=(0, 0, 0, 175))
    shadow = shadow.filter(ImageFilter.GaussianBlur(34))
    canvas = Image.alpha_composite(canvas, shadow)
    canvas.paste(frame, (x, y), mask)

    border = ImageDraw.Draw(canvas)
    border.rounded_rectangle((x, y, x + frame_size[0], y + frame_size[1]), radius=42, outline=(204, 166, 104, 190), width=3)
    number_font = ImageFont.truetype(EN_FONT, 28)
    border.text((SIZE[0] // 2, 2690), f"0{index + 1}   /   05", font=number_font, fill=(169, 143, 104, 230), anchor="mm")

    output = ROOT / "store-assets" / "screenshots" / lang / f"{index + 1:02d}-{filename.removeprefix('app-')}"
    output.parent.mkdir(parents=True, exist_ok=True)
    canvas.convert("RGB").save(output, quality=96)
    print(output)


background = cover(Image.open(SOURCE / "pluto-store-bg-v1.png").convert("RGB"), SIZE)
for language, items in SPECS.items():
    for shot_index, shot in enumerate(items):
        render(language, shot_index, shot, background)
