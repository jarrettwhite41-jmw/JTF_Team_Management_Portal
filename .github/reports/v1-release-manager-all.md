# V1 Readiness Scorecard — JTF Portal Ecosystem
**Assessment Date:** June 29, 2026  
**Assessed By:** V1 Release Manager (AI Agent)

---

## Executive Summary

| Portal | Completion | Status | Readiness | Estimated Fix Time |
|---|---|---|---|---|
| **Team** | ~75% | 🟡 Nearly Ready | Release-blocking issues exist | 1–2 weeks |
| **Instructor** | ~88% | 🟢 Nearly Ready | ~2 missing features | 1 week |
| **Director** | ~8% | 🔴 Not Started | Entire portal needed | 2–3 weeks |
| **Cast** | ~5% | 🔴 Not Started | Entire portal needed | 3–4 weeks |
| **Student** | 0% | ⚫ Deferred | No scope doc | Post-V1 |
| **Ecosystem** | ~37% | 🔴 High Risk | Multiple critical blockers | 6–8 weeks to V1 |

**V1 Go/No-Go Decision:** **NO-GO** — Critical infrastructure blockers and missing portals prevent release.

---

## Critical Blockers (Blocking V1 Release)

### 🔴 Blocker 1: Team Portal — Google Apps Script Decommissioning Risk
**Impact:** HIGH — Affects both Team and downstream portals  
**Status:** Both Show and Workshop workflows still depend on `gasService`

**Details:**
- `Shows.tsx` calls `gasService.getShowList()`, `gasService.createShow()`, etc.
- `Workshops.tsx` calls `gasService.getWorkshops()` despite schema migration existing
- If Google Apps Script is decommissioned, shows/workshops become unavailable to all portals
- This blocks Teams' ability to prep show data for Director/Cast portals

**Fix:** Migrate both pages from `gasService` to `supabaseService` (2–3 days)

---

### 🔴 Blocker 2: Cast Portal Missing Cast Signup Deadline Admin UI
**Impact:** MEDIUM — Cascades to Cast Portal cutoff enforcement  
**Status:** Schema columns exist but no admin controls

**Details:**
- `show_information` table has `cast_signup_enabled` and `cast_signup_deadline_at` columns
- Team Portal show editor has no UI to set these values
- Cast Portal cannot enforce cutoff if deadline is never set
- Director Portal cannot inform cast of "open until when" when reviewing availability

**Fix:** Add UI controls to Team Portal show editor (1–2 days)

---

### 🔴 Blocker 3: Director Portal Does Not Exist
**Impact:** CRITICAL — Entire workflow missing  
**Status:** No code, schema foundation ready

**Details:**
- No workspace folder, no `App.tsx`, no pages
- RLS policies for director-scoped show access not implemented
- Directors cannot manage assigned shows, review cast availability, or author notes
- Blueprint exists and is detailed; execution blocked only by engineering capacity

**Fix:** Full scaffold + auth + pages + RLS (2–3 weeks)

---

### 🔴 Blocker 4: Cast Portal Does Not Exist
**Impact:** CRITICAL — Entire workflow missing  
**Status:** No code, schema foundation ready

**Details:**
- No workspace folder, no `App.tsx`, no pages
- RLS policies for cast-scoped show visibility not implemented
- Cast members cannot declare availability or review notes
- Scope explicitly defines mobile-first requirement; zero UI exists

**Fix:** Full scaffold + auth + pages + RLS (3–4 weeks)

---

### 🟠 Blocker 5: Teacher/Director Role Enforcement Not Server-Side
**Impact:** MEDIUM — Data permission risk  
**Status:** Client-side gating only; RLS incomplete

**Details:**
- `canAccessPage()` in Instructor Portal `App.tsx` blocks UI only
- Most core tables (`class_offerings`, `show_information`, `student_enrollments`) lack RLS policies
- If a role-bearer's auth token is manipulated, they may read/write data outside their scope
- `personnel_id` is passed to service queries for filtering, but RLS is not enforcing it

**Fix:** Add RLS policies to core tables matching role matrix (3–4 days)

---

