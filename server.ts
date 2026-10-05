import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Gemini Client safely
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    system: "ExpenseOS AI Core v3.5",
    timestamp: new Date().toISOString(),
    geminiActive: !!process.env.GEMINI_API_KEY,
  });
});

// AI Receipt Scanner API
app.post("/api/ai/receipt-scan", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/png" } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 string" });
    }

    const ai = getGeminiClient();
    if (!ai) {
      // Intelligent fallback structured mock if Gemini key is not configured
      return res.json({
        merchant: "Whole Foods Market",
        date: new Date().toISOString().split("T")[0],
        totalAmount: 128.45,
        gst: 11.50,
        category: "Groceries",
        paymentMethod: "Credit Card (Visa **4291)",
        confidenceScore: 98,
        items: [
          { name: "Organic Almond Milk", price: 5.99, quantity: 2 },
          { name: "Avocado Pack (4ct)", price: 6.49, quantity: 1 },
          { name: "Grass-fed Ribeye Steak", price: 24.99, quantity: 2 },
          { name: "Sourdough Artisanal Bread", price: 4.99, quantity: 1 },
          { name: "Sparkling Mineral Water 6pk", price: 7.99, quantity: 2 },
        ],
        notes: "Scanned via ExpenseOS AI Vision OCR",
        isSimulated: true,
      });
    }

    // Clean base64 header if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are ExpenseOS AI Receipt Scanner. Analyze the provided receipt image carefully and extract all transaction metadata accurately in strictly valid JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64 } },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            totalAmount: { type: Type.NUMBER },
            gst: { type: Type.NUMBER },
            category: { type: Type.STRING },
            paymentMethod: { type: Type.STRING },
            confidenceScore: { type: Type.NUMBER, description: "0 to 100 integer" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  price: { type: Type.NUMBER },
                  quantity: { type: Type.NUMBER },
                },
              },
            },
            notes: { type: Type.STRING },
          },
          required: ["merchant", "totalAmount", "category", "confidenceScore"],
        },
      },
    });

    const parsed = JSON.parse(response.text || "{}");
    res.json(parsed);
  } catch (error: any) {
    console.error("Receipt scanning error:", error);
    res.status(500).json({
      error: "Failed to scan receipt",
      details: error?.message || "Unknown error",
    });
  }
});

// AI Financial Advisor Chat API
app.post("/api/ai/financial-advisor", async (req, res) => {
  try {
    const { messages, userFinancialContext } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `You are ExpenseOS AI, an elite Personal Chief Financial Officer (CFO) and financial advisor.
Your goal is to help the user master their money, reach FIRE (Financial Independence, Retire Early), optimize tax, detect wasteful spending, analyze purchase impact, predict future wealth, and give clear, highly quantitative recommendations.

User's Live Financial DNA Context:
${JSON.stringify(userFinancialContext || {}, null, 2)}

Instructions:
- Provide actionable, direct, structured answers with numbers, calculations, and bold formatting.
- When asked "Can I buy this?", calculate the exact impact on their remaining budget, monthly savings rate, and delayed goal timelines.
- When asked "Where am I wasting money?", identify unused subscriptions, excessive dining/entertainment, and hidden fees.
- Maintain a highly sophisticated, encouraging, and razor-sharp professional CFO tone.
- Keep responses clean, organized with headers, bullet points, and key metrics.`;

    if (!ai) {
      // Smart offline response generator
      const lastUserMsg = messages?.[messages.length - 1]?.content || "Help me optimize my money";
      let reply = "### ExpenseOS AI Financial Intelligence Report\n\n";

      if (lastUserMsg.toLowerCase().includes("waste") || lastUserMsg.toLowerCase().includes("wasting")) {
        reply += `Based on your recent transaction patterns, here is where leakage is occurring:\n\n` +
          `1. **Unused Subscriptions:** You have 2 subscriptions (Gym Pass, Cloud Storage Tier 3) with low utilization. **Savings: $48.50/mo**\n` +
          `2. **Micro Grocery Spikes:** Frequent weekday convenience runs vs bulk purchases. **Savings: ~$120/mo**\n` +
          `3. **Weekend Dining Out:** Dining represents 34% of your variable expenses. Reducing dining out by 1 night/week saves **$240/mo**.\n\n` +
          `**Total Potential Monthly Savings:** **$408.50/mo** ($4,902/year invested at 8% compounding = **$71,150 in 10 years**)`;
      } else if (lastUserMsg.toLowerCase().includes("buy") || lastUserMsg.toLowerCase().includes("can i")) {
        reply += `### Purchase Feasibility Analysis\n\n` +
          `• **Current Available Budget:** $1,850.00\n` +
          `• **Emergency Savings Reserve:** $12,400.00 (Safe 4.5 months)\n` +
          `• **Verdict:** **Approved with Moderate Impact**\n\n` +
          `*Financial Impact Breakdown:*\n` +
          `- Your monthly savings rate will temporarily dip from **32% to 24%** for this billing cycle.\n` +
          `- Your 'New Laptop / Device Goal' target date will shift back by only **12 days**.\n` +
          `- Recommendation: Utilize 0% APR 3-month split or pay directly from discretionary buffer.`;
      } else {
        reply += `### Comprehensive Money Master Strategy\n\n` +
          `• **Financial Health Score:** **88/100 (Optimal)**\n` +
          `• **Net Worth Velocity:** +$2,450 / month average\n` +
          `• **Emergency Cushion:** 5.2 Months Liquidity\n\n` +
          `**Top 3 CFO Action Items for Today:**\n` +
          `1. **Re-allocate Cash Buffer:** Shift $3,000 idle cash to high-yield 5.2% APY money market.\n` +
          `2. **Automate SIP/Investments:** Lock in automatic transfers on payday (1st of month).\n` +
          `3. **Review Bill Renewals:** Internet contract expires in 14 days — renegotiate or switch for $30/mo discount.`;
      }

      return res.json({ response: reply, isSimulated: true });
    }

    // Format chat history for Gemini
    const contents = (messages || []).map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents,
      config: {
        systemInstruction,
        temperature: 0.7,
      },
    });

    res.json({ response: response.text });
  } catch (error: any) {
    console.error("AI Financial Advisor error:", error);
    res.status(500).json({ error: "Financial Advisor service unavailable", details: error?.message });
  }
});

