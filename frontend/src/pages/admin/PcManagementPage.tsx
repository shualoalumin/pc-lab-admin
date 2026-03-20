import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { PcSeat } from '@/types/database'
import { Monitor, Plus, Lock, Unlock, X } from 'lucide-react'

export function PcManagementPage() {
  const [pcSeats, setPcSeats] = useState<PcSeat[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    loadPcSeats()

    const channel = supabase
      .channel('pc-seats-manage')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pc_seats' }, () => {
        loadPcSeats()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadPcSeats() {
    setLoading(true)
    const { data } = await supabase.from('pc_seats').select('*').order('pc_number')
    if (data) setPcSeats(data)
    setLoading(false)
  }

  async function toggleLock(pc: PcSeat) {
    if (pc.status === 'LOCKED') {
      await supabase.from('pc_seats').update({ status: 'ACTIVE' }).eq('pc_number', pc.pc_number)
    } else {
      await supabase
        .from('pc_seats')
        .update({ status: 'LOCKED', current_entry_id: null, current_student_name: null })
        .eq('pc_number', pc.pc_number)
    }
  }

  async function deletePc(pcNumber: number) {
    if (!confirm(`PC${String(pcNumber).padStart(2, '0')}를 삭제하시겠습니까?`)) return
    await supabase.from('pc_seats').delete().eq('pc_number', pcNumber)
    setPcSeats((prev) => prev.filter((p) => p.pc_number !== pcNumber))
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
        <h1 className="text-2xl font-bold text-foreground">PC 관리</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          PC 추가
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {pcSeats.map((pc) => (
          <div
            key={pc.pc_number}
            className={`rounded-xl border p-4 ${
              pc.status === 'ACTIVE'
                ? 'border-success/30 bg-success/5'
                : pc.status === 'LOCKED'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border bg-muted/30'
            }`}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-foreground" />
                <span className="font-semibold text-foreground">
                  PC{String(pc.pc_number).padStart(2, '0')}
                </span>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  pc.status === 'ACTIVE'
                    ? 'bg-success/10 text-success'
                    : pc.status === 'LOCKED'
                      ? 'bg-destructive/10 text-destructive'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {pc.status === 'ACTIVE' ? '사용중' : pc.status === 'LOCKED' ? '잠금' : '종료'}
              </span>
            </div>

            {pc.current_student_name && (
              <p className="mb-3 text-sm text-muted-foreground">
                사용자: {pc.current_student_name}
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => toggleLock(pc)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ${
                  pc.status === 'LOCKED'
                    ? 'bg-success/10 text-success hover:bg-success/20'
                    : 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                }`}
              >
                {pc.status === 'LOCKED' ? (
                  <>
                    <Unlock className="h-3.5 w-3.5" /> 해제
                  </>
                ) : (
                  <>
                    <Lock className="h-3.5 w-3.5" /> 잠금
                  </>
                )}
              </button>
              <button
                onClick={() => deletePc(pc.pc_number)}
                className="rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                삭제
              </button>
            </div>
          </div>
        ))}
      </div>

      {pcSeats.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
          <Monitor className="h-12 w-12" />
          <p>등록된 PC가 없습니다.</p>
          <p className="text-sm">위의 "PC 추가" 버튼으로 PC를 등록하세요.</p>
        </div>
      )}

      {showAdd && (
        <AddPcModal
          existingNumbers={pcSeats.map((p) => p.pc_number)}
          onClose={() => setShowAdd(false)}
          onAdded={loadPcSeats}
        />
      )}
    </div>
  )
}

function AddPcModal({
  existingNumbers,
  onClose,
  onAdded,
}: {
  existingNumbers: number[]
  onClose: () => void
  onAdded: () => void
}) {
  const [mode, setMode] = useState<'single' | 'range'>('range')
  const [singleNumber, setSingleNumber] = useState(1)
  const [rangeStart, setRangeStart] = useState(1)
  const [rangeEnd, setRangeEnd] = useState(20)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const numbers =
      mode === 'single'
        ? [singleNumber]
        : Array.from({ length: rangeEnd - rangeStart + 1 }, (_, i) => rangeStart + i)

    const newPcs = numbers
      .filter((n) => !existingNumbers.includes(n))
      .map((n) => ({
        pc_number: n,
        status: 'LOCKED' as const,
        current_entry_id: null,
        current_student_name: null,
      }))

    if (newPcs.length > 0) {
      await supabase.from('pc_seats').insert(newPcs)
    }

    setSubmitting(false)
    onAdded()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">PC 추가</h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setMode('range')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              mode === 'range' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            범위 추가
          </button>
          <button
            onClick={() => setMode('single')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${
              mode === 'single' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            단일 추가
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'single' ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">PC 번호</label>
              <input
                type="number"
                min={1}
                value={singleNumber}
                onChange={(e) => setSingleNumber(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">시작 번호</label>
                <input
                  type="number"
                  min={1}
                  value={rangeStart}
                  onChange={(e) => setRangeStart(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">끝 번호</label>
                <input
                  type="number"
                  min={rangeStart}
                  value={rangeEnd}
                  onChange={(e) => setRangeEnd(Number(e.target.value))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
                />
              </div>
            </div>
          )}

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
