"""Check that the English, Hindi, and Marathi catalogs stay in sync."""

import json
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG_DIR = ROOT / "src" / "lib" / "i18n" / "messages"
LANGUAGES = ("en", "hi", "mr")


def load_catalog(language: str) -> dict[str, str]:
    path = CATALOG_DIR / f"{language}.json"
    with path.open(encoding="utf-8") as catalog_file:
        catalog = json.load(catalog_file)
    if not all(isinstance(value, str) for value in catalog.values()):
        raise ValueError(f"{path.name} must contain only text values")
    return catalog


def main() -> int:
    try:
        catalogs = {language: load_catalog(language) for language in LANGUAGES}
    except (OSError, json.JSONDecodeError, ValueError) as error:
        print(f"Locale check failed: {error}", file=sys.stderr)
        return 1

    english_keys = set(catalogs["en"])
    problems: list[str] = []
    for language in LANGUAGES[1:]:
        missing = sorted(english_keys - set(catalogs[language]))
        extra = sorted(set(catalogs[language]) - english_keys)
        if missing:
            problems.append(f"{language}: missing keys: {', '.join(missing)}")
        if extra:
            problems.append(f"{language}: unexpected keys: {', '.join(extra)}")

        for key in sorted(english_keys & set(catalogs[language])):
            if not catalogs[language][key].strip():
                problems.append(f"{language}: {key} is empty")
            elif not key.startswith("lang.") and catalogs[language][key] == catalogs["en"][key]:
                problems.append(f"{language}: {key} is still English")

    if problems:
        print("Locale check failed:", file=sys.stderr)
        print("\n".join(f"- {problem}" for problem in problems), file=sys.stderr)
        return 1

    print(f"Locale check passed: {len(english_keys)} messages in English, Hindi, and Marathi.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
