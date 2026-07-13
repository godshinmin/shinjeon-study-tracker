import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Trash2, CheckCircle2, XCircle, Circle, CalendarDays, Camera, Play, Square, MessageCircle, Tag,
  Settings as SettingsIcon, LayoutDashboard, BookOpen, PenLine, Timer, RotateCcw, ExternalLink, ChevronDown, ChevronUp, X, Users, CheckSquare,
  PencilRuler, FileText, Mail, Printer, Flag, ShieldOff, BarChart2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "./supabaseClient";

/* ---------------- fonts ---------------- */
function useFonts() {
  useEffect(() => {
    const l1 = document.createElement("link");
    l1.rel = "stylesheet";
    l1.href = "https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css";
    const l2 = document.createElement("link");
    l2.rel = "stylesheet";
    l2.href = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=Nanum+Myeongjo:wght@400;700;800&display=swap";
    document.head.appendChild(l1);
    document.head.appendChild(l2);
    return () => { document.head.removeChild(l1); document.head.removeChild(l2); };
  }, []);
}
const BRUSH_FONT = "'Nanum Myeongjo', serif";

/* ---------------- tokens ---------------- */
const C = {
  ink: "var(--ink)", inkSoft: "var(--inkSoft)", blueprint: "var(--blueprint)", blueprintLight: "var(--blueprintLight)",
  paper: "var(--paper)", paperLine: "var(--paperLine)", card: "var(--card)", amber: "var(--amber)", green: "var(--green)", red: "var(--red)",
  surface: "var(--surface)", tintBlue: "var(--tintBlue)", tintRed: "var(--tintRed)", tintGreen: "var(--tintGreen)", tintAmber: "var(--tintAmber)",
};
const THEME_VARS = `
:root {
  --ink: #16233B; --inkSoft: #3E4E68; --blueprint: #2C6E8E; --blueprintLight: #6FA8C4;
  --paper: #EDEFF2; --paperLine: #C7D3DA; --card: #F8F9FA; --amber: #D9A441; --green: #4C8C6B; --red: #C4453D;
  --surface: #ffffff;
  --tintBlue: #EAF2F6; --tintRed: #FBEAE9; --tintGreen: #EAF5EE; --tintAmber: #FBF2E1;
}
[data-theme='dark'] {
  --ink: #F3F6F9; --inkSoft: #C7D0DE; --blueprint: #7CC1EA; --blueprintLight: #8FC1D9;
  --paper: #0D1219; --paperLine: #4A5872; --card: #1B2333; --amber: #F0BE6E; --green: #7BC79A; --red: #F08A82;
  --surface: #242E42;
  --tintBlue: #23405A; --tintRed: #4A2323; --tintGreen: #21402E; --tintAmber: #4A3A1E;
}
`;

const DEFAULT_SUBJECTS = ["분석·조닝", "배치계획", "평면계획", "구조계획", "단면계획"];
const SUBJECT_PERIODS = { "분석·조닝": "1교시", "배치계획": "1교시", "평면계획": "2교시", "구조계획": "3교시", "단면계획": "3교시" };
const PERIODS = ["1교시", "2교시", "3교시"];
const WRONG_CAUSES = ["이론 및 개념", "지문 누락", "지문 해석 오류", "프로세스 미흡", "작도 누락", "멘탈 관리 실패", "기타"];
const ACADEMIES = ["신전", "한솔", "카이스", "대한", "독학", "자습"];
const LOGO_SRC = "/logo.png";
const ACADEMY_LINKS = [
  { label: "홈페이지", url: "https://shinjeonsquare.com/" },
  { label: "스마트스토어", url: "https://m.smartstore.naver.com/shinjeonsquare" },
  { label: "네이버 카페", url: "https://cafe.naver.com/shinjeon" },
  { label: "오픈카톡방", url: "https://open.kakao.com/o/giVuMqRh" },
  { label: "카톡 채널 상담", url: "https://pf.kakao.com/_MKxiYG" },
];
const DIFFICULTIES = [{ key: "상", color: "#C4453D" }, { key: "중", color: "#D9A441" }, { key: "하", color: "#4C8C6B" }];
const ATTEND_STATUSES = [
  { key: "출석", color: "#4C8C6B" }, { key: "결석", color: "#C4453D" }, { key: "지각", color: "#D9A441" },
  { key: "보강", color: "#2C6E8E" }, { key: "기타", color: "#8A93A6" },
];
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function buildRounds() {
  const rounds = [];
  for (let y = 2010; y <= 2019; y++) rounds.push({ year: y, round: 1 });
  for (let y = 2020; y <= 2026; y++) { rounds.push({ year: y, round: 1 }); rounds.push({ year: y, round: 2 }); }
  return rounds.sort((a, b) => (b.year * 10 + b.round) - (a.year * 10 + a.round));
}
function roundLabel(r) { return `${r.year}년 ${r.round}회`; }
function roundKey(r) { return `${r.year}-${r.round}`; }
function parseRoundKey(k) { const [y, r] = k.split("-").map(Number); return { year: y, round: r }; }
function roundRowLabel(r) { return r.year < 2020 ? `${r.year}` : `${r.year}-${r.round}`; }

/* ---------------- storage helpers ---------------- */
async function currentUserId() {
  const { data } = await supabase.auth.getUser();
  return data && data.user ? data.user.id : null;
}
async function loadKey(key, fallback, shared = false) {
  try {
    const table = shared ? "shared_data" : "user_data";
    let query = supabase.from(table).select("value").eq("key", key);
    if (!shared) {
      const uid = await currentUserId();
      if (!uid) return fallback;
      query = query.eq("user_id", uid);
    }
    const { data, error } = await query.maybeSingle();
    if (error || !data || data.value === null || data.value === undefined) return fallback;
    return JSON.parse(data.value);
  } catch (e) { return fallback; }
}
async function saveKey(key, value, shared = false) {
  try {
    const table = shared ? "shared_data" : "user_data";
    const payload = { key, value: JSON.stringify(value), updated_at: new Date().toISOString() };
    if (!shared) {
      const uid = await currentUserId();
      if (!uid) return false;
      payload.user_id = uid;
      const { error } = await supabase.from(table).upsert(payload, { onConflict: "user_id,key" });
      if (error) { console.error("save failed", key, error); return false; }
    } else {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: "key" });
      if (error) { console.error("save failed", key, error); return false; }
    }
    return true;
  } catch (e) { console.error("save failed", key, e); return false; }
}

function fmtDate(d) { const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0"); return `${y}-${m}-${day}`; }
function todayStr() { return fmtDate(new Date()); }
function uid() { return Math.random().toString(36).slice(2, 10); }
function fmtClock(sec) { const m = Math.floor(sec / 60), s = sec % 60; return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`; }
function timeAgo(iso) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return "방금 전";
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}시간 전`;
  return `${Math.floor(diff / 86400)}일 전`;
}
function compressImage(file, maxWidth = 1000, quality = 0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale); canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject; img.src = reader.result;
    };
    reader.onerror = reject; reader.readAsDataURL(file);
  });
}

const DEFAULT_SETTINGS = {
  examDate: "2026-09-12", examTime: "09:00", studentName: "", nickname: "", currentAcademy: "", academyLabel: "신전스퀘어", groupCodes: [],
  goal: "", goalLocked: false, problemGoal: "", problemGoalLocked: false, subjectGoals: {}, pastExamsSeeded: false, darkMode: true, blockedAuthors: [], isAdmin: false, adminCode: "0000",
  periodPass: { "1교시": { passed: false, round: "" }, "2교시": { passed: false, round: "" }, "3교시": { passed: false, round: "" } },
  classSchedule: [], courseStart: "",
};

function newAttempt() { return { id: uid(), date: todayStr(), correct: null, totalTime: "", drawTime: "", keyPoints: "", wrongCauses: [], improvement: "", overcome: false, image: null }; }

/* ---------------- dimension-line D-day signature ---------------- */
function DdayDimension({ examDate, examTime }) {
  const days = useMemo(() => {
    if (!examDate) return null;
    const target = new Date(examDate + "T00:00:00"); const now = new Date(); now.setHours(0, 0, 0, 0);
    return Math.ceil((target - now) / 86400000);
  }, [examDate]);
  const label = days === null ? "시험일 미설정" : days >= 0 ? `D-${days}` : `D+${-days}`;
  return (
    <div>
      <div className="flex items-center w-full select-none" style={{ color: C.ink }}>
        <div style={{ width: 1, height: 14, background: C.ink }} />
        <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderLeft: `6px solid ${C.ink}` }} />
        <div className="flex-1" style={{ height: 1, background: C.ink }} />
        <div className="px-4 py-1 mx-1 border font-mono font-semibold text-lg tracking-wide" style={{ borderColor: C.ink, color: days !== null && days <= 14 ? C.red : C.ink, background: C.paper }}>{label}</div>
        <div className="flex-1" style={{ height: 1, background: C.ink }} />
        <div style={{ width: 0, height: 0, borderTop: "4px solid transparent", borderBottom: "4px solid transparent", borderRight: `6px solid ${C.ink}` }} />
        <div style={{ width: 1, height: 14, background: C.ink }} />
      </div>
      {examDate && <div className="text-center text-xs font-mono mt-1" style={{ color: C.inkSoft }}>{examDate.replace(/-/g, ".")} {examTime || ""}</div>}
    </div>
  );
}

