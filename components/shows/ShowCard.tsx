import React from 'react';
import { ShowWithDetails } from '../../types';

interface ShowCardProps {
  show: ShowWithDetails;
  onManageCast: () => void;
}

export const ShowCard: React.FC<ShowCardProps> = ({ show, onManageCast }) => {
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
          {new Date(show.ShowDate).toLocaleDateString()}
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

      <button
        onClick={onManageCast}
        className="w-full px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
      >
        Manage Cast & Crew
      </button>
    </div>
  );
};