import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { aiModel, fetchChatCompletion, isAiConfigured } from "../ai";
import type { AiMessage } from "../ai";
import type {
  AiInsight,
  AiRecommendation,
  DailyInsightSummary,
  StressSpendInsight,
} from "../models";

type AiContext = {
  avgExpense14: number;
  spendSpike: boolean;
  topCategories: string[];
};

const buildPrompt = (
  summary: DailyInsightSummary,
  context: AiContext
): AiMessage[] => {
  const payload = {
    date: summary.date,
    stressScoreAvg: summary.stressScoreAvg,
    stressScoreMax: summary.stressScoreMax,
    stressCount: summary.stressCount,
    topMood: summary.topMood,
    topContext: summary.topContext,
    dailyExpense: summary.dailyExpense,
    avgExpense14: context.avgExpense14,
    spendSpike: context.spendSpike,
    topCategories: context.topCategories.slice(0, 3),
  };

  return [
    {
      role: "system",
      content:
        "너는 공감적이고 실용적인 행동·재정 코치야. " +
        "반드시 한국어로만 응답해. " +
        "Return ONLY valid JSON with keys: summary, pattern, recommendations. " +
        "recommendations must be 3 to 5 items. " +
        "Each recommendation has: title, duration, type, steps, reason. " +
        "type must be one of Quick, Rule, Situational, Recovery. " +
        "Quick=1~5 minutes, Rule=spending rule, Situational=10~30 minutes. " +
        "No markdown, no extra text.",
    },
    {
      role: "user",
      content:
        "다음 데이터를 기반으로 스트레스-지출 인사이트를 만들어줘.\n" +
        "JSON만 반환해줘.\n" +
        `data: ${JSON.stringify(payload)}`,
    },
  ];
};

const buildPeriodPrompt = (insight: StressSpendInsight): AiMessage[] => {
  const payload = {
    periodDays: insight.periodDays,
    avgExpense: insight.avgExpense,
    highAvg:
      insight.bucketSummaries.find((item) => item.bucket === "High")
        ?.avgDailyExpense ?? 0,
    lowAvg:
      insight.bucketSummaries.find((item) => item.bucket === "Low")
        ?.avgDailyExpense ?? 0,
    ratioHighLow: insight.ratioHighLow,
    highStressDays: insight.highStressDays,
    lowStressDays: insight.lowStressDays,
    spendSpike: insight.spendSpike,
    topSpendCategories: insight.topSpendCategories.slice(0, 3),
    moodCategoryTop: insight.moodCategoryTop.slice(0, 3),
    patternSummary: insight.patternSummary,
    triggerSummary: insight.triggerSummary,
  };

  return [
    {
      role: "system",
      content:
        "너는 감정-소비 패턴을 설명하고 행동을 제안하는 코치야. " +
        "반드시 한국어로만 응답해. " +
        "ONLY 유효한 JSON으로 응답하고 키는 summary, pattern, goal, recommendations만 사용해. " +
        "summary는 1줄, pattern은 1줄, goal은 1줄 행동 목표로 작성해. " +
        "recommendations는 정확히 4개로: Quick 2개(1~5분), Rule 1개(소비 억제 규칙), Situational 1개(10~30분). " +
        "각 recommendation은 title, duration, type, steps, reason 필드가 있어야 해. " +
        "reason은 '스트레스↑ + 지출↑(카테고리)'처럼 근거를 한 줄로 써. " +
        "마크다운/추가 텍스트 금지.",
    },
    {
      role: "user",
      content:
        "아래 데이터를 기반으로 감정-소비 패턴 요약과 실행 루틴을 만들어줘.\n" +
        "JSON만 반환.\n" +
        `data: ${JSON.stringify(payload)}`,
    },
  ];
};

const parseAiJson = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI response is not JSON.");
  }
  const jsonText = content.slice(start, end + 1);
  return JSON.parse(jsonText) as Partial<AiInsight>;
};

