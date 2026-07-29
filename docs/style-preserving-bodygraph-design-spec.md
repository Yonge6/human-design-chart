# Style-preserving clean-room BodyGraph design specification

## 1. Scope

This phase defines only the high-level visual language, deterministic layout rules, and original geometry system for a new Pluto BodyGraph rendering. It does not implement an SVG, add a generator, modify rendering code, or change product behavior.

This phase does not modify the chart calculation algorithm, profile schema, API contract, `chartHash`, persistence model, privacy settings, sharing flow, or poster export pipeline.

The design source for this specification is limited to the current Pluto page structure, current brand CSS tokens, functional topology, and rendering state semantics. It does not use the previous BodyGraph SVG, third-party BodyGraph pages, third-party image templates, visual screenshots, historical blobs, visual diffs, or coordinate references.

## 2. Allowed continuity

The new design may continue these Pluto product qualities:

- Pluto's warm dark interface, vellum-like poster surface, low-saturation brass, wine, muted lavender, bone, and plum palette.
- The existing serif editorial headline tone and compact sans-serif labels.
- The current page rhythm: top toolbar, result preview, chart panel, side activation columns, core property rows, interpretation area, and poster footer.
- The external BodyGraph preview footprint used by the page, including a narrow vertical chart area that must sit comfortably inside the current result and export compositions.
- A warm, restrained, refined, self-exploration brand feeling.
- Personality and Design as a two-color semantic system.
- Defined and Undefined as state semantics.
- The functional relation of nine centers, 64 gates, and 36 channels.

Brand continuity means the new graph should feel native to Pluto. It does not mean copying any prior center outline, body outline, gate coordinate, channel route, texture, or visual composition.

## 3. New visual concept

The concept is an abstract "life axis and energy network": a calm vertical constellation of hand-held, editorial nodes arranged around a soft central axis. The axis gives the chart its self-exploration feeling, while the channels read as fine warm connective paths rather than technical wiring.

The graph remains vertical, compact, and poster-friendly, but it does not use a human silhouette. Centers are not traditional BodyGraph center shapes. Each center is a rounded, faceted capsule-medallion with a soft inner plane, a fine brass outline, and a small orientation notch that helps the viewer understand connection direction in black-and-white output.

The overall expression should be warm, soft, refined, and alive: closer to a quiet personal map printed on vellum than to a sci-fi star chart. It should blend into Pluto's existing panel, side-column, and poster treatment without becoming a decorative scene detached from the product.

## 4. Canvas and responsive frame

Use a new SVG coordinate system:

- `viewBox="0 0 360 696"`.
- Safe margin: 20 units on the left and right, 22 units on the top, 26 units on the bottom.
- Primary axis: `x = 180`, from `y = 46` to `y = 636`.
- Minimum on-screen mobile display width: 240 CSS px for the graph itself. Below that, gate labels may switch from full circular badges to compact number chips, but the numbers must remain readable.
- Desktop display width: cap the graph at 408 CSS px inside the existing BodyGraph container footprint.
- Poster output: preserve a narrow vertical graph area inside a 600 px wide mobile export panel; the graph should occupy 230-260 px of visual width so the side activation columns and property rows remain balanced.
- Chinese and English label safe zones: reserve 10 units outside the left and right graph envelope for optional short labels; long labels belong outside the SVG or in aria text, not inside center shapes.
- Black-and-white print: preserve center state through stroke weight, fill pattern, and notch treatment; preserve activation source through lane position and dash pattern, not color alone.

The current page may keep its external BodyGraph container ratio and max width. The internal geometry defined here is independent and is calculated only from this new viewBox.

## 5. Center layout algorithm

The layout is deterministic. Let `W = 360`, `H = 696`, `cx = W / 2`, `top = 54`, `bottom = 626`, and `span = bottom - top`. Define nine center anchors from normalized positions rather than copied coordinates:

| Center | Logical layer | Anchor formula | Anchor in 360 x 696 |
| --- | --- | --- | --- |
| head | crown | `(cx, top)` | `(180, 54)` |
| ajna | upper mind | `(cx, top + span * 0.12)` | `(180, 123)` |
| throat | expression | `(cx, top + span * 0.265)` | `(180, 206)` |
| g | identity axis | `(cx, top + span * 0.405)` | `(180, 286)` |
| heart | will side node | `(cx + 62, top + span * 0.43)` | `(242, 300)` |
| spleen | instinct side node | `(cx - 68, top + span * 0.555)` | `(112, 371)` |
| solar plexus | emotion side node | `(cx + 70, top + span * 0.575)` | `(250, 383)` |
| sacral | life-force base | `(cx, top + span * 0.68)` | `(180, 443)` |
| root | pressure base | `(cx, bottom)` | `(180, 626)` |

The center system uses three columns:

- Central column: head, ajna, throat, g, sacral, root.
- Left supporting column: spleen.
- Right supporting column: heart and solar plexus.

