import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router-dom'
import TemplatePreview from '../../components/templates/TemplatePreview'
import type { TemplateDefinitionV1 } from '../../components/templates/types'
import { templateApi } from '../../services/api'

function firstKey(obj: Record<string, any> | undefined) {
  if (!obj) return ''
  const keys = Object.keys(obj)
  return keys[0] ?? ''
}

export default function TemplateEditorPage() {
  const { id } = useParams()
  const templateId = id || ''

  const [themeId, setThemeId] = useState('')
  const [durationSeconds, setDurationSeconds] = useState(0)
  const [placeholderValues, setPlaceholderValues] = useState<Record<string, string>>({})
  const [localMediaUrls, setLocalMediaUrls] = useState<Record<string, string>>({})
  const [renderJobId, setRenderJobId] = useState<string | null>(null)

  const templateQuery = useQuery({
    queryKey: ['template', templateId],
    queryFn: () => templateApi.get(templateId),
    enabled: Boolean(templateId),
  })

  const definitionQuery = useQuery({
    queryKey: ['template-definition', templateId],
    queryFn: () => templateApi.definition(templateId),
    enabled: Boolean(templateId),
  })

  const definition: TemplateDefinitionV1 | null = (definitionQuery.data?.data?.template_data as any) ?? null

  // Initialize defaults once definition arrives
  useEffect(() => {
    if (!definition) return
    setThemeId((prev) => prev || firstKey(definition.themes))
    setDurationSeconds((prev) => prev || (definition.durationPresets?.[0] ?? 15))

    setPlaceholderValues((prev) => {
      const next = { ...prev }
      for (const [pid, ph] of Object.entries(definition.placeholders ?? {})) {
        if (ph.type === 'text' && next[pid] == null) next[pid] = ph.default ?? ''
      }
      return next
    })
  }, [definition])

  const uploadMutation = useMutation({
    mutationFn: (file: File) => templateApi.uploadAsset(file),
  })

  const useMutationCreate = useMutation({
    mutationFn: (payload: { title: string; customizations: Record<string, any> }) =>
      templateApi.use(templateId, { template_id: templateId, ...payload }),
  })

  const renderMutation = useMutation({
    mutationFn: (userTemplateId: string) =>
      templateApi.render({ user_template_id: userTemplateId, output_format: 'mp4', quality: 'high', watermark: false }),
  })

  const renderStatusQuery = useQuery({
    queryKey: ['template-render-status', renderJobId],
    queryFn: () => templateApi.renderStatus(renderJobId!),
    enabled: Boolean(renderJobId),
    refetchInterval: (data) => {
      const status = (data as any)?.data?.status
      if (status === 'completed' || status === 'failed') return false
      return 1500
    },
  })

  const isLoading = templateQuery.isLoading || definitionQuery.isLoading
  const error = templateQuery.error || definitionQuery.error

  const placeholders = useMemo(() => {
    if (!definition) return []
    return Object.entries(definition.placeholders ?? {})
  }, [definition])

  const onPickFile = async (placeholderId: string, file: File) => {
    const objectUrl = URL.createObjectURL(file)
    setLocalMediaUrls((m) => ({ ...m, [placeholderId]: objectUrl }))

    const res = await uploadMutation.mutateAsync(file)
    const url = (res as any)?.data?.url
    if (url) setPlaceholderValues((p) => ({ ...p, [placeholderId]: url }))
  }

  const onRender = async () => {
    if (!definition) return

    const title = templateQuery.data?.data?.name ? `${templateQuery.data.data.name} (Custom)` : 'My Template'

    const customizations: Record<string, any> = {
      ...placeholderValues,
      theme_id: themeId,
      duration_seconds: durationSeconds,
    }

    const created = await useMutationCreate.mutateAsync({ title, customizations })
    const userTemplateId = (created as any)?.data?.id
    if (!userTemplateId) return

    const render = await renderMutation.mutateAsync(userTemplateId)
    setRenderJobId((render as any)?.data?.user_template_id ?? userTemplateId)
  }

  const outputUrl = (renderStatusQuery.data as any)?.data?.output_url
  const renderStatus = (renderStatusQuery.data as any)?.data?.status
  const renderError = (renderStatusQuery.data as any)?.data?.error_message

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Template Editor</h1>
        <p className="text-gray-600 mt-1">Preview and customize your reel template</p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto" />
          <p className="text-gray-500 mt-4">Loading template...</p>
        </div>
      ) : error || !definition ? (
        <div className="p-4 bg-white rounded-xl border border-red-200 text-red-600">
          Failed to load template definition.
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_420px] gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <TemplatePreview
              definition={definition}
              themeId={themeId}
              durationSeconds={durationSeconds}
              placeholderValues={placeholderValues}
              localMediaUrls={localMediaUrls}
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
                <select
                  className="input-field"
                  value={themeId}
                  onChange={(e) => setThemeId(e.target.value)}
                >
                  {Object.entries(definition.themes ?? {}).map(([tid, t]) => (
                    <option key={tid} value={tid}>
                      {t.name ?? tid}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration</label>
                <select
                  className="input-field"
                  value={durationSeconds}
                  onChange={(e) => setDurationSeconds(Number(e.target.value))}
                >
                  {(definition.durationPresets ?? [15]).map((d) => (
                    <option key={d} value={d}>
                      {d}s
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-gray-900">Placeholders</h2>

              {placeholders.map(([pid, ph]) => {
                if (ph.type === 'text') {
                  return (
                    <div key={pid}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{ph.label ?? pid}</label>
                      <input
                        className="input-field"
                        value={placeholderValues[pid] ?? ph.default ?? ''}
                        maxLength={ph.maxLength}
                        onChange={(e) => setPlaceholderValues((p) => ({ ...p, [pid]: e.target.value }))}
                      />
                    </div>
                  )
                }

                if (ph.type === 'video' || ph.type === 'logo' || ph.type === 'image') {
                  const accept = ph.type === 'video' ? 'video/mp4,video/quicktime' : 'image/png,image/jpeg,image/webp'
                  const current = placeholderValues[pid]
                  return (
                    <div key={pid} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-medium text-gray-700">{ph.label ?? pid}</label>
                        {current ? (
                          <a className="text-xs text-primary-600 hover:underline" href={current} target="_blank" rel="noreferrer">
                            asset url
                          </a>
                        ) : null}
                      </div>
                      <input
                        type="file"
                        accept={accept}
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) onPickFile(pid, file)
                        }}
                      />
                      <input
                        className="input-field"
                        placeholder="...or paste a URL"
                        value={placeholderValues[pid] ?? ''}
                        onChange={(e) => setPlaceholderValues((p) => ({ ...p, [pid]: e.target.value }))}
                      />
                    </div>
                  )
                }

                return null
              })}
            </div>

            <div className="pt-2 space-y-2">
              <button
                className="btn-primary w-full"
                onClick={onRender}
                disabled={useMutationCreate.isPending || renderMutation.isPending}
              >
                {renderMutation.isPending ? 'Starting render…' : 'Render MP4'}
              </button>

              {renderJobId && (
                <div className="text-sm text-gray-600">
                  Status: <span className="font-medium text-gray-900">{renderStatus ?? 'rendering'}</span>
                </div>
              )}
              {renderError && <div className="text-sm text-red-600">{renderError}</div>}
              {outputUrl && (
                <a className="btn-secondary w-full block text-center" href={outputUrl} target="_blank" rel="noreferrer">
                  Download output
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
