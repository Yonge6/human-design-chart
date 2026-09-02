export function createBodygraphRenderer({ container, templateUrl, centerColors, label = "Human Design BodyGraph" }) {
  if (!container) throw new TypeError("A BodyGraph container is required.");
  let template;

  function activationSet(records) {
    return new Set(Object.values(records || {}).map((value) => Number(value.Gate)));
  }

  function setPartialLane(lane, halo, startActive, endActive, source) {
    const visible = startActive || endActive;
    const complete = startActive && endActive;
    const dashArray = complete
      ? (source === "design" ? "3 2" : "none")
      : "48 52";
    const dashOffset = !complete && endActive ? "-48" : "0";
    for (const element of [halo, lane]) {
      if (!element) continue;
      element.style.strokeOpacity = visible ? "1" : "0";
      element.style.strokeDasharray = element === halo && complete ? "none" : dashArray;
      element.style.strokeDashoffset = dashOffset;
    }
  }

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
    const design = activationSet(data.Design);
    const personality = activationSet(data.Personality);
    const active = new Set([...design, ...personality]);

    svg.querySelectorAll("[data-gate-number]").forEach((gateLabel) => {
      const gate = Number(gateLabel.dataset.gateNumber);
      const marker = svg.querySelector(`[data-gate-marker="${gate}"]`);
      const enabled = active.has(gate);
      if (marker) {
        marker.style.fill = enabled ? "#2b2430" : "#f7ecdc";
        marker.style.stroke = enabled ? "#b88a51" : "#cbbca8";
        marker.style.strokeWidth = design.has(gate) && personality.has(gate) ? "2.2" : "1";
      }
      gateLabel.style.fill = enabled ? "#fbefdc" : "#503d3d";
    });

    svg.querySelectorAll("[data-gate-line]").forEach((line) => {
      const gate = Number(line.dataset.gateLine);
      const source = line.dataset.gateLineType;
      const enabled = source === "design" ? design.has(gate) : personality.has(gate);
      line.style.opacity = enabled ? "1" : "0";
      if (source === "design") {
        line.style.fill = "#f8eddd";
        line.style.stroke = "#9a2838";
        line.style.strokeWidth = "1";
      } else {
        line.style.fill = "#b9a6dd";
        line.style.stroke = "#302936";
        line.style.strokeWidth = ".6";
      }
    });

    svg.querySelectorAll("[data-channel]").forEach((channel) => {
      const [firstGate, secondGate] = channel.dataset.gates.split(/\s+/).map(Number);
      const personalityLane = channel.querySelector('[data-channel-lane="personality"]');
      const personalityHalo = channel.querySelector('[data-channel-lane-halo="personality"]');
      const designLane = channel.querySelector('[data-channel-lane="design"]');
      const designHalo = channel.querySelector('[data-channel-lane-halo="design"]');
      const personalityComplete = personality.has(firstGate) && personality.has(secondGate);
      const designComplete = design.has(firstGate) && design.has(secondGate);

      setPartialLane(
        personalityLane,
        personalityHalo,
        personality.has(firstGate),
        personality.has(secondGate),
        "personality",
      );
      setPartialLane(
        designLane,
        designHalo,
        design.has(firstGate),
        design.has(secondGate),
        "design",
      );
      channel.querySelectorAll("[data-channel-clasp]").forEach((clasp) => {
        clasp.style.opacity = personalityComplete && designComplete ? "1" : "0";
      });
    });

    Object.keys(centerColors).forEach((id) => {
      const center = svg.querySelector(`#${id}`);
      if (!center) return;
      center.dataset.centerState = "undefined";
      center.style.fill = "url(#undefined-grain)";
      center.style.stroke = "#a87945";
      center.style.strokeWidth = "1.4";
      center.style.strokeDasharray = "3.2 2.4";
      const centerKey = center.dataset.centerShape;
      const inner = svg.querySelector(`[data-center-inner="${centerKey}"]`);
      const notch = svg.querySelector(`[data-center-notch="${centerKey}"]`);
      if (inner) inner.style.strokeOpacity = ".24";
      if (notch) {
        notch.style.fill = "#f8eddd";
        notch.style.strokeWidth = "1";
      }
    });
    for (const centerName of data["Defined Centers"] || []) {
      const id = centerName.replace(/\s+/g, "-");
      const center = svg.querySelector(`#${id}`);
      if (!center) continue;
      center.dataset.centerState = "defined";
      center.style.fill = centerColors[id];
      center.style.stroke = "#b78345";
      center.style.strokeWidth = "2.2";
      center.style.strokeDasharray = "none";
      const centerKey = center.dataset.centerShape;
      const inner = svg.querySelector(`[data-center-inner="${centerKey}"]`);
      const notch = svg.querySelector(`[data-center-notch="${centerKey}"]`);
      if (inner) inner.style.strokeOpacity = ".55";
      if (notch) {
        notch.style.fill = "#b78345";
        notch.style.strokeWidth = "1.4";
      }
    }
    svg.setAttribute(
      "aria-label",
      `${label}. ${active.size} active gates and ${(data["Defined Centers"] || []).length} defined centers.`,
    );
    return svg;
  };
}
