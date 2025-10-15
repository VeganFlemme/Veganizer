# Veganizer - Documentation complète pour Claude AI

## 🎯 Objectif de l'application
Application web full-stack TypeScript qui convertit des recettes traditionnelles françaises en alternatives véganes avec :
- Analyse nutritionnelle comparative
- Calculs d'impact climatique (AGRIBALYSE)
- Suivi des animaux sauvés
- Génération automatique de listes de courses
- Planification de menus hebdomadaires

## 🏗️ Architecture Technique

### Stack Principal
- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Base de données**: PostgreSQL (Neon) + Drizzle ORM
- **UI**: Shadcn/ui + Tailwind CSS + Radix UI
- **État serveur**: TanStack Query v5
- **Routing**: Wouter
- **Animation**: Framer Motion
- **Graphiques**: Chart.js + Recharts

### Structure des Dossiers
```
/client                 # Frontend React
  /src
    /components         # Composants UI réutilisables
    /pages              # Pages de l'application
    /lib                # Utilitaires frontend
    /hooks              # React hooks personnalisés
/server                 # Backend Express
  /services             # Logique métier
  /routes.ts            # Routes API
  /storage.ts           # Interface base de données
  /index.ts             # Point d'entrée serveur
/shared                 # Code partagé
  /schema.ts            # Schéma Drizzle + types Zod
/attached_assets        # Assets statiques (logos, etc.)
```

## 📊 Schéma de Base de Données

### Tables Principales

**recipes** (450+ recettes françaises)
- Nom de recette originale et version végane
- 6 ingrédients maximum (original + végan)
- Flags indiquant si ingrédient déjà végan
- Métadonnées: temps cuisson, portions, difficulté

**ciqual_data** (3,186 items - base Ciqual 2020)
- Données nutritionnelles françaises officielles
- Énergie, protéines, glucides, lipides, fibres
- Micronutriments: calcium, fer, zinc, B12, vitamine D

**climate_impact_data** (base AGRIBALYSE)
- Émissions CO2 par kg
- Consommation eau (litres/kg)
- Usage des terres (m²/kg)
- Consommation énergétique (MJ/kg)

**animal_impact** (calculs animaux sauvés)
- Type de produit animal (beef, chicken, pork, fish, etc.)
- Nombre d'animaux par kg de produit
- Durée de vie naturelle vs réelle
- Sources de données

**ingredient_substitutions** (substitutions véganes)
- Ingrédient original → substitut végan
- Ratio de substitution
- Catégories (viande, poisson, produits laitiers, œufs)

**supplements** (suppléments nutritionnels affiliés)
- Informations nutritionnelles et environnementales
- Liens Amazon affiliés
- Seuils de déficience pour recommandations

**favorites** (recettes favorites utilisateur)
- Stockage JSON complet de la conversion
- Lié aux utilisateurs authentifiés

**menus** + **menu_items** (planification repas)
- Menus hebdomadaires avec jours de la semaine
- Calculs nutritionnels et climatiques cumulés

**users** (via Replit Auth)
- Email, prénom, nom
- Image de profil

## 🔑 Fonctionnalités Clés

### 1. Conversion de Recettes
**Endpoint**: POST /api/recipes/convert
**Logique**: `server/services/veganizer.ts`

Processus :
1. Recherche recette dans base de données (matching normalisé sans accents)
2. Extraction ingrédients originaux et végans
3. Recherche substitutions pour ingrédients non-végans
4. Calcul nutritionnel (comparaison Original vs Végan)
5. Calcul impact climatique (avec suppléments)
6. Calcul animaux sauvés (logique soustractive)
7. Génération liste de courses avec liens affiliés

### 2. Analyse Nutritionnelle
**Service**: `server/services/nutritionCalculator.ts`

Algorithme de recherche Ciqual (3 niveaux):
1. **Correspondance exacte** : Nom exact dans base
2. **Starts-with** : Nom commence par ingrédient recherché
3. **Recherche large** : Contient mot-clé MAIS exclut plats composés

Fonction de nettoyage avancée:
- Suppression emojis et caractères spéciaux
- Retrait descripteurs ("frais", "séché", "entier", etc.)
- Normalisation accents avec fonction unaccent PostgreSQL

Recommandations de suppléments:
- Basé sur différence nutritionnelle Original vs Végan
- Priorité: critique, recommandé, optionnel
- Affichage avec liens Amazon affiliés

### 3. Impact Climatique
**Service**: `server/services/climateImpact.ts`

Calculs:
- CO2: Émissions totales (kg CO2e)
- Eau: Consommation (litres)
- Terres: Usage (m²)
- Inclusion des suppléments dans calculs végan

Affichage pourcentages de réduction:
```
co2Reduction = ((original - vegan) / original) * 100
```

### 4. Animaux Sauvés
**Service**: `server/services/animalImpact.ts`

**BUG ACTUEL**: Card ne s'affiche pas pour utilisateurs non connectés