// AI Spending Analytics & Predictions Endpoint
app.post("/api/ai/predictive-analytics", async (req, res) => {
  try {
    const { expenses, income, budgets } = req.body;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        financialHealthScore: 88,
        dnaProfile: "Calculated Wealth Accumulator",
        spendingPersonality: "Strategic Optimizer",
        moneyMood: "Confident & Balanced",
        nextMonthExpenseForecast: 3120,
        yearlyExpenseForecast: 38400,
        detectedAnomalies: [
          {
            merchant: "Tech Gadget Store",
            amount: 450,
            date: new Date().toISOString().split("T")[0],
            reason: "Expense is 240% higher than your standard Tech category benchmark.",
          },
        ],
        subscriptionInsights: [
          { name: "Gym Membership", monthlyCost: 65, recommendation: "Unused for 22 days. Consider pay-per-visit option.", potentialSavings: 780 },
          { name: "Streaming Ultra 4K", monthlyCost: 22, recommendation: "Degraded usage. Switch to Standard Tier.", potentialSavings: 120 },
        ],
        personalizedTips: [
          "Automate 20% of freelancing payouts directly to index funds.",
          "Your grocery spending peaks on Fridays; shopping on Wednesdays reduces impulse items by 14%.",
          "You are on track to achieve your 'Emergency Fund' goal 45 days ahead of schedule!",
        ],
        isSimulated: true,
      });
    }

    const prompt = `Analyze the following financial user dataset:
Expenses count: ${expenses?.length || 0}
Total Expenses Amount: $${expenses?.reduce((s: number, x: any) => s + (x.amount || 0), 0) || 0}
Monthly Income: $${income?.reduce((s: number, x: any) => s + (x.amount || 0), 0) || 0}

Generate deep AI financial intelligence in strictly valid JSON format.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.6-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            financialHealthScore: { type: Type.NUMBER, description: "0-100 score" },
            dnaProfile: { type: Type.STRING, description: "Short title e.g. Disciplined Investor" },
            spendingPersonality: { type: Type.STRING },
            moneyMood: { type: Type.STRING },
            nextMonthExpenseForecast: { type: Type.NUMBER },
            yearlyExpenseForecast: { type: Type.NUMBER },
            detectedAnomalies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  merchant: { type: Type.STRING },
                  amount: { type: Type.NUMBER },
                  date: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
              },
            },
            subscriptionInsights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  monthlyCost: { type: Type.NUMBER },
                  recommendation: { type: Type.STRING },
                  potentialSavings: { type: Type.NUMBER },
                },
              },
            },
            personalizedTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
          },
        },
      },
    });

    res.json(JSON.parse(response.text || "{}"));
  } catch (error: any) {
    console.error("Predictive Analytics error:", error);
    res.status(500).json({ error: "Predictive Analytics error", details: error?.message });
  }
});

// Vite Middleware for development & static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 ExpenseOS AI Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
