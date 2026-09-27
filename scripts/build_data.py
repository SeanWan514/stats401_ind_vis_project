#!/usr/bin/env python3
"""Build the screenplay-derived data used by the Episode IV redesign.

The script reads the public revised fourth-draft screenplay from IMSDb, splits it
at INT./EXT. headings, detects the eight selected characters in action text and
speaker cues, and writes auditable CSV files for the four D3 views.

This is a screenplay analysis, not a measurement of final-film screen time.
"""

from __future__ import annotations

import csv
import argparse
import io
import json
import re
import urllib.request
from collections import defaultdict
from itertools import combinations
from pathlib import Path

from lxml import html


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "data"
SOURCE_URL = "https://imsdb.com/scripts/Star-Wars-A-New-Hope.html"

CHARACTERS = {
    "Luke Skywalker": {
        "aliases": [r"\bLUKE\b", r"\bSKYWALKER\b"],
        "speakers": {"LUKE"},
        "color": "#4EA3FF",
        "image": "assets/images/characters/luke-skywalker.jpeg",
        "description": "The Tatooine farm boy whose journey links every major setting and drives the Rebel assault.",
    },
    "Han Solo": {
        "aliases": [r"\bHAN\b", r"\bSOLO\b"],
        "speakers": {"HAN"},
        "color": "#4FA66A",
        "image": "assets/images/characters/han-solo.jpeg",
        "description": "A skeptical pilot whose connections bridge Luke's group, Leia's rescue, and the final battle.",
    },
    "Princess Leia": {
        "aliases": [r"\bLEIA\b"],
        "speakers": {"LEIA"},
        "color": "#F4F1E8",
        "image": "assets/images/characters/leia-organa.jpeg",
        "description": "Rebel leader, prisoner, and strategist whose mission sets the story in motion.",
    },
    "Darth Vader": {
        "aliases": [r"\bVADER\b"],
        "speakers": {"VADER"},
        "color": "#151820",
        "image": "assets/images/characters/darth-vader.jpeg",
        "description": "The Imperial enforcer connecting the opening pursuit, Death Star conflict, and trench battle.",
    },
    "Obi-Wan Kenobi": {
        "aliases": [r"\bOBI-WAN\b", r"\bKENOBI\b", r"\bBEN\b"],
        "speakers": {"BEN", "OBI-WAN", "OBI WAN"},
        "color": "#D98AA4",
        "image": "assets/images/characters/obi-wan-kenobi.jpeg",
        "description": "Luke's mentor, guiding the group from Tatooine into the Death Star rescue.",
    },
    "C-3PO": {
        "aliases": [r"\bTHREEPIO\b", r"\bC-3PO\b", r"\bSEE-THREEPIO\b"],
        "speakers": {"THREEPIO", "C-3PO", "SEE-THREEPIO"},
        "color": "#F0C84B",
        "image": "assets/images/characters/c-3po.jpeg",
        "description": "The protocol droid whose dialogue and presence connect the heroes' early and middle journeys.",
    },
    "R2-D2": {
        "aliases": [r"\bARTOO\b", r"\bARTOO-DETOO\b", r"\bR2-D2\b"],
        "speakers": {"ARTOO", "ARTOO-DETOO", "R2-D2"},
        "color": "#204B8F",
        "image": "assets/images/characters/r2-d2.jpeg",
        "description": "The astromech carrying the Death Star plans and accompanying Luke across the story.",
    },
    "Chewbacca": {
        "aliases": [r"\bCHEWBACCA\b", r"\bCHEWIE\b"],
        "speakers": {"CHEWBACCA", "CHEWIE"},
        "color": "#5B3424",
        "image": "assets/images/characters/chewbacca.jpeg",
        "description": "Han's loyal copilot and a constant presence from Mos Eisley through the Rebel victory.",
    },
}

CHARACTER_ORDER = list(CHARACTERS)
SPEAKER_LOOKUP = {
    speaker: character
    for character, config in CHARACTERS.items()
    for speaker in config["speakers"]
}
ALIAS_PATTERNS = {
    character: [re.compile(pattern, re.I) for pattern in config["aliases"]]
    for character, config in CHARACTERS.items()
}


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="replace")


