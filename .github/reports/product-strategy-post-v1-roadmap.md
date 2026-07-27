# Post-V1 Strategic Roadmap — JTF Portal Ecosystem

**Document Date:** June 29, 2026  
**Status:** Strategic Planning Phase  
**Scope:** Features for Phase 2–4 delivery (post-V1 MVP)  

---

## Executive Summary

V1 launches with **Team Portal (~75%), Instructor Portal (~88%), Director Portal MVP foundation, and Cast Portal foundation**. This roadmap identifies **10 high-impact strategic features** that extend user value without requiring new external services, leveraging the existing Supabase infrastructure already in place.

**Key Insight:** Five critical pain points emerge from V1 scope analysis:
1. **Directors cannot directly message cast members** — Staff coordination happens via notes only.
2. **No real-time notifications** — Users must manually check portals for updates.
3. **No centralized activity feeds** — Activity events exist but are invisible to users.
4. **No scheduling intelligence** — Directors manually cross-reference availability; no AI suggestions.
5. **No performance analytics** — Team admins have no visibility into show fill rates, cast responsiveness, or program health metrics.

This roadmap prioritizes features that **compound user value** (each feature builds on the last) and are **infrastructure-ready** (Supabase RLS, Realtime, and history tables already exist).

---

## Pain Point Analysis: V1 Gaps by Persona

### Team Admin
- ❌ Cannot see cross-portal activity audit trail without database queries
- ❌ No alerts when critical deadlines approach (cast signup closes, show staffing incomplete)
- ❌ No metrics on show fill rates, average cast response time, or cast member reliability
- ❌ Cannot broadcast announcements to multiple portals/roles simultaneously
- ❌ Activity logging exists but is not human-readable or exportable

### Director
- ❌ Cannot send direct messages to cast members about availability or show prep
- ❌ Must manually note cast availability changes; no real-time updates
- ❌ No scheduling suggestions based on past cast performance or conflict analysis
- ❌ Cannot see cast member portfolios (past show history, crew duties, skills)
- ❌ No way to request availability updates or send deadline reminders

### Instructor
- ❌ Cannot message students outside of individual progress notes
- ❌ No view of student learning patterns or predictive feedback
- ❌ Cannot announce class updates to all students simultaneously
- ❌ No integration between class progress and show/workshop participation

### Cast Member
- ❌ No visibility into past performance feedback or portfolio
- ❌ No direct communication channel with directors except show notes
- ❌ Cannot receive push notifications for show deadlines or assignments
- ❌ Cannot see recommended shows based on past assignments or skills

### Student
- ⚠️ **Deferred to post-V1** but will need: learning pathway recommendations, peer collaboration, progress predictions

---

## Recommended Features (Prioritized by Effort × Impact)

| # | Feature | Phase | User Benefit | Effort | Impact | Infrastructure Ready | Dependencies |
|---|---|---|---|---|---|---|---|
| 1 | **Real-Time Notifications** | Phase 2 | Users see live updates (availability, assignments, messages) without manual refresh | Medium | High | ✅ Supabase Realtime + Activity Events | Activity logging must be wired in V1 |
| 2 | **Portal Messaging (Directors ↔ Cast)** | Phase 2 | Directors can send direct messages to cast; cast receives notifications and can reply | Medium | High | ✅ RLS on new `portal_messages` table | Portal access auth already in place |
| 3 | **Activity Feed (Per-Portal)** | Phase 2 | Users see timestamped audit trail of changes (who changed what, when) | Low | Medium | ✅ Activity events table exists | Wire logging to V1 write operations |
| 4 | **Cast Member Portfolio** | Phase 2 | Cast can view career history: past shows, crew duties, skills, feedback | Low | Medium | ✅ History tables exist | Requires portfolio schema + RLS |
| 5 | **Search & Discovery** | Phase 3 | Full-text search for shows, classes, cast members, notes; discoverable across all portals | Medium | High | ✅ PostgreSQL `tsvector` support | Search schema design required |
| 6 | **Scheduling Recommendations** | Phase 3 | Director receives AI-assisted casting suggestions based on cast availability + past reliability | High | High | ⚠️ Partial — availability data exists; needs ML pipeline | Availability conflict detection logic |
| 7 | **Performance Analytics Dashboard** | Phase 3 | Team admins see KPIs: show fill rates, cast response times, attendance trends, instructor effectiveness | High | High | ✅ History tables + aggregations | Reporting query templates needed |
| 8 | **Cross-Portal Announcements** | Phase 3 | Admins publish announcements to all portals/roles; users see in unified inbox | Medium | Medium | ✅ RLS + new `announcements` table | Portal routing logic |
| 9 | **Mobile Push Notifications** | Phase 3 | Users opt into mobile alerts for shows, messages, assignments (requires service worker) | Medium | Medium | ⚠️ Partial — Firebase/Expo integration required | Device token storage schema |
| 10 | **Availability Conflict Detection** | Phase 4 | Director receives warnings when multiple shows conflict; auto-suggest alternates | High | Medium | ⚠️ Partial — availability tables exist; needs logic layer | Requires Phase 3 scheduling recommendations |

