export function createBodygraphRenderer({ container, templateUrl, centerColors, label = "Human Design BodyGraph" }) {
  if (!container) throw new TypeError("A BodyGraph container is required.");
  let template;

  async function loadTemplate() {
    if (!template) {
      const response = await fetch(templateUrl);
      if (!response.ok) throw new Error("BodyGraph template failed to load");
      template = await response.text();
    }
    container.innerHTML = template.replaceAll("#CF9236", "#a6baff");
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
        marker.style.fill = enabled ? "#263952" : "#e5eefa";
        marker.style.stroke = enabled ? "#c0afff" : "#93b0d4";
      }
      gateLabel.style.fill = enabled ? "#f5f7ff" : "#344767";
    });

    svg.querySelectorAll("[data-gate-line]").forEach((line) => {
      const gate = Number(line.dataset.gateLine);
      if (design.has(gate) && personality.has(gate)) {
        line.style.fill = line.dataset.gateLineType === "design" ? "#9580e9" : "#3678b6";
      } else if (design.has(gate)) line.style.fill = "#9580e9";
      else if (personality.has(gate)) line.style.fill = "#3678b6";
      else line.style.fill = "transparent";
      line.style.stroke = "none";
    });

    Object.keys(centerColors).forEach((id) => {
      const center = svg.querySelector(`#${id}`);
      if (!center) return;
      center.style.fill = "#e5eefa";
      center.style.stroke = "#86a4d0";
    });
    for (const centerName of data["Defined Centers"] || []) {
      const id = centerName.replace(/\s+/g, "-");
      const center = svg.querySelector(`#${id}`);
      if (center) center.style.fill = centerColors[id];
    }
    return svg;
  };
}
