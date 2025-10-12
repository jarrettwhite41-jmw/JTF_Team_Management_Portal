import React, { useState, useEffect } from 'react';
import { ShowCard } from '../components/shows/ShowCard';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { ShowWithDetails } from '../types';
import { gasService } from '../services/googleAppsScript';

export const Shows: React.FC = () => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadShows();
  }, []);

  const loadShows = async () => {
    setIsLoading(true);
    try {
      const response = await gasService.getAllShows();
      if (response.success && response.data) {
        setShows(response.data);
      } else {
        setMessage({ type: 'error', text: response.error || 'Failed to load shows' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading shows data' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageCast = (show: ShowWithDetails) => {
    // TODO: Implement cast management modal
    console.log('Managing cast for show:', show);
    setMessage({ type: 'info', text: 'Cast management feature coming soon!' });
  };

  if (isLoading) {
    return <Loader text="Loading shows..." />;
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shows</h1>
        <button className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          Add New Show
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {shows.map((show) => (
          <ShowCard
            key={show.ShowID}
            show={show}
            onManageCast={() => handleManageCast(show)}
          />
        ))}
      </div>
    </div>
  );
};