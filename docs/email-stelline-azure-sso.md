**Objet :** Demande de création d'une App Registration Azure AD pour le CRM SCIAM

Bonjour Stelline,

Dans le cadre du développement du CRM SCIAM, nous avons besoin de mettre en place la connexion via le compte Microsoft de SCIAM (SSO Azure AD).

Pourrais-tu créer une **App Registration** dans le portail Azure (portal.azure.com) avec les paramètres suivants :

---

**1. Informations générales**
- Nom : `CRM SCIAM SSO`
- Types de comptes pris en charge : *Comptes dans cet annuaire organisationnel uniquement (SCIAM - Locataire unique)*

---

**2. URI de redirection à configurer (obligatoire)**

Plateforme : **Web**
URL de redirection :
```
https://artful-mammoth-392.eu-west-1.convex.site/api/auth/sso/callback
```

---

**3. Permissions API requises (Microsoft Graph)**

Dans *Permissions API → Ajouter une permission → Microsoft Graph → Permissions déléguées*, ajouter :

| Permission       | Type      | Description                        |
|------------------|-----------|------------------------------------|
| `User.Read`      | Déléguée  | Connexion et lecture du profil     |
| `User.ReadWrite` | Déléguée  | Mise à jour du profil utilisateur  |

> Cliquer sur **Accorder le consentement administrateur** après l'ajout.

---

**4. Informations à nous communiquer une fois l'app créée**

- **Application (client) ID** (ex : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **Directory (tenant) ID** (ex : `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- **Client Secret** : créer un nouveau secret dans *Certificats et secrets → Nouveau secret client*, durée 24 mois, et nous transmettre la **valeur** (pas l'ID)

---

Merci d'avance,
Pierre
