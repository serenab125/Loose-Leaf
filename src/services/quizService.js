import { supabase } from '../supabaseClient';

/**
 * Save or update quiz progress for a user in Supabase.
 * Each user can have multiple incomplete quiz sessions; the latest one is restored.
 *
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} answers - The current quiz answers (sectionId -> selected options)
 * @param {number} currentStep - The current quiz step (0 = intro, 1 = taste, 2 = goals, 3 = complete)
 * @param {object} options - Save options
 * @param {object} options.client - Optional Supabase client instance to use (defaults to module-level supabase)
 * @param {boolean} options.completed - Whether this is a completed progress record
 */
export async function saveQuizProgress(userId, answers, currentStep = 3, { client = supabase, completed = false } = {}) {
  if (!userId) return;

  const { error } = await client
    .from('quiz_progress')
    .upsert(
      {
        user_id: userId,
        answers: answers || {},
        current_step: currentStep,
        completed_at: completed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

  if (error) {
    console.error('Error saving quiz progress:', error);
    throw error;
  }
}

/**
 * Retrieve the latest incomplete quiz progress for a user.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} options - Options
 * @param {object} options.client - Optional Supabase client instance to use (defaults to module-level supabase)
 * @returns {Promise<{answers: object, current_step: number} | null>}
 */
export async function getIncompleteQuizProgress(userId, { client = supabase } = {}) {
  if (!userId) return null;

  try {
    const { data, error } = await client
      .from('quiz_progress')
      .select('answers, current_step')
      .eq('user_id', userId)
      .eq('completed_at', null)
      .order('updated_at', { ascending: false })
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
    return data || null;
  } catch (error) {
    console.error('Error fetching quiz progress:', error);
    return null;
  }
}

/**
 * Check if a user has any incomplete quiz progress saved.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} options - Options
 * @param {object} options.client - Optional Supabase client instance to use (defaults to module-level supabase)
 * @returns {Promise<boolean>}
 */
export async function hasIncompleteQuizProgress(userId, { client = supabase } = {}) {
  const progress = await getIncompleteQuizProgress(userId, { client });
  return !!progress;
}
