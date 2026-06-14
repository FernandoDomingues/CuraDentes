# -*- coding: utf-8 -*-
"""
Cria a família de fonte "CuraDentes" a partir da Montserrat (SIL OFL 1.1).

Legal: a OFL permite modificar e RENOMEAR derivados, desde que (a) o resultado
continue sob OFL, (b) o aviso de copyright original seja mantido, (c) o nome
reservado "Montserrat" NÃO seja usado no derivado, (d) a licença acompanhe.
Tudo isso é respeitado aqui. NÃO usamos nenhum arquivo da Nexa.

As letras ficam com o estilo geométrico (próximo da Nexa) e os números são os
da Montserrat — ambos por serem a própria base Montserrat.
"""
import os, shutil
from fontTools.ttLib import TTFont

SRC = "_montsrc_tmp"
BASE = "email marketing - informativo/plano mensal"
OUT = os.path.join(BASE, "fonts")
os.makedirs(OUT, exist_ok=True)

FAMILY = "CuraDentes"


def set_name(font, nameID, value):
    # Windows (3,1,0x409) e Mac (1,0,0) para máxima compatibilidade
    font["name"].setName(value, nameID, 3, 1, 0x409)
    font["name"].setName(value, nameID, 1, 0, 0)


def rebrand(src_ttf, subfamily, weight_class, is_bold):
    f = TTFont(src_ttf)
    name = f["name"]

    orig_copy = name.getDebugName(0) or ""
    # Mantém o copyright original da Montserrat e acrescenta a nota do derivado.
    set_name(f, 0, orig_copy + "  ||  CuraDentes: derivado (renomeacao) da Montserrat, "
             "sob SIL Open Font License 1.1. (c) 2026 CuraDentes.")

    full = FAMILY if subfamily == "Regular" else f"{FAMILY} {subfamily}"
    ps = f"{FAMILY}-{subfamily}"

    if is_bold:  # peso "bold" do par RIBBI -> familia base + estilo Bold
        set_name(f, 1, FAMILY)
        set_name(f, 2, "Bold")
    else:        # peso fora do RIBBI (Light) -> familia distinta p/ apps legados
        set_name(f, 1, f"{FAMILY} {subfamily}")
        set_name(f, 2, "Regular")

    set_name(f, 4, full)
    set_name(f, 6, ps)
    set_name(f, 16, FAMILY)      # typographic family (apps modernos)
    set_name(f, 17, subfamily)   # typographic subfamily
    set_name(f, 3, f"{ps};2026")

    # Remove menções a "Montserrat" do nome do produto (ID 1/4/6/16/17 já trocados);
    # garante que nenhum nameID público restante use o nome reservado.
    for rec in list(name.names):
        if rec.nameID in (1, 4, 6, 16, 17) and b"Montserrat" in rec.toBytes():
            name.removeNames(nameID=rec.nameID)

    os2 = f["OS/2"]
    os2.usWeightClass = weight_class
    if is_bold:
        f["head"].macStyle |= 0x01
        os2.fsSelection = (os2.fsSelection & ~0x40) | 0x20  # BOLD on, REGULAR off
    else:
        f["head"].macStyle &= ~0x01
        os2.fsSelection = (os2.fsSelection & ~0x20) | 0x40  # REGULAR on, BOLD off

    ttf_out = os.path.join(OUT, f"{FAMILY}-{subfamily}.ttf")
    f.save(ttf_out)

    # versões web
    for flavor in ("woff2", "woff"):
        g = TTFont(ttf_out)
        g.flavor = flavor
        g.save(os.path.join(OUT, f"{FAMILY}-{subfamily}.{flavor}"))
    return ttf_out


b = rebrand(os.path.join(SRC, "Montserrat-Bold.ttf"), "Bold", 700, True)
l = rebrand(os.path.join(SRC, "Montserrat-Light.ttf"), "Light", 300, False)

# Licença OFL deve acompanhar o derivado
shutil.copy2(os.path.join(SRC, "OFL.txt"), os.path.join(OUT, "OFL-CuraDentes.txt"))

print("Família CuraDentes gerada em:", OUT)
for fn in sorted(os.listdir(OUT)):
    if fn.startswith("CuraDentes") or fn.startswith("OFL"):
        print("  -", fn, os.path.getsize(os.path.join(OUT, fn)), "bytes")

# Confirma os nomes finais
print("--- verificação dos nomes ---")
for fn in (b, l):
    t = TTFont(fn)
    print(os.path.basename(fn), "| family(1):", t["name"].getDebugName(1),
          "| full(4):", t["name"].getDebugName(4),
          "| weight:", t["OS/2"].usWeightClass)