The vertical rhythm leaves the upper cognitive stack compact, opens the middle around identity and side centers for channel routing, then gives sacral and root enough separation for lower channels and gate chips. This works on mobile because most labels sit on center edges, not inside dense interior intersections. It works for posters because the graph reads as a single vertical emblem with controlled side spread.

If the canvas size changes, compute anchors by the formulas above after applying the same safe-margin inset. Do not hard-code positions from any external visual reference.

## 6. Original center geometry

Use a unified "faceted capsule-medallion" geometry:

- Base shape: a rounded polygon generated from an ellipse-like bounding box with 8 to 12 sampled vertices, then rounded with a corner radius of 7-12 units.
- Central-column centers use vertically calm forms. Side centers use subtly angled forms whose long axis points toward the central axis.
- Each center has a brass outer stroke, a soft inner fill plane, and a small connection notch on the edge nearest its most active channel directions.
- No center uses traditional BodyGraph outlines as a direct template.

Recommended base dimensions:

| Center | Width | Height | Vertex count | Shape note |
| --- | ---: | ---: | ---: | --- |
| head | 66 | 44 | 8 | upward medallion with a shallow crown notch |
| ajna | 76 | 48 | 8 | calm horizontal medallion |
| throat | 88 | 58 | 10 | broad expression medallion |
| g | 76 | 76 | 12 | rounded compass medallion |
| heart | 56 | 44 | 8 | compact angled will medallion |
| spleen | 62 | 96 | 10 | slim protective medallion |
| solar plexus | 66 | 104 | 10 | soft vertical emotional medallion |
| sacral | 86 | 68 | 10 | grounded life-force medallion |
| root | 90 | 58 | 10 | stable base medallion |

Defined state:

- Fill uses a low-saturation warm plane with subtle top-left highlight.
- Stroke is 2.2 units, solid brass.
- Inner line is 1 unit with 55% opacity.
- A tiny filled notch or seed mark is shown near active connection edges.

Undefined state:

- Fill is translucent warm paper or dark vellum depending on export mode.
- Stroke is 1.4 units, dashed or hairline double-stroked.
- Inner plane uses a sparse dot or fine diagonal grain at 12-16% opacity.
- Notch is outlined rather than filled.

Defined and Undefined must not rely only on color. In black-and-white output, Defined centers remain heavier and filled; Undefined centers remain lighter, patterned, and open.

## 7. Gate placement algorithm

Gate placement is generated only from functional data:

- Gate number.
- Gate's owning center.
- The channel pair that connects the gate to another gate.
- The relative direction from the owning center anchor to the connected center anchor.

Derive gate ownership from the channel table:

| Center | Gates |
| --- | --- |
| head | 61, 63, 64 |
| ajna | 4, 11, 17, 24, 43, 47 |
| throat | 8, 12, 16, 20, 23, 31, 33, 35, 45, 56, 62 |
| g | 1, 2, 7, 10, 13, 15, 25, 46 |
| heart | 21, 26, 40, 51 |
| spleen | 18, 28, 32, 44, 48, 50, 57 |
| solar plexus | 6, 22, 30, 36, 37, 49, 55 |
| sacral | 3, 5, 9, 14, 27, 29, 34, 42, 59 |
| root | 19, 38, 39, 41, 52, 53, 54, 58, 60 |

For each center:

1. For every gate, find its paired gate and paired center from the channel table.
2. Compute the direction vector from the owning center anchor to the paired center anchor.
3. Assign the gate to one of eight edge sectors: top, top-right, right, bottom-right, bottom, bottom-left, left, top-left.
4. Within each sector, sort gates by paired center layer from top to bottom, then by ascending gate number.
5. Allocate deterministic slots along the sector edge. The first slot is centered on the edge midpoint; additional slots fan outward with at least 13 units between gate badge centers.
6. If two gates would be closer than 13 units, push the lower-priority gate outward along the local tangent by 4-unit increments until spacing is clear.
7. Gate badge diameter is 12 units at the SVG level, with a minimum rendered diameter of 8 CSS px. Gate number text is 6.2-7.2 SVG units and must not render below 7 CSS px in mobile export.
8. Gate badges sit just outside the center outline by 5 units. Connection endpoints use the badge center; visual strokes stop at the badge's outer tangent.

The same algorithm can regenerate all gate positions from topology and center anchors without reading any prior coordinate source.

## 8. Channel routing algorithm

Channels are generated from the new gate coordinates:

1. Compute `p1` and `p2` from the two gate badge centers.
2. Let `v = normalize(p2 - p1)` and `n = perpendicular(v)`.
3. Choose a route type:
   - Near-vertical central links use cubic Bezier curves with control points at 35% and 65% of the segment.
   - Side-to-center links use cubic Bezier curves that bow 10-18 units away from the central axis before returning to the target.
   - Lower root and sacral links use shallow S-curves to keep labels clear.
4. Control point distance is `min(72, max(28, segmentLength * 0.32))`.
5. If a route crosses a center bounding box, insert a dogleg waypoint around the nearest box edge with 10 units of clearance.
6. If two route envelopes overlap closer than 5 units for more than 36 units of length, assign deterministic lane offsets by sorting channel pairs lexicographically and offsetting by `[-6, 0, 6]` as needed.

