# PC Lab Admin - Development Progress

> Last updated: 2026-03-20

---

## Project Overview

An integrated management system for school computer labs. Combines entry control, approval document digitization, PC activity monitoring, violation detection, and a real-time admin dashboard into a single platform.

---

## Tech Stack

| Area | Technology |
|------|-----------|
| **Frontend** | React 19 + Vite 8 + TypeScript |
| **Styling** | Tailwind CSS v4 |
| **Icons** | lucide-react |
| **Routing** | react-router-dom v7 |
| **Backend / DB** | Supabase (PostgreSQL + Realtime + Auth) |
| **Chrome Extension** | Manifest V3 (Plain JS, ES Modules) |
| **Deployment (planned)** | Cloudflare Pages (frontend) + Supabase (backend) |

---

## Supabase Project Info

| Field | Value |
|-------|-------|
| Project Name | pc-lab-admin |
| Project ID | `qfxgnoipphoedvxdgfnj` |
| Region | ap-northeast-2 (Seoul) |
| URL | `https://qfxgnoipphoedvxdgfnj.supabase.co` |

---

## Database Schema

### Tables

| Table | Description | RLS |
|-------|-------------|-----|
| `approval_documents` | Approved usage documents (permission slips) | Enabled |
| `entry_records` | Student entry registration logs | Enabled |
| `session_logs` | PC session start / end logs | Enabled |
| `activity_logs` | URL and tab activity collected from Chrome Extension | Enabled |
| `violation_events` | Blocked domain access and other violation events | Enabled |
| `pc_seats` | PC seat status (LOCKED / ACTIVE / SESSION_END) | Enabled |
| `blocked_domains` | List of blocked domains managed by admin | Enabled |

### Enum Types

```
entry_status:     WAITING | USING | FINISHED | BLOCKED
pc_status:        LOCKED | ACTIVE | SESSION_END
violation_action: LOCKED | WARNING | IGNORED
approval_status:  ACTIVE | EXPIRED | REVOKED
```

### RLS Policy Structure

- **authenticated (admin)**: Full access to all tables (SELECT / INSERT / UPDATE / DELETE)
- **anon (kiosk / Chrome Extension)**:
  - `pc_seats`: SELECT, UPDATE
  - `approval_documents`: SELECT
  - `entry_records`: SELECT, INSERT, UPDATE
  - `session_logs`: SELECT, INSERT, UPDATE
  - `activity_logs`: SELECT, INSERT
  - `violation_events`: SELECT, INSERT
  - `blocked_domains`: SELECT

### Realtime-enabled Tables

- `pc_seats`
- `entry_records`
- `activity_logs`
- `violation_events`

---

## Frontend (`frontend/`)

### Directory Structure

```
frontend/
  src/
    components/
      auth/
        ProtectedRoute.tsx     # Guards routes that require authentication
      layout/
        AdminLayout.tsx        # Admin sidebar + main layout wrapper
    hooks/
      useAuth.tsx              # Supabase Auth state management hook
      useRealtimeViolations.ts # Realtime subscription hook for violations
    lib/
      supabase.ts              # Typed Supabase client (Database generic)
      utils.ts                 # cn() utility (clsx + tailwind-merge)
    pages/
      admin/
        LoginPage.tsx          # Admin login page
        DashboardPage.tsx      # Main dashboard with realtime updates
        ApprovalsPage.tsx      # Approval document CRUD
        EntryRecordsPage.tsx   # Entry record management
        PcManagementPage.tsx   # PC seat management
        BlockedDomainsPage.tsx # Blocked domain management
      kiosk/
        KioskPage.tsx          # Student entry registration kiosk
    types/
      database.ts              # Full TypeScript types generated from Supabase schema
```

### Page-by-Page Features

#### `/kiosk` — Entry Registration Kiosk
- Input form: grade, class, name, purpose, PC seat number
- On submission, automatically queries `approval_documents` to verify eligibility:
  - Valid approval → entry registered as `USING`, PC seat activated
  - Expired or not found → registered with `needs_approval = true`, waits for admin
- Realtime subscription listens for admin approve/reject decision
- State transitions: Input → Checking → Waiting / Approved / Rejected

#### `/login` — Admin Login
- Email/password authentication via Supabase Auth
- Redirects to `/admin` on success

#### `/admin` — Dashboard
- **Stat cards**: Total PCs, active PCs, waiting students, unresolved violations
- **PC seat map**: Color-coded grid — locked (red) / active (green) / ended (gray)
- **Recent entries feed**: Student name, grade, PC number, status badge
- **Violation panel**: Inline action buttons for unresolved violations:
  - Unlock: sets `pc_seats.status` → ACTIVE
  - Warning: sets `violation_events.action_taken` → WARNING
  - Ignore: sets `violation_events.action_taken` → IGNORED
- All data updates via Supabase Realtime subscriptions

#### `/admin/approvals` — Approval Documents
- Full document table (grade / class / name / purpose / date range / status)
- Keyword search (name, grade, purpose)
- Create / edit modal form
- Delete with confirmation dialog
- Status badges: Valid (green) / Expired (amber) / Revoked (red)

