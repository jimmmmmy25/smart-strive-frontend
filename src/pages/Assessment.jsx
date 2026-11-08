import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./Assessment.css";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const featureQuestions = [
  {
    id: "study_load",
    category: "Problem",
    scale: 5,
    en: "In the past week, how heavy was your academic workload (deadlines, quizzes, requirements)?",
    tl: "Nitong nakaraang linggo, gaano kabigat ang iyong gawaing pang-akademiko (deadlines, quizzes, requirements)?",
  },
  {
    id: "future_career_concerns",
    category: "Problem",
    scale: 5,
    en: "How much do you worry about your career after graduation?",
    tl: "Gaano ka nag-aalala sa iyong magiging karera pagkatapos ng pag-aaral?",
  },
  {
    id: "peer_pressure",
    category: "Problem",
    scale: 5,
    en: "How much pressure do you feel from classmates or friends (competition, expectations)?",
    tl: "Gaano kalaking pressure ang nararamdaman mo mula sa mga kaklase o kaibigan (kompetisyon, inaasahan)?",
  },
  {
    id: "bullying",
    category: "Problem",
    scale: 5,
    en: "How often have you experienced bullying or harassment at school or online?",
    tl: "Gaano kadalas kang nakaranas ng pambu-bully o panliligalig sa paaralan o online?",
  },
  {
    id: "extracurricular_activities",
    category: "Problem",
    scale: 5,
    en: "How much do your extracurricular activities or other commitments add to your pressure?",
    tl: "Gaano nakadaragdag sa pressure mo ang iyong mga extracurricular na gawain o responsibilidad?",
  },
  {
    id: "noise_level",
    category: "Problem",
    scale: 5,
    en: "How noisy is the place where you usually study or rest?",
    tl: "Gaano kaingay ang lugar kung saan ka karaniwang nag-aaral o nagpapahinga?",
  },
  {
    id: "sleep_quality",
    category: "Better",
    scale: 5,
    en: "How would you rate your sleep quality this past week?",
    tl: "Paano mo ire-rate ang kalidad ng iyong tulog nitong nakaraang linggo?",
  },
  {
    id: "academic_performance",
    category: "Better",
    scale: 5,
    en: "How satisfied are you with your academic performance this semester?",
    tl: "Gaano ka kasiya sa iyong performance sa akademiko ngayong semestre?",
  },
  {
    id: "teacher_student_relationship",
    category: "Better",
    scale: 5,
    en: "How would you describe your relationship with your professors?",
    tl: "Paano mo ilalarawan ang ugnayan mo sa iyong mga propesor?",
  },
  {
    id: "basic_needs",
    category: "Better",
    scale: 5,
    en: "How well are your basic needs met (food, fare, school expenses)?",
    tl: "Gaano natutugunan ang iyong mga pangunahing pangangailangan (pagkain, pamasahe, gastusin sa pag-aaral)?",
  },
  {
    id: "living_conditions",
    category: "Better",
    scale: 5,
    en: "How suitable is your home or dorm for studying and resting?",
    tl: "Gaano angkop ang iyong tinitirhan para sa pag-aaral at papahinga?",
  },
  {
    id: "safety",
    category: "Better",
    scale: 5,
    en: "How safe do you feel in your daily surroundings?",
    tl: "Gaano ka ligtas sa iyong araw-araw na kapaligiran?",
  },
  {
    id: "social_support",
    category: "Support",
    scale: 3,
    en: "How much support can you get from people close to you when you are stressed?",
    tl: "Gaano karaming suporta ang nakukuha mo mula sa mga taong malapit sa iyo kapag ikaw ay stressed?",
  },
];

