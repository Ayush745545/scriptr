/**
 * FontPicker — Dropdown for selecting from 10 Indian-popular fonts
 *
 * Shows font name, script badge (Hindi / English / Both), and weight.
 * Fetches availability from backend.
 */

import { useQuery } from '@tanstack/react-query'
import { thumbnailApi, FontInfo } from '../../services/api'

interface FontPickerProps {
  value: string
  onChange: (fontId: string, fontFamily: string) => void
  scriptFilter?: string
}

const SCRIPT_BADGES: Record<string, { label: string; color: string }> = {
  devanagari: { label: 'हिंदी', color: 'bg-orange-100 text-orange-700' },
  latin: { label: 'ENG', color: 'bg-blue-100 text-blue-700' },
  both: { label: 'Both', color: 'bg-purple-100 text-purple-700' },
}

// Fallback if API is down
const FALLBACK_FONTS: FontInfo[] = [
  { id: 'poppins-extrabold', name: 'Poppins ExtraBold', family: 'Poppins', script: 'latin', style: 'extrabold', weight: 800, preview_text: 'BOLD TEXT', available: true },
  { id: 'noto-sans-devanagari-bold', name: 'Noto Sans Devanagari Bold', family: 'Noto Sans Devanagari', script: 'devanagari', style: 'bold', weight: 700, preview_text: 'हिंदी टेक्स्ट', available: true },
  { id: 'mukta-bold', name: 'Mukta Bold', family: 'Mukta', script: 'both', style: 'bold', weight: 700, preview_text: 'Mukta बोल्ड', available: true },
  { id: 'bebas-neue', name: 'Bebas Neue', family: 'Bebas Neue', script: 'latin', style: 'regular', weight: 400, preview_text: 'BEBAS NEUE', available: true },
  { id: 'montserrat-extrabold', name: 'Montserrat ExtraBold', family: 'Montserrat', script: 'latin', style: 'extrabold', weight: 800, preview_text: 'MONTSERRAT', available: true },
  { id: 'poppins-black', name: 'Poppins Black', family: 'Poppins', script: 'latin', style: 'bold', weight: 900, preview_text: 'IMPACT TEXT', available: true },
  { id: 'oswald-bold', name: 'Oswald Bold', family: 'Oswald', script: 'latin', style: 'bold', weight: 700, preview_text: 'OSWALD BOLD', available: true },
  { id: 'baloo2-extrabold', name: 'Baloo 2 ExtraBold', family: 'Baloo 2', script: 'both', style: 'extrabold', weight: 800, preview_text: 'Baloo बालू', available: true },
  { id: 'tiro-devanagari-hindi', name: 'Tiro Devanagari Hindi', family: 'Tiro Devanagari Hindi', script: 'devanagari', style: 'regular', weight: 400, preview_text: 'शीर्षक यहाँ', available: true },
  { id: 'noto-sans-devanagari-regular', name: 'Noto Sans Devanagari Regular', family: 'Noto Sans Devanagari', script: 'devanagari', style: 'regular', weight: 400, preview_text: 'हिंदी टेक्स्ट', available: true },
]

export default function FontPicker({ value, onChange, scriptFilter }: FontPickerProps) {
  const { data } = useQuery({
    queryKey: ['fonts', scriptFilter],
    queryFn: () => thumbnailApi.fonts(scriptFilter),
    staleTime: 10 * 60 * 1000,
  })

  const fonts: FontInfo[] = data?.data || FALLBACK_FONTS

  return (
    <div className="space-y-1">
      <label className="block text-xs font-medium text-gray-500">Font</label>
      <select
        value={value}
        onChange={(e) => {
          const f = fonts.find((f) => f.id === e.target.value)
          onChange(e.target.value, f?.family || 'Poppins')
        }}
        className="input-field text-sm"
      >
        {fonts.map((font) => {
          const badge = SCRIPT_BADGES[font.script]
          return (
            <option key={font.id} value={font.id}>
              {font.name} {badge ? `[${badge.label}]` : ''} {!font.available ? '(download needed)' : ''}
            </option>
          )
        })}
      </select>

      {/* Preview of selected font */}
      {(() => {
        const selected = fonts.find((f) => f.id === value)
        if (!selected) return null
        const badge = SCRIPT_BADGES[selected.script]
        return (
          <div className="flex items-center gap-2 mt-1.5">
            {badge && (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.color}`}>
                {badge.label}
              </span>
            )}
            <span className="text-xs text-gray-400">
              {selected.style} · {selected.weight}
            </span>
          </div>
        )
      })()}
    </div>
  )
}
