---
title: "Refonte du site SCIAM : comment l’IA peut accélérer la mise à jour des contenus"
subtitle: "Comprendre les enjeux, les besoins et comment nous avons migré notre site de webflow en CMS-less et Next.js"
---

## Introduction

La refonte du site SCIAM a été l’occasion de repenser à la fois la structure du site, la gestion des contenus et la manière dont les équipes peuvent intervenir dessus. 
L’objectif n’était pas uniquement de produire un nouveau site plus moderne, mais aussi de rendre les futures modifications plus simples, plus rapides et plus fiables.

Dans cet article, Pierre nous partage la démarche suivie pour passer d’un site existant, initialement construit sur Webflow, vers une architecture plus souple, pilotée par du code, des données structurées et des outils d’IA tels que Claude Code.
Cette approche permet de modifier des contenus, d’ajouter des offres, de réorganiser des pages ou encore de transformer des supports existants en contenus exploitables pour le site.
L’enjeu principal: donner aux équipes la capacité de faire évoluer le site sans dépendre systématiquement d’un profil très technique, tout en gardant un cadre suffisamment sécurisé pour éviter les erreurs en production.

## Un peu de contexte : un site à moderniser et des contenus à clarifier

Le nouveau site SCIAM reprend une partie de l’existant, tout en proposant une organisation plus claire.
Une évolution importante concerne la distinction entre les pages **offres** et les pages **expertises**.
Jusqu’ici, certains contenus étaient regroupés ou présentés de manière dense, l’objectif est désormais de mieux structurer l’information pour faciliter la lecture et orienter plus efficacement les visiteurs.

Chaque offre ou expertise repose sur plusieurs éléments :

* un nom ;
* un slogan ou une accroche ;
* une courte description ;
* des tags ;
* une page détaillée accessible depuis une carte.

Ces contenus proviennent en partie de documents et pages existants, notamment des supports produits précédemment par les équipes. 
Une question reste toutefois ouverte : faut-il conserver beaucoup de texte sur le site, ou au contraire alléger les pages pour encourager les visiteurs à contacter SCIAM ? Ce point nécessite un alignement collectif, notamment avec Bruno et les équipes concernées.

Au-delà du fond, Pierre invite également chacun à relire le site et à signaler les éventuelles anomalies : problèmes d’alignement, éléments visuels incohérents, contenus manquants ou informations qui ne seraient plus à jour.



## Pourquoi sortir de Webflow ?

Le site historique était construit sur Webflow. 
Cet outil permet de créer des pages web sans coder entièrement, en combinant des éléments visuels, des composants et un CMS. Mais dans le cas de SCIAM, plusieurs limites sont apparues.

La principale difficulté venait de la maintenance. Modifier une simple liste, par exemple la liste des collaborateurs, pouvait devenir long et complexe. Les informations étaient parfois dispersées à plusieurs endroits, avec un risque de duplication ou d’incohérence. Certains profils de personnes ayant quitté l’entreprise étaient encore présents dans les données, ce qui posait aussi des questions de qualité de contenu et potentiellement de conformité RGPD.

L’autre limite concernait la capacité à faire évoluer rapidement le site. Pour itérer efficacement avec l’IA, il est préférable de travailler avec des données claires, structurées et peu ambiguës. Plus le contenu est dispersé ou difficile à lire, plus l’intelligence artificielle risque de se perdre dans des détails ou de proposer des modifications hasardeuses.

C’est dans ce contexte qu’une nouvelle approche a été testée : utiliser l’existant comme base, mais reconstruire un site plus simple à comprendre pour la machine, plus facile à modifier, et plus rapide à déployer.



## Une méthode de travail fondée sur l’IA et l’itération rapide

La démarche suivie repose sur une idée simple : plutôt que de tout refaire manuellement, l’IA est utilisée comme un assistant capable d’analyser, extraire, structurer, produire et modifier du contenu ou du code.

Pierre explique ne pas avoir cherché à coder chaque élément à la main. Son rôle a surtout consisté à guider l’IA étape par étape, en lui donnant les bons objectifs, les bons fichiers et les bons garde-fous.

La logique a été la suivante :

1. récupérer les contenus et les assets du site existant ;
2. analyser le modèle de données ;
3. identifier les éléments à conserver, fusionner, supprimer ou réorganiser ;
4. extraire les styles et les composants visuels du site existant ;
5. générer une nouvelle architecture technique ;
6. produire les pages ;
7. tester les modifications ;
8. déployer le site.

