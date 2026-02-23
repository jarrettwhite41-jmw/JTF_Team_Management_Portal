# JTF Team Management Portal — Developer Reference

> **Last updated:** February 23, 2026 (added Skill Tree, Rehearsal, role tables; UI consolidation plan)  
> Use this document to guide all future feature work, bug fixes, and AI-assisted coding sessions.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Backend | Google Apps Script (`Code.gs`) |
| Frontend | Single `index.html` — React 18 (UMD CDN) + Babel Standalone + Tailwind CSS (CDN) |
| Deployment | `clasp push --force` from project root |
| Auth | `jarrett@justthefunny.com` (clasp) |
| Pattern | `const e = React.createElement` — no JSX, no bundler |

---

## Database Schema

### Key Rule
**Never query View tabs** (e.g., `Enrollment View`, `Cast Member View`) for application logic. Always join source tables by ID in code for real-time, editable data.

---

### Core Tables

#### `Personnel` — Source of Truth for All People
| Column | Type | Notes |
|---|---|---|
| `PersonnelID` | PK | Unique ID for every person |
| `FirstName` | string | |
| `LastName` | string | Note: code must handle both `LastName` AND `Lastname` (lowercase n) |
| `PrimaryEmail` | string | |
| `PrimaryPhone` | string | |

Every other role table extends Personnel via `PersonnelID`.

---

### Role Extension Tables (1:1 with Personnel)

#### `Teachers` — People who teach classes
| Column | Type | Notes |
|---|---|---|
| `TeacherID` | PK | Used as FK in `ClassOfferings.TeacherID` |
| `PersonnelID` | FK → Personnel | |
| `Active` | boolean/string | Filter: `Active = 1` for active teachers |

> **Common Bug:** ClassOfferings links via `TeacherID` (not `PersonnelID`). Always filter `ClassOfferings` with `c.TeacherID == teacher.TeacherID`.

#### `CastMemberInfo` — Permanent cast data
| Column | Type | Notes |
|---|---|---|
| `CastMemberID` | PK | Used as FK in ShowPerformances, CrewDuties |
| `PersonnelID` | FK → Personnel | |
| `Status` | string | e.g., `'Active'` |
| `LastShowDate` | date | YYYY-MM-DD |

#### `Directors`
| Column | Notes |
|---|---|
| `PersonnelID` | FK → Personnel |
| `Active` | Filter active directors |

#### `Bartenders`
| Column | Notes |
|---|---|
| `PersonnelID` | FK → Personnel |
| `Active` | |
| `Trained` | boolean |
| `ShiftCount` | Derived or stored count |

#### `StudentInfo` — Student-specific metadata
| Column | Notes |
|---|---|
| `StudentID` | PK |
| `PersonnelID` | FK → Personnel |

#### `Directors`
| Column | Notes |
|---|---|
| `DirectorID` | PK |
| `PersonnelID` | FK → Personnel |
| `Active` | Filter: `Active = 1` for active directors |

#### `Bartenders` — Bartender role records
| Column | Notes |
|---|---|
| `BartenderID` | PK |
| `PersonnelID` | FK → Personnel |
| `Active` | Active/inactive status |
| `Trained` | boolean — completed bar training |
| `ShiftCount` | Derived/stored total shift count |

#### `Alumni` — Legacy records (read-only reference)
| Column | Notes |
|---|---|
| `AlumniID` | PK |
| `PersonnelID` | FK → Personnel |

> Used for historical lookups only — do not write to this table from the app.

---

### Performance & Production Tables

#### `ShowInformation` — Master event record
| Column | Notes |
|---|---|
| `ShowID` | PK |
| `ShowTypeID` | FK → ShowTypes |
| `DirectorID` | FK → Personnel (director) |
| `RoomID` | FK → (room/venue lookup) |
| `ShowDate` | YYYY-MM-DD |

**Conditional UI rule:** If `ShowDate < Today`, show "Games Played" and "Crew Attendance" sections.

#### `ShowPerformances` — Cast assignment ledger (M:M)
| Column | Notes |
|---|---|
| `ShowID` | FK → ShowInformation |
| `CastMemberID` | FK → CastMemberInfo |

