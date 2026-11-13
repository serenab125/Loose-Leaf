/**
 * Save or update quiz progress for a user in Supabase.
 * Each user can have multiple incomplete quiz sessions; the latest one is restored.
 *
 * IMPORTANT: A Supabase client instance MUST be passed via the `client` parameter.
 * The module-level `supabase` client (supabaseClient.js) is NOT used here to avoid
 * the "Multiple instances of the client" warning and the wrong persistence mode.
 *
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} answers - The current quiz answers (sectionId -> selected options)
 * @param {number} currentStep - The current quiz step (0 = intro, 1 = taste, 2 = goals, 3 = complete)
 * @param {object} options - Save options
 * @param {object} options.client - The Supabase client instance (REQUIRED, no default)
 * @param {boolean} options.completed - Whether this is a completed progress record
 */
export async function saveQuizProgress(userId, answers, currentStep = 3, { client, completed = false } = {}) {
  if (!userId) return;
  if (!client) {
    throw new Error('quizService.saveQuizProgress: no Supabase client provided. Pass the client from useAuth().');
  }

  try {
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
  } catch (error) {
    console.error('Error saving quiz progress:', error);
    throw error;
  }
}

/**
 * Retrieve the latest incomplete quiz progress for a user.
 * @param {string} userId - The authenticated user's Supabase ID
 * @param {object} options - Options
 * @param {object} options.client - The Supabase client instance
 * @returns {Promise<{answers: object, current_step: number} | null>}
 */
export async function getIncompleteQuizProgress(userId, { client } = {}) {
  if (!userId) return null;
  if (!client) {
    throw new Error('quizService.getIncompleteQuizProgress: no Supabase client provided. Pass the client from useAuth().');
  }

  try {
    const { data, error } = await client
      .from('quiz_progress')
      .select('answers, current_step')
      .eq('user_id', userId)
      .eq('completed_at', null)
      .order('updated_at', { ascending: false })
      .single();

    if (error && error.code !== 'PGRST116') throw error;
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
 * @param {object} options.client - The Supabase client instance
 * @returns {Promise<boolean>}
 */
export async function hasIncompleteQuizProgress(userId, { client } = {}) {
  if (!userId) return false;
  if (!client) {
    throw new Error('quizService.hasIncompleteQuizProgress: no Supabase client provided. Pass the client from useAuth().');
  }

  const progress = await getIncompleteQuizProgress(userId, { client });
  return !!progress;
}