## Portal-by-Portal Status

### 🏢 Team Portal — Overall Status: ~75% — Nearly Ready

#### Completion Scorecard

| Workflow / Feature | Status | Evidence | Notes |
|---|---|---|---|
| Auth / Login | ✅ Done | `authService.ts`, `portal_user_access` table | Solid implementation |
| Role-based page gating | ⚠️ Partial | `canAccessPage()` in `App.tsx` | Client-side only; needs RLS |
| Portal Access Management | ✅ Done | `PortalAccess.tsx`, `upsert_portal_access_admin` RPC | Well-architected |
| Personnel Directory | ✅ Done | `PersonnelDirectory.tsx` + `supabaseService` | Fully functional |
| Cast Directory | ✅ Done | `CastDirectory.tsx` | Fully functional |
| Crew Directory | ✅ Done | `CrewDirectory.tsx` | Fully functional |
| Bartenders Management | ✅ Done | `BartendersPage.tsx` | Fully functional |
| Teacher Management | ✅ Done | `TeacherManagement.tsx` | Fully functional |
| Director Management | ✅ Done | `DirectorManagement.tsx` | Fully functional |
| Student Directory | ✅ Done | `StudentDirectory.tsx` + `StudentProfile.tsx` | Fully functional |
| Class Registration | ✅ Done | `ClassRegistration.tsx` | Fully functional |
| **Shows Management** | ❌ Not Migrated | `Shows.tsx` still uses `gasService` | **CRITICAL BLOCKER** |
| **Workshops Management** | ❌ Not Migrated | `Workshops.tsx` still uses `gasService`; schema exists | **CRITICAL BLOCKER** |
| Special Guests | ✅ Done | `SpecialGuests.tsx` | Fully functional |
| Inventory Management | ✅ Done | `InventoryPage.tsx` | Fully functional |
| Scheduling | ✅ Done | `Scheduling.tsx` | Fully functional |
| Data Import | ✅ Done | `DataImport.tsx` | Fully functional |
| Cast Availability Schema | ✅ Done | `20260525_add_cast_availability_and_notes.sql` | Tables created with indexes |
| **Cast Signup Controls** | ⚠️ Partial | Schema columns exist; no admin UI | Needs show editor controls |
| Activity Event Logging | ❌ Missing | Table exists; no service integrations | Wiring needed |
| Server-side RLS | ⚠️ Partial | `portal_user_access` has policies; core tables missing | Needs completion |

#### Recommended Fixes (Priority Order)

1. **Migrate `Shows.tsx` to Supabase** (2–3 days)
   - Replace `gasService` calls with `supabaseService`
   - Test show CRUD operations end-to-end
   - Verify show data flows to Instructor, Director, Cast portals

2. **Migrate `Workshops.tsx` to Supabase** (1–2 days)
   - Add workshop read/write methods to `supabaseService`
   - Update page to use new methods
   - Test workshop registration flow

3. **Add cast signup deadline UI to show editor** (1 day)
   - Add form inputs for `cast_signup_enabled` and `cast_signup_deadline_at`
   - Persist changes to `show_information` via RPC
   - Add helper text explaining cutoff behavior

4. **Add RLS policies to core tables** (3–4 days)
   - Implement role-scoped SELECT policies on `show_information`, `show_performances`, `crew_duties`
   - Add role-scoped UPDATE/DELETE policies for editable tables
   - Test with admin, director, teacher, cast, student roles

5. **Wire `activity_events` logging to write operations** (2–3 days)
   - Insert events on attendance update, note creation, enrollment status change
   - Verify event data captures actor role and timestamp
   - Test query performance with month-range filters

---

### 🎓 Instructor Portal — Overall Status: ~88% — Nearly Ready

#### Completion Scorecard

