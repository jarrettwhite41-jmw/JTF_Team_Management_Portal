import React, { useMemo, useState } from 'react';
import { Message } from '../components/common/Message';
import { gasService } from '../services/googleAppsScript';

type Primitive = string | number | boolean | null | undefined;

type ImportBundle = {
  personnel?: ImportPersonnelRow[];
  specialGuests?: ImportSpecialGuestRow[];
  teachers?: ImportRoleRow[];
  directors?: ImportRoleRow[];
  bartenders?: ImportBartenderRow[];
  classOfferings?: ImportClassRow[];
  classes?: ImportClassRow[];
  shows?: ImportShowRow[];
  workshops?: ImportWorkshopRow[];
  classEnrollments?: ImportEnrollmentRow[];
  showCast?: ImportShowCastRow[];
  showCrew?: ImportShowCrewRow[];
  workshopRegistrations?: ImportWorkshopRegistrationRow[];
  studentProfiles?: ImportStudentProfileRow[];
};

type ImportPersonnelRow = Record<string, Primitive>;
type ImportSpecialGuestRow = Record<string, Primitive>;
type ImportRoleRow = Record<string, Primitive>;
type ImportBartenderRow = Record<string, Primitive>;
type ImportClassRow = Record<string, Primitive>;
type ImportShowRow = Record<string, Primitive>;
type ImportWorkshopRow = Record<string, Primitive>;
type ImportEnrollmentRow = Record<string, Primitive>;
type ImportShowCastRow = Record<string, Primitive>;
type ImportShowCrewRow = Record<string, Primitive>;
type ImportWorkshopRegistrationRow = Record<string, Primitive>;
type ImportStudentProfileRow = Record<string, Primitive>;

type ImportOutcome = {
  label: string;
  success: number;
  skipped: number;
  failed: number;
};

type ImportMaps = {
  personnelBySource: Map<string, number>;
  personnelByEmail: Map<string, number>;
  specialGuestBySource: Map<string, number>;
  classBySource: Map<string, number>;
  showBySource: Map<string, number>;
  workshopBySource: Map<string, number>;
};

type ImportSection = keyof ImportBundle;

const sampleBundle: ImportBundle = {
  personnel: [
    {
      sourceId: 'p-1001',
      FirstName: 'Jordan',
      LastName: 'Taylor',
      PrimaryEmail: 'jordan@example.com',
      PrimaryPhone: '555-0101',
      Instagram: '@jordan',
      Birthday: '2007-04-12',
      IsActive: true,
    },
    {
      sourceId: 'p-1002',
      FirstName: 'Avery',
      LastName: 'Nguyen',
      PrimaryEmail: 'avery@example.com',
      PrimaryPhone: '555-0102',
      Instagram: '@avery',
      Birthday: '2006-11-03',
      IsActive: true,
    },
  ],
  specialGuests: [
    {
      sourceId: 'sg-1',
      FullName: 'Mina Lopez',
      PrimaryEmail: 'mina@example.com',
      PrimaryPhone: '555-0110',
      Expertise: 'Stage Combat',
      Notes: 'Guest instructor for spring workshop series',
      Active: true,
    },
  ],
  teachers: [{ personnelSourceId: 'p-1001' }],
  directors: [{ personnelSourceId: 'p-1002' }],
  bartenders: [{ personnelSourceId: 'p-1002', Trained: true, Status: 'Active' }],
  classOfferings: [
    {
      sourceId: 'class-1',
      ClassLevelID: 1,
      TeacherSourceId: 'p-1001',
      StartDate: '2024-01-09',
      EndDate: '2024-03-12',
      RoomID: 1,
      MaxStudents: 12,
      Status: 'Completed',
      MeetingDays: 'Tue',
      MeetingTime: '4:00 PM',
    },
  ],
  shows: [
    {
      sourceId: 'show-1',
      ShowDate: '2024-03-22',
      ShowTime: '7:30 PM',
      ShowTypeID: 1,
      DirectorSourceId: 'p-1002',
      Venue: 'Main Stage',
      Status: 'Scheduled',
    },
  ],
  workshops: [
    {
      sourceId: 'workshop-1',
      Title: 'Combat Fundamentals',
      Description: 'Intro to safe stage combat',
      WorkshopDate: '2024-02-10',
      StartTime: '6:00 PM',
      EndTime: '8:00 PM',
      Venue: 'Black Box',
      InstructorSourceId: 'p-1001',
      SpecialGuestSourceId: 'sg-1',
      Capacity: 20,
      Status: 'Completed',
      Notes: 'Historical import sample',
    },
  ],
  classEnrollments: [
    { personnelSourceId: 'p-1001', classSourceId: 'class-1' },
    { personnelSourceId: 'p-1002', classSourceId: 'class-1' },
  ],
  showCast: [
    { showSourceId: 'show-1', personnelSourceId: 'p-1001', Role: 'Lead' },
    { showSourceId: 'show-1', personnelSourceId: 'p-1002', Role: 'Supporting' },
  ],
  showCrew: [{ showSourceId: 'show-1', personnelSourceId: 'p-1002', CrewDutyTypeID: 1 }],
  workshopRegistrations: [{ workshopSourceId: 'workshop-1', personnelSourceId: 'p-1001' }],
  studentProfiles: [
    { personnelSourceId: 'p-1001', Status: 'Active', CurrentLevel: 2 },
    { personnelSourceId: 'p-1002', Status: 'Graduated', CurrentLevel: 4 },
  ],
};

const readValue = (row: Record<string, Primitive>, ...keys: string[]): Primitive => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && !(typeof row[key] === 'string' && row[key].trim() === '')) {
      return row[key];
    }
  }
  return undefined;
};

