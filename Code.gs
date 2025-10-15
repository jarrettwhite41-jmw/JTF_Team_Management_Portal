/**
 * 5JTF Team Management Portal - Google Apps Script Backend
 * Updated: 2025-10-12 20:23:05 UTC by jarrettwhite41-jmw
 * 
 * This file contains all server-side functions that interact directly with Google Sheets.
 * Each function includes detailed comments about data sources and sheet mappings.
 */

// =============================================================================
// GOOGLE SHEETS MENU - Custom menu for admin tools
// =============================================================================

/**
 * Creates custom menu when spreadsheet opens
 */
function onOpen() {
  SpreadsheetApp.getUi()
      .createMenu('Admin Tools')
      .addItem('Update All Student Levels', 'updateHighestCompletedLevels')
      .addToUi();
}

// =============================================================================
// SHEET CONFIGURATION - Maps to actual Google Sheets tabs
// =============================================================================

const SHEET_CONFIG = {
  // Core entity tables
  personnel: 'Personnel',                    // Main people database
  showInformation: 'ShowInformation',        // All shows/performances  
  classOfferings: 'ClassOfferings',          // Classes and workshops
  masterGameList: 'MasterGameList',          // Catalog of improv games
  inventory: 'Inventory',                    // Equipment and supplies
  
  // Cast member tracking
  castMemberView: 'Cast Member View',        // Cast member directory view
  castMemberInfo: 'CastMemberInfo',          // Cast member details table
  showCastView: 'Show Cast View',            // Show cast assignments view
  
  // Student tracking
  studentInfo: 'StudentInfo',                // Student-specific data (extends Personnel)
  enrollmentView: 'Enrollment View',         // Enrollment view with all details
  
  // Relationship/Junction tables
  showPerformances: 'ShowPerformances',      // Cast assignments to shows
  studentEnrollments: 'StudentEnrollments',  // Student-to-class enrollments
  classAttendance: 'ClassAttendance',        // Class attendance tracking
  crewDuties: 'CrewDuties',                 // Crew assignments to shows
  gamesPlayed: 'GamesPlayed',               // Games played in specific shows
  rehearsals: 'Rehearsals',                 // Rehearsal schedules
  rehearsalAttendance: 'RehearsalAttendance', // Who attended which rehearsals
  
  // Lookup/Reference tables
  showTypes: 'ShowTypes',                   // Types of shows (Mainstage, Harold, etc.)
  classLevels: 'ClassLevels',               // Class levels (101, 201, Advanced, etc.)
  teachers: 'Teachers',                     // Teachers table (TeacherID, PersonnelID, Active)
  crewDutyTypes: 'CrewDutyTypes'            // Types of crew positions
};

// Add this diagnostic function to your Code.gs file (at the top, after the SHEET_CONFIG)

/**
 * Diagnostic function to check what sheets exist and debug connection issues
 */
function debugSheetConnections() {
  Logger.log('=== DEBUGGING SHEET CONNECTIONS ===');
  Logger.log(`Debug started by: jarrettwhite41-jmw at ${new Date().toISOString()}`);
  
  try {
    // First, check if we can connect to the spreadsheet at all
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`✓ Connected to spreadsheet: "${ss.getName()}" (ID: ${ss.getId()})`);
    
    // Get all existing sheets
    const allSheets = ss.getSheets();
    Logger.log(`Found ${allSheets.length} total sheets in spreadsheet:`);
    
    allSheets.forEach((sheet, index) => {
      const name = sheet.getName();
      const rows = sheet.getLastRow();
      const cols = sheet.getLastColumn();
      Logger.log(`  ${index + 1}. Sheet: "${name}" (${rows} rows, ${cols} columns)`);
      
      // If this sheet has data, show the headers
      if (rows > 0) {
        try {
          const headers = sheet.getRange(1, 1, 1, cols).getValues()[0];
          Logger.log(`     Headers: ${JSON.stringify(headers)}`);
        } catch (headerError) {
          Logger.log(`     Could not read headers: ${headerError.toString()}`);
        }
      }
    });
    
    // Now check specifically for our expected sheets
    Logger.log('\n=== CHECKING FOR EXPECTED SHEETS ===');
    Object.entries(SHEET_CONFIG).forEach(([configKey, sheetName]) => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        Logger.log(`✓ Found: ${configKey} → "${sheetName}" (${sheet.getLastRow()} rows)`);
      } else {
        Logger.log(`✗ Missing: ${configKey} → "${sheetName}"`);
      }
    });
    
    return true;
    
  } catch (error) {
    Logger.log(`CRITICAL ERROR: ${error.toString()}`);
    Logger.log('This suggests the Apps Script may not be bound to a spreadsheet');
    return false;
  }
}

/**
 * Creates the Personnel sheet with proper headers if it doesn't exist
 */
function createPersonnelSheet() {
  Logger.log('=== CREATING PERSONNEL SHEET ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // Check if Personnel sheet already exists
    let personnelSheet = ss.getSheetByName('Personnel');
    
    if (personnelSheet) {
      Logger.log('Personnel sheet already exists, checking structure...');
    } else {
      Logger.log('Personnel sheet does not exist, creating it...');
      personnelSheet = ss.insertSheet('Personnel');
    }
    
    // Set up the headers according to your data dictionary
    const headers = [
      'PersonnelID', 'FirstName', 'LastName', 'PrimaryEmail', 
      'PrimaryPhone', 'Instagram', 'Birthday'
    ];
    
    // Check if headers are already set
    if (personnelSheet.getLastRow() === 0) {
      Logger.log('Setting up Personnel sheet headers...');
      personnelSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      personnelSheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
      personnelSheet.getRange(1, 1, 1, headers.length).setBackground('#e3f2fd');
      Logger.log(`✓ Personnel sheet created with headers: ${JSON.stringify(headers)}`);
    } else {
      Logger.log('Personnel sheet already has data, checking existing headers...');
      const existingHeaders = personnelSheet.getRange(1, 1, 1, personnelSheet.getLastColumn()).getValues()[0];
      Logger.log(`Existing headers: ${JSON.stringify(existingHeaders)}`);
    }
    
    return true;
    
  } catch (error) {
    Logger.log(`ERROR creating Personnel sheet: ${error.toString()}`);
    return false;
  }
}

/**
 * Adds sample personnel data to test the connection
 */
function addSamplePersonnelData() {
  Logger.log('=== ADDING SAMPLE PERSONNEL DATA ===');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const personnelSheet = ss.getSheetByName('Personnel');
    
    if (!personnelSheet) {
      Logger.log('ERROR: Personnel sheet does not exist. Run createPersonnelSheet() first.');
      return false;
    }
    
    // Check if we already have data (beyond the header row)
    if (personnelSheet.getLastRow() > 1) {
      Logger.log('Personnel sheet already has data. Current data:');
      const existingData = personnelSheet.getDataRange().getValues();
      existingData.forEach((row, index) => {
        Logger.log(`Row ${index + 1}: ${JSON.stringify(row)}`);
      });
      return true;
    }
    
    // Add sample data
    const sampleData = [
      [1001, 'Jane', 'Doe', 'jane.doe@email.com', '555-123-4567', '@janedoe', '1995-08-15'],
      [1002, 'John', 'Smith', 'john.smith@email.com', '555-123-4568', '@johnsmith', '1988-03-22'],
      [1003, 'Emily', 'Johnson', 'emily.johnson@email.com', '555-123-4569', '@emilyjohnson', '1992-11-08']
    ];
    
    Logger.log(`Adding ${sampleData.length} sample personnel records...`);
    
    // Add the data starting from row 2 (after headers)
    personnelSheet.getRange(2, 1, sampleData.length, 7).setValues(sampleData);
    
    Logger.log('✓ Sample personnel data added successfully');
    
    // Verify the data was added
    const allData = personnelSheet.getDataRange().getValues();
    Logger.log(`Personnel sheet now has ${allData.length} total rows (including header)`);
    
    return true;
    
  } catch (error) {
    Logger.log(`ERROR adding sample data: ${error.toString()}`);
    return false;
  }
}

// Also update the getSheet function to provide better debugging:
function getSheet(sheetName) {
  Logger.log(`getSheet() called for: "${sheetName}"`);
  
  try {
    const ss = getSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      Logger.log(`Sheet '${sheetName}' not found, creating new sheet...`);
      sheet = ss.insertSheet(sheetName);
      initializeSheet(sheet, sheetName);
      Logger.log(`✓ Created new sheet: "${sheetName}"`);
    } else {
      Logger.log(`✓ Found existing sheet: "${sheetName}" (${sheet.getLastRow()} rows, ${sheet.getLastColumn()} columns)`);
    }
    
    return sheet;
    
  } catch (error) {
    Logger.log(`ERROR in getSheet("${sheetName}"): ${error.toString()}`);
    throw error;
  }
}

/**
 * Serves the main HTML page - Required for Google Apps Script web apps
 * DATA SOURCE: Serves index.html file to browser
 */
function doGet() {
  Logger.log('doGet() called - serving index.html to user: jarrettwhite41-jmw');
  return HtmlService.createHtmlOutputFromFile('index')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// =============================================================================
// UTILITY FUNCTIONS - Core data access helpers
// =============================================================================

/**
 * Gets the active spreadsheet (your JTF database)
 * DATA SOURCE: The currently bound Google Spreadsheet
 */
function getSpreadsheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log(`Connected to spreadsheet: ${ss.getName()} (ID: ${ss.getId()})`);
  return ss;
}

/**
 * Gets a specific sheet by name, creates if doesn't exist
 * DATA SOURCE: Individual tabs within your Google Spreadsheet
 * @param {string} sheetName - Name of the sheet tab (from SHEET_CONFIG)
 */
function getSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    Logger.log(`Sheet '${sheetName}' not found, creating new sheet...`);
    sheet = ss.insertSheet(sheetName);
    initializeSheet(sheet, sheetName);
  } else {
    Logger.log(`Connected to existing sheet: '${sheetName}' (${sheet.getLastRow()} rows)`);
  }
  
  return sheet;
}

/**
 * Converts sheet data to JavaScript objects
 * DATA FLOW: Google Sheets rows → JavaScript object array
 * @param {Sheet} sheet - The Google Sheet to convert
 * @returns {Array} Array of objects where each object represents a row
 */
/**
 * Converts sheet data to JavaScript objects
 * DATA FLOW: Google Sheets rows → JavaScript object array
 * @param {Sheet} sheet - The Google Sheet to convert
 * @returns {Array} Array of objects where each object represents a row
 */
function sheetToObjects(sheet) {
  const data = sheet.getDataRange().getValues();
  Logger.log(`Converting sheet '${sheet.getName()}' - ${data.length} total rows (including header)`);
  
  if (data.length < 2) {
    Logger.log(`Sheet '${sheet.getName()}' has no data rows (only header or empty)`);
    return [];
  }
  
  const headers = data[0];  // First row contains column names
  const rows = data.slice(1);  // Skip header row
  
  const objects = rows.map((row, index) => {
    const obj = {};
    headers.forEach((header, columnIndex) => {
      let rawValue = row[columnIndex];
      
      // CRITICAL FIX: Google Sheets dates are returned as Date objects.
      // The Apps Script/HTML bridge can fail silently when serializing complex objects 
      // containing Date objects. Convert Date to a string for reliable transfer.
      if (rawValue instanceof Date) {
        // Use ISO string for reliable transfer and easy re-parsing on the client
        rawValue = rawValue.toISOString(); 
      }
      
      // Also ensure null/undefined values from empty cells are converted to empty string
      if (rawValue === undefined || rawValue === null) {
        rawValue = '';
      }
      
      obj[header] = rawValue;
    });
    return obj;
  });
  
  Logger.log(`Converted ${objects.length} data rows from sheet '${sheet.getName()}'`);
  return objects;
}

/**
 * Gets the next available ID for auto-incrementing primary keys
 * DATA SOURCE: Scans the ID column to find highest existing ID
 * @param {Sheet} sheet - The sheet to scan
 * @param {number} idColumn - Column index containing IDs (usually 0)
 */
