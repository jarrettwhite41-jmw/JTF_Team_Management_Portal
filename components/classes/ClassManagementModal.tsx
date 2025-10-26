import React, { useState, useEffect } from 'react';
import { StudentCard } from './StudentCard';
import { Loader } from '../common/Loader';
import { Message } from '../common/Message';

interface ClassManagementModalProps {
  isOpen: boolean;
  classOffering: any;
  onClose: () => void;
  onRefresh: () => void;
}

interface Student {
  StudentID: number;
  PersonnelID: number;
  FirstName: string;
  LastName: string;
  PrimaryEmail: string;
  EnrollmentID?: number;
  EnrollmentDate?: string;
  CompletionStatus?: string;
}

export const ClassManagementModal: React.FC<ClassManagementModalProps> = ({
  isOpen,
  classOffering,
  onClose,
  onRefresh
}) => {
  const [enrolledStudents, setEnrolledStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'enrolled' | 'add'>('enrolled');

  useEffect(() => {
    if (isOpen && classOffering) {
      loadEnrolledStudents();
    }
  }, [isOpen, classOffering]);

  const loadEnrolledStudents = async () => {
    setIsLoading(true);
    try {
      // This will call the backend function
      const response = await (window as any).google.script.run
        .withSuccessHandler((data: any) => {
          if (data.success) {
            setEnrolledStudents(data.data || []);
          } else {
            setMessage({ type: 'error', text: data.error || 'Failed to load students' });
          }
          setIsLoading(false);
        })
        .withFailureHandler((error: any) => {
          setMessage({ type: 'error', text: 'Error loading students' });
          setIsLoading(false);
        })
        .getEnrolledStudents(classOffering.OfferingID);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading students' });
      setIsLoading(false);
    }
  };

  const loadAvailableStudents = async () => {
    setIsLoading(true);
    try {
      const response = await (window as any).google.script.run
        .withSuccessHandler((data: any) => {
          if (data.success) {
            // Filter out students already enrolled
            const enrolledIds = enrolledStudents.map(s => s.StudentID);
            const available = (data.data || []).filter(
              (s: Student) => !enrolledIds.includes(s.StudentID)
            );
            setAvailableStudents(available);
          } else {
            setMessage({ type: 'error', text: data.error || 'Failed to load students' });
          }
          setIsLoading(false);
        })
        .withFailureHandler((error: any) => {
          setMessage({ type: 'error', text: 'Error loading students' });
          setIsLoading(false);
        })
        .getAllStudentsWithDetails();
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading students' });
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'add' && availableStudents.length === 0) {
      loadAvailableStudents();
    }
  }, [activeTab]);

  const handleAddStudent = async (studentId: number) => {
    setIsLoading(true);
    try {
      const response = await (window as any).google.script.run
        .withSuccessHandler((data: any) => {
          if (data.success) {
            setMessage({ type: 'success', text: 'Student added successfully' });
            loadEnrolledStudents();
            loadAvailableStudents();
            onRefresh();
          } else {
            setMessage({ type: 'error', text: data.error || 'Failed to add student' });
          }
          setIsLoading(false);
        })
        .withFailureHandler((error: any) => {
          setMessage({ type: 'error', text: 'Error adding student' });
          setIsLoading(false);
        })
        .enrollStudent(studentId, classOffering.OfferingID);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error adding student' });
      setIsLoading(false);
    }
  };

  const handleRemoveStudent = async (enrollmentId: number) => {
    if (!confirm('Are you sure you want to remove this student from the class?')) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await (window as any).google.script.run
        .withSuccessHandler((data: any) => {
          if (data.success) {
            setMessage({ type: 'success', text: 'Student removed successfully' });
            loadEnrolledStudents();
            loadAvailableStudents();
            onRefresh();
          } else {
            setMessage({ type: 'error', text: data.error || 'Failed to remove student' });
          }
          setIsLoading(false);
        })
        .withFailureHandler((error: any) => {
          setMessage({ type: 'error', text: 'Error removing student' });
          setIsLoading(false);
        })
        .removeStudentFromClass(enrollmentId);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error removing student' });
      setIsLoading(false);
    }
  };

  const filteredStudents = (activeTab === 'enrolled' ? enrolledStudents : availableStudents)
    .filter(student =>
      (student.CompletionStatus !== 'ADMIN') && // Exclude ADMIN removals from roster
      (`${student.FirstName} ${student.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.PrimaryEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {classOffering.LevelName || `Level ${classOffering.ClassLevelID}`}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {classOffering.TeacherName} • {classOffering.Status}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className="px-6 pt-4">
            <Message
              type={message.type}
              message={message.text}
              onClose={() => setMessage(null)}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('enrolled')}
              className={`pb-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'enrolled'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Enrolled Students ({enrolledStudents.length}/{classOffering.MaxStudents})
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`pb-3 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'add'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Add Students
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Student List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading ? (
            <Loader text="Loading students..." />
          ) : filteredStudents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => (
                <div key={student.StudentID} className="relative">
                  <StudentCard student={student} onClick={() => {}} />
                  {activeTab === 'enrolled' ? (
                    <button
                      onClick={() => student.EnrollmentID && handleRemoveStudent(student.EnrollmentID)}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      title="Remove from class"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddStudent(student.StudentID)}
                      className="absolute top-2 right-2 p-1 bg-green-500 text-white rounded-full hover:bg-green-600 transition-colors"
                      title="Add to class"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchTerm
                  ? 'No students found matching your search'
                  : activeTab === 'enrolled'
                  ? 'No students enrolled yet'
                  : 'No available students to add'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
