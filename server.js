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
Transport Preference: ${transport}
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

        const response = await fetch("https://api.scitely.com/v1/chat/completions", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SCITELY_API_KEY}`
            },
            body: JSON.stringify({
                model: "deepseek-chat", // Switched to deepseek model as requested
                messages: [
                    { role: "system", content: "You are a professional travel agent. Output JSON only." },
                    { role: "user", content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error("Scitely API Error Status:", response.status, errText);

            // Try to extract a specific error message if Scitely provides one
            let parsedErr = "Unknown Error";
            try {
                const errJson = JSON.parse(errText);
                parsedErr = errJson.error ? (errJson.error.message || errJson.error) : errText;
            } catch (e) { parsedErr = errText; }

            throw new Error(`Scitely API [${response.status}]: ${parsedErr}`);
        }

        const data = await response.json();

        // Extract content based on standard LLM chat completion format (adapt if Scitely differs slightly, e.g. data.choices[0].message.content)
        let textResult = data.choices ? data.choices[0].message.content : (data.response || data.text);

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
