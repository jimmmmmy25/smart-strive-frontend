export default function Sidebar({ active, navigate }) {
  const items = [
    ["dashboard", "⌂", "Home"],
    ["assessment", "▣", "Assessment"],
    ["progress", "▥", "My Progress"],
    ["recommendations", "✦", "Recommendations"],
    ["result", "◷", "History"],
    ["profile", "⚙", "Settings"],
  ];

  return (
    <aside className="sidebar">
      <div className="side-brand"><span>🌿</span><div>SMART<br />STRIVE</div></div>
      <div className="side-menu">
        {items.map(([key, icon, label]) => (
          <button key={key} className={active === key ? "side-item active" : "side-item"} onClick={() => navigate(key)}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>
      <div className="side-bottom">
        <button onClick={() => navigate("about")}>◉ &nbsp; Contact Guidance Office</button>
        <button onClick={() => navigate("landing")}>◉ &nbsp; Log Out</button>
      </div>
    </aside>
  );
}