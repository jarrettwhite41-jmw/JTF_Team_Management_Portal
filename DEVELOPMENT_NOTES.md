# Development Notes & Workflow

## Critical Runtime Model

This portal runs as a Vite + React + TypeScript web app deployed on Vercel.
All application data reads and writes must go through Supabase-backed services.

Primary service: `services/supabaseService.ts`

## Workflow for Making Changes

### 1. Frontend Changes
- Edit `.tsx` files in `pages/` and `components/`.
- Keep interactions typed and use existing `ApiResponse<T>` patterns.

### 2. Data/Backend Changes
- Update methods in `services/supabaseService.ts`.
- Add migrations under `migrations/` for schema or RLS changes.

### 3. Validation
```bash
npm run type-check
npm run build
```

### 4. Deployment
- Preview in Vercel using the branch/PR deployment.
- Promote after role-based smoke tests pass.

## Data Modeling Notes

Class and enrollment joins remain:
```text
class_offerings.teacher_id -> teachers.teacher_id
teachers.personnel_id -> personnel.personnel_id

student_enrollments.student_id -> student_info.student_id
student_info.personnel_id -> personnel.personnel_id
```

## Service Expectations

- Return human-readable errors from service methods.
- Do not bypass service layer by querying Supabase directly in page components.
- Treat role checks as policy-first. UI checks are additive only.

## Current Delivery Mode

Portal changes are executed one portal at a time with branch-isolated fixes and regression gates before merge.
