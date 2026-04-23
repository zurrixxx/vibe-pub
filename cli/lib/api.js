import { getBaseUrl, getToken } from "./config.js";

function headers(extra = {}) {
  const token = getToken();
  const h = { "Content-Type": "application/json", ...extra };
  if (token) h["Cookie"] = `vibe_session=${token}`;
  return h;
}

export async function publish(markdown, options = {}) {
  const base = getBaseUrl();
  const body = { markdown };
  if (options.view) body.view = options.view;
  if (options.access) body.access = options.access;
  if (options.slug) body.slug = options.slug;

  const res = await fetch(`${base}/api/pub`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Publish failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function list() {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/pub`, {
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`List failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function update(id, markdown) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/pub/${id}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({ markdown }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update failed (${res.status}): ${text}`);
  }
  return res.json();
}

export async function remove(id) {
  const base = getBaseUrl();
  const res = await fetch(`${base}/api/pub/${id}`, {
    method: "DELETE",
    headers: headers(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Delete failed (${res.status}): ${text}`);
  }
}
