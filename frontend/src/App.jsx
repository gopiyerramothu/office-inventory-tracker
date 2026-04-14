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

const STATUSES = ["Working", "Not Working", "Needs Repair"];
const STATUS_COLORS = {
  Working: { bg: "#d1fae5", color: "#065f46" },
  "Not Working": { bg: "#fee2e2", color: "#991b1b" },
  "Needs Repair": { bg: "#fef3c7", color: "#92400e" },
};

const ROOMS = [
  "Reception",
  "Conference Room A",
  "Conference Room B",
  "Open Floor",
  "Server Room",
  "Kitchen",
  "Manager Office",
  "Storage",
  "Other",
];

const USERS_AUTH = {
  admin: { password: "admin123", role: "admin" },
  user: { password: "user123", role: "user" },
};

const inputStyle = {
  width: "100%",
  padding: "10px 14px",
  border: "1px solid #ddd",
  borderRadius: 8,
  fontSize: 14,
  boxSizing: "border-box",
};

const labelStyle = { fontSize: 12, color: "#666", display: "block", marginBottom: 4 };

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = sessionStorage.getItem("inv_auth");
    return saved ? JSON.parse(saved) : null;
  });

  if (!auth) return <LoginScreen onLogin={setAuth} />;

  return auth.role === "admin" ? (
    <AdminDashboard auth={auth} onLogout={() => { sessionStorage.removeItem("inv_auth"); setAuth(null); }} />
  ) : (
    <UserPanel auth={auth} onLogout={() => { sessionStorage.removeItem("inv_auth"); setAuth(null); }} />
  );
}

