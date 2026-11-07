import React, { useState, useEffect } from "react";
import { supabase } from "./services/supabaseClient";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Assessment from "./pages/Assessment";
import DassAssessment from "./pages/DassAssessment";
import Result from "./pages/Result";
import Recommendations from "./pages/Recommendations";
import Progress from "./pages/Progress";
import Profile from "./pages/Profile";
import GuidanceDashboard from "./pages/GuidanceDashboard";
import "./App.css";

function App() {
  // Initialize page from sessionStorage so refreshes preserve your current route
  const [page, setPage] = useState(() => {
    return sessionStorage.getItem("smartStriveCurrentPage") || "landing";
  });
  const [score, setScore] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Helper to update state and persist route changes in session storage
  const changePage = (newPage) => {
    setPage(newPage);
    sessionStorage.setItem("smartStriveCurrentPage", newPage);
  };

  // Check for an active Supabase session on load, and listen for auth changes
  useEffect(() => {
    // Only move the user to the dashboard if they are on a public page.
    // Supabase can also emit SIGNED_IN when the browser tab regains focus
    // (e.g. after alt-tab); without this guard that would throw the student
    // out of the assessment they were taking.
    const goToDashboardIfPublic = () => {
      setPage((currentPage) => {
        if (["landing", "login", "register"].includes(currentPage)) {
          sessionStorage.setItem("smartStriveCurrentPage", "dashboard");
          return "dashboard";
        }
        return currentPage;
      });
    };

    async function checkUserSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          goToDashboardIfPublic();
        } else {
          changePage("landing");
        }
      } catch (err) {
        console.error("Session check error:", err);
      } finally {
        setLoadingSession(false);
      }
    }

    checkUserSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      // console.log("auth event:", event);   // uncomment to see what fires on alt-tab
      if (event === "SIGNED_IN" && session) {
        goToDashboardIfPublic();
      } else if (event === "SIGNED_OUT") {
        sessionStorage.removeItem("smartStriveCurrentPage");
        setPage("landing");
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (loadingSession) {
    return null;
  }

  // LANDING PAGE
  if (page === "landing") {
    return (
      <div className="landing-page">
        <nav className="navbar">
          <div className="logo">
            <span>🌿</span>
            <span>SMART STRIVE</span>
          </div>

          <div className="nav-links">
            <a href="#about">About</a>
            <a href="#features">Features</a>
            <a href="#support">Support</a>
          </div>

          <div className="nav-buttons">
            <button
              className="login-nav"
              onClick={() => changePage("login")}
            >
              Log In
            </button>

            <button
              className="signup-nav"
              onClick={() => changePage("register")}
            >
              Sign Up
            </button>
          </div>
        </nav>

        <section className="hero-section">
          <div className="hero-text">
            <p className="small-title">
              STUDENT WELLNESS SYSTEM
            </p>

            <h1>
              Your well-being
              <br />
              matters.
            </h1>

            <h2>Monitor. Understand. Improve.</h2>

            <p className="hero-description">
              A student stress monitoring system designed to help you
              understand your well-being, identify possible concerns,
              and discover personalized coping strategies.
            </p>

            <button
              className="get-started-btn"
              onClick={() => changePage("register")}
            >
              Get Started →
            </button>

            <p className="already-account">
              Already have an account?{" "}
              <button onClick={() => changePage("login")}>
                Log In
              </button>
            </p>
          </div>

          <div className="hero-image">
            <img
              src="/laguna-university.jpg.jpg"
              alt="Laguna University"
            />
          </div>
        </section>
      </div>
    );
  }

  // LOGIN PAGE
  if (page === "login") {
    return (
      <Login
        onLogin={(role) => {
          if (role === "admin") {
            changePage("guidance-dashboard");
          } else {
            changePage("dashboard");
          }
        }}
        onBack={() => changePage("landing")}
        onSignUp={() => changePage("register")}
      />
    );
  }

  // REGISTER PAGE
  if (page === "register") {
    return (
      <Register
        onBack={() => changePage("landing")}
        onLoginClick={() => changePage("login")}
      />
    );
  }

  // STUDENT DASHBOARD
  if (page === "dashboard") {
    return (
      <Dashboard
        onNavigate={(nextPage) => changePage(nextPage)}
        onLogout={async () => {
          await supabase.auth.signOut();
          sessionStorage.removeItem("smartStriveCurrentPage");
          changePage("landing");
        }}
      />
    );
  }

  // DASS-7 BASELINE ASSESSMENT (WRITES TO dass_assessments)
  if (page === "dassAssessment") {
    return (
      <DassAssessment
        onBack={() => changePage("dashboard")}
        onComplete={(baselineScores) => {
          console.log("APP RECEIVED DASS BASELINE SCORES:", baselineScores);
          localStorage.setItem("smartStriveBaselineCompleted", "true");
          changePage("dashboard");
        }}
      />
    );
  }

  // 13-FEATURE ASSESSMENT (WRITES TO assessments TABLE)
  if (page === "assessment") {
    return (
      <Assessment
        onBack={() => changePage("dashboard")}
        onComplete={(result) => {
          // Assessment.jsx already saved the real result (database + local history).
          // Keep the model output so the Result and Recommendations pages can use it.
          setScore(result);

          changePage("result");
        }}
      />
    );
  }

  // ASSESSMENT RESULT
  if (page === "result") {
    return (
      <Result
        score={score}
        onBack={() => changePage("dashboard")}
        onRecommendations={() => changePage("recommendations")}
      />
    );
  }

  // GUIDANCE DASHBOARD
  if (page === "guidance-dashboard") {
    return (
      <GuidanceDashboard
        onLogout={async () => {
          await supabase.auth.signOut();
          sessionStorage.removeItem("smartStriveCurrentPage");
          changePage("landing");
        }}
      />
    );
  }

  // RECOMMENDATIONS
  if (page === "recommendations") {
    return (
      <Recommendations
        score={score}
        onBack={() => changePage("dashboard")}
        onLogout={async () => {
          await supabase.auth.signOut();
          sessionStorage.removeItem("smartStriveCurrentPage");
          changePage("landing");
        }}
      />
    );
  }

  // PROGRESS
  if (page === "progress") {
    return (
      <Progress
        onBack={() => changePage("dashboard")}
        onLogout={async () => {
          await supabase.auth.signOut();
          sessionStorage.removeItem("smartStriveCurrentPage");
          changePage("landing");
        }}
      />
    );
  }

  // PROFILE
  if (page === "profile") {
    return (
      <Profile
        onBack={() => changePage("dashboard")}
        onLogout={async () => {
          await supabase.auth.signOut();
          sessionStorage.removeItem("smartStriveCurrentPage");
          changePage("landing");
        }}
      />
    );
  }

  return null;
}

export default App;