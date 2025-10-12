import React, { useState, useEffect } from 'react';
import { ClassCard } from '../components/classes/ClassCard';
import { StudentCard } from '../components/classes/StudentCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { ClassWithDetails, PersonnelWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

export const ClassRegistration: React.FC = () => {
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [students, setStudents] = useState<PersonnelWithDetails[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<PersonnelWithDetails[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassWithDetails | null>(null);
  const [selectedStudents, setSelectedStudents] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const filtered = students.filter(student =>
      `${student.FirstName} ${student.LastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.PrimaryEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredStudents(filtered);
  }, [students, searchTerm]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [classesResponse, personnelResponse] = await Promise.all([
        gasService.getAllClasses(),
        gasService.getAllPersonnel()
      ]);

      if (classesResponse.success && classesResponse.data) {
        setClasses(classesResponse.data);
      }

      if (personnelResponse.success && personnelResponse.data) {
        // Filter for students only
        const studentData = personnelResponse.data.filter(person => person.isStudent);
        setStudents(studentData);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassSelect = (classOffering: ClassWithDetails) => {
    setSelectedClass(classOffering);
    setSelectedStudents(new Set());
  };

  const handleStudentToggle = (studentId: number) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  const handleRegister = async () => {
    if (!selectedClass || selectedStudents.size === 0) return;

    try {
      const response = await gasService.enrollStudents(
        selectedClass.OfferingID,
        Array.from(selectedStudents)
      );

      if (response.success) {
        setMessage({ type: 'success', text: `Successfully registered ${selectedStudents.size} students` });
        setSelectedStudents(new Set());
        loadData(); // Refresh data
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to register students' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error registering students' });
    }
  };

  if (isLoading) {
    return <Loader text="Loading classes and students..." />;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Class Registration</h1>

      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Panel - Classes */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Classes</h2>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {classes.map((classOffering) => (
              <ClassCard
                key={classOffering.OfferingID}
                classOffering={classOffering}
                onSelect={() => handleClassSelect(classOffering)}
                isSelected={selectedClass?.OfferingID === classOffering.OfferingID}
              />
            ))}
          </div>
        </div>

        {/* Right Panel - Students */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Select Students</h2>
            {selectedClass && (
              <span className="text-sm text-gray-600">
                Class: {selectedClass.LevelName || `Level ${selectedClass.ClassLevelID}`}
              </span>
            )}
          </div>

          {selectedClass ? (
            <>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto mb-4">
                {filteredStudents.map((student) => (
                  <StudentCard
                    key={student.PersonnelID}
                    student={student}
                    isSelected={selectedStudents.has(student.PersonnelID)}
                    onToggle={() => handleStudentToggle(student.PersonnelID)}
                  />
                ))}
              </div>

              <button
                onClick={handleRegister}
                disabled={selectedStudents.size === 0}
                className="w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Register {selectedStudents.size} Student{selectedStudents.size !== 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              <p>Select a class to view and register students</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};