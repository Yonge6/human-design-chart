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
      .replaceAll("#CF9236", "#a8b49b")
      .replaceAll("#9D97CC", "#a08059")
      .replaceAll("#696692", "#526649");
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
        marker.style.fill = enabled ? "#263c32" : "#f5f1e8";
        marker.style.stroke = enabled ? "#d5deca" : "#9aaa8d";
      }
      gateLabel.style.fill = enabled ? "#fffdf5" : "#344833";
    });

    svg.querySelectorAll("[data-gate-line]").forEach((line) => {
      const gate = Number(line.dataset.gateLine);
      if (design.has(gate) && personality.has(gate)) {
        line.style.fill = line.dataset.gateLineType === "design" ? "#a08059" : "#526649";
      } else if (design.has(gate)) line.style.fill = "#a08059";
      else if (personality.has(gate)) line.style.fill = "#526649";
      else line.style.fill = "transparent";
      line.style.stroke = "none";
    });

    Object.keys(centerColors).forEach((id) => {
      const center = svg.querySelector(`#${id}`);
      if (!center) return;
      center.style.fill = "#faf8ef";
      center.style.strokeWidth = "1.4";
      center.style.stroke = "#9aaa8d";
    });
    for (const centerName of data["Defined Centers"] || []) {
      const id = centerName.replace(/\s+/g, "-");
      const center = svg.querySelector(`#${id}`);
      if (center) {
        center.style.fill = centerColors[id];
        center.style.stroke = "#40563b";
        center.style.strokeWidth = "2.4";
      }
    }
    return svg;
  };
}
