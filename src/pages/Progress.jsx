import React, { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Progress.css";

const categories = ["Depression", "Anxiety", "Stress"];

const getSeverity = (category, score) => {
  const ranges = {
    Depression: [
      [9, "Normal"],
      [13, "Mild"],
      [20, "Moderate"],
      [27, "Severe"],
      [42, "Extremely Severe"]
    ],
    Anxiety: [
      [7, "Normal"],
      [9, "Mild"],
      [14, "Moderate"],
      [19, "Severe"],
      [42, "Extremely Severe"]
    ],
    Stress: [
      [14, "Normal"],
      [18, "Mild"],
      [25, "Moderate"],
      [33, "Severe"],
      [42, "Extremely Severe"]
    ]
  };
  return ranges[category]?.find(([max]) => score <= max)?.[1] || "Normal";
};

export default function Progress({ onBack }) {
  const [dassHistory, setDassHistory] = useState([]);
  const [featureHistory, setFeatureHistory] = useState([]);
  const [activeTab, setActiveTab] = useState("dass");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProgressData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // 1. Fetch DASS-21 history
        const { data: dassData } = await supabase
          .from("dass_assessments")
          .select("id, created_at, responses")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (dassData) {
          setDassHistory(dassData);
        }

        // 2. Fetch ML Feature Check-in history
        const { data: featureData } = await supabase
          .from("assessments")
          .select("id, created_at, stress_level, stress_score, top_concerns, recommendations")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (featureData) {
          setFeatureHistory(featureData);
        }
      } catch (err) {
        console.error("Error fetching progress history:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchProgressData();
  }, []);

  const getSeverityClass = (severity) => {
    if (severity === "Normal" || severity === "Low") return "severity-normal";
    if (severity === "Mild") return "severity-mild";
    if (severity === "Moderate") return "severity-moderate";
    return "severity-severe";
  };

  const latestDass = dassHistory[0]?.responses?.subscales || null;
  const latestFeature = featureHistory[0] || null;
  const hasHistory = dassHistory.length > 0 || featureHistory.length > 0;

  return (
    <div className="progress-page">
      <header className="progress-header">
        <div className="progress-logo">🌿 SMART STRIVE</div>
        <span className="progress-header-text">My Progress</span>
      </header>

      <main className="progress-container">
        <p className="progress-eyebrow">STUDENT WELLNESS</p>
        <h1 className="progress-title">My Progress</h1>
        <p className="progress-subtitle">
          Monitor your DASS-21 screening scores and ML feature check-ins over time.
        </p>

        {loading ? (
          <section className="progress-empty-card">
            <p>Loading your progress history...</p>
          </section>
        ) : !hasHistory ? (
          <section className="progress-empty-card">
            <div className="progress-empty-icon">📊</div>
            <h2>No assessment history yet</h2>
            <p>Complete a DASS-21 or lifestyle assessment to start tracking your wellness trends.</p>
            <button className="progress-btn-primary" onClick={onBack}>
              Back to Dashboard
            </button>
          </section>
        ) : (
          <>
            {/* Latest Assessment Summary Overview */}
            <section className="progress-latest-card">
              <h2>Latest Assessment Highlights</h2>
              <div className="progress-latest-grid">
                {/* Latest DASS Card */}
                {latestDass && (
                  <div className="progress-highlight-box">
                    <div className="progress-highlight-header">
                      <h3>DASS-21 Screening</h3>
                      <span className="progress-date-text">
                        {new Date(dassHistory[0].created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="progress-score-grid">
                      {categories.map((cat) => {
                        const score = Number(latestDass[cat] || 0);
                        const severity = getSeverity(cat, score);
                        return (
                          <div className="progress-score-card" key={cat}>
                            <span className="progress-category">{cat}</span>
                            <strong className="progress-score">{score}/42</strong>
                            <span className={`progress-severity ${getSeverityClass(severity)}`}>
                              {severity}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Latest Feature Assessment Card */}
                {latestFeature && (
                  <div className="progress-highlight-box">
                    <div className="progress-highlight-header">
                      <h3>Feature Check-in</h3>
                      <span className="progress-date-text">
                        {new Date(latestFeature.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="progress-ml-summary">
                      <div className="progress-ml-stat">
                        <span>Predicted Stress Level</span>
                        <strong className={`progress-severity large ${getSeverityClass(latestFeature.stress_level)}`}>
                          {latestFeature.stress_level || "Normal"} ({latestFeature.stress_score || 0}%)
                        </strong>
                      </div>
                      {latestFeature.top_concerns?.length > 0 && (
                        <div className="progress-concerns-box">
                          <span>Top Identified Stressors:</span>
                          <div className="progress-badge-group">
                            {latestFeature.top_concerns.map((concern, idx) => (
                              <span className="progress-badge" key={idx}>⚠️ {concern}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* History Table with Tab Switching */}
            <section className="progress-history-section">
              <div className="progress-history-heading">
                <div>
                  <h2>Assessment History</h2>
                  <p>Historical records of your wellness logs</p>
                </div>
                <div className="progress-tab-group">
                  <button
                    className={`progress-tab ${activeTab === "dass" ? "active" : ""}`}
                    onClick={() => setActiveTab("dass")}
                  >
                    DASS-21 ({dassHistory.length})
                  </button>
                  <button
                    className={`progress-tab ${activeTab === "feature" ? "active" : ""}`}
                    onClick={() => setActiveTab("feature")}
                  >
                    Feature Logs ({featureHistory.length})
                  </button>
                </div>
              </div>

              <div className="progress-table-wrapper">
                {activeTab === "dass" ? (
                  <table className="progress-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Depression</th>
                        <th>Anxiety</th>
                        <th>Stress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dassHistory.map((rec) => {
                        const sub = rec.responses?.subscales || {};
                        return (
                          <tr key={rec.id}>
                            <td>{new Date(rec.created_at).toLocaleDateString()}</td>
                            {categories.map((cat) => {
                              const score = Number(sub[cat] || 0);
                              const severity = getSeverity(cat, score);
                              return (
                                <td key={cat}>
                                  <strong>{score}/42</strong>
                                  <span className={`progress-table-severity ${getSeverityClass(severity)}`}>
                                    {severity}
                                  </span>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <table className="progress-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Stress Level</th>
                        <th>Score</th>
                        <th>Top Concerns</th>
                      </tr>
                    </thead>
                    <tbody>
                      {featureHistory.map((rec) => (
                        <tr key={rec.id}>
                          <td>{new Date(rec.created_at).toLocaleDateString()}</td>
                          <td>
                            <span className={`progress-table-severity ${getSeverityClass(rec.stress_level)}`}>
                              {rec.stress_level || "Normal"}
                            </span>
                          </td>
                          <td><strong>{rec.stress_score || 0}%</strong></td>
                          <td>
                            {rec.top_concerns?.length > 0
                              ? rec.top_concerns.join(", ")
                              : "None recorded"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <p className="progress-note">
              Note: DASS-21 and feature predictions are screening indicators, not clinical diagnoses.
              Discuss persistent stress concerns with the Laguna University Guidance Office or a healthcare professional.
            </p>
          </>
        )}

        <div className="progress-actions">
          <button className="progress-btn-back" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}