Cette méthode a permis d’obtenir une première version fonctionnelle très rapidement. Là où l’approche Webflow semblait lourde à modifier, le nouveau système a permis de produire une structure exploitable en moins d’une heure lors d’un premier test.



## Première étape : récupérer les données du site existant

La première étape a consisté à télécharger les données issues de Webflow : textes, titres, descriptions, noms des personnes, logos, couleurs et autres éléments utilisés sur le site.

Pour cela, Pierre a utilisé Claude Code afin de générer un script Python. L’objectif donné à l’IA était de se connecter à Webflow via l’API, de récupérer les contenus disponibles, puis de les stocker localement dans un dossier dédié.

L’intérêt de cette étape est double.

D’une part, elle permet de repartir de l’existant sans perdre les contenus déjà produits. D’autre part, elle donne une vision exhaustive des données disponibles, ce qui facilite ensuite l’audit et la réorganisation.

Le CMS de Webflow a ici joué le rôle de source de données initiale. Le CMS correspond à la partie du site où sont stockés les contenus : profils, offres, descriptions, pages, métadonnées, etc. Une fois ces données extraites, elles peuvent être analysées, nettoyées et restructurées.



## Deuxième étape : auditer et simplifier le modèle de données

Après l’extraction, Pierre a demandé à l’IA de réaliser un audit du modèle de données. L’objectif était de rendre ce modèle plus simple, plus propre et plus lisible.

L’audit devait notamment répondre aux questions suivantes :

* y a-t-il des données dupliquées ?
* certains contenus sont-ils inutilisés ?
* certaines informations doivent-elles être fusionnées ?
* certains champs doivent-ils être supprimés ?
* la structure actuelle est-elle adaptée au futur site ?

Cette étape est importante, car un site facile à modifier repose d’abord sur des données bien organisées. Si une information existe à plusieurs endroits, chaque modification devient risquée. Il faut alors se demander si l’on a bien mis à jour toutes les occurrences, si une ancienne version n’est pas restée visible, ou si une donnée obsolète ne traîne pas encore dans une page.

Le cas des collaborateurs illustre bien ce point. Certains profils étaient encore présents alors que les personnes n’étaient plus chez SCIAM. Avec un modèle de données propre, il devient plus simple de supprimer un profil, de l’archiver ou de le masquer du site, sans devoir chercher manuellement l’information à plusieurs endroits.



## Troisième étape : analyser le style du site existant

L’objectif n’était pas de repartir d’une page blanche. Le nouveau site devait rester fidèle à l’identité SCIAM : couleurs, typographie, navigation, structure des pages et logique visuelle générale.

Pour y parvenir, Pierre a utilisé un outil capable de parcourir les pages du site, de prendre des captures d’écran et d’analyser les éléments présents : textes, couleurs, espacements, boutons, navigation, disposition des blocs, etc.

Cette étape s’apparente à ce que fait un robot d’indexation lorsqu’il analyse un site, mais avec un objectif différent : non pas référencer les pages, mais comprendre leur structure et leur style pour en déduire des composants réutilisables.

L’IA a ainsi pu identifier les couleurs principales, la typographie, la logique des boutons, les espacements et les grands blocs récurrents. À partir de cette analyse, elle a proposé un plan de composants et un wireframe, c’est-à-dire une représentation simplifiée de la structure des pages.

Cette méthode permet de guider l’IA progressivement. Plutôt que de lui demander directement « fais-moi un site », on lui demande d’abord d’observer, puis de synthétiser, puis de proposer une architecture, puis seulement ensuite de produire.



## Quatrième étape : construire le nouveau site

Une fois les données et le style récupérés, Pierre a combiné ces éléments pour construire le nouveau site. Le choix technique s’est porté sur Next.js, un framework utilisé pour créer des sites web modernes.

Ce choix répond à un objectif : disposer d’un site compréhensible par l’IA, maintenable par code, et plus facile à faire évoluer que l’ancien système. Le code n’est pas ici un obstacle, mais un support structuré sur lequel l’IA peut intervenir.

Pierre insiste sur un point : il n’est pas nécessaire que tout le monde devienne développeur pour contribuer. En revanche, il faut comprendre la logique de fonctionnement :

* les contenus sont rangés dans des fichiers structurés ;
* les pages s’appuient sur ces contenus ;
* l’IA peut modifier ces fichiers si on lui donne une instruction claire ;
* les modifications peuvent ensuite être vérifiées avant d’être publiées.

