# Cahier des charges raffine - CRM hyper simple

Version raffinee le 2026-04-28 a partir de `IMPLEMENTED_FEATURES.md` et `IMPLEMENTATION_PLAN.md`.

## 1. Positionnement

Le CRM doit rester un outil d'action commerciale quotidien, pas une base exhaustive. Il doit aider l'equipe a repondre vite a trois questions :

1. Qui dois-je contacter aujourd'hui ?
2. Quelles opportunites dois-je faire avancer ?
3. Quelle information dois-je garder pour ne rien oublier ?

Toute fonctionnalite qui n'aide pas directement ces trois questions est secondaire.

## 2. Principe de tri des features

Une feature est conservee si elle respecte au moins deux criteres :

- Elle reduit les oublis de relance.
- Elle aide a prioriser les meilleures opportunites.
- Elle raccourcit une action frequente.
- Elle rend le pipeline plus lisible.
- Elle ameliore la qualite des donnees sans ajouter beaucoup de saisie.
- Elle protege la portabilite des donnees.

Une feature est repoussee si elle cree surtout de la complexite produit, des reglages, de l'administration ou du reporting avance.

## 3. Objets conserves

### Societes

Conserver comme fiche compte principale.

Champs utiles :

- Nom
- SIRET si disponible
- Ville / pays
- Secteur
- Site web
- Effectif
- Statut : prospect, client, partenaire, fournisseur
- Priorite : haute, moyenne, basse
- Owner
- Notes
- Tags

### Contacts

Conserver comme personnes rattachees aux societes.

Champs utiles :

- Prenom
- Nom
- Email
- Telephone
- LinkedIn
- Poste
- Niveau de decision
- Societe
- Owner
- Notes
- Tags

### Deals

Conserver comme unite centrale du pipeline.

Champs utiles :

- Titre
- Societe
- Contact principal ou contacts lies
- Montant
- Probabilite
- Stage
- Date de closing estimee
- Owner
- Notes
- Tags
- Date de cloture si gagne ou perdu
- Motif de perte si perdu

Stages conserves :

1. Lead
2. Qualifie
3. Proposition
4. Nego
5. Signe
6. Perdu

### Activite

Conserver comme historique automatique et notes simples.

Evenements importants :

- Creation ou modification d'une fiche
- Changement de stage
- Note ajoutee
- Reunion loggee
- Fusion de doublon

### Reunions

Conserver uniquement si elles restent legeres : date, participants, compte-rendu, next steps et rattachement a une societe, un contact ou un deal.

### Contrats

Conserver comme resultat d'un deal signe, sans transformer le CRM en outil de facturation.

## 4. Features coeur a garder

### 4.1 Vue Aujourd'hui

Priorite : critique.

La vue doit afficher uniquement ce qui demande une action immediate :

- Relances du jour
- Relances en retard
- Deals sans prochaine action
- Deals a closing depasse
- Nouveaux contacts ou societes a qualifier

Pourquoi la garder :

- C'est le moteur d'usage quotidien.
- Elle evite que le CRM devienne une simple archive.
- Elle transforme les donnees existantes en liste d'action.

Statut actuel :

- Partiellement couvert par le dashboard et les deals a risque.
- A consolider en une vraie vue actionnable.

### 4.2 Pipeline Kanban + table

Priorite : critique.

Conserver :

- Kanban par stage
- Drag-and-drop
- Total par colonne
- Table des deals
- Filtres owner, tag, periode
- Tri simple en table
- Actions groupees essentielles : changer stage, assigner, tagger, supprimer

Exclure en v1 :

- Redimensionnement de colonnes
- Reordonnancement avance de colonnes
- Multi-select Kanban si cela degrade le mobile
- Pipeline editable par les utilisateurs

Statut actuel :

- Kanban, DnD, table et actions groupees de base existent.
- Les filtres, tags complets et tri sont les ajouts les plus utiles.

### 4.3 Fiches societe, contact et deal vraiment utiles

Priorite : tres haute.

Chaque fiche doit tenir son role :

