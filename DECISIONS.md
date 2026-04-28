# CRM — Cahier de décisions

> Document vivant. Toutes les décisions produit / techniques sont consignées ici, avec date et raison. Mis à jour à chaque pivot.

**Dernière mise à jour :** 2026-04-27

---

## 1. Vision

Un **CRM minimal mais hyper utile** pour suivre **prospects** et **contrats**.
Inspirations : **Boond Manager** (allégé) et **Trello** (kanban).
Mantra : *fewer features, better executed*.

---

## 2. Décisions actées (2026-04-27)

### 2.1 Fondations techniques

| # | Décision | Choix | Raison |
|---|----------|-------|--------|
| F1 | Utilisateurs | Petite équipe, **sans rôles / RBAC** | Tous les users authentifiés ont les mêmes droits. KISS. |
| F2 | Hébergement | **Self-hosted web app** | Une seule instance, accessible depuis n'importe quel navigateur. |
| F3 | Stack | **Next.js (App Router) + Convex DB** | TS full-stack, base réactive temps réel (idéal kanban collaboratif), simple à déployer. |
| F4 | Langue UI | **Français uniquement** | Pas d'i18n en v1. |
| F5 | Auth | **Magic link e-mail + Microsoft 365 SSO** | Magic link pour onboarding rapide, SSO M365 si l'équipe est sur l'éco Microsoft. |
| F6 | Hosting région | UE (Convex EU + Vercel FRA) | RGPD raisonnable sans certif. |
| F7 | Branding | Nom interne **« CRM »** | À rebrander plus tard. |

### 2.2 Périmètre fonctionnel

| # | Décision | Choix | Raison |
|---|----------|-------|--------|
| P1 | Entités | **Société, Contact, Opportunité (Deal), Contrat** | Couvre 90 % des besoins B2B. |
| P2 | Sous-entités / filiales | **Hors v1** | Repoussé tant qu'aucun cas concret. |
| P3 | Vues principales | **Liste (table), Kanban, Dashboard KPIs** | Couvre exploration + pilotage. |
| P4 | Pipeline kanban | `Lead → Qualifié → Proposition → Négo → Signé → Perdu` | Pipeline B2B classique, 6 colonnes. |
| P5 | Drag-and-drop | Deal entre stages, réordonner intra-colonne, **multi-select**, drop CSV sur la page | Fluidité kanban + import natif. |
| P6 | Mobile | **Full feature parity** (kanban DnD inclus en touch) | Utilisable en RDV, en clientèle. |
| P7 | Recherche | **Globale (Cmd/Ctrl-K)** sur sociétés / contacts / deals / contrats / notes | Productivité. |
| P8 | Tags | **Libres colorés**, multi-tag par fiche, filtre par tag | Souplesse de catégorisation. |
| P9 | Activité | **Timeline par fiche** auto (changements + réunions + notes) | Traçabilité minimale sans rigidité. |
| P10 | Custom fields | **Hors v1**, schéma fixe | À ouvrir sur retours utilisateurs. |
| P11 | Notifications | **Hors v1** | Pas de stack mail/push à maintenir au lancement. |
| P12 | Pièces jointes | **Hors v1**, tout en notes Markdown | Repoussé pour minimiser le scope. |
| P13 | Dédoublonnage | **Auto-détection + fusion manuelle validée** | Évite la pollution sans bloquer la saisie. |
| P14 | Données initiales | **Repart de zéro** | Pas de migration. |
| P15 | Import en masse | **Upload CSV** (drag-drop) avec mapping de colonnes | Standard. |
| P16 | Export | **CSV par vue + Backup JSON complet + PDF fiche** | Portabilité et archivage. |
| P17 | Calendrier | **Lien .ics téléchargeable** (pas de sync) | Implémentation peu coûteuse, suffisant en v1. |
| P18 | Design | **Aéré type Notion / Trello** | Découvrabilité prime sur densité. |
| P19 | Raccourcis clavier | **Pas nécessaire** (au-delà de Cmd-K) | Cohérent avec une UX mobile/tactile. |
| P20 | Drawer Deal mobile | **Bottom-sheet** (drawer droit en desktop) | Pattern natif mobile, plus ergonomique au pouce. |
| P21 | Carte kanban — montant | **Montant brut** (pas pondéré par proba) | Lisibilité ; le pondéré reste sur le dashboard. |
| P22 | Tri par défaut tableau | **`updated_at desc`** | Met en avant ce sur quoi on a travaillé récemment. |
| P23 | Kanban mobile | **Scroll horizontal libre** | Plus simple à implémenter, pas de logique de swipe-colonne dédiée. |
| P24 | Couleur owner | **Auto-hash du nom** (palette accessible) | Pas de config, cohérent automatiquement. |

### 2.3 Non-goals explicites pour la v1

- ❌ Facturation / devis (PDF générés)
- ❌ Lead scoring, séquences marketing, campagnes
- ❌ App mobile native (App Store / Play Store)
- ❌ Rôles / RBAC granulaire
- ❌ API publique tierce
- ❌ 2-way sync calendrier
- ❌ Champs personnalisés
- ❌ Pièces jointes / fichiers
- ❌ Notifications email/push

### 2.4 Timing

- **MVP utilisable** : 1 mois (objectif).

---

## 3. Modèle de données (v1)

### 3.1 `Société`
- `id`
- **Identité légale** : `nom`, `siret`, `forme_juridique`, `site_web`
- **Localisation** : `adresse`, `ville`, `code_postal`, `pays`
- **Secteur & taille** : `secteur`, `effectif`, `ca_estime`
- **Notes & tags** : `notes_md` (markdown), `tags[]`
- `created_at`, `updated_at`

