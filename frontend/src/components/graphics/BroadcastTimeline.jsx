import { useEffect, useRef, useState } from 'react'
import { Play, Pause, SkipStart, Plus, Diamond } from 'react-bootstrap-icons'

/**
 * BroadcastTimeline (drop-in)
 * - Measured width (no hardcoded 600)
 * - Draggable & resizable LAYER blocks (based on first/last keyframes)
 * - Nested Text Effect blocks (draggable & resizable, clamped inside layer)
 * - Simple keyframe interpolation (x,y,rotation,scale,opacity)
 * - Playhead, ruler, shift+click to add keyframe at cursor
 */

const EASING = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
}

export default function BroadcastTimeline({ elements = [], onTimelineUpdate }) {
  const [timeline, setTimeline] = useState({
    duration: 10,
    currentTime: 0,
    isPlaying: false,
    elements: {},
  })

  // --- measured width for ruler/track ---
  const timelineRef = useRef(null)
  const rulerRef = useRef(null)
  const [trackWidth, setTrackWidth] = useState(600)

  useEffect(() => {
    const el = rulerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width || el.clientWidth
      if (w) setTrackWidth(w)
    })
    ro.observe(el)
    setTrackWidth(el.clientWidth || 600)
    return () => ro.disconnect()
  }, [])

  const t2x = (t) => (t / timeline.duration) * trackWidth
  const x2t = (x) => (x / trackWidth) * timeline.duration
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

  // rAF playback
  const rafRef = useRef(0)
  const startMsRef = useRef(0)
  useEffect(() => {
    if (!timeline.isPlaying) return
    const tick = () => {
      const now = performance.now()
      const elapsed = (now - startMsRef.current) / 1000
      const newTime = Math.min(elapsed, timeline.duration)
      setTimeline((p) => ({ ...p, currentTime: newTime }))
      updateCanvas(newTime)
      if (newTime < timeline.duration) rafRef.current = requestAnimationFrame(tick)
      else setTimeline((p) => ({ ...p, isPlaying: false, currentTime: timeline.duration }))
    }
    startMsRef.current = performance.now() - timeline.currentTime * 1000
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [timeline.isPlaying])

  // initialize/merge element tracks
  useEffect(() => {
    setTimeline((prev) => {
      const next = { ...prev, elements: { ...prev.elements } }
      elements.forEach((el) => {
        if (!next.elements[el.id]) {
          next.elements[el.id] = {
            type: el.type,
            name: el.name || trackNameFor(el),
            keyframes: [
              { id: `${el.id}-start`, time: 0, easing: 'linear', properties: baseProps(el) },
              { id: `${el.id}-end`, time: 3, easing: 'linear', properties: baseProps(el) },
            ],
            textEffect:
              el.type === 'text' && el.animation?.preset && el.animation.preset !== 'none'
                ? { preset: el.animation.preset, triggerTime: 1, duration: 2 }
                : null,
          }
        } else {
          next.elements[el.id] = next.elements[el.id] // preserve
        }
      })
      return next
    })
  }, [elements])

  // --- interpolation / canvas update ---
  function baseProps(el) {
    return {
      x: el.x || 0,
      y: el.y || 0,
      opacity: el.opacity ?? 1,
      rotation: el.rotation || 0,
      scaleX: el.scaleX || 1,
      scaleY: el.scaleY || 1,
    }
  }

  function interpolate(elTrack, t) {
    const kfs = [...elTrack.keyframes].sort((a, b) => a.time - b.time)
    if (!kfs.length) return {}
    if (t <= kfs[0].time) return kfs[0].properties
    if (t >= kfs[kfs.length - 1].time) return kfs[kfs.length - 1].properties

    let a = kfs[0],
      b = kfs[kfs.length - 1]
    for (let i = 0; i < kfs.length - 1; i++) {
      if (t >= kfs[i].time && t <= kfs[i + 1].time) {
        a = kfs[i]
        b = kfs[i + 1]
        break
      }
    }
    const segDur = Math.max(0.0001, b.time - a.time)
    const u = (t - a.time) / segDur
    const e = (EASING[a.easing] || EASING.linear)(u)
    const out = {}
    for (const key of Object.keys(a.properties)) {
      const av = a.properties[key]
      const bv = b.properties[key]
      out[key] = typeof av === 'number' && typeof bv === 'number' ? av + (bv - av) * e : e < 0.5 ? av : bv
    }
    return out
  }

  function updateCanvas(time) {
    Object.entries(timeline.elements).forEach(([id, tr]) => {
      const props = interpolate(tr, time)
      let fx = {}
      if (tr.textEffect) {
        const { triggerTime, duration } = tr.textEffect
        const start = triggerTime
        const end = triggerTime + duration
        const p = (time - start) / Math.max(0.0001, duration)
        fx = {
          animationTrigger: time >= start && time <= end,
          animationProgress: clamp(p, 0, 1),
        }
      }
      onTimelineUpdate?.({ elementId: id, values: { ...props, ...fx } })
    })
  }

  // --- seek/scrub ---
  const [isScrubbing, setIsScrubbing] = useState(false)
  const onSeek = (clientX, container) => {
    const rect = container.getBoundingClientRect()
    const x = clamp(clientX - rect.left, 0, trackWidth)
    const t = clamp(x2t(x), 0, timeline.duration)
    setTimeline((p) => ({ ...p, currentTime: t }))
    updateCanvas(t)
  }

  const onRulerClick = (e) => {
    if (isScrubbing) return
    onSeek(e.clientX, e.currentTarget)
  }

  const onScrubDown = (e) => {
    e.stopPropagation()
    setIsScrubbing(true)
    const ruler = rulerRef.current
    if (!ruler) return
    const move = (ev) => onSeek(ev.clientX, ruler)
    const up = () => {
      setIsScrubbing(false)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // --- layer block drag/resize ---
  const [dragState, setDragState] = useState(null) // {type:'layer', elementId, action, startX, layerStart, layerEnd, kfs}

  const onLayerMouseDown = (e, elementId, action = 'move') => {
    e.preventDefault()
    e.stopPropagation()
    const tr = timeline.elements[elementId]
    if (!tr) return
    const times = tr.keyframes.map((k) => k.time)
    const layerStart = Math.min(...times)
    const layerEnd = Math.max(...times)

    const st = { type: 'layer', elementId, action, startX: e.clientX, layerStart, layerEnd, kfs: [...tr.keyframes] }
    setDragState(st)

    const move = (ev) => {
      const dx = ev.clientX - st.startX
      const dt = (dx / trackWidth) * timeline.duration
      let newKfs = [...st.kfs]

      if (st.action === 'move') {
        newKfs = newKfs.map((kf) => ({ ...kf, time: clamp(kf.time + dt, 0, timeline.duration) }))
      } else if (st.action === 'resize-right') {
        const origDur = st.layerEnd - st.layerStart
        const newEnd = Math.max(st.layerStart + 0.1, st.layerEnd + dt)
        const newDur = newEnd - st.layerStart
        const s = origDur > 0 ? newDur / origDur : 1
        newKfs = newKfs.map((kf) => ({ ...kf, time: st.layerStart + (kf.time - st.layerStart) * s }))
      } else if (st.action === 'resize-left') {
        const origDur = st.layerEnd - st.layerStart
        const newStart = clamp(st.layerStart + dt, 0, st.layerEnd - 0.1)
        const newDur = st.layerEnd - newStart
        const s = origDur > 0 ? newDur / origDur : 1
        newKfs = newKfs.map((kf) => ({ ...kf, time: newStart + (kf.time - st.layerStart) * s }))
      }

      setTimeline((p) => ({
        ...p,
        elements: { ...p.elements, [elementId]: { ...p.elements[elementId], keyframes: newKfs.sort((a, b) => a.time - b.time) } },
      }))
    }

    const up = () => {
      setDragState(null)
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // --- nested text effect drag/resize (clamped to layer) ---
  const onFxMouseDown = (e, elementId, mode = 'move') => {
    e.preventDefault()
    e.stopPropagation()
    const tr = timeline.elements[elementId]
    if (!tr?.textEffect) return

    const times = tr.keyframes.map((k) => k.time)
    const layerStart = Math.min(...times)
    const layerEnd = Math.max(...times)

    const { triggerTime, duration } = tr.textEffect
    const startX = e.clientX

    const move = (ev) => {
      const dx = ev.clientX - startX
      const dt = (dx / trackWidth) * timeline.duration
      let newTrigger = triggerTime
      let newDur = duration

      if (mode === 'move') {
        newTrigger = clamp(triggerTime + dt, layerStart, layerEnd - duration)
      } else if (mode === 'resize-left') {
        const candidate = clamp(triggerTime + dt, layerStart, triggerTime + duration - 0.1)
        newDur = triggerTime + duration - candidate
        newTrigger = candidate
      } else if (mode === 'resize-right') {
        const candidateEnd = clamp(triggerTime + duration + dt, triggerTime + 0.1, layerEnd)
        newDur = candidateEnd - triggerTime
      }

      setTimeline((p) => ({
        ...p,
        elements: {
          ...p.elements,
          [elementId]: { ...p.elements[elementId], textEffect: { ...p.elements[elementId].textEffect, triggerTime: newTrigger, duration: newDur } },
        },
      }))
    }

    const up = () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }

    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
  }

  // --- keyframes ---
  const addKeyframeAtCurrent = (elementId, currentElement) => {
    const t = Math.round(timeline.currentTime * 100) / 100
    const kf = {
      id: `${elementId}-${Date.now()}`,
      time: t,
      easing: 'easeInOut',
      properties: baseProps(currentElement),
    }
    const list = timeline.elements[elementId]?.keyframes || []
    const existing = list.find((k) => Math.abs(k.time - t) < 0.1)
    setTimeline((p) => ({
      ...p,
      elements: {
        ...p.elements,
        [elementId]: {
          ...p.elements[elementId],
          keyframes: existing
            ? list.map((k) => (k.id === existing.id ? { ...k, properties: kf.properties } : k))
            : [...list, kf].sort((a, b) => a.time - b.time),
        },
      },
    }))
  }

  // --- transport ---
  const togglePlay = () => setTimeline((p) => ({ ...p, isPlaying: !p.isPlaying }))
  const reset = () => {
    setTimeline((p) => ({ ...p, isPlaying: false, currentTime: 0 }))
    updateCanvas(0)
  }

  return (
    <div
      ref={timelineRef}
      style={{
        height: 200,
        background: '#1a1a1a',
        border: '1px solid #333',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Controls */}
      <div
        style={{
          height: 40,
          background: '#2a2a2a',
          borderBottom: '1px solid #333',
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
          gap: 10,
        }}
      >
        <div style={{ fontSize: 12, color: '#888' }}>Broadcast Timeline</div>
        <button
          onClick={togglePlay}
          style={{
            padding: '6px 10px',
            background: timeline.isPlaying ? '#f44336' : '#4caf50',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {timeline.isPlaying ? <Pause size={12} /> : <Play size={12} />}
          {timeline.isPlaying ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={reset}
          style={{
            padding: '6px 10px',
            background: '#666',
            border: 'none',
            borderRadius: 4,
            color: '#fff',
            fontSize: 11,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <SkipStart size={12} /> Reset
        </button>
        <div style={{ fontSize: 11, color: '#888', marginLeft: 10 }}>
          {timeline.currentTime.toFixed(2)}s / {timeline.duration}s
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 11, color: '#4a90e2' }}>Tracks: {Object.keys(timeline.elements).length}</div>
      </div>

      {/* Ruler */}
      <div style={{ height: 30, background: '#2a2a2a', borderBottom: '1px solid #444', display: 'flex', position: 'relative' }}>
        <div
          style={{
            width: 200,
            background: '#333',
            borderRight: '1px solid #444',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontSize: 11,
            color: '#888',
          }}
        >
          Elements
        </div>
        <div ref={rulerRef} className="timeline-ruler" style={{ flex: 1, position: 'relative', cursor: 'pointer' }} onMouseDown={onRulerClick}>
          {Array.from({ length: Math.floor(timeline.duration) + 1 }, (_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: t2x(i),
                top: 0,
                height: '100%',
                borderLeft: '1px solid #555',
                fontSize: 10,
                color: '#888',
                paddingLeft: 2,
                lineHeight: '30px',
              }}
            >
              {i}s
            </div>
          ))}
          {/* Playhead */}
          <div
            style={{ position: 'absolute', left: t2x(timeline.currentTime), top: 0, width: 2, height: '100%', background: '#4caf50', zIndex: 10, cursor: 'grab' }}
            onMouseDown={onScrubDown}
          >
            <div style={{ position: 'absolute', top: -5, left: -10, width: 22, height: 15, background: '#4caf50', clipPath: 'polygon(50% 100%, 0 0, 100% 0)' }} />
            <div style={{ position: 'absolute', top: -10, left: -15, width: 32, height: 40 }} />
          </div>
        </div>
      </div>

      {/* Tracks */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {elements.length ? (
          elements.map((el) => {
            const tr = timeline.elements[el.id]
            if (!tr) return null
            const times = tr.keyframes.map((k) => k.time)
            const layerStart = Math.min(...times)
            const layerEnd = Math.max(...times)
            const layerDur = Math.max(0.5, times.length === 1 ? 2 : layerEnd - layerStart)

            return (
              <div key={el.id} style={{ marginBottom: 1 }}>
                <div style={{ height: 40, background: '#2a2a2a', borderBottom: '1px solid #333', display: 'flex', alignItems: 'center' }}>
                  <div
                    style={{
                      width: 200,
                      padding: '0 10px',
                      fontSize: 12,
                      color: '#fff',
                      borderRight: '1px solid #333',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 10, color: '#4a90e2' }}>●</span>
                    <span>{tr.name}</span>
                    <button
                      onClick={() => addKeyframeAtCurrent(el.id, el)}
                      style={{
                        marginLeft: 'auto',
                        width: 16,
                        height: 16,
                        background: '#4a90e2',
                        border: 'none',
                        borderRadius: 2,
                        color: '#fff',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      title="Add keyframe"
                    >
                      <Plus size={10} />
                    </button>
                  </div>

                  <div
                    style={{ flex: 1, height: '100%', position: 'relative', background: '#1a1a1a' }}
                    onMouseDown={(e) => {
                      // shift+click to add keyframe at cursor
                      if (!e.shiftKey) return
                      const rect = e.currentTarget.getBoundingClientRect()
                      const t = clamp(x2t(clamp(e.clientX - rect.left, 0, trackWidth)), 0, timeline.duration)
                      setTimeline((p) => ({
                        ...p,
                        currentTime: t,
                        elements: {
                          ...p.elements,
                          [el.id]: {
                            ...p.elements[el.id],
                            keyframes: [
                              ...p.elements[el.id].keyframes,
                              { id: `${el.id}-${Date.now()}`, time: t, easing: 'easeInOut', properties: baseProps(el) },
                            ].sort((a, b) => a.time - b.time),
                          },
                        },
                      }))
                      updateCanvas(t)
                    }}
                  >
                    {/* Layer block */}
                    <div
                      data-layer-block
                      style={{
                        position: 'absolute',
                        left: t2x(layerStart),
                        top: '25%',
                        width: Math.max(t2x(layerDur), 60),
                        height: '50%',
                        background: dragState?.elementId === el.id ? 'rgba(74, 144, 226, 0.4)' : 'rgba(74, 144, 226, 0.2)',
                        border: '1px solid rgba(74, 144, 226, 0.8)',
                        borderRadius: 2,
                        cursor: 'move',
                        zIndex: dragState?.elementId === el.id ? 10 : 2,
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                      }}
                      onMouseDown={(e) => onLayerMouseDown(e, el.id, 'move')}
                      title={`Layer: ${tr.name} (${layerStart.toFixed(1)}s–${layerEnd.toFixed(1)}s)`}
                    >
                      {/* Left resize */}
                      <div
                        data-resize-handle
                        style={{
                          position: 'absolute',
                          left: -4,
                          top: -3,
                          bottom: -3,
                          width: 10,
                          background: 'rgba(255,255,255,0.1)',
                          cursor: 'ew-resize',
                          zIndex: 15,
                          borderRadius: '3px 0 0 3px',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                        onMouseDown={(e) => onLayerMouseDown(e, el.id, 'resize-left')}
                      />
                      <div style={{ position: 'absolute', left: 1, top: 2, bottom: 2, width: 2, background: 'rgba(255,255,255,0.6)', pointerEvents: 'none', borderRadius: 1 }} />
                      <div
                        style={{
                          fontSize: 10,
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                          padding: '0 8px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          pointerEvents: 'none',
                        }}
                      >
                        {tr.name}
                      </div>
                      {/* Right resize */}
                      <div
                        data-resize-handle
                        style={{
                          position: 'absolute',
                          right: -4,
                          top: -3,
                          bottom: -3,
                          width: 10,
                          background: 'rgba(255,255,255,0.1)',
                          cursor: 'ew-resize',
                          zIndex: 15,
                          borderRadius: '0 3px 3px 0',
                          border: '1px solid rgba(255,255,255,0.3)',
                        }}
                        onMouseDown={(e) => onLayerMouseDown(e, el.id, 'resize-right')}
                      />
                      <div style={{ position: 'absolute', right: 1, top: 2, bottom: 2, width: 2, background: 'rgba(255,255,255,0.6)', pointerEvents: 'none', borderRadius: 1 }} />
                    </div>

                    {/* Keyframes diamonds */}
                    {tr.keyframes.map((kf) => (
                      <div
                        key={kf.id}
                        style={{
                          position: 'absolute',
                          left: t2x(kf.time),
                          top: '50%',
                          transform: 'translate(-50%, -50%) rotate(45deg)',
                          width: 10,
                          height: 10,
                          background: '#4a90e2',
                          border: '2px solid #fff',
                          cursor: 'pointer',
                          zIndex: 5,
                        }}
                        title={`Keyframe @ ${kf.time.toFixed(2)}s`}
                      />
                    ))}

                    {/* Nested Text Effect block */}
                    {tr.textEffect && (
                      <div
                        data-effect-block
                        style={{
                          position: 'absolute',
                          left: t2x(tr.textEffect.triggerTime),
                          top: '20%',
                          width: t2x(Math.max(0.1, tr.textEffect.duration)),
                          height: '60%',
                          background: 'rgba(156, 39, 176, 0.25)',
                          border: '1px solid #9c27b0',
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#fff',
                          cursor: 'move',
                          zIndex: 6,
                        }}
                        onMouseDown={(e) => onFxMouseDown(e, el.id, 'move')}
                        title={`${el.animation?.preset || 'Text'} effect (drag / resize edges)`}
                      >
                        {/* left handle */}
                        <div
                          style={{
                            position: 'absolute',
                            left: -4,
                            top: -3,
                            bottom: -3,
                            width: 10,
                            background: 'rgba(255,255,255,0.12)',
                            cursor: 'ew-resize',
                            zIndex: 7,
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '3px 0 0 3px',
                          }}
                          onMouseDown={(e) => onFxMouseDown(e, el.id, 'resize-left')}
                        />
                        <div style={{ pointerEvents: 'none', display: 'flex', alignItems: 'center' }}>
                          <Diamond size={10} style={{ marginRight: 4 }} />
                          {el.animation?.preset || 'Effect'}
                        </div>
                        {/* right handle */}
                        <div
                          style={{
                            position: 'absolute',
                            right: -4,
                            top: -3,
                            bottom: -3,
                            width: 10,
                            background: 'rgba(255,255,255,0.12)',
                            cursor: 'ew-resize',
                            zIndex: 7,
                            border: '1px solid rgba(255,255,255,0.3)',
                            borderRadius: '0 3px 3px 0',
                          }}
                          onMouseDown={(e) => onFxMouseDown(e, el.id, 'resize-right')}
                        />
                      </div>
                    )}

                    {/* Row playhead bead & midline */}
                    <div
                      style={{
                        position: 'absolute',
                        left: t2x(timeline.currentTime),
                        top: '50%',
                        transform: 'translate(-50%,-50%)',
                        width: 6,
                        height: 6,
                        background: '#4caf50',
                        borderRadius: 6,
                        border: '1px solid #fff',
                        pointerEvents: 'none',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: 1,
                        background: '#333',
                        transform: 'translateY(-50%)',
                      }}
                    />
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div style={{ padding: 20, textAlign: 'center', color: '#666', fontSize: 12 }}>Add elements to the canvas to create timeline tracks</div>
        )}
      </div>
    </div>
  )
}

function trackNameFor(el) {
  if (el.name?.trim()) return el.name
  switch (el.type) {
    case 'text':
      return el.text ? `Text: ${el.text.slice(0, 15)}…` : 'Text Element'
    case 'rect':
      return 'Rectangle'
    case 'circle':
      return 'Circle'
    case 'image':
      return 'Image'
    case 'video':
      return 'Video'
    default:
      return `${el.type} Element`
  }
}