/* ─── Login Screen ─── */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleLogin(e) {
    e.preventDefault();
    const u = USERS_AUTH[username.toLowerCase()];
    if (u && u.password === password) {
      const session = { username: username.toLowerCase(), role: u.role };
      sessionStorage.setItem("inv_auth", JSON.stringify(session));
      onLogin(session);
    } else {
      setError("Invalid username or password");
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #7c3aed 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: 40, width: 380, maxWidth: "90vw", boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center" }}>
        <img src="/favicon.jpg" alt="BCE Logo" style={{ width: 64, height: 64, borderRadius: 14, marginBottom: 16 }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 4px" }}>BCE Inventory</h1>
        <p style={{ color: "#888", fontSize: 13, marginBottom: 24 }}>Sign in to manage office equipment</p>
        <form onSubmit={handleLogin}>
          <input style={{ ...inputStyle, marginBottom: 10 }} placeholder="Username" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} aria-label="Username" autoFocus />
          <input type="password" style={{ ...inputStyle, marginBottom: 16 }} placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setError(""); }} aria-label="Password" />
          {error && <div style={{ color: "#ef4444", fontSize: 13, marginBottom: 12 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", padding: 12, background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Sign In</button>
        </form>
        <div style={{ marginTop: 20, padding: 12, background: "#f8f9fa", borderRadius: 8, fontSize: 12, color: "#888", textAlign: "left" }}>
          <div><span style={{ fontWeight: 600 }}>Admin:</span> admin / admin123</div>
          <div><span style={{ fontWeight: 600 }}>User:</span> user / user123</div>
        </div>
      </div>
    </div>
  );
}

/* ─── Shared Nav ─── */
function NavBar({ auth, onLogout, children }) {
  return (
    <nav style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/favicon.jpg" alt="BCE" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>BCE Inventory</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>
            Logged in as <span style={{ fontWeight: 600, color: "#fff" }}>{auth.username}</span> ({auth.role})
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {children}
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          Logout
        </button>
      </div>
    </nav>
  );
}

/* ─── Background Watermark ─── */
function Watermark() {
  return (
    <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none", zIndex: 0 }}>
      <img src="/logo-bg.png" alt="" style={{ width: 600, maxWidth: "90vw" }} />
    </div>
  );
}

/* ─── User Panel (Add Equipment) ─── */
function UserPanel({ auth, onLogout }) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [assignedTo, setAssignedTo] = useState("");
  const [room, setRoom] = useState("Open Floor");
  const [status, setStatus] = useState("Working");
  const [serialNumber, setSerialNumber] = useState("");
  const [brand, setBrand] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detectedLabels, setDetectedLabels] = useState([]);
  const [success, setSuccess] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      await addItem({ name, category, assignedTo, room, status, serialNumber, brand, addedBy: auth.username, notes });
      setSuccess(`"${name}" added to inventory!`);
      setName(""); setCategory("Electronics"); setAssignedTo(""); setRoom("Open Floor");
      setStatus("Working"); setSerialNumber(""); setBrand(""); setNotes(""); setDetectedLabels([]);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      alert("Failed: " + err.message);
    }
    setLoading(false);
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
      if (labels.length > 0 && !name) setName(labels[0].name);
    } catch (err) {
      alert("Scan failed: " + err.message);
    }
    setScanning(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout} />
      <div style={{ maxWidth: 600, margin: "30px auto", padding: "0 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Log Equipment</h2>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Fill in the details or scan a photo to auto-detect</p>

          {success && (
            <div style={{ background: "#d1fae5", color: "#065f46", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 600 }}>✓ {success}</div>
          )}

          <form onSubmit={handleAdd}>
            {/* Row 1: Name + Brand */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Equipment Name *</label>
                <input style={inputStyle} placeholder='e.g. Dell Monitor 27"' value={name} onChange={(e) => setName(e.target.value)} required aria-label="Equipment name" />
              </div>
              <div>
                <label style={labelStyle}>Brand / Model</label>
                <input style={inputStyle} placeholder="e.g. Dell P2723QE" value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand or model" />
              </div>
            </div>

            {/* Row 2: Category + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category" style={{ ...inputStyle, background: "#fff" }}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={{ ...inputStyle, background: "#fff" }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Row 3: Assigned To + Room */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Assigned To (User)</label>
                <input style={inputStyle} placeholder="Who uses this?" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} aria-label="Assigned to" />
              </div>
              <div>
                <label style={labelStyle}>Room / Location</label>
                <select value={room} onChange={(e) => setRoom(e.target.value)} aria-label="Room" style={{ ...inputStyle, background: "#fff" }}>
                  {ROOMS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
            </div>

            {/* Row 4: Serial + Notes */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={labelStyle}>Serial Number / Asset Tag</label>
                <input style={inputStyle} placeholder="SN-12345 or asset tag" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} aria-label="Serial number" />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input style={inputStyle} placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
              </div>
            </div>

            {detectedLabels.length > 0 && (
              <div style={{ background: "#fef3c7", padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13, border: "1px solid #fde68a" }}>
                🔍 Detected: {detectedLabels.map((l) => `${l.name} (${l.confidence}%)`).join(", ")}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ background: "linear-gradient(135deg, #8b5cf6, #7c3aed)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} role="button" tabIndex={0}>
                {scanning ? "⏳ Scanning..." : "📷 Scan"}
                <input type="file" accept="image/*" capture="environment" onChange={handleScan} style={{ display: "none" }} aria-label="Take photo" />
              </label>
              <button type="submit" disabled={loading} style={{ flex: 1, background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 24px", fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
                {loading ? "Adding..." : "✓ Add to Inventory"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ─── Admin Dashboard (Table View) ─── */
function AdminDashboard({ auth, onLogout }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setRefreshing(true);
    try {
      const data = await fetchItems();
      setItems(Array.isArray(data) ? data : []);
    } catch { /* */ }
    setRefreshing(false);
  }

  async function handleDelete(id) {
    if (!confirm("Remove this item?")) return;
    await deleteItem(id);
    await loadItems();
  }

  const filtered = items
    .filter((i) => filterCat === "All" || i.category === filterCat)
    .filter((i) => filterStatus === "All" || i.status === filterStatus)
    .filter((i) =>
      !search ||
      [i.name, i.assignedTo, i.room, i.brand, i.serialNumber, i.notes, i.addedBy]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(search.toLowerCase()))
    );

  const counts = items.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + 1; return acc; }, {});
  const statusCounts = items.reduce((acc, i) => { acc[i.status || "Working"] = (acc[i.status || "Working"] || 0) + 1; return acc; }, {});

  const thStyle = { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e5e7eb", background: "#f8f9fa", whiteSpace: "nowrap" };
  const tdStyle = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f0f0f0", color: "#1a1a1a" };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout}>
        <button onClick={loadItems} disabled={refreshing} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          {refreshing ? "⏳" : "🔄"} Refresh
        </button>
      </NavBar>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>

        {/* Stats row */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 12, padding: "12px 20px", color: "#fff", textAlign: "center", minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{items.length}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Total</div>
          </div>
          {Object.entries(counts).map(([cat, count]) => (
            <div key={cat} onClick={() => setFilterCat(filterCat === cat ? "All" : cat)} style={{ background: filterCat === cat ? "#e0e7ff" : "#fff", borderRadius: 12, padding: "12px 16px", textAlign: "center", cursor: "pointer", border: filterCat === cat ? "2px solid #2563eb" : "1px solid #e5e7eb", minWidth: 80 }}>
              <div style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat] || "📦"}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{count}</div>
              <div style={{ fontSize: 10, color: "#666" }}>{cat}</div>
            </div>
          ))}
          <div style={{ borderLeft: "1px solid #ddd", margin: "0 4px" }} />
          {Object.entries(statusCounts).map(([s, count]) => {
            const sc = STATUS_COLORS[s] || STATUS_COLORS.Working;
            return (
              <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)} style={{ background: filterStatus === s ? sc.bg : "#fff", borderRadius: 12, padding: "12px 16px", textAlign: "center", cursor: "pointer", border: filterStatus === s ? `2px solid ${sc.color}` : "1px solid #e5e7eb", minWidth: 80 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: sc.color }}>{count}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{s}</div>
              </div>
            );
          })}
        </div>

        {/* Search + filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#999" }}>🔍</span>
            <input style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #ddd", borderRadius: 10, fontSize: 14, background: "#fff", boxSizing: "border-box" }} placeholder="Search name, person, room, serial..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          </div>
          {filterCat !== "All" && (
            <button onClick={() => setFilterCat("All")} style={{ background: "#e0e7ff", color: "#2563eb", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ {filterCat}</button>
          )}
          {filterStatus !== "All" && (
            <button onClick={() => setFilterStatus("All")} style={{ background: STATUS_COLORS[filterStatus]?.bg || "#eee", color: STATUS_COLORS[filterStatus]?.color || "#333", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ {filterStatus}</button>
          )}
          <div style={{ fontSize: 13, color: "#999" }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</div>
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 60, color: "#999" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: "#666" }}>{items.length === 0 ? "No equipment logged yet" : "No items match your filters"}</div>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={thStyle}>Equipment</th>
                    <th style={thStyle}>Brand/Model</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Status</th>
                    <th style={thStyle}>Assigned To</th>
                    <th style={thStyle}>Room</th>
                    <th style={thStyle}>Serial #</th>
                    <th style={thStyle}>Logged By</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Notes</th>
                    <th style={{ ...thStyle, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Working;
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfc" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")} onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc")}>
                        <td style={{ ...tdStyle, color: "#999", fontSize: 11 }}>{idx + 1}</td>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{item.name}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: "#666" }}>{item.brand || "—"}</td>
                        <td style={tdStyle}>
                          <span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>{CATEGORY_ICONS[item.category] || "📦"} {item.category}</span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{item.status || "Working"}</span>
                        </td>
                        <td style={tdStyle}>{item.assignedTo || "—"}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{item.room || "—"}</td>
                        <td style={{ ...tdStyle, fontSize: 12, fontFamily: "monospace" }}>{item.serialNumber || "—"}</td>
                        <td style={{ ...tdStyle, fontSize: 12 }}>{item.addedBy || "—"}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: "#666" }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td>
                        <td style={{ ...tdStyle, fontSize: 12, color: "#888", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes || "—"}</td>
                        <td style={{ ...tdStyle, textAlign: "center" }}>
                          <button onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.name}`} style={{ background: "none", border: "1px solid #fecaca", color: "#ef4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🗑️</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
