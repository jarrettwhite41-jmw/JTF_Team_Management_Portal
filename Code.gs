/**
 * JTF Team Management Portal - Google Apps Script Backend
 * This file contains all server-side functions for the React frontend
 */

// Configuration
const SHEET_CONFIG = {
  personnel: 'Personnel',
  showInformation: 'ShowInformation',
  classOfferings: 'ClassOfferings',
  showPerformances: 'ShowPerformances',
  studentEnrollments: 'StudentEnrollments',
  crewDuties: 'CrewDuties',
  inventory: 'Inventory',
  showTypes: 'ShowTypes',
  classLevels: 'ClassLevels',
  crewDutyTypes: 'CrewDutyTypes'
};

/**
 * Serves the main HTML page - This function is required for web apps
 */
function doGet() {
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include function for HTML template
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get the active spreadsheet
 */
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

/**
 * Get a specific sheet by name
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    // Create sheet if it doesn't exist
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  }
  
  return sheet;
}

/**
 * Initialize a sheet with headers based on the sheet type
 */
function initializeSheet(sheet, sheetName) {
  const headers = getSheetHeaders(sheetName);
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
}

/**
 * Get headers for each sheet type
 */
function getSheetHeaders(sheetName) {
  const headerMap = {
    [SHEET_CONFIG.personnel]: ['PersonnelID', 'FirstName', 'LastName', 'PrimaryEmail', 'PrimaryPhone', 'Instagram', 'Birthday'],
    [SHEET_CONFIG.showInformation]: ['ShowID', 'ShowDate', 'ShowTime', 'ShowTypeID', 'DirectorID', 'Venue', 'Status'],
    [SHEET_CONFIG.classOfferings]: ['OfferingID', 'ClassLevelID', 'StartDate', 'EndDate', 'TeacherPersonnelID', 'VenueOrRoom', 'MaxStudents', 'Status'],
    [SHEET_CONFIG.showPerformances]: ['PerformanceID', 'ShowID', 'CastMemberID', 'Role'],
    [SHEET_CONFIG.studentEnrollments]: ['EnrollmentID', 'OfferingID', 'StudentPersonnelID', 'EnrollmentDate', 'Status'],
    [SHEET_CONFIG.crewDuties]: ['DutyID', 'ShowID', 'CrewMemberID', 'CrewDutyTypeID'],
    [SHEET_CONFIG.inventory]: ['ItemID', 'ItemName', 'Category', 'Quantity', 'Location', 'Notes'],
    [SHEET_CONFIG.showTypes]: ['ShowTypeID', 'ShowTypeName'],
    [SHEET_CONFIG.classLevels]: ['ClassLevelID', 'LevelName', 'Description'],
    [SHEET_CONFIG.crewDutyTypes]: ['CrewDutyTypeID', 'DutyName']
  };
  
  return headerMap[sheetName] || [];
}

/**
 * Convert sheet data to objects
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

/**
 * Get next available ID for a sheet
 */
function getNextId(sheet, idColumn = 0) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return 1;
  
  const ids = data.slice(1).map(row => parseInt(row[idColumn]) || 0);
  return Math.max(...ids) + 1;
}

/**
 * Add or update a row in a sheet
 */
function addOrUpdateRow(sheet, data, idColumn = 0) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(header => data[header] || '');
  
  if (data[headers[idColumn]]) {
    // Update existing row
    const allData = sheet.getDataRange().getValues();
    const rowIndex = allData.findIndex((row, index) => 
      index > 0 && row[idColumn] == data[headers[idColumn]]
    );
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      return data;
    }
  }
  
  // Add new row
  const newId = getNextId(sheet, idColumn);
  rowData[idColumn] = newId;
  data[headers[idColumn]] = newId;
  
  sheet.appendRow(rowData);
  return data;
}

/**
 * Delete a row from a sheet
 */
function deleteRow(sheet, id, idColumn = 0) {
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, index) => 
    index > 0 && row[idColumn] == id
  );
  
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    return true;
  }
  
  return false;
}

// =============================================================================
// PERSONNEL FUNCTIONS
// =============================================================================

/**
 * Get all personnel
 */
function getAllPersonnel() {
  try {
    const sheet = getSheet(SHEET_CONFIG.personnel);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting personnel:', error);
    throw new Error('Failed to retrieve personnel data');
  }
}

/**
 * Create new personnel
 */
function createPersonnel(personnelData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.personnel);
    return addOrUpdateRow(sheet, personnelData);
  } catch (error) {
    console.error('Error creating personnel:', error);
    throw new Error('Failed to create personnel');
  }
}

/**
 * Update personnel
 */
function updatePersonnel(personnelData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.personnel);
    return addOrUpdateRow(sheet, personnelData);
  } catch (error) {
    console.error('Error updating personnel:', error);
    throw new Error('Failed to update personnel');
  }
}

/**
 * Delete personnel
 */
