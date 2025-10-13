# Student Data Flow Documentation
**JTF Team Management Portal**  
**Updated:** October 13, 2025

## Database Schema Overview

### Core Principle: Personnel as Single Source of Truth
> "Personnel table is the single source of truth for all individuals. A person must have an entry in the Personnel table before they can be designated as a student in the StudentInfo table."

## Table Structure

### 1. Personnel Table (Primary Source)
**Purpose:** Master table for every person in the system  
**Primary Key:** PersonnelID  
**Columns:**
- PersonnelID
- FirstName
- Lastname (Note: singular, not "LastName")
- PrimaryEmail ← **EMAIL SOURCE**
- PrimaryPhone ← **PHONE SOURCE**
- Instagram
- Birthday

### 2. StudentInfo Table (Student Designation)
**Purpose:** Extends Personnel with student-specific data  
**Primary Key:** StudentID  
**Foreign Key:** PersonnelID → Personnel.PersonnelID  
**Columns:**
- StudentID
- PersonnelID (links to Personnel)
- EnrollmentDate (when they became a student)
- Status (Active/Inactive/Graduated)
- CurrentLevel (their current class level)
- Notes

### 3. StudentEnrollments Table (Class Enrollments)
**Purpose:** Junction table tracking which students are enrolled in which classes  
**Primary Key:** EnrollmentID  
**Foreign Keys:** 
- StudentID → StudentInfo.StudentID
- OfferingID → ClassOfferings.OfferingID

**Columns:**
- EnrollmentID
- StudentID (links to StudentInfo)
- OfferingID (links to ClassOfferings)
- EnrollmentDate (when enrolled in this specific class)
- Status (Active/Completed/Dropped)

### 4. ClassOfferings Table (Class Sessions)
**Purpose:** Specific class sessions available  
**Primary Key:** OfferingID  
**Foreign Keys:**
- ClassLevelID → ClassLevels.ClassLevelID
- TeacherPersonnelID → Personnel.PersonnelID

**Columns:**
- OfferingID
- ClassLevelID (links to ClassLevels)
- StartDate
- EndDate
- TeacherPersonnelID (links to Personnel)
- VenueOrRoom
- MaxStudents
- Status

### 5. ClassLevels Table (Curriculum Levels)
**Purpose:** Defines class levels (IA1, IA2, etc.)  
**Primary Key:** ClassLevelID  
**Columns:**
- ClassLevelID
- LevelName (e.g., "Improv 101", "IA1")
- Description

### 6. ClassLevelProgression Table (Student Progress)
**Purpose:** Tracks which levels each student has completed  
**Primary Key:** ProgressionID  
**Foreign Keys:**
- StudentID → StudentInfo.StudentID
- ClassLevelID → ClassLevels.ClassLevelID

**Columns:**
- ProgressionID
- StudentID (links to StudentInfo)
- ClassLevelID (links to ClassLevels)
- CompletionDate
- Status (Completed/In Progress)

## Data Flow: How Student Information is Retrieved

### Student Directory List Flow
```
1. StudentInfo table (identifies who is a student)
   ↓ PersonnelID
2. Personnel table (provides contact/personal info)
   • FirstName, Lastname
   • PrimaryEmail ← EMAIL
   • PrimaryPhone ← PHONE
   • Instagram, Birthday
   ↓ StudentID
3. StudentEnrollments table (counts enrollments)
   • Filter by Status = 'Active' → Active Enrollments count
   • Count all → Total Enrollments
   ↓ StudentID
4. ClassLevelProgression table (counts completed classes)
   • Filter by Status = 'Completed' → Classes Completed count
   ↓ ClassLevelID
5. ClassLevels table (gets level names)
   • LevelName for CurrentLevel display
```

### Student Profile Flow
```
1. StudentInfo table (student-specific data)
   • StudentID, EnrollmentDate, Status, CurrentLevel, Notes
   ↓ PersonnelID
2. Personnel table (personal details)
   • FirstName, Lastname
   • PrimaryEmail ← EMAIL
   • PrimaryPhone ← PHONE
   • Instagram, Birthday
   ↓ StudentID
3. StudentEnrollments table (get all enrollments for this student)
   ↓ OfferingID
4. ClassOfferings table (enrich enrollment with class details)
   • StartDate, EndDate, VenueOrRoom
   ↓ ClassLevelID, TeacherPersonnelID
5. ClassLevels table (get class level names)
   • LevelName
6. Personnel table (get teacher names)
   • FirstName + Lastname → TeacherName
   ↓ StudentID
7. ClassLevelProgression table (get progression history)
   • All completed/in-progress levels
   ↓ ClassLevelID
8. ClassLevels table (get level names for progression)
   • LevelName
```

## View Tables (Optional Performance Enhancement)

### Enrollment View
**Purpose:** Pre-joined view of StudentEnrollments with all related details  
**Can be used instead of:** Multiple table joins in queries

