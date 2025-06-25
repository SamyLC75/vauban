# Stratégie Vauban

Application de gestion de crise pour PME françaises avec système de codes français innovant.

## 🚀 Concept révolutionnaire
- Mode Online : Affichage par codes français (Napoleon, Versailles...)
- Mode Offline : Données réelles déchiffrées localement
- Jamais de données sensibles dans le cloud

## 📁 Structure
- `/vauban` - Frontend React + TypeScript
- `/vauban-backend` - Backend Node.js + Express + Socket.io

## 🛠️ Stack technique
- Frontend : React 18, TypeScript, Tailwind CSS, Socket.io-client
- Backend : Node.js, Express, Socket.io, JWT
- Base de données : PostgreSQL (prévu), In-memory (actuel)

## 🏃 Installation
```bash
# Frontend
cd vauban
npm install
npm start

# Backend (nouveau terminal)
cd vauban-backend
npm install
npm run dev

# Vauban – Stratégie de gestion de crise

**Vauban** est une application desktop/web de gestion de crise pilotée par une interface React/Electron et un backend Node.js minimal.

---

## 🌲 Arborescence du projet

```
vauban/
├── electron/                # Main process Electron (backend + API d’auth)
│   ├── auth.routes.ts       # Route POST /api/auth/login
│   └── main.ts              # Démarrage du serveur Express et Electron
├── src/                     # Frontend React (UI + logique métier)
│   ├── components/          # Composants UI réutilisables
│   ├── screens/             # Écrans (Welcome, Questionnaire, Dashboard…)
│   ├── contexts/            # Providers React (AuthContext…)
│   ├── services/            # Appels API (AuthService…)
│   ├── stores/              # Zustand stores
│   ├── types/               # Interfaces TypeScript (User, Organization…)
│   ├── App.tsx              # Composant racine React
│   └── main.tsx             # Point d’entrée Vite
├── resources/               # Assets: modèles IA, templates PDF, icônes…
├── tests/                   # Tests unitaires (même s’ils sont vides)
├── README.md                # Cette documentation
├── package.json
├── tsconfig.json
└── tailwind.config.js       # (si Tailwind est configuré)
```

---

## 🚀 Prérequis

* Node.js ≥ 16
* npm ou yarn
* Git (pour cloner)

---

## 📦 Installation

1. Cloner le dépôt :

   ```bash
   git clone https://github.com/SamyLC75/vauban.git
   cd vauban
   ```

2. Installer les dépendances du projet :

   ```bash
   npm install
   # ou
   yarn
   ```

3. Installer les dépendances du dossier `electron/` :

   ```bash
   cd electron
   npm install
   # ou
   yarn
   cd ..
   ```

---

## ▶️ Lancer l’application

### 1. Démarrer le backend (Electron + Express)

```bash
npm run dev:backend
# Cette commande lance Electron et expose l’API sur http://localhost:5000/api
```

### 2. Lancer le frontend React

```bash
npm start
# Ou : npm run dev:frontend
```

Ouvre ensuite `http://localhost:3000` dans ton navigateur.

---

## 🔐 Authentification

Pour tester l’accès à la « cellule de crise », utilise systématiquement :

* **Code organisation : `VAUBAN`**
* **Pseudonyme : `admin`**

Le backend répondra alors :

```json
{
  "success": true,
  "token": "test-token-vauban",
  "user": {
    "id": "123",
    "pseudonym": "admin",
    "frenchCode": "VAUBAN",
    "orgId": "org-123",
    "role": "user"
  },
  "organization": {
    "id": "org-123",
    "name": "Vauban Security",
    "code": "VAUBAN",
    "sector": "défense",
    "size": 42
  }
}
```

---

## 🛠️ Commandes utiles

* `npm install` : installe les dépendances
* `npm run dev:backend` : démarre l’API Electron/Express
* `npm start` ou `npm run dev:frontend` : démarre le frontend React
* `npm run build` : génère la version de production

---

## 🧪 Tests

Le dossier `tests/` contient vos unités. Pour l’instant il est vide : ajoute-y vos tests Jest dès que possible.

---

> **Note :** ce projet est en cours de développement. Les écrans et les fonctionnalités évolueront rapidement.