---

## Phase Recommendations & Delivery Sequencing

### Phase 2 (Q3 2026): Core Communication & Visibility
**Goal:** Enable real-time communication and activity visibility across portals.  
**User Impact:** Directors can contact cast immediately; all users see live updates.  
**Effort:** ~8 weeks (two-person team)

**Features in Phase 2:**
1. **Real-Time Notifications** (Week 1–2)
   - Wire activity logging to key V1 write operations (attendance, notes, enrollments, availability updates)
   - Build notification service consuming `activity_events` table
   - Integrate Supabase Realtime subscriptions in frontend
   - Push notifications to redux/store on activity events
   - **Result:** Users see "Cast Member Jane marked available" in real-time

2. **Portal Messaging** (Week 3–5)
   - Schema: `portal_messages(id, from_user_id, to_user_id, show_id, body, created_at, read_at, ...)`
   - RLS: Cast can read own messages; Directors can read messages from own shows' cast
   - UI: Simple message thread per show, notification badge
   - **Result:** Director sends "Please confirm availability for 7/15 show" directly to cast

3. **Activity Feeds** (Week 5–7)
   - Surface `activity_events` in per-role dashboards (Team Admin sees all; Director sees own shows; Instructor sees own classes)
   - Timeline UI: "June 28, 3:45 PM — Sarah marked available for Mystery Show" with actor/role/timestamp
   - **Result:** Transparency on who made changes and when

4. **Cast Member Portfolio** (Week 7–8)
   - Schema: Add computed view joining `show_performances`, `crew_duties`, `student_competencies`
   - UI: "My Career" tab in Cast Portal showing past shows, roles, crew assignments, skills
   - **Result:** Cast can showcase work to directors; portfolio visible in portfolio view during casting

**Technical Notes:**
- No new external services needed; all leverage existing Supabase tables
- Activity logging requires only service layer changes (ensure `activity_events` inserts on all writes)
- Realtime subscriptions use Supabase native client library (no polling)

**Success Metrics:**
- Message response time < 5 minutes (directors reachable)
- 80%+ of portal users enable notifications
- Activity feed surfaces 95%+ of operational changes within 10 seconds
- Cast portfolio viewed in 40%+ of director casting sessions

---

### Phase 3 (Q4 2026–Q1 2027): Intelligence & Analytics
**Goal:** Enable directors to make faster staffing decisions; admins to understand program health.  
**User Impact:** Casting becomes 3x faster; admins catch problems early.  
**Effort:** ~10 weeks (two-person team + optional ML eng contract)

**Features in Phase 3:**

1. **Search & Discovery** (Week 1–3)
   - Implement PostgreSQL full-text search (`tsvector`) on cast profiles, show notes, announcements
   - UI: Unified search bar in all portals; filters by role/portal/date
   - Index: `(show_notes, cast_name, announcement_text) as tsvector`
   - **Result:** "Search for cast who performed in 'Mystery Harold' — find all cast members with experience"

2. **Scheduling Recommendations** (Week 4–8)
   - Conflict detection: Identify cast members who signed up for two overlapping shows
   - Availability insights: "Top 5 Available Cast for July 15 Show" ranked by past attendance rate
   - **Optional ML layer** (contract work): Train model on past cast acceptance/no-show patterns; rank candidates
   - UI: Director opens show availability roster; top candidates auto-sorted with confidence score
   - **Result:** 50% faster casting decisions

3. **Performance Analytics Dashboard** (Week 8–10)
   - KPI tiles: "Show fill rate (90%)", "Avg cast response time (24h)", "Attendance rate (87%)", "Instructor retention (95%)"
   - Trends: Chart cast responsiveness over time; compare show types; instructor effectiveness by class size/level
   - Drill-down: Click "Attendance Rate" → see per-show breakdown; identify shows with high no-shows
   - **Result:** Team admin sees health check dashboard; identifies struggling shows/instructors

