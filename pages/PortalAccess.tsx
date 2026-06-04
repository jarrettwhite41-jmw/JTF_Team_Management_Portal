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
  const [castMembers, setCastMembers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [portalFilter, setPortalFilter] = useState<'all' | PortalName>('all');
  const [accessStatusFilter, setAccessStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [castSearchTerm, setCastSearchTerm] = useState('');
  const [castAccessFilter, setCastAccessFilter] = useState<'all' | 'with' | 'without'>('all');
  const [castStatusFilter, setCastStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [provisioningEmail, setProvisioningEmail] = useState<string | null>(null);
  const [showCastManager, setShowCastManager] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [portalName, setPortalName] = useState<PortalName>('instructor');
  const [portalRole, setPortalRole] = useState<PortalAccessRole>(DEFAULT_ROLE_BY_PORTAL.instructor);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [personnelRes, accessRes, castRes] = await Promise.all([
        supabaseService.getAllPersonnel(),
        supabaseService.getPortalUserAccess(),
        supabaseService.getAllCastMembers(),
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

      if (castRes.success && castRes.data?.data) {
        setCastMembers(castRes.data.data);
      } else {
        setMessage({ type: 'error', text: castRes.error || 'Failed to load cast members.' });
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
    return accessRows.filter((row) => {
      if (portalFilter !== 'all' && row.PortalName !== portalFilter) return false;
      if (accessStatusFilter === 'active' && !row.IsActive) return false;
      if (accessStatusFilter === 'inactive' && row.IsActive) return false;

      if (!q) return true;
      const fullName = `${row.FirstName || ''} ${row.LastName || ''}`.trim().toLowerCase();
      return (
        row.LoginEmail.toLowerCase().includes(q)
        || row.PortalName.toLowerCase().includes(q)
        || row.PortalRole.toLowerCase().includes(q)
        || fullName.includes(q)
      );
    });
  }, [accessRows, searchTerm, portalFilter, accessStatusFilter]);

  const castAccessByPersonnelId = useMemo(() => {
    const map = new Map<number, PortalUserAccess>();
    accessRows
      .filter((row) => row.PortalName === 'cast' && row.PersonnelID)
      .forEach((row) => map.set(Number(row.PersonnelID), row));
    return map;
  }, [accessRows]);

  const castAccessByEmail = useMemo(() => {
    const map = new Map<string, PortalUserAccess>();
    accessRows
      .filter((row) => row.PortalName === 'cast' && row.LoginEmail)
      .forEach((row) => map.set(row.LoginEmail.trim().toLowerCase(), row));
    return map;
  }, [accessRows]);

  const castPortalRows = useMemo(() => {
    const rows = castMembers.map((member) => {
      const email = (member.PrimaryEmail || '').trim().toLowerCase();
      const byPersonnel = member.PersonnelID ? castAccessByPersonnelId.get(Number(member.PersonnelID)) : undefined;
      const byEmail = email ? castAccessByEmail.get(email) : undefined;
      const accessRow = byPersonnel || byEmail || null;
      const fullName = member.FullName || `${member.FirstName || ''} ${member.LastName || member.Lastname || ''}`.trim();

      return {
        PersonnelID: member.PersonnelID as number | undefined,
        FullName: fullName || 'Unknown',
        PrimaryEmail: member.PrimaryEmail || '',
        CastStatus: member.Status || 'Active',
        AccessRow: accessRow,
      };
    });

    const q = castSearchTerm.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const hasAccess = !!row.AccessRow;
      const isActive = row.AccessRow?.IsActive === true;

      if (castAccessFilter === 'with' && !hasAccess) return false;
      if (castAccessFilter === 'without' && hasAccess) return false;
      if (castStatusFilter === 'active' && (!hasAccess || !isActive)) return false;
      if (castStatusFilter === 'inactive' && (!hasAccess || isActive)) return false;

      if (!q) return true;
      return (
        row.FullName.toLowerCase().includes(q)
        || row.PrimaryEmail.toLowerCase().includes(q)
        || row.CastStatus.toLowerCase().includes(q)
      );
    });

    return filtered.sort((a, b) => a.FullName.localeCompare(b.FullName));
  }, [castMembers, castAccessByPersonnelId, castAccessByEmail, castSearchTerm, castAccessFilter, castStatusFilter]);

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

    let credentialIssue: string | null = null;
    if (result.data && !result.data.AuthUserID) {
      credentialIssue = await ensureDefaultCredentials(result.data);
    }

    if (credentialIssue) {
      setMessage({
        type: 'error',
        text: `Portal access saved for ${trimmedEmail} on ${portalName} portal, but default password setup failed: ${credentialIssue}`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: `Portal access saved for ${trimmedEmail} on ${portalName} portal${result.data?.AuthUserID ? '.' : ' and default password was set.'}`,
    });
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

  const handleToggleCastMemberAccess = async (castRow: {
    PersonnelID?: number;
    FullName: string;
    PrimaryEmail: string;
    AccessRow: PortalUserAccess | null;
  }) => {
    const email = castRow.PrimaryEmail.trim().toLowerCase();
    if (!email) {
      setMessage({ type: 'error', text: `Cannot manage portal access for ${castRow.FullName} because no email is set.` });
      return;
    }

    setIsSaving(true);

    if (castRow.AccessRow) {
      const result = await supabaseService.setPortalAccessActive(castRow.AccessRow.AccessID, !castRow.AccessRow.IsActive);
      if (!result.success) {
        setMessage({ type: 'error', text: result.error || 'Failed to update cast portal access.' });
        setIsSaving(false);
        return;
      }

      setMessage({
        type: 'success',
        text: `${castRow.FullName} is now ${castRow.AccessRow.IsActive ? 'inactive' : 'active'} for cast portal.`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    const result = await supabaseService.upsertPortalUserAccess({
      personnelId: castRow.PersonnelID ?? null,
      loginEmail: email,
      portalName: 'cast',
      portalRole: 'cast',
      isActive: true,
    });

    if (!result.success) {
      setMessage({ type: 'error', text: result.error || 'Failed to grant cast portal access.' });
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
        text: `Cast portal access granted for ${castRow.FullName}, but default password setup failed: ${credentialIssue}`,
      });
      await loadData();
      setIsSaving(false);
      return;
    }

    setMessage({
      type: 'success',
      text: `Cast portal access granted for ${castRow.FullName}${result.data?.AuthUserID ? '.' : ' and default password was set.'}`,
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
          Create or update access per portal. The same email can have separate roles across Team, Instructor,
          Director, Cast, and Student portals.
        </p>
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowCastManager((prev) => !prev)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {showCastManager ? 'Hide Cast Access Manager' : 'Show Cast Access Manager'}
          </button>
        </div>
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

      <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <input
          type="text"
          placeholder="Search by email, portal, role, or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          title="Filter by portal"
          value={portalFilter}
          onChange={(e) => setPortalFilter(e.target.value as 'all' | PortalName)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Portals</option>
          {PORTAL_OPTIONS.map((option) => (
            <option key={`filter-${option.value}`} value={option.value}>{option.label}</option>
          ))}
        </select>
        <select
          title="Filter by status"
          value={accessStatusFilter}
          onChange={(e) => setAccessStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <div className="text-sm text-gray-500 flex items-center justify-start md:justify-end">
          Showing {filteredRows.length} access rows
        </div>
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
                disabled={provisioningEmail === row.LoginEmail}
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
                      disabled={provisioningEmail === row.LoginEmail}
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

      {showCastManager && (
      <div className="mt-8 bg-white rounded-lg shadow-sm border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Cast Portal Access Manager</h2>
        <p className="text-xs text-gray-500 mb-4">
          Review all cast members, grant or deactivate cast portal access, and reset default password for cast users.
        </p>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <input
            type="text"
            placeholder="Search cast by name, email, or cast status..."
            value={castSearchTerm}
            onChange={(e) => setCastSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <select
            title="Filter cast access"
            value={castAccessFilter}
            onChange={(e) => setCastAccessFilter(e.target.value as 'all' | 'with' | 'without')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Cast Members</option>
            <option value="with">With Cast Portal Access</option>
            <option value="without">Without Cast Portal Access</option>
          </select>
          <select
            title="Filter cast portal status"
            value={castStatusFilter}
            onChange={(e) => setCastStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="all">All Access Statuses</option>
            <option value="active">Access Active</option>
            <option value="inactive">Access Inactive</option>
          </select>
          <div className="text-sm text-gray-500 flex items-center justify-start md:justify-end">
            Showing {castPortalRows.length} cast members
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {castPortalRows.map((row) => (
            <article key={`${row.PersonnelID || row.PrimaryEmail}-${row.FullName}`} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-gray-900">{row.FullName}</h3>
                  <p className="text-sm text-gray-600 break-all">{row.PrimaryEmail || 'No email'}</p>
                  <p className="mt-1 text-xs text-gray-500">Cast Status: {row.CastStatus}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${row.AccessRow?.IsActive ? 'bg-green-100 text-green-700' : row.AccessRow ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                  {row.AccessRow ? (row.AccessRow.IsActive ? 'Access Active' : 'Access Inactive') : 'No Access'}
                </span>
              </div>

              <div className="mt-4 grid gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleCastMemberAccess(row)}
                  disabled={isSaving || !row.PrimaryEmail}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {!row.AccessRow ? 'Grant Access' : row.AccessRow.IsActive ? 'Deactivate Access' : 'Activate Access'}
                </button>
                <button
                  type="button"
                  onClick={() => row.AccessRow && handleResetDefaultPassword(row.AccessRow)}
                  disabled={!row.AccessRow || provisioningEmail === row.PrimaryEmail || !row.PrimaryEmail}
                  className="w-full rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                >
                  {provisioningEmail === row.PrimaryEmail ? 'Resetting...' : 'Reset to Default'}
                </button>
              </div>
            </article>
          ))}

          {castPortalRows.length === 0 && (
            <div className="rounded-xl border bg-white px-4 py-10 text-center text-gray-500 shadow-sm">No cast members match the current filters.</div>
          )}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border bg-white shadow-sm md:block">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cast Member</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cast Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Portal Access</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {castPortalRows.map((row) => (
                <tr key={`${row.PersonnelID || row.PrimaryEmail}-${row.FullName}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{row.FullName}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.PrimaryEmail || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{row.CastStatus}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${row.AccessRow?.IsActive ? 'bg-green-100 text-green-700' : row.AccessRow ? 'bg-gray-100 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>
                      {row.AccessRow ? (row.AccessRow.IsActive ? 'Access Active' : 'Access Inactive') : 'No Access'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleToggleCastMemberAccess(row)}
                        disabled={isSaving || !row.PrimaryEmail}
                        className="rounded-lg border border-gray-300 px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {!row.AccessRow ? 'Grant Access' : row.AccessRow.IsActive ? 'Deactivate Access' : 'Activate Access'}
                      </button>
                      <button
                        type="button"
                        onClick={() => row.AccessRow && handleResetDefaultPassword(row.AccessRow)}
                        disabled={!row.AccessRow || provisioningEmail === row.PrimaryEmail || !row.PrimaryEmail}
                        className="rounded-lg border border-amber-300 px-3 py-1.5 text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                      >
                        {provisioningEmail === row.PrimaryEmail ? 'Resetting...' : 'Reset to Default'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {castPortalRows.length === 0 && (
            <div className="py-10 text-center text-gray-500">No cast members match the current filters.</div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
