# Testing Student Data Functions

## Quick Test Guide

Use this checklist to validate student data reads/writes in the Supabase-backed portal.

### 1. Local App Validation

Run the app and baseline checks:

```bash
npm install
npm run type-check
npm run build
npm run dev
```

Open the app and validate the Students flow in-browser.

### 2. Verify Supabase Table Data

In Supabase SQL Editor, confirm required rows exist:

```sql
select count(*) from student_info;
select count(*) from student_enrollments;
select count(*) from personnel;
```

### 3. Validate Student Directory Behavior

1. Open Students tab.
2. Confirm student cards load.
3. Confirm each student displays:
   - Email from `personnel.primary_email`
   - Phone from `personnel.primary_phone`
   - Enrollment counts
   - Current level details

### 4. Validate Student Profile Behavior

1. Open any student profile.
2. Confirm profile includes:
   - Base student details from `student_info`
   - Contact details from `personnel`
   - Enrollment history from `student_enrollments` + offering details
   - Progression history where available

### 5. Common Issues & Fixes

- Empty students list: verify RLS policies permit your authenticated role to read `student_info` and joined tables.
- Missing email/phone: verify related `personnel` record exists and foreign keys are valid.
- Zero enrollment counts: verify `student_enrollments.student_id` references existing students.

### 6. Expected Data Flow

```text
Students page loads
  -> supabaseService.getAllStudentsWithDetails()
  -> student_info + personnel + student_enrollments + class_level_progression + class_levels
  -> normalized response
  -> StudentDirectory UI renders cards and counts
```

## Next Steps

1. Validate role-scoped access with a non-admin portal user.
2. Add regression tests for student directory and profile queries.
3. Re-run smoke tests after every migration touching student tables.
