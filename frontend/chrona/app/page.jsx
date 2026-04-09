// ============================================================
// page.jsx — Main page: wired to Supabase + FastAPI backend
// ============================================================

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEvents } from '@/hooks/useEvents';
import api from '@/lib/api';
import PaperGrain from '@/components/PaperGrain';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import MindMapCanvas from '@/components/MindMapCanvas';
import FloatingActionButton from '@/components/FloatingActionButton';
import AddItemModal from '@/components/AddItemModal';
import UpcomingView from '@/components/UpcomingView';
import CalendarView from '@/components/CalendarView';
import HabitsView from '@/components/HabitsView';
import JournalView from '@/components/JournalView';
import GoalsView from '@/components/GoalsView';
import ArchiveView from '@/components/ArchiveView';
import PriorityView from '@/components/PriorityView';

// Map event categories → mind map category nodes
const CATEGORY_MAP = {
  exam: { id: 'exam', name: 'EXAM', style: 'exam', position: { x: 72, y: 50 }, rotation: 3 },
  hackathon: { id: 'hackathon', name: 'HACKATHON', style: 'hackathon', position: { x: 50, y: 30 }, rotation: -2 },
  personal: { id: 'personal', name: 'PERSONAL', style: 'personal', position: { x: 28, y: 50 }, rotation: -1 },
  assignment: { id: 'assignment', name: 'ASSIGNMENT', style: 'hackathon', position: { x: 35, y: 70 }, rotation: 1 },
  meeting: { id: 'meeting', name: 'MEETING', style: 'exam', position: { x: 65, y: 70 }, rotation: -3 },
  reminder: { id: 'reminder', name: 'REMINDER', style: 'other', position: { x: 55, y: 72 }, rotation: 2 },
  other: { id: 'other', name: 'OTHER', style: 'other', position: { x: 55, y: 72 }, rotation: 2 },
};

function formatDate(dt) {
  if (!dt) return 'TBD';
  const d = new Date(dt);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' +
         d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function Home() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const { events, loading: eventsLoading, fetchEvents, deleteEvent, updateEvent } = useEvents();

  const [activeTab, setActiveTab] = useState('Today');
  const [currentView, setCurrentView] = useState('Priority Tasks');
  const [mePosition, setMePosition] = useState({ x: 50, y: 50 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryPositions, setCategoryPositions] = useState({});
  const [taskPositions, setTaskPositions] = useState({});

  // Check onboarding status — redirect if not completed
  useEffect(() => {
    if (!user) return;
    const onboarded = localStorage.getItem('chrona_onboarded');
    if (onboarded === 'true') return;

    api.get('/api/onboarding/status')
      .then(data => {
        if (data.completed) {
          localStorage.setItem('chrona_onboarded', 'true');
        } else {
          router.push('/onboarding');
        }
      })
      .catch(() => {}); // Silently fail — don't block the dashboard
  }, [user]);

  // Load positions from local storage on mount
  useEffect(() => {
    try {
      const savedCats = localStorage.getItem('chrona_category_positions');
      const savedTasks = localStorage.getItem('chrona_task_positions');
      const savedMe = localStorage.getItem('chrona_me_position');
      if (savedCats) setCategoryPositions(JSON.parse(savedCats));
      if (savedTasks) setTaskPositions(JSON.parse(savedTasks));
      if (savedMe) setMePosition(JSON.parse(savedMe));
    } catch (e) {
      console.warn("Failed to load map positions from local storage", e);
    }
  }, []);

  // Build categories from live events
  const categories = useMemo(() => {
    const usedCats = new Set(events.map(e => e.category || 'other'));
    return [...usedCats].map(cat => {
      const base = CATEGORY_MAP[cat] || CATEGORY_MAP.other;
      return { ...base, id: cat, name: cat.toUpperCase(), position: categoryPositions[cat] || base.position };
    });
  }, [events, categoryPositions]);

  // Build tasks from live events
  const tasks = useMemo(() => {
    return events.map((event, idx) => {
      const catId = event.category || 'other';
      const catBase = CATEGORY_MAP[catId] || CATEGORY_MAP.other;
      // Spread tasks around their category center
      const angle = (idx * 137.5) * (Math.PI / 180);
      const radius = 15 + (idx % 3) * 5;
      const defaultPos = {
        x: Math.max(5, Math.min(95, catBase.position.x + Math.cos(angle) * radius)),
        y: Math.max(5, Math.min(95, catBase.position.y + Math.sin(angle) * radius)),
      };
      return {
        id: event.id,
        categoryId: catId,
        title: event.title,
        date: formatDate(event.event_datetime),
        position: taskPositions[event.id] || defaultPos,
        rotation: ((idx * 7) % 11) - 5,
        _raw: event,
      };
    });
  }, [events, taskPositions]);

  const handleMePositionChange = useCallback((_, newPos) => {
    setMePosition(newPos);
    localStorage.setItem('chrona_me_position', JSON.stringify(newPos));
  }, []);

  const handleCategoryPositionChange = useCallback((id, newPos) => {
    setCategoryPositions(prev => {
      const updated = { ...prev, [id]: newPos };
      localStorage.setItem('chrona_category_positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleTaskPositionChange = useCallback((id, newPos) => {
    setTaskPositions(prev => {
      const updated = { ...prev, [id]: newPos };
      localStorage.setItem('chrona_task_positions', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const handleAddItem = () => setIsModalOpen(true);

  const handleEventProcessed = () => {
    setIsModalOpen(false);
    fetchEvents(); // Refresh after new event added
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#fcf9f2' }}>
        <div className="text-center">
          <div className="text-4xl mb-4" style={{ fontFamily: 'Permanent Marker, cursive', color: '#ad170c' }}>C</div>
          <div className="text-sm uppercase tracking-widest opacity-40" style={{ fontFamily: 'Space Grotesk' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PaperGrain />
      <Header activeView={activeTab} onViewChange={setActiveTab} username={user?.username} />

      {activeTab === 'Today' && (
        <Sidebar 
          onAddItem={handleAddItem}
          activeItem={currentView}
          onNavigate={setCurrentView}
          onLogout={logout}
        />
      )}

      <div className={`relative z-0 ${activeTab !== 'Today' ? 'w-full px-12 pt-24 min-h-screen' : ''}`}>
        {activeTab === 'Today' && (
          <>
            {currentView === 'Upcoming' && (
              <UpcomingView events={events} onDelete={deleteEvent} onUpdate={updateEvent} onRefresh={fetchEvents} />
            )}
            {currentView === 'Priority Tasks' && (
              <MindMapCanvas
                categories={categories}
                tasks={tasks}
                mePosition={mePosition}
                onCategoryPositionChange={handleCategoryPositionChange}
                onTaskPositionChange={handleTaskPositionChange}
                onMePositionChange={handleMePositionChange}
              />
            )}
            {currentView === 'Priority Hub' && (
              <PriorityView events={events} onDelete={deleteEvent} onUpdate={updateEvent} onRefresh={fetchEvents} />
            )}
            {currentView === 'Long-term Goals' && <GoalsView events={events} />}
            {currentView === 'Archived Logs' && <ArchiveView events={events} onDelete={deleteEvent} />}
          </>
        )}

        {activeTab === 'Calendar' && <div className="-ml-64 scale-100"><CalendarView events={events} /></div>}
        {activeTab === 'Habits' && <div className="-ml-64 scale-100"><HabitsView /></div>}
        {activeTab === 'Journal' && <div className="-ml-64 scale-100"><JournalView /></div>}
      </div>

      <FloatingActionButton onClick={handleAddItem} />

      <AddItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleEventProcessed}
      />
    </>
  );
}
