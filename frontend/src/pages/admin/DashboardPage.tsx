import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { PcSeat, EntryRecord, ViolationEvent } from '@/types/database'
import { Monitor, Users, AlertTriangle, CheckCircle, Unlock, MessageSquareWarning, EyeOff } from 'lucide-react'
import { useRealtimeViolations } from '@/hooks/useRealtimeViolations'

export function DashboardPage() {
  const [pcSeats, setPcSeats] = useState<PcSeat[]>([])
  const [recentEntries, setRecentEntries] = useState<EntryRecord[]>([])
  const [recentViolations, setRecentViolations] = useState<ViolationEvent[]>([])
  const [loading, setLoading] = useState(true)

  useRealtimeViolations(() => {
    loadRecentViolations()
    loadPcSeats()
  })

  useEffect(() => {
    loadDashboardData()

    const pcChannel = supabase
      .channel('dashboard-pc')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pc_seats' }, () => {
        loadPcSeats()
      })
      .subscribe()

    const entryChannel = supabase
      .channel('dashboard-entries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entry_records' }, () => {
        loadRecentEntries()
      })
      .subscribe()

    const violationChannel = supabase
      .channel('dashboard-violations')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'violation_events' }, () => {
        loadRecentViolations()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(pcChannel)
      supabase.removeChannel(entryChannel)
      supabase.removeChannel(violationChannel)
    }
  }, [])

  async function loadDashboardData() {
    setLoading(true)
    await Promise.all([loadPcSeats(), loadRecentEntries(), loadRecentViolations()])
    setLoading(false)
  }

  async function loadPcSeats() {
    const { data } = await supabase.from('pc_seats').select('*').order('pc_number')
    if (data) setPcSeats(data)
  }

  async function loadRecentEntries() {
    const { data } = await supabase
      .from('entry_records')
      .select('*')
      .order('entry_time', { ascending: false })
      .limit(10)
    if (data) setRecentEntries(data)
  }

  async function loadRecentViolations() {
    const { data } = await supabase
      .from('violation_events')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(10)
    if (data) setRecentViolations(data)
  }

  async function handleViolationAction(violationId: string, pcNumber: number, action: 'LOCKED' | 'WARNING' | 'IGNORED') {
    await supabase.from('violation_events').update({ action_taken: action }).eq('id', violationId)

    if (action === 'LOCKED') {
      await supabase.from('pc_seats').update({ status: 'ACTIVE' }).eq('pc_number', pcNumber)
    }

    loadRecentViolations()
    loadPcSeats()
  }

  const activePcs = pcSeats.filter((p) => p.status === 'ACTIVE').length
  const waitingEntries = recentEntries.filter((e) => e.status === 'WAITING').length
  const unresolvedViolations = recentViolations.filter((v) => !v.action_taken).length

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-foreground">대시보드</h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Monitor className="h-5 w-5" />}
          label="전체 PC"
          value={pcSeats.length}
          color="text-primary"
          bgColor="bg-primary/10"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="사용 중"
          value={activePcs}
          color="text-success"
          bgColor="bg-success/10"
        />
        <StatCard
          icon={<Users className="h-5 w-5" />}
          label="대기 중"
          value={waitingEntries}
          color="text-warning"
          bgColor="bg-warning/10"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="미처리 위반"
          value={unresolvedViolations}
          color="text-destructive"
          bgColor="bg-destructive/10"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">PC 좌석 현황</h2>
          {pcSeats.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 PC가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {pcSeats.map((pc) => (
                <div
                  key={pc.pc_number}
                  className={`flex flex-col items-center justify-center rounded-lg border p-3 text-xs font-medium ${
                    pc.status === 'ACTIVE'
                      ? 'border-success/30 bg-success/10 text-success'
                      : pc.status === 'LOCKED'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-border bg-muted text-muted-foreground'
                  }`}
                >
                  <Monitor className="mb-1 h-4 w-4" />
                  <span>PC{String(pc.pc_number).padStart(2, '0')}</span>
                  {pc.current_student_name && (
                    <span className="mt-0.5 truncate text-[10px]">{pc.current_student_name}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="mb-4 text-lg font-semibold text-foreground">최근 출입 기록</h2>
          {recentEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">출입 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentEntries.slice(0, 8).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-medium text-foreground">{entry.student_name}</span>
                    <span className="ml-2 text-muted-foreground">
                      {entry.grade}학년 · PC{String(entry.pc_number).padStart(2, '0')}
                    </span>
                  </div>
                  <StatusBadge status={entry.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {recentViolations.length > 0 && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-destructive">최근 위반 이벤트</h2>
          <div className="space-y-2">
            {recentViolations.slice(0, 5).map((v) => (
              <div
                key={v.id}
                className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-sm"
              >
                <div>
                  <span className="font-medium text-foreground">PC{String(v.pc_number).padStart(2, '0')}</span>
                  <span className="ml-2 text-muted-foreground truncate max-w-[200px] inline-block align-middle">{v.url}</span>
                </div>
                {v.action_taken ? (
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                    {v.action_taken === 'LOCKED' ? '잠금' : v.action_taken === 'WARNING' ? '경고' : '무시'}
                  </span>
                ) : (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleViolationAction(v.id, v.pc_number, 'LOCKED')}
                      className="rounded p-1.5 text-success hover:bg-success/10"
                      title="잠금 해제"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleViolationAction(v.id, v.pc_number, 'WARNING')}
                      className="rounded p-1.5 text-warning hover:bg-warning/10"
                      title="경고"
                    >
                      <MessageSquareWarning className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleViolationAction(v.id, v.pc_number, 'IGNORED')}
                      className="rounded p-1.5 text-muted-foreground hover:bg-accent"
                      title="무시"
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  color,
  bgColor,
}: {
  icon: React.ReactNode
  label: string
  value: number
  color: string
  bgColor: string
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${bgColor} ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground">{value}</p>
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
