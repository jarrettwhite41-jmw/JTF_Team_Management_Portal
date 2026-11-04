import * as XLSX from 'xlsx';
import { StudentInterestLead, ClassDemandSummary } from './crmService';
import { Personnel } from '../types';

export interface ParsedStudentInterestRow {
  student_name: string;
  email: string;
  phone?: string;
  student_type: 'new_prospect' | 'returning_student' | 'former_alumni';
  class_level_id: number | null;
  level_name: string;
  preferred_days?: string;
  preferred_time?: string;
  target_cycle?: string;
  status: StudentInterestLead['status'];
  notes?: string;
  matched_personnel_id?: number | null;
  matched_personnel_name?: string | null;
  raw_code?: string;
}

/**
 * Maps standard JTF course abbreviations / column titles to class_level_id & standard level name.
 */
function mapColumnToClassLevel(
  colHeader: string,
  classDemand: ClassDemandSummary[]
): { class_level_id: number | null; level_name: string; preferred_days?: string } {
  const norm = colHeader.trim().toLowerCase();

  // Extract day hints from column names like 1Mon, 1Thu, 2Thu, 3Tue, 4Mon, 5Mon, 6Tue, HHmon, SUMon, GTue
  let preferred_days: string | undefined = undefined;
  if (/mon/i.test(norm)) preferred_days = 'Mondays';
  else if (/tue/i.test(norm)) preferred_days = 'Tuesdays';
  else if (/wed/i.test(norm)) preferred_days = 'Wednesdays';
  else if (/thu/i.test(norm)) preferred_days = 'Thursdays';
  else if (/fri/i.test(norm)) preferred_days = 'Fridays';
  else if (/sat|sa/i.test(norm)) preferred_days = 'Saturdays';
  else if (/sun/i.test(norm)) preferred_days = 'Sundays';

  // Helper finder
  const findId = (pattern: RegExp) => {
    const match = classDemand.find((c) => pattern.test(c.level_name.toLowerCase()));
    return match ? match.class_level_id : null;
  };

  // Spanish levels (Sp3, SP1, SP2, etc.)
  if (/^sp\s*3/i.test(norm) || /sp3/i.test(norm)) {
    return { class_level_id: findId(/sp3|sp 3|spanish 3/), level_name: 'SP3 (Spanish 3)', preferred_days };
  }
  if (/^sp\s*1/i.test(norm) || /sp1/i.test(norm)) {
    return { class_level_id: findId(/sp1|sp 1|spanish 1/), level_name: 'SP1 (Spanish 1)', preferred_days };
  }
  if (/^sp\s*2/i.test(norm) || /sp2/i.test(norm)) {
    return { class_level_id: findId(/sp2|sp 2|spanish 2/), level_name: 'SP2 (Spanish 2)', preferred_days };
  }

  // Musical Improv (MI)
  if (/^mi\b|^musical/i.test(norm)) {
    return { class_level_id: findId(/musical/), level_name: 'Musical', preferred_days };
  }

  // Hip Hop
  if (/hh|hip.?hop/i.test(norm)) {
    return { class_level_id: findId(/hip.?hop/), level_name: 'Hip-Hop', preferred_days };
  }

  // Shakespeare / Fakespear / Shk
  if (/shk|shake|fakespear/i.test(norm)) {
    return { class_level_id: findId(/fakespear|shake/), level_name: 'Fakespear', preferred_days };
  }

  // Sketch (SK1, Sktch, Sketch, SW)
  if (/sk|sketch|sw\b/i.test(norm)) {
    return { class_level_id: findId(/sketch/), level_name: 'Sketch', preferred_days };
  }

  // Core Improv IA1 through IA6
  if (/^1|ia1|^ia\s*1/i.test(norm)) {
    return { class_level_id: findId(/^ia1$|^ia 1$|^level 1$/), level_name: 'IA1', preferred_days };
  }
  if (/^2|ia2|^ia\s*2/i.test(norm)) {
    return { class_level_id: findId(/^ia2$|^ia 2$|^level 2$/), level_name: 'IA2', preferred_days };
  }
  if (/^3|ia3|^ia\s*3/i.test(norm)) {
    return { class_level_id: findId(/^ia3$|^ia 3$|^level 3$/), level_name: 'IA3', preferred_days };
  }
  if (/^4|ia4|^ia\s*4/i.test(norm)) {
    return { class_level_id: findId(/^ia4$|^ia 4$|^level 4$/), level_name: 'IA4', preferred_days };
  }
  if (/^5|ia5|^ia\s*5/i.test(norm)) {
    return { class_level_id: findId(/^ia5$|^ia 5$|^level 5$/), level_name: 'IA5', preferred_days };
  }
  if (/^6|ia6|^ia\s*6/i.test(norm)) {
    return { class_level_id: findId(/^ia6$|^ia 6$|^level 6$/), level_name: 'IA6', preferred_days };
  }

  // Stand Up (SU, SaSU, ST1, SUsp)
  if (/^su|^sasu|^st1/i.test(norm)) {
    return { class_level_id: null, level_name: 'Stand-Up / Specialty', preferred_days };
  }

  // Harold / Grad / Adv
  if (/harold|grad|adv/i.test(norm)) {
    return { class_level_id: findId(/ia6|ia5/), level_name: 'Advanced / Harold', preferred_days };
  }

  return { class_level_id: null, level_name: colHeader.trim(), preferred_days };
}

