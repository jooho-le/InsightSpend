export type StressLog = {
  id: string;
  uid: string;
  date: string;
  mood: string;
  context: string;
  memo: string;
  score: number;
};

export type FinanceLog = {
  id: string;
  uid: string;
  date: string;
  category: string;
  amount: number;
  memo: string;
};

export type DailyInsightSummary = {
  id: string;
  uid: string;
  date: string;
  stressScoreAvg: number;
  stressScoreMax: number;
  stressCount: number;
  topMood: string | null;
  topContext: string | null;
  dailyExpense: number;
  topCategories: { category: string; amount: number }[];
};
