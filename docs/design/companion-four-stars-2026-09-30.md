# Four-star companion asset correction

User requested the multi-star hat detail from their Doudoulong reference across all three primary pages and the logo. Existing sage paper-cut identity, poses and layouts are preserved.

## Generation and sources

Edited through logged-in ChatGPT using Ego Browser at the user's request after the built-in image editor failed to connect. Each edit used the corresponding existing site asset. The additional reference upload stalled and was removed; the successful requests described the four five-point cream stars explicitly.

- Logo: https://chatgpt.com/c/6abcff21-2c3c-83e9-969e-67d231fd745b
- Growth: https://chatgpt.com/c/6abcff52-ba50-83ea-8e98-28208d3c1b1f
- Profile: https://chatgpt.com/c/6abcff7b-9cac-83ea-bbc7-b2a025450943
- Home: https://chatgpt.com/c/6abcff93-afa8-83ea-96b0-e7e727f7df49

## Prompt specification

Edit only the hat decoration into four cream five-point stars, one medium and three smaller stars naturally distributed on the crown. Preserve the orange character, face, horns, original pose, notebook, sage hat and cape, paper-cut illustration texture, proportions and composition. No text or added props. Logo retains square ivory background; Growth retains seated reading/writing pose and transparent background; Profile retains standing waving pose and transparent background; Home retains wide sage landscape, right-aligned seated winking character and left-side negative space.

## Outputs

Raw generated PNGs are saved locally in `output/imagegen/four-stars/{logo,growth,profile,hero}.png` (ignored working outputs).

Production replacements use the existing shared filenames, so loading states, manual footer and daily share poster references also update:

- `assets/buer-companion-logo.png`: 256 × 256.
- `assets/companion-growth.webp`: 640 × 640, alpha preserved.
- `assets/companion-profile.webp`: 640 × 640, alpha preserved.
- `assets/brand-companion-hero.webp`: 1672 × 940.

Sharp performed only final resizing and format compression (WebP quality 90, alpha quality 100). All four generated originals were visually inspected before replacement. Previous assets remain recoverable in Git.
