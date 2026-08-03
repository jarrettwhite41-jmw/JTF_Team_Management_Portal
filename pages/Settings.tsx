import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { AppSetting } from '../types';
import { supabaseService } from '../services/supabaseService';

export const Settings: React.FC = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await supabaseService.getAppSettings();
      if (!response.success || !response.data) {
        setMessage({ type: 'error', text: response.error || 'Failed to load app settings.' });
        return;
      }

      const sorted = [...response.data].sort((a, b) => a.setting_key.localeCompare(b.setting_key));
      setSettings(sorted);
      const nextDrafts: Record<string, string> = {};
      sorted.forEach((row) => {
        nextDrafts[row.setting_key] = row.setting_value;
      });
      setDraftValues(nextDrafts);
    } catch {
      setMessage({ type: 'error', text: 'Unexpected error while loading app settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const hasChanges = useMemo(() => {
    return settings.some((row) => String(draftValues[row.setting_key] ?? '') !== String(row.setting_value ?? ''));
  }, [draftValues, settings]);

  const handleValueChange = (key: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveRow = async (setting: AppSetting) => {
    const nextValue = String(draftValues[setting.setting_key] ?? '').trim();
    if (!nextValue) {
      setMessage({ type: 'error', text: `${setting.setting_key} cannot be empty.` });
      return;
    }

    setSavingKey(setting.setting_key);
    setMessage(null);
    try {
      const response = await supabaseService.updateAppSetting(setting.setting_key, nextValue);
      if (!response.success) {
        setMessage({ type: 'error', text: response.error || `Failed to update ${setting.setting_key}.` });
        return;
      }

      setSettings((prev) => prev.map((row) => (
        row.setting_key === setting.setting_key
          ? { ...row, setting_value: nextValue, updated_at: new Date().toISOString() }
          : row
      )));
      setMessage({ type: 'success', text: `${setting.setting_key} updated.` });
    } catch {
      setMessage({ type: 'error', text: `Unexpected error while updating ${setting.setting_key}.` });
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return <Loader text="Loading settings..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Manage app-wide configuration values used by Team, Cast, and Crew workflows.</p>
        </div>
        <button
          onClick={loadSettings}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      {settings.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
          No settings rows found.
        </div>
      ) : (
        <div className="space-y-3">
          {settings.map((setting) => {
            const isSaving = savingKey === setting.setting_key;
            const currentValue = String(draftValues[setting.setting_key] ?? '');
            const isDirty = currentValue !== String(setting.setting_value ?? '');
            return (
              <section key={setting.setting_key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                  <div className="flex-1">
                    <label className="mb-1 block text-sm font-semibold text-gray-800">{setting.setting_key}</label>
                    <input
                      type="number"
                      value={currentValue}
                      onChange={(event) => handleValueChange(setting.setting_key, event.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                    <p className="mt-1 text-xs text-gray-500">{setting.description || 'No description provided.'}</p>
                  </div>
                  <button
                    onClick={() => handleSaveRow(setting)}
                    disabled={isSaving || !isDirty}
                    className="min-h-[44px] rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </section>
            );
          })}

          <div className="pt-1 text-xs text-gray-500">
            {hasChanges ? 'You have unsaved changes.' : 'All settings are up to date.'}
          </div>
        </div>
      )}
    </div>
  );
};