If available, can be used to get enriched enrollment data in a single query instead of joining StudentEnrollments + ClassOfferings + ClassLevels + Personnel.

## Backend Functions

### Primary Functions (Code.gs)

#### `getAllStudentsWithDetails()`
**Returns:** Array of students with full details  
**Data Sources:**
- StudentInfo (primary)
- Personnel (via PersonnelID)
- StudentEnrollments (for counts)
- ClassLevelProgression (for completed classes)
- ClassLevels (for level names)

**Fields Returned:**
```javascript
{
  // StudentInfo fields
  StudentID: number,
  EnrollmentDate: Date,
  StudentStatus: string,
  CurrentLevel: number,
  CurrentLevelName: string,
  StudentNotes: string,
  
  // Personnel fields
  PersonnelID: number,
  FirstName: string,
  Lastname: string,
  PrimaryEmail: string,    // ← EMAIL
  PrimaryPhone: string,    // ← PHONE
  Instagram: string,
  Birthday: Date,
  
  // Calculated fields
  ActiveEnrollments: number,
  ClassesCompleted: number
}
```

#### `getStudentProfileData(studentId)`
**Parameter:** StudentID (not PersonnelID)  
**Returns:** Complete student profile with enrollments and progression  
**Data Sources:**
- StudentInfo (via StudentID)
- Personnel (via PersonnelID from StudentInfo)
- StudentEnrollments (all for this student)
- ClassOfferings (to enrich enrollments)
- ClassLevels (for level names)
- ClassLevelProgression (progression history)

**Fields Returned:**
```javascript
{
  // StudentInfo fields
  StudentID: number,
  EnrollmentDate: Date,
  StudentStatus: string,
  CurrentLevel: number,
  StudentNotes: string,
  
  // Personnel fields
  PersonnelID: number,
  FirstName: string,
  Lastname: string,
  PrimaryEmail: string,    // ← EMAIL
  PrimaryPhone: string,    // ← PHONE
  Instagram: string,
  Birthday: Date,
  
  // Enriched enrollments array
  Enrollments: [{
    EnrollmentID: number,
    OfferingID: number,
    EnrollmentDate: Date,
    Status: string,
    ClassLevelName: string,
    TeacherName: string,
    StartDate: Date,
    EndDate: Date,
    VenueOrRoom: string
  }],
  
  // Progression array
  Progression: [{
    ProgressionID: number,
    StudentID: number,
    ClassLevelID: number,
    CompletionDate: Date,
    Status: string,
    LevelName: string
  }]
}
```

#### `getEnrollmentsWithDetails(studentId?)`
**Helper function** to get enriched enrollment data  
**Can use:** Enrollment View (if available) or build from base tables  
**Data Sources:**
- Enrollment View (preferred), OR
- StudentEnrollments + ClassOfferings + ClassLevels + Personnel

## Key Points for Frontend Development

### Email & Phone
- ✅ **Always** pull from Personnel table → `PrimaryEmail` and `PrimaryPhone`
- ❌ **Never** store duplicate email/phone in StudentInfo table

### Birthday
- ✅ Available in Personnel table
- ℹ️ Not needed in StudentInfo - already in Personnel

### Class Enrollments
- ✅ Use StudentEnrollments table (junction table)
- ✅ Can cross-reference with ClassOfferings for class details
- ✅ Can cross-reference with ClassLevels for level names
- ✅ Use Enrollment View for pre-joined data (if available)

### Student Identification
- ✅ Use StudentID (from StudentInfo) as primary identifier for students
- ⚠️ PersonnelID links to Personnel table
- ⚠️ Don't confuse StudentID with PersonnelID

## Common Queries

### "Get all students"
```javascript
// Frontend call
const response = await gasService.getAllStudentsWithDetails();

// Returns students from StudentInfo joined with Personnel
// Email comes from Personnel.PrimaryEmail
// Phone comes from Personnel.PrimaryPhone
```

### "Get student profile"
```javascript
// Frontend call (uses StudentID)
const response = await gasService.getStudentProfileData(studentId);

// Returns complete profile with:
// - Personal info from Personnel (including email/phone)
// - Student info from StudentInfo
// - Enrollments from StudentEnrollments (enriched with class details)
// - Progression from ClassLevelProgression
```

### "Enroll student in class"
```javascript
// Uses StudentID and OfferingID
// Creates record in StudentEnrollments table
```

## Database Integrity Rules

1. **Personnel First:** A person MUST exist in Personnel before StudentInfo entry
2. **Student Before Enrollment:** StudentInfo record MUST exist before StudentEnrollments
3. **Single Source:** Email and Phone always come from Personnel table
4. **Referential Integrity:** All foreign keys must reference valid primary keys

## Updated Files
- ✅ Code.gs - Backend functions updated
- ✅ SHEET_CONFIG - Added StudentInfo and EnrollmentView references
- ✅ getSheetHeaders() - Added correct columns for StudentInfo and StudentEnrollments
