import React, { useState, useEffect } from "react";
import {
  fetchItems,
  addItem,
  deleteItem,
  getUploadUrl,
  uploadImage,
  detectLabels,
} from "./api.js";

const CATEGORIES = [
  "Electronics",
  "Furniture",
  "Peripherals",
  "Networking",
  "Stationery",
  "Other",
];

const CATEGORY_ICONS = {
  Electronics: "💻",
  Furniture: "🪑",
  Peripherals: "🖱️",
  Networking: "🌐",
  Stationery: "📎",
  Other: "📦",
};

export default function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [addedBy, setAddedBy] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedLabels, setDetectedLabels] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    try {
      const data = await fetchItems();
      setItems(Array.isArray(data) ? data : []);
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
      setCategory("Electronics");
      setNotes("");
      setDetectedLabels([]);
      setShowForm(false);
      await loadItems();
    } catch (err) {
      alert("Failed to add item: " + err.message);
    }
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Remove this item from inventory?")) return;
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

  const filtered = items
    .filter((i) => filterCat === "All" || i.category === filterCat)
    .filter(
      (i) =>
        !search ||
        i.name?.toLowerCase().includes(search.toLowerCase()) ||
        i.addedBy?.toLowerCase().includes(search.toLowerCase()) ||
        i.notes?.toLowerCase().includes(search.toLowerCase())
    );

  const counts = items.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      {/* Background watermark */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          opacity: 0.04,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <img src="/logo-bg.png" alt="" style={{ width: 600, maxWidth: "90vw" }} />
      </div>
      {/* Top nav */}
      <nav
        style={{
          background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)",
          padding: "16px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/favicon.jpg" alt="BCE Logo" style={{ width: 36, height: 36, borderRadius: 8 }} />
          <div>
            <div style={{ color: "#fff", fontSize: 20, fontWeight: 700 }}>
              BCE Inventory
            </div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>
              Biz Cloud Experts — Office Equipment Tracker
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#fff",
            color: "#2563eb",
            border: "none",
            borderRadius: 10,
            padding: "10px 20px",
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 6,
            boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          }}
        >
          {showForm ? "✕ Close" : "+ Add Equipment"}
        </button>
      </nav>

      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "20px 16px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* Stats cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              borderRadius: 12,
              padding: 16,
              color: "#fff",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 800 }}>{items.length}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>Total Items</div>
          </div>
          {Object.entries(counts).map(([cat, count]) => (
            <div
              key={cat}
              onClick={() => setFilterCat(filterCat === cat ? "All" : cat)}
              style={{
                background: filterCat === cat ? "#e0e7ff" : "#fff",
                borderRadius: 12,
                padding: 16,
                textAlign: "center",
                cursor: "pointer",
                border:
                  filterCat === cat
                    ? "2px solid #2563eb"
                    : "1px solid #e5e7eb",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 22 }}>
                {CATEGORY_ICONS[cat] || "📦"}
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#1a1a1a" }}>
                {count}
              </div>
              <div style={{ fontSize: 11, color: "#666" }}>{cat}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <form
            onSubmit={handleAdd}
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              marginBottom: 20,
              boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              border: "1px solid #e5e7eb",
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                marginBottom: 16,
                color: "#1a1a1a",
              }}
            >
              Add New Equipment
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 12, color: "#666", marginBottom: 4, display: "block" }}
                >
                  Equipment Name *
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  placeholder="e.g. Dell Monitor 27&quot;"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  aria-label="Equipment name"
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#666", marginBottom: 4, display: "block" }}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  aria-label="Category"
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 14,
                    background: "#fff",
                    boxSizing: "border-box",
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_ICONS[c]} {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
                marginBottom: 16,
              }}
            >
              <div>
                <label
                  style={{ fontSize: 12, color: "#666", marginBottom: 4, display: "block" }}
                >
                  Your Name
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  placeholder="Who's logging this?"
                  value={addedBy}
                  onChange={(e) => setAddedBy(e.target.value)}
                  aria-label="Your name"
                />
              </div>
              <div>
                <label
                  style={{ fontSize: 12, color: "#666", marginBottom: 4, display: "block" }}
                >
                  Notes
                </label>
                <input
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    border: "1px solid #ddd",
                    borderRadius: 8,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                  placeholder="Serial number, location, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  aria-label="Notes"
                />
              </div>
            </div>

            {detectedLabels.length > 0 && (
              <div
                style={{
                  background: "#fef3c7",
                  padding: 12,
                  borderRadius: 10,
                  marginBottom: 14,
                  fontSize: 13,
                  border: "1px solid #fde68a",
                }}
              >
                🔍 Detected:{" "}
                {detectedLabels
                  .map((l) => `${l.name} (${l.confidence}%)`)
                  .join(", ")}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <label
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #7c3aed)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                role="button"
                tabIndex={0}
              >
                {scanning ? "⏳ Scanning..." : "📷 Scan Equipment"}
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
                disabled={loading}
                style={{
                  background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 24px",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "Adding..." : "✓ Add to Inventory"}
              </button>
            </div>
          </form>
        )}

        {/* Search & filter bar */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 16,
                color: "#999",
              }}
            >
              🔍
            </span>
            <input
              style={{
                width: "100%",
                padding: "10px 14px 10px 36px",
                border: "1px solid #ddd",
                borderRadius: 10,
                fontSize: 14,
                background: "#fff",
                boxSizing: "border-box",
              }}
              placeholder="Search equipment, person, notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Search inventory"
            />
          </div>
          {filterCat !== "All" && (
            <button
              onClick={() => setFilterCat("All")}
              style={{
                background: "#e0e7ff",
                color: "#2563eb",
                border: "none",
                borderRadius: 8,
                padding: "8px 14px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              ✕ Clear filter: {filterCat}
            </button>
          )}
          <div style={{ fontSize: 13, color: "#999" }}>
            {filtered.length} item{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Items list */}
        {filtered.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: 60,
              color: "#999",
              background: "#fff",
              borderRadius: 14,
              border: "1px solid #e5e7eb",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#666" }}>
              {items.length === 0
                ? "No equipment logged yet"
                : "No items match your search"}
            </div>
            <div style={{ fontSize: 13, marginTop: 6 }}>
              {items.length === 0
                ? 'Click "+ Add Equipment" to get started'
                : "Try a different search term or clear the filter"}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  background: "#fff",
                  border: "1px solid #e5e7eb",
                  borderRadius: 12,
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 8px rgba(0,0,0,0.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "none")
                }
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: "#f0f2f5",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {CATEGORY_ICONS[item.category] || "📦"}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#1a1a1a" }}>
                      {item.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "#888",
                        marginTop: 2,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          background: "#e0e7ff",
                          color: "#3730a3",
                          padding: "1px 8px",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                      >
                        {item.category}
                      </span>
                      {item.addedBy && <span>by {item.addedBy}</span>}
                      <span>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                      {item.notes && (
                        <span style={{ color: "#aaa" }}>· {item.notes}</span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  aria-label={`Delete ${item.name}`}
                  style={{
                    background: "none",
                    border: "1px solid #fecaca",
                    color: "#ef4444",
                    borderRadius: 8,
                    padding: "6px 10px",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                    flexShrink: 0,
                  }}
                >
                  🗑️
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