function deletePersonnel(personnelId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.personnel);
    return deleteRow(sheet, personnelId);
  } catch (error) {
    console.error('Error deleting personnel:', error);
    throw new Error('Failed to delete personnel');
  }
}

// =============================================================================
// SHOW FUNCTIONS
// =============================================================================

/**
 * Get all shows
 */
function getAllShows() {
  try {
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting shows:', error);
    throw new Error('Failed to retrieve shows data');
  }
}

/**
 * Create new show
 */
function createShow(showData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    return addOrUpdateRow(sheet, showData);
  } catch (error) {
    console.error('Error creating show:', error);
    throw new Error('Failed to create show');
  }
}

/**
 * Update show
 */
function updateShow(showData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    return addOrUpdateRow(sheet, showData);
  } catch (error) {
    console.error('Error updating show:', error);
    throw new Error('Failed to update show');
  }
}

/**
 * Delete show
 */
function deleteShow(showId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    return deleteRow(sheet, showId);
  } catch (error) {
    console.error('Error deleting show:', error);
    throw new Error('Failed to delete show');
  }
}

// =============================================================================
// CLASS FUNCTIONS
// =============================================================================

/**
 * Get all classes
 */
function getAllClasses() {
  try {
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting classes:', error);
    throw new Error('Failed to retrieve classes data');
  }
}

/**
 * Create new class
 */
function createClass(classData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    return addOrUpdateRow(sheet, classData);
  } catch (error) {
    console.error('Error creating class:', error);
    throw new Error('Failed to create class');
  }
}

/**
 * Update class
 */
function updateClass(classData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    return addOrUpdateRow(sheet, classData);
  } catch (error) {
    console.error('Error updating class:', error);
    throw new Error('Failed to update class');
  }
}

/**
 * Delete class
 */
function deleteClass(offeringId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    return deleteRow(sheet, offeringId);
  } catch (error) {
    console.error('Error deleting class:', error);
    throw new Error('Failed to delete class');
  }
}

// =============================================================================
// ENROLLMENT FUNCTIONS
// =============================================================================

/**
 * Get student enrollments for a class
 */
function getStudentEnrollments(offeringId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const data = sheetToObjects(sheet);
    return data.filter(enrollment => enrollment.OfferingID == offeringId);
  } catch (error) {
    console.error('Error getting enrollments:', error);
    throw new Error('Failed to retrieve enrollments');
  }
}

/**
 * Enroll students in a class
 */
function enrollStudents(offeringId, studentIds) {
  try {
    const sheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const enrollmentDate = new Date().toISOString().split('T')[0];
    
    studentIds.forEach(studentId => {
      const enrollmentData = {
        OfferingID: offeringId,
        StudentPersonnelID: studentId,
        EnrollmentDate: enrollmentDate,
        Status: 'Active'
      };
      addOrUpdateRow(sheet, enrollmentData);
    });
    
    return true;
  } catch (error) {
    console.error('Error enrolling students:', error);
    throw new Error('Failed to enroll students');
  }
}

// =============================================================================
// SHOW PERFORMANCE FUNCTIONS
// =============================================================================

/**
 * Get show performances (cast)
 */
function getShowPerformances(showId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.showPerformances);
    const data = sheetToObjects(sheet);
    return data.filter(performance => performance.ShowID == showId);
  } catch (error) {
    console.error('Error getting show performances:', error);
    throw new Error('Failed to retrieve show performances');
  }
}

/**
 * Update show cast
 */
function updateShowCast(showId, castMembers) {
  try {
    const sheet = getSheet(SHEET_CONFIG.showPerformances);
    
    // Remove existing cast members for this show
    const allData = sheet.getDataRange().getValues();
    for (let i = allData.length - 1; i > 0; i--) {
      if (allData[i][1] == showId) { // ShowID is in column 1 (index 1)
        sheet.deleteRow(i + 1);
      }
    }
    
    // Add new cast members
    castMembers.forEach(member => {
      const performanceData = {
        ShowID: showId,
        CastMemberID: member.CastMemberID,
        Role: member.Role
      };
      addOrUpdateRow(sheet, performanceData, 0); // PerformanceID is in column 0
    });
    
    return true;
  } catch (error) {
    console.error('Error updating show cast:', error);
    throw new Error('Failed to update show cast');
  }
}

// =============================================================================
// INVENTORY FUNCTIONS
// =============================================================================

/**
 * Get all inventory
 */
function getAllInventory() {
  try {
    const sheet = getSheet(SHEET_CONFIG.inventory);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting inventory:', error);
    throw new Error('Failed to retrieve inventory data');
  }
}

/**
 * Create inventory item
 */
function createInventoryItem(itemData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.inventory);
    return addOrUpdateRow(sheet, itemData);
  } catch (error) {
    console.error('Error creating inventory item:', error);
    throw new Error('Failed to create inventory item');
  }
}

