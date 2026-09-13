import { useEffect, useState } from "react";

const TABS = ["Providers", "Models", "Price Entries", "Bulk Import", "Check Updates"];

function useAdminSecret() {
  const [secret, setSecret] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = window.localStorage.getItem("aivideo_admin_secret") || "";
    setSecret(stored);
    setReady(true);
  }, []);

  const save = (val) => {
    window.localStorage.setItem("aivideo_admin_secret", val);
    setSecret(val);
  };

  return { secret, save, ready };
}

async function api(secret, path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-secret": secret,
      ...(options.headers || {}),
    },
  });
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    throw new Error(body?.error || `Request failed (${res.status})`);
  }
  return body;
}

export default function AdminPage() {
  const { secret, save, ready } = useAdminSecret();
  const [secretInput, setSecretInput] = useState("");
  const [tab, setTab] = useState("Providers");

  if (!ready) return null;

  if (!secret) {
    return (
      <div style={styles.gate}>
        <h2>Admin login</h2>
        <p style={{ color: "#666" }}>Enter the admin secret configured in Netlify env vars.</p>
        <input
          type="password"
          value={secretInput}
          onChange={(e) => setSecretInput(e.target.value)}
          placeholder="Admin secret"
          style={styles.input}
        />
        <button style={styles.button} onClick={() => save(secretInput)}>
          Continue
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={{ margin: 0 }}>AI Video Pricing — Admin</h1>
        <button style={styles.linkButton} onClick={() => save("")}>
          Log out
        </button>
      </div>
      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Providers" && <ProvidersTab secret={secret} />}
      {tab === "Models" && <ModelsTab secret={secret} />}
      {tab === "Price Entries" && <PriceEntriesTab secret={secret} />}
      {tab === "Bulk Import" && <BulkImportTab secret={secret} />}
      {tab === "Check Updates" && <CheckUpdatesTab secret={secret} />}
    </div>
  );
}

function ProvidersTab({ secret }) {
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", kind: "model_creator", websiteUrl: "" });

  const load = () =>
    api(secret, "/api/admin/providers")
      .then((d) => setProviders(d.providers))
      .catch((e) => setError(e.message));

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(secret, "/api/admin/providers", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", kind: "model_creator", websiteUrl: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this provider?")) return;
    try {
      await api(secret, `/api/admin/providers?id=${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Providers</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={submit} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Name (e.g. Runway)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          style={styles.input}
          value={form.kind}
          onChange={(e) => setForm({ ...form, kind: e.target.value })}
        >
          <option value="model_creator">Model creator (Direct)</option>
          <option value="marketplace">Marketplace / reseller</option>
        </select>
        <input
          style={styles.input}
          placeholder="Website URL"
          value={form.websiteUrl}
          onChange={(e) => setForm({ ...form, websiteUrl: e.target.value })}
          required
        />
        <button style={styles.button} type="submit">
          Add provider
        </button>
      </form>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Kind</th>
            <th>Website</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {providers.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              <td>{p.kind === "model_creator" ? "Direct" : "Marketplace"}</td>
              <td>
                <a href={p.websiteUrl} target="_blank" rel="noreferrer">
                  {p.websiteUrl}
                </a>
              </td>
              <td>
                <button style={styles.linkButton} onClick={() => remove(p.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ModelsTab({ secret }) {
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", creatorId: "", slug: "" });

  const load = () => {
    api(secret, "/api/admin/models").then((d) => setModels(d.models)).catch((e) => setError(e.message));
    api(secret, "/api/admin/providers").then((d) => setProviders(d.providers)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(secret, "/api/admin/models", { method: "POST", body: JSON.stringify(form) });
      setForm({ name: "", creatorId: "", slug: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this model?")) return;
    try {
      await api(secret, `/api/admin/models?id=${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Models</h2>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={submit} style={styles.form}>
        <input
          style={styles.input}
          placeholder="Model name (e.g. Runway Gen4.5)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select
          style={styles.input}
          value={form.creatorId}
          onChange={(e) => setForm({ ...form, creatorId: e.target.value })}
          required
        >
          <option value="">Creator provider…</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          style={styles.input}
          placeholder="Slug (optional, auto-generated if blank)"
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
        />
        <button style={styles.button} type="submit">
          Add model
        </button>
      </form>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Name</th>
            <th>Slug</th>
            <th>Creator</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {models.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>{m.slug}</td>
              <td>{m.creator?.name}</td>
              <td>
                <button style={styles.linkButton} onClick={() => remove(m.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PriceEntriesTab({ secret }) {
  const [entries, setEntries] = useState([]);
  const [models, setModels] = useState([]);
  const [providers, setProviders] = useState([]);
  const [error, setError] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState({
    modelId: "",
    providerId: "",
    entryType: "direct",
    operationType: "generate",
    billingUnit: "per_second",
    pricePerSecond: "",
    totalPrice: "",
    forDurationSeconds: "",
    resolution: "",
    hasAudio: false,
    inputType: "text",
    sourceUrl: "",
    checkedAt: new Date().toISOString().slice(0, 10),
    validFrom: "",
    validUntil: "",
    notes: "",
  });

  const load = () => {
    api(secret, "/api/admin/price-entries").then((d) => setEntries(d.priceEntries)).catch((e) => setError(e.message));
    api(secret, "/api/admin/models").then((d) => setModels(d.models)).catch(() => {});
    api(secret, "/api/admin/providers").then((d) => setProviders(d.providers)).catch(() => {});
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api(secret, "/api/admin/price-entries", {
        method: "POST",
        body: JSON.stringify(form),
      });
      setForm({ ...form, pricePerSecond: "", totalPrice: "", forDurationSeconds: "", resolution: "", sourceUrl: "", validFrom: "", validUntil: "", notes: "" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleRecheck = async (entry) => {
    try {
      await api(secret, `/api/admin/price-entries?id=${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ needsRecheck: !entry.needsRecheck }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const remove = async (id) => {
    if (!confirm("Permanently delete this price entry? For a normal price change, use \"Mark superseded\" instead so the history is kept.")) return;
    try {
      await api(secret, `/api/admin/price-entries?id=${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const toggleSupersede = async (entry) => {
    try {
      await api(secret, `/api/admin/price-entries?id=${entry.id}`, {
        method: "PUT",
        body: JSON.stringify({ supersededAt: entry.supersededAt ? false : true }),
      });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const visibleEntries = showHistory ? entries : entries.filter((e) => !e.supersededAt);

  return (
    <div>
      <h2>Price entries</h2>
      <p style={{ color: "#666", fontSize: 13, maxWidth: 640 }}>
        When a price changes, click "Mark superseded" on the old row instead of deleting it — that
        keeps it out of the public site but preserves it for history/reporting later. Delete is
        for genuine mistakes and duplicates only.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, marginBottom: 8 }}>
        <input type="checkbox" checked={showHistory} onChange={(e) => setShowHistory(e.target.checked)} />
        Show superseded (historical) entries
      </label>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={submit} style={styles.form}>
        <select
          style={styles.input}
          value={form.modelId}
          onChange={(e) => setForm({ ...form, modelId: e.target.value })}
          required
        >
          <option value="">Model…</option>
          {models.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          style={styles.input}
          value={form.providerId}
          onChange={(e) => setForm({ ...form, providerId: e.target.value })}
          required
        >
          <option value="">Provider (who's charging this price)…</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.kind === "model_creator" ? "Direct" : "Marketplace"})
            </option>
          ))}
        </select>
        <select
          style={styles.input}
          value={form.entryType}
          onChange={(e) => setForm({ ...form, entryType: e.target.value })}
        >
          <option value="direct">Direct</option>
          <option value="marketplace">Marketplace</option>
        </select>
        <select
          style={styles.input}
          value={form.operationType}
          onChange={(e) => setForm({ ...form, operationType: e.target.value })}
        >
          <option value="generate">Generate</option>
          <option value="edit">Edit</option>
          <option value="extend">Extend</option>
          <option value="reframe">Reframe</option>
          <option value="lip_sync">Lip sync</option>
          <option value="other">Other</option>
        </select>
        <select
          style={styles.input}
          value={form.billingUnit}
          onChange={(e) => setForm({ ...form, billingUnit: e.target.value })}
        >
          <option value="per_second">Per second</option>
          <option value="per_video">Per video</option>
          <option value="per_request">Per request</option>
          <option value="per_5_seconds">Per 5 seconds</option>
        </select>
        <input
          style={styles.input}
          placeholder="Price per second (only if truly linear — see notes)"
          value={form.pricePerSecond}
          onChange={(e) => setForm({ ...form, pricePerSecond: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Total price for a specific duration (preferred — e.g. $0.30)"
          value={form.totalPrice}
          onChange={(e) => setForm({ ...form, totalPrice: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="For duration, in seconds (e.g. 5)"
          value={form.forDurationSeconds}
          onChange={(e) => setForm({ ...form, forDurationSeconds: e.target.value })}
        />
        <input
          style={styles.input}
          placeholder="Resolution (e.g. 1080p)"
          value={form.resolution}
          onChange={(e) => setForm({ ...form, resolution: e.target.value })}
        />
        <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <input
            type="checkbox"
            checked={form.hasAudio}
            onChange={(e) => setForm({ ...form, hasAudio: e.target.checked })}
          />
          Has audio
        </label>
        <select
          style={styles.input}
          value={form.inputType}
          onChange={(e) => setForm({ ...form, inputType: e.target.value })}
        >
          <option value="text">Text input</option>
          <option value="image">Image input</option>
          <option value="video">Video input</option>
        </select>
        <input
          style={styles.input}
          placeholder="Source URL (required — where you verified this)"
          value={form.sourceUrl}
          onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
          required
        />
        <input
          style={styles.input}
          type="date"
          value={form.checkedAt}
          onChange={(e) => setForm({ ...form, checkedAt: e.target.value })}
          required
        />
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#666" }}>
          Valid from (optional — for known promo windows)
          <input
            style={styles.input}
            type="date"
            value={form.validFrom}
            onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
          />
        </label>
        <label style={{ display: "flex", flexDirection: "column", fontSize: 11, color: "#666" }}>
          Valid until (optional)
          <input
            style={styles.input}
            type="date"
            value={form.validUntil}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
          />
        </label>
        <textarea
          style={{ ...styles.input, minHeight: 60 }}
          placeholder="Notes (e.g. 'price varies by region', 'credit-based, converted at X rate')"
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
        <button style={styles.button} type="submit">
          Add price entry
        </button>
      </form>
      <table style={styles.table}>
        <thead>
          <tr>
            <th>Model</th>
            <th>Provider</th>
            <th>Type</th>
            <th>Operation</th>
            <th>Price</th>
            <th>Resolution</th>
            <th>Checked</th>
            <th>Valid</th>
            <th>Superseded</th>
            <th>Source</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleEntries.map((e) => (
            <tr
              key={e.id}
              style={{
                ...(e.needsRecheck ? { background: "#fff8e1" } : {}),
                ...(e.supersededAt ? { opacity: 0.55 } : {}),
              }}
            >
              <td>{e.model?.name}</td>
              <td>{e.provider?.name}</td>
              <td>{e.entryType === "direct" ? "Direct" : "Marketplace"}</td>
              <td>{e.operationType !== "generate" ? e.operationType : ""}</td>
              <td>
                {e.totalPrice != null
                  ? `$${e.totalPrice} / ${e.forDurationSeconds ?? "?"}s`
                  : e.pricePerSecond != null
                    ? `$${e.pricePerSecond}/sec`
                    : "—"}
                {e.billingUnit !== "per_second" && e.totalPrice == null && (
                  <span style={{ color: "#888" }}> ({e.billingUnit})</span>
                )}
              </td>
              <td>{e.resolution || "—"}</td>
              <td>{new Date(e.checkedAt).toLocaleDateString()}</td>
              <td style={{ fontSize: 11, color: "#666" }}>
                {e.validFrom || e.validUntil
                  ? `${e.validFrom ? new Date(e.validFrom).toLocaleDateString() : "…"} – ${
                      e.validUntil ? new Date(e.validUntil).toLocaleDateString() : "…"
                    }`
                  : ""}
              </td>
              <td style={{ fontSize: 11, color: "#666" }}>
                {e.supersededAt ? new Date(e.supersededAt).toLocaleDateString() : "—"}
              </td>
              <td>
                <a href={e.sourceUrl} target="_blank" rel="noreferrer">
                  link
                </a>
              </td>
              <td>{e.notes}</td>
              <td style={{ whiteSpace: "nowrap" }}>
                <button style={styles.linkButton} onClick={() => toggleRecheck(e)}>
                  {e.needsRecheck ? "Clear flag" : "Flag recheck"}
                </button>{" "}
                <button style={styles.linkButton} onClick={() => toggleSupersede(e)}>
                  {e.supersededAt ? "Restore" : "Mark superseded"}
                </button>{" "}
                <button style={styles.linkButton} onClick={() => remove(e.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BulkImportTab({ secret }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      setError(`Invalid JSON: ${err.message}`);
      return;
    }
    if (!parsed || !Array.isArray(parsed.entries)) {
      setError('JSON must be an object with an "entries" array, e.g. { "entries": [ {...}, {...} ] }');
      return;
    }

    setSubmitting(true);
    try {
      const body = await api(secret, "/api/admin/price-entries/bulk", {
        method: "POST",
        body: JSON.stringify(parsed),
      });
      setResult(body);
      if (body.failedCount === 0) {
        setText("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Bulk import</h2>
      <p style={{ color: "#666", fontSize: 13, maxWidth: 640 }}>
        Paste a JSON object with an <code>entries</code> array — each entry looks like a normal
        price entry, but with <code>providerName</code> / <code>modelName</code> instead of IDs.
        Providers and models that don't exist yet are created automatically (new providers need
        <code> providerKind</code> and <code>providerWebsiteUrl</code> the first time they appear).
        Nothing is deduped — re-pasting the same entries creates duplicate rows, so check the
        results below before running the same file twice.
      </p>
      {error && <p style={styles.error}>{error}</p>}
      <form onSubmit={submit} style={{ ...styles.form, flexDirection: "column", alignItems: "stretch" }}>
        <textarea
          style={{ ...styles.input, minHeight: 280, fontFamily: "monospace", fontSize: 12, width: "100%" }}
          placeholder='{ "entries": [ { "providerName": "...", "modelName": "...", "entryType": "direct", "totalPrice": 0.3, "forDurationSeconds": 5, "sourceUrl": "https://...", "checkedAt": "2026-09-13" } ] }'
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div>
          <button style={styles.button} type="submit" disabled={submitting || !text.trim()}>
            {submitting ? "Importing…" : "Import"}
          </button>
        </div>
      </form>
      {result && (
        <div style={{ marginTop: 8 }}>
          <p>
            <strong style={{ color: result.failedCount ? "#b00020" : "#0a7a0a" }}>
              {result.createdCount} created, {result.failedCount} failed
            </strong>
          </p>
          {result.created?.length > 0 && (
            <details open={result.failedCount > 0}>
              <summary>Created ({result.created.length})</summary>
              <ul style={{ fontSize: 12 }}>
                {result.created.map((c) => (
                  <li key={c.id}>
                    row {c.index}: {c.provider} — {c.model}
                  </li>
                ))}
              </ul>
            </details>
          )}
          {result.failed?.length > 0 && (
            <details open>
              <summary style={{ color: "#b00020" }}>Failed ({result.failed.length})</summary>
              <ul style={{ fontSize: 12 }}>
                {result.failed.map((f, i) => (
                  <li key={i} style={{ color: "#b00020" }}>
                    row {f.index}: {f.errors.join("; ")}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

function CheckUpdatesTab({ secret }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState(null);
  const [copiedFor, setCopiedFor] = useState("");

  const runCheck = async () => {
    setLoading(true);
    setError("");
    try {
      const body = await api(secret, "/api/admin/check-updates");
      setData(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFor(key);
      setTimeout(() => setCopiedFor(""), 1500);
    } catch {
      // clipboard API unavailable — nothing to do, text is still visible to select manually
    }
  };

  const formatPrice = (e) => {
    if (e.pricePerSecond != null) return `$${e.pricePerSecond}/sec`;
    if (e.totalPrice != null && e.forDurationSeconds) {
      return `$${e.totalPrice} for ${e.forDurationSeconds}s`;
    }
    return "—";
  };

  return (
    <div>
      <h2>Check for updates</h2>
      <p style={{ color: "#666", fontSize: 13, maxWidth: 640 }}>
        Fetches the 7 pricing pages this app can read directly and shows each one's live text next
        to what's currently in the DB, so you can compare by eye. This does not parse or change
        anything automatically — Kling and ByteDance/BytePlus aren't included here since both are
        JS-rendered; keep checking those two by opening the pages yourself.
      </p>
      <button style={styles.button} onClick={runCheck} disabled={loading}>
        {loading ? "Checking…" : "Run check"}
      </button>
      {error && <p style={styles.error}>{error}</p>}
      {data && (
        <>
          <p style={{ color: "#888", fontSize: 12 }}>Checked at {new Date(data.checkedAt).toLocaleString()}</p>
          {data.sources.map((source) => (
            <div key={source.name} style={{ border: "1px solid #ddd", borderRadius: 6, padding: 12, marginTop: 16 }}>
              <h3 style={{ margin: "0 0 4px" }}>{source.name}</h3>
              {source.notes && <p style={{ color: "#888", fontSize: 12, margin: "0 0 8px" }}>{source.notes}</p>}

              <strong style={{ fontSize: 13 }}>Current in DB</strong>
              {source.currentEntries.length === 0 ? (
                <p style={{ color: "#888", fontSize: 12 }}>No price entries for this provider yet.</p>
              ) : (
                <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse", margin: "4px 0 12px" }}>
                  <thead>
                    <tr style={{ textAlign: "left", color: "#888" }}>
                      <th>Model</th>
                      <th>Type</th>
                      <th>Resolution</th>
                      <th>Price</th>
                      <th>Checked</th>
                    </tr>
                  </thead>
                  <tbody>
                    {source.currentEntries.map((e) => (
                      <tr key={e.id}>
                        <td>{e.model}</td>
                        <td>{e.entryType}</td>
                        <td>{e.resolution || "—"}</td>
                        <td>{formatPrice(e)}</td>
                        <td>{new Date(e.checkedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <strong style={{ fontSize: 13 }}>Live page text</strong>
              {source.fetched.map((f) => (
                <div key={f.url} style={{ marginTop: 6 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <a href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      {f.url}
                    </a>
                    {f.text && (
                      <button
                        style={{ ...styles.button, padding: "2px 8px", fontSize: 12 }}
                        onClick={() => copyText(f.url, f.text)}
                      >
                        {copiedFor === f.url ? "Copied" : "Copy text"}
                      </button>
                    )}
                  </div>
                  {f.error ? (
                    <p style={styles.error}>Fetch failed: {f.error}</p>
                  ) : (
                    <details>
                      <summary style={{ fontSize: 12, cursor: "pointer" }}>Show fetched text</summary>
                      <pre
                        style={{
                          fontSize: 11,
                          maxHeight: 300,
                          overflow: "auto",
                          background: "#f7f7f7",
                          padding: 8,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {f.text}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const styles = {
  gate: { maxWidth: 360, margin: "80px auto", fontFamily: "system-ui, sans-serif" },
  page: { maxWidth: 1000, margin: "0 auto", padding: 24, fontFamily: "system-ui, sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  tabs: { display: "flex", gap: 8, marginBottom: 24, borderBottom: "1px solid #ddd" },
  tab: {
    padding: "8px 14px",
    border: "none",
    background: "none",
    cursor: "pointer",
    borderBottom: "2px solid transparent",
    fontSize: 14,
  },
  tabActive: { borderBottom: "2px solid #333", fontWeight: 600 },
  form: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
    padding: 16,
    background: "#fafafa",
    borderRadius: 8,
  },
  input: {
    padding: "8px 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    minWidth: 160,
  },
  button: {
    padding: "8px 16px",
    borderRadius: 6,
    border: "none",
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontSize: 14,
  },
  linkButton: {
    border: "none",
    background: "none",
    color: "#0645ad",
    cursor: "pointer",
    padding: 0,
    fontSize: 13,
    textDecoration: "underline",
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  error: { color: "#b00020", background: "#fdecea", padding: 8, borderRadius: 6 },
};
