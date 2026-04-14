import React, { useState, useEffect } from "react";
import {
  fetchItems,
  addItem,
  deleteItem,
  getUploadUrl,
  uploadImage,
  detectLabels,
} from "./api.js";

const ITEM_TYPES = ["Electronics", "Furniture", "Peripherals", "Networking", "Stationery", "Other"];
const ITEM_TYPE_ICONS = { Electronics: "💻", Furniture: "🪑", Peripherals: "🖱️", Networking: "🌐", Stationery: "📎", Other: "📦" };
const LOCATIONS = ["Suite 180", "Suite 300"];
const STATUSES = ["Working", "Not Working"];
const STATUS_COLORS = { Working: { bg: "#d1fae5", color: "#065f46" }, "Not Working": { bg: "#fee2e2", color: "#991b1b" } };

const USERS_AUTH = { admin: { password: "admin123", role: "admin" }, user: { password: "user123", role: "user" } };

const inputStyle = { width: "100%", padding: "10px 14px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14, boxSizing: "border-box" };
const labelStyle = { fontSize: 12, color: "#666", display: "block", marginBottom: 4 };
const reqStar = { color: "#ef4444", marginLeft: 2 };

export default function App() {
  const [auth, setAuth] = useState(() => {
    const saved = sessionStorage.getItem("inv_auth");
    return saved ? JSON.parse(saved) : null;
  });
  if (!auth) return <LoginScreen onLogin={setAuth} />;
  const logout = () => { sessionStorage.removeItem("inv_auth"); setAuth(null); };
  return auth.role === "admin" ? <AdminDashboard auth={auth} onLogout={logout} /> : <UserPanel auth={auth} onLogout={logout} />;
}

/* ─── Login ─── */
function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  function handleLogin(e) {
    e.preventDefault();
    const u = USERS_AUTH[username.toLowerCase()];
    if (u && u.password === password) {
      const s = { username: username.toLowerCase(), role: u.role };
      sessionStorage.setItem("inv_auth", JSON.stringify(s));
      onLogin(s);
    } else setError("Invalid username or password");
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

function NavBar({ auth, onLogout, children }) {
  return (
    <nav style={{ background: "linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.15)", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/favicon.jpg" alt="BCE" style={{ width: 32, height: 32, borderRadius: 8 }} />
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>BCE Inventory</div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>Logged in as <span style={{ fontWeight: 600, color: "#fff" }}>{auth.username}</span> ({auth.role})</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {children}
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>Logout</button>
      </div>
    </nav>
  );
}

function Watermark() {
  return <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.04, pointerEvents: "none", zIndex: 0 }}><img src="/logo-bg.png" alt="" style={{ width: 600, maxWidth: "90vw" }} /></div>;
}

/* ─── User Panel ─── */
function UserPanel({ auth, onLogout }) {
  const [userName, setUserName] = useState("");
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("Electronics");
  const [serialNumber, setSerialNumber] = useState("");
  const [status, setStatus] = useState("Working");
  const [location, setLocation] = useState("Suite 180");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanInfo, setScanInfo] = useState(null);
  const [success, setSuccess] = useState("");

  async function handleAdd(e) {
    e.preventDefault();
    if (!userName.trim() || !itemName.trim() || !description.trim() || !serialNumber.trim()) {
      alert("Please fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      await addItem({ userName, itemName, description, itemType, serialNumber, status, location, notes });
      setSuccess(`"${itemName}" added to inventory!`);
      setUserName(""); setItemName(""); setDescription(""); setItemType("Electronics");
      setSerialNumber(""); setStatus("Working"); setLocation("Suite 180"); setNotes(""); setScanInfo(null);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) { alert("Failed: " + err.message); }
    setLoading(false);
  }

  async function handleScan(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanning(true);
    try {
      const { uploadUrl, key } = await getUploadUrl();
      await uploadImage(uploadUrl, file);
      const result = await detectLabels(key);
      const { labels = [], textLines = [], parsed = {} } = result;
      setScanInfo({ labels, textLines });
      if (labels.length > 0 && !itemName) setItemName(labels[0].name);
      if (parsed.brand) setDescription((prev) => prev || parsed.brand + (parsed.model ? ` ${parsed.model}` : ""));
      if (parsed.serialNumber && !serialNumber) setSerialNumber(parsed.serialNumber);
      const ln = labels.map((l) => l.name.toLowerCase());
      if (ln.some((n) => ["router", "modem", "switch"].includes(n))) setItemType("Networking");
      else if (ln.some((n) => ["keyboard", "mouse", "headset", "webcam"].includes(n))) setItemType("Peripherals");
      else if (ln.some((n) => ["chair", "desk", "table", "shelf"].includes(n))) setItemType("Furniture");
    } catch (err) { alert("Scan failed: " + err.message); }
    setScanning(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout} />
      <div style={{ maxWidth: 600, margin: "30px auto", padding: "0 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 28, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Log Equipment</h2>
          <p style={{ color: "#888", fontSize: 13, marginBottom: 20 }}>Scan a photo or fill in the details. All fields except Notes are required.</p>

          {success && <div style={{ background: "#d1fae5", color: "#065f46", padding: 12, borderRadius: 10, marginBottom: 16, fontSize: 14, fontWeight: 600 }}>✓ {success}</div>}

          <form onSubmit={handleAdd}>
            {/* Your Name */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Your Name<span style={reqStar}>*</span></label>
              <input style={inputStyle} placeholder="Who is entering this?" value={userName} onChange={(e) => setUserName(e.target.value)} required aria-label="Your name" />
            </div>

            {/* Item Name + Item Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Item Name<span style={reqStar}>*</span></label>
                <input style={inputStyle} placeholder="e.g. Monitor, Card Reader" value={itemName} onChange={(e) => setItemName(e.target.value)} required aria-label="Item name" />
              </div>
              <div>
                <label style={labelStyle}>Item Type<span style={reqStar}>*</span></label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)} aria-label="Item type" style={{ ...inputStyle, background: "#fff" }}>
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{ITEM_TYPE_ICONS[t]} {t}</option>)}
                </select>
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Item Description<span style={reqStar}>*</span></label>
              <input style={inputStyle} placeholder="Brand, model, color, size, etc." value={description} onChange={(e) => setDescription(e.target.value)} required aria-label="Item description" />
            </div>

            {/* Serial + Status */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Serial Number<span style={reqStar}>*</span></label>
                <input style={inputStyle} placeholder="SN-12345 or asset tag" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required aria-label="Serial number" />
              </div>
              <div>
                <label style={labelStyle}>Working Status<span style={reqStar}>*</span></label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={{ ...inputStyle, background: "#fff" }}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Item Location<span style={reqStar}>*</span></label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location" style={{ ...inputStyle, background: "#fff" }}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {/* Notes (optional) */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notes <span style={{ color: "#aaa", fontSize: 11 }}>(optional)</span></label>
              <input style={inputStyle} placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
            </div>

            {scanInfo && (
              <div style={{ background: "#fef3c7", padding: 12, borderRadius: 10, marginBottom: 14, fontSize: 13, border: "1px solid #fde68a" }}>
                {scanInfo.labels.length > 0 && <div>🏷️ Detected: {scanInfo.labels.slice(0, 5).map((l) => `${l.name} (${l.confidence}%)`).join(", ")}</div>}
                {scanInfo.textLines.length > 0 && <div style={{ marginTop: 4 }}>📝 Text: {scanInfo.textLines.slice(0, 6).join(" · ")}</div>}
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

/* ─── Admin Dashboard ─── */
function AdminDashboard({ auth, onLogout }) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterLocation, setFilterLocation] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadItems(); }, []);
  async function loadItems() {
    setRefreshing(true);
    try { const d = await fetchItems(); setItems(Array.isArray(d) ? d : []); } catch {}
    setRefreshing(false);
  }
  async function handleDelete(id) {
    if (!confirm("Remove this item?")) return;
    await deleteItem(id); await loadItems();
  }

  const filtered = items
    .filter((i) => filterType === "All" || i.itemType === filterType)
    .filter((i) => filterStatus === "All" || i.status === filterStatus)
    .filter((i) => filterLocation === "All" || i.location === filterLocation)
    .filter((i) => !search || [i.itemName, i.userName, i.description, i.serialNumber, i.notes, i.location].filter(Boolean).some((v) => v.toLowerCase().includes(search.toLowerCase())));

  const typeCounts = items.reduce((a, i) => { a[i.itemType || "Other"] = (a[i.itemType || "Other"] || 0) + 1; return a; }, {});
  const statusCounts = items.reduce((a, i) => { a[i.status || "Working"] = (a[i.status || "Working"] || 0) + 1; return a; }, {});

  const th = { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "#666", textTransform: "uppercase", letterSpacing: 0.5, borderBottom: "2px solid #e5e7eb", background: "#f8f9fa", whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", fontSize: 13, borderBottom: "1px solid #f0f0f0", color: "#1a1a1a" };

  return (
    <div style={{ minHeight: "100vh", background: "#f0f2f5", position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout}>
        <button onClick={loadItems} disabled={refreshing} style={{ background: "rgba(255,255,255,0.15)", color: "#fff", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 8, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{refreshing ? "⏳" : "🔄"} Refresh</button>
      </NavBar>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <div style={{ background: "linear-gradient(135deg, #2563eb, #1d4ed8)", borderRadius: 12, padding: "12px 20px", color: "#fff", textAlign: "center", minWidth: 100 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{items.length}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>Total</div>
          </div>
          {Object.entries(typeCounts).map(([t, c]) => (
            <div key={t} onClick={() => setFilterType(filterType === t ? "All" : t)} style={{ background: filterType === t ? "#e0e7ff" : "#fff", borderRadius: 12, padding: "12px 16px", textAlign: "center", cursor: "pointer", border: filterType === t ? "2px solid #2563eb" : "1px solid #e5e7eb", minWidth: 80 }}>
              <div style={{ fontSize: 16 }}>{ITEM_TYPE_ICONS[t] || "📦"}</div>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{c}</div>
              <div style={{ fontSize: 10, color: "#666" }}>{t}</div>
            </div>
          ))}
          <div style={{ borderLeft: "1px solid #ddd", margin: "0 4px" }} />
          {Object.entries(statusCounts).map(([s, c]) => {
            const sc = STATUS_COLORS[s] || STATUS_COLORS.Working;
            return (
              <div key={s} onClick={() => setFilterStatus(filterStatus === s ? "All" : s)} style={{ background: filterStatus === s ? sc.bg : "#fff", borderRadius: 12, padding: "12px 16px", textAlign: "center", cursor: "pointer", border: filterStatus === s ? `2px solid ${sc.color}` : "1px solid #e5e7eb", minWidth: 80 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: sc.color }}>{c}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{s}</div>
              </div>
            );
          })}
          <div style={{ borderLeft: "1px solid #ddd", margin: "0 4px" }} />
          {LOCATIONS.map((loc) => {
            const c = items.filter((i) => i.location === loc).length;
            return (
              <div key={loc} onClick={() => setFilterLocation(filterLocation === loc ? "All" : loc)} style={{ background: filterLocation === loc ? "#e0e7ff" : "#fff", borderRadius: 12, padding: "12px 16px", textAlign: "center", cursor: "pointer", border: filterLocation === loc ? "2px solid #2563eb" : "1px solid #e5e7eb", minWidth: 80 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{c}</div>
                <div style={{ fontSize: 10, color: "#666" }}>{loc}</div>
              </div>
            );
          })}
        </div>

        {/* Search + active filters */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 200, position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16, color: "#999" }}>🔍</span>
            <input style={{ width: "100%", padding: "10px 14px 10px 36px", border: "1px solid #ddd", borderRadius: 10, fontSize: 14, background: "#fff", boxSizing: "border-box" }} placeholder="Search name, serial, description..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
          </div>
          {filterType !== "All" && <button onClick={() => setFilterType("All")} style={{ background: "#e0e7ff", color: "#2563eb", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ {filterType}</button>}
          {filterStatus !== "All" && <button onClick={() => setFilterStatus("All")} style={{ background: STATUS_COLORS[filterStatus]?.bg, color: STATUS_COLORS[filterStatus]?.color, border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ {filterStatus}</button>}
          {filterLocation !== "All" && <button onClick={() => setFilterLocation("All")} style={{ background: "#e0e7ff", color: "#2563eb", border: "none", borderRadius: 8, padding: "8px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>✕ {filterLocation}</button>}
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
                    <th style={th}>#</th>
                    <th style={th}>Entered By</th>
                    <th style={th}>Item Name</th>
                    <th style={th}>Description</th>
                    <th style={th}>Type</th>
                    <th style={th}>Serial #</th>
                    <th style={th}>Status</th>
                    <th style={th}>Location</th>
                    <th style={th}>Date</th>
                    <th style={th}>Notes</th>
                    <th style={{ ...th, textAlign: "center" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item, idx) => {
                    const sc = STATUS_COLORS[item.status] || STATUS_COLORS.Working;
                    return (
                      <tr key={item.id} style={{ background: idx % 2 === 0 ? "#fff" : "#fafbfc" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f0f4ff")} onMouseLeave={(e) => (e.currentTarget.style.background = idx % 2 === 0 ? "#fff" : "#fafbfc")}>
                        <td style={{ ...td, color: "#999", fontSize: 11 }}>{idx + 1}</td>
                        <td style={td}>{item.userName || item.addedBy || "—"}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{item.itemName || item.name || "—"}</td>
                        <td style={{ ...td, fontSize: 12, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description || "—"}</td>
                        <td style={td}><span style={{ background: "#e0e7ff", color: "#3730a3", padding: "2px 8px", borderRadius: 6, fontSize: 11 }}>{ITEM_TYPE_ICONS[item.itemType || item.category] || "📦"} {item.itemType || item.category || "—"}</span></td>
                        <td style={{ ...td, fontSize: 12, fontFamily: "monospace" }}>{item.serialNumber || "—"}</td>
                        <td style={td}><span style={{ background: sc.bg, color: sc.color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 600 }}>{item.status || "Working"}</span></td>
                        <td style={{ ...td, fontSize: 12 }}>{item.location || item.room || "—"}</td>
                        <td style={{ ...td, fontSize: 12, color: "#666" }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td>
                        <td style={{ ...td, fontSize: 12, color: "#888", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes || "—"}</td>
                        <td style={{ ...td, textAlign: "center" }}><button onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.itemName || item.name}`} style={{ background: "none", border: "1px solid #fecaca", color: "#ef4444", borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>🗑️</button></td>
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
