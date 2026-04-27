export const normalizeScoreValue = (value) => Math.max(0, Number(value) || 0);

export const buildDraftScore = (score) => ({
  home: normalizeScoreValue(score?.home),
  away: normalizeScoreValue(score?.away),
});