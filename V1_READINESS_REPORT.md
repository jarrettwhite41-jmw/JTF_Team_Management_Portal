# V1 Readiness Report — All Portals
**Assessment Date:** June 29, 2026
**Assessed By:** V1 Release Manager (AI Agent)

---

## 🗺️ Ecosystem Summary

| Portal | Completion | Status | Biggest Gap |
|---|---|---|---|
| **Team** | ~75% | 🟡 Nearly Ready | Shows + Workshops pages still on Google Apps Script |
| **Instructor** | ~88% | 🟢 Nearly Ready | Workshops view missing; session log wiring unconfirmed |
| **Director** | ~8% | 🔴 Not Started | Entire portal needs to be built |
| **Cast** | ~5% | 🔴 Not Started | Entire portal needs to be built |
| **Student** | 0% | ⚫ Deferred | No scope; correctly post-V1 |

---

## 🏢 Team Portal — V1 Readiness Report
**Overall Status: ~75% — Nearly Ready**

### Completion Scorecard

| Workflow / Feature | Status | Evidence | Blocker |
|---|---|---|---|
| Auth / Login | ✅ Done | `App.tsx`, `authService.ts`, `portal_user_access` migration | — |
| Role-based page gating | ⚠️ Partial | `canAccessPage()` in `App.tsx` — client-side only | No server-side RLS enforcement on most tables |
| Portal Access Management | ✅ Done | `PortalAccess.tsx`, `upsert_portal_user_access_admin` RPC migration | — |
| Personnel Directory | ✅ Done | `PersonnelDirectory.tsx` + `supabaseService.ts` | — |
| Cast Directory | ✅ Done | `CastDirectory.tsx` | — |
| Crew Directory | ✅ Done | `CrewDirectory.tsx` | — |
| Bartenders | ✅ Done | `BartendersPage.tsx` | — |
| Teacher Management | ✅ Done | `TeacherManagement.tsx` | — |
| Director Management | ✅ Done | `DirectorManagement.tsx` | — |
| Student Directory + Profile | ✅ Done | `StudentDirectory.tsx`, `StudentProfile.tsx` | — |
| Class Registration | ✅ Done | `ClassRegistration.tsx` | — |
| **Shows / Productions** | ❌ Not Migrated | `Shows.tsx` still calls `gasService` (Google Apps Script) | Must migrate to `supabaseService` before GAS decommission |
| **Workshops** | ❌ Not Migrated | `Workshops.tsx` still calls `gasService` — schema migration exists but page never calls it | Must migrate to `supabaseService` before GAS decommission |
| Special Guests | ✅ Done | `SpecialGuests.tsx` | — |
| Inventory | ✅ Done | `Inventory.tsx` | — |
| Scheduling | ✅ Done | `Scheduling.tsx` | — |
| Data Import | ✅ Done | `DataImport.tsx` | — |
| Show Availability schema | ✅ Done | `20260525_add_cast_availability_and_notes.sql` | No UI to administer cutoff deadlines yet |
| Cast signup controls (enable/deadline) | ⚠️ Partial | Schema columns exist on `show_information` | No admin UI to set `cast_signup_enabled` / `cast_signup_deadline_at` |
| Activity/audit logging | ❌ Missing | Schema exists (`activity_events`) but no calls wired in service writes | — |
| Server-side RLS on core tables | ⚠️ Partial | `portal_user_access` RLS is solid; core tables lack per-role policies | — |

### GAS-Dependent Pages (Both Must Be Migrated)

| Page | Current Backend | Schema Migration Exists? | Priority |
|---|---|---|---|
| `Shows.tsx` | `gasService` | ✅ Yes | 🔴 Critical |
| `Workshops.tsx` | `gasService` | ✅ Yes (`20260514_add_workshops.sql`) | 🔴 Critical |

> **Workshops domain note:** Workshops are one-off events — a single date with `Title`, `WorkshopDate`, `StartTime`/`EndTime`, `Capacity`, and either an internal instructor or a Special Guest. They are completely separate from `class_offerings` (multi-session, level-based). Registrations tracked in `workshop_registrations`.

