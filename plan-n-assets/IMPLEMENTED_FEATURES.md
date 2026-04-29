# CRM - Fonctionnalites deja implementees

Inventaire etabli le 2026-04-28 a partir de `DECISIONS.md`, `WIREFRAMES.md` et du code dans `CRM-APP`.

## Fondations techniques

- Application web self-hosted basee sur Next.js App Router.
- Backend Convex avec schema typé et fonctions de lecture/ecriture.
- UI en francais sur les ecrans CRM principaux.
- Shell applicatif avec sidebar desktop, navigation mobile via sidebar responsive, header global, menu utilisateur et theme clair/sombre.
- Authentification Better Auth connectee a Convex avec inscription/connexion email + mot de passe.
- Protection des donnees applicatives par utilisateur authentifie, sans roles/RBAC.

## Modele de donnees

- Tables Convex pour `societes`, `contacts`, `deals`, `contrats`, `reunions`, `tags` et `activity_events`.
- Champs principaux du cahier de decisions couverts pour les entites CRM : identite societe, coordonnees contact, pipeline deal, contrat, reunion, tags et timeline.
- Index de consultation et de recherche sur les entites principales.
- Stages pipeline fixes : `lead`, `qualifie`, `proposition`, `nego`, `signe`, `perdu`.

## Navigation et shell

- Route `/` redirige vers `/pipeline`.
- Routes implementees : `/pipeline`, `/pipeline?view=table`, `/dashboard`, `/societes`, `/societes/[id]`, `/contacts`, `/contacts/[id]`, `/contrats`, `/reunions`, `/reglages`.
- Sidebar avec Dashboard, Pipeline, Societes, Contacts, Reunions, Contrats et Reglages.
- Header global avec action de page, bouton de recherche globale et toggle de theme.
- Drop CSV global dans le shell applicatif.

## Pipeline et deals

- Vue Kanban du pipeline avec les 6 colonnes.
- Drag-and-drop desktop et tactile via `@dnd-kit`, avec deplacement entre colonnes et reordonnancement intra-colonne.
- Persistance de l'ordre Kanban via le champ `position`.
- Cartes deal avec titre, montant brut, owner colore automatiquement, tags sous forme de compteur, et date de closing.
- Header de colonne avec nombre de deals et total brut.
- Vue Tableau des deals avec titre, societe, stage, montant, probabilite, closing et owner.
- Selection multiple dans le tableau.
- Actions groupees dans le tableau : changement de stage et suppression.
- Creation rapide d'un deal depuis le pipeline avec societe existante ou nouvelle societe.
- Probabilite par defaut suggeree selon le stage dans le formulaire de creation.
- Drawer deal lateral avec edition du titre, stage, montant, probabilite, closing et notes.
- Suppression d'un deal depuis le drawer.
- Creation automatique d'un contrat lors du premier passage d'un deal en `signe`.
- `closed_at` renseigne lors du passage en `signe` ou `perdu`.

## Dashboard

- KPI "Pipeline value par stage" avec total brut et total pondere par probabilite.
- Activite par commercial sur une periode configurable : reunions, deals crees, deals gagnes.
- Liste des deals a risque : closing depasse ou inactivite superieure a 30 jours, hors `signe` et `perdu`.
- Selecteur de periode : 7, 30, 90 ou 365 jours.

## Vue Aujourd'hui

- Route `/aujourdhui` ajoutee comme nouvel accueil operationnel.
- Redirection `/` et `/dashboard` vers `/aujourdhui`.
- Entree "Aujourd'hui" ajoutee en premiere position dans la navigation desktop et mobile.
- Query Convex `today.getOverview` agregeant les actions prioritaires du jour.
- Affichage des next steps de reunions dus ou en retard.
- Affichage des reunions du jour.
- Affichage des deals actifs avec closing depasse.
- Affichage des deals actifs inactifs depuis plus de 30 jours.
- Affichage des deals actifs sans signal de prochaine action exploitable.
- Affichage des contacts et societes recents a qualifier.
- KPI synthetiques pour mesurer le volume d'actions du jour.

## Societes

- Liste paginee des societes triee par mise a jour recente.
- Creation rapide de societe.
- Fiche societe avec edition inline de nom, SIRET, ville, secteur, site web, effectif et notes.
- Suppression d'une societe.
- Affichage des contacts lies.
- Affichage des deals lies.
- Creation de contact depuis une fiche societe.
- Timeline d'activite sur la fiche societe.

## Contacts

- Liste paginee des contacts triee par mise a jour recente.
- Creation rapide de contact.
- Fiche contact avec edition inline de prenom, nom, poste, niveau de decision, email, LinkedIn et notes.
- Liens rapides `mailto:` et `tel:`.
- Suppression d'un contact.
- Lien vers la societe rattachee.
- Timeline d'activite sur la fiche contact.

## Reunions

- Creation de reunion rattachee a un deal, une societe ou un contact.
- Formulaire avec date, heure, duree, lieu/URL, participants, compte-rendu Markdown et next steps.
- Telechargement automatique d'un fichier `.ics` apres enregistrement.
- Page `/reunions` en vue mensuelle avec navigation mois precedent/suivant.
- Cartes reunion extensibles avec compte-rendu et next steps.
- Ajout automatique d'un evenement d'activite `meeting_logged`.

## Contrats

- Liste paginee des contrats.
- Affichage du statut, montant total, frequence, date de signature, debut et fin.
- Lien vers la societe et affichage du deal source.
- Backend CRUD pour contrats.
- Creation automatique depuis les deals signes.

## Recherche globale

- Palette Cmd/Ctrl-K.
- Recherche sur societes, contacts et deals.
- Navigation vers les fiches societe/contact et retour pipeline pour les deals.

## Tags et reglages

- Backend CRUD pour tags libres colores avec scope `societe`, `contact` ou `deal`.
- Page Reglages avec creation, renommage et suppression de tags.
- Palette de couleurs predefinie pour les tags.
- Affichage du pipeline fixe non editable en v1.
- Section donnees indiquant que l'export JSON complet reste a venir.

## Import CSV

- Drop CSV global sur l'application.
- Modal d'import CSV.
- Choix de cible pour `societes` ou `contacts`.
- Mapping manuel et auto-detecte des colonnes.
- Apercu des 5 premieres lignes.
- Import avec rapport simple : nombre de lignes creees et erreurs.

## Activite et timeline

- Evenements automatiques a la creation et mise a jour des societes, contacts et deals.
- Evenement automatique lors d'un changement de stage.
- Evenement automatique lors de l'ajout d'une reunion.
- Timeline affichee sur drawer deal, fiche societe et fiche contact.

## Mobile et responsive

- Shell responsive avec sidebar mobile.
- Kanban en scroll horizontal libre.
- Drag-and-drop tactile avec delai de long press.
- Drawer deal en sheet responsive plein largeur sur petit ecran.
