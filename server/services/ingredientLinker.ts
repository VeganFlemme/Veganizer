import { db } from "../db";
import { recipes, ingredientSubstitutions, ciqualData } from "@shared/schema";
import { sql, eq, or } from "drizzle-orm";

export class IngredientLinker {
  
  /**
   * Links all ingredients from recipes and substitutions to corresponding ciqual_data entries
   */
  async linkAllIngredients(): Promise<void> {
    console.log('Starting ingredient linking process...');
    
    try {
      await this.linkRecipeIngredients();
      await this.linkSubstitutionIngredients();
      console.log('Ingredient linking completed successfully');
    } catch (error) {
      console.error('Error during ingredient linking:', error);
      throw error;
    }
  }

  /**
   * Links recipe ingredients to ciqual_data
   */
  private async linkRecipeIngredients(): Promise<void> {
    console.log('Linking recipe ingredients...');
    
    const allRecipes = await db.select().from(recipes);
    
    for (const recipe of allRecipes) {
      const updates: any = {};
      let hasUpdates = false;

      // Link original ingredients
      for (let i = 1; i <= 6; i++) {
        const ingredientCol = `ingredient_${i}` as keyof typeof recipe;
        const ciqualIdCol = `ingredient_${i}_ciqual_id` as keyof typeof recipe;
        const ingredient = recipe[ingredientCol] as string;
        
        if (ingredient && !recipe[ciqualIdCol]) {
          const ciqualId = await this.findCiqualMatch(ingredient);
          if (ciqualId) {
            updates[ciqualIdCol] = ciqualId;
            hasUpdates = true;
          }
        }
      }

      // Link vegan ingredients
      for (let i = 1; i <= 6; i++) {
        const veganIngredientCol = `ingredient_vegan_${i}` as keyof typeof recipe;
        const veganCiqualIdCol = `ingredient_vegan_${i}_ciqual_id` as keyof typeof recipe;
        const veganIngredient = recipe[veganIngredientCol] as string;
        
        if (veganIngredient && !recipe[veganCiqualIdCol]) {
          const ciqualId = await this.findCiqualMatch(veganIngredient);
          if (ciqualId) {
            updates[veganCiqualIdCol] = ciqualId;
            hasUpdates = true;
          }
        }
      }

      // Update recipe if we found matches
      if (hasUpdates) {
        await db.update(recipes)
          .set(updates)
          .where(eq(recipes.id, recipe.id));
      }
    }
    
    console.log('Recipe ingredients linking completed');
  }

  /**
   * Links substitution ingredients to ciqual_data
   */
  private async linkSubstitutionIngredients(): Promise<void> {
    console.log('Linking substitution ingredients...');
    
    const allSubstitutions = await db.select().from(ingredientSubstitutions);
    
    for (const substitution of allSubstitutions) {
      const updates: any = {};
      let hasUpdates = false;

      // Link original ingredient
      if (substitution.original_ingredient && !substitution.original_ingredient_ciqual_id) {
        const ciqualId = await this.findCiqualMatch(substitution.original_ingredient);
        if (ciqualId) {
          updates.original_ingredient_ciqual_id = ciqualId;
          hasUpdates = true;
        }
      }

      // Link vegan substitute
      if (substitution.vegan_substitute && !substitution.vegan_substitute_ciqual_id) {
        const ciqualId = await this.findCiqualMatch(substitution.vegan_substitute);
        if (ciqualId) {
          updates.vegan_substitute_ciqual_id = ciqualId;
          hasUpdates = true;
        }
      }

      // Update substitution if we found matches
      if (hasUpdates) {
        await db.update(ingredientSubstitutions)
          .set(updates)
          .where(eq(ingredientSubstitutions.id, substitution.id));
      }
    }
    
    console.log('Substitution ingredients linking completed');
  }

