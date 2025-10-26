import React from 'react';
import { CastMemberWithDetails } from '../../types';

interface CastCardProps {
  castMember: CastMemberWithDetails;
  onClick: () => void;
}

export const CastCard: React.FC<CastCardProps> = ({ castMember, onClick }) => {
  const getInitials = (firstName: string, lastname: string) => {
    const first = (firstName || '').trim();
    const last = (lastname || '').trim();
    const firstInitial = first.length > 0 ? first.charAt(0) : '';
    const lastInitial = last.length > 0 ? last.charAt(0) : '';
    return `${firstInitial}${lastInitial}`.toUpperCase() || '??';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-700 font-semibold">
          {getInitials(castMember.FirstName, castMember.LastName)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {`${castMember.FirstName || ''} ${castMember.LastName || ''}`.trim() || 'Unknown Name'}
          </h3>
          <p className="text-sm text-gray-600">{castMember.PrimaryEmail || 'No email'}</p>
        </div>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <p>Last Show: {formatDate((castMember as any).LastShowDate)}</p>
        <p>Phone: {castMember.PrimaryPhone || 'No phone'}</p>
        <p>Birthday: {formatDate((castMember as any).Birthday)}</p>
        {castMember.Status && (
          <span
            className={`inline-block px-2 py-1 text-xs rounded-full ${
              castMember.Status === 'Active'
                ? 'bg-green-100 text-green-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {castMember.Status}
          </span>
        )}
      </div>
    </div>
  );
};