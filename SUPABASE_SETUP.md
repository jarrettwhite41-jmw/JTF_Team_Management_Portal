# Supabase & Vercel Migration Guide

This guide walks you through migrating from Google Apps Script to Supabase + Vercel.

## Phase 1: Supabase Setup

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign in with GitHub or create an account
3. Click "New Project"
4. Configure:
   - **Name**: JTF Team Management Portal
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
5. Wait 2-3 minutes for the project to initialize

### 2. Get Your Credentials

Once your project is created:

1. Go to **Settings** → **API**
2. Copy these values:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Anon Public Key** → `VITE_SUPABASE_ANON_KEY`
3. Open `.env.local` in your project and paste:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

### 3. Create the Database Schema

1. In Supabase console, go to **SQL Editor**
2. Click **New Query**
3. Open the file `supabase-schema.sql` in your project
4. Copy all the SQL code
5. Paste into the Supabase SQL editor
6. Click **Run**
7. ✅ All tables are now created!

### 4. Add Sample Data (Optional but Recommended)

1. Still in SQL Editor, create a new query
2. Paste the following to add reference data:

```sql
-- Add Show Types
INSERT INTO show_types (show_type_name) VALUES
  ('Mainstage Show'),
  ('Sketch Comedy'),
  ('Improv Harold'),
  ('Workshop');

-- Add Class Levels
INSERT INTO class_levels (level_name, description) VALUES
  ('Beginner', 'Introduction to Improv - Level 101'),
  ('Intermediate', 'Building Improv Skills - Level 201'),
  ('Advanced', 'Advanced Improv Techniques - Level 301'),
  ('Master', 'Teaching-level Improv - Master Class');

-- Add Crew Duty Types
INSERT INTO crew_duty_types (duty_name) VALUES
  ('Stage Manager'),
  ('Lighting Tech'),
  ('Sound Tech'),
  ('Props Manager'),
  ('Front of House'),
  ('Director');

-- Add Rooms
INSERT INTO rooms (room_name) VALUES
  ('Studio A'),
  ('Studio B'),
  ('Main Stage'),
  ('Green Room'),
  ('Virtual Space');

-- Add Inventory Categories
INSERT INTO inventory_categories (category_name) VALUES
  ('Audio Equipment'),
  ('Props'),
  ('Lighting'),
  ('Sound'),
  ('Office Supplies'),
  ('Costumes');

-- Add Storage Locations
INSERT INTO storage_locations (location_name) VALUES
  ('Storage Room A'),
  ('Storage Room B'),
  ('Props Room'),
  ('Equipment Closet'),
  ('Main Office');

-- Add Skill Categories
INSERT INTO skill_categories (category_name, description) VALUES
  ('Fundamentals', 'Core improv skills'),
  ('Physicality', 'Physical performance skills'),
  ('Character Work', 'Character creation and development'),
  ('Listening', 'Active listening and response skills'),
  ('Teaching', 'Ability to teach improv');
```

3. Click **Run**
4. ✅ Reference data is populated!

## Phase 2: Install Dependencies

1. Open terminal in your project directory
2. Run:
   ```bash
   npm install
   ```

This installs all new dependencies including Supabase SDK.

## Phase 3: Update Your App to Use Supabase

The service file has already been created at `services/supabaseService.ts`.

To update any React component to use Supabase:

### Before (Google Apps Script):
```typescript
import { googleAppsScriptService } from '../services/googleAppsScript';

const result = await googleAppsScriptService.getAllPersonnel();
```

### After (Supabase):
```typescript
import { supabaseService } from '../services/supabaseService';

const result = await supabaseService.getAllPersonnel();
```

**The method signatures are identical!** Just swap the service and everything works.

### Update a Component Example

[PersonnelDirectory.tsx](../pages/PersonnelDirectory.tsx):

```typescript
import { supabaseService } from '../services/supabaseService';

export const PersonnelDirectory = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPersonnel = async () => {
      const response = await supabaseService.getAllPersonnel();
      if (response.success) {
        setPersonnel(response.data);
      }
      setLoading(false);
    };

    fetchPersonnel();
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      {personnel.map(person => (
        <PersonCard key={person.PersonnelID} person={person} />
      ))}
    </div>
  );
};
```