Logique:
- Analyse uniquement ingrédients ORIGINAUX omnivores
- Mapping ingrédient → type animal (beef, chicken, pork, fish, dairy, eggs)
- Calcul: `animalsKilled = quantity_kg * animals_per_kg`
- Années de vie sauvées: `(lifespan_natural - lifespan_actual) / 365 * animalsKilled`

Breakdown par espèce:
- Vaches (beef + dairy)
- Cochons
- Poulets
- Poissons
- Vaches laitières
- Poules pondeuses

### 5. Liste de Courses
**Service**: `server/services/shoppingList.ts`

Catégories automatiques:
- Protéines végétales
- Légumes
- Fruits
- Féculents & Céréales
- Épices & Aromates
- Condiments & Sauces

Liens affiliés:
- Amazon pour ingrédients récurrents
- Stockés dans table `recurring_ingredients_links`

### 6. Planification de Menus
**Page**: `/plan-alimentaire`
**Composants**: 
- `MenuPlanner.tsx` : Calendrier hebdomadaire
- `NutritionDashboard.tsx` : Analyses cumulées

Fonctionnalités:
- Drag & drop de recettes favorites
- Auto-provisionnement menu vide (6 recettes aléatoires)
- Calculs nutritionnels et climatiques cumulés
- Totaux animaux sauvés

## 🐛 Bugs Connus

### 1. Card "Animaux Sauvés" ne s'affiche pas (utilisateurs non connectés)
**Symptômes**: 
- Service appelé dans `veganizer.ts:76`
- Aucun log produit = échec silencieux
- Frontend reçoit probablement `animalSavings = null` ou `{totalAnimals: 0}`

**Hypothèses**:
- Fonction `mapIngredientToAnimalProduct()` ne trouve pas de correspondance
- Données manquantes dans table `animal_impact`
- Logique de matching trop stricte

**Debug ajouté**: Logs console détaillés dans `calculateAnimalsSaved()`

**Fichiers concernés**:
- `server/services/animalImpact.ts`
- `server/services/veganizer.ts`
- `client/src/components/AnimalSavings.tsx`
- `client/src/pages/home.tsx` (affichage conditionnel)

### 2. Correspondance "ail"/"volaille" corrigée
**Problème précédent**: "ail" matchait "volaille" via substring bidirectionnel
**Solution**: Matching unidirectionnel (ingrédient commence par terme recherché)

## 🎨 Interface Utilisateur

### Composants Principaux

**Header** (`Header.tsx`)
- Logo Veganizer + titre
- Menu de navigation (sections de page)
- Avatar utilisateur + dropdown (favoris, plan alimentaire, déconnexion)

**SearchSection** (`SearchSection.tsx`)
- Autocomplétion recettes avec API `/api/suggestions`
- Débouncing 300ms
- Conversion au clic/Enter

**RecipeComparison** (`RecipeComparison.tsx`)
- Vue côte à côte Original vs Végan
- Badges de substitution (🔄 Remplacé, ✓ Déjà végan)
- Bouton favoris (nécessite connexion)

**NutritionAnalysis** (`NutritionAnalysis.tsx`)
- Graphique radar Chart.js
- Comparaison 6 métriques (Protéines, Fibres, Calcium, Fer, Zinc, Calories)
- Section suppléments avec cartes produits + liens Amazon

**ClimateImpact** (`ClimateImpact.tsx`)
- Cartes d'impact (CO2, Eau, Terres)
- Affichage pourcentages de réduction
- Icônes Lucide React

**AnimalSavings** (`AnimalSavings.tsx`)
- Nombre total d'animaux sauvés
- Cartes par espèce avec icônes
- Années de vie sauvées

**ShoppingList** (`ShoppingList.tsx`)
- Liste catégorisée
- Liens affiliés Amazon
- Bouton copier dans presse-papiers

### Pages

**Landing** (`/` - non connecté)
- Présentation Veganizer
- Accès immédiat à conversion
- Bouton "Se connecter" (Replit Auth)

**Home** (`/` - connecté)
- Idem landing avec header personnalisé
- Section "Mon Plan Alimentaire" en bas
- Affichage recettes favorites (6 max)

**PlanAlimentaire** (`/plan-alimentaire`)
- Calendrier hebdomadaire (Lundi → Dimanche)
- NutritionDashboard avec métriques cumulées
- Gestion repas (ajouter/supprimer)

**Admin** (`/admin`)
- Gestion utilisateurs
- Gestion recettes (CRUD)
- Gestion substitutions
- Import CSV

## 🔐 Authentification

**Intégration**: Replit Auth (Google, Apple, Email)
**Blueprint**: `javascript_log_in_with_replit`

**Endpoints**:
- `GET /api/auth/user` : Session utilisateur actuelle
- `GET /api/login` : Redirection Replit Auth
- `POST /api/logout` : Déconnexion

**Session Management**:
- Express-session avec PostgreSQL store
- Durée: 30 jours
- Cookie sécurisé

