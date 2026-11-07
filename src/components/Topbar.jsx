export default function Topbar({ navigate }) {
  return (
    <header className="topbar">
      <div className="topbar-spacer"></div>
      <button className="bell">♧</button>
      <button className="avatar" onClick={() => navigate("profile")}>B</button>
      <button className="student-menu" onClick={() => navigate("profile")}>
        <b>Brodah</b><small>Student</small>
      </button>
      <span className="chevron">⌄</span>
    </header>
  );
}