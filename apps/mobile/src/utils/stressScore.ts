const HIGH_STRESS_KEYWORDS = [
  "스트레스",
  "불안",
  "우울",
  "짜증",
  "분노",
  "화",
  "긴장",
  "피곤",
  "압박",
  "슬픔",
  "초조",
  "걱정",
  "공황",
  "stress",
  "anxious",
  "anxiety",
  "sad",
  "angry",
  "tired",
  "upset",
  "depressed",
  "panic",
  "burnout",
];

const LOW_STRESS_KEYWORDS = [
  "행복",
  "기쁨",
  "좋음",
  "즐거",
  "평온",
  "편안",
  "안정",
  "만족",
  "감사",
  "차분",
  "기분좋",
  "happy",
  "joy",
  "good",
  "calm",
  "relaxed",
  "content",
  "grateful",
  "peace",
];

const NEUTRAL_KEYWORDS = [
  "보통",
  "평범",
  "무난",
  "그냥",
  "중간",
  "ok",
  "okay",
  "neutral",
];

export function computeStressScore(mood: string) {
  const value = mood.trim().toLowerCase();
  if (!value) return 50;
  if (HIGH_STRESS_KEYWORDS.some((keyword) => value.includes(keyword))) return 80;
  if (LOW_STRESS_KEYWORDS.some((keyword) => value.includes(keyword))) return 20;
  if (NEUTRAL_KEYWORDS.some((keyword) => value.includes(keyword))) return 50;
  return 50;
}
