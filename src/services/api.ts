// 백엔드 연동 포인트 (현재는 Mock).
// 나중에 Java(Spring) 백엔드 붙일 때, BASE_URL 및 fetch 호출부만 교체하면 됨.
import { Api, DiaryEntry, LedgerEntry, PatternInsight, RecommendationPack, Reward } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
// 예: http://localhost:8080 (스프링 서버) — .env에 VITE_API_BASE_URL로 세팅

function sleep(ms: number) { return new Promise(res => setTimeout(res, ms)); }

// In-memory mock
let diaryDB: DiaryEntry[] = [
    { id: "d1", date: new Date().toISOString(), text: "첫 일기 ✏️", images: [], mood: "neutral" }
];
let ledgerDB: LedgerEntry[] = [
    { id: "l1", date: new Date().toISOString(), merchant: "요기요", category: "배달/외식", amount: 18500, source: "ocr" }
];
let rewardsDB: Reward[] = [
    { id: "r1", title: "배달 절감 챌린지", condition: "이번 달 배달비 20% 절감", points: 300, achieved: false },
    { id: "r2", title: "감정기록 7일 연속", condition: "일기/감정 7일 연속 기록", points: 150, achieved: true }
];

const api: Api = {
    async uploadDiaryImage(file: File): Promise<string> {
        await sleep(400);
        // 실제는 백엔드에 업로드 → URL 반환
        return URL.createObjectURL(file);
    },
    async createDiary(entry): Promise<DiaryEntry> {
        await sleep(200);
        const e: DiaryEntry = {
            id: "d" + Math.random().toString(36).slice(2, 8),
            date: entry.date || new Date().toISOString(),
            text: entry.text,
            images: entry.images || [],
            mood: entry.mood || "neutral"
        };
        diaryDB.unshift(e);
        return e;
    },
    async listDiaries(): Promise<DiaryEntry[]> {
        await sleep(200);
        return diaryDB;
    },

    async uploadReceipt(file: File): Promise<LedgerEntry> {
        await sleep(700);
        // 실제는 백엔드 OCR → LedgerEntry JSON 반환
        const mock: LedgerEntry = {
            id: "l" + Math.random().toString(36).slice(2, 8),
            date: new Date().toISOString(),
            merchant: "배민",
            category: "배달/외식",
            amount: 22800,
            items: [
                { name: "치킨", qty: 1, price: 18000 },
                { name: "배달비", qty: 1, price: 4800 }
            ],
            source: "ocr"
        };
        ledgerDB.unshift(mock);
        return mock;
    },
    async createLedger(entry): Promise<LedgerEntry> {
        await sleep(200);
        const e: LedgerEntry = {
            id: "l" + Math.random().toString(36).slice(2, 8),
            date: entry.date || new Date().toISOString(),
            merchant: entry.merchant,
            category: entry.category,
            amount: entry.amount || 0,
            paymentMethod: entry.paymentMethod,
            items: entry.items,
            source: entry.source || "manual"
        };
        ledgerDB.unshift(e);
        return e;
    },
    async listLedgers(): Promise<LedgerEntry[]> {
        await sleep(200);
        return ledgerDB;
    },

    async getMonthlyPatterns(month: string): Promise<PatternInsight> {
        await sleep(300);
        // 실제는 백엔드 분석 결과
        return {
            id: "p-" + month,
            month,
            summary: `${month} 소비분석 요약`,
            findings: [
                "우울한 날 배달비 평균 +28%",
                "기분 좋은 날 카페 지출 증가 +10%"
            ],
            metrics: {
                deliverySpendDelta: 0.28,
                impulseRate: 0.12,
                moodSpendCorr: 0.43
            }
        };
        // TODO: 자바 서버에서 /analysis/patterns?month=YYYY-MM 제공
    },

    async getRecommendations(month: string): Promise<RecommendationPack> {
        await sleep(250);
        return {
            id: "rec-" + month,
            month,
            recommendations: [
                "배달비를 주 2회로 제한하고 대체 간편식 리스트 준비",
                "우울지수 높은 날에는 '산책 20분 + 홈카페' 루틴으로 전환"
            ],
            kpis: [
                { title: "배달지출", target: "월 -20%" },
                { title: "충동구매 빈도", target: "주당 1회 이하" }
            ]
        };
        // TODO: 자바 서버 /analysis/recommendations?month=YYYY-MM
    },

    async listRewards(): Promise<Reward[]> {
        await sleep(150);
        return rewardsDB;
        // TODO: 자바 서버 /rewards
    }
};

export default api;
