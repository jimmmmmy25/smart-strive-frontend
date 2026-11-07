import React from "react";

const categories = {
  Depression: {
    ranges: [
      [9, "Normal"],
      [13, "Mild"],
      [20, "Moderate"],
      [27, "Severe"],
      [42, "Extremely Severe"],
    ],
    description: "Mood, motivation, and interest-related responses.",
    color: "#7c65c9",
  },
  Anxiety: {
    ranges: [
      [7, "Normal"],
      [9, "Mild"],
      [14, "Moderate"],
      [19, "Severe"],
      [42, "Extremely Severe"],
    ],
    description: "Anxiety, fear, and physical arousal-related responses.",
    color: "#d18b28",
  },
  Stress: {
    ranges: [
      [14, "Normal"],
      [18, "Mild"],
      [25, "Moderate"],
      [33, "Severe"],
      [42, "Extremely Severe"],
    ],
    description: "Tension, irritability, and difficulty relaxing.",
    color: "#16836a",
  },
};

function getSeverity(category, score) {
  return (
    categories[category].ranges.find(([maximum]) => score <= maximum)?.[1] ||
    "Invalid score"
  );
}

function ResultCard({ category, value }) {
  const level = getSeverity(category, value);
  const color = {
    Normal: "#087c66",
    Mild: "#92700c",
    Moderate: "#d97706",
    Severe: "#dc2626",
    "Extremely Severe": "#991b1b",
  }[level];

  return (
    <article style={styles.card}>
      <div
        style={{
          ...styles.categoryIcon,
          background: `${categories[category].color}18`,
          color: categories[category].color,
        }}
      >
        {category === "Depression" ? "♡" : category === "Anxiety" ? "◌" : "⌁"}
      </div>

      <h2 style={styles.categoryTitle}>{category}</h2>

      <div style={styles.score}>
        {value}
        <span style={styles.outOf}> / 42</span>
      </div>

      <span
        style={{
          ...styles.badge,
          color,
          background: `${color}18`,
        }}
      >
        {level}
      </span>

      <div style={styles.progressTrack}>
        <div
          style={{
            height: "100%",
            width: `${(value / 42) * 100}%`,
            background: color,
            borderRadius: 20,
          }}
        />
      </div>

      <p style={styles.description}>{categories[category].description}</p>
    </article>
  );
}

