import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./Recommendations.css";

const recommendationData = {
  Depression: {
    activities: [
      "Practice mood journaling. Write down your thoughts and feelings.",
      "Try doing activities you enjoy, even for a short time.",
      "Maintain a regular sleep and daily routine.",
      "Reach out to a trusted friend, family member, or guidance counselor."
    ],
    icon: "💚"
  },
  Anxiety: {
    activities: [
      "Practice deep breathing for 3–5 minutes.",
      "Try the 5-4-3-2-1 grounding technique.",
      "Break overwhelming tasks into smaller steps.",
      "Take short breaks when you feel mentally overwhelmed."
    ],
    icon: "🌿"
  },
  Stress: {
    activities: [
      "Create a realistic daily study schedule.",
      "Prioritize urgent academic tasks and deadlines.",
      "Take short breaks between study sessions.",
      "Try stretching, walking, or other relaxing activities."
    ],
    icon: "🌱"
  }
};

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

export default function Recommendations({ score: initialScore, onBack }) {
  const [dassScores, setDassScores] = useState(initialScore || null);
  const [mlAssessment, setMlAssessment] = useState(null);
  // Always start loading as true to avoid initial flash
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUserAssessmentData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        // Fetch DASS scores if not provided in props
        let currentDassScores = initialScore || null;
        if (!initialScore) {
          const { data: dassData } = await supabase
            .from("dass_assessments")
            .select("responses")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(1);

          if (dassData && dassData.length > 0 && dassData[0].responses?.subscales) {
            currentDassScores = dassData[0].responses.subscales;
            setDassScores(currentDassScores);
          }
        }

        // Fetch Feature Assessment ML results
        const { data: featureData } = await supabase
          .from("assessments")
          .select("recommendations, top_concerns, stress_level, stress_score")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (featureData && featureData.length > 0) {
          setMlAssessment(featureData[0]);
        }
      } catch (err) {
        console.error("Error fetching recommendation data:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchUserAssessmentData();
  }, [initialScore]);

  const hasDassScores =
    dassScores &&
    ["Depression", "Anxiety", "Stress"].every(
      (category) =>
        Number.isFinite(Number(dassScores[category])) &&
        Number(dassScores[category]) >= 0 &&
        Number(dassScores[category]) <= 42
    );

  const categories = hasDassScores
    ? ["Depression", "Anxiety", "Stress"].map((category) => ({
        name: category,
        score: Number(dassScores[category]),
        severity: getSeverity(category, Number(dassScores[category]))
      }))
    : [];

  const getSeverityClass = (severity) => {
    if (severity === "Normal" || severity === "Low") return "severity-normal";
    if (severity === "Mild") return "severity-mild";
    if (severity === "Moderate") return "severity-moderate";
    return "severity-severe";
  };

  const hasAnyResults = hasDassScores || (mlAssessment && mlAssessment.recommendations?.length > 0);

  return (
    <div className="rec-page">
      <header className="rec-header">
        <div className="rec-logo">🌿 SMART STRIVE</div>
        <div className="rec-header-text">Personalized Support</div>
      </header>

      <main className="rec-container">
        <p className="rec-eyebrow">YOUR WELL-BEING MATTERS</p>
        <h1 className="rec-title">Coping Recommendations</h1>
        <p className="rec-subtitle">
          Explore helpful activities and strategies based on your assessment results.
        </p>

        {loading ? (
          <section className="rec-empty-card" style={{ padding: "50px 20px", textAlign: "center" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>⌛</div>
            <p style={{ margin: 0, fontSize: "14px", color: "#7B8B86" }}>Loading your recommendations...</p>
          </section>
        ) : !hasAnyResults ? (
          <section className="rec-empty-card">
            <div className="rec-empty-icon">🌱</div>
            <h2>No assessment results yet</h2>
            <p>
              Complete your DASS-21 or Feature Assessment to receive personalized coping recommendations.
            </p>
            <button className="rec-btn-primary" onClick={onBack}>
              Back to Dashboard
            </button>
          </section>
        ) : (
          <>
            {hasDassScores && (
              <section className="rec-summary-card">
                <h2>Your Assessment Summary</h2>
                <p className="rec-summary-subtitle">These are your latest recorded screening scores.</p>
                <div className="rec-score-grid">
                  {categories.map((item) => (
                    <div className="rec-score-card" key={item.name}>
                      <span className="rec-score-name">{item.name}</span>
                      <strong className="rec-score-value">{item.score}/42</strong>
                      <span className={`rec-severity ${getSeverityClass(item.severity)}`}>
                        {item.severity}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {mlAssessment && mlAssessment.recommendations?.length > 0 && (
              <section className="rec-db-card">
                <div className="rec-db-header-row">
                  <h2 className="rec-section-title no-top-margin">🤖 Personalized Action Plan</h2>
                  {mlAssessment.stress_level && (
                    <span className={`rec-severity large ${getSeverityClass(mlAssessment.stress_level)}`}>
                      Stress Level: {mlAssessment.stress_level} ({mlAssessment.stress_score}%)
                    </span>
                  )}
                </div>

                {mlAssessment.top_concerns?.length > 0 && (
                  <div className="rec-feature-group">
                    <span className="rec-feature-label">Identified Stress Factors:</span>
                    <div className="rec-badge-container">
                      {mlAssessment.top_concerns.map((concern, idx) => (
                        <span key={idx} className="rec-feature-badge">
                          ⚠️ {concern}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="rec-section-description">
                  Targeted recommendations based on your latest lifestyle check-in:
                </p>
                <ul className="rec-activity-list">
                  {mlAssessment.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </section>
            )}

            {hasDassScores && (
              <div className="rec-dass-section">
                <h2 className="rec-section-title">Recommended Coping Strategies</h2>
                <p className="rec-section-description">
                  Here are some activities you can try as part of your everyday student wellness routine.
                </p>

                <div className="rec-grid">
                  {categories.map((item) => (
                    <section className="rec-card" key={item.name}>
                      <div className="rec-card-heading">
                        <span className="rec-card-icon">{recommendationData[item.name].icon}</span>
                        <div>
                          <h3>{item.name}</h3>
                          <span className={`rec-severity ${getSeverityClass(item.severity)}`}>
                            {item.severity} Level
                          </span>
                        </div>
                      </div>

                      <p className="rec-card-description">
                        Suggested activities to help you manage {item.name.toLowerCase()} concerns:
                      </p>

                      <ul className="rec-activity-list">
                        {recommendationData[item.name].activities.map((activity, index) => (
                          <li key={index}>{activity}</li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}

            <section className="rec-support-card">
              <h3>💚 Remember, you are not alone.</h3>
              <p>
                These recommendations are general self-help strategies. If you continue experiencing difficulties, consider reaching out to the Laguna University Guidance Office or a qualified mental health professional.
              </p>
            </section>
          </>
        )}

        <div className="rec-actions">
          <button className="rec-btn-back" onClick={onBack}>
            ← Back to Dashboard
          </button>
        </div>
      </main>
    </div>
  );
}