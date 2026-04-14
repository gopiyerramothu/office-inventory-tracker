import React, { useState, useEffect } from "react";
import {
  fetchItems,
  addItem,
  deleteItem,
  getUploadUrl,
  uploadImage,
  detectLabels,
} from "./api.js";

const styles = {
  app: {
    maxWidth: 800,
    margin: "0 auto",
    padding: 20,
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    color: "#1a1a1a",
  },
  header: {
    textAlign: "center",
    marginBottom: 30,
  },
  title: { fontSize: 28, fontWeight: 700, margin: 0 },
  subtitle: { color: "#666", marginTop: 4 },
  form: {
    background: "#f8f9fa",
    padding: 20,
    borderRadius: 12,
    marginBottom: 30,
  },
  row: { display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  input: {
    flex: 1,
    minWidth: 150,
    padding: "10px 14px",
    border: "1px solid #ddd",
    borderRadius: 8,
    fontSize: 14,
  },
  btn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: 600,
  },
  btnPrimary: { background: "#2563eb", color: "#fff" },
  btnDanger: { background: "#ef4444", color: "#fff", padding: "6px 12px" },
  btnScan: { background: "#8b5cf6", color: "#fff" },
  card: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    marginBottom: 10,
  },
  label: {
    display: "inline-block",
    background: "#e0e7ff",
    color: "#3730a3",
    padding: "2px 10px",
    borderRadius: 12,
    fontSize: 12,
    marginLeft: 8,
  },
  detected: {
    background: "#fef3c7",
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
    fontSize: 13,
  },
};

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [addedBy, setAddedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedLabels, setDetectedLabels] = useState([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await fetchItems();
      setItems(data);
    } catch {
      /* API not connected yet */
    }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addItem({ name, category, addedBy, notes });
      setName("");
      setCategory("");
      setNotes("");
      setDetectedLabels([]);
      await loadItems();
    } catch (err) {
      alert("Failed to add item: " + err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Remove this item?")) return;
    await deleteItem(id);
    await loadItems();
  }

  async function handleScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const { uploadUrl, key } = await getUploadUrl();
      await uploadImage(uploadUrl, file);
      const { labels } = await detectLabels(key);
      setDetectedLabels(labels);
      if (labels.length > 0 && !name) {
        setName(labels[0].name);
      }
    } catch (err) {
      alert("Scan failed: " + err.message);
    }
    setScanning(false);
  }

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.title}>📦 Office Inventory</h1>
        <p style={styles.subtitle}>
          Track equipment in the office — scan or type it in
        </p>
      </header>

      <form style={styles.form} onSubmit={handleAdd}>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Equipment name (e.g. Monitor, Keyboard)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            aria-label="Equipment name"
          />
          <input
            style={styles.input}
            placeholder="Category (e.g. Electronics)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            aria-label="Category"
          />
        </div>
        <div style={styles.row}>
          <input
            style={styles.input}
            placeholder="Your name"
            value={addedBy}
            onChange={(e) => setAddedBy(e.target.value)}
            aria-label="Your name"
          />
          <input
            style={styles.input}
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-label="Notes"
          />
        </div>

        {detectedLabels.length > 0 && (
          <div style={styles.detected}>
            🔍 Detected:{" "}
            {detectedLabels.map((l) => `${l.name} (${l.confidence}%)`).join(", ")}
          </div>
        )}

        <div style={styles.row}>
          <label
            style={{ ...styles.btn, ...styles.btnScan }}
            role="button"
            tabIndex={0}
          >
            {scanning ? "Scanning..." : "📷 Scan Image"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScan}
              style={{ display: "none" }}
              aria-label="Take a photo of equipment for scanning"
            />
          </label>
          <button
            type="submit"
            style={{ ...styles.btn, ...styles.btnPrimary }}
            disabled={loading}
          >
            {loading ? "Adding..." : "+ Add Item"}
          </button>
        </div>
      </form>

      <div>
        {items.length === 0 && (
          <p style={{ textAlign: "center", color: "#999" }}>
            No items yet. Add your first piece of equipment above.
          </p>
        )}
        {items.map((item) => (
          <div key={item.id} style={styles.card}>
            <div>
              <strong>{item.name}</strong>
              <span style={styles.label}>{item.category}</span>
              <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>
                Added by {item.addedBy} · {new Date(item.createdAt).toLocaleDateString()}
                {item.notes && ` · ${item.notes}`}
              </div>
            </div>
            <button
              style={{ ...styles.btn, ...styles.btnDanger }}
              onClick={() => handleDelete(item.id)}
              aria-label={`Delete ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
