import { useState } from "react";
import "./App.css";

type ShortenResponse = {
  shortCode: string;
  shortUrl: string;
};

type StatsResponse = {
  shortCode: string;
  originalUrl: string;
  clicks: number;
  createdAt: string;
};

function App() {
  const [originalUrl, setOriginalUrl] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  async function refreshStats(shortCode: string) {
  setStatsLoading(true);

  try {
    const response = await fetch(
      `http://localhost:33000/api/stats/${shortCode}`
    );

    if (!response.ok) {
        return;
    }

      const data = await response.json();
      setStats(data);
    } catch {
      setError("Cannot load statistics");
    } finally {
      setStatsLoading(false);
    }
  }

  async function shortenUrl() {
    setError("");
    setShortUrl("");
    setStats(null);

    if (!originalUrl.trim()) {
      setError("Enter a URL");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://localhost:33000/api/shorten", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          originalUrl: originalUrl.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      const result = data as ShortenResponse;

      setShortUrl(result.shortUrl);

      await refreshStats(result.shortCode);
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <h1>URL Shortener</h1>

      <p className="subtitle">
        Enter a long URL and get a short link.
      </p>

      <div className="form">
        <input
          type="url"
          placeholder="https://example.com"
          value={originalUrl}
          onChange={(event) => setOriginalUrl(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              shortenUrl();
            }
          }}
        />

        <button onClick={shortenUrl} disabled={loading}>
          {loading ? "Shortening..." : "Shorten URL"}
        </button>
      </div>

      {error && <p className="error">{error}</p>}

      {shortUrl && (
        <section className="result">
          <h2>Your short URL</h2>

          <a href={shortUrl} target="_blank" rel="noreferrer">
            {shortUrl}
          </a>

          {stats && (
            <div className="stats">
              <p>
                <strong>Original URL:</strong> {stats.originalUrl}
              </p>

              <p>
                <strong>Clicks:</strong> {stats.clicks}
              </p>

              <p>
                <strong>Created:</strong>{" "}
                {new Date(stats.createdAt).toLocaleString()}
              </p>
              <button
                onClick={() => refreshStats(stats.shortCode)}
                disabled={statsLoading}
              >
                {statsLoading ? "Refreshing..." : "Refresh stats"}
              </button>
            </div>
          )}
        </section>
      )}
    </main>
  );
}

export default App;