4. **Cross-Portal Announcements** (Week 9–10)
   - Schema: `announcements(id, title, body, target_portals[], target_roles[], created_by, created_at, expires_at)`
   - UI: Team admin publishes "All-Hands: Schedule Updated for July 15" targeting all portals/roles
   - Consumption: Announcement inbox in each portal (replaces email notifications)
   - **Result:** No more duplicate announcement emails; single source of truth

**Technical Notes:**
- Full-text search uses native PostgreSQL (no external Algolia needed)
- Recommendations require only SQL aggregations + ranking logic
- Optional ML recommendations can be added later without breaking existing features
- Analytics dashboards query history tables + computed views

**Success Metrics:**
- Search finds relevant results in top 3 results 90% of the time
- Scheduling recommendations reduce director decision time by 50%
- Analytics dashboard shows 80%+ admin engagement
- Announcements reach 90%+ of users within 24 hours

---

### Phase 4 (Q2 2027): Advanced Automation & Predictive Features
**Goal:** Reduce manual scheduling work; provide proactive insights to all roles.  
**User Impact:** Scheduling becomes semi-automated; cast receives personalized recommendations.  
**Effort:** ~12 weeks (team expansion to 3 people)

**Features in Phase 4:**

1. **Availability Conflict Detection & Resolution** (Week 1–4)
   - Detect double-bookings: "Cast member Sarah is available for Show A (7/15–7/17) and Show B (7/16–7/18)"
   - Suggest resolution: "Consider alternate cast for Show B, Saturday only" or "Reduce Sarah's commitment in Show A"
   - UI: Director sees conflict warnings; one-click alternate suggestions
   - **Result:** Zero double-bookings; directors aware of conflicts immediately

2. **Student Learning Pathway Recommendations** (Week 5–8)
   - Analyze enrollment history + skill ratings; predict next recommended class level
   - UI: Student sees "Next Recommended: Level 301 - Advanced Physical Comedy" card
   - Suggest skill gaps: "Based on feedback, focus on character voices before Level 301"
   - **Result:** 30%+ improvement in student progression rates; reduced drop-outs

3. **Mobile Push Notification System** (Week 8–10)
   - Device token registration (iOS/Android via Firebase/Expo)
   - Push for: show assignments, message replies, deadline reminders, attendance requests
   - Analytics: Track open rates; disable noisy notifications users dismiss
   - **Result:** 70%+ push notification opt-in; 40%+ click-through rate

4. **Advanced Reporting & Data Export** (Week 10–12)
   - Generate reportable artifacts: show attendance ledger, cast/crew schedules, class rosters
   - Export to CSV/PDF for archival and compliance
   - Scheduled reports (e.g., "Weekly Attendance Report" emailed Fridays)
   - **Result:** Team admin needs minimal manual data wrangling

**Technical Notes:**
- Conflict detection is purely SQL-based (no external tool)
- Recommendations leverage Phase 3 ML model or simple heuristics (no change)
- Push notifications require Firebase Cloud Messaging or Expo integration
- Reporting uses existing history tables + aggregation views

**Success Metrics:**
- Conflict detection catches 95%+ of scheduling issues
- Student recommendation CTR > 50%
- Push notification opt-in > 70%
- Automated reports save admin 10+ hours/week on data prep

---

## Competitive Benchmarking

### How Comparable Systems Solve These Problems

**Eventbrite (Event Management):**
- ✅ Real-time notifications via push + email
- ✅ Direct message system between organizers and attendees
- ✅ Searchable event catalog with tags
- ✅ Analytics: sell-through rate, attendee engagement, no-show rate
- ❌ No scheduling automation for multi-event conflicts
- **Insight for JTF:** Notifications + analytics drive 40% of Eventbrite engagement

**Linear (Project Management):**
- ✅ Real-time activity feeds (every issue change visible)
- ✅ Full-text search across projects/issues
- ✅ Workflow automation (auto-assign issues based on rules)
- ✅ Performance insights (cycle time, throughput)
- ❌ No direct messaging (uses Slack integration)
- **Insight for JTF:** Activity feeds + search are foundational to team engagement

**Notion (Collaborative Workspace):**
- ✅ Unified announcements + comments on pages
- ✅ Full-text search across all content
- ✅ Activity sidebar (recent changes + who changed them)
- ✅ Templates for recurring workflows
- ❌ No direct messaging (links to Chat)
- **Insight for JTF:** Transparency (activity feeds + search) increases adoption

**Theater-Specific CRMs (Traction/StilettoTheater/Broadway Across America Dashboard):**
- ✅ Cast availability/scheduling with conflict warnings
- ✅ Director-to-cast messaging + push notifications
- ✅ Performance analytics (cast reachability, attendance patterns)
- ⚠️ Limited cross-show discovery
- **Insight for JTF:** Directors + cast messaging is table-stakes for performing arts tech