### 3.2 `Contact`
- `id`, `societe_id` (FK)
- **Identité** : `civilite`, `prenom`, `nom`, `photo_url`
- **Poste** : `intitule_poste`, `niveau_decision` (enum: `decideur` / `prescripteur` / `utilisateur`)
- **Coordonnées** : `email`, `telephones[]`, `linkedin_url`
- **Préférences** : `notes_md`, `langue` (default `fr`), `anniversaire`
- `tags[]`
- `created_at`, `updated_at`

### 3.3 `Deal` (Opportunité)
- `id`, `societe_id`, `contacts_ids[]`
- `titre`
- `montant`, `devise` (default `EUR`)
- `probabilite` (0–100)
- `stage` (enum : `lead` / `qualifie` / `proposition` / `nego` / `signe` / `perdu`)
- `date_closing_prevue`
- `owner_id` (utilisateur responsable)
- `position` (entier, pour réordonner intra-colonne)
- `tags[]`
- `notes_md`
- `created_at`, `updated_at`, `closed_at`

### 3.4 `Contrat`
- `id`, `deal_id` (FK, créé auto au passage en `signe`)
- **Dates** : `date_signature`, `date_debut`, `date_fin`
- **Montant** : `montant_total`, `frequence_facturation` (`mensuel` / `trimestriel` / `annuel` / `unique`), `tva`
- **Statut** : `actif` / `en_pause` / `termine` / `resilie`
- `created_at`, `updated_at`

### 3.5 `Reunion`
- `id`, attached to one of (`societe_id` | `contact_id` | `deal_id`)
- `date`, `duree_minutes`, `lieu_ou_url`
- `participants_ids[]` (contacts)
- `compte_rendu_md` (markdown)
- `next_steps[]` : `{ description, due_date, owner_id, done }`
- `created_by`, `created_at`, `updated_at`

### 3.6 `User`
- `id`, `email`, `nom`, `prenom`, `provider` (`magic_link` | `microsoft`)

### 3.7 `Tag`
- `id`, `label`, `couleur`, `scope` (`societe` | `contact` | `deal`)

### 3.8 `ActivityEvent` (timeline)
- `id`, `entity_type`, `entity_id`
- `kind` (`created` / `updated` / `stage_changed` / `meeting_logged` / `note_added` / `merged`)
- `payload_json` (diff ou détails)
- `actor_id`, `created_at`

---

## 4. Pipeline & règles

- **Stages** : `lead → qualifie → proposition → nego → signe → perdu`
- Passage en `signe` ⇒ **création automatique d'un `Contrat`** rattaché au deal, pré-rempli (montant, dates par défaut à `aujourd'hui`).
- Probabilité par défaut suggérée par stage (modifiable) :
  - lead 10 % · qualifié 25 % · proposition 50 % · négo 75 % · signé 100 % · perdu 0 %
- **Pipeline value** affichée dans le dashboard = Σ (`montant × probabilite`) par stage.
- **Deals à risque** = stage ∉ {signé, perdu} ET `date_closing_prevue` dépassée OU dernière activité > 30 jours.

---

## 5. Dashboard / KPIs (v1)

1. **Pipeline value par stage** (somme `montant × proba`)
2. **Activité par commercial** (réunions loggées, deals créés, deals gagnés sur 30 j)
3. **Deals à risque / inactifs** (liste cliquable)

> Pas de taux de conversion en v1 — tant qu'on n'a pas assez d'historique.

---

## 6. UX / interactions clés

- **Cmd/Ctrl-K** : recherche globale (sociétés, contacts, deals, contrats, notes).
- **Drag-and-drop** : kanban ↔ stages, réordo intra-colonne, multi-select avec Shift, drop d'un CSV → modal d'import.
- **Création rapide** : bouton « + » ouvre un sheet latéral pour créer Société/Contact/Deal sans quitter la vue.
- **Fiche détail** : panel latéral (drawer) plutôt qu'une nouvelle page → on garde le contexte kanban derrière.
- **Mobile** : DnD long-press + scroll horizontal des colonnes ; fiche en plein écran.

---

## 7. Import CSV — règles

- Drop d'un `.csv` n'importe où sur l'app → modal :
  1. Choix de l'entité cible (Société / Contact / Deal).
  2. Mapping colonnes ↔ champs (auto-détection du header).
  3. Aperçu des 5 premières lignes.
  4. Détection des doublons (email, SIRET, nom soc.) → choix : `créer` / `fusionner` / `ignorer` ligne par ligne ou en masse.
  5. Import + rapport (`X créés, Y fusionnés, Z erreurs`).

---

## 8. Décisions à confirmer plus tard

- Domain et environnement de prod (Vercel project name, sous-domaine).
- Sender email pour magic link (Resend ? Postmark ?).
- Tenant Microsoft à autoriser pour le SSO.
- Pipeline secondaire pour les renouvellements de contrats ?

---

## 9. Journal des changements

- **2026-04-27** — Document initial, 36 décisions actées via session de cadrage.
- **2026-04-27** — Pivot DB : Convex → Postgres → **retour Convex**. Choix final : Convex pour le réactif temps réel natif sur le kanban.
- **2026-04-27** — Provider email magic link : à décider plus tard (stub console en dev).
- **2026-04-27** — Wireframes ASCII rédigés (`WIREFRAMES.md`).
- **2026-04-27** — 5 décisions UI tranchées (P20–P24) : bottom-sheet mobile, montant brut sur carte, tri `updated_at desc`, scroll horizontal libre, couleur owner auto-hash.