- Societe : voir le compte, ses contacts, ses deals, ses reunions, ses contrats et son historique.
- Contact : voir la personne, ses coordonnees, sa societe, ses deals, ses reunions et son historique.
- Deal : faire avancer l'opportunite, modifier stage/montant/probabilite/closing, voir notes, contacts, reunions et activite.

Actions rapides a garder :

- Ajouter une note
- Creer une reunion
- Creer un contact depuis une societe
- Creer un deal depuis une societe ou un contact
- Copier email / appeler
- Tagger

Exclure en v1 :

- Photo contact
- Anniversaire
- Langue
- SMS
- Champs juridiques et financiers avances

Statut actuel :

- Les fiches existent deja en bonne partie.
- Priorite : ajouter tags lisibles, relations manquantes, reunions liees et timeline plus comprehensible.

### 4.4 Notes rapides et timeline comprehensible

Priorite : tres haute.

Garder :

- Notes courtes sur societe, contact et deal
- Timeline chronologique
- Libelles metier comprehensibles
- Actor lisible si disponible
- Differentiel simple sur les changements importants

Exclure en v1 :

- Modeles de notes
- Automatisation de compte-rendu
- Analyse IA des notes

Statut actuel :

- Timeline et evenements automatiques existent.
- Il faut rendre les evenements plus lisibles et distinguer les vraies notes.

### 4.5 Tags simples et filtres

Priorite : haute.

Garder :

- Tags libres colores
- Scope societe, contact, deal
- Application/retrait depuis les fiches
- Affichage en chips
- Filtres par tag sur pipeline et listes principales
- Compteur d'utilisation dans Reglages

Pourquoi la garder :

- Elle donne de la segmentation sans ajouter de modele complexe.
- Elle aide la recherche, les imports et les actions groupees.

Statut actuel :

- Backend et reglages existent.
- Il manque l'application directe aux fiches et les filtres.

### 4.6 Recherche globale

Priorite : haute.

Garder :

- Recherche Cmd/Ctrl-K
- Societes
- Contacts
- Deals
- Contrats
- Notes/reunions si faisable sans cout technique disproportionne
- Navigation clavier

Exclure en v1 :

- Recherche plein texte complexe si elle ralentit le produit.
- Moteur de recherche externe.

Statut actuel :

- Recherche societes, contacts et deals existe.
- A etendre de maniere pragmatique.

### 4.7 Import CSV utile avec dedoublonnage

Priorite : haute.

Garder :

- Import societes
- Import contacts
- Import deals seulement si le mapping reste simple
- Auto-mapping des colonnes
- Previsualisation
- Detection des doublons
- Choix creer / fusionner / ignorer
- Rapport final

Exclure en v1 :

- Fusion tres avancee champ par champ
- Import multi-fichiers
- Connecteurs externes

Statut actuel :

- Import societes/contacts, mapping et apercu existent.
- Le dedoublonnage est le vrai gain restant.

### 4.8 Export et backup

Priorite : haute.

Garder :

- Export CSV des listes principales
- Export JSON complet depuis Reglages
- Respect des filtres visibles quand pertinent

PDF :

- Garder seulement pour fiche societe et fiche deal si l'usage d'archivage est confirme.
- Repousser les PDF contact/contrat si cela disperse le travail.

Statut actuel :

- Non finalise.
- C'est une feature isolee et importante pour la confiance dans l'outil.

### 4.9 Reunions legeres

Priorite : moyenne.

Garder :

- Creation depuis une fiche ou depuis la page Reunions
- Rattachement societe/contact/deal
- Compte-rendu Markdown
- Next steps
- Fichier `.ics`
- Checkbox pour terminer un next step

Exclure en v1 :

- Gestion avancee des agendas
- Synchronisation Microsoft/Google Calendar
- Assignation complexe des next steps

Statut actuel :

- La base est deja solide.
- Les ajouts doivent rester limites a l'ergonomie et aux next steps.

### 4.10 Reporting minimal

Priorite : moyenne.

Garder :

