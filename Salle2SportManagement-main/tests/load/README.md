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

**N'oubliez pas d'adapter les endpoints dans les scripts selon votre API réelle !**
