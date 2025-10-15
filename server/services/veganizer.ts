import { storage } from "../storage";
import { climateImpactService } from "./climateImpact";
import { animalImpactService } from "./animalImpact";
import { type RecipeConversionResponse } from "@shared/schema";
import { defaultSubstitutions } from "../data/substitutions";

export class VeganizerService {
  
  constructor() {
    // Initialize default substitutions if none exist
    this.initializeSubstitutions();
  }

  private async initializeSubstitutions(): Promise<void> {
    const existingSubstitutions = await storage.getAllSubstitutions();
    if (existingSubstitutions.length === 0) {
      console.log('Initializing default substitutions...');
      for (const substitution of defaultSubstitutions) {
        await storage.createSubstitution(substitution);
      }
      console.log('Default substitutions initialized');
    }
  }

  async convertRecipe(recipeName: string): Promise<RecipeConversionResponse> {
    console.log(`Converting recipe: ${recipeName}`);
    
    // Try to find exact match first
    let recipe = await storage.getRecipeByName(recipeName);
    
    if (!recipe) {
      // Try approximate search
      const searchResults = await storage.searchRecipes(recipeName);
      recipe = searchResults[0]; // Take first result
    }

    if (recipe) {
      return this.convertExistingRecipe(recipe);
    } else {
      return this.generateDynamicConversion(recipeName);
    }
  }

  private async convertExistingRecipe(recipe: any): Promise<RecipeConversionResponse> {
    const originalIngredients = [
      recipe.ingredient_1,
      recipe.ingredient_2,
      recipe.ingredient_3,
      recipe.ingredient_4,
      recipe.ingredient_5,
      recipe.ingredient_6,
    ].filter(Boolean);

    const veganIngredients = [
      recipe.ingredient_vegan_1,
      recipe.ingredient_vegan_2,
      recipe.ingredient_vegan_3,
      recipe.ingredient_vegan_4,
      recipe.ingredient_vegan_5,
      recipe.ingredient_vegan_6,
    ].filter(Boolean);

    const isVeganFlags = [
      recipe.ingredient_1_vegan,
      recipe.ingredient_2_vegan,
      recipe.ingredient_3_vegan,
      recipe.ingredient_4_vegan,
      recipe.ingredient_5_vegan,
      recipe.ingredient_6_vegan,
    ].slice(0, originalIngredients.length);

    const substitutedIngredients = await this.createSubstitutedIngredients(originalIngredients, veganIngredients, isVeganFlags);
    
    const nutritionComparison = await this.calculateNutritionComparison(originalIngredients, substitutedIngredients.map(i => i.name));
    const climateComparison = await climateImpactService.compareClimateImpact(originalIngredients, substitutedIngredients.map(i => i.name), nutritionComparison.supplements || []);
    const animalSavings = await animalImpactService.calculateAnimalsSaved(originalIngredients, substitutedIngredients.map(i => i.name));
    const shoppingList = await this.generateShoppingList(substitutedIngredients.map(i => i.name));

    return {
      originalRecipe: {
        name: recipe.nom_recette,
        ingredients: originalIngredients,
        cookingTime: recipe.cookingTime || "2h",
        servings: recipe.servings || 6,
        difficulty: recipe.difficulty || "Moyen",
      },
      veganRecipe: {
        name: recipe.nom_recette_vegan_equivalente || `${recipe.nom_recette} (Version Végane)`,
        ingredients: substitutedIngredients,
        cookingTime: recipe.cookingTime || "1h45",
        servings: recipe.servings || 6,
        difficulty: "Facile",
      },
      nutritionComparison: {
        ...nutritionComparison,
        supplements: nutritionComparison.supplements?.map(this.transformSupplementForApi),
      },
      climateComparison,
      animalSavings,
      shoppingList,
      substitutionCount: substitutedIngredients.filter(i => i.isSubstituted).length,
    };
  }

