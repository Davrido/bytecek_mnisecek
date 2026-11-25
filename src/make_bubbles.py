"""Fotky Spiriny jako skleněné bubliny (sférické zkreslení, modrý okraj, odlesky). Výstup: img/<name>-b.webp"""
import sys, numpy as np
from PIL import Image, ImageOps
SRC, OUT = sys.argv[1], sys.argv[2]
spec = [  # name, file, square crop (l, t, side), output diameter, highlight side (-1 vlevo, +1 vpravo)
    ("spirina-1", "80d53636-image.jpg", (0, 130, 1480), 1000, 1),
    ("spirina-2", "cada41a7-image.jpg", (40, 300, 1360), 640, -1),
    ("spirina-3", "ea7706ca-image.jpg", (1050, 420, 2250), 640, -1),
]
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
for name, f, (l, t, side), D, hs in spec:
    im = ImageOps.exif_transpose(Image.open(f"{SRC}/{f}")).convert("RGB").crop((l, t, l + side, t + side))
    S = 2 * D  # supersampling pro hladký okraj
    src = np.asarray(im.resize((S, S), Image.LANCZOS)).astype(np.float32) / 255
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u = (xx + .5) / S * 2 - 1; v = (yy + .5) / S * 2 - 1
    r = np.sqrt(u * u + v * v); rc = np.minimum(r, .9999)
    # sférické zkreslení: střed zvětšený, okraje stlačené
    rs = .25 * rc + .75 * (np.arcsin(rc) / (np.pi / 2))
    k = np.where(r > 1e-6, rs / np.maximum(r, 1e-6), 0)
    sx = (u * k + 1) / 2 * (S - 1); sy = (v * k + 1) / 2 * (S - 1)
    x0 = np.clip(np.floor(sx).astype(int), 0, S - 2); y0 = np.clip(np.floor(sy).astype(int), 0, S - 2)
    fx = (sx - x0)[..., None]; fy = (sy - y0)[..., None]
    c = (src[y0, x0] * (1 - fx) * (1 - fy) + src[y0, x0 + 1] * fx * (1 - fy) + src[y0 + 1, x0] * (1 - fx) * fy + src[y0 + 1, x0 + 1] * fx * fy)
    z = np.sqrt(np.clip(1 - rc * rc, 0, 1))[..., None]
    c = c * (.72 + .28 * z)                                   # ztmavení k okraji (objem koule)
    rim = smooth(.72, 1, r)[..., None]
    c = c * (1 - .55 * rim) + np.array([.16, .55, .92]) * .55 * rim   # modrý skleněný okraj
    ring = np.exp(-((r - .975) / .012) ** 2)[..., None]       # tenká světlá hrana
    c = c + (1 - c) * .85 * ring
    # velký měkký odlesk vlevo nahoře
    hx, hy = u - hs * .36, v + .5
    h1 = np.exp(-((hx / .36) ** 2 + (hy / .2) ** 2) * 2.4)[..., None]
    c = c + (1 - c) * .55 * h1
    # malý ostrý odlesk
    h2 = np.exp(-(((u - hs * .52) / .06) ** 2 + ((v + .6) / .04) ** 2))[..., None]
    c = c + (1 - c) * .95 * h2
    # světelný srpek vpravo dole
    cres = (smooth(.78, .93, r) * (1 - smooth(.95, .995, r)) * np.clip((-hs * u + v) * .9, 0, 1))[..., None]
    c = c + (np.array([.85, .97, 1]) - c) * .6 * cres
    a = 1 - smooth(.995, 1.0, r)
    out = np.dstack([np.clip(c, 0, 1) * 255, a * 255]).astype(np.uint8)
    img = Image.fromarray(out, "RGBA").resize((D, D), Image.LANCZOS)
    img.save(f"{OUT}/{name}-b.webp", quality=82, method=6, alpha_quality=90)
    print(name, img.size)