## Phase 4: Test Locally

1. Run:
   ```bash
   npm run dev
   ```

2. Open `http://localhost:3000`

3. Test key features:
   - [ ] Personnel directory loads
   - [ ] Shows list displays
   - [ ] Classes display
   - [ ] Can create/edit data

## Phase 5: Deploy to Vercel

### 5.1 Connect Your GitHub Repo

1. Push your code to GitHub (if not already):
   ```bash
   git add .
   git commit -m "Migration: Google Apps Script → Supabase + Vercel"
   git push origin feature/qol-improvements
   ```

2. Go to [vercel.com](https://vercel.com)
3. Sign in with GitHub
4. Click **Add New...** → **Project**
5. Import your GitHub repository
6. Select the folder: `JTF_Team_Management_Portal`

### 5.2 Add Environment Variables

In Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add:
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: `https://your-project.supabase.co`
   - **Environments**: Production, Preview, Development
3. Add:
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: `your-anon-key-here`
   - **Environments**: Production, Preview, Development

### 5.3 Deploy

1. Click **Deploy**
2. Wait for build to complete (usually 2-3 minutes)
3. ✅ Your app is live!
4. Get your Vercel URL: `https://your-app.vercel.app`

## Phase 6: Migrate Your Data (Coming Soon)

Once everything is working, we'll:
1. Export data from Google Sheets
2. Transform to Supabase format
3. Import into your new database

## Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
npm install @supabase/supabase-js
```

### "Supabase credentials not configured"
- Check `.env.local` has both variables
- Restart dev server: `npm run dev`

### "Connection refused" errors
- Verify `VITE_SUPABASE_URL` is correct (should be `https://...`)
- Check `VITE_SUPABASE_ANON_KEY` is not blank

### "Table does not exist"
- Go back to Phase 1, Step 3
- Ensure SQL schema was fully executed
- Check all tables in Supabase SQL Editor: `SELECT table_name FROM information_schema.tables;`

### Vercel deployment fails
- Check build logs in Vercel dashboard
- Ensure `.env.local` is in `.gitignore` (secrets shouldn't be in git)
- Verify environment variables are set in Vercel

## Next Steps

1. ✅ Update all components to use `supabaseService` instead of `googleAppsScriptService`
2. ✅ Test each page thoroughly
3. ✅ Migrate historical data from Google Sheets
4. ✅ Set up authentication (Supabase Auth)
5. ✅ Add row-level security (RLS) policies

Need help? Let me know!

## Team Portal Credential Provisioning (Initial Password)

The Team portal now includes a secure onboarding action that can:
- create or update a Supabase Auth user with a temporary password,
- map that user to `portal_user_access`, and
- reset credentials to a default admin-defined password for Team and Instructor access.

### Deploy the Edge Function

From this project directory:

```bash
supabase functions deploy provision-portal-user
```

### Supabase Secrets (Edge Function)

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are normally available automatically in Supabase Edge Functions.

You must set this custom secret for default password resets:

```bash
supabase secrets set PORTAL_DEFAULT_TEMP_PASSWORD=YOUR_DEFAULT_TEMP_PASSWORD
```

Only set them manually if you need to override defaults:

```bash
supabase secrets set SUPABASE_URL=https://YOUR_PROJECT.supabase.co
supabase secrets set SUPABASE_ANON_KEY=YOUR_ANON_KEY
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

### Required Frontend Env Vars (Redirects)

Add these to `.env.local` and your Vercel environment settings:

```bash
VITE_TEAM_PORTAL_URL=https://jtf-team-management-portal.vercel.app
VITE_INSTRUCTOR_PORTAL_URL=https://YOUR-INSTRUCTOR-PORTAL.vercel.app
VITE_DIRECTOR_PORTAL_URL=https://YOUR-DIRECTOR-PORTAL.vercel.app
VITE_CAST_PORTAL_URL=https://YOUR-CAST-PORTAL.vercel.app
VITE_STUDENT_PORTAL_URL=https://YOUR-STUDENT-PORTAL.vercel.app
```

### Use in Team Portal

In **Portal Access**:
- **Reset to Default**: resets the auth password to `PORTAL_DEFAULT_TEMP_PASSWORD` for Team and Instructor portal rows for that email.
