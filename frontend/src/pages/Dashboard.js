import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { listCases, deleteCase as apiDeleteCase } from "../api";
import { useAuth } from "../context/AuthContext";
import Sidebar from "../components/Sidebar";
import CaseView from "../components/CaseView";
import NewCaseModal from "../components/NewCaseModal";
import EditCaseModal from "../components/EditCaseModal";
import Toast from "../components/Toast";

export default function Dashboard() {
  const [cases, setCases]         = useState([]);
  const [active, setActive]       = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCase, setEditingCase] = useState(null);
  const [toast, setToast]         = useState(null);
  const { lawyer, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    listCases().then(res => setCases(res.cases || [])).catch(() => {});
  }, []);

  function showToast(msg, type = "success") { setToast({ msg, type }); }

  function handleCreated(c) {
    setCases(prev => [c, ...prev]);
    setActive(c);
    setShowModal(false);
    showToast("Case created: " + c.caseName);
  }

  function handleUpdated(updated) {
    setCases(prev => prev.map(c => c.caseId === updated.caseId ? { ...c, ...updated } : c));
    setActive(prev => prev && prev.caseId === updated.caseId ? { ...prev, ...updated } : prev);
    setEditingCase(null);
    showToast("Case updated: " + updated.caseName);
  }

  async function handleDeleteCase(c) {
    if (!window.confirm(`Delete "${c.caseName}"? This removes all its documents and chat history and cannot be undone.`)) return;
    try {
      await apiDeleteCase(c.caseId);
      setCases(prev => prev.filter(x => x.caseId !== c.caseId));
      setActive(prev => prev && prev.caseId === c.caseId ? null : prev);
      showToast("Case deleted: " + c.caseName);
    } catch (err) {
      showToast("Delete failed: " + err.message, "error");
    }
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app">
      <Sidebar cases={cases} active={active} onSelect={setActive}
        onNewCase={() => setShowModal(true)} lawyer={lawyer} onLogout={handleLogout}
        onEditCase={setEditingCase} onDeleteCase={handleDeleteCase} />

      <main className="main">
        {active ? (
          <CaseView key={active.caseId} caseData={active} toast={showToast} />
        ) : (
          <>
            <div className="topbar">
              <h2>LexCloud</h2>
              <span className="region-badge">🇮🇳 AWS Mumbai (ap-south-1)</span>
            </div>
            <div className="empty">
              <div className="empty-icon">⚖️</div>
              <div className="empty-text">Select a case or create a new one</div>
              <div className="empty-sub">All documents stored in AWS Mumbai · DPDP Act 2023 compliant</div>
            </div>
          </>
        )}
      </main>

      {showModal && <NewCaseModal onClose={() => setShowModal(false)} onCreated={handleCreated} />}
      {editingCase && <EditCaseModal caseData={editingCase} onClose={() => setEditingCase(null)} onUpdated={handleUpdated} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
    </div>
  );
}
