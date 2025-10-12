import React from 'react';
import { PersonnelWithDetails } from '../../types';

interface StudentCardProps {
  student: PersonnelWithDetails;
  isSelected: boolean;
  onToggle: () => void;
}

export const StudentCard: React.FC<StudentCardProps> = ({ student, isSelected, onToggle }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div 
      onClick={onToggle}
      className={`bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-all cursor-pointer ${
        isSelected ? 'border-primary-500 bg-primary-50' : ''
      }`}
    >
      <div className="flex items-center space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold text-sm">
          {getInitials(student.FirstName, student.LastName)}
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">
            {student.FirstName} {student.LastName}
          </h4>
          <p className="text-xs text-gray-600">{student.PrimaryEmail}</p>
        </div>
      </div>
    </div>
  );
};