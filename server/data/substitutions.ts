import { type InsertIngredientSubstitution } from "@shared/schema";

export const defaultSubstitutions: InsertIngredientSubstitution[] = [
  // Dairy substitutions
  {
    original_ingredient: "lait",
    vegan_substitute: "lait végétal (soja, avoine, amande)",
    substitution_ratio: 1.0,
    category: "produits_laitiers",
    notes: "Choisir selon le goût désiré"
  },
  {
    original_ingredient: "beurre",
    vegan_substitute: "beurre végétal",
    substitution_ratio: 1.0,
    category: "produits_laitiers",
    notes: "Margarine végétale ou huile selon l'usage"
  },
  {
    original_ingredient: "crème fraîche",
    vegan_substitute: "crème de soja",
    substitution_ratio: 1.0,
    category: "produits_laitiers",
    notes: "Ou crème de coco pour plus de richesse"
  },
  {
    original_ingredient: "fromage",
    vegan_substitute: "fromage végétal",
    substitution_ratio: 1.0,
    category: "produits_laitiers",
    notes: "Levure nutritionnelle pour le goût umami"
  },
  {
    original_ingredient: "yaourt",
    vegan_substitute: "yaourt végétal",
    substitution_ratio: 1.0,
    category: "produits_laitiers",
    notes: "Soja, coco ou amande selon préférence"
  },

  // Meat substitutions
  {
    original_ingredient: "viande",
    vegan_substitute: "haché végétal",
    substitution_ratio: 0.8,
    category: "viandes",
    notes: "Prêt à l'emploi, savoureux et riche en protéines"
  },
  {
    original_ingredient: "bœuf",
    vegan_substitute: "haché végétal ou seitan",
    substitution_ratio: 0.8,
    category: "viandes",
    notes: "Haché végétal pour la facilité, seitan pour plus de texture"
  },
  {
    original_ingredient: "porc",
    vegan_substitute: "tempeh ou tofu fumé",
    substitution_ratio: 0.9,
    category: "viandes",
    notes: "Tempeh pour plus de saveur"
  },
  {
    original_ingredient: "veau",
    vegan_substitute: "haché végétal",
    substitution_ratio: 0.8,
    category: "viandes",
    notes: "Texture tendre et goût authentique"
  },
  {
    original_ingredient: "agneau",
    vegan_substitute: "seitan aux herbes",
    substitution_ratio: 0.8,
    category: "viandes",
    notes: "Ajouter romarin et thym"
  },
  {
    original_ingredient: "poulet",
    vegan_substitute: "tofu ou morceaux de soja",
    substitution_ratio: 0.9,
    category: "viandes",
    notes: "Mariner le tofu pour plus de goût"
  },

  // Egg substitutions
  {
    original_ingredient: "œuf",
    vegan_substitute: "substitut d'œuf ou aquafaba",
    substitution_ratio: 1.0,
    category: "œufs",
    notes: "3 c.à.s d'aquafaba = 1 œuf"
  },
  {
    original_ingredient: "œufs",
    vegan_substitute: "fécule de maïs + eau",
    substitution_ratio: 1.0,
    category: "œufs",
    notes: "Pour lier les sauces: 1 c.à.s de fécule + 2 c.à.s d'eau = 1 œuf"
  },

  // Fish substitutions
  {
    original_ingredient: "poisson",
    vegan_substitute: "tofu aux algues",
    substitution_ratio: 1.0,
    category: "poissons",
    notes: "Algues nori pour le goût iodé"
  },
  {
    original_ingredient: "saumon",
    vegan_substitute: "carotte fumée ou tofu mariné",
    substitution_ratio: 1.0,
    category: "poissons",
    notes: "Carotte pour la couleur, fumage liquide pour le goût"
  },

  // Other common substitutions
  {
    original_ingredient: "miel",
    vegan_substitute: "sirop d'agave ou sirop d'érable",
    substitution_ratio: 0.8,
    category: "édulcorants",
    notes: "Réduire les autres liquides si nécessaire"
  },
  {
    original_ingredient: "gélatine",
    vegan_substitute: "agar-agar",
    substitution_ratio: 0.5,
    category: "gélifiants",
    notes: "Plus puissant que la gélatine"
  },
];
