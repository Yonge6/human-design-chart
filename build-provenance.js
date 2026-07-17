(() => {
  const config = globalThis.PLUTO_CONFIG || {};
  const values = {
    "[data-build-version]": config.appVersion || "development",
    "[data-build-commit]": config.gitCommit || "development",
    "[data-build-date]": config.buildDate || "development",
  };
  Object.entries(values).forEach(([selector, value]) => {
    document.querySelectorAll(selector).forEach((element) => {
      element.textContent = value;
      if (selector === "[data-build-commit]" && value !== "development") {
        element.href = `https://github.com/Yonge6/human-design-chart/commit/${encodeURIComponent(value)}`;
      }
    });
  });
})();