- Valeur du pipeline brute et ponderee
- Deals gagnes/perdus sur periode
- Activite par commercial
- Deals a risque
- Relances en retard
- Opportunites sans prochaine action

Exclure en v1 :

- Rapports personnalises
- Tableaux croises
- Previsions complexes
- Objectifs commerciaux parametres

Statut actuel :

- Dashboard deja present.
- Ajouter surtout les indicateurs d'action manquants.

## 5. Features a declasser ou supprimer du scope proche

### A repousser apres validation terrain

- Magic link si l'auth email/mot de passe actuelle suffit pour tester.
- SSO Microsoft si le deploiement interne ne l'exige pas immediatement.
- Connexion email.
- Connexion agenda.
- Rappels recurrents.
- Suggestions automatiques de relance.
- Modeles de notes.
- Scoring automatique.
- Reporting avance.
- Permissions granulaires.
- Pipeline editable.
- Gestion complete des contrats.
- Facturation.
- Support client.

### A supprimer du cahier des charges v1

- Champs contact secondaires : anniversaire, langue, photo.
- Champs societe secondaires : forme juridique detaillee, CA estime si non utilise en prospection.
- SMS comme action rapide.
- Reordonnancement/redimensionnement avance des tables.
- Automatisations IA.

## 6. Backlog recommande

### Lot 1 - Transformer l'existant en outil quotidien

Objectif : ouvrir le CRM chaque matin et savoir quoi faire.

1. Vue Aujourd'hui actionnable.
2. Deals sans prochaine action.
3. Relances en retard et closing depasse.
4. Notes rapides mieux journalisees.
5. Timeline lisible.

### Lot 2 - Prioriser et retrouver vite

Objectif : ne pas se perdre dans la base.

1. Tags appliques aux fiches et deals.
2. Filtres owner/tag/periode sur pipeline.
3. Recherche globale enrichie.
4. Tri simple dans la table deals.

### Lot 3 - Qualite et portabilite des donnees

Objectif : importer proprement et pouvoir ressortir les donnees.

1. Dedoublonnage import CSV.
2. Import deals si simple.
3. Export CSV listes principales.
4. Backup JSON complet.

### Lot 4 - Fiches enrichies sans lourdeur

Objectif : rendre chaque fiche suffisante pour travailler.

1. Tags sur societe/contact/deal.
2. Reunions liees dans les fiches.
3. Contacts lies au deal.
4. Contrats visibles sur societe cliente.
5. PDF societe/deal si utile.

### Lot 5 - Finition mobile et production

Objectif : fiabiliser les workflows principaux.

1. Creation, recherche, consultation et deplacement Kanban sur mobile.
2. Dialogues import/reunion/creation utilisables a 360px.
3. Auth et SSO uniquement selon besoin de deploiement.
4. Configuration production, backup et variables d'environnement.

## 7. Definition du MVP raffine

Le MVP utile n'est pas celui qui couvre le plus de modules. C'est celui qui rend ces parcours fluides :

1. Ajouter une societe ou un contact.
2. Creer un deal.
3. Le faire avancer dans le pipeline.
4. Ajouter une note ou une reunion.
5. Planifier ou identifier la prochaine action.
6. Retrouver l'information en quelques secondes.
7. Exporter les donnees si besoin.

## 8. Indicateurs de succes

- Un utilisateur sait quoi faire en moins de 30 secondes apres ouverture.
- Une creation de contact prend moins d'une minute.
- Une creation de deal prend moins d'une minute.
- Aucun deal actif important ne reste sans prochaine action.
- Les relances en retard sont visibles sans chercher.
- Le pipeline est comprehensible en moins d'une minute.
- Les donnees peuvent etre exportees sans intervention technique.

## 9. Synthese

La meilleure version de ce CRM est une version volontairement stricte :

- Vue Aujourd'hui
- Pipeline
- Fiches utiles
- Notes/timeline
- Tags/filtres
- Recherche
- Import propre
- Export/backup
- Reporting minimal
- Reunions legeres

Tout le reste doit etre justifie par un usage observe, pas par une possibilite technique.
