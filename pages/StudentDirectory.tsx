import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { StudentWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentDirectoryProps {
  onNavigateToStudent?: (studentId: number) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({ onNavigateToStudent }) => {
  const [students, setStudents] = useState<StudentWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'Inactive' | 'Graduated'>('All');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllStudentsWithDetails();
      if (response.success && Array.isArray(response.data)) {
        setStudents(response.data);
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

  const filteredStudents = students.filter(student => {
    const matchesSearch = (
      `${student.FirstName} ${student.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (student.PrimaryEmail && student.PrimaryEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
    const matchesFilter = filterStatus === 'All' || student.StudentStatus === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Inactive':
        return 'bg-gray-100 text-gray-800';
      case 'Graduated':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Student Directory</h1>
          <p className="text-sm text-gray-600 mt-1">{filteredStudents.length} students</p>
        </div>
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

      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
          className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value="All">All Status</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
          <option value="Graduated">Graduated</option>
        </select>
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
              key={student.StudentID}
              className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onNavigateToStudent && onNavigateToStudent(student.StudentID!)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">
                    {(student.FirstName && student.FirstName.length > 0 ? student.FirstName.charAt(0) : '')}
                    {(student.LastName && student.LastName.length > 0 ? student.LastName.charAt(0) : '')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{student.FirstName} {student.LastName}</h3>
                    <p className="text-xs text-gray-500">{student.PrimaryEmail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(student.StudentStatus)}`}>
                    {student.StudentStatus || 'N/A'}
                  </span>
                </div>
                {student.CurrentLevelName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Level:</span>
                    <span className="text-gray-900 font-medium">{student.CurrentLevelName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Classes Completed:</span>
                  <span className="text-gray-900 font-medium">{student.ClassesCompleted || 0}</span>
                </div>
                {student.EnrollmentDate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Student Since:</span>
                    <span className="text-gray-900 text-xs">
                      {new Date(student.EnrollmentDate).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>

              <button
                className="mt-4 w-full px-3 py-2 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors font-medium"
                onClick={e => { e.stopPropagation(); onNavigateToStudent && onNavigateToStudent(student.StudentID!); }}
              >
                View Full Profile
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
