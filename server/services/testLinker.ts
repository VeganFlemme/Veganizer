import { IngredientLinker } from "./ingredientLinker";

// Simple test to debug ingredient linking
async function testLinking() {
  console.log("Testing ingredient linking...");
  
  const linker = new IngredientLinker();
  
  try {
    // Test stats before linking
    const statsBefore = await linker.getLinkingStats();
    console.log("Stats before linking:", statsBefore);
    
    // Run the linking process
    await linker.linkAllIngredients();
    
    // Test stats after linking
    const statsAfter = await linker.getLinkingStats();
    console.log("Stats after linking:", statsAfter);
    
  } catch (error) {
    console.error("Test linking failed:", error);
  }
}

// Export for manual testing
export { testLinking };