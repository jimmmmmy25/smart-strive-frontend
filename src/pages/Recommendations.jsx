import React from "react";
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
return ranges[category].find(([max]) => score <= max)?.[1] || "Normal";
};
function Recommendations({ score, onBack, onLogout }) {
const hasScores =
score &&
["Depression", "Anxiety", "Stress"].every(
category =>
Number.isFinite(Number(score[category])) &&
Number(score[category]) >= 0 &&
Number(score[category]) <= 42
);
const categories = hasScores
? ["Depression", "Anxiety", "Stress"].map(category => ({
name: category,
score: Number(score[category]),
severity: getSeverity(category, Number(score[category]))
}))
: [];
const severityColor = severity => {
if (severity === "Normal") return "#087c66";
if (severity === "Mild") return "#65a30d";
if (severity === "Moderate") return "#d97706";
return "#dc2626";
};
return (
  <div style={styles.page}>
    <header style={styles.header}>
      <div style={styles.logo}>🌿 SMART STRIVE</div>
      <div style={styles.headerText}>Personalized Support</div>
    </header>
<main style={styles.container}>
    <p style={styles.eyebrow}>YOUR WELL-BEING MATTERS</p>
    <h1 style={styles.title}>Coping Recommendations</h1>
    <p style={styles.subtitle}>
      Explore helpful activities and strategies based on your
      DASS-21 assessment results.
    </p>

    {!hasScores ? (
      <section style={styles.emptyCard}>
        <div style={{ fontSize: 38 }}>🌱</div>
        <h2>No assessment results yet</h2>
        <p>
          Complete your DASS-21 assessment to receive
          personalized coping recommendations.
        </p>
        <button style={styles.primaryButton} onClick={onBack}>
          Back to Dashboard
        </button>
      </section>
    ) : (
      <>
        <section style={styles.summary}>
          <h2>Your Assessment Summary</h2>
          <p>These are your latest recorded screening scores.</p>
          <div style={styles.scoreGrid}>
            {categories.map(item => (
              <div style={styles.scoreCard} key={item.name}>
                <span>{item.name}</span>
                <strong>{item.score}/42</strong>
                <span
                  style={{
                    ...styles.severity,
                    color: severityColor(item.severity)
                  }}
                >
                  {item.severity}
                </span>
              </div>
            ))}
          </div>
        </section>

        <h2 style={styles.sectionTitle}>
          Recommended Coping Strategies
        </h2>
        <p style={styles.sectionDescription}>
          Here are some activities you can try as part of your
          everyday student wellness routine.
        </p>

        <div style={styles.recommendationGrid}>
          {categories.map(item => (
            <section style={styles.recommendationCard} key={item.name}>
              <div style={styles.cardHeading}>
            <span style={styles.icon}>
                  {recommendationData[item.name].icon}
                </span>
                <div>
                  <h3>{item.name}</h3>
                  <span
                    style={{
                      ...styles.severity,
                      color: severityColor(item.severity)
                    }}
                  >
                    {item.severity} Level
                  </span>
                </div>
              </div>

              <p style={styles.cardDescription}>
                Suggested activities to help you manage
                {` ${item.name.toLowerCase()}`} concerns:
              </p>

              <ul style={styles.activityList}>
                {recommendationData[item.name].activities.map(
                  (activity, index) => (
                    <li key={index}>{activity}</li>
                  )
                )}
              </ul>
            </section>
          ))}
        </div>

        <section style={styles.supportCard}>
          <h3>💚 Remember, you are not alone.</h3>
          <p>
            These recommendations are general self-help strategies.
            If you continue experiencing difficulties, consider
            reaching out to the Laguna University Guidance Office
            or a qualified mental health professional.
          </p>
        </section>
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
background: "#ffffff",
borderBottom: "1px solid #e1ebe8",
display: "flex",
alignItems: "center",
justifyContent: "space-between"
},
logo: {
fontWeight: 800,
letterSpacing: 1,
color: "#073f38"
},
headerText: {
color: "#7b8b86",
fontSize: 13
},
container: {
maxWidth: 1100,
margin: "35px auto",
padding: "0 22px 40px"
},
eyebrow: {
color: "#087c66",
fontSize: 12,
fontWeight: 800,
letterSpacing: 1.5
},
title: {
color: "#073f38",
fontSize: 30,
margin: "8px 0"
},
subtitle: {
color: "#7b8b86",
lineHeight: 1.6
},
summary: {
background: "#ffffff",
padding: 24,
borderRadius: 16,
border: "1px solid #e1ebe8",
marginTop: 28
},
scoreGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
gap: 14,
marginTop: 18
},
scoreCard: {
background: "#f4f9f7",
borderRadius: 12,
padding: 18,
display: "flex",
flexDirection: "column",
gap: 8
},
severity: {
fontSize: 12,
fontWeight: 800
},
sectionTitle: {
marginTop: 35,
color: "#073f38"
},
sectionDescription: {
color: "#7b8b86",
lineHeight: 1.6
},
recommendationGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
gap: 18,
marginTop: 20
},
recommendationCard: {
background: "#ffffff",
padding: 22,
borderRadius: 16,
border: "1px solid #e1ebe8"
},
cardHeading: {
display: "flex",
alignItems: "center",
gap: 12
},
icon: {
fontSize: 28
},
cardDescription: {
color: "#7b8b86",
fontSize: 14,
lineHeight: 1.6,
marginTop: 18
},
activityList: {
paddingLeft: 20,
lineHeight: 1.9,
fontSize: 14
},
supportCard: {
background: "#e8f5f1",
padding: 22,
borderRadius: 14,
marginTop: 25,
lineHeight: 1.7
},
actions: {
display: "flex",
gap: 12,
flexWrap: "wrap",
marginTop: 25
},
primaryButton: {
background: "#087c66",
color: "#ffffff",
border: "none",
padding: "12px 20px",
borderRadius: 8,
cursor: "pointer"
},
backButton: {
background: "#ffffff",
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
},
emptyCard: {
background: "#ffffff",
padding: 35,
borderRadius: 16,
textAlign: "center",
marginTop: 30,
border: "1px solid #e1ebe8"
}
};
export default Recommendations;   
             