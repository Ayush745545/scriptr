import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { TemplateLayerV1, TemplatePreviewProps } from './types'

/* ─── helpers ─── */

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max)
}

function resolveToken(
  value: any,
  opts: {
    themeColors: Record<string, string>
    themeFonts: Record<string, string>
    placeholderValues: Record<string, string>
    durationSeconds: number
  },
) {
  if (typeof value !== 'string') return value
  if (value === '$duration') return opts.durationSeconds
  if (value.startsWith('$theme.colors.')) return opts.themeColors[value.slice(15)] ?? '#000000'
  if (value.startsWith('$theme.fonts.')) return opts.themeFonts[value.slice(14)] ?? 'Inter'
  if (value.startsWith('$placeholder.')) return opts.placeholderValues[value.slice(13)] ?? ''
  return value
}

function resolveObj(value: any, resolver: (v: any) => any): any {
  if (Array.isArray(value)) return value.map((v) => resolveObj(v, resolver))
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {}
    for (const [k, v] of Object.entries(value)) out[k] = resolveObj(v, resolver)
    return out
  }
  return resolver(value)
}

function layerVisible(layer: TemplateLayerV1, t: number, dur: number) {
  const start = Number(layer.start ?? 0)
  const end = layer.end === '$duration' ? dur : Number(layer.end ?? dur)
  return t >= start && t <= end
}

function motionVariants(type?: string) {
  switch (type) {
    case 'fade':
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    case 'slideUp':
      return { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } }
    case 'slideDown':
      return { initial: { opacity: 0, y: -28 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 10 } }
    case 'pop':
      return { initial: { opacity: 0, scale: 0.8 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 0.9 } }
    case 'wipe':
      return { initial: { clipPath: 'inset(0 100% 0 0)' }, animate: { clipPath: 'inset(0 0% 0 0)' }, exit: { opacity: 0 } }
    default:
      return { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
  }
}

/* ─── component ─── */

