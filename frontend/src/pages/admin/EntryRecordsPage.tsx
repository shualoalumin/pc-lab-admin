import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { EntryRecord } from '@/types/database'
import { CheckCircle, Clock } from 'lucide-react'

export function EntryRecordsPage() {
  const [entries, setEntries] = useState<EntryRecord[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEntries()

    const channel = supabase
      .channel('entry-records')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_records' }, () => {
        loadEntries()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('entry_records')
      .select('*')
      .order('entry_time', { ascending: false })
    if (data) setEntries(data)
    setLoading(false)
  }

  async function handleApprove(entry: EntryRecord) {
    await supabase.from('entry_records').update({ status: 'USING', needs_approval: false }).eq('id', entry.id)
    await supabase
      .from('pc_seats')
      .update({ status: 'ACTIVE', current_entry_id: entry.id, current_student_name: entry.student_name })
      .eq('pc_number', entry.pc_number)
  }

  async function handleReject(entryId: string) {
    await supabase.from('entry_records').update({ status: 'BLOCKED', needs_approval: false }).eq('id', entryId)
  }

  async function handleFinish(entry: EntryRecord) {
    await supabase.from('entry_records').update({ status: 'FINISHED' }).eq('id', entry.id)
    await supabase
      .from('pc_seats')
      .update({ status: 'SESSION_END', current_entry_id: null, current_student_name: null })
      .eq('pc_number', entry.pc_number)
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  const waiting = entries.filter((e) => e.status === 'WAITING')
  const active = entries.filter((e) => e.status === 'USING')
  const others = entries.filter((e) => e.status !== 'WAITING' && e.status !== 'USING')

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">출입 기록</h1>

      {waiting.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-warning">
            <Clock className="h-5 w-5" />
            승인 대기 ({waiting.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {waiting.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                <div className="mb-3">
                  <p className="font-semibold text-foreground">{entry.student_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.grade}학년 {entry.class_number}반 · PC{String(entry.pc_number).padStart(2, '0')}
                  </p>
                  <p className="text-sm text-muted-foreground">목적: {entry.purpose}</p>
                </div>
                {entry.needs_approval && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(entry)}
                      className="flex-1 rounded-lg bg-success px-3 py-2 text-sm font-medium text-success-foreground hover:bg-success/90"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleReject(entry.id)}
                      className="flex-1 rounded-lg bg-destructive px-3 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
                    >
                      거부
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-success">
            <CheckCircle className="h-5 w-5" />
            사용 중 ({active.length})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {active.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-success/30 bg-success/5 p-4">
                <div className="mb-3">
                  <p className="font-semibold text-foreground">{entry.student_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {entry.grade}학년 {entry.class_number}반 · PC{String(entry.pc_number).padStart(2, '0')}
                  </p>
                  <p className="text-sm text-muted-foreground">목적: {entry.purpose}</p>
                </div>
                <button
                  onClick={() => handleFinish(entry)}
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  사용 종료
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">전체 기록</h2>
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">학생</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">학년/반</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">PC</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">목적</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">입실 시간</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[...waiting, ...active, ...others].map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{entry.student_name}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {entry.grade}-{entry.class_number}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">PC{String(entry.pc_number).padStart(2, '0')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{entry.purpose}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(entry.entry_time).toLocaleString('ko-KR')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={entry.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    WAITING: 'bg-warning/10 text-warning',
    USING: 'bg-success/10 text-success',
    FINISHED: 'bg-muted text-muted-foreground',
    BLOCKED: 'bg-destructive/10 text-destructive',
  }
  const labels: Record<string, string> = {
    WAITING: '대기',
    USING: '사용중',
    FINISHED: '종료',
    BLOCKED: '차단',
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ''}`}>
      {labels[status] ?? status}
    </span>
  )
}
