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
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
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

  const syncAuthEmail = async (mismatch: AccountMismatch) => {
    setSyncing(mismatch.access_id);
    setSyncMessage(null);

    try {
      // Call the RPC function to sync auth email to personnel email
      const { data, error: syncError } = await supabase.rpc('fix_auth_email_mismatch', {
        p_access_id: mismatch.access_id,
        p_personnel_id: mismatch.personnel_id,
      });

      if (syncError) throw syncError;

      setSyncMessage(`✓ Email synced: ${data.old_email} → ${data.new_email}`);
      
      // Reload mismatches to refresh the list
      setTimeout(() => {
        loadMismatches();
      }, 1500);
    } catch (err) {
      setSyncMessage(`✗ Error: ${err instanceof Error ? err.message : 'Failed to sync email'}`);
    } finally {
      setSyncing(null);
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
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Personnel Email</th>
                  <th className="px-4 py-2 text-left font-semibold text-slate-700">Actions</th>
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
                      <div className="text-sm font-medium text-green-700">{mismatch.personnel_email}</div>
                    </td>
                    <td className="px-4 py-3 space-x-2">
                      <button
                        onClick={() => syncAuthEmail(mismatch)}
                        disabled={syncing === mismatch.access_id}
                        className="rounded bg-green-600 px-3 py-1 text-sm font-medium text-white disabled:bg-slate-300 hover:bg-green-700"
                      >
                        {syncing === mismatch.access_id ? 'Syncing...' : 'Sync Auth Email'}
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

      {syncMessage && (
        <div className={`rounded-lg border p-4 ${
          syncMessage.startsWith('✓')
            ? 'border-green-300 bg-green-50 text-green-800'
            : 'border-red-300 bg-red-50 text-red-800'
        }`}>
          {syncMessage}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <h3 className="font-semibold text-slate-900">How to fix:</h3>
        <ol className="mt-2 list-inside list-decimal space-y-1">
          <li><strong>Sync Auth Email:</strong> Automatically updates the auth user's email to match the personnel record's email</li>
          <li>Red "Current Login Email" = what portal_user_access currently has</li>
          <li>Orange "Auth Email" = what auth.users currently has</li>
          <li>Green "Personnel Email" = what personnel record has (the target)</li>
          <li>Click "Sync Auth Email" to update auth.users.email to match personnel.primary_email</li>
          <li>The trigger will automatically sync portal_user_access.login_email to match</li>
        </ol>
      </div>
    </div>
  );
}
