import React, { useEffect, useMemo, useState } from 'react';
import { ShowGame, ShowWithDetails } from '../../types';
import { supabaseService as gasService } from '../../services/supabaseService';

interface ShowCardProps {
  show: ShowWithDetails;
  onManageCast: () => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show, onManageCast }) => {
  const [gamesPlayed, setGamesPlayed] = useState<ShowGame[]>([]);

  const formatDate = (value: Date | string | undefined) => {
    if (!value) return 'TBD';
    const raw = String(value).slice(0, 10);
    const date = /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? new Date(Number(raw.slice(0, 4)), Number(raw.slice(5, 7)) - 1, Number(raw.slice(8, 10)))
      : new Date(value as string);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  };

  const isCompletedShow = useMemo(() => {
    const rawDate = String(show.ShowDate || '').slice(0, 10);
    const showDate = new Date(`${rawDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(showDate.getTime()) && showDate.getTime() < today.getTime();
  }, [show.ShowDate]);

  useEffect(() => {
    if (!isCompletedShow) {
      setGamesPlayed([]);
      return;
    }

    let isMounted = true;

    const loadGames = async () => {
      const response = await gasService.getShowGames(show.ShowID);
      if (!isMounted) return;
      if (response.success && response.data) {
        const rows = Array.isArray(response.data) ? response.data : (response.data as any)?.data || [];
        setGamesPlayed(rows);
      } else {
        setGamesPlayed([]);
      }
    };

    loadGames();

    return () => {
      isMounted = false;
    };
  }, [isCompletedShow, show.ShowID]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-green-100 text-green-800';
      case 'Canceled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            {show.ShowTypeName || 'Show'} #{show.ShowID}
          </h3>
          <p className="text-sm text-gray-600">{show.Venue}</p>
          <p className="text-sm text-gray-600">
            Director: {show.DirectorName || 'TBD'}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(show.Status)}`}>
          {show.Status}
        </span>
      </div>

      <div className="mb-3">
        <p className="text-sm text-gray-900 font-medium">
          {formatDate(show.ShowDate)}
        </p>
        <p className="text-sm text-gray-600">{show.ShowTime}</p>
      </div>

      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Cast Members</h4>
        {show.CastMembers && show.CastMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {show.CastMembers.slice(0, 3).map((member, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                {member.FirstName} {member.LastName}
              </span>
            ))}
            {show.CastMembers.length > 3 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                +{show.CastMembers.length - 3} more
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No cast assigned</p>
        )}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
          Cast: <span className="font-semibold">{show.CastMembers?.length || 0}</span>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
          Crew: <span className="font-semibold">{show.CrewMembers?.length || 0}</span>
        </div>
      </div>

      {isCompletedShow && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Games Played</h4>
          {gamesPlayed.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {gamesPlayed.slice(0, 3).map((game, index) => (
                <span
                  key={game.GamesPlayedID || `${game.GameID || game.GameName}-${index}`}
                  className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-full"
                >
                  {game.GameName || game.CustomGameName || 'Game'}
                </span>
              ))}
              {gamesPlayed.length > 3 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                  +{gamesPlayed.length - 3} more
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No games logged</p>
          )}
        </div>
      )}

      <button
        onClick={onManageCast}
        className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
      >
        Manage Cast & Crew
      </button>
    </div>
  );
};