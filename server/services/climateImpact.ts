import { storage } from "../storage";

interface ClimateImpact {
  co2_kg: number;
  water_l: number;
  land_m2: number;
  biodiversity_score: number;
}

interface ClimateComparison {
  original: ClimateImpact;
  vegan: ClimateImpact;
  reduction: {
    co2_percent: number;
    water_percent: number;
    land_percent: number;
    biodiversity_percent: number;
  };
}

export class ClimateImpactService {
  private ingredientMappings = new Map([
    // Animal proteins -> Vegan proteins
    ['poulet', 'chicken'],
    ['boeuf', 'beef'],
    ['porc', 'pork'],
    ['veau', 'beef'],
    ['agneau', 'beef'],
    ['poisson', 'fish'],
    ['seitan', 'seitan'],
    ['tofu', 'tofu'],
    ['tempeh', 'tempeh'],
    
    // Dairy products
    ['lait', 'milk'],
    ['fromage', 'cheese'],
    ['beurre', 'milk'],
    ['crème', 'milk'],
    
    // Eggs
    ['oeuf', 'eggs'],
    ['oeufs', 'eggs'],
    
    // Plant-based
    ['lentilles', 'lentils'],
    ['haricots', 'lentils'],
    ['pois chiches', 'chickpeas'],
    ['légumes', 'vegetables'],
    ['légume', 'vegetables'],
    ['céréales', 'grains'],
    ['riz', 'grains'],
    ['blé', 'grains'],
    ['avoine', 'grains'],
    ['noix', 'nuts'],
    ['amandes', 'nuts'],
  ]);

  private veganSubstituteMappings = new Map([
    // Common substitutions
    ['chicken', 'seitan'],
    ['beef', 'seitan'],
    ['pork', 'tempeh'],
    ['fish', 'tofu'],
    ['milk', 'vegetables'], // Plant milk has similar impact to vegetables
    ['cheese', 'tofu'], // Vegan cheese made from soy
    ['eggs', 'tofu'], // Tofu often replaces eggs
  ]);

  async calculateClimateImpact(ingredients: string[]): Promise<ClimateImpact> {
    let totalCo2 = 0;
    let totalWater = 0;
    let totalLand = 0;
    let totalBiodiversity = 0;
    let ingredientCount = 0;

    for (const ingredient of ingredients) {
      const climateData = await this.getClimateDataForIngredient(ingredient);
      if (climateData) {
        // Assume 100g portion per ingredient for calculation
        const portionKg = 0.1; // 100g = 0.1kg
        totalCo2 += (climateData.gwp_kgco2e_per_kg || 0) * portionKg;
        totalWater += (climateData.water_l_per_kg || 0) * portionKg;
        totalLand += (climateData.land_m2_per_kg || 0) * portionKg;
        totalBiodiversity += climateData.biodiversity_impact || 0;
        ingredientCount++;
      }
    }

    return {
      co2_kg: Math.round(totalCo2 * 100) / 100, // Round to 2 decimal places
      water_l: Math.round(totalWater),
      land_m2: Math.round(totalLand * 100) / 100,
      biodiversity_score: ingredientCount > 0 ? Math.round((totalBiodiversity / ingredientCount) * 100) / 100 : 0,
    };
  }


  private async getClimateDataForIngredient(ingredient: string) {
    // Normalize ingredient name
    const normalizedIngredient = ingredient.toLowerCase().trim();
    
    // Try to find direct mapping
    let climateProductName = this.ingredientMappings.get(normalizedIngredient);
    
    // If no direct mapping, try partial matching
    if (!climateProductName) {
      const entries = Array.from(this.ingredientMappings.entries());
      for (const [key, value] of entries) {
        if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
          climateProductName = value;
          break;
        }
      }
    }

    // Fallback to default vegetable impact if nothing found
    if (!climateProductName) {
      climateProductName = 'vegetables';
    }