def classify_location(heading: str) -> str:
    upper = heading.upper()
    if any(
        term in upper
        for term in (
            "TATOOINE",
            "MOS EISLEY",
            "LARS HOMESTEAD",
            "KENOBI'S DWELLING",
            "SANDCRAWLER",
            "DUNE SEA",
            "DESERT",
            "ROCK CANYON",
            "ROCK MESA",
            "POWER STATION",
            "DOCKING BAY 94",
            "DOCKING PORT ENTRY",
        )
    ):
        return "Tatooine"
    if "DEATH STAR" in upper:
        return "Death Star"
    if "MASSASSI" in upper or "YAVIN" in upper:
        return "Yavin IV"
    return "Outer Space / Spacecraft"


def is_scene_heading(text: str) -> bool:
    return bool(re.match(r"^(?:\d+\s+)?(?:INT\.|EXT\.|INT\./EXT\.)", text))


def is_speaker_line(raw_line: str) -> bool:
    stripped = raw_line.strip()
    leading = len(raw_line) - len(raw_line.lstrip(" "))
    if leading < 30 or not stripped or len(stripped) > 45:
        return False
    return stripped == stripped.upper() and not is_scene_heading(stripped)


def words(text: str) -> int:
    return len(re.findall(r"[A-Za-z0-9]+(?:[-'][A-Za-z0-9]+)*", text))


def parse_scenes(source: str) -> list[dict]:
    document = html.fromstring(source)
    pre_nodes = document.xpath("//pre")
    if not pre_nodes:
        raise RuntimeError("Could not locate screenplay text in IMSDb page")
    lines = pre_nodes[0].text_content().splitlines()

    scenes: list[dict] = []
    current = None
    current_speaker = None

    for raw_line in lines:
        stripped = raw_line.strip()
        if is_scene_heading(stripped):
            current = {
                "scene_id": len(scenes) + 1,
                "heading": re.sub(r"\s+", " ", stripped).rstrip(" ]"),
                "characters": set(),
                "speakers": set(),
                "dialogue_words": defaultdict(int),
            }
            current["location"] = classify_location(current["heading"])
            scenes.append(current)
            current_speaker = None
            # Headings such as LUKE'S X-WING and DARTH VADER'S COCKPIT are
            # themselves evidence that the named character is in the scene.
            for character, patterns in ALIAS_PATTERNS.items():
                if any(pattern.search(stripped) for pattern in patterns):
                    current["characters"].add(character)
            continue

        if current is None or not stripped:
            continue

        if is_speaker_line(raw_line):
            speaker = re.sub(r"\s*\([^)]*\)\s*$", "", stripped)
            current_speaker = SPEAKER_LOOKUP.get(speaker)
            if current_speaker:
                current["speakers"].add(current_speaker)
                current["characters"].add(current_speaker)
            continue

        leading = len(raw_line) - len(raw_line.lstrip(" "))
        if current_speaker and 20 <= leading < 32:
            current["dialogue_words"][current_speaker] += words(stripped)
            continue

        # Screenplay action is aligned farther left than dialogue. Searching
        # only action text avoids counting characters who are merely discussed.
        if leading < 23:
            for character, patterns in ALIAS_PATTERNS.items():
                if any(pattern.search(stripped) for pattern in patterns):
                    current["characters"].add(character)

    return scenes