#### `CrewDuties` — Crew assignment ledger (M:M)
| Column | Notes |
|---|---|
| `ShowID` | FK → ShowInformation |
| `CastMemberID` | FK → CastMemberInfo |
| `CrewDutyTypeID` | FK → CrewDutyTypes |

#### `BartenderShifts` — Bartender shift ledger (M:M)
| Column | Notes |
|---|---|
| `ShowID` | FK → ShowInformation |
| `PersonnelID` | FK → Personnel |

#### `GamesPlayed` — Games log per show
| Column | Notes |
|---|---|
| `ShowID` | FK → ShowInformation |
| `GameID` | FK → MasterGameList (nullable) |
| `CustomGameName` | string — used if `GameID` is NULL |
| `FlagForMasterList` | boolean — request to add custom game to MasterGameList |

---

### Education & Skill Tree Tables

#### `ClassOfferings` — Individual class instances
| Column | Notes |
|---|---|
| `OfferingID` | PK |
| `ClassLevelID` | FK → ClassLevels |
| `TeacherID` | FK → **Teachers.TeacherID** (NOT PersonnelID) |
| `StartDate` | YYYY-MM-DD |
| `EndDate` | YYYY-MM-DD |
| `Status` | `'Active'`, `'In Progress'`, `'Scheduled'`, `'Completed'` |
| `VenueOrRoom` | string |
| `MaxStudents` | number |

#### `ClassLevels` — Curriculum levels
| Column | Notes |
|---|---|
| `ClassLevelID` | PK |
| `LevelName` | e.g., `'101'`, `'201'`, `'Advanced'` |

#### `StudentEnrollments` — Student-to-class join (M:M)
| Column | Notes |
|---|---|
| `EnrollmentID` | PK |
| `StudentID` | FK → StudentInfo |
| `OfferingID` | FK → ClassOfferings |

#### `ClassSessionLogs` — Per-session group notes
| Column | Notes |
|---|---|
| `OfferingID` | FK → ClassOfferings |
| `Date` | YYYY-MM-DD |
| Notes/curriculum fields | |

#### `StudentProgressNotes` — Individual narrative feedback
| Column | Notes |
|---|---|
| `EnrollmentID` | FK → StudentEnrollments |
| Narrative fields | |

#### `ClassSessionLogs` — Per-session group/curriculum notes
| Column | Notes |
|---|---|
| `SessionLogID` | PK |
| `OfferingID` | FK → ClassOfferings |
| `SessionDate` | YYYY-MM-DD |
| `CurriculumNotes` | string — what was taught |
| `GroupNotes` | string — how the group performed overall |

#### `StudentProgressNotes` — Individual narrative feedback
| Column | Notes |
|---|---|
| `NoteID` | PK |
| `EnrollmentID` | FK → StudentEnrollments |
| `SessionDate` | YYYY-MM-DD |
| `Note` | string — free-form feedback on the individual student |

---

### Skill Tree Tables

The skill tree tracks both **student growth** (per enrollment) and a **permanent cast proficiency record** (for casting decisions).

#### `SkillCategories` — High-level skill buckets
| Column | Notes |
|---|---|
| `CategoryID` | PK |
| `CategoryName` | e.g., `'Fundamentals'`, `'Physicality'`, `'Character'`, `'Scene Work'` |
| `Description` | optional long description |

#### `Skills` — Individual skill traits
| Column | Notes |
|---|---|
| `SkillID` | PK |
| `CategoryID` | FK → SkillCategories |
| `SkillName` | e.g., `'Yes And'`, `'Active Listening'`, `'Physicality'` |
| `Description` | optional |

#### `StudentCompetencies` — Skill ratings per student per enrollment
| Column | Notes |
|---|---|
| `CompetencyID` | PK |
| `EnrollmentID` | FK → StudentEnrollments |
| `SkillID` | FK → Skills |
| `Rating` | number (e.g., 1–5) or label (e.g., `'Developing'`, `'Proficient'`) |
| `Notes` | optional narrative |
| `DateRecorded` | YYYY-MM-DD |

> Use this to show a student's skill progression across multiple classes.

#### `CastProficiencies` — Permanent cast skill record
| Column | Notes |
|---|---|
| `ProficiencyID` | PK |
| `CastMemberID` | FK → CastMemberInfo |
| `SkillID` | FK → Skills |
| `Rating` | number or label |
| `Notes` | optional narrative |
| `LastUpdated` | YYYY-MM-DD |

