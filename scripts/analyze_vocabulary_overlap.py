import json
from collections import defaultdict
from pathlib import Path


def main() -> None:
    base = Path(__file__).resolve().parents[1]
    source_path = base / "data" / "vocabulary_level.json"
    output_path = base / "data" / "vocabulary_overlap_analysis.json"

    data = json.loads(source_path.read_text(encoding="utf-8"))
    publisher_keys = list(data["metadata"]["publishers"].keys())

    all_words = {key: [] for key in publisher_keys}
    word_publishers: defaultdict[str, set[str]] = defaultdict(set)

    for unit in data["units"]:
        for entry in unit["entries"]:
            for pub in publisher_keys:
                word = entry.get(pub)
                if word:
                    all_words[pub].append(word)
                    word_publishers[word].add(pub)

    common_words = set(all_words[publisher_keys[0]])
    for pub in publisher_keys[1:]:
        common_words &= set(all_words[pub])

    word_publishers_list = [
        {
            "word": word,
            "publisher_count": len(publishers),
            "publishers": sorted(publishers),
        }
        for word, publishers in sorted(word_publishers.items())
    ]

    result = {
        "metadata": {
            "source": "vocabulary_level.json",
            "generated": "2025-11-11",
            "description": "출판사별 단원 어휘의 중복 분포 분석 결과",
        },
        "all_publishers_overlap": {
            "count": len(common_words),
            "words": sorted(common_words),
        },
        "word_publishers": word_publishers_list,
    }

    output_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8"
    )


if __name__ == "__main__":
    main()

