import { storage } from '../storage';

export interface AnimalSavingsCalculation {
  totalAnimals: number;
  animalBreakdown: {
    cows: number;
    pigs: number;
    chickens: number;
    fish: number;
    dairy_cows: number;
    hens: number;
  };
  lifeYearsSaved: number;
  details: Array<{
    animalType: string;
    animalCount: number;
    productType: string;
    quantityKg: number;
    lifeYearsSaved: number;
  }>;
}

export class AnimalImpactService {

  /**
   * Calculate animals saved based on ingredient substitutions
   * LOGIC: We calculate based on ORIGINAL animal ingredients that were REPLACED
   * @param originalIngredients - List of original ingredients from omnivore recipe
   * @param veganIngredients - List of vegan substitute ingredients 
   * @param quantities - Optional quantities in kg (defaults to 0.1kg per ingredient)
   */
  async calculateAnimalsSaved(
    originalIngredients: string[], 
    veganIngredients: string[], 
    quantities?: number[]
  ): Promise<AnimalSavingsCalculation> {
    console.log('🐾 ANIMAL SAVINGS CALCULATION START');
    console.log('Original ingredients:', originalIngredients);
    
    // Always return a valid default structure
    const result: AnimalSavingsCalculation = {
      totalAnimals: 0,
      animalBreakdown: {
        cows: 0,
        pigs: 0,
        chickens: 0,
        fish: 0,
        dairy_cows: 0,
        hens: 0,
      },
      lifeYearsSaved: 0,
      details: [],
    };

    // Return early if no ingredients to process
    if (!originalIngredients || originalIngredients.length === 0) {
      console.log('❌ No original ingredients to analyze');
      return result;
    }

    // Only process ingredients from the ORIGINAL recipe that are animal-based
    for (let i = 0; i < originalIngredients.length; i++) {
      const ingredient = originalIngredients[i];
      const quantity = quantities?.[i] || 0.1; // Default 100g per ingredient

      // Map ingredient to animal product type (beef, chicken, pork, etc.)
      const animalProductType = this.mapIngredientToAnimalProduct(ingredient);
      console.log(`Checking "${ingredient}" -> animal type: ${animalProductType || 'none'}`);
      
      if (animalProductType) {
        const animalData = await storage.getAnimalImpactByProduct(animalProductType);
        console.log(`Animal data for ${animalProductType}:`, animalData ? 'FOUND' : 'NOT FOUND');
        
        if (animalData) {
          const animalsKilled = quantity * animalData.animals_per_kg;
          const lifeYearsSaved = this.calculateLifeYearsSaved(animalsKilled, animalData);

          // Update totals
          result.totalAnimals += animalsKilled;
          result.lifeYearsSaved += lifeYearsSaved;

          // Update breakdown by animal type
          this.updateAnimalBreakdown(result.animalBreakdown, animalData.animal_type, animalsKilled);

          // Add to details
          result.details.push({
            animalType: animalData.animal_type,
            animalCount: Math.round(animalsKilled * 100) / 100,
            productType: animalProductType,
            quantityKg: quantity,
            lifeYearsSaved: Math.round(lifeYearsSaved * 100) / 100,
          });
          
          console.log(`✓ ${ingredient}: ${animalsKilled.toFixed(2)} ${animalData.animal_type}(s) saved`);
        }
      }
    }

    // Round totals
    result.totalAnimals = Math.round(result.totalAnimals * 100) / 100;
    result.lifeYearsSaved = Math.round(result.lifeYearsSaved * 100) / 100;

    console.log('🐾 FINAL RESULT:', result.totalAnimals, 'animals saved');
    return result;
  }

  /**
   * Calculate animals saved for a complete menu over time period
   * @param menuItems - Array of menu items with their recipes
   * @param timeframeWeeks - Number of weeks to calculate for (default 1)
   */
  async calculateMenuAnimalsSaved(
    menuItems: Array<{ recipeName: string; servings?: number }>,
    timeframeWeeks: number = 1
  ): Promise<AnimalSavingsCalculation> {
    const aggregatedResult: AnimalSavingsCalculation = {
      totalAnimals: 0,
      animalBreakdown: {
        cows: 0,
        pigs: 0,
        chickens: 0,
        fish: 0,
        dairy_cows: 0,
        hens: 0,
      },
      lifeYearsSaved: 0,
      details: [],
    };

    for (const menuItem of menuItems) {
      // Get recipe data - this would be integrated with recipe conversion
      const recipe = await storage.getRecipeByName(menuItem.recipeName);
      if (recipe) {
        const servings = menuItem.servings || 1;
        const multiplier = servings * timeframeWeeks;

        // Simulate ingredient extraction - in real implementation this would 
        // get the substitution data from recipe conversion
        const originalIngredients = this.extractAnimalIngredients(recipe);
        const quantities = originalIngredients.map(() => 0.1 * multiplier); // 100g per ingredient per serving

        const recipeResult = await this.calculateAnimalsSaved(
          originalIngredients,
          [], // Vegan ingredients not needed for calculation
          quantities
        );

        // Aggregate results
        this.aggregateResults(aggregatedResult, recipeResult);
      }
    }

    return aggregatedResult;
  }

