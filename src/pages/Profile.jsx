import React, { useState } from "react";
function Profile({ onBack, onLogout }) {
const [isEditing, setIsEditing] = useState(false);
const [profile, setProfile] = useState(() => {
const saved = localStorage.getItem("smartStriveStudentProfile");
if (saved) {
  try {
    return JSON.parse(saved);
  } catch {
    // Use default profile if saved data is invalid.
  }
}

return {
  fullName: "",
  studentNumber: "",
  email: "",
  course: "BS Computer Science - Data Science",
  yearLevel: "4th Year",
  contactNumber: "",
  address: ""
};
});
const [draft, setDraft] = useState(profile);
const [message, setMessage] = useState("");
const handleChange = (event) => {
const { name, value } = event.target;
setDraft(previous => ({
...previous,
[name]: value
}));
};
const handleEdit = () => {
setDraft(profile);
setMessage("");
setIsEditing(true);
};
const handleSave = (event) => {
event.preventDefault();
setProfile(draft);
localStorage.setItem(
  "smartStriveStudentProfile",
  JSON.stringify(draft)
);

setIsEditing(false);
setMessage("Your profile has been updated successfully!");
};
const handleCancel = () => {
setDraft(profile);
setIsEditing(false);
setMessage("");
};
const initials = profile.fullName
? profile.fullName
.split(" ")
.filter(Boolean)
.slice(0, 2)
.map(word => word[0].toUpperCase())
.join("")
: "ST";
const fields = [
{ label: "Full Name", name: "fullName", placeholder: "Enter your full name" },
{ label: "Student Number", name: "studentNumber", placeholder: "Enter your student number" },
{ label: "Email Address", name: "email", placeholder: "Enter your email", type: "email" },
{ label: "Contact Number", name: "contactNumber", placeholder: "Enter your contact number" },
{ label: "Course / Program", name: "course", placeholder: "Enter your course" },
{ label: "Year Level", name: "yearLevel", placeholder: "Enter your year level" },
{ label: "Address", name: "address", placeholder: "Enter your address" }
];
return (
  <div style={styles.page}>
    <header style={styles.header}>
      <div style={styles.logo}>🌿 SMART STRIVE</div>
      <div style={styles.headerText}>Student Profile</div>
    </header>

    <main style={styles.container}>
      <p style={styles.eyebrow}>ACCOUNT SETTINGS</p>
      <h1 style={styles.title}>My Profile</h1>
      <p style={styles.subtitle}>
        Manage your personal information and student account details.
      </p>

      <section style={styles.profileCard}>
        <div style={styles.profileTop}>
          <div style={styles.avatar}>{initials}</div>
          <div>
            <h2 style={styles.name}>{profile.fullName || "Student Name"}</h2>
            <p style={styles.email}>{profile.email || "No email address added"}</p>
            <span style={styles.studentBadge}>Student Account</span>
          </div>
        </div>
      </section>

      {message && <div style={styles.successMessage}>✓ {message}</div>}

      <section style={styles.detailsCard}>
        <div style={styles.sectionHeading}>
          <div>
            <h2 style={styles.sectionTitle}>Personal Information</h2>
            <p>Update your student information below.</p>
          </div>

          {!isEditing && (
            <button style={styles.editButton} onClick={handleEdit}>
              ✎ Edit Profile
            </button>
          )}
        </div>

        <form onSubmit={handleSave}>
          <div style={styles.formGrid}>
            {fields.map(field => (
              <div style={styles.field} key={field.name}>
                <label htmlFor={field.name}>{field.label}</label>

                <input
                  id={field.name}
                  name={field.name}
                  type={field.type || "text"}
                  value={isEditing ? draft[field.name] : profile[field.name]}
                  onChange={handleChange}
                  placeholder={field.placeholder}
                  disabled={!isEditing}
                />
              </div>
            ))}
          </div>

          {isEditing && (
            <div style={styles.formActions}>
              <button type="submit" style={styles.saveButton}>
                Save Changes
              </button>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          )}
        </form>
      </section>

      <section style={styles.infoCard}>
        <h3>🔒 Your Privacy Matters</h3>
        <p>
          Your profile information is intended for your student account. Always
          keep your login credentials private. This prototype stores profile
          information locally in your browser.
        </p>
      </section>

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
background: "#fff",
borderBottom: "1px solid #e1ebe8",
display: "flex",
alignItems: "center",
justifyContent: "space-between"
},
logo: { fontWeight: 800, letterSpacing: 1, color: "#073f38" },
headerText: { color: "#7b8b86", fontSize: 13 },
container: {
maxWidth: 1000,
margin: "35px auto",
padding: "0 22px 40px"
},
eyebrow: {
color: "#087c66",
fontSize: 12,
fontWeight: 800,
letterSpacing: 1.5
},
title: { color: "#073f38", fontSize: 30, margin: "8px 0" },
subtitle: { color: "#7b8b86", lineHeight: 1.6 },
profileCard: {
background: "#fff",
border: "1px solid #e1ebe8",
borderRadius: 16,
padding: 25,
marginTop: 28
},
profileTop: { display: "flex", alignItems: "center", gap: 18 },
avatar: {
width: 75,
height: 75,
borderRadius: "50%",
background: "#e8f5f1",
color: "#087c66",
display: "flex",
alignItems: "center",
justifyContent: "center",
fontSize: 25,
fontWeight: 800,
flexShrink: 0
},
name: { margin: "0 0 5px", color: "#073f38" },
email: { margin: "0 0 10px", color: "#7b8b86", fontSize: 14 },
studentBadge: {
background: "#e8f5f1",
color: "#087c66",
padding: "5px 10px",
borderRadius: 20,
fontSize: 11,
fontWeight: 700
},
detailsCard: {
background: "#fff",
border: "1px solid #e1ebe8",
borderRadius: 16,
padding: 25,
marginTop: 20
},
sectionHeading: {
display: "flex",
justifyContent: "space-between",
alignItems: "center",
flexWrap: "wrap",
gap: 12,
marginBottom: 22
},
sectionTitle: { margin: 0, color: "#073f38" },
field: { display: "flex", flexDirection: "column", gap: 8 },
formGrid: {
display: "grid",
gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
gap: 20
},
formActions: {
display: "flex",
gap: 12,
flexWrap: "wrap",
marginTop: 25
},
editButton: {
background: "#e8f5f1",
color: "#087c66",
border: "none",
padding: "11px 16px",
borderRadius: 8,
cursor: "pointer",
fontWeight: 700
},
saveButton: {
background: "#087c66",
color: "#fff",
border: "none",
padding: "12px 20px",
borderRadius: 8,
cursor: "pointer"
},
cancelButton: {
background: "#fff",
color: "#294d46",
border: "1px solid #d5e3dd",
padding: "12px 20px",
borderRadius: 8,
cursor: "pointer"
},
successMessage: {
background: "#e8f5f1",
color: "#087c66",
padding: 14,
borderRadius: 10,
marginTop: 18,
fontSize: 14
},
infoCard: {
background: "#e8f5f1",
padding: 20,
borderRadius: 14,
marginTop: 20,
lineHeight: 1.7,
fontSize: 14
},
actions: {
display: "flex",
gap: 12,
flexWrap: "wrap",
marginTop: 25
},
backButton: {
background: "#fff",
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
}
};
export default Profile; 