import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { Personnel, StudentProfile } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentDirectoryProps {
  onNavigateToStudent?: (studentId: number) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({ onNavigateToStudent }) => {
  const [students, setStudents] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllStudents();
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
      } else if (response.success && response.data && Array.isArray(response.data.data)) {
        setStudents(response.data.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load students.' });
        setStudents([]);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading students.' });
      setStudents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredStudents = students.filter(student =>
    (`${student.FirstName} ${student.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.PrimaryEmail && student.PrimaryEmail.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
      </div>
      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
      {isLoading ? (
        <Loader text="Loading students..." />
      ) : filteredStudents.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No students found.</p>
          <button
            onClick={loadStudents}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredStudents.map(student => (
            <div
              key={student.PersonnelID}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateToStudent && onNavigateToStudent(student.PersonnelID)}
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-700 font-semibold">
                  {(student.FirstName && student.FirstName.length > 0 ? student.FirstName.charAt(0) : '')}
                  {(student.LastName && student.LastName.length > 0 ? student.LastName.charAt(0) : '')}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{student.FirstName} {student.LastName}</h3>
                  <p className="text-sm text-gray-600">{student.PrimaryEmail}</p>
                </div>
              </div>
              <div className="text-sm text-gray-600">
                <p>Phone: {student.PrimaryPhone || 'N/A'}</p>
                <p>Birthday: {student.Birthday ? new Date(student.Birthday).toLocaleDateString() : 'N/A'}</p>
              </div>
              <button
                className="mt-3 px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                onClick={e => { e.stopPropagation(); onNavigateToStudent && onNavigateToStudent(student.PersonnelID); }}
              >
                View Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
