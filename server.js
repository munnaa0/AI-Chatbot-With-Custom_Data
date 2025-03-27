const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const natural = require("natural");

const app = express();
const port = 3000;

// Initialize NLP tools
const { PorterStemmer, WordTokenizer, SentenceTokenizer } = natural;
const wordTokenizer = new WordTokenizer();
const sentenceTokenizer = new SentenceTokenizer();
const stopwords = natural.stopwords;

// Configure middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Data containers with validation
let structuredData = null;
let qaData = null;
let textData = null;

// Enhanced tokenization and stemming
function tokenizeAndStem(text) {
  try {
    if (typeof text !== "string") return [];
    return wordTokenizer
      .tokenize(text.toLowerCase())
      .filter((token) => token.length > 2 && !stopwords.includes(token))
      .map((token) => PorterStemmer.stem(token));
  } catch (error) {
    console.error("Tokenization error:", error);
    return [];
  }
}

// Data validation functions
const validateStructuredData = (data) => {
  if (!data?.Department?.name || !data?.Academics?.programs) {
    throw new Error("Invalid structured data format");
  }
};

const validateQAData = (data) => {
  if (!Array.isArray(data?.qa_pairs) || !data.qa_pairs[0]?.question) {
    throw new Error("Invalid QA data format");
  }
};

// Load and validate data
try {
  // Load structured data
  structuredData = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "data/structured_knowledge.json"),
      "utf8"
    )
  );
  validateStructuredData(structuredData);

  // Load QA data
  qaData = JSON.parse(
    fs.readFileSync(path.join(__dirname, "data/qa_data.json"), "utf8")
  );
  validateQAData(qaData);

  // Load text data
  textData = fs.readFileSync(
    path.join(__dirname, "data/custom_data.txt"),
    "utf8"
  );

  console.log("✅ All data loaded and validated successfully");
} catch (err) {
  console.error("❌ Data initialization failed:", err.message);
  process.exit(1);
}

// Search functions with error handling
function searchQAData(question) {
  try {
    const qTerms = tokenizeAndStem(question);

    // Check QA pairs
    const qaMatch = qaData.qa_pairs.find((pair) => {
      const storedTerms = tokenizeAndStem(pair.question);
      return storedTerms.join(" ") === qTerms.join(" ");
    });

    if (qaMatch)
      return {
        answer: qaMatch.answer,
        source: `QA: ${qaMatch.question.substring(0, 30)}...`,
        confidence: 0.9,
      };

    // Check facts
    const factMatch = qaData.facts.find((fact) => {
      const topicTerms = tokenizeAndStem(fact.topic);
      return topicTerms.some((term) => qTerms.includes(term));
    });

    return factMatch
      ? {
          answer: factMatch.info,
          source: `Fact: ${factMatch.topic}`,
          confidence: 0.7,
        }
      : null;
  } catch (error) {
    console.error("QA Search Error:", error);
    return null;
  }
}

function searchStructuredData(question) {
  try {
    const qTerms = tokenizeAndStem(question);
    const flatData = flattenObject(structuredData);

    const matches = Object.entries(flatData).map(([path, value]) => {
      const pathTerms = tokenizeAndStem(path);
      const valueTerms =
        typeof value === "string" ? tokenizeAndStem(value) : [];
      const score = qTerms.filter((t) =>
        [...pathTerms, ...valueTerms].includes(t)
      ).length;
      return { path, value, score };
    });

    const bestMatch = matches.reduce((a, b) => (b.score > a.score ? b : a), {
      score: 0,
    });

    if (bestMatch.score > 0) {
      return {
        answer: formatStructuredAnswer(bestMatch.value),
        source: `Structured: ${bestMatch.path}`,
        confidence: Math.min(bestMatch.score / 5, 1),
      };
    }
    return null;
  } catch (error) {
    console.error("Structured Search Error:", error);
    return null;
  }
}

// Helper functions
function flattenObject(obj, path = []) {
  return Object.keys(obj).reduce((acc, key) => {
    const currentPath = path.concat(key);
    const value = obj[key];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(acc, flattenObject(value, currentPath));
    } else {
      acc[currentPath.join(".")] = value;
    }
    return acc;
  }, {});
}

function formatStructuredAnswer(value) {
  if (Array.isArray(value))
    return value.map((v, i) => `${i + 1}. ${v}`).join("\n");
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return value.toString();
}

function searchTextData(question) {
  try {
    const qTerms = tokenizeAndStem(question);
    const sentences = sentenceTokenizer.tokenize(textData);

    const sentenceScores = sentences.map((sentence) => ({
      sentence,
      score: tokenizeAndStem(sentence).filter((t) => qTerms.includes(t)).length,
    }));

    const bestMatch = sentenceScores.reduce(
      (a, b) => (b.score > a.score ? b : a),
      { score: 0 }
    );

    return bestMatch.score > 0
      ? {
          answer: bestMatch.sentence,
          source: "Text Knowledge",
          confidence: Math.min(bestMatch.score / 3, 1),
        }
      : null;
  } catch (error) {
    console.error("Text Search Error:", error);
    return null;
  }
}

// API endpoint with comprehensive error handling
app.post("/api/chat", (req, res) => {
  try {
    const question = req.body.message?.trim();

    // Validate input
    if (!question || question.length < 3) {
      return res.status(400).json({
        answer: "Please ask a complete question (at least 3 characters)",
        source: "input-error",
      });
    }

    console.log(`\n🔍 Query: "${question}"`);

    // Execute searches
    const results = [searchQAData, searchStructuredData, searchTextData]
      .map((search) => search(question))
      .filter(Boolean);

    if (results.length > 0) {
      const bestResult = results.reduce((a, b) =>
        b.confidence > a.confidence ? b : a
      );
      console.log(
        `✅ Best match: ${bestResult.source} (${bestResult.confidence.toFixed(
          2
        )})`
      );
      return res.json(bestResult);
    }

    console.log("🔍 No relevant matches found");
    res.json({
      answer:
        "I couldn't find information on that topic. Try asking about:\n- Academic programs\n- Admission requirements\n- Department facilities",
      source: "no-match",
    });
  } catch (error) {
    console.error("🚨 Server Error:", error);
    res.status(500).json({
      answer: "Our system is currently unavailable. Please try again later.",
      source: "server-error",
    });
  }
});

// Start server
app.listen(port, () => {
  console.log(`
🚀 Server running on http://localhost:${port}
📚 Loaded Data:
   - Structured fields: ${Object.keys(structuredData).length}
   - QA pairs: ${qaData.qa_pairs.length}
   - Text sentences: ${sentenceTokenizer.tokenize(textData).length}
    `);
});
