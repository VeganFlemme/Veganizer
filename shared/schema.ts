import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, real, boolean, unique, uniqueIndex, timestamp, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.  
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const recipes = pgTable("recipes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  recetteID: text("recette_id"),
  nom_recette: text("nom_recette").notNull(),
  ingredient_1: text("ingredient_1"),
  ingredient_2: text("ingredient_2"),
  ingredient_3: text("ingredient_3"),
  ingredient_4: text("ingredient_4"),
  ingredient_5: text("ingredient_5"),
  ingredient_6: text("ingredient_6"),
  ingredient_1_vegan: boolean("ingredient_1_vegan").default(false),
  ingredient_2_vegan: boolean("ingredient_2_vegan").default(false),
  ingredient_3_vegan: boolean("ingredient_3_vegan").default(false),
  ingredient_4_vegan: boolean("ingredient_4_vegan").default(false),
  ingredient_5_vegan: boolean("ingredient_5_vegan").default(false),
  ingredient_6_vegan: boolean("ingredient_6_vegan").default(false),
  nom_recette_vegan_equivalente: text("nom_recette_vegan_equivalente"),
  ingredient_vegan_1: text("ingredient_vegan_1"),
  ingredient_vegan_2: text("ingredient_vegan_2"),
  ingredient_vegan_3: text("ingredient_vegan_3"),
  ingredient_vegan_4: text("ingredient_vegan_4"),
  ingredient_vegan_5: text("ingredient_vegan_5"),
  ingredient_vegan_6: text("ingredient_vegan_6"),
  // Foreign key references to ciqual_data for nutritional information
  ingredient_1_ciqual_id: varchar("ingredient_1_ciqual_id"),
  ingredient_2_ciqual_id: varchar("ingredient_2_ciqual_id"),
  ingredient_3_ciqual_id: varchar("ingredient_3_ciqual_id"),
  ingredient_4_ciqual_id: varchar("ingredient_4_ciqual_id"),
  ingredient_5_ciqual_id: varchar("ingredient_5_ciqual_id"),
  ingredient_6_ciqual_id: varchar("ingredient_6_ciqual_id"),
  ingredient_vegan_1_ciqual_id: varchar("ingredient_vegan_1_ciqual_id"),
  ingredient_vegan_2_ciqual_id: varchar("ingredient_vegan_2_ciqual_id"),
  ingredient_vegan_3_ciqual_id: varchar("ingredient_vegan_3_ciqual_id"),
  ingredient_vegan_4_ciqual_id: varchar("ingredient_vegan_4_ciqual_id"),
  ingredient_vegan_5_ciqual_id: varchar("ingredient_vegan_5_ciqual_id"),
  ingredient_vegan_6_ciqual_id: varchar("ingredient_vegan_6_ciqual_id"),
  cookingTime: text("cooking_time"),
  servings: integer("servings"),
  difficulty: text("difficulty"),
}, (table) => ({
  uniqueNomRecette: uniqueIndex('recipes_nom_norm_unique').on(sql`lower(unaccent(${table.nom_recette}))`),
}));

export const ingredientSubstitutions = pgTable("ingredient_substitutions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  original_ingredient: text("original_ingredient").notNull(),
  vegan_substitute: text("vegan_substitute").notNull(),
  substitution_ratio: real("substitution_ratio").default(1.0),
  category: text("category"),
  notes: text("notes"),
  // Foreign key references to ciqual_data for nutritional information
  original_ingredient_ciqual_id: varchar("original_ingredient_ciqual_id"),
  vegan_substitute_ciqual_id: varchar("vegan_substitute_ciqual_id"),
}, (table) => ({
  uniqueOriginalIngredient: uniqueIndex('substitutions_orig_norm_unique').on(sql`lower(unaccent(${table.original_ingredient}))`),
}));

export const ciqualData = pgTable("ciqual_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  alim_code: text("alim_code"),
  alim_nom_fr: text("alim_nom_fr").notNull(),
  energie_kcal: real("energie_kcal"),
  proteines_g: real("proteines_g"),
  glucides_g: real("glucides_g"),
  lipides_g: real("lipides_g"),
  fibres_g: real("fibres_g"),
  calcium_mg: real("calcium_mg"),
  fer_mg: real("fer_mg"),
  zinc_mg: real("zinc_mg"),
  vitamine_b12_ug: real("vitamine_b12_ug"),
  vitamine_d_ug: real("vitamine_d_ug"),
}, (table) => ({
  uniqueNomAliment: uniqueIndex('ciqual_nom_norm_unique').on(sql`lower(unaccent(${table.alim_nom_fr}))`),
}));

