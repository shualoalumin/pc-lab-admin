import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { ApprovalDocument } from '@/types/database'
import { Plus, Search, Pencil, Trash2, X } from 'lucide-react'

export function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ApprovalDocument | null>(null)

  useEffect(() => {
    loadApprovals()
  }, [])

  async function loadApprovals() {
    setLoading(true)
    const { data } = await supabase
      .from('approval_documents')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setApprovals(data)
    setLoading(false)
  }

  async function deleteApproval(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('approval_documents').delete().eq('id', id)
    setApprovals((prev) => prev.filter((a) => a.id !== id))
  }

  const filtered = approvals.filter(
    (a) =>
      a.student_name.includes(search) ||
      a.purpose.includes(search) ||
      String(a.grade).includes(search)
  )

  const today = new Date().toISOString().split('T')[0]

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">기안서 관리</h1>
        <button
          onClick={() => {
            setEditing(null)
            setShowForm(true)
          }}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          기안서 등록
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="이름, 학년, 목적으로 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-input bg-background pl-10 pr-4 py-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">학년/반</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">이름</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">목적</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">승인 기간</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">상태</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    {search ? '검색 결과가 없습니다.' : '등록된 기안서가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map((a) => {
                  const isExpired = a.end_date < today
                  return (
                    <tr key={a.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-foreground">
                        {a.grade}학년 {a.class_number}반
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{a.student_name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.purpose}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {a.start_date} ~ {a.end_date}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            a.status === 'REVOKED'
                              ? 'bg-destructive/10 text-destructive'
                              : isExpired
                                ? 'bg-warning/10 text-warning'
                                : 'bg-success/10 text-success'
                          }`}
                        >
                          {a.status === 'REVOKED' ? '취소' : isExpired ? '만료' : '유효'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => {
                            setEditing(a)
                            setShowForm(true)
                          }}
                          className="mr-1 rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteApproval(a.id)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ApprovalForm
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSaved={loadApprovals}
        />
      )}
    </div>
  )
}

function ApprovalForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: ApprovalDocument | null
  onClose: () => void
  onSaved: () => void
}) {
  const [grade, setGrade] = useState(initial?.grade ?? 1)
  const [classNumber, setClassNumber] = useState(initial?.class_number ?? 1)
  const [studentName, setStudentName] = useState(initial?.student_name ?? '')
  const [purpose, setPurpose] = useState(initial?.purpose ?? '')
  const [startDate, setStartDate] = useState(initial?.start_date ?? '')
  const [endDate, setEndDate] = useState(initial?.end_date ?? '')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    const payload = {
      grade,
      class_number: classNumber,
      student_name: studentName,
      purpose,
      start_date: startDate,
      end_date: endDate,
      status: 'ACTIVE' as const,
    }

    if (initial) {
      await supabase.from('approval_documents').update(payload).eq('id', initial.id)
    } else {
      await supabase.from('approval_documents').insert(payload)
    }

    setSubmitting(false)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {initial ? '기안서 수정' : '기안서 등록'}
          </h2>
          <button onClick={onClose} className="rounded p-1 hover:bg-accent">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">학년</label>
              <select
                value={grade}
                onChange={(e) => setGrade(Number(e.target.value))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
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
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
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
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
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
              className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">시작일</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">종료일</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-ring"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium text-foreground hover:bg-accent"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {submitting ? '저장 중...' : initial ? '수정' : '등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
