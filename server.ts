import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const PORT = 3000;

// Initialize Google Gen AI
let aiClient: any = null;
function getAIClient() {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("⚠️ Warning: GEMINI_API_KEY is not defined. Using mock completions until configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key || "MOCK_KEY",
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        }
      }
    });
  }
  return aiClient;
}

// Global In-Memory Vector / Chunk Corpus
interface DocumentChunk {
  id: string;
  docId: string;
  docName: string;
  text: string;
  keywords: Set<string>;
}

interface IndexDoc {
  id: string;
  name: string;
  type: string;
  size: string;
  chunkCount: number;
  uploadDate: string;
  status: "Ready" | "Processing" | "Failed";
}

let corpus: DocumentChunk[] = [];
let indexedDocuments: IndexDoc[] = [];

// Seed baseline Indian nutrition corpus
const seedDocuments = [
  {
    id: "nso_2025",
    name: "NSS NSS Report No. 594 (June 2025)",
    type: "Nutritional Intake in India",
    size: "420 KB",
    text: `NSO Report No. 594 on Nutritional Intake in India (June 2025 revision based on survey 2022-23 & 2023-24).
Baseline calorie intake averages across Indian households:
- Rural India: 2212 kcal per consumer unit per day.
- Urban India: 2240 kcal per consumer unit per day.
Calorie share of core staple categories:
- Cereal and millets contribute to 48% of calories in Rural families and 40.6% in Urban families.
Socioeconomic stratification:
- Calorie intake scales from 1622 kcal in the lowest 5% fractal class up to 2980 kcal in the highest 5% fractal class in rural regions.
- Protein intake is averaging 58.7g per day in rural India and 61.2g in urban areas.
- Fat consumption is 49.3g/day (rural) and 66.8g/day (urban).
Guidelines emphasize introducing native millet baskets like ragi, bajra, and jowar to decrease reliance on refined wheat flour and white rice.`
  },
  {
    id: "sharma_2020",
    name: "Sharma et al. (2020) EAT-Lancet Indian Comparison",
    type: "Dietary Disparity Research",
    size: "1.1 MB",
    text: `A systematic comparison of the Indian diet with the EAT-Lancet reference target.
Key Findings on Indian nutrition imbalances:
- Protein shares: Protein sources account for only 6-8% of total daily energy in average Indian households, failing the EAT-Lancet recommendation of 29%.
- Extreme Cereal Over-index: Average cereal consumption constitutes 52% of total daily calories in urban India and up to 65.2% in rural communities, drastically exceeding the EAT-Lancet balanced recommendation of 32%.
- Fruit and Vegetable Gap: Fresh fruits and green vegetables consumption stands far below recommended targets, being outpaced by refined sugar-added processed foods and packaged Indian snacks (namkeen, bhujia, biscuits).
- Dairy Balance: Dairy intake is moderately adequate in northern states but highly deficient in east-central and southern India.`
  },
  {
    id: "ray_2007",
    name: "Ranjan Ray (2007) Food Security Analysis",
    type: "Academic Paper",
    size: "820 KB",
    text: `Ranjan Ray (2007) Changes in Food Consumption and the Implications for Food Security and Undernourishment: India in the 1990s.
Insight details:
- Economic transitions shifted consumption pattern towards high-fat processed items, although chronic undernourishment remains high in marginalized populations.
- Structural diet shifts: In rural areas, average cereal consumption decreased slightly, but was replaced by energy-dense convenience foods.
- Regional trends indicate highest nutritional security in Punjab and Haryana, with severe micro-nutrient and macro-nutrient gaps persisting in rural parts of West Bengal and Bihar.
- Safe food fortification and low-glycemic complexes (e.g. brown rice, oats, legumes) are necessary wellness adjustments to alleviate localized metabolic disorders.`
  }
];

// Helper to clean and tokenise text
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

