'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, getCurrentUserId } from '@/lib/supabase';

export function useEvents() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    const userId = getCurrentUserId();
    if (!userId) { setLoading(false); return; }

    setLoading(true);
    const { data, error: err } = await supabase
      .from('events')
      .select('*')
      .eq('user_id', userId)
      .order('event_datetime', { ascending: true });

    if (err) {
      setError(err.message);
    } else {
      setEvents(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const deleteEvent = async (eventId) => {
    const userId = getCurrentUserId();
    // 1. Nullify schedule_changes references
    await supabase
      .from('schedule_changes')
      .update({ event_id: null })
      .eq('event_id', eventId);
    // 2. Delete schedule_items
    await supabase
      .from('schedule_items')
      .delete()
      .eq('event_id', eventId);
    // 3. Delete event
    const { error: err } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', userId);

    if (!err) {
      setEvents(prev => prev.filter(e => e.id !== eventId));
    }
    return err;
  };

  const updateEvent = async (eventId, updates) => {
    const userId = getCurrentUserId();
    const { data, error: err } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .eq('user_id', userId)
      .select()
      .single();

    if (!err && data) {
      setEvents(prev => prev.map(e => e.id === eventId ? data : e));
    }
    return { data, error: err };
  };

  return { events, loading, error, fetchEvents, deleteEvent, updateEvent };
}
