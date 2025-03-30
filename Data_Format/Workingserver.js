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
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]/gu, "") // Allow all Unicode letters and numbers
    .replace(/s$/, ""); // Optionally remove trailing 's'
};

// --- API Endpoint ---
app.post("/api/chat", (req, res) => {
  const query = req.body.message?.trim().toLowerCase();
  if (!query || query.length < 1) {
    return res.status(400).json({
      answer: "Please ask for a recipe by name (at least 1 characters).",
      source: "input-error",
    });
  }

  console.log(`\n🔍 Recipe query: "${query}"`);

  // Check if the query is asking for a specific recipe
  if (
    query.includes("bengali recipies") ||
    query.includes("bengali recipe") ||
    query.includes("bengali recipes")
  ) {
    // Take first 100 entries using slice()
    const limitedRecipes = recipes.slice(0, 100);

    let responseText = `------------------------------<b>Bengali Recipes</b>-----------------------<br><br>`;

    limitedRecipes.forEach((recipe, index) => {
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });

    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  if (
    query.includes("japanese recipies") ||
    query.includes("japanese recipe") ||
    query.includes("japanese recipes") ||
    query.includes("japanese recipie")
  ) {
    const limitedRecipes = recipes.slice(100, 188);

    let responseText = `------------------------------<b>Japanese Recipes</b>-----------------------<br><br>`;

    limitedRecipes.forEach((recipe, index) => {
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });

    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  if (
    query.includes("italian recipies") ||
    query.includes("italian recipe") ||
    query.includes("italian recipes") ||
    query.includes("italian recipie")
  ) {
    const limitedRecipes = recipes.slice(188, 284);

    let responseText = `------------------------------<b>Italian Recipes</b>-----------------------<br><br>`;

    limitedRecipes.forEach((recipe, index) => {
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });

    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  if (
    query.includes("chinese recipies") ||
    query.includes("chinese recipe") ||
    query.includes("chinese recipes") ||
    query.includes("chinese recipie")
  ) {
    const limitedRecipes = recipes.slice(284, 384);

    let responseText = `------------------------------<b>Chinese Recipes</b>-----------------------<br><br>`;

    limitedRecipes.forEach((recipe, index) => {
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });

    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  // Check if the query asks for all recipes
  if (
    query.includes("all recipe") ||
    query.includes("all recipes") ||
    query.includes("list of recipes") ||
    query.includes("available recipes") ||
    query.includes("recipe list") ||
    query.includes("recipe names") ||
    query.includes("all recipie") ||
    query.includes("all recipies")
  ) {
    let responseText =
      "------------------------------<b>Bengali Recipes</b>-----------------------<br><br>";
    recipes.forEach((recipe, index) => {
      // Insert Japanese Recipes header after 100 recipes
      if (index === 100) {
        responseText +=
          "<br>------------------------------<b>Japanese Recipes</b>----------------------<br><br>";
      }
      if (index === 188) {
        responseText +=
          "<br>------------------------------<b>Italian Recipes</b>----------------------<br><br>";
      }
      if (index === 284) {
        responseText +=
          "<br>------------------------------<b>Chinese Recipes</b>----------------------<br><br>";
      }
      responseText += `${index + 1}. ${recipe.name}<br>`;
    });
    return res.json({
      answer: responseText,
      source: "Recipe Database",
      confidence: 1.0,
    });
  }

  // Improved matching with aliases support and partial matching
  // Split the query into tokens before normalizing
  const queryTokens = query.split(" ").map((token) => normalizeString(token));

  const matchedRecipes = recipes
    .map((recipe) => {
      // Combine main name and aliases
      const allNames = [recipe.name, ...(recipe.aliases || [])];
      // Normalize each name
      const normalizedNames = allNames.map(normalizeString);
      // Check for matches: if any query token is found in any normalized name (or vice versa)
      const tokenMatches = queryTokens.filter((token) =>
        normalizedNames.some((n) => n.includes(token) || token.includes(n))
      );
      return {
        ...recipe,
        normalizedNames,
        matchStrength:
          tokenMatches.length > 0
            ? Math.max(...tokenMatches.map((t) => t.length))
            : 0,
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
