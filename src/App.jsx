import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import StudyTrackerApp from "./StudyTrackerApp";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } =
      mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        불러오는 중…
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#EDEFF2" }}>
        <form onSubmit={submit} style={{ background: "#fff", padding: 32, borderRadius: 4, width: 320, border: "1px solid #C7D3DA" }}>
          <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#16233B" }}>건축사시험 스터디 로그</h1>
          <p style={{ fontSize: 13, color: "#3E4E68", marginBottom: 16 }}>
            {mode === "signup" ? "이메일과 비밀번호로 계정을 만들어주세요." : "이메일과 비밀번호로 로그인해주세요."}
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #C7D3DA", marginBottom: 8, boxSizing: "border-box" }}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            style={{ width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #C7D3DA", marginBottom: 8, boxSizing: "border-box" }}
          />
          <button type="submit" disabled={loading} style={{ width: "100%", padding: "10px", background: "#2C6E8E", color: "#fff", border: "none", fontSize: 14 }}>
            {loading ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
          </button>
          {error && <p style={{ fontSize: 12, color: "#C4453D", marginTop: 8 }}>{error}</p>}
          <button
            type="button"
            onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
            style={{ width: "100%", marginTop: 12, background: "none", border: "none", color: "#2C6E8E", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}
          >
            {mode === "signup" ? "이미 계정이 있어요 (로그인하기)" : "계정이 없어요 (회원가입하기)"}
          </button>
        </form>
      </div>
    );
  }

  return <StudyTrackerApp />;
}
