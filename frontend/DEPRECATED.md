# Frontend React — déprécié

Ce frontend React (Vite) a été construit pendant la migration FastAPI → Spring Boot.

Depuis l'intégration de **`portal/`** (monorepo Angular micro-frontends `union-portal`,
choisi comme frontend cible), ce dossier n'est **plus le frontend actif** pour le
parcours client. Il est **conservé pour l'historique et référence** (contrats d'API,
back-office diaspora) mais n'est plus déployé.

- Frontend cible : `portal/` (Angular 21, shell + remotes promote/diaspora, native-federation).
- Back-office diaspora : encore servi par ce frontend React pour l'instant ; sa migration
  éventuelle en remote Angular est une décision séparée.

Ne pas supprimer sans décision explicite.
