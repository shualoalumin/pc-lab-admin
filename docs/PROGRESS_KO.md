# PC Lab Admin - 개발 진행 현황

> 최종 업데이트: 2026-03-20

---

## 프로젝트 개요

학교 컴퓨터실 통합 관리 시스템. 출입 통제, 기안서 전산화, PC 활동 모니터링, 위반 감지 및 관리자 대시보드를 단일 플랫폼으로 통합.

---

## 기술 스택

| 영역 | 선택 기술 |
|------|----------|
| **프론트엔드** | React 19 + Vite 8 + TypeScript |
| **스타일** | Tailwind CSS v4 |
| **아이콘** | lucide-react |
| **라우팅** | react-router-dom v7 |
| **백엔드/DB** | Supabase (PostgreSQL + Realtime + Auth) |
| **크롬 확장** | Manifest V3 (순수 JS, ES Module) |
| **배포 (예정)** | Cloudflare Pages (프론트) + Supabase (백엔드) |

---

## Supabase 프로젝트 정보

| 항목 | 값 |
|------|---|
| 프로젝트명 | pc-lab-admin |
| 프로젝트 ID | `qfxgnoipphoedvxdgfnj` |
| 리전 | ap-northeast-2 (서울) |
| URL | `https://qfxgnoipphoedvxdgfnj.supabase.co` |

---

## 데이터베이스 스키마

### 테이블 목록

| 테이블 | 설명 | RLS |
|--------|------|-----|
| `approval_documents` | 기안서 (학생 컴퓨터실 사용 승인 문서) | 활성 |
| `entry_records` | 출입 등록 기록 | 활성 |
| `session_logs` | PC 세션 시작/종료 로그 | 활성 |
| `activity_logs` | 크롬 확장에서 수집한 URL/탭 활동 | 활성 |
| `violation_events` | 차단 도메인 접근 등 위반 이벤트 | 활성 |
| `pc_seats` | PC 좌석 상태 (잠금/활성/세션 종료) | 활성 |
| `blocked_domains` | 차단 도메인 목록 | 활성 |

### Enum 타입

```
entry_status:    WAITING | USING | FINISHED | BLOCKED
pc_status:       LOCKED | ACTIVE | SESSION_END
violation_action: LOCKED | WARNING | IGNORED
approval_status: ACTIVE | EXPIRED | REVOKED
```

### RLS 정책 구조

- **authenticated (관리자)**: 모든 테이블 전체 접근 (SELECT/INSERT/UPDATE/DELETE)
- **anon (키오스크/크롬 확장)**:
  - `pc_seats`: SELECT, UPDATE
  - `approval_documents`: SELECT
  - `entry_records`: SELECT, INSERT, UPDATE
  - `session_logs`: SELECT, INSERT, UPDATE
  - `activity_logs`: SELECT, INSERT
  - `violation_events`: SELECT, INSERT
  - `blocked_domains`: SELECT

### Realtime 구독 활성화 테이블

- `pc_seats`
- `entry_records`
- `activity_logs`
- `violation_events`

---

## 프론트엔드 (`frontend/`)

### 디렉토리 구조

```
frontend/
  src/
    components/
      auth/
        ProtectedRoute.tsx    # 인증 필요 라우트 보호
      layout/
        AdminLayout.tsx       # 관리자 사이드바 + 메인 레이아웃
    hooks/
      useAuth.tsx             # Supabase Auth 상태 관리 훅
      useRealtimeViolations.ts # 위반 이벤트 실시간 구독 훅
    lib/
      supabase.ts             # Supabase 클라이언트 (타입 제네릭 포함)
      utils.ts                # cn() 유틸리티 (clsx + tailwind-merge)
    pages/
      admin/
        LoginPage.tsx         # 관리자 로그인
        DashboardPage.tsx     # 메인 대시보드 (실시간)
        ApprovalsPage.tsx     # 기안서 CRUD
        EntryRecordsPage.tsx  # 출입 기록 관리
        PcManagementPage.tsx  # PC 좌석 관리
        BlockedDomainsPage.tsx # 차단 도메인 관리
      kiosk/
        KioskPage.tsx         # 학생 출입 등록 키오스크
    types/
      database.ts             # Supabase에서 생성된 TypeScript 타입 전체
```

