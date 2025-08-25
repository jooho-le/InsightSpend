export type Mood = "happy" | "neutral" | "sad" | "stressed" | "angry";
export interface DiaryEntry {
    id: string;
    date: string;           // ISO
    text?: string;
    images?: string[];      // image URLs (uploaded)
    mood?: Mood;
}

export interface ReceiptItem {
    name: string;
    qty: number;
    price: number; // per unit
}

export interface LedgerEntry {
    id: string;
    date: string;               // ISO
    merchant?: string;
    category?: string;
    amount: number;
    paymentMethod?: string;
    items?: ReceiptItem[];
    source?: "manual" | "ocr";
}

export interface PatternInsight {
    id: string;
    month: string;              // YYYY-MM
    summary: string;
    findings: string[];         // e.g., ["우울한 날 배달비 증가"]
    metrics: {
        deliverySpendDelta?: number;
        impulseRate?: number;
        moodSpendCorr?: number;   // -1 ~ 1
    }
}

export interface RecommendationPack {
    id: string;
    month: string;
    recommendations: string[];
    kpis: { title: string; target: string }[];
}

export interface Reward {
    id: string;
    title: string;
    condition: string;     // ex) "배달 지출 20% 절감 2주 연속"
    points: number;
    achieved: boolean;
}

export interface Api {
    // Diary
    uploadDiaryImage(file: File): Promise<string>;
    createDiary(entry: Partial<DiaryEntry>): Promise<DiaryEntry>;
    listDiaries(): Promise<DiaryEntry[]>;

    // Ledger
    uploadReceipt(file: File): Promise<LedgerEntry>; // OCR→json
    createLedger(entry: Partial<LedgerEntry>): Promise<LedgerEntry>;
    listLedgers(): Promise<LedgerEntry[]>;

    // Analysis
    getMonthlyPatterns(month: string): Promise<PatternInsight>;
    getRecommendations(month: string): Promise<RecommendationPack>;
    listRewards(): Promise<Reward[]>;
}
