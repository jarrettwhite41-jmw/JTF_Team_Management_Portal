import fs from 'fs';
import path from 'path';

// Load raw data extracted from the Excel workbook
const rawDataPath = path.resolve('scripts/raw_excel_data.json');
const rawData = JSON.parse(fs.readFileSync(rawDataPath, 'utf8'));

// Load 09_personnel.sql to get exact existing IDs
const personnelSql = fs.readFileSync('tmp_import_sql/09_personnel.sql', 'utf8');
const pRegex = /\((\d+),\s*'([^']*)',\s*'([^']*)'/g;
let m;
const existingPersonnel = new Map(); // key -> id
const idToName = new Map();

while ((m = pRegex.exec(personnelSql)) !== null) {
  const id = parseInt(m[1]);
  const first = m[2].trim();
  const last = m[3].trim();
  const full = `${first} ${last}`.toLowerCase();
  existingPersonnel.set(full, id);
  idToName.set(id, { first, last });
}

// User-provided & confirmed name mapping table:
// Excel string -> { firstName, lastName, existingId? }
const nameMapping = {
  'Rick U.': { first: 'Rick', last: 'Urban', id: 48 },
  'Rick M.': { first: 'Rick', last: 'Munarriz', id: 47 },
  'Mike A.': { first: 'Mike', last: 'Acosta', id: 59 },
  'David C.': { first: 'David', last: 'Christopher', id: 14 },
  'David H.': { first: 'David', last: 'Hepburn', id: 15 },
  'Brett G.': { first: 'Brett', last: 'Graff', id: 5 },
  'Brett K.': { first: 'Brett', last: 'K.', id: 72 },
  'Alex H.': { first: 'Alex', last: 'H', id: 2 },
  'Alex T.': { first: 'Alex', last: 'Taylor', id: 3 },
  'Carlos F.': { first: 'Carlos', last: 'Fernandez', id: 6 },
  'Carlos V.': { first: 'Carlos', last: 'Vaca Jr', id: 7 },
  'Dave P.': { first: 'Dave', last: 'Piccolino', id: 12 },
  'Dave R.': { doNotUse: false, first: 'Dave', last: 'Reynolds', id: 13 },
  'Richard F.': { first: 'Richard', last: 'Fitch', id: 45 },
  'Richard L.': { first: 'Richard', last: 'Lopez', id: 46 },
  'Chris M.': { first: 'Matthew', last: 'Miranda', id: 9 },
  'Matthew': { first: 'Matthew', last: 'Miranda', id: 9 },
  'Erik (NY)': { first: 'Erik', last: 'Mena', id: null }, // create
  'LD': { first: 'Luis-David', last: 'Madera', id: 36 },
  'JD Walsh': { first: 'JD', last: 'Walsh', id: null }, // create special guest
  'Tito': { first: 'Tito', last: 'G.', id: null }, // create
  'Michael B.': { first: 'Michael', last: 'B', id: 84 },
  'Michael T.': { first: 'Michael', last: 'Tome', id: null }, // create
  'Dunia': { first: 'Dunia', last: 'Capdevila', id: null }, // create
  'Jacob': { first: 'Jacob', last: 'Perry', id: null }, // create
  'Audrey': { first: 'Audrey', last: 'A.', id: null }, // create
  'Arnold': { first: 'Arnold', last: 'Bustillo', id: null }, // create
  'Bryan': { first: 'Bryan', last: 'Capdevila', id: null }, // create
  'Enrique': { first: 'Enrique', last: 'SS', id: null }, // create
  'Ingrid': { first: 'Ingrid', last: 'Cast', id: null }, // create
  'Yari': { first: 'Yari', last: 'NeedLast', id: null }, // create
  'Carol': { first: 'Carol', last: 'Guest', id: null }, // create
  'Pryscila': { first: 'Pryscila', last: 'PneedLast', id: null }, // create
  'Paris': { first: 'Rebecca', last: 'Interian', id: 44 }, // Paris is Bex -> Rebecca Interian
  'Bex': { first: 'Rebecca', last: 'Interian', id: 44 }, // Rebecca Interian
  'Annette': { first: 'Anette', last: 'Sayre', id: 77 },
  'Shaun de la Cruz': { first: 'Shaun', last: 'de la Cruz', id: null },
  'Jorge Berrios': { first: 'Jorge', last: 'Berrios', id: null },
  'Sam G.': { first: 'Sam', last: 'G', id: 60 },
};

// Map single names
const singleNameDefaults = {
  'Adrian': 1,
  'Alice': 4,
  'Alvin': 70,
  'Brett': 5, // Brett Graff
  'Cat': 78,
  'Christine': 67,
  'Christoph': 56,
  'Devorah': 16,
  'Diane': 18,
  'Diana': 17,
  'Dom': 73,
  'Eduardo': 19,
  'Emanuel': 20,
  'Ferdi': 21,
  'Gigi': 23,
  'Gio': 66,
  'Heidi': 24,
  'Henry': 25,
  'Isa': 26,
  'Itzak': 80,
  'James': 27,
  'Jamie': 28,
  'Jarrett': 29,
  'Jason': 30,
  'Jeff': 61,
  'Jesus': 68,
  'Jill': 74,
  'Jocelyn': 75,
  'Joe': 31,
  'John': 105,
  'KC': 32,
  'Kim': 33,
  'Libby': 76,
  'Lili': 34,
  'Lizzie': 57,
  'Lucy': 35,
  'Maria': 37,
  'Mark': 39,
  'Markee': 40,
  'Michelle': 41,
  'Mike': 59,
  'Nacho': 69,
  'Oscar': 42,
  'Paige': 43,
  'Rebecca': 44,
  'Sammi': 49,
  'Samuel': 85,
  'Shari': 51,
  'Sofia': 52,
  'Stefany': 53,
  'Valentino': 54,
  'Vicky': 62,
  'Xavier': 87,
  'Yvette': 55,
};

// Formats map to show_types
const formatToShowType = {
  'FNL': 1,
  'BIG SHOW': 2,
  'SKETCHY BIG SHOW': 2,
  'CHEAP TRILLS': 3,
  'CHEAP CHILLS': 3,
  'FEARPROV': 11, // Special
  'IMPROVISED HORROR MOVIE': 11,
  'ENCORE': 11,
  'SKETCH': 11,
  'DALE IMPRO': 7, // Spanish
  'DEATHMATCH': 9,
  'DEATHMATCH ROYALE': 9,
};

// Crew duty standardized roles map
const crewRoleToDutyType = {
  'Tech': 1,
  'Tech / Box': 1,
  'Musical Director': 1,
  'Production Support': 1,
  'Box Office': 2,
  'Box / House': 2,
  'House Manager': 3,
  'Bar': 4,
};

// Date helper: Excel serial date to YYYY-MM-DD
function excelDateToISO(serialStr) {
  const serial = parseFloat(serialStr);
  const epoch = new Date(1899, 11, 30);
  const dt = new Date(epoch.getTime() + serial * 86400000);
  return dt.toISOString().split('T')[0];
}

// Generate the script
async function generate() {
  let nextPersonnelId = 135;
  const personToId = new Map();
  const newPersonnelRows = [];

  // 1. Resolve all 93 people
  for (const p of rawData.people) {
    const rawName = p.person_name;
    let resolvedId = null;

    if (nameMapping[rawName]) {
      const mapping = nameMapping[rawName];
      if (mapping.id) {
        resolvedId = mapping.id;
      } else {
        resolvedId = nextPersonnelId++;
        newPersonnelRows.push({
          id: resolvedId,
          first: mapping.first,
          last: mapping.last,
        });
      }
    } else if (singleNameDefaults[rawName]) {
      resolvedId = singleNameDefaults[rawName];
    } else {
      // Check if matches existing directly
      const lower = rawName.toLowerCase();
      if (existingPersonnel.has(lower)) {
        resolvedId = existingPersonnel.get(lower);
      } else {
        resolvedId = nextPersonnelId++;
        newPersonnelRows.push({
          id: resolvedId,
          first: rawName,
          last: 'Ensemble',
        });
      }
    }

    personToId.set(rawName, resolvedId);
  }

  // 2. Identify directors and assign director IDs
  // Existing directors from 10_directors.sql:
  // (1, 47 - Rick M), (2, 48 - Rick U), (3, 29 - Jarrett), (4, 17 - Diana), (5, 36 - LD),
  // (6, 3 - Alex T), (7, 34 - Lili), (8, 41 - Michelle), (9, 42 - Oscar), (10, 14 - David C),
  // (11, 38 - Marlene), (12, 9 - Matthew), (13, 49 - Sammi)
  const personnelToDirectorId = new Map([
    [47, 1], // Rick M.
    [48, 2], // Rick U.
    [29, 3], // Jarrett
    [17, 4], // Diana
    [36, 5], // LD
    [3, 6],  // Alex T.
    [34, 7], // Lili
    [41, 8], // Michelle
    [42, 9], // Oscar
    [14, 10], // David C.
    [38, 11], // Marlene
    [9, 12],  // Matthew
    [49, 13], // Sammi
  ]);

  let nextDirectorId = 14;
  const newDirectorRows = [];

  for (const s of rawData.shows) {
    const dirName = s.director_name;
    if (!dirName || dirName === 'Unassigned') continue;
    const pId = personToId.get(dirName);
    if (!pId) {
      console.warn('Unknown director name:', dirName);
      continue;
    }

    if (!personnelToDirectorId.has(pId)) {
      const dId = nextDirectorId++;
      personnelToDirectorId.set(pId, dId);
      newDirectorRows.push({ director_id: dId, personnel_id: pId });
    }
  }

  // 3. Prepare Shows, Cast, and Crew
  // Shows offset: start show_id at 100 to avoid colliding with any initial mock rows 1..3
  let nextShowId = 101;
  const excelShowIdToDbShowId = new Map();
  const showRows = [];

  for (const s of rawData.shows) {
    const dbShowId = nextShowId++;
    excelShowIdToDbShowId.set(s.show_id, dbShowId);

    const showDate = excelDateToISO(s.show_date);
    const showTime = s.day_of_week === 'Friday' ? '21:15:00' : '20:30:00';
    const showTypeId = formatToShowType[s.format] || 1;
    const dirPId = personToId.get(s.director_name);
    const directorId = dirPId && personnelToDirectorId.has(dirPId) ? personnelToDirectorId.get(dirPId) : null;
    const venue = s.production_notes?.includes('Spotlight') ? 'Spotlight Room' : 'Main Stage';
    const notes = s.production_notes ? s.production_notes.replace(/'/g, "''") : null;
    const isSpecial = ['FEARPROV', 'IMPROVISED HORROR MOVIE', 'ENCORE', 'SKETCH'].includes(s.format);

    showRows.push({
      show_id: dbShowId,
      show_date: showDate,
      show_time: showTime,
      show_type_id: showTypeId,
      director_id: directorId,
      venue,
      status: 'Completed',
      notes,
      is_special_event: isSpecial,
      program_category: s.format === 'JTF PRESENTS' ? 'jtf_presents' : 'standard',
    });
  }

  // Cast appearances
  let nextPerformanceId = 1001;
  const castRows = [];
  const assignedPerformersPerShow = new Map(); // showId -> Set(personnelId)

  // 1. Add existing cast from Excel
  for (const c of rawData.cast) {
    const dbShowId = excelShowIdToDbShowId.get(c.show_id);
    const pId = personToId.get(c.performer_name);
    if (!dbShowId || !pId) {
      console.warn('Could not map cast record:', c);
      continue;
    }
    const role = c.role_notes ? c.role_notes.replace(/'/g, "''") : 'Cast Member';
    castRows.push({
      performance_id: nextPerformanceId++,
      show_id: dbShowId,
      personnel_id: pId,
      role,
    });

    if (!assignedPerformersPerShow.has(dbShowId)) {
      assignedPerformersPerShow.set(dbShowId, new Set());
    }
    assignedPerformersPerShow.get(dbShowId).add(pId);
  }

  // 2. Directors also play in/host their shows: ensure director has on-stage performance row
  let directorsAddedCount = 0;
  for (const s of rawData.shows) {
    const dbShowId = excelShowIdToDbShowId.get(s.show_id);
    const dirName = s.director_name;
    if (!dbShowId || !dirName || dirName === 'Unassigned') continue;

    const dirPId = personToId.get(dirName);
    if (!dirPId) continue;

    const alreadyInCast = assignedPerformersPerShow.has(dbShowId) && assignedPerformersPerShow.get(dbShowId).has(dirPId);
    if (!alreadyInCast) {
      castRows.push({
        performance_id: nextPerformanceId++,
        show_id: dbShowId,
        personnel_id: dirPId,
        role: 'Director / On-Stage Player',
      });
      directorsAddedCount++;
      if (!assignedPerformersPerShow.has(dbShowId)) {
        assignedPerformersPerShow.set(dbShowId, new Set());
      }
      assignedPerformersPerShow.get(dbShowId).add(dirPId);
    }
  }

  // Crew shifts
  let nextDutyId = 1001;
  const crewRows = [];
  for (const cr of rawData.crew) {
    const dbShowId = excelShowIdToDbShowId.get(cr.show_id);
    const pId = personToId.get(cr.crew_member);
    if (!dbShowId || !pId) {
      console.warn('Could not map crew record:', cr);
      continue;
    }
    const dutyTypeId = crewRoleToDutyType[cr.standardized_role] || 1;
    crewRows.push({
      duty_id: nextDutyId++,
      show_id: dbShowId,
      personnel_id: pId,
      crew_duty_type_id: dutyTypeId,
    });
  }

  // Construct complete SQL
  let sql = `-- ==============================================================================
-- JTF HISTORICAL SHOW CASTING, CREW DUTIES, AND DIRECTORS IMPORT MIGRATION
-- Source: 'JTF Show Casting & Crew History & Database Analytics.xlsx'
-- Generated on: ${new Date().toISOString()}
-- ==============================================================================

BEGIN;

-- 0. Schema Pre-flight checks (Idempotent column additions to ensure compatibility)
ALTER TABLE IF EXISTS public.personnel 
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

ALTER TABLE IF EXISTS public.show_information 
  ADD COLUMN IF NOT EXISTS is_special_event BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS program_category VARCHAR(50) DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS workflow_profile VARCHAR(50) DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Completed';

-- 1. Ensure required show types exist (FearProv, Specials)
INSERT INTO public.show_types (show_type_id, show_type_name) VALUES
  (11, 'Special Events')
ON CONFLICT (show_type_id) DO NOTHING;

-- 2. Insert new personnel records from historical roster
INSERT INTO public.personnel (personnel_id, first_name, last_name, active) VALUES
${newPersonnelRows.map((p) => `  (${p.id}, '${p.first.replace(/'/g, "''")}', '${p.last.replace(/'/g, "''")}', true)`).join(',\n')}
ON CONFLICT (personnel_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name;

SELECT setval(pg_get_serial_sequence('public.personnel', 'personnel_id'), (SELECT MAX(personnel_id) FROM public.personnel), true);

-- 3. Insert newly discovered Directors
${newDirectorRows.length > 0 ? `INSERT INTO public.directors (director_id, personnel_id) VALUES
${newDirectorRows.map((d) => `  (${d.director_id}, ${d.personnel_id})`).join(',\n')}
ON CONFLICT (director_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.directors', 'director_id'), (SELECT MAX(director_id) FROM public.directors), true);` : '-- No new directors needed'}

-- 4. Insert 64 Historical Shows
INSERT INTO public.show_information (
  show_id, show_date, show_time, show_type_id, director_id, venue, status, notes, is_special_event, program_category
) VALUES
${showRows.map((s) => `  (${s.show_id}, '${s.show_date}', '${s.show_time}', ${s.show_type_id}, ${s.director_id !== null ? s.director_id : 'NULL'}, '${s.venue}', '${s.status}', ${s.notes ? `'${s.notes}'` : 'NULL'}, ${s.is_special_event}, '${s.program_category}')`).join(',\n')}
ON CONFLICT (show_id) DO UPDATE SET
  show_date = EXCLUDED.show_date,
  show_time = EXCLUDED.show_time,
  show_type_id = EXCLUDED.show_type_id,
  director_id = EXCLUDED.director_id,
  venue = EXCLUDED.venue,
  status = EXCLUDED.status,
  notes = EXCLUDED.notes,
  is_special_event = EXCLUDED.is_special_event,
  program_category = EXCLUDED.program_category;

SELECT setval(pg_get_serial_sequence('public.show_information', 'show_id'), (SELECT MAX(show_id) FROM public.show_information), true);

-- 5. Insert 358 Cast Performances
INSERT INTO public.show_performances (performance_id, show_id, personnel_id, role) VALUES
${castRows.map((c) => `  (${c.performance_id}, ${c.show_id}, ${c.personnel_id}, '${c.role}')`).join(',\n')}
ON CONFLICT (performance_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.show_performances', 'performance_id'), (SELECT MAX(performance_id) FROM public.show_performances), true);

-- 6. Insert 156 Crew Duty Assignments
INSERT INTO public.crew_duties (duty_id, show_id, personnel_id, crew_duty_type_id) VALUES
${crewRows.map((cr) => `  (${cr.duty_id}, ${cr.show_id}, ${cr.personnel_id}, ${cr.crew_duty_type_id})`).join(',\n')}
ON CONFLICT (duty_id) DO NOTHING;

SELECT setval(pg_get_serial_sequence('public.crew_duties', 'duty_id'), (SELECT MAX(duty_id) FROM public.crew_duties), true);

COMMIT;
`;

  const outputPath = path.resolve('migrations/20261110_import_historical_shows_and_casting.sql');
  fs.writeFileSync(outputPath, sql, 'utf8');

  console.log(`Generated migration with:`);
  console.log(`- New personnel rows: ${newPersonnelRows.length}`);
  console.log(`- New directors rows: ${newDirectorRows.length}`);
  console.log(`- Shows inserted: ${showRows.length}`);
  console.log(`- Cast performances inserted: ${castRows.length}`);
  console.log(`- Crew duties inserted: ${crewRows.length}`);
  console.log(`Saved to: ${outputPath}`);
}

generate();