### Critical Blockers (must fix before V1)

1. **Shows.tsx uses Google Apps Script (`gasService`)** — The entire show management workflow breaks if GAS is decommissioned. Highest-priority fix.
2. **Workshops.tsx uses Google Apps Script (`gasService`)** — Same issue. Schema exists in Supabase (`workshops`, `workshop_registrations` tables) but page never calls it.
3. **No admin UI for cast signup controls** — `cast_signup_enabled` and `cast_signup_deadline_at` columns exist but no admin can set them from the portal. The Cast Portal cutoff enforcement is blocked by this.
4. **Client-side-only role gating** — `canAccessPage()` blocks UI only. Core tables need RLS policies matching the role matrix.

### Recommended Sequence to Close Gaps

1. Migrate `Shows.tsx` from `gasService` to `supabaseService`
2. Migrate `Workshops.tsx` from `gasService` to `supabaseService`
3. Add admin UI controls for `cast_signup_enabled` / `cast_signup_deadline_at` in show editor
4. Add server-side RLS on `show_information`, `show_performances`, `crew_duties` for director/cast roles
5. Wire `activity_events` inserts to high-value write operations (attendance, notes, enrollment changes)

### What's in Good Shape

16 of 20 functional areas are fully implemented on Supabase. The `portal_user_access` system, SECURITY DEFINER RPC, and provisioning UI are well-architected. The cast availability/notes schema is cleanly defined with history tracking and indexes.

---

## 🎓 Instructor Portal — V1 Readiness Report
**Overall Status: ~88% — Nearly Ready**

### Completion Scorecard

| Workflow / Feature | Status | Evidence | Blocker |
|---|---|---|---|
| Auth / Login + role enforcement | ✅ Done | `authService.ts`, `portal_user_access` lookup + email fallback | — |
| Dashboard (stats + enrollment bars) | ✅ Done | `Dashboard.tsx`, `supabasePortalService.getDashboardStats()` | — |
| Classes list + search + filter | ✅ Done | `Classes.tsx`, `ClassCard.tsx`, `ClassManagementModal.tsx` | — |
| Class management modal | ✅ Done | `ClassManagementModal.tsx` | — |
| Student Directory (search + filter) | ✅ Done | `StudentDirectory.tsx` | — |
| Student Profile (core info + enrollments + progression) | ✅ Done | `StudentProfile.tsx` | — |
| Add progress note to active enrollment | ✅ Done | `StudentProfile.tsx` → `supabasePortalService.addStudentProgressNote()` | — |
| Skill ratings per enrollment | ✅ Done | `StudentProfile.tsx` → `getSkillsWithCategories()`, `getSkillRatingsForEnrollment()` | — |
| Attendance submission | ✅ Done | `ClassManagementModal.tsx` + `updateClassAttendance()` | — |
| Progress summary page | ✅ Done | `Progress.tsx` — stats tiles + searchable active student list | — |
| Instructors list (search + cards) | ✅ Done | `Instructors.tsx`, `supabaseInstructorService.getAllInstructors()` | — |
| Game Library (read-only) | ✅ Done | `Games.tsx` — bonus feature, not in parity contract | — |
| Account page | ✅ Done | `Account.tsx` | — |
| Session logs (`saveSessionLog`) | ⚠️ Partial | Method exists in service; not confirmed called from UI | — |
| **Workshops view** | ❌ Missing | No page, no service methods for workshops in `supabasePortalService.ts` | Teachers can view/register per role matrix |
| **Show schedule visibility** | ❌ Missing | Role matrix: teachers can view shows; no page in Instructor Portal | — |
| Announcements | ❌ Missing | Role matrix: teachers can publish class-only announcements | Post-V1 acceptable |
| Activity event logging | ⚠️ Partial | `activity_events` table + RLS exists in migration; not confirmed wired to mutations | — |
| Teacher-scoped RLS enforcement | ⚠️ Partial | `personnelId` passed to service queries for filtering; full RLS policy enforcement not confirmed | — |

### Critical Blockers (must fix before V1)

