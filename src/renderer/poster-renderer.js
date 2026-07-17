export async function renderPosterElement(element, {
  html2canvas = globalThis.html2canvas,
  backgroundColor = "#0d0b12",
  scale = 2,
  windowWidth = 660,
} = {}) {
  if (!html2canvas) throw new Error("Poster renderer is unavailable.");
  const canvas = await html2canvas(element, {
    backgroundColor,
    logging: false,
    scale,
    useCORS: true,
    windowWidth,
    scrollX: 0,
    scrollY: 0,
    onclone: (documentClone) => {
      const source = documentClone.querySelector(`#${element.id}`);
      source?.classList.remove("capture-source");
      if (source) source.style.position = "static";
    },
  });
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Canvas could not be encoded");
  return blob;
}
