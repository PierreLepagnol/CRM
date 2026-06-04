# 2. Import en masse de contacts : dédoublonnage par email, enrichissement « si vide », sans table de staging ni annulation

Date : 2026-06-04

## Statut

Accepté

## Contexte

Le besoin : alimenter le pipeline avec des **listes de prospects** issues de
sources hétérogènes (export LinkedIn, liste partenaire, feuille de salon),
fournies en **CSV ou XLSX**. Chaque contact importé doit entrer comme
**Prospect** (stage `nouveau`). Trois exigences fortes : validation complète,
détection des **Doublons**, et **stratégie de fusion par champ** avec une
**validation humaine en masse** avant écriture.

Un import touche potentiellement des centaines de Contacts d'un coup et peut
créer des Entreprises (entité de premier ordre, cf. ADR 0001). Les choix de
sémantique de rapprochement et de fusion sont donc structurants et coûteux à
revoir une fois des données écrites. Plusieurs approches raisonnables existaient
(rapprochement par nom, « l'import fait foi », table de staging persistée,
annulation complète) ; ce document fige celles retenues et **pourquoi les
autres ont été écartées**, pour éviter qu'on les re-propose plus tard.

## Décision

### Critère de doublon : l'email, et lui seul

Deux contacts sont le même si leur **email normalisé** (minuscules + trim)
coïncide. Une ligne **sans email** n'est **jamais** un doublon : c'est toujours
une **Création**. On ne fait **aucun** rapprochement par nom — même esprit
« sans flou » que la Fusion d'Entreprises (cf. ADR 0001).

Conséquence assumée : deux homonymes sans email deviennent deux Contacts
distincts.

### Fusion par champ : « remplir si vide » (Enrichissement)

Quand une ligne matche un Contact existant, l'import ne crée rien : il
**complète les champs vides** sans jamais écraser une donnée déjà saisie. Les
**notes sont concaténées** (réutilise `resolveMergedNotes`, comme la Fusion) —
**sauf** si les notes entrantes sont **identiques** (au trim près) à celles déjà
stockées : on ne ré-concatène pas, pour ne pas dupliquer le contenu lors d'un
ré-import du même fichier. Si, une fois la stratégie par champ appliquée, **aucun
champ ne changerait**, l'enrichissement est un **no-op** : on **n'écrit rien** et
la ligne est comptée comme **ignorée** (« déjà à jour »), pas comme enrichie.
Le **stage n'est jamais modifié** : un Contact `gagne` ne peut pas être ramené à
Prospect par un import. Le **propriétaire** d'un Contact matché est conservé ;
celui d'un Contact créé est l'**importateur**.

C'est le **défaut** : la validation humaine permet de surcharger la stratégie
**par champ pour tout le lot** (« remplir si vide » / « l'import écrase » / « ne
pas toucher ») et d'accepter/refuser **ligne par ligne**.

### Rattachement d'Entreprise : match exact, sinon résolution en revue

Le nom d'entreprise de chaque ligne est rattaché automatiquement si son **nom
normalisé** correspond exactement à une Entreprise existante. Les noms **non
reconnus** (distincts) sont remontés dans l'étape de revue où l'importateur
choisit une Entreprise existante ou confirme la création. On ne crée **jamais**
d'Entreprise en silence sur un quasi-doublon (respect d'ADR 0001).

### Staging éphémère, commit unique et atomique

Le fichier est **parsé dans le navigateur** (PapaParse + SheetJS), classé via
une **query** Convex (création / enrichissement / erreur, match Entreprise), revu
dans l'état client, puis envoyé à une **unique mutation de commit** qui
**re-valide** de façon autoritaire (le préchargement n'est qu'indicatif : la
base peut changer entre revue et commit). Il n'existe **aucune table de
staging**. Plafond ~500 lignes par fichier → un commit reste **atomique**
(tout-ou-rien) ; les fichiers trop volumineux sont rejetés.

### Pas d'annulation, pas de trace de lot

Après commit, on affiche un **récapitulatif** (créés / enrichis / ignorés +
erreurs). Le compteur **ignorés** agrège les lignes refusées par l'humain, les
lignes en erreur **et** les doublons sans changement (« déjà à jour ») ; ces
derniers sont distingués dans le libellé affiché (« N ignorés, dont M déjà à
jour »). Aucun enregistrement de lot n'est conservé, aucune annulation n'est
fournie. Une erreur se corrige par l'édition / suppression douce normale d'un
Contact. **Rejouer le même fichier est un no-op** : le dédoublonnage par email
rend les Créations idempotentes, et le court-circuit sur notes identiques + le
saut des enrichissements sans changement étendent l'idempotence **aux doublons**
(aucune écriture, pas même un `updated_at`).

### Accès

L'import suit la même garde que la création unitaire : **droit d'écriture
Contacts** (`requireContactWrite`). Pas de nouvelle clé de permission.

## Alternatives écartées

- **Rapprochement par nom (prénom+nom+entreprise)** en repli quand l'email
  manque : écarté car il produit de faux positifs (deux « Jean Martin » d'une
  même banque), contre l'esprit « sans flou » d'ADR 0001.
- **« L'import fait foi » (incoming wins)** : l'import écrase toute valeur
  existante non vide. Écarté comme **défaut** car destructif sur des données déjà
  saisies ; reste disponible **par champ** via la surcharge en revue.
- **Table de staging persistée** (`import_batches` / `import_rows`) : reprise
  après rafraîchissement, audit, gros volumes. Écartée pour un CRM d'équipe à
  ~500 lignes : surcoût de schéma, de cycle de vie et de nettoyage des lots
  abandonnés, sans bénéfice à cette échelle.
- **Annulation complète du dernier import** (état avant/après par contact) :
  écartée car elle exige précisément les tables de staging/audit refusées
  ci-dessus ; le rapport coût/risque ne le justifie pas à cette échelle.
- **Honorer une colonne `stage`** (round-trip export → ré-import) : écarté car
  le besoin est explicitement « entrer comme Prospect ». Le stage n'est pas
  mappable ; seuls les champs `nouveau` s'appliquent aux Créations.

## Conséquences

- **Nouvelles dépendances front** : PapaParse et SheetJS (parsing client,
  lecture seule) et `react-dropzone` (dépôt glisser-déposer du fichier ; le
  glisser-déposer n'est qu'un déclencheur alternatif — un seul fichier, types
  `.csv/.xlsx/.xls`, et la même chaîne `onFile` → parse → plafond 500 lignes).
- **Validation lenient** : seules les lignes sans `prénom`/`nom` ou au `montant`
  invalide sont bloquées ; le reste (email vide/malformé, entreprise non
  reconnue, doublon intra-fichier) est un **avertissement** tranché par l'humain.
- **Doublon intra-fichier** : lignes de même email **fusionnées** avant revue
  (la première l'emporte, les notes se concatènent) avec avertissement.
- **Normalisation `montant`** : formats français (espaces, NBSP, `€`, virgule
  décimale) nettoyés avant validation ; non-parsable → erreur bloquante.
- **Nettoyage manuel attendu** : comme pour les Entreprises (ADR 0001), les
  quasi-doublons d'email (fautes de frappe) ou d'entreprise survivent et se
  résorbent ensuite via l'édition / la Fusion manuelle.
- **Nouvelle route** `/contacts/import` (stepper : mapping → revue → commit),
  accessible depuis la page Contacts à côté de l'export.