def write_csv(path: Path, fieldnames: list[str], rows: list[dict]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--source-file",
        type=Path,
        help="Optional local copy of the screenplay HTML (useful behind restricted proxies).",
    )
    args = parser.parse_args()
    source = (
        args.source_file.read_text(encoding="utf-8", errors="replace")
        if args.source_file
        else fetch_text(SOURCE_URL)
    )
    scenes = parse_scenes(source)

    relevant_scenes = [scene for scene in scenes if scene["characters"]]
    character_stats = {
        character: {
            "scene_count": 0,
            "speaking_scene_count": 0,
            "dialogue_words": 0,
            "connections": 0,
        }
        for character in CHARACTER_ORDER
    }
    pair_counts = defaultdict(int)

    scene_rows = []
    presence_rows = []
    dialogue_rows = []
    for scene in relevant_scenes:
        ordered_characters = [c for c in CHARACTER_ORDER if c in scene["characters"]]
        ordered_speakers = [c for c in CHARACTER_ORDER if c in scene["speakers"]]
        scene_rows.append(
            {
                "scene_id": scene["scene_id"],
                "scene_order": scene["scene_id"],
                "heading": scene["heading"],
                "macro_location": scene["location"],
                "characters": "|".join(ordered_characters),
                "character_count": len(ordered_characters),
                "dialogue_words": sum(scene["dialogue_words"].values()),
            }
        )
        for character in ordered_characters:
            character_stats[character]["scene_count"] += 1
            presence_rows.append(
                {
                    "scene_id": scene["scene_id"],
                    "character": character,
                    "speaks": "true" if character in scene["speakers"] else "false",
                }
            )
        for character in ordered_speakers:
            character_stats[character]["speaking_scene_count"] += 1
            character_stats[character]["dialogue_words"] += scene["dialogue_words"][character]
            dialogue_rows.append(
                {
                    "scene_id": scene["scene_id"],
                    "character": character,
                    "word_count": scene["dialogue_words"][character],
                }
            )
        for a, b in combinations(ordered_characters, 2):
            pair_counts[(a, b)] += 1

    relationship_rows = []
    for a, b in combinations(CHARACTER_ORDER, 2):
        count = pair_counts[(a, b)]
        if count:
            character_stats[a]["connections"] += 1
            character_stats[b]["connections"] += 1
        relationship_rows.append(
            {"source": a, "target": b, "shared_scenes": count}
        )

    total_character_scenes = sum(
        stats["scene_count"] for stats in character_stats.values()
    )
    character_rows = []
    for character in CHARACTER_ORDER:
        config = CHARACTERS[character]
        stats = character_stats[character]
        character_rows.append(
            {
                "character": character,
                "color": config["color"],
                "image": config["image"],
                "description": config["description"],
                **stats,
                "appearance_share": round(
                    stats["scene_count"] / total_character_scenes, 6
                ),
                "screenplay_scene_pct": round(stats["scene_count"] / len(scenes), 6),
            }
        )

    write_csv(
        OUTPUT / "characters.csv",
        [
            "character",
            "color",
            "image",
            "description",
            "scene_count",
            "speaking_scene_count",
            "dialogue_words",
            "connections",
            "appearance_share",
            "screenplay_scene_pct",
        ],
        character_rows,
    )
    write_csv(
        OUTPUT / "relationships.csv",
        ["source", "target", "shared_scenes"],
        relationship_rows,
    )
    write_csv(
        OUTPUT / "scenes.csv",
        [
            "scene_id",
            "scene_order",
            "heading",
            "macro_location",
            "characters",
            "character_count",
            "dialogue_words",
        ],
        scene_rows,
    )
    write_csv(
        OUTPUT / "scene_presence.csv",
        ["scene_id", "character", "speaks"],
        presence_rows,
    )
    write_csv(
        OUTPUT / "dialogue_by_scene.csv",
        ["scene_id", "character", "word_count"],
        dialogue_rows,
    )

    metadata = {
        "source": SOURCE_URL,
        "source_label": "Star Wars: A New Hope - Revised Fourth Draft (January 15, 1976)",
        "method": "Screenplay-derived; scenes split at INT./EXT. headings; eight-character presence detected in speaker cues and action text; manually defined macro-location rules.",
        "limitations": "The screenplay contains draft/deleted material and micro-scenes from rapid cross-cutting. Values are not finished-film screen time.",
        "total_screenplay_scenes": len(scenes),
        "relevant_scenes": len(relevant_scenes),
        "selected_characters": CHARACTER_ORDER,
    }
    (OUTPUT / "metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )

    print(json.dumps({"characters": character_rows, "metadata": metadata}, indent=2))


if __name__ == "__main__":
    main()
