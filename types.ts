// Core Data Types
export interface Personnel {
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  Instagram: string;
  Birthday: Date | string;
  IsActive?: boolean;
}

export interface ShowInformation {
  ShowID: number;
  ShowDate: Date | string;
  ShowTime: string;
  ShowTypeID: number;
  DirectorID: number | null;
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
  PersonnelID?: number;
  Role: string;
}

export interface StudentEnrollments {
  EnrollmentID: number;
  OfferingID: number;
  StudentPersonnelID: number;
  EnrollmentDate: Date | string;
  Status: 'Active' | 'Dropped' | 'Completed';
}

// StudentInfo table - links Personnel to Student status
export interface StudentInfo {
  StudentID: number;
  PersonnelID: number;
  EnrollmentDate: Date | string;
  Status: 'Active' | 'Inactive' | 'Graduated';
  CurrentLevel?: number;
  Notes?: string;
}

// ClassLevelProgression table - tracks student progress through levels
export interface ClassLevelProgression {
  ProgressionID: number;
  StudentID: number;
  ClassLevelID: number;
  CompletionDate: Date | string;
  Status: 'In Progress' | 'Completed';
}

export interface CrewDuties {
  DutyID: number;
  ShowID: number;
  CrewMemberID: number;
  CrewDutyTypeID: number;
}

export interface Bartender {
  BartenderID: number;
  PersonnelID: number;
  Trained: boolean | string;
  Status: string;
  Active: boolean | string;
}