export default function TemplatePreview({
  definition,
  themeId,
  durationSeconds,
  placeholderValues,
  localMediaUrls,
}: TemplatePreviewProps) {
  const [playing, setPlaying] = useState(true)
  const [t, setT] = useState(0)
  const [containerW, setContainerW] = useState(420)
  const frameRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(performance.now())

  /* responsive scale via ResizeObserver */
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setContainerW(entry.contentRect.width)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale = containerW / definition.width

  /* theme */
  const theme = useMemo(() => definition.themes?.[themeId] ?? {}, [definition.themes, themeId])
  const themeColors = useMemo(() => theme.colors ?? {}, [theme])
  const themeFonts = useMemo(() => theme.fonts ?? {}, [theme])

  /* resolved placeholders */
  const resolvedPlaceholders = useMemo(() => {
    const out: Record<string, string> = {}
    for (const [pid, ph] of Object.entries(definition.placeholders ?? {})) {
      if (ph.type === 'text') out[pid] = placeholderValues[pid] ?? ph.default ?? ''
      else out[pid] = placeholderValues[pid] ?? ''
    }
    return out
  }, [definition.placeholders, placeholderValues])

  const resolver = useCallback(
    (v: any) =>
      resolveToken(v, { themeColors, themeFonts, placeholderValues: resolvedPlaceholders, durationSeconds }),
    [themeColors, themeFonts, resolvedPlaceholders, durationSeconds],
  )

  /* resolved layers with original $placeholder tokens preserved */
  const resolvedLayers = useMemo(() => {
    const base = Array.isArray(definition.layers) ? definition.layers : []
    return [...base]
      .map((layer) => {
        const sourceToken = (layer as any)?.source
        const resolved = resolveObj(layer, resolver) as any
        resolved.__sourceToken = sourceToken
        return resolved as TemplateLayerV1
      })
      .sort((a, b) => Number(a.z ?? 0) - Number(b.z ?? 0))
  }, [definition.layers, resolver])

  /* playhead RAF loop */
  useEffect(() => {
    if (!playing) return
    startRef.current = performance.now() - t * 1000
    const tick = (now: number) => {
      const elapsed = (now - startRef.current) / 1000
      setT(elapsed % durationSeconds)
      rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, durationSeconds])

  /* bg */
  const bgColor = useMemo(() => {
    const solid = resolvedLayers.find((l) => l.type === 'solid')
    return (solid as any)?.style?.color ?? '#000'
  }, [resolvedLayers])

  const getMediaUrl = (key: string) => localMediaUrls?.[key] ?? placeholderValues[key] ?? ''

  /* ─── render individual layer ─── */
  const renderLayer = (layer: TemplateLayerV1) => {
    const tr: any = layer.transform ?? {}
    const st: any = layer.style ?? {}

    const leftPct = (Number(tr.x ?? 0) / definition.width) * 100
    const topPct = (Number(tr.y ?? 0) / definition.height) * 100

    const base: React.CSSProperties = {
      position: 'absolute',
      left: `${leftPct}%`,
      top: `${topPct}%`,
      opacity: tr.opacity != null ? Number(tr.opacity) : undefined,
    }

    const anim = Array.isArray(layer.animations) ? layer.animations[0] : undefined
    const m = motionVariants(anim?.type)
    const transition = { duration: clamp(Number(anim?.duration ?? 0.35), 0.05, 2), ease: 'easeOut' as const }

    /* video layer */
    if (layer.type === 'video') {
      const sourceToken = (layer as any).__sourceToken
      const phKey = typeof sourceToken === 'string' && sourceToken.startsWith('$placeholder.')
        ? sourceToken.slice(13)
        : ''
      const url = phKey ? getMediaUrl(phKey) : (typeof layer.source === 'string' ? layer.source : '')
      return (
        <motion.div key={layer.id} style={{ ...base, left: 0, top: 0, width: '100%', height: '100%' }} {...m} transition={transition}>
          {url ? (
            <video src={url} className="w-full h-full object-cover" muted playsInline autoPlay loop />
          ) : (
            <div className="w-full h-full bg-gradient-to-b from-black/10 to-black/30 flex flex-col items-center justify-center gap-2 text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
              <span className="text-xs font-medium">Add video clip</span>
            </div>
          )}
        </motion.div>
      )
    }

    /* image / logo */
    if (layer.type === 'image') {
      const sourceToken = (layer as any).__sourceToken
      const phKey = typeof sourceToken === 'string' && sourceToken.startsWith('$placeholder.')
        ? sourceToken.slice(13)
        : ''
      const url = phKey ? getMediaUrl(phKey) : (typeof layer.source === 'string' ? layer.source : '')
      const wPx = tr.w ? Number(tr.w) * scale : 120 * scale
      const hPx = tr.h ? Number(tr.h) * scale : 120 * scale
      return (
        <motion.div key={layer.id} style={{ ...base, width: wPx, height: hPx }} {...m} transition={transition}>
          {url ? (
            <img src={url} className="w-full h-full object-contain" alt="" />
          ) : (
            <div className="w-full h-full rounded-xl bg-white/10 border border-dashed border-white/30 flex items-center justify-center text-white/40 text-xs">Logo</div>
          )}
        </motion.div>
      )
    }

    /* text layer */
    if (layer.type === 'text') {
      const bg = st.background
      const stroke = st.stroke
      const textVal = typeof (layer as any).text === 'string' ? (layer as any).text : ''
      const style: React.CSSProperties = {
        ...base,
        fontFamily: `${st.fontFamily || 'Inter'}, sans-serif`,
        fontSize: Math.round(Number(st.fontSize ?? 48) * scale),
        fontWeight: Number(st.fontWeight ?? 700),
        color: st.color,
        lineHeight: 1.1,
        padding: bg ? `${Math.round(Number(bg.paddingY ?? 0) * scale)}px ${Math.round(Number(bg.paddingX ?? 0) * scale)}px` : undefined,
        background: bg?.color,
        borderRadius: bg?.radius ? Math.round(Number(bg.radius) * scale) : undefined,
        whiteSpace: 'pre-wrap',
        maxWidth: '90%',
        textShadow: stroke ? `0 0 ${Number(stroke.width ?? 4) * scale}px ${stroke.color ?? 'rgba(0,0,0,0.5)'}` : undefined,
      }
      return (
        <motion.div key={layer.id} style={style} {...m} transition={transition}>
          {textVal}
        </motion.div>
      )
    }

    return null
  }

  /* scrub handler */
  const onScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const newT = pct * durationSeconds
    setT(newT)
    startRef.current = performance.now() - newT * 1000
  }

  return (
    <div className="space-y-3">
      {/* controls row */}
      <div className="flex items-center gap-3">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
          onClick={() => setPlaying((p) => !p)}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" rx="1" /><rect x="14" y="4" width="4" height="16" rx="1" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21" /></svg>
          )}
        </button>

        {/* timeline scrubber */}
        <div className="flex-1 h-2 bg-gray-200 rounded-full cursor-pointer relative group" onClick={onScrub}>
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full transition-[width] duration-75"
            style={{ width: `${(t / durationSeconds) * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white border-2 border-primary-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `${(t / durationSeconds) * 100}%`, transform: 'translate(-50%, -50%)' }}
          />
        </div>

        <span className="text-xs tabular-nums text-gray-500 min-w-[3rem] text-right">{t.toFixed(1)}s / {durationSeconds}s</span>
      </div>

      {/* canvas */}
      <div ref={frameRef} className="w-full max-w-[420px] mx-auto">
        <div
          className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-gray-200 shadow-lg"
          style={{ background: bgColor }}
        >
          <AnimatePresence mode="sync">
            {resolvedLayers
              .filter((l) => l.type !== 'solid')
              .filter((l) => layerVisible(l, t, durationSeconds))
              .map((l) => renderLayer(l))}
          </AnimatePresence>

          {/* Instagram-style gradient overlay */}
          <div className="absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t from-black/30 to-transparent pointer-events-none" />
        </div>
      </div>
    </div>
  )
}