function getNextId(sheet, idColumn = 0) {
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log(`Sheet '${sheet.getName()}' is empty, starting with ID 1`);
    return 1;
  }
  
  const ids = data.slice(1).map(row => parseInt(row[idColumn]) || 0);
  const maxId = Math.max(...ids);
  const nextId = maxId + 1;
  
  Logger.log(`Sheet '${sheet.getName()}' - highest ID: ${maxId}, next ID will be: ${nextId}`);
  return nextId;
}

// =============================================================================
// PERSONNEL FUNCTIONS - FULL CRUD OPERATIONS
// DATA SOURCE: 'Personnel' sheet
// COLUMNS: PersonnelID | FirstName | Lastname | PrimaryEmail | PrimaryPhone | Instagram | Birthday
// =============================================================================

/**
 * SIMPLE TEST FUNCTION: Returns a basic response to test frontend-backend communication
 */
function testConnection() {
  Logger.log('=== testConnection() called ===');
  try {
    return {
      success: true,
      message: 'Backend connection working',
      timestamp: new Date().toISOString(),
      scriptVersion: '1.0'
    };
  } catch (error) {
    Logger.log(`ERROR in testConnection(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * SIMPLE DEBUG FUNCTION: Test basic Google Sheets connection
 * This function tests the most basic functionality to isolate issues
 */
function debugPersonnelSheet() {
  try {
    Logger.log('=== DEBUG PERSONNEL SHEET ===');
    
    // Test 1: Can we get the spreadsheet?
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`✓ Spreadsheet connected: ${ss.getName()}`);
    
    // Test 2: List all sheet names
    const allSheets = ss.getSheets();
    const sheetNames = allSheets.map(sheet => sheet.getName());
    Logger.log(`Available sheets: ${JSON.stringify(sheetNames)}`);
    
    // Test 3: Can we get the Personnel sheet specifically?
    const personnelSheet = ss.getSheetByName('Personnel');
    if (!personnelSheet) {
      Logger.log('✗ Personnel sheet NOT FOUND');
      return { 
        success: false, 
        data: null,
        error: 'Personnel sheet not found',
        availableSheets: sheetNames 
      };
    }
    
    Logger.log(`✓ Personnel sheet found`);
    
    // Test 4: Check if sheet has data
    const lastRow = personnelSheet.getLastRow();
    const lastCol = personnelSheet.getLastColumn();
    Logger.log(`Personnel sheet dimensions: ${lastRow} rows, ${lastCol} columns`);
    
    if (lastRow < 2) {
      Logger.log('✗ Personnel sheet appears to be empty (less than 2 rows)');
      return { 
        success: true, 
        data: {
          spreadsheetName: ss.getName(),
          availableSheets: sheetNames,
          personnelSheetFound: true,
          dimensions: { rows: lastRow, cols: lastCol },
          headers: [],
          sampleData: []
        }
      };
    }
    
    // Test 5: Get headers
    const headers = personnelSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log(`Headers: ${JSON.stringify(headers)}`);
    
    // Test 6: Get first few rows of data
    const dataRange = personnelSheet.getRange(2, 1, Math.min(3, lastRow - 1), lastCol);
    const sampleData = dataRange.getValues();
    Logger.log(`Sample data (first 3 rows): ${JSON.stringify(sampleData)}`);
    
    return {
      success: true,
      data: {
        spreadsheetName: ss.getName(),
        availableSheets: sheetNames,
        personnelSheetFound: true,
        dimensions: { rows: lastRow, cols: lastCol },
        headers: headers,
        sampleData: sampleData.slice(0, 2) // Return first 2 rows as sample
      }
    };
    
  } catch (error) {
    Logger.log(`ERROR in debugPersonnelSheet(): ${error.toString()}`);
    return { 
      success: false, 
      data: null,
      error: error.toString()
    };
  }
}

/**
 * READ OPERATION: Gets all people from the Personnel sheet
 * DATA SOURCE: Personnel sheet → all rows converted to objects
 * RETURNS: Array of person objects with PersonnelID, FirstName, Lastname, etc.
 */
function getAllPersonnel() {
  try {
    Logger.log('=== getAllPersonnel() called ===');
    Logger.log('Fetching from Personnel sheet');
    
    // Step 1: Test basic spreadsheet connection
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    Logger.log(`Connected to spreadsheet: ${ss.getName()}`);
    
    // Step 2: Test getting the sheet
    Logger.log('Getting Personnel sheet...');
    const sheet = getSheet(SHEET_CONFIG.personnel);
    const personnel = sheetToObjects(sheet);
    Logger.log(`Sheet obtained: ${sheet ? sheet.getName() : 'NULL'}`);
    
    if (!sheet) {
      Logger.log('ERROR: Sheet is null');
      return { success: false, data: null, error: 'Sheet is null' };
    }
    
    // Step 3: Test converting to objects
    Logger.log('Converting sheet to objects...');
    Logger.log(`Conversion complete. Result type: ${typeof personnel}`);
    Logger.log(`Personnel array length: ${personnel ? personnel.length : 'NULL'}`);
    
    if (personnel && personnel.length > 0) {
      Logger.log(`Sample record: ${JSON.stringify(personnel[0])}`);
    } else {
      Logger.log('No personnel records found');
    }
    
    Logger.log('=== getAllPersonnel() returning ===');
    Logger.log(`Returning: ${JSON.stringify(personnel)}`);
    return personnel; // <--- RETURN THE ARRAY DIRECTLY
    
  } catch (error) {
    Logger.log(`ERROR in getAllPersonnel(): ${error.toString()}`);
    Logger.log(`Error stack: ${error.stack}`);
    return { success: false, data: null, error: error.toString(), stack: error.stack };
  }
}

/**
 * CREATE OPERATION: Creates a new person in the Personnel sheet
 * DATA FLOW: Input object → new row appended to Personnel sheet
 * @param {Object} personnelData - Person data (FirstName, Lastname, etc.)
 * AUTO-GENERATES: PersonnelID (next available ID)
 */
function createPersonnel(personnelData) {
  try {
    Logger.log(`createPersonnel() called with data: ${JSON.stringify(personnelData)}`);
    const sheet = getSheet(SHEET_CONFIG.personnel);
    
    // Auto-generate PersonnelID
    const newId = getNextId(sheet, 0);
    personnelData.PersonnelID = newId;
    
    // Add to sheet
    const result = addOrUpdateRow(sheet, personnelData, 0);
    Logger.log(`Created new personnel record with ID: ${newId}`);
    
    return result;
  } catch (error) {
    Logger.log(`ERROR in createPersonnel(): ${error.toString()}`);
    throw new Error('Failed to create personnel');
  }
}

/**
 * UPDATE OPERATION: Updates existing person in Personnel sheet
 * DATA FLOW: Input object → finds matching PersonnelID → updates that row
 * @param {Object} personnelData - Complete person data including PersonnelID
 */
function updatePersonnel(personnelData) {
  try {
    Logger.log(`updatePersonnel() called for PersonnelID: ${personnelData.PersonnelID}`);
    const sheet = getSheet(SHEET_CONFIG.personnel);
    const result = addOrUpdateRow(sheet, personnelData, 0);
    
    Logger.log(`Updated personnel record: ${personnelData.PersonnelID}`);
    return { success: true, data: result };
  } catch (error) {
    Logger.log(`ERROR in updatePersonnel(): ${error.toString()}`);
    return { success: false, data: null, error: error.toString() };
  }
}

/**
 * DELETE OPERATION: Deletes person from Personnel sheet
 * DATA FLOW: PersonnelID → finds matching row → deletes entire row
 * @param {number} personnelId - The PersonnelID to delete
 */
function deletePersonnel(personnelId) {
  try {
    Logger.log(`deletePersonnel() called for PersonnelID: ${personnelId}`);
    const sheet = getSheet(SHEET_CONFIG.personnel);
    const result = deleteRow(sheet, personnelId, 0);
    
    Logger.log(`Personnel deletion result: ${result ? 'SUCCESS' : 'FAILED - ID not found'}`);
    return { success: result, data: null, message: result ? 'Personnel deleted successfully' : 'Personnel ID not found' };
  } catch (error) {
    Logger.log(`ERROR in deletePersonnel(): ${error.toString()}`);
    return { success: false, data: null, error: error.toString() };
  }
}

// =============================================================================
// SHOW FUNCTIONS - READ AND CREATE OPERATIONS
// DATA SOURCE: 'ShowInformation' sheet
// COLUMNS: ShowID | ShowDate | ShowTime | ShowTypeID | DirectorID | Venue | Status | AttendanceEstimate | ShowNotes
// =============================================================================

/**
 * READ OPERATION: Gets all shows from ShowInformation sheet
 * DATA SOURCE: ShowInformation sheet → all rows converted to objects
 * RETURNS: Array of show objects with ShowID, ShowDate, Venue, etc.
 */
function getAllShows() {
  try {
    Logger.log('getAllShows() called - fetching from ShowInformation sheet');
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    const shows = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${shows.length} show records`);
    Logger.log(`Sample show: ${shows.length > 0 ? JSON.stringify(shows[0]) : 'No shows found'}`);
    
    return shows;
  } catch (error) {
    Logger.log(`ERROR in getAllShows(): ${error.toString()}`);
    throw new Error('Failed to retrieve shows data');
  }
}

/**
 * CREATE OPERATION: Creates new show in ShowInformation sheet
 * DATA FLOW: Input object → new row appended to ShowInformation sheet
 * AUTO-GENERATES: ShowID (next available ID)
 */
function createShow(showData) {
  try {
    Logger.log(`createShow() called with data: ${JSON.stringify(showData)}`);
    const sheet = getSheet(SHEET_CONFIG.showInformation);
    
    const newId = getNextId(sheet, 0);
    showData.ShowID = newId;
    
    const result = addOrUpdateRow(sheet, showData, 0);
    Logger.log(`Created new show with ID: ${newId}`);
    
    return result;
  } catch (error) {
    Logger.log(`ERROR in createShow(): ${error.toString()}`);
    throw new Error('Failed to create show');
  }
}

// =============================================================================
// CLASS FUNCTIONS - READ OPERATIONS
// DATA SOURCE: 'ClassOfferings' sheet  
// COLUMNS: OfferingID | ClassLevelID | StartDate | EndDate | TeacherPersonnelID | VenueOrRoom | MaxStudents | Status
// =============================================================================

/**
 * READ OPERATION: Gets all class offerings from ClassOfferings sheet
 * DATA SOURCE: ClassOfferings sheet → all rows converted to objects
 * RETURNS: Array of class objects with OfferingID, StartDate, TeacherPersonnelID, etc.
 */
