import React, { useState, useRef } from 'react';
import {
  parseStudentInterestSpreadsheet,
  ParsedStudentInterestRow,
} from '../services/spreadsheetImportService';
import { crmService, ClassDemandSummary } from '../services/crmService';
import { Personnel } from '../types';

interface SpreadsheetImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (importedCount: number) => void;
  classDemand: ClassDemandSummary[];
  personnelRoster: Personnel[];
}

export const SpreadsheetImportModal: React.FC<SpreadsheetImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  classDemand,
  personnelRoster,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [targetCycle, setTargetCycle] = useState<string>('Current Cycle');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [parsedRows, setParsedRows] = useState<ParsedStudentInterestRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [skippedRowsCount, setSkippedRowsCount] = useState<number>(0);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsParsing(true);
    setParseErrors([]);
    setParsedRows([]);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = parseStudentInterestSpreadsheet(
        arrayBuffer,
        classDemand,
        personnelRoster,
        targetCycle
      );

      setParsedRows(result.parsedLeads);
      setSkippedRowsCount(result.skippedCount);
      setParseErrors(result.errors);
    } catch (err: any) {
      setParseErrors([err?.message || 'Failed to read file.']);
    } finally {
      setIsParsing(false);
    }
  };

  const handleConfirmImport = async () => {
    if (parsedRows.length === 0) return;
    setIsImporting(true);

    try {
      const recordsToInsert = parsedRows.map((r) => ({
        student_name: r.student_name,
        email: r.email,
        phone: r.phone || null,
        student_type: r.student_type,
        personnel_id: r.matched_personnel_id || null,
        class_level_id: r.class_level_id,
        target_cycle: targetCycle,
        preferred_days: r.preferred_days || null,
        preferred_time: r.preferred_time || null,
        notes: r.notes || null,
        status: r.status,
        lead_source: 'spreadsheet_import',
        lead_owner: 'Operations / Box Office',
      }));

      await crmService.bulkCreateStudentInterestLeads(recordsToInsert);
      onSuccess(recordsToInsert.length);
      onClose();
    } catch (err: any) {
      setParseErrors([err?.message || 'Failed to save leads to database.']);
    } finally {
      setIsImporting(false);
    }
  };

  const filteredPreview = parsedRows.filter((r) => {
    if (!searchFilter) return true;
    const term = searchFilter.toLowerCase();
    return (
      r.student_name.toLowerCase().includes(term) ||
      r.email.toLowerCase().includes(term) ||
      r.level_name.toLowerCase().includes(term) ||
      (r.notes && r.notes.toLowerCase().includes(term))
    );
  });

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div>
            <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <span>📊 Import Legacy Student Interest Spreadsheet</span>
              <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
                .CSV or .XLSX
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Bulk-ingests legacy course demand sheets, maps interest matrix columns to class levels, and auto-links existing personnel records.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        {/* Configuration Bar */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Spreadsheet File:
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-600 file:text-white hover:file:bg-amber-700 cursor-pointer"
            />
            {fileName && (
              <p className="text-[11px] text-slate-500 mt-1">
                Selected: <span className="font-semibold text-slate-700">{fileName}</span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assign to Target Cycle:
            </label>
            <input
              type="text"
              value={targetCycle}
              onChange={(e) => setTargetCycle(e.target.value)}
              placeholder="e.g. Oct 2026 / Next Cycle"
              className="w-full border border-slate-300 rounded-lg p-2 text-xs bg-white"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Used by the Season Planner to aggregate demand across cycle classes.
            </p>
          </div>
        </div>

        {/* Parse Status / Errors */}
        {parseErrors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700 shrink-0">
            <strong>Import Error:</strong>
            <ul className="list-disc ml-4 mt-1">
              {parseErrors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {isParsing && (
          <div className="py-12 text-center text-slate-500 text-sm">
            ⏳ Analyzing spreadsheet columns and student rows...
          </div>
        )}

        {/* Preview Summary & Table */}
        {!isParsing && parsedRows.length > 0 && (
          <div className="flex-1 min-h-0 flex flex-col space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 shrink-0 bg-amber-50/60 border border-amber-200 p-2.5 rounded-lg">
              <div>
                Found <strong className="text-amber-900">{parsedRows.length}</strong> active interest lead records from file ({skippedRowsCount} empty/header rows skipped).
              </div>
              <input
                type="text"
                placeholder="Filter preview..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="border border-amber-300 rounded-md px-2 py-1 text-xs bg-white w-48"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 text-[11px] font-semibold text-slate-600 uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Student Name</th>
                    <th className="py-2.5 px-3">Email</th>
                    <th className="py-2.5 px-3">Course / Track</th>
                    <th className="py-2.5 px-3">Days</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Directory Link</th>
                    <th className="py-2.5 px-3">Notes & Payment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredPreview.slice(0, 100).map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-semibold text-slate-900">{row.student_name}</td>
                      <td className="py-2 px-3 text-slate-600">{row.email || '—'}</td>
                      <td className="py-2 px-3">
                        <span className="font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded text-[11px]">
                          {row.level_name}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-600">{row.preferred_days || 'Flexible'}</td>
                      <td className="py-2 px-3 capitalize">
                        <span
                          className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                            row.status === 'enrolled'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status === 'contacted'
                              ? 'bg-blue-100 text-blue-800'
                              : row.status === 'follow_up_needed'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        {row.matched_personnel_name ? (
                          <span className="text-[11px] text-blue-700 font-semibold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                            👤 {row.matched_personnel_name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">New Prospect</span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate" title={row.notes}>
                        {row.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredPreview.length > 100 && (
                <div className="p-2 text-center text-slate-400 text-[11px] border-t bg-slate-50">
                  Showing first 100 preview rows of {filteredPreview.length} matching leads...
                </div>
              )}
            </div>
          </div>
        )}

        {!isParsing && parsedRows.length === 0 && !fileName && (
          <div className="py-12 border-2 border-dashed border-slate-200 rounded-xl text-center space-y-2">
            <div className="text-3xl">📁</div>
            <div className="font-semibold text-sm text-slate-700">Upload your legacy JTF interest sheet</div>
            <div className="text-xs text-slate-500 max-w-sm mx-auto">
              Select or drop your JTF Improv Interest spreadsheet (e.g. <code>JTF Improv Interest - Oct 2026.csv</code>). The importer will automatically map student rows, class level matrix columns, payments, and notes.
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            {parsedRows.length > 0 && (
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={isImporting}
                className="px-4 py-2 bg-emerald-600 rounded-lg text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {isImporting ? 'Ingesting Leads...' : `Confirm & Ingest ${parsedRows.length} Leads`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
