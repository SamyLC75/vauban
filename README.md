# Stratégie Vauban — Application de gestion de crise PME (FR)

## 🚀 Concept
**Vauban** est une plateforme complète de gestion de crise pour PME françaises, pensée dès le départ pour :
- Protéger toutes les données sensibles grâce à un système de codes français (Napoléon, Versailles…) en mode online.
- Garantir la confidentialité absolue : rien d’identifiable ne sort de la machine utilisateur, ni pour Vauban, ni pour Mistral AI, ni pour le cloud.
- Offrir des outils avancés pilotés par IA (Mistral) pour aider PME, TPE, collectivités à se préparer, réagir et apprendre des crises.

---

## 🧠 Vision et objectifs stratégiques

- Faire de l’IA un **vrai copilote métier**, mais **jamais un danger pour la confidentialité**.
- Permettre à tout dirigeant de PME d’avoir :
  - Un assistant digital pour générer et mettre à jour son DUER, son PCA, ses plans d’action, ses communications légales, etc.
  - Des checklists, exercices, simulateurs et rapports personnalisés.
- **Miser sur la confiance** : toutes les données “critiques” (noms, contacts, effectif si choisi, secteur, etc.) sont soit masquées par des codes français (online), soit chiffrées (offline, clé connue de l’utilisateur seul).
- L’architecture et la logique sécurité sont conçues pour être auditées, comprises, et améliorées facilement par un LLM ou un nouveau dev.

---

## 🏗️ Architecture globale

- **Frontend** (`/vauban`) : React 18, TypeScript, Tailwind CSS
    - Modes online/offline, gestion anonymisation, UI/UX PME-friendly, export PDF sécurisé
    - Paramétrage des champs sensibles par l’utilisateur
    - Dialogue temps réel via Socket.io (alertes, dashboard, équipe)
    - Générateur de documents (DUER, PCA, plans d’action…)
- **Backend** (`/vauban-backend`) : Node.js, Express, Socket.io
    - Routes API sécurisées, logique mode online/offline
    - Stockage des données en mémoire pour MVP (PostgreSQL prévu)
    - Pas de stockage de clé, pas de données nominatives en mode online
    - Authentification JWT par code et pseudo (jamais de vrai login/password nominatif)
- **Sécurité :**
    - Chiffrement AES-256 local et côté serveur
    - Aucune donnée nominative ni clé utilisateur stockée côté backend ni jamais envoyée à Mistral AI
    - RGPD “by design”, conformité PME/TPE
- **IA (Mistral)** :
    - Génération automatique de PCA/DUER/checklists/scénarios
    - Assistant “prompté” avec les guides PME, les meilleures pratiques, et les instructions RGPD (jamais de vrai nom !)
    - Suggestions d’actions adaptées au secteur, taille, vulnérabilités, etc. (à venir)
    - Générateur de simulations de crise et d’exercices interactifs (à venir)

---

## 📁 Arborescence du projet

vauban/
├── README.md # Ce document (centralise tout)
├── vauban/ # Frontend React/TS (UI, logic, anonymisation)
│ ├── src/
│ │ ├── components/ # Composants UI
│ │ ├── pages/ # Pages (Dashboard, Auth, PCA, etc.)
│ │ ├── services/ # API clients, socket, etc.
│ │ ├── types/ # Interfaces TypeScript (Risk, User, PCA, etc.)
│ │ ├── utils/ # Fonctions utilitaires (chiffrement, anonymisation)
│ │ ├── App.tsx # Point d’entrée UI
│ │ └── ...
│ └── ...
├── vauban-backend/ # Backend Node/Express/Socket.io
│ ├── src/
│ │ ├── routes/ # Toutes les routes API (pca, actions, entreprise, auth, alerts...)
│ │ ├── controllers/ # Logique métier des endpoints
│ │ ├── models/ # Types/interfaces de données (Entreprise, PCA, Action, etc.)
│ │ ├── utils/ # Chiffrement AES, helpers sécurité, error handling
│ │ ├── app.ts # Configuration de l’app Express (routes/middlewares)
│ │ ├── server.ts # Démarrage serveur, branchement Socket.io
│ │ └── ...
│ └── ...
└── package.json

markdown
Copier
Modifier

---

## 🛠️ Stack technique

- **Frontend :** React 18, TypeScript, Tailwind CSS, Zustand, Socket.io-client
- **Backend :** Node.js, Express, Socket.io, JWT (auth), crypto (AES-256)
- **Base de données (prévu)** : PostgreSQL (MVP : en mémoire)
- **Tests** : Jest, React Testing Library, Supertest
- **Outils IA** : Mistral API (API ou self-hosted), prompts contextualisés, intégration progressive dans le backend

---

## 🔐 Sécurité & Confidentialité — Le socle V2

- **Mode Crypté (“Online”)** :  
  - Les données sensibles (noms, contacts, effectif si choisi, secteur si choisi, etc.) sont anonymisées ou chiffrées.
  - Aucun identifiant, aucune clé, aucune donnée “brute” ne sort de la machine.
  - À destination de l’IA (Mistral) : on ne transmet que le contexte anonymisé + données sectorielles/statistiques.
