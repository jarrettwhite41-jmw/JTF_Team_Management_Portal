import React, { useState, useEffect } from 'react';
import { CastCard } from '../components/cast/CastCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { CastMemberWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

export const CastDirectory: React.FC = () => {
  const [castMembers, setCastMembers] = useState<CastMemberWithDetails[]>([]);
  const [filteredCastMembers, setFilteredCastMembers] = useState<CastMemberWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCastMember, setSelectedCastMember] = useState<CastMemberWithDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadCastMembers();
  }, []);

  useEffect(() => {
    const filtered = castMembers.filter(member =>
      ((member as any).FullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.PrimaryEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (member.PrimaryPhone || '').toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredCastMembers(filtered);
  }, [castMembers, searchTerm]);

  const loadCastMembers = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllCastMembers();
      // The actual data is nested in response.data.data
      if (response.success && response.data && Array.isArray((response.data as any).data)) {
        setCastMembers((response.data as any).data);
        setMessage(null);
      } else {
        setMessage({ type: 'error', text: (response.data && (response.data as any).error) || (response as any).error || 'Failed to load cast members' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading cast member data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCastMemberClick = (castMember: CastMemberWithDetails) => {
    setSelectedCastMember(castMember);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedCastMember(null);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'TBD';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Cast Directory</h1>
        <p className="text-sm text-gray-600">{filteredCastMembers.length} cast assignments</p>
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
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {isLoading ? (
        <Loader text="Loading cast members..." />
      ) : message && message.type === 'error' ? (
        <div className="mb-4">
          <Message
            type="error"
            message={message.text}
            onClose={() => setMessage(null)}
          />
          <button
            onClick={loadCastMembers}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : filteredCastMembers.length === 0 ? (
        <div className="text-center text-gray-500 mt-8">
          <p>No cast members found.</p>
          <button
            onClick={loadCastMembers}
            className="mt-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Reload
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredCastMembers.map((castMember) => (
            <CastCard
              key={`${castMember.PerformanceID}-${castMember.CastMemberID}`}
              castMember={castMember}
              onClick={() => handleCastMemberClick(castMember)}
            />
          ))}
        </div>
      )}

      {/* Cast Member Detail Modal */}
      {selectedCastMember && isModalOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={handleCloseModal}
        >
          <div 
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Cast Member Details</h2>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <p className="text-gray-900">{(selectedCastMember as any).FullName || 'Unknown'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Show Date</label>
                <p className="text-gray-900">{formatDate((selectedCastMember as any).LastShowDate)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Birthday</label>
                <p className="text-gray-900">{formatDate((selectedCastMember as any).Birthday)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                  selectedCastMember.Status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedCastMember.Status || 'Unknown'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <p className="text-gray-900">{selectedCastMember.PrimaryEmail || 'Not available'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <p className="text-gray-900">{selectedCastMember.PrimaryPhone || 'Not available'}</p>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCloseModal}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};