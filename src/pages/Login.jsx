import React, { useState } from "react";
import { supabase } from "../services/supabaseClient";
import "./Login.css";

function Login({ onBack, onLogin, onSignUp }) {
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  
  // State for inline UI error note
  const [errorMessage, setErrorMessage] = useState("");

  // 1. Manual Login via Supabase
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMessage(""); // Clear previous errors

    if (!emailInput || !password) {
      setErrorMessage("Please enter both your email address and password.");
      return;
    }

    setLoading(true);

    try {
      // Authenticate with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: emailInput.trim(),
        password: password,
      });

      if (authError) {
        const errMsg = authError.message.toLowerCase();

        if (errMsg.includes("invalid login credentials")) {
          // Check if email exists in database to give precise inline UI note
          const { data: emailExists } = await supabase.rpc("check_email_exists", {
            email_input: emailInput.trim(),
          });

          if (emailExists === false) {
            setErrorMessage("No registered account found with this email address. Please sign up first.");
          } else {
            setErrorMessage("Incorrect password. Please double-check your password and try again.");
          }
          setLoading(false);
          return;
        }

        throw authError;
      }

      // Safely fetch user profile using maybeSingle()
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, first_name, last_name")
        .eq("id", authData.user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      // Extract user details
      const userMeta = authData.user.user_metadata || {};
      const userRole = profile?.role || userMeta.role || "student";
      const firstName = profile?.first_name || userMeta.first_name || "Student";

      // Role Check for Guidance/Admin access
      if (role === "admin" && userRole !== "guidance") {
        setErrorMessage("Access Denied: You do not have Guidance Office privileges.");
        setLoading(false);
        return;
      }

      // Cache user info locally for dashboard UI
      const userProfile = {
        first_name: firstName,
        last_name: profile?.last_name || userMeta.last_name || "",
        role: userRole,
      };
      localStorage.setItem("userProfile", JSON.stringify(userProfile));

      // Route to App Dashboard based on confirmed role
      const finalRole = userRole === "guidance" ? "admin" : "student";
      onLogin(finalRole);

    } catch (error) {
      setErrorMessage("Login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Google OAuth Login
  const handleGoogleLogin = async () => {
    setErrorMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) setErrorMessage("Google login failed: " + error.message);
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <span>🌿</span>
          <div>
            <strong>SMART STRIVE</strong>
            <small>Your well-being matters.</small>
          </div>
        </div>

        <button className="back-button" onClick={onBack}>
          ← Back
        </button>

        <div className="login-message">
          <h1>
            Take care of your mind,
            <br />
            one step at a time.
          </h1>
          <p>Understand yourself.</p>
          <p>Track your progress.</p>
          <p>Discover personalized support.</p>
        </div>
      </div>

      <div className="login-right">
        <div className="login-card">
          <div className="login-logo">🌿</div>
          <h1>Welcome back!</h1>
          <p className="login-subtitle">Log in to continue your journey.</p>

          {/* ROLE SELECTION */}
          <div className="role-section">
            <p className="role-title">I am logging in as:</p>
            <div className="role-options">
              {/* STUDENT */}
              <button
                type="button"
                className={`role-button ${role === "student" ? "active" : ""}`}
                onClick={() => {
                  setRole("student");
                  setErrorMessage("");
                }}
              >
                🎓
                <span>
                  <strong>Student</strong>
                  <small>Student account</small>
                </span>
              </button>

              {/* GUIDANCE / ADMIN */}
              <button
                type="button"
                className={`role-button ${role === "admin" ? "active" : ""}`}
                onClick={() => {
                  setRole("admin");
                  setErrorMessage("");
                }}
              >
                🧑‍💼
                <span>
                  <strong>Guidance / Admin</strong>
                  <small>Guidance Office</small>
                </span>
              </button>
            </div>
          </div>

          {/* INLINE UI ERROR BANNER */}
          {errorMessage && (
            <div className="login-error-banner fade-in">
              <span>⚠️ {errorMessage}</span>
            </div>
          )}

          {/* LOGIN FORM */}
          <form onSubmit={handleLogin}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="Enter your registered email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              className={errorMessage ? "input-field-error" : ""}
              required
            />

            <label>Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (errorMessage) setErrorMessage("");
              }}
              className={errorMessage ? "input-field-error" : ""}
              required
            />

            <div className="login-options">
              <label className="remember">
                <input type="checkbox" />
                Remember me
              </label>
              <button type="button" className="forgot-password">
                Forgot password?
              </button>
            </div>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? "Signing in..." : "Log In"}
            </button>
          </form>

          <div className="login-divider">
            <span>or</span>
          </div>

          <button type="button" className="google-button" onClick={handleGoogleLogin}>
            <span>G</span>
            Continue with Google
          </button>
          
          <p className="signup-text">
            Don't have an account?
            <button type="button" onClick={onSignUp}>
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;