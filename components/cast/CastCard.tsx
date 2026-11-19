import React from 'react';
import { CastMemberWithDetails } from '../../types';

interface CastCardProps {
  castMember: CastMemberWithDetails;
  onClick: () => void;
  onRemove?: (castMemberId: number) => void;
  onViewShows?: (castMember: CastMemberWithDetails) => void;
}

export const CastCard: React.FC<CastCardProps> = ({ castMember, onClick, onRemove, onViewShows }) => {
  const getInitials = (firstName: string, lastname: string) => {
    const first = (firstName || '').trim();
    const last = (lastname || '').trim();
    const firstInitial = first.length > 0 ? first.charAt(0) : '';
    const lastInitial = last.length > 0 ? last.charAt(0) : '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const showCount = castMember.ShowCount ?? 0;
  const crewCount = castMember.CrewDutyCount ?? 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
            {getInitials(castMember.FirstName, castMember.LastName || castMember.Lastname)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="font-semibold text-gray-900 truncate">
                {`${castMember.FirstName || ''} ${castMember.LastName || castMember.Lastname || ''}`.trim() || 'Unknown Name'}
              </h3>
              {castMember.MilestoneBadge && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 border border-amber-200">
                  {castMember.MilestoneBadge}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-600 truncate">{castMember.PrimaryEmail || 'No email'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-purple-50 text-purple-800 rounded px-2 py-1.5 font-medium">
            🎭 Shows: <span className="font-bold">{showCount}</span>
          </div>
          <div className="bg-teal-50 text-teal-800 rounded px-2 py-1.5 font-medium">
            🛠️ Crew: <span className="font-bold">{crewCount}</span>
          </div>
        </div>

        <div className="space-y-1 text-xs text-gray-600">
          <p>Last Show: <span className="font-medium text-gray-800">{formatDate(castMember.LastShowDate || '')}</span></p>
          {castMember.EligibilityStatus && (
            <p>
              Standing:{' '}
              <span className={`font-semibold ${
                castMember.EligibilityStatus.includes('60d') || castMember.EligibilityStatus.includes('Fri Eligible')
                  ? 'text-emerald-700'
                  : castMember.EligibilityStatus.includes('>60d')
                  ? 'text-amber-700'
                  : 'text-gray-700'
              }`}>
                {castMember.EligibilityStatus}
              </span>
            </p>
          )}
          {castMember.TopCoStars && castMember.TopCoStars.length > 0 && (
            <p className="truncate">
              Top Co-Star: <span className="font-medium text-gray-800">{castMember.TopCoStars[0].name} ({castMember.TopCoStars[0].count})</span>
            </p>
          )}
          <div className="pt-1 flex flex-wrap gap-1.5">
            {castMember.Status && (
              <span
                className={`inline-block px-2 py-0.5 text-[11px] rounded-full font-medium ${
                  castMember.Status === 'Active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {castMember.Status}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-2">
        {onViewShows && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onViewShows(castMember);
            }}
            className="flex-1 px-2.5 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 rounded hover:bg-indigo-100 transition-colors"
          >
            🎬 Shows ({showCount})
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(castMember.CastMemberID);
            }}
            className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
};