import React, { useEffect, useMemo, useState } from 'react';
import { Message } from '../common/Message';
import { ShowEditModal } from './ShowEditModal';
import { gasService } from '../../services/googleAppsScript';
import { ShowWithDetails, ShowPerformances, CrewDutyTypes } from '../../types';

interface ShowManagementModalProps {
  isOpen: boolean;
  show: ShowWithDetails;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'details' | 'cast' | 'crew';

type CastOption = {
  CastMemberID: number;
  FullName: string;
  PrimaryEmail: string;
};

type PersonnelOption = {
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
};

type CrewAssignment = {
  DutyID: number;
  ShowID: number;
  PersonnelID: number;
  CrewDutyTypeID: number;
  FullName: string;
  PrimaryEmail: string;
  DutyName: string;
};

export const ShowManagementModal: React.FC<ShowManagementModalProps> = ({ isOpen, show, onClose, onSaved }) => {
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEditOpen, setShowEditOpen] = useState(false);
  const [availableCast, setAvailableCast] = useState<CastOption[]>([]);
  const [selectedCastIds, setSelectedCastIds] = useState<Set<number>>(new Set());
  const [currentCrew, setCurrentCrew] = useState<CrewAssignment[]>([]);
  const [personnelOptions, setPersonnelOptions] = useState<PersonnelOption[]>([]);
  const [crewDutyTypes, setCrewDutyTypes] = useState<CrewDutyTypes[]>([]);
  const [crewForm, setCrewForm] = useState({ PersonnelID: '', CrewDutyTypeID: '' });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    loadData();
  }, [isOpen, show.ShowID]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [castResponse, performancesResponse, crewResponse, personnelResponse, dutyTypesResponse] = await Promise.all([
        gasService.getAllCastMembers(),
        gasService.getShowPerformances(show.ShowID),
        gasService.getShowCrew(show.ShowID),
        gasService.getAllPersonnel(),
        gasService.getAllCrewDutyTypes(),
      ]);

      const castRows = Array.isArray(castResponse.data) ? castResponse.data : (castResponse.data as any)?.data || [];
      const performanceRows = Array.isArray(performancesResponse.data) ? performancesResponse.data : (performancesResponse.data as any)?.data || [];
      const crewRows = Array.isArray(crewResponse.data) ? crewResponse.data : (crewResponse.data as any)?.data || [];
      const personnelRows = Array.isArray(personnelResponse.data) ? personnelResponse.data : (personnelResponse.data as any)?.data || [];
      const dutyTypeRows = Array.isArray(dutyTypesResponse.data) ? dutyTypesResponse.data : (dutyTypesResponse.data as any)?.data || [];

      if (castResponse.success) {
        setAvailableCast(castRows.map((member: any) => ({
          CastMemberID: member.CastMemberID,
          FullName: member.FullName || `${member.FirstName || ''} ${member.LastName || ''}`.trim(),
          PrimaryEmail: member.PrimaryEmail || '',
        })));
      }

      if (performancesResponse.success) {
        setSelectedCastIds(new Set(performanceRows.map((row: ShowPerformances | any) => row.CastMemberID)));
      }

      if (crewResponse.success) {
        setCurrentCrew(crewRows.map((row: any) => ({
          DutyID: row.DutyID,
          ShowID: row.ShowID,
          PersonnelID: row.PersonnelID,
          CrewDutyTypeID: row.CrewDutyTypeID,
          FullName: row.FullName || `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
          PrimaryEmail: row.PrimaryEmail || '',
          DutyName: row.DutyName || 'Crew',
        })));
      }

      if (personnelResponse.success) {
        setPersonnelOptions(personnelRows.map((person: any) => ({
          PersonnelID: person.PersonnelID,
          FirstName: person.FirstName,
          LastName: person.LastName,
          PrimaryEmail: person.PrimaryEmail,
        })));
      }

      if (dutyTypesResponse.success) {
        setCrewDutyTypes(dutyTypeRows || []);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const castCounts = useMemo(() => ({ selected: selectedCastIds.size, total: availableCast.length }), [selectedCastIds, availableCast.length]);

  const toggleCast = (castMemberId: number) => {
    setSelectedCastIds(prev => {
      const next = new Set(prev);
      if (next.has(castMemberId)) next.delete(castMemberId);
      else next.add(castMemberId);
      return next;
    });
  };

  const handleSaveCast = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const selected = availableCast
        .filter(member => selectedCastIds.has(member.CastMemberID))
        .map(member => ({ ShowID: show.ShowID, CastMemberID: member.CastMemberID, Role: 'Cast Member' } as ShowPerformances));

      const response = await gasService.updateShowCast(show.ShowID, selected);
      if (response.success) {
        setMessage({ type: 'success', text: 'Show cast updated successfully' });
        onSaved();
        await loadData();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to update cast' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error updating cast' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddCrewMember = async () => {
    if (!crewForm.PersonnelID || !crewForm.CrewDutyTypeID) return;
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await gasService.addPersonAsCrewMember(Number(crewForm.PersonnelID), show.ShowID, Number(crewForm.CrewDutyTypeID));
      if (response.success) {
        setMessage({ type: 'success', text: 'Crew member added successfully' });
        setCrewForm({ PersonnelID: '', CrewDutyTypeID: '' });
        onSaved();
        await loadData();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to add crew member' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding crew member' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveCrewMember = async (dutyId: number) => {
    if (!confirm('Remove this crew assignment?')) return;
    setIsLoading(true);
    try {
      const response = await gasService.removeCrewMember(dutyId);
      if (response.success) {
        setMessage({ type: 'success', text: 'Crew member removed successfully' });
        onSaved();
        await loadData();
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to remove crew member' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing crew member' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{show.ShowTypeName || 'Show'} #{show.ShowID}</h2>
            <p className="text-sm text-gray-500">{show.Venue} • {show.DirectorName || 'TBD'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditOpen(true)}
              className="rounded-lg border border-primary-300 px-3 py-2 text-sm text-primary-600 hover:bg-primary-50 transition-colors"
            >
              Edit Details
            </button>
            <button onClick={onClose} className="text-2xl font-bold text-gray-400 hover:text-gray-600">×</button>
          </div>
        </div>

        {message && (
          <div className="px-6 pt-4">
            <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />
          </div>
        )}

        <div className="border-b border-gray-200 px-6 pt-4">
          <div className="flex gap-4">
            <button onClick={() => setActiveTab('details')} className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Details</button>
            <button onClick={() => setActiveTab('cast')} className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'cast' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Cast ({castCounts.selected})</button>
            <button onClick={() => setActiveTab('crew')} className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'crew' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Crew ({currentCrew.length})</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading show details...</div>
          ) : activeTab === 'details' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Show Date</div><div className="text-gray-900">{new Date(show.ShowDate).toLocaleDateString()}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Show Time</div><div className="text-gray-900">{show.ShowTime}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Status</div><div className="text-gray-900">{show.Status}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Venue</div><div className="text-gray-900">{show.Venue}</div></div>
              <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2"><div className="font-medium text-gray-500">Cast Members</div><div className="mt-2 text-gray-900">{show.CastMembers && show.CastMembers.length > 0 ? show.CastMembers.map((member: any, index) => <span key={index} className="mr-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">{member.FirstName} {member.LastName}</span>) : 'No cast assigned'}</div></div>
              <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2"><div className="font-medium text-gray-500">Crew Members</div><div className="mt-2 text-gray-900">{show.CrewMembers && show.CrewMembers.length > 0 ? show.CrewMembers.map((member: any, index) => <span key={index} className="mr-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{member.FirstName} {member.LastName}</span>) : 'No crew assigned'}</div></div>
            </div>
          ) : activeTab === 'cast' ? (
            <>
              <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={availableCast.length > 0 && availableCast.every(member => selectedCastIds.has(member.CastMemberID))} onChange={(e) => setSelectedCastIds(e.target.checked ? new Set(availableCast.map(member => member.CastMemberID)) : new Set())} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  Select all cast ({availableCast.length})
                </label>
                <span className="text-sm font-medium text-primary-600">{selectedCastIds.size} selected</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableCast.map(member => (
                  <label key={member.CastMemberID} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selectedCastIds.has(member.CastMemberID) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <input type="checkbox" checked={selectedCastIds.has(member.CastMemberID)} onChange={() => toggleCast(member.CastMemberID)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                    <div className="min-w-0"><div className="font-medium text-gray-900">{member.FullName}</div><div className="text-xs text-gray-500">{member.PrimaryEmail}</div></div>
                  </label>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Personnel</label>
                  <select value={crewForm.PersonnelID} onChange={(e) => setCrewForm(prev => ({ ...prev, PersonnelID: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Select person</option>
                    {personnelOptions.map(person => <option key={person.PersonnelID} value={person.PersonnelID}>{person.FirstName} {person.LastName}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Crew Duty</label>
                  <select value={crewForm.CrewDutyTypeID} onChange={(e) => setCrewForm(prev => ({ ...prev, CrewDutyTypeID: e.target.value }))} className="w-full rounded-lg border border-gray-300 px-3 py-2">
                    <option value="">Select duty</option>
                    {crewDutyTypes.map(type => <option key={type.CrewDutyTypeID} value={type.CrewDutyTypeID}>{type.DutyName}</option>)}
                  </select>
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddCrewMember} disabled={isLoading || !crewForm.PersonnelID || !crewForm.CrewDutyTypeID} className="w-full rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 disabled:opacity-50">Add Crew Member</button>
                </div>
              </div>
              <div className="space-y-2">
                {currentCrew.length > 0 ? currentCrew.map(member => (
                  <div key={member.DutyID} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{member.FullName}</div>
                      <div className="text-xs text-gray-500">{member.DutyName}</div>
                    </div>
                    <button onClick={() => handleRemoveCrewMember(member.DutyID)} className="text-xs px-2 py-1 text-red-600 border border-red-300 rounded hover:bg-red-50">Remove</button>
                  </div>
                )) : <p className="text-gray-500 text-sm">No crew assigned.</p>}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
          <div>{activeTab === 'cast' && <button onClick={handleSaveCast} disabled={isLoading} className="rounded-lg bg-primary-600 px-4 py-2 text-white hover:bg-primary-700 transition-colors disabled:opacity-50">Save Cast</button>}</div>
          <button onClick={onClose} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 transition-colors">Close</button>
        </div>
      </div>

      <ShowEditModal isOpen={showEditOpen} show={show} onClose={() => setShowEditOpen(false)} onSaved={() => { setShowEditOpen(false); onSaved(); }} />
    </div>
  );
};