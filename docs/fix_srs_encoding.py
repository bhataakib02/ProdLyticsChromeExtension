# Run from repo: python docs/fix_srs_encoding.py
"""Repair SRS.md: literal \\n sequences in bulk appendix + common UTF-8 mojibake."""
from pathlib import Path

# UTF-8 bytes for — – § mis-shown as Windows-1252 / Latin-1 mojibake
MOJIBAKE = [
    ("\u00e2\u20ac\u201d", "\u2014"),  # â€" -> em dash
    ("\u00e2\u20ac\u2122", "\u2014"),
    ("\u00c2\u00a7", "\u00a7"),  # Â§ -> §
    ("\u00e2\u0080\u0093", "\u2013"),  # en dash – (UTF-8 mojibake as Latin-1 triple)
    ("\u00e2\u0080\u0094", "\u2014"),
    ("\u00e2\u0089\u00a5", "\u2265"),  # ≥
    ("\u00e2\u0080\u009c", "\u201c"),  # left double quote
    ("\u00e2\u0080\u009d", "\u201d"),  # right double quote
]


def main():
    p = Path(__file__).resolve().parent / "SRS.md"
    t = p.read_text(encoding="utf-8")
    lines = t.splitlines(keepends=False)
    blob_i = None
    for i, line in enumerate(lines):
        if len(line) > 10_000 and "Appendix P" in line:
            blob_i = i
            break
    if blob_i is not None:
        prefix = "\n".join(lines[:blob_i])
        blob = lines[blob_i]
        if blob.startswith("\\n"):
            blob = blob[2:]
        blob = blob.replace("\\n", "\n")
        t = prefix + "\n\n" + blob.rstrip() + "\n\n*End of Software Requirements Specification.*\n"
    for bad, good in MOJIBAKE:
        t = t.replace(bad, good)
    # Extra mojibake seen after partial fix (UTF-8 read as cp1252 style)
    t = t.replace("â€œ", '"').replace("â€", '"')
    t = t.replace("â€“", "\u2013").replace("â‰¥", "\u2265")
    p.write_text(t, encoding="utf-8", newline="\n")
    nlines = t.count("\n") + 1
    print(f"OK: {p} | chars={len(t)} | lines~={nlines}")


if __name__ == "__main__":
    main()
