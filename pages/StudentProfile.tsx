import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { StudentProfile as StudentProfileType, EnrollmentWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentProfileProps {
  studentId: number;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const [studentProfile, setStudentProfile] = useState<StudentProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudentProfile();
  }, [studentId]);

  const loadStudentProfile = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getStudentProfile(studentId);
      if (response.success && response.data) {
        setStudentProfile(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load student profile' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading student profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const getProgressionStatus = (level: number) => {
    if (!studentProfile?.ClassProgression) return 'not-started';
    const progression = studentProfile.ClassProgression.find(p => p.ClassLevelID === level);
    if (!progression) return 'not-started';
    return progression.Status.toLowerCase().replace(' ', '-');
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return <Loader text="Loading student profile..." />;
  }

  if (!studentProfile) {
    return (
      <div className="p-6">
        <button
          onClick={onBack}
          className="mb-4 text-primary-600 hover:text-primary-800 flex items-center"
        >
          ← Back to Personnel
        </button>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Not Found</h1>
          <p className="text-gray-600">Unable to load student profile information.</p>
        </div>
      </div>
    );
  }

  const currentEnrollments = studentProfile.Enrollments?.filter(e => e.Status === 'Active') || [];
  const completedEnrollments = studentProfile.Enrollments?.filter(e => e.Status === 'Completed') || [];

  return (
    <div className="p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-800 flex items-center"
        >
          ← Back to Personnel
        </button>
        <h1 className="text-2xl font-bold text-gray-900">
          {studentProfile.FirstName} {studentProfile.LastName} - Student Profile
        </h1>
        <div></div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Student Information */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Information</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Full Name</label>
                <p className="text-gray-900">{studentProfile.FirstName} {studentProfile.LastName}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Email</label>
                <p className="text-gray-900">{studentProfile.PrimaryEmail}</p>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p className="text-gray-900">{studentProfile.PrimaryPhone}</p>
              </div>
              
              {studentProfile.Birthday && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Birthday</label>
                  <p className="text-gray-900">{formatDate(studentProfile.Birthday)}</p>
                </div>
              )}

              {studentProfile.StudentInfo?.EnrollmentDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Student Since</label>
                  <p className="text-gray-900">{formatDate(studentProfile.StudentInfo.EnrollmentDate)}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  studentProfile.StudentInfo?.Status === 'Active' 
                    ? 'bg-green-100 text-green-800'
                    : studentProfile.StudentInfo?.Status === 'Graduated'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {studentProfile.StudentInfo?.Status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Class Level Progression */}
          <div className="mt-6 bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Progression</h2>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(level => {
                const status = getProgressionStatus(level);
                const progression = studentProfile.ClassProgression?.find(p => p.ClassLevelID === level);
                
                return (
                  <div key={level} className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {level}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">Level {level}</p>
                      {progression && progression.CompletionDate && (
                        <p className="text-xs text-gray-500">
                          Completed: {formatDate(progression.CompletionDate)}
                        </p>
                      )}
                    </div>
                    <div className={`px-2 py-1 text-xs rounded-full ${
                      status === 'completed' 
                        ? 'bg-green-100 text-green-800'
                        : status === 'in-progress'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {status === 'completed' ? 'Done' : status === 'in-progress' ? 'Current' : 'Not Started'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column - Enrollments */}
        <div className="lg:col-span-2">
          {/* Current Enrollments */}
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Current Enrollments</h2>
            {currentEnrollments.length > 0 ? (
              <div className="space-y-3">
                {currentEnrollments.map((enrollment) => (
                  <div key={enrollment.EnrollmentID} className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Class Level {enrollment.OfferingID} {/* This would need to be enhanced with actual class name */}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Enrolled: {formatDate(enrollment.EnrollmentDate)}
                        </p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {enrollment.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No current enrollments</p>
            )}
          </div>

          {/* Past Enrollments */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Past Enrollments</h2>
            {completedEnrollments.length > 0 ? (
              <div className="space-y-3">
                {completedEnrollments.map((enrollment) => (
                  <div key={enrollment.EnrollmentID} className="border-l-4 border-green-400 bg-green-50 p-4 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          Class Level {enrollment.OfferingID} {/* This would need to be enhanced with actual class name */}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Enrolled: {formatDate(enrollment.EnrollmentDate)}
                        </p>
                      </div>
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {enrollment.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No past enrollments</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};