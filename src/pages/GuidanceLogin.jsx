import React, { useState } from "react";

function GuidanceLogin({ onLogin, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Please enter your email and password.");
      return;
    }

    onLogin();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f5faf8",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "30px 20px",
        fontFamily: '"Segoe UI", Arial, sans-serif',
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          background: "#ffffff",
          borderRadius: "22px",
          padding: "45px",
          boxShadow: "0 15px 40px rgba(20, 80, 70, 0.10)",
        }}
      >
        {/* LOGO */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "35px",
          }}
        >
          <div
            style={{
              fontSize: "30px",
              marginBottom: "8px",
            }}
          >
            🌿
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "22px",
              color: "#173f39",
              letterSpacing: "1px",
            }}
          >
            SMART STRIVE
          </h1>

          <p
            style={{
              marginTop: "8px",
              marginBottom: 0,
              fontSize: "12px",
              color: "#087c66",
              fontWeight: "700",
              letterSpacing: "1.5px",
            }}
          >
            GUIDANCE OFFICE PORTAL
          </p>
        </div>

        {/* TITLE */}
        <div style={{ marginBottom: "25px" }}>
          <h2
            style={{
              margin: "0 0 8px",
              color: "#173f39",
              fontSize: "25px",
            }}
          >
            Welcome Back
          </h2>

          <p
            style={{
              margin: 0,
              color: "#7b8b86",
              fontSize: "13px",
              lineHeight: "1.6",
            }}
          >
            Sign in to access student monitoring and assessment records.
          </p>
        </div>

        {/* EMAIL */}
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#31554e",
          }}
        >
          Email Address
        </label>

        <input
          type="email"
          placeholder="guidance@lagunauniversity.edu.ph"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{
            width: "100%",
            padding: "13px 15px",
            border: "1px solid #d8e5e1",
            borderRadius: "10px",
            outline: "none",
            fontSize: "13px",
            marginBottom: "18px",
          }}
        />

        {/* PASSWORD */}
        <label
          style={{
            display: "block",
            marginBottom: "8px",
            fontSize: "12px",
            fontWeight: "700",
            color: "#31554e",
          }}
        >
          Password
        </label>

        <input
          type="password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            width: "100%",
            padding: "13px 15px",
            border: "1px solid #d8e5e1",
            borderRadius: "10px",
            outline: "none",
            fontSize: "13px",
            marginBottom: "25px",
          }}
        />

        {/* LOGIN */}
        <button
          onClick={handleLogin}
          style={{
            width: "100%",
            border: "none",
            background: "#087c66",
            color: "#ffffff",
            padding: "14px",
            borderRadius: "25px",
            fontSize: "14px",
            fontWeight: "700",
            cursor: "pointer",
          }}
        >
          Log In →
        </button>

        {/* BACK */}
        <button
          onClick={onBack}
          style={{
            display: "block",
            width: "100%",
            marginTop: "18px",
            border: "none",
            background: "transparent",
            color: "#087c66",
            fontSize: "12px",
            fontWeight: "600",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}

export default GuidanceLogin;