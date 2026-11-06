/**
 * Generates and triggers browser printing for a Day 1 Class Sign-In Sheet.
 */

export interface SignInSheetClassInfo {
  OfferingID: number | string;
  LevelName?: string;
  ClassLevelID?: number | string;
  TeacherName?: string;
  StartDate?: string;
  EndDate?: string;
  RoomName?: string;
  VenueOrRoom?: string;
  MeetingDays?: string;
  MeetingTime?: string;
  MaxStudents?: number;
  EnrolledCount?: number;
}

export interface EnrolledStudentInfo {
  StudentID?: number | string;
  FirstName?: string;
  LastName?: string;
  PrimaryEmail?: string;
  PrimaryPhone?: string;
  WelcomePackageSigned?: boolean;
}

export function printFirstDaySignInSheet(
  classOffering: SignInSheetClassInfo,
  students: EnrolledStudentInfo[]
) {
  const className = classOffering.LevelName || `Level ${classOffering.ClassLevelID || ''}`;
  const instructor = classOffering.TeacherName || 'TBA';
  const room = classOffering.RoomName || classOffering.VenueOrRoom || 'JTF Theater / Studio';
  
  // Format Date
  let dateStr = 'Day 1';
  if (classOffering.StartDate) {
    try {
      const raw = String(classOffering.StartDate).slice(0, 10);
      const d = /^\d{4}-\d{2}-\d{2}$/.test(raw)
        ? new Date(Number(raw.slice(0, 4)), Number(raw.slice(5, 7)) - 1, Number(raw.slice(8, 10)))
        : new Date(classOffering.StartDate);
      dateStr = d.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      dateStr = String(classOffering.StartDate);
    }
  }

  // Sort students alphabetically by last name, then first name
  const sorted = [...students].sort((a, b) => {
    const lastA = (a.LastName || '').toLowerCase();
    const lastB = (b.LastName || '').toLowerCase();
    if (lastA !== lastB) return lastA.localeCompare(lastB);
    return (a.FirstName || '').toLowerCase().localeCompare((b.FirstName || '').toLowerCase());
  });

  // Target minimum 16 rows or actual student count + 4 blank rows for walk-ins
  const totalRows = Math.max(16, sorted.length + 4);

  const studentRowsHtml = Array.from({ length: totalRows }).map((_, idx) => {
    const student = sorted[idx];
    const name = student ? `${student.LastName || ''}, ${student.FirstName || ''}`.trim().replace(/^,\s*/, '') : '';
    const phone = student?.PrimaryPhone || '';
    const email = student?.PrimaryEmail || '';
    const signedStatus = student?.WelcomePackageSigned ? '✓ Signed' : '';

    return `
      <tr>
        <td style="text-align: center; font-weight: bold; width: 32px; color: #475569;">${idx + 1}</td>
        <td style="font-weight: 600; width: 220px; font-size: 13px;">${name}</td>
        <td style="width: 140px; font-size: 12px; color: #334155;">${phone}</td>
        <td style="width: 200px; font-size: 12px; color: #334155; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${email}</td>
        <td style="width: 80px; text-align: center; font-size: 11px; font-weight: 600; color: ${student?.WelcomePackageSigned ? '#16a34a' : '#94a3b8'};">
          ${signedStatus}
        </td>
        <td style="width: 180px; border-bottom: 1.5px solid #0f172a;"></td>
      </tr>
    `;
  }).join('');

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Day 1 Sign-In: ${className}</title>
      <style>
        @page {
          size: letter portrait;
          margin: 0.45in 0.45in 0.45in 0.45in;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          color: #0f172a;
          margin: 0;
          padding: 0;
          font-size: 12px;
          line-height: 1.3;
        }
        .header {
          border-bottom: 2px solid #0f172a;
          padding-bottom: 10px;
          margin-bottom: 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }
        .title-block h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.5px;
          color: #0f172a;
        }
        .title-block h2 {
          margin: 3px 0 0 0;
          font-size: 14px;
          font-weight: 700;
          color: #1e3a8a;
        }
        .meta-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: #f8fafc;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 8px 12px;
          margin-bottom: 14px;
          gap: 8px;
        }
        .meta-item {
          font-size: 12px;
        }
        .meta-label {
          font-weight: 700;
          color: #475569;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .meta-val {
          font-weight: 600;
          color: #0f172a;
          margin-top: 1px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        th {
          background: #0f172a;
          color: #ffffff;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 7px 6px;
          border: 1px solid #0f172a;
          text-align: left;
        }
        td {
          padding: 7px 6px;
          border: 1px solid #cbd5e1;
          height: 24px;
          vertical-align: middle;
        }
        tr:nth-child(even) {
          background-color: #f8fafc;
        }
        .footer {
          margin-top: 14px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #64748b;
          border-top: 1px dashed #cbd5e1;
          padding-top: 8px;
        }
        .instructions {
          font-size: 11px;
          color: #334155;
          margin-bottom: 10px;
          font-style: italic;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title-block">
          <h1>JUST THE FUNNY IMPROV & THEATER</h1>
          <h2>FIRST DAY CLASS SIGN-IN ROSTER</h2>
        </div>
        <div style="text-align: right; font-size: 11px; color: #475569;">
          <strong>Official Roster</strong><br />
          ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      <div class="meta-grid">
        <div class="meta-item">
          <div class="meta-label">Class / Level</div>
          <div class="meta-val">${className}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Instructor</div>
          <div class="meta-val">${instructor}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Start Date (Day 1)</div>
          <div class="meta-val">${dateStr}</div>
        </div>
        <div class="meta-item">
          <div class="meta-label">Room / Stage</div>
          <div class="meta-val">${room}</div>
        </div>
      </div>

      <div class="instructions">
        <strong>Instructor Note:</strong> Please have every attendee verify their phone/email and sign on the line below. Extra blank rows at bottom are for walk-in additions.
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 32px; text-align: center;">#</th>
            <th style="width: 220px;">Student Name (Last, First)</th>
            <th style="width: 140px;">Phone Number</th>
            <th style="width: 200px;">Email Address</th>
            <th style="width: 80px; text-align: center;">Waiver</th>
            <th style="width: 180px;">Day 1 Signature</th>
          </tr>
        </thead>
        <tbody>
          ${studentRowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div><strong>Total Enrolled:</strong> ${students.length} students &bull; Return completed sheet to Operations / Education Desk</div>
        <div>Just The Funny Training Center &bull; classes@justthefunny.com</div>
      </div>

      <script>
        window.onload = function() {
          window.focus();
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.open();
    printWindow.document.write(printHtml);
    printWindow.document.close();
  }
}
