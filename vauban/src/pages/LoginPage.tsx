import { useState, useRef, useEffect } from "react";
import { login } from "../services/auth.service";
import { useNavigate } from "react-router-dom";

// Marianne Theme Colors (bleu république + rouge)
const bleu = "#000091";
const rouge = "#E1000F";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const userRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    userRef.current?.focus();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(""); // reset error
    try {
      await login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.message || "Erreur de connexion");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-md bg-white shadow-xl rounded-2xl px-8 py-10 border-4"
        style={{ borderColor: bleu }}
        aria-label="Connexion Agent Vauban"
      >
        <div className="flex flex-col items-center mb-6">
          {/* Marianne tricolore + nom */}
          <svg width="46" height="46" viewBox="0 0 32 32" className="mb-2">
            <circle cx="16" cy="16" r="16" fill={bleu} />
            <circle cx="16" cy="16" r="12" fill="#fff" />
            <rect x="10" y="16" width="12" height="4" fill={rouge} rx="1"/>
            <rect x="10" y="12" width="12" height="2" fill={bleu} rx="1"/>
          </svg>
          <span className="text-2xl font-extrabold tracking-tight" style={{ color: bleu, fontFamily: "Marianne, Arial, sans-serif" }}>
            Agent Vauban
          </span>
          <span className="mt-1 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase tracking-widest">
            Espace sécurisé
          </span>
        </div>
        <div className="mb-4">
          <label htmlFor="username" className="block text-sm font-medium mb-1 text-gray-700">
            Identifiant
          </label>
          <input
            ref={userRef}
            id="username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Nom d'utilisateur"
            autoComplete="username"
            required
            style={{ fontFamily: "Marianne, Arial, sans-serif" }}
          />
        </div>
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium mb-1 text-gray-700">
            Mot de passe
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="••••••••"
            autoComplete="current-password"
            required
            style={{ fontFamily: "Marianne, Arial, sans-serif" }}
          />
        </div>
        <button
          type="submit"
          className="w-full py-2 px-4 rounded-lg font-semibold text-white shadow transition"
          style={{
            background: `linear-gradient(90deg, ${bleu} 60%, ${rouge} 100%)`,
            fontFamily: "Marianne, Arial, sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          Connexion
        </button>
        {error && (
          <div className="mt-4 p-2 text-red-800 bg-red-100 rounded text-center text-sm border border-red-200">
            {error}
          </div>
        )}
        <div className="mt-8 text-xs text-gray-500 text-center">
          © {new Date().getFullYear()} Agent Vauban — Données protégées, zéro cloud nominatif.
        </div>
      </form>
    </div>
  );
}
