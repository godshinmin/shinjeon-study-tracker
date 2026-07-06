import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import StudyTrackerApp from "./StudyTrackerApp";

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = loading, null = logged out
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  const loginWithKakao = async () => {
    setError("");
    // Limit the requested scope to nickname only, so Kakao doesn't complain
    // about consent items (like email) that this app hasn't been granted.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { scopes: "profile_nickname" },
    });
    if (error) setError(error.message);
    // On success, Kakao redirects away from the page automatically.
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

  const kakaoButtonStyle = { width: "100%", padding: "12px", background: "#FEE500", color: "#191919", border: "none", fontSize: 15, fontWeight: 600, cursor: "pointer" };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif", background: "#EDEFF2" }}>
      <div style={{ background: "#fff", padding: 32, borderRadius: 4, width: 320, border: "1px solid #C7D3DA", textAlign: "center" }}>
        <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4, color: "#16233B" }}>건축사시험 스터디 로그</h1>
        <p style={{ fontSize: 13, color: "#3E4E68", marginBottom: 20 }}>카카오 계정으로 간편하게 시작하세요.</p>
        <button type="button" onClick={loginWithKakao} style={kakaoButtonStyle}>
          카카오로 3초만에 로그인
        </button>
        {error && <p style={{ fontSize: 12, color: "#C4453D", marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
