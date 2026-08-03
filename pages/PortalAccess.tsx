import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { Personnel, PortalAccessRole, PortalName, PortalUserAccess } from '../types';
import { supabaseService } from '../services/supabaseService';

const PORTAL_OPTIONS: Array<{ value: PortalName; label: string }> = [
  { value: 'team', label: 'Team Portal' },
  { value: 'instructor', label: 'Instructor Portal' },
  { value: 'director', label: 'Director Portal' },
  { value: 'cast', label: 'Cast Portal' },
  { value: 'student', label: 'Student Portal' },
  { value: 'crew', label: 'Crew Portal' },
];

const DEFAULT_ROLE_BY_PORTAL: Record<PortalName, PortalAccessRole> = {
  instructor: 'teacher',
  team: 'manager',
  director: 'director',
  cast: 'cast',
  student: 'student',
  crew: 'crew',
};

const ROLE_LABELS: Record<PortalAccessRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  director: 'Director',
  teacher: 'Teacher',
  cast: 'Cast',
  student: 'Student',
  crew: 'Crew',
};

type AccessStateFilter = 'all' | 'has' | 'none' | 'active' | 'inactive';

interface PersonAccessRow {
  Key: string;
  PersonnelID: number | null;
  FullName: string;
  Email: string;
  AccessRows: PortalUserAccess[];
  AccessByPortal: Partial<Record<PortalName, PortalUserAccess>>;
}