#### `/admin/entries` — Entry Records
- **Awaiting approval section**: Cards for entries needing admin decision + approve/reject buttons
- **Active sessions section**: Currently active student cards + end session button
- **Full records table**: Chronological entry history
- Realtime live updates

#### `/admin/pcs` — PC Management
- Grid view of all PC seats with status colors
- Add PC modal: single number or range (e.g. 1–20)
- Lock/unlock toggle per seat
- Delete seat

#### `/admin/blocked-domains` — Blocked Domains
- Domain card list with delete button
- Add domain modal (domain name + optional description)
- One-click default list import: YouTube, Instagram, TikTok, Netflix, Facebook, Twitter/X, Twitch

---

## Chrome Extension (`chrome-extension/`)

### File Structure

```
chrome-extension/
  manifest.json        # Manifest V3 configuration
  config.js            # Supabase URL/Key, interval constants
  supabase-client.js   # Lightweight fetch-based Supabase REST client
  background.js        # Service Worker — core monitoring logic
  content.js           # Lock screen overlay injection into pages
  popup.html           # Extension popup UI
  popup.js             # Popup logic (status display, config form)
  icons/               # Icon assets required: icon16.png, icon48.png, icon128.png
```

### Core Behavior Flow

```
On install
  └─ User sets PC number via popup → saved to chrome.storage

On tab navigation / URL change
  ├─ Blocked domain match?
  │   ├─ YES → INSERT violation_events
  │   │         UPDATE pc_seats → LOCKED
  │   │         Redirect tab → about:blank
  │   │         Show Chrome notification
  │   └─ NO  → Push to activity buffer
  │
  └─ Every 5 seconds (alarm): flush activityBuffer → INSERT activity_logs

Every 5 minutes
  └─ Sync blocked_domains table from Supabase

Every 30 seconds
  └─ Poll pc_seats status
      ├─ status changed to LOCKED → show lock notification
      └─ status changed to ACTIVE → show unlock notification
```

### Installation Guide (School Deployment)

1. Open `chrome://extensions` in Chrome
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `chrome-extension/` folder
4. Click the extension icon → enter PC number → save
5. Optionally enter a session ID provided by the admin

---

## System Flow Diagrams

### Normal Flow — Valid Approval

```
Student enters info at kiosk
    ↓
Query approval_documents (grade + name + date range)
    ↓ match found and within date range
INSERT entry_records (status: WAITING → USING)
UPDATE pc_seats (status: ACTIVE)
    ↓
Admin dashboard receives Realtime update
    ↓
Chrome Extension begins monitoring tab activity
    ↓
activity_logs batched every 5 seconds
```

### Exception Flow — No Approval / Expired

```
approval_documents → not found or date expired
    ↓
INSERT entry_records (status: WAITING, needs_approval: true)
    ↓
Admin dashboard shows Realtime alert
    ↓
Admin approves → UPDATE entry_records (USING) + UPDATE pc_seats (ACTIVE)
Admin rejects  → UPDATE entry_records (BLOCKED)
    ↓
Kiosk receives Realtime update → shows result screen
```

### Violation Flow — Blocked Site Access

```
Chrome Extension detects blocked domain access
    ↓
INSERT violation_events
UPDATE pc_seats (status: LOCKED)
Redirect tab → about:blank
    ↓
Admin dashboard Realtime alert + browser push notification
    ↓
Admin selects response:
  [Unlock]  → UPDATE pc_seats ACTIVE
              + UPDATE violation_events action_taken: LOCKED
  [Warning] → UPDATE violation_events action_taken: WARNING
  [Ignore]  → UPDATE violation_events action_taken: IGNORED
```

---

## Deployment Configuration

### Cloudflare Pages (Frontend)

- Build command: `npm run build`
- Build output directory: `frontend/dist`
- `frontend/public/_redirects` — enables SPA routing (`/* /index.html 200`)
- Required environment variables:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

### First-Run Checklist

1. **Create admin account**: Supabase Dashboard → Authentication → Users → Invite user
2. **Register PC seats**: Admin login → PC Management → Add PCs (e.g. range 1–25)
3. **Add default blocked domains**: Admin → Blocked Domains → "Add Default Domains"
4. **Deploy Chrome Extension**: Load `chrome-extension/` folder on each student PC

---

## Build Output

```
dist/index.html                   0.45 kB │ gzip:   0.29 kB
dist/assets/index-*.css          26.02 kB │ gzip:   5.10 kB
dist/assets/index-*.js          476.13 kB │ gzip: 135.48 kB

Build time:       ~510ms
TypeScript errors: 0
```

---

## Known Limitations and Future Improvements

| Item | Current State | Planned Improvement |
|------|--------------|---------------------|
| Chrome Extension install | Manual unpacked load | Enterprise policy deployment or Chrome Web Store |
| Extension lock enforcement | Tab redirect only | Full screen lock integrated with school PC policy |
| Bulk approval upload | Not yet implemented | CSV/Excel import feature |
| Session auto-linking | Manual session ID entry | Auto-link session to kiosk entry record |
| Statistics page | Basic dashboard stats only | Per-student history, daily/weekly charts |
| Violation alert sound | Not yet implemented | Audio alert on violation detection |
