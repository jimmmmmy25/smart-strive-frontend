import React, { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./Register.css";

// Helper function to capitalize the first letter of each word
const capitalizeWords = (str) => {
  if (!str) return "";
  return str
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

// Helper function to auto-format Student ID as 111-1111
const formatStudentId = (value) => {
  // Strip all non-numeric characters
  const digits = value.replace(/\D/g, "").slice(0, 7);
  
  if (digits.length > 3) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }
  return digits;
};

function Register({ onBack, onLoginClick }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 State: Account Security & Privacy Consent
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // Early Duplicate Email Detection States
  const [isEmailDuplicate, setIsEmailDuplicate] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Step 2 State: Student Profile Details
  const [studentId, setStudentId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [course, setCourse] = useState("");
  const [yearLevel, setYearLevel] = useState("");

  // Early Duplicate Student ID Detection States
  const [isStudentIdDuplicate, setIsStudentIdDuplicate] = useState(false);
  const [checkingStudentId, setCheckingStudentId] = useState(false);

  // 1. Debounced real-time Email check
  useEffect(() => {
    const trimmedEmail = email.trim().toLowerCase();
    const isValidEmailFormat = /\S+@\S+\.\S+/.test(trimmedEmail);

    if (!trimmedEmail || !isValidEmailFormat) {
      setIsEmailDuplicate(false);
      setCheckingEmail(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const { data, error } = await supabase.rpc("check_email_exists", {
          email_input: trimmedEmail,
        });

        if (error) console.error("Error checking email:", error);
        setIsEmailDuplicate(Boolean(data));
      } catch (err) {
        console.error("Email check failed:", err);
      } finally {
        setCheckingEmail(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  // 2. Debounced real-time Student ID check (Strict 111-1111 format)
  useEffect(() => {
    const trimmedId = studentId.trim();
    const isIdFormatValid = /^\d{3}-\d{4}$/.test(trimmedId);

    if (!isIdFormatValid) {
      setIsStudentIdDuplicate(false);
      setCheckingStudentId(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingStudentId(true);
      try {
        const { data, error } = await supabase.rpc("check_student_id_exists", {
          student_id_input: trimmedId,
        });

        if (error) console.error("Error checking student ID:", error);
        setIsStudentIdDuplicate(Boolean(data));
      } catch (err) {
        console.error("Student ID check failed:", err);
      } finally {
        setCheckingStudentId(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [studentId]);

  const handleStudentIdChange = (e) => {
    const formatted = formatStudentId(e.target.value);
    setStudentId(formatted);
  };

  const passwordCriteria = {
    length: password.length >= 6,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    specialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);
  const isStudentIdValid = /^\d{3}-\d{4}$/.test(studentId.trim());

  const handleNextToStep2 = (e) => {
    e.preventDefault();
    if (isEmailDuplicate) {
      alert("This email address is already registered. Please use another email or log in.");
      return;
    }
    if (!agreedToTerms) {
      alert("You must agree to the Data Privacy & Informed Consent Policy to continue.");
      return;
    }
    if (!isPasswordValid || password !== confirmPassword) {
      alert("Please ensure your password meets all criteria and matches.");
      return;
    }
    setStep(2);
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    if (!isStudentIdValid) {
      alert("Please enter a valid Student ID format (e.g. 111-1111).");
      return;
    }
    if (isStudentIdDuplicate) {
      alert("This Student ID Number is already registered to another account.");
      return;
    }
    if (!studentId || !firstName || !lastName || !course || !yearLevel || !dob) {
      alert("Please complete all required student details.");
      return;
    }

    setLoading(true);

    const formattedFirstName = capitalizeWords(firstName);
    const formattedLastName = capitalizeWords(lastName);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            student_id: studentId.trim(),
            first_name: formattedFirstName,
            last_name: formattedLastName,
            course: course,
            year_level: yearLevel,
            date_of_birth: dob,
            privacy_consented: true,
            consented_at: new Date().toISOString(),
          },
        },
      });

      if (authError) {
        if (authError.message.includes("database error") || authError.message.includes("unique")) {
          alert("Registration failed: Student ID or Email is already registered.");
          setLoading(false);
          return;
        }
        throw authError;
      }

      alert(
        "Registration successful! Please check your email inbox to confirm your account before logging in."
      );
      onLoginClick();

    } catch (error) {
      alert("Registration failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page-centered">
      <div className="bg-watermark-logo">🌿</div>

      <div className="register-card">
        <div className="register-header">
          <button
            className="back-link"
            onClick={step === 1 ? onBack : () => setStep(1)}
          >
            ← {step === 1 ? "Back to Home" : "Previous Step"}
          </button>
          <h1>Join SMART STRIVE</h1>
          <p className="step-indicator">
            Step {step} of 2: {step === 1 ? "Account Security" : "Student Details"}
          </p>
        </div>

        {/* STEP 1: ACCOUNT & PRIVACY CONSENT */}
        {step === 1 && (
          <form onSubmit={handleNextToStep2} className="fade-in">
            <label>Email</label>
            <input
              type="email"
              placeholder="e.g. student@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={isEmailDuplicate ? "input-error" : ""}
              required
            />

            {checkingEmail && <span className="email-status-checking">Checking email availability...</span>}
            {isEmailDuplicate && (
              <span className="email-error-warning">
                ⚠️ This email address is already registered.
              </span>
            )}

            <label>Password</label>
            <input
              type="password"
              placeholder="Create strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {password && (
              <div className="password-indicator-container">
                <div className="password-indicator-grid">
                  <span className={passwordCriteria.length ? "valid" : "invalid"}>
                    {passwordCriteria.length ? "✓" : "○"} Min 6 characters
                  </span>
                  <span className={passwordCriteria.uppercase ? "valid" : "invalid"}>
                    {passwordCriteria.uppercase ? "✓" : "○"} 1 Uppercase (A-Z)
                  </span>
                  <span className={passwordCriteria.number ? "valid" : "invalid"}>
                    {passwordCriteria.number ? "✓" : "○"} 1 Number (0-9)
                  </span>
                  <span className={passwordCriteria.specialChar ? "valid" : "invalid"}>
                    {passwordCriteria.specialChar ? "✓" : "○"} 1 Special character
                  </span>
                </div>
              </div>
            )}

            <label>Confirm Password</label>
            <input
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            {confirmPassword && password !== confirmPassword && (
              <span className="password-match-warning">
                ⚠️ Passwords do not match
              </span>
            )}

            <div className="consent-box">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  required
                />
                <span className="consent-text">
                  I agree to the <strong>Data Privacy & Informed Consent Policy</strong>. 
                  I understand that SMART STRIVE is an internal non-diagnostic screening tool for student wellness monitoring and Guidance support.
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="login-submit"
              disabled={
                isEmailDuplicate ||
                checkingEmail ||
                !isPasswordValid ||
                password !== confirmPassword ||
                !agreedToTerms
              }
              style={{ marginTop: "18px" }}
            >
              Continue to Student Details →
            </button>
          </form>
        )}

        {/* STEP 2: STUDENT DETAILS */}
        {step === 2 && (
          <form onSubmit={handleFinalSubmit} className="fade-in">
            <label>Student ID Number (Format: 111-1111)</label>
            <input
              type="text"
              placeholder="e.g. 123-4567"
              maxLength="8"
              value={studentId}
              onChange={handleStudentIdChange}
              className={isStudentIdDuplicate ? "input-error" : ""}
              required
            />

            {checkingStudentId && <span className="email-status-checking">Checking Student ID availability...</span>}
            {isStudentIdDuplicate && (
              <span className="email-error-warning">
                ⚠️ This Student ID is already registered.
              </span>
            )}
            {studentId && !isStudentIdValid && (
              <span className="email-error-warning">
                ⚠️ Format must be 3 digits, a hyphen, and 4 digits (e.g. 123-4567).
              </span>
            )}

            <div className="input-row">
              <div className="flex-1">
                <label>First Name</label>
                <input
                  type="text"
                  placeholder="Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="flex-1">
                <label>Last Name</label>
                <input
                  type="text"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>

            <label>Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
            />

            <label>Degree Program / Course</label>
            <select
              value={course}
              onChange={(e) => setCourse(e.target.value)}
              required
            >
              <option value="" disabled>Select course</option>
              <option value="BS Computer Science">BS Computer Science</option>
              <option value="BS Information Technology">BS Information Technology</option>
              <option value="BS Psychology">BS Psychology</option>
              <option value="BS Business Administration">BS Business Administration</option>
            </select>

            <label>Year Level</label>
            <select
              value={yearLevel}
              onChange={(e) => setYearLevel(e.target.value)}
              required
            >
              <option value="" disabled>Select year level</option>
              <option value="1st Year">1st Year</option>
              <option value="2nd Year">2nd Year</option>
              <option value="3rd Year">3rd Year</option>
              <option value="4th Year">4th Year</option>
            </select>

            <button
              type="submit"
              className="login-submit"
              disabled={loading || !isStudentIdValid || isStudentIdDuplicate || checkingStudentId}
              style={{ marginTop: "20px" }}
            >
              {loading ? "Registering Account..." : "Complete Registration"}
            </button>
          </form>
        )}

        <p className="signup-text">
          Already registered?{" "}
          <button type="button" onClick={onLoginClick}>
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}

export default Register;