  private async generateDynamicConversion(recipeName: string): Promise<RecipeConversionResponse> {
    // Generate a basic conversion for unknown recipes
    const baseIngredients = [
      "viande principale",
      "légumes variés", 
      "base sauce",
      "aromates",
      "féculents"
    ];

    const substitutedIngredients = await this.createSubstitutedIngredients(baseIngredients, []);
    const nutritionComparison = await this.calculateNutritionComparison(baseIngredients, substitutedIngredients.map(i => i.name));
    const climateComparison = await climateImpactService.compareClimateImpact(baseIngredients, substitutedIngredients.map(i => i.name), nutritionComparison.supplements || []);
    const animalSavings = await animalImpactService.calculateAnimalsSaved(baseIngredients, substitutedIngredients.map(i => i.name));
    const shoppingList = await this.generateShoppingList(substitutedIngredients.map(i => i.name));

    return {
      originalRecipe: {
        name: recipeName,
        ingredients: baseIngredients,
        cookingTime: "2h",
        servings: 4,
        difficulty: "Moyen",
      },
      veganRecipe: {
        name: `${recipeName} (Version Végane)`,
        ingredients: substitutedIngredients,
        cookingTime: "1h45",
        servings: 4,
        difficulty: "Facile",
      },
      nutritionComparison: {
        ...nutritionComparison,
        supplements: nutritionComparison.supplements?.map(this.transformSupplementForApi),
      },
      climateComparison,
      animalSavings,
      shoppingList,
      substitutionCount: substitutedIngredients.filter(i => i.isSubstituted).length,
    };
  }

  private async createSubstitutedIngredients(originalIngredients: string[], veganIngredients: string[] = [], isVeganFlags: any[] = []) {
    const result = [];
    
    for (let i = 0; i < originalIngredients.length; i++) {
      const original = originalIngredients[i];
      const predefinedVegan = veganIngredients[i];
      const isAlreadyVegan = isVeganFlags[i] === true || isVeganFlags[i] === 't';
      
      if (predefinedVegan) {
        result.push({
          name: predefinedVegan,
          substitution: isAlreadyVegan ? undefined : `remplace ${original}`,
          isSubstituted: !isAlreadyVegan,
        });
      } else {
        // Try to find substitution
        const substitution = await this.findSubstitution(original);
        if (substitution) {
          result.push({
            name: substitution.vegan_substitute,
            substitution: `remplace ${original}`,
            isSubstituted: true,
          });
        } else {
          // Keep original if no substitution found (assuming it's vegan)
          result.push({
            name: original,
            isSubstituted: false,
          });
        }
      }
    }
    
    return result;
  }

  private async findSubstitution(ingredient: string) {
    const normalizedIngredient = this.normalizeIngredient(ingredient);
    
    // Try exact match first
    let substitution = await storage.getSubstitution(normalizedIngredient);
    
    if (!substitution) {
      // Try partial matches
      const allSubstitutions = await storage.getAllSubstitutions();
      substitution = allSubstitutions.find(sub => 
        normalizedIngredient.includes(this.normalizeIngredient(sub.original_ingredient)) ||
        this.normalizeIngredient(sub.original_ingredient).includes(normalizedIngredient)
      );
    }
    
    return substitution;
  }

  private normalizeIngredient(ingredient: string): string {
    return ingredient.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[0-9]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim();
  }

