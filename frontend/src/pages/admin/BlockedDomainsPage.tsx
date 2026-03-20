import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { BlockedDomain } from '@/types/database'
import { Plus, Trash2, ShieldBan, X } from 'lucide-react'

const DEFAULT_DOMAINS = [
  { domain: 'youtube.com', description: '동영상 스트리밍' },
  { domain: 'instagram.com', description: 'SNS' },
  { domain: 'tiktok.com', description: '숏폼 동영상' },
  { domain: 'netflix.com', description: '동영상 스트리밍' },
  { domain: 'facebook.com', description: 'SNS' },
  { domain: 'twitter.com', description: 'SNS' },
  { domain: 'x.com', description: 'SNS' },
  { domain: 'twitch.tv', description: '게임 스트리밍' },
]

export function BlockedDomainsPage() {
  const [domains, setDomains] = useState<BlockedDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    loadDomains()
  }, [])

  async function loadDomains() {
    setLoading(true)
    const { data } = await supabase
      .from('blocked_domains')
      .select('*')
      .order('domain')
    if (data) setDomains(data)
    setLoading(false)
  }

  async function deleteDomain(id: string) {
    if (!confirm('이 도메인을 차단 목록에서 제거하시겠습니까?')) return
    await supabase.from('blocked_domains').delete().eq('id', id)
    setDomains((prev) => prev.filter((d) => d.id !== id))
  }

  async function addDefaults() {
    const existing = new Set(domains.map((d) => d.domain))
    const newDomains = DEFAULT_DOMAINS.filter((d) => !existing.has(d.domain))
    if (newDomains.length === 0) {
      alert('기본 도메인이 이미 모두 등록되어 있습니다.')
      return
    }
    await supabase.from('blocked_domains').insert(newDomains)
    loadDomains()
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">차단 도메인 관리</h1>
        <div className="flex gap-2">
          <button
            onClick={addDefaults}
            className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            기본 도메인 추가
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            도메인 추가
          </button>
        </div>
      </div>

      {domains.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <ShieldBan className="h-12 w-12" />
          <p>등록된 차단 도메인이 없습니다.</p>
          <p className="text-sm">"기본 도메인 추가" 버튼으로 기본 차단 목록을 등록하세요.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              <div>
                <p className="font-medium text-foreground">{d.domain}</p>
                {d.description && (
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                )}
              </div>
              <button
                onClick={() => deleteDomain(d.id)}
                className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showAdd && (
        <AddDomainModal onClose={() => setShowAdd(false)} onAdded={loadDomains} />
      )}
    </div>
  )
}

function AddDomainModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [domain, setDomain] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    await supabase.from('blocked_domains').insert({ domain, description: description || null })
    setSubmitting(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">차단 도메인 추가</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">도메인</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              required
              placeholder="예: youtube.com"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">설명 (선택)</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 동영상 스트리밍"
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent">
              취소
            </button>
            <button type="submit" disabled={submitting} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {submitting ? '추가 중...' : '추가'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
