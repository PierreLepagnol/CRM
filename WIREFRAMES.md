# CRM — Wireframes (ASCII)

> Maquettes textuelles des écrans-clés. À valider avant tout code de UI.
> Style cible : aéré, type Notion/Trello (cf. `DECISIONS.md` §P18).

---

## 0. Légende

```
[Bouton]      bouton cliquable
{champ}       input de saisie
< >           menu déroulant / picker
░░░           zone scrollable
●             point coloré (tag, statut)
※             chip/tag
▸ / ▾         arbre repliable
≡             handle drag (multi-select)
```

---

## 1. Login

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                       CRM                            │
│             Suivi prospects & contrats               │
│                                                      │
│                                                      │
│        ┌─────────────────────────────────────┐       │
│        │  ✉  {email@société.fr            }  │       │
│        └─────────────────────────────────────┘       │
│        [   Recevoir un lien de connexion    ]        │
│                                                      │
│                  ─── ou ───                          │
│                                                      │
│        [   ▣  Continuer avec Microsoft     ]         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 2. Shell global (layout app)

```
┌──── CRM ─────┬───────────────────────────────────────────────────┐
│              │  Pipeline Q2 2026                          ⌕ ⌘K   │
│ ⌂ Dashboard  ├───────────────────────────────────────────────────┤
│              │                                                   │
│ ◆ Pipeline   │   < Kanban | Tableau >    Filtres ▾    [+ Deal]   │
│              │                                                   │
│ ⌂ Sociétés   │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ☺ Contacts   │  ░                                              ░  │
│ ✎ Réunions   │  ░         (zone vue active)                   ░  │
│ ▤ Contrats   │  ░                                              ░  │
│              │  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
│ ─────────    │                                                   │
│ ⌥ Réglages   │                                                   │
│              │                                                   │
│ PL  Pierre L │                                                   │
└──────────────┴───────────────────────────────────────────────────┘
```

- Sidebar gauche fixe sur desktop, drawer hamburger sur mobile.
- Avatar bas-gauche → menu utilisateur (profil, déconnexion).
- Header de page : titre + segmented control (Kanban / Tableau) + filtres + CTA création.

---

## 3. Vue Kanban (Pipeline)

```
< Kanban | Tableau >    Filtres: [● Owner ▾] [※ Tags ▾] [Période ▾]    [+ Deal]
                                                                      ─────────
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Lead     │Qualifié  │Proposit° │ Négo     │ Signé    │ Perdu    │
│  4 · 18k │  3 · 42k │  2 · 65k │  1 · 90k │  5 · 230k│  2 · –   │
├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│┌────────┐│┌────────┐│┌────────┐│┌────────┐│┌────────┐│┌────────┐│
││≡ ACME  │││≡ Loop  │││Globex  │││Initech │││Hooli   │││Stark   ││
││3.5k €  │││12k €   │││30k €   │││90k €   │││55k €   │││— €     ││
││● PL    │││● JD    │││● PL    │││● JD    │││● MM    │││● PL    ││
││※ web ※ │││※ rgpd  │││        │││※ saas  │││        │││        ││
││🗓 12/05│││🗓 28/05│││🗓 02/06│││🗓 15/06│││🗓 03/04│││🗓 10/03 ││
│└────────┘│└────────┘│└────────┘│└────────┘│└────────┘│└────────┘│
│┌────────┐│┌────────┐│┌────────┐│          │┌────────┐│          │
││Wayne   │││Soylent │││Umbrella│││          │││Pied P. │││          │
│└────────┘│└────────┘│└────────┘│          │└────────┘│          │
│  + 1     │          │          │          │  + 2     │          │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

- Header de colonne : nombre de deals + somme `montant × proba`.
- Carte deal : titre · montant · owner (point coloré) · tags · date closing.
- DnD : long-press mobile, click-drag desktop. Multi-select via Shift+click.
- Click sur carte → ouvre le **drawer Deal** par-dessus (ne quitte pas le kanban).

---

## 4. Vue Tableau (Liste)

```
< Kanban | Tableau >    Filtres: […]    [Colonnes ▾]    [Exporter CSV]    [+ Deal]

