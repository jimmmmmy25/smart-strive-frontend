import React, { useState, useMemo, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = { Low: "#087c66", Moderate: "#d97706", High: "#dc2626" };

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

        // 2. Fetch student profiles (first_name, last_name, course, student_id)
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, course, student_id');

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
            course: profile.course || "Unassigned",
            stress_score: latest.stress_score || 0,
            dass_total_score: dassMap[userId] ?? "N/A", // Safe reference to clinical score
            stress_level: stressLevel === "Normal" ? "Low" : stressLevel,
            probabilities: latest.probabilities || null,
            top_concerns: latest.top_concerns || [],
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
    s.course.toLowerCase().includes(search.toLowerCase())
  );

  const stats = useMemo(() => {
    let low = 0, mod = 0, high = 0;
    students.forEach(s => {
      if (s.stress_level === "Low") low++;
      else if (s.stress_level === "Moderate") mod++;
      else high++;
    });
    return [
      { name: "Low Stress", value: low, color: COLORS.Low },
      { name: "Moderate", value: mod, color: COLORS.Moderate },
      { name: "High Risk", value: high, color: COLORS.High }
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
            <div style={styles.kpiGrid}>
              <div style={styles.kpiCard}>
                <span style={styles.kpiLabel}>Total Monitored</span>
                <h2 style={styles.kpiValue}>{students.length}</h2>
              </div>
              <div style={{...styles.kpiCard, borderBottom: `4px solid ${COLORS.High}`}}>
                <span style={styles.kpiLabel}>Critical / High Risk</span>
                <h2 style={styles.kpiValue}>{stats[2].value}</h2>
              </div>
              <div style={{...styles.kpiCard, borderBottom: `4px solid ${COLORS.Moderate}`}}>
                <span style={styles.kpiLabel}>Moderate Stress</span>
                <h2 style={styles.kpiValue}>{stats[1].value}</h2>
              </div>
            </div>

            <div style={styles.chartGrid}>
              <div style={styles.chartCard}>
                <h3>Campus Distribution</h3>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
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
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={courseStats}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="High" stackId="a" fill={COLORS.High} />
                    <Bar dataKey="Moderate" stackId="a" fill={COLORS.Moderate} />
                    <Bar dataKey="Low" stackId="a" fill={COLORS.Low} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div style={styles.rosterCard}>
            <h3>Student Roster</h3>
            <input
              style={styles.input}
              placeholder="Search student name or course..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={styles.studentList}>
              {filteredStudents.map((student) => (
                <div key={student.id} style={styles.studentItem}>
                  <div>
                    <strong style={{ display: "block" }}>{student.name}</strong>
                    <span style={{ fontSize: "12px", color: "#666" }}>
                      {student.course} • ID: {student.student_id}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{
                      ...styles.badge, 
                      backgroundColor: `${COLORS[student.stress_level] || COLORS.Low}18`, 
                      color: COLORS[student.stress_level] || COLORS.Low
                    }}>
                      {student.stress_level}
                    </span>
                    <button style={styles.btnPrimary} onClick={() => setSelectedStudent(student)}>
                      Review
                    </button>
                  </div>
                </div>
              ))}
              {filteredStudents.length === 0 && (
                <p style={{color: "#666", textAlign: "center", marginTop: "20px"}}>No students found.</p>
              )}
            </div>
          </div>
        </main>
      ) : (
        <main style={styles.profileView}>
          <button style={styles.btnSecondary} onClick={() => setSelectedStudent(null)}>
            ← Back to Dashboard
          </button>
          
          <header style={styles.profileHeader}>
            <div>
              <h2 style={{ margin: 0 }}>{selectedStudent.name}</h2>
              <p style={{ margin: "5px 0 0 0", color: "#666" }}>
                {selectedStudent.course} • Student ID: {selectedStudent.student_id}
              </p>
            </div>
            
            <div style={{ display: "flex", gap: "25px", alignItems: "center" }}>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "11px", color: "#666", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>
                  Clinical DASS Score
                </span>
                <strong style={{ fontSize: "24px", color: "#294d46" }}>
                  {selectedStudent.dass_total_score}
                </strong>
              </div>

              <div style={{ textAlign: "right", borderLeft: "1px solid #e1ebe8", paddingLeft: "25px" }}>
                <span style={{ fontSize: "11px", color: "#666", display: "block", textTransform: "uppercase", fontWeight: "bold" }}>
                  ML Lifestyle Score
                </span>
                <strong style={{ fontSize: "28px", color: COLORS[selectedStudent.stress_level] || COLORS.Low }}>
                  {selectedStudent.stress_score}/100
                </strong>
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
                    stroke={COLORS[selectedStudent.stress_level] || COLORS.Low} 
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
                    const barColor = className === "High" ? COLORS.High : className === "Moderate" ? COLORS.Moderate : COLORS.Low;
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
  mainGrid: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "20px", padding: "20px 40px" },
  analyticsCol: { display: "flex", flexDirection: "column", gap: "20px" },
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" },
  kpiCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  kpiLabel: { fontSize: "13px", color: "#7b8b86", textTransform: "uppercase", fontWeight: 700 },
  kpiValue: { fontSize: "36px", margin: "10px 0 0 0" },
  chartGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" },
  chartCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
  rosterCard: { background: "#fff", padding: "20px", borderRadius: "12px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)", height: "calc(100vh - 120px)", overflowY: "auto" },
  input: { padding: "12px", width: "calc(100% - 24px)", marginBottom: "15px", border: "1px solid #e1ebe8", borderRadius: "8px", background: "#f9fcfb" },
  studentList: { display: "flex", flexDirection: "column", gap: "10px" },
  studentItem: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", border: "1px solid #e1ebe8", borderRadius: "8px" },
  badge: { padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" },
  btnPrimary: { background: "#087c66", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  btnSecondary: { background: "transparent", color: "#087c66", border: "1px solid #e1ebe8", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", marginBottom: "20px" },
  btnLogout: { background: "#dc2626", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" },
  profileView: { padding: "20px 40px", maxWidth: "1200px", margin: "0 auto" },
  profileHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", padding: "30px", borderRadius: "12px", marginBottom: "20px", boxShadow: "0 4px 12px rgba(0,0,0,0.03)" }
};