import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { StudentProfileData } from '../types';
import { gasService } from '../services/googleAppsScript';

interface StudentProfileProps {
  studentId: number;
  onBack: () => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({ studentId, onBack }) => {
  const [studentProfile, setStudentProfile] = useState<StudentProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadStudentProfile();
  }, [studentId]);

  const loadStudentProfile = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getStudentProfileData(studentId);
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

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Completed':
        return 'bg-blue-100 text-blue-800';
      case 'Dropped':
        return 'bg-red-100 text-red-800';
      case 'In Progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
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
          ← Back to Student Directory
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
  const droppedEnrollments = studentProfile.Enrollments?.filter(e => e.Status === 'Dropped') || [];

  return (
    <div className="p-6">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-primary-600 hover:text-primary-800 flex items-center font-medium"
        >
          ← Back to Student Directory
        </button>
        <div className="text-center flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {studentProfile.FirstName} {studentProfile.LastName}
          </h1>
          <p className="text-sm text-gray-600">Student Profile</p>
        </div>
        <div className="w-32"></div> {/* Spacer for balance */}
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
        {/* Left Column - Personal & Student Information */}
        <div className="lg:col-span-1 space-y-6">
          {/* Personal Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            
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
                <p className="text-gray-900">{studentProfile.PrimaryPhone || 'Not provided'}</p>
              </div>
              
              {studentProfile.Birthday && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Birthday</label>
                  <p className="text-gray-900">{formatDate(studentProfile.Birthday)}</p>
                </div>
              )}

              {studentProfile.Instagram && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Instagram</label>
                  <p className="text-gray-900">{studentProfile.Instagram}</p>
                </div>
              )}
            </div>
          </div>

          {/* Student Status Information */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Status</h2>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                    studentProfile.StudentStatus === 'Active' 
                      ? 'bg-green-100 text-green-800'
                      : studentProfile.StudentStatus === 'Graduated'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {studentProfile.StudentStatus || 'Unknown'}
                  </span>
                </div>
              </div>

              {studentProfile.EnrollmentDate && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Student Since</label>
                  <p className="text-gray-900">{formatDate(studentProfile.EnrollmentDate)}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-gray-500">Current Level</label>
                <p className="text-gray-900 font-medium">
                  {studentProfile.CurrentLevel ? `Level ${studentProfile.CurrentLevel}` : 'Not assigned'}
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Total Enrollments</label>
                <p className="text-gray-900 font-medium">{studentProfile.Enrollments?.length || 0}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Active Classes</label>
                <p className="text-gray-900 font-medium">{currentEnrollments.length}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-500">Completed Classes</label>
                <p className="text-gray-900 font-medium">{completedEnrollments.length}</p>
              </div>
            </div>
          </div>

          {/* Class Level Progression */}
          {studentProfile.Progression && studentProfile.Progression.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Level Progression</h2>
              <div className="space-y-3">
                {studentProfile.Progression.map((progression, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                      progression.Status === 'Completed' 
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {progression.ClassLevelID}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{progression.LevelName || `Level ${progression.ClassLevelID}`}</p>
                      {progression.CompletionDate && (
                        <p className="text-xs text-gray-500">
                          {progression.Status === 'Completed' ? 'Completed: ' : 'In Progress Since: '}
                          {formatDate(progression.CompletionDate)}
                        </p>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadgeClass(progression.Status)}`}>
                      {progression.Status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Enrollments */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Enrollments */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Current Enrollments ({currentEnrollments.length})
            </h2>
            {currentEnrollments.length > 0 ? (
              <div className="space-y-3">
                {currentEnrollments.map((enrollment) => (
                  <div key={enrollment.EnrollmentID} className="border-l-4 border-blue-400 bg-blue-50 p-4 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {enrollment.ClassLevelName || `Class Level ${enrollment.OfferingID}`}
                        </h3>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <p>Enrolled: {formatDate(enrollment.EnrollmentDate)}</p>
                          {enrollment.StartDate && (
                            <p>Class Dates: {formatDate(enrollment.StartDate)} - {enrollment.EndDate ? formatDate(enrollment.EndDate) : 'Ongoing'}</p>
                          )}
                          {enrollment.TeacherName && (
                            <p>Teacher: {enrollment.TeacherName}</p>
                          )}
                          {enrollment.VenueOrRoom && (
                            <p>Location: {enrollment.VenueOrRoom}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(enrollment.Status)}`}>
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

          {/* Completed Enrollments */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Completed Classes ({completedEnrollments.length})
            </h2>
            {completedEnrollments.length > 0 ? (
              <div className="space-y-3">
                {completedEnrollments.map((enrollment) => (
                  <div key={enrollment.EnrollmentID} className="border-l-4 border-green-400 bg-green-50 p-4 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {enrollment.ClassLevelName || `Class Level ${enrollment.OfferingID}`}
                        </h3>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <p>Enrolled: {formatDate(enrollment.EnrollmentDate)}</p>
                          {enrollment.StartDate && (
                            <p>Class Dates: {formatDate(enrollment.StartDate)} - {enrollment.EndDate ? formatDate(enrollment.EndDate) : 'N/A'}</p>
                          )}
                          {enrollment.TeacherName && (
                            <p>Teacher: {enrollment.TeacherName}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(enrollment.Status)}`}>
                        {enrollment.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No completed classes yet</p>
            )}
          </div>

          {/* Dropped Enrollments (if any) */}
          {droppedEnrollments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Dropped Classes ({droppedEnrollments.length})
              </h2>
              <div className="space-y-3">
                {droppedEnrollments.map((enrollment) => (
                  <div key={enrollment.EnrollmentID} className="border-l-4 border-red-400 bg-red-50 p-4 rounded-r-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {enrollment.ClassLevelName || `Class Level ${enrollment.OfferingID}`}
                        </h3>
                        <div className="mt-2 text-sm text-gray-600 space-y-1">
                          <p>Enrolled: {formatDate(enrollment.EnrollmentDate)}</p>
                          {enrollment.TeacherName && (
                            <p>Teacher: {enrollment.TeacherName}</p>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(enrollment.Status)}`}>
                        {enrollment.Status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