Le site est hébergé via Vercel, qui joue le rôle de serveur. Webflow assurait auparavant à la fois la construction et l’hébergement du site. En sortant de Webflow, il fallait donc un nouvel outil pour rendre le site accessible en ligne. C’est ce rôle que joue Vercel.

Le code est, quant à lui, relié à GitHub. Cette organisation permet de suivre les modifications, de travailler sur différentes versions et de déclencher les déploiements.



## Modifier une offre : comment ça fonctionne concrètement ?

La démonstration montre comment modifier une offre existante. L’exemple utilisé concerne une carte d’offre contenant l’accroche « Voir clair pour décider juste ».

La première possibilité consiste à modifier directement le fichier de données correspondant. Les informations des offres sont stockées dans un fichier structuré, par exemple au format JSON. Ce fichier contient les champs utilisés par le site : titre, slogan, description, tags, contenu détaillé, etc.

La deuxième possibilité consiste à demander à l’IA de faire la modification. Dans ce cas, il faut formuler une demande claire, par exemple :

> Je veux modifier le slogan de cette offre. Cherche l’offre contenant « Voir clair pour décider juste » et remplace l’accroche par la nouvelle formulation suivante.

Plus l’instruction est précise, plus le résultat est fiable. Pierre recommande de donner à l’IA des éléments de contexte, comme le nom du fichier ou de la section à modifier, afin d’éviter qu’elle ne cherche au mauvais endroit ou ne modifie des éléments non concernés.

Il est également possible de demander des changements plus larges, par exemple traduire certains slogans, ajouter un poste à un profil collaborateur ou créer une nouvelle offre à partir d’un support existant.



## Bien prompter l’IA : précision, contexte et garde-fous

L’un des enseignements principaux de la présentation concerne la manière de dialoguer avec l’IA.

Il ne suffit pas de demander « modifie le site ». Il faut guider l’outil, comme on guiderait un collaborateur à qui l’on confie une tâche précise. Cela passe par plusieurs réflexes :

* indiquer clairement ce que l’on veut modifier ;
* fournir le texte exact à rechercher ;
* mettre les éléments importants entre guillemets ou balises ;
* préciser si l’on veut modifier une offre, une expertise, une fiche collaborateur ou une autre section ;
* demander à l’IA d’expliquer son plan avant d’appliquer les changements ;
* vérifier les fichiers modifiés avant validation.

Les guillemets permettent notamment de signaler à l’IA qu’elle doit rechercher une chaîne de caractères exacte. Pour manipuler du code ou du contenu structuré, certains délimiteurs peuvent aussi aider à séparer clairement l’instruction du contenu fourni.

Un bon prompt n’est donc pas forcément long, mais il doit être explicite. L’objectif est de réduire les ambiguïtés.



## Ajouter une nouvelle offre à partir d’un PowerPoint

Un cas d’usage particulièrement intéressant concerne la transformation d’un support PowerPoint en contenu pour le site.

Les équipes disposent déjà de présentations, par exemple sur le Center of Excellence ou sur d’autres offres. Ces supports contiennent une matière utile, mais leur format n’est pas idéal pour alimenter directement un site web. Un PowerPoint est en réalité un fichier complexe, composé de nombreux éléments internes. Pour l’IA, il peut être trop verbeux ou difficile à exploiter tel quel.

La méthode proposée consiste donc à extraire d’abord le texte du PowerPoint, puis à le convertir dans un format plus simple, comme le Markdown. Le Markdown est un format texte léger qui permet d’indiquer des titres, sous-titres, listes et paragraphes de manière lisible.

Une fois le contenu extrait, il devient beaucoup plus facile de demander à l’IA :

> Je veux ajouter cette offre au site. Voici le contenu. Respecte le template existant et structure l’offre de manière cohérente avec les autres pages.

L’IA peut alors créer le fichier nécessaire, reprendre la structure du site et intégrer le nouveau contenu dans le bon format.

Cette approche permet de transformer des supports existants en contenus web, sans devoir tout réécrire manuellement.



## Gouvernance : éviter les modifications directes en production

Un point important concerne la gouvernance. Si plusieurs personnes peuvent modifier le site via l’IA, il faut éviter que chacun intervienne directement sur la version en production.

Modifier directement la branche principale peut être risqué. Deux personnes peuvent modifier la même page en même temps, créer des conflits ou publier involontairement un contenu non validé.

