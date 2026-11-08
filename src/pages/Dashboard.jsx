import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./Dashboard.css";

// Import SVG assets (Ensure these files exist in src/assets/icons/)
import dashboardIcon from "../assets/icons/dashboard.svg";
import documentIcon from "../assets/icons/document.svg";
import progressIcon from "../assets/icons/my-progress.svg";
import recommendationsIcon from "../assets/icons/recommendations.svg";
import historyIcon from "../assets/icons/history.svg";
import profileIcon from "../assets/icons/profile.svg";
import logoutIcon from "../assets/icons/logout.svg";

function Dashboard({ onNavigate, onLogout }) {
  const [mood, setMood] = useState("");
  const [submittingMood, setSubmittingMood] = useState(false);
  const [loggedToday, setLoggedToday] = useState(false);
  const [showMoodMessage, setShowMoodMessage] = useState(false);
  const [showBaselineModal, setShowBaselineModal] = useState(false);

  const [studentName, setStudentName] = useState(() => {
    try {
      const cached = JSON.parse(localStorage.getItem("userProfile") || "{}");
      return cached.first_name || cached.full_name || "Student";
    } catch {
      return "Student";
    }
  });

  const [moodHistory, setMoodHistory] = useState([]);
  const [latestAssessment, setLatestAssessment] = useState(null);
  const [isLoadingAssessment, setIsLoadingAssessment] = useState(true);

  const fetchUserData = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setIsLoadingAssessment(false);
        return;
      }

      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData && profileData.first_name) {
        setStudentName(profileData.first_name);
      }

      const { data: dassData } = await supabase
        .from("dass_assessments")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);

      if (!dassData || dassData.length === 0) {
        setShowBaselineModal(true);
      }

      const { data: assessmentData, error: assessmentError } = await supabase
        .from("dass_assessments")
        .select("total_score, baseline_7_score, responses, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!assessmentError && assessmentData && assessmentData.length > 0) {
        const record = assessmentData[0];
        const score = record.total_score ?? record.baseline_7_score ?? 0;

        setLatestAssessment({
          Stress: score,
          level: getStressLevel(score),
          date: new Date(record.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          }),
        });
      } else {
        setLatestAssessment(null);
      }

      const { data: moodData } = await supabase
        .from("mood_logs")
        .select("id, mood, note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (moodData) {
        const todayStr = new Date().toLocaleDateString();
        const formattedMoods = moodData.map((m) => ({
          id: m.id,
          mood: m.note || "Okay",
          date: new Date(m.created_at).toLocaleDateString(),
          timestamp: m.created_at,
        }));

        setMoodHistory(formattedMoods);
        const hasTodayLog = formattedMoods.some((m) => m.date === todayStr);
        setLoggedToday(hasTodayLog);
      }
    } catch (err) {
      console.error("Error fetching user data from Supabase:", err.message);
    } finally {
      setIsLoadingAssessment(false);
    }
  };

  useEffect(() => {
    fetchUserData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        fetchUserData();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const colors = {
    dark: "#123F35",
    green: "#087C66",
    greenLight: "#E8F5F0",
    background: "#F5F9F7",
    text: "#294D46",
    muted: "#7B8B86",
    border: "#E1EBE6",
    white: "#FFFFFF",
    orange: "#D97706",
    orangeLight: "#FEF3C7",
    red: "#DC2626",
    redLight: "#FEE2E2",
  };

  const menuItems = [
    { icon: dashboardIcon, label: "Home", page: "dashboard" },
    { icon: documentIcon, label: "Assessment", page: "assessment" },
    { icon: progressIcon, label: "My Progress", page: "progress" },
    { icon: recommendationsIcon, label: "Recommendations", page: "recommendations" },
    { icon: historyIcon, label: "History", page: "progress" },
    { icon: profileIcon, label: "Profile", page: "profile" },
  ];

  const moods = [
    { emoji: "😊", label: "Great" },
    { emoji: "🙂", label: "Good" },
    { emoji: "😐", label: "Okay" },
    { emoji: "😟", label: "Stressed" },
    { emoji: "😣", label: "Overwhelmed" },
  ];

  const cardStyle = {
    background: colors.white,
    border: `1px solid ${colors.border}`,
    borderRadius: "18px",
    padding: "22px",
    boxShadow: "0 5px 20px rgba(18,63,53,0.035)",
  };

  const goTo = (page) => {
    if (typeof onNavigate === "function") {
      onNavigate(page);
    }
  };

  const saveMood = async () => {
    if (!mood) {
      alert("Please select how you are feeling first.");
      return;
    }

    if (submittingMood) return;

    setSubmittingMood(true);
    const moodScoreMap = { Overwhelmed: 1, Stressed: 2, Okay: 3, Good: 4, Great: 5 };
    const todayDate = new Date().toISOString().split("T")[0];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error } = await supabase.from("mood_logs").upsert(
          [
            {
              user_id: user.id,
              mood: moodScoreMap[mood] || 3,
              note: mood,
              log_date: todayDate,
            },
          ],
          { onConflict: "user_id, log_date" }
        );

        if (!error) {
          setShowMoodMessage(true);
          setLoggedToday(true);
          await fetchUserData();
        } else {
          await supabase.from("mood_logs").insert([
            {
              user_id: user.id,
              mood: moodScoreMap[mood] || 3,
              note: mood,
            },
          ]);
          setShowMoodMessage(true);
          setLoggedToday(true);
          await fetchUserData();
        }
      }
    } catch (err) {
      console.error("Failed to save mood:", err);
    } finally {
      setSubmittingMood(false);
    }
  };

  const stressScore = latestAssessment ? Number(latestAssessment.Stress) : null;

  function getStressLevel(score) {
    if (score <= 14) return "Normal";
    if (score <= 18) return "Mild";
    if (score <= 25) return "Moderate";
    if (score <= 33) return "Severe";
    return "Extremely Severe";
  }

  const validStressScore = stressScore !== null && Number.isFinite(stressScore) && stressScore >= 0;
  const stressLevel = validStressScore ? getStressLevel(stressScore) : null;

  const stressColors = {
    Normal: { color: colors.green, background: colors.greenLight },
    Mild: { color: "#65A30D", background: "#F7FEE7" },
    Moderate: { color: colors.orange, background: colors.orangeLight },
    Severe: { color: colors.red, background: colors.redLight },
    "Extremely Severe": { color: colors.red, background: colors.redLight },
  };

  const dassRanges = [
    { label: "Normal", range: "0–14", color: colors.green },
    { label: "Mild", range: "15–18", color: "#65A30D" },
    { label: "Moderate", range: "19–25", color: colors.orange },
    { label: "Severe", range: "26–33", color: colors.red },
    { label: "Ex. Severe", range: "34–42", color: colors.red },
  ];

  const weeklyMoodData = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const dateKey = date.toLocaleDateString();
    const entry = moodHistory.find((item) => {
      if (item.timestamp) {
        return new Date(item.timestamp).toLocaleDateString() === dateKey;
      }
      return item.date === dateKey;
    });

    const selectedMood = moods.find((item) => item.label === entry?.mood);

    return {
      day: date.toLocaleDateString("en-US", { weekday: "short" }),
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      mood: entry?.mood || "No entry",
      emoji: selectedMood?.emoji || "—",
      hasEntry: Boolean(entry),
    };
  });

  const weeklyCheckIns = weeklyMoodData.filter((item) => item.hasEntry).length;

  return (
    <div className="dashboard-root">
      {showBaselineModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(18, 63, 53, 0.55)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
          <div style={{ background: colors.white, borderRadius: "24px", maxWidth: "500px", width: "100%", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)", textAlign: "center", border: `1px solid ${colors.border}` }}>
            <div style={{ width: "60px", height: "60px", borderRadius: "50%", background: colors.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "30px", margin: "0 auto 16px" }}>🌿</div>
            <h2 style={{ fontSize: "22px", color: colors.dark, margin: "0 0 10px", fontWeight: "700" }}>Welcome, {studentName}!</h2>
            <p style={{ fontSize: "13px", color: colors.text, lineHeight: "1.7", margin: "0 0 20px" }}>
              Please take your initial <strong>DASS Baseline Assessment</strong> to setup your account profile.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setShowBaselineModal(false)} style={{ flex: 1, background: "transparent", border: `1px solid ${colors.border}`, color: colors.muted, borderRadius: "10px", padding: "12px", fontSize: "12px", fontWeight: "600", cursor: "pointer" }}>Remind Me Later</button>
              <button onClick={() => { setShowBaselineModal(false); goTo("dassAssessment"); }} style={{ flex: 1, background: colors.green, border: "none", color: colors.white, borderRadius: "10px", padding: "12px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>Start DASS Baseline →</button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="dashboard-sidebar">
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 10px 28px" }}>
          <div style={{ fontSize: "28px" }}>🌿</div>
          <div>
            <strong style={{ fontSize: "15px", letterSpacing: "0.5px" }}>SMART STRIVE</strong>
            <div style={{ color: "#A8CEC2", fontSize: "10px", marginTop: "3px" }}>Student Wellness</div>
          </div>
        </div>

        <div style={{ fontSize: "9px", color: "#91B9AE", letterSpacing: "1.5px", fontWeight: "700", padding: "0 13px 12px" }}>MAIN MENU</div>

        <nav style={{ display: "grid", gap: "6px" }}>
          {menuItems.map((item) => {
            const active = item.page === "dashboard";
            return (
              <button
                key={item.label}
                onClick={() => goTo(item.page)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  width: "100%",
                  padding: "12px 14px",
                  border: "none",
                  borderRadius: "10px",
                  background: active ? "#087C66" : "transparent",
                  color: active ? "#FFFFFF" : "#C8DDD7",
                  textAlign: "left",
                  fontSize: "12px",
                  fontWeight: active ? "700" : "500",
                  cursor: "pointer",
                }}
              >
                <img
                  src={item.icon}
                  alt={item.label}
                  style={{
                    width: "18px",
                    height: "18px",
                    filter: active
                      ? "brightness(0) invert(1)"
                      : "invert(88%) sepia(9%) saturate(417%) hue-rotate(114deg) brightness(95%) contrast(88%)",
                  }}
                />
                {item.label}
                {active && <span style={{ marginLeft: "auto" }}>›</span>}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", padding: "18px 10px 0" }}>
          <button
            onClick={onLogout}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              width: "100%",
              background: "transparent",
              color: "#e05858",
              border: "1px solid rgba(255,255,255,0.16)",
              borderRadius: "9px",
              padding: "11px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            <img 
              src={logoutIcon} 
              alt="Log Out" 
              style={{ 
              width: "16px", 
              height: "16px", 
              filter: "invert(45%) sepia(59%) saturate(1637%) hue-rotate(326deg) brightness(94%) contrast(87%)"
              }} 
/>

            Log Out
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="dashboard-main">
        <header style={{ minHeight: "70px", background: colors.white, borderBottom: `1px solid ${colors.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 30px", gap: "15px", boxSizing: "border-box" }}>
          <div style={{ fontSize: "11px", color: colors.muted }}>Student Portal / Home</div>
          <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
            <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: colors.greenLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "19px" }}>🎓</div>
            <div>
              <strong style={{ display: "block", fontSize: "12px" }}>{studentName}</strong>
              <span style={{ fontSize: "10px", color: colors.muted }}>Student</span>
            </div>
          </div>
        </header>

        <div style={{ padding: "28px", maxWidth: "1500px", margin: "0 auto", boxSizing: "border-box", width: "100%", flex: 1 }}>
          <section style={{ ...cardStyle, background: "linear-gradient(120deg, #E5F5ED 0%, #F5FBF8 65%, #D8EEE5 100%)", padding: "28px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px" }}>
              <div style={{ display: "inline-block", background: "#FFFFFF", color: colors.green, padding: "6px 10px", borderRadius: "20px", fontSize: "9px", fontWeight: "800", letterSpacing: "1px", marginBottom: "13px" }}>YOUR STUDENT WELLNESS SPACE</div>
              <h1 style={{ fontSize: "clamp(25px, 3vw, 35px)", lineHeight: "1.2", color: colors.dark, margin: "0 0 10px" }}>Hi, {studentName}! 👋</h1>
              <p style={{ color: colors.text, fontSize: "13px", lineHeight: "1.8", margin: "0 0 20px", maxWidth: "480px" }}>Your well-being matters. Check in with how you feel and take steps toward a healthier day.</p>
              <button onClick={() => goTo("dassAssessment")} style={{ background: colors.green, color: "#FFFFFF", border: "none", borderRadius: "10px", padding: "12px 19px", fontSize: "12px", fontWeight: "700", cursor: "pointer", boxShadow: "0 5px 12px rgba(8,124,102,0.15)" }}>Take DASS-21 Screening →</button>
            </div>
            <div style={{ width: "150px", height: "150px", borderRadius: "50%", background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "75px", flexShrink: 0 }}>🌱</div>
          </section>

          {/* SUMMARY CARDS */}
          <div className="student-dashboard-summary">
            {[
              { icon: "📝", label: "Assessment", title: "Comprehensive Check", description: "Complete your 13-feature assessment.", button: "Start Assessment", action: () => goTo("assessment"), color: colors.green, background: colors.greenLight },
              { icon: "📈", label: "My Progress", title: "Your journey matters", description: "Review your assessment history and progress.", button: "View Progress", action: () => goTo("progress"), color: "#4267A1", background: "#EDF3FF" },
              { icon: "🌿", label: "Recommendations", title: "Small steps can help", description: "Explore wellness tips and coping mechanisms.", button: "Explore Tips", action: () => goTo("recommendations"), color: "#9A6A13", background: "#FFF5DE" },
            ].map((item) => (
              <div key={item.label} style={{ ...cardStyle, padding: "20px", display: "flex", flexDirection: "column", alignItems: "flex-start", minWidth: 0 }}>
                <div style={{ width: "43px", height: "43px", borderRadius: "13px", background: item.background, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "21px", marginBottom: "15px" }}>{item.icon}</div>
                <span style={{ color: item.color, fontSize: "10px", fontWeight: "800", letterSpacing: "0.6px" }}>{item.label.toUpperCase()}</span>
                <h3 style={{ color: colors.dark, fontSize: "15px", margin: "9px 0 7px" }}>{item.title}</h3>
                <p style={{ color: colors.muted, fontSize: "11px", lineHeight: "1.7", margin: "0 0 17px", flex: 1 }}>{item.description}</p>
                <button onClick={item.action} style={{ width: "100%", border: `1px solid ${colors.border}`, background: "#FFFFFF", color: colors.green, padding: "10px", borderRadius: "9px", fontSize: "11px", fontWeight: "700", cursor: "pointer" }}>{item.button} →</button>
              </div>
            ))}
          </div>

          {/* WELLNESS ROW */}
          <div className="wellness-row">
            {/* MOOD CHECK-IN SECTION */}
            <section style={cardStyle}>
              <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                <div style={{ fontSize: "23px" }}>💚</div>
                <div>
                  <h3 style={{ fontSize: "15px", color: colors.dark, margin: "2px 0 6px" }}>How are you feeling today?</h3>
                  <p style={{ fontSize: "11px", color: colors.muted, margin: 0, lineHeight: "1.6" }}>Take a moment to check in with yourself.</p>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: "7px", marginTop: "23px" }}>
                {moods.map((item) => {
                  const selected = mood === item.label;
                  return (
                    <button key={item.label} onClick={() => { setMood(item.label); setShowMoodMessage(false); }} style={{ padding: "12px 3px", borderRadius: "12px", border: selected ? `2px solid ${colors.green}` : `1px solid ${colors.border}`, background: selected ? colors.greenLight : "#FFFFFF", cursor: "pointer", color: colors.text }}>
                      <span style={{ display: "block", fontSize: "23px", marginBottom: "7px" }}>{item.emoji}</span>
                      <span style={{ fontSize: "9px", fontWeight: selected ? "800" : "500" }}>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={saveMood}
                disabled={submittingMood || !mood}
                style={{
                  marginTop: "16px",
                  width: "100%",
                  background: submittingMood || !mood ? "#A8CEC2" : colors.green,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "9px",
                  padding: "11px",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: submittingMood || !mood ? "not-allowed" : "pointer",
                }}
              >
                {submittingMood ? "Saving..." : loggedToday ? "Update Today's Mood Check-in" : "Save Mood Check-in"}
              </button>

              {showMoodMessage && <p style={{ margin: "12px 0 0", background: colors.greenLight, color: colors.green, padding: "11px", borderRadius: "9px", fontSize: "11px" }}>✓ Saved successfully!</p>}

              {/* WEEKLY MOOD TREND */}
              <div style={{ marginTop: "24px", borderTop: `1px solid ${colors.border}`, paddingTop: "20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div>
                    <h4 style={{ color: colors.dark, fontSize: "13px", margin: "0 0 5px" }}>Weekly Mood Trend</h4>
                    <p style={{ color: colors.muted, fontSize: "10px", margin: 0 }}>Your mood check-ins over the last 7 days.</p>
                  </div>
                  <span style={{ background: colors.greenLight, color: colors.green, padding: "7px 10px", borderRadius: "20px", fontSize: "10px", fontWeight: "700" }}>
                    {weeklyCheckIns}/7 days
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "6px", marginTop: "20px" }}>
                  {weeklyMoodData.map((item, index) => (
                    <div key={`${item.day}-${index}`} style={{ textAlign: "center", minWidth: 0 }}>
                      <div style={{ fontSize: "10px", color: colors.muted, marginBottom: "9px", fontWeight: "600" }}>{item.day}</div>
                      <div style={{ height: "55px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "10px", background: item.hasEntry ? colors.greenLight : "#F5F7F6", border: `1px solid ${item.hasEntry ? "#CDE8DD" : colors.border}`, fontSize: "20px" }} title={item.mood}>
                        {item.emoji}
                      </div>
                      <div style={{ height: "5px", borderRadius: "10px", marginTop: "8px", background: item.hasEntry ? colors.green : "#E4EAE7" }} />
                      <div style={{ fontSize: "9px", color: colors.muted, marginTop: "7px", lineHeight: "1.4" }}>{item.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* CURRENT STRESS LEVEL */}
            <section style={cardStyle}>
              <h3 style={{ fontSize: "15px", color: colors.dark, margin: "0 0 6px" }}>Your Current Stress Level</h3>
              <p style={{ fontSize: "11px", color: colors.muted, lineHeight: "1.6", margin: "0 0 18px" }}>Latest recorded DASS-21 screening result.</p>

              <div style={{ background: "#F7FAF8", border: `1px solid ${colors.border}`, borderRadius: "14px", padding: "20px 14px", textAlign: "center" }}>
                {isLoadingAssessment ? (
                  <>
                    <div style={{ fontSize: "30px", marginBottom: "9px" }}>⏳</div>
                    <span style={{ display: "inline-block", padding: "7px 13px", background: colors.greenLight, color: colors.green, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>LOADING...</span>
                    <p style={{ fontSize: "10px", color: colors.muted, marginTop: "12px" }}>Fetching your assessment data...</p>
                  </>
                ) : !stressLevel ? (
                  <>
                    <div style={{ fontSize: "38px", marginBottom: "9px" }}>🌱</div>
                    <span style={{ display: "inline-block", padding: "7px 13px", background: colors.orangeLight, color: colors.orange, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>NOT ASSESSED YET</span>
                    <p style={{ fontSize: "10px", color: colors.muted, marginTop: "12px" }}>Complete your assessment to view your score.</p>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "38px", marginBottom: "9px" }}>💚</div>
                    <div style={{ fontSize: "30px", fontWeight: "800", color: colors.dark }}>{stressScore} / 42</div>
                    <span style={{ display: "inline-block", marginTop: "8px", padding: "7px 13px", background: stressColors[stressLevel]?.background || colors.greenLight, color: stressColors[stressLevel]?.color || colors.green, borderRadius: "20px", fontSize: "11px", fontWeight: "800" }}>
                      {stressLevel.toUpperCase()}
                    </span>
                    <p style={{ fontSize: "10px", color: colors.muted, margin: "12px 0 0" }}>Latest assessment: {latestAssessment.date}</p>
                  </>
                )}
              </div>

              {/* DASS-21 STRESS SCORING REFERENCE LEGEND */}
              <div style={{ marginTop: "18px", borderTop: `1px solid ${colors.border}`, paddingTop: "14px" }}>
                <span style={{ fontSize: "10px", fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "10px" }}>
                  DASS-21 Stress Score Guide
                </span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "4px", textAlign: "center" }}>
                  {dassRanges.map((item) => (
                    <div key={item.label} style={{ background: "#F4F9F7", borderRadius: "8px", padding: "6px 2px", border: `1px solid ${colors.border}` }}>
                      <div style={{ fontSize: "9px", fontWeight: "700", color: item.color }}>{item.label}</div>
                      <div style={{ fontSize: "9px", color: colors.muted, marginTop: "2px" }}>{item.range}</div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* FOOTER & DISCLAIMERS */}
        <footer style={{ background: colors.white, borderTop: `1px solid ${colors.border}`, padding: "24px 30px", marginTop: "40px", boxSizing: "border-box" }}>
          <div style={{ maxWidth: "1500px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "15px" }}>
            <div>
              <strong style={{ fontSize: "13px", color: colors.dark }}>Smart Strive Student Wellness Portal</strong>
              <p style={{ fontSize: "11px", color: colors.muted, margin: "4px 0 0", maxWidth: "600px", lineHeight: "1.5" }}>
                Disclaimer: This tool is designed for student wellness monitoring and self-reflection. It does not replace professional psychological evaluation, psychiatric diagnosis, or clinical treatment. If you are experiencing severe distress, please reach out to your university guidance counselor or health professional.
              </p>
            </div>
            <div style={{ fontSize: "11px", color: colors.muted, textAlign: "right" }}>
              <div>© {new Date().getFullYear()} Smart Strive. All rights reserved.</div>
              <div style={{ marginTop: "4px" }}>Secure Database Connected via Supabase</div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

export default Dashboard;