| Workflow / Feature | Status | Evidence | Notes |
|---|---|---|---|
| Auth / Login + role enforcement | ✅ Done | `authService.ts`, email-based fallback | Excellent UX |
| Dashboard (stats + enrollment bars) | ✅ Done | `Dashboard.tsx`, multi-segment bars, KPI tiles | Parity verified |
| Classes List (search + filter) | ✅ Done | `Classes.tsx`, filter by status, search by instructor/level/room | Parity verified |
| Class Management Modal | ✅ Done | `ClassManagementModal.tsx`, CRUD operations | Parity verified |
| Student Directory (search + filter) | ✅ Done | `StudentDirectory.tsx`, filter by status | Parity verified |
| Student Profile | ✅ Done | `StudentProfile.tsx`, enrollments + progression | Parity verified |
| Add Progress Note | ✅ Done | Note creation attached to active enrollment | Parity verified |
| Skill Ratings | ✅ Done | Per-enrollment 1–5 rating system | Beyond parity, good feature |
| Attendance Submission | ✅ Done | `ClassManagementModal.tsx` + `updateClassAttendance()` | Parity verified |
| Progress Page | ✅ Done | `Progress.tsx`, active student list, metrics | Parity verified |
| Instructors List | ✅ Done | `Instructors.tsx`, search + summary counts | Parity verified |
| Game Library (read-only) | ✅ Done | `Games.tsx` — bonus feature | Nice-to-have |
| Account Page | ✅ Done | `Account.tsx` — profile + password update | Parity verified |
| Session Log Capture | ⚠️ Partial | Service method exists; UI call-site not confirmed | Needs verification |
| **Workshops View** | ❌ Missing | No page, no service methods | **Parity gap** |
| **Show Schedule View** | ❌ Missing | No page; teachers should see assigned shows | **Parity gap** |
| Announcements | ❌ Missing | Out of scope for V1 per roadmap | Post-V1 acceptable |
| Activity Event Logging | ⚠️ Partial | Table exists in migration; wiring not confirmed | Needs verification |
| Teacher-Scoped RLS | ⚠️ Partial | Queries filtered by `personnelId`; full RLS not confirmed | Needs verification |

#### Recommended Fixes (Priority Order)

1. **Verify `saveSessionLog` wiring** (1 day)
   - Search for calls to `saveSessionLog()` in pages/components
   - If missing, add call when user loads a class management modal
   - Confirm event persists to database

2. **Add Workshops page** (1–2 days)
   - Create `pages/Workshops.tsx`
   - Add `getWorkshops()` and `registerForWorkshop()` methods to `supabasePortalService.ts`
   - Display upcoming workshops with registration option

3. **Add Show Schedule page** (1–2 days)
   - Create `pages/ShowSchedule.tsx`
   - Query shows assigned to teacher's context
   - Display as read-only calendar or list

4. **Confirm RLS policies are enforced** (2–3 days)
   - Audit `supabasePortalService` queries to ensure `personnel_id` filtering
   - Write RLS tests verifying teacher A cannot read teacher B's data
   - Confirm policies exist on all write-heavy tables

---

### 🎬 Director Portal — Overall Status: ~8% — Not Started

#### Status Summary

| Component | Status | Notes |
|---|---|---|
| Portal scaffold (App.tsx, routing, layout) | ❌ Missing | Copy Instructor Portal pattern |
| Auth + login | ❌ Missing | Needs director role + email fallback |
| RLS for director-scoped show access | ❌ Missing | Critical blocker |
| Dashboard page | ❌ Missing | Show upcoming assigned shows, notes activity |
| My Shows page | ❌ Missing | Core page — list of assigned shows |
| Availability tab | ❌ Missing | Read `show_availability` table for assigned shows |
| Notes tab | ❌ Missing | CRUD for show/game/personnel notes |
| Profile page | ❌ Missing | User profile + password update |
| Mobile-first UI | ❌ Missing | Blueprint requires responsive bottom nav |

#### Schema Foundation (Ready)

✅ `portal_user_access` — `director` role supported  
✅ `show_availability` table with history  
✅ `show_notes`, `show_game_notes`, `show_personnel_notes` tables  
✅ Setlist visibility scope  

**Blocker:** Director ownership chain not implemented as RLS policy.

#### Recommended Sequence (3–4 weeks)

1. **Scaffold Director Portal** (2–3 days)
   - Create workspace folder: `JTF_Director_Portal`
   - Copy Instructor Portal's Vite + React + Supabase structure
   - Set up `App.tsx`, routing, auth guard