  /**
   * Clean ingredient name for better Ciqual database matching
   * Removes emojis, affiliate references, and extra descriptors
   */
  private cleanIngredientForCiqualSearch(ingredient: string): string {
    let cleaned = ingredient;
    
    // Remove specific emoji and special characters
    cleaned = cleaned.replace(/[\uD800-\uDFFF]/g, ''); // Surrogate pairs (emoji)
    cleaned = cleaned.replace(/[^\x00-\x7F]/g, (char) => {
      // Keep accented Latin characters (À-ÿ), remove others
      const code = char.charCodeAt(0);
      return (code >= 0x00C0 && code <= 0x024F) ? char : '';
    });
    
    // Remove affiliate references
    cleaned = cleaned.replace(/Amazon/gi, '');
    cleaned = cleaned.replace(/Voir sur/gi, '');
    
    // Remove common descriptors that might not be in Ciqual
    cleaned = cleaned.replace(/\bentier\b/gi, ''); // "entier" -> just "seitan"
    cleaned = cleaned.replace(/\bfrais\b/gi, '');
    cleaned = cleaned.replace(/\bbiologique?\b/gi, '');
    cleaned = cleaned.replace(/\bbio\b/gi, '');
    
    // Clean up whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }

  private async calculateNutritionComparison(originalIngredients: string[], veganIngredients: string[]) {
    const originalNutrition = await this.calculateIngredientNutrition(originalIngredients);
    const baseVeganNutrition = await this.calculateIngredientNutrition(veganIngredients);
    
    // Get recommended supplements based on vegan nutrition deficiencies
    const recommendedSupplements = await storage.getSupplementsForDeficiencies({
      iron: baseVeganNutrition.iron,
      zinc: baseVeganNutrition.zinc,
      calcium: baseVeganNutrition.calcium,
      proteins: baseVeganNutrition.proteins,
    });
    
    // Calculate supplement contributions
    const supplementNutrition = this.calculateSupplementNutrition(recommendedSupplements);
    
    // Add supplements to vegan nutrition totals
    const veganNutrition = {
      calories: baseVeganNutrition.calories + supplementNutrition.calories,
      proteins: baseVeganNutrition.proteins + supplementNutrition.proteins,
      carbs: baseVeganNutrition.carbs + supplementNutrition.carbs,
      fats: baseVeganNutrition.fats + supplementNutrition.fats,
      fiber: baseVeganNutrition.fiber + supplementNutrition.fiber,
      calcium: baseVeganNutrition.calcium + supplementNutrition.calcium,
      iron: baseVeganNutrition.iron + supplementNutrition.iron,
      zinc: baseVeganNutrition.zinc + supplementNutrition.zinc,
    };

    return {
      original: originalNutrition,
      vegan: veganNutrition,
      supplements: recommendedSupplements,
      supplementContribution: supplementNutrition,
    };
  }

  private async calculateIngredientNutrition(ingredients: string[]) {
    let totalCalories = 0;
    let totalProteins = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalFiber = 0;
    let totalCalcium = 0;
    let totalIron = 0;
    let totalZinc = 0;

    for (const ingredient of ingredients) {
      // Clean ingredient name to improve Ciqual matching
      const cleanedIngredient = this.cleanIngredientForCiqualSearch(ingredient);
      
      const ciqualData = await storage.getCiqualData(cleanedIngredient);
      if (ciqualData) {
        // Calculate per 100g portion
        const portion = 100; // Base calculation on 100g
        totalCalories += (ciqualData.energie_kcal || 0) * (portion / 100);
        totalProteins += (ciqualData.proteines_g || 0) * (portion / 100);
        totalCarbs += (ciqualData.glucides_g || 0) * (portion / 100);
        totalFats += (ciqualData.lipides_g || 0) * (portion / 100);
        totalFiber += (ciqualData.fibres_g || 0) * (portion / 100);
        totalCalcium += (ciqualData.calcium_mg || 0) * (portion / 100);
        totalIron += (ciqualData.fer_mg || 0) * (portion / 100);
        totalZinc += (ciqualData.zinc_mg || 0) * (portion / 100);
      } else {
        // Default values if no Ciqual data found
        totalCalories += 150; // Default calories
        totalProteins += 8;
        totalCarbs += 15;
        totalFats += 5;
        totalFiber += 3;
        totalCalcium += 50;
        totalIron += 2;
        totalZinc += 1;
      }
    }

    return {
      calories: Math.round(totalCalories),
      proteins: Math.round(totalProteins),
      carbs: Math.round(totalCarbs),
      fats: Math.round(totalFats),
      fiber: Math.round(totalFiber),
      calcium: Math.round(totalCalcium),
      iron: Math.round(totalIron * 10) / 10, // One decimal place
      zinc: Math.round(totalZinc * 10) / 10,
    };
  }

  private calculateSupplementNutrition(supplements: any[]) {
    let totalCalories = 0;
    let totalProteins = 0;
    let totalCarbs = 0;
    let totalFats = 0;
    let totalFiber = 0;
    let totalCalcium = 0;
    let totalIron = 0;
    let totalZinc = 0;

    for (const supplement of supplements) {
      totalCalories += supplement.energie_kcal || 0;
      totalProteins += supplement.proteines_g || 0;
      totalCarbs += supplement.glucides_g || 0;
      totalFats += supplement.lipides_g || 0;
      totalFiber += supplement.fibres_g || 0;
      totalCalcium += supplement.calcium_mg || 0;
      totalIron += supplement.fer_mg || 0;
      totalZinc += supplement.zinc_mg || 0;
    }

    return {
      calories: Math.round(totalCalories),
      proteins: Math.round(totalProteins * 10) / 10,
      carbs: Math.round(totalCarbs * 10) / 10,
      fats: Math.round(totalFats * 10) / 10,
      fiber: Math.round(totalFiber * 10) / 10,
      calcium: Math.round(totalCalcium),
      iron: Math.round(totalIron * 10) / 10,
      zinc: Math.round(totalZinc * 10) / 10,
    };
  }

  private async generateShoppingList(veganIngredients: string[]) {
    const categorizedList = {
      fruitsVegetables: [] as string[],
      proteins: [] as string[],
      dryGoods: [] as string[],
      alternatives: [] as string[],
    };

    for (const ingredient of veganIngredients) {
      const normalized = ingredient.toLowerCase();
      
      if (this.isFruitOrVegetable(normalized)) {
        categorizedList.fruitsVegetables.push(ingredient);
      } else if (this.isProtein(normalized)) {
        categorizedList.proteins.push(ingredient);
      } else if (this.isAlternative(normalized)) {
        categorizedList.alternatives.push(ingredient);
      } else {
        categorizedList.dryGoods.push(ingredient);
      }
    }

    // Estimate costs (simplified)
    const estimatedCost = veganIngredients.length * 3.5; // Average 3.5€ per ingredient
    const savings = estimatedCost * 0.25; // 25% savings vs omnivore

    return {
      ...categorizedList,
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      savings: Math.round(savings * 100) / 100,
    };
  }

  private isFruitOrVegetable(ingredient: string): boolean {
    const vegetables = ['carotte', 'oignon', 'champignon', 'légume', 'tomate', 'courgette', 'pomme de terre'];
    return vegetables.some(veg => ingredient.includes(veg));
  }

  private isProtein(ingredient: string): boolean {
    const proteins = ['soja', 'tofu', 'seitan', 'tempeh', 'protéine', 'légumineuse', 'lentille', 'pois chiche'];
    return proteins.some(protein => ingredient.includes(protein));
  }

  private isAlternative(ingredient: string): boolean {
    const alternatives = ['lait végétal', 'crème', 'beurre végétal', 'fromage végétal', 'yaourt'];
    return alternatives.some(alt => ingredient.includes(alt));
  }

  async searchRecipes(query: string): Promise<Array<{name: string, description: string}>> {
    const recipes = await storage.searchRecipes(query);
    return recipes.map(recipe => ({
      name: recipe.nom_recette,
      description: `${recipe.cookingTime || 'Temps variable'} • ${recipe.servings || 4} personnes • ${recipe.difficulty || 'Difficulté moyenne'}`,
    }));
  }

  private transformSupplementForApi(supplement: any) {
    return {
      id: supplement.id,
      name: supplement.name,
      type: supplement.type,
      priority: supplement.priority,
      serving_size: supplement.serving_size,
      amazon_link: supplement.amazon_link,
      description: supplement.description || undefined,
      energie_kcal: supplement.energie_kcal ?? undefined,
      proteines_g: supplement.proteines_g ?? undefined,
      glucides_g: supplement.glucides_g ?? undefined,
      lipides_g: supplement.lipides_g ?? undefined,
      fibres_g: supplement.fibres_g ?? undefined,
      calcium_mg: supplement.calcium_mg ?? undefined,
      fer_mg: supplement.fer_mg ?? undefined,
      zinc_mg: supplement.zinc_mg ?? undefined,
      vitamine_b12_mcg: supplement.vitamine_b12_mcg ?? undefined,
      omega3_dha_mg: supplement.omega3_dha_mg ?? undefined,
      omega3_epa_mg: supplement.omega3_epa_mg ?? undefined,
      gwp_kgco2e_per_serving: supplement.gwp_kgco2e_per_serving ?? undefined,
      water_l_per_serving: supplement.water_l_per_serving ?? undefined,
      land_m2_per_serving: supplement.land_m2_per_serving ?? undefined,
      biodiversity_impact: supplement.biodiversity_impact ?? undefined,
    };
  }
}

export const veganizerService = new VeganizerService();
