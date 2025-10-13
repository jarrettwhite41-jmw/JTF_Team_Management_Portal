// Core Data Types
export interface Personnel {
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  Instagram: string;
  Birthday: Date | string;
}

export interface ShowInformation {
  ShowID: number;
  ShowDate: Date | string;
  ShowTime: string;
  ShowTypeID: number;
  DirectorID: number;
  Venue: string;
  Status: 'Scheduled' | 'Canceled';
}

export interface ClassOfferings {
  OfferingID: number;
  ClassLevelID: number;
  StartDate: Date | string;
  EndDate: Date | string;
  TeacherPersonnelID: number;
  VenueOrRoom: string;
  MaxStudents: number;
  Status: 'Open' | 'Full' | 'Completed';
}

export interface ShowPerformances {
  PerformanceID: number;
  ShowID: number;
  CastMemberID: number;
  Role: string;
}

export interface StudentEnrollments {
  EnrollmentID: number;
  OfferingID: number;
  StudentPersonnelID: number;
  EnrollmentDate: Date | string;
  Status: 'Active' | 'Dropped' | 'Completed';
}

export interface CrewDuties {
  DutyID: number;
  ShowID: number;
  CrewMemberID: number;
  CrewDutyTypeID: number;
}

export interface Inventory {
  ItemID: number;
  ItemName: string;
  Category: string;
  Quantity: number;
  Location: string;
  Notes: string;
}

// Lookup Tables
export interface ShowTypes {
  ShowTypeID: number;
  ShowTypeName: string;
}

export interface ClassLevels {
  ClassLevelID: number;
  LevelName: string;
  Description: string;
}

export interface CrewDutyTypes {
  CrewDutyTypeID: number;
  DutyName: string;
}

// Extended Types for UI
export interface PersonnelWithDetails extends Personnel {
  isStudent?: boolean;
  isCastMember?: boolean;
  isCrewMember?: boolean;
  isTeacher?: boolean;
  isDirector?: boolean;
}

export interface CastMemberWithDetails extends ShowPerformances {
  // Person details - matches Personnel sheet structure
  FullName?: string;
  FirstName: string;
  Lastname: string;  // Note: "Lastname" to match Personnel sheet column name
  PrimaryEmail: string;
  PrimaryPhone: string;
  PersonnelID?: number;
  Birthday?: string;
  // Show details - updated structure
  LastShowDate?: string;
  Status: string;
}

export interface ShowWithDetails extends ShowInformation {
  DirectorName?: string;
  ShowTypeName?: string;
  CastMembers?: PersonnelWithDetails[];
  CrewMembers?: PersonnelWithDetails[];
}

export interface ClassWithDetails extends ClassOfferings {
  TeacherName?: string;
  LevelName?: string;
  EnrolledStudents?: PersonnelWithDetails[];
  CurrentEnrollment?: number;
}

// UI State Types
export interface DashboardStats {
  totalPersonnel: number;
  activeStudents: number;
  upcomingShows: number;
  activeClasses: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'show' | 'class';
  details: ShowWithDetails | ClassWithDetails;
}

// Student-Specific Types for Student Profile Module
export interface StudentInfo {
  StudentID: number;
  PersonnelID: number;
  EnrollmentDate: Date | string;
  Status: 'Active' | 'Inactive' | 'Graduated';
  EmergencyContactName?: string;
  EmergencyContactPhone?: string;
  Notes?: string;
}

export interface ClassLevelProgression {
  ProgressionID: number;
  StudentID: number;
  ClassLevelID: number;
  CompletionDate: Date | string;
  Status: 'Completed' | 'In Progress' | 'Not Started';
  Grade?: string;
  Notes?: string;
}

export interface StudentProfile extends PersonnelWithDetails {
  StudentInfo?: StudentInfo;
  Enrollments: StudentEnrollments[];
  ClassProgression: ClassLevelProgression[];
  CompletedClasses: ClassWithDetails[];
  CurrentClasses: ClassWithDetails[];
}

export interface EnrollmentWithDetails extends StudentEnrollments {
  ClassName?: string;
  TeacherName?: string;
  LevelName?: string;
  StartDate?: Date | string;
  EndDate?: Date | string;
}

// Modal Types
export type ModalMode = 'view' | 'edit' | 'create';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: ModalMode;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Navigation Types
export type PageType = 'dashboard' | 'personnel' | 'cast' | 'classes' | 'shows' | 'inventory' | 'scheduling' | 'student-profile' | 'student-directory';

export interface NavigationItem {
  id: PageType;
  label: string;
  icon: string;
}