### 페이지별 기능 상세

#### `/kiosk` - 출입 등록 키오스크
- 학년/반/이름/목적/PC번호 입력 폼
- 입력 즉시 `approval_documents` 테이블에서 기안서 유효성 자동 검증
  - 유효한 기안서: 자동 `USING` 상태로 등록, PC 활성화
  - 만료/미존재: `needs_approval = true`로 등록, 관리자 알림 대기
- Supabase Realtime으로 관리자 승인/거부 결과 실시간 수신
- 상태별 화면: 입력 → 검증 중 → 대기/승인/거부

#### `/login` - 관리자 로그인
- Supabase Auth 이메일/비밀번호 인증
- 로그인 성공 시 `/admin`으로 리다이렉트

#### `/admin` - 대시보드
- **통계 카드**: 전체 PC 수, 사용 중 PC, 대기 학생, 미처리 위반 수
- **PC 좌석 현황 맵**: 잠금(빨강)/사용중(초록)/종료(회색) 상태 그리드
- **최근 출입 기록**: 학생명, 학년, PC번호, 상태 배지
- **위반 이벤트 패널**: 미처리 위반에 인라인 대응 버튼
  - 잠금 해제: `pc_seats.status` → ACTIVE
  - 경고: `violation_events.action_taken` → WARNING
  - 무시: `violation_events.action_taken` → IGNORED
- 모든 데이터 Realtime 실시간 구독

#### `/admin/approvals` - 기안서 관리
- 전체 기안서 목록 테이블 (학년/반/이름/목적/기간/상태)
- 검색 필터 (이름, 학년, 목적 키워드)
- 기안서 등록/수정 모달 폼
- 기안서 삭제 (confirm 다이얼로그)
- 상태 배지: 유효(초록) / 만료(주황) / 취소(빨강)

#### `/admin/entries` - 출입 기록
- **승인 대기 섹션**: 관리자 승인 필요 카드 목록 + 승인/거부 버튼
- **사용 중 섹션**: 현재 사용 중인 학생 카드 + 사용 종료 버튼
- **전체 기록 테이블**: 시간순 출입 이력
- Realtime 실시간 업데이트

#### `/admin/pcs` - PC 관리
- PC 좌석 그리드 뷰 (상태별 색상 구분)
- PC 추가 모달: 단일 번호 또는 범위(1~20 등) 일괄 추가
- 잠금/해제 토글 버튼
- PC 삭제

#### `/admin/blocked-domains` - 차단 도메인
- 도메인 카드 목록 + 삭제
- 도메인 추가 모달 (도메인명 + 설명)
- 기본 차단 목록 일괄 등록 버튼: YouTube, Instagram, TikTok, Netflix, Facebook, Twitter, Twitch

---

## Chrome Extension (`chrome-extension/`)

### 파일 구조

```
chrome-extension/
  manifest.json       # Manifest V3 설정
  config.js           # Supabase URL/Key, 배치 간격 상수
  supabase-client.js  # fetch 기반 Supabase REST API 경량 클라이언트
  background.js       # Service Worker (핵심 로직)
  content.js          # 잠금 화면 오버레이 주입
  popup.html          # 확장 팝업 UI
  popup.js            # 팝업 로직 (상태 표시, 설정)
  icons/              # 아이콘 디렉토리 (16/48/128px 필요)
```

### 핵심 동작 흐름

```
설치 시
  └─ popup에서 PC번호 입력 → chrome.storage에 저장

탭 이동/URL 변경 시
  ├─ 차단 도메인 해당?
  │   ├─ YES → violation_events INSERT → pc_seats LOCKED → 탭 리다이렉트 → 관리자 알림
  │   └─ NO  → activityBuffer에 추가 (배치)
  │
  └─ 5초 알람마다 activityBuffer flush → activity_logs INSERT

5분마다
  └─ blocked_domains 테이블 동기화

30초마다(0.5분)
  └─ pc_seats 상태 폴링
      ├─ LOCKED 감지 → 잠금 알림 표시
      └─ ACTIVE 복구 → 잠금 해제 알림
```

