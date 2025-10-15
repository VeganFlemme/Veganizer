import { type Recipe, type InsertRecipe, type IngredientSubstitution, type InsertIngredientSubstitution, type CiqualData, type InsertCiqualData, type Favorite, type InsertFavorite, type User, type UpsertUser, type Menu, type InsertMenu, type MenuItem, type InsertMenuItem, type AnimalImpact, type InsertAnimalImpact, recipes, ingredientSubstitutions, ciqualData, favorites, users, menus, menuItems, climateProducts, climateImpactMetrics, supplements, animalImpact } from "@shared/schema";
import { db } from "./db";
import { eq, ilike, or, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  // Recipe methods
  getRecipe(id: string): Promise<Recipe | undefined>;
  getRecipeByName(name: string): Promise<Recipe | undefined>;
  searchRecipes(query: string): Promise<Recipe[]>;
  getRecipeSuggestions(query: string, limit?: number): Promise<Recipe[]>;
  createRecipe(recipe: InsertRecipe): Promise<Recipe>;
  updateRecipe(id: string, recipe: Partial<InsertRecipe>): Promise<Recipe>;
  deleteRecipe(id: string): Promise<void>;
  getAllRecipes(): Promise<Recipe[]>;

  // Ingredient substitution methods
  getSubstitution(originalIngredient: string): Promise<IngredientSubstitution | undefined>;
  getAllSubstitutions(): Promise<IngredientSubstitution[]>;
  createSubstitution(substitution: InsertIngredientSubstitution): Promise<IngredientSubstitution>;
  updateSubstitution(id: string, substitution: Partial<InsertIngredientSubstitution>): Promise<IngredientSubstitution>;
  deleteSubstitution(id: string): Promise<void>;

  // Ciqual data methods
  getCiqualData(ingredientName: string): Promise<CiqualData | undefined>;
  getAllCiqualData(): Promise<CiqualData[]>;
  createCiqualData(data: InsertCiqualData): Promise<CiqualData>;
  searchCiqualData(query: string): Promise<CiqualData[]>;

  // Favorites methods
  getFavorite(id: string): Promise<Favorite | undefined>;
  getAllFavorites(): Promise<Favorite[]>;
  createFavorite(favorite: InsertFavorite): Promise<Favorite>;
  deleteFavorite(id: string): Promise<void>;
  getFavoriteByRecipeName(recipeName: string): Promise<Favorite | undefined>;
  getFavoritesByUserId(userId: string): Promise<Favorite[]>;
  getFavoriteByUserAndRecipeName(userId: string, recipeName: string): Promise<Favorite | undefined>;

  // Menu methods  
  getMenu(id: string): Promise<Menu | undefined>;
  getMenusByUserId(userId: string): Promise<Menu[]>;
  createMenu(menu: InsertMenu): Promise<Menu>;
  updateMenu(id: string, menu: Partial<InsertMenu>): Promise<Menu>;
  deleteMenu(id: string): Promise<void>;

  // Menu item methods
  getMenuItem(id: string): Promise<MenuItem | undefined>;
  getMenuItemsByMenuId(menuId: string): Promise<MenuItem[]>;
  getAllMenuItemsByUserId(userId: string): Promise<MenuItem[]>;
  createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem>;
  updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem>;
  deleteMenuItem(id: string): Promise<void>;
  deleteMenuItemsByMenuId(menuId: string): Promise<void>;

  // Climate impact methods
  getClimateImpactData(productName: string): Promise<{
    gwp_kgco2e_per_kg: number;
    water_l_per_kg: number;
    land_m2_per_kg: number;
    biodiversity_impact: number;
  } | undefined>;

  // Supplements methods
  getAllSupplements(): Promise<Array<typeof supplements.$inferSelect>>;
  getSupplement(name: string): Promise<typeof supplements.$inferSelect | undefined>;
  getSupplementsForDeficiencies(nutritionData: {
    iron?: number;
    zinc?: number;
    calcium?: number;
    proteins?: number;
    vitamine_b12?: number;
    omega3?: number;
  }): Promise<Array<typeof supplements.$inferSelect>>;

  // Animal impact methods
  getAllAnimalImpact(): Promise<Array<typeof animalImpact.$inferSelect>>;
  getAnimalImpactByProduct(productType: string): Promise<typeof animalImpact.$inferSelect | undefined>;

  // Admin stats methods
  getAdminStats(): Promise<{
    recipes: number;
    substitutions: number;
    ciqual_data: number;
    users: number;
    favorites: number;
  }>;

  // Admin user management methods
  getAllUsers(limit?: number, offset?: number): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>>;
  getUsersCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {

  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Recipe methods
  async getRecipe(id: string): Promise<Recipe | undefined> {
    const [recipe] = await db.select().from(recipes).where(eq(recipes.id, id));
    return recipe || undefined;
  }

  async getRecipeByName(name: string): Promise<Recipe | undefined> {
    const normalizedName = this.normalizeText(name);
    const [recipe] = await db.select().from(recipes).where(
      sql`lower(unaccent(${recipes.nom_recette})) LIKE lower(unaccent(${'%' + normalizedName + '%'}))`
    );
    return recipe || undefined;
  }

  async searchRecipes(query: string): Promise<Recipe[]> {
    const normalizedQuery = this.normalizeText(query);
    return await db.select().from(recipes).where(
      sql`lower(unaccent(${recipes.nom_recette})) LIKE lower(unaccent(${'%' + normalizedQuery + '%'}))`
    ).limit(10);
  }

  async createRecipe(insertRecipe: InsertRecipe): Promise<Recipe> {
    const [recipe] = await db.insert(recipes).values(insertRecipe).returning();
    return recipe;
  }

  async updateRecipe(id: string, updateData: Partial<InsertRecipe>): Promise<Recipe> {
    const [recipe] = await db.update(recipes).set(updateData).where(eq(recipes.id, id)).returning();
    if (!recipe) {
      throw new Error('Recipe not found');
    }
    return recipe;
  }

  async deleteRecipe(id: string): Promise<void> {
    await db.delete(recipes).where(eq(recipes.id, id));
  }

  async getAllRecipes(): Promise<Recipe[]> {
    return await db.select().from(recipes);
  }

  async getRecipeSuggestions(query: string, limit: number = 10): Promise<Recipe[]> {
    const normalizedQuery = this.normalizeText(query);
    return await db.select().from(recipes).where(
      sql`lower(unaccent(${recipes.nom_recette})) LIKE lower(unaccent(${'%' + normalizedQuery + '%'}))`
    ).limit(limit);
  }

  // Ingredient substitution methods
  async getSubstitution(originalIngredient: string): Promise<IngredientSubstitution | undefined> {
    const normalizedIngredient = this.normalizeText(originalIngredient);
    const [substitution] = await db.select().from(ingredientSubstitutions).where(
      sql`lower(unaccent(${ingredientSubstitutions.original_ingredient})) LIKE lower(unaccent(${'%' + normalizedIngredient + '%'}))`
    );
    return substitution || undefined;
  }

  async getAllSubstitutions(): Promise<IngredientSubstitution[]> {
    return await db.select().from(ingredientSubstitutions);
  }

  async createSubstitution(insertSubstitution: InsertIngredientSubstitution): Promise<IngredientSubstitution> {
    const [substitution] = await db.insert(ingredientSubstitutions).values(insertSubstitution).returning();
    return substitution;
  }

  async updateSubstitution(id: string, updateData: Partial<InsertIngredientSubstitution>): Promise<IngredientSubstitution> {
    const [substitution] = await db.update(ingredientSubstitutions).set(updateData).where(eq(ingredientSubstitutions.id, id)).returning();
    if (!substitution) {
      throw new Error('Substitution not found');
    }
    return substitution;
  }

  async deleteSubstitution(id: string): Promise<void> {
    await db.delete(ingredientSubstitutions).where(eq(ingredientSubstitutions.id, id));
  }

  // Ciqual data methods
  async getCiqualData(ingredientName: string): Promise<CiqualData | undefined> {
    const normalizedName = this.normalizeText(ingredientName);
    
    // Try exact match first
    let [data] = await db.select().from(ciqualData).where(
      sql`lower(unaccent(${ciqualData.alim_nom_fr})) = lower(unaccent(${normalizedName}))`
    );
    
    if (data) return data;
    
    // Try match starting with ingredient name (e.g., "Poulet, viande..." for "poulet")
    [data] = await db.select().from(ciqualData).where(
      sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${normalizedName + ',%'})) 
          OR lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${normalizedName + ' %'}))`
    ).limit(1);
    
    if (data) return data;
    
    // Fallback to broader search, but exclude composed dishes
    const excludeWords = ['salade', 'soupe', 'plat', 'pizza', 'burger', 'sandwich', 
                          'préemballé', 'préparé', 'tajine', 'couscous', 'pastilla',
                          'pâtes', 'riz avec', 'poêlée'];
    
    const results = await db.select().from(ciqualData).where(
      sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${'%' + normalizedName + '%'}))`
    );
    
    // Filter out composed dishes and prioritize simple ingredients
    const filtered = results.filter(item => {
      const itemName = item.alim_nom_fr.toLowerCase();
      return !excludeWords.some(word => itemName.includes(word));
    });
    
    return filtered[0] || results[0] || undefined;
  }

  async getAllCiqualData(): Promise<CiqualData[]> {
    return await db.select().from(ciqualData);
  }

  async createCiqualData(insertData: InsertCiqualData): Promise<CiqualData> {
    const [data] = await db.insert(ciqualData).values(insertData).returning();
    return data;
  }

  async searchCiqualData(query: string): Promise<CiqualData[]> {
    const normalizedQuery = this.normalizeText(query);
    return await db.select().from(ciqualData).where(
      sql`lower(unaccent(${ciqualData.alim_nom_fr})) LIKE lower(unaccent(${'%' + normalizedQuery + '%'}))`
    ).limit(10);
  }

  // Favorites methods
  async getFavorite(id: string): Promise<Favorite | undefined> {
    const [favorite] = await db.select().from(favorites).where(eq(favorites.id, id));
    return favorite || undefined;
  }

  async getAllFavorites(): Promise<Favorite[]> {
    return await db.select().from(favorites).orderBy(sql`${favorites.created_at} DESC`);
  }

  async createFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const [favorite] = await db.insert(favorites).values(insertFavorite).returning();
    return favorite;
  }

  async deleteFavorite(id: string): Promise<void> {
    await db.delete(favorites).where(eq(favorites.id, id));
  }

  async getFavoriteByRecipeName(recipeName: string): Promise<Favorite | undefined> {
    const normalizedName = this.normalizeText(recipeName);
    const [favorite] = await db.select().from(favorites).where(
      sql`lower(unaccent(${favorites.recipe_name})) = lower(unaccent(${normalizedName}))`
    );
    return favorite || undefined;
  }

  async getFavoritesByUserId(userId: string): Promise<Favorite[]> {
    return await db.select().from(favorites).where(eq(favorites.user_id, userId));
  }

  async getFavoriteByUserAndRecipeName(userId: string, recipeName: string): Promise<Favorite | undefined> {
    const normalizedName = this.normalizeText(recipeName);
    const [favorite] = await db.select().from(favorites).where(
      sql`${favorites.user_id} = ${userId} AND lower(unaccent(${favorites.recipe_name})) = lower(unaccent(${normalizedName}))`
    );
    return favorite || undefined;
  }

  // Menu methods
  async getMenu(id: string): Promise<Menu | undefined> {
    const [menu] = await db.select().from(menus).where(eq(menus.id, id));
    return menu || undefined;
  }

  async getMenusByUserId(userId: string): Promise<Menu[]> {
    return await db.select().from(menus).where(eq(menus.user_id, userId));
  }

  async createMenu(menu: InsertMenu): Promise<Menu> {
    const [newMenu] = await db.insert(menus).values(menu).returning();
    return newMenu;
  }

  async updateMenu(id: string, menu: Partial<InsertMenu>): Promise<Menu> {
    const [updatedMenu] = await db
      .update(menus)
      .set(menu)
      .where(eq(menus.id, id))
      .returning();
    return updatedMenu;
  }

  async deleteMenu(id: string): Promise<void> {
    // First delete all menu items associated with this menu
    await this.deleteMenuItemsByMenuId(id);
    // Then delete the menu itself
    await db.delete(menus).where(eq(menus.id, id));
  }

  // Menu item methods
  async getMenuItem(id: string): Promise<MenuItem | undefined> {
    const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return menuItem || undefined;
  }

  async getMenuItemsByMenuId(menuId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems).where(eq(menuItems.menu_id, menuId));
  }

  async getAllMenuItemsByUserId(userId: string): Promise<MenuItem[]> {
    return await db.select().from(menuItems)
      .innerJoin(menus, eq(menuItems.menu_id, menus.id))
      .where(eq(menus.user_id, userId))
      .then(results => results.map(row => row.menu_items));
  }

  async createMenuItem(menuItem: InsertMenuItem): Promise<MenuItem> {
    const [newMenuItem] = await db.insert(menuItems).values(menuItem).returning();
    return newMenuItem;
  }

  async updateMenuItem(id: string, menuItem: Partial<InsertMenuItem>): Promise<MenuItem> {
    const [updatedMenuItem] = await db
      .update(menuItems)
      .set(menuItem)
      .where(eq(menuItems.id, id))
      .returning();
    return updatedMenuItem;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
  }

  async deleteMenuItemsByMenuId(menuId: string): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.menu_id, menuId));
  }

  // Climate impact methods
  async getClimateImpactData(productName: string): Promise<{
    gwp_kgco2e_per_kg: number;
    water_l_per_kg: number;
    land_m2_per_kg: number;
    biodiversity_impact: number;
  } | undefined> {
    const normalizedName = this.normalizeText(productName);
    const [climateData] = await db
      .select({
        gwp_kgco2e_per_kg: climateImpactMetrics.gwp_kgco2e_per_kg,
        water_l_per_kg: climateImpactMetrics.water_l_per_kg,
        land_m2_per_kg: climateImpactMetrics.land_m2_per_kg,
        biodiversity_impact: climateImpactMetrics.biodiversity_impact,
      })
      .from(climateImpactMetrics)
      .innerJoin(climateProducts, eq(climateImpactMetrics.product_id, climateProducts.id))
      .where(eq(climateProducts.normalized_name, normalizedName));
    
    // Handle nullable values safely
    if (!climateData || climateData.gwp_kgco2e_per_kg === null || 
        climateData.water_l_per_kg === null || climateData.land_m2_per_kg === null || 
        climateData.biodiversity_impact === null) {
      return undefined;
    }
    
    return {
      gwp_kgco2e_per_kg: climateData.gwp_kgco2e_per_kg,
      water_l_per_kg: climateData.water_l_per_kg,
      land_m2_per_kg: climateData.land_m2_per_kg,
      biodiversity_impact: climateData.biodiversity_impact,
    };
  }

  // Supplements storage methods
  async getAllSupplements() {
    return await db.select().from(supplements);
  }

  async getSupplement(name: string) {
    const normalizedName = this.normalizeText(name);
    const [supplement] = await db
      .select()
      .from(supplements)
      .where(eq(sql`lower(${supplements.name})`, normalizedName.toLowerCase()));
    
    return supplement;
  }

  async getSupplementsForDeficiencies(nutritionData: {
    iron?: number;
    zinc?: number;
    calcium?: number;
    proteins?: number;
    vitamine_b12?: number;
    omega3?: number;
  }) {
    const recommendedSupplements = [];
    
    // Always recommend B12 and Omega-3 for vegan diets
    const b12Supplement = await this.getSupplement('Vitamine B12 Vegan');
    const omega3Supplement = await this.getSupplement('Omega 3 Vegan');
    
    if (b12Supplement) recommendedSupplements.push(b12Supplement);
    if (omega3Supplement) recommendedSupplements.push(omega3Supplement);
    
    // Check for other deficiencies based on thresholds
    if (nutritionData.iron && nutritionData.iron < 6) {
      const ironSupplement = await this.getSupplement('Fer bisglycinate');
      if (ironSupplement) recommendedSupplements.push(ironSupplement);
    }
    
    if (nutritionData.zinc && nutritionData.zinc < 6) {
      const zincSupplement = await this.getSupplement('Zinc bisglycinate');
      if (zincSupplement) recommendedSupplements.push(zincSupplement);
    }
    
    if (nutritionData.calcium && nutritionData.calcium < 350) {
      const calciumSupplement = await this.getSupplement('Calcium + Vitamine D3');
      if (calciumSupplement) recommendedSupplements.push(calciumSupplement);
    }
    
    if (nutritionData.proteins && nutritionData.proteins < 15) {
      const proteinSupplement = await this.getSupplement('Spiruline');
      if (proteinSupplement) recommendedSupplements.push(proteinSupplement);
    }
    
    return recommendedSupplements;
  }

  // Animal impact methods implementation
  async getAllAnimalImpact(): Promise<Array<typeof animalImpact.$inferSelect>> {
    try {
      return await db.select().from(animalImpact);
    } catch (error) {
      console.error("Error fetching animal impact data:", error);
      return [];
    }
  }

  async getAnimalImpactByProduct(productType: string): Promise<typeof animalImpact.$inferSelect | undefined> {
    try {
      const result = await db
        .select()
        .from(animalImpact)
        .where(eq(animalImpact.animal_product_type, productType))
        .limit(1);
      
      return result[0];
    } catch (error) {
      console.error(`Error fetching animal impact for ${productType}:`, error);
      return undefined;
    }
  }

  // Admin stats methods
  async getAdminStats(): Promise<{
    recipes: number;
    substitutions: number;
    ciqual_data: number;
    users: number;
    favorites: number;
  }> {
    const [recipesCount, substitutionsCount, ciqualCount, usersCount, favoritesCount] = await Promise.all([
      this.getAllRecipes().then(r => r.length),
      this.getAllSubstitutions().then(s => s.length),
      this.getAllCiqualData().then(c => c.length),
      this.getUsersCount(),
      this.getAllFavorites().then(f => f.length)
    ]);

    return {
      recipes: recipesCount,
      substitutions: substitutionsCount,
      ciqual_data: ciqualCount,
      users: usersCount,
      favorites: favoritesCount,
    };
  }

  // Admin user management methods
  async getAllUsers(limit: number = 20, offset: number = 0): Promise<Array<{
    id: string;
    email: string | null;
    firstName: string | null;
    lastName: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
  }>> {
    return await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    }).from(users).limit(limit).offset(offset);
  }

  async getUsersCount(): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` }).from(users);
    return Number(result[0]?.count) || 0;
  }

  // Helper method to normalize text for French language support
  private normalizeText(text: string): string {
    return text.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // Remove accents
      .trim();
  }
}

export const storage = new DatabaseStorage();
