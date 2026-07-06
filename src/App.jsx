import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import StudyTrackerApp from "./StudyTrackerApp";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [mode, setMode] = useState("signin"); // "signin" | "signup" | "forgot" | "reset"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const resetMessages = () => { setError(""); setMessage(""); };

  const submitSignIn = async (e) => {
    e.preventDefault();
    resetMessages(); setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const submitSignUp = async (e) => {
    e.preventDefault();
    resetMessages();
    if (password !== password2) { setError("비밀번호가 서로 달라요. 다시 확인해주세요."); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setError(error.message);
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    resetMessages(); setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("비밀번호 재설정 링크를 이메일로 보냈어요. 메일함을 확인해주세요.");
  };

  const submitReset = async (e) => {
    e.preventDefault();
    resetMessages();
    if (password !== password2) { setError("비밀번호가 서로 달라요. 다시 확인해주세요."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message);
    else setMessage("비밀번호가 변경됐어요! 이제 이 비밀번호로 로그인하시면 돼요.");
  };

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
        불러오는 중…
      </div>
    );
  }

  // Logged in and not in the middle of a password reset flow → show the app
  if (session && mode !== "reset") {
    return <StudyTrackerApp />;
  }

  const inputStyle = { width: "100%", padding: "8px 10px", fontSize: 14, border: "1px solid #C7D3DA", marginBottom: 8, boxSizing: "border-box" };
  const buttonStyle = { width: "100%", padding: "10px", background: "#2C6E8E", color: "#fff", border: "none", fontSize: 14 };
  const linkStyle = { background: "none", border: "none", color: "#2C6E8E", fontSize: 12, textDecoration: "underline", cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#EDEFF2" }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 4, width: 320, border: "1px solid #C7D3DA" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#16233B" }}>건축사시험 스터디 로그</h1>

        {mode === "reset" ? (
          <>
            <p style={{ fontSize: 13, color: "#3E4E68", marginBottom: 16 }}>새 비밀번호를 설정해주세요.</p>
            <form onSubmit={submitReset}>
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="새 비밀번호 (6자 이상)" style={inputStyle} />
              <input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="새 비밀번호 확인" style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? "처리 중..." : "비밀번호 변경"}</button>
            </form>
          </>
        ) : mode === "forgot" ? (
          <>
            <p style={{ fontSize: 13, color: "#3E4E68", marginBottom: 16 }}>가입하신 이메일로 재설정 링크를 보내드려요.</p>
            <form onSubmit={submitForgot}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              <button type="submit" disabled={loading} style={buttonStyle}>{loading ? "처리 중..." : "재설정 링크 보내기"}</button>
            </form>
            <button type="button" onClick={() => { setMode("signin"); resetMessages(); }} style={{ ...linkStyle, marginTop: 12, display: "block" }}>로그인으로 돌아가기</button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, color: "#3E4E68", marginBottom: 16 }}>
              {mode === "signup" ? "이메일과 비밀번호로 계정을 만들어주세요." : "이메일과 비밀번호로 로그인해주세요."}
            </p>
            <form onSubmit={mode === "signup" ? submitSignUp : submitSignIn}>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
              <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 (6자 이상)" style={inputStyle} />
              {mode === "signup" && (
                <input type="password" required minLength={6} value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="비밀번호 확인" style={inputStyle} />
              )}
              <button type="submit" disabled={loading} style={buttonStyle}>
                {loading ? "처리 중..." : mode === "signup" ? "회원가입" : "로그인"}
              </button>
            </form>
            {mode === "signin" && (
              <button type="button" onClick={() => { setMode("forgot"); resetMessages(); }} style={{ ...linkStyle, marginTop: 10, display: "block" }}>비밀번호를 잊으셨나요?</button>
            )}
            <button
              type="button"
              onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); resetMessages(); }}
              style={{ ...linkStyle, marginTop: 6, display: "block" }}
            >
              {mode === "signup" ? "이미 계정이 있어요 (로그인하기)" : "계정이 없어요 (회원가입하기)"}
            </button>
          </>
        )}

        {error && <p style={{ fontSize: 12, color: "#C4453D", marginTop: 8 }}>{error}</p>}
        {message && <p style={{ fontSize: 12, color: "#4C8C6B", marginTop: 8 }}>{message}</p>}
      </div>
    </div>
  );
}
