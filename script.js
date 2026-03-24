document.addEventListener('DOMContentLoaded', () => {

    const ORS_API_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjBkM2M2OGEyZWM1MzQ0MjhiODkxNTBiODQzYWM0N2IwIiwiaCI6Im11cm11cjY0In0=";

    // --- Navigation Scroll Effect ---
    const nav = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            nav.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)';
        } else {
            nav.style.boxShadow = 'var(--shadow-sm)';
        }
    });

    const advToggle = document.getElementById('advancedToggle');
    const advOptions = document.getElementById('advancedOptions');
    if (advToggle) {
        advToggle.addEventListener('click', () => {
            advOptions.classList.toggle('hidden');
            if (advOptions.classList.contains('hidden')) {
                advToggle.innerHTML = "<span>⚙️ Show Advanced Preferences</span>";
            } else {
                advToggle.innerHTML = "<span>❌ Hide Advanced Preferences</span>";
            }
        });
    }

    // --- Budget Slider Update ---
    const budgetSlider = document.getElementById('budgetCap');
    const budgetDisplay = document.getElementById('budgetAmount');

    budgetSlider.addEventListener('input', (e) => {
        if (budgetDisplay) budgetDisplay.textContent = Number(e.target.value).toLocaleString();
    });

    // --- Initial Config ---
    generateWeatherWidgets();

    let map;
    let routeLayer;
    let mapMarkers = [];
    let dayFeatureGroups = {}; // Stores layers per day for interactivity

    if (document.getElementById('vietnamMap')) {
        map = L.map('vietnamMap').setView([16.047079, 108.206230], 5);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 20
        }).addTo(map);
    }

    // --- FIXED DEPARTURE & Tags State ---
    let departureData = { name: "Can Tho City", coords: [105.7836, 10.0280] };
    let destinationsList = [];

    const destInput = document.getElementById('destinationInput');
    const destSuggestions = document.getElementById('destinationSuggestions');
    const addDestBtn = document.getElementById('addDestBtn');
    const selectedDestContainer = document.getElementById('selectedDestinations');
    const hiddenDestInput = document.getElementById('hiddenDestinations');

    let debounceTimer;

    function fetchSuggestions(text, listElement, onSelectCallback) {
        if (!text || text.length < 3) {
            listElement.innerHTML = '';
            listElement.classList.add('hidden');
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
            try {
                // BOUNDARY RESTRICTED TO VIETNAM ONLY
                const url = `https://api.openrouteservice.org/geocode/autocomplete?api_key=${ORS_API_KEY}&text=${encodeURIComponent(text)}&boundary.country=VN`;
                const response = await fetch(url);
                const data = await response.json();

                listElement.innerHTML = '';
                if (data.features && data.features.length > 0) {
                    data.features.slice(0, 5).forEach(feature => {
                        const li = document.createElement('li');
                        li.textContent = feature.properties.label;
                        li.addEventListener('click', () => {
                            onSelectCallback(feature);
                            listElement.classList.add('hidden');
                        });
                        listElement.appendChild(li);
                    });
                    listElement.classList.remove('hidden');
                } else {
                    listElement.classList.add('hidden');
                }
            } catch (err) {
                console.error("Autocomplete error:", err);
            }
        }, 300);
    }

    destInput.addEventListener('input', (e) => {
        fetchSuggestions(e.target.value, destSuggestions, (feature) => {
            destInput.value = feature.properties.label;
            destInput.dataset.lon = feature.geometry.coordinates[0];
            destInput.dataset.lat = feature.geometry.coordinates[1];
            destInput.dataset.name = feature.properties.name || feature.properties.label;
        });
    });

    addDestBtn.addEventListener('click', () => {
        const val = destInput.value.trim();
        if (!val) return;

        let lon = destInput.dataset.lon;
        let lat = destInput.dataset.lat;
        let name = destInput.dataset.name || val;

        destinationsList.push({ name, coords: lon && lat ? [parseFloat(lon), parseFloat(lat)] : null });
        updateDestinationsUI();

        destInput.value = '';
        delete destInput.dataset.lon;
        delete destInput.dataset.lat;
        delete destInput.dataset.name;
    });

    destInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addDestBtn.click();
        }
    });

    function updateDestinationsUI() {
        selectedDestContainer.innerHTML = '';
        destinationsList.forEach((dest, idx) => {
            const tag = document.createElement('div');
            tag.className = 'dest-tag';
            tag.innerHTML = `<span>${dest.name}</span> <button type="button" data-idx="${idx}">&times;</button>`;
            selectedDestContainer.appendChild(tag);
        });

        hiddenDestInput.value = destinationsList.map(d => d.name).join(',');

        selectedDestContainer.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idx = parseInt(e.target.dataset.idx);
                destinationsList.splice(idx, 1);
                updateDestinationsUI();
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (e.target !== destInput) destSuggestions.classList.add('hidden');
    });

    // Default Dates
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startInput = document.getElementById('startDate');
    const endInput = document.getElementById('endDate');
    startInput.valueAsDate = tomorrow;
    const nextWeek = new Date(tomorrow);
    nextWeek.setDate(nextWeek.getDate() + 7);
    endInput.valueAsDate = nextWeek;


    // --- Sample Tours Action ---
    const sampleTours = document.querySelectorAll('.chip[data-tour]');
    sampleTours.forEach(chip => {
        chip.addEventListener('click', () => {
            const tourType = chip.getAttribute('data-tour');

            destinationsList = []; // clear

            if (tourType === 'classic') {
                destinationsList.push({ name: "Hanoi", coords: [105.852449, 21.02945] });
                destinationsList.push({ name: "Ha Long Bay", coords: [107.0429, 20.9101] });
                startInput.valueAsDate = tomorrow;
                let ed = new Date(tomorrow); ed.setDate(ed.getDate() + 3);
                endInput.valueAsDate = ed;
            } else if (tourType === 'central') {
                destinationsList.push({ name: "Hoi An", coords: [108.3272, 15.8801] });
                destinationsList.push({ name: "Da Nang", coords: [108.206230, 16.047079] });
                let ed = new Date(tomorrow); ed.setDate(ed.getDate() + 5);
                endInput.valueAsDate = ed;
            } else if (tourType === 'south') {
                destinationsList.push({ name: "Ho Chi Minh City", coords: [106.6297, 10.8231] });
                destinationsList.push({ name: "Mekong Delta", coords: [105.75, 10.0] });
                let ed = new Date(tomorrow); ed.setDate(ed.getDate() + 4);
                endInput.valueAsDate = ed;
            }
            updateDestinationsUI();

            document.getElementById('plan').scrollIntoView({ behavior: 'smooth' });
        });
    });


    // --- Form Submission & Generation ---
    const form = document.getElementById('tourForm');
    const generateBtn = document.getElementById('generateBtn');
    const btnText = generateBtn.querySelector('.btn-text');
    const loader = generateBtn.querySelector('.loader');
    const itinerariesSection = document.getElementById('itineraries');
    const itineraryResults = document.getElementById('itineraryResults');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Validation
        const tStartDate = new Date(startInput.value);
        const tEndDate = new Date(endInput.value);
        if (tEndDate <= tStartDate) {
            alert("End date must be after start date.");
            return;
        }

        if (destinationsList.length === 0) {
            alert("Please add at least one destination!");
            return;
        }

        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        generateBtn.disabled = true;
        itineraryResults.innerHTML = '';

        const formData = new FormData(form);
        const days = Math.round((tEndDate - tStartDate) / (1000 * 60 * 60 * 24));
        const budget = parseInt(formData.get('budgetCap'));
        const travelers = parseInt(formData.get('travelersNum'));
        const transport = formData.get('transportPref');

        const specsRaw = formData.get('otherSpecs');
        const checkedThemes = Array.from(document.querySelectorAll('.theme-check:checked')).map(cb => cb.value).join(', ');
        const specs = checkedThemes ? `Themes: ${checkedThemes}. Other Custom: ${specsRaw}` : specsRaw;

        const depName = departureData.name;
        const destsName = destinationsList.map(d => d.name).join(', ');

        try {
            const plan = await generateAIItinerary(depName, destsName, days, budget, travelers, transport, specs);
            const routeStats = await drawMapRoute(plan, transport);

            renderPlan(plan, travelers, routeStats, budget);
            renderNews(plan.localNews);

            itinerariesSection.classList.remove('hidden');
            itinerariesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            console.error("Itinerary Gen Error:", error);
            itineraryResults.innerHTML = `
                <div style="color:#ef4444; text-align:center; padding: 2rem; background: #fee2e2; border-radius: 0.5rem; margin-top: 2rem;">
                    <strong>⚠️ Generation Failed</strong><br>
                    <p style="font-size:0.9rem; margin-top:0.5rem;">${error.message || "An unexpected error occurred. Please check your inputs and try again."}</p>
                </div>
            `;
            itinerariesSection.classList.remove('hidden');
        } finally {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            generateBtn.disabled = false;
        }
    });

    const itineraryCache = new Map();

    async function generateAIItinerary(dep, dests, days, budget, travelers, transport, specs) {
        const response = await fetch('/generate-itinerary', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                departure: dep,
                destinations: dests,
                startDate: document.getElementById('startDate').value,
                endDate: document.getElementById('endDate').value,
                travelers: travelers,
                budget: budget,
                transport: transport,
                specs: specs
            })
        });

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || "Failed to generate AI itinerary from server.");
        }

        return await response.json();
    }

    async function drawMapRoute(plan, transport) {
        if (!map) return;

        if (routeLayer) map.removeLayer(routeLayer);
        mapMarkers.forEach(m => map.removeLayer(m));
        mapMarkers = [];

        // Clear day feature groups
        for (let key in dayFeatureGroups) {
            map.removeLayer(dayFeatureGroups[key]);
        }
        dayFeatureGroups = {};

        const mainCoords = [departureData.coords];

        async function getCoord(text) {
            try {
                const res = await fetch(`https://api.openrouteservice.org/geocode/search?api_key=${ORS_API_KEY}&text=${encodeURIComponent(text)}`);
                const data = await res.json();
                if (data.features && data.features.length > 0) {
                    return data.features[0].geometry.coordinates;
                }
            } catch (e) { }
            return null;
        }

        const depM = L.marker([departureData.coords[1], departureData.coords[0]]).addTo(map).bindPopup(`<b>Departure</b><br>${departureData.name}`);
        mapMarkers.push(depM);

        // Process schedule for day-by-day mapping
        let prevCoord = departureData.coords;
        for (let i = 0; i < plan.schedule.length; i++) {
            const day = plan.schedule[i];
            const currentCoord = await getCoord(`${day.location}, Vietnam`);

            if (currentCoord) {
                const dayGroup = L.featureGroup().addTo(map);
                dayFeatureGroups[i] = dayGroup;

                // Marker for this day
                const marker = L.marker([currentCoord[1], currentCoord[0]]).addTo(dayGroup);
                marker.bindPopup(`
                    <div style="font-family: inherit;">
                        <strong style="color:var(--primary); font-size:1.1rem;">Day ${day.day}: ${day.location}</strong><br>
                        <span style="font-size:0.9rem; margin-top:0.4rem; display:block;">🏨 <b>Hotel:</b> ${day.accommodation?.name || 'Local Stay'} ($${day.accommodation?.price || 'Varies'})</span>
                        <span style="font-size:0.9rem;">🚌 <b>Transport:</b> $${day.transport?.cost || '0'} (${day.transport?.mode || 'Local'})</span>
                        <hr style="margin:0.5rem 0; opacity:0.2;">
                        <b>Top Activities:</b><br>
                        <ul style="margin:0.4rem 0 0 1rem; padding:0; font-size:0.85rem;">
                            ${(day.activities || []).map(a => `<li>${a}</li>`).join('')}
                        </ul>
                    </div>
                `);

                // Leg line
                if (prevCoord) {
                    const line = L.polyline([[prevCoord[1], prevCoord[0]], [currentCoord[1], currentCoord[0]]], {
                        color: transport === 'flight' ? 'var(--accent)' : 'var(--primary)',
                        weight: 4,
                        dashArray: transport === 'flight' ? '10, 10' : ''
                    }).addTo(dayGroup);

                    // Tooltip with cost
                    line.bindTooltip(`$${day.transport?.cost || '0'} Leg`, { permanent: true, direction: 'center', className: 'leg-tooltip' });
                }

                mainCoords.push(currentCoord);
                prevCoord = currentCoord;
            }
        }

        // Add additional "placesToVisit" as starred markers
        if (plan.placesToVisit) {
            for (let place of plan.placesToVisit) {
                let c = await getCoord(`${place.name}, ${place.city}, Vietnam`);
                if (c) {
                    const customIcon = L.divIcon({
                        className: 'custom-place-icon',
                        html: '<div style="background-color: var(--accent); color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">★</div>',
                        iconSize: [24, 24],
                        iconAnchor: [12, 12]
                    });
                    const m = L.marker([c[1], c[0]], { icon: customIcon }).addTo(map)
                        .bindPopup(`<b>${place.name}</b><br><i style="color:var(--primary);">${place.price}</i><br>${place.description}`);
                    mapMarkers.push(m);
                }
            }
        }

        if (mainCoords.length > 1) {
            const group = new L.featureGroup(Object.values(dayFeatureGroups).concat(mapMarkers));
            map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }

        return { distance: "Calculated", duration: "Calculated" };
    }

    function renderPlan(plan, travelers, routeStats, userBudget) {
        const MOCK_IMAGES = [
            "https://images.unsplash.com/photo-1559592413-7ce4ce67fe5c?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1540304892622-df38cebfba72?auto=format&fit=crop&w=600&q=80",
            "https://images.unsplash.com/photo-1543333352-736fbdb4fb7b?auto=format&fit=crop&w=600&q=80"
        ];
        plan.img = MOCK_IMAGES[Math.floor(Math.random() * MOCK_IMAGES.length)];

        const itineraryResults = document.getElementById('itineraryResults');
        const card = document.createElement('div');
        card.className = 'itinerary-card';

        // 1. Overview
        const getNum = (val) => {
            if (!val) return 0;
            if (typeof val === 'number') return val;
            const stripped = String(val).replace(/[^0-9.]/g, '');
            return parseFloat(stripped) || 0;
        };

        const totalEst = getNum(plan.budgetBreakdown?.transport) +
            getNum(plan.budgetBreakdown?.accommodation) +
            getNum(plan.budgetBreakdown?.activities) +
            getNum(plan.budgetBreakdown?.meals);

        const remaining = userBudget ? (userBudget - totalEst) : 0;
        const remainingColor = remaining >= 0 ? 'var(--primary)' : 'var(--accent)';

        const overviewHTML = `
            <div class="trip-overview-grid">
                <div class="overview-item"><label>Days</label><span>${plan.overview?.totalDays || '?'} Days</span></div>
                <div class="overview-item"><label>Budget Cap</label><span>$${userBudget ? userBudget.toLocaleString() : '?'}</span></div>
                <div class="overview-item"><label>Est. Cost</label><span>$${totalEst.toLocaleString()}</span></div>
                <div class="overview-item"><label>Remaining</label><span style="color:${remainingColor}; font-weight:bold;">$${remaining.toLocaleString()}</span></div>
            </div>
        `;

        // 2. Timeline (Schedule)
        let timelineHTML = '<div class="timeline">';
        plan.schedule.forEach((day, index) => {
            timelineHTML += `
                <div class="timeline-item">
                    <div class="timeline-date">Day ${day.day} • ${day.location}</div>
                    <div class="timeline-content">
                        <button class="view-map-btn" onclick="window.focusDayOnMap(${index})">📍 View Day on Map</button>
                        <div style="margin-top:1rem; display:flex; justify-content:space-between; align-items:center;">
                            <h4 style="margin:0;">Activities</h4>
                            <a href="https://www.klook.com/search/result/?query=${encodeURIComponent(day.location)}" target="_blank" style="font-size:0.8rem; font-weight:bold; text-decoration:underline; color:var(--primary);">🎟️ Find Local Tours</a>
                        </div>
                        <ul contenteditable="true">${(day.activities || []).map(a => `<li>${a}</li>`).join('')}</ul>
                        <div class="financial-pills">
                            <span class="fin-pill">🏨 ${day.accommodation?.name || 'Local Stay'} ($${day.accommodation?.price || 'Varies'}) <a href="https://www.agoda.com/search?text=${encodeURIComponent(day.location)}&priceMin=1&priceMax=${parseInt(day.accommodation?.price) || 150}" target="_blank" style="margin-left: 8px; color: var(--accent); font-weight: bold; text-decoration: underline; font-size: 0.8rem;">🔍 Search on Agoda</a></span>
                            <span class="fin-pill">🚌 ${day.transport?.mode || 'Local'}: ${day.transport?.time || ''} ($${day.transport?.cost || '0'}) ${
                                (day.transport?.mode && !day.transport.mode.toLowerCase().includes('walk') && !day.transport.mode.toLowerCase().includes('taxi') && !day.transport.mode.toLowerCase().includes('foot')) 
                                ? `<a href="https://12go.asia/en/search?s=${encodeURIComponent(day.location)}" target="_blank" style="margin-left: 8px; color: var(--accent); font-weight: bold; text-decoration: underline; font-size: 0.8rem;">🎫 Find Tickets</a>` 
                                : ''
                            }</span>
                        </div>
                    </div>
                </div>
            `;
        });
        timelineHTML += '</div>';

        // 3. Activity Highlights
        let highlightsHTML = `
            <div class="structured-section">
                <h4>✨ Activity Highlights</h4>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
                    ${(plan.activityHighlights || []).map(h => `
                        <div style="background:#f1f5f9; padding:0.75rem; border-radius:0.4rem;">
                            <b style="color:var(--accent); font-size:0.8rem; text-transform:uppercase;">${h.category}</b>
                            <p style="margin-top:0.25rem; font-size:0.9rem;">${h.details}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        // 4. Budget Breakdown
        const budgetHTML = `
            <div class="structured-section">
                <h4>💰 Estimated Budget Breakdown</h4>
                <div class="overall-costs-bar">
                    <div class="cost-metric"><span>Hotel Total</span><strong>$${plan.budgetBreakdown?.accommodation || '0'}</strong></div>
                    <div class="cost-metric"><span>Transport</span><strong>$${plan.budgetBreakdown?.transport || '0'}</strong></div>
                    <div class="cost-metric"><span>Activities</span><strong>$${plan.budgetBreakdown?.activities || '0'}</strong></div>
                    <div class="cost-metric"><span>Meals</span><strong>$${plan.budgetBreakdown?.meals || '0'}</strong></div>
                </div>
                <div style="margin-top: 1rem; text-align: right; font-size: 0.85rem; color: #64748b;">
                    * The AI has allocated meals, activities, and transport first to ensure your budget captures essential costs safely.
                </div>
            </div>
        `;

        // 5. Practical Notes
        const notesHTML = `
            <div class="structured-section">
                <h4>📖 Practical Notes</h4>
                <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:0.5rem; padding:1.25rem;">
                    <p><b>🌦️ Weather:</b> ${plan.practicalNotes?.weather || 'N/A'}</p>
                    <p style="margin-top:0.75rem;"><b>🏮 Local Tips:</b></p>
                    <ul>${(plan.practicalNotes?.localTips || []).map(t => `<li>${t}</li>`).join('')}</ul>
                    <div style="margin-top:1rem; padding-top:1rem; border-top:1px dashed #cbd5e1; display:flex; gap:1.5rem; font-size:0.85rem;">
                        <span>📞 Police: <b>113</b></span>
                        <span>🚑 Medical: <b>115</b></span>
                        <span>🛡️ Support: <b>${plan.practicalNotes?.emergency?.touristSupport || 'N/A'}</b></span>
                    </div>
                </div>
            </div>
        `;

        card.innerHTML = `
            <div class="itinerary-header-banner" style="background-image:url('${plan.img}'); height:200px; background-size:cover; background-position:center; position:relative;">
                <div style="position:absolute; bottom:0; left:0; right:0; padding:1.5rem; background:linear-gradient(transparent, rgba(0,0,0,0.8)); color:white;">
                    <h2 style="font-size:2rem; margin:0;">${plan.overview?.title || 'Your Custom Itinerary'}</h2>
                    <p style="opacity:0.9; margin-top:0.25rem;">${plan.overview?.description || ''}</p>
                </div>
            </div>
            <div class="itinerary-content">
                ${overviewHTML}
                ${budgetHTML}
                <h4 style="margin:2rem 0 1rem; color:var(--primary-dark);">🗓️ Detailed Day-by-Day Schedule</h4>
                ${timelineHTML}
                ${highlightsHTML}
                ${notesHTML}
                <div style="margin-top:2rem; text-align:center;">
                    <button class="btn btn-outline" style="width:200px;">Save Itinerary</button>
                    <button class="btn" style="width:200px; margin-left:1rem;">Print PDF</button>
                </div>
            </div>
        `;

        itineraryResults.appendChild(card);

        // Map focus helper
        window.focusDayOnMap = (dayIndex) => {
            if (dayFeatureGroups[dayIndex]) {
                const group = dayFeatureGroups[dayIndex];
                map.fitBounds(group.getBounds(), { padding: [100, 100], maxZoom: 15 });

                // Open first marker in group
                group.eachLayer(layer => {
                    if (layer instanceof L.Marker) layer.openPopup();
                });
            }
        };
    }

    function renderNews(newsArray) {
        const container = document.getElementById('localNewsContainer');
        if (!container || !newsArray || newsArray.length === 0) return;
        container.innerHTML = '';
        newsArray.forEach(news => {
            const div = document.createElement('div');
            div.className = 'review-card active';
            div.style.marginBottom = '1rem';
            div.innerHTML = `<h4 style="color:var(--accent);">${news.headline}</h4><p>${news.snippet}</p>`;
            container.appendChild(div);
        });
    }

    function generateWeatherWidgets() {
        const weatherContainer = document.getElementById('weatherWidgets');
        if (!weatherContainer) return;
        weatherContainer.innerHTML = '';
        const mockWeather = [
            { city: 'Hanoi', temp: '24°C', icon: '⛅' },
            { city: 'Da Nang', temp: '29°C', icon: '☀️' },
            { city: 'Can Tho', temp: '32°C', icon: '🌤️' }
        ];
        mockWeather.forEach(w => {
            const card = document.createElement('div');
            card.className = 'weather-card';
            card.innerHTML = `<div class="weather-icon">${w.icon}</div><h4>${w.city}</h4><p style="font-size:1.5rem; font-weight:bold; color:var(--primary);">${w.temp}</p>`;
            weatherContainer.appendChild(card);
        });
    }
});
