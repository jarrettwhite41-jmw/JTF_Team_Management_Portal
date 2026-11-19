import React, { useEffect, useMemo, useState } from 'react';
import { ShowGame, ShowWithDetails } from '../../types';
import { gasService } from '../../services/googleAppsScript';

interface ShowCardProps {
  show: ShowWithDetails;
  onManageCast: () => void;
  onFilterDirector?: (directorName: string) => void;
  onFilterCastMember?: (personnelId: number, fullName: string) => void;
  onViewCrewMember?: (fullName: string) => void;
  onSelectGame?: (gameId: number, gameName: string) => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({
  show,
  onManageCast,
  onFilterDirector,
  onFilterCastMember,
  onViewCrewMember,
  onSelectGame,
}) => {
  const [gamesPlayed, setGamesPlayed] = useState<ShowGame[]>([]);
  const [expandCast, setExpandCast] = useState(false);
  const [expandGames, setExpandGames] = useState(false);
  const castCount = show.CastCount ?? show.CastMembers?.length ?? 0;
  const crewCount = show.CrewCount ?? show.CrewMembers?.length ?? 0;

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

  const isJtfPresents = show.ProgramCategory === 'jtf_presents' || String(show.ShowTypeName || '').trim().toLowerCase() === 'jtf presents';

  return (
    <div className="bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1 text-base">
            {show.ShowTypeName || 'Show'} #{show.ShowID}
          </h3>
          <p className="text-xs text-gray-600">{show.Venue}</p>
          <p className="text-xs text-gray-600 flex items-center gap-1 flex-wrap">
            <span>Director:</span>
            {show.DirectorName && show.DirectorName !== 'TBD' && onFilterDirector ? (
              <button
                type="button"
                onClick={() => onFilterDirector(show.DirectorName!)}
                className="font-semibold text-indigo-700 hover:text-indigo-900 hover:underline transition-colors"
                title={`Filter shows directed by ${show.DirectorName}`}
              >
                {show.DirectorName}
              </button>
            ) : (
              <span className="font-medium text-gray-800">{show.DirectorName || 'TBD'}</span>
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${isJtfPresents ? 'bg-indigo-100 text-indigo-800' : 'bg-gray-100 text-gray-700'}`}>
              {isJtfPresents ? 'JTF Presents' : 'Standard'}
            </span>
            {isJtfPresents && show.AttendanceEstimate != null && (
              <span className="px-2 py-1 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                Est. attendance: {show.AttendanceEstimate}
              </span>
            )}
          </div>
        </div>
        <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${getStatusColor(show.Status)}`}>
          {show.Status}
        </span>
      </div>

      <div className="mb-2">
        <p className="text-xs text-gray-900 font-medium">
          {formatDate(show.ShowDate)}
        </p>
        <p className="text-xs text-gray-600">{show.ShowTime}</p>
      </div>

      <div className="mb-3">
        <h4 className="text-xs font-medium text-gray-700 mb-1.5">Cast Members ({castCount})</h4>
        {show.CastMembers && show.CastMembers.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {(expandCast ? show.CastMembers : show.CastMembers.slice(0, 4)).map((member, index) => {
              const personnelId = Number((member as any).personnel_id || member.PersonnelID || 0);
              const firstName = (member as any).first_name || member.FirstName || '';
              const lastName = (member as any).last_name || member.LastName || '';
              const fullName = `${firstName} ${lastName}`.trim() || (member as any).FullName || 'Unknown';
              return onFilterCastMember ? (
                <button
                  key={`${personnelId}-${index}`}
                  type="button"
                  onClick={() => onFilterCastMember(personnelId, fullName)}
                  className="px-2 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 text-[10px] font-medium rounded-full transition-colors"
                  title={`Filter shows with ${fullName}`}
                >
                  {fullName}
                </button>
              ) : (
                <span
                  key={`${personnelId}-${index}`}
                  className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded-full"
                >
                  {fullName}
                </span>
              );
            })}
            {show.CastMembers.length > 4 && (
              <button
                type="button"
                onClick={() => setExpandCast((prev) => !prev)}
                className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium rounded-full transition-colors"
              >
                {expandCast ? 'Show less' : `+${show.CastMembers.length - 4} more`}
              </button>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-500">No cast assigned</p>
        )}
      </div>

      {show.CrewMembers && show.CrewMembers.length > 0 && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-700 mb-1.5">Crew ({crewCount})</h4>
          <div className="flex flex-wrap gap-1">
            {show.CrewMembers.map((crew, index) => {
              const firstName = (crew as any).first_name || crew.FirstName || '';
              const lastName = (crew as any).last_name || crew.LastName || '';
              const fullName = `${firstName} ${lastName}`.trim() || (crew as any).FullName || 'Unknown';
              const dutyName = (crew as any).DutyName || '';
              const label = dutyName ? `${dutyName}: ${fullName}` : fullName;
              return onViewCrewMember ? (
                <button
                  key={`crew-${index}`}
                  type="button"
                  onClick={() => onViewCrewMember(fullName)}
                  className="px-2 py-0.5 bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-medium rounded-full transition-colors"
                  title={`View ${fullName} in Crew Directory`}
                >
                  {label}
                </button>
              ) : (
                <span
                  key={`crew-${index}`}
                  className="px-2 py-0.5 bg-teal-50 text-teal-800 border border-teal-200 text-[10px] rounded-full"
                >
                  {label}
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-3 grid grid-cols-2 gap-2 text-[10px]">
        <div className="rounded-md bg-blue-50 px-2 py-1.5 text-blue-700">
          Cast: <span className="font-semibold">{castCount}</span>
        </div>
        <div className="rounded-md bg-gray-50 px-2 py-1.5 text-gray-700">
          Crew: <span className="font-semibold">{crewCount}</span>
        </div>
      </div>

      {isJtfPresents && show.Notes && (
        <div className="mb-3 rounded-md border border-indigo-100 bg-indigo-50/70 px-2.5 py-2 text-xs text-indigo-900">
          <div className="font-medium text-indigo-800">Show Notes</div>
          <div className="mt-1 line-clamp-3 whitespace-pre-wrap text-indigo-900">{show.Notes}</div>
        </div>
      )}

      {isCompletedShow && (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-700 mb-1.5">
            Games Played {gamesPlayed.length > 0 ? `(${gamesPlayed.length})` : ''}
          </h4>
          {gamesPlayed.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {(expandGames ? gamesPlayed : gamesPlayed.slice(0, 3)).map((game, index) => {
                const gameName = game.GameName || game.CustomGameName || 'Game';
                const gameId = Number(game.GameID || 0);
                return onSelectGame && gameId > 0 ? (
                  <button
                    key={game.GamesPlayedID || `${gameId || gameName}-${index}`}
                    type="button"
                    onClick={() => onSelectGame(gameId, gameName)}
                    className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-[10px] font-medium rounded-full transition-colors"
                    title={game.Notes ? `${gameName} — ${game.Notes}` : `Open ${gameName} in Game Library`}
                  >
                    {gameName}
                  </button>
                ) : (
                  <span
                    key={game.GamesPlayedID || `${gameId || gameName}-${index}`}
                    className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] rounded-full"
                    title={game.Notes || undefined}
                  >
                    {gameName}
                  </span>
                );
              })}
              {gamesPlayed.length > 3 && (
                <button
                  type="button"
                  onClick={() => setExpandGames((prev) => !prev)}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-[10px] font-medium rounded-full transition-colors"
                >
                  {expandGames ? 'Show less' : `+${gamesPlayed.length - 3} more`}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-gray-500">No games logged</p>
          )}
        </div>
      )}

      <button
        onClick={onManageCast}
        className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs font-medium"
      >
        Manage Cast & Crew
      </button>
    </div>
  );
};