┌─□─┬──────────────┬──────────┬──────────┬────────┬───────┬──────────┬──────────┐
│   │ Titre        │ Société  │ Stage    │ Montant│ Proba │ Closing  │ Owner    │
├─□─┼──────────────┼──────────┼──────────┼────────┼───────┼──────────┼──────────┤
│ □ │ ACME refonte │ ACME SAS │ ●Lead    │ 3 500€ │  10%  │ 12/05/26 │ PL       │
│ □ │ Loop CRM     │ Loop SA  │ ●Qualif. │ 12 000€│  25%  │ 28/05/26 │ JD       │
│ □ │ Globex SaaS  │ Globex   │ ●Propo.  │ 30 000€│  50%  │ 02/06/26 │ PL       │
│ □ │ Hooli renew  │ Hooli    │ ●Signé   │ 55 000€│ 100%  │ 03/04/26 │ MM       │
│ ▣ │ Wayne audit  │ Wayne E. │ ●Lead    │  8 000€│  15%  │ 22/05/26 │ JD       │
└───┴──────────────┴──────────┴──────────┴────────┴───────┴──────────┴──────────┘

  ▣ 1 sélectionné    [Changer stage ▾]  [Assigner ▾]  [Tag ▾]  [Supprimer]
                                                              ─────────────
```

- Colonnes redimensionnables / réordonnables.
- Tri en cliquant sur l'en-tête.
- Sélection multiple → barre d'actions en bas.
- Click ligne → drawer Deal.

---

## 5. Drawer Deal (panneau latéral droit)

```
                                          ┌─────────────────────────────────┐
                                          │ ←   ACME refonte         ⋯  ✕  │
                                          ├─────────────────────────────────┤
                                          │ ●Lead ▾   3 500 € EUR   10 % ▾ │
                                          │ Closing : 12/05/26  ●Owner: PL  │
                                          │ ※ web  ※ refonte  + tag         │
                                          ├─────────────────────────────────┤
                                          │ Société     ACME SAS  →         │
                                          │ Contacts    Marc B. · Léa T. +  │
                                          ├─────────────────────────────────┤
                                          │ Notes                           │
                                          │ ┌─────────────────────────────┐ │
                                          │ │ # Contexte                  │ │
                                          │ │ Refonte du site corp...     │ │
                                          │ │                             │ │
                                          │ └─────────────────────────────┘ │
                                          ├─────────────────────────────────┤
                                          │ Réunions      [+ Logger une RDV]│
                                          │  ▸ 22/04 · Découverte · 45min   │
                                          │  ▸ 15/04 · 1er contact · 30min  │
                                          ├─────────────────────────────────┤
                                          │ Activité                        │
                                          │  • Stage Qualif → Lead (PL)     │
                                          │  • Note ajoutée (PL) · hier     │
                                          │  • Deal créé (PL) · 10/04       │
                                          └─────────────────────────────────┘
