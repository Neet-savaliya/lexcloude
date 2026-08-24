import { useEffect, useRef } from "react";

function ChatMessage({ msg }) {
  if (msg.role === "user") {
    return <div className="chat-msg chat-user">{msg.content}</div>;
  }
  return (
    <div className="chat-msg chat-assistant">
      {msg.content}
      {msg.sources && msg.sources.length > 0 && (
        <div className="sources">
          {msg.sources.map((s, i) => (
            <span key={i} className="source-chip">
              📄 {s.docName} · {(parseFloat(s.score) * 100).toFixed(0)}% match
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QueryPanel({ hasDocs, question, setQuestion, onSubmit, querying, messages, loadingHistory }) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, querying]);

  return (
    <div className="card chat-card">
      <div className="card-title">AI Legal Query</div>

      <div className="chat-list" ref={listRef}>
        {loadingHistory ? (
          <div className="chat-empty">Loading conversation…</div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            {hasDocs ? "Ask a question to get started." : "Upload documents first, then ask a question."}
          </div>
        ) : (
          messages.map((msg, i) => <ChatMessage key={msg.docId || i} msg={msg} />)
        )}
        {querying && (
          <div className="chat-msg chat-assistant chat-thinking">
            <span className="spinner" /> Thinking…
          </div>
        )}
      </div>

      <form onSubmit={onSubmit}>
        <div className="query-row">
          <input className="query-input"
            placeholder={hasDocs ? "e.g. What are the grounds for bail?" : "Upload documents first…"}
            value={question} onChange={e => setQuestion(e.target.value)}
            disabled={!hasDocs || querying} />
          <button type="submit" className="ask-btn"
            disabled={!question.trim() || querying || !hasDocs}>
            {querying ? <span className="spinner" /> : "Ask AI"}
          </button>
        </div>
      </form>
    </div>
  );
}
