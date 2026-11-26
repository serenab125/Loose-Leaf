import { supabase } from '../supabaseClient';

export async function saveReadingSession(session) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert(session)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getReadingSessions(userId) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getJournalEntries(userId) {
  const { data, error } = await supabase
    .from('reading_journal')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function saveJournalEntry(entry) {
  const { data, error } = await supabase
    .from('reading_journal')
    .insert(entry)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateJournalEntry(id, userId, updates) {
  const { data, error } = await supabase
    .from('reading_journal')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteJournalEntry(id, userId) {
  const { error } = await supabase
    .from('reading_journal')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw error;
}

export async function deleteReadingSession(id, userId) {
  const { data, error } = await supabase
    .from('reading_sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id')
    .single();

  if (error) throw error;
  return data;
}
