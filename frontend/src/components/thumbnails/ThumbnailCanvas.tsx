/**
 * ThumbnailCanvas — Fabric.js-based interactive canvas editor
 *
 * Features:
 * - Drag/resize/rotate layers (images, text, emojis)
 * - Live preview at correct aspect ratio
 * - Export canvas state as JSON for server-side render
 * - Text editing with Hindi/English font support
 * - Background image or AI-generated background
 */

import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import * as fabric from 'fabric'

// ── Types ────────────────────────────────────────────────────────────────────

export interface CanvasLayer {
  type: 'image' | 'text' | 'emoji'
  src?: string
  text?: string
  emoji?: string
  x: number
  y: number
  width?: number
  height?: number
  fontSize?: number
  fontFamily?: string
  fill?: string
  stroke?: string
  strokeWidth?: number
  size?: number
  opacity?: number
}

export interface CanvasState {
  width: number
  height: number
  backgroundColor: string
  layers: CanvasLayer[]
}

interface ThumbnailCanvasProps {
  width: number
  height: number
  backgroundColor: string
  onSelectionChange?: (obj: fabric.FabricObject | null) => void
}

export interface ThumbnailCanvasHandle {
  addImage: (url: string) => Promise<void>
  addText: (text: string, options?: Partial<fabric.TextboxProps>) => void
  addEmoji: (emoji: string, x?: number, y?: number, size?: number) => void
  setBackgroundColor: (color: string) => void
  setBackgroundImage: (url: string) => Promise<void>
  deleteSelected: () => void
  bringForward: () => void
  sendBackward: () => void
  getCanvasState: () => CanvasState
  updateSelectedText: (props: {
    text?: string
    fontFamily?: string
    fontSize?: number
    fill?: string
    stroke?: string
    strokeWidth?: number
  }) => void
  toDataURL: () => string
  clear: () => void
}

// ── Component ────────────────────────────────────────────────────────────────

