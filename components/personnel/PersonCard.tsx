import React from 'react';
import { PersonnelWithDetails } from '../../types';

interface PersonCardProps {
  person: PersonnelWithDetails;
  onClick: () => void;
}

export const PersonCard: React.FC<PersonCardProps> = ({ person, onClick }) => {
  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getRoleBadges = () => {
    const roles = [];
    if (person.isStudent) roles.push({ label: 'Student', color: 'bg-blue-100 text-blue-800' });
    if (person.isTeacher) roles.push({ label: 'Teacher', color: 'bg-green-100 text-green-800' });
    if (person.isDirector) roles.push({ label: 'Director', color: 'bg-purple-100 text-purple-800' });
    if (person.isCastMember) roles.push({ label: 'Cast', color: 'bg-yellow-100 text-yellow-800' });
    if (person.isCrewMember) roles.push({ label: 'Crew', color: 'bg-gray-100 text-gray-800' });
    
    return roles;
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
          {getInitials(person.FirstName, person.LastName)}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">
            {person.FirstName} {person.LastName}
          </h3>
          <p className="text-sm text-gray-600">{person.PrimaryEmail}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1">
        {getRoleBadges().map((role, index) => (
          <span
            key={index}
            className={`px-2 py-1 rounded-full text-xs font-medium ${role.color}`}
          >
            {role.label}
          </span>
        ))}
      </div>
    </div>
  );
};