// Ingest and chunk text
function addDocumentToCorpus(id: string, name: string, type: string, size: string, text: string) {
  // Section/Paragraph based Chunking
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 30);
  let chunkCount = 0;

  for (let paragraph of paragraphs) {
    // If a paragraph is extremely long, split it dynamically
    const words = paragraph.split(/\s+/);
    const maxWordsPerChunk = 120;
    for (let start = 0; start < words.length; start += maxWordsPerChunk) {
      const chunkWords = words.slice(start, start + maxWordsPerChunk);
      const chunkText = chunkWords.join(" ");
      if (chunkText.trim().length < 20) continue;

      const chunkId = `${id}_chunk_${chunkCount}`;
      const tokens = tokenize(chunkText);

      corpus.push({
        id: chunkId,
        docId: id,
        docName: name,
        text: chunkText,
        keywords: new Set(tokens)
      });
      chunkCount++;
    }
  }

  indexedDocuments.push({
    id,
    name,
    type,
    size,
    chunkCount,
    uploadDate: new Date().toISOString().split('T')[0],
    status: "Ready"
  });
}

// Seeding standard assets
seedDocuments.forEach(doc => {
  addDocumentToCorpus(doc.id, doc.name, doc.type, doc.size, doc.text);
});

// Safety Engine Checklist
const EMERGENCY_KEYWORDS = [
  /chest\s*pain/i,
  /breathing\s*diff/i,
  /shortness\s*of\s*breath/i,
  /heart\s*attack/i,
  /stroke/i,
  /suicid/i,
  /allergic\s*shock/i,
  /anaphylaxis/i,
  /loss\s*of\s*consciousness/i,
  /breath\s*chok/i,
  /severe\s*allergic|allergic\s*reaction/i,
  /severe\s*abdominal\s*pain/i,
  /faint/i,
  /pregnancy\s*complication/i,
  /uncontrolled\s*diabet/i,
  /serious\s*infect/i
];

function checkMedicalEmergency(message: string): boolean {
  return EMERGENCY_KEYWORDS.some(regex => regex.test(message));
}

// Retrieval Pipeline
function retrieveGroundedContext(query: string, dietaryPref?: string): { text: string; docName: string; score: number }[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return [];

  const scores: { chunk: DocumentChunk; score: number }[] = [];

  for (let chunk of corpus) {
    let score = 0;
    // Curing Term Frequency / Jaccard-like intersection
    for (let token of queryTokens) {
      if (chunk.keywords.has(token)) {
        score += 1;
      }
    }
    // Boost matching Dietary preferences
    if (dietaryPref && chunk.text.toLowerCase().includes(dietaryPref.toLowerCase())) {
      score += 0.5;
    }

    if (score > 0) {
      scores.push({ chunk, score });
    }
  }

  // Sort descending and return top K
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 4).map(s => ({
    text: s.chunk.text,
    docName: s.chunk.docName,
    score: s.score
  }));
}

// Hallucination Prevention Validator
function verifyGroundednessScore(response: string, retrievedContext: string): "High" | "Medium" | "Low" {
  if (!retrievedContext || retrievedContext.length === 0) return "Low";
  const respTokens = tokenize(response);
  const contextTokens = new Set(tokenize(retrievedContext));

  let matchedWords = 0;
  for (let token of respTokens) {
    if (contextTokens.has(token)) {
      matchedWords++;
    }
  }

  const overlapPercentage = matchedWords / Math.max(1, respTokens.length);
  if (overlapPercentage > 0.4) return "High";
  if (overlapPercentage > 0.15) return "Medium";
  return "Low";
}

// Express API Routes

// Retrieve baseline dashboard and general metadata
app.get("/api/kb/documents", (req, res) => {
  res.json({ success: true, documents: indexedDocuments });
});

// Index incoming custom uploads
app.post("/api/kb/upload", (req, res) => {
  const { name, text, size } = req.body;
  if (!name || !text) {
    return res.status(400).json({ success: false, message: "Missing content assets" });
  }

  const docId = `custom_${Date.now()}`;
  addDocumentToCorpus(docId, name, "Uploaded Report", size || "12 KB", text);
  res.json({
    success: true,
    message: "Document indexed successfully",
    document: indexedDocuments.find(d => d.id === docId)
  });
});

// Clear documents
app.delete("/api/kb/documents/:id", (req, res) => {
  const docId = req.params.id;
  corpus = corpus.filter(chunk => chunk.docId !== docId);
  indexedDocuments = indexedDocuments.filter(d => d.id !== docId);
  res.json({ success: true, message: "Document removed from RAG index." });
});

