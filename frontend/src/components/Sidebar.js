import { useState, useEffect, useRef } from "react";

function CaseMenu({ onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <div className="case-menu" ref={ref}>
      <button
        className="case-menu-btn"
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        aria-label="Case options"
      >
        ⋮
      </button>
      {open && (
        <div className="case-menu-dropdown" onClick={e => e.stopPropagation()}>
          <button className="case-menu-item" onClick={() => { setOpen(false); onEdit(); }}>
            ✏️ Edit
          </button>
          <button className="case-menu-item case-menu-danger" onClick={() => { setOpen(false); onDelete(); }}>
            🗑️ Delete
          </button>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({ cases, active, onSelect, onNewCase, lawyer, onLogout, onEditCase, onDeleteCase }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="logo">
          <div className="logo-icon">⚖️</div>
          <div>
            <div className="logo-text">LexCloud</div>
            <div className="logo-sub">Legal AI · India</div>
          </div>
        </div>
        <button className="new-case-btn" onClick={onNewCase}>+ New Case</button>
      </div>
      <div className="lawyer-bar">
        <span className="lawyer-name">{lawyer?.name || lawyer?.email}</span>
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>
      <div className="case-list">
        {cases.length === 0 && (
          <div style={{ padding:"20px 12px", color:"#475569", fontSize:12, textAlign:"center" }}>
            No cases yet. Create your first case.
          </div>
        )}
        {cases.map(c => (
          <div key={c.caseId}
            className={`case-item${active?.caseId === c.caseId ? " active" : ""}`}
            onClick={() => onSelect(c)}>
            <div className="case-item-row">
              <div className="case-item-main">
                <div className="case-name">{c.caseName}</div>
                <div className="case-client">{c.clientName}</div>
              </div>
              <CaseMenu onEdit={() => onEditCase(c)} onDelete={() => onDeleteCase(c)} />
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
