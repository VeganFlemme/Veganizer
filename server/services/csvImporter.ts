import { storage } from "../storage";
import { type InsertRecipe, type InsertCiqualData, recipes, ciqualData } from "@shared/schema";
import { db } from "../db";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { createReadStream } from "fs";
import csv from "csv-parser";

export class CSVImporter {
  private dataPath: string;

  constructor() {
    this.dataPath = path.join(process.cwd(), "server", "data");
  }

  private extractVeganIngredient(row: any, ingredientNumber: number): string | null {
    const originalIngredient = row[`ingredient_${ingredientNumber}`];
    const isVegan = row[`ingredient_${ingredientNumber}_vegan`] === 'Y';
    const veganSubstitute = row[`ingredient_vegan_${ingredientNumber}`];
    
    // If the original ingredient is already vegan, use it
    if (isVegan && originalIngredient && originalIngredient.trim()) {
      return originalIngredient.trim();
    }
    
    // If the original ingredient is not vegan, use the vegan substitute
    if (!isVegan && veganSubstitute && veganSubstitute.trim()) {
      return veganSubstitute.trim();
    }
    
    return null;
  }

  async importRecipes(): Promise<void> {
    // Import from the comprehensive recettesswap_old.csv file (semicolon separator)
    await this.importRecipesFromFile('recettesswap_old.csv', ';');
    // Also import from merge_from_ofoct.csv (comma separator)  
    await this.importRecipesFromFile('merge_from_ofoct.csv', ',');
  }

  private async importRecipesFromFile(filename: string, separator: string): Promise<void> {
    const recipesPath = path.join(this.dataPath, filename);
    
    if (!fs.existsSync(recipesPath)) {
      console.log(`Recipes CSV not found at ${recipesPath}. Skipping ${filename} import.`);
      return;
    }

    return new Promise((resolve, reject) => {
      const recipes: InsertRecipe[] = [];
      
      createReadStream(recipesPath)
        .pipe(csv({ separator }))
        .on('data', (row) => {
          try {
            const recipe: InsertRecipe = {
              recetteID: row.recetteID || null,
              nom_recette: row.nom_recette || '',
              ingredient_1: row.ingredient_1 || null,
              ingredient_2: row.ingredient_2 || null,
              ingredient_3: row.ingredient_3 || null,
              ingredient_4: row.ingredient_4 || null,
              ingredient_5: row.ingredient_5 || null,
              ingredient_6: row.ingredient_6 || null,
              ingredient_1_vegan: row.ingredient_1_vegan === 'Y',
              ingredient_2_vegan: row.ingredient_2_vegan === 'Y',
              ingredient_3_vegan: row.ingredient_3_vegan === 'Y',
              ingredient_4_vegan: row.ingredient_4_vegan === 'Y',
              ingredient_5_vegan: row.ingredient_5_vegan === 'Y',
              ingredient_6_vegan: row.ingredient_6_vegan === 'Y',
              nom_recette_vegan_equivalente: row.nom_recette_vegan_equivalente || null,
              // Extract vegan ingredients from the proper columns
              ingredient_vegan_1: this.extractVeganIngredient(row, 1),
              ingredient_vegan_2: this.extractVeganIngredient(row, 2),
              ingredient_vegan_3: this.extractVeganIngredient(row, 3),
              ingredient_vegan_4: this.extractVeganIngredient(row, 4),
              ingredient_vegan_5: this.extractVeganIngredient(row, 5),
              ingredient_vegan_6: this.extractVeganIngredient(row, 6),
              cookingTime: null,
              servings: null,
              difficulty: null,
            };
            
            if (recipe.nom_recette) {
              recipes.push(recipe);
            }
          } catch (error) {
            console.error('Error parsing recipe row:', error);
          }
        })
        .on('end', async () => {
          try {
            console.log(`Importing ${recipes.length} recipes...`);
            
            // Use batch insert with duplicate detection
            for (const recipe of recipes) {
              try {
                // Check if recipe already exists by normalized name
                const existingRecipe = await storage.getRecipeByName(recipe.nom_recette);
                
                if (!existingRecipe) {
                  await storage.createRecipe(recipe);
                }
              } catch (error: any) {
                console.error(`Error importing recipe ${recipe.nom_recette}:`, error);
              }
            }
            console.log(`${filename} recipes import completed successfully`);
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  async importCiqualData(): Promise<void> {
    const ciqualPath = path.join(this.dataPath, "Table-Ciqual-2020_FR_2020-07-07-2_old.csv");
    
    if (!fs.existsSync(ciqualPath)) {
      console.log(`Ciqual CSV not found at ${ciqualPath}. Skipping import.`);
      return;
    }

    return new Promise((resolve, reject) => {
      const ciqualItems: InsertCiqualData[] = [];
      
      createReadStream(ciqualPath)
        .pipe(csv({ separator: ',' }))
        .on('data', (row) => {
          try {
            const data: InsertCiqualData = {
              alim_code: row['alim_code'] || null,
              alim_nom_fr: row['alim_nom_fr'] || '',
              energie_kcal: this.parseFloat(row['Energie, Règlement UE N° 1169/2011 (kcal/100 g)']),
              proteines_g: this.parseFloat(row['Protéines, N x 6.25 (g/100 g)']),
              glucides_g: this.parseFloat(row['Glucides (g/100 g)']),
              lipides_g: this.parseFloat(row['Lipides (g/100 g)']),
              fibres_g: this.parseFloat(row['Fibres alimentaires (g/100 g)']),
              calcium_mg: this.parseFloat(row['Calcium (mg/100 g)']),
              fer_mg: this.parseFloat(row['Fer (mg/100 g)']),
              zinc_mg: this.parseFloat(row['Zinc (mg/100 g)']),
              vitamine_b12_ug: this.parseFloat(row['Vitamine B12 (µg/100 g)']),
              vitamine_d_ug: this.parseFloat(row['Vitamine D (µg/100 g)']),
            };
            
            if (data.alim_nom_fr) {
              ciqualItems.push(data);
            }
          } catch (error) {
            console.error('Error parsing Ciqual row:', error);
          }
        })
        .on('end', async () => {
          try {
            console.log(`Importing ${ciqualItems.length} Ciqual items...`);
            
            // Use batch insert with duplicate detection
            for (const item of ciqualItems) {
              try {
                // Check if ciqual item already exists by normalized name
                const existingItem = await storage.getCiqualData(item.alim_nom_fr);
                
                if (!existingItem) {
                  await storage.createCiqualData(item);
                }
              } catch (error: any) {
                console.error(`Error importing ciqual item ${item.alim_nom_fr}:`, error);
              }
            }
            console.log('Ciqual data import completed successfully');
            resolve();
          } catch (error) {
            reject(error);
          }
        })
        .on('error', reject);
    });
  }

  private normalizeText(text: string): string {
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .trim();
  }

  private parseFloat(value: string): number | null {
    if (!value || value === '-' || value === '') return null;
    const parsed = parseFloat(value.replace(',', '.'));
    return isNaN(parsed) ? null : parsed;
  }

  async importAll(): Promise<void> {
    console.log('Starting CSV import process...');
    try {
      await this.importRecipes();
      await this.importCiqualData();
      console.log('All CSV imports completed successfully');
    } catch (error) {
      console.error('Error during CSV import:', error);
      throw error;
    }
  }
}