const asString = (value: Primitive): string => {
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const asNumber = (value: Primitive): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const asBoolean = (value: Primitive, fallback = false): boolean => {
  if (value === null || value === undefined || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  const normalized = String(value).trim().toLowerCase();
  if (['true', 'yes', 'y', '1', 'active'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'inactive'].includes(normalized)) return false;
  return fallback;
};

const normalizeEmail = (value: Primitive): string => asString(value).toLowerCase();

const resolveSourceKey = (value: Primitive): string => asString(value);

const buildImportPayload = (row: ImportPersonnelRow) => ({
  FirstName: asString(readValue(row, 'FirstName', 'firstName', 'first_name')),
  LastName: asString(readValue(row, 'LastName', 'lastName', 'last_name')),
  PrimaryEmail: asString(readValue(row, 'PrimaryEmail', 'primaryEmail', 'primary_email')),
  PrimaryPhone: asString(readValue(row, 'PrimaryPhone', 'primaryPhone', 'primary_phone')),
  Instagram: asString(readValue(row, 'Instagram', 'instagram')),
  Birthday: readValue(row, 'Birthday', 'birthday') || '',
  IsActive: asBoolean(readValue(row, 'IsActive', 'active', 'Active'), true),
});

const buildFallbackPersonnelPayload = (row: Record<string, Primitive>, label: string) => {
  const sourceRef = asString(readValue(row, 'personnelSourceId', 'PersonnelSourceId', 'personnel_source_id', 'sourceId', 'SourceId'));
  const fullName = asString(readValue(row, 'FullName', 'fullName', 'Name', 'name'));
  const firstName = asString(readValue(row, 'FirstName', 'firstName', 'first_name'));
  const lastName = asString(readValue(row, 'LastName', 'lastName', 'last_name'));
  const fallbackName = sourceRef || fullName || label || 'Imported Personnel';

  return {
    FirstName: firstName || (fullName ? fullName.split(' ')[0] : 'Imported'),
    LastName: lastName || (fullName ? fullName.split(' ').slice(1).join(' ') || 'Personnel' : fallbackName),
    PrimaryEmail: asString(readValue(row, 'PrimaryEmail', 'primaryEmail', 'primary_email', 'Email', 'email')),
    PrimaryPhone: asString(readValue(row, 'PrimaryPhone', 'primaryPhone', 'primary_phone', 'Phone', 'phone')),
    Instagram: asString(readValue(row, 'Instagram', 'instagram')),
    Birthday: readValue(row, 'Birthday', 'birthday') || '',
    IsActive: asBoolean(readValue(row, 'IsActive', 'active', 'Active'), true),
  };
};

const DataImport: React.FC = () => {
  const [bundle, setBundle] = useState<ImportBundle>(sampleBundle);
  const [validationError, setValidationError] = useState('');
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning' | 'info'; text: string } | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [outcomes, setOutcomes] = useState<ImportOutcome[]>([]);
  const counts = useMemo(() => ({
    personnel: bundle.personnel?.length || 0,
    specialGuests: bundle.specialGuests?.length || 0,
    teachers: bundle.teachers?.length || 0,
    directors: bundle.directors?.length || 0,
    bartenders: bundle.bartenders?.length || 0,
    classOfferings: (bundle.classOfferings || bundle.classes || []).length,
    shows: bundle.shows?.length || 0,
    workshops: bundle.workshops?.length || 0,
    enrollments: bundle.classEnrollments?.length || 0,
    cast: bundle.showCast?.length || 0,
    crew: bundle.showCrew?.length || 0,
    workshopRegistrations: bundle.workshopRegistrations?.length || 0,
    studentProfiles: bundle.studentProfiles?.length || 0,
  }), [bundle]);

  const sections: Array<{ key: ImportSection; label: string; helper: string }> = [
    { key: 'personnel', label: 'Personnel', helper: 'People to add or update first.' },
    { key: 'specialGuests', label: 'Special Guests', helper: 'Optional guest instructors or performers.' },
    { key: 'teachers', label: 'Teachers', helper: 'Rows that point to personnel who should teach.' },
    { key: 'directors', label: 'Directors', helper: 'Rows that point to personnel who should direct.' },
    { key: 'bartenders', label: 'Bartenders', helper: 'Rows that point to personnel who should be bartenders.' },
    { key: 'classOfferings', label: 'Class Offerings', helper: 'Historical classes to recreate.' },
    { key: 'shows', label: 'Shows', helper: 'Past productions and show dates.' },
    { key: 'workshops', label: 'Workshops', helper: 'Past workshops and special sessions.' },
    { key: 'classEnrollments', label: 'Class Enrollments', helper: 'Attach students to classes.' },
    { key: 'showCast', label: 'Show Cast', helper: 'Cast history for past shows.' },
    { key: 'showCrew', label: 'Show Crew', helper: 'Crew assignments for past shows.' },
    { key: 'workshopRegistrations', label: 'Workshop Registrations', helper: 'Workshop attendance history.' },
    { key: 'studentProfiles', label: 'Student Profiles', helper: 'Status and level updates for known students.' },
  ];

  const appendLog = (line: string) => {
    setLogs(previous => [...previous, line]);
  };

  const loadSample = () => {
    setBundle(sampleBundle);
    setValidationError('');
    setMessage({ type: 'info', text: 'Loaded a sample migration form you can edit.' });
  };

  const updateSectionRows = <T extends Record<string, Primitive>>(section: ImportSection, rows: T[]) => {
    setBundle((previous) => ({ ...previous, [section]: rows }));
  };

  const addRow = (section: ImportSection, newRow: Record<string, Primitive>) => {
    const existing = (bundle[section] || []) as Record<string, Primitive>[];
    updateSectionRows(section, [...existing, newRow]);
  };

  const removeRow = (section: ImportSection, index: number) => {
    const existing = (bundle[section] || []) as Record<string, Primitive>[];
    updateSectionRows(section, existing.filter((_, rowIndex) => rowIndex !== index));
  };

  const updateRow = (section: ImportSection, index: number, field: string, value: Primitive) => {
    const existing = (bundle[section] || []) as Record<string, Primitive>[];
    const next = existing.map((row, rowIndex) => (rowIndex === index ? { ...row, [field]: value } : row));
    updateSectionRows(section, next);
  };

  const resolvePersonnelId = (maps: ImportMaps, row: Record<string, Primitive>): number | undefined => {
    const sourceRef = resolveSourceKey(readValue(row, 'personnelSourceId', 'PersonnelSourceId', 'personnel_source_id', 'sourceId', 'SourceId'));
    if (sourceRef && maps.personnelBySource.has(sourceRef)) {
      return maps.personnelBySource.get(sourceRef);
    }

    const emailRef = normalizeEmail(readValue(row, 'PrimaryEmail', 'primaryEmail', 'primary_email', 'email', 'Email'));
    if (emailRef && maps.personnelByEmail.has(emailRef)) {
      return maps.personnelByEmail.get(emailRef);
    }

    return undefined;
  };

  const resolveOrCreatePersonnelId = async (service: any, maps: ImportMaps, row: Record<string, Primitive>, label: string) => {
    const existingId = resolvePersonnelId(maps, row);
    if (existingId) return existingId;

    const sourceKey = resolveSourceKey(readValue(row, 'personnelSourceId', 'PersonnelSourceId', 'personnel_source_id', 'sourceId', 'SourceId'));
    const emailKey = normalizeEmail(readValue(row, 'PrimaryEmail', 'primaryEmail', 'primary_email', 'Email', 'email'));
    const payload = buildFallbackPersonnelPayload(row, label);
    const response = await service.createPersonnel(payload);
    if (!response?.success) {
      throw new Error(response?.error || `Unable to create missing personnel for ${label}.`);
    }

    const createdId = Number(response.data?.PersonnelID || response.data?.personnel_id || response.data?.id);
    if (!createdId) throw new Error(`Missing PersonnelID for ${label}.`);
    if (sourceKey) maps.personnelBySource.set(sourceKey, createdId);
    if (emailKey) maps.personnelByEmail.set(emailKey, createdId);
    appendLog(`Created missing personnel for ${label}: ${createdId}`);
    return createdId;
  };

  const ensureCastMember = async (service: any, personnelId: number) => {
    const response = await service.addPersonAsCastMember(personnelId);
    if (!response?.success) {
      throw new Error(response?.error || `Unable to add personnel ${personnelId} as a cast member.`);
    }
  };

  const processRecords = async <T extends Record<string, Primitive>>(
    label: string,
    rows: T[] | undefined,
    handler: (row: T) => Promise<void>,
  ): Promise<ImportOutcome> => {
    const outcome: ImportOutcome = { label, success: 0, skipped: 0, failed: 0 };
    for (const row of rows || []) {
      try {
        await handler(row);
        outcome.success += 1;
      } catch (error) {
        outcome.failed += 1;
        const errorText = error instanceof Error ? error.message : String(error);
        appendLog(`${label}: ${errorText}`);
      }
    }
    return outcome;
  };

  const runImport = async () => {
    setImporting(true);
    setLogs([]);
    setOutcomes([]);

    const service = gasService as any;
    const maps: ImportMaps = {
      personnelBySource: new Map(),
      personnelByEmail: new Map(),
      specialGuestBySource: new Map(),
      classBySource: new Map(),
      showBySource: new Map(),
      workshopBySource: new Map(),
    };

    try {
      appendLog('Loading current personnel and student records...');

      const personnelResponse = await service.getAllPersonnel();
      if (!personnelResponse?.success) throw new Error(personnelResponse?.error || 'Unable to load personnel.');

      for (const person of personnelResponse.data || []) {
        const personnelId = Number(person.PersonnelID);
        if (personnelId) {
          const sourceEmail = normalizeEmail(person.PrimaryEmail || person.primary_email || '');
          if (sourceEmail) maps.personnelByEmail.set(sourceEmail, personnelId);
        }
      }

      const specialGuestOutcome = await processRecords('Special guests', bundle.specialGuests, async row => {
        const sourceKey = resolveSourceKey(readValue(row, 'sourceId', 'SourceId', 'specialGuestSourceId', 'SpecialGuestSourceId'));
        const fullName = asString(readValue(row, 'FullName', 'fullName', 'Name', 'name'));
        if (!fullName) throw new Error('Missing full name for special guest.');

        const response = await service.createSpecialGuest({
          FullName: fullName,
          PrimaryEmail: asString(readValue(row, 'PrimaryEmail', 'primaryEmail', 'Email', 'email')),
          PrimaryPhone: asString(readValue(row, 'PrimaryPhone', 'primaryPhone', 'Phone', 'phone')),
          Expertise: asString(readValue(row, 'Expertise', 'expertise')),
          Notes: asString(readValue(row, 'Notes', 'notes')),
          Active: asBoolean(readValue(row, 'Active', 'active'), true),
        });

        if (!response?.success) throw new Error(response?.error || `Unable to create special guest ${fullName}.`);
        const guestId = Number(response.data?.SpecialGuestID || response.data?.special_guest_id || response.data?.id);
        if (sourceKey && guestId) maps.specialGuestBySource.set(sourceKey, guestId);
        appendLog(`Created special guest: ${fullName}`);
      });

      const personnelOutcome = await processRecords('Personnel', bundle.personnel, async row => {
        const sourceKey = resolveSourceKey(readValue(row, 'sourceId', 'SourceId', 'personnelSourceId', 'PersonnelSourceId'));
        const payload = buildImportPayload(row);
        const normalizedEmail = normalizeEmail(payload.PrimaryEmail);
        const existingId = normalizedEmail ? maps.personnelByEmail.get(normalizedEmail) : undefined;

        if (existingId) {
          const response = await service.updatePersonnel({ PersonnelID: existingId, ...payload });
          if (!response?.success) throw new Error(response?.error || `Unable to update ${payload.FirstName} ${payload.LastName}.`);
          if (sourceKey) maps.personnelBySource.set(sourceKey, existingId);
          appendLog(`Updated personnel: ${payload.FirstName} ${payload.LastName}`);
          return;
        }

        const response = await service.createPersonnel(payload);
        if (!response?.success) throw new Error(response?.error || `Unable to create ${payload.FirstName} ${payload.LastName}.`);

        const createdId = Number(response.data?.PersonnelID || response.data?.personnel_id || response.data?.id);
        if (sourceKey && createdId) maps.personnelBySource.set(sourceKey, createdId);
        if (normalizedEmail && createdId) maps.personnelByEmail.set(normalizedEmail, createdId);
        appendLog(`Created personnel: ${payload.FirstName} ${payload.LastName}`);
      });

      const roleOutcome = await processRecords('Teacher assignments', bundle.teachers, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'teacher assignment');
        await ensureCastMember(service, personnelId);
        const response = await service.addPersonAsTeacher(personnelId);
        if (!response?.success) throw new Error(response?.error || `Unable to add personnel ${personnelId} as a teacher.`);
        appendLog(`Added teacher role for personnel ${personnelId}`);
      });

      const directorOutcome = await processRecords('Director assignments', bundle.directors, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'director assignment');
        await ensureCastMember(service, personnelId);
        const response = await service.addPersonAsDirector(personnelId);
        if (!response?.success) throw new Error(response?.error || `Unable to add personnel ${personnelId} as a director.`);
        appendLog(`Added director role for personnel ${personnelId}`);
      });

      const bartenderOutcome = await processRecords('Bartender assignments', bundle.bartenders, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'bartender assignment');
        const response = await service.addPersonAsBartender(
          personnelId,
          asBoolean(readValue(row, 'Trained', 'trained'), false),
          asString(readValue(row, 'Status', 'status')) || 'Active',
        );
        if (!response?.success) throw new Error(response?.error || `Unable to add personnel ${personnelId} as a bartender.`);
        appendLog(`Added bartender role for personnel ${personnelId}`);
      });

      const classOutcome = await processRecords('Class offerings', bundle.classOfferings || bundle.classes, async row => {
        const sourceKey = resolveSourceKey(readValue(row, 'sourceId', 'SourceId', 'classSourceId', 'ClassSourceId'));
        const teacherPersonnelId = await resolveOrCreatePersonnelId(service, maps, row, 'class offering');
        const response = await service.createClassOffering({
          ClassLevelID: asNumber(readValue(row, 'ClassLevelID', 'classLevelId', 'class_level_id')) || 0,
          StartDate: readValue(row, 'StartDate', 'startDate', 'start_date') || '',
          EndDate: readValue(row, 'EndDate', 'endDate', 'end_date') || '',
          TeacherID: teacherPersonnelId,
          TeacherPersonnelID: teacherPersonnelId,
          RoomID: asNumber(readValue(row, 'RoomID', 'roomId', 'room_id')) || null,
          MaxStudents: asNumber(readValue(row, 'MaxStudents', 'maxStudents', 'max_students')) || 0,
          Status: asString(readValue(row, 'Status', 'status')) || 'Open',
          MeetingDays: asString(readValue(row, 'MeetingDays', 'meetingDays', 'meeting_days')),
          MeetingTime: asString(readValue(row, 'MeetingTime', 'meetingTime', 'meeting_time')),
        });

        if (!response?.success) throw new Error(response?.error || 'Unable to create class offering.');
        const classId = Number(response.data?.OfferingID || response.data?.offering_id || response.data?.id);
        if (sourceKey && classId) maps.classBySource.set(sourceKey, classId);
        appendLog(`Created class offering ${sourceKey || classId}`);
      });

      const showOutcome = await processRecords('Shows', bundle.shows, async row => {
        const sourceKey = resolveSourceKey(readValue(row, 'sourceId', 'SourceId', 'showSourceId', 'ShowSourceId'));
        const directorPersonnelId = await resolveOrCreatePersonnelId(service, maps, row, 'show director');
        if (directorPersonnelId) await ensureCastMember(service, directorPersonnelId);
        const response = await service.createShow({
          ShowDate: readValue(row, 'ShowDate', 'showDate', 'show_date') || '',
          ShowTime: asString(readValue(row, 'ShowTime', 'showTime', 'show_time')),
          ShowTypeID: asNumber(readValue(row, 'ShowTypeID', 'showTypeId', 'show_type_id')) || 0,
          DirectorID: directorPersonnelId ?? null,
          Venue: asString(readValue(row, 'Venue', 'venue')),
          Status: asString(readValue(row, 'Status', 'status')) || 'Scheduled',
        });

        if (!response?.success) throw new Error(response?.error || 'Unable to create show.');
        const showId = Number(response.data?.ShowID || response.data?.show_id || response.data?.id);
        if (sourceKey && showId) maps.showBySource.set(sourceKey, showId);
        appendLog(`Created show ${sourceKey || showId}`);
      });

      const workshopOutcome = await processRecords('Workshops', bundle.workshops, async row => {
        const sourceKey = resolveSourceKey(readValue(row, 'sourceId', 'SourceId', 'workshopSourceId', 'WorkshopSourceId'));
        const instructorPersonnelId = await resolveOrCreatePersonnelId(service, maps, row, 'workshop instructor');
        const specialGuestSourceId = resolveSourceKey(readValue(row, 'SpecialGuestSourceId', 'specialGuestSourceId', 'specialGuestSourceID'));
        const specialGuestId = specialGuestSourceId ? maps.specialGuestBySource.get(specialGuestSourceId) : undefined;

        const response = await service.createWorkshop({
          Title: asString(readValue(row, 'Title', 'title')),
          Description: asString(readValue(row, 'Description', 'description')),
          WorkshopDate: readValue(row, 'WorkshopDate', 'workshopDate', 'workshop_date') || '',
          StartTime: asString(readValue(row, 'StartTime', 'startTime', 'start_time')),
          EndTime: asString(readValue(row, 'EndTime', 'endTime', 'end_time')),
          RoomID: asNumber(readValue(row, 'RoomID', 'roomId', 'room_id')) || null,
          Venue: asString(readValue(row, 'Venue', 'venue')),
          InstructorPersonnelID: instructorPersonnelId || null,
          SpecialGuestID: specialGuestId || null,
          Capacity: asNumber(readValue(row, 'Capacity', 'capacity')) || 0,
          Status: asString(readValue(row, 'Status', 'status')) || 'Upcoming',
          Notes: asString(readValue(row, 'Notes', 'notes')),
        });

        if (!response?.success) throw new Error(response?.error || 'Unable to create workshop.');
        const workshopId = Number(response.data?.WorkshopID || response.data?.workshop_id || response.data?.id);
        if (sourceKey && workshopId) maps.workshopBySource.set(sourceKey, workshopId);
        appendLog(`Created workshop ${sourceKey || workshopId}`);
      });

      const enrollmentOutcome = await processRecords('Class enrollments', bundle.classEnrollments, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'class enrollment');
        const classSourceId = resolveSourceKey(readValue(row, 'classSourceId', 'ClassSourceId', 'offeringSourceId', 'OfferingSourceId'));
        const classId = classSourceId ? maps.classBySource.get(classSourceId) : asNumber(readValue(row, 'OfferingID', 'offeringId', 'offering_id'));

        if (!personnelId) throw new Error('Could not resolve student personnel.');
        if (!classId) throw new Error('Could not resolve class offering.');

        const studentBootstrap = await service.addPersonAsStudent(personnelId);
        if (!studentBootstrap?.success) throw new Error(studentBootstrap?.error || 'Unable to create student record.');

        if (typeof service.enrollPersonAsStudent === 'function') {
          const enrollResponse = await service.enrollPersonAsStudent(personnelId, classId);
          if (!enrollResponse?.success) throw new Error(enrollResponse?.error || 'Unable to enroll student.');
        } else {
          const studentId = Number(studentBootstrap.data?.StudentID);
          const enrollResponse = await service.enrollStudent(classId, studentId);
          if (!enrollResponse?.success) throw new Error(enrollResponse?.error || 'Unable to enroll student.');
        }

        appendLog(`Enrolled personnel ${personnelId} in class ${classId}`);
      });

      const castOutcome = await processRecords('Show cast', bundle.showCast, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'show cast');
        const showSourceId = resolveSourceKey(readValue(row, 'showSourceId', 'ShowSourceId'));
        const showId = showSourceId ? maps.showBySource.get(showSourceId) : asNumber(readValue(row, 'ShowID', 'showId'));
        const role = asString(readValue(row, 'Role', 'role')) || 'Cast Member';

        if (!personnelId) throw new Error('Could not resolve cast member personnel.');
        if (!showId) throw new Error('Could not resolve show.');

        await ensureCastMember(service, personnelId);
        const response = await service.updateShowCast(showId, [{ ShowID: showId, PersonnelID: personnelId, Role: role }]);
        if (!response?.success) throw new Error(response?.error || 'Unable to update show cast.');
        appendLog(`Updated cast for show ${showId}: ${personnelId} as ${role}`);
      });

      const crewOutcome = await processRecords('Show crew', bundle.showCrew, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'show crew');
        const showSourceId = resolveSourceKey(readValue(row, 'showSourceId', 'ShowSourceId'));
        const showId = showSourceId ? maps.showBySource.get(showSourceId) : asNumber(readValue(row, 'ShowID', 'showId'));
        const dutyTypeId = asNumber(readValue(row, 'CrewDutyTypeID', 'crewDutyTypeId', 'dutyTypeId', 'DutyTypeID')) || 0;

        if (!personnelId) throw new Error('Could not resolve crew personnel.');
        if (!showId) throw new Error('Could not resolve show.');
        if (!dutyTypeId) throw new Error('Missing crew duty type.');

        const response = await service.addPersonAsCrewMember(personnelId, showId, dutyTypeId);
        if (!response?.success) throw new Error(response?.error || 'Unable to add crew member.');
        appendLog(`Added crew member ${personnelId} to show ${showId}`);
      });

      const workshopRegistrationOutcome = await processRecords('Workshop registrations', bundle.workshopRegistrations, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'workshop registration');
        const workshopSourceId = resolveSourceKey(readValue(row, 'workshopSourceId', 'WorkshopSourceId'));
        const workshopId = workshopSourceId ? maps.workshopBySource.get(workshopSourceId) : asNumber(readValue(row, 'WorkshopID', 'workshopId'));

        if (!personnelId) throw new Error('Could not resolve workshop participant.');
        if (!workshopId) throw new Error('Could not resolve workshop.');

        const response = await service.registerPersonnelForWorkshop(workshopId, personnelId);
        if (!response?.success) throw new Error(response?.error || 'Unable to register workshop participant.');
        appendLog(`Registered personnel ${personnelId} for workshop ${workshopId}`);
      });

      const studentOutcome = await processRecords('Student profiles', bundle.studentProfiles, async row => {
        const personnelId = await resolveOrCreatePersonnelId(service, maps, row, 'student profile');
        if (!personnelId) throw new Error('Could not resolve student personnel.');

        const studentsResponse = await service.getAllStudentsWithDetails();
        if (!studentsResponse?.success) throw new Error(studentsResponse?.error || 'Unable to load students.');

        const student = (studentsResponse.data || []).find((entry: any) => Number(entry.PersonnelID) === Number(personnelId));
        if (!student) throw new Error(`No StudentInfo record exists for personnel ${personnelId}.`);

        const studentId = Number(student.StudentID);
        const status = asString(readValue(row, 'Status', 'status'));
        const currentLevel = asNumber(readValue(row, 'CurrentLevel', 'currentLevel', 'current_level'));

        if (status) {
          const statusResponse = await service.updateStudentStatus(studentId, status);
          if (!statusResponse?.success) throw new Error(statusResponse?.error || 'Unable to update student status.');
        }

        if (currentLevel !== undefined) {
          const levelResponse = await service.updateStudentLevel(studentId, currentLevel);
          if (!levelResponse?.success) throw new Error(levelResponse?.error || 'Unable to update student level.');
        }

        appendLog(`Updated student profile for personnel ${personnelId}`);
      });

      setOutcomes([
        specialGuestOutcome,
        personnelOutcome,
        roleOutcome,
        directorOutcome,
        bartenderOutcome,
        classOutcome,
        showOutcome,
        workshopOutcome,
        enrollmentOutcome,
        castOutcome,
        crewOutcome,
        workshopRegistrationOutcome,
        studentOutcome,
      ]);

      setMessage({ type: 'success', text: 'Import complete. Review the log for any skipped or failed records.' });
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Import failed.';
      setMessage({ type: 'error', text: errorText });
      appendLog(`Import failed: ${errorText}`);
    } finally {
      setImporting(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setMessage({ type: 'warning', text: `${file.name} was ignored. Use the on-page forms instead.` });
  };

  const renderRowField = (section: ImportSection, rowIndex: number, field: string, label: string, type: 'text' | 'number' | 'date' | 'checkbox' = 'text') => {
    const row = ((bundle[section] || []) as Record<string, Primitive>[])[rowIndex] || {};
    const value = row[field] ?? '';

    return (
      <label className="flex flex-col gap-1 text-sm text-slate-600">
        <span className="font-medium text-slate-700">{label}</span>
        {type === 'checkbox' ? (
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(event) => updateRow(section, rowIndex, field, event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
        ) : (
          <input
            type={type}
            value={value as string | number | readonly string[] | undefined}
            onChange={(event) => updateRow(section, rowIndex, field, type === 'number' ? event.target.valueAsNumber : event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-amber-400"
          />
        )}
      </label>
    );
  };

  const renderPeopleSection = (section: 'personnel' | 'specialGuests' | 'teachers' | 'directors' | 'bartenders') => {
    const rows = (bundle[section] || []) as Record<string, Primitive>[];
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{sections.find((item) => item.key === section)?.label}</h2>
            <p className="text-sm text-slate-500">{sections.find((item) => item.key === section)?.helper}</p>
          </div>
          <button
            type="button"
            onClick={() => addRow(section, section === 'specialGuests' ? { FullName: '', PrimaryEmail: '', PrimaryPhone: '', Expertise: '', Notes: '', Active: true } : section === 'bartenders' ? { personnelSourceId: '', Trained: false, Status: 'Active' } : { sourceId: '', FirstName: '', LastName: '', PrimaryEmail: '', PrimaryPhone: '', Instagram: '', Birthday: '', IsActive: true })}
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Add row
          </button>
        </div>
        <div className="space-y-4">
          {rows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No rows yet.</div>
          ) : rows.map((row, rowIndex) => (
            <div key={`${section}-${rowIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-sm font-medium text-slate-700">Row {rowIndex + 1}</div>
                <button type="button" onClick={() => removeRow(section, rowIndex)} className="text-sm text-red-600 hover:text-red-700">Remove</button>
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {section === 'specialGuests' ? (
                  <>
                    {renderRowField(section, rowIndex, 'FullName', 'Full name')}
                    {renderRowField(section, rowIndex, 'PrimaryEmail', 'Email')}
                    {renderRowField(section, rowIndex, 'PrimaryPhone', 'Phone')}
                    {renderRowField(section, rowIndex, 'Expertise', 'Expertise')}
                    {renderRowField(section, rowIndex, 'Notes', 'Notes')}
                    {renderRowField(section, rowIndex, 'Active', 'Active', 'checkbox')}
                  </>
                ) : section === 'bartenders' ? (
                  <>
                    {renderRowField(section, rowIndex, 'personnelSourceId', 'Personnel source ID')}
                    {renderRowField(section, rowIndex, 'Trained', 'Trained', 'checkbox')}
                    {renderRowField(section, rowIndex, 'Status', 'Status')}
                  </>
                ) : (
                  <>
                    {renderRowField(section, rowIndex, 'sourceId', 'Source ID')}
                    {renderRowField(section, rowIndex, 'FirstName', 'First name')}
                    {renderRowField(section, rowIndex, 'LastName', 'Last name')}
                    {renderRowField(section, rowIndex, 'PrimaryEmail', 'Email')}
                    {renderRowField(section, rowIndex, 'PrimaryPhone', 'Phone')}
                    {renderRowField(section, rowIndex, 'Instagram', 'Instagram')}
                    {renderRowField(section, rowIndex, 'Birthday', 'Birthday', 'date')}
                    {renderRowField(section, rowIndex, 'IsActive', 'Active', 'checkbox')}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSectionEditor = (
    section: ImportSection,
    title: string,
    helper: string,
    rows: Record<string, Primitive>[],
    addTemplate: Record<string, Primitive>,
    fieldRenderer: (rowIndex: number) => React.ReactNode,
  ) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500">{helper}</p>
        </div>
        <button
          type="button"
          onClick={() => addRow(section, addTemplate)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
        >
          Add row
        </button>
      </div>

      <div className="space-y-4">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No rows yet.</div>
        ) : rows.map((row, rowIndex) => (
          <div key={`${section}-${rowIndex}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-medium text-slate-700">Row {rowIndex + 1}</div>
              <button type="button" onClick={() => removeRow(section, rowIndex)} className="text-sm text-red-600 hover:text-red-700">Remove</button>
            </div>
            {fieldRenderer(rowIndex)}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-full bg-gradient-to-br from-slate-50 via-white to-amber-50 text-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">
                Historical data import
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">Bring the database current with structured entry.</h1>
              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Enter historical records directly in the app, section by section, then import personnel, classes, shows,
                workshops, enrollments, cast, crew, and student updates in the right order.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={loadSample}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Reset sample data
              </button>
              <button
                type="button"
                disabled={importing}
                onClick={runImport}
                className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? 'Importing...' : 'Run import'}
              </button>
            </div>
          </div>
        </div>

        {message && <div className="mb-6"><Message type={message.type} message={message.text} onClose={() => setMessage(null)} /></div>}
        {validationError && <div className="mb-6"><Message type="error" message={validationError} /></div>}

        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.85fr]">
          <div className="space-y-6">
            {renderPeopleSection('personnel')}
            {renderPeopleSection('specialGuests')}
            {renderPeopleSection('teachers')}
            {renderPeopleSection('directors')}
            {renderPeopleSection('bartenders')}

            {renderSectionEditor(
              'classOfferings',
              'Class Offerings',
              'Historical classes to recreate.',
              (bundle.classOfferings || bundle.classes || []) as Record<string, Primitive>[],
              { sourceId: '', ClassLevelID: 0, TeacherSourceId: '', StartDate: '', EndDate: '', RoomID: 0, MaxStudents: 0, Status: 'Open', MeetingDays: '', MeetingTime: '' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('classOfferings', rowIndex, 'sourceId', 'Source ID')}
                  {renderRowField('classOfferings', rowIndex, 'ClassLevelID', 'Class level ID', 'number')}
                  {renderRowField('classOfferings', rowIndex, 'TeacherSourceId', 'Teacher source ID')}
                  {renderRowField('classOfferings', rowIndex, 'StartDate', 'Start date', 'date')}
                  {renderRowField('classOfferings', rowIndex, 'EndDate', 'End date', 'date')}
                  {renderRowField('classOfferings', rowIndex, 'RoomID', 'Room ID', 'number')}
                  {renderRowField('classOfferings', rowIndex, 'MaxStudents', 'Max students', 'number')}
                  {renderRowField('classOfferings', rowIndex, 'Status', 'Status')}
                  {renderRowField('classOfferings', rowIndex, 'MeetingDays', 'Meeting days')}
                  {renderRowField('classOfferings', rowIndex, 'MeetingTime', 'Meeting time')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'shows',
              'Shows',
              'Past productions and performance dates.',
              (bundle.shows || []) as Record<string, Primitive>[],
              { sourceId: '', ShowDate: '', ShowTime: '', ShowTypeID: 0, DirectorSourceId: '', Venue: '', Status: 'Scheduled' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('shows', rowIndex, 'sourceId', 'Source ID')}
                  {renderRowField('shows', rowIndex, 'ShowDate', 'Show date', 'date')}
                  {renderRowField('shows', rowIndex, 'ShowTime', 'Show time')}
                  {renderRowField('shows', rowIndex, 'ShowTypeID', 'Show type ID', 'number')}
                  {renderRowField('shows', rowIndex, 'DirectorSourceId', 'Director source ID')}
                  {renderRowField('shows', rowIndex, 'Venue', 'Venue')}
                  {renderRowField('shows', rowIndex, 'Status', 'Status')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'workshops',
              'Workshops',
              'Workshops can reference instructors and special guests.',
              (bundle.workshops || []) as Record<string, Primitive>[],
              { sourceId: '', Title: '', Description: '', WorkshopDate: '', StartTime: '', EndTime: '', RoomID: 0, Venue: '', InstructorSourceId: '', SpecialGuestSourceId: '', Capacity: 0, Status: 'Upcoming', Notes: '' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('workshops', rowIndex, 'sourceId', 'Source ID')}
                  {renderRowField('workshops', rowIndex, 'Title', 'Title')}
                  {renderRowField('workshops', rowIndex, 'Description', 'Description')}
                  {renderRowField('workshops', rowIndex, 'WorkshopDate', 'Workshop date', 'date')}
                  {renderRowField('workshops', rowIndex, 'StartTime', 'Start time')}
                  {renderRowField('workshops', rowIndex, 'EndTime', 'End time')}
                  {renderRowField('workshops', rowIndex, 'RoomID', 'Room ID', 'number')}
                  {renderRowField('workshops', rowIndex, 'Venue', 'Venue')}
                  {renderRowField('workshops', rowIndex, 'InstructorSourceId', 'Instructor source ID')}
                  {renderRowField('workshops', rowIndex, 'SpecialGuestSourceId', 'Special guest source ID')}
                  {renderRowField('workshops', rowIndex, 'Capacity', 'Capacity', 'number')}
                  {renderRowField('workshops', rowIndex, 'Status', 'Status')}
                  {renderRowField('workshops', rowIndex, 'Notes', 'Notes')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'classEnrollments',
              'Class Enrollments',
              'Attach students to historic classes.',
              (bundle.classEnrollments || []) as Record<string, Primitive>[],
              { personnelSourceId: '', classSourceId: '' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2">
                  {renderRowField('classEnrollments', rowIndex, 'personnelSourceId', 'Student/personnel source ID')}
                  {renderRowField('classEnrollments', rowIndex, 'classSourceId', 'Class source ID')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'showCast',
              'Show Cast',
              'Cast history for each show.',
              (bundle.showCast || []) as Record<string, Primitive>[],
              { showSourceId: '', personnelSourceId: '', Role: 'Cast Member' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('showCast', rowIndex, 'showSourceId', 'Show source ID')}
                  {renderRowField('showCast', rowIndex, 'personnelSourceId', 'Personnel source ID')}
                  {renderRowField('showCast', rowIndex, 'Role', 'Role')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'showCrew',
              'Show Crew',
              'Crew assignments for each show.',
              (bundle.showCrew || []) as Record<string, Primitive>[],
              { showSourceId: '', personnelSourceId: '', CrewDutyTypeID: 0 },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('showCrew', rowIndex, 'showSourceId', 'Show source ID')}
                  {renderRowField('showCrew', rowIndex, 'personnelSourceId', 'Personnel source ID')}
                  {renderRowField('showCrew', rowIndex, 'CrewDutyTypeID', 'Crew duty type ID', 'number')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'workshopRegistrations',
              'Workshop Registrations',
              'Historic attendance for workshops.',
              (bundle.workshopRegistrations || []) as Record<string, Primitive>[],
              { workshopSourceId: '', personnelSourceId: '' },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2">
                  {renderRowField('workshopRegistrations', rowIndex, 'workshopSourceId', 'Workshop source ID')}
                  {renderRowField('workshopRegistrations', rowIndex, 'personnelSourceId', 'Personnel source ID')}
                </div>
              ),
            )}

            {renderSectionEditor(
              'studentProfiles',
              'Student Profiles',
              'Update a student’s current status and level.',
              (bundle.studentProfiles || []) as Record<string, Primitive>[],
              { personnelSourceId: '', Status: 'Active', CurrentLevel: 0 },
              (rowIndex) => (
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {renderRowField('studentProfiles', rowIndex, 'personnelSourceId', 'Personnel source ID')}
                  {renderRowField('studentProfiles', rowIndex, 'Status', 'Status')}
                  {renderRowField('studentProfiles', rowIndex, 'CurrentLevel', 'Current level', 'number')}
                </div>
              ),
            )}

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Execution log</h2>
                <p className="text-sm text-slate-500">Each line shows the progress of the import run.</p>
              </div>
              <div className="max-h-[28rem] space-y-2 overflow-auto rounded-2xl bg-slate-950 p-4 text-sm text-slate-200">
                {logs.length === 0 ? (
                  <div className="text-slate-500">No log entries yet.</div>
                ) : logs.map((entry, index) => (
                  <div key={`${entry}-${index}`} className="border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Bundle summary</h2>
              <p className="mt-1 text-sm text-slate-500">Counts reflect the rows in the form sections below.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {[
                  ['Personnel', counts.personnel],
                  ['Special guests', counts.specialGuests],
                  ['Teachers', counts.teachers],
                  ['Directors', counts.directors],
                  ['Bartenders', counts.bartenders],
                  ['Classes', counts.classOfferings],
                  ['Shows', counts.shows],
                  ['Workshops', counts.workshops],
                  ['Enrollments', counts.enrollments],
                  ['Cast rows', counts.cast],
                  ['Crew rows', counts.crew],
                  ['Workshop regs', counts.workshopRegistrations],
                  ['Student profiles', counts.studentProfiles],
                ].map(([label, value]) => (
                  <div key={label as string} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
                    <div className="mt-1 text-2xl font-semibold text-slate-900">{value as number}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Recommended order</h2>
              <ol className="mt-4 space-y-3 text-sm text-slate-600">
                <li>1. Personnel and special guests</li>
                <li>2. Teacher, director, and bartender roles</li>
                <li>3. Classes, shows, and workshops</li>
                <li>4. Enrollments, cast, crew, and workshop registrations</li>
                <li>5. Student status and level updates</li>
              </ol>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Latest results</h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {outcomes.length === 0 ? (
                  <div>No import has been run yet.</div>
                ) : outcomes.map((outcome) => (
                  <div key={outcome.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="font-medium text-slate-900">{outcome.label}</div>
                    <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                      <span>Success: {outcome.success}</span>
                      <span>Skipped: {outcome.skipped}</span>
                      <span>Failed: {outcome.failed}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">How this works</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Fill out the sections you need, leave the rest empty, and run the import. Missing people referenced by
                classes, shows, workshops, or roles will be created automatically as placeholder personnel so the history
                can still be loaded.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { DataImport };