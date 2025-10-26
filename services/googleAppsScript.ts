import { 
  Personnel, 
  ShowInformation, 
  ClassOfferings, 
  ShowPerformances,
  StudentEnrollments,
  CrewDuties,
  Inventory,
  ShowTypes,
  ClassLevels,
  CrewDutyTypes,
  DashboardStats,
  ApiResponse,
  CastMemberWithDetails
} from '../types';

// Mock data for development
const mockPersonnel: Personnel[] = [
  {
    PersonnelID: 1,
    FirstName: "John",
    LastName: "Doe",
    PrimaryEmail: "john.doe@email.com",
    PrimaryPhone: "555-0123",
    Instagram: "@johndoe",
    Birthday: "1990-01-15"
  },
  {
    PersonnelID: 2,
    FirstName: "Jane",
    LastName: "Smith",
    PrimaryEmail: "jane.smith@email.com",
    PrimaryPhone: "555-0124",
    Instagram: "@janesmith",
    Birthday: "1988-06-22"
  }
];

const mockShows: ShowInformation[] = [
  {
    ShowID: 1,
    ShowDate: "2024-12-15",
    ShowTime: "19:30",
    ShowTypeID: 1,
    DirectorID: 1,
    Venue: "Main Theater",
    Status: "Scheduled"
  }
];

const mockClasses: ClassOfferings[] = [
  {
    OfferingID: 1,
    ClassLevelID: 1,
    StartDate: "2024-11-01",
    EndDate: "2024-12-20",
    TeacherPersonnelID: 2,
    VenueOrRoom: "Studio A",
    MaxStudents: 12,
    Status: "Open"
  }
];

const mockShowTypes: ShowTypes[] = [
  { ShowTypeID: 1, ShowTypeName: "Improv Show" },
  { ShowTypeID: 2, ShowTypeName: "Sketch Comedy" }
];

const mockClassLevels: ClassLevels[] = [
  { ClassLevelID: 1, LevelName: "Beginner", Description: "Introduction to Improv" },
  { ClassLevelID: 2, LevelName: "Intermediate", Description: "Building Improv Skills" }
];

const mockInventory: Inventory[] = [
  {
    ItemID: 1,
    ItemName: "Microphone",
    Category: "Audio Equipment",
    Quantity: 5,
    Location: "Storage Room A",
    Notes: "Wireless mics for performances"
  }
];

// Check if running in development or production
const isDevelopment = typeof google === 'undefined' || !google.script;

class GoogleAppsScriptService {
  // Generic method to handle API calls
  private async callServerFunction<T>(functionName: string, ...args: any[]): Promise<ApiResponse<T>> {
    if (isDevelopment) {
      // Return mock data for development
      return this.getMockData<T>(functionName, ...args);
    }

    try {
      // @ts-ignore - Google Apps Script runtime
      const result = await new Promise<T>((resolve, reject) => {
        google.script.run
          .withSuccessHandler(resolve)
          .withFailureHandler(reject)
          [functionName](...args);
      });

      return { success: true, data: result };
    } catch (error) {
      console.error(`Error calling ${functionName}:`, error);
      return { success: false, error: error.toString() };
    }
  }

  private getMockData<T>(functionName: string, ...args: any[]): ApiResponse<T> {
    // Simulate network delay
    return new Promise(resolve => {
      setTimeout(() => {
        try {
          let data: any;
          
          switch (functionName) {
            case 'getAllPersonnel':
              data = mockPersonnel;
              break;
            case 'getAllShows':
              data = mockShows;
              break;
            case 'getAllClasses':
              data = mockClasses;
              break;
            case 'getAllShowTypes':
              data = mockShowTypes;
              break;
            case 'getAllClassLevels':
              data = mockClassLevels;
              break;
            case 'getAllInventory':
              data = mockInventory;
              break;
            case 'getDashboardStats':
              data = {
                totalPersonnel: mockPersonnel.length,
                activeStudents: 25,
                upcomingShows: mockShows.length,
                activeClasses: mockClasses.length
              };
              break;
            case 'createPersonnel':
            case 'updatePersonnel':
              data = args[0];
              break;
            case 'deletePersonnel':
              data = { deleted: true };
              break;
            default:
              data = [];
          }
          
          resolve({ success: true, data });
        } catch (error) {
          resolve({ success: false, error: error.toString() });
        }
      }, 500);
    }) as any;
  }

  // Personnel methods
  async getAllPersonnel(): Promise<ApiResponse<Personnel[]>> {
    return this.callServerFunction<Personnel[]>('getAllPersonnel');
  }

  async createPersonnel(personnel: Omit<Personnel, 'PersonnelID'>): Promise<ApiResponse<Personnel>> {
    return this.callServerFunction<Personnel>('createPersonnel', personnel);
  }

  async updatePersonnel(personnel: Personnel): Promise<ApiResponse<Personnel>> {
    return this.callServerFunction<Personnel>('updatePersonnel', personnel);
  }