export const favorites = pgTable("favorites", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id"), // Reference to users.id (nullable for legacy favorites)
  recipe_name: text("recipe_name").notNull(),
  vegan_recipe_name: text("vegan_recipe_name").notNull(),
  recipe_data: text("recipe_data").notNull(), // JSON string of RecipeConversionResponse
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserRecipeName: uniqueIndex('favorites_user_recipe_name_unique').on(table.user_id, sql`lower(unaccent(${table.recipe_name}))`),
}));

// Climate impact tables for AGRIBALYSE data
export const climateProducts = pgTable("climate_products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  normalized_name: text("normalized_name").notNull(),
  source: text("source").notNull().default("AGRIBALYSE"),
}, (table) => ({
  uniqueNormalizedName: uniqueIndex('climate_products_norm_name_unique').on(table.normalized_name),
}));

export const climateConsumptionMix = pgTable("climate_consumption_mix", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  consumption_mix_name: text("consumption_mix_name").notNull(),
  input_output_type: text("input_output_type").notNull(), // 'Input' or 'Output'
  component_name: text("component_name").notNull(),
  quantity: real("quantity"),
  unit: text("unit").notNull(),
  comment: text("comment"),
  data_source: text("data_source").notNull().default("APICLIMAT"),
});

export const ingredientClimateMapping = pgTable("ingredient_climate_mapping", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ingredient_name: text("ingredient_name").notNull(),
  ciqual_id: varchar("ciqual_id"), // Reference to ciqual_data
  climate_product_id: varchar("climate_product_id"), // Reference to climate_products
  mapping_confidence: real("mapping_confidence"), // 0.0 to 1.0
  notes: text("notes"),
});

export const climateImpactMetrics = pgTable("climate_impact_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  product_id: varchar("product_id").notNull(), // Reference to climate_products
  gwp_kgco2e_per_kg: real("gwp_kgco2e_per_kg"), // Global Warming Potential
  water_l_per_kg: real("water_l_per_kg"), // Water usage
  land_m2_per_kg: real("land_m2_per_kg"), // Land usage
  biodiversity_impact: real("biodiversity_impact"), // Biodiversity impact score
  data_source: text("data_source").notNull().default("AGRIBALYSE"),
});

// Menu management tables
export const menus = pgTable("menus", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  user_id: varchar("user_id").notNull(), // Reference to users.id
  name: text("name").notNull(),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueUserMenuName: uniqueIndex('menus_user_name_unique').on(table.user_id, sql`lower(unaccent(${table.name}))`),
}));

export const menuItems = pgTable("menu_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  menu_id: varchar("menu_id").notNull(), // Reference to menus.id
  favorite_id: varchar("favorite_id").notNull(), // Reference to favorites.id
  day_of_week: text("day_of_week"), // Optional: 'monday', 'tuesday', etc.
  position: integer("position").notNull().default(0), // For ordering within day/menu
  servings: real("servings").default(1.0), // Number of servings for this item
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Recurring ingredients links table
export const recurringIngredientsLinks = pgTable("recurring_ingredients_links", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ingredient_name: text("ingredient_name").notNull(),
  normalized_ingredient_name: text("normalized_ingredient_name").notNull(),
  usage_probability: real("usage_probability").notNull(), // 0.0 to 1.0
  amazon_link: text("amazon_link"),
  shop_link: text("shop_link"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueIngredientName: uniqueIndex('recurring_ingredients_name_unique').on(sql`lower(unaccent(${table.ingredient_name}))`),
}));

// Animal impact table for calculating animals saved
export const animalImpact = pgTable("animal_impact", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  animal_product_type: text("animal_product_type").notNull(), // 'beef', 'pork', 'chicken', 'fish', 'dairy', 'eggs'
  animal_type: text("animal_type").notNull(), // 'cow', 'pig', 'chicken', 'fish', 'cow_dairy', 'hen'
  animals_per_kg: real("animals_per_kg").notNull(), // Number of animals killed per kg of product
  average_weight_kg: real("average_weight_kg"), // Average weight of the animal in kg
  lifespan_days: integer("lifespan_days"), // Natural lifespan in days
  actual_age_at_death_days: integer("actual_age_at_death_days"), // Actual age when killed
  data_source: text("data_source").notNull().default("Research_Based"),
  notes: text("notes"),
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueAnimalProduct: uniqueIndex('animal_impact_product_unique').on(table.animal_product_type),
}));

