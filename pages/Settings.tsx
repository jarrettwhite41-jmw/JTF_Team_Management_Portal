import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { AppSetting, ShowTypes } from '../types';
import { supabaseService } from '../services/supabaseService';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'app' | 'show_types' | 'integrations'>('show_types');
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Show types state
  const [showTypes, setShowTypes] = useState<ShowTypes[]>([]);
  const [draftShowTypes, setDraftShowTypes] = useState<Record<number, string>>({});
  const [savingShowTypeId, setSavingShowTypeId] = useState<number | null>(null);
  const [newShowTypeName, setNewShowTypeName] = useState('');
  const [isAddingShowType, setIsAddingShowType] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [appRes, showTypesRes] = await Promise.all([
        supabaseService.getAppSettings(),
        supabaseService.getAllShowTypes(),
      ]);

      if (appRes.success && appRes.data) {
        const sorted = [...appRes.data].sort((a, b) => a.setting_key.localeCompare(b.setting_key));
        setSettings(sorted);
        const nextDrafts: Record<string, string> = {};
        sorted.forEach((row) => {
          nextDrafts[row.setting_key] = row.setting_value;
        });
        setDraftValues(nextDrafts);
      } else if (appRes.error) {
        setMessage({ type: 'error', text: appRes.error });
      }

      if (showTypesRes.success && showTypesRes.data) {
        setShowTypes(showTypesRes.data);
        const drafts: Record<number, string> = {};
        showTypesRes.data.forEach((st) => {
          drafts[st.ShowTypeID] = st.ShowTypeName;
        });
        setDraftShowTypes(drafts);
      }
    } catch {
      setMessage({ type: 'error', text: 'Unexpected error while loading settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
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

  // Show Type Handlers
  const handleShowTypeNameChange = (id: number, val: string) => {
    setDraftShowTypes((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveShowType = async (st: ShowTypes) => {
    const nextVal = String(draftShowTypes[st.ShowTypeID] ?? '').trim();
    if (!nextVal) {
      setMessage({ type: 'error', text: 'Show type name cannot be empty.' });
      return;
    }

    setSavingShowTypeId(st.ShowTypeID);
    setMessage(null);
    try {
      const res = await supabaseService.updateShowType(st.ShowTypeID, nextVal);
      if (!res.success) {
        setMessage({ type: 'error', text: res.error || 'Failed to update show type.' });
        return;
      }

      setShowTypes((prev) =>
        prev.map((item) =>
          item.ShowTypeID === st.ShowTypeID ? { ...item, ShowTypeName: nextVal } : item
        )
      );
      setMessage({ type: 'success', text: `Show type updated to "${nextVal}".` });
    } catch {
      setMessage({ type: 'error', text: 'Error updating show type.' });
    } finally {
      setSavingShowTypeId(null);
    }
  };

  const handleAddShowType = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newShowTypeName.trim();
    if (!name) return;

    setIsAddingShowType(true);
    setMessage(null);
    try {
      const res = await supabaseService.createShowType(name);
      if (!res.success || !res.data) {
        setMessage({ type: 'error', text: res.error || 'Failed to add show type.' });
        return;
      }

      setShowTypes((prev) => [...prev, res.data!]);
      setDraftShowTypes((prev) => ({ ...prev, [res.data!.ShowTypeID]: res.data!.ShowTypeName }));
      setNewShowTypeName('');
      setMessage({ type: 'success', text: `Added new show type "${name}".` });
    } catch {
      setMessage({ type: 'error', text: 'Error creating show type.' });
    } finally {
      setIsAddingShowType(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading settings..." />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure show types, event alignment names, and application parameters.
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('show_types')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'show_types'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🎭</span> Show Types & Names
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
            {showTypes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('app')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'app'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>⚙️</span> App System Values
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'integrations'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📊</span> Google Sheets & Webhooks
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

      {/* TAB 1: SHOW TYPES & NAMES */}
      {activeTab === 'show_types' && (
        <div className="space-y-6">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
            <p className="font-bold text-sm mb-1 text-blue-950 flex items-center gap-1.5">
              <span>💡</span> Event Matching & Sync Guidance
            </p>
            When syncing tickets from <strong>Eventbrite</strong>, <strong>TicketWeb</strong>, or <strong>Square Door POS</strong> on nights with multiple shows (such as an early and late show), the system matches by date, show time, and these show names. Make sure your show names below align with what you list on Eventbrite (e.g. <em>Friday Night Live</em>, <em>The BIG Show</em>, <em>¡Dale! Impro</em>, <em>Death Match</em>).
          </div>

          {/* Add New Show Type Form */}
          <form
            onSubmit={handleAddShowType}
            className="flex flex-col sm:flex-row gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-xs"
          >
            <input
              type="text"
              value={newShowTypeName}
              onChange={(e) => setNewShowTypeName(e.target.value)}
              placeholder="Add new show name (e.g. Saturday Late Show, Harold Night)..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="submit"
              disabled={isAddingShowType || !newShowTypeName.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAddingShowType ? 'Adding...' : '+ Add Show Type'}
            </button>
          </form>

          {/* Show Types List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Active Show Types</h2>
              <span className="text-xs text-gray-400">Edit any name and click Save to update</span>
            </div>
            <div className="divide-y divide-gray-100">
              {showTypes.map((st) => {
                const draft = draftShowTypes[st.ShowTypeID] ?? st.ShowTypeName;
                const isDirty = draft.trim() !== st.ShowTypeName.trim();
                const isSaving = savingShowTypeId === st.ShowTypeID;

                return (
                  <div
                    key={st.ShowTypeID}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs font-mono text-gray-400 w-8">
                        #{st.ShowTypeID}
                      </span>
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => handleShowTypeNameChange(st.ShowTypeID, e.target.value)}
                        className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleSaveShowType(st)}
                        disabled={isSaving || !isDirty}
                        className="rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save Name'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM CONFIGURATION VALUES */}
      {activeTab === 'app' && (
        <div className="space-y-3">
          {settings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No settings rows found.
            </div>
          ) : (
            settings.map((setting) => {
              const isSaving = savingKey === setting.setting_key;
              const currentValue = String(draftValues[setting.setting_key] ?? '');
              const isDirty = currentValue !== String(setting.setting_value ?? '');
              return (
                <section key={setting.setting_key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
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
                      className="min-h-[40px] rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </section>
              );
            })
          )}

          <div className="pt-1 text-xs text-gray-500">
            {hasChanges ? 'You have unsaved changes.' : 'All system values are up to date.'}
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE SHEETS & INQUIRY INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed space-y-2">
            <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>📋</span> Connected Google Sheets Reference
            </p>
            <p>
              When web visitors fill out the Corporate Rental form or Contact form on the public website, their submissions are captured in your Google Sheets and immediately posted into the Team Management Portal.
            </p>
            <p>
              If you ever replace or recreate either Google Sheet, paste the new Sheet ID or URL here to keep your records updated. Then open the new Sheet, go to <strong>Extensions &rarr; Apps Script</strong>, and paste the webhook script.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rental Sheet Card */}
            {(() => {
              const rentalSetting = settings.find((s) => s.setting_key === 'google_sheet_rental_inquiries_id');
              const currentId = draftValues['google_sheet_rental_inquiries_id'] ?? rentalSetting?.setting_value ?? '';
              const isSaving = savingKey === 'google_sheet_rental_inquiries_id';
              const isDirty = currentId !== (rentalSetting?.setting_value ?? '');

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        🏢 Rental & Corporate Gigs Sheet
                      </span>
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Destination CRM Table: <code className="text-slate-800 font-mono">venue_rentals</code>
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Google Sheet ID or Full URL:
                      </label>
                      <input
                        type="text"
                        value={currentId}
                        onChange={(e) => {
                          const val = e.target.value.includes('/d/')
                            ? e.target.value.split('/d/')[1].split('/')[0]
                            : e.target.value;
                          handleValueChange('google_sheet_rental_inquiries_id', val);
                        }}
                        placeholder="e.g. 10teUHafSmhCu6vofiY9T_RlDYTILFMOxmMjYwH2D_KM"
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {currentId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${currentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                      >
                        🔗 Open Rental Sheet in Google Drive &rarr;
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => rentalSetting && handleSaveRow(rentalSetting)}
                    disabled={isSaving || !isDirty}
                    className="w-full rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Update Rental Sheet ID'}
                  </button>
                </div>
              );
            })()}

            {/* Contact Inquiries Sheet Card */}
            {(() => {
              const contactSetting = settings.find((s) => s.setting_key === 'google_sheet_contact_inquiries_id');
              const currentId = draftValues['google_sheet_contact_inquiries_id'] ?? contactSetting?.setting_value ?? '';
              const isSaving = savingKey === 'google_sheet_contact_inquiries_id';
              const isDirty = currentId !== (contactSetting?.setting_value ?? '');

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        📬 Contact Inquiries Sheet
                      </span>
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Destination CRM Table: <code className="text-slate-800 font-mono">communication_logs</code>
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Google Sheet ID or Full URL:
                      </label>
                      <input
                        type="text"
                        value={currentId}
                        onChange={(e) => {
                          const val = e.target.value.includes('/d/')
                            ? e.target.value.split('/d/')[1].split('/')[0]
                            : e.target.value;
                          handleValueChange('google_sheet_contact_inquiries_id', val);
                        }}
                        placeholder="e.g. 1fbrKTcjTVTiKIyLwHpZk8OrDDxtj64pU0ujd_85Eqvs"
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {currentId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${currentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                      >
                        🔗 Open Contact Sheet in Google Drive &rarr;
                      </a>
                    )}
                  </div>

                  <button
                    onClick={() => contactSetting && handleSaveRow(contactSetting)}
                    disabled={isSaving || !isDirty}
                    className="w-full rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? 'Saving...' : 'Update Contact Sheet ID'}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
