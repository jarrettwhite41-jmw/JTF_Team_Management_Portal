const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workbook = 'C:/Users/tatta/Downloads/JTF Database.xlsx';
const outDir = path.join(process.cwd(), 'tmp_xlsx');
const sqlDir = path.join(process.cwd(), 'tmp_import_sql');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(sqlDir, { recursive: true });

const sheets = [
  'ShowTypes',
  'ClassLevels',
  'CrewDutyTypes',
  'SkillCategories',
  'Skills',
  'StorageLocations',
  'InventoryCategories',
  'Rooms',
  'Personnel',
  'Directors',
  'Teachers',
  'Bartenders',
  'Alumni',
  'CastMemberInfo',
  'StudentInfo',
  'ClassOfferings',
  'ShowInformation',
  'MasterGameList',
  'StudentEnrollments',
  'ShowPerformances',
  'CrewDuties',
  'Rehearsals',
  'ClassAttendance',
  'ClassSessionLogs',
  'StudentProgressNotes',
  'InventoryItems',
  'InventoryTransactions',
  'GamesPlayed',
  'RehearsalAttendance',
  'StudentCompetencies'
];

function run(cmd) {
  execSync(cmd, { stdio: 'pipe' });
}

function readSheet(name) {
  const p = path.join(outDir, `${name}.json`);
  if (!fs.existsSync(p)) return [];
  const txt = fs.readFileSync(p, 'utf8');
  const body = txt.trim();
  if (!body) return [];
  try {
    const data = JSON.parse(body);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function isBlank(v) {
  return v === null || v === undefined || String(v).trim() === '';
}

function excelSerialToIsoDate(serial) {
  if (serial === null || serial === undefined || serial === '') return null;
  if (typeof serial === 'string') {
    if (serial.includes('T')) return serial.slice(0, 10);
    const s = serial.trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) return excelSerialToIsoDate(Number(s));
    const d = new Date(s);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 10);
  }
  if (typeof serial === 'number') {
    const utcDays = Math.floor(serial - 25569);
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    if (isNaN(dateInfo.getTime())) return null;
    return dateInfo.toISOString().slice(0, 10);
  }
  return null;
}