// Supplements table for affiliate products with nutritional and environmental data
export const supplements = pgTable("supplements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'vitamin', 'mineral', 'omega', 'protein'
  priority: text("priority").notNull(), // 'critical', 'high', 'medium'
  serving_size: text("serving_size").notNull(), // e.g., "1 gélule", "5ml"
  
  // Nutritional data per serving
  energie_kcal: real("energie_kcal").default(0),
  proteines_g: real("proteines_g").default(0),
  glucides_g: real("glucides_g").default(0),
  lipides_g: real("lipides_g").default(0),
  fibres_g: real("fibres_g").default(0),
  calcium_mg: real("calcium_mg").default(0),
  fer_mg: real("fer_mg").default(0),
  zinc_mg: real("zinc_mg").default(0),
  vitamine_b12_mcg: real("vitamine_b12_mcg").default(0),
  omega3_dha_mg: real("omega3_dha_mg").default(0),
  omega3_epa_mg: real("omega3_epa_mg").default(0),
  
  // Environmental impact data per serving
  gwp_kgco2e_per_serving: real("gwp_kgco2e_per_serving").default(0),
  water_l_per_serving: real("water_l_per_serving").default(0),
  land_m2_per_serving: real("land_m2_per_serving").default(0),
  biodiversity_impact: real("biodiversity_impact").default(0),
  
  // Affiliate links and metadata
  amazon_link: text("amazon_link").notNull(),
  description: text("description"),
  deficiency_threshold: jsonb("deficiency_threshold"), // JSON: { nutrient: value }
  
  created_at: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  uniqueSupplementName: uniqueIndex('supplements_name_unique').on(sql`lower(unaccent(${table.name}))`),
}));

export const insertRecipeSchema = createInsertSchema(recipes).omit({
  id: true,
});

export const insertIngredientSubstitutionSchema = createInsertSchema(ingredientSubstitutions).omit({
  id: true,
});

export const insertCiqualDataSchema = createInsertSchema(ciqualData).omit({
  id: true,
});

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  id: true,
  created_at: true,
});

// Climate impact insert schemas
export const insertClimateProductSchema = createInsertSchema(climateProducts).omit({
  id: true,
});

export const insertClimateConsumptionMixSchema = createInsertSchema(climateConsumptionMix).omit({
  id: true,
});

export const insertIngredientClimateMappingSchema = createInsertSchema(ingredientClimateMapping).omit({
  id: true,
});

export const insertClimateImpactMetricsSchema = createInsertSchema(climateImpactMetrics).omit({
  id: true,
});

// Auth schemas (for Replit Auth integration)
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMenuSchema = createInsertSchema(menus).omit({
  id: true,
  created_at: true,
});

export const insertMenuItemSchema = createInsertSchema(menuItems).omit({
  id: true,
  created_at: true,
});

export const insertRecurringIngredientsLinksSchema = createInsertSchema(recurringIngredientsLinks).omit({
  id: true,
  created_at: true,
});

export const insertSupplementSchema = createInsertSchema(supplements).omit({
  id: true,
  created_at: true,
});

export const insertAnimalImpactSchema = createInsertSchema(animalImpact).omit({
  id: true,
  created_at: true,
});

// Select and Insert types
export type Recipe = typeof recipes.$inferSelect;
export type InsertRecipe = z.infer<typeof insertRecipeSchema>;
export type IngredientSubstitution = typeof ingredientSubstitutions.$inferSelect;
export type InsertIngredientSubstitution = z.infer<typeof insertIngredientSubstitutionSchema>;
export type CiqualData = typeof ciqualData.$inferSelect;
export type InsertCiqualData = z.infer<typeof insertCiqualDataSchema>;
export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

// Auth types (for Replit Auth integration)
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert; // For Replit Auth upsert operations
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Menu = typeof menus.$inferSelect;
export type InsertMenu = z.infer<typeof insertMenuSchema>;
export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;

// Frontend payload schema for adding recipes to menu (before conversion)
export const addRecipeToMenuSchema = z.object({
  recipe_name: z.string().min(1, "Recipe name is required"),
  day_of_week: z.string().optional(),
  servings: z.number().min(0.1).max(10).default(1),
});
export type AddRecipeToMenuRequest = z.infer<typeof addRecipeToMenuSchema>;
export type RecurringIngredientsLink = typeof recurringIngredientsLinks.$inferSelect;
export type InsertRecurringIngredientsLink = z.infer<typeof insertRecurringIngredientsLinksSchema>;
export type AnimalImpact = typeof animalImpact.$inferSelect;
export type InsertAnimalImpact = z.infer<typeof insertAnimalImpactSchema>;

// Climate impact types
export type ClimateProduct = typeof climateProducts.$inferSelect;
export type InsertClimateProduct = z.infer<typeof insertClimateProductSchema>;
export type ClimateConsumptionMix = typeof climateConsumptionMix.$inferSelect;
export type InsertClimateConsumptionMix = z.infer<typeof insertClimateConsumptionMixSchema>;
export type IngredientClimateMapping = typeof ingredientClimateMapping.$inferSelect;
export type InsertIngredientClimateMapping = z.infer<typeof insertIngredientClimateMappingSchema>;
export type ClimateImpactMetrics = typeof climateImpactMetrics.$inferSelect;
export type InsertClimateImpactMetrics = z.infer<typeof insertClimateImpactMetricsSchema>;

