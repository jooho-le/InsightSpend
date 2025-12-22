import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { aiModel, fetchChatCompletion, isAiConfigured } from "../ai";
import type { AiMessage } from "../ai";
import type { AiInsight, AiRecommendation, DailyInsightSummary } from "../models";

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
        "You are a Korean behavioral finance coach. " +
        "Return ONLY valid JSON with keys: summary, pattern, recommendations. " +
        "recommendations must be 3 to 5 items. " +
        "Each recommendation has: title, duration, type, steps, reason. " +
        "Use short, actionable routines (1-30 minutes). " +
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

const parseAiJson = (content: string) => {
  const start = content.indexOf("{");
  const end = content.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("AI response is not JSON.");
  }
  const jsonText = content.slice(start, end + 1);
  return JSON.parse(jsonText) as Partial<AiInsight>;
};

const normalizeRecommendations = (value: unknown): AiRecommendation[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const rec = item as Partial<AiRecommendation>;
      if (!rec.title || !rec.duration || !rec.type || !rec.reason) return null;
      const steps = Array.isArray(rec.steps)
        ? rec.steps.filter((step) => typeof step === "string")
        : [];
      return {
        title: String(rec.title),
        duration: String(rec.duration),
        type: rec.type as AiRecommendation["type"],
        steps,
        reason: String(rec.reason),
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
  return {
    summary: String(raw.summary),
    pattern: String(raw.pattern),
    recommendations,
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
