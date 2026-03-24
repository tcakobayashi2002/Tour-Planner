const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
// Serve the frontend files
app.use(express.static(__dirname));

// App setup

const MOCK_IMAGES = [
    "https://images.unsplash.com/photo-1559592413-7ce4ce67fe5c?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1540304892622-df38cebfba72?auto=format&fit=crop&w=600&q=80",
    "https://images.unsplash.com/photo-1543333352-736fbdb4fb7b?auto=format&fit=crop&w=600&q=80"
];

app.post('/generate-itinerary', async (req, res) => {
    try {
        const { departure, destinations, startDate, endDate, travelers, budget, transport, specs } = req.body;

        const days = Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) || 7;

        const prompt = `You are a professional travel agent. 
Create exactly ONE customized tour itinerary for Vietnam with a STRICT 7-point structure:
overview, schedule, transport, accommodation, activities, budgetBreakdown, practicalNotes.

Departure: ${departure || "Vietnam"}
Destinations: ${destinations || "Vietnam"}
Duration: ${days} days
Travelers: ${travelers}
Total Budget Cap: $${budget}

CRITICAL: The sum of costs in budgetBreakdown (transport + accommodation + activities + meals) MUST exactly fit within the Total Budget Cap ($${budget}). You must account for eating (meals) and travelling (transport) first, then allocate the remaining budget realistically to accommodation and activities.
Themes & Specs: ${specs}

Respond STRICTLY with valid JSON. Do not include markdown backticks like \`\`\`json.
{
  "overview": {
    "title": "Strike Catchy Title",
    "description": "Short vision of the trip",
    "totalDays": ${days},
    "budgetEfficiency": "Economy / Mid-range / Luxury"
  },
  "schedule": [
    {
      "day": 1,
      "location": "City Name",
      "activities": ["Activity 1", "Activity 2"],
      "transport": {
        "mode": "Flight or Train or Bus or Car",
        "time": "Est duration",
        "cost": "Est USD"
      },
      "accommodation": {
        "name": "Hotel Name",
        "location": "District",
        "price": "Est USD per night"
      }
    }
  ],
  "activityHighlights": [
    { "category": "Cultural", "details": "Desc" },
    { "category": "Adventure", "details": "Desc" },
    { "category": "Food", "details": "Desc" },
    { "category": "Family", "details": "Desc" }
  ],
  "budgetBreakdown": {
    "transport": "Est Total USD",
    "accommodation": "Est Total USD",
    "activities": "Est Total USD",
    "meals": "Est Total USD"
  },
  "practicalNotes": {
    "localTips": ["Tip 1", "Tip 2"],
    "weather": "Seasonal expectations",
    "emergency": {
      "police": "113",
      "medical": "115",
      "touristSupport": "Hotline"
    }
  },
  "placesToVisit": [
    {
      "name": "Location Name",
      "city": "City",
      "description": "Short description",
      "price": "Entry price"
    }
  ],
  "localNews": [
    { "headline": "News related to ${destinations}", "snippet": "Desc" }
  ],
  "travelAdvisories": ["Direct safety warning if any"]
}`;

        console.log("Calling Scitely API for:", destinations);

        // Required Scitely configuration via OpenAI SDK to bypass Cloudflare
        const { OpenAI } = require("openai");
        const client = new OpenAI({
            apiKey: process.env.SCITELY_API_KEY,
            baseURL: "https://api.scitely.com/v1",
            defaultHeaders: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json"
            }
        });

        const completion = await client.chat.completions.create({
            model: "deepseek-chat",
            messages: [
                { role: "system", content: "You are a professional travel agent. Output JSON only." },
                { role: "user", content: prompt }
            ]
        });

        let textResult = completion.choices[0].message.content;

        // Clean up markdown
        textResult = textResult.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();

        const plan = JSON.parse(textResult);
        plan.img = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];

        res.json(plan);
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate itinerary. Please try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Tour Planner Server running at http://localhost:${PORT}`);
    console.log(`To expose via localtunnel, run: npx localtunnel --port ${PORT}`);
});
