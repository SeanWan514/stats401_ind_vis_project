# 🌌 A New Hope — Visualization Critique & Redesign

[![Live project](https://img.shields.io/badge/OPEN-LIVE_PROJECT-F4D96B?style=for-the-badge&logo=github)](https://seanwan514.github.io/stats401_ind_vis_project/)
[![Report](https://img.shields.io/badge/READ-REPORT-D98AA4?style=for-the-badge)](REPORT.md)
[![D3.js](https://img.shields.io/badge/BUILT_WITH-D3.JS-F07F28?style=for-the-badge&logo=d3dotjs)](https://d3js.org/)

An interactive STATS 401 project that critically evaluates Evelina Gabasova’s *Episode IV: A New Hope* character network and redesigns it as a coordinated, four-view analytical dashboard.

## ✦ At a glance

| Evidence | Project value |
|---|---:|
| Principal characters | 8 |
| Relevant screenplay scenes | 300 |
| Character-scene appearances | 536 |
| Unique character pairs | 28 |
| D3 visualizations | 4 |

The page is organized into eight clearly labeled chapters: overview, selection, analysis, critique, redesign, explanation, report, and conclusion. It includes the original figure and source, a 500–800-word report, citations, methodological limits, and linked interactions.

## 🚀 Four coordinated views

The redesign follows one purposeful analytical progression: **repair the original network → quantify relationships → compare proportional significance → return the evidence to story space**. The three added views are not decorative alternatives; together with the revised node-link view, they answer comparison, composition, and narrative-context tasks that one network cannot support reliably.

| View | Analytical purpose | Interaction |
|---|---|---|
| Weighted node-link network | Understand topology and frequent co-presence | Drag nodes; hover nodes/links; select a character or pair |
| Adjacency matrix | Compare all pairwise shared-scene counts precisely | Sort; hover; select a cell |
| Character-presence treemap | Examine each character’s share of an additive whole | Hover and select tiles |
| Circular scene-space map | Follow scenes through four coded narrative spaces | Filter characters; inspect scenes and bundled paths |

Selections are coordinated across all four views. Character colors, names, metric definitions, and tooltips remain consistent throughout.

## 📦 Submission structure

The dedicated repository keeps the graded work self-contained and separate from unrelated course experiments. The [main STATS 401 course website](https://seanwan514.github.io/stats401-labs/) includes the required **Visualization Critique and Redesign** entry and links here. This repository preserves both deliverables: the [GitHub Pages visualization](https://seanwan514.github.io/stats401_ind_vis_project/) and the 795-word report, available [inside the webpage](https://seanwan514.github.io/stats401_ind_vis_project/#report) and as [`REPORT.md`](REPORT.md).

## 📐 Method and data

Generated files in [`dist/data/`](dist/data/) derive from the January 15, 1976 revised fourth-draft screenplay hosted by IMSDb. The reproducible parser is [`scripts/build_data.py`](scripts/build_data.py). It:

1. splits the screenplay at `INT.`/`EXT.` headings;
2. detects the eight selected characters in speaker cues and action text;
3. calculates character-scene presence and pairwise co-presence; and
4. classifies headings into four documented macro-locations.

These values describe screenplay scenes—not finished-film screen time. The project states that limitation directly and never interprets co-presence as emotional closeness.

## 🗂 Repository guide

- [`dist/index.html`](dist/index.html) — complete eight-chapter submission
- [`dist/app.js`](dist/app.js) — D3 rendering and coordinated interaction
- [`dist/styles.css`](dist/styles.css) — responsive visual system and print styles
- [`dist/data/`](dist/data/) — external CSV/JSON datasets loaded by D3
- [`REPORT.md`](REPORT.md) — standalone critique and redesign report
- [`scripts/build_data.py`](scripts/build_data.py) — reproducible data pipeline
- [`scripts/validate_site.py`](scripts/validate_site.py) — pre-deployment integrity checks
- [`.github/workflows/pages.yml`](.github/workflows/pages.yml) — validated GitHub Pages deployment

## 💻 Run locally

```bash
python3 -m http.server 8000 --directory dist
```

Then open <http://127.0.0.1:8000/>. A local server is required because D3 loads external CSV files with `fetch`.

Validate the submission before deployment:

```bash
python3 scripts/validate_site.py
node --check dist/app.js
```

## 🔗 Primary sources

- [Evelina Gabasova, “The Star Wars social network”](https://evelinag.com/blog/2015/12-15-star-wars-social-network/)
- [Original visualization repository](https://github.com/evelinag/StarWars-social-network)
- [Original network-data repository](https://github.com/evelinag/star-wars-network-data)
- [Archived network dataset and documentation](https://zenodo.org/records/1411479)
- [January 15, 1976 revised screenplay](https://imsdb.com/scripts/Star-Wars-A-New-Hope.html)
- [StarWars.com Databank](https://www.starwars.com/databank) for referenced character and location imagery

## Attribution

Gabásova’s original visualization is reproduced under its stated CC BY-SA 4.0 license. *Star Wars* names and imagery are © Lucasfilm Ltd. and used for educational criticism and analysis. This project is an independent course submission and is not affiliated with Lucasfilm.
