export function createBodygraphRenderer({ container, templateUrl, centerColors, label = "Human Design BodyGraph" }) {
  if (!container) throw new TypeError("A BodyGraph container is required.");
  let template;

  async function loadTemplate() {
    if (!template) {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error("BodyGraph template failed to load");
      template = await response.text();
    }
    container.innerHTML = template
      .replaceAll("#CF9236", "#abc3c8")
      .replaceAll("#9D97CC", "#a08059")
      .replaceAll("#696692", "#367e8c");
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
        marker.style.fill = enabled ? "#27393e" : "#f7f4ec";
        marker.style.stroke = enabled ? "#d7e5e7" : "#a7b8b9";
      }
      gateLabel.style.fill = enabled ? "#fffdf5" : "#42565b";
    });

    svg.querySelectorAll("[data-gate-line]").forEach((line) => {
      const gate = Number(line.dataset.gateLine);
      if (design.has(gate) && personality.has(gate)) {
        line.style.fill = line.dataset.gateLineType === "design" ? "#a08059" : "#367e8c";
      } else if (design.has(gate)) line.style.fill = "#a08059";
      else if (personality.has(gate)) line.style.fill = "#367e8c";
      else line.style.fill = "transparent";
      line.style.stroke = "none";
    });

    Object.keys(centerColors).forEach((id) => {
      const center = svg.querySelector(`#${id}`);
      if (!center) return;
      center.style.fill = "#fbf9f3";
      center.style.strokeWidth = "1.4";
      center.style.stroke = "#a7b8b9";
    });
    for (const centerName of data["Defined Centers"] || []) {
      const id = centerName.replace(/\s+/g, "-");
      const center = svg.querySelector(`#${id}`);
      if (center) {
        center.style.fill = centerColors[id];
        center.style.stroke = "#367e8c";
        center.style.strokeWidth = "2.4";
      }
    }
    return svg;
  };
}
