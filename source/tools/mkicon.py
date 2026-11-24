# Havoc City app icon: sunset sky, black skyline, a big "wanted" star. Writes PNGs and a .icns
import sys, io, struct, math, random
from PIL import Image, ImageDraw, ImageFilter
out = sys.argv[1]
N = 2048   # draw at 2x, scale down for smooth edges
img = Image.new('RGBA', (N, N), (0, 0, 0, 0))
# macOS icon grid: 824/1024 rounded square, ~22.5% corner radius
m = int(N * 100 / 1024); side = N - 2 * m; rad = int(side * 0.225)
mask = Image.new('L', (N, N), 0); ImageDraw.Draw(mask).rounded_rectangle([m, m, m + side, m + side], rad, fill=255)
# sky gradient
sky = Image.new('RGBA', (N, N))
top, mid, bot = (34, 22, 74), (196, 54, 98), (255, 150, 52)
px = sky.load()
for y in range(N):
    t = (y - m) / side; t = min(1, max(0, t))
    if t < 0.55: a, b, k = top, mid, t / 0.55
    else: a, b, k = mid, bot, (t - 0.55) / 0.45
    c = tuple(int(a[i] + (b[i] - a[i]) * k) for i in range(3)) + (255,)
    for x in range(N): px[x, y] = c
# soft sun glow low on the horizon
glow = Image.new('RGBA', (N, N), (0, 0, 0, 0)); gd = ImageDraw.Draw(glow)
cx, cy = N * 0.5, m + side * 0.78
for r in range(int(side * 0.42), 0, -8):
    al = int(150 * (1 - r / (side * 0.42)) ** 2); gd.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 210, 120, al))
sky = Image.alpha_composite(sky, glow)
d = ImageDraw.Draw(sky)
# skyline silhouette
random.seed(7); x = m - 10; base = m + side
while x < m + side + 10:
    w = random.randint(int(side * 0.05), int(side * 0.11)); h = random.randint(int(side * 0.12), int(side * 0.42))
    if abs((x + w / 2) - N / 2) < side * 0.12: h = int(side * 0.48)   # a tall tower in the middle
    d.rectangle([x, base - h, x + w, base], fill=(12, 10, 22, 255))
    if random.random() < 0.35: d.rectangle([x + w * 0.42, base - h - side * 0.05, x + w * 0.5, base - h], fill=(12, 10, 22, 255))   # antenna
    for wy in range(int(base - h + side * 0.03), int(base - side * 0.02), int(side * 0.035)):   # lit windows
        for wx in range(int(x + side * 0.012), int(x + w - side * 0.015), int(side * 0.022)):
            if random.random() < 0.28: d.rectangle([wx, wy, wx + side * 0.008, wy + side * 0.012], fill=(255, 196, 92, 255))
    x += w + random.randint(0, int(side * 0.01))
# the wanted star
def star(cx, cy, R, r, rot=-math.pi / 2):
    return [(cx + (R if i % 2 == 0 else r) * math.cos(rot + i * math.pi / 5), cy + (R if i % 2 == 0 else r) * math.sin(rot + i * math.pi / 5)) for i in range(10)]
scx, scy, R = N / 2, m + side * 0.38, side * 0.27
shadow = Image.new('RGBA', (N, N), (0, 0, 0, 0)); ImageDraw.Draw(shadow).polygon(star(scx, scy + side * 0.025, R, R * 0.45), fill=(0, 0, 0, 150))
sky = Image.alpha_composite(sky, shadow.filter(ImageFilter.GaussianBlur(side * 0.02)))
d = ImageDraw.Draw(sky)
d.polygon(star(scx, scy, R * 1.07, R * 0.49), fill=(14, 12, 24, 255))     # dark outline
d.polygon(star(scx, scy, R, R * 0.45), fill=(255, 190, 40, 255))
d.polygon([(scx, scy)] + star(scx, scy, R, R * 0.45)[0:3], fill=(255, 222, 120, 255))   # a highlight facet
img.paste(sky, (0, 0), mask)
# subtle edge highlight
edge = Image.new('RGBA', (N, N), (0, 0, 0, 0)); ImageDraw.Draw(edge).rounded_rectangle([m, m, m + side, m + side], rad, outline=(255, 255, 255, 40), width=int(N * 0.004))
img = Image.alpha_composite(img, edge)
big = img.resize((1024, 1024), Image.LANCZOS); big.save(f'{out}/icon-1024.png')
# .icns: PNG payloads for each slot
slots = [(b'icp4', 16), (b'icp5', 32), (b'icp6', 64), (b'ic07', 128), (b'ic08', 256), (b'ic09', 512), (b'ic10', 1024), (b'ic11', 32), (b'ic12', 64), (b'ic13', 256), (b'ic14', 512)]
chunks = b''
for t, s in slots:
    bio = io.BytesIO(); big.resize((s, s), Image.LANCZOS).save(bio, 'PNG'); data = bio.getvalue()
    chunks += t + struct.pack('>I', len(data) + 8) + data
open(f'{out}/icon.icns', 'wb').write(b'icns' + struct.pack('>I', len(chunks) + 8) + chunks)
print('icns bytes', len(chunks) + 8)
