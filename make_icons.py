# -*- coding: utf-8 -*-
from PIL import Image, ImageDraw

base = "android/app/src/main/res"
icon = Image.open("assets/icon.png").convert("RGBA")
bg = Image.open("assets/icon.png").convert("RGB").getpixel((20, 20))
hexc = "#%02X%02X%02X" % bg

legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
fg = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

for d, sz in legacy.items():
    im = icon.resize((sz, sz), Image.LANCZOS)
    im.convert("RGB").save("%s/mipmap-%s/ic_launcher.png" % (base, d))
    mask = Image.new("L", (sz, sz), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, sz, sz), fill=255)
    rnd = Image.new("RGBA", (sz, sz), (0, 0, 0, 0))
    rnd.paste(im, (0, 0), mask)
    rnd.save("%s/mipmap-%s/ic_launcher_round.png" % (base, d))

for d, sz in fg.items():
    icon.resize((sz, sz), Image.LANCZOS).save("%s/mipmap-%s/ic_launcher_foreground.png" % (base, d))

xml = '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">%s</color>\n</resources>\n' % hexc
with open("%s/values/ic_launcher_background.xml" % base, "w", encoding="utf-8") as f:
    f.write(xml)

print("安卓图标已生成，自适应背景色 =", hexc)
