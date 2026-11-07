import React, { useEffect, useState } from "react";
const STORAGE_KEY = "smartStriveAssessmentHistory";
function Progress({ onBack, onLogout }) {
const [history, setHistory] = useState([]);
useEffect(() => {
try {
const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
setHistory(Array.isArray(saved) ? saved : []);
} catch {
setHistory([]);
}
}, []);
const latest = history[0];
const categories = ["Depression", "Anxiety", "Stress"];
const getSeverity = (category, score) => {
const ranges = {
Depression: [[9, "Normal"], [13, "Mild"], [20, "Moderate"], [27, "Severe"], [42, "Extremely Severe"]],
Anxiety: [[7, "Normal"], [9, "Mild"], [14, "Moderate"], [19, "Severe"], [42, "Extremely Severe"]],
Stress: [[14, "Normal"], [18, "Mild"], [25, "Moderate"], [33, "Severe"], [42, "Extremely Severe"]]
};
return ranges[category].find(([max]) => score <= max)?.[1] || "Normal";
};
const getColor = severity => {
if (severity === "Normal") return "#087c66";
if (severity === "Mild") return "#65a30d";
if (severity === "Moderate") return "#d97706";
return "#dc2626";
};
const clearHistory = () => {
const confirmed = window.confirm(
"Are you sure you want to clear your assessment history?"
);
if (confirmed) {
  localStorage.removeItem(STORAGE_KEY);
  setHistory([]);
}
};
return (
<div style={styles.page}>
  <header style={styles.header}>
    <div style={styles.logo}>🌿 SMART STRIVE</div>
    <span style={styles.headerText}>My Progress</span>
  </header>
  <main style={styles.container}>
    <p style={styles.eyebrow}>STUDENT WELLNESS</p>
    <h1 style={styles.title}>My Progress</h1>
    <p style={styles.subtitle}>
      Monitor your assessment results and track your well-being over time.
    </p>

    {history.length === 0 ? (
      <section style={styles.emptyCard}>
        <div style={{ fontSize: 42 }}>📊</div>
        <h2>No assessment history yet</h2>
        <p>
          Complete your DASS-21 assessment to start tracking your progress.
        </p>
        <button style={styles.primaryButton} onClick={onBack}>
          Back to Dashboard
        </button>
      </section>
    ) : (
      <>
        <section style={styles.latestCard}>
          <h2>Latest Assessment</h2>
          <p style={styles.dateText}>
            {latest.date || "Date not available"}
          </p>

          <div style={styles.scoreGrid}>
            {categories.map(category => {
              const score = Number(latest[category] || 0);
              const severity = getSeverity(category, score);

              return (
                <div style={styles.scoreCard} key={category}>
                  <span style={styles.category}>{category}</span>
                  <strong style={styles.score}>{score}/42</strong>
                  <span style={{ color: getColor(severity), fontWeight: 700 }}>
                    {severity}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section style={styles.historySection}>
          <div style={styles.historyHeading}>
            <div>
              <h2>Assessment History</h2>
              <p>Previous DASS-21 assessment records</p>
            </div>
            <span style={styles.count}>{history.length} record(s)</span>
          </div>

          <div style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Depression</th>
                  <th>Anxiety</th>
                  <th>Stress</th>
                </tr>
              </thead>
              <tbody>
                {history.map((record, index) => (
                  <tr key={record.id || index}>
                    <td>{record.date || "—"}</td>
                    {categories.map(category => {
                      const score = Number(record[category] || 0);
                      const severity = getSeverity(category, score);
                      return (
                        <td key={category}>
                          <strong>{score}/42</strong>
                          <span
                            style={{
                              ...styles.tableSeverity,
                              color: getColor(severity)
                            }}
                          >
                            {severity}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p style={styles.note}>
          Note: DASS-21 results are screening indicators, not clinical
          diagnoses. Discuss concerns with the university Guidance Office
          or a qualified professional.
        </p>

        <button style={styles.clearButton} onClick={clearHistory}>
          Clear Assessment History
        </button>
      </>
    )}

    <div style={styles.actions}>
      <button style={styles.backButton} onClick={onBack}>
        ← Back to Dashboard
      </button>
      {onLogout && (
        <button style={styles.logoutButton} onClick={onLogout}>
          Log Out
        </button>
      )}
    </div>
  </main>
</div>
);
}
const styles = {
page: {
minHeight: "100vh",
background: "#f4f9f7",
color: "#294d46",
fontFamily: '"Segoe UI", Arial, sans-serif'
},
header: {
height: 70,
padding: "0 6%",
background: "#fff",
borderBottom: "1px solid #e1ebe8",
display: "flex",
alignItems: "center",
justifyContent: "space-between",
flexWrap: "wrap",
gap: 10
},
logo: { fontWeight: 800, letterSpacing: 1, color: "#073f38" },
headerText: { color: "#7b8b86", fontSize: 13 },
container: { maxWidth: 1100, margin: "35px auto", padding: "0 16px 40px", boxSizing: "border-box" },
eyebrow: { color: "#087c66", fontSize: 12, fontWeight: 800, letterSpacing: 1.5 },
title: { color: "#073f38", fontSize: "clamp(24px, 4vw, 30px)", margin: "8px 0" },
subtitle: { color: "#7b8b86", lineHeight: 1.6 },
latestCard: {
background: "#fff",
padding: 20,
borderRadius: 16,
border: "1px solid #e1ebe8",
marginTop: 28
},
dateText: { color: "#7b8b86", fontSize: 13 },
scoreGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
gap: 14,
marginTop: 20
},
scoreCard: {
background: "#f4f9f7",
padding: 16,
borderRadius: 12,
display: "flex",
flexDirection: "column",
gap: 9
},
category: { color: "#7b8b86", fontSize: 14 },
score: { fontSize: 24, color: "#073f38" },
historySection: {
background: "#fff",
padding: "20px 16px",
borderRadius: 16,
border: "1px solid #e1ebe8",
marginTop: 25
},
historyHeading: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
flexWrap: "wrap",
gap: 10
},
count: {
background: "#e8f5f1",
color: "#087c66",
padding: "7px 12px",
borderRadius: 20,
fontSize: 12,
fontWeight: 700
},
tableWrapper: { overflowX: "auto", marginTop: 18, width: "100%" },
table: { width: "100%", borderCollapse: "collapse", textAlign: "left", minWidth: "450px" },
tableSeverity: { display: "block", fontSize: 12, marginTop: 5, fontWeight: 700 },
note: {
background: "#e8f5f1",
padding: 16,
borderRadius: 12,
marginTop: 22,
lineHeight: 1.7,
fontSize: 13
},
emptyCard: {
background: "#fff",
padding: 30,
borderRadius: 16,
textAlign: "center",
marginTop: 30,
border: "1px solid #e1ebe8"
},
primaryButton: {
background: "#087c66",
color: "#fff",
border: "none",
padding: "12px 20px",
borderRadius: 8,
cursor: "pointer",
fontWeight: "700"
},
clearButton: {
background: "#fff",
color: "#b91c1c",
border: "1px solid #fecaca",
padding: "10px 15px",
borderRadius: 8,
cursor: "pointer",
marginTop: 18
},
actions: { display: "flex", gap: 12, flexWrap: "wrap", marginTop: 25 },
backButton: {
background: "#fff",
color: "#294d46",
border: "1px solid #d5e3dd",
padding: "12px 18px",
borderRadius: 8,
cursor: "pointer"
},
logoutButton: {
background: "#fee2e2",
color: "#b91c1c",
border: "none",
padding: "12px 18px",
borderRadius: 8,
cursor: "pointer"
}
};
export default Progress;