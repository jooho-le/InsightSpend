import StatCard from "@components/StatCard";
import api from "@services/api";
import { useEffect, useState } from "react";
import { DiaryEntry, LedgerEntry, PatternInsight } from "../types";

export default function Dashboard() {
    const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
    const [ledgers, setLedgers] = useState<LedgerEntry[]>([]);
    const [patterns, setPatterns] = useState<PatternInsight | null>(null);
    const month = new Date().toISOString().slice(0,7);

    useEffect(() => {
        api.listDiaries().then(setDiaries);
        api.listLedgers().then(setLedgers);
        api.getMonthlyPatterns(month).then(setPatterns);
    }, [month]);

    const total = ledgers.reduce((acc, v) => acc + (v.amount || 0), 0);
    const deliveryDelta = patterns?.metrics.deliverySpendDelta;
    const corr = patterns?.metrics.moodSpendCorr;

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="grid cols-3">
                <StatCard label="이달 총지출" value={total.toLocaleString() + "원"} hint="가계부 기준" />
                <StatCard label="일기 기록 수" value={diaries.length.toString()} hint="감정 트래킹" />
                <StatCard
                    label="감정-지출 상관"
                    value={corr !== undefined ? corr.toFixed(2) : "-"}
                    hint="1에 가까울수록 감정에 따른 소비 증가"
                />
            </div>

            <div className="card">
                <h3 style={{ margin: 0 }}>월간 요약</h3>
                <small className="muted">{month}</small>
                <ul>
                    <li>우울한 날 배달비 {deliveryDelta !== undefined ? Math.round(deliveryDelta * 100) : "-"}% 증가</li>

                </ul>
            </div>

            <div className="grid cols-2">
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>최근 일기</h3>
                    <ul>
                        {diaries.slice(0,5).map(d => (
                            <li key={d.id}>
                                <strong>{new Date(d.date).toLocaleString()}</strong> — {d.text || "사진만 업로드됨"}
                                {d.mood && <span className="badge" style={{ marginLeft: 8 }}>{d.mood}</span>}
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="card">
                    <h3 style={{ marginTop: 0 }}>최근 지출</h3>
                    <table className="table">
                        <thead><tr><th>일시</th><th>상점</th><th>카테고리</th><th>금액</th></tr></thead>
                        <tbody>
                        {ledgers.slice(0,5).map(l => (
                            <tr key={l.id}>
                                <td>{new Date(l.date).toLocaleString()}</td>
                                <td>{l.merchant || "-"}</td>
                                <td>{l.category || "-"}</td>
                                <td className="mono">{(l.amount||0).toLocaleString()}원</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
}
