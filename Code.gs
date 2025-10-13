/**
 * JTF Team Management Portal - Google Apps Script Backend
 * Updated: 2025-10-12 20:23:05 UTC by jarrettwhite41-jmw
 * 
 * This file contains all server-side functions that interact directly with Google Sheets.
 * Each function includes detailed comments about data sources and sheet mappings.
 */

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
  
  // Relationship/Junction tables
  showPerformances: 'ShowPerformances',      // Cast assignments to shows
  studentEnrollments: 'StudentEnrollments',  // Student-to-class enrollments
  crewDuties: 'CrewDuties',                 // Crew assignments to shows
  gamesPlayed: 'GamesPlayed',               // Games played in specific shows
  rehearsals: 'Rehearsals',                 // Rehearsal schedules
  rehearsalAttendance: 'RehearsalAttendance', // Who attended which rehearsals
  
  // Lookup/Reference tables
  showTypes: 'ShowTypes',                   // Types of shows (Mainstage, Harold, etc.)
  classLevels: 'ClassLevels',               // Class levels (101, 201, Advanced, etc.)
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
    [SHEET_CONFIG.studentEnrollments]: [
      'EnrollmentID', 'StudentID', 'OfferingID', 'Status'
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