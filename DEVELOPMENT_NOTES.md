# Development Notes & Workflow

## ⚠️ Critical: How This App Works

The app runs entirely from **`index.html`** — it is a single-file Google Apps Script Web App.

The `.tsx` files (`components/`, `pages/`, `services/`) are **source references only** — they are NOT compiled or bundled automatically. Any UI change must be made directly in `index.html`.

---

## Workflow for Making Changes

### 1. UI / Frontend Changes
- Edit **`index.html`** directly
- All React components are written as `React.createElement` calls (using the `e()` shorthand) inside `<script type="text/babel">` tags
- The `gasService` object (defined around line 170 in index.html) must also have any new service methods added directly there

### 2. Backend / Data Changes
- Edit **`Code.gs`** for any Google Apps Script server-side functions

### 3. After Any Change — Deploy to Google Apps Script
```bash
npm run push       # pushes Code.gs + index.html to Google Apps Script
npm run deploy     # creates a new versioned deployment (do this for production releases)
```

### 4. Git — Push to GitHub
```bash
git add .
git commit -m "your message"
git push
```

---

## Keeping `.tsx` Files in Sync

The `.tsx` source files should be kept up to date as documentation/reference and for future tooling, but **changes there do NOT affect the live app** until manually ported into `index.html`.

When making a significant change:
1. Make the change in `index.html` (live)
2. Mirror the same logic into the corresponding `.tsx` file (for source control clarity)

---

## Database / Sheet Schema Quick Reference

### ClassOfferings sheet columns
| Column | Notes |
|--------|-------|
| `OfferingID` | Primary key |
| `TeacherID` | FK → `Teachers.TeacherID` (NOT PersonnelID directly) |
| `ClassLevelID` | FK → `ClassLevels.ClassLevelID` |
| `StartDate` / `EndDate` | |
| `MaxStudents` | |
| `Status` | Upcoming / In Progress / Completed / Cancelled |
| `VenueOrRoom` | |
| `MeetingDays` | Comma-separated, e.g. "Monday, Wednesday" |
| `MeetingTime` | |

### Teachers table join chain
```
ClassOfferings.TeacherID → Teachers.TeacherID
Teachers.PersonnelID    → Personnel.PersonnelID
```
Always use `getActiveTeachers()` (not `getAllPersonnel()`) for teacher dropdowns — it returns `{ TeacherID, PersonnelID, FirstName, LastName, FullName }`.

### StudentEnrollments
```
StudentEnrollments.StudentID → StudentInfo.StudentID
StudentInfo.PersonnelID      → Personnel.PersonnelID
```

---

## Backend Functions Reference

| Function | Description |
|----------|-------------|
| `getAllClassOfferings()` | All classes with TeacherName, LevelName, EnrolledCount |
| `getClassOfferingDetails(offeringId)` | Full class + enrolled students + attendance |
| `createClassOffering(classData)` | Creates new row in ClassOfferings |
| `updateClassOffering(classData)` | Updates existing row by OfferingID |
| `getActiveTeachers()` | Returns active teachers joined with Personnel |
| `getAllClassLevels()` | Returns ClassLevels lookup table |
| `enrollPersonAsStudent(personnelId, offeringId)` | Enrolls a person |
| `removeStudentFromClass(enrollmentId)` | Removes student from class |
| `updateEnrollmentStatus(enrollmentId, status)` | Updates enrollment status |
| `updateClassAttendance(attendanceData)` | Saves/updates an attendance record |

---

## Current Branch
`feature/crew-management` — all active work is happening here. Merge to `main` when ready for a stable release.
