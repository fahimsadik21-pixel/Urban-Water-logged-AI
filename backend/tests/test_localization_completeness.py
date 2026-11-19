"""Automated Test Suite for Frontend Localization Completeness & Bilingual Key Parity.

Verifies that:
1. Every translation key present in English ('en') has an exact corresponding translation in Bengali ('bn').
2. Every translation key present in Bengali ('bn') has an exact corresponding translation in English ('en').
3. No empty translation values exist in either language.
4. Essential categories (nav, status, priority, advisory, safety gates, tour stages) are fully covered.
"""

from __future__ import annotations

import re
from pathlib import Path
import pytest

FRONTEND_LANG_FILE = Path(__file__).resolve().parent.parent.parent / "frontend" / "src" / "contexts" / "LanguageContext.tsx"


def parse_translations() -> tuple[dict[str, str], dict[str, str]]:
    """Parse translation dictionaries from LanguageContext.tsx."""
    assert FRONTEND_LANG_FILE.exists(), f"Language file not found at: {FRONTEND_LANG_FILE}"
    content = FRONTEND_LANG_FILE.read_text(encoding="utf-8")

    en_split = content.split("en: {")
    assert len(en_split) > 1, "Failed to locate 'en: {' block"
    bn_split = en_split[1].split("bn: {")
    assert len(bn_split) > 1, "Failed to locate 'bn: {' block"

    en_block = bn_split[0]
    bn_block = bn_split[1].split("};\n\n/**")[0] if "/**" in bn_split[1] else bn_split[1].split("};")[0]

    key_val_pattern = re.compile(r"'([a-zA-Z0-9_.]+)'\s*:\s*'([^']*)'")

    en_dict = dict(key_val_pattern.findall(en_block))
    bn_dict = dict(key_val_pattern.findall(bn_block))

    return en_dict, bn_dict


def test_localization_key_parity():
    """Verify 100% key parity between English and Bengali dictionaries."""
    en_dict, bn_dict = parse_translations()

    en_keys = set(en_dict.keys())
    bn_keys = set(bn_dict.keys())

    missing_in_bn = en_keys - bn_keys
    missing_in_en = bn_keys - en_keys

    assert not missing_in_bn, f"Found {len(missing_in_bn)} keys in 'en' missing from 'bn': {sorted(missing_in_bn)}"
    assert not missing_in_en, f"Found {len(missing_in_en)} keys in 'bn' missing from 'en': {sorted(missing_in_en)}"
    assert len(en_keys) >= 230, f"Expected at least 230 translation keys, found {len(en_keys)}"


def test_localization_no_empty_values():
    """Verify that no translation key has an empty string value."""
    en_dict, bn_dict = parse_translations()

    for k, v in en_dict.items():
        assert v.strip(), f"English key '{k}' has empty translation value"

    for k, v in bn_dict.items():
        assert v.strip(), f"Bengali key '{k}' has empty translation value"


def test_localization_critical_categories_covered():
    """Verify presence of essential municipal domain categories."""
    en_dict, _ = parse_translations()

    required_prefixes = [
        "nav.",
        "status.",
        "priority.",
        "advisory.",
        "safety.gate_",
        "tour.",
        "empty.",
        "map.",
        "intel.",
        "pump.",
        "fleet.",
        "public.",
        "admin.",
    ]

    for prefix in required_prefixes:
        matching = [k for k in en_dict if k.startswith(prefix)]
        assert len(matching) > 0, f"Missing required category prefix '{prefix}' in translations"
