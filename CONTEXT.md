# CONTEXT — Glossaire du domaine CRM

> Glossaire du langage du domaine. **Pas** de détails d'implémentation : seulement
> ce que les termes signifient et comment ils se distinguent les uns des autres.

## Contact

Une personne suivie dans le CRM (prospect ou relation). Porte un état de pipeline
(`stage`), un montant, des coordonnées, et des liens vers des utilisateurs SCIAM
(voir Propriétaire, Responsable).

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

## Contact SCIAM (hérité)

Ancien champ **texte libre** (ex. « Maurin », « Bruno ») désignant informellement
le référent SCIAM d'un contact. **Remplacé par Propriétaire.** Conservé uniquement
pour rattraper rétroactivement les propriétaires manquants par correspondance de
nom. À ne plus utiliser pour de nouvelles saisies.
