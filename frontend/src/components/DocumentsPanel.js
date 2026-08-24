import { useRef } from "react";

const fmt = iso => iso ? new Date(iso).toLocaleDateString("en-IN",
  { day:"2-digit", month:"short", year:"numeric" }) : "";

const docIcon = name => name?.endsWith(".pdf") ? "📄"
  : name?.endsWith(".docx") ? "📝" : "📃";

export default function DocumentsPanel({ docs, uploading, deleting, onFiles, onDelete }) {
  const fileRef = useRef();

  return (
    <div className="card">
      <div className="card-title">Documents</div>
      <div className="upload-zone"
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add("dragover"); }}
        onDragLeave={e => e.currentTarget.classList.remove("dragover")}
        onDrop={e => {
          e.preventDefault(); e.currentTarget.classList.remove("dragover");
          onFiles([...e.dataTransfer.files]);
        }}
        onClick={() => fileRef.current?.click()}
      >
        <input ref={fileRef} type="file" multiple accept=".pdf,.docx,.txt"
          onChange={e => onFiles([...e.target.files])}
          onClick={e => e.stopPropagation()} />
        <div className="upload-icon">☁️</div>
        <div className="upload-text">Drop files here or click to upload</div>
        <div className="upload-sub">PDF, DOCX, TXT — stored in AWS Mumbai · DPDP Act 2023 compliant</div>
      </div>

      {uploading.length > 0 && (
        <div style={{ marginTop:12 }}>
          {uploading.map(n => (
            <div key={n} className="uploading-row">
              <span className="spinner" /> Uploading {n}…
            </div>
          ))}
        </div>
      )}

      {docs.length > 0 && (
        <div className="doc-list" style={{ marginTop:14 }}>
          {docs.map(d => (
            <div key={d.docId} className="doc-item">
              <span className="doc-icon">{docIcon(d.docName)}</span>
              <span className="doc-name">{d.docName}</span>
              <span className="doc-date">{fmt(d.uploadedAt)}</span>
              <button className="doc-delete-btn" title="Delete document"
                disabled={deleting.includes(d.docId)}
                onClick={() => onDelete(d)}>
                {deleting.includes(d.docId) ? <span className="spinner" /> : "🗑️"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
