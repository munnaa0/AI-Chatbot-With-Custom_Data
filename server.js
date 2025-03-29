const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Load recipes from recipe.json at startup
let recipes = [];
try {
  const data = fs.readFileSync(path.join(__dirname, "recipe.json"), "utf8");
  const jsonData = JSON.parse(data);
  recipes = jsonData.recipes || [];
  console.log(`✅ Loaded ${recipes.length} recipes.`);
} catch (err) {
  console.error("❌ Error loading recipe data:", err.message);
  process.exit(1);
}

// Helper function to normalize names and queries
const normalizeString = (str) => {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // Remove non-alphanumeric characters
    .replace(/\s+/g, "") // Remove whitespace
    .replace(/s$/, ""); // Remove trailing 's' for pluralization
};

// --- API Endpoint ---
app.post("/api/chat", (req, res) => {
  const query = req.body.message?.trim().toLowerCase();
  if (!query || query.length < 3) {
    return res.status(400).json({
      answer: "Please ask for a recipe by name (at least 3 characters).",
      source: "input-error",
    });
  }

  console.log(`\n🔍 Recipe query: "${query}"`);

  // Check if the query asks for all recipes
  if (
    query.includes("all recipe") ||
    query.includes("all recipes") ||
    query.includes("list of recipes") ||
    query.includes("available recipes") ||
    query.includes("recipe list") ||
    query.includes("recipe names") ||
    query.includes("recipe names") ||
    query.includes("all recipie") ||
    query.includes("all recipies") ||
    query.includes("recipe names")
  ) {
    let responseText = "All Available Recipes:<br><br>";
    recipes.forEach((recipe, index) => {
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });
    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  // Improved matching with aliases support
  const normalizedQuery = normalizeString(query);
  const matchedRecipes = recipes
    .map((recipe) => {
      // Combine main name and aliases
      const allNames = [recipe.name, ...(recipe.aliases || [])];
      // Find all normalized versions
      const normalizedNames = allNames.map(normalizeString);
      // Find matching names
      const matches = normalizedNames.filter((n) =>
        normalizedQuery.includes(n)
      );
      return {
        ...recipe,
        normalizedNames,
        matchStrength:
          matches.length > 0 ? Math.max(...matches.map((m) => m.length)) : 0,
      };
    })
    .filter((recipe) => recipe.matchStrength > 0)
    .sort((a, b) => b.matchStrength - a.matchStrength);

  const bestMatch = matchedRecipes[0];

  if (bestMatch) {
    let responseText = `Recipe for ${bestMatch.name.toUpperCase()}`;
    if (bestMatch.aliases) {
      responseText += ` (also known as: ${bestMatch.aliases.join(", ")})`;
    }
    responseText += `:<br><br>Ingredients:<br>`;
    bestMatch.ingredients.forEach((ingredient) => {
      responseText += `- ${ingredient}<br>`;
    });
    responseText += `<br>Instructions:<br>`;
    bestMatch.instructions.forEach((step, index) => {
      responseText += `${index + 1}. ${step}<br>`;
    });

    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  } else {
    return res.json({
      answer:
        "Sorry, I couldn't find a recipe for that dish. Please try another dish name.",
      source: "no-match",
    });
  }
});

// --- Start Server ---
app.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
