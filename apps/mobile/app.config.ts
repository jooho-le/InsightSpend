import { config } from "dotenv";
import { resolve } from "node:path";

config({ path: resolve(__dirname, ".env") });
config({ path: resolve(__dirname, "../web/.env") });

const getEnvValue = (expoKey: string, fallbackKey?: string) => {
  if (process.env[expoKey]) {
    return process.env[expoKey];
  }
  if (fallbackKey) {
    return process.env[fallbackKey];
  }
  return undefined;
};

export default {
  expo: {
    name: "InsightSpend",
    slug: "insightspend",
    scheme: "insightspend",
    ios: {
      bundleIdentifier: "com.jh.insightspend",
    },
    android: {
      package: "com.jh.insightspend",
    },
    extra: {
      firebaseApiKey: getEnvValue("EXPO_PUBLIC_FIREBASE_API_KEY", "VITE_FIREBASE_API_KEY"),
      firebaseAuthDomain: getEnvValue("EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN", "VITE_FIREBASE_AUTH_DOMAIN"),
      firebaseProjectId: getEnvValue("EXPO_PUBLIC_FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID"),
      firebaseStorageBucket: getEnvValue("EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET", "VITE_FIREBASE_STORAGE_BUCKET"),
      firebaseMessagingSenderId: getEnvValue(
        "EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
        "VITE_FIREBASE_MESSAGING_SENDER_ID"
      ),
      firebaseAppId: getEnvValue("EXPO_PUBLIC_FIREBASE_APP_ID", "VITE_FIREBASE_APP_ID"),
      googleWebClientId: getEnvValue("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
      googleIosClientId: getEnvValue("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"),
      googleAndroidClientId: getEnvValue("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"),
      openAiApiKey: getEnvValue("EXPO_PUBLIC_OPENAI_API_KEY", "VITE_OPENAI_API_KEY"),
      openAiModel: getEnvValue("EXPO_PUBLIC_OPENAI_MODEL", "VITE_OPENAI_MODEL"),
      openAiBaseUrl: getEnvValue("EXPO_PUBLIC_OPENAI_BASE_URL", "VITE_OPENAI_BASE_URL"),
    },
  },
};