const normalizeRecommendationType = (
  value: string
): AiRecommendation["type"] | null => {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key.includes("즉시") || key.includes("immediate") || key.includes("quick")) {
    return "Quick";
  }
  if (key.includes("규칙") || key.includes("보류") || key.includes("rule")) {
    return "Rule";
  }
  if (key.includes("상황") || key.includes("situational") || key.includes("context")) {
    return "Situational";
  }
  if (key.includes("회복") || key.includes("recovery")) {
    return "Recovery";
  }
  if (key.includes("대체") || key.includes("alternative") || key.includes("replacement")) {
    return "Quick";
  }
  return null;
};

const normalizeRecommendations = (value: unknown): AiRecommendation[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Partial<AiRecommendation>;
      const title = typeof rec.title === "string" ? rec.title.trim() : "";
      const duration = typeof rec.duration === "string" ? rec.duration.trim() : "";
      const type =
        typeof rec.type === "string" ? normalizeRecommendationType(rec.type) : null;
      const reason = typeof rec.reason === "string" ? rec.reason.trim() : "";
      if (!title || !duration || !type || !reason) return null;
      const steps = Array.isArray(rec.steps)
        ? rec.steps.filter((step) => typeof step === "string")
        : [];
      return {
        title,
        duration,
        type,
        steps,
        reason,
      };
    })
    .filter((item): item is AiRecommendation => Boolean(item));
};

export const normalizeAiInsight = (value: unknown): AiInsight | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<AiInsight>;
  if (!raw.summary || !raw.pattern) return null;
  const recommendations = normalizeRecommendations(raw.recommendations);
  if (recommendations.length === 0) return null;
  const goal = typeof raw.goal === "string" ? raw.goal.trim() : "";
  return {
    summary: String(raw.summary),
    pattern: String(raw.pattern),
    recommendations,
    goal: goal || undefined,
    model: String(raw.model ?? aiModel),
    generatedAt:
      typeof raw.generatedAt === "string"
        ? raw.generatedAt
        : new Date().toISOString(),
  };
};

export const ensureDailyAiInsight = async (
  db: Firestore,
  uid: string,
  summary: DailyInsightSummary,
  context: AiContext
) => {
  if (!isAiConfigured) return null;
  if (summary.stressCount === 0 && summary.dailyExpense === 0) return null;

  const messages = buildPrompt(summary, context);
  const content = await fetchChatCompletion(messages);
  const parsed = parseAiJson(content);
  const normalized = normalizeAiInsight(parsed);
  if (!normalized) return null;

  const localAi: AiInsight = {
    ...normalized,
    model: aiModel,
    generatedAt: new Date().toISOString(),
  };

  await setDoc(
    doc(db, "insights", uid, "daily", summary.date),
    {
      ai: { ...localAi, generatedAt: serverTimestamp() },
      aiVersion: 1,
    },
    { merge: true }
  );

  return localAi;
};

export const ensurePeriodAiInsight = async (
  db: Firestore,
  uid: string,
  insight: StressSpendInsight,
  periodKey: string
) => {
  if (!isAiConfigured) return null;
  const hasData =
    insight.avgExpense > 0 ||
    insight.highStressDays > 0 ||
    insight.lowStressDays > 0 ||
    insight.moodCategoryTop.length > 0;
  if (!hasData) return null;

  const messages = buildPeriodPrompt(insight);
  const content = await fetchChatCompletion(messages);
  const parsed = parseAiJson(content);
  const normalized = normalizeAiInsight(parsed);
  if (!normalized) return null;

  const localAi: AiInsight = {
    ...normalized,
    model: aiModel,
    generatedAt: new Date().toISOString(),
  };

  await setDoc(
    doc(db, "insights", uid, "summary", periodKey),
    {
      periodDays: insight.periodDays,
      ai: { ...localAi, generatedAt: serverTimestamp() },
      aiVersion: 2,
    },
    { merge: true }
  );

  return localAi;
};