function getAllClasses() {
  try {
    Logger.log('getAllClasses() called - fetching from ClassOfferings sheet');
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    const classes = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${classes.length} class offering records`);
    Logger.log(`Sample class: ${classes.length > 0 ? JSON.stringify(classes[0]) : 'No classes found'}`);
    
    return classes;
  } catch (error) {
    Logger.log(`ERROR in getAllClasses(): ${error.toString()}`);
    throw new Error('Failed to retrieve classes data');
  }
}

// =============================================================================
// ENROLLMENT FUNCTIONS - READ AND CREATE OPERATIONS 
// DATA SOURCE: 'StudentEnrollments' sheet
// COLUMNS: EnrollmentID | StudentID | OfferingID | Status
// =============================================================================

/**
 * READ OPERATION: Gets student enrollments for a specific class
 * DATA SOURCE: StudentEnrollments sheet → filtered by OfferingID
 * @param {number} offeringId - The class OfferingID to get enrollments for
 * RETURNS: Array of enrollment objects for this specific class
 */
function getStudentEnrollments(offeringId) {
  try {
    Logger.log(`getStudentEnrollments() called for OfferingID: ${offeringId}`);
    const sheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(sheet);
    
    // Filter enrollments for this specific class
    const classEnrollments = allEnrollments.filter(enrollment => 
      enrollment.OfferingID == offeringId
    );
    
    Logger.log(`Found ${classEnrollments.length} enrollments for OfferingID ${offeringId}`);
    return classEnrollments;
  } catch (error) {
    Logger.log(`ERROR in getStudentEnrollments(): ${error.toString()}`);
    throw new Error('Failed to retrieve enrollments');
  }
}

/**
 * CREATE OPERATION: Enrolls multiple students in a class
 * DATA FLOW: OfferingID + StudentID array → creates new rows in StudentEnrollments sheet
 * @param {number} offeringId - The class to enroll students in
 * @param {Array} studentIds - Array of PersonnelIDs to enroll
 */
function enrollStudents(offeringId, studentIds) {
  try {
    Logger.log(`enrollStudents() called - enrolling ${studentIds.length} students in OfferingID ${offeringId}`);
    Logger.log(`Student IDs to enroll: ${JSON.stringify(studentIds)}`);
    
    const sheet = getSheet(SHEET_CONFIG.studentEnrollments);
    
    studentIds.forEach(studentId => {
      const enrollmentData = {
        OfferingID: offeringId,
        StudentID: studentId,
        Status: 'Enrolled'
      };
      
      const result = addOrUpdateRow(sheet, enrollmentData, 0);
      Logger.log(`Enrolled StudentID ${studentId} in OfferingID ${offeringId} - EnrollmentID: ${result.EnrollmentID}`);
    });
    
    return true;
  } catch (error) {
    Logger.log(`ERROR in enrollStudents(): ${error.toString()}`);
    throw new Error('Failed to enroll students');
  }
}

// =============================================================================
// SHOW PERFORMANCE FUNCTIONS - READ OPERATIONS
// DATA SOURCE: 'ShowPerformances' sheet
// COLUMNS: PerformanceID | ShowID | CastMemberID | Role
// =============================================================================

/**
 * READ OPERATION: Gets cast members for a specific show
 * DATA SOURCE: ShowPerformances sheet → filtered by ShowID
 * @param {number} showId - The ShowID to get cast for
 * RETURNS: Array of performance objects showing who's cast in this show
 */
function getShowPerformances(showId) {
  try {
    Logger.log(`getShowPerformances() called for ShowID: ${showId}`);
    const sheet = getSheet(SHEET_CONFIG.showPerformances);
    const allPerformances = sheetToObjects(sheet);
    
    // Filter performances for this specific show
    const showCast = allPerformances.filter(performance => 
      performance.ShowID == showId
    );
    
    Logger.log(`Found ${showCast.length} cast members for ShowID ${showId}`);
    return showCast;
  } catch (error) {
    Logger.log(`ERROR in getShowPerformances(): ${error.toString()}`);
    throw new Error('Failed to retrieve show performances');
  }
}

/**
 * READ OPERATION: Gets all cast members with their details
 * DATA SOURCE: Cast Member View sheet joined with CastMemberInfo and Personnel
 * DATA FLOW: Cast Member View → CastMemberInfo (via CastMemberID) → Personnel (via PersonnelID)
 * RETURNS: Array of cast member objects with personal and show information
 */
function getAllCastMembers() {
  try {
    Logger.log('=== getAllCastMembers() called ===');
    
    // Get cast members from the Cast Member View sheet
    // Column A: CastMemberID, Column B: Full Name
    const castMemberViewSheet = getSheet(SHEET_CONFIG.castMemberView);
    const castMemberViewData = sheetToObjects(castMemberViewSheet);
    
    // Get cast member info to link CastMemberID to PersonnelID
    const castMemberInfoSheet = getSheet(SHEET_CONFIG.castMemberInfo);
    const castMemberInfoData = sheetToObjects(castMemberInfoSheet);
    
    // Get personnel data for additional details
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    // Get show performance data for role information
    const performancesSheet = getSheet(SHEET_CONFIG.showPerformances);
    const allPerformances = sheetToObjects(performancesSheet);
    
    // Get show information for show details
    const showsSheet = getSheet(SHEET_CONFIG.showInformation);
    const allShows = sheetToObjects(showsSheet);
    
    // Get Show Cast View data for last show dates
    const showCastViewSheet = getSheet(SHEET_CONFIG.showCastView);
    const showCastViewData = sheetToObjects(showCastViewSheet);
    
    // Create cast member records with enriched data
    const castMembers = castMemberViewData.map(castMemberView => {
      // Find the cast member info to get PersonnelID
      const castMemberInfo = castMemberInfoData.find(info => 
        info.CastMemberID == castMemberView.CastMemberID
      );
      
      // Find the person details using PersonnelID
      const person = castMemberInfo ? 
        allPersonnel.find(p => p.PersonnelID == castMemberInfo.PersonnelID) : null;
      
      // Find last show date from Show Cast View or ShowPerformances
      let lastShowDate = 'N/A';
      
      // First try Show Cast View
      const showCastEntry = showCastViewData.find(entry => 
        entry.CastMemberID == castMemberView.CastMemberID
      );
      
      if (showCastEntry && showCastEntry.ShowDate) {
        lastShowDate = showCastEntry.ShowDate;
      } else {
        // Fallback to ShowPerformances table
        const performance = allPerformances.find(perf => 
          perf.CastMemberID == castMemberView.CastMemberID
        );
        
        if (performance) {
          const show = allShows.find(s => s.ShowID == performance.ShowID);
          if (show && show.ShowDate) {
            lastShowDate = show.ShowDate;
          }
        }
      }
      
      // Get proper first and last names from Personnel table (note: column is "Lastname" not "LastName")
      const firstName = person ? person.FirstName : 'Unknown';
      const lastName = person ? person.Lastname : 'Person';
      const fullName = person ? `${firstName} ${lastName}`.trim() : (castMemberView.FullName || castMemberView['Full Name'] || 'Unknown Person');
      
      return {
        CastMemberID: castMemberView.CastMemberID,
        FullName: fullName,
        
        // Personnel details (if linked) - using same field names as Personnel tab
        PersonnelID: castMemberInfo ? castMemberInfo.PersonnelID : null,
        FirstName: firstName,
        Lastname: lastName,  // Note: "Lastname" to match Personnel sheet column
        PrimaryEmail: person ? person.PrimaryEmail : '',
        PrimaryPhone: person ? person.PrimaryPhone : '',
        Birthday: person ? person.Birthday : '',
        
        // Last show information
        LastShowDate: lastShowDate,
        Status: person ? (person.Status || 'Active') : 'Unknown'
      };
    });
    
    Logger.log(`Found ${castMembers.length} cast members from Cast Member View`);
    Logger.log(`Sample cast member: ${castMembers.length > 0 ? JSON.stringify(castMembers[0]) : 'No cast members found'}`);
    
    return { success: true, data: castMembers };
    
  } catch (error) {
    Logger.log(`ERROR in getAllCastMembers(): ${error.toString()}`);
    return { success: false, data: null, error: error.toString() };
  }
}

// =============================================================================
// INVENTORY FUNCTIONS - FULL CRUD OPERATIONS
// DATA SOURCE: 'Inventory' sheet
// COLUMNS: ItemID | ItemName | Category | Quantity | Location | Notes
// =============================================================================

/**
 * READ OPERATION: Gets all inventory items
 * DATA SOURCE: Inventory sheet → all rows converted to objects
 * RETURNS: Array of inventory objects with ItemID, ItemName, Quantity, etc.
 */
function getAllInventory() {
  try {
    Logger.log('getAllInventory() called - fetching from Inventory sheet');
    const sheet = getSheet(SHEET_CONFIG.inventory);
    const inventory = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${inventory.length} inventory records`);
    Logger.log(`Sample item: ${inventory.length > 0 ? JSON.stringify(inventory[0]) : 'No inventory found'}`);
    
    return inventory;
  } catch (error) {
    Logger.log(`ERROR in getAllInventory(): ${error.toString()}`);
    throw new Error('Failed to retrieve inventory data');
  }
}

/**
 * CREATE OPERATION: Creates new inventory item
 * DATA FLOW: Input object → new row appended to Inventory sheet
 * AUTO-GENERATES: ItemID (next available ID)
 */
function createInventoryItem(itemData) {
  try {
    Logger.log(`createInventoryItem() called with data: ${JSON.stringify(itemData)}`);
    const sheet = getSheet(SHEET_CONFIG.inventory);
    
    const newId = getNextId(sheet, 0);
    itemData.ItemID = newId;
    
    const result = addOrUpdateRow(sheet, itemData, 0);
    Logger.log(`Created new inventory item with ID: ${newId}`);
    
    return result;
  } catch (error) {
    Logger.log(`ERROR in createInventoryItem(): ${error.toString()}`);
    throw new Error('Failed to create inventory item');
  }
}

/**
 * UPDATE OPERATION: Updates existing inventory item
 * DATA FLOW: Input object → finds matching ItemID → updates that row
 */
function updateInventoryItem(itemData) {
  try {
    Logger.log(`updateInventoryItem() called for ItemID: ${itemData.ItemID}`);
    const sheet = getSheet(SHEET_CONFIG.inventory);
    const result = addOrUpdateRow(sheet, itemData, 0);
    
    Logger.log(`Updated inventory item: ${itemData.ItemID}`);
    return result;
  } catch (error) {
    Logger.log(`ERROR in updateInventoryItem(): ${error.toString()}`);
    throw new Error('Failed to update inventory item');
  }
}

/**
 * DELETE OPERATION: Deletes inventory item
 * DATA FLOW: ItemID → finds matching row → deletes entire row
 */
function deleteInventoryItem(itemId) {
  try {
    Logger.log(`deleteInventoryItem() called for ItemID: ${itemId}`);
    const sheet = getSheet(SHEET_CONFIG.inventory);
    const result = deleteRow(sheet, itemId, 0);
    
    Logger.log(`Inventory deletion result: ${result ? 'SUCCESS' : 'FAILED - ID not found'}`);
    return result;
  } catch (error) {
    Logger.log(`ERROR in deleteInventoryItem(): ${error.toString()}`);
    throw new Error('Failed to delete inventory item');
  }
}

// =============================================================================
// LOOKUP TABLE FUNCTIONS - READ OPERATIONS (Reference data for dropdowns and validation)
// =============================================================================

/**
 * READ OPERATION: Gets all show types for dropdown lists
 * DATA SOURCE: ShowTypes sheet → all rows converted to objects
 * COLUMNS: ShowTypeID | ShowTypeName | Description
 * USED BY: Show creation/editing forms to populate "Show Type" dropdown
 */
function getAllShowTypes() {
  try {
    Logger.log('getAllShowTypes() called - fetching from ShowTypes sheet');
    const sheet = getSheet(SHEET_CONFIG.showTypes);
    const showTypes = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${showTypes.length} show type records`);
    return showTypes;
  } catch (error) {
    Logger.log(`ERROR in getAllShowTypes(): ${error.toString()}`);
    // Return fallback data if sheet doesn't exist or has issues
    const fallback = [
      { ShowTypeID: 1, ShowTypeName: 'Mainstage Cast', Description: 'Primary weekend shows' },
      { ShowTypeID: 2, ShowTypeName: 'Harold Team', Description: 'Long-form improv teams' }
    ];
    Logger.log('Returning fallback show types data');
    return fallback;
  }
}

/**
 * READ OPERATION: Gets all class levels for dropdown lists  
 * DATA SOURCE: ClassLevels sheet → all rows converted to objects
 * COLUMNS: ClassLevelID | LevelName | Description
 * USED BY: Class creation/editing forms to populate "Class Level" dropdown
 */
function getAllClassLevels() {
  try {
    Logger.log('getAllClassLevels() called - fetching from ClassLevels sheet');
    const sheet = getSheet(SHEET_CONFIG.classLevels);
    const classLevels = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${classLevels.length} class level records`);
    return classLevels;
  } catch (error) {
    Logger.log(`ERROR in getAllClassLevels(): ${error.toString()}`);
    // Return fallback data if sheet doesn't exist or has issues
    const fallback = [
      { ClassLevelID: 1, LevelName: 'Improv 101', Description: 'Introduction to improvisation' },
      { ClassLevelID: 2, LevelName: 'Improv 201', Description: 'Intermediate improv skills' }
    ];
    Logger.log('Returning fallback class levels data');
    return fallback;
  }
}

