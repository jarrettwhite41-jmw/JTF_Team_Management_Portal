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
];

const DEFAULT_ROLE_BY_PORTAL: Record<PortalName, PortalAccessRole> = {
  instructor: 'teacher',
  team: 'manager',
  director: 'director',
  cast: 'cast',
  student: 'student',
};

const ROLE_LABELS: Record<PortalAccessRole, string> = {
  admin: 'Admin',
  manager: 'Manager',
  director: 'Director',
  teacher: 'Teacher',
  cast: 'Cast',
  student: 'Student',
};

export const PortalAccess: React.FC = () => {
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [accessRows, setAccessRows] = useState<PortalUserAccess[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provisioningEmail, setProvisioningEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [portalName, setPortalName] = useState<PortalName>('instructor');
  const [portalRole, setPortalRole] = useState<PortalAccessRole>(DEFAULT_ROLE_BY_PORTAL.instructor);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [personnelRes, accessRes] = await Promise.all([
        supabaseService.getAllPersonnel(),
        supabaseService.getPortalUserAccess(),
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

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return accessRows;

    return accessRows.filter((row) => {
      const fullName = `${row.FirstName || ''} ${row.LastName || ''}`.trim().toLowerCase();
      return (
        row.LoginEmail.toLowerCase().includes(q)
        || row.PortalName.toLowerCase().includes(q)
        || row.PortalRole.toLowerCase().includes(q)
        || fullName.includes(q)
      );
    });
  }, [accessRows, searchTerm]);

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

  const handlePersonnelChange = (value: string) => {
    setSelectedPersonnelId(value);
    if (!value) return;

    const person = personnelById.get(Number(value));
    if (person?.PrimaryEmail) {
      setLoginEmail(person.PrimaryEmail);
    }
  };

  const handlePortalChange = (value: PortalName) => {
    setPortalName(value);
    setPortalRole(DEFAULT_ROLE_BY_PORTAL[value]);
  };

  const handleSave = async () => {
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
      portalName,
      portalRole,
      isActive: true,
    });

    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Failed to save portal access.' });
      setIsSaving(false);
      return;
    }

    setMessage({ type: 'success', text: `Portal access saved for ${trimmedEmail} on ${portalName} portal.` });
    setSelectedPersonnelId('');
    setPersonnelSearchTerm('');
    setLoginEmail('');
    await loadData();
    setIsSaving(false);
  };

  const handleToggleActive = async (row: PortalUserAccess) => {
    setIsSaving(true);
    const result = await supabaseService.setPortalAccessActive(row.AccessID, !row.IsActive);

    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Failed to update access status.' });
      setIsSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: `${row.LoginEmail} is now ${row.IsActive ? 'inactive' : 'active'} for ${row.PortalName} portal.`,
    });
    await loadData();
    setIsSaving(false);
  };

  const handleResetDefaultPassword = async (row: PortalUserAccess) => {
    const shouldProceed = window.confirm(
      `Reset password for ${row.LoginEmail} to the default admin password for Team + Instructor portals?`,
    );
    if (!shouldProceed) return;

    const targets = accessRows.filter(
      (candidate) => candidate.LoginEmail.toLowerCase() === row.LoginEmail.toLowerCase()
        && (candidate.PortalName === 'team' || candidate.PortalName === 'instructor'),
    );

    if (targets.length === 0) {
      setMessage({ type: 'error', text: `No Team or Instructor portal access rows found for ${row.LoginEmail}.` });
      return;
    }

    setProvisioningEmail(row.LoginEmail);

    for (const target of targets) {
      const result = await supabaseService.provisionPortalUserCredentials({
        loginEmail: target.LoginEmail,
        portalName: target.PortalName,
        portalRole: target.PortalRole,
        useDefaultPassword: true,
        sendResetEmail: false,
      });

      if (!result.success || !result.data) {
        setMessage({ type: 'error', text: result.error || 'Failed to reset password to default.' });
        setProvisioningEmail(null);
        return;
      }
    }

    const portalLabel = targets
      .map((target) => target.PortalName)
      .filter((name, index, arr) => arr.indexOf(name) === index)
      .join(' + ');

    setMessage({
      type: 'success',
      text: `Password reset to default for ${row.LoginEmail} on ${portalLabel} portals.`,
    });
    setProvisioningEmail(null);
    await loadData();
  };

  const hasTeamOrInstructorAccess = (row: PortalUserAccess): boolean => {
    if (row.PortalName === 'team' || row.PortalName === 'instructor') return true;

    return accessRows.some(
      (candidate) => candidate.LoginEmail.toLowerCase() === row.LoginEmail.toLowerCase()
        && (candidate.PortalName === 'team' || candidate.PortalName === 'instructor'),
    );
  };

  if (isLoading) {
    return <Loader text="Loading portal access..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Portal Access Management</h1>
        <p className="text-sm text-gray-600 mt-1">
          Create or update access per portal. The same email can have separate roles across Team, Instructor,
          Director, Cast, and Student portals.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Create or Update Portal Access</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Personnel (optional)</label>
            <input
              type="text"
              value={personnelSearchTerm}
              onChange={(e) => setPersonnelSearchTerm(e.target.value)}
              placeholder="Search personnel by name or email..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-2"
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Login Email</label>
            <input
              type="email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              placeholder="name@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Portal</label>
            <select
              title="Portal"
              value={portalName}
              onChange={(e) => handlePortalChange(e.target.value as PortalName)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            >
              {PORTAL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Role</label>
            <input
              type="text"
              title="Auto-assigned role"
              value={ROLE_LABELS[portalRole]}
              readOnly
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-700"
            />
            <p className="mt-1 text-xs text-gray-500">Role is automatically assigned from the selected portal.</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-60 sm:w-auto"
        >
          {isSaving ? 'Saving...' : 'Save Access'}
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
        </div>
      )}

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by email, portal, role, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-3 md:hidden">
        {filteredRows.map((row) => (
          <article key={row.AccessID} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="break-all text-base font-semibold text-gray-900">{row.LoginEmail}</h2>
                <p className="mt-1 text-sm text-gray-600">{row.PortalName} · {row.PortalRole}</p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {row.IsActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">Linked person:</span> {(row.FirstName || row.LastName) ? `${row.FirstName || ''} ${row.LastName || ''}`.trim() : '-'}</p>
            </div>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => handleToggleActive(row)}
                disabled={isSaving}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {row.IsActive ? 'Deactivate' : 'Activate'}
              </button>
              <button
                type="button"
                onClick={() => handleResetDefaultPassword(row)}
                disabled={provisioningEmail === row.LoginEmail || !hasTeamOrInstructorAccess(row)}
                className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
              >
                {provisioningEmail === row.LoginEmail ? 'Resetting...' : 'Reset to Default'}
              </button>
            </div>
          </article>
        ))}

        {filteredRows.length === 0 && (
          <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No portal access rows found.</div>
        )}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portal</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Linked Person</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredRows.map((row) => (
              <tr key={row.AccessID} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.LoginEmail}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.PortalName}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.PortalRole}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                  {(row.FirstName || row.LastName)
                    ? `${row.FirstName || ''} ${row.LastName || ''}`.trim()
                    : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.IsActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {row.IsActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(row)}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {row.IsActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResetDefaultPassword(row)}
                      disabled={provisioningEmail === row.LoginEmail || !hasTeamOrInstructorAccess(row)}
                      className="rounded-lg border border-amber-300 px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {provisioningEmail === row.LoginEmail ? 'Resetting...' : 'Reset to Default'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredRows.length === 0 && (
          <div className="py-10 text-center text-gray-500">No portal access rows found.</div>
        )}
      </div>
    </div>
  );
};
