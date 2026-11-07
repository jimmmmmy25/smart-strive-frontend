import { AppShell } from "./Dashboard.jsx";

export default function About({ navigate }) {
  return <AppShell active="about" navigate={navigate}>
    <div className="about-hero panel"><div className="big-leaf">🌿</div><h1>SMART STRIVE</h1><b>Your well-being matters.</b><p>SMART STRIVE is a student stress monitoring system designed to help you understand your stress levels, identify key factors, and receive personalized recommendations for a healthier and more balanced life.</p></div>
    <section className="panel how"><h2>How It Works</h2><div className="how-grid">{[["1","Take a stress assessment."],["2","Your responses are analyzed using our ML model."],["3","View your stress level, key factors, and personalized recommendations."],["4","Your data is securely stored in our database."]].map(([n,t])=><div key={n}><span>{n}</span><p>{t}</p></div>)}</div></section>
  </AppShell>;
}