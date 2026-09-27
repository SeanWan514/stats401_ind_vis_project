#!/usr/bin/env python3
"""Fail deployment when the submitted site is incomplete or internally inconsistent."""

from __future__ import annotations

import csv
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit


ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / "dist"
EXPECTED_SECTIONS = [
    "overview",
    "selection",
    "analysis",
    "critique",
    "redesign",
    "explanation",
    "report",
    "conclusion",
]


class SubmissionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: list[str] = []
        self.local_refs: list[str] = []
        self.in_report = False
        self.report_depth = 0
        self.report_text: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        element_id = values.get("id")
        if element_id:
            self.ids.append(element_id)
        if self.in_report:
            self.report_depth += 1
        elif element_id == "report-body":
            self.in_report = True
            self.report_depth = 1
        for key in ("src", "href"):
            ref = values.get(key)
            if ref and not urlsplit(ref).scheme and not ref.startswith(("#", "mailto:")):
                self.local_refs.append(ref.split("#", 1)[0].split("?", 1)[0])

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if self.in_report:
            self.report_depth -= 1

    def handle_endtag(self, tag: str) -> None:
        if self.in_report:
            self.report_depth -= 1
            if self.report_depth == 0:
                self.in_report = False

    def handle_data(self, data: str) -> None:
        if self.in_report:
            self.report_text.append(data)


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def read_csv(name: str) -> list[dict[str, str]]:
    with (DIST / "data" / name).open(newline="", encoding="utf-8") as source:
        return list(csv.DictReader(source))


def main() -> None:
    required = [
        DIST / "index.html",
        DIST / "app.js",
        DIST / "styles.css",
        DIST / "data" / "characters.csv",
        DIST / "data" / "relationships.csv",
        DIST / "data" / "scenes.csv",
        DIST / "data" / "metadata.json",
        ROOT / "REPORT.md",
        ROOT / "README.md",
        DIST / "assets" / "images" / "hero-original.png",
        DIST / "assets" / "images" / "outro-original.png",
        DIST / "assets" / "images" / "original-episode4-network.png",
        DIST / "assets" / "images" / "star-wars-logo.png",
    ]
    missing = [str(path.relative_to(ROOT)) for path in required if not path.is_file()]
    if missing:
        fail(f"missing required files: {', '.join(missing)}")

    html = (DIST / "index.html").read_text(encoding="utf-8")
    parser = SubmissionParser()
    parser.feed(html)
    section_positions = [parser.ids.index(section) if section in parser.ids else -1 for section in EXPECTED_SECTIONS]
    if -1 in section_positions or section_positions != sorted(section_positions):
        fail("the eight required chapters are missing or out of order")

    report_text = " ".join(parser.report_text)
    report_words = re.findall(r"\b[\w’×–-]+\b", report_text)
    if not 500 <= len(report_words) <= 800:
        fail(f"rendered report has {len(report_words)} words; expected 500–800")

    broken: list[str] = []
    for ref in sorted(set(filter(None, parser.local_refs))):
        target = ROOT / ref if ref in {"README.md", "REPORT.md"} else DIST / ref
        if not target.exists():
            broken.append(ref)
    if broken:
        fail(f"broken local references: {', '.join(broken)}")

    characters = read_csv("characters.csv")
    relationships = read_csv("relationships.csv")
    scenes = read_csv("scenes.csv")
    if len(characters) != 8:
        fail(f"characters.csv has {len(characters)} rows; expected 8")
    missing_portraits = [row["image"] for row in characters if not (DIST / row["image"]).is_file()]
    if missing_portraits:
        fail(f"missing character portraits: {', '.join(missing_portraits)}")
    if len(relationships) != 28:
        fail(f"relationships.csv has {len(relationships)} rows; expected 28")
    if len(scenes) != 300:
        fail(f"scenes.csv has {len(scenes)} rows; expected 300")
    appearances = sum(int(row["scene_count"]) for row in characters)
    if appearances != 536:
        fail(f"character-scene appearances total {appearances}; expected 536")

    metadata = json.loads((DIST / "data" / "metadata.json").read_text(encoding="utf-8"))
    if not isinstance(metadata, dict):
        fail("metadata.json is not a JSON object")

    app = (DIST / "app.js").read_text(encoding="utf-8")
    for feature in ("d3.drag()", "d3.curveBundle", "renderMatrix", "renderTreemap", "renderRadial"):
        if feature not in app:
            fail(f"required D3 feature is absent: {feature}")
    for required_copy in ("Why four coordinated views?", "submission-note", "REPORT.md"):
        if required_copy not in html:
            fail(f"required submission explanation is absent: {required_copy}")

    print("Submission validation passed")
    print(f"  chapters: {len(EXPECTED_SECTIONS)}")
    print(f"  report words: {len(report_words)}")
    print(f"  characters / relationships / scenes / appearances: 8 / 28 / 300 / 536")
    print(f"  local references checked: {len(set(parser.local_refs))}")


if __name__ == "__main__":
    main()
