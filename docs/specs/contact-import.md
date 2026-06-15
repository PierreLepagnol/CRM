# Spec — Import en masse de contacts (CSV / XLSX)

> **Document de handoff.** Autoportant : tout le vocabulaire de domaine et les
> dépendances nécessaires sont rappelés ici. Aucun accès au dépôt d'origine
> n'est requis pour implémenter cette fonctionnalité.
>
> Source : CRM SCIAM — dérivé du glossaire de domaine (CONTEXT.md) et des
> décisions d'architecture ADR 0001 (Entreprise) et ADR 0002 (Import).
> Statut d'origine : **Accepté** (2026-06-04).

---

## 1. Objectif

Alimenter le pipeline commercial avec des **listes de prospects** issues de
sources hétérogènes (export LinkedIn, liste partenaire, feuille de salon),
fournies en **CSV ou XLSX**. Chaque contact importé entre dans le pipeline
comme **Prospect**.

L'opérateur :
1. dépose un fichier,
2. mappe les colonnes vers les champs Contact,
3. revoit le lot (doublons détectés, rattachements d'entreprise à résoudre,
   erreurs),
4. valide le lot en une seule fois (**validation humaine en masse**),
5. obtient un récapitulatif (créés / enrichis / ignorés + erreurs).

C'est une opération distincte de la **création unitaire** d'un Contact.

---

## 2. Glossaire de domaine (rappel autoportant)