### 설치 방법 (학교 배포)

1. Chrome에서 `chrome://extensions` 열기
2. "개발자 모드" 활성화
3. "압축 해제된 확장 프로그램 로드" → `chrome-extension/` 폴더 선택
4. 확장 아이콘 클릭 → PC 번호 입력 후 저장
5. 관리자로부터 세션 ID 받아 입력 (선택 사항)

---

## 시스템 플로우

### 정상 출입 (기안서 유효)

```
학생 키오스크 입력
    ↓
approval_documents 조회 (grade + student_name + 날짜 범위)
    ↓ 유효
entry_records INSERT (status: WAITING → USING)
pc_seats UPDATE (status: ACTIVE)
    ↓
관리자 대시보드 실시간 반영
    ↓
Chrome Extension 탭 모니터링 시작
    ↓
activity_logs 배치 전송 (5초 간격)
```

### 예외 출입 (기안서 미존재/만료)

```
approval_documents 조회 → 없음 또는 만료
    ↓
entry_records INSERT (status: WAITING, needs_approval: true)
    ↓
관리자 대시보드 Realtime 알림
    ↓
관리자 승인 → entry_records UPDATE (USING) + pc_seats ACTIVE
관리자 거부 → entry_records UPDATE (BLOCKED)
    ↓
키오스크 Realtime 수신 → 결과 화면 표시
```

### 위반 감지

```
Chrome Extension: 차단 도메인 접근 감지
    ↓
violation_events INSERT
pc_seats UPDATE (status: LOCKED)
탭 → about:blank 리다이렉트
    ↓
관리자 대시보드 Realtime 위반 알림 + 브라우저 푸시 알림
    ↓
관리자 대응 선택:
  [잠금해제] → pc_seats ACTIVE + violation_events action_taken: LOCKED
  [경고]     → violation_events action_taken: WARNING
  [무시]     → violation_events action_taken: IGNORED
```

---

## 배포 설정

### Cloudflare Pages (프론트엔드)

- 빌드 명령: `npm run build`
- 빌드 출력 디렉토리: `frontend/dist`
- `frontend/public/_redirects` → SPA 라우팅 지원 (`/* /index.html 200`)
- 환경변수 설정 필요:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### 첫 실행 전 준비사항

1. **관리자 계정 생성**: Supabase Dashboard → Authentication → Users → "Invite user"
2. **PC 좌석 등록**: 관리자 로그인 → PC 관리 → PC 추가 (예: 1~25번 범위 추가)
3. **기본 차단 도메인 등록**: 관리자 → 차단 도메인 → "기본 도메인 추가" 클릭
4. **Chrome Extension 설치**: 각 학생 PC에 `chrome-extension/` 폴더 배포

---

## 빌드 결과

```
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-*.css          26.02 kB │ gzip:   5.10 kB
dist/assets/index-*.js          476.13 kB │ gzip: 135.48 kB

빌드 시간: ~510ms
TypeScript 오류: 0
```

---

## 알려진 제한사항 및 향후 개선 사항

| 항목 | 현재 상태 | 개선 방향 |
|------|----------|----------|
| Chrome Extension 설치 방법 | 수동 압축 해제 로드 | Chrome 정책 배포 또는 엔터프라이즈 등록 |
| 크롬 확장 잠금 | 탭 리다이렉트만 가능 | 학교 PC 정책과 연동하여 전체 화면 잠금 |
| 기안서 일괄 업로드 | UI 미구현 | CSV/Excel 업로드 기능 추가 예정 |
| 세션 자동 시작 | 수동 세션 ID 입력 | 키오스크 출입 등록과 자동 연동 |
| 통계 페이지 | 대시보드 기본 통계 | 일별/주별 차트, 학생별 사용 이력 조회 |
| 알림음 | 미구현 | 위반 감지 시 알림음 추가 |
