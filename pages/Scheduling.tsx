import React, { useState, useEffect } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { CalendarEvent, ShowWithDetails, ClassWithDetails } from '../types';
import { supabaseService as gasService } from '../services/supabaseService';

export const Scheduling: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    setIsLoading(true);
    try {
      const [showsResponse, classesResponse] = await Promise.all([
        gasService.getAllShows(),
        gasService.getAllClasses()
      ]);

      const calendarEvents: CalendarEvent[] = [];

      if (showsResponse.success && showsResponse.data) {
        showsResponse.data.forEach((show: ShowWithDetails) => {
          calendarEvents.push({
            id: `show-${show.ShowID}`,
            title: `${show.ShowTypeName || 'Show'} - ${show.Venue}`,
            date: new Date(show.ShowDate).toISOString().split('T')[0],
            type: 'show',
            details: show
          });
        });
      }

      if (classesResponse.success && classesResponse.data) {
        classesResponse.data.forEach((classOffering: ClassWithDetails) => {
          // Add recurring events for class duration
          const startDate = new Date(classOffering.StartDate);
          const endDate = new Date(classOffering.EndDate);
          
          // Simple weekly recurrence (assuming classes are weekly)
          let currentDate = new Date(startDate);
          while (currentDate <= endDate) {
            calendarEvents.push({
              id: `class-${classOffering.OfferingID}-${currentDate.toISOString().split('T')[0]}`,
              title: `${classOffering.LevelName || 'Class'} - ${classOffering.RoomName || classOffering.VenueOrRoom || ''}`,
              date: currentDate.toISOString().split('T')[0],
              type: 'class',
              details: classOffering
            });
            currentDate.setDate(currentDate.getDate() + 7); // Add 7 days for weekly
          }
        });
      }

      setEvents(calendarEvents);
    } catch (error) {
      setMessage({ type: 'error', text: 'Error loading calendar events' });
    } finally {
      setIsLoading(false);
    }
  };

  const getEventsForDate = (date: string) => {
    return events.filter(event => event.date === date);
  };

  const generateCalendarDays = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const current = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = getEventsForDate(dateStr);
      const isCurrentMonth = current.getMonth() === month;
      const isToday = dateStr === today.toISOString().split('T')[0];
      
      days.push({
        date: new Date(current),
        dateStr,
        events: dayEvents,
        isCurrentMonth,
        isToday
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  if (isLoading) {
    return <Loader text="Loading schedule..." />;
  }

  const calendarDays = generateCalendarDays();
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  const today = new Date();
  const selectedDateEvents = getEventsForDate(selectedDate);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-4 sm:mb-6">Schedule</h1>

      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      <div className="mb-6 space-y-4 md:hidden">
        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <label htmlFor="schedule-date" className="mb-2 block text-sm font-medium text-gray-700">Select date</label>
          <input
            id="schedule-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="rounded-lg border bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Agenda</h2>
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
              {selectedDateEvents.length} event{selectedDateEvents.length === 1 ? '' : 's'}
            </span>
          </div>

          {selectedDateEvents.length === 0 ? (
            <p className="text-sm text-gray-500">No shows or classes scheduled for this date.</p>
          ) : (
            <div className="space-y-3">
              {selectedDateEvents.map((event) => (
                <article key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-gray-900">{event.title}</h3>
                      <p className="mt-1 text-xs text-gray-500">{event.date}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${event.type === 'show' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                      {event.type === 'show' ? 'Show' : 'Class'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="hidden rounded-lg border bg-white shadow-sm md:block">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[today.getMonth()]} {today.getFullYear()}
          </h2>
        </div>

        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="bg-gray-50 p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {calendarDays.map((day, index) => (
            <div
              key={index}
              className={`bg-white p-2 h-24 overflow-hidden ${
                !day.isCurrentMonth ? 'text-gray-400' : ''
              } ${day.isToday ? 'bg-primary-50' : ''}`}
            >
              <div className={`text-sm font-medium mb-1 ${day.isToday ? 'text-primary-700' : ''}`}>
                {day.date.getDate()}
              </div>
              <div className="space-y-1">
                {day.events.slice(0, 2).map((event, eventIndex) => (
                  <div
                    key={eventIndex}
                    className={`text-xs px-1 py-0.5 rounded truncate ${
                      event.type === 'show' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}
                    title={event.title}
                  >
                    {event.title}
                  </div>
                ))}
                {day.events.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{day.events.length - 2} more
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Legend</h3>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-200 rounded"></div>
              <span className="text-sm text-gray-700">Shows</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-200 rounded"></div>
              <span className="text-sm text-gray-700">Classes</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Quick Stats</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Total Events:</span>
              <span className="text-sm font-medium text-gray-900">{events.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Shows:</span>
              <span className="text-sm font-medium text-gray-900">
                {events.filter(e => e.type === 'show').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Class Sessions:</span>
              <span className="text-sm font-medium text-gray-900">
                {events.filter(e => e.type === 'class').length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};