import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { MasterGame, MasterGameInput } from '../types';
import { supabaseService } from '../services/supabaseService';

const createEmptyGameForm = (): MasterGameInput => ({
  GameName: '',
  Description: '',
  PlayerCount: '',
  Format: '',
  Category: '',
});

const APPROVAL_CATEGORIES = ['Improv', 'Game Based', 'Scene Based', 'Audience Participation', 'Musical'];

export const Games: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessingRequest, setIsProcessingRequest] = useState<number | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [masterGames, setMasterGames] = useState<MasterGame[]>([]);
  const [requestedGames, setRequestedGames] = useState<MasterGame[]>([]);
  const [approvalCategories, setApprovalCategories] = useState<Record<number, string>>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<number | null>(null);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [gameForm, setGameForm] = useState<MasterGameInput>(createEmptyGameForm());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [allGamesResponse, requestsResponse] = await Promise.all([
        supabaseService.getAllGames(),
        supabaseService.getRequestedMasterGames(),
      ]);

      if (allGamesResponse.success && allGamesResponse.data) {
        setMasterGames(allGamesResponse.data);
      } else {
        setMessage({ type: 'error', text: allGamesResponse.error || 'Failed to load game library.' });
      }

      if (requestsResponse.success && requestsResponse.data) {
        setRequestedGames(requestsResponse.data);
        const initialCategories: Record<number, string> = {};
        requestsResponse.data.forEach((game) => {
          initialCategories[game.GameID] = 'Improv';
        });
        setApprovalCategories(initialCategories);
      } else {
        setMessage({ type: 'error', text: requestsResponse.error || 'Failed to load game requests.' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Unexpected error while loading games.' });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredGames = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return masterGames;

    return masterGames.filter((game) =>
      game.GameName.toLowerCase().includes(query) ||
      (game.Category || '').toLowerCase().includes(query) ||
      (game.Description || '').toLowerCase().includes(query)
    );
  }, [masterGames, searchTerm]);

  const selectedGame = useMemo(
    () => masterGames.find((game) => game.GameID === selectedGameId) || null,
    [masterGames, selectedGameId],
  );

  useEffect(() => {
    if (!selectedGame || isCreateMode) return;

    setGameForm({
      GameName: selectedGame.GameName || '',
      Description: selectedGame.Description || '',
      PlayerCount: selectedGame.PlayerCount ?? '',
      Format: selectedGame.Format || '',
      Category: selectedGame.Category || '',
    });
  }, [selectedGame, isCreateMode]);

  const openCreateMode = () => {
    setIsCreateMode(true);
    setSelectedGameId(null);
    setGameForm(createEmptyGameForm());
  };

  const openEditMode = (gameId: number) => {
    setSelectedGameId(gameId);
    setIsCreateMode(false);
  };

  const handleSaveGame = async () => {
    if (!gameForm.GameName.trim()) {
      setMessage({ type: 'error', text: 'Game name is required.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = isCreateMode
        ? await supabaseService.createMasterGame(gameForm)
        : await supabaseService.updateMasterGame(selectedGameId as number, gameForm);

      if (!response.success) {
        setMessage({ type: 'error', text: response.error || 'Failed to save game.' });
        return;
      }

      setMessage({ type: 'success', text: isCreateMode ? 'Game created successfully.' : 'Game updated successfully.' });
      await loadData();

      if (isCreateMode && response.data?.GameID) {
        setSelectedGameId(response.data.GameID);
        setIsCreateMode(false);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteGame = async () => {
    if (!selectedGameId || isCreateMode) return;

    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await supabaseService.deleteMasterGame(selectedGameId);
      if (!response.success) {
        setMessage({ type: 'error', text: response.error || 'Failed to delete game.' });
        return;
      }

      setMessage({ type: 'success', text: 'Game deleted successfully.' });
      setSelectedGameId(null);
      setGameForm(createEmptyGameForm());
      await loadData();
    } finally {
      setIsDeleting(false);
    }
  };

  const handleApproveRequest = async (gameId: number) => {
    const category = (approvalCategories[gameId] || 'Improv').trim() || 'Improv';
    setIsProcessingRequest(gameId);
    setMessage(null);

    try {
      const response = await supabaseService.approveRequestedGame(gameId, category);
      if (!response.success) {
        setMessage({ type: 'error', text: response.error || 'Failed to approve request.' });
        return;
      }

      setMessage({ type: 'success', text: `Approved game request and moved to ${category}.` });
      await loadData();
    } finally {
      setIsProcessingRequest(null);
    }
  };

  const handleRejectRequest = async (gameId: number) => {
    setIsProcessingRequest(gameId);
    setMessage(null);

    try {
      const response = await supabaseService.rejectRequestedGame(gameId);
      if (!response.success) {
        setMessage({ type: 'error', text: response.error || 'Failed to reject request.' });
        return;
      }

      setMessage({ type: 'success', text: 'Rejected game request and removed from queue.' });
      await loadData();
    } finally {
      setIsProcessingRequest(null);
    }
  };

  if (isLoading) {
    return <Loader text="Loading games..." />;
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Games</h1>
          <p className="text-sm text-gray-600 mt-1">Review game requests and maintain the master game library.</p>
        </div>
        <button
          onClick={openCreateMode}
          className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
        >
          Add New Game
        </button>
      </div>

      {message && <Message type={message.type} message={message.text} onClose={() => setMessage(null)} />}

      <section className="rounded-xl border border-amber-200 bg-amber-50/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-amber-900">Requested Games</h2>
          <span className="text-xs font-medium text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
            {requestedGames.length} pending
          </span>
        </div>

        {requestedGames.length === 0 ? (
          <p className="text-sm text-amber-800">No pending game requests.</p>
        ) : (
          <div className="space-y-3">
            {requestedGames.map((request) => (
              <article key={request.GameID} className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">{request.GameName}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Current Category: {request.Category || 'Requested from Show'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      title="Approval category"
                      value={approvalCategories[request.GameID] || 'Improv'}
                      onChange={(event) =>
                        setApprovalCategories((prev) => ({
                          ...prev,
                          [request.GameID]: event.target.value,
                        }))
                      }
                      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                    >
                      {APPROVAL_CATEGORIES.map((option) => (
                        <option key={`${request.GameID}-${option}`} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => handleApproveRequest(request.GameID)}
                      disabled={isProcessingRequest === request.GameID}
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.GameID)}
                      disabled={isProcessingRequest === request.GameID}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
                {!!request.Description && <p className="text-sm text-gray-700 mt-2">{request.Description}</p>}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        <div className="rounded-xl border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Master Game Library</h2>
            <span className="text-xs text-gray-500">{filteredGames.length} games</span>
          </div>

          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search games by name, category, or description..."
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-3"
          />

          <div className="max-h-[500px] overflow-y-auto divide-y">
            {filteredGames.map((game) => (
              <button
                key={game.GameID}
                onClick={() => openEditMode(game.GameID)}
                className={`w-full px-2 py-2 text-left hover:bg-gray-50 transition-colors ${
                  !isCreateMode && selectedGameId === game.GameID ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium text-gray-900">{game.GameName}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{game.Category || 'Uncategorized'}</span>
                </div>
                {!!game.Description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{game.Description}</p>}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">{isCreateMode ? 'Create Game' : 'Edit Game'}</h2>
            {!isCreateMode && selectedGame && (
              <span className="text-xs text-gray-500">Game #{selectedGame.GameID}</span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3">
            <input
              type="text"
              value={gameForm.GameName}
              onChange={(event) => setGameForm((prev) => ({ ...prev, GameName: event.target.value }))}
              placeholder="Game name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={gameForm.Category || ''}
              onChange={(event) => setGameForm((prev) => ({ ...prev, Category: event.target.value }))}
              placeholder="Category"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min="1"
              value={String(gameForm.PlayerCount ?? '')}
              onChange={(event) => setGameForm((prev) => ({ ...prev, PlayerCount: event.target.value }))}
              placeholder="Player count"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
            <select
              value={gameForm.Format || ''}
              onChange={(event) => setGameForm((prev) => ({ ...prev, Format: event.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              aria-label="Format"
            >
              <option value="">Select format</option>
              <option value="Short">Short</option>
              <option value="Long">Long</option>
            </select>
            <textarea
              value={gameForm.Description || ''}
              onChange={(event) => setGameForm((prev) => ({ ...prev, Description: event.target.value }))}
              placeholder="Description / How To Play"
              rows={5}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <button
              onClick={handleSaveGame}
              disabled={isSaving}
              className="rounded-lg bg-primary-600 px-4 py-2 text-white text-sm font-medium hover:bg-primary-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : isCreateMode ? 'Create Game' : 'Save Changes'}
            </button>
            {!isCreateMode && selectedGameId && (
              <button
                onClick={handleDeleteGame}
                disabled={isDeleting}
                className="rounded-lg border border-red-300 px-4 py-2 text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Delete Game'}
              </button>
            )}
            {!isCreateMode && (
              <button
                onClick={openCreateMode}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 text-sm font-medium hover:bg-gray-50"
              >
                New Draft
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
