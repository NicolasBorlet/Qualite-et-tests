# 🔐 Tests de sécurité

Ce dossier regroupe les actions et résultats pour l'étape 7 : détection des failles élémentaires de l'application.

## 1. Scan des dépendances

- **npm audit**
  ```sh
  npm audit --audit-level=moderate
  ```
- **snyk** (optionnel)
  ```sh
  npx snyk test
  ```

## 2. Linter de sécurité JS

- Installer le plugin :
  ```sh
  cd backend
  npm install --save-dev eslint-plugin-security
  ```
- Ajouter dans `.eslintrc` :
  ```json
  {
    "plugins": ["security"],
    "extends": ["plugin:security/recommended"]
  }
  ```
- Lancer le linter :
  ```sh
  npx eslint .
  ```

## 3. Scan d'un endpoint avec OWASP ZAP

- Lancer le backend localement
- Ouvrir OWASP ZAP (GUI)
- Scanner l'URL d'un endpoint (ex : http://localhost:3000/api/classes)
- Exporter le rapport (HTML ou texte) dans ce dossier

## 4. Rapport synthétique

- **Résultats npm audit/snyk** :
  - Vulnérabilités détectées ?
  - Sont-elles pertinentes ? (ex : dépendance de dev, exploitabilité réelle...)
  - Correctifs appliqués ?
- **Résultats ESLint sécurité** :
  - Problèmes détectés ?
  - Faux positifs ?
  - Correctifs proposés
- **Résultats ZAP** :
  - Vulnérabilités détectées ?
  - Sont-elles pertinentes ?
  - Correctifs proposés

---

**Inclure ici les exports de rapports, captures d'écran, et une analyse critique des résultats.**

## Résultats - NPM audit

npm audit
# npm audit report
esbuild  <=0.24.2
Severity: moderate
esbuild enables any website to send any requests to the development server and read the response - https://github.com/advisories/GHSA-67mh-4wv8-2f99
fix available via `npm audit fix --force`
Will install vite@7.0.0, which is a breaking change
node_modules/esbuild
  vite  0.11.0 - 6.1.6
  Depends on vulnerable versions of esbuild
  node_modules/vite
    @vitejs/plugin-vue  1.8.0 - 5.2.0
    Depends on vulnerable versions of vite
    frontend/node_modules/@vitejs/plugin-vue
    vite-node  <=2.2.0-beta.2
    Depends on vulnerable versions of vite
    node_modules/vite-node
      vitest  0.0.1 - 0.0.12 || 0.0.29 - 0.0.122 || 0.3.3 - 2.2.0-beta.2
      Depends on vulnerable versions of vite
      Depends on vulnerable versions of vite-node
      node_modules/vitest

5 moderate severity vulnerabilities

To address all issues (including breaking changes), run:
  npm audit fix --force
