  export async function login(username: string, password: string) {
    console.log('Login attempt:', { username }); // Note: Don't log the password for security
    const res = await fetch("http://localhost:5000/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: "Erreur inconnue" }));
      console.error('Login failed:', { status: res.status, error: errorData.error });
      throw new Error(errorData.error || "Erreur inconnue lors de la connexion");
    }
    const data = await res.json();
    localStorage.setItem("vauban_token", data.token);
    localStorage.setItem("vauban_user", JSON.stringify(data.user));
    console.log('Login successful:', { userId: data.user.id, role: data.user.role });
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
