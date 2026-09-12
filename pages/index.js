export default function Home() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", maxWidth: 640, margin: "80px auto", padding: 24 }}>
      <h1>AI Video Pricing Tracker — backend</h1>
      <p>
        This is the data/API service for AIVIDEO.NEWS's pricing feature. It has no public
        pages of its own — the actual <code>/prices</code> pages live in the main
        aivideo-news-app site and fetch from this service's API.
      </p>
      <p>
        Data entry happens at <a href="/admin">/admin</a>.
      </p>
      <p>
        API: <code>GET /api/models</code>, <code>GET /api/models/[slug]</code>
      </p>
    </div>
  );
}
