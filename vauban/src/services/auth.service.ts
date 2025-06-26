export async function login(username: string, password: string) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  if (!res.ok) throw new Error("Identifiant ou mot de passe incorrect");
  const data = await res.json();
  localStorage.setItem("vauban_token", data.token);
  localStorage.setItem("vauban_user", JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem("vauban_token");
  localStorage.removeItem("vauban_user");
}

export function getToken() {
  return localStorage.getItem("vauban_token");
}

export function getUser() {
  const raw = localStorage.getItem("vauban_user");
  if (!raw) return null;
  return JSON.parse(raw);
} 
