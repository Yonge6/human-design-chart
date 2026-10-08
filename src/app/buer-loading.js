// Show only known text while waiting; decorative bars never imply fake progress.
export function loadingPreview(title, labels = []) {
  const box = document.createElement('section');
  box.className = 'buer-loading-preview';
  box.setAttribute('aria-busy', 'true');
  const status = document.createElement('p');
  status.setAttribute('role', 'status');
  status.textContent = title;
  box.append(status);
  for (const label of labels) {
    const card = document.createElement('div');
    card.className = 'loading-preview-card';
    const heading = document.createElement('p');
    heading.textContent = label;
    const bars = document.createElement('div');
    bars.className = 'loading-color-block';
    bars.setAttribute('aria-hidden', 'true');
    card.append(heading, bars);
    box.append(card);
  }
  return box;
}
