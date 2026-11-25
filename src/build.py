"""Sestaví index.html ze src/template.html (fotky, rozměry, pixelové náhledy, ikonky)."""
import json, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = root / "src"
meta = json.loads((src / "meta.json").read_text())
icons = dict(l.split(" ", 1) for l in (src / "icons.txt").read_text().splitlines() if l.strip())
html = (src / "template.html").read_text(encoding="utf-8")

def fig(m):
    name, cap, alt, cls, tapes, loading = m.group(1).split("|")
    d = meta[name]
    tape_html = "".join(f'<span class="tape {t}"></span>' for t in tapes.split(",") if t)
    load = 'fetchpriority="high"' if loading == "eager" else 'loading="lazy"'
    return (f'<figure class="ph {cls}" style="--mx:{d["mx"]}%;--my:{d["my"]}%;--mxf:{d["mx"]/100:.4f};--tiny:url({d["tiny"]})">'
            f'<button class="ph-btn" type="button" data-full="img/{name}.jpg" data-cap="{cap}" aria-label="Zvětšit fotku: {cap}">'
            f'<img src="img/{name}-f.webp" width="{d["w"]}" height="{d["h"]}" alt="{alt}" {load} decoding="async" onload="this.closest(\'.ph\').classList.add(\'ok\')">'
            f'</button>{tape_html}<figcaption class="cap">{cap}</figcaption></figure>')

html = re.sub(r"%%FIG:([^%]+)%%", fig, html)
html = re.sub(r"%%ICON:(\w+)%%", lambda m: icons[m.group(1)], html)
html = html.replace("%%STAR%%", icons["STAR"])
html = re.sub(r"%%([WH]):(\w+)%%", lambda m: str(meta[m.group(2)]["w" if m.group(1) == "W" else "h"]), html)
assert "%%" not in html, re.findall(r"%%[^%]*%%", html)
(root / "index.html").write_text(html, encoding="utf-8")
print("ok", len(html), "bytes")
