import { useEffect, useState } from "react";

const TABS = ["Providers", "Models", "Price Entries"];

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
  const [form, setForm] = useState({
    modelId: "",
    providerId: "",
    entryType: "direct",
    pricePerSecond: "",
    resolution: "",
    hasAudio: false,
    inputType: "text",
    sourceUrl: "",
    checkedAt: new Date().toISOString().slice(0, 10),
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
        body: JSON.stringify({
          ...form,
          pricePerSecond: form.pricePerSecond === "" ? null : form.pricePerSecond,
        }),
      });
      setForm({ ...form, pricePerSecond: "", resolution: "", sourceUrl: "", notes: "" });
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
    if (!confirm("Delete this price entry?")) return;
    try {
      await api(secret, `/api/admin/price-entries?id=${id}`, { method: "DELETE" });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <h2>Price entries</h2>
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
        <input
          style={styles.input}
          placeholder="Price per second (leave blank if not comparable)"
          value={form.pricePerSecond}
          onChange={(e) => setForm({ ...form, pricePerSecond: e.target.value })}
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
            <th>$/sec</th>
            <th>Checked</th>
            <th>Source</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} style={e.needsRecheck ? { background: "#fff8e1" } : {}}>
              <td>{e.model?.name}</td>
              <td>{e.provider?.name}</td>
              <td>{e.entryType === "direct" ? "Direct" : "Marketplace"}</td>
              <td>{e.pricePerSecond != null ? `$${e.pricePerSecond}` : "—"}</td>
              <td>{new Date(e.checkedAt).toLocaleDateString()}</td>
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