2. **Auth + role lookup** (2 days)
   - Implement `getDirectorAccess()` in auth service
   - Add email-based fallback self-linking
   - Test login flow with director user

3. **Director-scoped RLS migration** (1–2 days)
   - Create migration implementing director ownership chain:  
     `show_information.director_id` → `directors` → `personnel_id` → `portal_user_access.auth_user_id`
   - Add non-recursive helper function
   - Test policies with multiple director roles

4. **My Shows page** (2–3 days)
   - Display assigned shows with status badges
   - Card layout with show date, venue, cast count
   - Click through to show details

5. **Availability tab** (2–3 days)
   - Query `show_availability` grouped by status (Available, Alternate, Not Available, No Response)
   - Add role-based quick filters
   - Display cast member names and contact info

6. **Notes tab** (3–4 days)
   - Create forms for show-level, game-level, and personnel-specific notes
   - Implement visibility scope enforcement (directors only author, cast only read)
   - Add note history timestamp

7. **Dashboard + Profile** (2 days)
   - Dashboard: stats tiles, upcoming shows, recent notes
   - Profile: user info, password change

**Critical Path:** Auth + RLS → My Shows (validate director scope) → Availability → Notes

---

### 🎭 Cast Portal — Overall Status: ~5% — Not Started

#### Status Summary

| Component | Status | Notes |
|---|---|---|
| Portal scaffold | ❌ Missing | Copy Instructor Portal pattern |
| Auth + login | ❌ Missing | Cast role + email fallback |
| RLS for cast show visibility | ❌ Missing | Critical blocker |
| Show Discovery page | ❌ Missing | List eligible shows (upcoming + draft) |
| Availability Submission form | ❌ Missing | Core workflow — set status per show |
| Availability Cutoff enforcement | ❌ Missing | Depends on Team Portal admin UI (blocker) |
| Dashboard | ❌ Missing | Shows signed up for, crew duties, performance history |
| Calendar tab | ❌ Missing | Read-only upcoming show dates + quick-set availability |
| Notes visibility pages | ❌ Missing | Show/game/personal level notes view |
| Roster visibility | ❌ Missing | View other cast on assigned shows |
| Mobile-first UI | ❌ Missing | Scope explicitly requires responsive design |

#### Schema Foundation (Ready)

✅ `portal_user_access` — `cast` role supported  
✅ `show_availability` + history tracking  
✅ `show_notes`, `show_game_notes`, `show_personnel_notes` with visibility scopes  
✅ RLS for cast read on `show_notes` tables  

**Blocker:** Cast show visibility RLS not implemented; cutoff deadline admin UI missing in Team Portal.

#### Scope Requirement (from CAST_PORTAL_MVP_SCOPE_V1.md)

> "Cast members can update availability for eligible shows in under 30 seconds on mobile."

This is the critical success metric. The entire portal exists to enable this one workflow efficiently.

#### Recommended Sequence (4–5 weeks)

**Prerequisite:** Complete Blocker 2 (Team Portal cast signup deadline admin UI) before starting Cast Portal.

1. **Scaffold Cast Portal** (2–3 days)
   - Create workspace folder: `JTF_Cast_Portal`
   - Copy Instructor Portal structure
   - Set up `App.tsx`, bottom tab nav (Dashboard, My Shows, Availability, Notes, Profile)

2. **Auth + role lookup** (2 days)
   - Implement `getCastAccess()` in auth service
   - Add email-based self-linking
   - Test login with cast user

3. **Cast-scoped RLS migration** (2–3 days)
   - Policy: cast can read `show_information` where:
     - `cast_signup_enabled = true`, OR
     - `show_performances` row exists for their `personnel_id`
   - Cast can read `show_availability` rows for those shows
   - Cast can write own `show_availability` rows (status + note) until deadline
   - Test with multiple cast members

4. **Show Discovery page** (2–3 days)
   - Query eligible shows (`cast_signup_enabled = true` OR `show_performances` contains cast member)
   - Filter by upcoming/draft/past
   - Card layout with show date, venue, cast size, status badge

