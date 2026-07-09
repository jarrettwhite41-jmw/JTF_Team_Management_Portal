import React, { useEffect, useMemo, useState } from 'react';
import { Message } from '../common/Message';
import { ShowEditModal } from './ShowEditModal';
import { gasService } from '../../services/googleAppsScript';
import { ShowWithDetails, ShowPerformances, CrewDutyTypes, MasterGame, ShowGame, BartenderWithDetails } from '../../types';

interface ShowManagementModalProps {
  isOpen: boolean;
  show: ShowWithDetails;
  onClose: () => void;
  onSaved: () => void;
}

type Tab = 'details' | 'cast' | 'crew' | 'games';

type CastOption = {
  CastMemberID: number;
  PersonnelID: number;
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

type EditableShowGame = {
  localId: string;
  gameId?: number | null;
  customName: string;
  variation: string;
  flag: boolean;
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
  const [bartenderOptions, setBartenderOptions] = useState<PersonnelOption[]>([]);
  const [crewDutyTypes, setCrewDutyTypes] = useState<CrewDutyTypes[]>([]);
  const [crewAssignments, setCrewAssignments] = useState<Map<number, number>>(new Map());
  const [castSearch, setCastSearch] = useState('');
  const [crewSearch, setCrewSearch] = useState('');
  const [masterGames, setMasterGames] = useState<MasterGame[]>([]);
  const [showGames, setShowGames] = useState<EditableShowGame[]>([]);
  const [gameSearch, setGameSearch] = useState('');

  const sortByName = (a: string, b: string) => a.localeCompare(b, undefined, { sensitivity: 'base' });
  const isCompletedShow = useMemo(() => {
    const rawDate = String(show.ShowDate || '').slice(0, 10);
    const showDate = new Date(`${rawDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(showDate.getTime()) && showDate.getTime() < today.getTime();
  }, [show.ShowDate]);

  const createEmptyGame = (): EditableShowGame => ({
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    gameId: null,
    customName: '',
    variation: '',
    flag: false,
  });

  useEffect(() => {
    if (!isOpen) return;
    setActiveTab('details');
    loadData();
  }, [isOpen, show.ShowID]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [castResponse, performancesResponse, crewResponse, dutyTypesResponse, bartendersResponse] = await Promise.all([
        gasService.getAllCastMembers(),
        gasService.getShowPerformances(show.ShowID),
        gasService.getShowCrew(show.ShowID),
        gasService.getAllCrewDutyTypes(),
        gasService.getBartendersWithDetails(),
      ]);

      const [gamesResponse, showGamesResponse] = isCompletedShow
        ? await Promise.all([
            gasService.getAllGames(),
            gasService.getShowGames(show.ShowID),
          ])
        : [{ success: true, data: [] }, { success: true, data: [] }];

      const castRows = Array.isArray(castResponse.data) ? castResponse.data : (castResponse.data as any)?.data || [];
      const performanceRows = Array.isArray(performancesResponse.data) ? performancesResponse.data : (performancesResponse.data as any)?.data || [];
      const crewRows = Array.isArray(crewResponse.data) ? crewResponse.data : (crewResponse.data as any)?.data || [];
      const dutyTypeRows = Array.isArray(dutyTypesResponse.data) ? dutyTypesResponse.data : (dutyTypesResponse.data as any)?.data || [];
      const bartenderRows = Array.isArray(bartendersResponse.data) ? bartendersResponse.data : (bartendersResponse.data as any)?.data || [];

      if (castResponse.success) {
        const mappedCast = castRows.map((member: any) => ({
          CastMemberID: member.CastMemberID,
          PersonnelID: member.PersonnelID,
          FullName: member.FullName || `${member.FirstName || ''} ${member.LastName || ''}`.trim(),
          PrimaryEmail: member.PrimaryEmail || '',
        }));
        mappedCast.sort((a: CastOption, b: CastOption) => sortByName(a.FullName, b.FullName));
        setAvailableCast(mappedCast);
      }

      if (performancesResponse.success) {
        setSelectedCastIds(new Set(performanceRows.map((row: any) => row.PersonnelID).filter(Boolean)));
      }

      if (crewResponse.success) {
        const crewMap = new Map<number, number>();
        crewRows.forEach((row: any) => {
          crewMap.set(row.CrewDutyTypeID, row.PersonnelID);
        });
        setCrewAssignments(crewMap);
        const mappedCrew = crewRows.map((row: any) => ({
          DutyID: row.DutyID,
          ShowID: row.ShowID,
          PersonnelID: row.PersonnelID,
          CrewDutyTypeID: row.CrewDutyTypeID,
          FullName: row.FullName || `${row.FirstName || ''} ${row.LastName || ''}`.trim(),
          PrimaryEmail: row.PrimaryEmail || '',
          DutyName: row.DutyName || 'Crew',
        }));
        mappedCrew.sort((a: CrewAssignment, b: CrewAssignment) => sortByName(a.FullName, b.FullName));
        setCurrentCrew(mappedCrew);
      }

      if (castResponse.success) {
        const mappedPersonnel = castRows.map((member: any) => ({
          PersonnelID: member.PersonnelID,
          FirstName: member.FirstName,
          LastName: member.LastName,
          PrimaryEmail: member.PrimaryEmail,
        }));
        mappedPersonnel.sort((a: PersonnelOption, b: PersonnelOption) => sortByName(`${a.FirstName || ''} ${a.LastName || ''}`.trim(), `${b.FirstName || ''} ${b.LastName || ''}`.trim()));
        setPersonnelOptions(mappedPersonnel);
      }

      if (bartendersResponse.success) {
        const mappedBartenders = bartenderRows.map((bartender: BartenderWithDetails) => ({
          PersonnelID: bartender.PersonnelID,
          FirstName: bartender.FirstName,
          LastName: bartender.LastName,
          PrimaryEmail: bartender.PrimaryEmail,
        }));
        mappedBartenders.sort((a: PersonnelOption, b: PersonnelOption) => sortByName(`${a.FirstName || ''} ${a.LastName || ''}`.trim(), `${b.FirstName || ''} ${b.LastName || ''}`.trim()));
        setBartenderOptions(mappedBartenders);
      }

      if (dutyTypesResponse.success) {
        setCrewDutyTypes(dutyTypeRows || []);
      }

      if (gamesResponse.success) {
        const rows = Array.isArray(gamesResponse.data) ? gamesResponse.data : (gamesResponse.data as any)?.data || [];
        const sortedGames = [...rows].sort((a: MasterGame, b: MasterGame) => sortByName(a.GameName, b.GameName));
        setMasterGames(sortedGames);
      }

      if (showGamesResponse.success) {
        const rows = Array.isArray(showGamesResponse.data) ? showGamesResponse.data : (showGamesResponse.data as any)?.data || [];
        setShowGames(rows.length > 0
          ? rows.map((game: ShowGame) => ({
              localId: String(game.GamesPlayedID || `${game.ShowID}-${game.GameID || 'custom'}`),
              gameId: game.GameID ?? null,
              customName: game.CustomGameName || '',
              variation: game.GameVariationNotes || game.Notes || '',
              flag: Boolean(game.FlagForMasterList),
            }))
          : [createEmptyGame()]);
      } else if (isCompletedShow) {
        setShowGames([createEmptyGame()]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const castCounts = useMemo(() => ({ selected: selectedCastIds.size, total: availableCast.length }), [selectedCastIds, availableCast.length]);
  const castPersonnelIds = useMemo(() => new Set(availableCast.map((member) => member.PersonnelID)), [availableCast]);
  const allPersonnelById = useMemo(() => {
    const entries = [...personnelOptions, ...bartenderOptions];
    const map = new Map<number, PersonnelOption>();
    entries.forEach((person) => {
      if (!map.has(person.PersonnelID)) {
        map.set(person.PersonnelID, person);
      }
    });
    return map;
  }, [personnelOptions, bartenderOptions]);

  const toggleCast = (castMemberId: number) => {
    setSelectedCastIds(prev => {
      const next = new Set(prev);
      if (next.has(castMemberId)) next.delete(castMemberId);
      else next.add(castMemberId);
      return next;
    });
  };

  const handleCrewAssignmentChange = (dutyTypeId: number, personnelId: string) => {
    setCrewAssignments(prev => {
      const next = new Map(prev);
      if (personnelId) {
        next.set(dutyTypeId, Number(personnelId));
      } else {
        next.delete(dutyTypeId);
      }
      return next;
    });
  };

  const handleSaveCrew = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const selectedCast = availableCast
        .filter(member => selectedCastIds.has(member.PersonnelID))
        .map(member => ({
          ShowID: show.ShowID,
          CastMemberID: member.CastMemberID,
          PersonnelID: member.PersonnelID,
          Role: 'Cast Member',
        } as ShowPerformances & { PersonnelID: number }));

      const castResponse = await gasService.updateShowCast(show.ShowID, selectedCast);
      if (!castResponse.success) {
        throw new Error(castResponse.error || 'Failed to update cast');
      }

      const assignmentsToRemove = currentCrew.filter(crew => !crewAssignments.has(crew.CrewDutyTypeID));
      for (const assignment of assignmentsToRemove) {
        await gasService.removeCrewMember(assignment.DutyID);
      }

      const assignmentsToAdd = Array.from(crewAssignments.entries())
        .filter(([dutyTypeId]) => !currentCrew.find(crew => crew.CrewDutyTypeID === dutyTypeId));
      for (const [dutyTypeId, personnelId] of assignmentsToAdd) {
        await gasService.addPersonAsCrewMember(personnelId, show.ShowID, dutyTypeId);
      }

      setMessage({ type: 'success', text: 'Cast and crew assignments saved successfully' });
      onSaved();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving cast and crew assignments' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGameChange = (localId: string, updates: Partial<EditableShowGame>) => {
    setShowGames(prev => prev.map(game => game.localId === localId ? { ...game, ...updates } : game));
  };

  const handleAddGameRow = () => {
    setShowGames(prev => [...prev, createEmptyGame()]);
  };

  const handleRemoveGameRow = (localId: string) => {
    setShowGames(prev => {
      const remaining = prev.filter(game => game.localId !== localId);
      return remaining.length > 0 ? remaining : [createEmptyGame()];
    });
  };

  const handleMoveGameUp = (localId: string) => {
    setShowGames(prev => {
      const index = prev.findIndex(game => game.localId === localId);
      if (index <= 0) return prev;
      const newGames = [...prev];
      [newGames[index - 1], newGames[index]] = [newGames[index], newGames[index - 1]];
      return newGames;
    });
  };

  const handleMoveGameDown = (localId: string) => {
    setShowGames(prev => {
      const index = prev.findIndex(game => game.localId === localId);
      if (index >= prev.length - 1) return prev;
      const newGames = [...prev];
      [newGames[index], newGames[index + 1]] = [newGames[index + 1], newGames[index]];
      return newGames;
    });
  };

  const handleSaveGames = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const payload = showGames
        .map(game => ({
          gameId: game.gameId || null,
          customName: game.customName.trim() || null,
          variation: game.variation.trim() || null,
          flag: game.flag,
        }))
        .filter(game => game.gameId || game.customName);

      const response = await gasService.updateShowGames(show.ShowID, payload);
      if (!response.success) {
        throw new Error(response.error || 'Failed to save games played');
      }

      setMessage({ type: 'success', text: 'Games played saved successfully' });
      onSaved();
      await loadData();
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Error saving games played' });
    } finally {
      setIsLoading(false);
    }
  };

  const getAssignedPersonnelIds = () => {
    const assigned = new Set<number>();
    crewAssignments.forEach((personnelId) => assigned.add(personnelId));
    return assigned;
  };

  const getSelectedCastPersonnelIds = () => {
    return new Set(Array.from(selectedCastIds));
  };

  const isPersonnelInCast = (personnelId?: number | null) => {
    return Boolean(personnelId && castPersonnelIds.has(personnelId));
  };

  const isBartenderDuty = (dutyTypeId: number) => {
    const dutyName = crewDutyTypes.find(type => type.CrewDutyTypeID === dutyTypeId)?.DutyName || '';
    const normalizedDutyName = dutyName.trim().toLowerCase();
    return normalizedDutyName.includes('bartender') || normalizedDutyName === 'bar';
  };

  const isExternalBartenderAssignment = (dutyTypeId: number, personnelId?: number | null) => {
    return Boolean(personnelId && isBartenderDuty(dutyTypeId) && !isPersonnelInCast(personnelId));
  };

  const countedCrewAssignments = useMemo(() => {
    return crewDutyTypes.flatMap((dutyType) => {
      const assignedPersonnelId = crewAssignments.get(dutyType.CrewDutyTypeID);
      if (!assignedPersonnelId || isExternalBartenderAssignment(dutyType.CrewDutyTypeID, assignedPersonnelId)) {
        return [];
      }

      const person = allPersonnelById.get(assignedPersonnelId);
      const existingAssignment = currentCrew.find((crew) => crew.CrewDutyTypeID === dutyType.CrewDutyTypeID);
      const fullName = person
        ? `${person.FirstName || ''} ${person.LastName || ''}`.trim()
        : existingAssignment?.FullName || 'Assigned';

      return [{
        PersonnelID: assignedPersonnelId,
        FullName: fullName,
        DutyName: dutyType.DutyName,
      }];
    });
  }, [allPersonnelById, crewAssignments, crewDutyTypes, currentCrew, castPersonnelIds]);

  const getAvailablePersonnelForDuty = (dutyTypeId: number) => {
    const assignedIds = getAssignedPersonnelIds();
    const selectedCastIds = getSelectedCastPersonnelIds();
    const currentAssignment = crewAssignments.get(dutyTypeId);
    const query = crewSearch.trim().toLowerCase();
    const isBartender = isBartenderDuty(dutyTypeId);
    const sourceOptions = isBartender ? bartenderOptions : personnelOptions;
    return sourceOptions.filter(p => 
      (!assignedIds.has(p.PersonnelID) || p.PersonnelID === currentAssignment) &&
      (isBartender || !selectedCastIds.has(p.PersonnelID) || p.PersonnelID === currentAssignment) &&
      (!query || `${p.FirstName || ''} ${p.LastName || ''}`.toLowerCase().includes(query))
    );
  };

  const getAvailableCastMembers = () => {
    const crewPersonnelIds = getAssignedPersonnelIds();
    const query = castSearch.trim().toLowerCase();
    return availableCast.filter(member => 
      !crewPersonnelIds.has(member.PersonnelID) &&
      (!query || member.FullName.toLowerCase().includes(query) || member.PrimaryEmail.toLowerCase().includes(query))
    );
  };

  const getFilteredMasterGames = (selectedGameId?: number | null) => {
    const query = gameSearch.trim().toLowerCase();
    return masterGames.filter(game =>
      game.GameID === selectedGameId ||
      !query ||
      game.GameName.toLowerCase().includes(query) ||
      (game.Category || '').toLowerCase().includes(query)
    );
  };

  if (!isOpen) return null;

  const formatDate = (value: Date | string | undefined) => {
    if (!value) return 'TBD';
    const raw = String(value).slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(Number(raw.slice(0, 4)), Number(raw.slice(5, 7)) - 1, Number(raw.slice(8, 10)))
      : new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  };

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
            <button onClick={() => setActiveTab('crew')} className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'crew' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Crew ({countedCrewAssignments.length})</button>
            {isCompletedShow && <button onClick={() => setActiveTab('games')} className={`pb-3 px-2 font-medium border-b-2 transition-colors ${activeTab === 'games' ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Games ({showGames.filter(game => game.gameId || game.customName.trim()).length})</button>}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="py-12 text-center text-gray-500">Loading show details...</div>
          ) : activeTab === 'details' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-gray-700">
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Show Date</div><div className="text-gray-900">{formatDate(show.ShowDate)}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Show Time</div><div className="text-gray-900">{show.ShowTime}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Status</div><div className="text-gray-900">{show.Status}</div></div>
              <div className="rounded-lg border border-gray-200 p-4"><div className="font-medium text-gray-500">Venue</div><div className="text-gray-900">{show.Venue}</div></div>
              <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2"><div className="font-medium text-gray-500">Cast Members</div><div className="mt-2 text-gray-900">{availableCast.filter(m => selectedCastIds.has(m.PersonnelID)).length > 0 ? availableCast.filter(m => selectedCastIds.has(m.PersonnelID)).map((member, index) => <span key={index} className="mr-2 inline-block rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800">{member.FullName}</span>) : 'No cast assigned'}</div></div>
              <div className="rounded-lg border border-gray-200 p-4 sm:col-span-2"><div className="font-medium text-gray-500">Crew Members</div><div className="mt-2 text-gray-900">{countedCrewAssignments.length > 0 ? countedCrewAssignments.map((member, index) => <span key={`${member.PersonnelID}-${member.DutyName}-${index}`} className="mr-2 inline-block rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">{member.FullName} ({member.DutyName})</span>) : 'No crew assigned'}</div></div>
            </div>
          ) : activeTab === 'crew' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Crew Member</label>
                <input
                  type="text"
                  value={crewSearch}
                  onChange={(e) => setCrewSearch(e.target.value)}
                  placeholder="Type a name to filter crew options..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="space-y-3">
                {crewDutyTypes.map(dutyType => {
                  const assignedPersonnelId = crewAssignments.get(dutyType.CrewDutyTypeID);
                  const assignedPerson = [...personnelOptions, ...bartenderOptions].find(p => p.PersonnelID === assignedPersonnelId);
                  const availablePersonnel = getAvailablePersonnelForDuty(dutyType.CrewDutyTypeID);
                  const isExternalBartender = isExternalBartenderAssignment(dutyType.CrewDutyTypeID, assignedPersonnelId);
                  return (
                    <div key={dutyType.CrewDutyTypeID} className={`flex items-end gap-3 rounded-lg border p-4 ${isExternalBartender ? 'border-sky-200 bg-sky-50' : 'border-gray-200'}`}>
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{dutyType.DutyName}</label>
                        <select value={assignedPersonnelId || ''} onChange={(e) => handleCrewAssignmentChange(dutyType.CrewDutyTypeID, e.target.value)} disabled={isLoading} className={`w-full rounded-lg border px-3 py-2 ${isExternalBartender ? 'border-sky-300 bg-sky-50 text-sky-900' : 'border-gray-300'}`}>
                          <option value="">Unassigned</option>
                          {availablePersonnel.map(person => <option key={person.PersonnelID} value={person.PersonnelID}>{person.FirstName} {person.LastName}</option>)}
                        </select>
                        {isExternalBartender && (
                          <p className="mt-2 text-xs text-sky-700">This bartender is not in the cast, so this assignment will not count toward crew totals.</p>
                        )}
                      </div>
                      {assignedPerson && (
                        <div className="text-xs text-gray-500 text-right pb-2 min-w-[100px]">
                          {assignedPerson.PrimaryEmail}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
                <button onClick={handleSaveCrew} disabled={isLoading} className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
                  Save Crew Assignments
                </button>
              </div>
            </>
          ) : activeTab === 'games' ? (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Master Game List</label>
                <input
                  type="text"
                  value={gameSearch}
                  onChange={(e) => setGameSearch(e.target.value)}
                  placeholder="Type a game name or category..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="space-y-4">
                {showGames.map((game, index) => {
                  const filteredGames = getFilteredMasterGames(game.gameId);
                  const isFirst = index === 0;
                  const isLast = index === showGames.length - 1;
                  return (
                    <div key={game.localId} className="rounded-lg border border-gray-200 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium text-gray-900">Game {index + 1}</h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleMoveGameUp(game.localId)}
                            disabled={isFirst}
                            title="Move game up in the setlist"
                            className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-300 hover:disabled:text-gray-300 transition-colors"
                          >
                            ↑ Up
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGameDown(game.localId)}
                            disabled={isLast}
                            title="Move game down in the setlist"
                            className="px-2 py-1 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-300 hover:disabled:text-gray-300 transition-colors"
                          >
                            ↓ Down
                          </button>
                          <button type="button" onClick={() => handleRemoveGameRow(game.localId)} className="px-2 py-1 text-sm text-red-600 hover:text-red-700">Remove</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Master Game</label>
                          <select
                            value={game.gameId || ''}
                            onChange={(e) => handleGameChange(game.localId, { gameId: e.target.value ? Number(e.target.value) : null })}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          >
                            <option value="">Select a game</option>
                            {filteredGames.map(masterGame => (
                              <option key={masterGame.GameID} value={masterGame.GameID}>{masterGame.GameName}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Game Name</label>
                          <input
                            type="text"
                            value={game.customName}
                            onChange={(e) => handleGameChange(game.localId, { customName: e.target.value, gameId: e.target.value ? null : game.gameId })}
                            placeholder="Add a custom game if not in the list"
                            className="w-full rounded-lg border border-gray-300 px-3 py-2"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Variation / Notes</label>
                        <input
                          type="text"
                          value={game.variation}
                          onChange={(e) => handleGameChange(game.localId, { variation: e.target.value })}
                          placeholder="Optional notes, variation, or setup details"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2"
                        />
                      </div>
                      <label className="flex items-center gap-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={game.flag}
                          onChange={(e) => handleGameChange(game.localId, { flag: e.target.checked })}
                          disabled={!game.customName.trim()}
                          className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        Add custom game to master list
                      </label>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-between gap-2 border-t border-gray-200 pt-4">
                <button type="button" onClick={handleAddGameRow} className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50">
                  Add Another Game
                </button>
                <button onClick={handleSaveGames} disabled={isLoading} className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
                  Save Games Played
                </button>
              </div>
            </>
          ) : activeTab === 'cast' ? (
          <>
            <div className="mb-3 flex items-center justify-between border-b border-gray-200 pb-3">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={getAvailableCastMembers().length > 0 && getAvailableCastMembers().every(member => selectedCastIds.has(member.PersonnelID))} onChange={(e) => setSelectedCastIds(e.target.checked ? new Set(getAvailableCastMembers().map(member => member.PersonnelID)) : new Set())} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <span>Select all cast ({getAvailableCastMembers().length})</span>
                </div>
                <span className="text-sm font-medium text-primary-600">{selectedCastIds.size} selected</span>
              </div>
              <div className="mb-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Cast Member</label>
                <input
                  type="text"
                  value={castSearch}
                  onChange={(e) => setCastSearch(e.target.value)}
                  placeholder="Type a name or email to filter cast..."
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getAvailableCastMembers().map(member => (
                <label key={member.CastMemberID} className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${selectedCastIds.has(member.PersonnelID) ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                  <input type="checkbox" checked={selectedCastIds.has(member.PersonnelID)} onChange={() => toggleCast(member.PersonnelID)} className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
                  <div className="min-w-0"><div className="font-medium text-gray-900">{member.FullName}</div><div className="text-xs text-gray-500">{member.PrimaryEmail}</div></div>
                </label>
              ))}
            </div>
            <div className="mt-6 flex justify-end border-t border-gray-200 pt-4">
              <button onClick={handleSaveCrew} disabled={isLoading} className="rounded-lg bg-primary-600 px-6 py-2 text-white hover:bg-primary-700 disabled:opacity-50">
                Save Cast & Crew
              </button>
            </div>
          </>
        ) : (
          <p className="text-gray-500 text-center py-8">No active tab selected.</p>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-gray-200 px-6 py-4">
        <div></div>
        <button onClick={onClose} className="rounded-lg bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300 transition-colors">Close</button>
      </div>
    </div>

    <ShowEditModal isOpen={showEditOpen} show={show} onClose={() => setShowEditOpen(false)} onSaved={() => { setShowEditOpen(false); onSaved(); }} />
  </div>
);
}