```

- Drawer ~480px à droite, ne quitte pas la vue kanban dessous.
- Sections : header (stage/montant/proba/closing), liens (Société/Contacts), Notes MD, Réunions, Activité.

---

## 6. Fiche Société (page détail)

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Sociétés / ACME SAS                                  ⋯  Supprimer│
├────────────────────────────────────────────────────────────────────┤
│ ACME SAS                          ※ stratégique  ※ b2b  + tag      │
│ acme.fr · SIRET 123 456 789 00012 · SAS                            │
│ 12 rue de la Paix, 75002 Paris, France                             │
│ Édition logicielle · 80 employés · CA ≈ 12 M€                      │
├──── Contacts (3) ──────────────── [+ Contact] ─────────────────────┤
│  ☺ Marc Beaulieu · Directeur SI · marc@acme.fr · 📞 06.xx.xx       │
│  ☺ Léa Tran · Resp. RGPD · lea@acme.fr                              │
│  ☺ Karim N. · CTO · k.n@acme.fr                                     │
├──── Deals (2 actifs · 1 gagné) ──── [+ Deal] ──────────────────────┤
│  ◆ ACME refonte · Lead · 3 500€ · PL · closing 12/05               │
│  ◆ ACME audit RGPD · Qualifié · 8 000€ · JD · closing 30/06        │
│  ◇ ACME pilote SaaS · Signé · 24 000€ · MM (12/2025)               │
├──── Réunions (4) ──────────────── [+ Réunion] ─────────────────────┤
│  ▸ 22/04/26 · Découverte · 45 min · Marc B., Léa T.                │
│  ▸ 15/04/26 · 1er contact · 30 min · Marc B.                       │
├──── Notes ─────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Groupe coté, décision centralisée Paris...                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
├──── Timeline ──────────────────────────────────────────────────────┤
│  • Réunion ajoutée (PL) · 22/04                                    │
│  • Tag ※ stratégique ajouté (JD) · 12/04                           │
│  • Société créée (PL) · 02/04                                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 7. Fiche Contact

```
┌────────────────────────────────────────────────────────────────────┐
│ ← Contacts / Marc Beaulieu                              ⋯          │
├────────────────────────────────────────────────────────────────────┤
│ ╭───╮  Marc Beaulieu                                               │
│ │ M │  Directeur SI · ACME SAS →                                   │
│ ╰───╯  ◆ Décideur          ※ technique  ※ key                      │
├────────────────────────────────────────────────────────────────────┤
│ ✉  marc.beaulieu@acme.fr                       [copier]            │
│ 📞 +33 6 12 34 56 78                            [appeler] [SMS]    │
│ in linkedin.com/in/marcbeaulieu                                    │
│ 🎂 14/09 · langue : FR                                              │
├──── Deals liés (2) ────────────────────────────────────────────────┤
│  ◆ ACME refonte · Lead                                             │
│  ◆ ACME audit RGPD · Qualifié                                      │
├──── Réunions (3) ──────────────────────────────────────────────────┤
│  ▸ 22/04/26 · Découverte · 45 min                                  │
│  ▸ 15/04/26 · 1er contact · 30 min                                 │
├──── Notes & préférences ───────────────────────────────────────────┤
│  Très technique, préfère les démos courtes...                      │
└────────────────────────────────────────────────────────────────────┘
```

---

## 8. Fiche Réunion (modal de saisie)

```
┌──────── Nouvelle réunion ───────────────────────── ✕ ─┐
│                                                       │
│ Liée à :  ◉ Deal   ○ Société   ○ Contact              │
│           < ACME refonte                          ▾ > │
│                                                       │
│ Date     {22/04/2026}    Durée  {45} min              │
│ Lieu/URL {teams.microsoft.com/l/...                 } │
│                                                       │
│ Participants (contacts)                               │
│  ※ Marc Beaulieu  ※ Léa Tran  + ajouter               │
│                                                       │
│ Compte-rendu                                          │
│ ┌───────────────────────────────────────────────────┐ │
│ │ # Points abordés                                  │ │
│ │ - Périmètre v1                                    │ │
│ │ - Budget enveloppe 50k€                           │ │
│ │                                                   │ │
│ └───────────────────────────────────────────────────┘ │
│                                                       │
│ Next steps                                            │
│  □ Envoyer le devis    👤 PL   📅 28/04               │
│  □ Caler RDV démo      👤 JD   📅 02/05               │
│  [+ ajouter une action]                               │
│                                                       │
│              [Annuler]   [Enregistrer + .ics]         │
└───────────────────────────────────────────────────────┘
```

- Bouton « Enregistrer + .ics » : sauve la réunion ET télécharge un fichier `.ics`.

---

## 9. Dashboard / KPIs

```
Pipeline Q2 2026                                        Période : < 30j ▾ >

