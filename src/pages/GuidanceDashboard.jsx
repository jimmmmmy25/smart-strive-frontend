import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const ML_COLORS = { Low: "#087c66", Moderate: "#d97706", High: "#dc2626" };

const DASS_COLORS = {
  Normal: "#087c66",
  Mild: "#65a30d",
  Moderate: "#d97706",
  Severe: "#dc2626",
  "Extremely Severe": "#991b1b",
};

// Helper to classify DASS Total Score into standard clinical severity bands
function getDassCategory(score) {
  if (score === "N/A" || score === null || score === undefined) {
    return { label: "N/A", color: "#7b8b86", bg: "#f3f4f6" };
  }
  const numericScore = Number(score);
  if (numericScore <= 14) return { label: "Normal", color: DASS_COLORS.Normal, bg: "#e8f5f0" };
  if (numericScore <= 18) return { label: "Mild", color: DASS_COLORS.Mild, bg: "#f7fee7" };
  if (numericScore <= 25) return { label: "Moderate", color: DASS_COLORS.Moderate, bg: "#fef3c7" };
  if (numericScore <= 33) return { label: "Severe", color: DASS_COLORS.Severe, bg: "#fee2e2" };
  return { label: "Extremely Severe", color: DASS_COLORS["Extremely Severe"], bg: "#fce7f3" };
}

