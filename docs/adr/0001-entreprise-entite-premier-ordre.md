# 1. Entreprise comme entité de premier ordre (avec fusion manuelle)

Date : 2026-06-04

## Statut

Accepté

## Contexte

Jusqu'ici, l'« entreprise » d'un Contact n'était qu'un champ **texte libre**
(`contacts.entreprise`) saisi à la main. Deux conséquences :

- **Doublons silencieux** : « Crédit Agricole », « Credit Agricole », « Crédit
  Agricole CIB » sont autant de chaînes distinctes. Impossible de savoir, de
  manière fiable, combien de contacts dépendent d'un même compte.
- **Pas d'identité stable** : on ne peut ni renommer une entreprise une fois
  pour toutes, ni lui attacher des informations (secteur, site web, notes), ni
  naviguer vers « tous les contacts de ce compte ».

Le besoin exprimé : un onglet pour **consulter les entreprises** du CRM, voir
**tous les contacts rattachés** à chacune, et — à la création d'un contact —
**suggérer les entreprises existantes** dès la frappe pour éviter d'en recréer
une qui existe déjà (ex. taper « Crédit Agricole » propose « Crédit Agricole
CIB » à sélectionner d'un clic).

## Décision

Faire de l'**Entreprise** une **entité de premier ordre** : une table dédiée
`entreprises` avec sa propre identité. Un Contact référence au plus une
Entreprise via un champ optionnel `entreprise_id`.

Règles de cycle de vie retenues :

- **Pas de fusion floue automatique.** La migration des données existantes
  regroupe par **nom normalisé exact** (trim + casse + accents) uniquement.
  « Crédit Agricole » et « Crédit Agricole CIB » restent **distincts** : ce sont
  des entreprises différentes, pas des variantes orthographiques.
- **Création à la volée** depuis le formulaire contact : si le nom tapé ne
  correspond à aucune entreprise, on en crée une (nom seul). Un garde-fou
  empêche de recréer une entreprise dont le nom normalisé existe déjà — on
  propose alors l'existante.
- **Fusion manuelle** pour consolider les doublons : on désigne l'entreprise
  survivante (nom canonique), ses contacts absorbés y sont rattachés, les notes
  de l'absorbée sont concaténées, puis l'absorbée est supprimée.
- **Suppression bloquée** tant que des contacts sont rattachés (la fusion est la
  voie normale de consolidation).

Le champ texte legacy `contacts.entreprise` est **conservé gelé** (audit), à
l'image de `contact_sciam` remplacé par `owner_id`. Il n'est plus édité ; la
source de vérité de l'entreprise d'un contact devient `entreprise_id`.

## Alternatives écartées

- **Concept dérivé (regroupement du texte)** : garder le champ texte et afficher
  les valeurs distinctes (group by). Zéro migration, mais aucune identité stable
  (renommer/fusionner impossible), et l'autocomplétion ne ferait que re-proposer
  des chaînes déjà tapées — sans résoudre les doublons. Écarté car il ne répond
  pas au besoin d'identité ni de fusion.
- **Fusion floue automatique** (rapprochement par préfixe/similarité, comme le
  backfill des propriétaires) : écartée car elle collapserait à tort des
  entreprises légitimement distinctes (« Crédit Agricole » vs « Crédit Agricole
  CIB »).

## Conséquences

- **Migration nécessaire** : backfill des chaînes `entreprise` existantes en
  enregistrements `entreprises` + renseignement de `entreprise_id` (réutilise
  l'outillage `migrations.ts`).
- **Nettoyage manuel attendu** : les doublons orthographiques survivent au
  backfill et se résorbent ensuite via la fusion manuelle dans l'onglet.
- **Lectures à repointer** : kanban, liste de contacts et export CSV qui lisent
  `contact.entreprise` doivent afficher le nom de l'Entreprise liée.
- **Couplage de permissions** : la lecture/création d'entreprises pour
  l'autocomplétion suit l'accès `contacts` (un commercial doit pouvoir s'en
  servir), tandis que l'onglet de gestion (édition de fiche, fusion, suppression)
  est gardé par une nouvelle clé de page `entreprises`.
- **Projets hors scope** : le champ `client` des Projets reste du texte libre
  pour l'instant ; un éventuel lien Projet → Entreprise fera l'objet d'une
  décision ultérieure.
