# Testing Student Data Functions

## Quick Test Guide

Now that the backend is deployed, you can test the student data flow:

### 1. Test in Google Apps Script Editor

Open your Google Apps Script project and run these test functions:

```javascript
// Test 1: Check all sheets are connected
debugSheetConnections()

// Test 2: Verify StudentInfo table structure
function testStudentInfoTable() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('StudentInfo');
  if (sheet) {
    Logger.log('StudentInfo headers: ' + sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]);
    Logger.log('StudentInfo rows: ' + (sheet.getLastRow() - 1));
  } else {
    Logger.log('ERROR: StudentInfo sheet not found!');
  }
}

// Test 3: Test getting all students with details
function testGetAllStudents() {
  const result = getAllStudentsWithDetails();
  Logger.log('Success: ' + result.success);
  Logger.log('Student count: ' + (result.data ? result.data.length : 0));
  if (result.data && result.data.length > 0) {
    Logger.log('Sample student: ' + JSON.stringify(result.data[0]));
  }
}

// Test 4: Test getting student profile (if you have a StudentID)
function testGetStudentProfile() {
  const studentId = 1; // Replace with actual StudentID
  const result = getStudentProfileData(studentId);
  Logger.log('Success: ' + result.success);
  if (result.success) {
    Logger.log('Student profile: ' + JSON.stringify(result.data));
  } else {
    Logger.log('Error: ' + result.error);
  }
}
```

### 2. Verify Table Structure

Make sure your Google Sheet has these tables with correct columns:

#### StudentInfo Table
| StudentID | PersonnelID | EnrollmentDate | Status | CurrentLevel | Notes |
|-----------|-------------|----------------|---------|--------------|-------|
| 1         | 1001        | 2025-01-15     | Active  | 2            | ...   |

#### StudentEnrollments Table
| EnrollmentID | StudentID | OfferingID | EnrollmentDate | Status |
|--------------|-----------|------------|----------------|---------|
| 1            | 1         | 101        | 2025-01-20     | Active  |

#### Personnel Table (should already exist)
| PersonnelID | FirstName | Lastname | PrimaryEmail | PrimaryPhone | Instagram | Birthday |
|-------------|-----------|----------|--------------|--------------|-----------|----------|
| 1001        | John      | Doe      | john@email   | 555-1234     | @john     | 1990-01-01 |

### 3. Test from Frontend

Once tables are set up, test from your portal:

1. Open the portal in browser
2. Navigate to Students tab
3. Check that students are loading with:
   - ✅ Email from Personnel.PrimaryEmail
   - ✅ Phone from Personnel.PrimaryPhone
   - ✅ Proper enrollment counts
   - ✅ Current level information

### 4. Common Issues & Solutions

**Issue:** "StudentInfo sheet not found"
- **Solution:** Create the StudentInfo sheet with the columns listed above

**Issue:** "No students showing up"
- **Solution:** Make sure StudentInfo table has records linking to Personnel via PersonnelID

**Issue:** "Email/Phone showing blank"
- **Solution:** Verify Personnel table has PrimaryEmail and PrimaryPhone data

**Issue:** "Enrollment counts are 0"
- **Solution:** Check StudentEnrollments table has records with matching StudentID

### 5. Backend Functions Available

#### For Student Directory:
```javascript
getAllStudentsWithDetails()
```
Returns: Array of students with email from Personnel.PrimaryEmail, phone from Personnel.PrimaryPhone

#### For Student Profile:
```javascript
getStudentProfileData(studentId)
```
Returns: Full profile with enrollments cross-referenced to ClassOfferings and ClassLevels

#### For Enrollment Management:
```javascript
getEnrollmentsWithDetails(studentId)
```
Returns: Enriched enrollment data (can use Enrollment View or build from base tables)

### 6. Expected Data Flow

```
User clicks "Students" tab
    ↓
Frontend calls: getAllStudentsWithDetails()
    ↓
Backend queries:
    1. StudentInfo (identifies students)
    2. Personnel (gets email/phone via PersonnelID)
    3. StudentEnrollments (counts enrollments)
    4. ClassLevelProgression (counts completed classes)
    5. ClassLevels (gets level names)
    ↓
Returns student array with:
    - FirstName, Lastname from Personnel
    - PrimaryEmail from Personnel ✅
    - PrimaryPhone from Personnel ✅
    - EnrollmentDate, Status, CurrentLevel from StudentInfo
    - ActiveEnrollments count
    - ClassesCompleted count
    ↓
Frontend displays in StudentDirectory component
```

## Next Steps

1. ✅ Backend deployed (npm run push completed)
2. ⏳ Verify StudentInfo table exists in Google Sheet
3. ⏳ Verify StudentEnrollments table exists in Google Sheet
4. ⏳ Test functions in Apps Script Editor
5. ⏳ Test in frontend portal

Need help with any of these steps? Let me know!
