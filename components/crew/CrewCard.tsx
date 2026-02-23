import React from 'react';
import { CrewMemberWithDetails } from '../../types';

interface CrewCardProps {
  crewMember: CrewMemberWithDetails;
  onClick: () => void;
}

export const CrewCard: React.FC<CrewCardProps> = ({ crewMember, onClick }) => {
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

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center text-teal-700 font-semibold">
          {getInitials(crewMember.FirstName, displayLastName)}
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">
            {`${crewMember.FirstName || ''} ${displayLastName}`.trim() || 'Unknown Name'}
          </h3>
          <p className="text-sm text-gray-600">{crewMember.PrimaryEmail || 'No email'}</p>
        </div>
      </div>
      <div className="space-y-1 text-sm text-gray-600">
        <p><strong>Last Show:</strong> {crewMember.ShowName || 'N/A'} ({formatDate(crewMember.LastShowDate)})</p>
        <p><strong>Last Duty:</strong> {crewMember.DutyName || 'N/A'}</p>
        <p><strong>Phone:</strong> {crewMember.PrimaryPhone || 'No phone'}</p>
        {crewMember.Status && (
          <span
            className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${
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
  );
};