export const PortalAccess: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [accessRows, setAccessRows] = useState<PortalUserAccess[]>([]);
  const [rolePersonnelIds, setRolePersonnelIds] = useState<Record<'cast' | 'instructor' | 'director' | 'student' | 'crew', Set<number>>>({
    cast: new Set<number>(),
    instructor: new Set<number>(),
    director: new Set<number>(),
    student: new Set<number>(),
    crew: new Set<number>(),
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [portalFilter, setPortalFilter] = useState<'all' | PortalName>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | PortalAccessRole>('all');
  const [accessStateFilter, setAccessStateFilter] = useState<AccessStateFilter>('all');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provisioningEmail, setProvisioningEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [manualPortalName, setManualPortalName] = useState<PortalName>('instructor');
  const [manualPortalRole, setManualPortalRole] = useState<PortalAccessRole>(DEFAULT_ROLE_BY_PORTAL.instructor);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [personnelRes, accessRes, castRes, teacherRes, directorRes, studentRes, bartendersRes] = await Promise.all([
        supabaseService.getAllPersonnel(),
        supabaseService.getPortalUserAccess(),
        supabaseService.getAllCastMembers(),
        supabaseService.getAllTeachers(),
        supabaseService.getAllDirectors(),
        supabaseService.getAllStudentsWithDetails(),
        supabaseService.getBartendersWithDetails(),
      ]);

      if (personnelRes.success && personnelRes.data) {
        setPersonnel(personnelRes.data);
      } else {
        setMessage({ type: 'error', text: personnelRes.error || 'Failed to load personnel.' });
      }

      if (accessRes.success && accessRes.data) {
        setAccessRows(accessRes.data);
      } else {
        setMessage({ type: 'error', text: accessRes.error || 'Failed to load portal access assignments.' });
      }

      const castIds = new Set<number>();
      const teacherIds = new Set<number>();
      const directorIds = new Set<number>();
      const studentIds = new Set<number>();
      const crewIds = new Set<number>();

      if (castRes.success && castRes.data?.data) {
        castRes.data.data.forEach((row: any) => {
          const id = Number(row.PersonnelID);
          if (Number.isFinite(id) && id > 0) castIds.add(id);
        });
      }

      if (teacherRes.success && teacherRes.data) {
        teacherRes.data.forEach((row: any) => {
          const id = Number(row.PersonnelID);
          if (Number.isFinite(id) && id > 0) teacherIds.add(id);
        });
      }

      if (directorRes.success && directorRes.data) {
        directorRes.data.forEach((row: any) => {
          const id = Number(row.PersonnelID);
          if (Number.isFinite(id) && id > 0) directorIds.add(id);
        });
      }

      if (studentRes.success && studentRes.data) {
        studentRes.data.forEach((row: any) => {
          const id = Number(row.PersonnelID);
          if (Number.isFinite(id) && id > 0) studentIds.add(id);
        });
      }

      if (bartendersRes.success && bartendersRes.data) {
        bartendersRes.data.forEach((row: any) => {
          const id = Number(row.PersonnelID);
          if (Number.isFinite(id) && id > 0) crewIds.add(id);
        });
      }

      setRolePersonnelIds({
        cast: castIds,
        instructor: teacherIds,
        director: directorIds,
        student: studentIds,
        crew: crewIds,
      });
    } catch {
      setMessage({ type: 'error', text: 'Unexpected error while loading portal access.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const personnelById = useMemo(() => {
    const map = new Map<number, Personnel>();
    personnel.forEach((p) => map.set(p.PersonnelID, p));
    return map;
  }, [personnel]);

  const personnelByEmail = useMemo(() => {
    const map = new Map<string, Personnel>();
    personnel.forEach((p) => {
      const email = (p.PrimaryEmail || '').trim().toLowerCase();
      if (email) map.set(email, p);
    });
    return map;
  }, [personnel]);

  const sortedPersonnel = useMemo(() => {
    return [...personnel].sort((a, b) => {
      const aName = `${a.LastName || ''} ${a.FirstName || ''}`.trim().toLowerCase();
      const bName = `${b.LastName || ''} ${b.FirstName || ''}`.trim().toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [personnel]);

  const filteredPersonnel = useMemo(() => {
    const query = personnelSearchTerm.trim().toLowerCase();
    if (!query) return sortedPersonnel;

    return sortedPersonnel.filter((person) => {
      const fullName = `${person.FirstName || ''} ${person.LastName || ''}`.trim().toLowerCase();
      const reverseName = `${person.LastName || ''}, ${person.FirstName || ''}`.trim().toLowerCase();
      const email = (person.PrimaryEmail || '').toLowerCase();
      return fullName.includes(query) || reverseName.includes(query) || email.includes(query);
    });
  }, [sortedPersonnel, personnelSearchTerm]);

  const personRows = useMemo(() => {
    const rowsByKey = new Map<string, PersonAccessRow>();

    const upsertRow = (key: string, partial: Omit<PersonAccessRow, 'AccessRows' | 'AccessByPortal'>) => {
      if (!rowsByKey.has(key)) {
        rowsByKey.set(key, {
          ...partial,
          AccessRows: [],
          AccessByPortal: {},
        });
      }
      return rowsByKey.get(key)!;
    };

    personnel.forEach((p) => {
      const email = (p.PrimaryEmail || '').trim().toLowerCase();
      const fullName = `${p.FirstName || ''} ${p.LastName || ''}`.trim() || 'Unknown';
      const key = `pid:${p.PersonnelID}`;
      upsertRow(key, {
        Key: key,
        PersonnelID: p.PersonnelID,
        FullName: fullName,
        Email: email,
      });
    });

    accessRows.forEach((row) => {
      const email = (row.LoginEmail || '').trim().toLowerCase();
      const personnelId = row.PersonnelID ?? null;
      const matchedPersonnel = personnelId ? personnelById.get(personnelId) : undefined;
      const matchedByEmail = !matchedPersonnel && email ? personnelByEmail.get(email) : undefined;
      const resolvedPersonnel = matchedPersonnel || matchedByEmail;

      const key = resolvedPersonnel
        ? `pid:${resolvedPersonnel.PersonnelID}`
        : (email ? `email:${email}` : `access:${row.AccessID}`);

      const fullName = resolvedPersonnel
        ? `${resolvedPersonnel.FirstName || ''} ${resolvedPersonnel.LastName || ''}`.trim() || 'Unknown'
        : `${row.FirstName || ''} ${row.LastName || ''}`.trim() || email || 'Unknown';

      const target = upsertRow(key, {
        Key: key,
        PersonnelID: resolvedPersonnel?.PersonnelID ?? personnelId,
        FullName: fullName,
        Email: (resolvedPersonnel?.PrimaryEmail || email || '').trim().toLowerCase(),
      });

      if (!target.AccessRows.some((existing) => existing.AccessID === row.AccessID)) {
        target.AccessRows.push(row);
        target.AccessByPortal[row.PortalName] = row;
      }
    });

    return Array.from(rowsByKey.values())
      .map((row) => {
        row.AccessRows.sort((a, b) => a.PortalName.localeCompare(b.PortalName));
        return row;
      })
      .sort((a, b) => a.FullName.localeCompare(b.FullName));
  }, [personnel, accessRows, personnelById, personnelByEmail]);

  const filteredPeople = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return personRows.filter((row) => {
      if (portalFilter !== 'all') {
        const personnelId = row.PersonnelID;
        if (portalFilter === 'team') {
          if (!row.AccessByPortal.team) return false;
        } else {
          const eligibleSet = rolePersonnelIds[portalFilter];
          if (!personnelId || !eligibleSet?.has(personnelId)) return false;
        }
      }

      const targetAccess = portalFilter === 'all' ? undefined : row.AccessByPortal[portalFilter];

      if (roleFilter !== 'all') {
        if (portalFilter === 'all') {
          if (!row.AccessRows.some((accessRow) => accessRow.PortalRole === roleFilter)) return false;
        } else if (!targetAccess || targetAccess.PortalRole !== roleFilter) {
          return false;
        }
      }

      if (accessStateFilter !== 'all') {
        const hasAny = row.AccessRows.length > 0;

        if (portalFilter === 'all') {
          const hasActive = row.AccessRows.some((accessRow) => accessRow.IsActive);
          const hasInactive = row.AccessRows.some((accessRow) => !accessRow.IsActive);

          if (accessStateFilter === 'has' && !hasAny) return false;
          if (accessStateFilter === 'none' && hasAny) return false;
          if (accessStateFilter === 'active' && !hasActive) return false;
          if (accessStateFilter === 'inactive' && !hasInactive) return false;
        } else {
          const hasPortalAccess = !!targetAccess;
          const isActive = targetAccess?.IsActive === true;

          if (accessStateFilter === 'has' && !hasPortalAccess) return false;
          if (accessStateFilter === 'none' && hasPortalAccess) return false;
          if (accessStateFilter === 'active' && (!hasPortalAccess || !isActive)) return false;
          if (accessStateFilter === 'inactive' && (!hasPortalAccess || isActive)) return false;
        }
      }

      if (!q) return true;

      const searchablePortals = row.AccessRows
        .map((accessRow) => `${accessRow.PortalName} ${accessRow.PortalRole} ${accessRow.IsActive ? 'active' : 'inactive'}`)
        .join(' ')
        .toLowerCase();

      return row.FullName.toLowerCase().includes(q)
        || row.Email.toLowerCase().includes(q)
        || searchablePortals.includes(q);
    });
  }, [personRows, searchTerm, portalFilter, roleFilter, accessStateFilter, rolePersonnelIds]);

  const handlePersonnelChange = (value: string) => {
    setSelectedPersonnelId(value);
    if (!value) return;

    const person = personnelById.get(Number(value));
    if (person?.PrimaryEmail) {
      setLoginEmail(person.PrimaryEmail);
    }
  };

  const handleManualPortalChange = (value: PortalName) => {
    setManualPortalName(value);
    setManualPortalRole(DEFAULT_ROLE_BY_PORTAL[value]);
  };

  const ensureDefaultCredentials = async (row: Pick<PortalUserAccess, 'LoginEmail' | 'PortalName' | 'PortalRole'>): Promise<string | null> => {
    setProvisioningEmail(row.LoginEmail);
    const provisionResult = await supabaseService.provisionPortalUserCredentials({
      loginEmail: row.LoginEmail,
      portalName: row.PortalName,
      portalRole: row.PortalRole,
      useDefaultPassword: true,
      sendResetEmail: false,
    });
    setProvisioningEmail(null);

    if (!provisionResult.success || !provisionResult.data) {
      return provisionResult.error || 'Default password setup failed.';
    }

    return null;
  };

  const handleSaveManual = async () => {
    const trimmedEmail = loginEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setMessage({ type: 'error', text: 'Email is required to create portal access.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    const result = await supabaseService.upsertPortalUserAccess({
      personnelId: selectedPersonnelId ? Number(selectedPersonnelId) : null,
      loginEmail: trimmedEmail,
      portalName: manualPortalName,
      portalRole: manualPortalRole,
      isActive: true,
    });

    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Failed to save portal access.' });
      setIsSaving(false);
      return;
    }

    let credentialIssue: string | null = null;
    if (result.data && !result.data.AuthUserID) {
      credentialIssue = await ensureDefaultCredentials(result.data);
    }

    if (credentialIssue) {
      setMessage({
        type: 'error',
        text: `Portal access saved for ${trimmedEmail} on ${manualPortalName} portal, but default password setup failed: ${credentialIssue}`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: `Portal access saved for ${trimmedEmail} on ${manualPortalName} portal${result.data?.AuthUserID ? '.' : ' and default password was set.'}`,
    });
    setSelectedPersonnelId('');
    setPersonnelSearchTerm('');
    setLoginEmail('');
    await loadData();
    setIsSaving(false);
  };

  const handleResetDefaultPassword = async (row: PortalUserAccess) => {
    const shouldProceed = window.confirm(
      `Reset password for ${row.LoginEmail} to the default admin password for the ${row.PortalName} portal?`,
    );
    if (!shouldProceed) return;

    setProvisioningEmail(row.LoginEmail);

    const result = await supabaseService.provisionPortalUserCredentials({
      loginEmail: row.LoginEmail,
      portalName: row.PortalName,
      portalRole: row.PortalRole,
      useDefaultPassword: true,
      sendResetEmail: false,
    });

    if (!result.success || !result.data) {
      setMessage({ type: 'error', text: result.error || 'Failed to reset password to default.' });
      setProvisioningEmail(null);
      return;
    }

    setMessage({
      type: 'success',
      text: `Password reset to default for ${row.LoginEmail} on ${row.PortalName} portal.`,
    });
    setProvisioningEmail(null);
    await loadData();
  };

  const handleQuickToggle = async (person: PersonAccessRow) => {
    if (portalFilter === 'all') {
      setMessage({ type: 'error', text: 'Select a specific portal to activate/deactivate access.' });
      return;
    }

    if (!person.Email) {
      setMessage({ type: 'error', text: `Cannot manage portal access for ${person.FullName} because no email is set.` });
      return;
    }

    setIsSaving(true);
    const existing = person.AccessByPortal[portalFilter];

    if (existing) {
      const result = await supabaseService.setPortalAccessActive(existing.AccessID, !existing.IsActive);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to update portal access.' });
        setIsSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: `${person.FullName} is now ${existing.IsActive ? 'inactive' : 'active'} for ${portalFilter} portal.`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    const insertResult = await supabaseService.upsertPortalUserAccess({
      personnelId: person.PersonnelID,
      loginEmail: person.Email,
      portalName: portalFilter,
      portalRole: DEFAULT_ROLE_BY_PORTAL[portalFilter],
      isActive: true,
    });

    if (!insertResult.success) {
      setMessage({ type: 'error', text: insertResult.error || 'Failed to grant portal access.' });
      setIsSaving(false);
      return;
    }

    let credentialIssue: string | null = null;
    if (insertResult.data && !insertResult.data.AuthUserID) {
      credentialIssue = await ensureDefaultCredentials(insertResult.data);
    }

    if (credentialIssue) {
      setMessage({
        type: 'error',
        text: `Access granted for ${person.FullName}, but default password setup failed: ${credentialIssue}`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: `${portalFilter} portal access granted for ${person.FullName}${insertResult.data?.AuthUserID ? '.' : ' and default password was set.'}`,
    });
    await loadData();
    setIsSaving(false);
  };

  if (isLoading) {
    return <Loader text="Loading portal access..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Access Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Use one quick list to manage access by person. Filter by portal to activate/deactivate fast, or set portal to
          All Portals to review each person&apos;s full access footprint.
        </p>
        <p className="mt-1 text-xs text-gray-500">
          Portal tabs use role membership: Cast = cast members, Instructor = teachers, Director = directors, Student = students, Team = existing team access only.
        </p>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      <div className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPortalFilter('all')}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${portalFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            All
          </button>
          {PORTAL_OPTIONS.map((option) => (
            <button
              key={`portal-tab-${option.value}`}
              type="button"
              onClick={() => setPortalFilter(option.value)}
              className={`rounded-full px-3 py-1.5 text-sm font-medium ${portalFilter === option.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
            >
              {option.label.replace(' Portal', '')}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <input
            type="text"
            placeholder="Search by name, email, portal, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-primary-500"
          />
          <select
            title="Filter by access state"
            value={accessStateFilter}
            onChange={(e) => setAccessStateFilter(e.target.value as AccessStateFilter)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Access States</option>
            <option value="has">Has Access</option>
            <option value="none">No Access</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <div className="flex items-center justify-start text-sm text-gray-500 md:justify-end">
            Showing {filteredPeople.length} people
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {filteredPeople.map((person) => {
            const selectedPortalRow = portalFilter === 'all' ? undefined : person.AccessByPortal[portalFilter];
            const selectedPortalHasAccess = !!selectedPortalRow;

            return (
              <article key={person.Key} className="rounded-xl border bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-gray-900">{person.FullName}</h2>
                    <p className="break-all text-sm text-gray-600">{person.Email || 'No email'}</p>
                  </div>
                  {portalFilter === 'all' ? (
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                      {person.AccessRows.length} portals
                    </span>
                  ) : (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${selectedPortalRow?.IsActive ? 'bg-green-100 text-green-700' : selectedPortalHasAccess ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                      {selectedPortalRow ? (selectedPortalRow.IsActive ? 'Access Active' : 'Access Inactive') : 'No Access'}
                    </span>
                  )}
                </div>

                {portalFilter === 'all' ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {person.AccessRows.length === 0 && (
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">No portal access</span>
                    )}
                    {person.AccessRows.map((row) => (
                      <span key={row.AccessID} className={`rounded-full px-2.5 py-1 text-xs ${row.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {row.PortalName} · {ROLE_LABELS[row.PortalRole]}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-gray-600">
                    Role: {selectedPortalRow ? ROLE_LABELS[selectedPortalRow.PortalRole] : ROLE_LABELS[DEFAULT_ROLE_BY_PORTAL[portalFilter]]}
                  </div>
                )}

                {portalFilter !== 'all' && (
                  <div className="mt-4 grid gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickToggle(person)}
                      disabled={isSaving || !person.Email}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {!selectedPortalRow ? 'Grant Access' : selectedPortalRow.IsActive ? 'Deactivate Access' : 'Activate Access'}
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedPortalRow && handleResetDefaultPassword(selectedPortalRow)}
                      disabled={!selectedPortalRow || !person.Email || provisioningEmail === person.Email}
                      className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {provisioningEmail === person.Email ? 'Resetting...' : 'Reset to Default'}
                    </button>
                  </div>
                )}
              </article>
            );
          })}

          {filteredPeople.length === 0 && (
            <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No people match the current filters.</div>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Person</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {portalFilter === 'all' ? 'All Access' : `${portalFilter} Access`}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {filteredPeople.map((person) => {
                const selectedPortalRow = portalFilter === 'all' ? undefined : person.AccessByPortal[portalFilter];

                return (
                  <tr key={person.Key} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">{person.FullName}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-600">{person.Email || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {portalFilter === 'all' ? (
                        <div className="flex flex-wrap gap-2">
                          {person.AccessRows.length === 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">No portal access</span>
                          )}
                          {person.AccessRows.map((row) => (
                            <span key={row.AccessID} className={`rounded-full px-2 py-1 text-xs ${row.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                              {row.PortalName} · {ROLE_LABELS[row.PortalRole]}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${selectedPortalRow?.IsActive ? 'bg-green-100 text-green-700' : selectedPortalRow ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                          {selectedPortalRow
                            ? `${selectedPortalRow.IsActive ? 'Active' : 'Inactive'} · ${ROLE_LABELS[selectedPortalRow.PortalRole]}`
                            : `No Access · ${ROLE_LABELS[DEFAULT_ROLE_BY_PORTAL[portalFilter]]}`}
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      {portalFilter === 'all' ? (
                        <span className="text-xs text-gray-500">Choose a portal filter to manage access</span>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickToggle(person)}
                            disabled={isSaving || !person.Email}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {!selectedPortalRow ? 'Grant' : selectedPortalRow.IsActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            type="button"
                            onClick={() => selectedPortalRow && handleResetDefaultPassword(selectedPortalRow)}
                            disabled={!selectedPortalRow || !person.Email || provisioningEmail === person.Email}
                            className="rounded-lg border border-amber-300 px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                          >
                            {provisioningEmail === person.Email ? 'Resetting...' : 'Reset Default'}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredPeople.length === 0 && (
            <div className="py-10 text-center text-gray-500">No people match the current filters.</div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowManualAdd((prev) => !prev)}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {showManualAdd ? 'Hide Advanced Manual Add' : 'Show Advanced Manual Add'}
        </button>
      </div>

      {showManualAdd && (
        <div className="mt-4 rounded-lg border bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-gray-700">Advanced Manual Add / Update</h2>

          <div className="mb-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Personnel (optional)</label>
              <input
                type="text"
                value={personnelSearchTerm}
                onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                placeholder="Search personnel by name or email..."
                className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <select
                title="Personnel"
                value={selectedPersonnelId}
                onChange={(e) => handlePersonnelChange(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="">Not linked to personnel</option>
                {filteredPersonnel.map((person) => (
                  <option key={person.PersonnelID} value={person.PersonnelID}>
                    {`${person.LastName || ''}, ${person.FirstName || ''}`.replace(/^,\s*/, '').trim()} ({person.PrimaryEmail || 'no email'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Login Email</label>
              <input
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Portal</label>
              <select
                title="Portal"
                value={manualPortalName}
                onChange={(e) => handleManualPortalChange(e.target.value as PortalName)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {PORTAL_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-gray-600">Role</label>
              <input
                type="text"
                title="Auto-assigned role"
                value={ROLE_LABELS[manualPortalRole]}
                readOnly
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleSaveManual}
            disabled={isSaving}
            className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
          >
            {isSaving ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      )}
    </div>
  );
};