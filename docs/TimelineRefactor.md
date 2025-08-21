# Timeline Refactor — Context Snapshot

Last updated: {{DATE}}

## Goals
- Make `BroadcastTimeline` presentational (driven by props): `currentTime`, `duration`, `isPlaying`.
- Use a single controller hook to own time (play/pause/stop/seek).
- Treat the master lane as a schedule window only (no keyframes).
- Add property lanes per element for animation (transforms first; style next).

## Key Decisions
- Removed master-lane keyframes and all add‑KF UI on the master row.
- The item block now uses persistent `layer.start/end` and drag/resize only adjusts these.
- Property lanes will own all animation KFs; master block remains independent.
- Keep `updateElementFromTimeline(id, values)` as the rendering path (Konva stays unchanged).

## Current Changes
- `frontend/src/components/graphics/BroadcastTimeline.jsx`
  - Driven by props: `currentTime`, `duration`, `isPlaying`.
  - Master-lane KFs removed; Shift+click add removed; Plus button removed.
  - Block renders from `layer.start/end` even with 0 KFs; draggable/resizable without affecting KFs.
  - Text effect block uses layer bounds; optional.
- `frontend/src/timeline/useTimelineController.js`
  - New controller hook (raf-based): `play`, `pause`, `stop`, `seek`, `currentTime`, `duration`, `isPlaying`.

## Open Items
- Property lanes (per element): transform first (x, y, rotation, scaleX, scaleY, opacity).
- Lane interactions: add/move/delete keyframes; snapping to grid/playhead/neighbor.
- Sampling for lanes (numeric now; color/boolean/enum next).
- Property picker per element type (text/shape/image/video) for adding style lanes.
- Persistence: store `tracksById` with `propertyTracks`; derive combined KFs on write (optional).
- Easing UI in lane context menu.

## Next Steps
1. Scaffold `PropertyLanes`/`PropertyLane` components under each item row.
2. Implement transform lanes with diamonds and snapping; wire `onChangeTracks(next)`.
3. Add sampling for transform lanes and call `updateElementFromTimeline(id, values)`.
4. Add "Add Property" picker for style properties (text first: fill, stroke, fontSize, etc.).
5. Persist `tracksById.propertyTracks` in the document/template state.

## Notes
- Keep UI simple: one place to animate (timeline), one place to configure base/static values (Properties Panel).
- Panel can show an "Animated" badge next to fields that have lanes; avoid duplicating lane UI there.