    // Get climate data from database
    try {
      const climateData = await storage.getClimateImpactData(climateProductName);
      return climateData;
    } catch (error) {
      console.warn(`Could not find climate data for: ${climateProductName}`);
      return null;
    }
  }

  async getVeganAlternativeImpact(originalIngredient: string): Promise<ClimateImpact | null> {
    const normalizedIngredient = originalIngredient.toLowerCase().trim();
    const climateProductName = this.ingredientMappings.get(normalizedIngredient);
    
    if (climateProductName && this.veganSubstituteMappings.has(climateProductName)) {
      const veganAlternative = this.veganSubstituteMappings.get(climateProductName)!;
      const climateData = await storage.getClimateImpactData(veganAlternative);
      
      if (climateData) {
        const portionKg = 0.1; // 100g portion
        return {
          co2_kg: Math.round((climateData.gwp_kgco2e_per_kg || 0) * portionKg * 100) / 100,
          water_l: Math.round((climateData.water_l_per_kg || 0) * portionKg),
          land_m2: Math.round((climateData.land_m2_per_kg || 0) * portionKg * 100) / 100,
          biodiversity_score: Math.round((climateData.biodiversity_impact || 0) * 100) / 100,
        };
      }
    }
    
    return null;
  }

  async compareClimateImpact(originalIngredients: string[], veganIngredients: string[], supplements: Array<typeof import("@shared/schema").supplements.$inferSelect> = []) {
    console.log('Starting climate impact comparison for:', { originalIngredients, veganIngredients, supplements });
    
    const originalImpact = await this.calculateTotalImpact(originalIngredients);
    const baseVeganImpact = await this.calculateTotalImpact(veganIngredients);
    
    // Calculate supplement impact and add to vegan totals
    const supplementImpact = this.calculateSupplementImpact(supplements);
    const veganImpact = {
      totalCO2: baseVeganImpact.totalCO2 + supplementImpact.totalCO2,
      totalWater: baseVeganImpact.totalWater + supplementImpact.totalWater,
      totalLand: baseVeganImpact.totalLand + supplementImpact.totalLand,
    };
    
    console.log('Calculated impacts:', { originalImpact, baseVeganImpact, supplementImpact, veganImpact });

    // Calculate percentage reductions (fallback to reasonable values if data not available)
    const co2Reduction = this.calculateReductionPercentage(originalImpact.totalCO2, veganImpact.totalCO2);
    const waterSaving = this.calculateReductionPercentage(originalImpact.totalWater, veganImpact.totalWater);
    const landSaving = this.calculateReductionPercentage(originalImpact.totalLand, veganImpact.totalLand);

    console.log('Calculated reductions:', { co2Reduction, waterSaving, landSaving });

    return {
      co2Reduction: isNaN(co2Reduction) ? 65 : co2Reduction, // Fallback values based on research
      waterSaving: isNaN(waterSaving) ? 78 : waterSaving,
      landSaving: isNaN(landSaving) ? 83 : landSaving,
      details: {
        original: originalImpact,
        vegan: veganImpact,
        supplements: supplementImpact,
      },
    };
  }

  async getIngredientImpact(ingredient: string): Promise<ClimateImpact | null> {
    const normalizedIngredient = ingredient.toLowerCase().trim();
    let climateProductName = this.ingredientMappings.get(normalizedIngredient);

    // If no direct mapping, try partial matching
    if (!climateProductName) {
      const entries = Array.from(this.ingredientMappings.entries());
      for (const [key, value] of entries) {
        if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
          climateProductName = value;
          break;
        }
      }
    }

    // Fallback to default vegetable impact if nothing found
    if (!climateProductName) {
      climateProductName = 'vegetables';
    }

    // Get climate data from database
    try {
      const climateData = await storage.getClimateImpactData(climateProductName);
      if (climateData) {
        const portionKg = 0.1; // 100g portion
        return {
          co2_kg: Math.round((climateData.gwp_kgco2e_per_kg || 0) * portionKg * 100) / 100,
          water_l: Math.round((climateData.water_l_per_kg || 0) * portionKg),
          land_m2: Math.round((climateData.land_m2_per_kg || 0) * portionKg * 100) / 100,
          biodiversity_score: Math.round((climateData.biodiversity_impact || 0) * 100) / 100,
        };
      }
    } catch (error) {
      console.warn(`Could not find climate data for: ${climateProductName}`);
    }
    
    return null;
  }

  private async calculateTotalImpact(ingredients: string[]) {
    let totalCO2 = 0;
    let totalWater = 0;
    let totalLand = 0;

    for (const ingredient of ingredients) {
      const impact = await this.getIngredientImpact(ingredient);
      if (impact) {
        totalCO2 += impact.co2_kg;
        totalWater += impact.water_l;
        totalLand += impact.land_m2;
      } else {
        // Fallback values based on average food impact
        totalCO2 += 2.0; // kg CO2 per 100g
        totalWater += 50; // liters per 100g
        totalLand += 1.5; // m2 per 100g
      }
    }

    return {
      totalCO2: Math.round(totalCO2 * 100) / 100,
      totalWater: Math.round(totalWater),
      totalLand: Math.round(totalLand * 100) / 100,
    };
  }

  private calculateReductionPercentage(original: number, vegan: number): number {
    if (!original || original === 0) return 0;
    return Math.round(((original - vegan) / original) * 100);
  }
  private calculateSupplementImpact(supplements: Array<typeof import("@shared/schema").supplements.$inferSelect>): { totalCO2: number; totalWater: number; totalLand: number } {
    let totalCO2 = 0;
    let totalWater = 0;
    let totalLand = 0;

    for (const supplement of supplements) {
      totalCO2 += supplement.gwp_kgco2e_per_serving || 0;
      totalWater += supplement.water_l_per_serving || 0;
      totalLand += supplement.land_m2_per_serving || 0;
    }

    return {
      totalCO2: Math.round(totalCO2 * 100) / 100,
      totalWater: Math.round(totalWater),
      totalLand: Math.round(totalLand * 100) / 100,
    };
  }
}

export const climateImpactService = new ClimateImpactService();