function excelSerialToTime(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    if (s.includes('T')) return s.slice(11, 19);
    if (/^\d{1,2}:\d{2}/.test(s)) return s.length === 5 ? `${s}:00` : s;
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(11, 19);
    if (/^\d+(\.\d+)?$/.test(s)) return excelSerialToTime(Number(s));
    return null;
  }
  if (typeof v === 'number') {
    const dayFraction = v % 1;
    const totalSeconds = Math.round(dayFraction * 86400);
    const hh = String(Math.floor(totalSeconds / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const ss = String(totalSeconds % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return null;
}

function toBool(v) {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null || v === undefined) return null;
  const s = String(v).trim().toLowerCase();
  if (!s) return null;
  if (['true', 'yes', 'y', '1', 'active', 'trained'].includes(s)) return true;
  if (['false', 'no', 'n', '0', 'inactive', 'limited/inactive'].includes(s)) return false;
  return null;
}

function q(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  const s = String(v).replace(/'/g, "''");
  return `'${s}'`;
}

function writeSql(order, table, columns, rows) {
  const file = path.join(sqlDir, `${String(order).padStart(2, '0')}_${table}.sql`);
  let sql = `-- ${table}\n`;
  if (!rows.length) {
    sql += `-- no rows\n`;
    fs.writeFileSync(file, sql, 'utf8');
    return;
  }
  const values = rows.map((r) => `(${columns.map((c) => q(r[c])).join(', ')})`).join(',\n');
  sql += `INSERT INTO public.${table} (${columns.join(', ')}) VALUES\n${values}\nON CONFLICT DO NOTHING;\n`;

  const idCol = columns.find((c) => c.endsWith('_id'));
  if (idCol) {
    sql += `SELECT setval(pg_get_serial_sequence('public.${table}','${idCol}'), COALESCE((SELECT MAX(${idCol}) FROM public.${table}),1), true);\n`;
  }
  fs.writeFileSync(file, sql, 'utf8');
}

for (const s of sheets) {
  run(`npx -y xlsx-cli -f "${workbook}" -s "${s}" -j -o "${path.join(outDir, `${s}.json`)}"`);
}

const showTypes = readSheet('ShowTypes')
  .filter((r) => !isBlank(r.ShowTypeID) && !isBlank(r.Name))
  .map((r) => ({ show_type_id: Number(r.ShowTypeID), show_type_name: String(r.Name).trim() }));

const classLevels = readSheet('ClassLevels')
  .filter((r) => !isBlank(r.ClassLevelID) && !isBlank(r.LevelName))
  .map((r) => ({
    class_level_id: Number(r.ClassLevelID),
    level_name: String(r.LevelName).trim(),
    description: isBlank(r.LevelDescription) ? null : String(r.LevelDescription).trim(),
  }));

const crewDutyTypes = readSheet('CrewDutyTypes')
  .filter((r) => !isBlank(r.CrewDutyTypeID) && !isBlank(r.DutyName))
  .map((r) => ({ crew_duty_type_id: Number(r.CrewDutyTypeID), duty_name: String(r.DutyName).trim() }));

const skillCategories = readSheet('SkillCategories')
  .filter((r) => !isBlank(r.CategoryID) && !isBlank(r.CategoryName))
  .map((r) => ({
    skill_category_id: Number(r.CategoryID),
    category_name: String(r.CategoryName).trim(),
    description: [r.PrimaryCourse, r.DevelopmentFocus].filter((x) => !isBlank(x)).join(' | ') || null,
  }));

const skills = readSheet('Skills')
  .filter((r) => !isBlank(r.SkillID) && !isBlank(r['CategoryID (FK)']) && !isBlank(r.SkillName))
  .map((r) => ({
    skill_id: Number(r.SkillID),
    skill_category_id: Number(r['CategoryID (FK)']),
    skill_name: String(r.SkillName).trim(),
    description: null,
  }));

const storageLocations = readSheet('StorageLocations')
  .filter((r) => !isBlank(r.LocationID) && !isBlank(r.LocationName))
  .map((r) => ({ location_id: Number(r.LocationID), location_name: String(r.LocationName).trim(), description: null }));

const inventoryCategories = readSheet('InventoryCategories')
  .filter((r) => !isBlank(r.CategoryID) && !isBlank(r.CategoryName))
  .map((r) => ({ category_id: Number(r.CategoryID), category_name: String(r.CategoryName).trim() }));

const rooms = readSheet('Rooms')
  .filter((r) => !isBlank(r.RoomID) && !isBlank(r.RoomName))
  .map((r) => ({ room_id: Number(r.RoomID), room_name: String(r.RoomName).trim() }));
const roomById = new Map(rooms.map((r) => [r.room_id, r.room_name]));

const personnel = readSheet('Personnel')
  .filter((r) => !isBlank(r.PersonnelID) && !isBlank(r.FirstName) && !isBlank(r.LastName))
  .map((r) => ({
    personnel_id: Number(r.PersonnelID),
    first_name: String(r.FirstName).trim(),
    last_name: String(r.LastName).trim(),
    primary_email: isBlank(r.PrimaryEmail) ? null : String(r.PrimaryEmail).trim(),
    primary_phone: isBlank(r.PrimaryPhone) ? null : String(r.PrimaryPhone).trim(),
    instagram: isBlank(r.Instagram) ? null : String(r.Instagram).trim(),
    birthday: excelSerialToIsoDate(r.Birthday),
  }));

const directors = readSheet('Directors')
  .filter((r) => !isBlank(r.DirectorID) && !isBlank(r.PersonnelID))
  .map((r) => ({ director_id: Number(r.DirectorID), personnel_id: Number(r.PersonnelID) }));
const directorByPersonnel = new Map(directors.map((d) => [d.personnel_id, d.director_id]));

const teachers = readSheet('Teachers')
  .filter((r) => !isBlank(r.TeacherID) && !isBlank(r.PersonnelID))
  .map((r) => ({ teacher_id: Number(r.TeacherID), personnel_id: Number(r.PersonnelID), active: toBool(r.Active) ?? true }));

const bartenders = readSheet('Bartenders')
  .filter((r) => !isBlank(r.BartenderID) && !isBlank(r.PersonnelID))
  .map((r) => ({
    bartender_id: Number(r.BartenderID),
    personnel_id: Number(r.PersonnelID),
    trained: toBool(r.Trained) ?? false,
    status: isBlank(r.Status) ? 'Active' : String(r.Status).trim(),
    active: toBool(r.Active) ?? true,
  }));

const alumni = readSheet('Alumni')
  .filter((r) => !isBlank(r.AlumniID) && !isBlank(r.PersonnelID))
  .map((r) => ({ alumni_id: Number(r.AlumniID), personnel_id: Number(r.PersonnelID), graduation_date: null }));

const castMemberInfo = readSheet('CastMemberInfo')
  .filter((r) => !isBlank(r.CastMemberID) && !isBlank(r.PersonnelID))
  .map((r) => ({ cast_member_id: Number(r.CastMemberID), personnel_id: Number(r.PersonnelID) }));
const castToPersonnel = new Map(castMemberInfo.map((r) => [r.cast_member_id, r.personnel_id]));

const studentInfo = readSheet('StudentInfo')
  .filter((r) => !isBlank(r.StudentID) && !isBlank(r.PersonnelID))
  .map((r) => ({
    student_id: Number(r.StudentID),
    personnel_id: Number(r.PersonnelID),
    enrollment_date: '2024-01-01',
    status: 'Active',
    current_level_id: isBlank(r.HighestLevelCompleted) ? null : Number(r.HighestLevelCompleted),
    notes: null,
  }));

const classOfferings = readSheet('ClassOfferings')
  .filter((r) => !isBlank(r.OfferingID) && !isBlank(r.ClassLevelID) && !isBlank(r.StartDate) && !isBlank(r.EndDate))
  .map((r) => ({
    offering_id: Number(r.OfferingID),
    class_level_id: Number(r.ClassLevelID),
    start_date: excelSerialToIsoDate(r.StartDate),
    end_date: excelSerialToIsoDate(r.EndDate),
    teacher_id: isBlank(r.TeacherID) ? null : Number(r.TeacherID),
    room_id: isBlank(r.RoomID) ? null : Number(r.RoomID),
    max_students: isBlank(r.MaxStudents) ? 12 : Number(r.MaxStudents),
    status: isBlank(r.Status) ? 'Open' : String(r.Status).trim(),
    notes: isBlank(r.MeetingDays) ? null : String(r.MeetingDays).trim(),
  }));

const showInformation = readSheet('ShowInformation')
  .filter((r) => !isBlank(r.ShowID) && !isBlank(r.ShowDate) && !isBlank(r.ShowTypeID))
  .map((r) => {
    const roomId = isBlank(r.RoomID) ? null : Number(r.RoomID);
    const directorPersonnelId = isBlank(r.DirectorID) ? null : Number(r.DirectorID);
    return {
      show_id: Number(r.ShowID),
      show_date: excelSerialToIsoDate(r.ShowDate),
      show_time: excelSerialToTime(r.ShowTime),
      show_type_id: Number(r.ShowTypeID),
      director_id: directorPersonnelId !== null ? (directorByPersonnel.get(directorPersonnelId) || null) : null,
      venue: roomId && roomById.has(roomId) ? roomById.get(roomId) : null,
      status: 'Scheduled',
      notes: isBlank(r.ShowNotes) ? null : String(r.ShowNotes).trim(),
    };
  });

const masterGameList = readSheet('MasterGameList')
  .filter((r) => !isBlank(r.GameID) && !isBlank(r.Name))
  .map((r) => ({
    game_id: Number(r.GameID),
    game_name: String(r.Name).trim(),
    description: isBlank(r['SHORT DESCRIPTION']) ? null : String(r['SHORT DESCRIPTION']).trim(),
    category: isBlank(r.GameType) ? null : String(r.GameType).trim(),
    difficulty_level: null,
  }));

const studentEnrollments = readSheet('StudentEnrollments')
  .filter((r) => !isBlank(r.EnrollmentID) && !isBlank(r.OfferingID) && !isBlank(r.StudentID) && !isBlank(r.EnrollmentDate))
  .map((r) => ({
    enrollment_id: Number(r.EnrollmentID),
    offering_id: Number(r.OfferingID),
    student_id: Number(r.StudentID),
    enrollment_date: excelSerialToIsoDate(r.EnrollmentDate),
    status: isBlank(r.CompletionStatus) ? 'Active' : String(r.CompletionStatus).trim(),
  }));

const showPerformances = readSheet('ShowPerformances')
  .filter((r) => !isBlank(r.PerformanceID) && !isBlank(r.ShowID) && !isBlank(r.CastMemberID))
  .map((r) => ({
    performance_id: Number(r.PerformanceID),
    show_id: Number(r.ShowID),
    personnel_id: castToPersonnel.get(Number(r.CastMemberID)) || null,
    role: null,
  }))
  .filter((r) => r.personnel_id !== null);

const crewDuties = readSheet('CrewDuties')
  .filter((r) => !isBlank(r.DutyID) && !isBlank(r.ShowID) && !isBlank(r.CastMemberID) && !isBlank(r.CrewDutyTypeID))
  .map((r) => ({
    duty_id: Number(r.DutyID),
    show_id: Number(r.ShowID),
    personnel_id: castToPersonnel.get(Number(r.CastMemberID)) || null,
    crew_duty_type_id: Number(r.CrewDutyTypeID),
  }))
  .filter((r) => r.personnel_id !== null);

const rehearsals = readSheet('Rehearsals')
  .filter((r) => !isBlank(r.RehearsalID) && !isBlank(r.RehearsalDate))
  .map((r) => ({
    rehearsal_id: Number(r.RehearsalID),
    show_id: null,
    rehearsal_date: excelSerialToIsoDate(r.RehearsalDate),
    rehearsal_time: excelSerialToTime(r.RehearsalTime),
    location: null,
    notes: [!isBlank(r.LeadPersonnelID) ? `LeadPersonnelID:${r.LeadPersonnelID}` : null, !isBlank(r['Notes ']) ? String(r['Notes ']).trim() : null].filter(Boolean).join(' | ') || null,
  }));

const classAttendance = readSheet('ClassAttendance')
  .filter((r) => !isBlank(r.AttendanceID) && !isBlank(r.EnrollmentID) && !isBlank(r.ClassDate))
  .map((r) => {
    const s = isBlank(r.AttendanceStatus) ? '' : String(r.AttendanceStatus).trim().toLowerCase();
    const attended = s.includes('absent') || s.includes('miss') ? false : true;
    return {
      attendance_id: Number(r.AttendanceID),
      enrollment_id: Number(r.EnrollmentID),
      class_date: excelSerialToIsoDate(r.ClassDate),
      attended,
      notes: isBlank(r.AttendanceStatus) ? null : String(r.AttendanceStatus).trim(),
    };
  });

const classSessionLogs = readSheet('ClassSessionLogs')
  .filter((r) => !isBlank(r.SessionLogID) && !isBlank(r.OfferingID) && !isBlank(r.ClassDate))
  .map((r) => ({
    session_log_id: Number(r.SessionLogID),
    offering_id: Number(r.OfferingID),
    session_date: excelSerialToIsoDate(r.ClassDate),
    curriculum_notes: isBlank(r.CurriculumCovered) ? null : String(r.CurriculumCovered).trim(),
    group_notes: [!isBlank(r.TeacherID) ? `TeacherID:${r.TeacherID}` : null, !isBlank(r.GeneralClassNotes) ? String(r.GeneralClassNotes).trim() : null].filter(Boolean).join(' | ') || null,
  }));

const studentProgressNotes = readSheet('StudentProgressNotes')
  .filter((r) => !isBlank(r.NoteID) && !isBlank(r.EnrollmentID) && !isBlank(r.NoteDate))
  .map((r) => ({
    progress_note_id: Number(r.NoteID),
    enrollment_id: Number(r.EnrollmentID),
    note_date: excelSerialToIsoDate(r.NoteDate),
    narrative_feedback: [!isBlank(r.TeacherID) ? `TeacherID:${r.TeacherID}` : null, !isBlank(r.FeedbackText) ? String(r.FeedbackText).trim() : null, !isBlank(r.InternalOnly) ? `InternalOnly:${r.InternalOnly}` : null].filter(Boolean).join(' | ') || null,
  }));

let inventoryItems = readSheet('InventoryItems')
  .filter((r) => !isBlank(r.ItemID) && !isBlank(r.ItemName) && !isBlank(r.CategoryID))
  .map((r) => ({
    item_id: Number(r.ItemID),
    item_name: String(r.ItemName).trim(),
    category_id: Number(r.CategoryID),
    current_quantity: 0,
    min_quantity: isBlank(r.ReorderPoint) ? 0 : Number(r.ReorderPoint),
    location_id: null,
    notes: [!isBlank(r.SKU) ? `SKU:${r.SKU}` : null, !isBlank(r.Description) ? String(r.Description).trim() : null].filter(Boolean).join(' | ') || null,
  }));

const inventoryTransactions = readSheet('InventoryTransactions')
  .filter((r) => !isBlank(r.TransactionID) && !isBlank(r.ItemID) && !isBlank(r.TransactionType) && !isBlank(r.QuantityChange))
  .map((r) => ({
    transaction_id: Number(r.TransactionID),
    item_id: Number(r.ItemID),
    transaction_type: String(r.TransactionType).trim(),
    quantity_change: Number(r.QuantityChange),
    notes: [!isBlank(r.LocationID) ? `LocationID:${r.LocationID}` : null, !isBlank(r.TransactionDate) ? `TransactionDate:${excelSerialToIsoDate(r.TransactionDate)}` : null, !isBlank(r.Notes) ? String(r.Notes).trim() : null].filter(Boolean).join(' | ') || null,
    created_by: isBlank(r.PersonnelID) ? null : String(r.PersonnelID),
  }));

// Ensure every referenced transaction item exists to satisfy FK constraints.
const inventoryItemIds = new Set(inventoryItems.map((i) => i.item_id));
for (const tx of inventoryTransactions) {
  if (!inventoryItemIds.has(tx.item_id)) {
    inventoryItems.push({
      item_id: tx.item_id,
      item_name: `Unknown Item ${tx.item_id}`,
      category_id: 5,
      current_quantity: 0,
      min_quantity: 0,
      location_id: null,
      notes: 'Auto-generated placeholder from InventoryTransactions',
    });
    inventoryItemIds.add(tx.item_id);
  }
}
inventoryItems = inventoryItems.sort((a, b) => a.item_id - b.item_id);

const gamesPlayed = readSheet('GamesPlayed')
  .filter((r) => !isBlank(r.GamesPlayedID) && !isBlank(r.ShowID) && !isBlank(r.GameID))
  .map((r) => ({
    games_played_id: Number(r.GamesPlayedID),
    show_id: Number(r.ShowID),
    game_id: Number(r.GameID),
    order_in_show: null,
    notes: [r.CustomGameName, r.GameVariationNotes, r.FlagForMasterList].filter((x) => !isBlank(x)).map((x) => String(x).trim()).join(' | ') || null,
  }));

const rehearsalAttendance = readSheet('RehearsalAttendance')
  .filter((r) => !isBlank(r.AttendanceID) && !isBlank(r.RehearsalID) && !isBlank(r.CastMemberID))
  .map((r) => ({
    attendance_id: Number(r.AttendanceID),
    rehearsal_id: Number(r.RehearsalID),
    personnel_id: castToPersonnel.get(Number(r.CastMemberID)) || null,
    attended: true,
    notes: null,
  }))
  .filter((r) => r.personnel_id !== null);

const enrollmentToStudent = new Map(studentEnrollments.map((r) => [r.enrollment_id, r.student_id]));
const skillsByCategory = new Map(skills.map((s) => [s.skill_category_id, s.skill_id]));

const studentCompetencies = readSheet('StudentCompetencies')
  .filter((r) => !isBlank(r.CompetencyID) && !isBlank(r.EnrollmentID) && !isBlank(r.Rating))
  .map((r) => {
    const categoryRaw = r.SkillCategory;
    let skillId = null;
    if (!isBlank(categoryRaw) && /^\d+$/.test(String(categoryRaw).trim())) {
      const catId = Number(categoryRaw);
      skillId = skillsByCategory.get(catId) || null;
    }
    return {
      competency_id: Number(r.CompetencyID),
      student_id: enrollmentToStudent.get(Number(r.EnrollmentID)) || null,
      enrollment_id: Number(r.EnrollmentID),
      skill_id: skillId,
      rating: Number(r.Rating),
      notes: [!isBlank(r.TeacherComments) ? String(r.TeacherComments).trim() : null, !isBlank(r.SkillCategory) ? `SkillCategory:${r.SkillCategory}` : null].filter(Boolean).join(' | ') || null,
      assessed_date: excelSerialToIsoDate(r.DateAdded),
    };
  })
  .filter((r) => r.student_id !== null && r.skill_id !== null);

// Clear target tables in reverse dependency order.
fs.writeFileSync(
  path.join(sqlDir, '00_truncate.sql'),
  `TRUNCATE TABLE\npublic.rehearsal_attendance,\npublic.games_played,\npublic.inventory_transactions,\npublic.inventory_items,\npublic.student_competencies,\npublic.student_progress_notes,\npublic.class_session_logs,\npublic.class_attendance,\npublic.rehearsals,\npublic.crew_duties,\npublic.show_performances,\npublic.student_enrollments,\npublic.master_game_list,\npublic.show_information,\npublic.class_offerings,\npublic.student_info,\npublic.alumni,\npublic.bartenders,\npublic.teachers,\npublic.directors,\npublic.personnel,\npublic.rooms,\npublic.inventory_categories,\npublic.storage_locations,\npublic.skills,\npublic.skill_categories,\npublic.crew_duty_types,\npublic.class_levels,\npublic.show_types\nRESTART IDENTITY CASCADE;\n`,
  'utf8'
);

writeSql(1, 'show_types', ['show_type_id', 'show_type_name'], showTypes);
writeSql(2, 'class_levels', ['class_level_id', 'level_name', 'description'], classLevels);
writeSql(3, 'crew_duty_types', ['crew_duty_type_id', 'duty_name'], crewDutyTypes);
writeSql(4, 'skill_categories', ['skill_category_id', 'category_name', 'description'], skillCategories);
writeSql(5, 'skills', ['skill_id', 'skill_category_id', 'skill_name', 'description'], skills);
writeSql(6, 'storage_locations', ['location_id', 'location_name', 'description'], storageLocations);
writeSql(7, 'inventory_categories', ['category_id', 'category_name'], inventoryCategories);
writeSql(8, 'rooms', ['room_id', 'room_name'], rooms);
writeSql(9, 'personnel', ['personnel_id', 'first_name', 'last_name', 'primary_email', 'primary_phone', 'instagram', 'birthday'], personnel);
writeSql(10, 'directors', ['director_id', 'personnel_id'], directors);
writeSql(11, 'teachers', ['teacher_id', 'personnel_id', 'active'], teachers);
writeSql(12, 'bartenders', ['bartender_id', 'personnel_id', 'trained', 'status', 'active'], bartenders);
writeSql(13, 'alumni', ['alumni_id', 'personnel_id', 'graduation_date'], alumni);
writeSql(14, 'student_info', ['student_id', 'personnel_id', 'enrollment_date', 'status', 'current_level_id', 'notes'], studentInfo);
writeSql(15, 'class_offerings', ['offering_id', 'class_level_id', 'start_date', 'end_date', 'teacher_id', 'room_id', 'max_students', 'status', 'notes'], classOfferings);
writeSql(16, 'show_information', ['show_id', 'show_date', 'show_time', 'show_type_id', 'director_id', 'venue', 'status', 'notes'], showInformation);
writeSql(17, 'master_game_list', ['game_id', 'game_name', 'description', 'category', 'difficulty_level'], masterGameList);
writeSql(18, 'student_enrollments', ['enrollment_id', 'offering_id', 'student_id', 'enrollment_date', 'status'], studentEnrollments);
writeSql(19, 'show_performances', ['performance_id', 'show_id', 'personnel_id', 'role'], showPerformances);
writeSql(20, 'crew_duties', ['duty_id', 'show_id', 'personnel_id', 'crew_duty_type_id'], crewDuties);
writeSql(21, 'rehearsals', ['rehearsal_id', 'show_id', 'rehearsal_date', 'rehearsal_time', 'location', 'notes'], rehearsals);
writeSql(22, 'class_attendance', ['attendance_id', 'enrollment_id', 'class_date', 'attended', 'notes'], classAttendance);
writeSql(23, 'class_session_logs', ['session_log_id', 'offering_id', 'session_date', 'curriculum_notes', 'group_notes'], classSessionLogs);
writeSql(24, 'student_progress_notes', ['progress_note_id', 'enrollment_id', 'note_date', 'narrative_feedback'], studentProgressNotes);
writeSql(25, 'inventory_items', ['item_id', 'item_name', 'category_id', 'current_quantity', 'min_quantity', 'location_id', 'notes'], inventoryItems);
writeSql(26, 'inventory_transactions', ['transaction_id', 'item_id', 'transaction_type', 'quantity_change', 'notes', 'created_by'], inventoryTransactions);
writeSql(27, 'games_played', ['games_played_id', 'show_id', 'game_id', 'order_in_show', 'notes'], gamesPlayed);
writeSql(28, 'rehearsal_attendance', ['attendance_id', 'rehearsal_id', 'personnel_id', 'attended', 'notes'], rehearsalAttendance);
writeSql(29, 'student_competencies', ['competency_id', 'student_id', 'enrollment_id', 'skill_id', 'rating', 'notes', 'assessed_date'], studentCompetencies);

const summary = {
  show_types: showTypes.length,
  class_levels: classLevels.length,
  crew_duty_types: crewDutyTypes.length,
  skill_categories: skillCategories.length,
  skills: skills.length,
  storage_locations: storageLocations.length,
  inventory_categories: inventoryCategories.length,
  rooms: rooms.length,
  personnel: personnel.length,
  directors: directors.length,
  teachers: teachers.length,
  bartenders: bartenders.length,
  alumni: alumni.length,
  student_info: studentInfo.length,
  class_offerings: classOfferings.length,
  show_information: showInformation.length,
  master_game_list: masterGameList.length,
  student_enrollments: studentEnrollments.length,
  show_performances: showPerformances.length,
  crew_duties: crewDuties.length,
  rehearsals: rehearsals.length,
  class_attendance: classAttendance.length,
  class_session_logs: classSessionLogs.length,
  student_progress_notes: studentProgressNotes.length,
  inventory_items: inventoryItems.length,
  inventory_transactions: inventoryTransactions.length,
  games_played: gamesPlayed.length,
  rehearsal_attendance: rehearsalAttendance.length,
  student_competencies: studentCompetencies.length,
};

fs.writeFileSync(path.join(sqlDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');
console.log(JSON.stringify(summary, null, 2));
