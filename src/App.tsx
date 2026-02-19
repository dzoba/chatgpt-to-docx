import "./App.css";
import { useConversation } from "./hooks/useConversation";
import { useRecentUrls } from "./hooks/useRecentUrls";
import { UrlInput } from "./components/UrlInput";
import { ConversationView } from "./components/ConversationView";
import { DownloadButton } from "./components/DownloadButton";

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
  } = useConversation();

  const { entries: recentUrls, addEntry, removeEntry } = useRecentUrls();

  const handleSubmit = (url: string) => {
    fetchConversation(url).then((conv) => {
      if (conv) {
        addEntry(url, conv.title);
      }
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>ChatGPT to Word</h1>
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
