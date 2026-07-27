# Class Modal Parity Regression Checklist

Use this checklist after any changes to Team class management features.

## Preconditions

- Team portal runs locally with valid Supabase env vars or Apps Script backend configured.
- At least one class offering exists with 2+ enrolled students.
- At least one skill exists for the class level.

## Smoke

1. Open Class Management page.
2. Click a class card.
3. Verify modal opens with tabs:
   - Class Roster
   - Attendance
   - Skills
   - Notes
   - Enrolled Students
   - Add Students
4. Verify no console errors on initial open.

## Roster

1. In Class Roster tab, verify active roster count in tab label is correct.
2. Change a student status to Completed.
3. Verify success message appears.
4. Close and reopen modal.
5. Verify status persists.

## Enrolled Students

1. Switch to Enrolled Students tab.
2. Verify non-admin enrollments are shown.
3. Remove one student.
4. Verify success message appears and row disappears.
5. Verify class card enrollment count updates after modal close.

## Add Students

1. Switch to Add Students tab.
2. Select multiple students.
3. Click Add Selected.
4. Verify success message and roster counts update.
5. Reopen modal and verify added students persisted.

## Attendance

1. Switch to Attendance tab.
2. Pick today as Session Date.
3. Mark first student Present, second student Late.
4. Verify each student row shows Marked state.
5. Verify Student Attendance Summary updates.
6. Verify Overall Class Attendance by Day includes selected date.
7. Close and reopen modal.
8. Verify selected date marks persisted.
9. On mobile width, verify card-style attendance summary appears.

## Skills

1. If class status is In Progress:
   - Select a student.
   - Click + Rate.
   - Choose a skill and save rating 4.
   - Verify rating pill updates.
   - Reopen modal and verify rating persists.
2. If class status is not In Progress:
   - Verify edit-disabled informational message is displayed.

## Notes

1. If class status is In Progress:
   - Add a Session Note for selected date.
   - Verify note appears in list for that date.
   - Add a Student Progress Note for one student.
   - Verify note appears under that student.
   - Reopen modal and verify both notes persist.
2. If class status is not In Progress:
   - Verify edit-disabled informational message is displayed.

## Cross-Backend Contract

1. Run with Supabase backend.
2. Repeat Smoke + Attendance + Skills + Notes sections.
3. Run with Apps Script backend.
4. Repeat Smoke + Attendance + Skills + Notes sections.
5. Verify both backends support same UI flows without crashes.

## Final Validation

1. Run build command: npm run build
2. Confirm build succeeds.
3. Confirm no new TypeScript errors in edited files.
