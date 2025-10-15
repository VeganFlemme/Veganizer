import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { veganizerService } from "./services/veganizer";
import { CSVImporter } from "./services/csvImporter";
import { insertFavoriteSchema, recipeConversionRequestSchema, recipeConversionResponseSchema, insertMenuSchema, insertMenuItemSchema, addRecipeToMenuSchema, type RecipeConversionResponse, type Favorite } from "@shared/schema";
import { z } from "zod";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { adminOnly, adminLogin, adminMe, adminLogout } from "./adminAuth";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware - referencing blueprint:javascript_log_in_with_replit
  await setupAuth(app);
  // Initialize CSV import on startup
  const csvImporter = new CSVImporter();
  csvImporter.importAll().catch(console.error);

  // Auth routes - referencing blueprint:javascript_log_in_with_replit
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Recipe endpoints for users
  app.get('/api/recipes/all', async (req, res) => {
    try {
      const recipes = await storage.getAllRecipes();
      const recipeNames = recipes.map(recipe => recipe.nom_recette).filter(Boolean);
      res.json({
        success: true,
        data: recipeNames
      });
    } catch (error) {
      console.error('Error fetching all recipes:', error);
      res.status(500).json({ 
        success: false, 
        error: 'Failed to fetch recipes' 
      });
    }
  });

  // Admin authentication routes
  app.post('/api/admin/login', adminLogin);
  app.get('/api/admin/me', adminMe);
  app.post('/api/admin/logout', adminLogout);

  // Admin CRUD APIs - Recipes
  app.get('/api/admin/recipes', adminOnly, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const query = req.query.q as string;
      
      let recipes;
      if (query) {
        recipes = await storage.searchRecipes(query);
      } else {
        recipes = await storage.getAllRecipes();
      }
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const paginatedRecipes = recipes.slice(startIndex, startIndex + limit);
      
      res.json({
        data: paginatedRecipes,
        pagination: {
          page,
          limit,
          total: recipes.length,
          totalPages: Math.ceil(recipes.length / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching recipes:', error);
      res.status(500).json({ error: 'Failed to fetch recipes' });
    }
  });

  app.post('/api/admin/recipes', adminOnly, async (req, res) => {
    try {
      const insertRecipeSchema = z.object({
        nom_recette: z.string().min(1, 'Recipe name is required'),
        ingredient_1: z.string().optional(),
        ingredient_2: z.string().optional(),
        ingredient_3: z.string().optional(),
        ingredient_4: z.string().optional(),
        ingredient_5: z.string().optional(),
        ingredient_6: z.string().optional(),
      });
      
      const validatedData = insertRecipeSchema.parse(req.body);
      const recipe = await storage.createRecipe(validatedData);
      res.status(201).json(recipe);
    } catch (error) {
      console.error('Error creating recipe:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create recipe' });
    }
  });

  app.patch('/api/admin/recipes/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updateRecipeSchema = z.object({
        nom_recette: z.string().min(1).optional(),
        ingredient_1: z.string().optional(),
        ingredient_2: z.string().optional(),
        ingredient_3: z.string().optional(),
        ingredient_4: z.string().optional(),
        ingredient_5: z.string().optional(),
        ingredient_6: z.string().optional(),
      });
      
      const validatedData = updateRecipeSchema.parse(req.body);
      const recipe = await storage.updateRecipe(id, validatedData);
      res.json(recipe);
    } catch (error: any) {
      console.error('Error updating recipe:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      if (error.message === 'Recipe not found') {
        return res.status(404).json({ error: 'Recipe not found' });
      }
      res.status(500).json({ error: 'Failed to update recipe' });
    }
  });

  app.delete('/api/admin/recipes/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecipe(id);
      res.json({ message: 'Recipe deleted successfully' });
    } catch (error) {
      console.error('Error deleting recipe:', error);
      res.status(500).json({ error: 'Failed to delete recipe' });
    }
  });

  // Admin CRUD APIs - Substitutions
  app.get('/api/admin/substitutions', adminOnly, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const substitutions = await storage.getAllSubstitutions();
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const paginatedSubstitutions = substitutions.slice(startIndex, startIndex + limit);
      
      res.json({
        data: paginatedSubstitutions,
        pagination: {
          page,
          limit,
          total: substitutions.length,
          totalPages: Math.ceil(substitutions.length / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching substitutions:', error);
      res.status(500).json({ error: 'Failed to fetch substitutions' });
    }
  });

  app.post('/api/admin/substitutions', adminOnly, async (req, res) => {
    try {
      const insertSubstitutionSchema = z.object({
        original_ingredient: z.string().min(1, 'Original ingredient is required'),
        vegan_substitute: z.string().min(1, 'Vegan substitute is required'),
        conversion_ratio: z.number().positive().default(1),
        category: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const validatedData = insertSubstitutionSchema.parse(req.body);
      const substitution = await storage.createSubstitution(validatedData);
      res.status(201).json(substitution);
    } catch (error) {
      console.error('Error creating substitution:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      res.status(500).json({ error: 'Failed to create substitution' });
    }
  });

  app.patch('/api/admin/substitutions/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      const updateSubstitutionSchema = z.object({
        original_ingredient: z.string().min(1).optional(),
        vegan_substitute: z.string().min(1).optional(),
        conversion_ratio: z.number().positive().optional(),
        category: z.string().optional(),
        notes: z.string().optional(),
      });
      
      const validatedData = updateSubstitutionSchema.parse(req.body);
      const substitution = await storage.updateSubstitution(id, validatedData);
      res.json(substitution);
    } catch (error: any) {
      console.error('Error updating substitution:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Invalid request data', details: error.errors });
      }
      if (error.message === 'Substitution not found') {
        return res.status(404).json({ error: 'Substitution not found' });
      }
      res.status(500).json({ error: 'Failed to update substitution' });
    }
  });

  app.delete('/api/admin/substitutions/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteSubstitution(id);
      res.json({ message: 'Substitution deleted successfully' });
    } catch (error) {
      console.error('Error deleting substitution:', error);
      res.status(500).json({ error: 'Failed to delete substitution' });
    }
  });

  // Admin Stats - Extended metrics
  app.get('/api/admin/stats', adminOnly, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      
      res.json({
        ...stats,
        timestamp: new Date().toISOString(),
        database_status: 'connected'
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });

  // Admin Users - Read only initially
  app.get('/api/admin/users', adminOnly, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;
      
      const [paginatedUsers, totalUsers] = await Promise.all([
        storage.getAllUsers(limit, offset),
        storage.getUsersCount()
      ]);
      
      res.json({
        data: paginatedUsers,
        pagination: {
          page,
          limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    }
  });

  // Admin Favorites - Read and delete operations
  app.get('/api/admin/favorites', adminOnly, async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      let allFavorites;
      if (userId) {
        allFavorites = await storage.getFavoritesByUserId(userId);
      } else {
        allFavorites = await storage.getAllFavorites();
      }
      
      // Simple pagination
      const startIndex = (page - 1) * limit;
      const paginatedFavorites = allFavorites.slice(startIndex, startIndex + limit);
      
      res.json({
        data: paginatedFavorites,
        pagination: {
          page,
          limit,
          total: allFavorites.length,
          totalPages: Math.ceil(allFavorites.length / limit)
        }
      });
    } catch (error) {
      console.error('Error fetching favorites:', error);
      res.status(500).json({ error: 'Failed to fetch favorites' });
    }
  });

  app.delete('/api/admin/favorites/:id', adminOnly, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFavorite(id);
      res.json({ message: 'Favorite deleted successfully' });
    } catch (error) {
      console.error('Error deleting favorite:', error);
      res.status(500).json({ error: 'Failed to delete favorite' });
    }
  });

  // Search recipes endpoint
  app.get("/api/recipes/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query || query.length < 2) {
        return res.json([]);
      }

      const suggestions = await veganizerService.searchRecipes(query);
      res.json(suggestions);
    } catch (error) {
      console.error("Error searching recipes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Convert recipe endpoint
  app.post("/api/recipes/convert", async (req, res) => {
    try {
      const requestData = recipeConversionRequestSchema.parse(req.body);
      
      const conversion = await veganizerService.convertRecipe(requestData.recipeName);
      
      // Validate the conversion response against schema before sending
      const validationResult = recipeConversionResponseSchema.safeParse(conversion);
      if (!validationResult.success) {
        console.error('Invalid conversion response schema:', validationResult.error.errors);
        // Ensure animalSavings is present with default values if missing
        if (!conversion.animalSavings) {
          conversion.animalSavings = {
            totalAnimals: 0,
            animalBreakdown: { cows: 0, pigs: 0, chickens: 0, fish: 0, dairy_cows: 0, hens: 0 },
            lifeYearsSaved: 0,
            details: []
          };
        }
      }
      
      res.json(conversion);
    } catch (error) {
      console.error("Error converting recipe:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get all recipes endpoint
  app.get("/api/recipes", async (req, res) => {
    try {
      const recipes = await storage.getAllRecipes();
      res.json(recipes);
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Trigger manual CSV import endpoint (admin only)
  app.post("/api/import", adminOnly, async (req, res) => {
    try {
      await csvImporter.importAll();
      res.json({ message: "Import completed successfully" });
    } catch (error) {
      console.error("Error during manual import:", error);
      res.status(500).json({ error: "Import failed" });
    }
  });

  // Migrate favorites data (admin only) - fix missing animalSavings
  app.post("/api/admin/migrate-favorites", adminOnly, async (req, res) => {
    try {
      const allFavorites = await storage.getAllFavorites();
      let migratedCount = 0;
      
      for (const favorite of allFavorites) {
        try {
          const parsedData = JSON.parse(favorite.recipe_data);
          const validationResult = recipeConversionResponseSchema.safeParse(parsedData);
          
          if (!validationResult.success) {
            // Check if missing animalSavings specifically
            const hasAnimalSavingsError = validationResult.error.errors.some(
              err => err.path.includes('animalSavings')
            );
            
            if (hasAnimalSavingsError && !parsedData.animalSavings) {
              // Add default animalSavings structure
              parsedData.animalSavings = {
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
              
              // Update the favorite with corrected data by deleting and recreating
              await storage.deleteFavorite(favorite.id);
              await storage.createFavorite({
                user_id: favorite.user_id,
                recipe_name: favorite.recipe_name,
                vegan_recipe_name: favorite.vegan_recipe_name,
                recipe_data: JSON.stringify(parsedData)
              });
              migratedCount++;
            }
          }
        } catch (parseError) {
          console.warn(`Skipping favorite ${favorite.id} - JSON parse error:`, parseError);
        }
      }
      
      res.json({ 
        message: `Migration completed successfully. ${migratedCount} favorites updated.`,
        migratedCount,
        totalFavorites: allFavorites.length
      });
    } catch (error) {
      console.error("Error during favorites migration:", error);
      res.status(500).json({ error: "Migration failed" });
    }
  });

  // Backup project endpoint (admin only)
  app.get("/api/admin/backup", adminOnly, async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const path = (await import("path")).default;
      
      const archive = archiver("zip", {
        zlib: { level: 9 }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `veganizer-backup-${timestamp}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      archive.on('error', (err: Error) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create backup' });
      });
      
      archive.pipe(res);
      
      // Add all files except node_modules, .git, and other unnecessary directories
      archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: [
          'node_modules/**',
          '.git/**',
          '.replit/**',
          '.config/**',
          '.cache/**',
          'dist/**',
          'build/**',
          '.upm/**',
          '*.log',
          '.env',
          '.env.local'
        ],
        dot: true
      });
      
      await archive.finalize();
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Public backup project endpoint
  app.get("/api/backup", async (req, res) => {
    try {
      const archiver = (await import("archiver")).default;
      const path = (await import("path")).default;
      
      const archive = archiver("zip", {
        zlib: { level: 9 }
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `veganizer-backup-${timestamp}.zip`;
      
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      archive.on('error', (err: Error) => {
        console.error('Archive error:', err);
        res.status(500).json({ error: 'Failed to create backup' });
      });
      
      archive.pipe(res);
      
      // Add all files except node_modules, .git, and other unnecessary directories
      archive.glob('**/*', {
        cwd: process.cwd(),
        ignore: [
          'node_modules/**',
          '.git/**',
          '.replit/**',
          '.config/**',
          '.cache/**',
          'dist/**',
          'build/**',
          '.upm/**',
          '*.log',
          '.env',
          '.env.local'
        ],
        dot: true
      });
      
      await archive.finalize();
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Failed to create backup" });
    }
  });

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Stats endpoint for data verification
  app.get("/api/stats", async (req, res) => {
    try {
      const recipesCount = await storage.getAllRecipes().then(r => r.length);
      const substitutionsCount = await storage.getAllSubstitutions().then(s => s.length);
      const ciqualCount = await storage.getAllCiqualData().then(c => c.length);
      
      res.json({
        recipes: recipesCount,
        substitutions: substitutionsCount,
        ciqual_data: ciqualCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Get recipe suggestions for autocomplete
  app.get("/api/suggestions", async (req, res) => {
    try {
      const query = req.query.q as string;
      
      if (!query || query.length < 2) {
        return res.json({ success: true, data: [] });
      }

      const suggestions = await storage.getRecipeSuggestions(query, 10);
      res.json({ 
        success: true, 
        data: suggestions.map(recipe => recipe.nom_recette) 
      });
    } catch (error) {
      console.error("Error getting suggestions:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to get suggestions" 
      });
    }
  });

  // Link ingredients to ciqual_data (admin only)
  app.post("/api/link-ingredients", adminOnly, async (req, res) => {
    try {
      const { IngredientLinker } = await import("./services/ingredientLinker");
      const linker = new IngredientLinker();
      
      await linker.linkAllIngredients();
      const stats = await linker.getLinkingStats();
      
      res.json({ 
        message: "Ingredient linking completed successfully",
        stats 
      });
    } catch (error) {
      console.error("Error linking ingredients:", error);
      res.status(500).json({ error: "Failed to link ingredients" });
    }
  });

  // Get ingredient linking statistics
  app.get("/api/ingredient-stats", async (req, res) => {
    try {
      const { IngredientLinker } = await import("./services/ingredientLinker");
      const linker = new IngredientLinker();
      const stats = await linker.getLinkingStats();
      
      res.json(stats);
    } catch (error) {
      console.error("Error getting ingredient stats:", error);
      res.status(500).json({ error: "Failed to get ingredient statistics" });
    }
  });

  // Favorites endpoints - require authentication
  app.get("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getFavoritesByUserId(userId);
      res.json(favorites);
    } catch (error) {
      console.error("Error fetching favorites:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/favorites", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favoriteData = insertFavoriteSchema.parse(req.body);
      
      // Ensure the favorite belongs to the authenticated user
      const favoriteWithUser = { ...favoriteData, user_id: userId };
      
      // Check if recipe is already in user's favorites
      const existing = await storage.getFavoriteByUserAndRecipeName(userId, favoriteData.recipe_name);
      if (existing) {
        return res.status(409).json({ error: "Recipe already in favorites" });
      }

      const favorite = await storage.createFavorite(favoriteWithUser);
      res.json(favorite);
    } catch (error) {
      console.error("Error adding favorite:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/favorites/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if favorite exists and belongs to user
      const existingFavorite = await storage.getFavorite(id);
      if (!existingFavorite) {
        return res.status(404).json({ error: "Favorite not found" });
      }
      
      if (existingFavorite.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteFavorite(id);
      res.json({ message: "Favorite deleted successfully" });
    } catch (error) {
      console.error("Error deleting favorite:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });


  // Menu endpoints - require authentication
  app.get("/api/menus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      let menus = await storage.getMenusByUserId(userId);
      
      // Auto-provision a default menu if user has none
      if (menus.length === 0) {
        const defaultMenu = await storage.createMenu({
          user_id: userId,
          name: "Mon Menu Principal",
          description: "Menu principal créé automatiquement pour organiser vos recettes favorites"
        });
        menus = [defaultMenu];
      }
      
      res.json(menus);
    } catch (error) {
      console.error("Error fetching menus:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/menus", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      // Parse without user_id as we'll add it from the session
      const menuData = insertMenuSchema.omit({ user_id: true }).parse(req.body);
      
      // Ensure the menu belongs to the authenticated user
      const menuWithUser = { ...menuData, user_id: userId };
      
      const menu = await storage.createMenu(menuWithUser);
      res.json(menu);
    } catch (error) {
      console.error("Error creating menu:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/menus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const menu = await storage.getMenu(id);
      
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      // Ensure the menu belongs to the authenticated user
      const userId = req.user.claims.sub;
      if (menu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(menu);
    } catch (error) {
      console.error("Error fetching menu:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.put("/api/menus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu exists and belongs to user
      const existingMenu = await storage.getMenu(id);
      if (!existingMenu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      if (existingMenu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Prevent user_id changes for security
      const menuData = insertMenuSchema.omit({ user_id: true }).partial().parse(req.body);
      const updatedMenu = await storage.updateMenu(id, menuData);
      res.json(updatedMenu);
    } catch (error) {
      console.error("Error updating menu:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/menus/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu exists and belongs to user
      const existingMenu = await storage.getMenu(id);
      if (!existingMenu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      if (existingMenu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteMenu(id);
      res.json({ message: "Menu deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Menu item endpoints - require authentication
  
  // Get all menu items for the authenticated user across all menus
  app.get("/api/menu-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const menuItems = await storage.getAllMenuItemsByUserId(userId);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching all menu items:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/menus/:menuId/items", isAuthenticated, async (req: any, res) => {
    try {
      const { menuId } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu exists and belongs to user
      const menu = await storage.getMenu(menuId);
      if (!menu) {
        return res.status(404).json({ error: "Menu not found" });
      }
      
      if (menu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const menuItems = await storage.getMenuItemsByMenuId(menuId);
      res.json(menuItems);
    } catch (error) {
      console.error("Error fetching menu items:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Add recipe from database (convert -> favorite -> menu item)
  app.post("/api/menus/:menuId/items", isAuthenticated, async (req: any, res) => {
    try {
      const { menuId } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu exists and belongs to user
      const menu = await storage.getMenu(menuId);
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      if (menu.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Parse the frontend payload (recipe_name, servings, day_of_week)
      const addRecipeData = addRecipeToMenuSchema.parse(req.body);
      
      // Step 1: Convert the recipe using veganizer service
      const conversionResult = await veganizerService.convertRecipe(addRecipeData.recipe_name);
      if (!conversionResult) {
        return res.status(404).json({ message: "Recipe not found or conversion failed" });
      }
      
      // Step 2: Upsert favorite for this user (handle uniqueness on user_id + recipe_name)
      let favorite: Favorite;
      try {
        // Try to get existing favorite first
        const existingFavorites = await storage.getFavoritesByUserId(userId);
        const existingFavorite = existingFavorites.find(fav => 
          fav.recipe_name?.toLowerCase() === addRecipeData.recipe_name.toLowerCase()
        );
        
        if (existingFavorite) {
          favorite = existingFavorite;
        } else {
          // Create new favorite
          const favoriteData = {
            user_id: userId,
            recipe_name: conversionResult.originalRecipe.name,
            vegan_recipe_name: conversionResult.veganRecipe.name,
            recipe_data: JSON.stringify(conversionResult),
          };
          
          favorite = await storage.createFavorite(favoriteData);
        }
      } catch (favoriteError) {
        console.error("Error creating/getting favorite:", favoriteError);
        return res.status(500).json({ message: "Failed to create recipe favorite" });
      }
      
      // Step 3: Create menu item with the favorite_id
      const menuItemData = {
        menu_id: menuId,
        favorite_id: favorite.id,
        day_of_week: addRecipeData.day_of_week || null,
        servings: addRecipeData.servings,
        position: 0,
      };
      
      const menuItem = await storage.createMenuItem(menuItemData);
      res.json(menuItem);
      
    } catch (error) {
      console.error("Error creating menu item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Add existing favorite to menu (direct favorite -> menu item)
  app.post("/api/menus/:menuId/items-from-favorite", isAuthenticated, async (req: any, res) => {
    try {
      const { menuId } = req.params;
      const userId = req.user.claims.sub;
      
      // Validate request body
      const addFavoriteSchema = z.object({
        favorite_id: z.string().min(1, "Favorite ID is required"),
        day_of_week: z.string().optional(),
        servings: z.number().min(0.1).max(10).default(1),
      });
      
      const addFavoriteData = addFavoriteSchema.parse(req.body);
      
      // Check if menu exists and belongs to user
      const menu = await storage.getMenu(menuId);
      if (!menu) {
        return res.status(404).json({ message: "Menu not found" });
      }
      
      if (menu.user_id !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      // Verify favorite exists and belongs to user
      const userFavorites = await storage.getFavoritesByUserId(userId);
      const favorite = userFavorites.find(fav => fav.id === addFavoriteData.favorite_id);
      
      if (!favorite) {
        return res.status(404).json({ message: "Favorite not found or access denied" });
      }
      
      // Create menu item with the favorite_id
      const menuItemData = {
        menu_id: menuId,
        favorite_id: addFavoriteData.favorite_id,
        day_of_week: addFavoriteData.day_of_week || null,
        servings: addFavoriteData.servings,
        position: 0,
      };
      
      const menuItem = await storage.createMenuItem(menuItemData);
      res.json(menuItem);
      
    } catch (error) {
      console.error("Error adding favorite to menu:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.put("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu item exists and belongs to user's menu
      const existingMenuItem = await storage.getMenuItem(id);
      if (!existingMenuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      const menu = await storage.getMenu(existingMenuItem.menu_id);
      if (!menu || menu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      // Prevent menu_id changes for security
      const menuItemData = insertMenuItemSchema.omit({ menu_id: true }).partial().parse(req.body);
      const updatedMenuItem = await storage.updateMenuItem(id, menuItemData);
      res.json(updatedMenuItem);
    } catch (error) {
      console.error("Error updating menu item:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/menu-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      
      // First check if menu item exists and belongs to user's menu
      const existingMenuItem = await storage.getMenuItem(id);
      if (!existingMenuItem) {
        return res.status(404).json({ error: "Menu item not found" });
      }
      
      const menu = await storage.getMenu(existingMenuItem.menu_id);
      if (!menu || menu.user_id !== userId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      await storage.deleteMenuItem(id);
      res.json({ message: "Menu item deleted successfully" });
    } catch (error) {
      console.error("Error deleting menu item:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Supplements endpoint
  app.get("/api/supplements", async (req, res) => {
    try {
      const supplements = await storage.getAllSupplements();
      res.json({
        success: true,
        data: supplements
      });
    } catch (error) {
      console.error("Error fetching supplements:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch supplements" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
