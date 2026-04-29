# CRM - Plan d'implementation raffine

Document raffine le 2026-04-28 a partir de `IMPLEMENTED_FEATURES.md` et `crm_hyper_simple_cahier_des_charges.md`.

## Logique de priorisation

Le plan ne cherche plus a completer toutes les idees du cahier initial. Il privilegie les features qui rendent le CRM plus utilise au quotidien :

- savoir quoi faire aujourd'hui ;
- faire avancer les deals ;
- retrouver et qualifier vite ;
- fiabiliser les donnees ;
- exporter ou sauvegarder sans dependance technique.

Les sujets auth avancee, SSO, automatisations, champs secondaires et reporting avance sont repousses sauf contrainte de deploiement.

## Etat de depart

Deja solide :

- App Next.js + Convex + Better Auth.
- Pipeline Kanban avec DnD, table deals et actions groupees de base.
- Societes, contacts, deals, contrats, reunions, tags et activity events.
- Fiches societe/contact et drawer deal.
- Dashboard avec valeur pipeline, activite commerciale et deals a risque.
- Recherche globale societes/contacts/deals.
- Import CSV societes/contacts avec mapping et apercu.
- Reunions avec compte-rendu, next steps et `.ics`.
- Responsive de base.

Manques les plus utiles :

- Vue Aujourd'hui vraiment actionnable.
- Prochaine action / relance mieux exposee.
- Tags appliques aux fiches et filtres.
- Timeline plus lisible.
- Dedoublonnage import.
- Exports CSV et backup JSON.
- Recherche enrichie.
- Fiches reliees plus completes sans ajouter de champs inutiles.

## Ordre recommande

1. Vue Aujourd'hui, relances et deals sans prochaine action.
2. Notes rapides et timeline lisible.
3. Tags complets et filtres.
4. Pipeline/table plus filtrables et triables.
5. Import CSV avec dedoublonnage.
6. Exports CSV et backup JSON.
7. Recherche globale enrichie.
8. Fiches societe/contact/deal enrichies avec relations utiles.
9. Reunions legerement ameliorees.
10. Mobile et production.
11. Auth avancee / Microsoft SSO uniquement si requis.

## Lot 1 - Vue Aujourd'hui et discipline commerciale

Objectif : transformer l'accueil en liste d'action quotidienne.

### Backend

- Ajouter ou exposer les champs de prochaine action si le schema ne les couvre pas encore clairement :
  - `next_action_label`
  - `next_action_date`
  - `next_action_owner`
- Ajouter une query agregee `today.listActions` ou equivalente.
- Inclure :
  - relances du jour ;
  - relances en retard ;
  - deals actifs sans prochaine action ;
  - deals avec closing depasse ;
  - nouveaux contacts/societes sans qualification recente.
- Garder des bornes de volume simples pour eviter une vue lente.

### Frontend

- Creer une vue `/aujourdhui` ou transformer le dashboard actuel en mode action.
- Afficher des sections courtes avec actions rapides :
  - ouvrir fiche ;
  - ajouter note ;
  - planifier prochaine action ;
  - marquer traite ;
  - changer stage si c'est un deal.
- Ajouter l'entree dans la sidebar avant Pipeline.
- Garder le dashboard analytique en second niveau si necessaire.

### Acceptance

- Un utilisateur voit les actions prioritaires en moins de 30 secondes.
- Un deal actif sans prochaine action est visible.
- Une relance en retard est visible sans filtrage manuel.
- Une action traitee peut etre mise a jour sans quitter le flux.

## Lot 2 - Notes rapides et timeline utile

Objectif : rendre l'historique comprehensible par un utilisateur non technique.

### Backend

- Creer explicitement un evenement `note_added` quand une note est ajoutee.
- Ajouter un payload de diff limite pour les changements importants :
  - stage ;
  - montant ;
  - closing ;
  - owner ;
  - prochaine action ;
  - tags.
- Ajouter un type `merged` pour les futures fusions de doublons.
- Resoudre un actor lisible si Better Auth le permet.

### Frontend

- Ajouter une action rapide `Ajouter une note` sur deal, societe et contact.
- Afficher la timeline avec libelles metier :
  - "Stage modifie"
  - "Note ajoutee"
  - "Reunion loggee"
  - "Contact cree"
- Masquer les details techniques inutiles.
- Harmoniser les etats vides et chargements.

### Acceptance

- Une note courte peut etre ajoutee en quelques secondes.
- La timeline permet de comprendre ce qui s'est passe sans lire un payload technique.
- Les changements importants sont visibles mais pas verbeux.

## Lot 3 - Tags complets et filtres

Objectif : permettre une segmentation simple sans complexifier le modele.

### Backend

- Conserver la table `tags` existante.
- Ajouter mutations pour affecter/retirer un tag a :
  - societe ;
  - contact ;
  - deal.
