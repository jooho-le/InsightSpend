import { useEffect, useState } from "react";
import api from "@services/api";
import { LedgerEntry } from "../types";

export default function Ledger() {
    const [list, setList] = useState<LedgerEntry[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [manual, setManual] = useState({ merchant: "", category: "", amount: "" });

    useEffect(() => { api.listLedgers().then(setList); }, []);

    const upload = async () => {
        if (!file) return;
        const created = await api.uploadReceipt(file);
        setList(prev => [created, ...prev]);
        setFile(null);
    };

    const addManual = async () => {
        const created = await api.createLedger({
            merchant: manual.merchant,
            category: manual.category,
            amount: parseInt(manual.amount || "0", 10),
            source: "manual"
        });
        setList(prev => [created, ...prev]);
        setManual({ merchant: "", category: "", amount: "" });
    };

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="card">
                <h3 style={{ marginTop: 0 }}>영수증 업로드(OCR)</h3>
                <div className="upload">
                    <input type="file" accept="image/*,application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} />
                    <button className="button primary" onClick={upload} disabled={!file}>업로드 & 분석</button>
                    <small className="muted">이미 개발된 OCR 분석기 연동 포인트</small>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>수기 입력</h3>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <input className="input" placeholder="상점" value={manual.merchant} onChange={e => setManual(s => ({...s, merchant: e.target.value}))} />
                    <input className="input" placeholder="카테고리" value={manual.category} onChange={e => setManual(s => ({...s, category: e.target.value}))} />
                    <input className="input" placeholder="금액" value={manual.amount} onChange={e => setManual(s => ({...s, amount: e.target.value.replace(/\D/g, "")}))} />
                    <button className="button" onClick={addManual}>추가</button>
                </div>
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>가계부 리스트</h3>
                <table className="table">
                    <thead><tr><th>일시</th><th>상점</th><th>카테고리</th><th>금액</th><th>출처</th></tr></thead>
                    <tbody>
                    {list.map(l => (
                        <tr key={l.id}>
                            <td>{new Date(l.date).toLocaleString()}</td>
                            <td>{l.merchant || "-"}</td>
                            <td>{l.category || "-"}</td>
                            <td className="mono">{(l.amount||0).toLocaleString()}원</td>
                            <td><span className="badge">{l.source}</span></td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
