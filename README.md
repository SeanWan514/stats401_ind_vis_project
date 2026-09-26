# A New Hope — Visualization Critique & Redesign

An interactive STATS 401 project that critiques Evelina Gabasova's *Episode IV: A New Hope* character network and replaces it with four coordinated D3.js views:

1. a fixed, weighted node-link network;
2. a sortable adjacency matrix;
3. a valid part-to-whole treemap of character-scene appearances; and
4. a radial scene-to-space map.

The published project includes all seven requested chapters, the original visualization and source, a 541-word critique/redesign report, external CSV/JSON data, references, interaction documentation, and limitations.

## Run locally

```bash
python3 -m http.server 8000 --directory dist
```

Then open <http://127.0.0.1:8000/>. A local server is required because D3 loads the external CSV files with `fetch`.

## Data pipeline

The generated data files in `dist/data/` are derived from the January 15, 1976 revised fourth-draft screenplay hosted by IMSDb. The reproducible parser is `scripts/build_data.py`.

```bash
python3 scripts/build_data.py --source-file /path/to/screenplay.html
```

The parser splits scenes at `INT.`/`EXT.` headings, detects the eight selected characters in speaker cues and action text, calculates pairwise co-presence, and classifies scene headings into four documented macro-locations. These are screenplay-derived scene-presence measures—not finished-film screen time.

## Main sources

- [Evelina Gabasova, “The Star Wars social network”](https://evelinag.com/blog/2015/12-15-star-wars-social-network/)
- [Archived network data and documentation](https://zenodo.org/records/1411479)
- [IMSDb revised screenplay](https://imsdb.com/scripts/Star-Wars-A-New-Hope.html)
- [StarWars.com Databank](https://www.starwars.com/databank) for referenced character and location imagery

This is an educational visualization critique. *Star Wars* imagery is © Lucasfilm Ltd. and used for commentary and analysis.

