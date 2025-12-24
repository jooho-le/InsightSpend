import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import type { DailyInsightSummary, FinanceLog, StressLog } from "../models";
import { normalizeAiInsight } from "./aiInsights";

type UserLogs = {
  stressLogs: StressLog[];
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

const loadUserLogs = async (db: Firestore, uid: string): Promise<UserLogs> => {
  const [stressSnap, financeSnap] = await Promise.all([
    getDocs(query(collection(db, "stressLogs"), where("uid", "==", uid))),
    getDocs(query(collection(db, "financeLogs"), where("uid", "==", uid))),
  ]);

  const stressLogs = stressSnap.docs.map(
    (docSnap) => docSnap.data() as Omit<StressLog, "id">
  );

  const financeLogs = financeSnap.docs.map((docSnap) => {
    const raw = docSnap.data() as Omit<FinanceLog, "id">;
    return {
      ...raw,
      type: raw.type ?? "expense",
    };
  });

  return { stressLogs, financeLogs };
};

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

export const computeDailySummary = (
  uid: string,
  date: string,
  stressLogs: StressLog[],
  financeLogs: FinanceLog[]
): DailyInsightSummary => {
  const dayStress = stressLogs.filter((log) => log.date === date);
  const dayFinance = financeLogs.filter(
    (log) => log.date === date && (log.type ?? "expense") === "expense"
  );

  const stressCount = dayStress.length;
  const stressScoreAvg = stressCount
    ? Math.round(dayStress.reduce((acc, log) => acc + log.score, 0) / stressCount)
    : 0;
  const stressScoreMax = stressCount
    ? Math.max(...dayStress.map((log) => log.score))
    : 0;
  const topMood = getTopValue(dayStress.map((log) => log.mood));
  const topContext = getTopValue(dayStress.map((log) => log.context));

  const dailyExpense = dayFinance.reduce((acc, log) => acc + (log.amount || 0), 0);
  const categoryTotals = new Map<string, number>();
  dayFinance.forEach((log) => {
    const key = log.category.trim() || "Other";
    categoryTotals.set(key, (categoryTotals.get(key) ?? 0) + log.amount);
  });
  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({ category, amount }));

  return {
    id: date,
    uid,
    date,
    stressScoreAvg,
    stressScoreMax,
    stressCount,
    topMood,
    topContext,
    dailyExpense,
    topCategories,
  };
};

export const syncDailySummariesForRange = async (
  db: Firestore,
  uid: string,
  dates: string[]
) => {
  const { stressLogs, financeLogs } = await loadUserLogs(db, uid);
  const summaries = dates.map((date) =>
    computeDailySummary(uid, date, stressLogs, financeLogs)
  );
  const summariesWithAi = await Promise.all(
    summaries.map(async (summary) => {
      const snap = await getDoc(doc(db, "insights", uid, "daily", summary.date));
      const data = snap.exists() ? (snap.data() as { ai?: unknown; aiVersion?: number }) : null;
      const ai = data ? normalizeAiInsight(data.ai) : null;
      const aiVersion = typeof data?.aiVersion === "number" ? data.aiVersion : undefined;
      return { ...summary, ai: ai ?? undefined, aiVersion };
    })
  );
  await Promise.all(
    summaries.map((summary) =>
      setDoc(
        doc(db, "insights", uid, "daily", summary.date),
        {
          ...summary,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );
  return summariesWithAi;
};

export const updateDailySummaryForDate = async (
  db: Firestore,
  uid: string,
  date: string
) => {
  const { stressLogs, financeLogs } = await loadUserLogs(db, uid);
  const summary = computeDailySummary(uid, date, stressLogs, financeLogs);
  const snap = await getDoc(doc(db, "insights", uid, "daily", summary.date));
  const data = snap.exists() ? (snap.data() as { ai?: unknown; aiVersion?: number }) : null;
  const ai = data ? normalizeAiInsight(data.ai) : null;
  const aiVersion = typeof data?.aiVersion === "number" ? data.aiVersion : undefined;
  await setDoc(
    doc(db, "insights", uid, "daily", summary.date),
    {
      ...summary,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return { ...summary, ai: ai ?? undefined, aiVersion };
};
