import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

export interface StemJob {
  job_id: string
  status: 'queued' | 'processing' | 'done' | 'error'
  progress: number
  error: string | null
  filename: string
  status_detail?: string
  stems: Record<string, string>
}

export interface WaveformData {
  peaks: number[]
  duration: number
  sampleRate: number
  channels: number
}

export const apiClient = {
  health: () => api.get('/health/'),
  splitStems: (file: File, onUploadProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('audio', file)
    return api.post<{ job_id: string; status: string }>('/split/', form, {
      onUploadProgress: (e) => {
        if (onUploadProgress && e.total) onUploadProgress(Math.round(e.loaded / e.total * 100))
      }
    })
  },
  getStemStatus: (jobId: string) => api.get<StemJob>(`/split/status/${jobId}/`),
  getWaveform: (file: File) => {
    const form = new FormData()
    form.append('audio', file)
    return api.post<WaveformData>('/waveform/', form)
  },
}

export function pollJob(jobId: string, onProgress: (job: StemJob) => void): () => void {
  let cancelled = false
  const poll = async () => {
    while (!cancelled) {
      try {
        const { data } = await apiClient.getStemStatus(jobId)
        onProgress(data)
        if (data.status === 'done' || data.status === 'error') break
      } catch (e) {
        console.error('Poll error', e)
        break
      }
      await new Promise(r => setTimeout(r, 800))
    }
  }
  poll()
  return () => { cancelled = true }
}
