import { useState, useEffect, useCallback } from "react";
import { listDocuments, uploadDocument, deleteDocument, queryCase, listMessages } from "../api";
import DocumentsPanel from "./DocumentsPanel";
import QueryPanel from "./QueryPanel";

export default function CaseView({ caseData, toast }) {
  const [docs, setDocs]         = useState([]);
  const [uploading, setUploading] = useState([]);
  const [deleting, setDeleting] = useState([]);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [querying, setQuerying] = useState(false);

  const loadDocs = useCallback(async () => {
    try {
      const res = await listDocuments(caseData.caseId);
      setDocs(res.documents || []);
    } catch {}
  }, [caseData.caseId]);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const res = await listMessages(caseData.caseId);
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setLoadingHistory(false);
    }
  }, [caseData.caseId]);

  useEffect(() => {
    setDocs([]); setMessages([]); setQuestion("");
    loadDocs();
    loadHistory();
  }, [loadDocs, loadHistory]);

  async function handleFiles(files) {
    for (const file of files) {
      const name = file.name;
      setUploading(u => [...u, name]);
      try {
        await uploadDocument(caseData.caseId, file);
        toast("Uploaded: " + name, "success");
        await loadDocs();
      } catch (err) {
        toast("Upload failed: " + err.message, "error");
      } finally {
        setUploading(u => u.filter(n => n !== name));
      }
    }
  }

  async function handleDelete(doc) {
    if (!window.confirm(`Delete "${doc.docName}"? This cannot be undone.`)) return;
    setDeleting(d => [...d, doc.docId]);
    try {
      await deleteDocument(caseData.caseId, doc.docId);
      toast("Deleted: " + doc.docName, "success");
      await loadDocs();
    } catch (err) {
      toast("Delete failed: " + err.message, "error");
    } finally {
      setDeleting(d => d.filter(id => id !== doc.docId));
    }
  }

  async function handleQuery(e) {
    e.preventDefault();
    const q = question.trim();
    if (!q || querying) return;

    setMessages(prev => [...prev, { role: "user", content: q, createdAt: new Date().toISOString() }]);
    setQuestion("");
    setQuerying(true);
    try {
      const res = await queryCase(caseData.caseId, q);
      setMessages(prev => [...prev, {
        role: "assistant", content: res.answer, sources: res.sources || [],
        createdAt: new Date().toISOString(),
      }]);
    } catch (err) {
      // The question is already saved server-side even though the answer failed,
      // so keep it in the list — a reload would show the same thing.
      toast("Query failed: " + err.message, "error");
    } finally { setQuerying(false); }
  }

  return (
    <>
      <div className="topbar">
        <h2>⚖️ {caseData.caseName}</h2>
        <span style={{ fontSize:12, color:"#64748b" }}>Client: {caseData.clientName}</span>
        <span className="region-badge">🇮🇳 AWS Mumbai (ap-south-1)</span>
      </div>

      <div className="content">
        <DocumentsPanel docs={docs} uploading={uploading} deleting={deleting}
          onFiles={handleFiles} onDelete={handleDelete} />
        <QueryPanel hasDocs={docs.length > 0} question={question} setQuestion={setQuestion}
          onSubmit={handleQuery} querying={querying} messages={messages} loadingHistory={loadingHistory} />
      </div>
    </>
  );
}