// Response types for API
export const recipeConversionResponseSchema = z.object({
  originalRecipe: z.object({
    name: z.string(),
    ingredients: z.array(z.string()),
    cookingTime: z.string().optional(),
    servings: z.number().optional(),
    difficulty: z.string().optional(),
  }),
  veganRecipe: z.object({
    name: z.string(),
    ingredients: z.array(z.object({
      name: z.string(),
      substitution: z.string().optional(),
      isSubstituted: z.boolean(),
    })),
    cookingTime: z.string().optional(),
    servings: z.number().optional(),
    difficulty: z.string().optional(),
  }),
  nutritionComparison: z.object({
    original: z.object({
      calories: z.number().finite(),
      proteins: z.number().finite(),
      carbs: z.number().finite(),
      fats: z.number().finite(),
      fiber: z.number().finite(),
      calcium: z.number().finite(),
      iron: z.number().finite(),
      zinc: z.number().finite(),
    }),
    vegan: z.object({
      calories: z.number().finite(),
      proteins: z.number().finite(),
      carbs: z.number().finite(),
      fats: z.number().finite(),
      fiber: z.number().finite(),
      calcium: z.number().finite(),
      iron: z.number().finite(),
      zinc: z.number().finite(),
    }),
    supplements: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      priority: z.string(),
      serving_size: z.string(),
      amazon_link: z.string(),
      description: z.string().optional(),
      energie_kcal: z.number().optional(),
      proteines_g: z.number().optional(),
      glucides_g: z.number().optional(),
      lipides_g: z.number().optional(),
      fibres_g: z.number().optional(),
      calcium_mg: z.number().optional(),
      fer_mg: z.number().optional(),
      zinc_mg: z.number().optional(),
      vitamine_b12_mcg: z.number().optional(),
      omega3_dha_mg: z.number().optional(),
      omega3_epa_mg: z.number().optional(),
      gwp_kgco2e_per_serving: z.number().optional(),
      water_l_per_serving: z.number().optional(),
      land_m2_per_serving: z.number().optional(),
      biodiversity_impact: z.number().optional(),
    })).optional(),
    supplementContribution: z.object({
      calories: z.number().finite(),
      proteins: z.number().finite(),
      carbs: z.number().finite(),
      fats: z.number().finite(),
      fiber: z.number().finite(),
      calcium: z.number().finite(),
      iron: z.number().finite(),
      zinc: z.number().finite(),
    }).optional(),
  }),
  climateComparison: z.object({
    co2Reduction: z.number().finite(),
    waterSaving: z.number().finite(),
    landSaving: z.number().finite(),
    details: z.object({
      original: z.object({
        totalCO2: z.number().finite(),
        totalWater: z.number().finite(),
        totalLand: z.number().finite(),
      }),
      vegan: z.object({
        totalCO2: z.number().finite(),
        totalWater: z.number().finite(),
        totalLand: z.number().finite(),
      }),
      supplements: z.object({
        totalCO2: z.number().finite(),
        totalWater: z.number().finite(),
        totalLand: z.number().finite(),
      }).optional(),
    }),
  }),
  shoppingList: z.object({
    fruitsVegetables: z.array(z.string()),
    proteins: z.array(z.string()),
    dryGoods: z.array(z.string()),
    alternatives: z.array(z.string()),
    estimatedCost: z.number(),
    savings: z.number(),
  }),
  animalSavings: z.object({
    totalAnimals: z.number().finite(),
    animalBreakdown: z.object({
      cows: z.number().finite(),
      pigs: z.number().finite(),
      chickens: z.number().finite(),
      fish: z.number().finite(),
      dairy_cows: z.number().finite(),
      hens: z.number().finite(),
    }),
    lifeYearsSaved: z.number().finite(),
    details: z.array(z.object({
      animalType: z.string(),
      animalCount: z.number().finite(),
      productType: z.string(),
      quantityKg: z.number().finite(),
      lifeYearsSaved: z.number().finite(),
    })),
  }),
  substitutionCount: z.number(),
});

export type RecipeConversionResponse = z.infer<typeof recipeConversionResponseSchema>;

// Request schemas for API endpoints
export const recipeConversionRequestSchema = z.object({
  recipeName: z.string().min(1, "Recipe name is required").max(255, "Recipe name too long"),
});

export type RecipeConversionRequest = z.infer<typeof recipeConversionRequestSchema>;
