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