export default function Result({ score, onBack, onRecommendations }) {
  const categoryNames = ["Depression", "Anxiety", "Stress"];

  // 1. Check if the payload comes from the 13-Feature Lifestyle ML Model
  const isMlResult =
    score !== null &&
    typeof score === "object" &&
    ("stress_level" in score || "stress_score" in score);

  // 2. Check if the payload comes from the DASS-21 Baseline Assessment
  const validDassScores =
    score !== null &&
    typeof score === "object" &&
    categoryNames.every(
      (category) =>
        Number.isInteger(score[category]) &&
        score[category] >= 0 &&
        score[category] <= 42
    );

  // Render 13-Feature ML Prediction Result View
  if (isMlResult) {
    const levelColor = {
      Low: "#087c66",
      Normal: "#087c66",
      Moderate: "#d97706",
      High: "#dc2626",
      Severe: "#dc2626",
    }[score.stress_level] || "#087c66";

    return (
      <div style={styles.page}>
        <header style={styles.header}>
          <strong style={styles.logo}>
            SMART <span>STRIVE</span>
          </strong>
          <span style={styles.headerLabel}>Assessment Results</span>
        </header>

        <main style={styles.container}>
          <section style={styles.intro}>
            <span style={styles.eyebrow}>ASSESSMENT COMPLETED</span>
            <h1>13-Feature Lifestyle Assessment Results</h1>
            <p>
              Your lifestyle feature inputs have been analyzed by the SMART
              STRIVE stress indicator model.
            </p>
          </section>

          <section style={styles.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={styles.categoryTitle}>Predicted Stress Level</h2>
                <span
                  style={{
                    ...styles.badge,
                    color: levelColor,
                    background: `${levelColor}18`,
                    fontSize: 16,
                    padding: "8px 16px",
                  }}
                >
                  {score.stress_level}
                </span>
              </div>
              <div style={styles.score}>
                {score.stress_score}
                <span style={styles.outOf}> / 100</span>
              </div>
            </div>

            {score.top_concerns && score.top_concerns.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <strong>Key Areas of Concern:</strong>
                <ul style={{ marginTop: 8, paddingLeft: 20, color: "#294d46" }}>
                  {score.top_concerns.map((concern, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>{concern}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section style={styles.notice}>
            <strong>Important reminder</strong>
            <p>{score.disclaimer || "This result is an indicator of possible stress concerns and is not a medical diagnosis."}</p>
          </section>

          <section style={styles.actions}>
            <button style={styles.secondaryButton} onClick={onBack}>
              ← Back to Dashboard
            </button>
            <button style={styles.primaryButton} onClick={onRecommendations || onBack}>
              View Recommendations →
            </button>
          </section>
        </main>
      </div>
    );
  }

  // Render DASS-21 Results View or Error Card
  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <strong style={styles.logo}>
          SMART <span>STRIVE</span>
        </strong>
        <span style={styles.headerLabel}>Assessment Results</span>
      </header>

      <main style={styles.container}>
        <section style={styles.intro}>
          <span style={styles.eyebrow}>ASSESSMENT COMPLETED</span>
          <h1>Your DASS-21 Results</h1>
          <p>
            Your results are divided into three separate categories. Each category has its own score and severity interpretation.
          </p>
        </section>

        {!validDassScores ? (
          <section style={styles.errorCard}>
            <h2>Three assessment scores were not received.</h2>
            <p>
              The Result page expects a score object containing Depression, Anxiety, and Stress. The current data may still be coming from the old assessment flow.
            </p>
            <button style={styles.primaryButton} onClick={onBack}>
              Back to Dashboard
            </button>
          </section>
        ) : (
          <>
            <section style={styles.grid}>
              {categoryNames.map((category) => (
                <ResultCard
                  key={category}
                  category={category}
                  value={score[category]}
                />
              ))}
            </section>
            <section style={styles.notice}>
              <strong>Important reminder</strong>
              <p>
                DASS-21 is a screening instrument, not a diagnostic assessment. These results should not be used to diagnose depression, anxiety, or stress-related disorders. Students who need support may contact the university Guidance Office or a qualified professional.
              </p>
            </section>

            <section style={styles.actions}>
              <button style={styles.secondaryButton} onClick={onBack}>
                ← Back to Dashboard
              </button>

              <button
                style={styles.primaryButton}
                onClick={onRecommendations || onBack}
              >
                View Recommendations →
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#f4f9f7",
    color: "#294d46",
    fontFamily: '"Segoe UI", Arial, sans-serif',
  },
  header: {
    background: "#fff",
    padding: "20px 5%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #e1ebe8",
    flexWrap: "wrap",
    gap: 12,
  },
  logo: {
    fontSize: 20,
    fontWeight: 900,
    letterSpacing: 1,
  },
  headerLabel: {
    color: "#7b8b86",
    fontSize: 13,
  },
  container: {
    width: "min(1050px, calc(100% - 32px))",
    margin: "35px auto",
  },
  intro: {
    marginBottom: 28,
  },
  eyebrow: {
    color: "#087c66",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))",
    gap: 18,
  },
  card: {
    background: "#fff",
    border: "1px solid #e1ebe8",
    borderRadius: 17,
    padding: 24,
    boxShadow: "0 8px 24px rgba(28,76,59,.04)",
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    fontSize: 25,
  },
  categoryTitle: {
    fontSize: 20,
    margin: "16px 0 8px",
  },
  score: {
    fontSize: 42,
    fontWeight: 800,
    margin: "12px 0",
  },
  outOf: {
    fontSize: 14,
    color: "#7b8b86",
  },
  badge: {
    display: "inline-block",
    padding: "7px 12px",
    borderRadius: 20,
    fontWeight: 800,
    fontSize: 12,
  },
  progressTrack: {
    height: 8,
    background: "#e8f0ec",
    borderRadius: 20,
    overflow: "hidden",
    marginTop: 20,
  },
  description: {
    color: "#7b8b86",
    fontSize: 13,
    lineHeight: 1.7,
  },
  notice: {
    marginTop: 22,
    padding: 18,
    background: "#e8f5f1",
    borderRadius: 12,
    fontSize: 13,
    lineHeight: 1.8,
  },
  errorCard: {
    padding: 24,
    background: "#fff7d6",
    borderRadius: 14,
    lineHeight: 1.7,
  },
  actions: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 25,
  },
  primaryButton: {
    background: "#087c66",
    color: "#fff",
    border: "none",
    padding: "13px 18px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: 700,
  },
  secondaryButton: {
    background: "#fff",
    border: "1px solid #d8e7e0",
    padding: "13px 18px",
    borderRadius: 10,
    cursor: "pointer",
  },
};