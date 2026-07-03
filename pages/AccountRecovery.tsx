import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

interface AccountMismatch {
  access_id: string;
  personnel_id: number | null;
  login_email: string;
  portal_name: string;
  portal_role: string;
  auth_user_id: string | null;
  auth_email: string | null;
  personnel_email: string | null;
  personnel_name: string | null;
  is_mismatched: boolean;
}

interface AuthUser {
  id: string;
  email: string;
}

export function AccountRecovery() {
  const [mismatches, setMismatches] = useState<AccountMismatch[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);
  const [fixError, setFixError] = useState<string | null>(null);
  const [selectedAuthUser, setSelectedAuthUser] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    loadMismatches();
  }, []);

  const loadMismatches = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: queryError } = await supabase.rpc('get_account_mismatches');

      if (queryError) throw queryError;

      setMismatches(data || []);

      // Load all auth users for selection
      const { data: authData, error: authError } = await supabase
        .from('auth.users')
        .select('id, email')
        .order('email');

      if (authError) throw authError;
      setAuthUsers(authData || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load account mismatches');
    } finally {
      setLoading(false);
    }
  };

  const fixMismatch = async (mismatch: AccountMismatch) => {
    if (!selectedAuthUser[mismatch.access_id]) {
      setFixError('Please select an auth user');
      return;
    }

    setFixing(mismatch.access_id);
    setFixError(null);

    try {
      const selectedEmail = selectedAuthUser[mismatch.access_id];

      // Update portal_user_access with new email and auth_user_id
      const { error: updateError } = await supabase
        .from('portal_user_access')
        .update({
          login_email: selectedEmail,
          auth_user_id: authUsers.find((u) => u.email === selectedEmail)?.id || null,
        })
        .eq('access_id', mismatch.access_id);

      if (updateError) throw updateError;

      // Reload mismatches to refresh the list
      await loadMismatches();
      setSelectedAuthUser({});
    } catch (err) {
      setFixError(err instanceof Error ? err.message : 'Failed to fix account');
    } finally {
      setFixing(null);
    }
  };

  if (loading) {
    return <div className="p-6">Loading account information...</div>;
  }

  const brokenAccounts = mismatches.filter((m) => m.is_mismatched);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Account Recovery</h1>
        <p className="mt-2 text-slate-600">
          Find and fix mismatches between auth users and portal accounts
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{error}</div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Mismatched Accounts: {brokenAccounts.length}
        </h2>
        {brokenAccounts.length === 0 ? (
          <p className="mt-2 text-slate-600">No mismatched accounts found. Everything looks good!</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Personnel</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Portal</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Current Login Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Auth Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Select Auth User</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Action</th>
                </tr>
              </thead>
              <tbody>
                {brokenAccounts.map((mismatch) => (
                  <tr key={mismatch.access_id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-slate-900">
                          {mismatch.personnel_name || `ID: ${mismatch.personnel_id}`}
                        </div>
                        <div className="text-xs text-slate-500">{mismatch.personnel_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                        {mismatch.portal_name}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-red-600">{mismatch.login_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-orange-600">{mismatch.auth_email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={selectedAuthUser[mismatch.access_id] || ''}
                        onChange={(e) =>
                          setSelectedAuthUser({
                            ...selectedAuthUser,
                            [mismatch.access_id]: e.target.value,
                          })
                        }
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                      >
                        <option value="">-- Select auth user --</option>
                        {authUsers.map((user) => (
                          <option key={user.id} value={user.email}>
                            {user.email}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => fixMismatch(mismatch)}
                        disabled={fixing === mismatch.access_id || !selectedAuthUser[mismatch.access_id]}
                        className="rounded bg-blue-600 px-3 py-1 text-sm font-medium text-white disabled:bg-slate-300 hover:bg-blue-700"
                      >
                        {fixing === mismatch.access_id ? 'Fixing...' : 'Fix'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {fixError && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">{fixError}</div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <h3 className="font-semibold text-slate-900">How to fix:</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li>For each mismatched account, the "Current Login Email" (red) doesn't match the "Auth Email" (orange)</li>
          <li>Select the correct Auth User from the dropdown that should be linked to this account</li>
          <li>Click "Fix" to update the portal account to use that auth user</li>
          <li>The account will now use the auth user's email for login</li>
        </ol>
      </div>
    </div>
  );
}
