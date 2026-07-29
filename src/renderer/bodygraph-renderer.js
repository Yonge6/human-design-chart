export function createBodygraphRenderer({ container, templateUrl, centerColors, label = "Human Design BodyGraph" }) {
  if (!container) throw new TypeError("A BodyGraph container is required.");
  let template;

  async function loadTemplate() {
    if (!template) {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error("BodyGraph template failed to load");
      template = await response.text();
    }
    container.innerHTML = template;
    const svg = container.querySelector("svg");
    if (!svg) throw new Error("BodyGraph template does not contain an SVG element.");
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", label);
    return svg;
  }

  return async function paintBodygraph(data) {
    const svg = await loadTemplate();
    const design = new Set(Object.values(data.Design || {}).map((value) => value.Gate));
    const personality = new Set(Object.values(data.Personality || {}).map((value) => value.Gate));
    const active = new Set([...design, ...personality]);

    svg.querySelectorAll("[data-gate-number]").forEach((gateLabel) => {
      const gate = Number(gateLabel.dataset.gateNumber);
      const marker = gateLabel.previousElementSibling;
      const enabled = active.has(gate);
      if (marker) {
        marker.style.fill = enabled ? "#2b2430" : "#f7ecdc";
        marker.style.stroke = enabled ? "#b88a51" : "#cbbca8";
      }
      gateLabel.style.fill = enabled ? "#fbefdc" : "#503d3d";
    });

    svg.querySelectorAll("[data-gate-line]").forEach((line) => {
      const gate = Number(line.dataset.gateLine);
      if (design.has(gate) && personality.has(gate)) {
        line.style.fill = line.dataset.gateLineType === "design" ? "#8c3040" : "#302936";
      } else if (design.has(gate)) line.style.fill = "#8c3040";
      else if (personality.has(gate)) line.style.fill = "#302936";
      else line.style.fill = "transparent";
      line.style.stroke = "none";
    });

    Object.keys(centerColors).forEach((id) => {
      const center = svg.querySelector(`#${id}`);
      if (!center) return;
      center.style.fill = "rgba(249, 238, 221, .94)";
      center.style.stroke = "#a87945";
    });
    for (const centerName of data["Defined Centers"] || []) {
      const id = centerName.replace(/\s+/g, "-");
      const center = svg.querySelector(`#${id}`);
      if (center) center.style.fill = centerColors[id];
    }
    return svg;
  };
}
