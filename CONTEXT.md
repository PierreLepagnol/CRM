# CONTEXT — Glossaire du domaine CRM

> Glossaire du langage du domaine. **Pas** de détails d'implémentation : seulement
> ce que les termes signifient et comment ils se distinguent les uns des autres.

## Contact

Une personne suivie dans le CRM (prospect ou relation). Porte un état de pipeline
(`stage`), un montant, des coordonnées, et des liens vers des utilisateurs SCIAM
(voir Propriétaire, Responsable). Peut être **rattaché** à une Entreprise.

Ses **coordonnées** sont des attributs durables permettant de joindre la personne :
email, téléphone, et **Profil LinkedIn**. À distinguer d'une Interaction de type
`linkedin`, qui est un *échange daté* et non une coordonnée (cf. Interaction).

## Profil LinkedIn

L'**adresse (URL) du profil LinkedIn** d'un Contact : une **coordonnée**, au même
titre que l'email ou le téléphone. Attribut durable de la personne, **pas** un
événement de la timeline. À ne pas confondre avec l'Interaction de type `linkedin`
(« j'ai échangé avec lui sur LinkedIn le … »).

## Prospect

L'**état d'entrée** d'un Contact dans le pipeline : le stage `nouveau`. « Prospect »
est le **libellé** de ce stage (pas une entité ni un stage distinct). Tout Contact
créé par un **Import** y atterrit. À distinguer des stages suivants (Contacté, RDV,
Proposition, Gagné, Perdu).

## Entreprise

Une **organisation** (« compte ») suivie dans le CRM, à laquelle des Contacts sont
rattachés. C'est une **entité de premier ordre** : un enregistrement unique avec
sa propre identité, pas un simple libellé saisi. « Crédit Agricole CIB » désigne
**une seule** Entreprise, quelle que soit l'orthographe tapée par les utilisateurs.
Une Entreprise regroupe ses Contacts (relation un-à-plusieurs).

## Rattachement

Le lien entre un Contact et son Entreprise. Optionnel (un contact peut n'être
rattaché à aucune entreprise) et au plus une Entreprise par Contact.

## Fusion (d'entreprises)

Opération de consolidation de deux Entreprises faisant double emploi en une seule.
On désigne l'Entreprise **survivante** (nom canonique) ; tous les Contacts de
l'Entreprise **absorbée** lui sont rattachés, puis l'absorbée est supprimée. C'est
la voie normale pour éliminer les doublons (une Entreprise ne peut pas être
supprimée tant que des Contacts lui sont rattachés).

## Import (de contacts)

Opération de création **en masse** de Contacts à partir d'un fichier (CSV ou XLSX),
chacun entrant comme **Prospect**. L'opérateur mappe les colonnes, lève les
**Doublons**, résout les **Rattachements** d'Entreprise non reconnus, puis valide
le lot (« validation humaine »). À distinguer de la création unitaire d'un Contact.

## Doublon (de contact)

Un Contact importé qui désigne **la même personne** qu'un Contact existant. Le
critère est l'**email** (normalisé). Une ligne sans email n'est jamais un doublon
(toujours une création). On ne fait **pas** de rapprochement par nom — même esprit
« sans flou » que pour l'Entreprise (cf. Fusion).

## Enrichissement

Le traitement d'un **Doublon** : au lieu de créer un Contact, l'Import **complète
les champs vides** du Contact existant (« remplir si vide ») sans jamais écraser une
donnée déjà saisie. Les notes sont **concaténées** (comme la Fusion). À distinguer
de la **Création** (Contact réellement nouveau).

## Propriétaire (owner)

L'**utilisateur SCIAM responsable principal** d'un contact. Un seul par contact.

- À la création d'un contact, le **Créateur** devient propriétaire **par défaut**.
- Le propriétaire reste **modifiable** ensuite : on peut réattribuer un contact à
  un collègue. Le créateur, lui, ne change jamais.
- Un contact **peut** ne pas avoir de propriétaire (champ optionnel), mais c'est
  considéré comme un état à éviter / à rattraper.

## Créateur (créateur)

L'utilisateur qui a **saisi** le contact. Information d'audit, **non modifiable**,
distincte du Propriétaire même si elle l'initialise. N'est pas affichée comme un
champ éditable.

## Responsable

Utilisateur(s) SCIAM **additionnels** associés à un contact, en plus du
Propriétaire. Plusieurs possibles. Rôle d'accompagnement, pas de responsabilité
principale.

## Interaction

Un échange consigné sur la timeline d'un contact (« Historique des échanges ») :
`email`, `appel`, `rdv`, `linkedin`, `relance`. Porte une **date**, un **résumé**
et un **auteur** (le Créateur de l'interaction, distinct du Propriétaire du
contact). Le type `linkedin` désigne un *échange via LinkedIn* (un événement daté) —
à distinguer du **Profil LinkedIn**, qui est une coordonnée du Contact.

Le **résumé** est une chaîne de texte libre qui s'affiche rendue en **Markdown**
(gras, italique, listes). L'éditeur sera à terme un composant Lexical ; en
attendant, la saisie reste un `<Textarea>` standard et l'affichage est un
lecteur Lexical en mode lecture seule.

## Relance

**Un type d'Interaction**, pas une entité distincte : un rappel de suivi à une
date donnée. Créée soit manuellement, soit automatiquement quand on renseigne une
date de relance sur un contact. Son auteur est l'utilisateur qui l'a saisie.

## Contact SCIAM (hérité)

Ancien champ **texte libre** (ex. « Maurin », « Bruno ») désignant informellement
le référent SCIAM d'un contact. **Remplacé par Propriétaire.** Conservé uniquement
pour rattraper rétroactivement les propriétaires manquants par correspondance de
nom. À ne plus utiliser pour de nouvelles saisies.