  /**
   * Map ingredient name to animal product type for lookup
   */
  private mapIngredientToAnimalProduct(ingredient: string): string | null {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    
    // French ingredient mappings
    const mappings: Record<string, string> = {
      // Beef products
      'bœuf': 'beef',
      'boeuf': 'beef', 
      'viande de bœuf': 'beef',
      'viande de boeuf': 'beef',
      'steaks': 'beef',
      'côte de bœuf': 'beef',
      'viande principale': 'beef', // Generic meat often beef
      'viande': 'beef',

      // Pork products  
      'porc': 'pork',
      'jambon': 'pork',
      'lardons': 'pork',
      'saucisse': 'pork',
      'chorizo': 'pork',

      // Chicken products
      'poulet': 'chicken',
      'volaille': 'chicken',
      'blanc de poulet': 'chicken',
      'escalope de poulet': 'chicken',
      'dinde': 'chicken', // Turkey also counts as poultry

      // Fish products
      'poisson': 'fish',
      'saumon': 'fish',
      'thon': 'fish',
      'cabillaud': 'fish',
      'sole': 'fish',

      // Dairy products
      'lait': 'dairy',
      'crème': 'dairy',
      'crème fraîche': 'dairy',
      'fromage': 'dairy',
      'beurre': 'dairy',
      'yaourt': 'dairy',

      // Egg products
      'œufs': 'eggs',
      'oeufs': 'eggs',
      'œuf': 'eggs',
      'oeuf': 'eggs',
    };

    // Check direct mappings first
    if (mappings[normalizedIngredient]) {
      return mappings[normalizedIngredient];
    }

    // Check partial matches - ONLY if the ingredient contains the animal keyword
    // NOT the reverse (to avoid "ail" matching "volaille")
    for (const [key, value] of Object.entries(mappings)) {
      if (normalizedIngredient.includes(key)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Extract animal-based ingredients from a recipe
   */
  private extractAnimalIngredients(recipe: any): string[] {
    const ingredients = [
      recipe.ingredient_1,
      recipe.ingredient_2, 
      recipe.ingredient_3,
      recipe.ingredient_4,
      recipe.ingredient_5,
      recipe.ingredient_6
    ].filter(Boolean);

    return ingredients.filter(ingredient => 
      this.mapIngredientToAnimalProduct(ingredient) !== null
    );
  }

  /**
   * Calculate life years saved based on animals killed and their natural vs actual lifespan
   */
  private calculateLifeYearsSaved(animalsKilled: number, animalData: any): number {
    if (!animalData.lifespan_days || !animalData.actual_age_at_death_days) {
      return 0;
    }

    const naturalLifespanYears = animalData.lifespan_days / 365;
    const actualLifespanYears = animalData.actual_age_at_death_days / 365;
    const yearsLostPerAnimal = naturalLifespanYears - actualLifespanYears;

    return animalsKilled * yearsLostPerAnimal;
  }

  /**
   * Update the animal breakdown counters
   */
  private updateAnimalBreakdown(breakdown: any, animalType: string, count: number): void {
    switch (animalType) {
      case 'cow':
        breakdown.cows += count;
        break;
      case 'pig':  
        breakdown.pigs += count;
        break;
      case 'chicken':
        breakdown.chickens += count;
        break;
      case 'fish':
        breakdown.fish += count;
        break;
      case 'cow_dairy':
        breakdown.dairy_cows += count;
        break;
      case 'hen':
        breakdown.hens += count;
        break;
    }
  }

  /**
   * Aggregate multiple calculation results
   */
  private aggregateResults(target: AnimalSavingsCalculation, source: AnimalSavingsCalculation): void {
    target.totalAnimals += source.totalAnimals;
    target.lifeYearsSaved += source.lifeYearsSaved;

    // Aggregate breakdown
    Object.keys(target.animalBreakdown).forEach(key => {
      (target.animalBreakdown as any)[key] += (source.animalBreakdown as any)[key];
    });

    // Merge details
    target.details.push(...source.details);
  }
}

export const animalImpactService = new AnimalImpactService();