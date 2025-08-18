// src/services/auth.service.ts
import { apiFetch } from "./http";

export async function login(username: string, password: string) {
  try {
    const data = await apiFetch("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
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
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function getToken() {
  return localStorage.getItem("token");
}

export function getUser() {
  const raw = localStorage.getItem("user");
  if (!raw) return null;
  return JSON.parse(raw);
}
