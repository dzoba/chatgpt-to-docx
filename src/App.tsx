import { useEffect, useCallback } from "react";
import "./App.css";
import { useConversation } from "./hooks/useConversation";
import { useRecentUrls } from "./hooks/useRecentUrls";
import { UrlInput } from "./components/UrlInput";
import { ConversationView } from "./components/ConversationView";
import { DownloadButton } from "./components/DownloadButton";

/** Extract a ChatGPT share ID from a full URL */
function extractShareId(url: string): string | null {
  const match = url.match(
    /(?:chat\.openai\.com|chatgpt\.com)\/share\/([a-f0-9-]+)/
  );
  return match ? match[1] : null;
}

/** Read share ID from the current browser path (e.g. /abc-123-def) */
function getShareIdFromPath(): string | null {
  const path = window.location.pathname.replace(/^\/+/, "");
  if (/^[a-f0-9-]{20,}$/.test(path)) return path;
  return null;
}

function App() {
  const {
    status,
    conversation,
    selectedIds,
    error,
    fetchConversation,
    toggleMessage,
    selectAll,
    deselectAll,
    reset,
  } = useConversation();

  const { entries: recentUrls, addEntry, removeEntry } = useRecentUrls();

  const loadConversation = useCallback(
    (url: string, pushState = true) => {
      const shareId = extractShareId(url);
      fetchConversation(url).then((conv) => {
        if (conv) {
          addEntry(url, conv.title);
          if (pushState && shareId) {
            window.history.pushState({ shareId }, "", `/${shareId}`);
          }
        }
      });
    },
    [fetchConversation, addEntry]
  );

  // On mount: if the URL has a share ID, auto-fetch it
  useEffect(() => {
    const shareId = getShareIdFromPath();
    if (shareId) {
      loadConversation(
        `https://chatgpt.com/share/${shareId}`,
        false // don't push state, we're already at this URL
      );
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle browser back/forward
  useEffect(() => {
    const handlePopState = () => {
      const shareId = getShareIdFromPath();
      if (shareId) {
        loadConversation(`https://chatgpt.com/share/${shareId}`, false);
      } else {
        reset();
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [loadConversation, reset]);

  const handleSubmit = (url: string) => {
    loadConversation(url);
  };

  const handleGoHome = () => {
    reset();
    window.history.pushState(null, "", "/");
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <a href="/" className="home-link" onClick={(e) => {
            e.preventDefault();
            handleGoHome();
          }}>
            ChatGPT to Word
          </a>
        </h1>
        <p className="subtitle">
          Convert any shared conversation into a formatted document
        </p>
      </header>

      <hr className="header-rule" />

      <UrlInput
        onSubmit={handleSubmit}
        loading={status === "loading"}
        recentUrls={recentUrls}
        onRemoveRecent={removeEntry}
      />

      {status === "idle" && (
        <div className="home-content">
          <section className="how-it-works">
            <h2>How it works</h2>
            <div className="steps">
              <div className="step">
                <span className="step-number">1</span>
                <div>
                  <strong>Share your conversation</strong>
                  <p>In ChatGPT, click the share button and copy the link</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">2</span>
                <div>
                  <strong>Paste the link above</strong>
                  <p>We fetch and parse the full conversation server-side</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">3</span>
                <div>
                  <strong>Choose your messages</strong>
                  <p>Toggle individual messages on or off with checkboxes</p>
                </div>
              </div>
              <div className="step">
                <span className="step-number">4</span>
                <div>
                  <strong>Download</strong>
                  <p>Export as a formatted .docx or .pdf in one click</p>
                </div>
              </div>
            </div>
          </section>

          <section className="benefits">
            <div className="benefit">
              <span className="benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </span>
              <div>
                <strong>Real formatting</strong>
                <p>Headings, bold, code blocks, and lists render properly in your .docx</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              </span>
              <div>
                <strong>Pick and choose</strong>
                <p>Include only the messages you need — skip the back-and-forth</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </span>
              <div>
                <strong>Private</strong>
                <p>Conversations are fetched on our server but never stored — nothing is saved</p>
              </div>
            </div>
            <div className="benefit">
              <span className="benefit-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              </span>
              <div>
                <strong>No sign-up</strong>
                <p>Just paste a link and download. No accounts, no extensions, no installs</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {status === "loading" && (
        <div className="loading-spinner">
          <div className="spinner-dots">
            <span />
            <span />
            <span />
          </div>
          <p>Fetching conversation&hellip;</p>
        </div>
      )}

      {status === "error" && error && (
        <div className="error-message">{error}</div>
      )}

      {status === "success" && conversation && (
        <>
          <DownloadButton
            title={conversation.title}
            messages={conversation.messages}
            selectedIds={selectedIds}
          />
          <ConversationView
            conversation={conversation}
            selectedIds={selectedIds}
            onToggle={toggleMessage}
            onSelectAll={selectAll}
            onDeselectAll={deselectAll}
          />
        </>
      )}
    </div>
  );
}

export default App;
