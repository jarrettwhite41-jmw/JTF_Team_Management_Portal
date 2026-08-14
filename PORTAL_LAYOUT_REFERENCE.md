# JTF Portal Layout Reference (Web + Mobile)

## Purpose
This document defines one shared layout system for all JTF portals while allowing each portal to organize content differently.

Use this as the source of truth for page structure, responsive behavior, and component usage.

## Global System (All Portals)

### Shell
- Fixed left sidebar on desktop.
- Sticky top header.
- Responsive content grid.
- Card-first modules for metrics, status, and actions.

### Navigation
- Desktop: sidebar with grouped navigation.
- Mobile: bottom nav for top-level areas, sheet or drawer for secondary actions.
- Keep names consistent across portals (for example: Dashboard, Availability, Assignments, Settings).

### Content Patterns
- Cards: KPI metrics, alerts, quick actions.
- Table/list: records, rosters, queues.
- Tabs: grouped workflows in one area.
- Drawers/modals: create/edit/detail workflows.
- Split panels: comparison workflows only.

### Header Behavior
- Sticky at top.
- Required actions: Back, Portal Hub, Refresh, Help, Account.
- Optional contextual actions per page.

## Responsive Rules

### Breakpoints
- Mobile: < 768px
- Tablet: 768px to 1023px
- Desktop: >= 1024px

### Mobile
- Single-column stacked flow.
- Action-first ordering: urgent items first.
- Bottom nav always visible.
- Replace dense tables with compact cards.

### Tablet
- Two-column content where practical.
- Keep top-level actions visible.
- Use collapsible filters.

### Desktop
- Sidebar always visible.
- Larger data views (tables and multi-column cards).
- Split-panel comparison where needed.

## Portal Blueprints

### Team Portal
- Best fit: fixed sidebar + dashboard + grouped operations workflows.
- Nav groups:
  - Overview
  - Shows and Production
  - People and Staffing
  - Classes and Education
  - Admin
- Primary modules:
  - KPI cards
  - queue and status lists
  - filterable tables
  - edit drawers/modals

### Instructor Portal
- Best fit: tabbed workflow + dashboard cards.
- Main tabs:
  - Classes
  - Students
  - Progress
  - Attendance
  - Reporting
- Keep instructor actions focused and low-clutter.

### Cast Portal
- Best fit: stacked task-driven flow + cards.
- Core sections:
  - Home
  - Availability
  - Assignments
  - Upcoming Shows
  - Notices or Games
  - My Info
- Mobile-first priority order:
  - urgent deadlines
  - pending responses
  - next commitments

### Director Portal
- Best fit: split-panel staffing workspace.
- Comparison workflows:
  - show needs vs available cast
  - assignments vs staffing gaps
- Mobile fallback:
  - step-by-step flow instead of side-by-side panels.

### Hub Portal
- Best fit: launch dashboard.
- Modules:
  - role shortcuts
  - recent activity
  - critical alerts
  - quick links to each portal

## Cross-Portal Workflow Contracts
- Team creates show (director may be unassigned).
- Director claims show.
- Cast submits availability.
- Director assigns cast from eligible availability pool.
- Team sees staffing readiness and unresolved gaps.

## UI Consistency Rules
- Reuse card, pill, badge, filter, and button styles across portals.
- Keep status colors consistent.
- Keep action verbs consistent.
- Limit clicks/taps to key actions where possible.

## Implementation Notes
- Start with shell consistency first.
- Then migrate page internals section by section.
- Avoid redesigning all workflows at once.
- Verify parity after each section move.

## Cast Portal First Sprint (Recommended)
1. Update shell to desktop sidebar + sticky header while preserving mobile bottom nav.
2. Reorder Home for urgency-first mobile flow.
3. Add quick actions for Availability and Upcoming Shows.
4. Add help panel text for each tab.
5. Confirm no regressions in auth, role-gating, and tab persistence.
