# Component Conversion Quick Reference

This shows how to update components from Google Apps Script to Supabase.

## Quick Pattern

**OLD (Google Apps Script):**
```typescript
import { googleAppsScriptService } from '../services/googleAppsScript';

const response = await googleAppsScriptService.getAllPersonnel();
```

**NEW (Supabase):**
```typescript
import { supabaseService } from '../services/supabaseService';

const response = await supabaseService.getAllPersonnel();
```

✅ **Everything else stays the same!** Same method names, same return types.

---

## Full Component Example

### PersonnelDirectory.tsx

<details>
<summary>BEFORE (Google Apps Script)</summary>

```typescript
import React, { useEffect, useState } from 'react';
import { Personnel } from '../types';
import { googleAppsScriptService } from '../services/googleAppsScript';
import { PersonCard } from '../components/personnel/PersonCard';
import { Loader } from '../components/common/Loader';

export const PersonnelDirectory: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        const response = await googleAppsScriptService.getAllPersonnel();
        if (response.success) {
          setPersonnel(response.data);
        } else {
          setError(response.error || 'Failed to load personnel');
        }
      } catch (err) {
        setError('Error loading personnel');
      } finally {
        setLoading(false);
      }
    };

    loadPersonnel();
  }, []);

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {personnel.map(person => (
        <PersonCard key={person.PersonnelID} person={person} />
      ))}
    </div>
  );
};
```

</details>

<details>
<summary>AFTER (Supabase)</summary>

```typescript
import React, { useEffect, useState } from 'react';
import { Personnel } from '../types';
import { supabaseService } from '../services/supabaseService';  // ← ONLY CHANGE
import { PersonCard } from '../components/personnel/PersonCard';
import { Loader } from '../components/common/Loader';

export const PersonnelDirectory: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPersonnel = async () => {
      try {
        const response = await supabaseService.getAllPersonnel();  // ← ONLY CHANGE
        if (response.success) {
          setPersonnel(response.data);
        } else {
          setError(response.error || 'Failed to load personnel');
        }
      } catch (err) {
        setError('Error loading personnel');
      } finally {
        setLoading(false);
      }
    };

    loadPersonnel();
  }, []);

  if (loading) return <Loader />;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {personnel.map(person => (
        <PersonCard key={person.PersonnelID} person={person} />
      ))}
    </div>
  );
};
```

</details>

---

## All Available Methods

### Personnel
- `getAllPersonnel()` → Personnel[]
- `getPersonnelById(id)` → Personnel
- `createPersonnel(data)` → Personnel
- `updatePersonnel(id, data)` → Personnel
- `deletePersonnel(id)` → { deleted: boolean }

### Shows
- `getAllShows()` → ShowInformation[]
- `getShowsWithDetails()` → ShowWithDetails[]
- `createShow(data)` → ShowInformation
- `updateShow(id, data)` → ShowInformation
- `addPersonAsCastMember(id)` → CastMemberWithDetails
- `removeCastMember(id)` → { deleted: boolean }

### Classes
- `getAllClasses()` → ClassOfferings[]
- `createClassOffering(data)` → ClassOfferings
- `updateClassOffering(id, data)` → ClassOfferings

### Crew
- `getAllCrewMembers()` → CrewMemberWithDetails[]
- `addPersonAsCrewMember(id, showId, dutyTypeId)` → CrewMemberWithDetails
- `removeCrewMember(id)` → { deleted: boolean }

### Bartenders
- `getBartendersWithDetails()` → BartenderWithDetails[]
- `addPersonAsBartender(id, trained, status)` → BartenderWithDetails
- `removeBartender(id)` → { deleted: boolean }

### Reference Data
- `getAllShowTypes()` → ShowTypes[]
- `getAllClassLevels()` → ClassLevels[]
- `getAllCrewDutyTypes()` → CrewDutyTypes[]
- `getAllRooms()` → Room[]
- `getAllInventory()` → Inventory[]

### Dashboard
- `getDashboardStats()` → DashboardStats
- `updateStudentStatus(id, status)` → { success: boolean }
- `updateStudentLevel(id, levelId)` → { success: boolean }

### Student & Enrollment
- `getStudentNotesForStudent(id)` → Note[]
- `getSkillRatingsForEnrollment(id)` → Rating[]
- `getSkillsWithCategories()` → Skill[]

---

## Error Handling

All methods return `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

Usage:
```typescript
const response = await supabaseService.getAllPersonnel();

if (response.success) {
  // Use response.data
} else {
  console.error(response.error);
}
```

---

## Data Structure Differences

The **types** are the same, but internally Supabase uses snake_case. Don't worry - the service automatically converts for you!

**Examples:**
- Database: `personnel_id` → Your app: `PersonnelID` ✅
- Database: `first_name` → Your app: `FirstName` ✅
- Database: `created_at` → Your app: `created_at` ✅

---

## Components to Update

Priority order:
1. **Dashboard.tsx** - highest impact
2. **PersonnelDirectory.tsx** 
3. **Classes.tsx**
4. **Shows.tsx**
5. **StudentDirectory.tsx**
6. All other pages

Each takes ~2 minutes to update!

---

## Testing After Update

1. Import the page in App.tsx
2. Open that page in browser
3. Check browser console for errors
4. Verify data displays
5. Try creating/editing/deleting

That's it! 🎉
