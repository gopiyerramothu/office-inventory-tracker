import React, { useState, useEffect } from "react";
import { useAuth } from "react-oidc-context";
import { fetchItems, addItem, deleteItem, getUploadUrl, uploadImage, detectLabels, fetchUsers, registerUser, toggleAdmin } from "./api.js";
import {
  IconMonitor, IconBriefcase, IconTv, IconMic, IconBox,
  IconSearch, IconCamera, IconTrash, IconCheck, IconX,
  IconRefresh, IconLogout, IconClipboard, IconCheckCircle, IconXCircle,
} from "./icons.jsx";
import { IconDownload } from "./icons.jsx";
import { IconUsers } from "./icons.jsx";
import { IconPlus } from "./icons.jsx";
import * as XLSX from "xlsx";

const ITEM_TYPES = [
  "Office Inventory",
  "FieldsManager Inventory",
  "TVs",
  "Podcast Room Inventory",
  "Other",
];
const TYPE_ICON = {
  "Office Inventory": IconBriefcase,
  "FieldsManager Inventory": IconMonitor,
  "TVs": IconTv,
  "Podcast Room Inventory": IconMic,
  "Other": IconBox,
};

const LOCATIONS = ["Suite 180", "Suite 300"];
const STATUSES = ["Working", "Not Working"];

const COGNITO_DOMAIN = "https://bce-chatwidget-prod.auth.us-east-1.amazoncognito.com";
const COGNITO_CLIENT_ID = "qqju6e883rfi23glmc8rl2t5h";

// Admin emails — add admin emails here
const ADMIN_EMAILS = ["gopi@bizcloudexperts.com", "gopiyer@gmail.com", "gopisrinivas@bizcloudexperts.com"];

/* ─── Shared styles ─── */
const C = {
  primary: "#2c3e50",
  accent: "#3498db",
  bg: "#f5f6f8",
  card: "#ffffff",
  border: "#e1e4e8",
  textPrimary: "#2c3e50",
  textSecondary: "#7f8c8d",
  success: "#27ae60",
  danger: "#e74c3c",
  tagBg: "#eef2f7",
  tagText: "#2c3e50",
};

const inputStyle = { width: "100%", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 14, boxSizing: "border-box", color: C.textPrimary, background: C.card };
const labelStyle = { fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 4, fontWeight: 500 };