| Terme | Définition |
|---|---|
| **Contact** | Une personne suivie dans le CRM. Porte un `stage` de pipeline, un montant, des coordonnées (email, téléphone, profil LinkedIn), et des liens vers des utilisateurs internes (Propriétaire, Responsable). Peut être rattaché à au plus une **Entreprise**. |
| **Prospect** | L'**état d'entrée** d'un Contact : le stage `nouveau`. « Prospect » est le **libellé** de ce stage (ce n'est ni une entité ni un stage distinct). Tout Contact créé par un Import y atterrit. Stages suivants : Contacté, RDV, Proposition, Gagné, Perdu. |
| **Entreprise** | Une organisation (« compte ») suivie comme **entité de premier ordre** : enregistrement unique avec sa propre identité, pas un libellé texte. « Crédit Agricole CIB » désigne **une seule** Entreprise quelle que soit l'orthographe tapée. Relation un-à-plusieurs avec ses Contacts. |
| **Rattachement** | Le lien Contact → Entreprise. Optionnel ; **au plus une** Entreprise par Contact. |
| **Fusion (d'entreprises)** | Consolidation manuelle de deux Entreprises en double : on désigne la survivante (nom canonique), tous les contacts de l'absorbée lui sont rattachés, les notes sont concaténées, puis l'absorbée est supprimée. Une Entreprise ne peut pas être supprimée tant que des Contacts lui sont rattachés. |
| **Doublon (de contact)** | Un Contact importé qui désigne **la même personne** qu'un Contact existant. Critère **unique** : l'email normalisé. |
| **Enrichissement** | Traitement d'un Doublon : au lieu de créer, l'import **complète les champs vides** du Contact existant (« remplir si vide ») sans écraser une donnée déjà saisie. Notes **concaténées**. |
| **Création** | Une ligne sans correspondance : un Contact réellement nouveau est créé comme Prospect. |
| **Propriétaire (owner)** | Utilisateur interne responsable principal d'un Contact (un seul). À la création, l'importateur en devient propriétaire par défaut. |
| **Notes** | Champ texte libre d'un Contact, traité par concaténation lors des fusions et enrichissements. |

---

## 3. Principe directeur : « sans flou »

Le rapprochement (de contacts comme d'entreprises) est **exact, jamais flou**.
On ne devine pas, on ne rapproche pas par similarité de nom. Conséquences
assumées :

- Deux homonymes sans email deviennent **deux Contacts distincts**.
- « Crédit Agricole » et « Crédit Agricole CIB » sont **deux Entreprises
  distinctes**, pas des variantes à fusionner automatiquement.
- Les quasi-doublons (fautes de frappe sur email ou entreprise) **survivent** à
  l'import et se résorbent ensuite via l'édition manuelle ou la Fusion manuelle.

Ce choix privilégie la sûreté (jamais de collapse erroné) au prix d'un nettoyage
manuel ultérieur.

---

## 4. Règles fonctionnelles

### 4.1 Critère de doublon : l'email, et lui seul

- Deux Contacts sont identiques si leur **email normalisé** coïncide.
- Normalisation de l'email : **minuscules + trim**.
- Une ligne **sans email** n'est **jamais** un doublon → toujours une
  **Création**.
- **Aucun** rapprochement par nom (prénom + nom + entreprise), même en repli
  quand l'email manque.

### 4.2 Stratégie de fusion par champ : « remplir si vide » (défaut)

Quand une ligne matche un Contact existant, l'import **ne crée rien** et
applique, champ par champ :

- **Remplir si vide** : on ne renseigne que les champs **vides** du Contact
  existant ; on **n'écrase jamais** une donnée déjà saisie.
- **Notes** : **concaténées** à l'existant — **sauf** si les notes entrantes sont
  **identiques** (au trim près) à celles déjà stockées : dans ce cas on ne
  ré-concatène pas (évite de dupliquer le contenu lors d'un ré-import du même
  fichier).
- **`stage` jamais modifié** : un Contact `gagné` ne peut pas être ramené à
  Prospect par un import.
- **Propriétaire** : celui d'un Contact matché est **conservé** ; celui d'un
  Contact créé est l'**importateur**.
- **No-op (« déjà à jour »)** : si, une fois la stratégie appliquée, **aucun
  champ ne changerait**, on **n'écrit rien** (pas même un `updated_at`) et la
  ligne est comptée comme **ignorée** (« déjà à jour »), **pas** comme enrichie.

#### Surcharge en revue

« Remplir si vide » est le **défaut**. La validation humaine permet de :

- changer la **stratégie par champ pour tout le lot** parmi :
  - **« remplir si vide »** (défaut),
  - **« l'import écrase »** (incoming wins : l'entrant non vide remplace
    l'existant),
  - **« ne pas toucher »** (le Contact matché reste inchangé) ;
- accepter / refuser **ligne par ligne**.

### 4.3 Rattachement d'Entreprise : match exact, sinon résolution en revue

- Le nom d'entreprise de chaque ligne est rattaché automatiquement si son **nom
  normalisé** (trim + casse + accents) correspond **exactement** à une Entreprise
  existante.
- Les noms **non reconnus** sont remontés dans l'étape de revue, où
  l'importateur choisit une Entreprise existante **ou** confirme la création
  d'une nouvelle Entreprise.
- On ne crée **jamais** d'Entreprise en silence sur un quasi-doublon.

### 4.4 Doublon intra-fichier

- Plusieurs lignes du même fichier partageant le même email normalisé sont
  **fusionnées avant la revue** : la **première l'emporte**, les **notes se
  concatènent**.
- L'opérateur en est **averti** (avertissement, pas erreur bloquante).

---

## 5. Validation des lignes (lenient)

La validation est **permissive** : on ne bloque que le strict nécessaire ;
tout le reste est un **avertissement** tranché par l'humain.

**Erreurs bloquantes** (la ligne ne peut pas être commitée telle quelle) :
- ligne sans **prénom** ou sans **nom** ;
- **montant** non parsable.

**Avertissements** (la ligne reste committable, l'humain tranche) :
- email vide ou malformé ;
- entreprise non reconnue ;
- doublon intra-fichier.

### Normalisation du `montant`

Les formats français sont nettoyés **avant** validation :
- espaces et **NBSP** retirés,
- symbole **`€`** retiré,
- **virgule décimale** convertie.

Une valeur non parsable après nettoyage → **erreur bloquante**.

---

## 6. Flux technique : staging éphémère, commit unique et atomique

1. **Parsing client** : le fichier est parsé **dans le navigateur** (lecture
   seule) en CSV ou XLSX.
2. **Classement** : une **query** côté serveur classe chaque ligne (création /
   enrichissement / erreur, + résultat du match Entreprise). Ce préchargement
   est **indicatif seulement**.
3. **Revue** : l'état est tenu **côté client** (mapping des colonnes,
   surcharge de stratégie, accept/refus ligne par ligne, résolution des
   entreprises non reconnues).
4. **Commit** : l'état revu est envoyé à une **unique mutation de commit** qui
   **re-valide de façon autoritaire** (la base peut avoir changé entre revue et
   commit — le préchargement ne fait pas foi).
5. **Atomicité** : il n'existe **aucune table de staging** persistée. Plafond
   **~500 lignes** par fichier → le commit reste **tout-ou-rien**. Les fichiers
   dépassant le plafond sont **rejetés**.

### Idempotence

**Rejouer le même fichier est un no-op** :
- le dédoublonnage par email rend les **Créations** idempotentes ;
- le court-circuit sur **notes identiques** + le **saut des enrichissements sans
  changement** étendent l'idempotence aux **doublons** (aucune écriture, pas même
  un `updated_at`).

---

## 7. Pas d'annulation, pas de trace de lot

- Après commit : **récapitulatif** (créés / enrichis / ignorés + erreurs).
- Le compteur **ignorés** agrège : lignes refusées par l'humain, lignes en
  erreur, **et** doublons sans changement (« déjà à jour »). Ces derniers sont
  **distingués dans le libellé** : « N ignorés, dont M déjà à jour ».
- **Aucun enregistrement de lot** n'est conservé ; **aucune annulation** n'est
  fournie.
- Une erreur se corrige par l'**édition / suppression douce** normale d'un
  Contact.

---

## 8. Contrôle d'accès

L'import suit la **même garde que la création unitaire** : **droit d'écriture
Contacts**. **Aucune nouvelle clé de permission** n'est introduite.

> Note de couplage (hérité d'ADR 0001) : la création d'Entreprise pour
> l'autocomplétion / la résolution suit l'accès **Contacts** (un commercial doit
> pouvoir s'en servir). La gestion fine des Entreprises (édition de fiche,
> fusion, suppression) est gardée par une clé distincte, **hors périmètre de cet
> import**.

---

## 9. Parcours UI

- **Nouvelle route** dédiée (stepper) : **mapping → revue → commit**.
- Accessible depuis la page **Contacts**, à côté de l'export.
- Dépôt du fichier par **glisser-déposer OU sélection** : le glisser-déposer
  n'est qu'un déclencheur alternatif. Un **seul fichier**, types acceptés
  **`.csv` / `.xlsx` / `.xls`**, même chaîne de traitement
  `onFile → parse → plafond 500 lignes`.

---

## 10. Champs Contact mappables

À l'import, seuls les champs applicables à un **Prospect** (stage `nouveau`)
s'appliquent aux Créations :

- **prénom** (obligatoire),
- **nom** (obligatoire),
- **email** (coordonnée ; sert aussi de critère de doublon),
- **téléphone** (coordonnée),
- **profil LinkedIn** — l'URL du profil, une **coordonnée durable** ; à **ne pas
  confondre** avec une interaction de type « linkedin » (échange daté),
- **entreprise** (résolue en Rattachement, cf. §4.3),
- **montant** (normalisé, cf. §5),
- **notes**.

La colonne **`stage`** n'est **pas mappable** : le besoin est explicitement
« entrer comme Prospect ». Pas de round-trip export → ré-import qui restaurerait
le stage.

---

## 11. Alternatives explicitement écartées

Documentées pour éviter qu'on les re-propose :

| Alternative | Raison du rejet |
|---|---|
| **Rapprochement par nom** (prénom+nom+entreprise) en repli sans email | Faux positifs (deux « Jean Martin » d'une même banque) ; contre le principe « sans flou ». |
| **« L'import fait foi » (incoming wins) par défaut** | Destructif sur des données déjà saisies. Reste disponible **par champ** via la surcharge en revue. |
| **Table de staging persistée** (`import_batches` / `import_rows`) | Surcoût de schéma, de cycle de vie et de nettoyage des lots abandonnés, sans bénéfice à l'échelle ~500 lignes d'un CRM d'équipe. |
| **Annulation complète du dernier import** (état avant/après) | Exige précisément les tables de staging/audit refusées ; rapport coût/risque non justifié à cette échelle. |
| **Honorer une colonne `stage`** | Le besoin est « entrer comme Prospect » ; le stage n'est pas mappable. |
| **Fusion floue automatique des Entreprises** (préfixe/similarité) | Collapserait à tort des entreprises légitimement distinctes (Crédit Agricole vs Crédit Agricole CIB). |

---

## 12. Dépendances de la mise en œuvre de référence

Implémentation d'origine (à adapter à la stack cible) :

- **Parsing client** : PapaParse (CSV) + SheetJS (XLSX), lecture seule.
- **Dépôt de fichier** : react-dropzone (glisser-déposer comme déclencheur
  alternatif).
- **Backend** : query de classement (indicative) + mutation de commit
  (autoritaire, atomique), sur Convex dans le projet d'origine.
- **Logique réutilisée** : la concaténation de notes partage la même routine que
  la **Fusion d'Entreprises** (`resolveMergedNotes` côté origine) — y compris le
  court-circuit sur notes identiques.

> Pour un portage : la stack n'est pas prescriptive. Ce qui est **normatif**,
> ce sont les §3 à §11 (règles de domaine et de comportement). Les §6, §9 et §12
> décrivent une mise en œuvre de référence et peuvent être adaptés tant que les
> garanties (atomicité ≤500 lignes, re-validation autoritaire au commit,
> idempotence, absence de staging persisté) sont préservées.