5. **Availability Submission form** (2–3 days)
   - **Critical UX:** Under 30 seconds on mobile
   - Show list with quick-tap buttons: Available | Alternate | Not Available
   - Optional note field
   - Deadline countdown warning
   - "Changes saved" confirmation

6. **Dashboard** (2–3 days)
   - Shows signed up for (by status)
   - Crew duties (upcoming, past, total)
   - Recent performance count

7. **Calendar tab** (2–3 days)
   - Upcoming show dates in calendar view
   - Tap show → inline quick-set availability
   - Cutoff indicator

8. **Notes visibility** (2–3 days)
   - Display show-level notes (cast can see)
   - Display game-level notes (cast can see)
   - Display personnel-level notes (only if addressed to cast member)
   - Add created_by + timestamp

9. **Roster visibility** (1–2 days)
   - List other cast members on assigned shows
   - Name, role, contact info (if permitted)

**Critical Path:** Auth + RLS → Show Discovery → Availability Submission (30-second test on mobile) → Dashboard

---

### 📚 Student Portal — Overall Status: 0% — Correctly Deferred

**Status:** No scope document; no code; not required for V1 release.

**Decision:** Do not start until Director + Cast portals ship and roles stabilize.

**Next Steps:** Product owner to define student self-service scope after V1 launches.

---

## Recommended V1 Sprint Order

### Sprint 1 (Week 1): Unblock Team Portal

| Task | Effort | Owner | Validation |
|---|---|---|---|
| Migrate `Shows.tsx` from `gasService` to `supabaseService` | 2–3d | Backend Lead | All show CRUD ops work end-to-end |
| Migrate `Workshops.tsx` from `gasService` to `supabaseService` | 1–2d | Backend Lead | Workshop list + registration flow works |
| Add cast signup deadline UI to show editor | 1d | Frontend Lead | Admin can set `cast_signup_enabled` + deadline; checked by Team Portal tests |
| Add RLS policies to core Team tables | 3–4d | DBA + Backend | Role-scoped policy tests pass; no cross-scope data access |

**Exit Criteria:** No more `gasService` calls in Team Portal; cast signup controls set; RLS audit complete.

---

### Sprint 2 (Week 2): Close Instructor Portal Gaps

| Task | Effort | Owner | Validation |
|---|---|---|---|
| Verify + wire `saveSessionLog()` | 1d | Frontend Lead | Session log entries created on class view |
| Add Workshops page + service methods | 1–2d | Frontend Lead | Teachers can see + register for workshops |
| Add Show Schedule page | 1–2d | Frontend Lead | Teachers see assigned shows with read-only access |
| Confirm RLS enforcement on core tables | 2–3d | DBA + QA | Unauthorized role-access tests fail as expected |

**Exit Criteria:** All 9 Teacher V1 parity workflows fully implemented; RLS verified.

---

### Sprint 3–4 (Weeks 3–4): Build Director Portal

| Task | Effort | Owner | Validation |
|---|---|---|---|
| Scaffold portal + auth | 2–3d | Frontend Lead | Director login succeeds; role lookup works |
| Write director-scoped RLS migration | 2–3d | DBA + Backend | Directors only see assigned shows |
| Implement My Shows + Availability pages | 3–4d | Frontend Lead | My Shows list shows only assigned shows; availability roster displays per-show |
| Implement Notes authoring + visibility | 3–4d | Frontend Lead | Notes persist; cast-visible scopes enforced |
| Dashboard + Profile | 2d | Frontend Lead | Stats tiles + user profile page renders |

**Exit Criteria:** Director can log in, see assigned shows, manage notes, review cast availability. All workflows under UAT.

---

### Sprint 5–6 (Weeks 5–6): Build Cast Portal

| Task | Effort | Owner | Validation |
|---|---|---|---|
| Scaffold portal + auth | 2–3d | Frontend Lead | Cast login succeeds; role lookup works |
| Write cast-scoped RLS migration | 2–3d | DBA + Backend | Cast only sees eligible shows |
| Implement Show Discovery + Availability Submission | 3–4d | Frontend Lead | **30-second mobile test passes** |
| Implement Dashboard + Calendar + Notes + Roster | 3–4d | Frontend Lead | All dashboard widgets render; calendar shows shows |
| Mobile responsiveness audit | 2d | QA | Responsive design passes on small screens |

