import React, { useState, useEffect } from 'react';
import { StatCard } from '../components/common/StatCard';
import { Loader } from '../components/common/Loader';
import { DashboardStats } from '../types';
import { gasService } from '../services/googleAppsScript';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await gasService.getDashboardStats();
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading dashboard..." />;
  }

  if (!stats) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
        <p className="text-gray-600">Unable to load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Personnel"
          value={stats.totalPersonnel}
          icon="👥"
          color="blue"
        />
        <StatCard
          title="Active Students"
          value={stats.activeStudents}
          icon="🎭"
          color="green"
        />
        <StatCard
          title="Upcoming Shows"
          value={stats.upcomingShows}
          icon="🎪"
          color="purple"
        />
        <StatCard
          title="Active Classes"
          value={stats.activeClasses}
          icon="📚"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Shows</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Improv Show #1</p>
                <p className="text-sm text-gray-600">Main Theater</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Dec 15, 2024</p>
                <p className="text-sm text-gray-600">7:30 PM</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Class Enrollment</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Beginner Class</span>
                <span>8/12 students</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: '67%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Intermediate Class</span>
                <span>10/15 students</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-primary-600 h-2 rounded-full" style={{ width: '67%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};