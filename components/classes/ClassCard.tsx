import React from 'react';
import { ClassWithDetails } from '../../types';

interface ClassCardProps {
  classOffering: ClassWithDetails;
  onSelect?: () => void;
  onViewRoster?: () => void;
  isSelected?: boolean;
}

export const ClassCard: React.FC<ClassCardProps> = ({ 
  classOffering, 
  onSelect, 
  onViewRoster,
  isSelected = false 
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Open': return 'bg-green-100 text-green-800';
      case 'Full': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const enrollmentPercentage = classOffering.CurrentEnrollment 
    ? Math.round((classOffering.CurrentEnrollment / classOffering.MaxStudents) * 100)
    : 0;

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'border-primary-500 bg-primary-50' : ''
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-gray-900 mb-1">
            {classOffering.LevelName || `Level ${classOffering.ClassLevelID}`}
          </h3>
          <p className="text-sm text-gray-600">{classOffering.VenueOrRoom}</p>
          <p className="text-sm text-gray-600">
            Teacher: {classOffering.TeacherName || 'TBD'}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(classOffering.Status)}`}>
          {classOffering.Status}
        </span>
      </div>

      <div className="mb-3">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Enrollment</span>
          <span>{classOffering.CurrentEnrollment || 0}/{classOffering.MaxStudents}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary-600 h-2 rounded-full transition-all"
            style={{ width: `${enrollmentPercentage}%` }}
          ></div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        <p>Start: {new Date(classOffering.StartDate).toLocaleDateString()}</p>
        <p>End: {new Date(classOffering.EndDate).toLocaleDateString()}</p>
      </div>

      {onViewRoster && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onViewRoster();
          }}
          className="w-full mt-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          View Roster
        </button>
      )}
    </div>
  );
};