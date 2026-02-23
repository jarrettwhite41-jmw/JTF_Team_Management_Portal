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
  CastMemberWithDetails,
  CrewMemberWithDetails,
  ShowWithDetails
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

const mockCrewMembers: CrewMemberWithDetails[] = [
  {
    DutyID: 1, ShowID: 1, CrewMemberID: 1, CrewDutyTypeID: 1,
    FirstName: "Alex", LastName: "Rivera", Lastname: "Rivera",
    PrimaryEmail: "alex.rivera@email.com", PrimaryPhone: "555-1001",
    PersonnelID: 10, Birthday: "1992-03-18",
    DutyName: "Stage Manager", ShowName: "Spring Improv Night",
    ShowDate: "2025-03-15", LastShowDate: "2025-03-15", Status: "Active"
  },
  {
    DutyID: 2, ShowID: 2, CrewMemberID: 1, CrewDutyTypeID: 1,
    FirstName: "Alex", LastName: "Rivera", Lastname: "Rivera",
    PrimaryEmail: "alex.rivera@email.com", PrimaryPhone: "555-1001",
    PersonnelID: 10, Birthday: "1992-03-18",
    DutyName: "Stage Manager", ShowName: "Summer Showcase",
    ShowDate: "2025-07-20", LastShowDate: "2025-07-20", Status: "Active"
  },
  {
    DutyID: 3, ShowID: 1, CrewMemberID: 2, CrewDutyTypeID: 2,
    FirstName: "Morgan", LastName: "Chen", Lastname: "Chen",
    PrimaryEmail: "morgan.chen@email.com", PrimaryPhone: "555-1002",
    PersonnelID: 11, Birthday: "1995-11-05",
    DutyName: "Lighting Tech", ShowName: "Spring Improv Night",
    ShowDate: "2025-03-15", LastShowDate: "2025-03-15", Status: "Active"
  },
  {
    DutyID: 4, ShowID: 2, CrewMemberID: 3, CrewDutyTypeID: 2,
    FirstName: "Taylor", LastName: "Brooks", Lastname: "Brooks",
    PrimaryEmail: "taylor.brooks@email.com", PrimaryPhone: "555-1003",
    PersonnelID: 12, Birthday: "1990-07-22",
    DutyName: "Lighting Tech", ShowName: "Summer Showcase",
    ShowDate: "2025-07-20", LastShowDate: "2025-07-20", Status: "Active"
  },
  {
    DutyID: 5, ShowID: 1, CrewMemberID: 4, CrewDutyTypeID: 3,
    FirstName: "Jordan", LastName: "Patel", Lastname: "Patel",
    PrimaryEmail: "jordan.patel@email.com", PrimaryPhone: "555-1004",
    PersonnelID: 13, Birthday: "1988-09-30",
    DutyName: "Sound Tech", ShowName: "Spring Improv Night",
    ShowDate: "2025-03-15", LastShowDate: "2025-03-15", Status: "Active"
  },
  {
    DutyID: 6, ShowID: 2, CrewMemberID: 4, CrewDutyTypeID: 3,
    FirstName: "Jordan", LastName: "Patel", Lastname: "Patel",
    PrimaryEmail: "jordan.patel@email.com", PrimaryPhone: "555-1004",
    PersonnelID: 13, Birthday: "1988-09-30",
    DutyName: "Sound Tech", ShowName: "Summer Showcase",
    ShowDate: "2025-07-20", LastShowDate: "2025-07-20", Status: "Active"
  },
  {
    DutyID: 7, ShowID: 1, CrewMemberID: 5, CrewDutyTypeID: 4,
    FirstName: "Casey", LastName: "Nguyen", Lastname: "Nguyen",
    PrimaryEmail: "casey.nguyen@email.com", PrimaryPhone: "555-1005",
    PersonnelID: 14, Birthday: "1997-01-14",
    DutyName: "Props Manager", ShowName: "Spring Improv Night",
    ShowDate: "2025-03-15", LastShowDate: "2025-03-15", Status: "Active"
  },
  {
    DutyID: 8, ShowID: 3, CrewMemberID: 6, CrewDutyTypeID: 5,
    FirstName: "Riley", LastName: "Owens", Lastname: "Owens",
    PrimaryEmail: "riley.owens@email.com", PrimaryPhone: "555-1006",
    PersonnelID: 15, Birthday: "1993-05-08",
    DutyName: "Front of House", ShowName: "Fall Comedy Show",
    ShowDate: "2025-11-08", LastShowDate: "2025-11-08", Status: "Active"
  },
  {
    DutyID: 9, ShowID: 3, CrewMemberID: 7, CrewDutyTypeID: 5,
    FirstName: "Drew", LastName: "Vasquez", Lastname: "Vasquez",
    PrimaryEmail: "drew.vasquez@email.com", PrimaryPhone: "555-1007",
    PersonnelID: 16, Birthday: "1996-12-19",
    DutyName: "Front of House", ShowName: "Fall Comedy Show",
    ShowDate: "2025-11-08", LastShowDate: "2025-11-08", Status: "Inactive"
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
            case 'getShowsWithDetails':
              data = mockShows.map(show => ({
                ...show,
                ShowTypeName: 'Mainstage Cast',
                DirectorName: 'John Doe',
                CastMembers: mockPersonnel.slice(0, 3)
              }));
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
            case 'addPersonAsCastMember':
              data = { CastMemberID: 999, PersonnelID: args[0] };
              break;
            case 'removeCastMember':
              data = { deleted: true };
              break;
            case 'getAllCrewMembers':
              data = { data: mockCrewMembers };
              break;
            case 'getAllCrewDutyTypes':
              data = [
                { CrewDutyTypeID: 1, DutyName: 'Stage Manager' },
                { CrewDutyTypeID: 2, DutyName: 'Lighting Tech' },
                { CrewDutyTypeID: 3, DutyName: 'Sound Tech' },
                { CrewDutyTypeID: 4, DutyName: 'Props Manager' },
                { CrewDutyTypeID: 5, DutyName: 'Front of House' }
              ];
              break;
            case 'addPersonAsCrewMember':
              data = { CrewMemberID: 999, PersonnelID: args[0] };
              break;
            case 'removeCrewMember':
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

  async getShowsWithDetails(): Promise<ApiResponse<ShowWithDetails[]>> {
    console.log('=== getShowsWithDetails called in service ===');
    try {
      const result = await this.callServerFunction<ShowWithDetails[]>('getShowsWithDetails');
      console.log('getShowsWithDetails result:', result);
      return result;
    } catch (error) {
      console.error('getShowsWithDetails error:', error);
      throw error;
    }
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

  async addPersonAsCastMember(personnelId: number): Promise<ApiResponse<{ CastMemberID: number; PersonnelID: number }>> {
    return this.callServerFunction<{ CastMemberID: number; PersonnelID: number }>('addPersonAsCastMember', personnelId);
  }

  async removeCastMember(castMemberId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.callServerFunction<{ deleted: boolean }>('removeCastMember', castMemberId);
  }

  // Crew methods
  async getAllCrewMembers(): Promise<ApiResponse<CrewMemberWithDetails[]>> {
    return this.callServerFunction<CrewMemberWithDetails[]>('getAllCrewMembers');
  }

  async addPersonAsCrewMember(personnelId: number): Promise<ApiResponse<{ CrewMemberID: number; PersonnelID: number }>> {
    return this.callServerFunction<{ CrewMemberID: number; PersonnelID: number }>('addPersonAsCrewMember', personnelId);
  }

  async removeCrewMember(crewMemberId: number): Promise<ApiResponse<{ deleted: boolean }>> {
    return this.callServerFunction<{ deleted: boolean }>('removeCrewMember', crewMemberId);
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