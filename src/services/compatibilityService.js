
const CATEGORY_WEIGHTS = {
  stories: 45,
  vibe: 35,
  'movies-tv': 20,
};

const NEUTRAL_ANSWERS = new Set([
  'not-sure',
  'surprise',
  'everything',
  'other',
]);

function normalizeAnswer(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function getAnswers(preferences, category) {
  const selected = Array.isArray(preferences?.[category])
    ? preferences[category]
    : [];

  const customKey = `${category}-other`;

  const custom = Array.isArray(preferences?.[customKey])
    ? preferences[customKey]
    : [];

  const answers = [
    ...selected.filter((answer) => !NEUTRAL_ANSWERS.has(answer)),
    ...(selected.includes('other') ? custom : []),
  ];

  return new Set(
    answers.map(normalizeAnswer).filter(Boolean)
  );
}

function jaccardSimilarity(first, second) {
  const intersection = [...first].filter((item) =>
    second.has(item)
  ).length;

  const union = new Set([...first, ...second]).size;

  return union === 0 ? null : intersection / union;
}

/**
 * Returns a percentage from 0 to 100,
 * or null when compatibility cannot be calculated.
 *
 * Only pass completed quiz preferences into this function.
 */
export function calculateCompatibility(
  currentPreferences,
  reviewerPreferences
) {
  if (!currentPreferences || !reviewerPreferences) {
    return null;
  }

  let weightedScore = 0;
  let availableWeight = 0;

  for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
    const currentAnswers = getAnswers(currentPreferences, category);
    const reviewerAnswers = getAnswers(reviewerPreferences, category);

    // Ignore categories one or both readers did not answer.
    if (currentAnswers.size === 0 || reviewerAnswers.size === 0) {
      continue;
    }

    const similarity = jaccardSimilarity(
      currentAnswers,
      reviewerAnswers
    );

    weightedScore += similarity * weight;
    availableWeight += weight;
  }

  if (availableWeight === 0) return null;

  return Math.round((weightedScore / availableWeight) * 100);
}