export default function GuidanceDashboard() {
  const [search, setSearch] = useState("");
  const [selectedStudent, setSelectedStudent] = useState(null);
  
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchGuidanceData() {
      try {
        setLoading(true);
        
        // 1. Fetch all lifestyle assessments ordered chronologically for trajectories
        const { data: assessData, error: assessError } = await supabase
          .from('assessments')
          .select('user_id, stress_score, stress_level, probabilities, top_concerns, lifestyle_features, created_at')
          .order('created_at', { ascending: true });

        if (assessError) throw assessError;

        // 2. Fetch student profiles (first_name, last_name, course, student_id, email)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, course, student_id, email');

        if (profileError) console.warn("Profile fetch warning:", profileError.message);

        // 3. SAFE DASS FETCH: Fetch clinical DASS-21 total scores mapped by user_id
        const { data: dassData, error: dassError } = await supabase
          .from('dass_assessments')
          .select('user_id, total_score, assessment_type, created_at')
          .order('created_at', { ascending: true });

        if (dassError) console.warn("DASS fetch warning:", dassError.message);

        // Map latest DASS total score by user_id
        const dassMap = {};
        if (dassData) {
          dassData.forEach(d => {
            dassMap[d.user_id] = d.total_score;
          });
        }

        // Map profiles by user id
        const profileMap = {};
        if (profileData) {
          profileData.forEach(p => {
            profileMap[p.id] = p;
          });
        }

        // 4. Group lifestyle assessments by user_id
        const grouped = {};
        assessData.forEach(row => {
          if (!grouped[row.user_id]) grouped[row.user_id] = [];
          grouped[row.user_id].push(row);
        });

        // 5. FORMATTED STUDENTS MAPPING
        const formattedStudents = Object.keys(grouped).map(userId => {
          const userHistory = grouped[userId];
          const latest = userHistory[userHistory.length - 1];
          const profile = profileMap[userId] || {};

          const fullName = profile.first_name && profile.last_name 
            ? `${profile.first_name} ${profile.last_name}` 
            : `Student (${userId.substring(0, 6)})`;

          // Format history for Line Chart trajectory
          const history = userHistory.map(rec => ({
            date: new Date(rec.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            score: rec.stress_score || 0
          }));

          // Normalize stress level casing
          const rawLevel = latest.stress_level || "Moderate";
          const stressLevel = rawLevel.charAt(0).toUpperCase() + rawLevel.slice(1).toLowerCase();

          return {
            id: userId,
            student_id: profile.student_id || "N/A",
            name: fullName,
            email: profile.email || "No email listed",
            course: profile.course || "Unassigned",
            stress_score: latest.stress_score || 0,
            dass_total_score: dassMap[userId] ?? "N/A", // Safe reference to clinical score
            stress_level: stressLevel === "Normal" ? "Low" : stressLevel,
            probabilities: latest.probabilities || null,
            top_concerns: latest.top_concerns || [],
            created_at: latest.created_at,
            history
          };
        });

        setStudents(formattedStudents);
      } catch (err) {
        console.error("Failed to load guidance data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGuidanceData();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.course.toLowerCase().includes(search.toLowerCase()) ||
    s.student_id.toLowerCase().includes(search.toLowerCase())
  );

  // Filter top critical risk students (High ML Risk OR Severe/Ex-Severe DASS)
  const criticalStudents = useMemo(() => {
    return students.filter(s => {
      const dassCat = getDassCategory(s.dass_total_score);
      const isHighMl = s.stress_level === "High" || s.stress_score >= 66;
      const isHighDass = dassCat.label === "Severe" || dassCat.label === "Extremely Severe";
      return isHighMl || isHighDass;
    }).sort((a, b) => b.stress_score - a.stress_score);
  }, [students]);

  const stats = useMemo(() => {
    let low = 0, mod = 0, high = 0;
    students.forEach(s => {
      if (s.stress_level === "Low") low++;
      else if (s.stress_level === "Moderate") mod++;
      else high++;
    });
    return [
      { name: "Low Stress", value: low, color: ML_COLORS.Low },
      { name: "Moderate", value: mod, color: ML_COLORS.Moderate },
      { name: "High Risk", value: high, color: ML_COLORS.High }
    ];
  }, [students]);

  const courseStats = useMemo(() => {
    const map = {};
    students.forEach(s => {
      const c = s.course;
      if (!map[c]) map[c] = { name: c, High: 0, Moderate: 0, Low: 0 };
      if (s.stress_level === "High" || s.stress_level === "Severe") map[c].High++;
      else if (s.stress_level === "Moderate") map[c].Moderate++;
      else map[c].Low++;
    });
    return Object.values(map);
  }, [students]);

  if (loading) {
    return (
      <div style={{...styles.page, display: "grid", placeItems: "center", height: "100vh"}}>
        <h2>Loading Live Database Records...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{...styles.page, padding: "40px"}}>
        <h2>Error Loading Dashboard</h2>
        <p style={{color: "red"}}>{error}</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0 }}>SMART STRIVE</h1>
            <p style={{ margin: "5px 0 0 0", color: "#7b8b86" }}>Guidance Counselor Portal — Live Data</p>
          </div>
          <button style={styles.btnLogout} onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {!selectedStudent ? (
        <main style={styles.mainGrid}>
          <div style={styles.analyticsCol}>
            {/* KPI STAT CARDS */}
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Total Monitored</span>
                <h2 style={styles.kpiValue}>{students.length}</h2>
              </div>
              <div style={{...styles.kpiCard, borderBottom: `4px solid ${ML_COLORS.High}`}}>
                <span style={styles.kpiLabel}>Critical / High Risk</span>
                <h2 style={styles.kpiValue}>{stats[2].value}</h2>
              </div>
              <div style={{...styles.kpiCard, borderBottom: `4px solid ${ML_COLORS.Moderate}`}}>
                <span style={styles.kpiLabel}>Moderate Stress</span>
                <h2 style={styles.kpiValue}>{stats[1].value}</h2>
              </div>
            </div>

            {/* ANALYTICS CHARTS */}
            <div style={styles.chartGrid}>
              <div style={styles.chartCard}>
                <h3>Campus Distribution</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={stats} innerRadius={55} outerRadius={75} paddingAngle={5} dataKey="value">
                      {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={styles.chartCard}>
                <h3>Stress by Program</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={courseStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="High" stackId="a" fill={ML_COLORS.High} />
                    <Bar dataKey="Moderate" stackId="a" fill={ML_COLORS.Moderate} />
                    <Bar dataKey="Low" stackId="a" fill={ML_COLORS.Low} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* CRITICAL RISK PRIORITY TABLE */}
            <div style={styles.tableCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <div>
                  <h3 style={{ margin: 0, color: "#991b1b", display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>🚨</span> Recent Critical Risk Students Priority List
                  </h3>
                  <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#666" }}>
                    Students requiring urgent outreach based on high ML lifestyle predictions or severe DASS scores.
                  </p>
                </div>
                <span style={{ fontSize: "12px", fontWeight: "bold", background: "#fee2e2", color: "#dc2626", padding: "4px 10px", borderRadius: "12px" }}>
                  {criticalStudents.length} Flagged Case{criticalStudents.length === 1 ? "" : "s"}
                </span>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeaderRow}>
                      <th style={styles.th}>Student No.</th>
                      <th style={styles.th}>Name</th>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>Clinical DASS Score</th>
                      <th style={styles.th}>ML Feature Assessment Score</th>
                      <th style={styles.th}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {criticalStudents.map((student) => {
                      const dassCat = getDassCategory(student.dass_total_score);
                      return (
                        <tr key={student.id} style={styles.tableBodyRow}>
                          <td style={styles.td}>
                            <strong>{student.student_id}</strong>
                          </td>
                          <td style={styles.td}>
                            <div>
                              <strong style={{ display: "block", color: "#123F35" }}>{student.name}</strong>
                              <span style={{ fontSize: "11px", color: "#7b8b86" }}>{student.course}</span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <span style={{ fontSize: "12px", color: "#4b5563" }}>{student.email}</span>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "14px", color: dassCat.color }}>
                                {student.dass_total_score} <span style={{ fontSize: "11px", color: "#7b8b86" }}>/ 42</span>
                              </strong>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "bold",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                backgroundColor: dassCat.bg,
                                color: dassCat.color,
                                border: `1px solid ${dassCat.color}40`
                              }}>
                                {dassCat.label}
                              </span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <strong style={{ fontSize: "14px", color: ML_COLORS[student.stress_level] || ML_COLORS.High }}>
                                {student.stress_score} <span style={{ fontSize: "11px", color: "#7b8b86" }}>/ 100</span>
                              </strong>
                              <span style={{
                                fontSize: "10px",
                                fontWeight: "bold",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                backgroundColor: `${ML_COLORS[student.stress_level] || ML_COLORS.High}18`,
                                color: ML_COLORS[student.stress_level] || ML_COLORS.High,
                                border: `1px solid ${ML_COLORS[student.stress_level] || ML_COLORS.High}40`
                              }}>
                                {student.stress_level}
                              </span>
                            </div>
                          </td>
                          <td style={styles.td}>
                            <button
                              style={styles.btnDanger}
                              onClick={() => setSelectedStudent(student)}
                            >
                              Review Case →
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {criticalStudents.length === 0 && (
                      <tr>
                        <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#087c66", fontWeight: "bold" }}>
                          ✓ No critical high-risk cases currently detected across campus.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* STUDENT ROSTER SIDEBAR */}
          <div style={styles.rosterCard}>
            <h3>Student Roster</h3>
            <input
              style={styles.input}
              placeholder="Search by name, ID, or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={styles.studentList}>
              {filteredStudents.map((student) => {
                const dassCat = getDassCategory(student.dass_total_score);
                return (
                  <div key={student.id} style={styles.studentItem}>
                    <div>
                      <strong style={{ display: "block" }}>{student.name}</strong>
                      <span style={{ fontSize: "11px", color: "#666" }}>
                        {student.course} • ID: {student.student_id}
                      </span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      {/* DASS Severity Badge */}
                      <span style={{
                        ...styles.badge,
                        backgroundColor: dassCat.bg,
                        color: dassCat.color,
                        border: `1px solid ${dassCat.color}40`
                      }} title="DASS-21 Clinical Severity">
                        DASS: {dassCat.label}
                      </span>
                      {/* ML Stress Badge */}
                      <span style={{
                        ...styles.badge, 
                        backgroundColor: `${ML_COLORS[student.stress_level] || ML_COLORS.Low}18`, 
                        color: ML_COLORS[student.stress_level] || ML_COLORS.Low
                      }} title="ML Lifestyle Stress Level">
                        ML: {student.stress_level}
                      </span>
                      <button style={styles.btnPrimary} onClick={() => setSelectedStudent(student)}>
                        Review
                      </button>
                    </div>
                  </div>
                );
              })}
              {filteredStudents.length === 0 && (
                <p style={{color: "#666", textAlign: "center", marginTop: "20px"}}>No students found.</p>
              )}
            </div>
          </div>
        </main>
      ) : (
        /* INDIVIDUAL STUDENT PROFILE REVIEW VIEW */
        <main style={styles.profileView}>
          <button style={styles.btnSecondary} onClick={() => setSelectedStudent(null)}>
            ← Back to Dashboard
          </button>
          
          <header style={styles.profileHeader}>
            <div>
              <h2 style={{ margin: 0 }}>{selectedStudent.name}</h2>
              <p style={{ margin: "5px 0 0 0", color: "#666" }}>
                {selectedStudent.course} • Student ID: {selectedStudent.student_id} • Email: {selectedStudent.email}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
              {/* DASS Score Column with Dynamic Severity Colors */}
              {(() => {
                const dassCat = getDassCategory(selectedStudent.dass_total_score);
                return (
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: "11px", color: "#666", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>
                      Clinical DASS Score
                    </span>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: "6px" }}>
                      <strong style={{ fontSize: "28px", color: dassCat.color }}>
                        {selectedStudent.dass_total_score}
                      </strong>
                      <span style={{ fontSize: "12px", color: "#666" }}>/ 42</span>
                    </div>
                    <span style={{
                      display: "inline-block",
                      marginTop: "4px",
                      padding: "2px 8px",
                      borderRadius: "10px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      backgroundColor: dassCat.bg,
                      color: dassCat.color,
                      border: `1px solid ${dassCat.color}40`
                    }}>
                      {dassCat.label.toUpperCase()}
                    </span>
                  </div>
                );
              })()}

              {/* ML Lifestyle Score Column */}
              <div style={{ textAlign: "right", borderLeft: "1px solid #e1ebe8", paddingLeft: "25px" }}>
                <span style={{ fontSize: "11px", color: "#666", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>
                  ML Lifestyle Score
                </span>
                <strong style={{ fontSize: "28px", color: ML_COLORS[selectedStudent.stress_level] || ML_COLORS.Low }}>
                  {selectedStudent.stress_score}/100
                </strong>
                <span style={{
                  display: "block",
                  marginTop: "4px",
                  fontSize: "10px",
                  fontWeight: "bold",
                  color: ML_COLORS[selectedStudent.stress_level] || ML_COLORS.Low
                }}>
                  {selectedStudent.stress_level.toUpperCase()}
                </span>
              </div>
            </div>
          </header>

          <div style={styles.chartGrid}>
            <div style={styles.chartCard}>
              <h3>Stress Trajectory (Assessment History)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={selectedStudent.history}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke={ML_COLORS[selectedStudent.stress_level] || ML_COLORS.Low} 
                    strokeWidth={3} 
                    dot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
              <p style={{ fontSize: "13px", color: "#666", textAlign: "center" }}>
                Tracks historical stress progression across submissions from Supabase.
              </p>
            </div>

            {/* Model Output Breakdown (Probabilities & Top Concerns) */}
            <div style={styles.chartCard}>
              <h3>Model Prediction Confidence</h3>
              <p style={{ fontSize: "12px", color: "#666", marginBottom: "15px" }}>
                Random Forest classification probabilities.
              </p>
              {selectedStudent.probabilities ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "15px" }}>
                  {Object.entries(selectedStudent.probabilities).map(([className, prob]) => {
                    const percentage = Math.round(Number(prob) * 100);
                    const barColor = className === "High" ? ML_COLORS.High : className === "Moderate" ? ML_COLORS.Moderate : ML_COLORS.Low;
                    return (
                      <div key={className}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px", fontSize: "14px", fontWeight: 600 }}>
                          <span>{className}</span>
                          <span>{percentage}%</span>
                        </div>
                        <div style={{ height: "8px", background: "#e8f0ec", borderRadius: "4px", overflow: "hidden" }}>
                          <div style={{ width: `${percentage}%`, height: "100%", background: barColor, borderRadius: "4px" }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#666", textAlign: "center", marginTop: "40px" }}>No probability data recorded.</p>
              )}

              {selectedStudent.top_concerns && selectedStudent.top_concerns.length > 0 && (
                <div style={{ marginTop: "20px" }}>
                  <strong style={{ fontSize: "13px" }}>Top Concerns Flagged:</strong>
                  <ul style={{ margin: "5px 0 0 0", paddingLeft: "20px", fontSize: "13px", color: "#555" }}>
                    {selectedStudent.top_concerns.map((concern, idx) => (
                      <li key={idx}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

const styles = {
  page: { background: "#f4f9f7", minHeight: "100vh", color: "#294d46", fontFamily: '"Segoe UI", sans-serif' },
  header: { padding: "20px 40px", background: "#fff", borderBottom: "1px solid #e1ebe8" },
  mainGrid: { display: "grid", gridTemplateColumns: "2.3fr 1fr", gap: "20px", padding: "20px 40px" },
  analyticsCol: { display: "flex", flexDirection: "column", gap: "20px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" },
  kpiCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  kpiLabel: { fontSize: "13px", color: "#7b8b86", textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { fontSize: "36px", margin: "10px 0 0 0" },
  chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  chartCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  tableCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  table: { width: "100%", borderCollapse: "collapse", textAlign: "left" },
  tableHeaderRow: { background: "#f8faf9", borderBottom: "2px solid #e1ebe8" },
  th: { padding: "12px 14px", fontSize: "12px", color: "#4a5568", textTransform: "uppercase", fontWeight: "700" },
  tableBodyRow: { borderBottom: "1px solid #edf2f7" },
  td: { padding: "12px 14px", verticalAlign: "middle" },
  rosterCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", height: "calc(100vh - 120px)", overflowY: "auto" },
  input: { padding: "12px", width: "calc(100% - 24px)", marginBottom: "15px", border: "1px solid #e1ebe8", borderRadius: "8px", background: "#f9fcfb" },
  studentList: { display: "flex", flexDirection: "column", gap: "10px" },
  studentItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #e1ebe8", borderRadius: "8px" },
  badge: { padding: "3px 8px", borderRadius: "14px", fontSize: "10px", fontWeight: "bold" },
  btnPrimary: { background: "#087c66", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  btnDanger: { background: "#dc2626", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" },
  btnSecondary: { background: "transparent", color: "#087c66", border: "1px solid #e1ebe8", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" },
  btnLogout: { background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  profileView: { padding: "20px 40px", maxWidth: "1200px", margin: "0 auto" },
  profileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "30px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }
};