/* ---------------- shared UI bits ---------------- */
function SectionLabel({ n, children }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="font-mono text-xs px-1.5 py-0.5 border" style={{ color: C.blueprint, borderColor: C.blueprintLight }}>{n}</span>
      <span className="text-sm font-semibold" style={{ color: C.ink }}>{children}</span>
    </div>
  );
}
function Card({ children, className = "" }) { return <div className={`border p-4 ${className}`} style={{ borderColor: C.paperLine, background: C.card }}>{children}</div>; }
function SelectBar({ selectMode, setSelectMode, count, onSelectAll, onDelete, onCancel }) {
  return (
    <div className="flex items-center justify-between mb-2">
      {!selectMode ? (
        <button onClick={() => setSelectMode(true)} className="text-xs px-2 py-1 border flex items-center gap-1" style={{ borderColor: C.paperLine, color: C.inkSoft }}><CheckSquare size={12} /> 선택</button>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={onSelectAll} className="text-xs px-2 py-1 border" style={{ borderColor: C.paperLine, color: C.inkSoft }}>전체선택</button>
          <button onClick={onDelete} disabled={count === 0} className="text-xs px-2 py-1 border" style={{ borderColor: C.red, color: C.red, opacity: count === 0 ? 0.4 : 1 }}>선택삭제({count})</button>
          <button onClick={onCancel} className="text-xs px-2 py-1 border" style={{ borderColor: C.paperLine, color: C.inkSoft }}>취소</button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Dashboard ---------------- */
function Dashboard({ settings, setSettings, subjects, problems, studyLog, attendance }) {
  const [showBig, setShowBig] = useState(false);
  const today = todayStr();
  const todayMinutes = Object.values(studyLog[today] || {}).reduce((a, b) => a + b, 0);
  const showReminder = todayMinutes === 0 && new Date().getHours() >= 20;
  const totalSolved = problems.filter(p => p.attempts.length > 0).length;
  const wrongOpen = problems.reduce((acc, p) => acc + p.attempts.filter(a => a.correct === false && !a.overcome).length, 0);
  const perSubjectSolved = subjects.map(s => ({ subject: s, count: problems.filter(p => p.subject === s && p.attempts.length > 0).length }));
  const perSubjectMinutes = useMemo(() => {
    const totals = subjects.map(s => ({ subject: s, minutes: Object.values(studyLog).reduce((acc, day) => acc + (day[s] || 0), 0) }));
    const avg = totals.reduce((a, t) => a + t.minutes, 0) / (totals.length || 1);
    return totals.map(t => ({ ...t, tier: avg === 0 ? "mid" : t.minutes < avg * 0.7 ? "low" : t.minutes < avg * 1.1 ? "mid" : "high" }));
  }, [subjects, studyLog]);
  const TIER_COLOR = { low: C.red, mid: C.amber, high: C.green };

  const last7 = useMemo(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); const key = fmtDate(d); const mins = Object.values(studyLog[key] || {}).reduce((a, b) => a + b, 0); arr.push({ day: `${d.getMonth() + 1}/${d.getDate()}`, 분: mins }); }
    return arr;
  }, [studyLog]);

  const thisWeekAttendance = useMemo(() => {
    let c = 0;
    for (let i = 0; i < 7; i++) { const d = new Date(); d.setDate(d.getDate() - i); if (attendance[fmtDate(d)] === "출석") c++; }
    return c;
  }, [attendance]);

  const studyStreak = useMemo(() => {
    let streak = 0; const d = new Date();
    while (true) {
      const key = fmtDate(d);
      const mins = Object.values(studyLog[key] || {}).reduce((a, b) => a + b, 0);
      if (mins > 0) { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }, [studyLog]);

  const attendStreak = useMemo(() => {
    let streak = 0; const d = new Date();
    while (true) {
      const key = fmtDate(d);
      if (attendance[key] === "출석") { streak++; d.setDate(d.getDate() - 1); } else break;
    }
    return streak;
  }, [attendance]);

  return (
    <div className="space-y-5">
      {showReminder && (
        <div className="text-sm px-3 py-2 border" style={{ borderColor: C.amber, color: C.ink, background: C.tintAmber }}>
          🌙 오늘 아직 공부 기록이 없어요. 지금이라도 조금 시작해볼까요?
        </div>
      )}
      <Card>
        <SectionLabel n="01">이번 목표</SectionLabel>
        {settings.goalLocked && settings.goal ? (
          <div className="text-center py-3">
            <div style={{ fontFamily: BRUSH_FONT, fontSize: 28, fontWeight: 700, color: C.ink, lineHeight: 1.4 }}>{settings.goal}</div>
            <button onClick={() => setSettings({ ...settings, goalLocked: false })} className="text-xs mt-2 underline" style={{ color: C.inkSoft }}>수정하기</button>
          </div>
        ) : (
          <>
            <textarea rows={2} value={settings.goal || ""} onChange={e => setSettings({ ...settings, goal: e.target.value })}
              placeholder="예: 이번엔 3교시까지 마무리해서 최종합격" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
            <button onClick={() => setSettings({ ...settings, goalLocked: true })} disabled={!settings.goal} className="w-full mt-2 py-1.5 text-sm border" style={{ background: settings.goal ? C.blueprint : "transparent", borderColor: C.blueprint, color: settings.goal ? "#fff" : C.paperLine }}>확인</button>
          </>
        )}
      </Card>

      <Card>
        <SectionLabel n="02">시험일까지</SectionLabel>
        <DdayDimension examDate={settings.examDate} examTime={settings.examTime} />
      </Card>

      {settings.periodPass && (
        <>
          <div className="flex gap-2">
            {PERIODS.map(period => {
              const info = settings.periodPass[period] || { passed: false, round: "" };
              return (
                <div key={period} className="flex-1 border text-center py-2" style={{ borderColor: info.passed ? C.green : C.paperLine, background: info.passed ? C.tintGreen : C.card }}>
                  <div className="text-xs" style={{ color: info.passed ? C.green : C.inkSoft }}>{period}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: info.passed ? C.green : C.paperLine }}>
                    {info.passed ? `합격${info.round ? " · " + roundLabel(parseRoundKey(info.round)) : ""}` : "미합격"}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={() => setShowBig(true)} className="w-full text-xs py-1.5 border" style={{ borderColor: C.blueprintLight, color: C.blueprint }}>확인</button>
        </>
      )}

      {showBig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(22,35,59,0.92)" }} onClick={() => setShowBig(false)}>
          <div className="max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
            <div className="text-xs font-mono tracking-widest mb-3" style={{ color: C.blueprintLight }}>이번 목표</div>
            <div className="mb-6" style={{ fontFamily: BRUSH_FONT, fontSize: 32, fontWeight: 800, color: "#fff", lineHeight: 1.4 }}>{settings.goal || "목표를 설정해주세요"}</div>
            <div className="mb-6"><DdayDimension examDate={settings.examDate} examTime={settings.examTime} /></div>
            <div className="flex gap-3">
              {PERIODS.map(period => {
                const info = settings.periodPass[period] || { passed: false, round: "" };
                return (
                  <div key={period} className="flex-1 border py-3" style={{ borderColor: info.passed ? C.green : "rgba(255,255,255,0.3)" }}>
                    <div className="text-sm" style={{ color: info.passed ? C.green : "#fff" }}>{period}</div>
                    <div className="text-xs font-mono mt-1" style={{ color: info.passed ? C.green : "rgba(255,255,255,0.6)" }}>{info.passed ? "합격" : "미합격"}</div>
                  </div>
                );
              })}
            </div>
            <button onClick={() => setShowBig(false)} className="mt-6 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>탭하여 닫기</button>
          </div>
        </div>
      )}

      {settings.currentAcademy && <div className="text-xs text-center" style={{ color: C.inkSoft }}>현재 다니는 학원: <span style={{ color: C.ink }}>{settings.currentAcademy}</span></div>}

      <div className="grid grid-cols-3 gap-3">
        <Card><div className="text-xs" style={{ color: C.inkSoft }}>오늘 공부시간</div><div className="font-mono text-2xl mt-1" style={{ color: C.ink }}>{todayMinutes}분</div></Card>
        <Card>
          <div className="text-xs" style={{ color: C.inkSoft }}>총 푼 문제</div>
          <div className="font-mono text-2xl mt-1" style={{ color: C.ink }}>{totalSolved}{Object.values(settings.subjectGoals || {}).some(v => Number(v) > 0) ? <span className="text-sm" style={{ color: C.inkSoft }}>/{Object.values(settings.subjectGoals || {}).reduce((a, v) => a + (Number(v) || 0), 0)}</span> : ""}</div>
        </Card>
        <Card><div className="text-xs" style={{ color: C.inkSoft }}>미해결 오답</div><div className="font-mono text-2xl mt-1" style={{ color: wrongOpen ? C.red : C.green }}>{wrongOpen}</div></Card>
      </div>

      <Card>
        <SectionLabel n="03">과목별 푼 문제</SectionLabel>
        <div className="space-y-1">
          {perSubjectSolved.map(s => (
            <div key={s.subject} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0" style={{ borderColor: C.paperLine }}>
              <span style={{ color: C.ink }}>{s.subject}</span>
              <span className="font-mono" style={{ color: C.blueprint }}>{s.count}문제</span>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionLabel n="●">과목별 공부시간 비교</SectionLabel>
        <div className="text-xs mb-2" style={{ color: C.inkSoft }}>다른 과목 대비 상대적으로 부족한 과목을 색으로 표시해요</div>
        <div className="space-y-2">
          {perSubjectMinutes.map(s => (
            <div key={s.subject} className="flex items-center gap-2">
              <span className="text-xs w-16 flex-shrink-0" style={{ color: C.ink }}>{s.subject}</span>
              <div className="flex-1 h-2.5" style={{ background: C.paperLine }}>
                <div style={{ width: `${Math.min(100, (s.minutes / (Math.max(...perSubjectMinutes.map(x => x.minutes), 1))) * 100)}%`, height: "100%", background: TIER_COLOR[s.tier] }} />
              </div>
              <span className="text-xs font-mono w-14 text-right" style={{ color: TIER_COLOR[s.tier] }}>{s.minutes}분</span>
            </div>
          ))}
        </div>
      </Card>

      {Object.values(settings.subjectGoals || {}).some(v => Number(v) > 0) && (
        <Card>
          <SectionLabel n="●">과목별 목표 문제 수 대비 진행률</SectionLabel>
          <div className="space-y-2">
            {perSubjectSolved.filter(s => Number((settings.subjectGoals || {})[s.subject]) > 0).map(s => {
              const goal = Number(settings.subjectGoals[s.subject]);
              const pct = Math.min(100, Math.round((s.count / goal) * 100));
              return (
                <div key={s.subject}>
                  <div className="flex items-center justify-between text-xs mb-0.5" style={{ color: C.inkSoft }}>
                    <span>{s.subject}</span>
                    <span className="font-mono">{s.count} / {goal}문제 ({pct}%)</span>
                  </div>
                  <div className="w-full h-2.5 border" style={{ borderColor: C.paperLine, background: C.surface }}>
                    <div style={{ width: `${pct}%`, height: "100%", background: C.blueprint }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <SectionLabel n="●">스트릭</SectionLabel>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center">
            <div className="font-mono text-2xl" style={{ color: C.ink }}>🔥 {studyStreak}일</div>
            <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>연속 공부일</div>
          </div>
          <div className="text-center">
            <div className="font-mono text-2xl" style={{ color: C.ink }}>🏫 {attendStreak}일</div>
            <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>연속 출석일</div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel n="04">최근 7일 공부시간</SectionLabel>
        <div style={{ width: "100%", height: 180 }}>
          <ResponsiveContainer>
            <BarChart data={last7}>
              <CartesianGrid stroke={C.paperLine} vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={{ stroke: C.paperLine }} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: C.inkSoft }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderColor: C.paperLine }} />
              <Bar dataKey="분" fill={C.blueprint} radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card><SectionLabel n="05">이번 주 출석</SectionLabel><div className="font-mono text-2xl" style={{ color: C.ink }}>{thisWeekAttendance}일 / 7일</div></Card>

      <Card>
        <div className="flex items-center gap-2 mb-3">
          <img src={LOGO_SRC} alt="신전스퀘어" style={{ width: 28, height: 28 }} />
          <SectionLabel n="06">신전스퀘어 바로가기</SectionLabel>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ACADEMY_LINKS.map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1.5 text-sm border py-2" style={{ borderColor: C.blueprintLight, color: C.blueprint }}><ExternalLink size={13} /> {l.label}</a>
          ))}
        </div>
      </Card>

      <div className="text-xs text-center pt-2 pb-1" style={{ color: C.inkSoft }}>
        Powered by <span className="font-semibold" style={{ color: C.blueprint }}>{settings.academyLabel || "신전스퀘어"}</span> · 이 앱은 무료로 배포됩니다
      </div>
    </div>
  );
}

/* ---------------- Attempt editor ---------------- */
/* ---------------- Red-pen annotation ---------------- */
function AnnotateCanvas({ imageSrc, onSave, onClose }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const imgRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      const maxW = Math.min(360, img.width);
      const scale = maxW / img.width;
      canvas.width = maxW; canvas.height = img.height * scale;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      imgRef.current = img;
    };
    img.src = imageSrc;
  }, [imageSrc]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const point = e.touches ? e.touches[0] : e;
    return { x: point.clientX - rect.left, y: point.clientY - rect.top };
  };
  const start = (e) => { drawingRef.current = true; lastPos.current = getPos(e); };
  const move = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.strokeStyle = "#E11D2E"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(lastPos.current.x, lastPos.current.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
    lastPos.current = pos;
  };
  const end = () => { drawingRef.current = false; };
  const clearAll = () => {
    const canvas = canvasRef.current; const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (imgRef.current) ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
  };
  const save = () => onSave(canvasRef.current.toDataURL("image/jpeg", 0.85));

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.85)" }}>
      <div className="text-xs mb-2" style={{ color: "#fff" }}>손가락(또는 마우스)으로 오답 부분에 빨간펜 표시를 남겨보세요</div>
      <canvas
        ref={canvasRef}
        className="border touch-none"
        style={{ borderColor: "#fff", maxWidth: "100%", background: "#fff" }}
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
      />
      <div className="flex gap-2 mt-3">
        <button onClick={clearAll} className="px-3 py-1.5 text-sm border" style={{ borderColor: "#fff", color: "#fff" }}>전체 지우기</button>
        <button onClick={onClose} className="px-3 py-1.5 text-sm border" style={{ borderColor: "#fff", color: "#fff" }}>취소</button>
        <button onClick={save} className="px-3 py-1.5 text-sm border" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>저장</button>
      </div>
    </div>
  );
}

function AttemptEditor({ problemId, attempt, updateAttempt, removeAttempt }) {
  const fileRef = useRef(null);
  const [annotating, setAnnotating] = useState(false);
  const patch = (p) => updateAttempt(problemId, attempt.id, p);
  const toggleCause = (cause) => { const has = attempt.wrongCauses.includes(cause); patch({ wrongCauses: has ? attempt.wrongCauses.filter(c => c !== cause) : [...attempt.wrongCauses, cause] }); };
  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { const dataUrl = await compressImage(file); patch({ image: dataUrl }); } catch (err) { console.error(err); }
    e.target.value = "";
  };
  return (
    <div className="border p-3 space-y-3" style={{ borderColor: C.paperLine, background: C.surface }}>
      {annotating && attempt.image && (
        <AnnotateCanvas imageSrc={attempt.image} onClose={() => setAnnotating(false)} onSave={(url) => { patch({ image: url }); setAnnotating(false); }} />
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <input type="date" value={attempt.date} onChange={e => patch({ date: e.target.value })} className="border px-2 py-1 text-xs font-mono" style={{ borderColor: C.paperLine }} />
        <div className="flex gap-1.5">
          <button onClick={() => patch({ correct: true })} className="px-2 py-1 text-xs border flex items-center gap-1" style={{ borderColor: attempt.correct === true ? C.green : C.paperLine, color: attempt.correct === true ? C.green : C.inkSoft, background: attempt.correct === true ? C.tintGreen : "transparent" }}><CheckCircle2 size={13} /> 정답</button>
          <button onClick={() => patch({ correct: false })} className="px-2 py-1 text-xs border flex items-center gap-1" style={{ borderColor: attempt.correct === false ? C.red : C.paperLine, color: attempt.correct === false ? C.red : C.inkSoft, background: attempt.correct === false ? C.tintRed : "transparent" }}><PenLine size={13} /> 오답노트 작성하기</button>
          <button onClick={() => removeAttempt(problemId, attempt.id)}><Trash2 size={16} color={C.paperLine} /></button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div><label className="text-xs" style={{ color: C.inkSoft }}>총 문제 풀이 시간(분)</label>
          <input type="number" value={attempt.totalTime} onChange={e => patch({ totalTime: e.target.value })} className="w-full border px-2 py-1 text-sm font-mono mt-0.5" style={{ borderColor: C.paperLine }} /></div>
        <div><label className="text-xs" style={{ color: C.inkSoft }}>작도 시간(분)</label>
          <input type="number" value={attempt.drawTime} onChange={e => patch({ drawTime: e.target.value })} className="w-full border px-2 py-1 text-sm font-mono mt-0.5" style={{ borderColor: C.paperLine }} /></div>
      </div>
      <div>
        <label className="text-xs block mb-1" style={{ color: C.inkSoft }}>내가 그린 도면</label>
        {attempt.image ? (
          <div className="relative inline-block">
            <img src={attempt.image} alt="도면" className="w-full max-h-64 object-contain border" style={{ borderColor: C.paperLine }} />
            <button onClick={() => patch({ image: null })} className="absolute top-1 right-1 bg-white border rounded-full p-0.5" style={{ borderColor: C.paperLine }}><X size={12} color={C.ink} /></button>
            <button onClick={() => setAnnotating(true)} className="absolute bottom-1 right-1 px-2 py-1 text-xs border rounded" style={{ background: "#E11D2E", borderColor: "#E11D2E", color: "#fff" }}>🖊 빨간펜</button>
          </div>
        ) : (
          <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="w-full flex items-center justify-center gap-1.5 border py-3 text-sm" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Camera size={16} /> 도면 사진 추가</button>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
      </div>
      {attempt.correct === false && (
        <>
          <div><label className="text-xs" style={{ color: C.inkSoft }}>문제 주안점 및 답안비교</label>
            <textarea rows={2} value={attempt.keyPoints} onChange={e => patch({ keyPoints: e.target.value })} placeholder="문제의 핵심 내용 파악 및 모범답안과 비교" className="w-full border px-2 py-1.5 text-sm mt-0.5" style={{ borderColor: C.paperLine }} /></div>
          <div>
            <label className="text-xs" style={{ color: C.inkSoft }}>오답 원인 파악</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {WRONG_CAUSES.map(cause => { const active = attempt.wrongCauses.includes(cause); return (
                <button key={cause} onClick={() => toggleCause(cause)} className="px-2 py-1 text-xs border" style={{ borderColor: active ? C.red : C.paperLine, color: active ? C.red : C.inkSoft, background: active ? C.tintRed : "transparent" }}>{cause}</button>
              ); })}
            </div>
          </div>
          <div><label className="text-xs" style={{ color: C.inkSoft }}>오답 원인 보완</label>
            <textarea rows={2} value={attempt.improvement} onChange={e => patch({ improvement: e.target.value })} placeholder="틀린 원인에 대한 보완 전략" className="w-full border px-2 py-1.5 text-sm mt-0.5" style={{ borderColor: C.paperLine }} /></div>
          <button onClick={() => patch({ overcome: !attempt.overcome })} className="text-xs px-2 py-1 border flex items-center gap-1" style={{ borderColor: attempt.overcome ? C.green : C.paperLine, color: attempt.overcome ? C.green : C.inkSoft }}><CheckCircle2 size={12} /> {attempt.overcome ? "극복함" : "극복 표시"}</button>
        </>
      )}
    </div>
  );
}

function AttemptHistory({ problemId, attempts, updateAttempt, removeAttempt }) {
  const [openIds, setOpenIds] = useState({});
  if (!attempts || attempts.length === 0) {
    return <div className="text-xs" style={{ color: C.inkSoft }}>아직 풀이 기록이 없습니다. "기록" 버튼으로 추가하세요.</div>;
  }
  const sorted = [...attempts].reverse(); // newest first
  const [latest, ...older] = sorted;
  return (
    <div className="space-y-2">
      <AttemptEditor problemId={problemId} attempt={latest} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />
      {older.length > 0 && (
        <div className="space-y-1">
          {older.map(a => openIds[a.id] ? (
            <div key={a.id}>
              <AttemptEditor problemId={problemId} attempt={a} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />
              <button onClick={() => setOpenIds(o => ({ ...o, [a.id]: false }))} className="text-xs underline mt-1" style={{ color: C.inkSoft }}>이 기록 접기</button>
            </div>
          ) : (
            <button key={a.id} onClick={() => setOpenIds(o => ({ ...o, [a.id]: true }))} className="w-full flex items-center justify-between text-xs border px-2 py-1.5" style={{ borderColor: C.paperLine, color: C.inkSoft }}>
              <span className="font-mono">{a.date}</span>
              <span style={{ color: a.correct === true ? C.green : a.correct === false ? C.red : C.inkSoft }}>{a.correct === true ? "정답" : a.correct === false ? "오답" : "미채점"}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Past exams grid (collapsible) ---------------- */
const SHORT_LABEL = { "분석·조닝": "분·조", "배치계획": "배치", "평면계획": "평면", "구조계획": "구조", "단면계획": "단면" };
function shortLabel(s) { return SHORT_LABEL[s] || s.slice(0, 2); }

function PastExamsGrid({ subjects, problems, setProblems }) {
  const rounds = useMemo(buildRounds, []);
  const [selectedId, setSelectedId] = useState(null);
  const [gridOpen, setGridOpen] = useState(true);
  const seeded = useMemo(() => problems.filter(p => p.seeded), [problems]);
  const doneCount = seeded.filter(p => p.attempts.length > 0).length;
  const selected = seeded.find(p => p.id === selectedId);

  const addAttempt = (problemId) => { setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: [...p.attempts, newAttempt()] } : p)); setSelectedId(problemId); };
  const updateAttempt = (problemId, attemptId, patch) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.map(a => a.id === attemptId ? { ...a, ...patch } : a) } : p));
  const removeAttempt = (problemId, attemptId) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.filter(a => a.id !== attemptId) } : p));

  return (
    <Card>
      <button onClick={() => setGridOpen(o => !o)} className="w-full flex items-center justify-between">
        <SectionLabel n="01">과년도 기출 (2010~2026)</SectionLabel>
        {gridOpen ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />}
      </button>
      <div className="text-xs mb-3" style={{ color: C.inkSoft }}>총 {seeded.length}문제 중 {doneCount}개 풀이{gridOpen ? " · 칸을 눌러 몇 번 풀었는지 확인하고 기록을 남기세요" : ""}</div>
      {gridOpen && (
      <div style={{ overflowX: "auto" }}>
        <table className="text-center" style={{ width: "100%", fontSize: 11 }}>
          <thead>
            <tr><th></th>{subjects.map(s => <th key={s} className="py-1" style={{ color: C.inkSoft, fontWeight: 500 }}>{shortLabel(s)}</th>)}</tr>
          </thead>
          <tbody>
            {rounds.map(r => (
              <tr key={roundKey(r)} className="border-t" style={{ borderColor: C.paperLine }}>
                <td className="text-left font-mono py-1 pr-2" style={{ color: C.inkSoft, whiteSpace: "nowrap" }}>{roundRowLabel(r)}</td>
                {subjects.map(s => {
                  const p = seeded.find(x => x.year === r.year && x.round === r.round && x.subject === s);
                  if (!p) return <td key={s} />;
                  const count = p.attempts.length;
                  const isSel = selectedId === p.id;
                  return (
                    <td key={s} className="py-1" style={{ background: isSel ? C.tintAmber : "transparent" }}>
                      <button onClick={() => setSelectedId(isSel ? null : p.id)} className="w-full flex flex-col items-center justify-center py-0.5" style={{ border: isSel ? `2px solid ${C.amber}` : "none" }}>
                        {count > 0 ? (
                          <span className="font-mono font-bold" style={{ color: isSel ? C.amber : C.blueprint, fontSize: 12 }}>{count}</span>
                        ) : (
                          <Circle size={14} color={isSel ? C.amber : C.paperLine} />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {selected && (
        <div className="mt-3 border-t pt-3" style={{ borderColor: C.paperLine }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium flex items-center gap-1.5" style={{ color: C.ink }}>
              {selected.attempts.length > 0 ? <CheckCircle2 size={15} color={C.blueprint} /> : <Circle size={15} color={C.paperLine} />}
              {selected.year}년 {selected.round}회 · {selected.subject}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => addAttempt(selected.id)} className="px-2 py-1 text-xs border flex items-center gap-1" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Plus size={12} /> 기록</button>
              <button onClick={() => setSelectedId(null)}><X size={14} color={C.inkSoft} /></button>
            </div>
          </div>
          <AttemptHistory problemId={selected.id} attempts={selected.attempts} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />
        </div>
      )}
    </Card>
  );
}

function SolvedOverview({ subjects, problems, setProblems }) {
  const [open, setOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState({});
  const updateAttempt = (problemId, attemptId, patch) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.map(a => a.id === attemptId ? { ...a, ...patch } : a) } : p));
  const removeAttempt = (problemId, attemptId) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.filter(a => a.id !== attemptId) } : p));

  const solved = useMemo(() => problems.filter(p => p.attempts.length > 0), [problems]);
  const grouped = useMemo(() => {
    const g = {};
    subjects.forEach(s => { g[s] = []; });
    solved.forEach(p => { (g[p.subject] = g[p.subject] || []).push(p); });
    return g;
  }, [solved, subjects]);

  const labelFor = (p) => p.seeded ? `${p.year}년 ${p.round}회` : p.source === "기출" ? `${p.year}년 ${p.round}회` : `${p.academy || ""} 과제`;

  return (
    <Card>
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between">
        <SectionLabel n="00">지금까지 푼 문제 모아보기 ({solved.length})</SectionLabel>
        {open ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />}
      </button>
      {open && (
        <div className="space-y-3 mt-2">
          {solved.length === 0 && <div className="text-xs text-center py-3" style={{ color: C.inkSoft }}>아직 풀어본 문제가 없어요.</div>}
          {subjects.filter(s => (grouped[s] || []).length > 0).map(s => (
            <div key={s}>
              <div className="text-xs font-semibold mb-1" style={{ color: C.inkSoft }}>{s} ({grouped[s].length})</div>
              <div className="space-y-1">
                {grouped[s].map(p => {
                  const correctCount = p.attempts.filter(a => a.correct === true).length;
                  const wrongCount = p.attempts.filter(a => a.correct === false).length;
                  const isOpen = !!expandedIds[p.id];
                  return (
                    <div key={p.id} className="border" style={{ borderColor: C.paperLine }}>
                      <button onClick={() => setExpandedIds(e => ({ ...e, [p.id]: !e[p.id] }))} className="w-full flex items-center justify-between px-2 py-1.5 text-left">
                        <span className="text-xs" style={{ color: C.ink }}><span className="font-mono mr-1" style={{ color: C.inkSoft }}>{labelFor(p)}</span>{p.title || "(제목 없음)"}</span>
                        <span className="text-xs font-mono flex-shrink-0 ml-2" style={{ color: C.inkSoft }}>{p.attempts.length}회 · 정답{correctCount}·오답{wrongCount}</span>
                      </button>
                      {isOpen && (
                        <div className="p-2 border-t" style={{ borderColor: C.paperLine }}>
                          <AttemptHistory problemId={p.id} attempts={p.attempts} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ---------------- Problems tracker ---------------- */
function ProblemsTab({ subjects, problems, setProblems, settings, setSettings }) {
  const rounds = useMemo(buildRounds, []);
  const [form, setForm] = useState({ source: "기출", roundKey: rounds.length ? roundKey(rounds[0]) : "", academy: ACADEMIES[0], subject: subjects[0] || "", title: "", difficulty: "" });
  const [expanded, setExpanded] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [difficultyFilter, setDifficultyFilter] = useState("전체");
  const [groupBy, setGroupBy] = useState("subject"); // "subject" | "date"
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const add = () => {
    if (!form.subject) return;
    const period = SUBJECT_PERIODS[form.subject] || "";
    let problem;
    if (form.source === "기출") {
      const r = form.roundKey ? parseRoundKey(form.roundKey) : { year: new Date().getFullYear(), round: 1 };
      problem = { id: uid(), year: r.year, round: r.round, subject: form.subject, source: "기출", period, title: form.title.trim(), difficulty: form.difficulty, attempts: [] };
    } else {
      problem = { id: uid(), year: new Date().getFullYear(), subject: form.subject, source: "학원과제", academy: form.academy, period, title: form.title.trim(), difficulty: form.difficulty, attempts: [] };
    }
    setProblems(prev => [...prev, problem]); setForm(f => ({ ...f, title: "" }));
  };
  const remove = (id) => setProblems(prev => prev.filter(p => p.id !== id));
  const addAttempt = (problemId) => { setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: [...p.attempts, newAttempt()] } : p)); setExpanded(e => ({ ...e, [problemId]: true })); };
  const updateAttempt = (problemId, attemptId, patch) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.map(a => a.id === attemptId ? { ...a, ...patch } : a) } : p));
  const removeAttempt = (problemId, attemptId) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.filter(a => a.id !== attemptId) } : p));
  const cycleDifficulty = (id) => setProblems(prev => prev.map(p => {
    if (p.id !== id) return p;
    const order = ["", "상", "중", "하"];
    const next = order[(order.indexOf(p.difficulty || "") + 1) % order.length];
    return { ...p, difficulty: next };
  }));

  const customProblems = useMemo(() => problems.filter(p => !p.seeded), [problems]);
  const filteredCustom = useMemo(() => difficultyFilter === "전체" ? customProblems : customProblems.filter(p => p.difficulty === difficultyFilter), [customProblems, difficultyFilter]);
  const grouped = useMemo(() => {
    const g = {};
    if (groupBy === "subject") {
      for (const p of filteredCustom) (g[p.subject] = g[p.subject] || []).push(p);
      Object.values(g).forEach(arr => arr.sort((a, b) => b.year - a.year));
    } else {
      for (const p of filteredCustom) {
        const latest = p.attempts.length ? [...p.attempts].sort((a, b) => b.date.localeCompare(a.date))[0].date : "기록 없음";
        (g[latest] = g[latest] || []).push(p);
      }
    }
    return g;
  }, [filteredCustom, groupBy]);
  const groupKeys = useMemo(() => {
    const keys = Object.keys(grouped);
    if (groupBy === "date") return keys.sort((a, b) => a === "기록 없음" ? 1 : b === "기록 없음" ? -1 : b.localeCompare(a));
    return keys;
  }, [grouped, groupBy]);

  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkDelete = () => { setProblems(prev => prev.filter(p => !selectedIds.has(p.id))); setSelectedIds(new Set()); setSelectMode(false); };

  return (
    <div className="space-y-5">
      <SolvedOverview subjects={subjects} problems={problems} setProblems={setProblems} />

      <Card>
        <SectionLabel n="00">과목별 목표 문제 수</SectionLabel>
        <div className="space-y-1.5">
          {subjects.map(s => (
            <div key={s} className="flex items-center gap-2">
              <span className="text-xs w-16 flex-shrink-0" style={{ color: C.inkSoft }}>{s}</span>
              <input type="number" value={(settings.subjectGoals && settings.subjectGoals[s]) || ""} onChange={e => setSettings({ ...settings, subjectGoals: { ...(settings.subjectGoals || {}), [s]: e.target.value } })} placeholder="목표 문제 수" className="flex-1 border px-2 py-1 text-sm font-mono" style={{ borderColor: C.paperLine }} />
            </div>
          ))}
        </div>
      </Card>

      <PastExamsGrid subjects={subjects} problems={problems} setProblems={setProblems} />

      <Card>
        <SectionLabel n="02">추가 문제 등록</SectionLabel>
        <div className="flex gap-2 mb-2">
          {["기출", "학원과제"].map(s => (
            <button key={s} onClick={() => setForm({ ...form, source: s })} className="px-3 py-1 text-xs border" style={{ borderColor: form.source === s ? C.blueprint : C.paperLine, color: form.source === s ? C.blueprint : C.inkSoft, background: form.source === s ? C.tintBlue : "transparent" }}>{s}</button>
          ))}
        </div>
        {form.source === "기출" ? (
          <select value={form.roundKey} onChange={e => setForm({ ...form, roundKey: e.target.value })} className="w-full border px-2 py-1.5 text-sm mb-2" style={{ borderColor: C.paperLine }}>
            {rounds.map(r => <option key={roundKey(r)} value={roundKey(r)}>{roundLabel(r)}</option>)}
          </select>
        ) : (
          <select value={form.academy} onChange={e => setForm({ ...form, academy: e.target.value })} className="w-full border px-2 py-1.5 text-sm mb-2" style={{ borderColor: C.paperLine }}>
            {ACADEMIES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
        <select value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} className="w-full border px-2 py-1.5 text-sm mb-2" style={{ borderColor: C.paperLine }}>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <div className="flex gap-2 mb-2">
          <span className="text-xs self-center" style={{ color: C.inkSoft }}>난이도</span>
          {DIFFICULTIES.map(d => (
            <button key={d.key} onClick={() => setForm({ ...form, difficulty: form.difficulty === d.key ? "" : d.key })} className="px-2 py-1 text-xs border" style={{ borderColor: form.difficulty === d.key ? d.color : C.paperLine, color: form.difficulty === d.key ? d.color : C.inkSoft }}>{d.key}</button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="문제 제목 (선택)" className="flex-1 border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <button onClick={add} className="px-3 border flex items-center gap-1 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Plus size={14} />추가</button>
        </div>
      </Card>

      {customProblems.length > 0 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={() => setGroupBy("subject")} className="px-2 py-1 text-xs border" style={{ borderColor: groupBy === "subject" ? C.blueprint : C.paperLine, color: groupBy === "subject" ? C.blueprint : C.inkSoft }}>과목별</button>
            <button onClick={() => setGroupBy("date")} className="px-2 py-1 text-xs border" style={{ borderColor: groupBy === "date" ? C.blueprint : C.paperLine, color: groupBy === "date" ? C.blueprint : C.inkSoft }}>날짜별</button>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["전체", ...DIFFICULTIES.map(d => d.key)].map(f => (
              <button key={f} onClick={() => setDifficultyFilter(f)} className="px-2 py-1 text-xs border" style={{ borderColor: difficultyFilter === f ? C.blueprint : C.paperLine, color: difficultyFilter === f ? C.blueprint : C.inkSoft }}>{f}</button>
            ))}
          </div>
        </div>
      )}

      {customProblems.length > 0 && (
        <SelectBar selectMode={selectMode} setSelectMode={setSelectMode} count={selectedIds.size}
          onSelectAll={() => setSelectedIds(new Set(filteredCustom.map(p => p.id)))} onDelete={bulkDelete}
          onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }} />
      )}

      {groupKeys.length === 0 && <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>표시할 문제가 없습니다.</div>}
      {groupKeys.map(key => {
        const list = grouped[key];
        const isCollapsed = !!collapsedGroups[key];
        const label = groupBy === "date" ? (key === "기록 없음" ? "기록 없음" : key) : key;
        return (
          <Card key={key}>
            <button onClick={() => setCollapsedGroups(c => ({ ...c, [key]: !c[key] }))} className="w-full flex items-center justify-between">
              <SectionLabel n="●">{label} ({list.filter(p => p.attempts.length > 0).length}/{list.length})</SectionLabel>
              {isCollapsed ? <ChevronDown size={16} color={C.inkSoft} /> : <ChevronUp size={16} color={C.inkSoft} />}
            </button>
            {!isCollapsed && (
              <div className="space-y-3">
                {list.map(p => {
                  const isOpen = !!expanded[p.id];
                  const correctCount = p.attempts.filter(a => a.correct === true).length;
                  const wrongCount = p.attempts.filter(a => a.correct === false).length;
                  const diffInfo = DIFFICULTIES.find(d => d.key === p.difficulty);
                  return (
                    <div key={p.id} className="border-b pb-3 last:border-b-0" style={{ borderColor: C.paperLine }}>
                      <div className="flex items-center gap-2">
                        {selectMode && (<button onClick={() => toggleSelect(p.id)}>{selectedIds.has(p.id) ? <CheckCircle2 size={16} color={C.blueprint} /> : <Circle size={16} color={C.paperLine} />}</button>)}
                        <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))} className="flex-1 text-left">
                          <div className="text-sm" style={{ color: C.ink }}>
                            <span className="font-mono text-xs mr-1" style={{ color: C.inkSoft }}>{groupBy === "date" ? p.subject : (p.source === "기출" ? `${p.year}년 ${p.round}회` : `${p.academy} 과제`)}</span>
                            {p.title || "(제목 없음)"}
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>총 {p.attempts.length}회 풀이 · 정답 {correctCount} · 오답 {wrongCount}</div>
                        </button>
                        {!selectMode && (<>
                          <button onClick={() => cycleDifficulty(p.id)} className="px-1.5 py-0.5 text-xs border" style={{ borderColor: diffInfo ? diffInfo.color : C.paperLine, color: diffInfo ? diffInfo.color : C.paperLine }}>{p.difficulty || "-"}</button>
                          <button onClick={() => addAttempt(p.id)} className="px-2 py-1 text-xs border flex items-center gap-1" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Plus size={12} /> 기록</button>
                          <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))}>{isOpen ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />}</button>
                          <button onClick={() => remove(p.id)}><Trash2 size={14} color={C.paperLine} /></button>
                        </>)}
                      </div>
                      {isOpen && !selectMode && (
                        <div className="mt-2">
                          <AttemptHistory problemId={p.id} attempts={p.attempts} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- Grading / 표준오답노트 (grouped by problem) ---------------- */
function GradingTab({ problems, setProblems }) {
  const [expanded, setExpanded] = useState({});
  const updateAttempt = (problemId, attemptId, patch) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.map(a => a.id === attemptId ? { ...a, ...patch } : a) } : p));
  const removeAttempt = (problemId, attemptId) => setProblems(prev => prev.map(p => p.id === problemId ? { ...p, attempts: p.attempts.filter(a => a.id !== attemptId) } : p));

  const problemsWithWrong = problems.map(p => ({ p, wrongs: p.attempts.filter(a => a.correct === false && !a.overcome) })).filter(x => x.wrongs.length > 0);
  const overcomeItems = [];
  problems.forEach(p => p.attempts.forEach(a => { if (a.correct === false && a.overcome) overcomeItems.push({ p, a }); }));
  const totalWrong = problemsWithWrong.reduce((acc, x) => acc + x.wrongs.length, 0);

  const causeCounts = useMemo(() => {
    const counts = {}; WRONG_CAUSES.forEach(c => { counts[c] = 0; });
    problems.forEach(p => p.attempts.forEach(a => { if (a.correct === false) (a.wrongCauses || []).forEach(c => { counts[c] = (counts[c] || 0) + 1; }); }));
    return Object.entries(counts).map(([cause, count]) => ({ cause, count })).sort((a, b) => b.count - a.count).filter(x => x.count > 0);
  }, [problems]);

  return (
    <div className="space-y-5">
      {causeCounts.length > 0 && (
        <Card>
          <SectionLabel n="00">내가 가장 자주 틀리는 유형</SectionLabel>
          <div className="space-y-1.5">
            {causeCounts.map(c => (
              <div key={c.cause} className="flex items-center gap-2">
                <span className="text-xs w-24 flex-shrink-0" style={{ color: C.ink }}>{c.cause}</span>
                <div className="flex-1 h-2.5" style={{ background: "#EDEFF2" }}>
                  <div style={{ width: `${(c.count / causeCounts[0].count) * 100}%`, height: "100%", background: C.red }} />
                </div>
                <span className="text-xs font-mono" style={{ color: C.inkSoft }}>{c.count}건</span>
              </div>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <SectionLabel n="01">표준오답노트 · 문제 {problemsWithWrong.length}개 · 기록 {totalWrong}건</SectionLabel>
        {problemsWithWrong.length === 0 && <div className="text-sm py-4 text-center" style={{ color: C.inkSoft }}>미해결 오답이 없습니다.</div>}
        <div className="space-y-2">
          {problemsWithWrong.map(({ p, wrongs }) => {
            const isOpen = !!expanded[p.id];
            const label = p.source === "기출" ? `${p.year}년 ${p.round}회` : `${p.academy || ""} 과제`;
            return (
              <div key={p.id} className="border-b pb-2 last:border-b-0" style={{ borderColor: C.paperLine }}>
                <button onClick={() => setExpanded(e => ({ ...e, [p.id]: !e[p.id] }))} className="w-full flex items-center justify-between text-left py-1">
                  <div>
                    <div className="text-sm font-medium" style={{ color: C.ink }}>
                      <span className="font-mono text-xs mr-1" style={{ color: C.red }}>{label} · {p.subject}</span>
                      {p.title || "(제목 없음)"}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>미해결 오답 {wrongs.length}건</div>
                  </div>
                  {isOpen ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />}
                </button>
                {isOpen && (
                  <div className="mt-2 space-y-3">
                    {wrongs.map(a => <AttemptEditor key={a.id} problemId={p.id} attempt={a} updateAttempt={updateAttempt} removeAttempt={removeAttempt} />)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      {overcomeItems.length > 0 && (
        <Card>
          <SectionLabel n="02">극복한 오답 ({overcomeItems.length})</SectionLabel>
          <div className="space-y-1">
            {overcomeItems.map(({ p, a }) => (
              <div key={a.id} className="flex items-center justify-between py-1.5 border-b last:border-b-0 text-sm" style={{ borderColor: C.paperLine, color: C.inkSoft }}>
                <span>{p.subject} · {p.title || "(제목 없음)"} · {a.date}</span>
                <button onClick={() => updateAttempt(p.id, a.id, { overcome: false })} className="text-xs underline">되돌리기</button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---------------- Study time (with date picker for past logging) ---------------- */
function MockExamCard({ mockBreak1Minutes, setMockBreak1Minutes, mockBreak2Minutes, setMockBreak2Minutes, mockPhases, mockPhaseIndex, mockRemaining, mockRunning, startMock, advanceMock, mockTodayMinutes }) {
  const currentPhase = mockPhases ? mockPhases[mockPhaseIndex] : null;
  const isBreak = currentPhase && currentPhase.type === "break";
  return (
    <Card className={mockRunning ? "!p-0 overflow-hidden" : ""}>
      {!mockRunning ? (
        <>
          <SectionLabel n="00">모의고사 모드</SectionLabel>
          <div className="text-xs mb-3" style={{ color: C.inkSoft }}>1·2·3교시 각 3시간씩 실전처럼 이어서 풀어요. 교시 시간만 자동으로 오늘 공부시간에 기록되고, 쉬는시간은 기록되지 않아요. 다른 탭으로 이동해도 계속 진행돼요.</div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <div>
              <label className="text-xs" style={{ color: C.inkSoft }}>1·2교시 사이 쉬는시간(분)</label>
              <input type="number" value={mockBreak1Minutes} onChange={e => setMockBreak1Minutes(e.target.value)} placeholder="예: 60" className="w-full border px-2 py-1.5 text-sm font-mono mt-1" style={{ borderColor: C.paperLine }} />
            </div>
            <div>
              <label className="text-xs" style={{ color: C.inkSoft }}>2·3교시 사이 쉬는시간(분)</label>
              <input type="number" value={mockBreak2Minutes} onChange={e => setMockBreak2Minutes(e.target.value)} placeholder="예: 30" className="w-full border px-2 py-1.5 text-sm font-mono mt-1" style={{ borderColor: C.paperLine }} />
            </div>
          </div>
          <button onClick={startMock} className="w-full py-2 text-sm border flex items-center justify-center gap-1" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Play size={14} /> 모의고사 시작</button>
          {mockTodayMinutes > 0 && <div className="text-xs mt-2" style={{ color: C.inkSoft }}>오늘 모의고사 누적: {mockTodayMinutes}분</div>}
        </>
      ) : (
        <div className="p-6 text-center" style={{ background: isBreak ? "#1E3A5F" : "#4A1414" }}>
          <div className="text-sm font-semibold tracking-widest mb-3" style={{ color: isBreak ? "#8FC1D9" : "#F0A0A0" }}>
            {isBreak ? "☕ 쉬는시간" : `📝 ${currentPhase.label} 진행 중 (${Math.ceil((mockPhaseIndex + 1) / 2)}/3 교시)`}
          </div>
          <div className="font-mono font-bold" style={{ color: "#fff", fontSize: "4.5rem", lineHeight: 1, letterSpacing: "0.02em" }}>{fmtClock(mockRemaining)}</div>
          <div className="flex gap-2 mt-6">
            <button onClick={() => advanceMock(currentPhase.seconds - mockRemaining, false)} className="flex-1 py-2.5 text-sm border" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff" }}>다음 단계로</button>
            <button onClick={() => advanceMock(currentPhase.seconds - mockRemaining, true)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm border" style={{ borderColor: "rgba(255,255,255,0.4)", color: "#fff", background: "rgba(0,0,0,0.2)" }}><Square size={14} /> 전체 종료</button>
          </div>
        </div>
      )}
    </Card>
  );
}

function StudyTab({ subjects, studyLog, setStudyLog, mockProps }) {
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const isToday = selectedDate === todayStr();
  const dayData = studyLog[selectedDate] || {};
  const [manual, setManual] = useState({});
  const [activeTimer, setActiveTimer] = useState(null);
  const [, forceTick] = useState(0);

  useEffect(() => { if (!activeTimer) return; const id = setInterval(() => forceTick(x => x + 1), 1000); return () => clearInterval(id); }, [activeTimer]);

  const addMinutes = (subject, mins) => {
    setStudyLog(prev => { const day = { ...(prev[selectedDate] || {}) }; day[subject] = Math.max(0, (day[subject] || 0) + mins); return { ...prev, [selectedDate]: day }; });
  };
  const stopTimer = () => {
    if (!activeTimer) return;
    const elapsedSec = Math.floor((Date.now() - activeTimer.startedAt) / 1000);
    const mins = Math.round(elapsedSec / 60);
    if (mins > 0) addMinutes(activeTimer.subject, mins);
    setActiveTimer(null);
  };
  const startTimer = (subject) => { if (activeTimer) stopTimer(); setActiveTimer({ subject, startedAt: Date.now() }); };
  const totalDay = Object.values(dayData).reduce((a, b) => a + b, 0);
  const mockTodayMinutes = Object.entries(studyLog[todayStr()] || {}).filter(([k]) => k.startsWith("모의고사·")).reduce((a, [, v]) => a + v, 0);

  return (
    <div className="space-y-5">
      <MockExamCard {...mockProps} mockTodayMinutes={mockTodayMinutes} />
      <Card>
        <SectionLabel n="01">날짜 선택</SectionLabel>
        <div className="flex items-center gap-2">
          <input type="date" value={selectedDate} max={todayStr()} onChange={e => setSelectedDate(e.target.value)} className="flex-1 border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
          {!isToday && <button onClick={() => setSelectedDate(todayStr())} className="px-3 border text-xs" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>오늘로</button>}
        </div>
        <div className="font-mono text-3xl mt-3" style={{ color: C.ink }}>{totalDay}분 <span className="text-sm" style={{ color: C.inkSoft }}>({(totalDay / 60).toFixed(1)}시간)</span></div>
        {!isToday && <div className="text-xs mt-1" style={{ color: C.amber }}>지난 날짜는 실시간 타이머 대신 아래 버튼으로 기록해주세요.</div>}
      </Card>
      {subjects.map(s => {
        const isActive = isToday && activeTimer && activeTimer.subject === s;
        const elapsed = isActive ? Math.floor((Date.now() - activeTimer.startedAt) / 1000) : 0;
        return (
          <Card key={s}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: C.ink }}>{s}</span>
              <span className="font-mono text-sm" style={{ color: C.blueprint }}>{dayData[s] || 0}분</span>
            </div>
            {isToday && (
              <div className="flex items-center gap-2 mb-2">
                {isActive ? (
                  <button onClick={stopTimer} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border" style={{ borderColor: C.red, color: C.red, background: C.tintRed }}><Square size={14} /> 종료 · {fmtClock(elapsed)}</button>
                ) : (
                  <button onClick={() => startTimer(s)} disabled={!!activeTimer} className="flex-1 flex items-center justify-center gap-1.5 py-2 text-sm border" style={{ background: activeTimer ? "transparent" : C.blueprint, borderColor: C.blueprint, color: activeTimer ? C.paperLine : "#fff", opacity: activeTimer ? 0.5 : 1 }}><Play size={14} /> 시작</button>
                )}
              </div>
            )}
            <div className="flex gap-2 mb-2">
              {[10, 30, 60].map(m => <button key={m} onClick={() => addMinutes(s, m)} className="px-3 py-1 text-xs border" style={{ borderColor: C.blueprintLight, color: C.blueprint }}>+{m}분</button>)}
              <button onClick={() => addMinutes(s, -10)} className="px-3 py-1 text-xs border" style={{ borderColor: C.paperLine, color: C.inkSoft }}>-10분</button>
            </div>
            <div className="flex gap-2">
              <input type="number" placeholder="직접 입력(분)" value={manual[s] || ""} onChange={e => setManual({ ...manual, [s]: e.target.value })} className="flex-1 border px-2 py-1 text-sm font-mono" style={{ borderColor: C.paperLine }} />
              <button onClick={() => { const v = Number(manual[s]); if (v) { addMinutes(s, v); setManual({ ...manual, [s]: "" }); } }} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>기록</button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

/* ---------------- Attendance ---------------- */
function classSessionsBetween(schedule, startDate, endDate) {
  if (!startDate || !endDate || !schedule || schedule.length === 0) return 0;
  const active = schedule.filter(s => s.active !== false);
  const days = new Set(active.map(s => WEEKDAYS.indexOf(s.day)));
  let count = 0; const cur = new Date(startDate + "T00:00:00"); const end = new Date(endDate + "T00:00:00");
  while (cur <= end) { if (days.has(cur.getDay())) count += 1; cur.setDate(cur.getDate() + 1); }
  return count;
}
function isScheduledDate(schedule, startDate, endDate, dateObj) {
  const active = (schedule || []).filter(s => s.active !== false);
  if (active.length === 0 || !startDate) return true; // no restriction configured
  const start = new Date(startDate + "T00:00:00");
  const end = endDate ? new Date(endDate + "T00:00:00") : null;
  if (dateObj < start) return false;
  if (end && dateObj > end) return false;
  return active.some(s => WEEKDAYS.indexOf(s.day) === dateObj.getDay());
}

function AttendanceTab({ attendance, setAttendance, settings, setSettings }) {
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedDays, setSelectedDays] = useState(new Set());
  const [newClass, setNewClass] = useState({ label: "", day: "월", time: "19:00" });

  const base = new Date(); base.setDate(1); base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear(), month = base.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cycleStatus = (key) => {
    setAttendance(prev => {
      const cur = prev[key]; const idx = ATTEND_STATUSES.findIndex(s => s.key === cur);
      const next = idx === -1 ? ATTEND_STATUSES[0].key : idx === ATTEND_STATUSES.length - 1 ? undefined : ATTEND_STATUSES[idx + 1].key;
      const copy = { ...prev }; if (next === undefined) delete copy[key]; else copy[key] = next; return copy;
    });
  };
  const toggleDaySelect = (key) => setSelectedDays(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const bulkApply = (status) => { setAttendance(prev => { const copy = { ...prev }; selectedDays.forEach(k => { copy[k] = status; }); return copy; }); setSelectedDays(new Set()); setSelectMode(false); };
  const bulkDelete = () => { setAttendance(prev => { const copy = { ...prev }; selectedDays.forEach(k => { delete copy[k]; }); return copy; }); setSelectedDays(new Set()); setSelectMode(false); };

  const cells = []; for (let i = 0; i < firstDay; i++) cells.push(null); for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const presentCount = Object.keys(attendance).filter(k => k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`) && attendance[k] === "출석").length;

  const addClass = () => setSettings({ ...settings, classSchedule: [...(settings.classSchedule || []), { id: uid(), active: true, ...newClass }] });
  const removeClass = (id) => setSettings({ ...settings, classSchedule: (settings.classSchedule || []).filter(c => c.id !== id) });
  const toggleClassActive = (id) => setSettings({ ...settings, classSchedule: (settings.classSchedule || []).map(c => c.id === id ? { ...c, active: c.active === false ? true : false } : c) });
  const totalSessions = classSessionsBetween(settings.classSchedule, settings.courseStart, settings.examDate);
  const doneSessions = classSessionsBetween(settings.classSchedule, settings.courseStart, todayStr());

  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel n="01">수업 시간표</SectionLabel>
        <div className="text-xs mb-2" style={{ color: C.inkSoft }}>다니는 학원·스터디를 모두 등록하고, 지금 반영할 항목만 켜두세요. 켜진 항목의 요일만 출석 캘린더에서 선택할 수 있어요.</div>
        <div className="space-y-1.5 mb-3">
          {(settings.classSchedule || []).map(c => (
            <div key={c.id} className="flex items-center justify-between text-sm border-b last:border-b-0 py-1.5" style={{ borderColor: C.paperLine }}>
              <button onClick={() => toggleClassActive(c.id)} className="flex items-center gap-2 flex-1 text-left">
                {c.active === false ? <Circle size={15} color={C.paperLine} /> : <CheckCircle2 size={15} color={C.blueprint} />}
                <span style={{ color: c.active === false ? C.inkSoft : C.ink }}>{c.label || "학원/스터디"} · {c.day}요일 {c.time}</span>
              </button>
              <button onClick={() => removeClass(c.id)}><Trash2 size={13} color={C.paperLine} /></button>
            </div>
          ))}
          {(!settings.classSchedule || settings.classSchedule.length === 0) && <div className="text-xs" style={{ color: C.inkSoft }}>등록된 수업이 없습니다.</div>}
        </div>
        <div className="space-y-2">
          <input value={newClass.label} onChange={e => setNewClass({ ...newClass, label: e.target.value })} placeholder="학원/스터디 이름 (예: 신전스퀘어, 새벽스터디)" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <div className="flex gap-2">
            <select value={newClass.day} onChange={e => setNewClass({ ...newClass, day: e.target.value })} className="border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }}>{WEEKDAYS.map(d => <option key={d} value={d}>{d}요일</option>)}</select>
            <input type="time" value={newClass.time} onChange={e => setNewClass({ ...newClass, time: e.target.value })} className="border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
            <button onClick={addClass} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>추가</button>
          </div>
        </div>
      </Card>

      <Card>
        <SectionLabel n="02">개강일 · 전체 회차</SectionLabel>
        <label className="text-xs" style={{ color: C.inkSoft }}>개강일</label>
        <input type="date" value={settings.courseStart || ""} onChange={e => setSettings({ ...settings, courseStart: e.target.value })} className="w-full border px-2 py-1.5 text-sm font-mono mt-1 mb-2" style={{ borderColor: C.paperLine }} />
        <div className="font-mono text-lg" style={{ color: C.ink }}>{doneSessions} / {totalSessions}회차</div>
        <div className="text-xs mt-0.5" style={{ color: C.inkSoft }}>개강일부터 시험일까지, 켜져 있는 시간표 기준 총 회차</div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-3">
          <button onClick={() => setMonthOffset(o => o - 1)} className="text-sm px-2" style={{ color: C.blueprint }}>◂</button>
          <span className="font-mono text-sm" style={{ color: C.ink }}>{year}. {String(month + 1).padStart(2, "0")}</span>
          <button onClick={() => setMonthOffset(o => o + 1)} className="text-sm px-2" style={{ color: C.blueprint }}>▸</button>
        </div>
        {!selectMode ? (
          <button onClick={() => setSelectMode(true)} className="text-xs px-2 py-1 border flex items-center gap-1 mb-2" style={{ borderColor: C.paperLine, color: C.inkSoft }}><CheckSquare size={12} /> 선택</button>
        ) : (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {ATTEND_STATUSES.map(s => (<button key={s.key} onClick={() => bulkApply(s.key)} disabled={selectedDays.size === 0} className="text-xs px-2 py-1 border" style={{ borderColor: s.color, color: s.color, opacity: selectedDays.size === 0 ? 0.4 : 1 }}>{s.key}</button>))}
            <button onClick={bulkDelete} disabled={selectedDays.size === 0} className="text-xs px-2 py-1 border" style={{ borderColor: C.red, color: C.red, opacity: selectedDays.size === 0 ? 0.4 : 1 }}>삭제</button>
            <button onClick={() => { setSelectMode(false); setSelectedDays(new Set()); }} className="text-xs px-2 py-1 border" style={{ borderColor: C.paperLine, color: C.inkSoft }}>취소</button>
          </div>
        )}
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-1" style={{ color: C.inkSoft }}>{WEEKDAYS.map(d => <div key={d}>{d}</div>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((d, i) => {
            if (d === null) return <div key={i} />;
            const dateObj = new Date(year, month, d);
            const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
            const allowed = isScheduledDate(settings.classSchedule, settings.courseStart, settings.examDate, dateObj);
            const status = attendance[key]; const statusInfo = ATTEND_STATUSES.find(s => s.key === status); const isSel = selectedDays.has(key);
            return (
              <button key={i} disabled={!allowed} onClick={() => selectMode ? toggleDaySelect(key) : cycleStatus(key)} className="aspect-square text-xs border flex items-center justify-center"
                style={{ borderColor: isSel ? C.amber : C.paperLine, borderWidth: isSel ? 2 : 1, background: statusInfo ? statusInfo.color : "transparent", color: statusInfo ? "#fff" : allowed ? C.ink : C.paperLine, opacity: allowed ? 1 : 0.4 }}>{d}</button>
            );
          })}
        </div>
        <div className="flex gap-3 mt-3 text-xs flex-wrap" style={{ color: C.inkSoft }}>{ATTEND_STATUSES.map(s => (<span key={s.key} className="flex items-center gap-1"><span className="w-3 h-3 inline-block" style={{ background: s.color }} />{s.key}</span>))}</div>
      </Card>
      <Card>
        <SectionLabel n="03">이번 달 출석</SectionLabel>
        <div className="font-mono text-2xl mb-2" style={{ color: C.ink }}>{presentCount}일</div>
        {(settings.classSchedule || []).length > 0 && (
          <div className="space-y-1 border-t pt-2" style={{ borderColor: C.paperLine }}>
            {Array.from(new Set((settings.classSchedule || []).map(c => c.label || "학원/스터디"))).map(label => {
              const labelSchedules = (settings.classSchedule || []).filter(c => (c.label || "학원/스터디") === label);
              const count = Object.keys(attendance).filter(k => {
                if (!k.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`)) return false;
                if (attendance[k] !== "출석") return false;
                const d = new Date(k + "T00:00:00");
                return labelSchedules.some(c => WEEKDAYS.indexOf(c.day) === d.getDay());
              }).length;
              return (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span style={{ color: C.ink }}>{label}</span>
                  <span className="font-mono" style={{ color: C.blueprint }}>{count}일</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Drawing practice (per subject) ---------------- */
function DrawingSubjectSection({ subject, entries, setDrawing }) {
  const fileRef = useRef(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [annotatingId, setAnnotatingId] = useState(null);
  const [comparing, setComparing] = useState(false);
  const [listOpen, setListOpen] = useState(entries.length <= 3);

  const onPick = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      setDrawing(prev => ({ ...prev, [subject]: [{ id: uid(), date: todayStr(), image: dataUrl, title: "", minutes: "", note: "" }, ...(prev[subject] || [])] }));
    } catch (err) { console.error(err); }
    e.target.value = "";
  };
  const updateEntry = (id, patch) => setDrawing(prev => ({ ...prev, [subject]: (prev[subject] || []).map(x => x.id === id ? { ...x, ...patch } : x) }));
  const removeOne = (id) => setDrawing(prev => ({ ...prev, [subject]: (prev[subject] || []).filter(x => x.id !== id) }));
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { if (n.size >= 3) return n; n.add(id); } return n; });
  const bulkDelete = () => { setDrawing(prev => ({ ...prev, [subject]: (prev[subject] || []).filter(x => !selectedIds.has(x.id)) })); setSelectedIds(new Set()); setSelectMode(false); };
  const annotatingEntry = entries.find(x => x.id === annotatingId);
  const selectedEntries = entries.filter(x => selectedIds.has(x.id));

  return (
    <Card>
      {annotatingEntry && (
        <AnnotateCanvas imageSrc={annotatingEntry.image} onClose={() => setAnnotatingId(null)} onSave={(url) => { updateEntry(annotatingId, { image: url }); setAnnotatingId(null); }} />
      )}
      {comparing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center px-3" style={{ background: "rgba(0,0,0,0.9)" }} onClick={() => setComparing(false)}>
          <div className="flex gap-2 w-full max-w-2xl overflow-x-auto" onClick={e => e.stopPropagation()}>
            {selectedEntries.map(x => (
              <div key={x.id} className="flex-1 min-w-0">
                <img src={x.image} alt="비교" className="w-full max-h-72 object-contain border" style={{ borderColor: "#fff" }} />
                <div className="text-xs mt-1 text-center" style={{ color: "#fff" }}>{x.title || "(제목 없음)"}</div>
                <div className="text-xs text-center" style={{ color: "rgba(255,255,255,0.7)" }}>{x.date} · {x.minutes ? `${x.minutes}분` : "-"}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setComparing(false)} className="mt-4 text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>탭하여 닫기</button>
        </div>
      )}
      <button onClick={() => setListOpen(o => !o)} className="w-full flex items-center justify-between mb-1">
        <SectionLabel n="●">{subject} ({entries.length}장)</SectionLabel>
        {entries.length > 0 && (listOpen ? <ChevronUp size={16} color={C.inkSoft} /> : <ChevronDown size={16} color={C.inkSoft} />)}
      </button>
      <button onClick={() => fileRef.current && fileRef.current.click()} className="w-full flex items-center justify-center gap-1.5 border py-3 text-sm mb-3" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Camera size={16} /> 작도 사진 추가</button>
      <input ref={fileRef} type="file" accept="image/*" onChange={onPick} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
      {listOpen && entries.length > 0 && (
        <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
          <SelectBar selectMode={selectMode} setSelectMode={setSelectMode} count={selectedIds.size}
            onSelectAll={() => setSelectedIds(new Set(entries.slice(0, 3).map(x => x.id)))} onDelete={bulkDelete}
            onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }} />
          {selectMode && selectedIds.size >= 2 && (
            <button onClick={() => setComparing(true)} className="text-xs px-2 py-1 border" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>선택 {selectedIds.size}개 비교하기</button>
          )}
        </div>
      )}
      {listOpen && selectMode && <div className="text-xs mb-2" style={{ color: C.inkSoft }}>최대 3개까지 골라서 비교할 수 있어요.</div>}
      {listOpen && (
      <div className="space-y-3">
        {entries.map(x => (
          <div key={x.id} className="border p-2" style={{ borderColor: C.paperLine }}>
            <div className="flex items-start gap-2">
              {selectMode && (<button onClick={() => toggleSelect(x.id)} className="mt-1">{selectedIds.has(x.id) ? <CheckCircle2 size={16} color={C.blueprint} /> : <Circle size={16} color={C.paperLine} />}</button>)}
              <div className="relative flex-1">
                <img src={x.image} alt="작도" className="w-full max-h-56 object-contain border" style={{ borderColor: C.paperLine }} />
                {!selectMode && <button onClick={() => setAnnotatingId(x.id)} className="absolute bottom-1 right-1 px-2 py-1 text-xs border rounded" style={{ background: "#E11D2E", borderColor: "#E11D2E", color: "#fff" }}>🖊 빨간펜</button>}
              </div>
              {!selectMode && <button onClick={() => removeOne(x.id)}><Trash2 size={15} color={C.paperLine} /></button>}
            </div>
            <input value={x.title || ""} onChange={e => updateEntry(x.id, { title: e.target.value })} placeholder="어떤 작도인지 (예: 1층 평면도)" className="w-full border px-2 py-1 text-xs mt-2" style={{ borderColor: C.paperLine }} />
            <div className="grid grid-cols-2 gap-2 mt-1">
              <input type="date" value={x.date} onChange={e => updateEntry(x.id, { date: e.target.value })} className="border px-2 py-1 text-xs font-mono" style={{ borderColor: C.paperLine }} />
              <input type="number" value={x.minutes || ""} onChange={e => updateEntry(x.id, { minutes: e.target.value })} placeholder="걸린 시간(분)" className="border px-2 py-1 text-xs font-mono" style={{ borderColor: C.paperLine }} />
            </div>
            <input value={x.note} onChange={e => updateEntry(x.id, { note: e.target.value })} placeholder="메모 (선택)" className="w-full border px-2 py-1 text-xs mt-1" style={{ borderColor: C.paperLine }} />
          </div>
        ))}
      </div>
      )}
    </Card>
  );
}
function DrawingTab({ subjects, drawing, setDrawing }) {
  return (
    <div className="space-y-5">
      {subjects.map(s => <DrawingSubjectSection key={s} subject={s} entries={drawing[s] || []} setDrawing={setDrawing} />)}
    </div>
  );
}

/* ---------------- Community ---------------- */
const REPORT_THRESHOLD = 3;

function MarketBoard({ nickname, posts, setPosts, blockedAuthors, onBlockAuthor, isAdmin }) {
  const [form, setForm] = useState({ title: "", price: "", content: "", pin: "" });
  const [image, setImage] = useState(null);
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openPost, setOpenPost] = useState({});
  const [commentDraft, setCommentDraft] = useState({});

  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { setImage(await compressImage(file)); } catch (err) { console.error(err); }
    e.target.value = "";
  };
  const add = () => {
    if (!form.title.trim() && !form.price.trim() && !form.content.trim() && !image) return;
    if (!/^\d{4}$/.test(form.pin)) { alert("삭제할 때 쓸 4자리 숫자 비밀번호를 입력해주세요."); return; }
    setPosts(prev => [{ id: uid(), author: nickname || "익명", title: form.title.trim(), price: form.price, content: form.content, image, createdAt: new Date().toISOString(), sold: false, reports: 0, comments: [], pin: form.pin }, ...prev]);
    setForm({ title: "", price: "", content: "", pin: "" }); setImage(null); setOpen(false);
  };
  const toggleSold = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, sold: !p.sold } : p));
  const reportPost = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, reports: (p.reports || 0) + 1 } : p));
  const addComment = (postId) => { const text = (commentDraft[postId] || "").trim(); if (!text) return; setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...(p.comments || []), { id: uid(), author: nickname || "익명", content: text, createdAt: new Date().toISOString() }] } : p)); setCommentDraft({ ...commentDraft, [postId]: "" }); };
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkDelete = () => { setPosts(prev => prev.filter(p => !selectedIds.has(p.id))); setSelectedIds(new Set()); setSelectMode(false); };
  const removeOne = (id) => setPosts(prev => prev.filter(p => p.id !== id));
  const deleteWithPin = (post) => {
    if (isAdmin) { if (window.confirm("관리자 권한으로 삭제할까요?")) removeOne(post.id); return; }
    const input = window.prompt("이 게시글을 삭제하려면 등록할 때 설정한 4자리 비밀번호를 입력하세요.");
    if (input === null) return;
    if (input === post.pin) removeOne(post.id);
    else alert("비밀번호가 맞지 않아요.");
  };
  const visiblePosts = posts.filter(p => (p.reports || 0) < REPORT_THRESHOLD && !(blockedAuthors || []).includes(p.author));
  const hiddenCount = posts.length - visiblePosts.length;

  return (
    <div className="space-y-4">
      <Card>
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.blueprint }}><span className="flex items-center gap-1.5"><Plus size={14} /> 물건 올리기</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        {open && (<div className="mt-3 space-y-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="제목 (예: 교재 판매합니다)" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <input value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="가격 (예: 15,000원, 나눔)" className="w-full border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
          <textarea rows={2} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="상세 내용" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" maxLength={4} placeholder="삭제용 비밀번호 (숫자 4자리)" className="w-full border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
          {image ? (
            <div className="relative inline-block">
              <img src={image} alt="첨부" className="max-h-40 object-contain border" style={{ borderColor: C.paperLine }} />
              <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-white border rounded-full p-0.5" style={{ borderColor: C.paperLine }}><X size={12} color={C.ink} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="w-full flex items-center justify-center gap-1.5 border py-2 text-sm" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Camera size={14} /> 사진 추가 (선택)</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
          <button onClick={add} className="w-full border py-1.5 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>등록</button>
        </div>)}
      </Card>
      {hiddenCount > 0 && <div className="text-xs text-center" style={{ color: C.inkSoft }}>신고 누적 또는 차단으로 숨겨진 게시글 {hiddenCount}건</div>}
      {isAdmin && visiblePosts.length > 0 && <SelectBar selectMode={selectMode} setSelectMode={setSelectMode} count={selectedIds.size} onSelectAll={() => setSelectedIds(new Set(visiblePosts.map(p => p.id)))} onDelete={bulkDelete} onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }} />}
      {visiblePosts.length === 0 && <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>등록된 게시글이 없습니다.</div>}
      {visiblePosts.map(p => {
        const isOpen = !!openPost[p.id];
        return (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {selectMode && isAdmin && (<button onClick={() => toggleSelect(p.id)} className="mt-0.5">{selectedIds.has(p.id) ? <CheckCircle2 size={16} color={C.blueprint} /> : <Circle size={16} color={C.paperLine} />}</button>)}
                <div className="flex-1">
                  <button onClick={() => setOpenPost(o => ({ ...o, [p.id]: !o[p.id] }))} className="text-left w-full">
                    <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: p.sold ? C.inkSoft : C.ink, textDecoration: p.sold ? "line-through" : "none" }}><Tag size={13} color={C.amber} /> {p.title || "(제목 없음)"}</div>
                    {p.price && <div className="font-mono text-sm mt-0.5" style={{ color: C.blueprint }}>{p.price}</div>}
                    {p.content && <div className="text-sm mt-1" style={{ color: C.inkSoft }}>{p.content}</div>}
                    {p.image && <img src={p.image} alt="첨부" className="w-full max-h-56 object-contain border mt-2" style={{ borderColor: C.paperLine }} />}
                    <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{p.author} · {timeAgo(p.createdAt)} · 댓글 {(p.comments || []).length}</div>
                  </button>
                  {isOpen && (
                    <div className="mt-3 space-y-2 border-t pt-2" style={{ borderColor: C.paperLine }}>
                      {(p.comments || []).map(c => (<div key={c.id} className="text-sm" style={{ color: C.ink }}><span className="font-semibold">{c.author}</span> <span className="text-xs" style={{ color: C.inkSoft }}>{timeAgo(c.createdAt)}</span><div style={{ color: C.inkSoft }}>{c.content}</div></div>))}
                      <div className="flex gap-2">
                        <input value={commentDraft[p.id] || ""} onChange={e => setCommentDraft({ ...commentDraft, [p.id]: e.target.value })} placeholder="댓글 달기" className="flex-1 border px-2 py-1 text-sm" style={{ borderColor: C.paperLine }} />
                        <button onClick={() => addComment(p.id)} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>등록</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {!selectMode && (
                <div className="flex flex-col gap-1 items-end">
                  <button onClick={() => toggleSold(p.id)} className="text-xs px-2 py-0.5 border" style={{ borderColor: p.sold ? C.green : C.paperLine, color: p.sold ? C.green : C.inkSoft }}>{p.sold ? "거래완료" : "판매중"}</button>
                  <div className="flex gap-1">
                    <button onClick={() => reportPost(p.id)} title="신고"><Flag size={13} color={C.paperLine} /></button>
                    <button onClick={() => onBlockAuthor(p.author)} title="이 작성자 차단"><ShieldOff size={13} color={C.paperLine} /></button>
                    <button onClick={() => deleteWithPin(p)} title="삭제"><Trash2 size={13} color={C.red} /></button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
function QnaBoard({ nickname, posts, setPosts, blockedAuthors, onBlockAuthor, isAdmin }) {
  const [form, setForm] = useState({ title: "", content: "", pin: "" });
  const [image, setImage] = useState(null);
  const fileRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [openPost, setOpenPost] = useState({});
  const [commentDraft, setCommentDraft] = useState({});
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const onPickImage = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try { setImage(await compressImage(file)); } catch (err) { console.error(err); }
    e.target.value = "";
  };
  const add = () => {
    if (!form.title.trim() && !form.content.trim() && !image) return;
    if (!/^\d{4}$/.test(form.pin)) { alert("삭제할 때 쓸 4자리 숫자 비밀번호를 입력해주세요."); return; }
    setPosts(prev => [{ id: uid(), author: nickname || "익명", title: form.title.trim(), content: form.content, image, createdAt: new Date().toISOString(), comments: [], reports: 0, pin: form.pin }, ...prev]);
    setForm({ title: "", content: "", pin: "" }); setImage(null); setOpen(false);
  };
  const addComment = (postId) => { const text = (commentDraft[postId] || "").trim(); if (!text) return; setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [...p.comments, { id: uid(), author: nickname || "익명", content: text, createdAt: new Date().toISOString() }] } : p)); setCommentDraft({ ...commentDraft, [postId]: "" }); };
  const reportPost = (id) => setPosts(prev => prev.map(p => p.id === id ? { ...p, reports: (p.reports || 0) + 1 } : p));
  const toggleSelect = (id) => setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const bulkDelete = () => { setPosts(prev => prev.filter(p => !selectedIds.has(p.id))); setSelectedIds(new Set()); setSelectMode(false); };
  const removeOne = (id) => setPosts(prev => prev.filter(p => p.id !== id));
  const deleteWithPin = (post) => {
    if (isAdmin) { if (window.confirm("관리자 권한으로 삭제할까요?")) removeOne(post.id); return; }
    const input = window.prompt("이 게시글을 삭제하려면 등록할 때 설정한 4자리 비밀번호를 입력하세요.");
    if (input === null) return;
    if (input === post.pin) removeOne(post.id);
    else alert("비밀번호가 맞지 않아요.");
  };
  const visiblePosts = posts.filter(p => (p.reports || 0) < REPORT_THRESHOLD && !(blockedAuthors || []).includes(p.author));
  const hiddenCount = posts.length - visiblePosts.length;
  return (
    <div className="space-y-4">
      <Card>
        <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between text-sm font-semibold" style={{ color: C.blueprint }}><span className="flex items-center gap-1.5"><Plus size={14} /> 질문 올리기</span>{open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}</button>
        {open && (<div className="mt-3 space-y-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="질문 제목" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <textarea rows={3} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="궁금한 내용을 자세히 적어주세요" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
          <input value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 4) })} inputMode="numeric" maxLength={4} placeholder="삭제용 비밀번호 (숫자 4자리)" className="w-full border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
          {image ? (
            <div className="relative inline-block">
              <img src={image} alt="첨부" className="max-h-40 object-contain border" style={{ borderColor: C.paperLine }} />
              <button onClick={() => setImage(null)} className="absolute top-1 right-1 bg-white border rounded-full p-0.5" style={{ borderColor: C.paperLine }}><X size={12} color={C.ink} /></button>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current && fileRef.current.click()} className="w-full flex items-center justify-center gap-1.5 border py-2 text-sm" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Camera size={14} /> 사진 추가 (선택)</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" onChange={onPickImage} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
          <button onClick={add} className="w-full border py-1.5 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>등록</button>
        </div>)}
      </Card>
      {hiddenCount > 0 && <div className="text-xs text-center" style={{ color: C.inkSoft }}>신고 누적 또는 차단으로 숨겨진 게시글 {hiddenCount}건</div>}
      {isAdmin && visiblePosts.length > 0 && <SelectBar selectMode={selectMode} setSelectMode={setSelectMode} count={selectedIds.size} onSelectAll={() => setSelectedIds(new Set(visiblePosts.map(p => p.id)))} onDelete={bulkDelete} onCancel={() => { setSelectMode(false); setSelectedIds(new Set()); }} />}
      {visiblePosts.length === 0 && <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>등록된 질문이 없습니다.</div>}
      {visiblePosts.map(p => {
        const isOpen = !!openPost[p.id];
        return (
          <Card key={p.id}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-2 flex-1">
                {selectMode && isAdmin && (<button onClick={() => toggleSelect(p.id)} className="mt-0.5">{selectedIds.has(p.id) ? <CheckCircle2 size={16} color={C.blueprint} /> : <Circle size={16} color={C.paperLine} />}</button>)}
                <button onClick={() => !selectMode && setOpenPost(o => ({ ...o, [p.id]: !o[p.id] }))} className="text-left flex-1">
                  <div className="text-sm font-semibold" style={{ color: C.ink }}>{p.title || "(제목 없음)"}</div>
                  {p.image && <img src={p.image} alt="첨부" className="w-full max-h-56 object-contain border mt-2" style={{ borderColor: C.paperLine }} />}
                  <div className="text-xs mt-1" style={{ color: C.inkSoft }}>{p.author} · {timeAgo(p.createdAt)} · 댓글 {p.comments.length}</div>
                </button>
              </div>
              {!selectMode && (
                <div className="flex gap-1">
                  <button onClick={() => reportPost(p.id)} title="신고"><Flag size={13} color={C.paperLine} /></button>
                  <button onClick={() => onBlockAuthor(p.author)} title="이 작성자 차단"><ShieldOff size={13} color={C.paperLine} /></button>
                  {<button onClick={() => deleteWithPin(p)} title="삭제"><Trash2 size={13} color={C.red} /></button>}
                </div>
              )}
            </div>
            {isOpen && !selectMode && (<div className="mt-3 space-y-3">
              <div className="text-sm whitespace-pre-wrap" style={{ color: C.inkSoft }}>{p.content}</div>
              <div className="space-y-2 border-t pt-2" style={{ borderColor: C.paperLine }}>
                {p.comments.map(c => (<div key={c.id} className="text-sm" style={{ color: C.ink }}><span className="font-semibold">{c.author}</span> <span className="text-xs" style={{ color: C.inkSoft }}>{timeAgo(c.createdAt)}</span><div style={{ color: C.inkSoft }}>{c.content}</div></div>))}
              </div>
              <div className="flex gap-2">
                <input value={commentDraft[p.id] || ""} onChange={e => setCommentDraft({ ...commentDraft, [p.id]: e.target.value })} placeholder="댓글 달기" className="flex-1 border px-2 py-1 text-sm" style={{ borderColor: C.paperLine }} />
                <button onClick={() => addComment(p.id)} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>등록</button>
              </div>
            </div>)}
          </Card>
        );
      })}
    </div>
  );
}
function GroupBoard({ nickname, groupCodes, setGroupCodes, studyLog, problems }) {
  const [groups, setGroups] = useState({}); // code -> group object
  const [loaded, setLoaded] = useState(false);
  const [activeCode, setActiveCode] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", targetMembers: "", periods: [], meetDay: "월", meetTime: "" });
  const [joinCode, setJoinCode] = useState(""); const [error, setError] = useState("");
  const [photoCaption, setPhotoCaption] = useState("");
  const fileRef = useRef(null);
  const [photoCommentDraft, setPhotoCommentDraft] = useState({});

  const today = todayStr();
  const todayMinutes = Object.values(studyLog[today] || {}).reduce((a, b) => a + b, 0);
  const todayProblems = problems.reduce((acc, p) => acc + p.attempts.filter(a => a.date === today).length, 0);

  useEffect(() => {
    (async () => {
      const entries = await Promise.all((groupCodes || []).map(async code => [code, await loadKey(`group:${code}`, null, true)]));
      const map = {}; entries.forEach(([code, g]) => { if (g) map[code] = g; });
      setGroups(map);
      if (!activeCode && (groupCodes || []).length > 0) setActiveCode(groupCodes[0]);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupCodes]);

  // push today's stats into every group this person is a member of
  useEffect(() => {
    if (!groupCodes || groupCodes.length === 0) return;
    (async () => {
      const me = nickname || "익명";
      const updates = {};
      for (const code of groupCodes) {
        const g = await loadKey(`group:${code}`, null, true); if (!g) continue;
        const stats = { ...g.stats, [me]: { ...(g.stats[me] || {}), [today]: { minutes: todayMinutes, problems: todayProblems } } };
        const updated = { ...g, stats };
        await saveKey(`group:${code}`, updated, true);
        updates[code] = updated;
      }
      setGroups(prev => ({ ...prev, ...updates }));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayMinutes, todayProblems, groupCodes]);

  const togglePeriod = (p) => setCreateForm(f => ({ ...f, periods: f.periods.includes(p) ? f.periods.filter(x => x !== p) : [...f.periods, p] }));

  const createGroup = async () => {
    if (!createForm.name.trim()) return;
    const code = Math.random().toString(36).slice(2, 7).toUpperCase();
    const g = {
      name: createForm.name.trim(), code, createdAt: new Date().toISOString(), stats: {}, photos: [],
      targetMembers: createForm.targetMembers, periods: createForm.periods, meetDay: createForm.meetDay, meetTime: createForm.meetTime,
    };
    await saveKey(`group:${code}`, g, true);
    setGroupCodes([...(groupCodes || []), code]);
    setGroups(prev => ({ ...prev, [code]: g }));
    setActiveCode(code); setShowAdd(false);
    setCreateForm({ name: "", targetMembers: "", periods: [], meetDay: "월", meetTime: "" });
  };
  const joinGroup = async () => {
    const code = joinCode.trim().toUpperCase(); if (!code) return;
    if ((groupCodes || []).includes(code)) { setError("이미 참여 중인 그룹이에요."); return; }
    const g = await loadKey(`group:${code}`, null, true);
    if (!g) { setError("해당 코드의 그룹을 찾을 수 없어요."); return; }
    if (!g.photos) g.photos = [];
    setError(""); setGroupCodes([...(groupCodes || []), code]); setGroups(prev => ({ ...prev, [code]: g }));
    setActiveCode(code); setJoinCode(""); setShowAdd(false);
  };
  const leaveGroup = (code) => {
    const next = (groupCodes || []).filter(c => c !== code);
    setGroupCodes(next);
    setGroups(prev => { const n = { ...prev }; delete n[code]; return n; });
    if (activeCode === code) setActiveCode(next[0] || null);
  };

  const saveGroup = async (code, updated) => { await saveKey(`group:${code}`, updated, true); setGroups(prev => ({ ...prev, [code]: updated })); };
  const freshGroup = async (code) => (await loadKey(`group:${code}`, null, true)) || groups[code];

  const onPickPhoto = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file || !activeCode) return;
    try {
      const dataUrl = await compressImage(file);
      const g = await freshGroup(activeCode);
      const photo = { id: uid(), author: nickname || "익명", image: dataUrl, caption: photoCaption.trim(), createdAt: new Date().toISOString(), comments: [] };
      const updated = { ...g, photos: [photo, ...(g.photos || [])] };
      await saveGroup(activeCode, updated);
      setPhotoCaption("");
    } catch (err) { console.error(err); }
    e.target.value = "";
  };
  const addPhotoComment = async (photoId) => {
    const text = (photoCommentDraft[photoId] || "").trim(); if (!text || !activeCode) return;
    const g = await freshGroup(activeCode);
    const updated = { ...g, photos: (g.photos || []).map(ph => ph.id === photoId ? { ...ph, comments: [...(ph.comments || []), { id: uid(), author: nickname || "익명", content: text, createdAt: new Date().toISOString() }] } : ph) };
    await saveGroup(activeCode, updated);
    setPhotoCommentDraft({ ...photoCommentDraft, [photoId]: "" });
  };
  const removePhoto = async (photoId) => {
    const g = await freshGroup(activeCode);
    const updated = { ...g, photos: (g.photos || []).filter(ph => ph.id !== photoId) };
    await saveGroup(activeCode, updated);
  };

  if (!loaded) return <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>불러오는 중…</div>;

  const myGroupList = (groupCodes || []).map(c => groups[c]).filter(Boolean);
  const activeGroup = activeCode ? groups[activeCode] : null;

  const CreateJoinForms = (
    <div className="space-y-4">
      <Card>
        <SectionLabel n="●">그룹 만들기</SectionLabel>
        <div className="text-xs mb-2" style={{ color: C.inkSoft }}>그룹 이름만 있으면 만들 수 있어요. 나머지는 채워도 되고 비워도 돼요.</div>
        <input value={createForm.name} onChange={e => setCreateForm({ ...createForm, name: e.target.value })} placeholder="그룹 이름 (예: 신전스퀘어 새벽반)" className="w-full border px-2 py-1.5 text-sm mb-2" style={{ borderColor: C.paperLine }} />
        <div className="flex gap-2 mb-2 flex-wrap">
          <span className="text-xs self-center" style={{ color: C.inkSoft }}>교시(복수 선택 가능)</span>
          {PERIODS.map(p => (
            <button key={p} type="button" onClick={() => togglePeriod(p)} className="px-2 py-1 text-xs border" style={{ borderColor: createForm.periods.includes(p) ? C.blueprint : C.paperLine, color: createForm.periods.includes(p) ? C.blueprint : C.inkSoft, background: createForm.periods.includes(p) ? C.tintBlue : "transparent" }}>{p}</button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input type="number" value={createForm.targetMembers} onChange={e => setCreateForm({ ...createForm, targetMembers: e.target.value })} placeholder="목표 인원(선택)" className="border px-2 py-1.5 text-sm font-mono" style={{ borderColor: C.paperLine }} />
          <select value={createForm.meetDay} onChange={e => setCreateForm({ ...createForm, meetDay: e.target.value })} className="border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }}>
            {WEEKDAYS.map(d => <option key={d} value={d}>매주 {d}요일</option>)}
          </select>
        </div>
        <input type="time" value={createForm.meetTime} onChange={e => setCreateForm({ ...createForm, meetTime: e.target.value })} placeholder="시간(선택)" className="w-full border px-2 py-1.5 text-sm font-mono mb-2" style={{ borderColor: C.paperLine }} />
        <button onClick={createGroup} className="w-full border py-1.5 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>만들기</button>
      </Card>
      <Card><SectionLabel n="●">코드로 참여하기</SectionLabel>
        <div className="flex gap-2"><input value={joinCode} onChange={e => setJoinCode(e.target.value)} placeholder="초대 코드 입력" className="flex-1 border px-2 py-1.5 text-sm font-mono uppercase" style={{ borderColor: C.paperLine }} /><button onClick={joinGroup} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>참여</button></div>
        {error && <div className="text-xs mt-1" style={{ color: C.red }}>{error}</div>}
      </Card>
    </div>
  );

  if (myGroupList.length === 0) return CreateJoinForms;

  const days7 = (() => { const arr = []; for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate() - i); arr.push(fmtDate(d)); } return arr; })();
  let todayRank = [], weekRank = [];
  if (activeGroup) {
    const members = Object.keys(activeGroup.stats || {}); if (!members.includes(nickname || "익명")) members.push(nickname || "익명");
    todayRank = members.map(m => ({ name: m, minutes: (activeGroup.stats[m] && activeGroup.stats[m][today] && activeGroup.stats[m][today].minutes) || 0, problems: (activeGroup.stats[m] && activeGroup.stats[m][today] && activeGroup.stats[m][today].problems) || 0 })).sort((a, b) => b.minutes - a.minutes);
    weekRank = members.map(m => ({ name: m, minutes: days7.reduce((acc, d) => acc + ((activeGroup.stats[m] && activeGroup.stats[m][d] && activeGroup.stats[m][d].minutes) || 0), 0) })).sort((a, b) => b.minutes - a.minutes);
  }
  const medals = ["🥇", "🥈", "🥉"];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {myGroupList.map(g => (
          <button key={g.code} onClick={() => setActiveCode(g.code)} className="px-3 py-1.5 text-sm border" style={{ borderColor: activeCode === g.code ? C.blueprint : C.paperLine, color: activeCode === g.code ? C.blueprint : C.inkSoft, background: activeCode === g.code ? C.tintBlue : "transparent" }}>{g.name}</button>
        ))}
        <button onClick={() => setShowAdd(s => !s)} className="px-3 py-1.5 text-sm border flex items-center gap-1" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Plus size={13} /> 그룹 추가</button>
      </div>

      {showAdd && CreateJoinForms}

      {activeGroup && (
        <>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold" style={{ color: C.ink }}>{activeGroup.name}</div>
                <div className="text-xs font-mono mt-0.5" style={{ color: C.inkSoft }}>초대 코드: {activeGroup.code}</div>
              </div>
              <button onClick={() => leaveGroup(activeGroup.code)} className="text-xs px-2 py-1 border" style={{ borderColor: C.red, color: C.red }}>나가기</button>
            </div>
            <div className="text-xs mt-2 pt-2 border-t" style={{ borderColor: C.paperLine, color: C.inkSoft }}>
              {myGroupList.find(g => g.code === activeGroup.code) && Object.keys(activeGroup.stats || {}).length}명 모집{activeGroup.targetMembers ? `/${activeGroup.targetMembers}` : ""}
              {activeGroup.periods && activeGroup.periods.length > 0 && ` · ${activeGroup.periods.join(", ")}`}
              {activeGroup.meetDay && activeGroup.meetTime && ` · 매주 ${activeGroup.meetDay} ${activeGroup.meetTime}`}
            </div>
          </Card>
          <Card><SectionLabel n="01">오늘의 순공부시간 랭킹</SectionLabel><div className="space-y-1.5">{todayRank.map((m, i) => (<div key={m.name} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0" style={{ borderColor: C.paperLine, color: m.name === (nickname || "익명") ? C.blueprint : C.ink }}><span>{medals[i] || `${i + 1}.`} {m.name}</span><span className="font-mono">{m.minutes}분 · 문제 {m.problems}개</span></div>))}</div></Card>
          <Card><SectionLabel n="02">이번 주 누적 랭킹</SectionLabel><div className="space-y-1.5">{weekRank.map((m, i) => (<div key={m.name} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0" style={{ borderColor: C.paperLine, color: m.name === (nickname || "익명") ? C.blueprint : C.ink }}><span>{medals[i] || `${i + 1}.`} {m.name}</span><span className="font-mono">{m.minutes}분</span></div>))}</div></Card>

          <Card>
            <SectionLabel n="03">함께 나누는 도면</SectionLabel>
            <input value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} placeholder="사진 설명 (선택)" className="w-full border px-2 py-1.5 text-sm mb-2" style={{ borderColor: C.paperLine }} />
            <button onClick={() => fileRef.current && fileRef.current.click()} className="w-full flex items-center justify-center gap-1.5 border py-2.5 text-sm mb-3" style={{ borderColor: C.paperLine, color: C.inkSoft }}><Camera size={15} /> 도면 사진 올리기</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
            <div className="space-y-3">
              {(activeGroup.photos || []).length === 0 && <div className="text-xs text-center py-3" style={{ color: C.inkSoft }}>아직 올라온 사진이 없어요.</div>}
              {(activeGroup.photos || []).map(ph => (
                <div key={ph.id} className="border p-2" style={{ borderColor: C.paperLine }}>
                  <img src={ph.image} alt="도면" className="w-full max-h-64 object-contain border" style={{ borderColor: C.paperLine }} />
                  <div className="flex items-center justify-between mt-1">
                    <div className="text-xs" style={{ color: C.inkSoft }}>{ph.author} · {timeAgo(ph.createdAt)}</div>
                    {ph.author === (nickname || "익명") && <button onClick={() => removePhoto(ph.id)}><Trash2 size={13} color={C.paperLine} /></button>}
                  </div>
                  {ph.caption && <div className="text-sm mt-1" style={{ color: C.ink }}>{ph.caption}</div>}
                  <div className="mt-2 space-y-1 border-t pt-1.5" style={{ borderColor: C.paperLine }}>
                    {(ph.comments || []).map(c => (<div key={c.id} className="text-xs" style={{ color: C.ink }}><span className="font-semibold">{c.author}</span> <span style={{ color: C.inkSoft }}>{timeAgo(c.createdAt)}</span><div style={{ color: C.inkSoft }}>{c.content}</div></div>))}
                    <div className="flex gap-2 mt-1">
                      <input value={photoCommentDraft[ph.id] || ""} onChange={e => setPhotoCommentDraft({ ...photoCommentDraft, [ph.id]: e.target.value })} placeholder="댓글 달기" className="flex-1 border px-2 py-1 text-xs" style={{ borderColor: C.paperLine }} />
                      <button onClick={() => addPhotoComment(ph.id)} className="px-2 border text-xs" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>등록</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <div className="text-xs text-center" style={{ color: C.inkSoft }}>초대 코드를 같이 공부하는 친구에게 공유하면 챌린지에 참여할 수 있어요.</div>
        </>
      )}
    </div>
  );
}
function Leaderboard({ nickname, subjects, studyLog, problems, drawing }) {
  const [entries, setEntries] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState("study"); // study | subject | drawing | pastExam
  const [subjectPick, setSubjectPick] = useState(subjects[0] || "");

  const myStats = useMemo(() => {
    const totalStudyMinutes = Object.values(studyLog).reduce((acc, day) => acc + Object.values(day || {}).reduce((a, b) => a + b, 0), 0);
    const perSubjectMinutes = {};
    subjects.forEach(s => { perSubjectMinutes[s] = Object.values(studyLog).reduce((acc, day) => acc + ((day || {})[s] || 0), 0); });
    const drawingCount = Object.values(drawing || {}).reduce((acc, arr) => acc + (arr ? arr.length : 0), 0);
    const pastExamSolvedCount = problems.filter(p => p.seeded && p.attempts.length > 0).length;
    return { displayName: nickname || "사용자", totalStudyMinutes, perSubjectMinutes, drawingCount, pastExamSolvedCount, updatedAt: new Date().toISOString() };
  }, [nickname, subjects, studyLog, problems, drawing]);

  useEffect(() => {
    (async () => {
      const current = await loadKey("leaderboard", {}, true);
      const uid = typeof supabase === "undefined" ? null : (await supabase.auth.getUser()).data?.user?.id;
      const myKey = uid || nickname || "me";
      const next = { ...current, [myKey]: myStats };
      await saveKey("leaderboard", next, true);
      setEntries(next);
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const list = Object.values(entries);
  const medals = ["🥇", "🥈", "🥉"];

  const renderRanked = (getVal, unit) => {
    const ranked = [...list].map(e => ({ name: e.displayName, val: getVal(e) })).filter(e => e.val > 0).sort((a, b) => b.val - a.val);
    if (ranked.length === 0) return <div className="text-xs text-center py-3" style={{ color: C.inkSoft }}>아직 데이터가 없어요.</div>;
    return (
      <div className="space-y-1.5">
        {ranked.map((r, i) => (
          <div key={r.name + i} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0" style={{ borderColor: C.paperLine, color: r.name === myStats.displayName ? C.blueprint : C.ink }}>
            <span>{medals[i] || `${i + 1}.`} {r.name}</span>
            <span className="font-mono">{r.val}{unit}</span>
          </div>
        ))}
      </div>
    );
  };

  if (!loaded) return <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>불러오는 중…</div>;

  return (
    <div className="space-y-4">
      <div className="text-xs px-3 py-2 border flex items-center gap-1.5" style={{ borderColor: C.blueprintLight, color: C.inkSoft, background: C.tintBlue }}>닉네임을 설정 안 하면 카카오 이름으로 표시돼요 (설정 탭에서 변경 가능)</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => setView("study")} className="py-2 text-xs border" style={{ borderColor: view === "study" ? C.blueprint : C.paperLine, color: view === "study" ? C.blueprint : C.inkSoft, background: view === "study" ? C.tintBlue : "transparent" }}>⏱ 공부시간</button>
        <button onClick={() => setView("subject")} className="py-2 text-xs border" style={{ borderColor: view === "subject" ? C.blueprint : C.paperLine, color: view === "subject" ? C.blueprint : C.inkSoft, background: view === "subject" ? C.tintBlue : "transparent" }}>📚 과목별</button>
        <button onClick={() => setView("drawing")} className="py-2 text-xs border" style={{ borderColor: view === "drawing" ? C.blueprint : C.paperLine, color: view === "drawing" ? C.blueprint : C.inkSoft, background: view === "drawing" ? C.tintBlue : "transparent" }}>✏️ 작도 업로드</button>
        <button onClick={() => setView("pastExam")} className="py-2 text-xs border" style={{ borderColor: view === "pastExam" ? C.blueprint : C.paperLine, color: view === "pastExam" ? C.blueprint : C.inkSoft, background: view === "pastExam" ? C.tintBlue : "transparent" }}>📝 과년도 풀이량</button>
      </div>

      {view === "study" && <Card><SectionLabel n="●">누적 공부시간 순위</SectionLabel>{renderRanked(e => e.totalStudyMinutes, "분")}</Card>}
      {view === "drawing" && <Card><SectionLabel n="●">작도 사진 업로드 순위</SectionLabel>{renderRanked(e => e.drawingCount, "장")}</Card>}
      {view === "pastExam" && <Card><SectionLabel n="●">과년도 문제풀이량 순위</SectionLabel>{renderRanked(e => e.pastExamSolvedCount, "문제")}</Card>}
      {view === "subject" && (
        <Card>
          <SectionLabel n="●">과목별 공부시간 순위</SectionLabel>
          <div className="flex gap-2 flex-wrap mb-3">
            {subjects.map(s => (
              <button key={s} onClick={() => setSubjectPick(s)} className="px-2 py-1 text-xs border" style={{ borderColor: subjectPick === s ? C.blueprint : C.paperLine, color: subjectPick === s ? C.blueprint : C.inkSoft }}>{s}</button>
            ))}
          </div>
          {renderRanked(e => (e.perSubjectMinutes && e.perSubjectMinutes[subjectPick]) || 0, "분")}
        </Card>
      )}
    </div>
  );
}

function CommunityTab({ nickname, groupCodes, setGroupCodes, studyLog, problems, drawing, subjects, blockedAuthors, onBlockAuthor, isAdmin }) {
  const [sub, setSub] = useState("market"); const [loaded, setLoaded] = useState(false);
  const [marketPosts, setMarketPosts] = useState([]); const [qnaPosts, setQnaPosts] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const reloadAll = async () => {
    const [m, q] = await Promise.all([loadKey("community-market", [], true), loadKey("community-qna", [], true)]);
    setMarketPosts(m); setQnaPosts(q);
  };
  useEffect(() => { (async () => { await reloadAll(); setLoaded(true); })(); }, []);

  const selectSub = async (next) => { setSub(next); if (next === "market" || next === "qna") { setRefreshing(true); await reloadAll(); setRefreshing(false); } };
  const manualRefresh = async () => { setRefreshing(true); await reloadAll(); setRefreshing(false); };

  // Safe mutation: re-fetch the current shared list right before writing, so a
  // stale local copy never overwrites someone else's newer post.
  const mutateShared = (key, setLocal) => async (updater) => {
    try {
      const current = await loadKey(key, [], true);
      const next = typeof updater === "function" ? updater(current) : updater;
      await saveKey(key, next, true);
      setLocal(next);
    } catch (e) { console.error("community save failed", e); }
  };
  const mutateMarket = mutateShared("community-market", setMarketPosts);
  const mutateQna = mutateShared("community-qna", setQnaPosts);

  return (
    <div className="space-y-4">
      <div className="text-xs px-3 py-2 border flex items-center gap-1.5" style={{ borderColor: C.blueprintLight, color: C.inkSoft, background: C.tintBlue }}><Users size={13} color={C.blueprint} /> 이 게시판은 앱을 사용하는 모든 수험생에게 공개돼요.</div>
      <div className="grid grid-cols-2 gap-2">
        <button onClick={() => selectSub("market")} className="py-2 text-sm border flex items-center justify-center gap-1.5" style={{ borderColor: sub === "market" ? C.blueprint : C.paperLine, color: sub === "market" ? C.blueprint : C.inkSoft, background: sub === "market" ? C.tintBlue : "transparent" }}><Tag size={14} /> 중고나라</button>
        <button onClick={() => selectSub("qna")} className="py-2 text-sm border flex items-center justify-center gap-1.5" style={{ borderColor: sub === "qna" ? C.blueprint : C.paperLine, color: sub === "qna" ? C.blueprint : C.inkSoft, background: sub === "qna" ? C.tintBlue : "transparent" }}><MessageCircle size={14} /> 질문게시판</button>
        <button onClick={() => selectSub("group")} className="py-2 text-sm border flex items-center justify-center gap-1.5" style={{ borderColor: sub === "group" ? C.blueprint : C.paperLine, color: sub === "group" ? C.blueprint : C.inkSoft, background: sub === "group" ? C.tintBlue : "transparent" }}>🏁 스터디그룹</button>
        <button onClick={() => selectSub("leaderboard")} className="py-2 text-sm border flex items-center justify-center gap-1.5" style={{ borderColor: sub === "leaderboard" ? C.blueprint : C.paperLine, color: sub === "leaderboard" ? C.blueprint : C.inkSoft, background: sub === "leaderboard" ? C.tintBlue : "transparent" }}>🏆 전체 순위</button>
      </div>
      {(sub === "market" || sub === "qna") && (
        <button onClick={manualRefresh} className="text-xs px-2 py-1 border flex items-center gap-1" style={{ borderColor: C.paperLine, color: C.inkSoft }}>{refreshing ? "새로고침 중…" : "↻ 새로고침 (다른 사람 글 확인)"}</button>
      )}
      {!loaded ? (<div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>불러오는 중…</div>) : sub === "market" ? (<MarketBoard nickname={nickname} posts={marketPosts} setPosts={mutateMarket} blockedAuthors={blockedAuthors} onBlockAuthor={onBlockAuthor} isAdmin={isAdmin} />) : sub === "qna" ? (<QnaBoard nickname={nickname} posts={qnaPosts} setPosts={mutateQna} blockedAuthors={blockedAuthors} onBlockAuthor={onBlockAuthor} isAdmin={isAdmin} />) : sub === "group" ? (<GroupBoard nickname={nickname} groupCodes={groupCodes} setGroupCodes={setGroupCodes} studyLog={studyLog} problems={problems} />) : (<Leaderboard nickname={nickname} subjects={subjects} studyLog={studyLog} problems={problems} drawing={drawing} />)}
    </div>
  );
}

/* ---------------- Report (print / email) ---------------- */
function buildReportText(settings, subjects, problems, studyLog, attendance) {
  const totalMinutes = Object.values(studyLog).reduce((acc, day) => acc + Object.values(day).reduce((a, b) => a + b, 0), 0);
  const perSubject = subjects.map(s => `- ${s}: ${problems.filter(p => p.subject === s && p.attempts.length > 0).length}문제`).join("\n");
  const wrongOpen = problems.reduce((acc, p) => acc + p.attempts.filter(a => a.correct === false && !a.overcome).length, 0);
  const overcome = problems.reduce((acc, p) => acc + p.attempts.filter(a => a.correct === false && a.overcome).length, 0);
  const attendCounts = ATTEND_STATUSES.map(s => `${s.key} ${Object.values(attendance).filter(v => v === s.key).length}회`).join(" · ");
  const passStatus = PERIODS.map(p => { const info = settings.periodPass[p]; return `${p}: ${info.passed ? "합격" : "미합격"}`; }).join(" / ");
  return [
    `[${settings.academyLabel || "신전스퀘어"}] 학습 리포트`,
    settings.studentName ? `이름: ${settings.studentName}` : "",
    `시험일: ${settings.examDate || "-"} ${settings.examTime || ""}`,
    `이번 목표: ${settings.goal || "-"}`,
    `교시별 합격 현황: ${passStatus}`,
    "",
    `누적 공부시간: ${totalMinutes}분 (${(totalMinutes / 60).toFixed(1)}시간)`,
    "",
    "과목별 푼 문제:",
    perSubject,
    Object.keys(settings.subjectGoals || {}).length ? `과목별 목표 문제 수: ${Object.entries(settings.subjectGoals).filter(([, v]) => Number(v) > 0).map(([s, v]) => `${s} ${v}개`).join(", ")}` : "",
    "",
    `미해결 오답: ${wrongOpen}건 · 극복한 오답: ${overcome}건`,
    "",
    `누적 출석 기록: ${attendCounts}`,
  ].filter(Boolean).join("\n");
}
function ReportView({ settings, subjects, problems, studyLog, attendance, onClose }) {
  const text = useMemo(() => buildReportText(settings, subjects, problems, studyLog, attendance), [settings, subjects, problems, studyLog, attendance]);
  const mailHref = `mailto:?subject=${encodeURIComponent((settings.academyLabel || "신전스퀘어") + " 학습 리포트")}&body=${encodeURIComponent(text)}`;
  return (
    <div className="max-w-md mx-auto px-4 pt-6 pb-10">
      <style>{"@media print { .no-print { display: none !important; } }"}</style>
      <div className="flex items-center justify-between mb-4 no-print">
        <h2 className="text-lg font-bold" style={{ color: C.ink }}>학습 리포트</h2>
        <button onClick={onClose}><X size={18} color={C.inkSoft} /></button>
      </div>
      <Card>
        <pre className="text-sm whitespace-pre-wrap" style={{ color: C.ink, fontFamily: "inherit" }}>{text}</pre>
      </Card>
      <div className="flex gap-2 mt-4 no-print">
        <button onClick={() => window.print()} className="flex-1 flex items-center justify-center gap-1.5 border py-2 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Printer size={14} /> 인쇄하기</button>
        <a href={mailHref} className="flex-1 flex items-center justify-center gap-1.5 border py-2 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><Mail size={14} /> 이메일로 보내기</a>
      </div>
    </div>
  );
}

/* ---------------- Settings ---------------- */
function AdminUnlock({ adminCode, onUnlock }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const submit = () => {
    if (code === adminCode) { onUnlock(); setError(""); }
    else setError("코드가 맞지 않아요.");
  };
  return (
    <div>
      <div className="flex gap-2">
        <input type="password" value={code} onChange={e => setCode(e.target.value)} placeholder="관리자 코드 입력" className="flex-1 border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
        <button onClick={submit} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>확인</button>
      </div>
      {error && <div className="text-xs mt-1" style={{ color: C.red }}>{error}</div>}
    </div>
  );
}

function SettingsTab({ settings, setSettings, subjects, setSubjects, onReset, onOpenReport, onExport, onImport, saveAll, saveStatus }) {
  const [newSubject, setNewSubject] = useState("");
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef(null);
  const rounds = useMemo(buildRounds, []);
  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      onImport(data);
      setImportMsg("불러오기 완료!");
    } catch (err) { setImportMsg("파일을 읽을 수 없어요. JSON 백업 파일이 맞는지 확인해주세요."); }
    e.target.value = "";
  };
  return (
    <div className="space-y-5">
      <Card>
        <SectionLabel n="00">화면 모드</SectionLabel>
        <div className="flex gap-2">
          <button onClick={() => setSettings({ ...settings, darkMode: false })} className="flex-1 py-2 text-sm border" style={{ borderColor: !settings.darkMode ? C.blueprint : C.paperLine, color: !settings.darkMode ? C.blueprint : C.inkSoft, background: !settings.darkMode ? C.tintBlue : "transparent" }}>☀️ 밝은 모드</button>
          <button onClick={() => setSettings({ ...settings, darkMode: true })} className="flex-1 py-2 text-sm border" style={{ borderColor: settings.darkMode ? C.blueprint : C.paperLine, color: settings.darkMode ? C.blueprint : C.inkSoft, background: settings.darkMode ? C.tintBlue : "transparent" }}>🌙 다크 모드</button>
        </div>
      </Card>
      <Card>
        <SectionLabel n="01">시험 정보</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div><label className="text-xs" style={{ color: C.inkSoft }}>시험일</label><input type="date" value={settings.examDate || ""} onChange={e => setSettings({ ...settings, examDate: e.target.value })} className="w-full border px-2 py-1.5 text-sm font-mono mt-1" style={{ borderColor: C.paperLine }} /></div>
          <div><label className="text-xs" style={{ color: C.inkSoft }}>시험 시각</label><input type="time" value={settings.examTime || ""} onChange={e => setSettings({ ...settings, examTime: e.target.value })} className="w-full border px-2 py-1.5 text-sm font-mono mt-1" style={{ borderColor: C.paperLine }} /></div>
        </div>
        <label className="text-xs" style={{ color: C.inkSoft }}>이름 (선택)</label>
        <input value={settings.studentName || ""} onChange={e => setSettings({ ...settings, studentName: e.target.value })} className="w-full border px-2 py-1.5 text-sm mt-1 mb-3" style={{ borderColor: C.paperLine }} />
        <label className="text-xs" style={{ color: C.inkSoft }}>현재 다니고 있는 건축사학원</label>
        <select value={settings.currentAcademy || ""} onChange={e => setSettings({ ...settings, currentAcademy: e.target.value })} className="w-full border px-2 py-1.5 text-sm mt-1" style={{ borderColor: C.paperLine }}>
          <option value="">선택 안 함</option>
          {ACADEMIES.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </Card>
      <Card>
        <SectionLabel n="02">교시별 합격 현황</SectionLabel>
        <div className="space-y-2">
          {PERIODS.map(period => {
            const info = (settings.periodPass && settings.periodPass[period]) || { passed: false, round: "" };
            return (
              <div key={period} className="flex items-center gap-2">
                <button onClick={() => setSettings({ ...settings, periodPass: { ...settings.periodPass, [period]: { ...info, passed: !info.passed } } })} className="px-2 py-1 text-xs border flex items-center gap-1" style={{ borderColor: info.passed ? C.green : C.paperLine, color: info.passed ? C.green : C.inkSoft, background: info.passed ? C.tintGreen : "transparent" }}><CheckCircle2 size={13} /> {period}</button>
                <select value={info.round} onChange={e => setSettings({ ...settings, periodPass: { ...settings.periodPass, [period]: { ...info, round: e.target.value } } })} disabled={!info.passed} className="flex-1 border px-2 py-1 text-sm" style={{ borderColor: C.paperLine, opacity: info.passed ? 1 : 0.4 }}>
                  <option value="">합격 회차 선택</option>
                  {rounds.map(r => <option key={roundKey(r)} value={roundKey(r)}>{roundLabel(r)}</option>)}
                </select>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <SectionLabel n="03">커뮤니티 닉네임</SectionLabel>
        <input value={settings.nickname || ""} onChange={e => setSettings({ ...settings, nickname: e.target.value })} placeholder="중고나라·질문게시판에 표시될 이름" className="w-full border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} />
        <p className="text-xs mt-1" style={{ color: C.inkSoft }}>비워두면 카카오 계정 이름으로 표시돼요.</p>
      </Card>
      <Card>
        <SectionLabel n="●">관리자 모드</SectionLabel>
        {settings.isAdmin ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm" style={{ color: C.green }}>관리자로 로그인됨 — 커뮤니티 글 삭제 가능</span>
              <button onClick={() => setSettings({ ...settings, isAdmin: false })} className="text-xs px-2 py-1 border" style={{ borderColor: C.paperLine, color: C.inkSoft }}>해제</button>
            </div>
            <label className="text-xs" style={{ color: C.inkSoft }}>관리자 코드 변경</label>
            <input value={settings.adminCode} onChange={e => setSettings({ ...settings, adminCode: e.target.value })} placeholder="새 관리자 코드" className="w-full border px-2 py-1.5 text-sm font-mono mt-1" style={{ borderColor: C.paperLine }} />
          </>
        ) : (
          <AdminUnlock adminCode={settings.adminCode} onUnlock={() => setSettings({ ...settings, isAdmin: true })} />
        )}
      </Card>
      {(settings.blockedAuthors || []).length > 0 && (
        <Card>
          <SectionLabel n="●">차단한 사용자</SectionLabel>
          <div className="flex flex-wrap gap-2">
            {settings.blockedAuthors.map(a => (
              <span key={a} className="text-xs px-2 py-1 border flex items-center gap-1" style={{ borderColor: C.paperLine, color: C.ink }}>
                {a}<button onClick={() => setSettings({ ...settings, blockedAuthors: settings.blockedAuthors.filter(x => x !== a) })}><X size={11} color={C.inkSoft} /></button>
              </span>
            ))}
          </div>
        </Card>
      )}
      <Card>
        <SectionLabel n="04">과목 관리</SectionLabel>
        <div className="flex flex-wrap gap-2 mb-3">{subjects.map(s => (<span key={s} className="text-xs px-2 py-1 border flex items-center gap-1" style={{ borderColor: C.paperLine, color: C.ink }}>{s}<button onClick={() => setSubjects(subjects.filter(x => x !== s))}><Trash2 size={11} color={C.inkSoft} /></button></span>))}</div>
        <div className="flex gap-2"><input value={newSubject} onChange={e => setNewSubject(e.target.value)} placeholder="과목 추가" className="flex-1 border px-2 py-1.5 text-sm" style={{ borderColor: C.paperLine }} /><button onClick={() => { if (newSubject.trim()) { setSubjects([...subjects, newSubject.trim()]); setNewSubject(""); } }} className="px-3 border text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>추가</button></div>
      </Card>
      <Card>
        <SectionLabel n="05">학습 리포트</SectionLabel>
        <p className="text-sm mb-2" style={{ color: C.inkSoft }}>지금까지의 공부시간·문제풀이·출석 현황을 정리해서 인쇄하거나 이메일로 보낼 수 있어요.</p>
        <button onClick={onOpenReport} className="w-full flex items-center justify-center gap-1.5 border py-2 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}><FileText size={14} /> 리포트 보기</button>
      </Card>
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <img src={LOGO_SRC} alt="신전스퀘어" style={{ width: 32, height: 32 }} />
          <SectionLabel n="06">신전스퀘어</SectionLabel>
        </div>
        <p className="text-sm mb-3" style={{ color: C.inkSoft }}>이 앱은 건축사 자격시험을 준비하는 모든 수험생을 위해 신전스퀘어가 무료로 제작·배포합니다. 어느 학원에 다니든 자유롭게 사용하세요.</p>
        <div className="space-y-1.5">
          {ACADEMY_LINKS.map(l => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm" style={{ color: C.blueprint }}><ExternalLink size={13} /> {l.label}</a>
          ))}
        </div>
      </Card>
      <Card>
        <SectionLabel n="●">저장 상태</SectionLabel>
        <p className="text-sm mb-2" style={{ color: C.inkSoft }}>모든 내용은 변경 즉시 자동으로 저장돼요. 혹시 인터넷이 불안정했거나 저장이 안 됐을까 걱정되면 아래 버튼으로 지금 바로 다시 저장해보세요.</p>
        <button onClick={saveAll} className="w-full py-2 text-sm border flex items-center justify-center gap-1.5" style={{
          background: saveStatus === "error" ? C.tintRed : C.blueprint,
          borderColor: saveStatus === "error" ? C.red : C.blueprint,
          color: saveStatus === "error" ? C.red : "#fff",
        }}>
          {saveStatus === "saving" ? "저장 중…" : saveStatus === "error" ? "⚠ 저장 실패 — 다시 시도" : "지금 모두 저장하기"}
        </button>
        {saveStatus === "saved" && <div className="text-xs mt-1.5" style={{ color: C.green }}>✓ 방금 저장 완료됐어요.</div>}
      </Card>
      <Card>
        <SectionLabel n="07">데이터 백업</SectionLabel>
        <p className="text-sm mb-2" style={{ color: C.inkSoft }}>기기를 바꾸거나 독립 앱으로 옮길 때를 대비해 전체 데이터를 파일로 저장하거나 불러올 수 있어요.</p>
        <div className="flex gap-2">
          <button onClick={onExport} className="flex-1 border py-2 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>내보내기</button>
          <button onClick={() => fileRef.current && fileRef.current.click()} className="flex-1 border py-2 text-sm" style={{ background: C.blueprint, borderColor: C.blueprint, color: "#fff" }}>가져오기</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} style={{ position: "absolute", width: 1, height: 1, opacity: 0, overflow: "hidden", pointerEvents: "none" }} />
        {importMsg && <div className="text-xs mt-2" style={{ color: C.inkSoft }}>{importMsg}</div>}
      </Card>
      <Card>
        <SectionLabel n="08">데이터 초기화</SectionLabel>
        <button onClick={onReset} className="px-3 py-1.5 text-sm border flex items-center gap-1" style={{ borderColor: C.red, color: C.red }}><RotateCcw size={13} /> 전체 데이터 삭제</button>
      </Card>
    </div>
  );
}

function AdminStats() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);

  useEffect(() => {
    (async () => {
      if (typeof supabase === "undefined") {
        setError("이 기능은 독립 배포된 사이트에서만 사용할 수 있어요 (Claude 미리보기에서는 확인 불가).");
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from("user_data").select("user_id,key,value").in("key", ["settings", "studyLog"]);
        if (error) { setError(error.message + " — Supabase에 관리자로 등록되어 있는지 확인해주세요."); setLoading(false); return; }
        const byUser = {};
        (data || []).forEach(row => {
          byUser[row.user_id] = byUser[row.user_id] || {};
          try { byUser[row.user_id][row.key] = JSON.parse(row.value); } catch (e) { /* ignore */ }
        });
        const list = Object.entries(byUser).map(([uid, obj]) => {
          const s = obj.settings || {};
          const log = obj.studyLog || {};
          const totalMinutes = Object.values(log).reduce((acc, day) => acc + Object.values(day || {}).reduce((a, b) => a + b, 0), 0);
          return { uid, name: s.studentName || s.nickname || "(이름 미입력)", academy: s.currentAcademy || "미입력", totalMinutes };
        }).sort((a, b) => b.totalMinutes - a.totalMinutes);
        setRows(list);
      } catch (e) { setError(String(e)); }
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="text-sm text-center py-6" style={{ color: C.inkSoft }}>불러오는 중…</div>;
  if (error) return <Card><div className="text-sm" style={{ color: C.red }}>{error}</div></Card>;

  const academyCounts = {};
  rows.forEach(r => { academyCounts[r.academy] = (academyCounts[r.academy] || 0) + 1; });

  return (
    <div className="space-y-5">
      <Card><SectionLabel n="01">전체 사용자</SectionLabel><div className="font-mono text-3xl" style={{ color: C.ink }}>{rows.length}명</div></Card>
      <Card>
        <SectionLabel n="02">학원별 인원</SectionLabel>
        <div className="space-y-1">
          {Object.entries(academyCounts).sort((a, b) => b[1] - a[1]).map(([academy, count]) => (
            <div key={academy} className="flex items-center justify-between text-sm py-1 border-b last:border-b-0" style={{ borderColor: C.paperLine }}>
              <span style={{ color: C.ink }}>{academy}</span>
              <span className="font-mono" style={{ color: C.blueprint }}>{count}명</span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <SectionLabel n="03">사용자별 누적 공부시간</SectionLabel>
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.uid} className="flex items-center justify-between text-sm py-1.5 border-b last:border-b-0" style={{ borderColor: C.paperLine }}>
              <div><div style={{ color: C.ink }}>{r.name}</div><div className="text-xs" style={{ color: C.inkSoft }}>{r.academy}</div></div>
              <span className="font-mono" style={{ color: C.blueprint }}>{r.totalMinutes}분</span>
            </div>
          ))}
        </div>
      </Card>
      <div className="text-xs" style={{ color: C.inkSoft }}>학생들이 이름·학원을 입력한 경우에만 표시돼요. 입력 안 했으면 "미입력"으로 나와요.</div>
    </div>
  );
}

/* ---------------- App ---------------- */
const TABS = [
  { id: "dashboard", label: "대시보드", icon: LayoutDashboard },
  { id: "problems", label: "기출·과제", icon: BookOpen },
  { id: "grading", label: "오답노트", icon: PenLine },
  { id: "study", label: "공부시간", icon: Timer },
  { id: "attendance", label: "출석", icon: CalendarDays },
  { id: "drawing", label: "작도", icon: PencilRuler },
  { id: "community", label: "커뮤니티", icon: Users },
  { id: "settings", label: "설정", icon: SettingsIcon },
];
const ADMIN_TAB = { id: "admin", label: "관리자", icon: BarChart2 };

export default function StudyTrackerApp() {
  useFonts();
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("dashboard");
  const [showReport, setShowReport] = useState(false);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [subjects, setSubjects] = useState(DEFAULT_SUBJECTS);
  const [problems, setProblems] = useState([]);
  const [studyLog, setStudyLog] = useState({});
  const [attendance, setAttendance] = useState({});
  const [drawing, setDrawing] = useState({});
  const [authName, setAuthName] = useState("");
  useEffect(() => {
    if (typeof supabase === "undefined") return;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const meta = data && data.user && data.user.user_metadata;
        const name = (meta && (meta.name || meta.full_name || meta.preferred_username)) || (data && data.user && data.user.email ? data.user.email.split("@")[0] : "");
        setAuthName(name || "");
      } catch (e) { /* ignore */ }
    })();
  }, []);

  // Mock exam state lives here (not inside StudyTab) so it survives switching tabs.
  const [mockBreak1Minutes, setMockBreak1Minutes] = useState("60");
  const [mockBreak2Minutes, setMockBreak2Minutes] = useState("30");
  const [mockPhases, setMockPhases] = useState(null);
  const [mockPhaseIndex, setMockPhaseIndex] = useState(0);
  const [mockRemaining, setMockRemaining] = useState(0);
  const [mockRunning, setMockRunning] = useState(false);

  const addMockMinutes = (subjectLabel, mins) => {
    const today = todayStr();
    setStudyLog(prev => { const day = { ...(prev[today] || {}) }; day[subjectLabel] = Math.max(0, (day[subjectLabel] || 0) + mins); return { ...prev, [today]: day }; });
  };
  const buildMockPhases = () => {
    const brk1 = Math.max(0, Number(mockBreak1Minutes) || 0) * 60;
    const brk2 = Math.max(0, Number(mockBreak2Minutes) || 0) * 60;
    return [
      { label: "1교시", type: "exam", seconds: 180 * 60 },
      { label: "쉬는시간", type: "break", seconds: brk1 },
      { label: "2교시", type: "exam", seconds: 180 * 60 },
      { label: "쉬는시간", type: "break", seconds: brk2 },
      { label: "3교시", type: "exam", seconds: 180 * 60 },
    ];
  };
  const startMock = () => {
    const phases = buildMockPhases();
    setMockPhases(phases); setMockPhaseIndex(0); setMockRemaining(phases[0].seconds); setMockRunning(true);
  };
  const advanceMock = (elapsedSeconds, stopAll) => {
    const phase = mockPhases[mockPhaseIndex];
    if (phase.type === "exam" && elapsedSeconds > 0) addMockMinutes(`모의고사·${phase.label}`, Math.round(elapsedSeconds / 60));
    if (stopAll) { setMockRunning(false); setMockPhases(null); setMockPhaseIndex(0); setMockRemaining(0); return; }
    const next = mockPhaseIndex + 1;
    if (mockPhases && next < mockPhases.length) { setMockPhaseIndex(next); setMockRemaining(mockPhases[next].seconds); }
    else { setMockRunning(false); setMockPhases(null); setMockPhaseIndex(0); setMockRemaining(0); }
  };
  useEffect(() => {
    if (!mockRunning) return;
    const id = setInterval(() => {
      setMockRemaining(r => {
        if (r <= 1) { clearInterval(id); setTimeout(() => advanceMock(mockPhases[mockPhaseIndex].seconds, false), 0); return 0; }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mockRunning, mockPhaseIndex, mockPhases]);
  const mockProps = { mockBreak1Minutes, setMockBreak1Minutes, mockBreak2Minutes, setMockBreak2Minutes, mockPhases, mockPhaseIndex, mockRemaining, mockRunning, startMock, advanceMock };
  const currentMockPhase = mockPhases ? mockPhases[mockPhaseIndex] : null;
  const visibleTabs = settings.isAdmin ? [...TABS, ADMIN_TAB] : TABS;

  useEffect(() => {
    (async () => {
      const [s, sub, p, sl, at, dr] = await Promise.all([
        loadKey("settings", DEFAULT_SETTINGS), loadKey("subjects", DEFAULT_SUBJECTS), loadKey("problems", []), loadKey("studyLog", {}), loadKey("attendance", {}), loadKey("drawing", {}),
      ]);
      const finalSettings = { ...DEFAULT_SETTINGS, ...s };
      setSubjects(sub);
      const migrated = (p || []).map(item => {
        if (Array.isArray(item.attempts)) return item;
        const attempts = [];
        if (item.solved) attempts.push({ id: uid(), date: item.date || todayStr(), correct: item.correct ?? null, totalTime: item.totalTime || "", drawTime: item.drawTime || "", keyPoints: item.keyPoints || item.note || "", wrongCauses: item.wrongCauses || [], improvement: item.improvement || "", overcome: item.overcome || false, image: null });
        return { id: item.id, year: item.year, subject: item.subject, source: item.source, period: item.period, title: item.title, attempts };
      });
      if (!finalSettings.pastExamsSeeded) {
        const rounds = buildRounds(); const seededList = [];
        rounds.forEach(r => sub.forEach(subj => seededList.push({ id: uid(), year: r.year, round: r.round, subject: subj, source: "기출", period: SUBJECT_PERIODS[subj] || "", title: "", seeded: true, attempts: [] })));
        setProblems([...seededList, ...migrated]); finalSettings.pastExamsSeeded = true;
      } else { setProblems(migrated); }
      setSettings(finalSettings); setStudyLog(sl); setAttendance(at); setDrawing(dr || {});
      setLoaded(true);
    })();
  }, []);

  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const saveAll = async () => {
    setSaveStatus("saving");
    const results = await Promise.all([
      saveKey("settings", settings),
      saveKey("subjects", subjects),
      saveKey("problems", problems),
      saveKey("studyLog", studyLog),
      saveKey("attendance", attendance),
      saveKey("drawing", drawing),
    ]);
    setSaveStatus(results.every(Boolean) ? "saved" : "error");
  };
  useEffect(() => {
    if (!loaded) return;
    const id = setTimeout(saveAll, 500);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, subjects, problems, studyLog, attendance, drawing, loaded]);

  const resetAll = async () => {
    if (!window.confirm("모든 데이터를 삭제할까요? 되돌릴 수 없습니다.")) return;
    setSettings(DEFAULT_SETTINGS); setSubjects(DEFAULT_SUBJECTS); setProblems([]); setStudyLog({}); setAttendance({}); setDrawing({});
  };

  const exportData = () => {
    const payload = { settings, subjects, problems, studyLog, attendance, drawing, exportedAt: new Date().toISOString() };
    const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = `study-backup-${todayStr()}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };
  const importData = (data) => {
    if (data.settings) setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
    if (data.subjects) setSubjects(data.subjects);
    if (data.problems) setProblems(data.problems);
    if (data.studyLog) setStudyLog(data.studyLog);
    if (data.attendance) setAttendance(data.attendance);
    if (data.drawing) setDrawing(data.drawing);
  };

  if (!loaded) return <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper, color: C.inkSoft, fontFamily: "Pretendard, sans-serif" }}>불러오는 중…</div>;

  if (showReport) {
    return (
      <div data-theme={settings.darkMode ? "dark" : "light"} className="min-h-screen" style={{ background: C.paper, fontFamily: "Pretendard, -apple-system, sans-serif" }}>
        <style>{THEME_VARS}</style>
        <ReportView settings={settings} subjects={subjects} problems={problems} studyLog={studyLog} attendance={attendance} onClose={() => setShowReport(false)} />
      </div>
    );
  }

  return (
    <div data-theme={settings.darkMode ? "dark" : "light"} className="min-h-screen md:flex" style={{
      background: `${C.paper}`,
      backgroundImage: `linear-gradient(${C.paperLine} 1px, transparent 1px), linear-gradient(90deg, ${C.paperLine} 1px, transparent 1px)`,
      backgroundSize: "24px 24px", fontFamily: "Pretendard, -apple-system, sans-serif",
    }}>
      <style>{THEME_VARS}</style>

      {/* Desktop sidebar (md and up) */}
      <div className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen border-r" style={{ borderColor: C.paperLine, background: C.surface }}>
        <div className="p-5">
          <img src={LOGO_SRC} alt="신전스퀘어" style={{ width: 36, height: 36, marginBottom: 8 }} />
          <div className="text-xs font-mono tracking-widest mb-1" style={{ color: C.blueprint }}>SELF-STUDY DIMENSIONING TOOL</div>
          <div className="text-sm font-bold" style={{ color: C.ink }}>{settings.studentName ? `${settings.studentName}님의 스터디 로그` : "건축사시험 스터디 로그"}</div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {visibleTabs.map(t => {
            const Icon = t.icon; const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm" style={{ background: active ? C.tintBlue : "transparent", color: active ? C.blueprint : C.inkSoft }}>
                <Icon size={16} color={active ? C.blueprint : C.inkSoft} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-md md:max-w-3xl mx-auto md:mx-0 md:ml-0 px-4 md:px-10 pt-6 pb-24 md:pb-16">
          <div className="flex items-center gap-2 mb-1 md:hidden">
            <img src={LOGO_SRC} alt="신전스퀘어" style={{ width: 24, height: 24 }} />
            <div className="text-xs font-mono tracking-widest" style={{ color: C.blueprint }}>SELF-STUDY DIMENSIONING TOOL</div>
          </div>
          <h1 className="text-xl font-bold mb-1 md:hidden" style={{ color: C.ink }}>{settings.studentName ? `${settings.studentName}님의 스터디 로그` : "건축사시험 스터디 로그"}</h1>
          <button onClick={saveAll} className="text-xs mb-4 px-2 py-1 border flex items-center gap-1.5 w-fit" style={{
            borderColor: saveStatus === "error" ? C.red : C.paperLine,
            color: saveStatus === "error" ? C.red : saveStatus === "saving" ? C.blueprint : C.inkSoft,
            background: saveStatus === "error" ? C.tintRed : "transparent",
          }}>
            {saveStatus === "saving" && "● 저장 중…"}
            {saveStatus === "saved" && "✓ 저장됨"}
            {saveStatus === "error" && "⚠ 저장 실패 — 탭하여 다시 시도"}
            {saveStatus === "idle" && "저장 상태 확인"}
          </button>
          {mockRunning && tab !== "study" && (
            <button onClick={() => setTab("study")} className="w-full mb-4 px-3 py-2.5 text-sm flex items-center justify-between" style={{ background: currentMockPhase && currentMockPhase.type === "break" ? "#1E3A5F" : "#4A1414", color: "#fff" }}>
              <span>{currentMockPhase && currentMockPhase.type === "break" ? "☕ 쉬는시간" : `📝 ${currentMockPhase ? currentMockPhase.label : ""} 진행 중`} · {fmtClock(mockRemaining)}</span>
              <span className="text-xs underline">탭하여 돌아가기</span>
            </button>
          )}
          <div className="mb-5">
            {tab === "dashboard" && <Dashboard settings={settings} setSettings={setSettings} subjects={subjects} problems={problems} studyLog={studyLog} attendance={attendance} />}
            {tab === "problems" && <ProblemsTab subjects={subjects} problems={problems} setProblems={setProblems} settings={settings} setSettings={setSettings} />}
            {tab === "grading" && <GradingTab problems={problems} setProblems={setProblems} />}
            {tab === "study" && <StudyTab subjects={subjects} studyLog={studyLog} setStudyLog={setStudyLog} mockProps={mockProps} />}
            {tab === "attendance" && <AttendanceTab attendance={attendance} setAttendance={setAttendance} settings={settings} setSettings={setSettings} />}
            {tab === "drawing" && <DrawingTab subjects={subjects} drawing={drawing} setDrawing={setDrawing} />}
            {tab === "community" && (<CommunityTab nickname={settings.nickname || authName} groupCodes={settings.groupCodes || []} setGroupCodes={(codes) => setSettings(s => ({ ...s, groupCodes: codes }))} studyLog={studyLog} problems={problems} drawing={drawing} subjects={subjects} blockedAuthors={settings.blockedAuthors} onBlockAuthor={(author) => setSettings(s => ({ ...s, blockedAuthors: (s.blockedAuthors || []).includes(author) ? s.blockedAuthors : [...(s.blockedAuthors || []), author] }))} isAdmin={settings.isAdmin} />)}
            {tab === "settings" && <SettingsTab settings={settings} setSettings={setSettings} subjects={subjects} setSubjects={setSubjects} onReset={resetAll} onOpenReport={() => setShowReport(true)} onExport={exportData} onImport={importData} saveAll={saveAll} saveStatus={saveStatus} />}
            {tab === "admin" && settings.isAdmin && <AdminStats />}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav (hidden on md+) */}
      <div className="fixed bottom-0 left-0 right-0 border-t md:hidden" style={{ background: C.surface, borderColor: C.paperLine }}>
        <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map(t => { const Icon = t.icon; const active = tab === t.id; return (
            <button key={t.id} onClick={() => setTab(t.id)} className="flex flex-col items-center py-2 gap-0.5">
              <Icon size={15} color={active ? C.blueprint : C.paperLine} />
              <span className="text-[8px]" style={{ color: active ? C.blueprint : C.inkSoft }}>{t.label}</span>
            </button>
          ); })}
        </div>
      </div>
    </div>
  );
}
