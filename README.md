# Byteček Mníšek: web k inzerátu

Web běží přes GitHub Pages z této větve (`gh-pages`).

- `index.html`: hotová stránka (tohle se zobrazuje na webu)
- `img/`: zpracované fotky (`*-f.webp` s ledovým okrajem, `*.jpg` čisté pro zvětšení) a zlaté nápisy z letáku
- `src/`: zdroj (`template.html`) a skripty, ze kterých se `index.html` skládá (`python3 src/build.py`)

Instagram pro tlačítko „DM ME“ se nastavuje v `index.html` (a v `src/template.html`) na řádku `var IG_NICK = "..."`.
