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

        const totalDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24))) || 7;
        const totalTravelers = parseInt(travelers) || 2;
        const budgetCap = parseInt(budget) || 2000;
        
        let destList = destinations ? destinations.split(',').map(d => d.trim()).filter(d => d) : [];
        if (destList.length === 0) destList = [departure || "Vietnam"];
        
        const daysPerDest = Math.max(1, Math.floor(totalDays / destList.length));
        
        let schedule = [];
        let currentDay = 1;

        const dailyBudgetPerPerson = budgetCap / (totalDays * totalTravelers);
        const isLuxury = dailyBudgetPerPerson > 150;
        const budgetStyle = isLuxury ? "Luxury" : (dailyBudgetPerPerson > 50 ? "Mid-range" : "Economy");

        let totalTransport = 0;
        let totalAccom = 0;
        let totalMeals = 0;
        let totalActivities = 0;

        // Base costs per day per traveler based on style
        const baseAccomCost = isLuxury ? 100 : (budgetStyle === "Mid-range" ? 40 : 15);
        const baseMealCost = isLuxury ? 60 : (budgetStyle === "Mid-range" ? 25 : 10);
        const baseActivityCost = isLuxury ? 50 : (budgetStyle === "Mid-range" ? 20 : 5);
        const baseTransportCost = isLuxury ? 20 : (budgetStyle === "Mid-range" ? 10 : 5);

        destList.forEach((destName, index) => {
            for (let i = 0; i < daysPerDest; i++) {
                if (currentDay > totalDays) break;

                let locationText = destName;
                let transMode = "Local Taxi/Grab";
                let tCost = baseTransportCost * totalTravelers;

                if (i === 0 && index > 0) {
                    locationText = `${destList[index - 1]} ➡️ ${destName}`;
                    transMode = transport === 'flight' ? 'Flight' : (transport === 'train' ? 'Train' : 'Bus');
                    tCost = (transport === 'flight' ? 80 : 25) * totalTravelers;
                }

                totalTransport += tCost;
                
                const aCost = baseAccomCost * totalTravelers;
                totalAccom += aCost;
                
                const mCost = baseMealCost * totalTravelers;
                totalMeals += mCost;

                const actCost = baseActivityCost * totalTravelers;
                totalActivities += actCost;

                schedule.push({
                    day: currentDay,
                    location: locationText,
                    activities: i === 0 ? [`Arrive and check in to hotel in ${destName}`, `Introductory walk around the heart of ${destName}`] : [`Full day exploring the famous highlights of ${destName}`, `Authentic local dining experience`],
                    transport: { mode: transMode, time: i === 0 && index > 0 ? "2-4 hours" : "15 mins", cost: tCost },
                    accommodation: { name: `Top Rated Stay in ${destName}`, location: "City Center", price: aCost }
                });
                
                currentDay++;
            }
        });

        // Fill remaining days
        while (currentDay <= totalDays) {
            const lastDest = destList[destList.length - 1];
            
            totalTransport += baseTransportCost * totalTravelers;
            totalAccom += baseAccomCost * totalTravelers;
            totalMeals += baseMealCost * totalTravelers;
            totalActivities += baseActivityCost * totalTravelers;

            schedule.push({
                day: currentDay,
                location: lastDest,
                activities: [`Leisure day shopping and cafes in ${lastDest}`, `Farewell dinner memory`],
                transport: { mode: "Local Walk", time: "", cost: baseTransportCost * totalTravelers },
                accommodation: { name: `Top Rated Stay in ${lastDest}`, location: "City Center", price: baseAccomCost * totalTravelers }
            });
            currentDay++;
        }

        const plan = {
            overview: { 
                title: `Your Tailored ${totalDays}-Day Local Route`, 
                description: `A mathematically balanced trip across ${destList.join(', ')} prioritizing your specifications without relying on external AI services.`, 
                totalDays, 
                budgetEfficiency: budgetStyle 
            },
            schedule: schedule,
            activityHighlights: [
                { category: "Culture", details: "Visit iconic local markets and historical landmarks." },
                { category: "Food", details: "Enjoy the best local Pho and authentic street food recommendations." }
            ],
            budgetBreakdown: { transport: totalTransport, accommodation: totalAccom, activities: totalActivities, meals: totalMeals },
            practicalNotes: {
                localTips: ["Always negotiate taxi fares beforehand or use Grab.", "Carry small changes in VND for street food."],
                weather: "Generally warm. Bring an umbrella for sudden short showers.",
                emergency: { police: "113", medical: "115", touristSupport: "Hotline 124" }
            },
            placesToVisit: destList.map(d => ({ name: `Historic ${d} Center`, city: d, description: "Must-visit landmark area.", price: "Free" })),
            localNews: []
        };
        
        // Add random image
        plan.img = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];

        // Simulate small delay for UX
        setTimeout(() => {
            res.json(plan);
        }, 1200);
        
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: error.message || "Failed to generate algorithmic itinerary. Please try again." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Tour Planner Server running at http://localhost:${PORT}`);
    console.log(`To expose via localtunnel, run: npx localtunnel --port ${PORT}`);
});
