# People hero consistency

Use the existing non-home hero design, not a separate People variant: shared 360px desktop height, responsive mobile grid, typography, background and `buer-enter` text animation. Respect reduced motion. Replace the duplicated waving mascot with a listening pose matching the People context.

Asset: `assets/companion-people-listening.webp`, transparent RGBA, 1254x1254, 174698 bytes. Generated with built-in image_gen, then encoded as WebP (quality 85, no crop or pose changes). Original retained under the image-generation output directory.

## Generation prompt

Use case: identity-preserve. Edit target: the attached orange baby dragon Doudoulong mascot. Create a new full-body pose for a relationship/listening section of the same website. Change only the pose: warmly listening, head tilted gently, one hand cupped beside ear, other hand resting softly over chest, no book, not waving. Preserve identical face identity, orange skin, cream belly, little horns, forest sage wizard hat with exactly four cream stars, matching green cape, textured storybook 3D/paper illustration style and proportions. Full character centered in square canvas with all hat feet tail safely inside, 5 percent transparent padding. Genuinely transparent background with alpha, no scene, no text, no added props, no ground shadow.

## Verification

- 222 tests passed.
- Browser at 1403px: People, Growth, Me hero heights all 360px; People heading uses `buer-enter`.
- At 390px: document width and scroll width both 390px; image and copy do not overlap; responsive hero height is content-driven like the other non-home tabs.
- Reduced-motion emulation: heading animation is `none`.
- Existing mascot assets retained; no private-data or API changes.