- Ajouter filtres `tag_id` dans les queries de liste.
- Ajouter compteurs d'utilisation pour Reglages.
- Definir le comportement de suppression :
  - retirer le tag des entites ;
  - ou bloquer si utilise, avec message clair.

### Frontend

- Remplacer les compteurs de tags sur cartes deal par de vrais chips quand l'espace le permet.
- Ajouter edition des tags :
  - drawer deal ;
  - fiche societe ;
  - fiche contact.
- Ajouter filtres tag dans :
  - pipeline ;
  - table deals ;
  - listes societes/contacts si utile.
- Afficher les compteurs dans Reglages.

### Acceptance

- Un tag cree dans Reglages peut etre applique a une fiche.
- Les tags s'affichent avec label et couleur.
- Le pipeline et la table deals peuvent etre filtres par tag.
- La suppression ou le renommage reste coherent partout.

## Lot 4 - Pipeline et table plus efficaces

Objectif : rendre les deals filtrables et manipulables sans ajouter de complexite visuelle.

### Backend

- Etendre les queries deals avec filtres :
  - owner ;
  - tag ;
  - periode ;
  - stage si necessaire.
- Ajouter tri serveur ou client selon volume attendu.
- Ajouter mutations bulk utiles :
  - assigner owner ;
  - ajouter/retirer tags ;
  - changer stage ;
  - supprimer.
- Verifier la creation automatique de contrat en cas de bulk stage vers `signe`.

### Frontend

- Ajouter toolbar simple :
  - owner ;
  - tags ;
  - periode ;
  - recherche texte si utile.
- Ajouter tri sur les colonnes principales de la table :
  - titre ;
  - societe ;
  - montant ;
  - probabilite ;
  - closing ;
  - owner.
- Conserver les actions groupees existantes et ajouter assigner/tagger.
- Eviter en v1 :
  - redimensionnement de colonnes ;
  - reordonnancement de colonnes ;
  - multi-select Kanban complexe si mobile fragile.

### Acceptance

- Les filtres s'appliquent de facon coherente au Kanban et a la table.
- La table peut etre triee par colonnes utiles.
- Une selection multiple peut etre assignee, taggee, changee de stage ou supprimee.

## Lot 5 - Import CSV avec dedoublonnage

Objectif : rendre l'import fiable au lieu de seulement rapide.

### Backend

- Ajouter detection de doublons :
  - societe : SIRET, sinon nom normalise ;
  - contact : email, sinon prenom + nom + societe ;
  - deal : titre + societe, uniquement si l'import deals est active.
- Ajouter mutation d'import batch avec rapport :
  - crees ;
  - fusionnes ;
  - ignores ;
  - erreurs.
- Journaliser les fusions dans `activity_events`.

### Frontend

- Remplacer le parseur CSV simple par un parseur robuste si necessaire.
- Garder l'auto-mapping et l'apercu.
- Ajouter une etape "doublons detectes".
- Proposer les actions :
  - creer ;
  - fusionner ;
  - ignorer.
- Ajouter une action de masse sur les doublons.
- Import deals seulement si le formulaire reste lisible.

### Acceptance

- Un CSV societes ou contacts signale les doublons avant creation.
- L'utilisateur choisit creer/fusionner/ignorer.
- Le rapport final distingue clairement les resultats.

## Lot 6 - Exports et backup

Objectif : donner confiance dans la portabilite des donnees.

### Backend

- Ajouter queries non paginees mais bornees pour exporter :
  - societes ;
  - contacts ;
  - deals ;
  - contrats ;
  - reunions si utile.
- Ajouter une query de backup JSON complet :
  - societes ;
  - contacts ;
  - deals ;
  - contrats ;
  - reunions ;
  - tags ;
  - activity_events.
- Definir l'ordre des colonnes et la serialisation des dates/montants/tags.

### Frontend

- Ajouter `Exporter CSV` sur :
  - Societes ;
  - Contacts ;
  - Pipeline table ;
  - Contrats.
- Ajouter `Exporter tout (JSON)` dans Reglages.
- Respecter les filtres visibles pour les exports de liste quand attendu.
- Ajouter toasts succes/echec.
- PDF uniquement pour fiche societe/deal si l'usage est confirme.

### Acceptance

- Les listes principales produisent un CSV exploitable.
- Reglages produit un backup JSON complet.
- Les exports ne necessitent pas d'intervention technique.

## Lot 7 - Recherche globale enrichie

Objectif : retrouver rapidement une fiche ou une information importante.

### Backend

- Ajouter contrats a la recherche.
- Ajouter notes/reunions si Convex search le permet simplement.
- Sinon, garder une recherche bornee dans les champs deja charges/indexes.
- Retourner des resultats contextualises :
  - type ;
  - titre ;
  - sous-titre ;
  - href ;
  - metadata minimale.

### Frontend

- Garder Cmd/Ctrl-K.
- Grouper les resultats :
  - Societes ;
  - Contacts ;
  - Deals ;
  - Contrats ;
  - Notes/Reunions si disponible.
