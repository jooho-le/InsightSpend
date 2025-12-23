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
        "너는 공감적이고 실용적인 행동·재정 코치야. " +
        "반드시 한국어로만 응답해. " +
        "ONLY 유효한 JSON으로 응답하고 키는 summary, pattern, recommendations만 사용해. " +
        "recommendations는 3~5개 항목으로. " +
        "각 recommendation은 title, duration, type, steps, reason 필드를 가져. " +
        "type은 Immediate, Situational, Alternative, Recovery 중 하나만 사용해. " +
        "1~30분 사이의 짧고 실행 가능한 루틴으로 작성해. " +
        "마크다운/추가 텍스트 금지.",
    },
    {
      role: "user",
      content:
        "아래 데이터를 기반으로 스트레스-지출 인사이트를 만들어줘.\n" +
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
    return "Immediate";
  }
  if (key.includes("상황") || key.includes("situational") || key.includes("context")) {
    return "Situational";
  }
  if (
    key.includes("대체") ||
    key.includes("alternative") ||
    key.includes("replacement")
  ) {
    return "Alternative";
  }
  if (key.includes("회복") || key.includes("recovery")) {
    return "Recovery";
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
