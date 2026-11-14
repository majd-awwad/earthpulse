# Decode v2 integration contract

## DOM and exports

| Mount | Owner | Responsibility |
|---|---|---|
| `#decode-stage` | Majd | Shared extent for the two layers. |
| `#decode-visual` | Roaa | Inert, aria-hidden and pointer-transparent SVG. Use the same bounds and row/column geometry as the interactive grid. |
| `#decode-grid` | Israa | The only named `role=grid`. Render rows and accessible cells with native buttons using `.dg-cell[data-row][data-col]`. Use one roving Tab stop. Each guess exposes its pressed state. |
| `#decode-status` | Israa | Polite live region for actions, playback completion and revealed results. Skip per-tone announcements. |

The signatures are in `decode.d.ts`. Majd provides `validateDecodeCase`. Mohammad supplies `loadDecodeCase` from `web/sources/decode/index.js`. Andreh supplies `makeSpatialPlan` and `heardClass` from `web/audio/spatial-plan.js`. Yaman supplies `createDecodeSession` and `scoreGuesses` from `web/experiences/decode/session.js` and `score.js`. Roaa supplies `mountDecodeVisual` from `web/visual/decode-visual.js`. Israa supplies `mountDecodeGrid` and `decodeMessage` from `web/accessibility/decode-grid.js` and `web/i18n/decode-messages.js`.

## Interaction and disclosure

Row 0 is north; column 0 is west in Arabic and English. The only shared focus is `snapshot.focus`. Arrows move it. Pointer activation and Space use the same toggle. Enter probes, P sweeps, L plays calibration, R reads and S submits. Scope character shortcuts to the grid. Keep Tab exits and visible controls. An active playback event does not move keyboard focus. Both layers use the current plan revision and transport event identity for the playhead. Do not start a renderer clock or expose private spatial-plan evidence to resolve the active cell.

In Discovery before Reveal, cells contain only `row`, `col`, `lat` and `lon`. Keep values, statuses, event counts, source imagery, truth and scores out of the visual and accessibility trees. The v2 `expectedCount` hint must be the same in every compared condition when used. Only relay `lastProbe.heard` after a permitted probe; it is a qualitative cue. In a text-only trial it cannot relay an unplayed audio probe. Learning may expose readings and does not submit or score. After Reveal, keep guesses locked. Fixtures must have a visible test-data label when exercised by later integration.

This milestone freezes the excerpt and leaves production wiring for F1. The shared excerpt lacks an explicit session field for event-ID-to-cell resolution, localized source metadata/units and per-cell grading outcomes. It shows only a summary score, although the visual brief calls for cell-level reveal markers. The session brief additionally injects `heardClass`. Before wiring the affected feature, Majd and its owners must confirm the missing payloads and alignment without sending raw case data to renderers or extending the wire format informally. Non-interactive drawing stays aria-hidden; meaningful evidence and controls must be available to assistive technology through the interactive/evidence layer.

## Validation and sources

The validator accepts the truth rule literal `value >= threshold`. Quick uses either `mean of 2x2 advanced cells` for continuous data or `sum of 2x2 advanced cells` for intermittent counts. Each Quick cell is missing if any child is missing. Use one threshold across levels and recompute the truth for each level. Grids are rectangular, equally subdivided in WGS84 and ordered north-to-south, west-to-east. Source granule IDs stay strings; record authenticated download links, checksums, QA and native-to-advanced aggregation in the science provenance. Propose any additional rule explicitly before using it in a case.

Validation checks structure and internal consistency. `SAME_DATA` requires independent evidence of the frame's source run, time, field, domain and registration. [SVS 5669](https://svs.gsfc.nasa.gov/5669/) credits GEOS-FP 2 km Replay. MERRA-2 uses `RELATED_CONTEXT` with an explicit note and independent attribution.
