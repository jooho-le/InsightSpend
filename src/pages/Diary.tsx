import { useEffect, useState } from "react";
import api from "@services/api";
import { DiaryEntry, Mood } from "../types";

export default function Diary() {
    const [list, setList] = useState<DiaryEntry[]>([]);
    const [text, setText] = useState("");
    const [mood, setMood] = useState<Mood>("neutral");
    const [uploading, setUploading] = useState(false);
    const [images, setImages] = useState<string[]>([]);

    useEffect(() => {
        api.listDiaries().then(setList);
    }, []);

    const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        setUploading(true);
        const url = await api.uploadDiaryImage(f);
        setImages(prev => [url, ...prev]);
        setUploading(false);
    };

    const submit = async () => {
        const created = await api.createDiary({ text, images, mood });
        setList(prev => [created, ...prev]);
        setText(""); setImages([]); setMood("neutral");
    };

    return (
        <div className="grid" style={{ gap: 16 }}>
            <div className="card">
                <h3 style={{ marginTop: 0 }}>일기 작성</h3>
                <div className="upload">
                    <input type="file" accept="image/*" onChange={onUpload} />
                    <small className="muted">{uploading ? "업로드 중..." : "사진만 올려도 분석 가능"}</small>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
          <textarea
              className="input"
              style={{ minHeight: 100 }}
              placeholder="오늘은 어땠나요?"
              value={text}
              onChange={(e) => setText(e.target.value)} />
                    <div style={{ display: "flex", gap: 8 }}>
                        <select className="input" value={mood} onChange={e => setMood(e.target.value as Mood)}>
                            <option value="happy">happy</option>
                            <option value="neutral">neutral</option>
                            <option value="sad">sad</option>
                            <option value="stressed">stressed</option>
                            <option value="angry">angry</option>
                        </select>
                        <button className="button primary" onClick={submit}>저장</button>
                    </div>
                </div>
                {images.length > 0 && (
                    <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {images.map((src, i) => (
                            <img key={i} src={src} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 8 }} />
                        ))}
                    </div>
                )}
            </div>

            <div className="card">
                <h3 style={{ marginTop: 0 }}>일기 리스트</h3>
                <ul>
                    {list.map(d => (
                        <li key={d.id} style={{ marginBottom: 8 }}>
                            <strong>{new Date(d.date).toLocaleString()}</strong> — {d.text || "(텍스트 없음)"}
                            {d.mood && <span className="badge" style={{ marginLeft: 8 }}>{d.mood}</span>}
                            {d.images?.length ? <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                                {d.images.map((src, i) => (
                                    <img key={i} src={src} style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 6 }} />
                                ))}
                            </div> : null}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
