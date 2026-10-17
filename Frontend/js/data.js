// Grade helpers only. All records now come from the Express API (see api.js).


export const COURSEWORK_WEIGHT = 0.4
export const EXAM_WEIGHT = 0.6

export const totalScore = (coursework, exam) =>
  Math.round(coursework * COURSEWORK_WEIGHT + exam * EXAM_WEIGHT)

export function letterFor(score) {
  if (score >= 70) return 'A'
  if (score >= 60) return 'B'
  if (score >= 50) return 'C'
  if (score >= 40) return 'D'
  return 'F'
}

export const pointsFor = letter => ({ A: 4, B: 3, C: 2, D: 1, F: 0 })[letter]
