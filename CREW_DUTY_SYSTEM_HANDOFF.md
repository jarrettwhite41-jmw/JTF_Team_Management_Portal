# Crew Duty System — Agent Handoff Plan

**Created:** 2026-08-03
**Status:** Ready to build — fully specced, zero code written yet
**Branch:** `feature/ui-parity-mobile-team` (JTF_Team_Management_Portal)

---

## Agent Permissions & Tools

This project has full MCP Supabase access. The agent is authorized to:

- `mcp_supabase_apply_migration` — apply DDL migrations directly to production Supabase
- `mcp_supabase_execute_sql` — run raw SQL queries for verification
- `mcp_supabase_list_migrations` — check existing migrations
- Edit files with `replace_string_in_file` / `multi_replace_string_in_file`
- Run terminal commands (`run_in_terminal`) for builds and git operations
- **Commit and push after each completed step** (user preference stored in user memory)

---

## Context: What Exists

### Portals
| Portal | Repo Folder | Status |
|--------|-------------|--------|
| Team (admin) | `JTF_Team_Management_Portal` | V1 complete |
| Instructor | `JTF_Instructor_Portal` | V1 complete |
| Director | separate repo | V1 complete |
| Cast | separate repo | V1 complete |
| Crew (NEW) | needs scaffold | not started |

### Key Files in Team Portal
- `services/supabaseService.ts` — all DB operations, `ApiResponse<T>` pattern
- `App.tsx` — routing switch + mobile nav config (`TEAM_PAGE_SET`, `mobileTopLevelSections`, `mobileSectionGroups`)
- `components/layout/Sidebar.tsx` — nav tree with `canAccessItem()` role gating
- `pages/Shows.tsx` — show management (fully migrated to supabaseService)
- `types.ts` — shared TypeScript types

### Auth Pattern
- `portal_user_access` table: `auth_user_id -> personnel_id + portal_name + role`
- `portal_name` values in use: `team`, `instructor`, `director`, `cast`
- New value needed: `crew` (for student bartenders)

---

## Complete Spec: Crew Duty System

### Four Crew Roles Per Show
| Role | Count | Eligible | Signup Model |
|------|-------|----------|-------------|
| Tech | 1 | Cast members only | Volunteer -> admin confirms |
| House | 1 | Cast members only | Volunteer -> admin confirms |
| Box | 1 | Cast members only | Volunteer -> admin confirms |
| Bartender | 1 | Bartenders list (cast + students) | Claim -> priority bump -> admin lock |

### Bartender Priority Rules
- Priority = `last_bartended_date ASC NULLS FIRST` (never bartended = highest priority)
- Bump window: slot is bumpable until `show_datetime - bartender_bump_cutoff_hours`
- Default `bartender_bump_cutoff_hours = 72`
- After bump window closes OR admin locks: no bumping, no relinquishing
- Admin can lock/unlock and manually assign anytime
- All bartenders see who holds the slot; eligible ones see a "Take this slot" button

---

## Step 1: Migration SQL

**File to create:** `JTF_Team_Management_Portal/migrations/20260803_crew_duty_system.sql`

**Then apply with:** `mcp_supabase_apply_migration` (name: `crew_duty_system`)

### SQL to apply:

```sql
-- app_settings: configurable key/value store
CREATE TABLE IF NOT EXISTS public.app_settings (
  setting_key   TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL,
  description   TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_admin_manage_settings" ON public.app_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND role = 'admin'
    )
  );

CREATE POLICY "authenticated_read_settings" ON public.app_settings
  FOR SELECT
  USING (auth.role() = 'authenticated');

INSERT INTO public.app_settings (setting_key, setting_value, description) VALUES
  ('bartender_bump_cutoff_hours', '72', 'Hours before show when bartender slot can no longer be bumped'),
  ('cast_availability_deadline_hours', '72', 'Hours before show when cast must submit availability'),
  ('crew_tech_slots', '1', 'Number of Tech crew slots per show'),
  ('crew_house_slots', '1', 'Number of House crew slots per show'),
  ('crew_box_slots', '1', 'Number of Box Office crew slots per show'),
  ('crew_bartender_slots', '1', 'Number of Bartender slots per show')
ON CONFLICT (setting_key) DO NOTHING;

-- crew_availability: Tech / House / Box signups
CREATE TABLE IF NOT EXISTS public.crew_availability (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id      UUID NOT NULL REFERENCES public.shows(id) ON DELETE CASCADE,
  personnel_id UUID NOT NULL REFERENCES public.personnel(id) ON DELETE CASCADE,
  role         TEXT NOT NULL CHECK (role IN ('Tech', 'House', 'Box')),
  status       TEXT NOT NULL CHECK (status IN ('available', 'confirmed', 'not_available')) DEFAULT 'available',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (show_id, personnel_id, role)
);

ALTER TABLE public.crew_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cast_manage_own_crew_availability" ON public.crew_availability
  FOR ALL
  USING (
    personnel_id IN (
      SELECT p.id FROM personnel p
      JOIN portal_user_access pua ON pua.personnel_id = p.id
      WHERE pua.auth_user_id = auth.uid() AND pua.portal_name = 'cast'
    )
  );

CREATE POLICY "team_admin_manage_crew_availability" ON public.crew_availability
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND role = 'admin'
    )
  );

CREATE POLICY "cast_team_read_crew_availability" ON public.crew_availability
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name IN ('cast', 'team', 'director')
    )
  );

-- bartender_slot: one per show
CREATE TABLE IF NOT EXISTS public.bartender_slot (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_id      UUID NOT NULL UNIQUE REFERENCES public.shows(id) ON DELETE CASCADE,
  personnel_id UUID REFERENCES public.personnel(id) ON DELETE SET NULL,
  is_locked    BOOLEAN NOT NULL DEFAULT FALSE,
  claimed_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bartender_slot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_bartender_slot" ON public.bartender_slot
  FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "bartender_claim_slot" ON public.bartender_slot
  FOR UPDATE
  USING (
    is_locked = FALSE
    AND EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name IN ('cast', 'crew')
    )
  );

CREATE POLICY "team_admin_manage_bartender_slot" ON public.bartender_slot
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM portal_user_access
      WHERE auth_user_id = auth.uid()
        AND portal_name = 'team'
        AND role = 'admin'
    )
  );
```

