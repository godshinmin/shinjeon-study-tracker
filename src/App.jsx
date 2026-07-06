import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import StudyTrackerApp from "./StudyTrackerApp";

// Supabase's auth system is built around "email" as the account identifier,
// but we never need to actually deliver mail to it. So we take a plain
// username and turn it into a fake, undeliverable address behind the
// scenes. This means no SMTP setup, no confirmation emails, nothing.
function usernameToFakeEmail(username) {
  const clean = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  return `${clean}@shinjeon.local`;
}

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [mode, setMode] = useState("signin"); // "signin" | "signup"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loginWithKakao = async () => {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider: "kakao" });
    if (error) setError(error.message);
    // On success, Kakao redirects away from the page automatically.
  };

  const submitSignIn = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToFakeEmail(username), password });
    setLoading(false);
    if (error) setError("아이디 또는 비밀번호가 맞지 않아요.");
  };

  const submitSignUp = async (e) => {
    e.preventDefault();
    setError("");
    if (username.trim().length < 3) { setError("아이디는 3자 이상으로 해주세요."); return; }
    if (password !== password2) { setError("비밀번호가 서로 달라요. 다시 확인해주세요."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email: usernameToFakeEmail(username), password });
    setLoading(false);
    if (error) {
      if (error.message.includes("already registered")) setError("이미 사용 중인 아이디예요. 다른 아이디를 써주세요.");
      else setError(error.message);
    }
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        불러오는 중…
      </div>
    );
  }

  if (session) {
    return <StudyTrackerApp />;
  }

  const inputStyle = { width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #C7D3DA", marginBottom: 8, boxSizing: "border-box" };
  const buttonStyle = { width: "100%", padding: "10px", background: "#2C6E8E", color: "#fff", border: "none", fontSize: 14 };
  const kakaoButtonStyle = { width: "100%", padding: "10px", background: "#FEE500", color: "#191919", border: "none", fontSize: 14, fontWeight: 600, marginBottom: 16, cursor: "pointer" };
  const linkStyle = { background: "none", border: "none", color: "#2C6E8E", fontSize: 12, textDecoration: "underline", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#EDEFF2" }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 4, width: 320, border: "1px solid #C7D3DA" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: "#16233B" }}>건축사시험 스터디 로그</h1>

        <button type="button" onClick={loginWithKakao} style={kakaoButtonStyle}>
          카카오로 3초만에 로그인
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0", color: "#8A93A6", fontSize: 11 }}>
          <div style={{ flex: 1, height: 1, background: "#C7D3DA" }} />
          또는 아이디로 로그인
          <div style={{ flex: 1, height: 1, background: "#C7D3DA" }} />
        </div>

        <form onSubmit={mode === "signup" ? submitSignUp : submitSignIn}>
          <input
            type="text"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디 (영문/숫자, 3자 이상)"
            style={inputStyle}
          />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 (6자 이상)"
            style={inputStyle}
          />
          {mode === "signup" && (
            <input
              type="password"
              required
              minLength={6}
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              placeholder="비밀번호 확인"
              style={inputStyle}
            />
          )}
          <button type="submit" disabled={loading} style={buttonStyle}>
            {loading ? "처리 중..." : mode === "signup" ? "가입하기" : "로그인"}
          </button>
        </form>
        {error && <p style={{ fontSize: 12, color: "#C4453D", marginTop: 8 }}>{error}</p>}
        <button
          type="button"
          onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setError(""); }}
          style={{ ...linkStyle, marginTop: 12, display: "block" }}
        >
          {mode === "signup" ? "이미 아이디가 있어요 (로그인하기)" : "아이디가 없어요 (가입하기)"}
        </button>
      </div>
    </div>
  );
}
