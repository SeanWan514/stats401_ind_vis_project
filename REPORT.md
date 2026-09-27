# Visualization Critique and Redesign Report

**Course:** STATS 401 — Data Acquisition and Visualization  
**Project:** *Star Wars: Episode IV — A New Hope*  
**Report body:** 764 words (references and captions excluded)  
**Interactive figures:** [Open the deployed project](https://seanwan514.github.io/stats401_ind_vis_project/#redesign)

## Original visualization and context

Evelina Gabasova’s *Episode IV: A New Hope* social network is a force-directed, weighted node-link visualization derived from screenplay data. Nodes represent characters; an edge connects two characters when they speak within the same scene. Node size encodes the number of scenes attributed to a character, and link width encodes shared speaking scenes. The published “all characters” version supplements R2-D2 and Chewbacca through mention-based data because they do not speak conventional dialogue. The visualization’s intended message is that screenplay interaction reveals prominence, recurring relationships, and narrative groups. Its primary audience is *Star Wars* fans seeking a quantitative interpretation, with visualization and digital-humanities readers as a secondary audience. Intended tasks include finding prominent or peripheral characters, determining whether a pair connects, comparing relationship frequency, identifying bridges, and recognizing clusters.

![Original Episode IV social network](dist/assets/images/original-episode-iv.png)

*Figure 1. Gabasova’s Episode IV network, reproduced under CC BY-SA 4.0.*

## Critical evaluation

Two strengths make the original a productive starting point. First, nodes and links match an intuitive social-network model: adjacency and broad topology can be understood without specialized statistical knowledge. Second, the compact overview includes a wide cast and uses two quantitative channels, making Luke and the densely connected hero group visually salient. The familiar character names also lower the entry barrier for a general audience and make the network inviting to explore.

Four weaknesses limit effectiveness. The chart does not visibly define “interaction,” scene segmentation, node size, link width, or the treatment of non-speaking characters; viewers may therefore confuse co-occurrence with screen time or emotional closeness. Numerous marks, crossing edges, and labels create a hairball with weak visual hierarchy, while force-directed distance appears meaningful despite having no quantitative scale. Link width is also difficult to compare across orientations because it lacks alignment, ticks, or exact labels; width is a less accurate comparison channel than aligned position or luminance. Node area similarly requires a legend or direct value to support precise magnitude judgments. Finally, the aggregate network cannot show the composition of character presence, screenplay order, or the settings where scenes occur. These are not aesthetic objections: they directly obstruct lookup, comparison, clustering, and narrative-context tasks identified for the intended audience.

## Redesign rationale

The redesign coordinates four complementary D3 views. First, the node-link view retains the original’s intuitive structure but limits scope to eight declared principal characters. A stable starting layout, direct labels, dragging, linked highlighting, and node and edge tooltips reduce clutter while preserving exploratory topology. Second, an 8 × 8 adjacency matrix represents all 28 unique pairs using aligned cells, exact counts, sortable order, and a high-contrast sequential scale. This makes maxima, close values, and clusters more defensible than comparisons based only on link width. The two views are intentionally redundant: the network supports topology and paths, whereas the matrix supports exact pairwise comparison. Linked selection preserves their relationship.

Third, a treemap separates individual presence from connectivity. Area encodes each character’s share of 536 character-scene appearances accumulated by the selected eight. This is a valid additive whole; it deliberately does not claim that overlapping character appearances partition film runtime. Fourth, a circular scene-space view adds context absent from the original. Its outer circle orders 300 relevant scenes, its segmented inner circle identifies Tatooine, the Death Star, Yavin IV, and Outer Space/Spacecraft, and bundled colored curves connect every scene to its coded setting. Filtering exposes an individual character’s spatial path. Coordinated selection across all views supplies details on demand without permanently increasing clutter.

## Original versus redesign, trade-offs, and limitations

The dashboard makes exact pair lookup, relationship ranking, character focusing, part-to-whole comparison, and scene-location exploration easier than the original. It also distinguishes connectivity, individual presence, sequence, and setting instead of asking one diagram to represent all four concepts. The main trade-off is scope: minor characters are removed, so the original remains better for cast completeness. Treemap area is less precise than a sorted bar, and four macro-locations simplify some ship and battle settings. Most importantly, the source is the January 15, 1976 revised fourth draft, not finished-film timing. Scene presence is inferred from speaker cues and action text, and draft or rapidly cross-cut scenes may differ from the released movie. The dashboard labels these limits to prevent stronger claims than the data supports. The four-view approach also increases learning cost and page length, but short reading guides, consistent character colors, direct labels, and coordinated interaction mitigate that cost while keeping each view responsible for a clearly stated analytical task.

## Figures and references

Figures 2–5 are the project’s four interactive D3 redesigns and appear on the [deployed project page](https://seanwan514.github.io/stats401_ind_vis_project/#redesign).

- Evelina Gabasova, [“The Star Wars social network”](https://evelinag.com/blog/2015/12-15-star-wars-social-network/)
- Gabasova, [original visualization code](https://github.com/evelinag/StarWars-social-network)
- Gabasova, [network data repository](https://github.com/evelinag/star-wars-network-data)
- [Archived dataset on Zenodo](https://zenodo.org/records/1411479)
- [January 15, 1976 revised fourth-draft screenplay](https://imsdb.com/scripts/Star-Wars-A-New-Hope.html)

*Star Wars* names and imagery are © Lucasfilm Ltd. and are used here for educational criticism and analysis.
