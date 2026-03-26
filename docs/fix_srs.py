"""One-time fix: SRS.md merged with literal \\n sequences and mojibake. Run: python fix_srs.py"""
from pathlib import Path

def main():
    p = Path(__file__).resolve().parent / "SRS.md"
    t = p.read_text(encoding="utf-8")
    lines = t.splitlines()
    blob_i = None
    for i, L in enumerate(lines):
        if len(L) > 10000 and "Appendix P" in L:
            blob_i = i
            break
    if blob_i is None:
        print("No blob line found; SRS may already be fixed.")
        return
    prefix_lines = lines[:blob_i]
    blob = lines[blob_i]
    if blob.startswith("\\n"):
        blob = blob[2:]
    fixed = blob.replace("\\n", "\n")
    for bad, good in [
        ("â€"", "\u2014"),
        ("Â§", "\u00a7"),
        ("â€“", "\u2013"),
    ]:
        fixed = fixed.replace(bad, good)
    body = "\n".join(prefix_lines) + "\n\n" + fixed.strip() + "\n\n*End of Software Requirements Specification.*\n"
    body = body.replace("â€"", "\u2014").replace("Â§", "\u00a7").replace("â€“", "\u2013")
    p.write_text(body, encoding="utf-8", newline="\n")
    print("Fixed:", p, "bytes:", p.stat().st_size)


if __name__ == "__main__":
    main()