**Linear + Notion + Theater CRMs consensus:**
- Real-time collaboration (notifications, activity feeds) unlock exponential engagement
- Search + discovery reduce friction and improve outcomes (faster casting, better learning pathways)
- Transparent audit trails build trust (admins, instructors, cast all see accountability)

**JTF Strategic Position:**
- Build Phase 2 features (messaging, notifications, feeds) to match theater CRM baseline
- Add Phase 3 analytics to exceed most competitors in data transparency
- Phase 4 automation begins to differentiate (competing solutions lack this)

---

## Technical Foundation Notes

### Existing Infrastructure Ready for Post-V1 Features

**What's Already in Place:**
- ✅ `activity_events` table (schema exists; logging not yet wired)
- ✅ `portal_user_access` RLS (multi-portal auth foundation)
- ✅ History tables for all entities (`show_availability_history`, etc.)
- ✅ Timestamps + attribution fields (`created_by`, `updated_by`, `created_at`, `updated_at`)
- ✅ Supabase Realtime support (native WebSocket subscriptions)
- ✅ PostgreSQL full-text search (`tsvector`)
- ✅ RLS policies (partially implemented; extend for messaging)

**What Needs Design (No Code Yet):**
- ⚠️ `portal_messages` table schema (new; low complexity)
- ⚠️ `announcements` table schema (new; low complexity)
- ⚠️ Search index design (new; uses existing `tsvector` support)
- ⚠️ Analytics view templates (new; SQL queries, no tables)
- ⚠️ Conflict detection logic (new; SQL-based, no tables)
- ⚠️ Device token management for push (new; low complexity)

**What Requires External Integration:**
- ⚠️ Firebase Cloud Messaging or Expo for mobile push (no lock-in; simple to swap)
- ⚠️ Optional ML pipeline for scheduling recommendations (can defer; basic heuristics work well)

### Migration Path (No Breaking Changes)

All features can be added incrementally without altering existing V1 tables:
- New tables are append-only (`portal_messages`, `announcements`)
- Activity logging adds RPC calls; existing code paths unaffected
- RLS policies extended; no rewrites
- Views for analytics; no table changes
- Mobile push is opt-in; no impact on web users

### Data Privacy & Compliance

- ✅ Message content stored in Supabase (encrypted at rest)
- ✅ RLS ensures users see only authorized messages
- ✅ Activity logs are append-only (GDPR-friendly; support "right to be forgotten")
- ✅ Portal access controls (no accidental cross-role leakage)
- ⚠️ Add data retention policy (e.g., "delete activity logs after 2 years")
- ⚠️ Add "delete my data" workflow (already feasible with Supabase admin API)

---

## Investment & Resource Recommendations

### Sequencing & Team Composition

**Phase 2 (8 weeks, 2 people):**
- 1 backend engineer (activity logging wiring, RLS policy extensions, notification service)
- 1 frontend engineer (Realtime subscriptions, UI components, portfolio page)
- Estimated cost: $30K–$40K (contractor rates)

**Phase 3 (10 weeks, 2 people + optional 1 ML engineer contract):**
- Same core team
- Optional 4-week ML contract for scheduling recommendations (cost: $10K–$15K)
- Estimated cost: $40K–$55K

**Phase 4 (12 weeks, 3 people):**
- Backend + Frontend + new QA/DevOps engineer
- Mobile push notifications require testing on iOS/Android
- Estimated cost: $50K–$70K

**Total 3-Phase Investment: ~$120K–$165K** (8–9 months elapsed time, with parallelization potential)

### Prioritization Heuristic: MoSCoW

