import React from 'react';

interface ClassCardProps {
  classOffering: any;
  onClick: () => void;
}

export const ClassCard: React.FC<ClassCardProps> = ({ classOffering, onClick }) => {
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'upcoming':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'in progress':
      case 'open':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'completed':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const enrollmentPercentage = classOffering.MaxStudents 
    ? (classOffering.EnrolledCount / classOffering.MaxStudents) * 100 
    : 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            {classOffering.LevelName || `Level ${classOffering.ClassLevelID}`}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" />
              </svg>
              {classOffering.TeacherName || 'TBA'}
            </span>
          </p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(classOffering.Status)}`}>
          {classOffering.Status}
        </span>
      </div>

      {/* Schedule */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
          </svg>
          <span>
            {formatDate(classOffering.StartDate)} - {formatDate(classOffering.EndDate)}
          </span>
        </div>
        {classOffering.VenueOrRoom && (
          <div className="flex items-center text-sm text-gray-600">
            <svg className="w-4 h-4 mr-2 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
            <span>{classOffering.VenueOrRoom}</span>
          </div>
        )}
      </div>

      {/* Enrollment Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Enrollment</span>
          <span className="font-semibold text-gray-900">
            {classOffering.EnrolledCount || 0} / {classOffering.MaxStudents || 12} students
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              enrollmentPercentage >= 100
                ? 'bg-red-500'
                : enrollmentPercentage >= 75
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(enrollmentPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* View Details Link */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <button className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center group-hover:translate-x-1 transition-transform">
          Manage Class
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};