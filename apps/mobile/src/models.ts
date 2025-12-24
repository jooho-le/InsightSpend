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
  type: "expense" | "income";
  amount: number;
  memo: string;
};

export type AiRecommendation = {
  title: string;
  duration: string;
  type: "Quick" | "Rule" | "Situational" | "Recovery";
  steps: string[];
  reason: string;
};

export type AiInsight = {
  summary: string;
  pattern: string;
  recommendations: AiRecommendation[];
  goal?: string;
  model: string;
  generatedAt: string;
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
  ai?: AiInsight;
  aiVersion?: number;
};

export type StressBucket = "Low" | "Mid" | "High";

export type StressBucketSpend = {
  bucket: StressBucket;
  avgDailyExpense: number;
  dayCount: number;
};

export type MoodCategorySummary = {
  mood: string;
  topCategories: { category: string; amount: number }[];
  totalExpense: number;
};

export type StressSpendInsight = {
  periodDays: number;
  dailyExpense: number;
  avgExpense: number;
  spendSpike: boolean;
  bucketSummaries: StressBucketSpend[];
  moodCategoryTop: MoodCategorySummary[];
  topSpendCategories: { category: string; amount: number }[];
  highStressDays: number;
  lowStressDays: number;
  ratioHighLow: number | null;
  patternSummary: string;
  triggerSummary: string;
};