> This is the **"permanent record"** used for casting decisions. Updated manually or when a student graduates/joins cast.

**Skill Join Pattern:**
```js
// Get all skills for a cast member, grouped by category
const proficiencies = allProficiencies.filter(p => p.CastMemberID == castMember.CastMemberID);
const enriched = proficiencies.map(p => {
  const skill = allSkills.find(s => s.SkillID == p.SkillID);
  const category = allCategories.find(c => c.CategoryID == skill?.CategoryID);
  return { ...p, SkillName: skill?.SkillName, CategoryName: category?.CategoryName };
});

// Get a student's competency history across enrollments
const history = allCompetencies
  .filter(c => allEnrollments.find(e => e.EnrollmentID == c.EnrollmentID && e.StudentID == studentId))
  .map(c => ({ ...c, SkillName: allSkills.find(s => s.SkillID == c.SkillID)?.SkillName }));
```

---

### Inventory Tables

#### `InventoryItems` — Catalog
| Column | Notes |
|---|---|
| `ItemID` | PK |
| `ReorderPoint` | threshold for low-stock alerts |
| `CategoryID` | FK → InventoryCategories |

**Current Quantity** = `SUM(QuantityChange)` from `InventoryTransactions` filtered by `ItemID`.

#### `InventoryTransactions` — The ledger
| Column | Notes |
|---|---|
| `ItemID` | FK → InventoryItems |
| `LocationID` | FK → StorageLocations |
| `PersonnelID` | FK → Personnel |
| `QuantityChange` | Positive = Restock/Return; Negative = Sale/Damage |

---

### Rehearsal Tables

#### `Rehearsals` — Rehearsal schedules
| Column | Notes |
|---|---|
| `RehearsalID` | PK |
| `ShowID` | FK → ShowInformation (optional — some rehearsals are general) |
| `RehearsalDate` | YYYY-MM-DD |
| `Location` | string |
| `Notes` | string |

#### `RehearsalAttendance` — Who attended which rehearsal
| Column | Notes |
|---|---|
| `AttendanceID` | PK |
| `RehearsalID` | FK → Rehearsals |
| `CastMemberID` | FK → CastMemberInfo |
| `Attended` | boolean |

---

### Lookup/Reference Tables

| Table | Purpose |
|---|---|
| `ShowTypes` | Mainstage, Harold Night, etc. |
| `ClassLevels` | 101, 201, Advanced, etc. |
| `CrewDutyTypes` | Sound, Lights, Stage Manager, etc. |
| `MasterGameList` | Canonical improv game catalog |
| `StorageLocations` | Physical storage spots |
| `InventoryCategories` | Item type groupings |
| `SkillCategories` | High-level skill buckets |
| `Skills` | Individual skill traits |

---

## Programmatic Join Patterns

```js
// Teachers → Classes (CORRECT)
allClasses.filter(c => c.TeacherID == teacher.TeacherID)

// Personnel lookup by PersonnelID
allPersonnel.find(p => p.PersonnelID == row.PersonnelID)

// Handle LastName/Lastname inconsistency
const lastName = person.LastName || person.Lastname || '';

// Active class statuses
['active', 'in progress', 'scheduled'].includes(c.Status?.toLowerCase())

// Date comparison (GAS)
const today = new Date(); today.setHours(0,0,0,0);
const showDate = new Date(show.ShowDate);
if (showDate < today) { /* past show logic */ }
```

---

## Frontend Patterns

### Split-Panel Layout
Used on: Personnel, Cast, Crew, Bartenders, Teachers

```js
// Outer container
e('div', { className: 'flex flex-col p-6 gap-4', style: { height: '100%', overflow: 'hidden' } },
    // Fixed header / stats / search — use flex-shrink-0
    e('div', { className: 'flex-shrink-0' }, ...),
    // Scrollable split row
    e('div', { className: 'flex gap-4', style: { flex: '1 1 0', minHeight: 0, overflow: 'hidden' } },
        e('div', { style: { flex: '1 1 0', overflowY: 'auto', minHeight: 0 } }, /* card list */),
        e('div', { style: { width: '320px', overflowY: 'auto' } }, /* detail panel */)
    )
)
```

