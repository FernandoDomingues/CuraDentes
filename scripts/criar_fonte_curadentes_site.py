# -*- coding: utf-8 -*-
"""
Gera a família CuraDentes (vários pesos) para o SITE, em public/fonts/curadentes/.
Base: Montserrat (SIL OFL 1.1) — renomeação permitida pela licença. Não usa Nexa.
"""
import os, shutil
from fontTools.ttLib import TTFont

SRC = "_montsrc_tmp"
OUT = os.path.join("public", "fonts", "curadentes")
os.makedirs(OUT, exist_ok=True)
FAMILY = "CuraDentes"

# Montserrat weight -> (subfamília, peso CSS, é o "Bold" RIBBI?)
WEIGHTS = [
    ("Light", "Light", 300, False),
    ("Regular", "Regular", 400, False),
    ("Medium", "Medium", 500, False),
    ("SemiBold", "SemiBold", 600, False),
    ("Bold", "Bold", 700, True),
]


def set_name(font, nameID, value):
    font["name"].setName(value, nameID, 3, 1, 0x409)
    font["name"].setName(value, nameID, 1, 0, 0)


def build(src_weight, subfamily, weight_class, is_bold):
    f = TTFont(os.path.join(SRC, f"Montserrat-{src_weight}.ttf"))
    name = f["name"]
    orig = name.getDebugName(0) or ""
    set_name(f, 0, orig + "  ||  CuraDentes: derivado (renomeacao) da Montserrat, SIL OFL 1.1. (c) 2026 CuraDentes.")

    full = FAMILY if subfamily == "Regular" else f"{FAMILY} {subfamily}"
    ps = f"{FAMILY}-{subfamily}"
    if subfamily in ("Regular", "Bold"):       # par RIBBI
        set_name(f, 1, FAMILY)
        set_name(f, 2, "Bold" if is_bold else "Regular")
    else:                                        # pesos fora do RIBBI
        set_name(f, 1, f"{FAMILY} {subfamily}")
        set_name(f, 2, "Regular")
    set_name(f, 4, full)
    set_name(f, 6, ps)
    set_name(f, 16, FAMILY)
    set_name(f, 17, subfamily)
    set_name(f, 3, f"{ps};2026")
    for rec in list(name.names):
        if rec.nameID in (1, 4, 6, 16, 17) and b"Montserrat" in rec.toBytes():
            name.removeNames(nameID=rec.nameID)

    os2 = f["OS/2"]
    os2.usWeightClass = weight_class
    if is_bold:
        f["head"].macStyle |= 0x01
        os2.fsSelection = (os2.fsSelection & ~0x40) | 0x20
    else:
        f["head"].macStyle &= ~0x01
        os2.fsSelection = (os2.fsSelection & ~0x20) | 0x40

    for flavor in ("woff2", "woff"):
        f.flavor = flavor
        f.save(os.path.join(OUT, f"{FAMILY}-{subfamily}.{flavor}"))
    return weight_class


for sw, sub, wc, isb in WEIGHTS:
    build(sw, sub, wc, isb)
    print(f"  gerado: {FAMILY}-{sub} (peso {wc})")

shutil.copy2(os.path.join(SRC, "OFL.txt"), os.path.join(OUT, "OFL-CuraDentes.txt"))
print("OK ->", OUT)
print("\n".join("  - " + x for x in sorted(os.listdir(OUT))))
