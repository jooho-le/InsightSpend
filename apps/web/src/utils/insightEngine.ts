import type {
  FinanceLog,
  MoodCategorySummary,
  StressBucket,
  StressBucketSpend,
  StressLog,
  StressSpendInsight,
} from "../models";

type DateStats = {
  date: string;
  stressScores: number[];
  moods: string[];
  financeLogs: FinanceLog[];
};

const formatDate = (value: Date) => value.toISOString().slice(0, 10);

export const buildDateRange = (days: number, endDate = new Date()) => {
  const dates: string[] = [];
  const start = new Date(endDate);
  start.setDate(endDate.getDate() - (days - 1));
  for (let i = 0; i < days; i += 1) {
    const next = new Date(start);
    next.setDate(start.getDate() + i);
    dates.push(formatDate(next));
  }
  return dates;
};

const normalizeFinanceLogs = (logs: FinanceLog[]) =>
  logs.map((log) => ({
    ...log,
    type: log.type ?? "expense",
  }));

const getTopValue = (values: string[]) => {
  if (values.length === 0) return null;
  const freq = new Map<string, number>();
  values.forEach((value) => {
    const key = value.trim();
    if (!key) return;
    freq.set(key, (freq.get(key) ?? 0) + 1);
  });
  const top = Array.from(freq.entries()).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
};

const getTopCategories = (logs: FinanceLog[]) => {
  const totals = new Map<string, number>();
  logs.forEach((log) => {
    const key = log.category?.trim() || "기타";
    totals.set(key, (totals.get(key) ?? 0) + (log.amount || 0));
  });
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));
};

const getBucket = (score: number): StressBucket => {
  if (score >= 70) return "High";
  if (score >= 40) return "Mid";
  return "Low";
};

const summarizeBucket = (bucket: StressBucket, days: DateStats[]): StressBucketSpend => {
  const total = days.reduce((sum, day) => sum + day.financeLogs.reduce((acc, log) => acc + log.amount, 0), 0);
  const dayCount = days.length;
  return {
    bucket,
    dayCount,
    avgDailyExpense: dayCount ? Math.round(total / dayCount) : 0,
  };
};

const buildMoodCategoryTop = (stats: DateStats[]): MoodCategorySummary[] => {
  const moodTotals = new Map<string, FinanceLog[]>();
  stats.forEach((day) => {
    const topMood = getTopValue(day.moods);
    if (!topMood) return;
    const key = topMood.trim();
    if (!key) return;
    const logs = moodTotals.get(key) ?? [];
    moodTotals.set(key, logs.concat(day.financeLogs));
  });
  return Array.from(moodTotals.entries())
    .map(([mood, logs]) => ({
      mood,
      topCategories: getTopCategories(logs).slice(0, 3),
      totalExpense: logs.reduce((sum, log) => sum + log.amount, 0),
    }))
    .sort((a, b) => b.totalExpense - a.totalExpense);
};

const buildPatternSummary = (
  highAvg: number,
  lowAvg: number,
  ratio: number | null,
  periodDays: number
) => {
  if (!ratio || lowAvg === 0) {
    return `최근 ${periodDays}일 동안 스트레스 구간별 지출 패턴을 더 쌓고 있어요.`;
  }
  return `최근 ${periodDays}일 동안 High 스트레스 날의 평균 지출이 Low보다 ${ratio.toFixed(
    1
  )}배 높아요.`;
};

const buildTriggerSummary = (topCategory: string | null, highDays: number) => {
  if (!topCategory || highDays === 0) {
    return "스트레스가 쌓이는 날의 소비 트리거를 찾는 중이에요.";
  }
  return `High 스트레스 날에 '${topCategory}' 지출 비중이 커요.`;
};

export const buildStressSpendInsight = ({
  stressLogs,
  financeLogs,
  periodDays,
  endDate = new Date(),
  focusDate,
}: {
  stressLogs: StressLog[];
  financeLogs: FinanceLog[];
  periodDays: number;
  endDate?: Date;
  focusDate?: string;
}): StressSpendInsight => {
  const dates = buildDateRange(periodDays, endDate);
  const finance = normalizeFinanceLogs(financeLogs).filter((log) => log.type === "expense");

  const dateStats = dates.map<DateStats>((date) => ({
    date,
    stressScores: stressLogs.filter((log) => log.date === date).map((log) => log.score),
    moods: stressLogs.filter((log) => log.date === date).map((log) => log.mood),
    financeLogs: finance.filter((log) => log.date === date),
  }));

  const dailyExpenseMap = new Map(
    dateStats.map((day) => [
      day.date,
      day.financeLogs.reduce((sum, log) => sum + log.amount, 0),
    ])
  );

  const avgExpense = Math.round(
    dates.reduce((sum, date) => sum + (dailyExpenseMap.get(date) ?? 0), 0) / periodDays
  );

  const focus = focusDate ?? dates[dates.length - 1];
  const dailyExpense = dailyExpenseMap.get(focus) ?? 0;
  const spendSpike = avgExpense > 0 && dailyExpense >= avgExpense * 1.5;

  const bucketDays = {
    Low: [] as DateStats[],
    Mid: [] as DateStats[],
    High: [] as DateStats[],
  };
  dateStats.forEach((day) => {
    let avg: number | null = null;
    if (day.stressScores.length > 0) {
      avg = day.stressScores.reduce((sum, score) => sum + score, 0) / day.stressScores.length;
    } else if (day.financeLogs.length > 0) {
      avg = 50; // neutral fallback so finance-only days still contribute
    }
    if (avg !== null) {
      bucketDays[getBucket(avg)].push(day);
    }
  });

  const lowSummary = summarizeBucket("Low", bucketDays.Low);
  const midSummary = summarizeBucket("Mid", bucketDays.Mid);
  const highSummary = summarizeBucket("High", bucketDays.High);
  const ratioHighLow =
    lowSummary.avgDailyExpense > 0 ? highSummary.avgDailyExpense / lowSummary.avgDailyExpense : null;

  const topSpendCategories = getTopCategories(finance).slice(0, 5);
  const topCategory = topSpendCategories[0]?.category ?? null;

  return {
    periodDays,
    dailyExpense,
    avgExpense,
    spendSpike,
    bucketSummaries: [lowSummary, midSummary, highSummary],
    moodCategoryTop: buildMoodCategoryTop(dateStats),
    topSpendCategories,
    highStressDays: highSummary.dayCount,
    lowStressDays: lowSummary.dayCount,
    ratioHighLow,
    patternSummary: buildPatternSummary(
      highSummary.avgDailyExpense,
      lowSummary.avgDailyExpense,
      ratioHighLow,
      periodDays
    ),
    triggerSummary: buildTriggerSummary(topCategory, highSummary.dayCount),
  };
};
