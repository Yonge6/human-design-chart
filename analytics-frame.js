(function () {
  "use strict";
  const hostname = window.location.hostname;
  if (!["human-design.wonderelian.com", "buer.wonderelian.com"].includes(hostname) || window.location.protocol !== "https:") return;
  if (window.parent === window || window.parent.location.origin !== window.location.origin) return;
  // A non-scrollable viewport must not look like a completed document scroll.
  document.body.style.minHeight = "1000px";
  const measurementId = "G-HDHST6WKKB";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  });
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    cookie_domain: hostname,
    cookie_expires: 2592000,
    page_location: `https://${hostname}/`,
    page_title: hostname === "buer.wonderelian.com" ? "Buer Within | 不二见己" : "Pluto | Human Design",
    page_referrer: "",
  });
  const loader = document.createElement("script");
  loader.async = true;
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(loader);
}());
