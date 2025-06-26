# 📈 Tests de montée en charge

Ce dossier contient les scripts et la documentation pour les tests de charge du backend avec K6 et JMeter.

## Stratégie

Nous avons défini 4 scénarios réalistes :
- **Réservation simultanée de cours** : 100 utilisateurs réservent en même temps.
- **Consultation en masse du planning** : 100 utilisateurs consultent le planning.
- **Création de comptes utilisateurs** : création en boucle de nouveaux comptes.
- **Annulations massives** : suppression simultanée de réservations.

Types de tests réalisés :
- **Load test** : charge modérée et soutenue (`load-test.js`)
- **Stress test** : montée progressive jusqu'à saturation (`stress-test.js`)
- **Soak test** : charge moyenne prolongée (`soak-test.js`)
- **Spike test** : pic soudain de trafic (JMeter, `spike-test.jmx`)

## Lancer les tests K6

1. Installer K6 :
   ```sh
   brew install k6 # ou voir https://k6.io/docs/getting-started/installation/
   ```
2. Lancer un test (exemple pour le load test) :
   ```sh
   k6 run tests/load/k6/load-test.js
   ```
   Pour le stress test :
   ```sh
   k6 run tests/load/k6/stress-test.js
   ```
   Pour le soak test :
   ```sh
   k6 run tests/load/k6/soak-test.js
   ```

## Lancer le spike test JMeter

1. Ouvrir JMeter (GUI)
2. Fichier > Ouvrir > `tests/load/jmeter/spike-test.jmx`
3. Adapter l'URL/port si besoin
4. Lancer le test et observer les résultats

## Interprétation des résultats

- **Latence** : doit rester < 500ms pour 95% des requêtes
- **Taux d'erreur** : < 1%
- **RPS (requêtes/seconde)** : doit rester stable
- **Comportements anormaux** : pics d'erreur, latence excessive, saturation CPU/mémoire

Inclure dans ce dossier :
- Captures d'écran ou exports des résultats K6/JMeter
- Analyse : seuils atteints ? problèmes observés ?

---

## Exemple de résultats (load-test)

### Paramètres du test
- 4 scénarios lancés en parallèle
- 70 utilisateurs virtuels max
- 15 secondes de charge par scénario

### Résumé des résultats

- **Total d'itérations** : 1050
- **Checks réussis** : 375 / 1050 (**35,7%**)
- **Checks échoués** : 675 / 1050 (**64,3%**)
- **Taux d'erreur HTTP** : 64,3%
- **Latence moyenne** : 9,76 ms (p95 = 63,74 ms)
- **RPS (requêtes/seconde)** : ~69/s

#### Détail par scénario
- **Réservation OK** : 0% de succès (0/375)
- **Création OK** : 0% de succès (0/150)
- **Annulation OK** : 0% de succès (0/150)
- **Planning consulté** : 100% de succès

### Analyse
- Le backend supporte très bien la charge sur la consultation du planning (aucune erreur, latence très faible).
- Les scénarios de réservation, création de compte et annulation échouent totalement (probablement à cause d'un manque d'authentification ou de données invalides).
- La latence reste très faible même en cas d'échec, ce qui indique que le backend répond rapidement (même pour refuser les requêtes).

### Recommandations
- Vérifier les logs backend pour comprendre la cause des échecs (statut 401, 403, 404, 500, etc.).
- Adapter les scripts K6 pour ajouter l'authentification ou des données valides si nécessaire.
- Réexécuter le test après correction pour valider la robustesse du backend sur tous les scénarios.

## Exemple de résultats (stress-test)

### Paramètres du test
- 4 scénarios lancés en parallèle
- Jusqu'à 500 utilisateurs virtuels max
- Montée progressive de la charge sur 1m15s (booking/planning), 1m (cancellation/userCreation)

### Résumé des résultats

- **Total d'itérations** : 13 767
- **Checks réussis** : 5 599 / 13 767 (**40,7%**)
- **Checks échoués** : 8 168 / 13 767 (**59,3%**)
- **Taux d'erreur HTTP** : 59,3%
- **Latence moyenne** : 3,82 ms (p95 = 8,8 ms)
- **RPS (requêtes/seconde)** : ~182/s

#### Détail par scénario
- **Réservation OK** : 0% de succès (0/5 609)
- **Création OK** : 0% de succès (0/1 280)
- **Annulation OK** : 0% de succès (0/1 279)
- **Planning consulté** : 100% de succès

### Analyse
- Le backend supporte une montée en charge très importante sur la consultation du planning (aucune erreur, latence très faible même à 200 VUs).
- Les scénarios de réservation, création de compte et annulation échouent totalement (probablement à cause d'un manque d'authentification ou de données invalides).
- La latence reste très faible même en cas d'échec, ce qui indique que le backend répond rapidement (même pour refuser les requêtes).

### Recommandations
- Vérifier les logs backend pour comprendre la cause des échecs (statut 401, 403, 404, 500, etc.).
- Adapter les scripts K6 pour ajouter l'authentification ou des données valides si nécessaire.
- Réexécuter le test après correction pour valider la robustesse du backend sur tous les scénarios.

## Exemple de résultats (soak-test)

### Paramètres du test
- 4 scénarios lancés en parallèle
- 30 utilisateurs virtuels max
- 15 secondes de charge par scénario

### Résumé des résultats

- **Total d'itérations** : 450
- **Checks réussis** : 150 / 450 (**33,3%**)
- **Checks échoués** : 300 / 450 (**66,7%**)
- **Taux d'erreur HTTP** : 66,7%
- **Latence moyenne** : 6,55 ms (p95 = 21,92 ms)
- **RPS (requêtes/seconde)** : ~30/s

#### Détail par scénario
- **Réservation OK** : 0% de succès (0/150)
- **Création OK** : 0% de succès (0/75)
- **Annulation OK** : 0% de succès (0/75)
- **Planning consulté** : 100% de succès

### Analyse
- Le backend supporte sans problème une charge prolongée sur la consultation du planning (aucune erreur, latence très faible).
- Les scénarios de réservation, création de compte et annulation échouent totalement (probablement à cause d'un manque d'authentification ou de données invalides).
- La latence reste très faible même en cas d'échec, ce qui indique que le backend répond rapidement (même pour refuser les requêtes).

### Recommandations
- Vérifier les logs backend pour comprendre la cause des échecs (statut 401, 403, 404, 500, etc.).
- Adapter les scripts K6 pour ajouter l'authentification ou des données valides si nécessaire.
- Réexécuter le test après correction pour valider la robustesse du backend sur tous les scénarios.
