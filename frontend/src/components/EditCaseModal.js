import { useState } from "react";
import { updateCase } from "../api";

export default function EditCaseModal({ caseData, onClose, onUpdated }) {
  const [caseName, setCaseName]     = useState(caseData.caseName);
  const [clientName, setClientName] = useState(caseData.clientName);
  const [loading, setLoading]       = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!caseName.trim() || !clientName.trim()) return;
    setLoading(true);
    try {
      const updated = await updateCase(caseData.caseId, {
        caseName: caseName.trim(),
        clientName: clientName.trim(),
      });
      onUpdated(updated);
    } catch (err) {
      alert("Failed: " + err.message);
    } finally { setLoading(false); }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>✏️ Edit Case</h3>
        <form onSubmit={submit} style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <div>
            <label>Case Name</label>
            <input className="modal-input" placeholder="e.g. Sharma Bail Application 2024"
              value={caseName} onChange={e => setCaseName(e.target.value)} autoFocus />
          </div>
          <div>
            <label>Client Name</label>
            <input className="modal-input" placeholder="e.g. Ramesh Kumar Sharma"
              value={clientName} onChange={e => setClientName(e.target.value)} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-create" disabled={loading}>
              {loading ? <span className="spinner" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