  async deletePersonnel(personnelId: number): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('deletePersonnel', personnelId);
  }

  // Show methods
  async getAllShows(): Promise<ApiResponse<ShowInformation[]>> {
    return this.callServerFunction<ShowInformation[]>('getAllShows');
  }

  async createShow(show: Omit<ShowInformation, 'ShowID'>): Promise<ApiResponse<ShowInformation>> {
    return this.callServerFunction<ShowInformation>('createShow', show);
  }

  async updateShow(show: ShowInformation): Promise<ApiResponse<ShowInformation>> {
    return this.callServerFunction<ShowInformation>('updateShow', show);
  }

  async deleteShow(showId: number): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('deleteShow', showId);
  }

  // Class methods
  async getAllClasses(): Promise<ApiResponse<ClassOfferings[]>> {
    return this.callServerFunction<ClassOfferings[]>('getAllClasses');
  }

  async createClass(classOffering: Omit<ClassOfferings, 'OfferingID'>): Promise<ApiResponse<ClassOfferings>> {
    return this.callServerFunction<ClassOfferings>('createClass', classOffering);
  }

  async updateClass(classOffering: ClassOfferings): Promise<ApiResponse<ClassOfferings>> {
    return this.callServerFunction<ClassOfferings>('updateClass', classOffering);
  }

  async deleteClass(offeringId: number): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('deleteClass', offeringId);
  }

  // Enrollment methods
  async getStudentEnrollments(offeringId: number): Promise<ApiResponse<StudentEnrollments[]>> {
    return this.callServerFunction<StudentEnrollments[]>('getStudentEnrollments', offeringId);
  }

  async enrollStudents(offeringId: number, studentIds: number[]): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('enrollStudents', offeringId, studentIds);
  }

  // Show casting methods
  async getShowPerformances(showId: number): Promise<ApiResponse<ShowPerformances[]>> {
    return this.callServerFunction<ShowPerformances[]>('getShowPerformances', showId);
  }

  async getAllCastMembers(): Promise<ApiResponse<CastMemberWithDetails[]>> {
    return this.callServerFunction<CastMemberWithDetails[]>('getAllCastMembers');
  }

  async updateShowCast(showId: number, castMembers: ShowPerformances[]): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('updateShowCast', showId, castMembers);
  }

  // Inventory methods
  async getAllInventory(): Promise<ApiResponse<Inventory[]>> {
    return this.callServerFunction<Inventory[]>('getAllInventory');
  }

  async createInventoryItem(item: Omit<Inventory, 'ItemID'>): Promise<ApiResponse<Inventory>> {
    return this.callServerFunction<Inventory>('createInventoryItem', item);
  }

  async updateInventoryItem(item: Inventory): Promise<ApiResponse<Inventory>> {
    return this.callServerFunction<Inventory>('updateInventoryItem', item);
  }

  async deleteInventoryItem(itemId: number): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('deleteInventoryItem', itemId);
  }

  // Lookup table methods
  async getAllShowTypes(): Promise<ApiResponse<ShowTypes[]>> {
    return this.callServerFunction<ShowTypes[]>('getAllShowTypes');
  }

  async getAllClassLevels(): Promise<ApiResponse<ClassLevels[]>> {
    return this.callServerFunction<ClassLevels[]>('getAllClassLevels');
  }

  async getAllCrewDutyTypes(): Promise<ApiResponse<CrewDutyTypes[]>> {
    return this.callServerFunction<CrewDutyTypes[]>('getAllCrewDutyTypes');
  }

  // Dashboard methods
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.callServerFunction<DashboardStats>('getDashboardStats');
  }

  // Student methods
  async getAllStudents(): Promise<ApiResponse<Personnel[]>> {
    return this.callServerFunction<Personnel[]>('getAllStudents');
  }

  async getStudentProfile(studentId: number): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('getStudentProfile', studentId);
  }

  async getActiveClassOfferings(): Promise<ApiResponse<ClassOfferings[]>> {
    return this.callServerFunction<ClassOfferings[]>('getActiveClassOfferings');
  }

  async enrollStudent(offeringId: number, studentId: number): Promise<ApiResponse<boolean>> {
    return this.callServerFunction<boolean>('enrollStudent', offeringId, studentId);
  }

  // New Student Management Methods for Student Tab
  async enrollPersonAsStudent(personnelId: number, offeringId: number): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('enrollPersonAsStudent', personnelId, offeringId);
  }

  async getAllStudentsWithDetails(): Promise<ApiResponse<any[]>> {
    return this.callServerFunction<any[]>('getAllStudentsWithDetails');
  }

  async getStudentProfileData(studentId: number): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('getStudentProfileData', studentId);
  }

  async getUpcomingClasses(): Promise<ApiResponse<ClassOfferings[]>> {
    return this.callServerFunction<ClassOfferings[]>('getUpcomingClasses');
  }

  // Class Management Methods
  async createClassOffering(classData: any): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('createClassOffering', classData);
  }

  async getAllClassOfferings(): Promise<ApiResponse<any[]>> {
    return this.callServerFunction<any[]>('getAllClassOfferings');
  }

  async getClassOfferingDetails(offeringId: number): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('getClassOfferingDetails', offeringId);
  }

  async updateClassAttendance(attendanceData: {
    enrollmentId: number;
    offeringId: number;
    classDate: string;
    status: string;
    notes?: string;
  }): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('updateClassAttendance', attendanceData);
  }

  async updateEnrollmentStatus(enrollmentId: number, status: string): Promise<ApiResponse<any>> {
    return this.callServerFunction<any>('updateEnrollmentStatus', enrollmentId, status);
  }
}

export const gasService = new GoogleAppsScriptService();