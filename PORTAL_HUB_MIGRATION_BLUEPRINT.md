# Portal Hub Migration Blueprint

## Goal
Create a single "Portal Hub" application with one login that routes users into Team, Instructor, Director, and Cast experiences based on `portal_user_access`, while preserving current behavior during migration.

## Desired End State
- One URL and one sign-in flow.
- One access-resolution pipeline (user -> personnel -> portal access rows).
- One shell for navigation, layout, and mobile behavior.
- Role/portal guarded routes for every section.
- Shared service patterns (error handling, validation, API wrappers).

## High-Level Architecture

### 1) Hub Shell
- Contains auth bootstrap, access resolution, top-level navigation, route guards, and global UI scaffolding.
- Displays portal "entry cards" for users with multiple portal grants.
- Supports direct deep-link routing for users with single portal access.

### 2) Portal Modules
- Each current app becomes a route group/module under the hub:
  - `/team/*`
  - `/instructor/*`
  - `/director/*`
  - `/cast/*`
- Modules can initially be imported from existing code with minimal edits.
- Shared shell features (sidebar/mobile nav/header) live in hub.

### 3) Shared Core Layer
- `auth-core`: session, user identity, personnel resolution.
- `access-core`: loads/normalizes `portal_user_access`, applies route guard checks.
- `ui-core`: shared primitives (buttons, cards, modal, loaders, banners).
- `data-core`: common request wrapper, retry policy, error normalization.

## Route Plan

### Public Routes
- `/login`
- `/logout`
- `/access-denied`

### Hub Routes
- `/` -> hub home (portal chooser or smart redirect)
- `/hub` -> explicit hub dashboard

### Team Module
- `/team/dashboard`
- `/team/personnel`
- `/team/cast`
- `/team/crew`
- `/team/shows`
- `/team/classes`
- `/team/portal-access`
- `/team/...`

### Instructor Module
- `/instructor/dashboard`
- `/instructor/classes`
- `/instructor/students`
- `/instructor/progress`
- `/instructor/instructors`
- `/instructor/games`
- `/instructor/account`

### Director Module
- `/director/dashboard`
- `/director/shows`
- `/director/availability`
- `/director/setlist`
- `/director/games`
- `/director/notes`
- `/director/profile`

### Cast Module
- `/cast/dashboard`
- `/cast/upcoming`
- `/cast/availability`
- `/cast/games`
- `/cast/profile`

## Access Matrix (Hub Guard Inputs)

Use `portal_user_access` where:
- `is_active = true`
- `portal_name in ('team','instructor','director','cast','student')`
- `role` determines feature-level permissions within module

Baseline matrix:
- Team portal:
  - `admin`, `manager` => full team module
  - narrower roles as currently implemented
- Instructor portal:
  - `teacher` and elevated roles per current checks
- Director portal:
  - `director` and elevated roles per current checks
- Cast portal:
  - `cast` and elevated roles per current checks

Note:
- Keep feature-level checks in-module at first.
- Move to centralized permission map after parity is confirmed.

## No-Downtime Migration Plan

## Phase 0: Foundations (1 week)
1. Add shared `auth-core` and `access-core` packages/folders.
2. Define canonical access object:
   - `userId`, `personnelId`, `email`, `grants[]`, `primaryPortal`
3. Build route guard utility and test with current role logic.

Exit criteria:
- Hub can authenticate and display correct portal cards from live data.

## Phase 1: Hub App + Safe Redirects (1 week)
1. Create Portal Hub app shell and `/hub` route.
2. Add portal chooser cards with direct links to existing apps (temporary external links).
3. Add optional query-preserving redirects from old login pages to hub after login.

Exit criteria:
- Users can login once and launch all portals from hub.
- No behavior change in existing apps.

## Phase 2: Internalize Modules (2-4 weeks)
1. Move one portal at a time into hub route groups.
2. Keep visual/behavior parity, avoid redesign during migration.
3. Start with smallest-risk module first (suggested order: Director -> Instructor -> Cast -> Team).

Exit criteria:
- Selected portal runs inside hub with route guards.
- Existing standalone deployment still available as fallback.

## Phase 3: Shared UI + Service Convergence (2-3 weeks)
1. Replace duplicated components with shared UI primitives.
2. Extract common data wrappers (error mapping, retries, loading states).
3. Introduce validation schemas for high-risk mutations.

Exit criteria:
- Reduced duplicated logic and consistent behavior/messages.

## Phase 4: Cutover and Retire Standalone Entrypoints (1 week)
1. Switch DNS/main navigation to hub-first.
2. Keep legacy URLs as redirects to equivalent hub routes.
3. Monitor errors and rollback signals for 1-2 weeks.

Exit criteria:
- Hub is primary production entrypoint.
- Legacy apps in maintenance/deprecated state.

## Rollback Strategy
- Maintain standalone apps during Phases 1-3.
- Feature-flag module routing in hub:
  - `HUB_ROUTE_DIRECTOR`
  - `HUB_ROUTE_INSTRUCTOR`
  - `HUB_ROUTE_CAST`
  - `HUB_ROUTE_TEAM`
- If a module regression occurs:
  - toggle module back to external app link
  - keep shared auth/hub active

## Data/Policy Guardrails
- Keep one source of truth: `portal_user_access`.
- Avoid duplicating role checks in multiple new locations.
- Add policy tests for each portal route group:
  - authorized user allowed
  - inactive grant denied
  - wrong portal denied

## Implementation Backlog (Actionable)
1. Create `hub` route scaffold and `PortalChooserPage`.
2. Implement `resolveAccessContext()` shared function.
3. Add centralized route guard wrapper.
4. Add legacy URL redirect map.
5. Import Director module as first internal module.
6. Add module parity checklist (navigation, permissions, critical flows).
7. Add smoke tests for login + route guards + module landing.
8. Add telemetry for denied routes and auth failures.

## Suggested Success Metrics
- Login-to-first-page time unchanged or improved.
- Reduction in duplicated auth/access code across repos.
- Fewer auth/permission-related support issues.
- Stable error rate after each module cutover.

## Immediate Next Step
Start with a lightweight Hub MVP in a separate branch:
- One login
- Access resolution
- Portal chooser cards
- External launch links to current portals

This creates value immediately and de-risks full consolidation.