export default function App() {
  const auth = useAuth();
  const [role, setRole] = useState(() => sessionStorage.getItem("inv_role") || "user");

  // Handle Cognito callback — register user and determine role
  useEffect(() => {
    if (auth.isAuthenticated && auth.user?.profile?.email) {
      const email = auth.user.profile.email;
      const name = auth.user.profile.name || auth.user.profile["cognito:username"] || email;
      const picture = auth.user.profile.picture || "";
      registerUser({ email, name, picture }).then((dbUser) => {
        const r = dbUser.isAdmin || ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
        setRole(r);
        sessionStorage.setItem("inv_role", r);
      }).catch(() => {
        const r = ADMIN_EMAILS.includes(email.toLowerCase()) ? "admin" : "user";
        setRole(r);
        sessionStorage.setItem("inv_role", r);
      });
    }
  }, [auth.isAuthenticated]);

  function handleLogout() {
    auth.removeUser();
    sessionStorage.removeItem("inv_role");
    const logoutUri = window.location.origin;
    window.location.href = `${COGNITO_DOMAIN}/logout?client_id=${COGNITO_CLIENT_ID}&logout_uri=${encodeURIComponent(logoutUri)}`;
  }

  if (auth.isLoading) {
    return (
      <div style={{ minHeight: "100vh", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "-apple-system, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (!auth.isAuthenticated) {
    return (
      <div style={{ minHeight: "100vh", background: C.primary, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
        <div style={{ background: C.card, borderRadius: 12, padding: 40, width: 380, maxWidth: "90vw", boxShadow: "0 8px 30px rgba(0,0,0,0.2)", textAlign: "center" }}>
          <img src="/favicon.jpg" alt="BCE Logo" style={{ width: 56, height: 56, borderRadius: 10, marginBottom: 16 }} />
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px", color: C.textPrimary }}>BCE Inventory</h1>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 24 }}>Sign in to manage office equipment</p>
          {auth.error && <div style={{ color: C.danger, fontSize: 13, marginBottom: 12 }}>{auth.error.message}</div>}
          <button
            onClick={() => auth.signinRedirect()}
            style={{ width: "100%", padding: 12, background: C.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            Sign In
          </button>
          <p style={{ color: C.textSecondary, fontSize: 11, marginTop: 16 }}>Sign in with your Google account or credentials</p>
        </div>
      </div>
    );
  }

  const authData = {
    username: auth.user?.profile?.name || auth.user?.profile?.["cognito:username"] || auth.user?.profile?.email || "User",
    email: auth.user?.profile?.email || "",
    picture: auth.user?.profile?.picture || "",
    role,
  };

  return role === "admin"
    ? <AdminDashboard auth={authData} onLogout={handleLogout} />
    : <UserPanel auth={authData} onLogout={handleLogout} />;
}

/* ─── Nav ─── */
function NavBar({ auth, onLogout, children }) {
  return (
    <nav style={{ background: C.primary, padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {auth.picture ? <img src={auth.picture} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} /> : <img src="/favicon.jpg" alt="BCE" style={{ width: 28, height: 28, borderRadius: 6 }} />}
        <div>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 700 }}>BCE Inventory</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>
            {auth.username} ({auth.role})
          </div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {children}
        <button onClick={onLogout} style={{ background: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <IconLogout style={{ width: 14, height: 14 }} /> Logout
        </button>
      </div>
    </nav>
  );
}

function Watermark() {
  return <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%,-50%)", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}><img src="/logo-bg.png" alt="" style={{ width: 500, maxWidth: "90vw" }} /></div>;
}

/* ─── User Panel ─── */
function UserPanel({ auth, onLogout }) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("Office Inventory");
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
    if (!itemName.trim() || !description.trim() || !serialNumber.trim()) {
      alert("Please fill in all required fields"); return;
    }
    setLoading(true);
    try {
      await addItem({ userName: auth.username, itemName, description, itemType, serialNumber, status, location, notes });
      setSuccess(`"${itemName}" added to inventory`);
      setItemName(""); setDescription(""); setItemType("Office Inventory");
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

      // Auto-fill item name from top label
      if (labels.length > 0) setItemName(labels[0].name);

      // Auto-fill description from all detected text
      if (textLines.length > 0) setDescription(textLines.join(" "));

      // Auto-fill brand into description if detected
      if (parsed.brand) {
        const brandModel = parsed.brand + (parsed.model ? ` ${parsed.model}` : "");
        setDescription(brandModel + (textLines.length > 0 ? " — " + textLines.join(" ") : ""));
      }

      // Auto-fill serial number
      if (parsed.serialNumber) setSerialNumber(parsed.serialNumber);
      // If no serial pattern matched, look for any long alphanumeric string in text
      if (!parsed.serialNumber && textLines.length > 0) {
        const snCandidate = textLines.find((t) => /^[A-Z0-9][\w-]{5,}$/i.test(t.trim()));
        if (snCandidate) setSerialNumber(snCandidate.trim());
      }

      // Auto-detect item type from labels
      const ln = labels.map((l) => l.name.toLowerCase());
      if (ln.some((n) => ["television", "tv", "screen", "display", "flat panel"].includes(n))) {
        setItemType("TVs");
      } else if (ln.some((n) => ["microphone", "headphones", "audio", "speaker", "studio"].includes(n))) {
        setItemType("Podcast Room Inventory");
      } else if (ln.some((n) => ["chair", "desk", "table", "shelf", "cabinet", "furniture"].includes(n))) {
        setItemType("Office Inventory");
      }
    } catch (err) { alert("Scan failed: " + err.message); }
    setScanning(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout} />
      <div style={{ maxWidth: 580, margin: "30px auto", padding: "0 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
        <div style={{ background: C.card, borderRadius: 10, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>Log Equipment</h2>
          <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>Scan a photo or fill in the details. All fields except Notes are required.</p>

          {success && (
            <div style={{ background: "#eafaf1", color: C.success, padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
              <IconCheckCircle style={{ width: 16, height: 16 }} /> {success}
            </div>
          )}

          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Item Name <span style={{ color: C.danger }}>*</span></label>
                <input style={inputStyle} placeholder="e.g. Monitor, Card Reader" value={itemName} onChange={(e) => setItemName(e.target.value)} required aria-label="Item name" />
              </div>
              <div>
                <label style={labelStyle}>Item Type <span style={{ color: C.danger }}>*</span></label>
                <select value={itemType} onChange={(e) => setItemType(e.target.value)} aria-label="Item type" style={inputStyle}>
                  {ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Item Description <span style={{ color: C.danger }}>*</span></label>
              <input style={inputStyle} placeholder="Brand, model, color, size, etc." value={description} onChange={(e) => setDescription(e.target.value)} required aria-label="Description" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
              <div>
                <label style={labelStyle}>Serial Number <span style={{ color: C.danger }}>*</span></label>
                <input style={inputStyle} placeholder="SN-12345 or asset tag" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required aria-label="Serial number" />
              </div>
              <div>
                <label style={labelStyle}>Working Status <span style={{ color: C.danger }}>*</span></label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={inputStyle}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Item Location <span style={{ color: C.danger }}>*</span></label>
              <select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location" style={inputStyle}>
                {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notes <span style={{ color: C.textSecondary, fontSize: 11 }}>(optional)</span></label>
              <input style={inputStyle} placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" />
            </div>

            {scanInfo && (
              <div style={{ background: C.bg, padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13, border: `1px solid ${C.border}` }}>
                {scanInfo.labels.length > 0 && <div>Detected: {scanInfo.labels.slice(0, 5).map((l) => `${l.name} (${l.confidence}%)`).join(", ")}</div>}
                {scanInfo.textLines.length > 0 && <div style={{ marginTop: 4, color: C.textSecondary }}>Text: {scanInfo.textLines.slice(0, 6).join(" / ")}</div>}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <label style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} role="button" tabIndex={0}>
                <IconCamera style={{ width: 16, height: 16 }} /> {scanning ? "Scanning..." : "Scan"}
                <input type="file" accept="image/*" capture="environment" onChange={handleScan} style={{ display: "none" }} aria-label="Take photo" />
              </label>
              <button type="submit" disabled={loading} style={{ flex: 1, background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                <IconCheck style={{ width: 16, height: 16 }} /> {loading ? "Adding..." : "Add to Inventory"}
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
  const [tab, setTab] = useState("inventory");
  return (
    <div style={{ minHeight: "100vh", background: C.bg, position: "relative" }}>
      <Watermark />
      <NavBar auth={auth} onLogout={onLogout}>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setTab("inventory")} style={{ background: tab === "inventory" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconClipboard style={{ width: 14, height: 14 }} /> Inventory
          </button>
          <button onClick={() => setTab("add")} style={{ background: tab === "add" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconPlus style={{ width: 14, height: 14 }} /> Add Equipment
          </button>
          <button onClick={() => setTab("users")} style={{ background: tab === "users" ? "rgba(255,255,255,0.25)" : "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 6, padding: "6px 14px", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            <IconUsers style={{ width: 14, height: 14 }} /> Users
          </button>
        </div>
      </NavBar>
      {tab === "inventory" ? <InventoryTab /> : tab === "add" ? <AddEquipmentTab auth={auth} /> : <UsersTab />}
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => { loadUsers(); }, []);
  async function loadUsers() { setLoading(true); try { const d = await fetchUsers(); setUsers(Array.isArray(d) ? d : []); } catch {} setLoading(false); }

  async function handleToggle(user) {
    setToggling(user.id);
    try {
      await toggleAdmin(user.id, !user.isAdmin);
      await loadUsers();
    } catch (err) { alert("Failed: " + err.message); }
    setToggling(null);
  }

  const th = { padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${C.border}`, background: C.bg };
  const td = { padding: "12px 14px", fontSize: 13, borderBottom: `1px solid ${C.bg}`, color: C.textPrimary };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: C.textPrimary, margin: 0 }}>User Management</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: "4px 0 0" }}>{users.length} user{users.length !== 1 ? "s" : ""} have logged in</p>
        </div>
        <button onClick={loadUsers} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
          <IconRefresh style={{ width: 14, height: 14 }} /> Refresh
        </button>
      </div>

      <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: C.textSecondary }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: C.textSecondary }}>
            <IconUsers style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>No users yet</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Users will appear here after they sign in</div>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={th}>#</th>
                <th style={th}>User</th>
                <th style={th}>Email</th>
                <th style={th}>First Login</th>
                <th style={th}>Last Login</th>
                <th style={{ ...th, textAlign: "center" }}>Admin Access</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, idx) => (
                <tr key={user.id} style={{ background: idx % 2 === 0 ? C.card : C.bg }}>
                  <td style={{ ...td, color: C.textSecondary, fontSize: 11 }}>{idx + 1}</td>
                  <td style={td}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {user.picture ? <img src={user.picture} alt="" style={{ width: 28, height: 28, borderRadius: "50%" }} /> : <IconUsers style={{ width: 20, height: 20, color: C.textSecondary }} />}
                      <span style={{ fontWeight: 600 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ ...td, fontSize: 12 }}>{user.email}</td>
                  <td style={{ ...td, fontSize: 12, color: C.textSecondary }}>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</td>
                  <td style={{ ...td, fontSize: 12, color: C.textSecondary }}>{user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : "—"}</td>
                  <td style={{ ...td, textAlign: "center" }}>
                    <button
                      onClick={() => handleToggle(user)}
                      disabled={toggling === user.id}
                      style={{
                        background: user.isAdmin ? C.success : C.border,
                        color: user.isAdmin ? "#fff" : C.textSecondary,
                        border: "none",
                        borderRadius: 20,
                        padding: "6px 16px",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        minWidth: 70,
                        transition: "all 0.2s",
                      }}
                    >
                      {toggling === user.id ? "..." : user.isAdmin ? "Admin" : "User"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/* ─── Add Equipment Tab (for admin) ─── */
function AddEquipmentTab({ auth }) {
  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [itemType, setItemType] = useState("Office Inventory");
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
    if (!itemName.trim() || !description.trim() || !serialNumber.trim()) { alert("Please fill in all required fields"); return; }
    setLoading(true);
    try {
      await addItem({ userName: auth.username, itemName, description, itemType, serialNumber, status, location, notes });
      setSuccess(`"${itemName}" added to inventory`);
      setItemName(""); setDescription(""); setItemType("Office Inventory");
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

      if (labels.length > 0) setItemName(labels[0].name);
      if (textLines.length > 0) setDescription(textLines.join(" "));
      if (parsed.brand) {
        const brandModel = parsed.brand + (parsed.model ? ` ${parsed.model}` : "");
        setDescription(brandModel + (textLines.length > 0 ? " — " + textLines.join(" ") : ""));
      }
      if (parsed.serialNumber) setSerialNumber(parsed.serialNumber);
      if (!parsed.serialNumber && textLines.length > 0) {
        const snCandidate = textLines.find((t) => /^[A-Z0-9][\w-]{5,}$/i.test(t.trim()));
        if (snCandidate) setSerialNumber(snCandidate.trim());
      }
      const ln = labels.map((l) => l.name.toLowerCase());
      if (ln.some((n) => ["television", "tv", "screen", "display", "flat panel"].includes(n))) setItemType("TVs");
      else if (ln.some((n) => ["microphone", "headphones", "audio", "speaker", "studio"].includes(n))) setItemType("Podcast Room Inventory");
      else if (ln.some((n) => ["chair", "desk", "table", "shelf", "cabinet", "furniture"].includes(n))) setItemType("Office Inventory");
    } catch (err) { alert("Scan failed: " + err.message); }
    setScanning(false);
  }

  return (
    <div style={{ maxWidth: 580, margin: "30px auto", padding: "0 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>
      <div style={{ background: C.card, borderRadius: 10, padding: 28, boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 4, color: C.textPrimary }}>Log Equipment</h2>
        <p style={{ color: C.textSecondary, fontSize: 13, marginBottom: 20 }}>Scan a photo or fill in the details. All fields except Notes are required.</p>
        {success && <div style={{ background: "#eafaf1", color: C.success, padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}><IconCheckCircle style={{ width: 16, height: 16 }} /> {success}</div>}
        <form onSubmit={handleAdd}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><div><label style={labelStyle}>Item Name <span style={{ color: C.danger }}>*</span></label><input style={inputStyle} placeholder="e.g. Monitor, Card Reader" value={itemName} onChange={(e) => setItemName(e.target.value)} required aria-label="Item name" /></div><div><label style={labelStyle}>Item Type <span style={{ color: C.danger }}>*</span></label><select value={itemType} onChange={(e) => setItemType(e.target.value)} aria-label="Item type" style={inputStyle}>{ITEM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div></div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Item Description <span style={{ color: C.danger }}>*</span></label><input style={inputStyle} placeholder="Brand, model, color, size, etc." value={description} onChange={(e) => setDescription(e.target.value)} required aria-label="Description" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}><div><label style={labelStyle}>Serial Number <span style={{ color: C.danger }}>*</span></label><input style={inputStyle} placeholder="SN-12345 or asset tag" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} required aria-label="Serial number" /></div><div><label style={labelStyle}>Working Status <span style={{ color: C.danger }}>*</span></label><select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" style={inputStyle}>{STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select></div></div>
          <div style={{ marginBottom: 12 }}><label style={labelStyle}>Item Location <span style={{ color: C.danger }}>*</span></label><select value={location} onChange={(e) => setLocation(e.target.value)} aria-label="Location" style={inputStyle}>{LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
          <div style={{ marginBottom: 16 }}><label style={labelStyle}>Notes <span style={{ color: C.textSecondary, fontSize: 11 }}>(optional)</span></label><input style={inputStyle} placeholder="Any extra info..." value={notes} onChange={(e) => setNotes(e.target.value)} aria-label="Notes" /></div>
          {scanInfo && <div style={{ background: C.bg, padding: 12, borderRadius: 6, marginBottom: 14, fontSize: 13, border: `1px solid ${C.border}` }}>{scanInfo.labels.length > 0 && <div>Detected: {scanInfo.labels.slice(0, 5).map((l) => `${l.name} (${l.confidence}%)`).join(", ")}</div>}{scanInfo.textLines.length > 0 && <div style={{ marginTop: 4, color: C.textSecondary }}>Text: {scanInfo.textLines.slice(0, 6).join(" / ")}</div>}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <label style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 16px", fontWeight: 600, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }} role="button" tabIndex={0}><IconCamera style={{ width: 16, height: 16 }} /> {scanning ? "Scanning..." : "Scan"}<input type="file" accept="image/*" capture="environment" onChange={handleScan} style={{ display: "none" }} aria-label="Take photo" /></label>
            <button type="submit" disabled={loading} style={{ flex: 1, background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "10px 20px", fontWeight: 600, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}><IconCheck style={{ width: 16, height: 16 }} /> {loading ? "Adding..." : "Add to Inventory"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Inventory Tab ─── */
function InventoryTab() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("Office Inventory");
  const [showWorking, setShowWorking] = useState(true);
  const [filterLocation, setFilterLocation] = useState("All");
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadItems(); }, []);
  async function loadItems() { setRefreshing(true); try { const d = await fetchItems(); setItems(Array.isArray(d) ? d : []); } catch {} setRefreshing(false); }
  async function handleDelete(id) { if (!confirm("Remove this item?")) return; await deleteItem(id); await loadItems(); }

  function exportExcel() {
    const rows = filtered.map((item, idx) => ({
      "#": idx + 1,
      "Entered By": item.userName || item.addedBy || "",
      "Item Name": item.itemName || item.name || "",
      "Description": item.description || "",
      "Type": item.itemType || item.category || "",
      "Serial #": item.serialNumber || "",
      "Status": item.status || "Working",
      "Location": item.location || item.room || "",
      "Date": item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "",
      "Notes": item.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, activeTab);
    XLSX.writeFile(wb, `BCE_${activeTab.replace(/\s/g, "_")}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const statusFilter = showWorking ? "Working" : "Not Working";
  const filtered = items
    .filter((i) => (i.itemType || i.category || "Other") === activeTab)
    .filter((i) => (i.status || "Working") === statusFilter)
    .filter((i) => filterLocation === "All" || (i.location || i.room) === filterLocation)
    .filter((i) => !search || [i.itemName, i.name, i.userName, i.addedBy, i.description, i.serialNumber, i.notes].filter(Boolean).some((v) => v.toLowerCase().includes(search.toLowerCase())));

  const TABS = ["Office Inventory", "FieldsManager Inventory", "TVs", "Podcast Room Inventory"];

  const th = { padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600, color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5, borderBottom: `2px solid ${C.border}`, background: C.bg, whiteSpace: "nowrap" };
  const td = { padding: "10px 12px", fontSize: 13, borderBottom: `1px solid ${C.bg}`, color: C.textPrimary };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 16px", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", position: "relative", zIndex: 1 }}>

      {/* Category Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: `2px solid ${C.border}` }}>
        {TABS.map((tab) => {
          const Icon = TYPE_ICON[tab] || IconBox;
          const count = items.filter((i) => (i.itemType || i.category || "Other") === tab).length;
          return (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: "12px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: "none",
              background: activeTab === tab ? C.card : "transparent",
              color: activeTab === tab ? C.primary : C.textSecondary,
              borderBottom: activeTab === tab ? `3px solid ${C.primary}` : "3px solid transparent",
              marginBottom: -2, display: "flex", alignItems: "center", gap: 6, transition: "all 0.2s",
            }}>
              <Icon style={{ width: 16, height: 16 }} /> {tab} <span style={{ background: activeTab === tab ? C.primary : C.border, color: activeTab === tab ? "#fff" : C.textSecondary, padding: "1px 8px", borderRadius: 10, fontSize: 11 }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        {/* Working toggle */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 14px" }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Status:</span>
          <button onClick={() => setShowWorking(true)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: showWorking ? "#eafaf1" : "transparent", color: showWorking ? C.success : C.textSecondary }}>
            Working
          </button>
          <button onClick={() => setShowWorking(false)} style={{ padding: "4px 12px", borderRadius: 4, fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer", background: !showWorking ? "#fdeaea" : "transparent", color: !showWorking ? C.danger : C.textSecondary }}>
            Not Working
          </button>
        </div>

        {/* Location dropdown */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 14px" }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>Location:</span>
          <select value={filterLocation} onChange={(e) => setFilterLocation(e.target.value)} style={{ border: "none", fontSize: 12, fontWeight: 600, color: C.textPrimary, background: "transparent", cursor: "pointer" }}>
            <option value="All">All Locations</option>
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {/* Search */}
        <div style={{ flex: 1, minWidth: 180, position: "relative" }}>
          <IconSearch style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: C.textSecondary }} />
          <input style={{ ...inputStyle, paddingLeft: 34, borderRadius: 6, fontSize: 13 }} placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search" />
        </div>

        {/* Actions */}
        <button onClick={loadItems} disabled={refreshing} style={{ background: C.card, color: C.textPrimary, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <IconRefresh style={{ width: 14, height: 14 }} /> {refreshing ? "..." : "Refresh"}
        </button>
        <button onClick={exportExcel} style={{ background: C.primary, color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <IconDownload style={{ width: 14, height: 14 }} /> Excel
        </button>

        <span style={{ fontSize: 12, color: C.textSecondary }}>{filtered.length} item{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div style={{ background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 60, color: C.textSecondary }}>
            <IconClipboard style={{ width: 40, height: 40, marginBottom: 12, opacity: 0.4 }} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary }}>No {statusFilter.toLowerCase()} items in {activeTab}</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Try switching the status or location filter</div>
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
                  <th style={th}>Serial #</th>
                  <th style={th}>Status</th>
                  <th style={th}>Location</th>
                  <th style={th}>Date</th>
                  <th style={th}>Notes</th>
                  <th style={{ ...th, textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item, idx) => (
                  <tr key={item.id} style={{ background: idx % 2 === 0 ? C.card : C.bg }}>
                    <td style={{ ...td, color: C.textSecondary, fontSize: 11 }}>{idx + 1}</td>
                    <td style={td}>{item.userName || item.addedBy || "—"}</td>
                    <td style={{ ...td, fontWeight: 600 }}>{item.itemName || item.name || "—"}</td>
                    <td style={{ ...td, fontSize: 12, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.description || "—"}</td>
                    <td style={{ ...td, fontSize: 12, fontFamily: "monospace" }}>{item.serialNumber || "—"}</td>
                    <td style={td}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: item.status === "Not Working" ? "#fdeaea" : "#eafaf1", color: item.status === "Not Working" ? C.danger : C.success }}>
                        {item.status === "Not Working" ? <IconXCircle style={{ width: 12, height: 12 }} /> : <IconCheckCircle style={{ width: 12, height: 12 }} />}
                        {item.status || "Working"}
                      </span>
                    </td>
                    <td style={{ ...td, fontSize: 12 }}>{item.location || item.room || "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: C.textSecondary }}>{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "—"}</td>
                    <td style={{ ...td, fontSize: 12, color: C.textSecondary, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.notes || "—"}</td>
                    <td style={{ ...td, textAlign: "center" }}>
                      <button onClick={() => handleDelete(item.id)} aria-label={`Delete ${item.itemName || item.name}`} style={{ background: "none", border: `1px solid #fad4d4`, color: C.danger, borderRadius: 4, padding: "4px 8px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                        <IconTrash style={{ width: 12, height: 12 }} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