┌─── Pipeline value par stage ──────────────────────────────────────┐
│                                                                   │
│  Lead       ▇▇▇                            18 000 €               │
│  Qualifié   ▇▇▇▇▇▇▇                        42 000 €               │
│  Proposit°  ▇▇▇▇▇▇▇▇▇▇▇                    65 000 €               │
│  Négo       ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇                90 000 €               │
│  Signé      ▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇▇ 230 000 €              │
│                                                                   │
│  Pondéré (× proba) :  187 250 €                                   │
└───────────────────────────────────────────────────────────────────┘

┌─── Activité par commercial (30j) ─┐  ┌─── Deals à risque (4) ────────┐
│                                   │  │                               │
│  PL  Pierre L.   12 RDV  · 5 deal │  │ ⚠ ACME refonte · stage Lead   │
│      ▇▇▇▇▇▇▇▇▇▇▇▇                 │  │   inactif depuis 32j           │
│                                   │  │ ⚠ Wayne audit · closing -12j  │
│  JD  Jean D.      8 RDV  · 3 deal │  │ ⚠ Globex SaaS · pas d'owner   │
│      ▇▇▇▇▇▇▇▇                     │  │ ⚠ Loop CRM · closing -3j      │
│                                   │  │                               │
│  MM  Marie M.     5 RDV  · 2 deal │  │ [Voir tous les deals à risque]│
│      ▇▇▇▇▇                        │  │                               │
└───────────────────────────────────┘  └───────────────────────────────┘
```

---

## 10. Recherche globale (Cmd-K)

```
        ┌───── ⌕  Rechercher ────────────────────────────────────┐
        │  {acme                                              }  │
        ├────────────────────────────────────────────────────────┤
        │  SOCIÉTÉS                                              │
        │    ⌂ ACME SAS · 80 emp · Paris               ↵         │
        │    ⌂ Acme Logistics · 12 emp · Lyon          ↵         │
        │                                                        │
        │  CONTACTS                                              │
        │    ☺ Marc Beaulieu · Directeur SI · ACME      ↵        │
        │                                                        │
        │  DEALS                                                 │
        │    ◆ ACME refonte · Lead · 3 500€              ↵       │
        │    ◆ ACME audit RGPD · Qualifié · 8 000€       ↵       │
        │                                                        │
        │  ─────────────────────────────────────────────         │
        │  ↑↓ naviguer · ↵ ouvrir · esc fermer                   │
        └────────────────────────────────────────────────────────┘