/**
 * Update inventory item
 */
function updateInventoryItem(itemData) {
  try {
    const sheet = getSheet(SHEET_CONFIG.inventory);
    return addOrUpdateRow(sheet, itemData);
  } catch (error) {
    console.error('Error updating inventory item:', error);
    throw new Error('Failed to update inventory item');
  }
}

/**
 * Delete inventory item
 */
function deleteInventoryItem(itemId) {
  try {
    const sheet = getSheet(SHEET_CONFIG.inventory);
    return deleteRow(sheet, itemId);
  } catch (error) {
    console.error('Error deleting inventory item:', error);
    throw new Error('Failed to delete inventory item');
  }
}

// =============================================================================
// LOOKUP TABLE FUNCTIONS
// =============================================================================

/**
 * Get all show types
 */
function getAllShowTypes() {
  try {
    const sheet = getSheet(SHEET_CONFIG.showTypes);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting show types:', error);
    return [
      { ShowTypeID: 1, ShowTypeName: 'Improv Show' },
      { ShowTypeID: 2, ShowTypeName: 'Sketch Comedy' }
    ];
  }
}

/**
 * Get all class levels
 */
function getAllClassLevels() {
  try {
    const sheet = getSheet(SHEET_CONFIG.classLevels);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting class levels:', error);
    return [
      { ClassLevelID: 1, LevelName: 'Beginner', Description: 'Introduction to Improv' },
      { ClassLevelID: 2, LevelName: 'Intermediate', Description: 'Building Improv Skills' }
    ];
  }
}

/**
 * Get all crew duty types
 */
function getAllCrewDutyTypes() {
  try {
    const sheet = getSheet(SHEET_CONFIG.crewDutyTypes);
    return sheetToObjects(sheet);
  } catch (error) {
    console.error('Error getting crew duty types:', error);
    return [
      { CrewDutyTypeID: 1, DutyName: 'Sound Technician' },
      { CrewDutyTypeID: 2, DutyName: 'Lighting Technician' }
    ];
  }
}

// =============================================================================
// DASHBOARD FUNCTIONS
// =============================================================================

/**
 * Get dashboard statistics
 */
function getDashboardStats() {
  try {
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const showsSheet = getSheet(SHEET_CONFIG.showInformation);
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    
    const totalPersonnel = Math.max(0, personnelSheet.getLastRow() - 1);
    const upcomingShows = Math.max(0, showsSheet.getLastRow() - 1);
    const activeClasses = Math.max(0, classesSheet.getLastRow() - 1);
    
    // Count active students (unique student IDs in enrollments)
    const enrollments = sheetToObjects(enrollmentsSheet);
    const activeStudentIds = new Set(
      enrollments
        .filter(e => e.Status === 'Active')
        .map(e => e.StudentPersonnelID)
    );
    const activeStudents = activeStudentIds.size;
    
    return {
      totalPersonnel,
      activeStudents,
      upcomingShows,
      activeClasses
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return {
      totalPersonnel: 0,
      activeStudents: 0,
      upcomingShows: 0,
      activeClasses: 0
    };
  }
}

// =============================================================================
// INITIALIZATION FUNCTIONS
// =============================================================================

/**
 * Initialize the spreadsheet with sample data
 */
function initializeSpreadsheetWithSampleData() {
  try {
    // Initialize Show Types
    const showTypesSheet = getSheet(SHEET_CONFIG.showTypes);
    if (showTypesSheet.getLastRow() <= 1) {
      const showTypes = [
        [1, 'Improv Show'],
        [2, 'Sketch Comedy'],
        [3, 'Stand-up Comedy']
      ];
      showTypesSheet.getRange(2, 1, showTypes.length, 2).setValues(showTypes);
    }
    
    // Initialize Class Levels
    const classLevelsSheet = getSheet(SHEET_CONFIG.classLevels);
    if (classLevelsSheet.getLastRow() <= 1) {
      const classLevels = [
        [1, 'Beginner', 'Introduction to Improv'],
        [2, 'Intermediate', 'Building Improv Skills'],
        [3, 'Advanced', 'Advanced Improv Techniques']
      ];
      classLevelsSheet.getRange(2, 1, classLevels.length, 3).setValues(classLevels);
    }
    
    // Initialize Crew Duty Types
    const crewDutyTypesSheet = getSheet(SHEET_CONFIG.crewDutyTypes);
    if (crewDutyTypesSheet.getLastRow() <= 1) {
      const crewDutyTypes = [
        [1, 'Sound Technician'],
        [2, 'Lighting Technician'],
        [3, 'Stage Manager'],
        [4, 'House Manager']
      ];
      crewDutyTypesSheet.getRange(2, 1, crewDutyTypes.length, 2).setValues(crewDutyTypes);
    }
    
    console.log('Sample data initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing sample data:', error);
    return false;
  }
}