1. **Workshops view missing** — Teachers should be able to see upcoming one-off workshop events and register. `supabasePortalService.ts` has zero workshop-related methods. Workshops are a different data model from classes (`workshops` + `workshop_registrations` tables).
2. **Session log wiring unconfirmed** — `saveSessionLog` is in the V1 parity contract as "Must Match Exactly." Service method exists but no clear UI call-site found.

### Recommended Sequence to Close Gaps

1. Verify `saveSessionLog` is called from `ClassManagementModal` — quick audit, likely a one-line fix if missing
2. Add `getWorkshops()` and `registerForWorkshop()` service methods to `supabasePortalService.ts`
3. Add a read-only Workshops page (upcoming one-off events with registration action)
4. Add read-only Show schedule page (shows relevant to teacher's classes/context)
5. Confirm `personnelId`-scoped queries are enforced at RLS layer, not just client filter

### What's in Good Shape

This is the most complete portal. Dashboard, Classes, Students, Progress, and Instructors are all fully implemented with Supabase. Skill rating system and progress notes go beyond baseline parity. Auth with email fallback and portal-scoped role lookup is solid.

---

## 🎬 Director Portal — V1 Readiness Report
**Overall Status: ~8% — Not Started (schema only)**

### Completion Scorecard

| Workflow / Feature | Status | Evidence | Blocker |
|---|---|---|---|
| `portal_user_access` schema support | ✅ Done | Migration `20260521` — `director` is a valid `portal_name` | — |
| `show_availability` table | ✅ Done | Migration `20260525` | — |
| `show_notes` / `show_game_notes` tables | ✅ Done | Migration `20260525`, `20260526` | — |
| Setlist visibility scope | ✅ Done | Migration `20260526` | — |
| Director portal app (any code) | ❌ Missing | No workspace folder, no `App.tsx`, no pages | — |
| Auth / Login | ❌ Missing | No portal exists | Needs portal scaffold |
| Dashboard | ❌ Missing | Blueprint defines it; nothing built | — |
| My Shows (assigned shows list) | ❌ Missing | — | Needs portal + Shows page |
| Cast availability review | ❌ Missing | `show_availability` table exists; no UI to read it | — |
| Show notes authoring | ❌ Missing | Tables exist; no UI | — |
| RLS: director-scoped show access | ❌ Missing | No migration implementing director ownership policies | Needs `show_information.director_id` → `portal_user_access` join policy |
| Profile page | ❌ Missing | — | — |
| Mobile-first bottom nav | ❌ Missing | Blueprint defines tab layout; nothing built | — |

### Critical Blockers (must fix before V1)

1. **No portal exists** — Full scaffold needed: workspace, Vite config, `App.tsx`, auth flow, and routing.
2. **No RLS for director-scoped show access** — Director ownership chain (`show_information.director_id` → `directors.director_id` → `personnel_id` → `portal_user_access.auth_user_id`) not implemented as a migration. Without it, directors see all shows or no shows.
3. **No cast availability read UI** — Schema is ready; portal to consume it doesn't exist.
4. **No show notes authoring** — Tables exist; UI for directors to write cast-visible notes is absent.

### Recommended Sequence to Close Gaps

1. Scaffold Director Portal (copy Instructor Portal structure — same Vite + Supabase + React pattern)
2. Implement auth + role lookup for `portal_name = 'director'`
3. Write director-scoped RLS migration for `show_information`
4. Build My Shows page (assigned shows list)
5. Build Availability tab (read `show_availability` for owned shows)
6. Build Notes tab (write `show_notes` and `show_game_notes`)
7. Build Dashboard and Profile

### What's in Good Shape

Database foundation is well ahead of the UI. `show_availability`, history table, `show_notes`, `show_game_notes` with visibility scopes, and `portal_user_access` are all in place. Blueprint is detailed and actionable. Starting from scratch is low risk because schema contracts are clear.

---

## 🎭 Cast Portal — V1 Readiness Report
**Overall Status: ~5% — Not Started (schema only)**

### Completion Scorecard

| Workflow / Feature | Status | Evidence | Blocker |
|---|---|---|---|
| `portal_user_access` schema support | ✅ Done | Migration — `cast` is valid `portal_name` | — |
| `show_availability` table + history | ✅ Done | Migration `20260525` | — |
| Cast signup controls on `show_information` | ✅ Done | `cast_signup_enabled`, `cast_signup_deadline_at` columns | No admin UI in Team Portal to set them |
| Cast RLS on `show_notes` (assigned shows) | ✅ Done | Migration `20260527` | — |
| Cast RLS on `show_game_notes` (assigned shows) | ✅ Done | Migration `20260527` | — |
| Cast portal app (any code) | ❌ Missing | No workspace folder, no `App.tsx`, no pages | — |
| Auth / Login | ❌ Missing | No portal exists | Needs portal scaffold |
| Dashboard (upcoming shows, crew duties) | ❌ Missing | Scope defined; nothing built | — |
| Show Discovery (eligible shows list) | ❌ Missing | — | Needs portal + RLS for cast show visibility |
| Availability Submission form | ❌ Missing | Table exists; no UI | — |
| Availability Cutoff enforcement | ❌ Missing | Column exists; no enforcement logic | Depends on Team Portal admin UI to set deadlines |
| Calendar Tab | ❌ Missing | — | — |
| Notes Visibility (show/game/personal) | ❌ Missing | RLS exists; no UI | — |
| Roster Visibility | ❌ Missing | — | — |
| Availability History | ❌ Missing | History table exists; no UI | — |
| Mobile-first UI | ❌ Missing | Explicitly required in scope doc; nothing built | — |

### Critical Blockers (must fix before V1)

1. **No portal exists** — Full scaffold needed.
2. **No RLS for cast show visibility** — Cast members should only see shows they are assigned to or eligible for. No policy enforces this yet.
3. **Cutoff enforcement depends on Team Portal admin UI** — `cast_signup_deadline_at` exists in schema but Team Portal has no UI to set it. Cast Portal cutoff logic is blocked by this.
4. **Availability submission has no UI** — The most critical workflow in the entire Cast Portal scope has zero front-end implementation.

### Recommended Sequence to Close Gaps

1. Add cast signup deadline controls to Team Portal show editor (unblocks cutoff logic)
2. Scaffold Cast Portal (same pattern as Instructor Portal)
3. Write RLS: cast can see shows where they have a `show_performances` row or `cast_signup_enabled = true`
4. Build auth + login for `portal_name = 'cast'`
5. Build Show Discovery page (eligible shows)
6. Build Availability Submission (the core V1 workflow — must be under 30 seconds on mobile per scope doc)
7. Build Dashboard and Calendar
8. Build Notes visibility pages
9. Implement cutoff enforcement in UI

---

## 📚 Student Portal — V1 Readiness Report
**Overall Status: 0% — Deferred (No Scope Document)**

| Workflow / Feature | Status | Evidence | Blocker |
|---|---|---|---|
| Any portal code | ❌ Missing | No workspace folder | — |
| Scope / requirements document | ❌ Missing | Listed as "post-V1" in roadmap | — |
| Student data (in other portals) | ✅ Exists | Students viewable in Team + Instructor portals by admins/teachers | — |

**Verdict:** Correctly deferred per roadmap. Do not start until Director and Cast portals ship.

---

## Recommended V1 Sprint Order

```
1. Fix Team Portal:       Migrate Shows.tsx to Supabase
2. Fix Team Portal:       Migrate Workshops.tsx to Supabase
3. Fix Team Portal:       Add cast signup deadline admin UI in show editor
4. Fix Instructor Portal: Verify saveSessionLog wiring; add Workshops page + Show schedule page
5. Build Director Portal: Scaffold → Auth → RLS → My Shows → Availability → Notes → Dashboard
6. Build Cast Portal:     Scaffold → Auth → RLS → Show Discovery → Availability Submission → Dashboard
7. Cross-portal:          Server-side RLS audit across Team + Instructor core tables
```

> Director and Cast portals share the same schema foundation — building them in parallel is viable since they only depend on shared tables that already exist.

---

*Last updated: June 29, 2026. Re-run V1 Release Manager agent to refresh this report after gaps are closed.*
