# 🖥️ Computer Lab Integrated Management System

> A digital management system for school computer labs — integrating entry control, approval verification, activity monitoring, and admin oversight into a single platform.

---

## 📌 Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Philosophy](#2-system-philosophy)
3. [System Architecture](#3-system-architecture)
4. [Core Features](#4-core-features)
5. [Data Structures](#5-data-structures)
6. [System Flow](#6-system-flow)
7. [Tech Stack](#7-tech-stack)

---

## 1. Project Overview

### 🔴 Problem Statement

Current school computer lab management has the following structural issues:

| Problem | Description |
|---------|-------------|
| Unrestricted access | Students can freely access YouTube, social media, games, and other non-academic content |
| Limited supervision | Supervisors can only check activity via Remote screen sharing |
| Monitoring gap | Impossible to monitor all students at all times |
| No activity records | No logs are kept of student activity |
| Manual document handling | Lab usage approval forms are managed on paper |

### 🟢 Project Goals

Transform computer lab operations into a **fully digital system** that enables:

- ✅ **Digital entry registration** for the computer lab
- ✅ **Approval document-based access** control
- ✅ **PC authentication and lock/unlock control**
- ✅ **Real-time student activity logging**
- ✅ **Automatic detection and blocking of unauthorized usage**
- ✅ **Real-time admin monitoring dashboard**
- ✅ **Automated storage of all usage data**

---

## 2. System Philosophy

The system is built on one clear principle:

```
Normal Case   →  Auto-log (no admin intervention needed)
Exception     →  Admin notification + Admin decision
```

Unnecessary interruptions are minimized. The admin actively responds only when a problem arises.

---

## 3. System Architecture

### Components

The system consists of 6 core modules:

```
1. Entry Registration System     — Student check-in at the door
2. Approval Verification System  — Validates approval documents
3. PC Access Control System      — Lock / unlock PC seats
4. User Activity Monitoring      — Tracks student activity in real time
5. Admin Monitoring Dashboard    — Central admin control panel
6. Logging & Database System     — Stores all records and logs
```

### Overall Flow Diagram

```
Student
 │
 ▼
Entry Input Device (Door PC)
 │  Student enters: Grade / Name / Purpose / PC Seat Number
 ▼
Server / Database
 │  Queries and validates approval records
 ▼
Approval Verification
 │
 ├─── [Approval Valid] ──────────────────────────────────┐
 │                                                       │
 └─── [Expired / Not Found] → Admin Popup               │
                               Admin: Approve / Reject   │
                                                         │
                                                         ▼
                                                 Admin Dashboard
                                                         │
                                                         ▼
                                             Remote PC Unlock
                                                         │
                                                         ▼
                                             Student PC Session Starts
                                                         │
                                                         ▼
                                             Activity Monitoring
                                                         │
                                                         ▼
                                                  Logs Saved
```

---

## 4. Core Features

### 4-1. Entry Registration System

Students manually enter their information at the PC located at the lab entrance.

**Required Input Fields**

```
Grade
Name
Purpose of Use
PC Seat Number
```

**Entry Status Values**

| Status | Description |
|--------|-------------|
| `WAITING` | Entry submitted, waiting for PC unlock |
| `USING` | Session active, currently in use |
| `FINISHED` | Session ended |
| `BLOCKED` | Access denied |

---

### 4-2. Approval Verification System

The system cross-references the student's input against the approval document database to determine access eligibility.

**Validation Conditions**

```
1. Does grade + name exist in the approval database?
2. Is today's date within the approved period?
   → start_date ≤ today ≤ end_date
```

**Verification Results**

| Case | Condition | Action |
|------|-----------|--------|
| ✅ Approval Valid | Exists + Within date range | Auto-log, no admin notification |
| ⚠️ Approval Expired | Exists + Date exceeded | Admin popup → Approve or Reject |
| ❌ No Approval | Record not found | Admin popup → Approve or Reject |

---

### 4-3. PC Access Control System

Maintains the existing **Remote screen sharing software** already in use at the school. The admin unlocks PCs through this interface.

**PC States**

```
LOCKED       — Default locked state
ACTIVE       — Unlocked and available for use
SESSION_END  — Session terminated
```

---

### 4-4. User Activity Monitoring System

A **Chrome Extension** records student PC activity in real time.

**Recorded Data**

```
URL
Page Title
Visit Timestamp
Tab Change Events
```

---

### 4-5. Violation Detection & Response

Automatically detects access to non-academic websites and triggers the appropriate response.

**Example Blocked Domains**

```
youtube.com
instagram.com
tiktok.com
netflix.com
```

**Response Flow**

```
Violation Detected
       │
       ▼
  PC Auto-Locked
       │
       ▼
 Admin Popup Shown
       │
       ▼
[Unlock]  [Warning]  [Ignore]
```

---

### 4-6. Admin Monitoring Dashboard

Gives the administrator a complete real-time view of all PC activity, with direct control capabilities.

**Real-Time PC Status Example**

```
PC01  student01  Chrome        ✅ Normal
PC02  student02  Notepad       ✅ Normal
PC03  student03  youtube.com   ⚠️ Violation
```

**Admin Controls**

```
Unlock PC      — Release a locked PC
Warning        — Send a warning message to the student
Ignore         — Dismiss a violation alert
Approve/Reject — Grant or deny lab entry
```

---

## 5. Data Structures

### Entry Record

```json
{
  "entry_id": "string",
  "name": "string",
  "purpose": "string",
  "pc_number": "integer",
  "entry_time": "datetime",
  "expected_time": "datetime",
  "status": "WAITING | USING | FINISHED | BLOCKED"
}
```

### Approval Document

```json
{
  "grade": "integer",
  "name": "string",
  "purpose": "string",
  "start_date": "date",
  "end_date": "date"
}
```

> Primary Key: `grade + name`

### Session Log

```json
{
  "session_id": "string",
  "entry_id": "string",
  "pc_id": "string",
  "start_time": "datetime",
  "end_time": "datetime"
}
```

### Activity Log

```json
{
  "student_id": "string",
  "pc_id": "string",
  "url": "string",
  "page_title": "string",
  "timestamp": "datetime"
}
```

### Violation Event

```json
{
  "student_id": "string",
  "pc_id": "string",
  "activity": "string",
  "timestamp": "datetime"
}
```

---

## 6. System Flow

### Normal Case — Approval Valid

```
Student arrives at the lab
         │
         ▼
   Enters info at door PC
         │
         ▼
 Approval DB is queried
         │
         ▼
   Approval confirmed valid
         │
         ▼
  Entry record saved (status: WAITING)
         │
         ▼
  Admin unlocks PC via Remote
         │
         ▼
    Session starts (status: USING)
         │
         ▼
 Chrome Extension monitors activity
         │
         ▼
  Normal use → Logs saved
```

### Exception Case — Approval Expired or Not Found

```
No record found or date expired
         │
         ▼
   Admin popup notification
         │
         ├── [Approve] → PC Unlock → Session starts
         │
         └── [Reject]  → Entry denied (status: BLOCKED)
```

### Violation Case — Unauthorized Activity Detected

```
Non-academic site access detected
         │
         ▼
    PC auto-locked
         │
         ▼
   Admin popup triggered
         │
         ├── [Unlock]  → PC released
         ├── [Warning] → Warning sent, session continues
         └── [Ignore]  → Logged only, no further action
```

---

## 7. Tech Stack

> The following options are currently under review. Final selections will be confirmed during the implementation phase.

### Backend

| Option | Notes |
|--------|-------|
| Node.js | — |
| Python Flask | — |
| Python FastAPI | — |

### Database

| Option | Notes |
|--------|-------|
| PostgreSQL | Relational DB |
| MySQL | Relational DB |
| SQLite | Lightweight local DB |
| MongoDB | Non-relational DB |

### Frontend (Admin Dashboard)

| Option | Notes |
|--------|-------|
| React | — |
| Vue | — |
| HTML/CSS | — |

### PC Client Agent

| Option | Notes |
|--------|-------|
| C# | Native Windows |
| Python | Cross-platform |
| Electron | Cross-platform |

### Approval Document Storage

| Option | Notes |
|--------|-------|
| Google Sheets | Easy integration with existing school workflow |
| PostgreSQL / MySQL | Unified DB management |

---

## 📄 License

This project is for academic / educational purposes.

---

> This document is based on the Capstone Project System Design specification.
