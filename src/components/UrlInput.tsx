import { useState, type FormEvent } from "react";

interface RecentEntry {
  url: string;
  title: string;
  timestamp: number;
}

interface UrlInputProps {
  onSubmit: (url: string) => void;
  loading: boolean;
  recentUrls: RecentEntry[];
  onRemoveRecent: (url: string) => void;
}

export function UrlInput({ onSubmit, loading, recentUrls, onRemoveRecent }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [showRecent, setShowRecent] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (url.trim()) {
      onSubmit(url.trim());
      setShowRecent(false);
    }
  };

  const handleRecentClick = (recentUrl: string) => {
    setUrl(recentUrl);
    onSubmit(recentUrl);
    setShowRecent(false);
  };

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="url-input-wrapper">
      <form className="url-input" onSubmit={handleSubmit}>
        <div className="url-input-field-wrapper">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onFocus={() => recentUrls.length > 0 && setShowRecent(true)}
            onBlur={() => setTimeout(() => setShowRecent(false), 200)}
            placeholder="Paste ChatGPT share URL (e.g., https://chatgpt.com/share/...)"
            disabled={loading}
            required
          />
          {showRecent && recentUrls.length > 0 && (
            <div className="recent-dropdown">
              <div className="recent-header">Recent conversations</div>
              {recentUrls.map((entry) => (
                <div
                  key={entry.url}
                  className="recent-entry"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleRecentClick(entry.url);
                  }}
                >
                  <div className="recent-entry-info">
                    <span className="recent-title">{entry.title}</span>
                    <span className="recent-time">{formatTimeAgo(entry.timestamp)}</span>
                  </div>
                  <button
                    type="button"
                    className="recent-remove"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRemoveRecent(entry.url);
                    }}
                    aria-label="Remove"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading || !url.trim()}>
          {loading ? "Loading..." : "Fetch"}
        </button>
      </form>
    </div>
  );
}