- **Mode Décrypté (“Offline”)** :  
  - L’utilisateur peut voir et exporter tous ses documents avec ses vraies infos, UNIQUEMENT localement.
  - Pour déchiffrer, il faut la clé (jamais stockée côté serveur).
  - Export PDF/ZIP : la clé est demandée à chaque fois, rien n’est jamais sauvegardé ni côté cloud, ni dans l’API.
- **Chiffrement AES-256** :  
  - Utilisé pour tous les champs marqués sensibles dans le paramétrage (UI).
  - Fonctionne côté front ET côté back.
- **Sélection granulaire des données sensibles** :
  - Nom, contact, employés : TOUJOURS considérés sensibles, jamais transmis.
  - Secteur, effectif, région…: l’utilisateur peut choisir (UI sécurité).
- **RGPD** : le projet vise la conformité PME by design.

---

## 🤖 Mistral AI : usage, rôle et limitations

- **Génération automatique de PCA/DUER** :
    - L’IA analyse le contexte anonymisé (taille, secteur, risques) et génère des plans adaptés.
    - Les prompts Mistral sont construits pour ne JAMAIS requérir d’info réelle : exemples dans `/vauban/src/services/ai.service.ts` et docs.
- **Scénarios d’exercice et simulateur de crise** :
    - Générés dynamiquement selon les choix de l’utilisateur, sans donnée sensible.
- **Recommandations contextuelles** :
    - L’IA propose des actions de prévention, des plans de communication, des rapports, toujours en se basant sur les guides sectoriels et les stats anonymisées.
- **Assistant vocal (à venir)** :
    - Commandes vocales en situation d’urgence (mode main libre)
- **Limitations :**
    - Toute transmission à Mistral est auditée, aucune info nominative, pas d’historique centralisé, logs minimaux.

---

## ▶️ Installation & démarrage

```bash
# Frontend (UI)
cd vauban
npm install
npm start

# Backend (API)
cd vauban-backend
npm install
npm run dev
Le frontend écoute sur http://localhost:3000
Le backend écoute sur http://localhost:5000
Les routes API sont accessibles sur /api/...

🧪 Tests
Frontend : npm test dans /vauban

Backend : npm test dans /vauban-backend

Tests unitaires à compléter (voir dossier /src/utils/__tests__/), priorité : sécurité/chiffrement, anonymisation, routing.

💡 Cas d’usage / Flow utilisateur
L’utilisateur crée une organisation et choisit son mode (online/offline).

Il remplit les infos nécessaires (noms, effectif, secteur…), définit ce qui est sensible.

Tout ce qui est marqué “sensible” est codé en mode online, chiffré en mode offline.

Il génère ses DUER/PCA avec l’IA (promptée de façon sécurisée) ou manuellement.

Il peut exporter ses documents, uniquement déchiffrés localement.

Il peut faire des exercices de crise (V3), recevoir des alertes (websocket), piloter son équipe.

🧩 Roadmap détaillée
✅ Déjà en place
Structure monorepo frontend/backend

Auth code français / pseudo (JWT)

Dashboard & alertes en temps réel

Mode crypté/décrypté (UI + logique)

Routes API sécurisées (PCA, actions, etc.)

Export PDF sécurisé, historique exports local

Sélecteur de champs sensibles (frontend)

Chiffrement AES-256 (frontend/backend)

Intégration de prompts Mistral (génération PCA, DUER)

🚧 En cours
Liaison complète front ↔ back sur toutes les fonctionnalités (login, équipe, PCA…)

Génération IA dynamique (checklists, scénarios, plans actions)

UI/UX “gestion de crise” avec guide utilisateur intégré

Mode mobile (React Native, PWA)

Tests unitaires/backend plus exhaustifs

🕒 À faire (V3+)
Persistance PostgreSQL/SQLite

Assistant vocal/simulateur temps réel

Module “conformité RGPD PME” auto-diagnostique

Tests E2E automatisés (Jest + Supertest)

Déploiement SaaS sécurisé

🐛 Bugs connus / À améliorer
Types TS stricts désactivés temporairement (à renforcer)

Quelques warnings eslint sur le frontend (à nettoyer après refonte V2)

Données persistantes uniquement en mémoire (pas de base réelle pour MVP)

Module “équipe” en cours de finalisation

L’UI n’est pas encore finalisée selon toutes les recommandations ANSSI

🔗 Ressources essentielles
Architecture globale.pdf (expliquer la logique métier et sécurité)

Analyse du Projet de gestion des risques.pdf (spécificités PME françaises)

hfds-guide-pca-plan-continuite-activite.pdf (référentiel PCA national)

guide_cpme_bonnes_pratiques.pdf (checklists sécurité/PME)

Gestion-de-crise_FR.pdf (méthodologie gestion de crise)

👷 Pour tout développeur/LLM qui reprend
Lis ce README en entier avant tout.

Prends connaissance de la logique anonymisation/chiffrement et de la philosophie “cloud zéro confiance”.

Ne jamais casser la séparation “mode online/offline”.

Toujours isoler les prompts Mistral des données réelles (utiliser les helpers du dossier utils).

Si tu ajoutes des modules, priorité sécurité/explicabilité.

Pour tout nouveau composant : commenter, typer, documenter.

Projet ouvert, audité, chaque contribution doit renforcer la confidentialité et la pertinence métier pour les PME.

Contact, suggestions, bugs, PR : bienvenue !