- **MUST (Phase 2):** Notifications + Messaging (table-stakes; directors can't operate without direct contact)
- **SHOULD (Phase 3):** Search + Analytics (high ROI; enables faster decision-making)
- **COULD (Phase 4):** Automation + Conflict Detection (nice-to-have; requires more engineering)
- **WON'T (post-V2):** Complex ML (student placement algorithms, optimal scheduling). These add incremental value; basic heuristics are 80% as good.

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|---|---|---|---|
| Notification fatigue (users disable feature) | Low engagement | Medium | Start conservative (only critical events); let users tune granularity |
| Messaging feature misused for harassment | Compliance/moderation burden | Low | Add message filtering/reporting; restrict director-initiated contact to show context |
| Search performance degrades as data grows | Portal becomes slow | Medium | Implement search index pruning; add pagination + result limits; benchmark before prod |
| Scheduling recommendations produce poor results | Directors lose trust | Medium | Start with simple heuristics (past attendance rate); only add ML if heuristics plateau |
| Mobile push requires vendor lock-in | Switching cost high | Medium | Use abstraction layer (Firebase wrapper); design for easy migration to Expo |
| Analytics dashboards expose sensitive data (cast no-show rates) | Privacy/morale risk | Low | Implement role-based dashboard views; aggregate cast data; never show individual cast reliability scores to directors |
| Activity logging creates data storage burden | Storage/compliance cost | Low | Implement 2-year retention policy; archive old logs quarterly to cold storage |

---

## Success Criteria & KPIs

### Phase 2 Success Metrics
- 80%+ of directors use messaging feature within 2 weeks of launch
- Message response time < 5 minutes (measured via activity logs)
- 70%+ of users enable notifications (opt-in)
- Activity feed shows 95%+ of operational changes within 10 seconds
- Cast portfolio viewed in 60%+ of director casting decisions

### Phase 3 Success Metrics
- Search query success rate > 90% (user finds what they're looking for on first try)
- Scheduling recommendations reduce director decision time by 40%+ (timed studies)
- Analytics dashboard accessed by 80%+ of admins weekly
- Cross-portal announcements reach 90%+ of users within 24 hours
- Show fill rate improves 15% (directors can staff shows faster using recommendations)

### Phase 4 Success Metrics
- Zero double-bookings (conflicts caught before assignment)
- Student recommendations accepted in 50%+ of cases (next class enrollment)
- Push notification opt-in > 70%; open rate > 40%
- Admin time on scheduling reduces 40% (automation + tools)

---

## Appendix: Feature Wireframes & Data Models

### Portal Messages (Phase 2)

**Table Schema:**
```sql
CREATE TABLE portal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES auth.users(id),
  to_user_id UUID NOT NULL REFERENCES auth.users(id),
  show_id INTEGER NULL REFERENCES show_information(show_id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL  -- soft delete
);
CREATE INDEX ON portal_messages(to_user_id, read_at);
CREATE INDEX ON portal_messages(from_user_id, show_id);
```

**RLS Intent:**
- Cast users can READ messages where `to_user_id = auth.uid()`
- Directors can READ messages where `from_user_id = auth.uid()` OR `to_user_id = auth.uid()`
- Users can WRITE messages where `from_user_id = auth.uid()` AND `show_id` is assigned to their role

### Announcements (Phase 3)

**Table Schema:**
```sql
CREATE TABLE announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  target_portals TEXT[] NOT NULL,  -- ['team', 'instructor', 'cast', 'director']
  target_roles TEXT[] NOT NULL,    -- ['admin', 'teacher', 'director', 'cast']
  created_by_user_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NULL,
  archived_at TIMESTAMPTZ NULL
);
```

### Activity Feed View (Phase 2)

**Query:**
```sql
SELECT 
  occurred_at, 
  actor_role, 
  action, 
  entity_type, 
  details_json 
FROM activity_events 
WHERE 
  (entity_type = 'show' AND entity_id IN (SELECT show_id FROM show_information WHERE director_id = current_user_id))
  OR (entity_type = 'class' AND entity_id IN (SELECT offering_id FROM class_offerings WHERE teacher_id = current_user_id))
ORDER BY occurred_at DESC 
LIMIT 50;
```

---

## Next Steps

1. **Validate Phase 2 scope with stakeholders** (Week 1) — Confirm messaging + notifications priorities
2. **Design activity logging wiring** (Week 2) — Identify all V1 write paths that need event capture
3. **Prototype messaging UI** (Week 3) — Test UX with directors + cast; refine flows
4. **Begin Phase 2 implementation** (Week 4) — Parallel frontend/backend work
5. **Plan Phase 3 in parallel** (Month 2) — Design search schema; spec analytics dashboards
6. **Iterate Phase 2 based on UAT feedback** (Month 3) — Ship Phase 2; begin Phase 3
7. **Reassess Phase 4 after Phase 3 metrics** (Month 4) — Decide on ML investment; prioritize Phase 4 features

---

## Conclusion

The JTF Portal ecosystem has a strong V1 foundation. Post-V1 features should focus on **communication, transparency, and intelligence** — three pillars that compound user engagement and reduce operational friction.

By prioritizing Phases 2–3, JTF can achieve **parity with modern theater CRMs** (messaging, analytics, search) while maintaining a lean, low-external-dependency technology stack. Phase 4 automation then becomes a key differentiator, positioning JTF ahead of competitors.

**All features remain feasible with existing Supabase infrastructure; no external services required until optional ML (Phase 4).**