const ThumbnailCanvas = forwardRef<ThumbnailCanvasHandle, ThumbnailCanvasProps>(
  ({ width, height, backgroundColor, onSelectionChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const fabricRef = useRef<fabric.Canvas | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)

    // Calculate display scale to fit container
    useEffect(() => {
      const updateScale = () => {
        if (!containerRef.current) return
        const containerW = containerRef.current.clientWidth
        const s = Math.min(containerW / width, 1)
        setScale(s)
      }
      updateScale()
      window.addEventListener('resize', updateScale)
      return () => window.removeEventListener('resize', updateScale)
    }, [width])

    // Init fabric canvas
    useEffect(() => {
      if (!canvasRef.current) return

      const canvas = new fabric.Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor,
        preserveObjectStacking: true,
        selection: true,
      })

      fabricRef.current = canvas

      canvas.on('selection:created', (e) => {
        onSelectionChange?.(e.selected?.[0] ?? null)
      })
      canvas.on('selection:updated', (e) => {
        onSelectionChange?.(e.selected?.[0] ?? null)
      })
      canvas.on('selection:cleared', () => {
        onSelectionChange?.(null)
      })

      return () => {
        canvas.dispose()
        fabricRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [width, height])

    // Update bg colour reactively
    useEffect(() => {
      const c = fabricRef.current
      if (!c) return
      c.backgroundColor = backgroundColor
      c.renderAll()
    }, [backgroundColor])

    // ── Imperative API ───────────────────────────────────────────────

    useImperativeHandle(
      ref,
      () => ({
        addImage: async (url: string) => {
          const c = fabricRef.current
          if (!c) return
          const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
          // Scale to fit canvas
          const maxW = width * 0.8
          const maxH = height * 0.8
          const s = Math.min(maxW / (img.width ?? 1), maxH / (img.height ?? 1), 1)
          img.scale(s)
          img.set({ left: 20, top: 20 })
          c.add(img)
          c.setActiveObject(img)
          c.renderAll()
        },

        addText: (text: string, options?: Partial<fabric.TextboxProps>) => {
          const c = fabricRef.current
          if (!c) return
          const tb = new fabric.Textbox(text, {
            left: 40,
            top: height / 2 - 40,
            width: width * 0.6,
            fontSize: 72,
            fontFamily: 'Poppins, Noto Sans Devanagari, sans-serif',
            fill: '#FFFFFF',
            stroke: '#000000',
            strokeWidth: 3,
            paintFirst: 'stroke',
            textAlign: 'left',
            fontWeight: 'bold',
            shadow: new fabric.Shadow({ color: '#000000', blur: 6, offsetX: 3, offsetY: 3 }),
            ...options,
          })
          c.add(tb)
          c.setActiveObject(tb)
          c.renderAll()
        },

        addEmoji: (emoji: string, x = 0.8, y = 0.1, size = 80) => {
          const c = fabricRef.current
          if (!c) return
          const tb = new fabric.Textbox(emoji, {
            left: x * width,
            top: y * height,
            fontSize: size,
            fontFamily: 'Apple Color Emoji, Noto Color Emoji, sans-serif',
            editable: false,
          })
          // Tag for export
          ;(tb as any).__layerType = 'emoji'
          ;(tb as any).__emoji = emoji
          c.add(tb)
          c.setActiveObject(tb)
          c.renderAll()
        },

        setBackgroundColor: (color: string) => {
          const c = fabricRef.current
          if (!c) return
          c.backgroundColor = color
          c.renderAll()
        },

        setBackgroundImage: async (url: string) => {
          const c = fabricRef.current
          if (!c) return
          const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
          // Cover-fit
          const sw = width / (img.width ?? 1)
          const sh = height / (img.height ?? 1)
          const s = Math.max(sw, sh)
          img.scale(s)
          img.set({
            left: (width - (img.width ?? 0) * s) / 2,
            top: (height - (img.height ?? 0) * s) / 2,
            selectable: false,
            evented: false,
          })
          ;(img as any).__isBackground = true
          // Remove existing bg image
          const objs = c.getObjects()
          for (const o of objs) {
            if ((o as any).__isBackground) c.remove(o)
          }
          c.insertAt(0, img)
          c.renderAll()
        },

        deleteSelected: () => {
          const c = fabricRef.current
          if (!c) return
          const active = c.getActiveObject()
          if (active) {
            c.remove(active)
            c.discardActiveObject()
            c.renderAll()
          }
        },

        bringForward: () => {
          const c = fabricRef.current
          if (!c) return
          const active = c.getActiveObject()
          if (active) {
            c.bringObjectForward(active)
            c.renderAll()
          }
        },

        sendBackward: () => {
          const c = fabricRef.current
          if (!c) return
          const active = c.getActiveObject()
          if (active) {
            c.sendObjectBackwards(active)
            c.renderAll()
          }
        },

        updateSelectedText: (props) => {
          const c = fabricRef.current
          if (!c) return
          const active = c.getActiveObject()
          if (!active || !(active instanceof fabric.Textbox)) return
          if (props.text !== undefined) active.set('text', props.text)
          if (props.fontFamily) active.set('fontFamily', props.fontFamily)
          if (props.fontSize) active.set('fontSize', props.fontSize)
          if (props.fill) active.set('fill', props.fill)
          if (props.stroke) active.set('stroke', props.stroke)
          if (props.strokeWidth !== undefined) active.set('strokeWidth', props.strokeWidth)
          c.renderAll()
        },

        getCanvasState: (): CanvasState => {
          const c = fabricRef.current
          if (!c) return { width, height, backgroundColor, layers: [] }

          const layers: CanvasLayer[] = []
          for (const obj of c.getObjects()) {
            if ((obj as any).__isBackground) {
              // Background image layer
              if (obj instanceof fabric.FabricImage) {
                const src = (obj as any)._element?.src || (obj as any).getSrc?.() || ''
                layers.push({
                  type: 'image',
                  src,
                  x: obj.left ?? 0,
                  y: obj.top ?? 0,
                  width: (obj.width ?? 0) * (obj.scaleX ?? 1),
                  height: (obj.height ?? 0) * (obj.scaleY ?? 1),
                  opacity: obj.opacity ?? 1,
                })
              }
              continue
            }

            if ((obj as any).__layerType === 'emoji') {
              layers.push({
                type: 'emoji',
                emoji: (obj as any).__emoji || (obj as fabric.Textbox).text || '',
                x: obj.left ?? 0,
                y: obj.top ?? 0,
                size: (obj as fabric.Textbox).fontSize ?? 64,
              })
            } else if (obj instanceof fabric.Textbox) {
              layers.push({
                type: 'text',
                text: obj.text ?? '',
                x: obj.left ?? 0,
                y: obj.top ?? 0,
                fontSize: obj.fontSize ?? 48,
                fontFamily: obj.fontFamily ?? 'Poppins',
                fill: (obj.fill as string) ?? '#FFFFFF',
                stroke: (obj.stroke as string) ?? '#000000',
                strokeWidth: obj.strokeWidth ?? 3,
              })
            } else if (obj instanceof fabric.FabricImage) {
              const src = (obj as any)._element?.src || (obj as any).getSrc?.() || ''
              layers.push({
                type: 'image',
                src,
                x: obj.left ?? 0,
                y: obj.top ?? 0,
                width: (obj.width ?? 0) * (obj.scaleX ?? 1),
                height: (obj.height ?? 0) * (obj.scaleY ?? 1),
                opacity: obj.opacity ?? 1,
              })
            }
          }

          return {
            width,
            height,
            backgroundColor: (c.backgroundColor as string) || backgroundColor,
            layers,
          }
        },

        toDataURL: (): string => {
          const c = fabricRef.current
          if (!c) return ''
          return c.toDataURL({ format: 'png', multiplier: 1 })
        },

        clear: () => {
          const c = fabricRef.current
          if (!c) return
          c.clear()
          c.backgroundColor = backgroundColor
          c.renderAll()
        },
      }),
      [width, height, backgroundColor]
    )

    return (
      <div ref={containerRef} className="w-full">
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            width: width,
            height: height,
          }}
        >
          <canvas ref={canvasRef} />
        </div>
        {/* Spacer for scaled height */}
        <div style={{ height: height * scale - height * (scale < 1 ? 1 : 0) }} />
      </div>
    )
  }
)

ThumbnailCanvas.displayName = 'ThumbnailCanvas'
export default ThumbnailCanvas
