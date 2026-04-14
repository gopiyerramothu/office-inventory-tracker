// After deploying, replace this with your actual API Gateway URL from `cdk deploy` output
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function fetchItems() {
  const res = await fetch(`${API_BASE}/items`);
  return res.json();
}

export async function addItem(item) {
  const res = await fetch(`${API_BASE}/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(item),
  });
  return res.json();
}

export async function deleteItem(id) {
  await fetch(`${API_BASE}/items/${id}`, { method: "DELETE" });
}

export async function getUploadUrl() {
  const res = await fetch(`${API_BASE}/upload-url`);
  return res.json();
}

export async function uploadImage(url, file) {
  await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
}

export async function detectLabels(key) {
  const res = await fetch(`${API_BASE}/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key }),
  });
  return res.json();
}
