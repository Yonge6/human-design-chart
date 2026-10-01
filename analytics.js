(function () {
  "use strict";

  if (!["human-design.wonderelian.com", "buer.wonderelian.com"].includes(window.location.hostname)) return;
  if (window.location.protocol !== "https:" || window.Capacitor?.isNativePlatform?.()) return;
  if (new URLSearchParams(window.location.search).get("surface") === "ios") return;

  // Keep the shared stream's automatic form/scroll detection off the product DOM.
  const frame = document.createElement("iframe");
  frame.style.cssText = "position:absolute;width:1px;height:1px;visibility:hidden;pointer-events:none;border:0";
  frame.tabIndex = -1;
  frame.title = "Basic website measurement";
  frame.setAttribute("aria-hidden", "true");
  frame.src = new URL("analytics-frame.html?v=20261001-buer", document.currentScript.src).href;
  const pending = [];
  const usagePending = [];
  let usageGeneration=0;
  const usageAllowed = () => {try{return localStorage.getItem('buer-usage-consent-v1')==='yes';}catch{return false;}};
  window.addEventListener('buer:usage-consent',()=>{usageGeneration++;usagePending.length=0;});
  window.addEventListener('buer:usage',async event=>{
    const generation=usageGeneration;
    const {usageEvent}=await import('./shared/buer-analytics-contract.js');
    const detail=event.detail;
    if(generation!==usageGeneration||!detail?.name?.startsWith('buer_v1_')||!usageAllowed())return;
    const {schema_version,surface,...fields}=detail.parameters||{};
    if(schema_version!==1||surface!=='h5')return;
    const safe=usageEvent(detail.name.slice(8),fields,'h5');if(!safe)return;
    if(ready)frame.contentWindow.gtag('event',safe.name,safe.parameters);
    else if(usagePending.length<50)usagePending.push(safe);
  });
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
    for(const event of usagePending.splice(0))if(usageAllowed())frame.contentWindow.gtag('event',event.name,event.parameters);
  });
  document.body.appendChild(frame);
}());