- Ajouter navigation clavier fleches + entree.
- Ouvrir un deal dans le drawer si possible, sinon naviguer vers le pipeline avec contexte.

### Acceptance

- La recherche trouve au moins societes, contacts, deals et contrats.
- Les resultats s'ouvrent au bon endroit.
- L'utilisation clavier est fluide.

## Lot 8 - Fiches utiles, pas encyclopediques

Objectif : enrichir les fiches avec les relations qui aident a agir.

### Societe

Backend :

- Ajouter queries reunions par societe et contrats par societe si manquantes.
- Ajouter suppression controlee selon dependances.

Frontend :

- Afficher contacts, deals, reunions, contrats, notes et timeline.
- Ajouter tags editables.
- Ajouter bouton `+ Reunion`.
- Garder les champs secondaires hors v1 sauf besoin prouve.

Acceptance :

- Une fiche societe suffit pour comprendre le compte et ses actions recentes.

### Contact

Backend :

- Ajouter deals lies via contacts si necessaire.
- Ajouter reunions liees au contact.

Frontend :

- Afficher societe, deals, reunions, notes et timeline.
- Ajouter tags editables.
- Garder email/tel/LinkedIn comme actions rapides.
- Exclure photo, anniversaire, langue et SMS en v1.

Acceptance :

- Une fiche contact suffit pour reprendre le fil sans chercher ailleurs.

### Deal

Backend :

- Ajouter contacts lies au deal si incomplet.
- Ajouter mutations de liaison/deliaison contacts.

Frontend :

- Afficher societe, contacts, notes, reunions et activite.
- Ajouter tags editables.
- Ajouter prochaine action si le lot 1 l'introduit.
- PDF deal seulement si utile.

Acceptance :

- Le drawer deal contient tout ce qu'il faut pour faire avancer l'opportunite.

## Lot 9 - Reunions legeres

Objectif : garder les reunions utiles sans creer un module agenda lourd.

### Backend

- Ajouter update du statut `done` des next steps.
- Enrichir le `.ics` avec titre, description, participants et timezone.
- Ajouter recherche dans comptes-rendus uniquement si incluse dans le lot recherche.

### Frontend

- Permettre creation depuis page Reunions avec choix de l'entite rattachee.
- Ajouter checkbox interactive pour terminer un next step.
- Ajouter edition/suppression simple d'une reunion.
- Garder le compte-rendu Markdown.

### Acceptance

- Une reunion peut etre creee depuis une fiche ou depuis la page Reunions.
- Les next steps peuvent etre coches.
- Le fichier `.ics` contient les informations utiles.

## Lot 10 - Mobile et production

Objectif : fiabiliser les workflows principaux.

### Mobile

- Tester 360px, 768px et desktop.
- Verifier :
  - sidebar mobile ;
  - Kanban horizontal ;
  - drawer deal ;
  - creation deal/contact/societe ;
  - ajout de note ;
  - import CSV ;
  - reunion ;
  - recherche.
- Corriger les debordements texte/boutons.
- Garder les tableaux scrollables horizontalement.

### Production

- Configurer Convex region UE.
- Configurer variables d'environnement.
- Verifier URL publique et callbacks auth.
- Ajouter procedure de backup/export.
- Ajouter pages d'erreur minimales si necessaire.

### Acceptance

- Les workflows principaux sont utilisables sur mobile.
- L'application fonctionne en environnement prod avec backup/export disponible.

## Lot 11 - Auth avancee et SSO Microsoft si requis

Objectif : ne pas bloquer la valeur produit par un chantier auth sauf contrainte reelle.

### A faire seulement si necessaire

- Magic link.
- Provider Microsoft 365.
- Tenant autorise.
- Sender email dev/prod.
- Ecran `/login` final en francais.

### Acceptance

- Les pages CRM restent protegees.
- L'utilisateur peut se connecter avec le mode retenu.
- Microsoft SSO fonctionne uniquement si c'est une exigence de deploiement.

## Features explicitement sorties du plan proche

- Scoring automatique.
- Automatisation marketing.
- Connexion email.
- Connexion agenda.
- Rappels recurrents.
- Suggestions IA.
- Modeles de notes.
- Reporting personnalise.
- Permissions granulaires.
- Facturation.
- Support client.
- Champs contact secondaires : photo, anniversaire, langue.
- Champs societe secondaires non utilises en prospection.
- Redimensionnement/reordonnancement avance des tables.

## Definition de termine globale

Une feature est terminee si :

- elle reduit une action commerciale frequente ;
- elle fonctionne sur desktop et mobile ;
- elle respecte les donnees par utilisateur authentifie ;
- elle a des etats vide/chargement/erreur corrects ;
- elle ne rajoute pas de saisie obligatoire inutile ;
- elle est testee manuellement sur les workflows principaux.
