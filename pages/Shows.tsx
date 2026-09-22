import React, { useState, useEffect } from 'react';
import { ShowCard } from '../components/shows/ShowCard';
import { ShowEditModal } from '../components/shows/ShowEditModal';
import { ShowManagementModal } from '../components/shows/ShowManagementModal';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { PageType, ProgramCategory, ShowWithDetails } from '../types';
import { supabaseService } from '../services/supabaseService';

type FilterType = 'all' | 'next-up' | 'upcoming' | 'completed';
type CategoryFilterType = 'all' | ProgramCategory;

interface ShowsProps {
  onNavigate?: (page: PageType) => void;
}

export const Shows: React.FC<ShowsProps> = ({ onNavigate }) => {
  const [shows, setShows] = useState<ShowWithDetails[]>([]);
  const [filteredShows, setFilteredShows] = useState<ShowWithDetails[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilterType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showEditorOpen, setShowEditorOpen] = useState(false);
  const [showManagementOpen, setShowManagementOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<ShowWithDetails | null>(null);

  const getComputedStatus = (show: ShowWithDetails): 'Next Up' | 'Upcoming' | 'Completed' => {
    const rawDate = String(show.ShowDate || '').slice(0, 10);
    const showDate = new Date(`${rawDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    if (!Number.isNaN(showDate.getTime())) {
      if (showDate.getTime() < today.getTime()) return 'Completed';
      if (showDate.getTime() <= nextWeek.getTime()) return 'Next Up';
      return 'Upcoming';
    }

    const status = String(show.Status || '').toLowerCase();
    if (status === 'completed') return 'Completed';
    if (status === 'in progress' || status === 'in-progress' || status === 'next up' || status === 'next-up') return 'Next Up';
    return 'Upcoming';
  };

  useEffect(() => {
    loadShows();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [shows, filter, categoryFilter]);

  const getProgramCategory = (show: ShowWithDetails): ProgramCategory => {
    if (show.ProgramCategory === 'jtf_presents') {
      return 'jtf_presents';
    }

    const typeName = String(show.ShowTypeName || '').trim().toLowerCase();
    if (typeName === 'jtf presents') {
      return 'jtf_presents';
    }

    return 'standard';
  };

  const loadShows = async () => {
    setIsLoading(true);
    try {
      // Try to get enhanced show details first
      let response = await supabaseService.getShowsWithDetails();
      
      // If the enhanced function fails, fall back to basic getAllShows
      if (!response.success || !response.data) {
        console.log('getShowsWithDetails failed, falling back to getAllShows:', response.error);
        response = await supabaseService.getAllShows();
        
        if (response.success && response.data) {
          // Transform basic show data to match ShowWithDetails structure
          const enhancedShows = response.data.map(show => ({
            ...show,
            ShowTypeName: `Type ${show.ShowTypeID}`,
            DirectorName: 'TBD',
            CastMembers: [],
            ProgramCategory: 'standard' as ProgramCategory,
          }));
          setShows(enhancedShows);
        } else {
          setMessage({ type: 'error', text: response.error || 'Failed to load shows' });
        }
      } else {
        setShows(response.data);
      }
    } catch (error) {
      console.error('Error loading shows:', error);
      setMessage({ type: 'error', text: 'Error loading shows data' });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...shows];

    // Apply status filter
    if (filter !== 'all') {
      const statusMap: Record<FilterType, string> = {
        'all': '',
        'next-up': 'Next Up',
        'upcoming': 'Upcoming',
        'completed': 'Completed'
      };
      filtered = filtered.filter(s => getComputedStatus(s) === statusMap[filter]);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(s => getProgramCategory(s) === categoryFilter);
    }

    setFilteredShows(filtered);
  };

  const getFilterCount = (filterType: FilterType): number => {
    if (filterType === 'all') return shows.length;
    const statusMap: Record<FilterType, string> = {
      'all': '',
      'next-up': 'Next Up',
      'upcoming': 'Upcoming',
      'completed': 'Completed'
    };
    return shows.filter(s => getComputedStatus(s) === statusMap[filterType]).length;
  };

  const getCategoryFilterCount = (target: CategoryFilterType): number => {
    if (target === 'all') return shows.length;
    return shows.filter(s => getProgramCategory(s) === target).length;
  };

  const filteredJtfShows = filteredShows.filter(show => getProgramCategory(show) === 'jtf_presents');
  const filteredStandardShows = filteredShows.filter(show => getProgramCategory(show) === 'standard');

  const handleManageCast = (show: ShowWithDetails) => {
    setSelectedShow(show);
    setShowManagementOpen(true);
  };

  const handleAddShow = () => {
    setSelectedShow(null);
    setShowEditorOpen(true);
  };

  if (isLoading) {
    return <Loader text="Loading shows..." />;
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Shows</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate?.('cast')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Go to Cast Management
          </button>
          <button
            onClick={() => onNavigate?.('crew')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Crew Assignments
          </button>
          <button
            onClick={() => onNavigate?.('bartenders')}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            View Bartenders
          </button>
          <button
            onClick={handleAddShow}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add New Show
          </button>
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

      {/* Filters */}
      <div className="mb-4 sm:mb-6 space-y-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'all'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Programs ({getCategoryFilterCount('all')})
          </button>
          <button
            onClick={() => setCategoryFilter('jtf_presents')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'jtf_presents'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            JTF Presents ({getCategoryFilterCount('jtf_presents')})
          </button>
          <button
            onClick={() => setCategoryFilter('standard')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              categoryFilter === 'standard'
                ? 'bg-indigo-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Standard ({getCategoryFilterCount('standard')})
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            All Shows ({getFilterCount('all')})
          </button>
          <button
            onClick={() => setFilter('next-up')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'next-up'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Next Up ({getFilterCount('next-up')})
          </button>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'upcoming'
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Upcoming ({getFilterCount('upcoming')})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-gray-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            Completed ({getFilterCount('completed')})
          </button>
        </div>
      </div>

      {categoryFilter === 'all' ? (
        <div className="space-y-8">
          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">JTF Presents</h2>
                <p className="text-sm text-gray-500">Dedicated shows with attendance estimates and notes-first planning.</p>
              </div>
              <span className="text-sm font-medium text-indigo-700">{filteredJtfShows.length} show{filteredJtfShows.length === 1 ? '' : 's'}</span>
            </div>
            {filteredJtfShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredJtfShows.map((show) => (
                  <ShowCard
                    key={show.ShowID}
                    show={show}
                    onManageCast={() => handleManageCast(show)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No JTF Presents shows found.
              </div>
            )}
          </section>

          <section>
            <div className="mb-3 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Standard Shows</h2>
                <p className="text-sm text-gray-500">All remaining production and recurring show entries.</p>
              </div>
              <span className="text-sm font-medium text-gray-700">{filteredStandardShows.length} show{filteredStandardShows.length === 1 ? '' : 's'}</span>
            </div>
            {filteredStandardShows.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredStandardShows.map((show) => (
                  <ShowCard
                    key={show.ShowID}
                    show={show}
                    onManageCast={() => handleManageCast(show)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white p-6 text-sm text-gray-500">
                No standard shows found.
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShows.map((show) => (
            <ShowCard
              key={show.ShowID}
              show={show}
              onManageCast={() => handleManageCast(show)}
            />
          ))}
        </div>
      )}

      <ShowEditModal
        isOpen={showEditorOpen}
        show={selectedShow}
        onClose={() => setShowEditorOpen(false)}
        onSaved={() => {
          setShowEditorOpen(false);
          loadShows();
        }}
      />

      {selectedShow && (
        <ShowManagementModal
          isOpen={showManagementOpen}
          show={selectedShow}
          onClose={() => setShowManagementOpen(false)}
          onSaved={() => {
            setShowManagementOpen(false);
            loadShows();
          }}
        />
      )}
    </div>
  );
};