---

## Step 2: Types to add in `types.ts`

```typescript
interface AppSetting {
  setting_key: string;
  setting_value: string;
  description: string;
  updated_at: string;
}

interface CrewAvailability {
  id: string;
  show_id: string;
  personnel_id: string;
  role: 'Tech' | 'House' | 'Box';
  status: 'available' | 'confirmed' | 'not_available';
  created_at: string;
  updated_at: string;
  personnel?: { first_name: string; last_name: string };
}

interface BartenderSlot {
  id: string;
  show_id: string;
  personnel_id: string | null;
  is_locked: boolean;
  claimed_at: string | null;
  updated_at: string;
  personnel?: { first_name: string; last_name: string };
}
```

---

## Step 3: Service methods to add in `supabaseService.ts`

```typescript
// Settings
getAppSettings(): Promise<ApiResponse<AppSetting[]>>
updateAppSetting(key: string, value: string): Promise<ApiResponse<void>>

// Crew availability
getCrewAvailabilityForShow(showId: string): Promise<ApiResponse<CrewAvailability[]>>
upsertCrewAvailability(showId: string, personnelId: string, role: 'Tech'|'House'|'Box', status: string): Promise<ApiResponse<void>>
confirmCrewSlot(crewAvailabilityId: string): Promise<ApiResponse<void>>

// Bartender slot
getBartenderSlot(showId: string): Promise<ApiResponse<BartenderSlot | null>>
claimBartenderSlot(showId: string, personnelId: string): Promise<ApiResponse<void>>
relinquishBartenderSlot(showId: string): Promise<ApiResponse<void>>
lockBartenderSlot(showId: string, lock: boolean): Promise<ApiResponse<void>>
adminAssignBartender(showId: string, personnelId: string): Promise<ApiResponse<void>>
```

---

## Step 4: Team Portal — Settings Page

**File:** `pages/Settings.tsx`

- Display all app_settings rows in an editable form
- Each row: key (label), value (number input), description (hint text)
- Save button per row
- Add `settings` to `TEAM_PAGE_SET` in `App.tsx` and routing switch
- Add `{ id: 'settings', label: 'Settings', icon: 'gear' }` to Sidebar admin nav

---

## Step 5: Team Portal — Crew Panel in Show Detail

Inside the show detail view in `pages/Shows.tsx`:

- Tech / House / Box: list of volunteers, admin confirms each
- Bartender card: current holder or "Unclaimed", lock/unlock toggle, manual assign dropdown

---

## Step 6: Cast Portal — Crew Tab

**Location:** Find the Cast Portal folder (likely `JTF_Cast_Portal` sibling to Team Portal)

- Toggle availability per role (Tech/House/Box) per upcoming show
- Bartender section: see current holder, claim/relinquish if window open and eligible

**Bump window check (client-side):**
```typescript
const cutoffHours = parseInt(appSettings.bartender_bump_cutoff_hours);
const cutoff = new Date(show.show_datetime);
cutoff.setHours(cutoff.getHours() - cutoffHours);
const bumpWindowOpen = new Date() < cutoff;
```

---

## Step 7: Crew Portal Scaffold

New minimal portal for student bartenders (`portal_name = 'crew'`).
- Supabase Auth login
- Upcoming shows list
- Bartender slot card per show (claim / relinquish)
- Likely a new repo `JTF_Crew_Portal` — confirm with user before creating

---

## Build Order

```
1. [ ] Migration SQL -> apply via mcp_supabase_apply_migration
2. [ ] types.ts -> add AppSetting, CrewAvailability, BartenderSlot
3. [ ] supabaseService.ts -> add all crew/settings methods
4. [ ] pages/Settings.tsx -> new admin settings page
5. [ ] App.tsx + Sidebar.tsx -> settings route + nav item
6. [ ] Shows.tsx -> crew panel in show detail
7. [ ] Cast Portal -> Crew tab
8. [ ] Crew Portal -> scaffold (confirm with user first)
9. [ ] Commit + push after each step
```

---

## Verification Queries (run after Step 1)

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('app_settings', 'crew_availability', 'bartender_slot');

SELECT * FROM app_settings;

SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('app_settings', 'crew_availability', 'bartender_slot');
```

---

## Known Gotchas

1. **Emoji in Sidebar/App.tsx:** Edit tools sometimes corrupt emoji. Use PowerShell Set-Content with UTF-8 if corruption occurs. See `/memories/repo/mobile-pattern.md`.
2. **Vercel build errors:** Unused imports and missing type exports break Vite build. See `/memories/repo/vercel-build-gotcha.md`.
3. **RLS 409 errors:** Missing policies for the accessing portal_name. See `/memories/repo/cast-availability-schema-gotcha.md`.
4. **`personnel` table:** Check if `last_bartended_date DATE` column exists before referencing it. Query: `SELECT column_name FROM information_schema.columns WHERE table_name = 'personnel' AND column_name LIKE '%bartend%';`