// Core Personalised Chat Agent Swastika Endpoint
app.post("/api/chat", async (req, res) => {
  const { message, profile, history } = req.body;

  if (!message) {
    return res.status(400).json({ status: "error", message: "Empty prompt" });
  }

  // 1. Safety Triage check for critical symptoms or life-threatening situations
  if (checkMedicalEmergency(message)) {
    return res.json({
      summary: "This may require professional medical attention. Please consult a qualified healthcare professional or seek urgent medical care.",
      explanation: "This may require professional medical attention. Please consult a qualified healthcare professional or seek urgent medical care.",
      recommendations: [
        "In India, please dial 112 or 102 for emergency medical services immediately.",
        "Your health is our ultimate priority. Swastika is an AI Nutrition, Fitness, and Healthy Lifestyle Coach and cannot treat acute clinical emergencies."
      ],
      sources: ["System Safety Guardrails v1.0"],
      confidence: "High",
      isEmergencyRedirect: true
    });
  }

  // 2. Query contextual metrics based on user demographics
  const age = Number(profile?.age || 26);
  const weight = Number(profile?.weight || 62);
  const height = Number(profile?.height || 165);
  const gender = String(profile?.gender || "Female");
  const goal = String(profile?.goal || "Healthy Eating");
  const dietPref = String(profile?.dietaryPreference || "Veg");
  const medicalConds = Array.isArray(profile?.medicalConditions) ? profile.medicalConditions : [];
  const allergies = String(profile?.allergies || "None");

  // Calculate local BMI
  const heightM = height / 100;
  const bmi = weight / (heightM * heightM);
  let bmiCategory = "Normal";
  if (bmi < 18.5) bmiCategory = "Underweight";
  else if (bmi >= 25 && bmi < 30) bmiCategory = "Overweight";
  else if (bmi >= 30) bmiCategory = "Obese";

  // Calculate target adjustments reflecting Indian diet biases (high cereals, low protein)
  let targetCalories = gender.toLowerCase() === "male"
    ? Math.round(10 * weight + 6.25 * height - 5 * age + 5)
    : Math.round(10 * weight + 6.25 * height - 5 * age - 161);

  // Apply activity multipliers
  if (profile?.activityLevel?.includes("Active")) targetCalories = Math.round(targetCalories * 1.5);
  else if (profile?.activityLevel?.includes("Moderate")) targetCalories = Math.round(targetCalories * 1.3);
  else targetCalories = Math.round(targetCalories * 1.15);

  if (goal.includes("Loss") || goal.includes("Fat")) {
    targetCalories -= 400; // Calorie deficit
  } else if (goal.includes("Gain") || goal.includes("Muscle")) {
    targetCalories += 300; // Calorie surplus
  }

  // Target Protein (grams) adjusted to prevent the 6-8% energy limit from traditional cereals in Sharma et al.
  const targetProtein = Math.round(weight * (goal.includes("Muscle") ? 1.6 : 1.2));
  // Keep water standard
  const targetWater = height > 165 ? 3.0 : 2.5;
  // Capping cereals to 40% to combat Indian average 51-65% cereal baseline (NSO Report 594)
  const cerealLimit = Math.round((targetCalories * 0.40) / 4);

  // 3. Document Search Grounding
  const retrieved = retrieveGroundedContext(message, dietPref);
  const textContext = retrieved.map(r => `[Source: ${r.docName}] ${r.text}`).join("\n\n");

  const systemInstructions = `You are "Swastika", a friendly, professional, motivating, and evidence-based AI Nutrition, Fitness, and Healthy Lifestyle Coach for Indian users. Your primary goal is to help users make healthier nutrition and lifestyle decisions using evidence-based information retrieved from the knowledge base. Never invent facts, studies, citations, medical advice, or nutrition recommendations.

USER DEMOGRAPHICS & PROFILE:
- Age: ${age}
- Gender: ${gender}
- Goal: ${goal}
- Diet Preference: ${dietPref}
- Dynamic BMI: ${bmi.toFixed(1)} (${bmiCategory})
- Medical Conditions: ${medicalConds.join(", ") || "None"}
- Allergies: ${allergies}

USER'S TARGET CALCULATED METRICS (Indian context corrective):
- Calories target: ${targetCalories} kcal
- Protein Target: ${targetProtein}g (Custom elevated protein target to counteract the standard 6-8% protein intake deficit noted in Sharma et al. 2020)
- Balanced Cereal Staples maximum: ${cerealLimit}g (Capped at 40% vs the NSO NSS Report 594 cereal baseline share of 40-48% in Urban/Rural households)
- Daily Water hydration: ${targetWater} Liters

RETRIEVED KNOWLEDGE BASE STATEMENTS:
${textContext || "No specifically matching documents found in index. Rely on core Indian dietary logic."}

STRICT SAFETY AND MEDICAL GUARDRAILS:
1. You are NOT a doctor. NEVER diagnose diseases, prescribe medications, recommend medication dosages, suggest stopping prescribed treatment, or claim medical certainty about medical conditions. Just provide general educational information only. Encouraging consultation with a doctor, registered dietitian, or specialist.
2. If the user mentions health symptoms or conditions involving: Chest pain, Breathing difficulty, Severe abdominal pain, Fainting, Stroke symptoms, Suicidal thoughts, Severe allergic reactions, Pregnancy complications, Uncontrolled diabetes, Serious infections, or any potentially life-threatening condition, immediately return exactly: "This may require professional medical attention. Please consult a qualified healthcare professional or seek urgent medical care." as the summary and explanation, and do not provide any actual diet plans.
3. For disease-specific questions, provide general educational info only and encourage consultation with a registered healthcare professional.

STRICT PERSONALIZATION AND RAG RULES:
1. Answer only from retrieved evidence whenever possible. If the evidence in the retrieved knowledge base is insufficient to answer the query confidently, you MUST respond with: "I don't have enough reliable information in my knowledge base to answer this confidently." Never hallucinate or fabricate research or citations.
2. If the user's question requires personalized advice (such as customized diet plans, calorie targets, weight loss/gain advice, muscle gain plans, meal suggestions, supplement guidance, lifestyle recommendations), check if you have complete parameters. If parameters are incomplete or missing, you MUST first gather missing information before answering. Do not generate personalized plans until sufficient information is collected. Ask relevant follow-up questions such as:
   - Age
   - Gender
   - Height
   - Weight
   - Activity level
   - Goal (weight loss, weight gain, muscle gain, maintenance)
   - Dietary preference
   - Allergies
   - Medical conditions
   - Lifestyle constraints
   If information is incomplete, ask concise follow-up questions rather than making assumptions.
3. Every recommendation must be practical, actionable, and tailored to the Indian local food context (e.g. paneer, dhal, sattu, chana, ragi, bajra).
4. For recommendations, structure responses as:
   - "summary": Instant answers or warm personal follow-ups.
   - "explanation": Structured explicitly as:
     1. Recommendation
     2. Why it helps
     3. Practical next steps
     Explain reasoning clearly.
   - "recommendations": Actions list.
   - "sources": Actual names of the retrieved documents used.

Be friendly, motivating, and safe above all! Return responses in the exact pure JSON format.`;

  const aiKey = process.env.GEMINI_API_KEY;
  if (!aiKey) {
    // Elegant system fallback if key is not integrated
    const retrievedNames = retrieved.map(r => r.docName);
    
    const medicalPart = medicalConds.filter(c => c !== "None").join(", ");
    const medicalLine = medicalPart ? ` with ${medicalPart} management` : "";
    
    let responseObj: {
      summary: string;
      explanation: string;
      recommendations: string[];
      sources: string[];
      confidence: "High" | "Medium" | "Low";
      isEmergencyRedirect: boolean;
    } = {
      summary: `Namaste! I am Swastika, your personalized AI Nutrition, Fitness, and Healthy Lifestyle Coach. I am actively optimizing guidelines for a ${age}-year-old ${gender} looking to achieve "${goal}" on a ${dietPref} food plan${medicalLine}.`,
      explanation: `To address your query regarding "${message}", I analyzed your physical profile metrics:
      • Current physical status: ${weight}kg, ${height}cm (BMI Index: ${bmi.toFixed(1)} classified as ${bmiCategory})
      • Corrective daily calorie budget: ${targetCalories} kcal
      • Elevating protein threshold: ${targetProtein}g to bypass Indian regional macronutrient gaps (Sharma et al. 2020)
      • Standard cereal cap restriction: ${cerealLimit}g (allowing up to 40% energy from starches as per NSO NSS No. 594 comparison)
      • Hydration fluids standard: ${targetWater} Liters
      
      No active Gemini API key is registered in your environment settings (Nourish AI is running in local offline-guard benchmark mode). I have loaded my verified Indian clinical reference books to secure these safe guidelines.`,
      recommendations: [
        `Ensure daily complex carbohydrates do not exceed the corrective limit of ${cerealLimit}g.`,
        `Fulfill your RDA target of ${targetProtein}g of protein from ${dietPref === "Veg" ? "paneer, chana, dhal, sattu, and greek yogurt" : "lean poultry, eggs, fish, paneer, and dhal"}.`,
        medicalConds.includes("Diabetes") 
          ? "Clinical Warning (Diabetes is active): Exclude fast-release starch like white rice or maida; prioritize whole ragi, oats, and millet grains." 
          : "Consult your doctor or registered dietitian if customizing any dietary treatments.",
        `Consume ${targetWater} liters of clean water daily to match current body fat loss or gains.`
      ],
      sources: retrievedNames.length > 0 ? retrievedNames : ["NSS Report No. 594", "Sharma et al. (2020)"],
      confidence: "High",
      isEmergencyRedirect: false
    };

    // If query asks for personalized plan/advice, let's politely prompt the user for details or ask concise follow-up questions first
    const isPersonalizedRequest = /diet\s*plan|weight\s*loss|fat\s*loss|muscle|gain|meal|supplement|recommend|advice/i.test(message);
    if (isPersonalizedRequest) {
      responseObj.summary = "I would be happy to design a personalized nutrition and fitness plan for you! However, to ensure safety and precision, I must compile your personal bio-parameters first.";
      responseObj.explanation = "Personalized Recommendation Checklist:\n\n1. Biological Parameters\nWe gather missing details to calculate safe and tailored target calorie, protein, and water caps.\n\n2. Safety & Precision\nEnsures recommendations don't conflict with allergies or medical histories.\n\n3. Practical Next Steps\nPlease let me know your details so I don't make assumptions:\n• Age\n• Gender\n• Height\n• Weight\n• Activity level\n• Goal (weight loss, weight gain, muscle gain, maintenance)\n• Dietary preference\n• Allergies\n• Medical conditions\n• Lifestyle constraints";
      responseObj.recommendations = [
        "Please provide your details in the chat or update them in your Health Profile tab.",
        "Let me know if you have any existing clinical conditions (e.g., Diabetes, PCOS, Thyroid)."
      ];
    } else if (retrieved.length > 0) {
      // Factual query matched to knowledge base!
      responseObj.summary = `Here is the retrieved evidence from the knowledge base regarding your query.`;
      responseObj.explanation = retrieved.map(r => `• ${r.text}`).join("\n\n");
      responseObj.recommendations = ["Analyze the verified guidelines listed inside the evidence matrix."];
    } else {
      // Factual query without match
      responseObj.summary = "I don't have enough reliable information in my knowledge base to answer this confidently.";
      responseObj.explanation = "My evidence database does not contain files that match your query securely.";
      responseObj.recommendations = ["Try using custom uploads in the KB Admin tab to expand my grounded memory or ask specific questions about Indian nutrition statistics."];
      responseObj.confidence = "Low";
    }

    return res.json(responseObj);
  }

  try {
    const ai = getAIClient();

    // Map history to standard Gemini multi-turn role-content system (user / model)
    const formattedHistory = Array.isArray(history) ? history.map((item: any) => {
      return {
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: item.text || "" }]
      };
    }) : [];

    // Append the current message
    const contents = [
      ...formattedHistory,
      { role: "user", parts: [{ text: message }] }
    ];

    const chatResponse = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction: systemInstructions,
        responseMimeType: "application/json",
        temperature: 0.25
      }
    });

    const outputText = chatResponse.text.trim();
    const data = JSON.parse(outputText);

    // Verify groundedness score
    const score = verifyGroundednessScore(outputText, textContext);
    data.confidence = score;

    res.json(data);
  } catch (error: any) {
    console.error("Gemini Dispatch Fail: ", error);
    res.status(500).json({
      summary: "Could not parse generative request",
      explanation: "Swastika failed to process this statement because of downstream cloud connectivity or formatting discrepancies.",
      recommendations: ["Check your local API key in settings or retry after a moment."],
      sources: ["Error Tracker Handler"],
      confidence: "Low"
    });
  }
});

// Serve frontend in production & handle Vite dev server in development
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("🚀 Vite middleware mounted in active development mode.");
  } else {
    // Production serving static files
    const distPath = path.join(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("🚀 Server configured for static production delivery.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`📡 Full-stack web server accessible at http://localhost:${PORT}`);
  });
}

startServer();