### Sort Dropdown Pattern
```js
const [sortBy, setSortBy] = useState('az');

useEffect(() => {
    let filtered = allItems.filter(/* search */);
    const sorted = [...filtered].sort((a, b) => {
        if (sortBy === 'az') return nameOf(a).localeCompare(nameOf(b));
        if (sortBy === 'za') return nameOf(b).localeCompare(nameOf(a));
        // add more cases
        return 0;
    });
    setFiltered(sorted);
}, [searchTerm, sortBy, allItems]);

// In render — search bar wrapper becomes:
e('div', { className: 'flex flex-wrap gap-2 items-center flex-shrink-0' },
    e('input', { className: 'flex-1 min-w-[180px] ...', ... }),
    e('select', { value: sortBy, onChange: ev => setSortBy(ev.target.value), className: 'px-3 py-2.5 ...' },
        e('option', { value: 'az' }, 'Name A → Z'),
        e('option', { value: 'za' }, 'Name Z → A'),
        // more options
    )
)
```

### gasService Call Pattern
```js
const result = await gasService.someFunction(param);
if (result.success) { /* result.data */ }
else { setMessage({ type: 'error', text: result.error }); }
```

---

## Sort Options per Tab

| Tab | Sort Options |
|---|---|
| Personnel | Name A→Z, Z→A |
| Cast | Name A→Z, Z→A, Active First, Last Show Date |
| Crew | Name A→Z, Z→A, By Duty, Show Date (Newest) |
| Bartenders | Name A→Z, Z→A, Most Shifts, Active First, Trained First |
| Teachers | Name A→Z, Z→A, Active First, Most Classes, Active Classes |

---

## Dropdown Filter Rules (from schema)
- **Teachers list**: SELECT Personnel WHERE PersonnelID in Teachers AND Active = 1
- **Directors list**: SELECT Personnel WHERE PersonnelID in Directors AND Active = 1

---

## UI Consolidation Plan (feature/app-consolidation)

### Proposed Sidebar (7 items → from current 11)

| New Tab | Replaces | Sub-tabs / Views |
|---|---|---|
| Dashboard | Dashboard | Actionable widgets: upcoming shows, active classes, low inventory |
| **People** | Personnel · Cast · Crew · Bartenders · Teachers | Sub-tabs per role; shared split-panel pattern |
| Students | Students | Full profile page (keep separate — different nav pattern) |
| **Education** | Classes · Teachers (detail) | Sub-tabs: Classes · Teachers · Skill Tree |
| **Productions** | Shows · Scheduling | Toggle: List view ↔ Calendar view |
| Inventory | Inventory | Unchanged |

### Skill Tracking Feature (future)
Data is now fully modeled. Implementation path:
1. **Student Profile** → add a "Skills" section reading `StudentCompetencies` grouped by `SkillCategories`
2. **Cast Detail Panel** → add a "Proficiencies" section reading `CastProficiencies` grouped by `SkillCategories`
3. **Class Management View** → add a "Rate Skills" action per student per session using `StudentCompetencies`
4. Backend functions needed: `getSkillsWithCategories`, `getStudentCompetencies(studentId)`, `getCastProficiencies(castMemberId)`, `upsertCompetency(enrollmentId, skillId, rating)`, `upsertCastProficiency(castMemberId, skillId, rating)`

---

## Date Handling
- All dates stored/passed as `YYYY-MM-DD`
- GAS: use `new Date(dateString)` — avoid locale-sensitive formatting
- Comparisons: normalize with `.setHours(0,0,0,0)` before comparing

---

## Deployment
```bash
clasp push --force
```
Pushes: `appsscript.json`, `Code.gs`, `index.html`

---

## Known Gotchas

| Issue | Fix |
|---|---|
| `LastName` vs `Lastname` in Personnel | Always use `p.LastName \|\| p.Lastname \|\| ''` |
| ClassOfferings uses `TeacherID` not `TeacherPersonnelID` | Join on `c.TeacherID == teacher.TeacherID` |
| Babel parse errors | Extra `),` pairs from split-panel conversion — count parens carefully |
| String `==` vs `===` for IDs | GAS sheets can return numbers or strings; use `==` for ID comparisons |
| Active class statuses are not uniform | Check for `'active'`, `'in progress'`, `'scheduled'` (case-insensitive) |
