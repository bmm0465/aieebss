from pathlib import Path


def parse_entries(lines: list[str]) -> list[str]:
    entries: list[str] = []
    buffer: str | None = None
    paren_depth = 0

    continuation_prefixes = ("(", "/", ",", "-", "—")

    for raw_line in lines:
        line = raw_line.strip()

        if not line:
            if buffer is not None and paren_depth <= 0:
                entries.append(buffer)
                buffer = None
            continue

        if len(line) == 1 and line.isalpha() and line.isupper():
            if buffer is not None:
                entries.append(buffer)
                buffer = None
                paren_depth = 0
            continue

        if buffer is None:
            buffer = line
            paren_depth = line.count("(") - line.count(")")
        else:
            if paren_depth > 0 or line.startswith(continuation_prefixes):
                buffer = f"{buffer} {line}"
                paren_depth += line.count("(") - line.count(")")
            else:
                entries.append(buffer)
                buffer = line
                paren_depth = line.count("(") - line.count(")")

    if buffer is not None:
        entries.append(buffer)

    return entries


def classify_entries(entries: list[str]) -> tuple[list[str], list[str], list[str]]:
    double = []
    single = []
    plain = []

    for entry in entries:
        if "**" in entry:
            double.append(entry)
        elif "*" in entry:
            single.append(entry)
        else:
            plain.append(entry)

    return double, single, plain


def main() -> None:
    root = Path(__file__).resolve().parent
    input_path = root / "words.txt"
    output_path = root / "words_by_star.txt"

    lines = input_path.read_text(encoding="utf-8").splitlines()
    entries = parse_entries(lines)
    double, single, plain = classify_entries(entries)

    with output_path.open("w", encoding="utf-8", newline="\n") as f:
        f.write(f"~** (count: {len(double)})\n")
        for entry in double:
            f.write(entry + "\n")
        f.write("\n")

        f.write(f"~* (count: {len(single)})\n")
        for entry in single:
            f.write(entry + "\n")
        f.write("\n")

        f.write(f"~ (count: {len(plain)})\n")
        for entry in plain:
            f.write(entry + "\n")


if __name__ == "__main__":
    main()

