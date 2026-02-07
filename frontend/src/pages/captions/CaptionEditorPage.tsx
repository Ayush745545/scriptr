import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { captionApi } from '../../services/api'

export default function CaptionEditorPage() {
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [downloadFormat, setDownloadFormat] = useState('srt')
  const [burnStyle, setBurnStyle] = useState('minimal_chic')
  const [karaoke, setKaraoke] = useState(true)

  const { data: styles } = useQuery({
    queryKey: ['caption-styles'],
    queryFn: captionApi.getStyles,
  })

  // Poll for status
  const { data: caption, isLoading, error } = useQuery({
    queryKey: ['caption', id],
    queryFn: () => captionApi.get(id!),
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status
      return status === 'completed' || status === 'failed' ? false : 2000
    },
    enabled: !!id,
  })

  const exportMutation = useMutation({
    mutationFn: (format: 'srt' | 'txt') =>

      captionApi.export(id!, { format }),
    onSuccess: (response) => {
      window.open(response.data.download_url, '_blank')
      toast.success(`Downloaded ${downloadFormat.toUpperCase()}`)
    },
    onError: () => toast.error('Export failed')
  })

  const burnMutation = useMutation({
    mutationFn: () => captionApi.burn(id!, { style_preset_id: burnStyle, karaoke }),
    onSuccess: (response) => {
      const url = (response.data as any)?.download_url
      if (url) {
        window.open(url, '_blank')
      }
      toast.success('Burned captions video ready')
      queryClient.invalidateQueries({ queryKey: ['caption', id] })
    },
    onError: () => toast.error('Burn-in failed')
  })

  // Safe access to data
  const captionData = caption?.data

  if (isLoading) return <div className="p-12 text-center">Loading...</div>
  if (error || !captionData) return <div className="p-12 text-center text-red-500">Error loading caption</div>

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <Link to="/captions" className="text-gray-500 hover:text-black mb-2 inline-block">← Back to Upload</Link>
          <h1 className="text-2xl font-bold">{captionData.title}</h1>
          <p className="text-gray-500 text-sm">Status: <span className={`uppercase font-bold ${captionData.status === 'completed' ? 'text-green-600' : 'text-orange-500'}`}>{captionData.status}</span></p>
        </div>

        {captionData.status === 'completed' && (
          <div className="flex gap-2">
            <select
              value={downloadFormat}
              onChange={(e) => setDownloadFormat(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="srt">SRT (Subtitles)</option>
              <option value="txt">Text Only</option>
            </select>
            <button
              onClick={() => exportMutation.mutate(downloadFormat as any)}
              className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800"
            >
              Download
            </button>
          </div>
        )}
      </div>

      {captionData.status === 'completed' && (
        <div className="bg-white border rounded-xl p-4 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="font-semibold">Burn captions into video</p>
            <p className="text-sm text-gray-500">Reels-style karaoke highlighting uses word timestamps.</p>
            {captionData.exported_formats?.burned_mp4 && (
              <a
                className="text-sm text-blue-600 hover:underline"
                href={captionData.exported_formats.burned_mp4}
                target="_blank"
                rel="noreferrer"
              >
                Download burned video
              </a>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
            <select
              value={burnStyle}
              onChange={(e) => setBurnStyle(e.target.value)}
              className="border rounded px-3 py-2"
            >
              {Object.values(styles?.data?.styles || {}).map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={karaoke} onChange={(e) => setKaraoke(e.target.checked)} />
              Karaoke
            </label>
            <button
              onClick={() => burnMutation.mutate()}
              disabled={burnMutation.isPending}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-60"
            >
              {burnMutation.isPending ? 'Rendering…' : 'Burn & Download'}
            </button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Video/Preview Area */}
        <div className="bg-black rounded-xl aspect-video flex items-center justify-center relative overflow-hidden">
          {/* Logic to show video if we had a streaming endpoint, for now generic player or placeholder */}
          <p className="text-white opacity-50">Video Preview</p>

          {/* Overlay simulation */}
          {captionData.status === 'completed' && (
            <div className="absolute bottom-8 text-center w-full px-4">
              <p className="text-white text-2xl font-bold font-sans drop-shadow-md bg-black/50 inline-block px-2">
                {captionData.segments?.[0]?.text || "Caption preview..."}
              </p>
            </div>
          )}
        </div>

        {/* Transcript / Segments */}
        <div className="bg-white rounded-xl shadow p-6 h-[500px] overflow-y-auto">
          <h3 className="font-bold mb-4">Transcription</h3>
          {captionData.status === 'processing' && (
            <div className="flex flex-col items-center justify-center h-40 space-y-4">
              <div className="animate-spin text-4xl">⏳</div>
              <p>AI is transcribing your audio...</p>
              <p className="text-xs text-gray-500">This usually takes about 20% of video duration.</p>
            </div>
          )}

          {captionData.status === 'completed' && captionData.segments ? (
            <div className="space-y-4">
              {captionData.segments.map((seg: any) => (
                <div key={seg.segment_index} className="flex gap-4 p-3 hover:bg-gray-50 rounded group cursor-pointer border-b border-gray-100">
                  <span className="text-xs text-mono text-gray-400 mt-1 w-12 shrink-0">
                    {new Date(seg.start_time * 1000).toISOString().substr(14, 5)}
                  </span>
                  <div>
                    <p className="text-gray-800">{seg.text}</p>
                    {seg.text_english && (
                      <p className="text-sm text-indigo-600 mt-1">{seg.text_english}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