  /**
   * Finds the best ciqual_data match for an ingredient name using fuzzy matching
   */
  private async findCiqualMatch(ingredientName: string): Promise<string | null> {
    const normalized = this.normalizeIngredientName(ingredientName);
    
    // Skip vegan substitutes and processed foods that won't be in traditional nutrition database
    if (this.isVeganSubstituteOrProcessed(normalized)) {
      return null;
    }

    // Try exact match first
    const exactMatch = await db.select({ id: ciqualData.id })
      .from(ciqualData)
      .where(sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${normalized}))`)
      .limit(1);
    
    if (exactMatch.length > 0) {
      console.log(`✓ Exact match: ${ingredientName} → ${normalized}`);
      return exactMatch[0].id;
    }

    // Try partial match with the ingredient name contained in ciqual name
    const partialMatch = await db.select({ id: ciqualData.id, name: ciqualData.alim_nom_fr })
      .from(ciqualData)
      .where(sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${'%' + normalized + '%'}))`)
      .limit(1);
    
    if (partialMatch.length > 0) {
      console.log(`✓ Partial match: ${ingredientName} → ${partialMatch[0].name}`);
      return partialMatch[0].id;
    }

    // Try common mappings for ingredients that have different names in ciqual
    const mappedIngredient = this.getIngredientMapping(normalized);
    if (mappedIngredient) {
      const mappedMatch = await db.select({ id: ciqualData.id, name: ciqualData.alim_nom_fr })
        .from(ciqualData)
        .where(sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${'%' + mappedIngredient + '%'}))`)
        .limit(1);
      
      if (mappedMatch.length > 0) {
        console.log(`✓ Mapped match: ${ingredientName} → ${mappedMatch[0].name}`);
        return mappedMatch[0].id;
      }
    }

    // Only log for ingredients that should reasonably be in the database
    if (!this.isVeganSubstituteOrProcessed(ingredientName.toLowerCase())) {
      console.log(`No ciqual match found for: ${ingredientName}`);
    }
    return null;
  }

  /**
   * Normalizes ingredient names for matching
   */
  private normalizeIngredientName(name: string): string {
    let normalized = name.toLowerCase()
      .trim()
      .replace(/[éèê]/g, 'e')
      .replace(/[àâ]/g, 'a')
      .replace(/[ùû]/g, 'u')
      .replace(/[ôö]/g, 'o')
      .replace(/[îï]/g, 'i')
      .replace(/[ç]/g, 'c')
      .replace(/œ/g, 'oe');

    // Handle common plural to singular conversions
    normalized = normalized
      .replace(/^courgettes?$/, 'courgette')
      .replace(/^echalotes?$/, 'echalote')
      .replace(/^navets?$/, 'navet')
      .replace(/^champignons?$/, 'champignon')
      .replace(/^carottes?$/, 'carotte')
      .replace(/^tomates?$/, 'tomate')
      .replace(/^oignons?$/, 'oignon')
      .replace(/^pommes de terre$/, 'pomme de terre')
      .replace(/^pommes$/, 'pomme')
      .replace(/^poires$/, 'poire')
      .replace(/^abricots$/, 'abricot')
      .replace(/^amandes$/, 'amande')
      .replace(/^artichauts$/, 'artichaut')
      .replace(/^endives$/, 'endive')
      .replace(/^cardons$/, 'cardon')
      .replace(/^topinambours$/, 'topinambour')
      .replace(/^pistaches$/, 'pistache')
      .replace(/^pois chiches$/, 'pois chiche')
      .replace(/^biscuits$/, 'biscuit');

    return normalized;
  }

  /**
   * Maps common ingredient names to their ciqual equivalents
   */
  private getIngredientMapping(ingredientName: string): string | null {
    const mappings: { [key: string]: string } = {
      'veau': 'veau',
      'boeuf': 'boeuf',
      'bœuf': 'boeuf', 
      'poulet': 'poulet',
      'lait': 'lait',
      'creme fraiche': 'crème',
      'crème fraîche': 'crème',
      'beurre': 'beurre',
      'fromage': 'fromage',
      'yaourt': 'yaourt',
      'jambon': 'jambon',
      'saumon': 'saumon',
      'thon': 'thon',
      'oeufs': 'oeuf',
      'œufs': 'oeuf',
      'oeuf': 'oeuf',
      'œuf': 'oeuf',
      'vin rouge': 'vin',
      'vin blanc': 'vin',
      'huile d\'olive': 'huile',
      'huile': 'huile',
      'carottes': 'carotte',
      'carotte': 'carotte',
      'champignons': 'champignon',
      'champignon': 'champignon',
      'tomates': 'tomate',
      'tomate': 'tomate',
      'pommes de terre': 'pomme de terre',
      'pomme de terre': 'pomme de terre',
      'oignons': 'oignon',
      'oignon': 'oignon'
    };

    return mappings[ingredientName] || null;
  }

  /**
   * Checks if an ingredient is a vegan substitute or processed food unlikely to be in ciqual
   */
  private isVeganSubstituteOrProcessed(ingredient: string): boolean {
    const veganKeywords = [
      'vegetal', 'vegane', 'vegetale', 'vegetaux',
      'tofu', 'seitan', 'tempeh', 'aquafaba',
      'protéines de soja', 'protéines de blé', 'protéines végétales',
      'bechamel vegane', 'chantilly vegetale', 'creme vegane',
      'pate vegane', 'brioche vegane', 'pate a choux vegane',
      'biscuits veganes', 'mascarpone vegetal', 'fondant vegane',
      'caramel vegetal', 'crème végane', 'crème végétale',
      'jambon vegetal', 'charcuterie vegetale', 'boyau vegetal',
      'ferments vegetaux', 'fumage vegetal', 'aromes naturels',
      'farce vegetale', 'gremolata', 'mayonnaise vegane',
      'aïoli vegane', 'algue nori', 'algues wakame', 'algue',
      'king oyster', 'shiitake', 'bouillon vegetal',
      'lait d\'amande', 'lait vegetal', 'huile coco',
      'crème d\'amande', 'eau de vichy'
    ];

    return veganKeywords.some(keyword => ingredient.includes(keyword));
  }

  /**
   * Gets nutritional statistics after linking
   */
  async getLinkingStats(): Promise<any> {
    const totalRecipeIngredients = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT ingredient_1 FROM recipes WHERE ingredient_1 IS NOT NULL
        UNION ALL SELECT ingredient_2 FROM recipes WHERE ingredient_2 IS NOT NULL  
        UNION ALL SELECT ingredient_3 FROM recipes WHERE ingredient_3 IS NOT NULL
        UNION ALL SELECT ingredient_4 FROM recipes WHERE ingredient_4 IS NOT NULL
        UNION ALL SELECT ingredient_5 FROM recipes WHERE ingredient_5 IS NOT NULL
        UNION ALL SELECT ingredient_6 FROM recipes WHERE ingredient_6 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_1 FROM recipes WHERE ingredient_vegan_1 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_2 FROM recipes WHERE ingredient_vegan_2 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_3 FROM recipes WHERE ingredient_vegan_3 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_4 FROM recipes WHERE ingredient_vegan_4 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_5 FROM recipes WHERE ingredient_vegan_5 IS NOT NULL
        UNION ALL SELECT ingredient_vegan_6 FROM recipes WHERE ingredient_vegan_6 IS NOT NULL
      ) t
    `);

    const linkedRecipeIngredients = await db.execute(sql`
      SELECT COUNT(*) as count FROM (
        SELECT ingredient_1_ciqual_id FROM recipes WHERE ingredient_1_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_2_ciqual_id FROM recipes WHERE ingredient_2_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_3_ciqual_id FROM recipes WHERE ingredient_3_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_4_ciqual_id FROM recipes WHERE ingredient_4_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_5_ciqual_id FROM recipes WHERE ingredient_5_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_6_ciqual_id FROM recipes WHERE ingredient_6_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_1_ciqual_id FROM recipes WHERE ingredient_vegan_1_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_2_ciqual_id FROM recipes WHERE ingredient_vegan_2_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_3_ciqual_id FROM recipes WHERE ingredient_vegan_3_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_4_ciqual_id FROM recipes WHERE ingredient_vegan_4_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_5_ciqual_id FROM recipes WHERE ingredient_vegan_5_ciqual_id IS NOT NULL
        UNION ALL SELECT ingredient_vegan_6_ciqual_id FROM recipes WHERE ingredient_vegan_6_ciqual_id IS NOT NULL
      ) t
    `);

    const totalSubstitutionIngredients = await db.execute(sql`
      SELECT COUNT(*) * 2 as count FROM ingredient_substitutions
    `);

    const linkedSubstitutionIngredients = await db.execute(sql`
      SELECT 
        SUM(CASE WHEN original_ingredient_ciqual_id IS NOT NULL THEN 1 ELSE 0 END) +
        SUM(CASE WHEN vegan_substitute_ciqual_id IS NOT NULL THEN 1 ELSE 0 END) as count
      FROM ingredient_substitutions
    `);

    return {
      recipe_ingredients: {
        total: Number((totalRecipeIngredients as any)[0]?.count || 0),
        linked: Number((linkedRecipeIngredients as any)[0]?.count || 0),
      },
      substitution_ingredients: {
        total: Number((totalSubstitutionIngredients as any)[0]?.count || 0),
        linked: Number((linkedSubstitutionIngredients as any)[0]?.count || 0),
      }
    };
  }
}