```

---

## 11. Import CSV (drop n'importe où)

```
┌──── Importer un CSV ──────────────────────────────────── ✕ ────┐
│                                                                │
│ Fichier : prospects-q1.csv  (542 lignes)                       │
│                                                                │
│ Cible :  ◉ Sociétés   ○ Contacts   ○ Deals                     │
│                                                                │
│ ─── Mapping des colonnes ────────────────────────────────────  │
│                                                                │
│   CSV               →   Champ CRM                              │
│   "Nom"             →   < nom              ▾ >                 │
│   "Siret"           →   < siret            ▾ >                 │
│   "Ville"           →   < ville            ▾ >                 │
│   "Effectif"        →   < effectif         ▾ >                 │
│   "Site"            →   < site_web         ▾ >                 │
│   "Notes"           →   < notes_md         ▾ >                 │
│   "Tags"            →   < tags (séparés par ,) ▾ >             │
│                                                                │
│ ─── Aperçu (5 premières lignes) ─────────────────────────────  │
│                                                                │
│   ACME SAS  · 12345... · Paris · 80 · acme.fr · ...            │
│   Wayne E.  · 67890... · Lyon  · 200· wayne.com · ...          │
│   ...                                                          │
│                                                                │
│ ─── Doublons détectés (3) ───────────────────────────────────  │
│                                                                │
│   ACME SAS — existe déjà   < fusionner ▾ > (créer / fusionner /│
│   ─────────────────────────                  ignorer)          │
│   Globex   — existe déjà   < ignorer   ▾ >                     │
│   Loop SA  — existe déjà   < fusionner ▾ >                     │
│                                                                │
│ Action par défaut sur les doublons : < fusionner ▾ >           │
│                                                                │
│                              [Annuler]    [Importer 542 lignes]│
└────────────────────────────────────────────────────────────────┘
```

---

## 12. Mobile — Kanban

```
┌────────── CRM ──────────┐
│ ☰  Pipeline      ⌕  +   │
├─────────────────────────┤
│ ‹ Lead (4) ›    ▇▇▇▇▇▇  │   ← swipe horizontal pour
│ ┌─────────────────────┐ │     changer de colonne ; le
│ │ ACME refonte        │ │     header indique colonne
│ │ 3 500€  ●PL         │ │     courante (Lead).
│ │ ※ web   🗓 12/05    │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Wayne audit         │ │
│ │ 8 000€  ●JD         │ │
│ │ 🗓 22/05            │ │
│ └─────────────────────┘ │
│ ┌─────────────────────┐ │
│ │ Soylent corp        │ │
│ └─────────────────────┘ │
│         ...             │
└─────────────────────────┘
```

- DnD = long-press sur la carte → la carte se détache, footer affiche les autres colonnes en cibles.

---

## 13. Mobile — Fiche (plein écran)

```
┌─────────────────────────┐
│ ←  ACME refonte    ⋯    │
├─────────────────────────┤
│ ●Lead ▾                 │
│ 3 500 € · 10%           │
│ 🗓 12/05/26 · ●PL       │
│ ※ web ※ refonte         │
├─────────────────────────┤
│ Société  ACME SAS    →  │
│ Contacts Marc · Léa  →  │
├─────────────────────────┤
│ Notes                   │
│ ░░░░░░░░░░░░░░░░░░░░░  │
├─────────────────────────┤
│ Réunions     [+ Logger] │
│ ▸ 22/04 · 45 min        │
├─────────────────────────┤
│ Activité                │
│ • Stage Qualif → Lead   │
└─────────────────────────┘
```

---

## 14. Réglages (admin léger)

```
┌──── Réglages ──────────────────────────────────────────┐
│                                                        │
│ Membres de l'équipe                       [+ Inviter]  │
│  PL  Pierre Lepagnol  · pierre@…  · Owner              │
│  JD  Jean Dupont      · jean@…    · Membre  [retirer]  │
│  MM  Marie Martin     · marie@…   · Membre  [retirer]  │
│                                                        │
│ Tags                                      [+ Tag]      │
│  ※ stratégique (3 sociétés)        [renommer] [×]      │
│  ※ b2b         (12 sociétés)       [renommer] [×]      │
│  ※ rgpd        (5 deals)           [renommer] [×]      │
│                                                        │
│ Pipeline                                               │
│  Lead → Qualifié → Proposition → Négo → Signé → Perdu  │
│  (non éditable en v1)                                  │
│                                                        │
│ Données                                                │
│  [Exporter tout (JSON)]                                │
│  [Exporter sociétés CSV]  [Exporter contacts CSV]      │
│  [Exporter deals CSV]                                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## 15. Hiérarchie de navigation

```
/login
/                           → redirige vers /pipeline
/pipeline                   → vue kanban des deals  (vue par défaut)
/pipeline?view=table        → vue tableau
/dashboard                  → KPIs
/societes                   → liste sociétés
/societes/[id]              → fiche société
/contacts                   → liste contacts
/contacts/[id]              → fiche contact
/contrats                   → liste contrats
/contrats/[id]              → fiche contrat
/reunions                   → calendrier des réunions (liste mensuelle)
/reglages                   → admin léger
```

---

## 16. Décisions UI tranchées

- ✅ Drawer Deal : **droite en desktop, bottom-sheet en mobile** (cf. DECISIONS P20).
- ✅ Carte kanban : **montant brut** uniquement (cf. P21).
- ✅ Couleur owner : **auto-hash du nom**, palette accessible (cf. P24).
- ✅ Tri par défaut du tableau : **`updated_at desc`** (cf. P22).
- ✅ Mobile kanban : **scroll horizontal libre** des colonnes (cf. P23).
