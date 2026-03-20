import { useState, useEffect, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import { Monitor, CheckCircle, XCircle, Clock, ArrowLeft } from 'lucide-react'

type KioskState = 'input' | 'checking' | 'waiting' | 'approved' | 'rejected'

export function KioskPage() {
  const [grade, setGrade] = useState(1)
  const [classNumber, setClassNumber] = useState(1)
  const [studentName, setStudentName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [pcNumber, setPcNumber] = useState(1)
  const [state, setState] = useState<KioskState>('input')
  const [entryId, setEntryId] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [availablePcs, setAvailablePcs] = useState<number[]>([])

  useEffect(() => {
    loadAvailablePcs()
  }, [])

  useEffect(() => {
    if (!entryId || state !== 'waiting') return

    const channel = supabase
      .channel(`kiosk-entry-${entryId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'entry_records', filter: `id=eq.${entryId}` },
        (payload) => {
          const updated = payload.new as { status: string }
          if (updated.status === 'USING') {
            setState('approved')
            setMessage('승인되었습니다. PC를 사용하세요!')
          } else if (updated.status === 'BLOCKED') {
            setState('rejected')
            setMessage('입실이 거부되었습니다.')
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [entryId, state])

  async function loadAvailablePcs() {
    const { data } = await supabase
      .from('pc_seats')
      .select('pc_number')
      .eq('status', 'LOCKED')
      .order('pc_number')
    if (data && data.length > 0) {
      setAvailablePcs(data.map((p) => p.pc_number))
      setPcNumber(data[0].pc_number)
    }
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setState('checking')

    const today = new Date().toISOString().split('T')[0]
    const { data: approval } = await supabase
      .from('approval_documents')
      .select('*')
      .eq('grade', grade)
      .eq('student_name', studentName)
      .eq('status', 'ACTIVE')
      .lte('start_date', today)
      .gte('end_date', today)
      .limit(1)
      .maybeSingle()

    const needsApproval = !approval
    const { data: entry } = await supabase
      .from('entry_records')
      .insert({
        student_name: studentName,
        grade,
        class_number: classNumber,
        purpose,
        pc_number: pcNumber,
        expected_end_time: null,
        status: needsApproval ? 'WAITING' : 'WAITING',
        approval_id: approval?.id ?? null,
        needs_approval: needsApproval,
      })
      .select()
      .single()

    if (!entry) {
      setState('input')
      setMessage('등록에 실패했습니다. 다시 시도해주세요.')
      return
    }

    setEntryId(entry.id)

    if (!needsApproval) {
      await supabase.from('entry_records').update({ status: 'USING' }).eq('id', entry.id)
      await supabase
        .from('pc_seats')
        .update({ status: 'ACTIVE', current_entry_id: entry.id, current_student_name: studentName })
        .eq('pc_number', pcNumber)
      setState('approved')
      setMessage('기안서가 확인되었습니다. PC를 사용하세요!')
    } else {
      setState('waiting')
      setMessage('기안서가 확인되지 않았습니다. 관리자 승인을 기다려주세요.')
    }
  }

  const reset = () => {
    setState('input')
    setEntryId(null)
    setStudentName('')
    setPurpose('')
    setMessage('')
    loadAvailablePcs()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-primary/5 to-background p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary">
            <Monitor className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">컴퓨터실 출입 등록</h1>
          <p className="mt-2 text-muted-foreground">정보를 입력하고 PC를 사용하세요</p>
        </div>

        {state === 'input' && (
          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-border bg-card p-8 shadow-sm">
            {message && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{message}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">학년</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  {[1, 2, 3].map((g) => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">반</label>
                <select
                  value={classNumber}
                  onChange={(e) => setClassNumber(Number(e.target.value))}
                  className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
                >
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((c) => (
                    <option key={c} value={c}>{c}반</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">이름</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                required
                placeholder="홍길동"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">사용 목적</label>
              <input
                type="text"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                required
                placeholder="예: 코딩 수업, 과제 작성"
                className="w-full rounded-xl border border-input bg-background px-4 py-3 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">PC 좌석 번호</label>
              {availablePcs.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {availablePcs.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPcNumber(n)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                        pcNumber === n
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border bg-background text-foreground hover:bg-accent'
                      }`}
                    >
                      {String(n).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">사용 가능한 PC가 없습니다.</p>
              )}
            </div>

            <button
              type="submit"
              disabled={availablePcs.length === 0}
              className="w-full rounded-xl bg-primary px-4 py-3.5 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
            >
              출입 등록
            </button>
          </form>
        )}

        {state === 'checking' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-lg font-medium text-foreground">기안서 확인 중...</p>
          </div>
        )}

        {state === 'waiting' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-warning/30 bg-warning/5 p-12">
            <Clock className="h-16 w-16 text-warning" />
            <p className="text-lg font-medium text-foreground">관리자 승인 대기 중</p>
            <p className="text-center text-sm text-muted-foreground">{message}</p>
            <div className="h-2 w-48 overflow-hidden rounded-full bg-warning/20">
              <div className="h-full w-full animate-pulse rounded-full bg-warning" />
            </div>
            <button onClick={reset} className="mt-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> 처음으로 돌아가기
            </button>
          </div>
        )}

        {state === 'approved' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-success/30 bg-success/5 p-12">
            <CheckCircle className="h-16 w-16 text-success" />
            <p className="text-xl font-bold text-foreground">사용 승인됨</p>
            <p className="text-center text-muted-foreground">{message}</p>
            <p className="text-lg font-semibold text-primary">PC{String(pcNumber).padStart(2, '0')}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              다음 학생 등록
            </button>
          </div>
        )}

        {state === 'rejected' && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-12">
            <XCircle className="h-16 w-16 text-destructive" />
            <p className="text-xl font-bold text-foreground">입실 거부</p>
            <p className="text-center text-muted-foreground">{message}</p>
            <button
              onClick={reset}
              className="mt-4 rounded-xl border border-border px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
            >
              처음으로
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