La solution envisagée consiste à mettre en place un fonctionnement avec une version de prévisualisation. Les contributeurs pourraient faire leurs modifications sur une branche ou un environnement dédié, vérifier le rendu, puis demander une validation avant publication.

Une personne ou un groupe référent pourrait ensuite décider d’intégrer les modifications sur le vrai site.

Cette gouvernance permettrait de concilier autonomie et sécurité :

* les équipes peuvent proposer des changements ;
* les modifications sont visibles avant publication ;
* un contrôle final évite les erreurs en production ;
* l’historique des changements reste traçable.



## Ce que cette approche change pour les équipes

La démarche présentée ouvre plusieurs perspectives pour les équipes SCIAM.

D’abord, elle réduit la dépendance à des outils no-code parfois lourds à maintenir. Ensuite, elle rend les contenus plus structurés et plus facilement modifiables. Enfin, elle permet à des profils non techniques de contribuer, à condition d’être accompagnés et de respecter quelques principes.

L’IA devient ici un accélérateur, mais pas un substitut au jugement humain. Elle peut extraire, reformuler, structurer, proposer et modifier. En revanche, les équipes doivent continuer à valider le fond, la pertinence commerciale, le ton, la cohérence avec l’image de SCIAM et les règles de gouvernance.

Cette méthode est également transférable à d’autres usages :

* créer ou mettre à jour des pages d’offres ;
* enrichir des pages d’expertises ;
* transformer des slides en contenus web ;
* nettoyer une base de contenus ;
* identifier des incohérences ;
* documenter un processus ;
* produire des composants ou modèles réutilisables.



## Points de vigilance

Même si la démarche est prometteuse, plusieurs points doivent être cadrés.

### Qualité des contenus

Les textes issus d’anciens supports doivent être relus et adaptés au web. Un contenu de slide n’est pas toujours directement utilisable comme contenu de page.

### Cohérence éditoriale

Les offres et expertises doivent suivre une structure homogène : même niveau de détail, même style d’accroche, même logique de tags et de description.

### Données sensibles et RGPD

Les informations liées aux collaborateurs doivent être vérifiées. Les profils d’anciens collaborateurs doivent être supprimés, archivés ou masqués selon les règles applicables.

### Gestion des droits

Tout le monde ne doit pas nécessairement pouvoir publier directement en production. Il faut distinguer contribution, relecture, validation et publication.

### Maîtrise des prompts

L’IA est efficace si elle est bien guidée. Les équipes auront besoin d’exemples de prompts, de modèles de demandes et d’une documentation simple.



## Prochaines étapes proposées

Pour rendre cette approche pleinement opérationnelle, plusieurs actions peuvent être envisagées.

### Finaliser la structure des pages offres et expertises

Il faut s’aligner sur les informations à afficher : niveau de détail, longueur des textes, place des tags, présence ou non de contenus approfondis, logique des pages détaillées.

### Produire une documentation simple pour les contributeurs

Cette documentation devrait expliquer :

* où se trouvent les contenus ;
* comment demander une modification à l’IA ;
* comment ajouter une offre ;
* comment transformer un PowerPoint en contenu exploitable ;
* quelles vérifications effectuer avant validation.

### Mettre en place un environnement de prévisualisation

Avant toute publication, les modifications devraient être visibles dans une version de test. Cela permettrait de relire les contenus et de vérifier le rendu visuel.

### Définir une gouvernance de publication

Il faut identifier les personnes autorisées à valider et publier les changements sur le site officiel.

### Former les équipes aux usages IA utiles

Une session dédiée pourrait clarifier les différences entre agents, skills, MCP et assistants IA, afin que chacun comprenne les possibilités et les limites de ces outils.



## Conclusion

La refonte du site SCIAM illustre une nouvelle manière de travailler avec l’IA. L’objectif n’est pas de remplacer les compétences humaines, mais de réduire les tâches répétitives, d’accélérer la production et de rendre les modifications plus accessibles.

En combinant données structurées, code maintenable, IA générative et gouvernance claire, SCIAM peut disposer d’un site plus agile, plus simple à mettre à jour et mieux aligné avec ses offres.

La prochaine étape consiste à sécuriser le processus : clarifier les contenus attendus, documenter les manipulations, mettre en place une prévisualisation et définir les règles de validation. Une fois ce cadre posé, les équipes pourront contribuer plus facilement à l’évolution du site, tout en conservant un haut niveau de qualité et de cohérence.
