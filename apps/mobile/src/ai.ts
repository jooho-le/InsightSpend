import Constants from "expo-constants";

type AiMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

const extra = Constants.expoConfig?.extra ?? {};
const apiKey = extra.openAiApiKey as string | undefined;
const baseUrl = (extra.openAiBaseUrl as string | undefined) ?? "https://api.openai.com/v1";
const model = (extra.openAiModel as string | undefined) ?? "gpt-4o-mini";
const isAiConfigured = Boolean(apiKey);

export type { AiMessage };
export { isAiConfigured, model as aiModel };

export async function fetchChatCompletion(messages: AiMessage[]) {
  if (!apiKey) {
    throw new Error("EXPO_PUBLIC_OPENAI_API_KEY is not set.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${text}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenAI API returned an empty response.");
  }

  return content as string;
}