## 📱 PWA & Mobile

**Manifest** (`public/manifest.json`)
- Icônes 192x192 et 512x512
- Couleur thème: vert (#22c55e)
- Installation standalone

**Meta Tags**:
- Viewport responsive
- Theme color
- Apple touch icons

**Responsive Design**:
- Mobile-first avec Tailwind breakpoints
- Navigation optimisée tactile
- Graphiques adaptés écrans petits

## 🌍 Internationalisation

**Langue**: Français exclusivement
**Données**: 
- Recettes françaises traditionnelles
- Base Ciqual 2020 (ANSES France)
- Base AGRIBALYSE (ADEME France)

**Normalisation texte**:
- Fonction PostgreSQL `unaccent` pour matching sans accents
- Index GIN pour recherche full-text

## 🔗 Affiliations & Monétisation

**Amazon Associates**:
- Liens suppléments (`supplements.amazon_link`)
- Liens ingrédients (`recurring_ingredients_links.amazon_link`)
- Tous les liens contiennent tag affilié

**Exemple liens**:
- Vitamine B12: `https://amzn.to/3QYn7uM`
- Oméga 3: `https://amzn.to/41SK2Ow`

## 🚀 Déploiement

**Environnement**: Replit
**Workflow**: "Start application" 
**Port**: 5000 (frontend + backend sur même port)
**Database**: PostgreSQL Neon (via DATABASE_URL)

**Variables d'environnement**:
- `DATABASE_URL`: Connection string Neon
- `SESSION_SECRET`: Sécurité sessions
- `NODE_ENV`: development/production

## 📦 Dépendances Importantes

### Backend
- `express` : Serveur web
- `drizzle-orm` : ORM TypeScript
- `@neondatabase/serverless` : Client PostgreSQL
- `csv-parser` : Import données CSV
- `passport` : Authentification

### Frontend
- `react` + `react-dom` : UI
- `@tanstack/react-query` : State management
- `wouter` : Routing
- `chart.js` + `recharts` : Graphiques
- `framer-motion` : Animations
- `lucide-react` : Icônes

### UI Components
- `@radix-ui/*` : Primitives accessibles
- `tailwindcss` : Styling
- `class-variance-authority` : Variants composants

## 🎯 Prochaines Améliorations Suggérées

1. **Corriger bug Card "Animaux Sauvés"**
   - Debug fonction `mapIngredientToAnimalProduct()`
   - Vérifier données table `animal_impact`
   - Améliorer matching ingrédients → types animaux

2. **Optimisations Performance**
   - Mise en cache recettes fréquentes
   - Lazy loading images/composants
   - Compression assets

3. **Fonctionnalités Utilisateur**
   - Partage recettes converties (liens)
   - Impression listes de courses
   - Export PDF menus hebdomadaires
   - Statistiques personnelles (animaux sauvés total, CO2 économisé)

4. **Amélioration Données**
   - Plus de recettes (objectif: 1000+)
   - Catégories recettes (entrées, plats, desserts)
   - Photos recettes
   - Instructions de préparation

5. **SEO & Marketing**
   - Blog intégré (recettes, nutrition)
   - Partage social avec Open Graph
   - Newsletter (emails)
   - Témoignages utilisateurs

6. **Monétisation**
   - Plus de liens affiliés
   - Partenariats boutiques bio
   - Premium features (plans personnalisés, coaching)

## 📝 Notes pour Claude AI

### Conventions de Code
- **TypeScript strict** partout
- **Types partagés** dans `shared/schema.ts`
- **Zod validation** pour tous les inputs API
- **TanStack Query** pour toutes requêtes (pas de fetch direct)
- **Shadcn/ui** pour tous composants UI (éviter CSS custom)
- **data-testid** sur tous éléments interactifs

### Patterns à Respecter
- Backend = thin routes + fat services
- Frontend = composants fonctionnels + hooks
- Éviter duplication: réutiliser composants existants
- Mobile-first: toujours tester responsive

### Interdictions
- ❌ Modifier `vite.config.ts` ou `server/vite.ts`
- ❌ Modifier `package.json` manuellement (utiliser packager_tool)
- ❌ Modifier `drizzle.config.ts`
- ❌ Changer types ID colonnes (serial/varchar)
- ❌ Écrire migrations SQL manuelles (utiliser Drizzle push)

### Base de Données
- **Toujours** vérifier schéma existant avant modifications
- **Utiliser** Drizzle push pour sync forcé si nécessaire
- **Préserver** types ID existants (ne jamais changer serial ↔ varchar)
- **Normalisation** texte avec `unaccent` pour français

### Debugging
- Logs détaillés avec emoji pour visibilité
- Vérifier logs workflow régulièrement
- Tester avec recettes connues: "Poulet rôti", "Blanquette de veau"

---

**Version**: Octobre 2025
**Développé sur**: Replit
**Contact**: Via interface Veganizer