**Exit Criteria:** Cast can log in, update availability in <30 seconds on mobile, see notes, view roster. All workflows under UAT.

---

### Sprint 7 (Week 7): Cross-Portal Hardening

| Task | Effort | Owner | Validation |
|---|---|---|---|
| Wire activity event logging across all portals | 2–3d | Backend Lead | Attendance, notes, status changes log events |
| Role-based regression suite (Team, Instructor, Director, Cast) | 3–4d | QA | All role-based workflows pass; no permission leaks |
| Production smoke tests + deployment runbook | 1–2d | DevOps + Backend | Rollback steps documented; hotfix path clear |

**Exit Criteria:** No high-severity security issues; all regression tests passing; runbook approved by ops.

---

### Sprint 8 (Week 8): UAT + Go-Live Prep

| Task | Effort | Owner | Validation |
|---|---|---|---|
| End-to-end UAT with stakeholder users | 3–4d | QA + Product | All user stories approved; no blocking bugs |
| Performance + load testing | 2–3d | DevOps + QA | Sub-200ms P95 latency; handles concurrent users |
| Security advisor final review | 1–2d | Security Lead | No critical findings; known low-risk items documented |
| Go-live readiness sign-off | 1d | Product + Ops | Decision made: Ready / Hold / Rollback plan |

**Total Timeline:** 8 weeks from start to V1 release.

---

## Risk Assessment

### 🔴 High Risks

1. **Director Portal scale** — Building a new portal from scratch in parallel with Cast Portal taxes resources. Recommend sequential vs. parallel if resources are limited.
2. **Mobile responsiveness on Cast Portal** — 30-second requirement on mobile is tight. UX testing should begin in Sprint 5.
3. **Director ownership chain RLS complexity** — Multi-table join policies can be fragile. Thorough policy testing required.

### 🟠 Medium Risks

1. **Activity event logging wiring** — If wired late, high chance of inconsistent logging. Start in Sprint 1, not Sprint 7.
2. **Workshops scope ambiguity** — Workshops are distinct from classes but not fully documented. Clarify data model with product owner before implementation.
3. **Cast signup deadline defaults** — If admin doesn't set deadline, cast get confused about cutoff. Add defaults + clear admin UX guidance.

### 🟢 Low Risks

1. **Instructor Portal parity** — 88% complete; remaining gaps are well-defined. Low scope creep risk.
2. **Schema foundation** — Most portal-critical tables already exist. Build on solid ground.

---

## Success Criteria for V1 Release

### Functional

- ✅ Team Portal: No `gasService` calls; workshops + shows fully functional
- ✅ Instructor Portal: All 9 teacher workflows passing parity contract
- ✅ Director Portal: Directors can manage assigned shows + notes + availability review
- ✅ Cast Portal: Cast can update availability in <30 seconds on mobile; notes visible
- ✅ Cross-portal: Role-scoped RLS enforced; no unauthorized data access

### Non-Functional

- ✅ Sub-200ms P95 API latency across all portals
- ✅ No high-severity security issues
- ✅ Activity event logging captures all write operations
- ✅ Rollback runbook documented + tested
- ✅ All stakeholder UAT sign-off

---

## Next Steps (Today)

1. **Prioritize Sprint 1 work** — Get Team Portal off `gasService` immediately
2. **Confirm engineering capacity** — Director + Cast portal builds require ~6–8 person-weeks; verify team size
3. **Schedule stakeholder UAT kickoff** — Book date for end-of-Sprint-2 review
4. **Assign DBA to RLS work** — Policy complexity requires specialist; don't defer
5. **Brief product owner on timeline** — 8 weeks is realistic only if priorities stay fixed; scope creep adds weeks

---

*Last updated: June 29, 2026  
Next review: After Sprint 1 (1 week)  
Rerun V1 Release Manager to refresh after major milestones.*
