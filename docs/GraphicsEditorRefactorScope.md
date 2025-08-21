# Graphics Template Editor — Refactor Scope (v1)

Last updated: {{DATE}}

## Overview
This document defines the scope, target architecture, and milestone plan to refactor the Graphics Template Editor module. The goal is a cohesive, type-safe, performant, and debuggable editor that supports property-based animation, a clean inspector, a smooth canvas, and a future-proof template schema.

Scope includes ONLY the Graphics Template Editor (not rundown, live control, or media ingest). All editor code will be consolidated under `src/components/graphics`.

## Goals
- Consolidate editor code into a single module with consistent patterns.
- Convert to TypeScript for safety and clear contracts.
- Establish an Engine → State → Adapter → UI separation of concerns.
- Provide smooth playback (rAF-based) with Konva adapter batch updates.
- Property lanes for transforms and style (including crop).
- Master lane is schedule-only and shifts all property KFs when moved.
- GraphicsInspector (renamed from PropertiesPanel) for base values (with Animated badge + optional add-KF action).
- Persistence to localStorage; versioned schema for future template output.
- Minimal logging in prod with a dev-only diagnostics toggle.

## Out of Scope (for this refactor)
- Changes to rundown/live control/media ingest modules.
- Player (`public/player.html`) integration changes (leave as-is for now).

## Target Architecture
- Engine (pure, TS): interpolation (numeric/color/boolean/enum), easing (blended start/end), track ops (add/move/delete/shift/snap), export/serialize.
- State (Zustand, TS): elements, tracksById, selection, time controller (play/pause/seek), UI toggles, undo/redo, persistence.
- Adapter (Konva for now): batched updates per rAF (`applyTimelineValues`), centering/fit at scale ≤ 1, clamp pan at scale > 1.
- UI (React TSX): GraphicsEditor (root), Toolbar, CanvasView, Timeline (master + property lanes), GraphicsInspector (modular per-element type), Modals.

## Data Model (TypeScript)
- TemplateDoc: `{ id, name, createdAt, updatedAt, duration, elements: Element[], tracksById: Record<string, Track>, meta? }`
- Element: `{ id, type: 'text'|'rect'|'circle'|'image'|'video'|'group', props: ElementProps, style: ElementStyle, children?, media? }`
- Track: `{ elementId, layer: {start:number, end:number}, propertyTracks: PropertyTracks }`
- PropertyTracks:
  - numeric: Record<NumericProp, KF<number>[]>
  - color: Record<ColorProp, KF<string>[]>
  - boolean: Record<BooleanProp, KF<boolean>[]>
  - enum: Record<EnumProp, KF<string>[]>
- KF<T>: `{ id: string, time: number, value: T, easing?: 'linear'|'easeIn'|'easeOut'|'easeInOut' }`

Notes:
- Easing semantics: start easing affects launch, end easing affects landing; blend segment easing: `e = (1-u)*startEase + u*endEase`.
- Crop properties for image/video: `cropLeft|Right|Top|Bottom` as 0–100 % lanes.

## Persistence
- LocalStorage key: `graphicsEditor:<docId>`; versioned schema.
- Serialization helper to produce final template output (to be aligned with player later).

## Timeline & UX
- Master lane: visual schedule only; moving/resizing shifts all property keyframes by Δt (bounded to ≥0). No keyframes in master.
- Property lanes:
  - Transforms: x, y, rotation, scaleX, scaleY, opacity (default visible lanes).
  - Style: text (fill, stroke, fontSize, letterSpacing, lineHeight, gradients), shape (fill/stroke/width, cornerRadius, gradients), image/video (border color/width/gradient), crop (x/y percent separately for L/R/T/B).
  - Diamonds: right-click → Delete | Easing; colored by easing; tooltips show value + easing.
- GraphicsInspector:
  - Base values (single source); “Animated” badge when a lane exists; optional “add KF at playhead” next to fields.
- Diagnostics overlay: behind toggle; no prod logging.

## Performance
- Single rAF loop in the controller store.
- Engine sampling → adapter `applyTimelineValues` → `layer.batchDraw()` once per frame.
- React memoization for heavy subtrees (lanes, lists).

## Conventions
- TS strict mode; ESLint + Prettier.
- Folder layout:
  - `graphics/GraphicsEditor.tsx`
  - `graphics/Toolbar.tsx`
  - `graphics/CanvasView.tsx`
  - `graphics/Timeline/Timeline.tsx`, `PropertyLanes.tsx`, `KeyframeDiamond.tsx`
  - `graphics/Properties/GraphicsInspector.tsx`, `TextInspector.tsx`, `ShapeInspector.tsx`, etc.
  - `graphics/state/store.ts`
  - `graphics/engine/interpolation.ts`, `easing.ts`, `tracks.ts`, `snap.ts`
  - `graphics/adapters/konva.ts`
  - `graphics/persistence/storage.ts`
  - `graphics/types.ts`

## Milestones & Deliverables

- M1: TS skeleton + state + transform lanes + inspector foundation
  - Consolidate under `src/components/graphics/`
  - Convert to TypeScript; add `types.ts`
  - Zustand store with rAF controller + persistence (localStorage)
  - Konva adapter (`applyTimelineValues`, batchDraw, fit/clamp)
  - Timeline: master lane (schedule-only), transform lanes with snapping & easing
  - GraphicsInspector scaffold with per-type stubs

- M2: Style lanes + full inspector + crop + master shift
  - Implement style lanes (text/shape/image/video) & crop lanes
  - Complete GraphicsInspector editors with consistent inputs, debounced updates, Animated badges
  - Master lane move shifts all property KFs by Δt (bounded)
  - Undo/redo in store

- M3: Polish + Docs
  - Memoization, small UX improvements (easing presets, bezier picker optional)
  - Architecture.md, State Model, Conventions, Template schema notes

## Task Checklist

- [ ] Create TS skeleton and consolidate files under `src/components/graphics`
- [ ] Add TypeScript configs and convert editor files to TS/TSX
- [ ] Implement Zustand store (elements, tracksById, selection, controller, undo/redo)
- [ ] Implement engine (interpolation, easing blend, track ops, snapping)
- [ ] Implement Konva adapter (`applyTimelineValues`, batchDraw, fit/clamp behavior)
- [ ] Implement Timeline (master lane schedule-only, transform lanes, snapping, easing UI)
- [ ] Implement GraphicsInspector scaffold (rename from PropertiesPanel; per-type stubs)
- [ ] Persist template doc to localStorage (versioned)
- [ ] Implement style lanes (text/shape/image/video) & crop lanes
- [ ] Implement full GraphicsInspector editors with Animated badges + optional add-KF buttons
- [ ] Implement master lane shift (Δt) for all property KFs + bounds handling
- [ ] Implement undo/redo in store
- [ ] Add Diagnostics toggle and remove prod logging
- [ ] Memoize heavy UI and finalize UX polish
- [ ] Add docs: Architecture.md + Schema notes

## Notes & Decisions
- Chrome-only support is acceptable for now.
- Keep Konva; re-evaluate Pixi if needed for future performance scaling.
- Manual testing initially.

## Open Items (to track)
- Align final template output schema with player when ready.
- Optional: easing presets and cubic-bezier editor in M3.
- Optional: export/import template docs.