/**
 * READ OPERATION: Gets all crew duty types for dropdown lists
 * DATA SOURCE: CrewDutyTypes sheet → all rows converted to objects  
 * COLUMNS: CrewDutyTypeID | DutyName | DutyDescription
 * USED BY: Crew assignment forms to populate "Duty Type" dropdown
 */
function getAllCrewDutyTypes() {
  try {
    Logger.log('getAllCrewDutyTypes() called - fetching from CrewDutyTypes sheet');
    const sheet = getSheet(SHEET_CONFIG.crewDutyTypes);
    const crewDutyTypes = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${crewDutyTypes.length} crew duty type records`);
    return crewDutyTypes;
  } catch (error) {
    Logger.log(`ERROR in getAllCrewDutyTypes(): ${error.toString()}`);
    // Return fallback data if sheet doesn't exist or has issues
    const fallback = [
      { CrewDutyTypeID: 1, DutyName: 'Box Office', DutyDescription: 'Ticket sales and check-ins' },
      { CrewDutyTypeID: 2, DutyName: 'Sound Tech', DutyDescription: 'Audio equipment operation' }
    ];
    Logger.log('Returning fallback crew duty types data');
    return fallback;
  }
}

// =============================================================================
// DASHBOARD FUNCTIONS - READ OPERATIONS (Aggregated statistics from multiple sheets)
// =============================================================================

/**
 * READ OPERATION: Calculates dashboard statistics from multiple sheets
 * DATA SOURCES: 
 * - Personnel sheet (count of all people)
 * - ShowInformation sheet (count of scheduled shows) 
 * - ClassOfferings sheet (count of active classes)
 * - StudentEnrollments sheet (count of unique enrolled students)
 * 
 * RETURNS: Object with totalPersonnel, activeStudents, upcomingShows, activeClasses
 */
function getDashboardStats() {
    try {
        Logger.log('getDashboardStats() called - calculating from multiple sheets');
        
        // READ: Count total personnel from Personnel sheet
        const personnelSheet = getSheet(SHEET_CONFIG.personnel);
        const totalPersonnel = Math.max(0, personnelSheet.getLastRow() - 1);
        Logger.log(`Total personnel count: ${totalPersonnel}`);
        
        // READ: Count upcoming shows from ShowInformation sheet
        const showsSheet = getSheet(SHEET_CONFIG.showInformation);
        const upcomingShows = Math.max(0, showsSheet.getLastRow() - 1);
        Logger.log(`Upcoming shows count: ${upcomingShows}`);
        
        // READ: Count active classes from ClassOfferings sheet
        const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
        const activeClasses = Math.max(0, classesSheet.getLastRow() - 1);
        Logger.log(`Active classes count: ${activeClasses}`);
        
        // READ: Count unique active students from StudentEnrollments sheet
        const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
        const enrollments = sheetToObjects(enrollmentsSheet);
        const activeStudentIds = new Set(
          enrollments
            .filter(e => e.Status === 'Enrolled')  // Only count currently enrolled
            .map(e => e.StudentID)                 // Get unique student IDs
        );
        const activeStudents = activeStudentIds.size;
        Logger.log(`Active students count: ${activeStudents} (from ${enrollments.length} total enrollments)`);
        
        const stats = {
          totalPersonnel,
          activeStudents,
          upcomingShows,
          activeClasses
        };
        
        Logger.log(`Dashboard stats calculated: ${JSON.stringify(stats)}`);
        return stats;  } catch (error) {
    Logger.log(`ERROR in getDashboardStats(): ${error.toString()}`);
    // Return zero stats if there's an error
    const errorStats = {
      totalPersonnel: 0,
      activeStudents: 0,
      upcomingShows: 0,
      activeClasses: 0
    };
    Logger.log('Returning zero stats due to error');
    return errorStats;
  }
}

// =============================================================================
// HELPER FUNCTIONS - CRUD OPERATION SUPPORT (Used by multiple CRUD operations)
// =============================================================================

/**
 * CREATE/UPDATE OPERATION HELPER: Adds new row or updates existing row in a sheet
 * DATA FLOW: Object data → converts to row → appends or updates in sheet
 * @param {Sheet} sheet - The Google Sheet to modify
 * @param {Object} data - Object with field names matching sheet headers
 * @param {number} idColumn - Column index of the ID field (usually 0)
 */
function addOrUpdateRow(sheet, data, idColumn = 0) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = headers.map(header => data[header] || '');
  
  Logger.log(`addOrUpdateRow() - Sheet: ${sheet.getName()}, Headers: ${JSON.stringify(headers)}`);
  Logger.log(`Data to save: ${JSON.stringify(data)}`);
  
  if (data[headers[idColumn]]) {
    // UPDATE OPERATION: Find existing row with matching ID
    const allData = sheet.getDataRange().getValues();
    const rowIndex = allData.findIndex((row, index) => 
      index > 0 && row[idColumn] == data[headers[idColumn]]
    );
    
    if (rowIndex > 0) {
      sheet.getRange(rowIndex + 1, 1, 1, rowData.length).setValues([rowData]);
      Logger.log(`UPDATED row ${rowIndex + 1} in sheet ${sheet.getName()}`);
      return data;
    }
  }
  
  // CREATE OPERATION: Add new row with auto-generated ID
  const newId = getNextId(sheet, idColumn);
  rowData[idColumn] = newId;
  data[headers[idColumn]] = newId;
  
  sheet.appendRow(rowData);
  Logger.log(`CREATED new row in sheet ${sheet.getName()} with ID: ${newId}`);
  return data;
}

/**
 * DELETE OPERATION HELPER: Deletes a row from a sheet by ID
 * DATA FLOW: ID → finds matching row → deletes entire row from sheet
 * @param {Sheet} sheet - The Google Sheet to modify  
 * @param {number|string} id - The ID value to find and delete
 * @param {number} idColumn - Column index of the ID field (usually 0)
 */
function deleteRow(sheet, id, idColumn = 0) {
  const data = sheet.getDataRange().getValues();
  const rowIndex = data.findIndex((row, index) => 
    index > 0 && row[idColumn] == id
  );
  
  Logger.log(`deleteRow() - Sheet: ${sheet.getName()}, Looking for ID: ${id} in column ${idColumn}`);
  
  if (rowIndex > 0) {
    sheet.deleteRow(rowIndex + 1);
    Logger.log(`DELETED row ${rowIndex + 1} from sheet ${sheet.getName()}`);
    return true;
  }
  
  Logger.log(`DELETE FAILED: ID ${id} not found in sheet ${sheet.getName()}`);
  return false;
}

/**
 * CREATE OPERATION HELPER: Initializes a sheet with proper headers if it's empty
 * DATA FLOW: Creates header row with column names for new sheets
 * @param {Sheet} sheet - The Google Sheet to initialize
 * @param {string} sheetName - Name of the sheet (used to determine headers)
 */
function initializeSheet(sheet, sheetName) {
  const headers = getSheetHeaders(sheetName);
  if (headers.length > 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    sheet.getRange(1, 1, 1, headers.length).setBackground('#e3f2fd');
    Logger.log(`Initialized sheet '${sheetName}' with headers: ${JSON.stringify(headers)}`);
  }
}

/**
 * Returns the proper column headers for each sheet type
 * MAPS TO: Your data dictionary field definitions
 * @param {string} sheetName - Name of the sheet
 * @returns {Array} Array of column header names
 */
// Update the getSheetHeaders function to match your actual column names
function getSheetHeaders(sheetName) {
  const headerMap = {
    // Updated to match your ACTUAL column names from the logs
    [SHEET_CONFIG.personnel]: [
      'PersonnelID', 'FirstName', 'Lastname', 'PrimaryEmail',  // Note: "Lastname" not "LastName"
      'PrimaryPhone', 'Instagram', 'Birthday'
    ],
    [SHEET_CONFIG.showInformation]: [
      'ShowID', 'ShowDate', 'ShowTime', 'ShowTypeID', 'DirectorID', 
      'Venue', 'Status', 'AttendanceEstimate', 'ShowNotes'
    ],
    [SHEET_CONFIG.classOfferings]: [
      'OfferingID', 'ClassLevelID', 'StartDate', 'EndDate', 
      'TeacherPersonnelID', 'VenueOrRoom', 'MaxStudents', 'Status'
    ],
    // ... keep the rest as they were
    [SHEET_CONFIG.masterGameList]: [
      'GameID', 'GameName', 'GameDescription', 'PlayerCountMin', 'PlayerCountMax'
    ],
    [SHEET_CONFIG.inventory]: [
      'ItemID', 'ItemName', 'Category', 'Quantity', 'Location', 'Notes'
    ],
    [SHEET_CONFIG.showPerformances]: [
      'PerformanceID', 'ShowID', 'CastMemberID', 'Role'
    ],
    [SHEET_CONFIG.studentInfo]: [
      'StudentID', 'PersonnelID', 'EnrollmentDate', 'Status', 'CurrentLevel', 'Notes'
    ],
    [SHEET_CONFIG.studentEnrollments]: [
      'EnrollmentID', 'StudentID', 'OfferingID', 'EnrollmentDate', 'Status'
    ],
    [SHEET_CONFIG.crewDuties]: [
      'CrewDutyID', 'ShowID', 'PersonnelID', 'CrewDutyTypeID'
    ],
    [SHEET_CONFIG.gamesPlayed]: [
      'GamesPlayedID', 'ShowID', 'GameID'
    ],
    [SHEET_CONFIG.rehearsals]: [
      'RehearsalID', 'ShowID', 'RehearsalDate', 'RehearsalTime', 'RehearsalLocation'
    ],
    [SHEET_CONFIG.rehearsalAttendance]: [
      'AttendanceID', 'RehearsalID', 'PersonnelID', 'AttendanceStatus'
    ],
    [SHEET_CONFIG.showTypes]: [
      'ShowTypeID', 'ShowTypeName', 'Description'
    ],
    [SHEET_CONFIG.classLevels]: [
      'ClassLevelID', 'LevelName', 'Description'
    ],
    [SHEET_CONFIG.crewDutyTypes]: [
      'CrewDutyTypeID', 'DutyName', 'DutyDescription'
    ]
  };
  
  const headers = headerMap[sheetName] || [];
  Logger.log(`Headers for sheet '${sheetName}': ${JSON.stringify(headers)}`);
  return headers;
}

// Add a test function specifically for Personnel
function testPersonnelConnection() {
  Logger.log('=== TESTING PERSONNEL CONNECTION ===');
  Logger.log(`Test started by: jarrettwhite41-jmw at ${new Date().toISOString()}`);
  
  try {
    // Test getting all personnel
    const personnel = getAllPersonnel();
    Logger.log(`✓ Retrieved ${personnel.length} personnel records`);
    
    // Show first few records to verify data structure
    if (personnel.length > 0) {
      Logger.log('Sample personnel records:');
      personnel.slice(0, 3).forEach((person, index) => {
        Logger.log(`  ${index + 1}. ${JSON.stringify(person)}`);
      });
      
      // Check for the specific field names we're using
      const firstPerson = personnel[0];
      Logger.log('\n=== FIELD VERIFICATION ===');
      Logger.log(`PersonnelID: ${firstPerson.PersonnelID}`);
      Logger.log(`FirstName: ${firstPerson.FirstName}`);
      Logger.log(`Lastname: ${firstPerson.Lastname}`); // Note: checking "Lastname"
      Logger.log(`PrimaryEmail: ${firstPerson.PrimaryEmail}`);
      Logger.log(`PrimaryPhone: ${firstPerson.PrimaryPhone}`);
      Logger.log(`Instagram: ${firstPerson.Instagram}`);
      Logger.log(`Birthday: ${firstPerson.Birthday}`);
    }
    
    return true;
    
  } catch (error) {
    Logger.log(`ERROR in testPersonnelConnection(): ${error.toString()}`);
    return false;
  }
}

// =============================================================================
// ADDITIONAL HELPER FUNCTIONS FOR FUTURE USE
// =============================================================================

/**
 * READ OPERATION: Gets all games from MasterGameList sheet
 * DATA SOURCE: MasterGameList sheet → all rows converted to objects
 * COLUMNS: GameID | GameName | GameDescription | PlayerCountMin | PlayerCountMax
 */
function getAllGames() {
  try {
    Logger.log('getAllGames() called - fetching from MasterGameList sheet');
    const sheet = getSheet(SHEET_CONFIG.masterGameList);
    const games = sheetToObjects(sheet);
    
    Logger.log(`Retrieved ${games.length} game records`);
    return games;
  } catch (error) {
    Logger.log(`ERROR in getAllGames(): ${error.toString()}`);
    throw new Error('Failed to retrieve games data');
  }
}

// =============================================================================
// STUDENT MANAGEMENT FUNCTIONS - For student profile and enrollment management
// =============================================================================

/**
 * READ OPERATION: Gets comprehensive student profile data
 * DATA SOURCE: StudentInfo (primary), Personnel, StudentEnrollments, ClassLevelProgression sheets
 * @param {number} studentId - The StudentID from StudentInfo table
 * RETURNS: Complete student profile with enrollments and progression
 */
function getStudentProfileData(studentId) {
  try {
    Logger.log(`=== getStudentProfileData(${studentId}) called ===`);
    
    // Get StudentInfo record
    const studentInfoSheet = getSheet('StudentInfo');
    const allStudentInfo = sheetToObjects(studentInfoSheet);
    const studentInfo = allStudentInfo.find(si => si.StudentID == studentId);
    
    if (!studentInfo) {
      Logger.log(`Student with StudentID ${studentId} not found in StudentInfo table`);
      return { success: false, error: 'Student not found' };
    }
    
    // Get Personnel record
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    const person = allPersonnel.find(p => p.PersonnelID == studentInfo.PersonnelID);
    
    if (!person) {
      Logger.log(`Personnel record not found for PersonnelID ${studentInfo.PersonnelID}`);
      return { success: false, error: 'Personnel record not found' };
    }
    
    // Get student enrollments with class details
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    const studentEnrollments = allEnrollments.filter(e => e.StudentID == studentId);
    
    // Get class offerings to enrich enrollment data
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    
    // Get class levels for level names
    let allLevels = [];
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      allLevels = sheetToObjects(levelsSheet);
    } catch (e) {
      Logger.log('ClassLevels sheet not found');
    }
    
    // Get teachers for teacher names
    const allTeachers = allPersonnel;  // Teachers are in Personnel table
    
    // Enrich enrollments with class details
    const enrichedEnrollments = studentEnrollments.map(enrollment => {
      const classOffering = allClasses.find(c => c.OfferingID == enrollment.OfferingID);
      
      let classLevelName = '';
      let teacherName = '';
      let startDate = '';
      let endDate = '';
      let venueOrRoom = '';
      
      if (classOffering) {
        // Get level name
        const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
        classLevelName = level ? level.LevelName : `Level ${classOffering.ClassLevelID}`;
        
        // Get teacher name
        const teacher = allTeachers.find(t => t.PersonnelID == classOffering.TeacherPersonnelID);
        teacherName = teacher ? `${teacher.FirstName} ${teacher.Lastname}` : '';
        
        startDate = classOffering.StartDate;
        endDate = classOffering.EndDate;
        venueOrRoom = classOffering.VenueOrRoom;
      }
      
      return {
        EnrollmentID: enrollment.EnrollmentID,
        OfferingID: enrollment.OfferingID,
        EnrollmentDate: enrollment.EnrollmentDate,
        CompletionDate: enrollment.CompletionDate || null,
        CompletionStatus: enrollment.CompletionStatus || enrollment.Status || 'Active',
        Status: enrollment.Status || 'Active',
        ClassLevelName: classLevelName,
        TeacherName: teacherName,
        StartDate: startDate,
        EndDate: endDate,
        VenueOrRoom: venueOrRoom
      };
    });
    
    // Get class level progression from StudentEnrollments
    // This shows which class levels the student has taken/is taking
    let classProgression = [];
    try {
      // Try to use Enrollment View first (has all the joins already)
      let enrollmentData = [];
      try {
        const enrollmentViewSheet = getSheet(SHEET_CONFIG.enrollmentView);
        enrollmentData = sheetToObjects(enrollmentViewSheet).filter(e => e.StudentID == studentId);
        Logger.log(`Using Enrollment View for progression - found ${enrollmentData.length} records`);
      } catch (viewError) {
        Logger.log('Enrollment View not available, building from StudentEnrollments');
        // Fallback: use the enriched enrollments we already built
        enrollmentData = enrichedEnrollments;
      }
      
      // Group by ClassLevelID to avoid duplicates (student may take same level multiple times)
      const levelMap = new Map();
      
      enrichedEnrollments.forEach(enrollment => {
        // Extract ClassLevelID from the class offering
        const classOffering = allClasses.find(c => c.OfferingID == enrollment.OfferingID);
        if (classOffering && classOffering.ClassLevelID) {
          const levelId = classOffering.ClassLevelID;
          
          // Only add if we haven't seen this level, or if this one is more recent/completed
          if (!levelMap.has(levelId)) {
            const level = allLevels.find(l => l.ClassLevelID == levelId);
            levelMap.set(levelId, {
              ClassLevelID: levelId,
              LevelName: level ? level.LevelName : `Level ${levelId}`,
              Status: enrollment.Status,
              EnrollmentDate: enrollment.EnrollmentDate,
              OfferingID: enrollment.OfferingID
            });
          } else {
            // Update if this enrollment is completed and the existing one isn't
            const existing = levelMap.get(levelId);
            if (enrollment.Status === 'Completed' && existing.Status !== 'Completed') {
              existing.Status = enrollment.Status;
              existing.EnrollmentDate = enrollment.EnrollmentDate;
            }
          }
        }
      });
      
      // Convert map to array and sort by level ID
      classProgression = Array.from(levelMap.values()).sort((a, b) => a.ClassLevelID - b.ClassLevelID);
      
      Logger.log(`Built class progression: ${classProgression.length} unique levels`);
      
    } catch (e) {
      Logger.log(`Error building class progression: ${e.toString()}`);
    }
    
    // Also get ClassLevelProgression table if it exists (for historical tracking)
    let historicalProgression = [];
    try {
      const progressionSheet = getSheet('ClassLevelProgression');
      const allProgression = sheetToObjects(progressionSheet);
      historicalProgression = allProgression.filter(p => p.StudentID == studentId);
      
      // Enrich with level names
      historicalProgression = historicalProgression.map(prog => {
        const level = allLevels.find(l => l.ClassLevelID == prog.ClassLevelID);
        return {
          ...prog,
          LevelName: level ? level.LevelName : `Level ${prog.ClassLevelID}`
        };
      });
      
      Logger.log(`Found ${historicalProgression.length} historical progression records`);
    } catch (e) {
      Logger.log('ClassLevelProgression table not found or error: ' + e.toString());
    }
    
    // Build complete profile
    const profile = {
      // StudentInfo fields
      StudentID: studentInfo.StudentID,
      EnrollmentDate: studentInfo.EnrollmentDate,
      StudentStatus: studentInfo.Status || 'Active',
      CurrentLevel: studentInfo.CurrentLevel,
      StudentNotes: studentInfo.Notes,
      
      // Personnel fields
      PersonnelID: person.PersonnelID,
      FirstName: person.FirstName,
      Lastname: person.Lastname,
      PrimaryEmail: person.PrimaryEmail,
      PrimaryPhone: person.PrimaryPhone,
      Instagram: person.Instagram,
      Birthday: person.Birthday,
      
      // Enrollment and progression data
      Enrollments: enrichedEnrollments,
      Progression: classProgression,  // Built from StudentEnrollments (unique levels)
      HistoricalProgression: historicalProgression  // From ClassLevelProgression table if exists
    };
    
    Logger.log(`Student profile loaded for ${person.FirstName} ${person.Lastname} (StudentID: ${studentId})`);
    Logger.log(`  - ${enrichedEnrollments.length} enrollments`);
    Logger.log(`  - ${classProgression.length} unique class levels taken`);
    Logger.log(`  - ${historicalProgression.length} historical progression records`);
    return { success: true, data: profile };
    
  } catch (error) {
    Logger.log(`ERROR in getStudentProfileData(): ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * READ OPERATION: Gets comprehensive student profile data (OLD VERSION - kept for compatibility)
 * DATA SOURCE: Personnel sheet → enriched with StudentInfo if exists
 * @param {number} personnelId - The PersonnelID of the student
 * RETURNS: Complete student profile with enrollments and progression
 */
function getStudentProfile(personnelId) {
  try {
    Logger.log(`=== getStudentProfile(${personnelId}) called ===`);
    Logger.log(`NOTE: This function uses PersonnelID. Consider using getStudentProfileData() with StudentID instead.`);
    
    // Get basic personnel information
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    const student = allPersonnel.find(p => p.PersonnelID == personnelId);
    
    if (!student) {
      Logger.log(`Student with PersonnelID ${personnelId} not found`);
      return { success: false, error: 'Student not found' };
    }

    // Get student enrollments
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    const studentEnrollments = allEnrollments.filter(e => e.StudentPersonnelID == personnelId);

    // Try to get class level progression (may not exist in all implementations)
    let classProgression = [];
    try {
      const progressionSheet = getSheet('ClassLevelProgression');
      const allProgression = sheetToObjects(progressionSheet);
      classProgression = allProgression.filter(p => p.StudentID == personnelId);
    } catch (e) {
      Logger.log('ClassLevelProgression sheet not found, continuing without progression data');
    }

    // Try to get additional student info (may not exist in all implementations)
    let studentInfo = null;
    try {
      const studentInfoSheet = getSheet('StudentInfo');
      const allStudentInfo = sheetToObjects(studentInfoSheet);
      studentInfo = allStudentInfo.find(si => si.PersonnelID == personnelId);
    } catch (e) {
      Logger.log('StudentInfo sheet not found, using basic personnel data');
    }

    const profile = {
      ...student,
      isStudent: true,
      StudentInfo: studentInfo,
      Enrollments: studentEnrollments,
      ClassProgression: classProgression
    };

    Logger.log(`Student profile loaded for ${student.FirstName} ${student.Lastname}`);
    return { success: true, data: profile };

  } catch (error) {
    Logger.log(`ERROR in getStudentProfile(): ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * READ OPERATION: Gets all students with full details
 * DATA SOURCE: StudentInfo table (primary) joined with Personnel table
 * COLUMNS: StudentInfo - StudentID, PersonnelID, EnrollmentDate, Status, CurrentLevel, Notes
 * RETURNS: Array of student objects with personnel details + student-specific fields
 */
function getAllStudentsWithDetails() {
  try {
    Logger.log('=== getAllStudentsWithDetails() called ===');
    
    // Get StudentInfo table - this is the source of truth for who is a student
    const studentInfoSheet = getSheet('StudentInfo');
    const allStudentInfo = sheetToObjects(studentInfoSheet);
    
    // Get Personnel table for contact/personal information
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    // Get StudentEnrollments to count active enrollments and find current enrollment
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    
    // Get ClassOfferings for class details
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    
    // Get ClassLevels for level names
    let allLevels = [];
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      allLevels = sheetToObjects(levelsSheet);
    } catch (e) {
      Logger.log('ClassLevels sheet not found, continuing without level names');
    }
    
    // Get ClassLevelProgression to count completed classes
    let allProgression = [];
    try {
      const progressionSheet = getSheet('ClassLevelProgression');
      allProgression = sheetToObjects(progressionSheet);
    } catch (e) {
      Logger.log('ClassLevelProgression sheet not found, continuing without progression data');
    }
    
    // Join StudentInfo with Personnel and enrich with enrollment/progression data
    const studentsWithDetails = allStudentInfo.map(studentInfo => {
      // Find the corresponding personnel record
      const person = allPersonnel.find(p => p.PersonnelID == studentInfo.PersonnelID);
      
      if (!person) {
        Logger.log(`WARNING: StudentInfo record ${studentInfo.StudentID} has no matching Personnel record`);
        return null;
      }
      
      // Get enrollments for this student
      const studentEnrollments = allEnrollments.filter(e => 
        e.StudentID == studentInfo.StudentID
      );
      
      // Find current (active/in progress) enrollments
      const currentEnrollments = studentEnrollments.filter(e => 
        e.CompletionStatus === 'In Progress' || 
        e.CompletionStatus === 'Active' || 
        e.CompletionStatus === 'Enrolled' ||
        (!e.CompletionStatus && (e.Status === 'Active' || e.Status === 'In Progress' || e.Status === 'Enrolled'))
      );
      
      // Get the most recent active enrollment
      let currentEnrollmentName = null;
      if (currentEnrollments.length > 0) {
        // Sort by enrollment date descending
        const sortedEnrollments = currentEnrollments.sort((a, b) => {
          const dateA = a.EnrollmentDate ? new Date(a.EnrollmentDate) : new Date(0);
          const dateB = b.EnrollmentDate ? new Date(b.EnrollmentDate) : new Date(0);
          return dateB - dateA;
        });
        
        const mostRecentEnrollment = sortedEnrollments[0];
        const classOffering = allClasses.find(c => c.OfferingID == mostRecentEnrollment.OfferingID);
        
        if (classOffering) {
          const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
          currentEnrollmentName = level ? level.LevelName : `Level ${classOffering.ClassLevelID}`;
        }
      }
      
      // Count active enrollments
      const activeEnrollments = currentEnrollments.length;
      
      // Count completed classes from progression
      const studentProgression = allProgression.filter(p => 
        p.StudentID == studentInfo.StudentID
      );
      const completedClasses = studentProgression.filter(p => 
        p.Status === 'Completed'
      ).length;
      
      // Get current level name
      let currentLevelName = '';
      if (studentInfo.CurrentLevel) {
        const level = allLevels.find(l => l.ClassLevelID == studentInfo.CurrentLevel);
        currentLevelName = level ? level.LevelName : `Level ${studentInfo.CurrentLevel}`;
      }
      
      // Return combined student record with all details
      return {
        // StudentInfo fields
        StudentID: studentInfo.StudentID,
        EnrollmentDate: studentInfo.EnrollmentDate,
        StudentStatus: studentInfo.Status || 'Active',
        CurrentLevel: studentInfo.CurrentLevel,
        CurrentLevelName: currentLevelName,
        StudentNotes: studentInfo.Notes,
        
        // Personnel fields
        PersonnelID: person.PersonnelID,
        FirstName: person.FirstName,
        Lastname: person.Lastname,  // Note: "Lastname" to match sheet column
        PrimaryEmail: person.PrimaryEmail,
        PrimaryPhone: person.PrimaryPhone,
        Instagram: person.Instagram,
        Birthday: person.Birthday,
        
        // Calculated fields for student cards
        CurrentEnrollment: currentEnrollmentName,
        HighestLevelCompleted: studentInfo.HighestLevelCompleted || null,
        ActiveEnrollments: activeEnrollments,
        ClassesCompleted: completedClasses
      };
    }).filter(student => student !== null);  // Remove any null entries from missing personnel
    
    Logger.log(`Found ${studentsWithDetails.length} students with full details`);
    if (studentsWithDetails.length > 0) {
      Logger.log(`Sample student: ${JSON.stringify(studentsWithDetails[0])}`);
    }
    
    return { success: true, data: studentsWithDetails };
    
  } catch (error) {
    Logger.log(`ERROR in getAllStudentsWithDetails(): ${error.toString()}`);
    return { success: false, data: [], error: error.toString() };
  }
}

/**
 * READ OPERATION: Gets all students for dropdown selection (simple version)
 * DATA SOURCE: StudentInfo table joined with Personnel
 * RETURNS: Basic student list for dropdowns/selection
 */
function getAllStudents() {
  try {
    Logger.log('=== getAllStudents() called ===');
    
    // Get StudentInfo table - this identifies who is a student
    const studentInfoSheet = getSheet('StudentInfo');
    const allStudentInfo = sheetToObjects(studentInfoSheet);
    
    // Get Personnel table for names and contact info
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    // Get StudentEnrollments to find current enrollments
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    
    // Get ClassOfferings for class details
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    
    // Get ClassLevels for level names
    let allLevels = [];
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      allLevels = sheetToObjects(levelsSheet);
    } catch (e) {
      Logger.log('ClassLevels sheet not found');
    }
    
    // Join StudentInfo with Personnel and find current enrollment
    const students = allStudentInfo.map(studentInfo => {
      const person = allPersonnel.find(p => p.PersonnelID == studentInfo.PersonnelID);
      
      if (!person) {
        return null;
      }
      
      // Find current (active/in progress) enrollments for this student
      const currentEnrollments = allEnrollments.filter(e => 
        e.StudentID == studentInfo.StudentID && 
        (e.CompletionStatus === 'In Progress' || 
         e.CompletionStatus === 'Active' || 
         e.CompletionStatus === 'Enrolled' ||
         (!e.CompletionStatus && (e.Status === 'Active' || e.Status === 'In Progress' || e.Status === 'Enrolled')))
      );
      
      // Get the most recent active enrollment
      let currentEnrollmentName = null;
      if (currentEnrollments.length > 0) {
        // Sort by enrollment date descending
        const sortedEnrollments = currentEnrollments.sort((a, b) => {
          const dateA = a.EnrollmentDate ? new Date(a.EnrollmentDate) : new Date(0);
          const dateB = b.EnrollmentDate ? new Date(b.EnrollmentDate) : new Date(0);
          return dateB - dateA;
        });
        
        const mostRecentEnrollment = sortedEnrollments[0];
        const classOffering = allClasses.find(c => c.OfferingID == mostRecentEnrollment.OfferingID);
        
        if (classOffering) {
          const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
          currentEnrollmentName = level ? level.LevelName : `Level ${classOffering.ClassLevelID}`;
        }
      }
      
      return {
        StudentID: studentInfo.StudentID,
        PersonnelID: person.PersonnelID,
        FirstName: person.FirstName,
        Lastname: person.Lastname,
        PrimaryEmail: person.PrimaryEmail,
        PrimaryPhone: person.PrimaryPhone,
        Birthday: person.Birthday,
        Status: studentInfo.Status || 'Active',
        CurrentEnrollment: currentEnrollmentName,
        HighestLevelCompleted: studentInfo.HighestLevelCompleted || null
      };
    }).filter(student => student !== null);
    
    Logger.log(`Found ${students.length} students`);
    
    // Log sample data for first student
    if (students.length > 0) {
      Logger.log(`Sample student data: ${JSON.stringify(students[0])}`);
    }
    
    return { success: true, data: students };
    
  } catch (error) {
    Logger.log(`ERROR in getAllStudents(): ${error.toString()}`);
    return { success: false, data: [], error: error.toString() };
  }
}

/**
 * READ OPERATION: Gets active class offerings for enrollment
 * DATA SOURCE: ClassOfferings sheet filtered by status
 */
function getActiveClassOfferings() {
  try {
    Logger.log('=== getActiveClassOfferings() called ===');
    
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    
    // Filter for active/upcoming classes
    const activeClasses = allClasses.filter(c => 
      c.Status === 'Open' || c.Status === 'Upcoming' || c.Status === 'In Progress'
    );
    
    // Enhance with level names if available
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      const levels = sheetToObjects(levelsSheet);
      
      activeClasses.forEach(classOffering => {
        const level = levels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
        if (level) {
          classOffering.LevelName = level.LevelName;
        }
      });
    } catch (e) {
      Logger.log('ClassLevels sheet not found, continuing without level names');
    }
    
    Logger.log(`Found ${activeClasses.length} active class offerings`);
    return { success: true, data: activeClasses };
    
  } catch (error) {
    Logger.log(`ERROR in getActiveClassOfferings(): ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * CREATE OPERATION: Enrolls a single student in a class
 * DATA FLOW: Creates new row in StudentEnrollments sheet
 * @param {number} studentId - PersonnelID of the student
 * @param {number} offeringId - OfferingID of the class
 */
function enrollStudent(studentId, offeringId) {
  try {
    Logger.log(`=== enrollStudent(${studentId}, ${offeringId}) called ===`);
    
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    
    // Check if student is already enrolled
    const existingEnrollments = sheetToObjects(enrollmentsSheet);
    const existingEnrollment = existingEnrollments.find(e => 
      (e.StudentPersonnelID == studentId || e.StudentID == studentId) && e.OfferingID == offeringId
    );
    
    if (existingEnrollment) {
      Logger.log(`Student ${studentId} is already enrolled in offering ${offeringId}`);
      return { success: false, error: 'Student is already enrolled in this class' };
    }
    
    const enrollmentData = {
      OfferingID: offeringId,
      StudentPersonnelID: studentId,
      StudentID: studentId,
      EnrollmentDate: new Date().toISOString().split('T')[0],
      Status: 'Active'
    };
    
    appendToSheet(enrollmentsSheet, enrollmentData);
    
    Logger.log(`Successfully enrolled student ${studentId} in offering ${offeringId}`);
    return { success: true, data: 'Student enrolled successfully' };
    
  } catch (error) {
    Logger.log(`ERROR in enrollStudent(): ${error.toString()}`);
    return { success: false, error: error.toString() };
  }
}

/**
 * HELPER FUNCTION: Get enriched enrollment data (can use Enrollment View if available)
 * DATA SOURCE: Enrollment View (preferred) or StudentEnrollments + ClassOfferings + ClassLevels
 * RETURNS: Enrollment records with class details
 * @param {number} studentId - Optional StudentID to filter by
 */
function getEnrollmentsWithDetails(studentId = null) {
  try {
    Logger.log(`=== getEnrollmentsWithDetails(${studentId || 'ALL'}) called ===`);
    
    // Try to use Enrollment View first (already has all joins done)
    try {
      const enrollmentViewSheet = getSheet(SHEET_CONFIG.enrollmentView);
      let enrollments = sheetToObjects(enrollmentViewSheet);
      
      if (studentId) {
        enrollments = enrollments.filter(e => e.StudentID == studentId);
      }
      
      Logger.log(`Retrieved ${enrollments.length} enrollments from Enrollment View`);
      return { success: true, data: enrollments };
      
    } catch (viewError) {
      Logger.log('Enrollment View not available, building from base tables...');
      
      // Fallback: Build enrollment details from base tables
      const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
      let enrollments = sheetToObjects(enrollmentsSheet);
      
      if (studentId) {
        enrollments = enrollments.filter(e => e.StudentID == studentId);
      }
      
      // Enrich with class details
      const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
      const allClasses = sheetToObjects(classesSheet);
      
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      const allLevels = sheetToObjects(levelsSheet);
      
      const personnelSheet = getSheet(SHEET_CONFIG.personnel);
      const allPersonnel = sheetToObjects(personnelSheet);
      
      const enrichedEnrollments = enrollments.map(enrollment => {
        const classOffering = allClasses.find(c => c.OfferingID == enrollment.OfferingID);
        
        let enriched = { ...enrollment };
        
        if (classOffering) {
          const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
          const teacher = allPersonnel.find(p => p.PersonnelID == classOffering.TeacherPersonnelID);
          
          enriched.ClassLevelName = level ? level.LevelName : '';
          enriched.TeacherName = teacher ? `${teacher.FirstName} ${teacher.Lastname}` : '';
          enriched.StartDate = classOffering.StartDate;
          enriched.EndDate = classOffering.EndDate;
          enriched.VenueOrRoom = classOffering.VenueOrRoom;
        }
        
        return enriched;
      });
      
      Logger.log(`Built ${enrichedEnrollments.length} enriched enrollments from base tables`);
      return { success: true, data: enrichedEnrollments };
    }
    
  } catch (error) {
    Logger.log(`ERROR in getEnrollmentsWithDetails(): ${error.toString()}`);
    return { success: false, data: [], error: error.toString() };
  }
}

/**
 * Test function to verify all sheets and data connections
 * RUN THIS: To test that all your sheets are connected properly
 */
function testAllDataConnections() {
  Logger.log('=== TESTING ALL DATA CONNECTIONS ===');
  Logger.log(`Test started by: jarrettwhite41-jmw at ${new Date().toISOString()}`);
  
  try {
    // Test each major function
    const personnel = getAllPersonnel();
    Logger.log(`✓ Personnel: ${personnel.length} records`);
    
    const shows = getAllShows();
    Logger.log(`✓ Shows: ${shows.length} records`);
    
    const classes = getAllClasses();
    Logger.log(`✓ Classes: ${classes.length} records`);
    
    const inventory = getAllInventory();
    Logger.log(`✓ Inventory: ${inventory.length} records`);
    
    const showTypes = getAllShowTypes();
    Logger.log(`✓ Show Types: ${showTypes.length} records`);
    
    const classLevels = getAllClassLevels();
    Logger.log(`✓ Class Levels: ${classLevels.length} records`);
    
    const stats = getDashboardStats();
    Logger.log(`✓ Dashboard Stats: ${JSON.stringify(stats)}`);
    
    Logger.log('=== ALL CONNECTIONS SUCCESSFUL ===');
    return true;
    
  } catch (error) {
    Logger.log(`=== CONNECTION TEST FAILED: ${error.toString()} ===`);
    return false;
  }
}

// =============================================================================
// ADMIN TOOLS - Automated student level calculation
// =============================================================================

/**
 * ADMIN OPERATION: Updates HighestLevelCompleted for all students
 * This function calculates the highest completed class level for each student
 * based on their enrollment history with CompletionStatus = "Completed"
 * 
 * Algorithm:
 * 1. Load all data from StudentInfo, StudentEnrollments, ClassOfferings, and ClassLevels
 * 2. Create lookup maps for fast access to ClassOfferings and ClassLevels
 * 3. For each student, find all completed enrollments
 * 4. Determine the most recently completed enrollment
 * 5. Update StudentInfo.HighestLevelCompleted only if value changed (performance optimization)
 * 
 * This function is triggered from Admin Tools menu in Google Sheets UI
 */
function updateHighestCompletedLevels() {
  try {
    Logger.log('=== updateHighestCompletedLevels() started ===');
    const startTime = new Date();
    
    // Get all required sheets
    const studentInfoSheet = getSheet('StudentInfo');
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const classOfferingsSheet = getSheet(SHEET_CONFIG.classOfferings);
    const classLevelsSheet = getSheet(SHEET_CONFIG.classLevels);
    
    // Convert sheets to objects
    const allStudentInfo = sheetToObjects(studentInfoSheet);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    const allClassOfferings = sheetToObjects(classOfferingsSheet);
    const allClassLevels = sheetToObjects(classLevelsSheet);
    
    Logger.log(`Loaded ${allStudentInfo.length} students, ${allEnrollments.length} enrollments, ${allClassOfferings.length} offerings, ${allClassLevels.length} levels`);
    
    // Create lookup maps for fast access
    // Map: OfferingID -> ClassLevelID
    const offeringToLevelMap = new Map();
    allClassOfferings.forEach(offering => {
      offeringToLevelMap.set(offering.OfferingID, offering.ClassLevelID);
    });
    
    // Map: ClassLevelID -> LevelName
    const levelIdToNameMap = new Map();
    allClassLevels.forEach(level => {
      levelIdToNameMap.set(level.ClassLevelID, level.LevelName);
    });
    
    Logger.log('Created lookup maps for offerings and levels');
    
    // Track updates for each student
    const updates = new Map(); // StudentID -> { rowIndex, newHighestLevel }
    
    // Process each student
    allStudentInfo.forEach((studentInfo, index) => {
      const studentId = studentInfo.StudentID;
      
      // Find all completed enrollments for this student
      const completedEnrollments = allEnrollments.filter(enrollment => 
        enrollment.StudentID == studentId && 
        enrollment.CompletionStatus === 'Completed' &&
        enrollment.CompletionDate
      );
      
      if (completedEnrollments.length === 0) {
        // No completed enrollments, skip this student
        return;
      }
      
      // Sort by CompletionDate descending to find most recent
      completedEnrollments.sort((a, b) => {
        const dateA = new Date(a.CompletionDate);
        const dateB = new Date(b.CompletionDate);
        return dateB - dateA; // Most recent first
      });
      
      // Get the most recently completed enrollment
      const mostRecentCompleted = completedEnrollments[0];
      const offeringId = mostRecentCompleted.OfferingID;
      
      // Look up the ClassLevelID from the offering
      const classLevelId = offeringToLevelMap.get(offeringId);
      
      if (!classLevelId) {
        Logger.log(`Warning: No ClassLevelID found for OfferingID ${offeringId} (Student ${studentId})`);
        return;
      }
      
      // Look up the LevelName
      const levelName = levelIdToNameMap.get(classLevelId);
      
      if (!levelName) {
        Logger.log(`Warning: No LevelName found for ClassLevelID ${classLevelId} (Student ${studentId})`);
        return;
      }
      
      // Check if the value needs to be updated
      const currentHighestLevel = studentInfo.HighestLevelCompleted;
      
      if (currentHighestLevel !== levelName) {
        // Value changed, queue this update
        updates.set(studentId, {
          rowIndex: index + 2, // +2 because: +1 for 1-indexed, +1 for header row
          newHighestLevel: levelName,
          oldValue: currentHighestLevel || '(empty)'
        });
      }
    });
    
    Logger.log(`Found ${updates.size} students that need HighestLevelCompleted updated`);
    
    // Apply the updates to the sheet
    if (updates.size > 0) {
      const headers = studentInfoSheet.getRange(1, 1, 1, studentInfoSheet.getLastColumn()).getValues()[0];
      const highestLevelColIndex = headers.indexOf('HighestLevelCompleted');
      
      if (highestLevelColIndex === -1) {
        throw new Error('HighestLevelCompleted column not found in StudentInfo sheet');
      }
      
      let updateCount = 0;
      updates.forEach((updateInfo, studentId) => {
        const cell = studentInfoSheet.getRange(updateInfo.rowIndex, highestLevelColIndex + 1);
        cell.setValue(updateInfo.newHighestLevel);
        updateCount++;
        
        if (updateCount <= 10) {
          // Log first 10 updates for verification
          Logger.log(`Updated StudentID ${studentId}: "${updateInfo.oldValue}" -> "${updateInfo.newHighestLevel}"`);
        }
      });
      
      Logger.log(`Successfully updated ${updateCount} student records`);
    } else {
      Logger.log('No updates needed - all student levels are current');
    }
    
    const endTime = new Date();
    const duration = (endTime - startTime) / 1000;
    Logger.log(`=== updateHighestCompletedLevels() completed in ${duration} seconds ===`);
    
    // Show success message to user
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Updated ${updates.size} student${updates.size === 1 ? '' : 's'} in ${duration.toFixed(1)} seconds`,
      'Student Levels Updated',
      5
    );
    
    return {
      success: true,
      studentsProcessed: allStudentInfo.length,
      studentsUpdated: updates.size,
      duration: duration
    };
    
  } catch (error) {
    Logger.log(`ERROR in updateHighestCompletedLevels(): ${error.toString()}`);
    Logger.log(`Stack trace: ${error.stack}`);
    
    // Show error message to user
    SpreadsheetApp.getActiveSpreadsheet().toast(
      `Error: ${error.toString()}`,
      'Update Failed',
      10
    );
    
    return {
      success: false,
      error: error.toString()
    };
  }
}

// =============================================================================
// CLASS MANAGEMENT FUNCTIONS - For class offerings, roster, and attendance
// =============================================================================

/**
 * CREATE OPERATION: Creates a new class offering
 * DATA SOURCE: ClassOfferings sheet
 * @param {Object} classData - Object containing class details
 * @returns {Object} Success status and new offering data
 */
function createClassOffering(classData) {
  try {
    Logger.log('=== createClassOffering() called ===');
    Logger.log(`Class data: ${JSON.stringify(classData)}`);
    
    const sheet = getSheet(SHEET_CONFIG.classOfferings);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Generate new OfferingID
    const allData = sheetToObjects(sheet);
    const maxId = allData.reduce((max, row) => Math.max(max, row.OfferingID || 0), 0);
    const newOfferingId = maxId + 1;
    
    // Prepare row data
    const rowData = headers.map(header => {
      if (header === 'OfferingID') return newOfferingId;
      if (header === 'Status') return classData.Status || 'Upcoming';
      if (header === 'CreatedDate') return new Date();
      return classData[header] || '';
    });
    
    // Add new row
    sheet.appendRow(rowData);
    
    Logger.log(`Created new class offering with ID: ${newOfferingId}`);
    
    return {
      success: true,
      data: {
        OfferingID: newOfferingId,
        ...classData
      }
    };
    
  } catch (error) {
    Logger.log(`ERROR in createClassOffering(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * READ OPERATION: Gets all class offerings with teacher names and enrollment counts
 * DATA SOURCE: ClassOfferings, Personnel, StudentEnrollments, ClassLevels sheets
 * @returns {Object} Success status and array of class offerings
 */
function getAllClassOfferings() {
  try {
    Logger.log('=== getAllClassOfferings() called ===');
    
    // Get all necessary data
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    
    // Get Teachers table to map TeacherID to PersonnelID
    let allTeachers = [];
    try {
      const teachersSheet = getSheet(SHEET_CONFIG.teachers);
      allTeachers = sheetToObjects(teachersSheet);
      Logger.log(`Found ${allTeachers.length} teachers in Teachers table`);
      if (allTeachers.length > 0) {
        Logger.log(`Sample teacher record: ${JSON.stringify(allTeachers[0])}`);
      }
    } catch (e) {
      Logger.log('Teachers sheet not found, will try direct Personnel lookup');
    }
    
    // Get ClassLevels for level names
    let allLevels = [];
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      allLevels = sheetToObjects(levelsSheet);
    } catch (e) {
      Logger.log('ClassLevels sheet not found');
    }
    
    Logger.log(`Processing ${allClasses.length} class offerings`);
    if (allClasses.length > 0) {
      Logger.log(`Sample class offering: ${JSON.stringify(allClasses[0])}`);
    }
    
    // Enrich each class with teacher name and enrollment count
    const enrichedClasses = allClasses.map(classOffering => {
      // Get teacher name through Teachers table
      // ClassOfferings.TeacherID → Teachers.TeacherID → Teachers.PersonnelID → Personnel.PersonnelID
      let teacherName = 'TBA';
      let debugInfo = {
        offeringId: classOffering.OfferingID,
        teacherId: classOffering.TeacherID,
        teacherRecord: null,
        personnelId: null,
        personnelRecord: null
      };
      
      if (allTeachers.length > 0) {
        // Look up teacher by TeacherID
        const teacher = allTeachers.find(t => t.TeacherID == classOffering.TeacherID);
        debugInfo.teacherRecord = teacher;
        
        if (teacher) {
          debugInfo.personnelId = teacher.PersonnelID;
          const personnel = allPersonnel.find(p => p.PersonnelID == teacher.PersonnelID);
          debugInfo.personnelRecord = personnel;
          
          if (personnel) {
            teacherName = `${personnel.FirstName} ${personnel.Lastname}`;
            Logger.log(`✓ OfferingID ${classOffering.OfferingID}: TeacherID ${classOffering.TeacherID} → PersonnelID ${teacher.PersonnelID} → ${teacherName}`);
          } else {
            Logger.log(`✗ OfferingID ${classOffering.OfferingID}: PersonnelID ${teacher.PersonnelID} not found in Personnel table`);
          }
        } else {
          Logger.log(`✗ OfferingID ${classOffering.OfferingID}: TeacherID ${classOffering.TeacherID} not found in Teachers table`);
        }
      } else {
        Logger.log(`! No Teachers table found, using fallback`);
        // Fallback: try direct lookup in case Teachers table not available
        const teacher = allPersonnel.find(p => p.PersonnelID == classOffering.TeacherID);
        if (teacher) {
          teacherName = `${teacher.FirstName} ${teacher.Lastname}`;
        }
      }
      
      // Count enrolled students (excluding only Dropped/Withdrawn)
      const enrollments = allEnrollments.filter(e => {
        if (e.OfferingID != classOffering.OfferingID) return false;
        
        // Exclude only Dropped and Withdrawn students
        const status = e.CompletionStatus || e.Status || 'Active';
        return status !== 'Dropped' && status !== 'Withdrawn';
      });
      const enrolledCount = enrollments.length;
      
      Logger.log(`OfferingID ${classOffering.OfferingID}: Found ${enrolledCount} enrolled students`);
      
      // Get level name
      const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
      const levelName = level ? level.LevelName : `Level ${classOffering.ClassLevelID}`;
      
      // Calculate status based on dates if not explicitly set
      let status = classOffering.Status || 'Upcoming';
      if (!classOffering.Status) {
        const today = new Date();
        const startDate = new Date(classOffering.StartDate);
        const endDate = new Date(classOffering.EndDate);
        
        if (today > endDate) {
          status = 'Completed';
        } else if (today >= startDate && today <= endDate) {
          status = 'In Progress';
        } else {
          status = 'Upcoming';
        }
      }
      
      return {
        ...classOffering,
        TeacherName: teacherName,
        LevelName: levelName,
        EnrolledCount: enrolledCount,
        MaxStudents: classOffering.MaxStudents || 12,
        Status: status
      };
    });
    
    Logger.log(`Found ${enrichedClasses.length} class offerings`);
    
    return {
      success: true,
      data: enrichedClasses
    };
    
  } catch (error) {
    Logger.log(`ERROR in getAllClassOfferings(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * READ OPERATION: Gets complete details for a specific class offering
 * DATA SOURCE: ClassOfferings, StudentEnrollments, ClassAttendance, Personnel sheets
 * @param {number} offeringId - The OfferingID to fetch details for
 * @returns {Object} Success status and complete class data
 */
function getClassOfferingDetails(offeringId) {
  try {
    Logger.log(`=== getClassOfferingDetails(${offeringId}) called ===`);
    
    // Get class offering
    const classesSheet = getSheet(SHEET_CONFIG.classOfferings);
    const allClasses = sheetToObjects(classesSheet);
    const classOffering = allClasses.find(c => c.OfferingID == offeringId);
    
    if (!classOffering) {
      return {
        success: false,
        error: 'Class offering not found'
      };
    }
    
    // Get teacher info through Teachers table
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    let teacherInfo = null;
    let teachersSheet = null;
    try {
      teachersSheet = getSheet(SHEET_CONFIG.teachers);
      const allTeachers = sheetToObjects(teachersSheet);
      const teacher = allTeachers.find(t => t.TeacherID == classOffering.TeacherID);
      if (teacher) {
        teacherInfo = allPersonnel.find(p => p.PersonnelID == teacher.PersonnelID);
      }
    } catch (e) {
      Logger.log('Teachers sheet not found, trying direct lookup');
      teacherInfo = allPersonnel.find(p => p.PersonnelID == classOffering.TeacherID);
    }
    
    // Get level name
    let levelName = '';
    try {
      const levelsSheet = getSheet(SHEET_CONFIG.classLevels);
      const allLevels = sheetToObjects(levelsSheet);
      const level = allLevels.find(l => l.ClassLevelID == classOffering.ClassLevelID);
      levelName = level ? level.LevelName : `Level ${classOffering.ClassLevelID}`;
    } catch (e) {
      Logger.log('ClassLevels sheet not found');
      levelName = `Level ${classOffering.ClassLevelID}`;
    }
    
    // Get enrolled students
    const enrollmentsSheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const allEnrollments = sheetToObjects(enrollmentsSheet);
    const classEnrollments = allEnrollments.filter(e => e.OfferingID == offeringId);
    
    // Get StudentInfo for student data
    const studentInfoSheet = getSheet(SHEET_CONFIG.studentInfo);
    const allStudentInfo = sheetToObjects(studentInfoSheet);
    
    // Enrich enrollments with student details
    const enrolledStudents = classEnrollments.map(enrollment => {
      const studentInfo = allStudentInfo.find(si => si.StudentID == enrollment.StudentID);
      const person = studentInfo ? allPersonnel.find(p => p.PersonnelID == studentInfo.PersonnelID) : null;
      
      return {
        EnrollmentID: enrollment.EnrollmentID,
        StudentID: enrollment.StudentID,
        FirstName: person ? person.FirstName : 'Unknown',
        Lastname: person ? person.Lastname : 'Student',
        PrimaryEmail: person ? person.PrimaryEmail : '',
        EnrollmentDate: enrollment.EnrollmentDate,
        CompletionStatus: enrollment.CompletionStatus || enrollment.Status || 'Active',
        CompletionDate: enrollment.CompletionDate || null
      };
    });
    
    // Get attendance records
    let attendanceRecords = [];
    try {
      const attendanceSheet = getSheet(SHEET_CONFIG.classAttendance);
      const allAttendance = sheetToObjects(attendanceSheet);
      
      // Filter by OfferingID and normalize dates
      attendanceRecords = allAttendance
        .filter(a => a.OfferingID == offeringId)
        .map(record => {
          if (record.ClassDate) {
            const date = new Date(record.ClassDate);
            const formattedDate = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
            return { ...record, ClassDate: formattedDate };
          }
          return record;
        });
      
      Logger.log(`Found ${attendanceRecords.length} attendance records for OfferingID ${offeringId}`);
    } catch (e) {
      Logger.log(`ClassAttendance sheet error: ${e.toString()}`);
    }
    
    Logger.log(`Found ${enrolledStudents.length} enrolled students and ${attendanceRecords.length} attendance records`);
    
    return {
      success: true,
      data: {
        classOffering: {
          ...classOffering,
          TeacherName: teacherInfo ? `${teacherInfo.FirstName} ${teacherInfo.Lastname}` : 'TBA',
          LevelName: levelName
        },
        enrolledStudents: enrolledStudents,
        attendanceRecords: attendanceRecords
      }
    };
    
  } catch (error) {
    Logger.log(`ERROR in getClassOfferingDetails(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * UPDATE/CREATE OPERATION: Updates or creates attendance record
 * DATA SOURCE: ClassAttendance sheet
 * @param {Object} attendanceData - Object with enrollmentId, offeringId, classDate, status, notes
 * @returns {Object} Success status
 */
function updateClassAttendance(attendanceData) {
  try {
    Logger.log('=== updateClassAttendance() called ===');
    Logger.log(`Attendance data: ${JSON.stringify(attendanceData)}`);
    
    const sheet = getSheet(SHEET_CONFIG.classAttendance);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const allData = sheetToObjects(sheet);
    const timezone = Session.getScriptTimeZone();

    // Standardize date for comparison
    const dateToFind = new Date(attendanceData.classDate);
    const dateToFindStr = Utilities.formatDate(dateToFind, timezone, "yyyy-MM-dd");

    // Find existing attendance record
    const existingIndex = allData.findIndex(a => {
      if (!a.ClassDate) return false;
      const recordDate = new Date(a.ClassDate);
      const recordDateStr = Utilities.formatDate(recordDate, timezone, "yyyy-MM-dd");
      return a.EnrollmentID == attendanceData.enrollmentId && recordDateStr === dateToFindStr;
    });
    
    if (existingIndex >= 0) {
      // Update existing record
      const rowIndex = existingIndex + 2; // +2 for 1-indexed and header row
      
      const statusColIndex = headers.indexOf('AttendanceStatus');
      if (statusColIndex >= 0) {
        sheet.getRange(rowIndex, statusColIndex + 1).setValue(attendanceData.status);
      }
      const notesColIndex = headers.indexOf('Notes');
      if (notesColIndex >= 0 && attendanceData.notes) {
        sheet.getRange(rowIndex, notesColIndex + 1).setValue(attendanceData.notes);
      }
      const updatedColIndex = headers.indexOf('LastUpdated');
      if (updatedColIndex >= 0) {
        sheet.getRange(rowIndex, updatedColIndex + 1).setValue(new Date());
      }
      
      Logger.log(`Updated attendance record at row ${rowIndex}`);
    } else {
      // Create new record
      const maxId = allData.reduce((max, row) => Math.max(max, row.AttendanceID || 0), 0);
      const newAttendanceId = maxId + 1;
      
      const rowData = headers.map(header => {
        switch(header) {
          case 'AttendanceID': return newAttendanceId;
          case 'EnrollmentID': return attendanceData.enrollmentId;
          case 'OfferingID': return attendanceData.offeringId;
          case 'ClassDate': return dateToFindStr; // Use standardized date string
          case 'AttendanceStatus': return attendanceData.status;
          case 'Notes': return attendanceData.notes || '';
          case 'LastUpdated': return new Date();
          default: return '';
        }
      });
      
      sheet.appendRow(rowData);
      Logger.log(`Created new attendance record with ID: ${newAttendanceId}`);
    }
    
    return {
      success: true,
      message: 'Attendance updated successfully'
    };
    
  } catch (error) {
    Logger.log(`ERROR in updateClassAttendance(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * UPDATE OPERATION: Updates enrollment status (Drop/Complete)
 * DATA SOURCE: StudentEnrollments sheet
 * @param {number} enrollmentId - The EnrollmentID to update
 * @param {string} status - New status (e.g., "Dropped", "Completed")
 * @returns {Object} Success status
 */
function updateEnrollmentStatus(enrollmentId, status) {
  try {
    Logger.log(`=== updateEnrollmentStatus(${enrollmentId}, ${status}) called ===`);
    
    const sheet = getSheet(SHEET_CONFIG.studentEnrollments);
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const allData = sheetToObjects(sheet);
    
    // Find enrollment record
    const enrollmentIndex = allData.findIndex(e => e.EnrollmentID == enrollmentId);
    
    if (enrollmentIndex < 0) {
      return {
        success: false,
        error: 'Enrollment not found'
      };
    }
    
    const rowIndex = enrollmentIndex + 2; // +2 for 1-indexed and header row
    
    // Update status
    const statusColIndex = headers.indexOf('CompletionStatus');
    if (statusColIndex >= 0) {
      sheet.getRange(rowIndex, statusColIndex + 1).setValue(status);
    }
    
    // Set completion date if status is Completed or Dropped
    if (status === 'Completed' || status === 'Dropped' || status === 'Withdrawn') {
      const dateColIndex = headers.indexOf('CompletionDate');
      if (dateColIndex >= 0) {
        sheet.getRange(rowIndex, dateColIndex + 1).setValue(new Date());
      }
    }
    
    Logger.log(`Updated enrollment ${enrollmentId} to status: ${status}`);
    
    return {
      success: true,
      message: `Enrollment status updated to ${status}`
    };
    
  } catch (error) {
    Logger.log(`ERROR in updateEnrollmentStatus(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}

/**
 * READ OPERATION: Gets all active teachers with their personnel information
 * DATA SOURCE: Teachers, Personnel sheets
 * @returns {Object} Success status and array of active teachers
 */
function getActiveTeachers() {
  try {
    Logger.log('=== getActiveTeachers() called ===');
    
    const teachersSheet = getSheet(SHEET_CONFIG.teachers);
    const allTeachers = sheetToObjects(teachersSheet);
    
    const personnelSheet = getSheet(SHEET_CONFIG.personnel);
    const allPersonnel = sheetToObjects(personnelSheet);
    
    // Filter for active teachers and enrich with personnel info
    const activeTeachers = allTeachers
      .filter(t => t.Active == 1 || t.Active === true)
      .map(teacher => {
        const personnel = allPersonnel.find(p => p.PersonnelID == teacher.PersonnelID);
        return {
          TeacherID: teacher.TeacherID,
          PersonnelID: teacher.PersonnelID,
          FirstName: personnel ? personnel.FirstName : '',
          Lastname: personnel ? personnel.Lastname : '',
          FullName: personnel ? `${personnel.FirstName} ${personnel.Lastname}` : 'Unknown',
          Active: teacher.Active
        };
      });
    
    Logger.log(`Found ${activeTeachers.length} active teachers`);
    
    return {
      success: true,
      data: activeTeachers
    };
    
  } catch (error) {
    Logger.log(`ERROR in getActiveTeachers(): ${error.toString()}`);
    return {
      success: false,
      error: error.toString()
    };
  }
}