Activation lanes:

- The base structural channel is a quiet 1.2-unit line at 24-32% opacity.
- Personality activation is a parallel lane offset `-3.2` units from the route centerline.
- Design activation is a parallel lane offset `+3.2` units from the route centerline.
- A channel active on both sides shows both lanes, plus a short brass clasp at each gate badge.
- If only one gate is active, show a half-channel from the active gate to 48% of the route length, fading before the midpoint.
- If neither gate is active, keep only the low-opacity structure line.

Crossing treatment:

- Active lanes pass visually above inactive structure lines.
- At unavoidable active-active crossings, the later lexicographic channel gets a 7-unit bridge gap in the lower-priority lane, with rounded caps.
- Channel strokes avoid gate numbers by terminating at the badge tangent and leaving a 1.5-unit clear ring.

## 9. Color and typography

Use current Pluto brand tokens from the page CSS, not any prior SVG color extraction:

| Use | Token or target |
| --- | --- |
| App background | deep plum/black range: `#120d15`, `#241625`, `#0e0c12` |
| Poster surface | warm vellum range: `#f3e3cc`, `#f6eadb`, `#f8eddd` |
| Brass outline | `#b78345`, `#a87945`, `#d8b17d` |
| Personality | muted lavender: `#b9a6dd` |
| Design | wine red: `#9a2838` |
| Defined center fill | warm low-saturation bone, brass, rose, or clay planes with 70-92% opacity |
| Undefined center fill | transparent vellum or dark-panel wash with visible pattern |
| Primary text on dark | `#f1e7dc` |
| Muted text | `#b9a7a1` |
| Text on vellum | `#2c2525`, `#4f4541`, `#5f534c` |

Contrast targets:

- Gate numbers against their badge fill: at least 4.5:1 where possible, never below 3:1 in decorative poster mode.
- Center labels, if shown, at least 4.5:1.
- Active channel lanes must remain distinguishable from inactive structure at 2x mobile zoom.

Typography:

- Editorial headings and poster identity text may use Georgia, Songti SC, STSong, or Times New Roman.
- Gate numbers, labels, and interaction text use ui-sans-serif/system sans.
- Gate number size: 6.2-7.2 SVG units, rendered no smaller than 7 CSS px.
- Optional center abbreviations use 7-8 SVG units and should be disabled on the smallest export if they compete with gate numbers.

## 10. Interaction and rendering states

- Initial inactive state: all 36 channels appear as quiet structure lines; all centers appear Undefined unless calculation data marks them Defined.
- Personality activation: use the lavender lane, a small left-side tick on the gate badge, and a solid dot at the active gate.
- Design activation: use the wine lane, a small right-side tick on the gate badge, and a ring mark at the active gate.
- Dual activation: show both lanes and combine dot plus ring in the gate badge; use a small brass clasp at both channel endpoints when the whole channel is active on both sides.
- Defined center: heavier stroke, filled plane, and filled notch marks on active connection edges.
- Undefined center: lighter patterned fill, lighter dashed or double stroke, and outlined notches.
- Privacy mode: graph geometry and activation states remain visible; personal name, date, time, and place remain outside this SVG and can be hidden by the existing privacy flow.
- Image saving: render without hover-only affordances; preserve lane offsets, labels, and center patterns at export resolution.
- Poster output: use the dark mobile export treatment with brass, lavender, wine, and vellum contrast tuned for 600 px wide composition.
- Black-and-white mode: map Personality to solid lane, Design to dashed lane, Defined to heavier fill/stroke, and Undefined to lighter patterned open shape.

## 11. Accessibility

- Do not rely on color alone. Use lane side, dash pattern, dot/ring marks, center fill weight, and pattern differences.
- Maintain gate numbers at readable size on mobile and in saved images.
- Target at least 4.5:1 contrast for essential text and at least 3:1 for structural chart marks.
- The SVG root should have a localized `aria-label` describing the chart, its active gates, defined centers, and the meaning of the two activation lanes.
- Reduce visual crowding by reserving clear rings around gate badges and by routing active lanes above inactive structure lines.
- Touch and zoom behavior should keep the graph readable at common mobile widths; no essential meaning should require hover.
- Black-and-white print must distinguish Personality, Design, Defined, Undefined, active, partial, and inactive states through shape and stroke treatment.

## 12. Clean-room statement

This design specification was built only from the current Pluto brand CSS, current page layout, functional topology data, schema-level state semantics, and high-level product requirements. The process did not read prior BodyGraph SVG files, prior BodyGraph screenshots, historical SVG blobs, visual diffs, blame output, third-party BodyGraph pages, third-party BodyGraph images, or third-party BodyGraph design templates.

This document is intended to serve as development-source evidence for a new implementation phase. It is not an absolute legal guarantee, does not claim legal advice, does not claim Apple approval, and does not claim that any external reviewer has approved the resulting design.
