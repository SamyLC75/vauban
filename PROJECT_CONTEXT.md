# Contexte pour l'IA

## Vision du projet
Créer une application de gestion de crise révolutionnaire pour les PME françaises, avec un système unique de codes français pour protéger les données sensibles.

## Décisions techniques importantes
1. **Codes français** : Les vrais noms sont remplacés par des personnages historiques
2. **Architecture** : Monorepo avec frontend et backend séparés
3. **Temps réel** : Socket.io pour les alertes instantanées
4. **Design** : Système Marianne avec couleurs officielles françaises

## État actuel (20/06/2024)
- Frontend : React fonctionne, connexion OK, dashboard basique
- Backend : API démarre, routes auth fonctionnelles
- Intégration : En cours de connexion Frontend/Backend

## Prochaine étape
Finaliser l'intégration pour que :
1. La connexion utilise vraiment le backend
2. Les alertes se synchronisent en temps réel
3. La page équipe affiche les données du backend

## Commandes utiles
```bash
# Lancer les deux en parallèle
npm run dev:all  # (à créer)

# Ou manuellement
cd vauban && npm start
cd vauban-backend && npm run dev