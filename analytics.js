(function () {
  "use strict";

  if (window.location.hostname !== "human-design.wonderelian.com") return;
  if (window.location.protocol !== "https:" || window.Capacitor?.isNativePlatform?.()) return;
  if (new URLSearchParams(window.location.search).get("surface") === "ios") return;

  // Keep the shared stream's automatic form/scroll detection off the product DOM.
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:absolute;width:1px;height:1px;visibility:hidden;pointer-events:none;border:0";
  frame.tabIndex = -1;
  frame.title = "Basic website measurement";
  frame.setAttribute("aria-hidden", "true");
  frame.src = new URL("analytics-frame.html", document.currentScript.src).href;
  const pending = [];
  let ready = false;
  window.gtag = function (command, name, fields) {
    if (command !== "event" || name !== "chart_completion") return;
    const parameters = { site_id: "site-human-design" };
    for (const key of ["schema_version", "engine_version"]) {
      if (typeof fields?.[key] !== "string" || !/^[a-zA-Z0-9._-]{1,64}$/.test(fields[key])) return;
      parameters[key] = fields[key];
    }
    if (ready) frame.contentWindow.gtag("event", name, parameters);
    else pending.push(parameters);
  };
  frame.addEventListener("load", () => {
    if (typeof frame.contentWindow?.gtag !== "function") return;
    ready = true;
    for (const fields of pending.splice(0)) frame.contentWindow.gtag("event", "chart_completion", fields);
  });
  document.body.appendChild(frame);
}());
