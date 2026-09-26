(() => {
  "use strict";

  const characterOrder = [
    "Luke Skywalker", "Han Solo", "Princess Leia", "Darth Vader",
    "Obi-Wan Kenobi", "C-3PO", "R2-D2", "Chewbacca"
  ];
  const shortName = new Map([
    ["Luke Skywalker", "Luke"], ["Han Solo", "Han"], ["Princess Leia", "Leia"],
    ["Darth Vader", "Vader"], ["Obi-Wan Kenobi", "Obi-Wan"],
    ["C-3PO", "C-3PO"], ["R2-D2", "R2-D2"], ["Chewbacca", "Chewbacca"]
  ]);
  const locations = ["Tatooine", "Death Star", "Yavin IV", "Outer Space / Spacecraft"];
  const locationColors = new Map([
    ["Tatooine", "#d99a51"], ["Death Star", "#a9b7c8"],
    ["Yavin IV", "#55a06c"], ["Outer Space / Spacecraft", "#5579bb"]
  ]);

  const state = { selectedCharacters: [], matrixOrder: "total", radialCharacter: "all" };
  let data;
  const tooltip = d3.select("#chart-tooltip");

  const showTooltip = (event, html) => {
    tooltip.html(html).classed("visible", true);
    moveTooltip(event);
  };
  const moveTooltip = (event) => {
    const width = 310;
    const left = Math.min(event.clientX + 12, window.innerWidth - width);
    const top = Math.min(event.clientY + 12, window.innerHeight - 170);
    tooltip.style("left", `${Math.max(8, left)}px`).style("top", `${Math.max(8, top)}px`);
  };
  const hideTooltip = () => tooltip.classed("visible", false);
  const compact = d3.format(",");
  const percent = d3.format(".1%");

  function selectCharacters(names) {
    state.selectedCharacters = [...new Set(names)].filter(Boolean).slice(0, 2);
    updateLinkedViews();
  }

  function updateLinkedViews() {
    const selected = new Set(state.selectedCharacters);
    d3.selectAll(".character-card")
      .classed("selected", d => selected.has(d.character))
      .classed("muted", d => selected.size > 0 && !selected.has(d.character))
      .attr("aria-pressed", d => selected.has(d.character));

    d3.selectAll(".network-node, .network-node-label")
      .style("opacity", d => selected.size === 0 || selected.has(d.id) ? 1 : .22);
    d3.selectAll(".network-link")
      .style("opacity", d => selected.size === 0 || selected.has(d.source.id) || selected.has(d.target.id) ? .88 : .07);

    d3.selectAll(".matrix-cell")
      .style("opacity", d => selected.size === 0 || selected.has(d.row) || selected.has(d.col) ? 1 : .23);
    d3.selectAll(".treemap-cell")
      .style("opacity", d => selected.size === 0 || selected.has(d.data.character) ? 1 : .22);

    if (selected.size === 1 && state.radialCharacter === "all") {
      state.radialCharacter = [...selected][0];
      d3.select("#radial-character").property("value", state.radialCharacter);
      renderRadial();
    } else if (selected.size === 0 && state.radialCharacter !== "all") {
      state.radialCharacter = "all";
      d3.select("#radial-character").property("value", "all");
      renderRadial();
    } else {
      updateRadialEmphasis();
    }

    const summary = d3.select("#selection-summary");
    if (!selected.size) {
      summary.text("All eight characters · select a node, cell, tile, or name to focus");
    } else if (selected.size === 1) {
      const name = [...selected][0];
      const c = data.charactersByName.get(name);
      const strongest = data.relationships
        .filter(d => d.sourceName === name || d.targetName === name)
        .sort((a, b) => d3.descending(a.shared_scenes, b.shared_scenes))[0];
      const partner = strongest.sourceName === name ? strongest.targetName : strongest.sourceName;
      summary.text(`${name} · ${compact(c.scene_count)} scenes · strongest co-occurrence: ${partner} (${strongest.shared_scenes})`);
    } else {
      const [a, b] = [...selected];
      const edge = data.relationships.find(d =>
        (d.sourceName === a && d.targetName === b) || (d.sourceName === b && d.targetName === a));
      summary.text(`${a} + ${b} · ${edge ? edge.shared_scenes : 0} shared screenplay scenes`);
    }
  }

  function renderCharacterCards() {
    const cards = d3.select("#character-grid").selectAll("article")
      .data(data.characters, d => d.character)
      .join("article")
      .attr("class", "character-card")
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-pressed", "false")
      .style("--character-color", d => d.color)
      .on("click", (_, d) => selectCharacters([d.character]))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCharacters([d.character]);
        }
      });
    cards.html(d => `
      <img src="${d.image}" alt="${d.character} in Star Wars: A New Hope" loading="lazy">
      <div class="character-card-body">
        <h4>${d.character}</h4>
        <p>${d.description}</p>
        <div class="character-stats"><span>${compact(d.scene_count)} scenes</span><span>${percent(d.appearance_share)} of appearances</span></div>
      </div>`);
  }

  function renderNetwork() {
    const width = 820, height = 590;
    const svg = d3.select("#network-chart").attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    svg.append("title").text("Eight-character relationship network. Node size shows scene presence; link width shows shared scenes.");

    const defs = svg.append("defs");
    const glow = defs.append("filter").attr("id", "node-glow");
    glow.append("feGaussianBlur").attr("stdDeviation", 3).attr("result", "blur");
    glow.append("feMerge").selectAll("feMergeNode").data(["blur", "SourceGraphic"]).join("feMergeNode").attr("in", d => d);

    const nodes = data.characters.map(d => ({ ...d, id: d.character }));
    const links = data.relationships.filter(d => d.shared_scenes > 0).map(d => ({
      ...d, source: d.sourceName, target: d.targetName
    }));
    const radius = d3.scaleSqrt().domain(d3.extent(nodes, d => d.scene_count)).range([18, 42]);
    const linkWidth = d3.scaleLinear().domain([0, d3.max(links, d => d.shared_scenes)]).range([.8, 11]);

    const simulation = d3.forceSimulation(nodes)
      .randomSource(d3.randomLcg(0.401))
      .force("link", d3.forceLink(links).id(d => d.id).distance(d => 215 - d.shared_scenes * 2.6).strength(.75))
      .force("charge", d3.forceManyBody().strength(-690))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide(d => radius(d.scene_count) + 38));
    for (let i = 0; i < 360; i += 1) simulation.tick();
    simulation.stop();
    nodes.forEach(d => {
      d.x = Math.max(76, Math.min(width - 76, d.x));
      d.y = Math.max(70, Math.min(height - 76, d.y));
    });

    svg.append("g").selectAll("line")
      .data(links)
      .join("line")
      .attr("class", "network-link")
      .attr("x1", d => d.source.x).attr("y1", d => d.source.y)
      .attr("x2", d => d.target.x).attr("y2", d => d.target.y)
      .attr("stroke-width", d => linkWidth(d.shared_scenes))
      .on("mouseenter", (event, d) => showTooltip(event,
        `<strong>${d.source.id} + ${d.target.id}</strong><br>${d.shared_scenes} shared screenplay scenes`))
      .on("mousemove", moveTooltip).on("mouseleave", hideTooltip)
      .on("click", (_, d) => selectCharacters([d.source.id, d.target.id]));

    const node = svg.append("g").selectAll("g")
      .data(nodes)
      .join("g")
      .attr("class", "network-node")
      .attr("transform", d => `translate(${d.x},${d.y})`)
      .attr("tabindex", 0)
      .attr("role", "button")
      .attr("aria-label", d => `${d.character}, ${d.scene_count} screenplay scenes`)
      .on("mouseenter", (event, d) => showTooltip(event,
        `<strong>${d.character}</strong><br>${compact(d.scene_count)} screenplay scenes<br>${compact(d.dialogue_words)} script dialogue words`))
      .on("mousemove", moveTooltip).on("mouseleave", hideTooltip)
      .on("click", (_, d) => selectCharacters([d.character]))
      .on("keydown", (event, d) => {
        if (event.key === "Enter" || event.key === " ") selectCharacters([d.character]);
      });
    node.append("circle")
      .attr("r", d => radius(d.scene_count))
      .attr("fill", d => d.color)
      .attr("stroke", d => d.character === "Darth Vader" ? "#f4cf63" : "#f7f2e7")
      .attr("stroke-width", 2)
      .attr("filter", "url(#node-glow)");
    node.append("text")
      .attr("class", "chart-label network-node-label")
      .attr("text-anchor", "middle")
      .attr("y", d => radius(d.scene_count) + 19)
      .text(d => shortName.get(d.character));
    node.append("text")
      .attr("class", "chart-sub-label network-node-label")
      .attr("text-anchor", "middle")
      .attr("y", d => radius(d.scene_count) + 35)
      .text(d => `${d.scene_count} scenes`);
  }

  function matrixValue(a, b) {
    if (a === b) return null;
    const edge = data.relationships.find(d =>
      (d.sourceName === a && d.targetName === b) || (d.sourceName === b && d.targetName === a));
    return edge ? edge.shared_scenes : 0;
  }

  function renderMatrix() {
    const width = 820, height = 690, margin = { top: 155, right: 50, bottom: 40, left: 165 };
    const svg = d3.select("#matrix-chart").attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    const totals = new Map(characterOrder.map(name => [name,
      d3.sum(characterOrder, other => matrixValue(name, other) || 0)]));
    let order = [...characterOrder];
    if (state.matrixOrder === "total") order.sort((a, b) => d3.descending(totals.get(a), totals.get(b)));
    if (state.matrixOrder === "scenes") order.sort((a, b) => d3.descending(data.charactersByName.get(a).scene_count, data.charactersByName.get(b).scene_count));
    if (state.matrixOrder === "alpha") order.sort(d3.ascending);

    const size = Math.min(width - margin.left - margin.right, height - margin.top - margin.bottom);
    const band = d3.scaleBand().domain(order).range([0, size]).padding(.045);
    const maxValue = d3.max(data.relationships, d => d.shared_scenes);
    const color = d3.scaleSequential().domain([0, maxValue]).interpolator(t => d3.interpolateRgb("#e8edf4", "#163f78")(Math.pow(t, .72)));
    const cells = order.flatMap(row => order.map(col => ({ row, col, value: matrixValue(row, col) })));
    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g").selectAll("text")
      .data(order).join("text")
      .attr("class", "matrix-label matrix-axis")
      .attr("x", -10).attr("y", d => band(d) + band.bandwidth() / 2)
      .attr("dy", ".34em").attr("text-anchor", "end")
      .text(d => shortName.get(d));
    g.append("g").selectAll("text")
      .data(order).join("text")
      .attr("class", "matrix-label matrix-axis")
      .attr("transform", d => `translate(${band(d) + band.bandwidth() / 2},-10) rotate(-55)`)
      .attr("text-anchor", "start")
      .text(d => shortName.get(d));

    const cell = g.append("g").selectAll("g")
      .data(cells).join("g")
      .attr("class", "matrix-cell")
      .attr("tabindex", d => d.value === null ? null : 0)
      .attr("role", d => d.value === null ? null : "button")
      .attr("aria-label", d => d.value === null ? `${d.row}, not applicable` : `${d.row} and ${d.col}, ${d.value} shared scenes`)
      .attr("transform", d => `translate(${band(d.col)},${band(d.row)})`)
      .on("mouseenter", (event, d) => {
        g.selectAll(".matrix-axis").classed("active", x => x === d.row || x === d.col);
        showTooltip(event, d.value === null ? `<strong>${d.row}</strong><br>Diagonal: not applicable` : `<strong>${d.row} + ${d.col}</strong><br>${d.value} shared screenplay scenes`);
      })
      .on("mousemove", moveTooltip)
      .on("mouseleave", () => { g.selectAll(".matrix-axis").classed("active", false); hideTooltip(); })
      .on("click", (_, d) => { if (d.value !== null) selectCharacters([d.row, d.col]); })
      .on("keydown", (event, d) => { if (d.value !== null && (event.key === "Enter" || event.key === " ")) selectCharacters([d.row, d.col]); });
    cell.append("rect")
      .attr("width", band.bandwidth()).attr("height", band.bandwidth())
      .attr("rx", 3)
      .attr("fill", d => d.value === null ? "#202937" : color(d.value))
      .attr("stroke", "rgba(255,255,255,.08)");
    cell.append("text")
      .attr("x", band.bandwidth() / 2).attr("y", band.bandwidth() / 2)
      .attr("dy", ".35em").attr("text-anchor", "middle")
      .attr("fill", d => d.value === null || d.value > maxValue * .44 ? "#f7f2e7" : "#101621")
      .attr("font-size", 12).attr("font-weight", 700)
      .text(d => d.value === null ? "—" : d.value);

    const legendX = margin.left, legendY = height - 24;
    const legend = svg.append("g").attr("transform", `translate(${legendX},${legendY})`);
    legend.append("text").attr("fill", "#aeb6c6").attr("font-size", 11).attr("y", -8).text("Shared screenplay scenes");
    d3.range(0, 11).forEach(i => legend.append("rect").attr("x", i * 25).attr("width", 25).attr("height", 9).attr("fill", color(maxValue * i / 10)));
    legend.append("text").attr("fill", "#aeb6c6").attr("font-size", 10).attr("y", 22).text("0");
    legend.append("text").attr("fill", "#aeb6c6").attr("font-size", 10).attr("x", 250).attr("y", 22).attr("text-anchor", "end").text(maxValue);
  }

  function renderTreemap() {
    const width = 820, height = 520;
    const svg = d3.select("#treemap-chart").attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    const root = d3.hierarchy({ children: data.characters }).sum(d => d.scene_count).sort((a, b) => b.value - a.value);
    d3.treemap().size([width, height]).paddingInner(5).paddingOuter(9).round(true)(root);
    const total = root.value;
    const cell = svg.selectAll("g")
      .data(root.leaves()).join("g")
      .attr("class", "treemap-cell")
      .attr("transform", d => `translate(${d.x0},${d.y0})`)
      .attr("tabindex", 0).attr("role", "button")
      .attr("aria-label", d => `${d.data.character}, ${d.value} scenes, ${percent(d.value / total)} of appearances`)
      .on("mouseenter", (event, d) => showTooltip(event,
        `<strong>${d.data.character}</strong><br>${d.value} screenplay scenes<br>${percent(d.value / total)} of all selected-character appearances`))
      .on("mousemove", moveTooltip).on("mouseleave", hideTooltip)
      .on("click", (_, d) => selectCharacters([d.data.character]))
      .on("keydown", (event, d) => { if (event.key === "Enter" || event.key === " ") selectCharacters([d.data.character]); });
    cell.append("rect")
      .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
      .attr("rx", 4).attr("fill", d => d.data.color)
      .attr("stroke", d => d.data.character === "Darth Vader" ? "#f4cf63" : "rgba(255,255,255,.42)")
      .attr("stroke-width", d => d.data.character === "Darth Vader" ? 2 : 1);
    cell.append("rect")
      .attr("width", d => d.x1 - d.x0).attr("height", d => d.y1 - d.y0)
      .attr("rx", 4).attr("fill", d => d.data.character === "Princess Leia" ? "rgba(0,0,0,.05)" : "rgba(0,0,0,.25)");
    cell.append("text")
      .attr("x", 14).attr("y", 28)
      .attr("fill", d => d.data.character === "Princess Leia" ? "#111827" : "#fff")
      .attr("font-family", "Orbitron, sans-serif").attr("font-weight", 750).attr("font-size", 15)
      .text(d => shortName.get(d.data.character));
    cell.append("text")
      .attr("x", 14).attr("y", 50)
      .attr("fill", d => d.data.character === "Princess Leia" ? "#344054" : "rgba(255,255,255,.86)")
      .attr("font-size", 13)
      .text(d => `${d.value} scenes · ${percent(d.value / total)}`);
  }

  function radialPath(scene, hub, center, innerRadius, outerRadius) {
    const angle = scene.angle;
    const sx = center.x + Math.cos(angle) * outerRadius;
    const sy = center.y + Math.sin(angle) * outerRadius;
    const ix = center.x + Math.cos(angle) * innerRadius;
    const iy = center.y + Math.sin(angle) * innerRadius;
    return `M${sx},${sy} Q${ix},${iy} ${hub.x},${hub.y}`;
  }

  function renderRadial() {
    const width = 820, height = 760, center = { x: width / 2, y: height / 2 }, outerRadius = 310, innerRadius = 205;
    const svg = d3.select("#radial-chart").attr("viewBox", `0 0 ${width} ${height}`);
    svg.selectAll("*").remove();
    const scenes = data.scenes.map((d, i) => ({ ...d, angle: -Math.PI / 2 + i / data.scenes.length * Math.PI * 2 }));
    const hubs = new Map(locations.map((name, i) => {
      const angle = -Math.PI / 2 + i / locations.length * Math.PI * 2;
      return [name, { name, angle, x: center.x + Math.cos(angle) * 103, y: center.y + Math.sin(angle) * 103 }];
    }));
    const selectedName = state.radialCharacter;
    const isActiveScene = d => selectedName === "all" || d.characters.includes(selectedName);
    const sceneRadius = d3.scaleSqrt().domain([1, d3.max(scenes, d => d.character_count)]).range([2.4, 6.8]);

    svg.append("circle").attr("cx", center.x).attr("cy", center.y).attr("r", outerRadius)
      .attr("fill", "none").attr("stroke", "rgba(244,207,99,.26)").attr("stroke-width", 1.2);
    svg.append("circle").attr("cx", center.x).attr("cy", center.y).attr("r", outerRadius + 22)
      .attr("fill", "none").attr("stroke", "rgba(255,255,255,.07)").attr("stroke-dasharray", "2 8");

    svg.append("g").selectAll("path")
      .data(scenes).join("path")
      .attr("class", "radial-edge")
      .attr("d", d => radialPath(d, hubs.get(d.macro_location), center, innerRadius, outerRadius))
      .attr("fill", "none")
      .attr("stroke", d => locationColors.get(d.macro_location))
      .attr("stroke-width", d => isActiveScene(d) ? 1.1 : .35)
      .attr("stroke-opacity", d => isActiveScene(d) ? (selectedName === "all" ? .2 : .58) : .025);

    const scene = svg.append("g").selectAll("circle")
      .data(scenes).join("circle")
      .attr("class", "radial-scene")
      .attr("cx", d => center.x + Math.cos(d.angle) * outerRadius)
      .attr("cy", d => center.y + Math.sin(d.angle) * outerRadius)
      .attr("r", d => sceneRadius(d.character_count))
      .attr("fill", d => locationColors.get(d.macro_location))
      .attr("stroke", d => isActiveScene(d) && selectedName !== "all" ? "#fff" : "rgba(255,255,255,.45)")
      .attr("stroke-width", d => isActiveScene(d) && selectedName !== "all" ? 1.8 : .6)
      .attr("opacity", d => isActiveScene(d) ? 1 : .1)
      .attr("tabindex", 0)
      .attr("aria-label", d => `Scene ${d.scene_order}, ${d.heading}, ${d.macro_location}, ${d.characters.join(", ")}`)
      .on("mouseenter", (event, d) => showTooltip(event,
        `<strong>Scene ${d.scene_order}</strong><br>${d.heading}<br><span>${d.macro_location}</span><br>${d.characters.join(", ")}`))
      .on("mousemove", moveTooltip).on("mouseleave", hideTooltip);

    const hub = svg.append("g").selectAll("g")
      .data([...hubs.values()]).join("g").attr("transform", d => `translate(${d.x},${d.y})`);
    hub.append("circle").attr("r", 52).attr("fill", d => d3.color(locationColors.get(d.name)).darker(1.8))
      .attr("stroke", d => locationColors.get(d.name)).attr("stroke-width", 2);
    hub.append("text").attr("text-anchor", "middle").attr("fill", "#fff").attr("font-size", 11).attr("font-weight", 700)
      .each(function(d) {
        const lines = d.name === "Outer Space / Spacecraft" ? ["Outer Space", "/ Spacecraft"] : [d.name];
        d3.select(this).selectAll("tspan").data(lines).join("tspan").attr("x", 0).attr("dy", (_, i) => i ? 14 : -2).text(x => x);
      });
    hub.append("text").attr("text-anchor", "middle").attr("y", 27).attr("fill", "rgba(255,255,255,.7)").attr("font-size", 10)
      .text(d => `${scenes.filter(s => s.macro_location === d.name).length} scenes`);
    svg.append("text").attr("x", center.x).attr("y", center.y - 8).attr("text-anchor", "middle")
      .attr("fill", "#f4cf63").attr("font-family", "Orbitron, sans-serif").attr("font-size", 14).attr("font-weight", 800).text("A NEW HOPE");
    svg.append("text").attr("x", center.x).attr("y", center.y + 13).attr("text-anchor", "middle")
      .attr("fill", "#aeb6c6").attr("font-size", 11).text(selectedName === "all" ? "300 relevant scenes" : shortName.get(selectedName));
    updateRadialEmphasis();
  }

  function updateRadialEmphasis() {
    if (!data) return;
    const selected = new Set(state.selectedCharacters);
    if (state.radialCharacter !== "all" || selected.size === 0) return;
    d3.selectAll(".radial-scene").attr("opacity", d => selected.size === 0 || d.characters.some(x => selected.has(x)) ? 1 : .1);
  }

  function countReportWords() {
    const text = document.querySelector("#report-body").innerText.trim();
    const count = text.split(/\s+/).filter(Boolean).length;
    document.querySelector("#report-word-count").textContent = count.toLocaleString();
  }

  function observeChapters() {
    const links = [...document.querySelectorAll(".chapter-nav a")];
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      links.forEach(link => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
    }, { rootMargin: "-30% 0px -55%", threshold: [0, .15, .4] });
    document.querySelectorAll(".chapter").forEach(section => observer.observe(section));
  }

  async function init() {
    try {
      const [characters, relationships, scenes] = await Promise.all([
        d3.csv("data/characters.csv", d3.autoType),
        d3.csv("data/relationships.csv", d3.autoType),
        d3.csv("data/scenes.csv", d => ({
          ...d,
          scene_id: +d.scene_id,
          scene_order: +d.scene_order,
          character_count: +d.character_count,
          dialogue_words: +d.dialogue_words,
          characters: d.characters.split("|").filter(Boolean)
        }))
      ]);
      relationships.forEach(d => { d.sourceName = d.source; d.targetName = d.target; });
      data = {
        characters: characterOrder.map(name => characters.find(d => d.character === name)),
        relationships,
        scenes,
        charactersByName: new Map(characters.map(d => [d.character, d]))
      };
      renderCharacterCards();
      renderNetwork();
      renderMatrix();
      renderTreemap();

      const radialSelect = d3.select("#radial-character");
      radialSelect.selectAll("option.character-option")
        .data(data.characters).join("option")
        .attr("class", "character-option")
        .attr("value", d => d.character).text(d => d.character);
      radialSelect.on("change", event => {
        state.radialCharacter = event.target.value;
        if (state.radialCharacter !== "all") state.selectedCharacters = [state.radialCharacter];
        else state.selectedCharacters = [];
        renderRadial();
        updateLinkedViews();
      });
      renderRadial();

      d3.select("#matrix-sort").on("change", event => {
        state.matrixOrder = event.target.value;
        renderMatrix();
        updateLinkedViews();
      });
      d3.select("#reset-selection").on("click", () => {
        state.selectedCharacters = [];
        state.radialCharacter = "all";
        d3.select("#radial-character").property("value", "all");
        renderRadial();
        updateLinkedViews();
      });
      countReportWords();
      observeChapters();
      updateLinkedViews();
    } catch (error) {
      console.error(error);
      d3.select("#character-grid").html(`<p class="callout"><strong>Data could not be loaded.</strong> ${error.message}</p>`);
    }
  }

  init();
})();
