import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./DassAssessment.css";

const questions = [
  ["I found it hard to wind down.", "Stress"],
  ["I was aware of dryness of my mouth.", "Anxiety"],
  ["I couldn't seem to experience any positive feeling at all.", "Depression"],
  ["I experienced breathing difficulty in the absence of physical exertion.", "Anxiety"],
  ["I found it difficult to work up the initiative to do things.", "Depression"],
  ["I tended to over-react to situations.", "Stress"],
  ["I experienced trembling, such as in my hands.", "Anxiety"],
  ["I felt that I was using a lot of nervous energy.", "Stress"],
  ["I was worried about situations in which I might panic and make a fool of myself.", "Anxiety"],
  ["I felt that I had nothing to look forward to.", "Depression"],
  ["I found myself getting agitated.", "Stress"],
  ["I found it difficult to relax.", "Stress"],
  ["I felt down-hearted and blue.", "Depression"],
  ["I was intolerant of anything that kept me from getting on with what I was doing.", "Stress"],
  ["I felt I was close to panic.", "Anxiety"],
  ["I was unable to become enthusiastic about anything.", "Depression"],
  ["I felt I wasn't worth much as a person.", "Depression"],
  ["I felt that I was rather touchy.", "Stress"],
  ["I was aware of the action of my heart in the absence of physical exertion.", "Anxiety"],
  ["I felt scared without any good reason.", "Anxiety"],
  ["I felt that life was meaningless.", "Depression"],
];

const choices = [
  "Did not apply to me at all",
  "Applied to me to some degree, or some of the time",
  "Applied to me to a considerable degree, or a good part of the time",
  "Applied to me very much, or most of the time",
];

const choiceHints = [
  "Score 0: Never / Not applicable",
  "Score 1: Mild / Sometimes",
  "Score 2: Moderate / Good part of the time",
  "Score 3: Severe / Most of the time",
];

export default function DassAssessment({ onBack, onComplete }) {
  const [answers, setAnswers] = useState(() => {
    try {
      const s = sessionStorage.getItem("smartStriveDassDraft");
      return s ? JSON.parse(s) : Array(21).fill(null);
    } catch {
      return Array(21).fill(null);
    }
  });

  const [current, setCurrent] = useState(() => Number(sessionStorage.getItem("smartStriveDassStep")) || 0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    sessionStorage.setItem("smartStriveDassDraft", JSON.stringify(answers));
    sessionStorage.setItem("smartStriveDassStep", String(current));
  }, [answers, current]);

  function calculateScores() {
    const rawScores = { Depression: 0, Anxiety: 0, Stress: 0 };
    questions.forEach(([_, category], index) => {
      rawScores[category] += Number(answers[index]) || 0;
    });

    const dass7Indices = [0, 5, 7, 10, 11, 13, 17];
    const rawDass7Score = dass7Indices.reduce((sum, idx) => sum + (Number(answers[idx]) || 0), 0);

    return {
      subscales: {
        Depression: rawScores.Depression * 2,
        Anxiety: rawScores.Anxiety * 2,
        Stress: rawScores.Stress * 2,
      },
      rawTotal: answers.reduce((sum, val) => sum + (Number(val) || 0), 0),
      baseline7Score: rawDass7Score,
    };
  }

  async function submit() {
    if (answers.some((answer) => answer === null)) {
      setError("Please answer all 21 questions before submitting.");
      return;
    }

    setSubmitting(true);
    setError("");

    const calculated = calculateScores();

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("User authentication required to submit baseline assessment.");
      }

      const { error: dbError } = await supabase.from("dass_assessments").insert([
        {
          user_id: user.id,
          assessment_type: "DASS-7 Baseline",
          total_score: calculated.rawTotal,
          baseline_7_score: calculated.baseline7Score,
          responses: {
            answers: answers.map(Number),
            subscales: calculated.subscales,
          },
        },
      ]);

      if (dbError) throw dbError;

      sessionStorage.removeItem("smartStriveDassDraft");
      sessionStorage.removeItem("smartStriveDassStep");

      if (typeof onComplete === "function") {
        onComplete(calculated.subscales);
      }
    } catch (err) {
      console.error("Failed to save DASS baseline assessment:", err);
      setError("Failed to save assessment: " + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function next() {
    if (answers[current] === null) {
      setError("Please select an answer first.");
      return;
    }

    setError("");

    if (current === 20) {
      submit();
    } else {
      setCurrent((previous) => previous + 1);
    }
  }

  const progress = (answers.filter((answer) => answer !== null).length / 21) * 100;

  return (
    <div className="dass-assessment-page">
      <header className="dass-assessment-header">
        <button className="dass-assessment-back" onClick={onBack} disabled={submitting}>
          ← Back
        </button>
        <strong>
          SMART <span className="brand-accent">STRIVE</span>
        </strong>
        <span className="dass-assessment-label">DASS-7 Baseline Screening</span>
      </header>

      <main className="dass-assessment-container">
        <span className="dass-assessment-eyebrow">STUDENT WELL-BEING</span>
        <h1>DASS-7 Baseline Assessment</h1>
        <p className="dass-assessment-description">
          Please indicate how much each statement applied to you over the past week to establish your baseline.
        </p>

        <div className="dass-assessment-notice">
          This baseline screening helps us personalize your dashboard metrics.
        </div>

        <section className="dass-assessment-card">
          <div className="dass-assessment-progress-row">
            <span>Question {current + 1} of 21</span>
            <strong>{answers.filter((a) => a !== null).length}/21 answered</strong>
          </div>

          <div className="dass-assessment-track">
            <div className="dass-assessment-fill" style={{ width: `${progress}%` }} />
          </div>

          <p className="dass-assessment-number">
            QUESTION {String(current + 1).padStart(2, "0")}
          </p>
          <h2 className="dass-assessment-question">{questions[current][0]}</h2>

          <div className="dass-assessment-options">
            {choices.map((choice, index) => {
              const isSelected = answers[current] === index;
              return (
                <button
                  key={index}
                  disabled={submitting}
                  onClick={() => {
                    const updated = [...answers];
                    updated[current] = index;
                    setAnswers(updated);
                    setError("");
                  }}
                  className={`dass-assessment-option ${isSelected ? "selected" : ""}`}
                >
                  <span className="option-bullet">{isSelected ? "●" : "○"}</span>
                  <div className="option-text-group" style={{ display: "flex", flexDirection: "column", textAlign: "left", width: "100%" }}>
                    <span style={{ fontWeight: "600" }}>{choice}</span>
                    <span style={{ fontSize: "11px", color: "#7B8B86", marginTop: "3px" }}>{choiceHints[index]}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {error && <p className="dass-assessment-error">⚠️ {error}</p>}

          <div className="dass-assessment-actions">
            <button
              className="dass-assessment-btn-previous"
              disabled={current === 0 || submitting}
              onClick={() => {
                setCurrent(current - 1);
                setError("");
              }}
            >
              Previous
            </button>

            <button
              className="dass-assessment-btn-next"
              onClick={next}
              disabled={submitting}
            >
              {submitting
                ? "Submitting..."
                : current === 20
                ? "Complete Baseline"
                : "Next →"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}