export interface BartenderWithDetails extends Bartender {
  FirstName: string;
  LastName: string;
  FullName?: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  Birthday?: string;
  ShiftCount?: number;
  LastShiftDate?: string;
  LastShowName?: string;
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

export interface MasterGame {
  GameID: number;
  GameName: string;
  Description?: string;
  HowToPlay?: string;
  SetupNotes?: string;
  PlayerCount?: string | number | null;
  Format?: string;
  Category?: string;
  DifficultyLevel?: number | null;
}

export interface MasterGameInput {
  GameName: string;
  Description?: string;
  HowToPlay?: string;
  SetupNotes?: string;
  PlayerCount?: string | number | null;
  Format?: string;
  Category?: string;
  DifficultyLevel?: number | null;
}

export interface ShowGame {
  GamesPlayedID?: number;
  ShowID: number;
  GameID?: number | null;
  GameName?: string;
  OrderInShow?: number | null;
  Notes?: string | null;
  CustomGameName?: string | null;
  GameVariationNotes?: string | null;
  FlagForMasterList?: boolean;
}

export interface Workshop {
  WorkshopID: number;
  Title: string;
  Description?: string;
  WorkshopDate: Date | string;
  StartTime?: string;
  EndTime?: string;
  RoomID?: number | null;
  Venue?: string;
  InstructorPersonnelID?: number | null;
  SpecialGuestID?: number | null;
  InstructorName?: string;
  Capacity?: number;
  RegistrationCount?: number;
  Status?: 'Upcoming' | 'Completed' | 'Canceled';
  Notes?: string;
}

export interface SpecialGuest {
  SpecialGuestID: number;
  FullName: string;
  PrimaryEmail?: string;
  PrimaryPhone?: string;
  Expertise?: string;
  Notes?: string;
  Active?: boolean;
}

export interface WorkshopRegistration {
  WorkshopRegistrationID: number;
  WorkshopID: number;
  PersonnelID: number;
  FullName?: string;
  FirstName?: string;
  LastName?: string;
  PrimaryEmail?: string;
  RegistrationDate?: Date | string;
  RegistrationStatus?: 'Registered' | 'Canceled' | 'Waitlist';
  CheckedIn?: boolean;
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
  LastName?: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  PersonnelID?: number;
  Birthday?: string;
  // Cast-specific fields from cast_member_info
  YearJoined?: number;
  OutOfTown?: number;
  LimitedInactive?: number;
  ImageURL?: string;
  // Show details
  LastShowDate?: string;
  Status: string;
}

export interface CrewMemberWithDetails extends CrewDuties {
  // Person details - matches Personnel sheet structure
  FullName?: string;
  FirstName: string;
  Lastname: string;   // matches Personnel sheet column
  LastName?: string;  // alias used in UI components
  PrimaryEmail: string;
  PrimaryPhone: string;
  PersonnelID?: number;
  Birthday?: string;
  // Show details
  ShowName?: string;
  ShowDate?: string;
  LastShowDate?: string;
  // Duty details
  DutyName?: string;
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

// Student Types - Extended views for UI
export interface StudentWithDetails extends Personnel {
  StudentID?: number;
  EnrollmentDate?: Date | string;
  StudentStatus?: 'Active' | 'Inactive' | 'Graduated';
  CurrentLevel?: number;
  CurrentLevelName?: string;
  ClassesCompleted?: number;
  ActiveEnrollments?: number;
}

export interface EnrollmentWithDetails extends StudentEnrollments {
  ClassName?: string;
  ClassLevel?: string;
  ClassLevelName?: string;
  Teacher?: string;
  TeacherName?: string;
  StartDate?: Date | string;
  EndDate?: Date | string;
  VenueOrRoom?: string;
}

export interface ProgressionWithDetails extends ClassLevelProgression {
  LevelName?: string;
  Description?: string;
}

export interface StudentProfileData {
  // Basic info from Personnel table
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  PrimaryPhone: string;
  Instagram: string;
  Birthday: Date | string;
  // Student-specific info from StudentInfo table
  StudentID: number;
  EnrollmentDate: Date | string;
  StudentStatus: 'Active' | 'Inactive' | 'Graduated';
  CurrentLevel?: number;
  // Aggregated data
  Enrollments: EnrollmentWithDetails[];
  Progression: ProgressionWithDetails[];
}

// UI State Types
export interface ClassEnrollmentEntry {
  OfferingID: number;
  LevelName: string;
  Status: string;
  MaxStudents: number;
  EnrolledCount: number;
}

export interface NextShowInfo {
  ShowDate: Date | string;
  ShowTime: string;
  Venue: string;
}

export interface DashboardStats {
  totalPersonnel: number;
  // Students
  activeStudents: number;
  totalStudents: number;
  studentsActive: number;
  studentsInactive: number;
  studentsGraduated: number;
  // Shows
  scheduledShows: number;
  canceledShows: number;
  totalShows: number;
  nextShow: NextShowInfo | null;
  // Classes
  activeClasses: number;
  upcomingClasses: number;
  inProgressClasses: number;
  completedClasses: number;
  cancelledClasses: number;
  totalClasses: number;
  // Enrollments
  totalEnrollments: number;
  classEnrollmentData: ClassEnrollmentEntry[];
  // Workshops
  totalWorkshops: number;
  upcomingWorkshops: number;
  inProgressWorkshops: number;
  completedWorkshops: number;
  cancelledWorkshops: number;
  totalWorkshopRegistrations: number;
  nextWorkshop: Workshop | null;
  // Roles
  totalCastMembers: number;
  totalCrewMembers: number;
  totalBartenders: number;
  activeBartenders: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  type: 'show' | 'class';
  details: ShowWithDetails | ClassWithDetails;
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

export interface PersonnelDeletionDependencies {
  canDelete: boolean;
  totalReferences: number;
  references: {
    castMember: number;
    studentProfile: number;
    teacherRole: number;
    directorRole: number;
    showPerformances: number;
    crewDuties: number;
    bartenderAssignments: number;
    workshopRegistrations: number;
    studentEnrollments: number;
  };
}

// Navigation Types
export type PageType =
  | 'dashboard'
  | 'games'
  | 'personnel'
  | 'personnel-management'
  | 'cast'
  | 'crew'
  | 'bartenders'
  | 'classes'
  | 'class-management'
  | 'shows'
  | 'show-management'
  | 'workshops'
  | 'special-guests'
  | 'teacher-management'
  | 'director-management'
  | 'portal-access'
  | 'account-recovery'
  | 'data-import'
  | 'inventory'
  | 'scheduling'
  | 'student-directory'
  | 'student-profile'
  | 'skills-management';

export interface NavigationItem {
  id: PageType;
  label: string;
  icon: string;
}

export type PortalName = 'team' | 'instructor' | 'director' | 'cast' | 'student';

export type PortalAccessRole = 'admin' | 'manager' | 'director' | 'teacher' | 'cast' | 'student';

export interface PortalUserAccess {
  AccessID: string;
  AuthUserID?: string | null;
  PersonnelID?: number | null;
  LoginEmail: string;
  PortalName: PortalName;
  PortalRole: PortalAccessRole;
  IsActive: boolean;
  CreatedAt?: string;
  UpdatedAt?: string;
  FirstName?: string;
  LastName?: string;
}

export interface PortalCredentialProvisionInput {
  loginEmail: string;
  portalName: PortalName;
  portalRole?: PortalAccessRole;
  temporaryPassword?: string;
  useDefaultPassword?: boolean;
  sendResetEmail?: boolean;
}

export interface PortalCredentialProvisionResult {
  userId: string;
  createdNewUser: boolean;
  portalAccessLinked: boolean;
  resetEmailSent: boolean;
  portalName: PortalName;
  loginEmail: string;
  usedDefaultPassword?: boolean;
}