/**
 * Parses an ArrayBuffer of a CSV or XLSX file and extracts clean Student Interest Leads.
 */
export function parseStudentInterestSpreadsheet(
  fileBuffer: ArrayBuffer,
  classDemand: ClassDemandSummary[],
  personnelRoster: Personnel[],
  defaultTargetCycle: string = 'Current Cycle',
  existingDatabaseLeads: StudentInterestLead[] = []
): { parsedLeads: ParsedStudentInterestRow[]; skippedCount: number; duplicatesSkippedCount: number; errors: string[] } {
  const errors: string[] = [];
  const parsedLeads: ParsedStudentInterestRow[] = [];
  let skippedCount = 0;
  let duplicatesSkippedCount = 0;

  // Track unique keys across existing DB leads AND within the spreadsheet file to prevent duplicates
  // Key format: (email || student_name) + '|' + (class_level_id || level_name) + '|' + target_cycle
  const seenKeys = new Set<string>();

  for (const existing of existingDatabaseLeads) {
    const studentIdentifier = (existing.email || existing.student_name || '').trim().toLowerCase();
    const courseIdentifier = String(existing.class_level_id || existing.level_name || 'general').trim().toLowerCase();
    const cycleIdentifier = (existing.target_cycle || defaultTargetCycle).trim().toLowerCase();
    if (studentIdentifier) {
      seenKeys.add(`${studentIdentifier}|${courseIdentifier}|${cycleIdentifier}`);
    }
  }

  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      errors.push('No sheets found in the uploaded workbook.');
      return { parsedLeads, skippedCount, errors };
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convert to 2D array
    const rawData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: '' });

    if (!rawData || rawData.length < 2) {
      errors.push('Spreadsheet is empty or lacks data rows.');
      return { parsedLeads, skippedCount, errors };
    }

    const headerRow = (rawData[0] || []).map((h) => String(h || '').trim());

    // Build personnel lookup map by lowercased email and by normalized full name
    const emailToPersonnel = new Map<string, Personnel>();
    const nameToPersonnel = new Map<string, Personnel>();
    for (const p of personnelRoster) {
      if (p.PrimaryEmail) emailToPersonnel.set(p.PrimaryEmail.trim().toLowerCase(), p);
      const fullName = `${p.FirstName} ${p.LastName}`.trim().toLowerCase();
      if (fullName) nameToPersonnel.set(fullName, p);
    }

    // Identify student data rows (starting around row index 1)
    // The legacy spreadsheet has Name in column 0, Email/Contact in column 1, Notes/Payment in columns 2..5
    for (let r = 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || !Array.isArray(row) || row.length === 0) {
        skippedCount++;
        continue;
      }

      const rawName = String(row[0] || '').trim();
      const rawContact = String(row[1] || '').trim();

      // Skip non-student rows like TOTALS, headers, payment link rows, empty name
      if (
        !rawName ||
        /^totals/i.test(rawName) ||
        /^auditions/i.test(rawName) ||
        /^name$/i.test(rawName) ||
        /^https?:/i.test(rawName)
      ) {
        skippedCount++;
        continue;
      }

      // Check if contact looks like an email or phone
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawContact);
      const email = isEmail ? rawContact : '';
      const phone = !isEmail && rawContact.length > 5 ? rawContact : '';

      // Collect notes from early columns (e.g. columns 2, 3, 4, 5)
      const noteParts: string[] = [];
      for (let c = 2; c <= Math.min(6, row.length - 1); c++) {
        const val = String(row[c] || '').trim();
        if (val && !/^https?:/i.test(val) && val.length > 1) {
          noteParts.push(val);
        }
      }
      const existingNotes = noteParts.join(' • ');

      // Match against personnel directory
      let matchedPersonnel: Personnel | undefined;
      if (email && emailToPersonnel.has(email.toLowerCase())) {
        matchedPersonnel = emailToPersonnel.get(email.toLowerCase());
      } else if (nameToPersonnel.has(rawName.toLowerCase())) {
        matchedPersonnel = nameToPersonnel.get(rawName.toLowerCase());
      }

      // Determine student_type
      const student_type: ParsedStudentInterestRow['student_type'] = matchedPersonnel
        ? 'returning_student'
        : /retake|grad|alumni|previous/i.test(existingNotes)
        ? 'returning_student'
        : 'new_prospect';

      // Scan matrix columns (from column index 6 onwards) to find course interest marks
      const courseEntries: Array<{
        colName: string;
        code: string;
      }> = [];

      for (let colIdx = 6; colIdx < row.length; colIdx++) {
        const cellVal = String(row[colIdx] || '').trim();
        const colTitle = headerRow[colIdx] || '';
        if (!colTitle || !cellVal) continue;

        // Marks: '1' (wants class), '?' (considering), 'G' (graduated/ready for next), 'M' (makeup), 'F' (future)
        if (['1', '?', 'g', 'm', 'f', 'paid'].includes(cellVal.toLowerCase()) || cellVal === '1') {
          courseEntries.push({ colName: colTitle, code: cellVal.toUpperCase() });
        }
      }

      // If specific course columns were marked, generate an interest lead for each active interest
      if (courseEntries.length > 0) {
        for (const entry of courseEntries) {
          const mapping = mapColumnToClassLevel(entry.colName, classDemand);

          // Deduplication Check
          const studentIdentifier = (email || rawName).trim().toLowerCase();
          const courseIdentifier = String(mapping.class_level_id || mapping.level_name || 'general').trim().toLowerCase();
          const cycleIdentifier = defaultTargetCycle.trim().toLowerCase();
          const dedupKey = `${studentIdentifier}|${courseIdentifier}|${cycleIdentifier}`;

          if (seenKeys.has(dedupKey)) {
            duplicatesSkippedCount++;
            continue;
          }
          seenKeys.add(dedupKey);

          let status: StudentInterestLead['status'] = 'inquired';
          if (entry.code === 'PAID') status = 'enrolled';
          else if (entry.code === 'G') status = 'contacted';
          else if (entry.code === '?') status = 'follow_up_needed';

          const leadNote = [
            `Imported from spreadsheet (${entry.colName}: [${entry.code}])`,
            existingNotes,
          ]
            .filter(Boolean)
            .join(' | ');

          parsedLeads.push({
            student_name: rawName,
            email,
            phone,
            student_type,
            class_level_id: mapping.class_level_id,
            level_name: mapping.level_name,
            preferred_days: mapping.preferred_days,
            preferred_time: '7:30 PM - 10:00 PM',
            target_cycle: defaultTargetCycle,
            status,
            notes: leadNote,
            matched_personnel_id: matchedPersonnel?.PersonnelID || null,
            matched_personnel_name: matchedPersonnel
              ? `${matchedPersonnel.FirstName} ${matchedPersonnel.LastName}`.trim()
              : null,
            raw_code: entry.code,
          });
        }
      } else {
        // No matrix columns checked, but has student row with notes / interest
        const studentIdentifier = (email || rawName).trim().toLowerCase();
        const courseIdentifier = 'general';
        const cycleIdentifier = defaultTargetCycle.trim().toLowerCase();
        const dedupKey = `${studentIdentifier}|${courseIdentifier}|${cycleIdentifier}`;

        if (seenKeys.has(dedupKey)) {
          duplicatesSkippedCount++;
        } else {
          seenKeys.add(dedupKey);
          parsedLeads.push({
            student_name: rawName,
            email,
            phone,
            student_type,
            class_level_id: null,
            level_name: 'General Inquiry',
            preferred_days: 'Flexible',
            preferred_time: 'Evenings',
            target_cycle: defaultTargetCycle,
            status: 'inquired',
            notes: existingNotes ? `Imported notes: ${existingNotes}` : 'Imported general lead',
            matched_personnel_id: matchedPersonnel?.PersonnelID || null,
            matched_personnel_name: matchedPersonnel
              ? `${matchedPersonnel.FirstName} ${matchedPersonnel.LastName}`.trim()
              : null,
            raw_code: '-',
          });
        }
      }
    }
  } catch (err: any) {
    errors.push(err?.message || 'Error parsing spreadsheet.');
  }

  return { parsedLeads, skippedCount, duplicatesSkippedCount, errors };
}