export default function Assessment({ onBack, onComplete }) {
  const [answers, setAnswers] = useState(() => {
    try {
      const saved = sessionStorage.getItem("smartStriveAssessmentDraftAnswers");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [current, setCurrent] = useState(() => {
    try {
      const saved = sessionStorage.getItem("smartStriveAssessmentDraftStep");
      return saved ? Number(saved) : 0;
    } catch {
      return 0;
    }
  });

  const [acknowledgedCategories, setAcknowledgedCategories] = useState(() => {
    try {
      const saved = sessionStorage.getItem("smartStriveAcknowledgedCategories");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const totalQuestions = featureQuestions.length;
  const currentItem = featureQuestions[current];
  const currentCategory = currentItem.category;

  const showIntro = !acknowledgedCategories.includes(currentCategory);

  // Warm up FastAPI backend silently in the background on mount
  useEffect(() => {
    fetch(`${API}/health`).catch(() => {});
  }, []);

  useEffect(() => {
    sessionStorage.setItem("smartStriveAssessmentDraftAnswers", JSON.stringify(answers));
    sessionStorage.setItem("smartStriveAssessmentDraftStep", current.toString());
    sessionStorage.setItem("smartStriveAcknowledgedCategories", JSON.stringify(acknowledgedCategories));
  }, [answers, current, acknowledgedCategories]);

  async function submit(finalAnswers) {
    setSubmitting(true);
    setError("");
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Please log in again.");

      // Run DASS fetch and FastAPI prediction in parallel
      const dassPromise = supabase
        .from("dass_assessments")
        .select("responses")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      const apiPromise = fetch(`${API}/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: user.id, features: finalAnswers }),
      });

      const [latestDassRes, res] = await Promise.all([dassPromise, apiPromise]);

      if (!res.ok) throw new Error("The prediction service is unavailable.");
      const r = await res.json();

      let dass7Array = null;
      const latestDass = latestDassRes.data;
      if (latestDass && latestDass.length > 0 && latestDass[0].responses?.answers) {
        const allAnswers = latestDass[0].responses.answers;
        const dass7Indices = [0, 5, 7, 10, 11, 13, 17];
        dass7Array = dass7Indices.map((idx) => allAnswers[idx]);
      }

      const weekly = r.stress_level !== "Low" || r.stress_score >= 33;
      const nextDue = new Date(Date.now() + (weekly ? 7 : 30) * 86400000).toISOString();
      const dbStressLevel = r.stress_level 
        ? r.stress_level.charAt(0).toUpperCase() + r.stress_level.slice(1).toLowerCase()
        : "Moderate";

      const { error: dbError } = await supabase.from("assessments").insert([{
        user_id: user.id,
        stress_level: dbStressLevel,
        confidence: r.confidence,
        stress_score: r.stress_score,
        probabilities: r.probabilities,
        top_concerns: r.top_concerns,
        recommendations: r.recommendations,
        high_risk_flag: r.high_risk_flag,
        lifestyle_features: finalAnswers,
        dass7_scores: dass7Array,
        next_due: nextDue,
      }]);
      if (dbError) throw dbError;

      sessionStorage.removeItem("smartStriveAssessmentDraftAnswers");
      sessionStorage.removeItem("smartStriveAssessmentDraftStep");
      sessionStorage.removeItem("smartStriveAcknowledgedCategories");

      const history = JSON.parse(localStorage.getItem("smartStriveAssessmentHistory") || "[]");
      localStorage.setItem("smartStriveAssessmentHistory", JSON.stringify([{
        id: Date.now(),
        date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        stressLevel: r.stress_level,
        stressScore: r.stress_score,
        topConcerns: r.top_concerns,
        recommendations: r.recommendations,
        features: finalAnswers,
      }, ...history]));

      if (typeof onComplete === "function") onComplete(r);
    } catch (err) {
      console.error("Failed to submit assessment:", err);
      setError("Failed to save assessment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function handleSelect(val) {
    const updated = { ...answers, [currentItem.id]: val };
    setAnswers(updated);
    setError("");
  }

  function handleDismissIntro() {
    setAcknowledgedCategories((prev) => {
      if (!prev.includes(currentCategory)) {
        return [...prev, currentCategory];
      }
      return prev;
    });
  }

  function next() {
    if (answers[currentItem.id] === undefined) {
      setError("Please select an answer before proceeding.");
      return;
    }

    setError("");
    if (current === totalQuestions - 1) {
      submit(answers);
    } else {
      setCurrent((prev) => prev + 1);
    }
  }

  function prev() {
    if (current > 0) {
      setCurrent((prev) => prev - 1);
      setError("");
    }
  }

  function getHintText(category, scale, val) {
    if (category === "Problem") {
      const hints = [
        "0 - None / Did not experience at all",
        "1 - Slight / Rarely an issue",
        "2 - Moderate / Noticeable sometimes",
        "3 - Significant / Frequently an issue",
        "4 - Severe / Very heavy impact",
        "5 - Extremely Severe / Constant crisis"
      ];
      return hints[val];
    } else if (category === "Better") {
      const hints = [
        "0 - Very poor / Extremely dissatisfied",
        "1 - Poor / Needs major improvement",
        "2 - Fair / Adequate but mixed",
        "3 - Good / Generally satisfactory",
        "4 - Very good / High quality",
        "5 - Excellent / Optimal condition"
      ];
      return hints[val];
    } else {
      const hints = [
        "0 - None / No support available",
        "1 - A little / Rarely available",
        "2 - Some / Moderately supportive",
        "3 - A lot / Highly reliable support"
      ];
      return hints[val];
    }
  }

  const progress = (Object.keys(answers).length / totalQuestions) * 100;

  return (
    <div className="assessment-page">
      <header className="assessment-header">
        <button className="assessment-back" onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <strong>
          SMART <span className="brand-accent">STRIVE</span>
        </strong>
        <span className="assessment-label">13-Feature Wellness Assessment</span>
      </header>

      <main className="assessment-container">
        <span className="assessment-eyebrow">STUDENT WELL-BEING & LIFESTYLE</span>
        <h1>Comprehensive Feature Assessment</h1>
        <p className="assessment-description">
          Please rate each factor based on your experience over the past week. Direct raw inputs are recorded securely.
        </p>

        {showIntro ? (
          <section className="assessment-card category-intro-card" style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: "40px", marginBottom: "15px" }}>
              {currentCategory === "Problem" && "⚠️"}
              {currentCategory === "Better" && "🌟"}
              {currentCategory === "Support" && "🤝"}
            </div>
            <span className="assessment-number" style={{ letterSpacing: "1px", marginBottom: "10px", display: "block" }}>
              SECTION: {currentCategory.toUpperCase()} FACTORS
            </span>
            <h2 style={{ fontSize: "24px", color: "#123F35", marginBottom: "15px" }}>
              {currentCategory === "Problem" && "Academic & Environmental Stressors"}
              {currentCategory === "Better" && "Personal Well-being & Living Quality"}
              {currentCategory === "Support" && "Social Support Systems"}
            </h2>
            <p style={{ fontSize: "14px", color: "#4A5568", lineHeight: "1.6", maxWidth: "550px", margin: "0 auto 25px" }}>
              {currentCategory === "Problem" && "For this next set of questions, higher numbers mean MORE of a problem or higher stress impact (0 = No issue, 5 = Extreme issue)."}
              {currentCategory === "Better" && "For this next set of questions, higher numbers mean BETTER conditions or higher satisfaction (0 = Very poor, 5 = Excellent)."}
              {currentCategory === "Support" && "For this final question, rate how much structural backing you receive from your surroundings (0 = None, 3 = A lot)."}
            </p>
            <button
              className="assessment-btn-next"
              style={{ margin: "0 auto", padding: "12px 30px" }}
              onClick={handleDismissIntro}
            >
              Continue to Questions →
            </button>
          </section>
        ) : (
          <section className="assessment-card">
            <div className="assessment-progress-row">
              <span>Factor {current + 1} of {totalQuestions}</span>
              <strong>{Object.keys(answers).length}/{totalQuestions} answered</strong>
            </div>

            <div className="assessment-track">
              <div className="assessment-fill" style={{ width: `${progress}%` }} />
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px", flexWrap: "wrap", gap: "8px" }}>
              <p className="assessment-number" style={{ margin: 0 }}>
                FEATURE: {currentItem.id.toUpperCase()}
              </p>
              <span style={{ 
                fontSize: "10px", 
                fontWeight: "700", 
                padding: "4px 10px", 
                borderRadius: "12px", 
                background: currentItem.category === "Problem" ? "#FEE2E2" : currentItem.category === "Better" ? "#E8F5F0" : "#EDF3FF",
                color: currentItem.category === "Problem" ? "#DC2626" : currentItem.category === "Better" ? "#087C66" : "#4267A1"
              }}>
                {currentItem.category === "Problem" && "Higher Score = More Problem"}
                {currentItem.category === "Better" && "Higher Score = Better Condition"}
                {currentItem.category === "Support" && "Support Scale (0-3)"}
              </span>
            </div>
            
            <h2 className="assessment-question" style={{ marginTop: "12px" }}>{currentItem.en}</h2>
            <p className="assessment-question-tl">{currentItem.tl}</p>

            <div className="assessment-options">
              {Array.from({ length: currentItem.scale + 1 }, (_, val) => {
                const isSelected = answers[currentItem.id] === val;
                return (
                  <button
                    key={val}
                    disabled={submitting}
                    onClick={() => handleSelect(val)}
                    className={`assessment-option ${isSelected ? "selected" : ""}`}
                  >
                    <span className="option-bullet">{isSelected ? "●" : "○"}</span>
                    <div className="option-text-group">
                      <span className="option-value">{val}</span>
                      <span className="option-hint">
                        {getHintText(currentItem.category, currentItem.scale, val)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && <p className="assessment-error">⚠️ {error}</p>}

            <div className="assessment-actions">
              <button
                className="assessment-btn-previous"
                disabled={current === 0 || submitting}
                onClick={prev}
              >
                Previous
              </button>

              <button
                className={`assessment-btn-next ${submitting ? "submitting" : ""}`}
                onClick={next}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="btn-spinner" />
                    <span>Analyzing Answers...</span>
                  </>
                ) : current === totalQuestions - 1 ? (
                  "Submit Assessment →"
                ) : (
                  "Next →"
                )}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}