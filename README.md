# Magnitude — le jeu des grands nombres

Jeu d’estimation numérique en équipes : une équipe **estime** un nombre (une date, une distance, une quantité), l’autre **conteste** en annonçant *Plus*, *Moins* ou *Tout Pile*. Solo, défi contre l’ordinateur, duel sur un écran et multijoueur en ligne par code de salon.

- Application web responsive, installable (PWA), jouable hors ligne en solo et en local.
- Serveur temps réel faisant autorité sur les parties en ligne.
- 400 questions sourcées, réparties en 17 catégories et 4 niveaux.
- Bande-son originale : thème, musique adaptative, 24 jingles, 14 sons d’interface.

---

## Sommaire

1. [Lancer le jeu](#lancer-le-jeu)
2. [Fonctionnalités](#fonctionnalités)
3. [Règles et barème](#règles-et-barème)
4. [Architecture](#architecture)
5. [Tests et vérifications](#tests-et-vérifications)
6. [Multijoueur : configuration](#multijoueur--configuration)
7. [Variables d’environnement](#variables-denvironnement)
8. [Déploiement](#déploiement)
9. [Bande-son](#bande-son)
10. [Base de questions](#base-de-questions)
11. [Licences et crédits](#licences-et-crédits)
12. [Limites connues](#limites-connues)

---

## Lancer le jeu

Prérequis : **Node.js 22.18 ou plus récent** (le serveur et les tests exécutent TypeScript directement).

```bash
npm install          # dépendances (React, ws, esbuild, TypeScript, Playwright)
npm run build        # compile le client (dist/public) et le serveur (dist/server.js)
npm start            # http://localhost:8080
```

Pour jouer en ligne entre plusieurs appareils du même réseau, ouvrez `http://<adresse-IP-de-la-machine>:8080`. Pour jouer à distance, déployez le serveur (voir [Déploiement](#déploiement)).

Développement (recompilation et redémarrage automatiques) :

```bash
npm run dev          # http://localhost:8080
```

Commandes disponibles :

| Commande | Rôle |
| --- | --- |
| `npm run build` | Compilation de production (client minifié, gzip, service worker, serveur en un fichier) |
| `npm start` | Démarre le serveur de production |
| `npm run dev` | Mode développement |
| `npm run typecheck` | Vérification des types (`tsc --strict`) |
| `npm run lint` | Types + vérifications propres au projet (`scripts/lint.mjs`) |
| `npm test` | Tests unitaires et d’intégration (moteur, IA, base de questions, salons, multijoueur réel) |
| `npm run test:e2e` | Tests de parcours dans Chromium (solo, IA, deux navigateurs en ligne) |
| `npm run check` | Tout ce qui précède, dans l’ordre |
| `npm run audio` | Reproduit la bande-son (voir [Bande-son](#bande-son)) |
| `npm run icons` | Régénère les icônes PNG de l’application installable |

---

## Fonctionnalités

### Modes de jeu (tous implémentés et testés)

| Mode | Description |
| --- | --- |
| **Solo — Série** | 10 questions, score à la précision, étoiles, records par difficulté |
| **Solo — Rapide** | 6 questions de 20 s, bonus de vitesse |
| **Solo — Survie** | Difficulté croissante, trois vies, une vie regagnée à chaque Tout Pile |
| **Défi contre l’ordinateur** | Trois adversaires : Néo (débutant), Vega (intermédiaire), Oracle (expert) |
| **Duel sur un écran** | Deux équipes se passent l’appareil ; départage par estimations secrètes |
| **En ligne** | Salons par code de 5 caractères, 2 à 12 joueurs, équipes, porte-parole tournant |
| **Formats** | Classique (premier à 12), Rapide (premier à 6), Personnalisé (toutes les règles) |

### Difficultés

| Niveau | Questions tirées | Tolérance Tout Pile | Chrono | Barème |
| --- | --- | --- | --- | --- |
| Découverte | niveaux 1–2 | ×1,6 | 60 s | classique |
| Normal | niveaux 1–3, progressif | référence | 45 s | classique |
| Expert | niveaux 2–4 | ×0,6 | 40 s | Tout Pile = 4 |
| Maître | niveaux 2–4, surtout 3–4 | ×0,35 | 35 s | Tout Pile = 5, exact = +2 |

La tolérance est arrondie au pas de saisie : en Maître, une tolérance de « ±2 ans » devient « valeur exacte ».

### Mécaniques additionnelles

- **Jokers** limités par équipe et par partie : *Indice* (fourchette contenant la réponse, visible uniquement par l’équipe qui estime), *Échange* (nouvelle question, chrono relancé), *Pari Tout Pile* (points doublés si dans la zone, sinon +1 pour l’adversaire), *Quitte ou double* (tous les points de la manche ×2).
- **Manche Prime** : une manche sur quatre, points ×2.
- **Départage** en cas d’égalité finale : une question, deux estimations secrètes, la plus proche gagne (trois départages au plus).
- **Progression** : expérience, six rangs, difficultés solo débloquées par le rang, 16 succès.
- **Statistiques** (uniquement issues de parties réellement jouées sur l’appareil) : précision, précision par catégorie, courbe d’évolution, records, contestations réussies, historique. Le solo et les parties à deux équipes sont distingués.

### Interface

- Plateau en WebGL (projecteurs aux couleurs des équipes, brume, mur de LED, sol réfléchissant) piloté par le jeu, avec repli CSS.
- La **Règle** de révélation : échelle linéaire ou logarithmique automatique, zone Tout Pile, repère animé de la réponse.
- Mobile : clavier numérique, saisie française (« 1 234,5 », « 3,5 M », « 2 milliards »), zones de sécurité, aucun défilement horizontal (vérifié écran par écran à 360 px).
- Accessibilité : focus visibles, navigation clavier, raccourcis (↑ ↓ Espace Entrée Échap), libellés ARIA, informations jamais portées par la seule couleur, contraste renforcé, réduction des animations (système ou forcée).
- Écrans d’erreur et de reprise : serveur injoignable, reconnexion, salon expiré, code inconnu, stockage bloqué, erreur inattendue (écran de reprise au lieu d’une page blanche).

---

## Règles et barème

Une manche : question → estimation verrouillée → contestation → révélation. Les rôles s’inversent à chaque manche.

| Situation | Équipe qui estime | Équipe qui conteste |
| --- | --- | --- |
| Dans la zone, contestation Plus ou Moins | **+3** | 0 |
| Dans la zone, contestation Tout Pile | **+2** | **+1** |
| Valeur exacte (écart nul) | **+1** de bonus | — |
| Hors zone, contestation dans le bon sens | 0 | **+1** |
| Hors zone, contestation dans le mauvais sens | **+1** | 0 |
| Hors zone, contestation Tout Pile | **+2** | 0 |
| Aucune estimation à temps | 0 | **+1** |
| Aucune contestation à temps (hors zone) | **+1** | 0 |

Toutes ces valeurs viennent d’un seul endroit : `src/shared/config.ts` (`CLASSIC_SCORING`, `DIFFICULTY_PROFILES`), modifiables en mode Personnalisé. Les comparaisons se font en entiers mis à l’échelle (`BigInt`, 6 décimales) : une estimation exacte n’est jamais jugée fausse à cause d’un arrondi. Cas limites définis et testés : bornes de tolérance incluses, nombres négatifs (températures), décimales, valeurs manquantes, saisies invalides, années à 4 chiffres au plus.

En solo : Tout Pile 100 points (+50 si exact), puis selon l’écart normalisé : Proche 70, Correct 40, Loin 15, Raté 0 ; multiplicateur de série jusqu’à ×2 ; coefficient de difficulté (×1 à ×2).

---

## Architecture

```
src/
  shared/        Code commun client/serveur, sans dépendance
    engine.ts    Moteur des parties à deux équipes (machine à états pure, déterministe)
    solo.ts      Moteur des modes solo
    ai.ts        Adversaire ordinateur (modèle de connaissance bruitée + espérance de points)
    config.ts    Barème, difficultés, paramètres et leur validation (client ET serveur)
    numbers.ts   Saisie, affichage, comparaison exacte, tolérances
    deck.ts      Tirage des questions (niveaux, sujets distincts, anti-répétition)
    protocol.ts  Messages temps réel et leur validation
    questions/   Les 400 questions, un fichier par catégorie
  server/
    rooms.ts     Salons, équipes, porte-parole, autorité, reconnexion, expiration, sauvegarde
    index.ts     HTTP (fichiers statiques précompressés, en-têtes de sécurité) + WebSocket
  client/
    screens/     Écrans (accueil, menu, solo, configuration, partie, en ligne, stats…)
    game/        Contrôleur local, client temps réel, régisseur (sons + lumières)
    audio/       Moteur Web Audio (bus, boucles, couches adaptatives, atténuation)
    stage/       Scène WebGL
    ui/          Composants (règle, saisie, chrono, compteur, modale, icônes, avatars)
    lib/         Persistance locale, progression, succès
audio/           Production de la bande-son (Python : composition, échantillonneur, mixage)
tests/           Tests unitaires et d’intégration (node:test)
e2e/             Tests de parcours dans un vrai navigateur (Playwright)
public/          Polices, icônes, manifeste PWA, audio produit
```

### Choix techniques

- **TypeScript strict + React 19**, compilés par **esbuild** (client : 146 Kio gzip ; serveur : un seul fichier).
- **Serveur Node.js + WebSocket (`ws`)** plutôt qu’un backend géré (Supabase…). Justification : la logique de jeu doit s’exécuter côté serveur pour garder les réponses secrètes, gérer les chronos et valider chaque action ; un backend géré aurait imposé de recoder ce moteur en fonctions serveur et un compte externe. Ici, **le même moteur** (`src/shared/engine.ts`) tourne dans le navigateur (parties locales) et sur le serveur (parties en ligne), et l’ensemble se déploie comme **un seul service, sans compte ni service payant obligatoire**.
- **Aucun compte utilisateur** : pseudo et avatar suffisent. Les données personnelles (statistiques, réglages) restent dans le navigateur (`localStorage`, protégé contre l’indisponibilité).
- **Animations** en CSS et Web Animations (pas de bibliothèque), désactivables. **Sons** par Web Audio API.

### Intégrité et sécurité du multijoueur

- Le serveur exécute le moteur et diffuse à chaque joueur une **vue filtrée** : jamais de réponse, d’explication ni de paquet de questions avant la révélation ; l’indice n’est envoyé qu’à l’équipe qui l’a demandé ; les estimations secrètes du départage restent cachées.
- Chaque action porte un **identifiant unique** (doublon = même accusé, aucun double effet) et **l’étape** visée (action périmée refusée). Seul le **porte-parole** de l’équipe concernée peut agir ; seul l’hôte peut lancer, régler, exclure, passer une révélation.
- Messages validés (schéma, tailles, valeurs finies, décimales autorisées), paramètres bornés côté serveur, textes nettoyés, 8 Kio par message, **limitation de débit** par connexion (seau à jetons) et par IP pour les créations/jonctions.
- Reconnexion par **jeton secret** de 24 octets, comparé en temps constant ; une seule connexion active par joueur.
- En-têtes HTTP : CSP stricte, `nosniff`, `frame-ancestors`, `Referrer-Policy`, `Permissions-Policy`.
- Aucune clé ni secret dans le dépôt : le serveur n’en a besoin d’aucun.

### Réseau : coupures et cas limites

- Reconnexion automatique (0,5 s → 8 s), reprise après rafraîchissement de la page (session par onglet), synchronisation d’horloge (médiane de 7 mesures ping/pong) pour des chronos identiques.
- Les chronos tournent **sur le serveur** : une équipe absente perd simplement ses manches ; la partie ne se bloque jamais.
- Hôte absent plus de 15 s : un autre joueur connecté devient hôte. Équipe entièrement partie : forfait après 20 s. Joueur parti du salon d’attente : retiré après 2 min.
- Expiration : salon vide 10 min, partie abandonnée 15 min, partie terminée 30 min.
- Sauvegarde des salons sur disque toutes les 3 s et à l’arrêt (`DATA_DIR`), restaurés au redémarrage.

---

## Tests et vérifications

Résultats obtenus dans l’environnement de développement :

| Commande | Résultat |
| --- | --- |
| `npm run typecheck` | 0 erreur |
| `npm run lint` | 58 fichiers, 400 questions, aucun problème |
| `npm test` | **61 tests, 61 réussis** |
| `npm run build` | réussi |
| `npm run test:e2e` | **6 parcours, 6 réussis** (Chromium 141) |

Ce qui est couvert :

- **Moteur** : valeur exacte, tolérance (bornes incluses), trop haut / trop bas, contestations justes et fausses, Tout Pile partagé et raté, absence de réponse, pari, quitte ou double, Manche Prime, égalité et départage (y compris égalité parfaite), victoire au score, fin au nombre de manches, forfait, chronos, déterminisme, immutabilité de l’état, refus des actions hors phase / hors tour / répétées / invalides, filtrage de la vue, validation des paramètres hostiles.
- **Nombres** : saisie française et internationale, suffixes, erreurs explicites, comparaison sans erreur d’arrondi (0,1 + 0,2), tolérances arrondies.
- **Base de questions** : au moins 300 questions, intégrité, doublons et quasi-doublons, toutes les catégories et niveaux présents, réponse exacte « Tout Pile » à chaque difficulté, indice toujours valide.
- **IA** : estimations plausibles, précision croissante avec le niveau, jamais systématiquement exacte, contestation cohérente.
- **Multijoueur réel** (`tests/multiplayer.test.ts`) : le vrai serveur est lancé et **plusieurs clients WebSocket** s’y connectent : création, code valide/invalide/inexistant, salon verrouillé, partie commencée, lancement sans équipes complètes, synchronisation des phases, porte-parole, propositions d’équipe, action en double, action périmée, valeur invalide, réponse cachée, scores identiques sur 4 clients, fin de partie et revanche, reconnexion (et jeton falsifié refusé), déconnexion de l’hôte, départ d’un joueur et forfait, exclusion, fermeture, paramètres réservés à l’hôte, limitation de débit.
- **Salons** (`tests/rooms.test.ts`) : rotation du porte-parole, sauvegarde et restauration après redémarrage, expiration, unicité des codes.
- **Parcours navigateur** (`e2e/game.e2e.ts`) : chargement sans erreur (manifeste, service worker, bande-son), chaque entrée du menu sur mobile sans défilement horizontal, série solo complète de 10 questions avec enregistrement des statistiques, défi contre l’IA, **partie en ligne entre deux navigateurs** (création, lien d’invitation au code prérempli, même question, estimation, contestation, mêmes scores, rechargement de page en pleine partie), code inconnu.

Contrôles visuels effectués par captures d’écran à 1440×900, 1280×860, 390×844 et 360×740 (accueil, menu, configuration, introduction de manche, question, contestation, révélation, fin de partie, salon, catégories, statistiques, paramètres, règles).

---

## Multijoueur : configuration

Aucune configuration externe n’est nécessaire : le serveur Magnitude **est** le serveur multijoueur. Il suffit qu’il soit joignable par les joueurs.

1. Déployez le service (Docker ou Node) sur un hébergeur qui accepte les WebSockets.
2. Ouvrez l’adresse publique : le client se connecte automatiquement à `wss://<même-domaine>/ws`.
3. L’hôte crée un salon et partage le **code** ou le **lien d’invitation** (`https://<domaine>/?code=ABCDE`).

Pour héberger le client ailleurs que le serveur, définissez `window.MAGNITUDE_WS = 'wss://serveur/ws'` avant le script, et ajoutez l’origine du client à `ALLOWED_ORIGINS`.

### Mise à l’échelle

Les salons vivent en mémoire d’un **processus unique** (sauvegardés sur disque). Un processus gère largement des centaines de salons simultanés. Pour plusieurs instances, il faudrait router chaque code de salon vers la même instance (affinité de session) ou externaliser l’état (Redis…) : ce n’est pas implémenté.

---

## Variables d’environnement

Aucune n’est obligatoire, aucune n’est secrète. Modèle : `.env.example` (chargeable avec `node --env-file=.env dist/server.js`).

| Variable | Défaut | Rôle |
| --- | --- | --- |
| `PORT` | `8080` | Port d’écoute |
| `HOST` | `0.0.0.0` | Interface d’écoute |
| `STATIC_DIR` | `dist/public` | Client compilé |
| `DATA_DIR` | `data` | Sauvegarde des salons ; vide = désactivée |
| `ALLOWED_ORIGINS` | *(toutes)* | Origines acceptées pour le WebSocket |
| `TRUST_PROXY` | `0` | `1` derrière un proxy, pour lire l’IP réelle |
| `JOIN_RATE_PER_MIN` | `15` | Créations/jonctions de salon par IP et par minute |
| `MAX_ROOMS` | `2000` | Nombre maximal de salons |
| `EXTRA_QUESTIONS` | — | Fichier JSON de questions supplémentaires (même format que `Question`) |
| `HOST_GRACE_MS`, `FORFEIT_GRACE_MS`, `LOBBY_DROP_MS`, `EMPTY_LOBBY_MS`, `EMPTY_GAME_MS`, `FINISHED_IDLE_MS` | voir `src/server/rooms.ts` | Délais de reprise et d’expiration |

---

## Déploiement

Le service expose `/healthz` (état JSON) pour les sondes de santé.

### Docker (n’importe quel hébergeur)

```bash
docker build -t magnitude .
docker run -d -p 8080:8080 -v magnitude-data:/data --name magnitude magnitude
```

Placez ensuite un proxy HTTPS devant (Caddy, Nginx, Traefik) en transmettant les en-têtes `Upgrade`/`Connection`, et définissez `TRUST_PROXY=1`. Exemple Caddy : `jeu.exemple.fr { reverse_proxy 127.0.0.1:8080 }`.

### Render

1. Poussez le dépôt sur GitHub, puis *New → Blueprint* : `render.yaml` crée le service Docker.
2. Offre gratuite : le service s’endort après inactivité (premier chargement lent) et n’a pas de disque (les salons en cours sont perdus au redémarrage). Avec un disque persistant monté sur `/data`, définissez `DATA_DIR=/data`.

### Fly.io

```bash
fly launch --copy-config --no-deploy
fly volumes create magnitude_data --size 1
fly deploy
```

### Machine virtuelle (sans Docker)

```bash
npm install && npm run build
PORT=8080 DATA_DIR=/var/lib/magnitude node dist/server.js
```

(à faire tourner sous systemd ou pm2, derrière un proxy HTTPS).

---

## Bande-son

Toute la musique et tous les sons ont été **composés et produits pour Magnitude**, par programme, dans `audio/` :

- un **leitmotiv** (ré – la – ré – fa, quatre marches qui montent comme des ordres de grandeur) décliné partout, toujours en ré pour que jingles et musiques se fondent ;
- **échantillons orchestraux réels** (cuivres, cordes, timbales, cymbales, harpe, glockenspiel, flûte) de la *VS Chamber Orchestra Community Edition* (CC0), dont la hauteur de chaque instrument a été mesurée par analyse (algorithme YIN, modes propres des timbales) ;
- synthétiseurs, basses et percussions synthétisées (anti-repliement PolyBLEP, filtres résonants, FM) ;
- mixage : égalisation, compression, sidechain, réverbération à convolution (réponses impulsionnelles générées), délais ; mastering avec limiteur et normalisation de sonie **ITU-R BS.1770** (musiques −16 à −19,5 LUFS, crête ≤ −1 dBTP) ;
- encodage en **Opus/WebM** (Chrome, Firefox, Edge, Safari récents) et **AAC/M4A** (repli), choisi automatiquement.

| Fichier | Rôle |
| --- | --- |
| `theme` | Thème principal (menus), 120 BPM, ré mineur, intro + boucle de 48 s |
| `lobby` | Salon d’attente, 96 BPM, fa majeur, groove |
| `think_a` + `think_b` | Musique **adaptative** de réflexion : deux couches synchronisées ; la couche « pression » monte quand le chrono baisse et pendant la contestation |
| `results` | Podium, ré majeur, leitmotiv triomphal |
| `st_*` (24) | Jingles : début de partie, manche, Manche Prime, verrouillage, contestation, suspense (2,6 s et 1,4 s), Tout Pile, Tout Pile partagé, bonne et mauvaise issue, victoire, défaite, égalité, temps écoulé, jokers, départage, série, arrivée et départ d’un joueur |
| `ui_*` (14) | Sons d’interface, accordés en ré |

Dans le jeu : aucun son avant un geste du joueur, bus séparés (musique, jingles, interface) avec réglages de volume, sourdine, musique atténuée sous les jingles, coupure quand l’onglet est masqué, boucles sans couture (points de bouclage au sample près).

**Reproduire la bande-son** (facultatif, les fichiers produits sont fournis dans `public/audio`) :

```bash
git clone --depth 1 https://github.com/sgossner/VSCO-2-CE.git /chemin/VSCO-2-CE
VSCO_DIR=/chemin/VSCO-2-CE npm run audio            # tout (≈ 3 min, Python 3 + numpy + scipy + ffmpeg)
VSCO_DIR=/chemin/VSCO-2-CE python3 audio/build.py st_pile theme   # sélection
```

`audio/analyze.py` produit pour chaque musique sonie, crête vraie, corrélation stéréo, répartition spectrale et spectrogramme.

---

## Base de questions

- 400 questions dans `src/shared/questions/` (un fichier par catégorie), chacune avec : identifiant, texte, catégorie, niveau, réponse, unité, nature (année, quantité, mesure…), tolérance absolue ou relative, décimales autorisées, explication, **source**, date de la donnée pour les valeurs qui évoluent (`asOf`), étiquette de sujet (deux questions du même sujet ne tombent jamais dans la même partie).
- Les chiffres les plus susceptibles d’avoir changé (démographie française, population de Paris, nombre de communes, ventes de consoles, distance du Tour de France 2023, longueur de la Loire, Bulgarie dans la zone euro…) ont été **vérifiés auprès de sources en ligne** pendant la rédaction et sont datés dans la question. Les distances à vol d’oiseau sont calculées (formule de haversine). Les questions dont la valeur n’a pas pu être confirmée ont été écartées. Les autres valeurs, stables (dates historiques, constantes, dimensions réglementaires), proviennent des références citées sans revérification individuelle : une relecture humaine reste recommandée avant une diffusion publique.
- `auditQuestions()` (exécuté par les tests, le lint et au démarrage du serveur) refuse les doublons, quasi-doublons, tolérances incohérentes, réponses impossibles à saisir et sources manquantes.
- Anti-répétition : les 220 dernières questions vues sur l’appareil passent en fin de paquet.

Ajouter des questions : éditer le fichier de la catégorie (format compact documenté dans `questions/make.ts`), puis `npm test`.

---

## Licences et crédits

- Code, textes, questions, identité visuelle, logo, avatars, icônes et musique : créations originales pour ce projet.
- Échantillons orchestraux : **VS Chamber Orchestra: Community Edition** (Versilian Studios), licence **CC0 1.0** — utilisés dans le rendu de la musique, non redistribués en tant que tels.
- Polices **Unbounded** et **Archivo** : SIL Open Font License 1.1 (fichiers de licence dans `public/fonts/`).
- Dépendances : React (MIT), ws (MIT), esbuild (MIT), TypeScript (Apache-2.0), Playwright (Apache-2.0).

---

## Limites connues

- **Déploiement en ligne non effectué** : le serveur, Docker et les fichiers `render.yaml` / `fly.toml` sont prêts, mais aucun déploiement public n’a été fait ni testé (cela nécessite votre compte chez un hébergeur). Le multijoueur a été validé localement avec de vrais clients WebSocket et deux vrais navigateurs.
- **Image Docker non construite** dans l’environnement de développement (Docker indisponible) ; le Dockerfile n’a donc pas été exécuté.
- **Dépendances** : le registre npm était bloqué dans l’environnement de développement ; le projet a été construit et testé avec des versions préinstallées (React 19.2.8, ws 8.21.3, esbuild 0.28.2, TypeScript 6.0.3, Playwright 1.56.0). Les versions des paquets `@types/*` dans `package.json` sont indicatives, et **aucun `package-lock.json` n’a pu être généré** : lancez `npm install` une première fois pour le créer.
- **ESLint** n’est pas configuré (l’analyseur TypeScript n’était pas installable) : le lint repose sur `tsc --strict` (avec `noUnusedLocals`, `noImplicitReturns`…) et des contrôles propres au projet.
- **Réponses dans le client** : les questions et réponses sont incluses dans l’application pour permettre le jeu solo hors ligne. En ligne, le serveur ne transmet jamais la réponse avant la révélation, mais un joueur déterminé pourrait chercher la réponse dans le code de l’application. Pour des parties en ligne à enjeu, fournissez au serveur des questions privées via `EXTRA_QUESTIONS` (elles ne sont jamais envoyées au navigateur avant la révélation) et retirez-les du client.
- **Application native** : Magnitude est une application web installable (PWA), pas une application iOS/Android publiée en magasin.
- **Une seule instance serveur** (voir [Mise à l’échelle](#mise-à-léchelle)).
- **Bande-son** : vérifiée par analyse objective (harmonie, sonie, crêtes, jointures de boucle, spectrogrammes) ; aucune écoute humaine n’a pu être faite pendant la production.
