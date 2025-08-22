// src/services/auth.service.ts
import { apiFetch } from "./http";

export async function login(username: string, password: string) {
  try {
    const data = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    // Store token in both locations for compatibility
    localStorage.setItem("vauban_token", data.token);
    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    console.log('Login successful:', { userId: data.user.id, role: data.user.role });
    return data.user;
  } catch (error) {
    console.error('Login failed:', error);
    throw new Error("Erreur lors de la connexion");
  }
}

export function logout() {
  localStorage.removeItem("vauban_token");
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("vauban_token") || localStorage.getItem("token");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw);
}
