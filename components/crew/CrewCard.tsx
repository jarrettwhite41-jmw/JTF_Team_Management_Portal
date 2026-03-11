import React from 'react';
import { CrewMemberWithDetails } from '../../types';

interface CrewCardProps {
  crewMember: CrewMemberWithDetails;
  onClick: () => void;
  /** Tailwind classes for the show badge, e.g. "bg-violet-100 text-violet-700 border-violet-200" */
  showColorClasses?: string;
}

export const CrewCard: React.FC<CrewCardProps> = ({ crewMember, onClick, showColorClasses }) => {
  const getInitials = (firstName: string, lastname: string) => {
    const first = (firstName || '').trim();
    const last = (lastname || '').trim();
    const firstInitial = first.length > 0 ? first.charAt(0) : '';
    const lastInitial = last.length > 0 ? last.charAt(0) : '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  const displayLastName = crewMember.LastName || crewMember.Lastname || '';

  const formatDate = (dateString: string) => {
    if (!dateString || dateString === 'N/A') return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  const defaultBadge = 'bg-gray-100 text-gray-600 border-gray-200';
  const badgeClasses = showColorClasses || defaultBadge;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
    >
      {/* Show colour strip / badge */}
      {crewMember.ShowName && (
        <div className={`px-3 py-1 text-xs font-medium border-b ${badgeClasses} truncate`}>
          {crewMember.ShowName}
        </div>
      )}
      <div className="p-4">
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold flex-shrink-0">
            {getInitials(crewMember.FirstName, displayLastName)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">
              {`${crewMember.FirstName || ''} ${displayLastName}`.trim() || 'Unknown Name'}
            </h3>
            <p className="text-sm text-gray-500 truncate">{crewMember.PrimaryEmail || 'No email'}</p>
          </div>
        </div>
        <div className="space-y-1 text-sm text-gray-600">
          <p><span className="text-gray-400">Duty:</span> <strong className="text-gray-800">{crewMember.DutyName || 'N/A'}</strong></p>
          <p><span className="text-gray-400">Date:</span> {formatDate(crewMember.ShowDate || crewMember.LastShowDate)}</p>
          <p><span className="text-gray-400">Phone:</span> {crewMember.PrimaryPhone || 'No phone'}</p>
          {crewMember.Status && (
            <span
              className={`inline-block px-2 py-0.5 text-xs rounded-full mt-2 ${
                crewMember.Status === 'Active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {crewMember.Status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
