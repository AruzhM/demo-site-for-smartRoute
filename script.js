const routes = [
    { id: "R-01", distance: 8.5, time: 20, cost: 3500, co2: 2.4, available: true, traffic: 7, risk: 3 },
    { id: "R-02", distance: 10.2, time: 25, cost: 2800, co2: 1.8, available: true, traffic: 2, risk: 2 },
    { id: "R-03", distance: 12.0, time: 28, cost: 2500, co2: 1.2, available: true, traffic: 1, risk: 1 },
    { id: "R-04", distance: 7.8, time: 23, cost: 4200, co2: 3.1, available: true, traffic: 5, risk: 4 },
    { id: "R-05", distance: 14.5, time: 35, cost: 2200, co2: 1.0, available: true, traffic: 0, risk: 1 },
    { id: "R-06", distance: 9.0, time: 22, cost: 3900, co2: 2.0, available: true, traffic: 4, risk: 6 },
    { id: "R-07", distance: 11.3, time: 30, cost: 2700, co2: 1.5, available: false, traffic: 2, risk: 2 },
    { id: "R-08", distance: 13.0, time: 32, cost: 2400, co2: 1.3, available: true, traffic: 3, risk: 5 }
];

const strategyNames = {
    URGENT: "Fastest Route Strategy",
    ECONOMY: "Cheapest Route Strategy",
    ECO: "Eco-Friendly Route Strategy",
    STANDARD: "Balanced Route Strategy",
    WEATHER: "Weather-Aware Route Strategy"
};

function effectiveTime(route) {
    return route.time + route.traffic * 2;
}

function totalCost(route, priority) {
    const urgentFee = priority === "URGENT" ? 500 : 0;
    return route.cost + route.distance * 50 + route.traffic * 20 + urgentFee;
}

function ecoScore(route) {
    return route.co2 * 0.8 + route.distance * 0.2;
}

function weatherScore(route, severity) {
    return effectiveTime(route) + route.risk * severity * 2 + route.traffic;
}

function balancedScore(route, validRoutes, priority) {
    const maxTime = Math.max(...validRoutes.map(effectiveTime));
    const maxCost = Math.max(...validRoutes.map(item => totalCost(item, priority)));
    const maxDistance = Math.max(...validRoutes.map(item => item.distance));
    const maxCO2 = Math.max(...validRoutes.map(item => item.co2));

    return 0.4 * effectiveTime(route) / (maxTime || 1)
        + 0.3 * totalCost(route, priority) / (maxCost || 1)
        + 0.1 * route.distance / (maxDistance || 1)
        + 0.2 * route.co2 / (maxCO2 || 1);
}

function getRouteStatus(route, priority, budget, deadline) {
    if (!route.available) return "Unavailable";
    if (totalCost(route, priority) > budget) return "Budget exceeded";
    if (effectiveTime(route) > deadline) return "Deadline exceeded";
    return "Valid";
}

function getScore(route, strategy, validRoutes, severity, priority) {
    if (strategy === "URGENT") return effectiveTime(route);
    if (strategy === "ECONOMY") return totalCost(route, priority);
    if (strategy === "ECO") return ecoScore(route);
    if (strategy === "WEATHER") return weatherScore(route, severity);
    return balancedScore(route, validRoutes, priority);
}

function selectRoute(strategy, budget, deadline, severity, priority) {
    const statuses = routes.map(route => ({
        ...route,
        status: getRouteStatus(route, priority, budget, deadline)
    }));

    const validRoutes = statuses.filter(route => route.status === "Valid");
    const sorted = [...validRoutes].sort((a, b) => {
        const difference = getScore(a, strategy, validRoutes, severity, priority)
            - getScore(b, strategy, validRoutes, severity, priority);

        if (Math.abs(difference) > 0.000000001) return difference;
        if (strategy === "URGENT") return totalCost(a, priority) - totalCost(b, priority) || a.id.localeCompare(b.id);
        if (strategy === "ECONOMY" || strategy === "ECO" || strategy === "WEATHER") {
            return effectiveTime(a) - effectiveTime(b) || a.id.localeCompare(b.id);
        }
        return a.id.localeCompare(b.id);
    });

    return { routes: statuses, selected: sorted[0] || null, second: sorted[1] || null, validRoutes };
}

function explainChoice(strategy, selected, second, validRoutes, severity, priority) {
    if (!second) return "This is the only route that meets the budget, deadline, and availability rules.";

    if (strategy === "URGENT") {
        return `Fastest valid route: ${effectiveTime(selected)} min. ${effectiveTime(second) - effectiveTime(selected)} min faster than ${second.id}.`;
    }
    if (strategy === "ECONOMY") {
        return `Lowest total cost: ${formatCost(totalCost(selected, priority))}. Saves ${formatCost(totalCost(second, priority) - totalCost(selected, priority))} compared with ${second.id}.`;
    }
    if (strategy === "ECO") {
        return `Lowest eco score (${ecoScore(selected).toFixed(2)}), based on CO₂ and distance.`;
    }
    if (strategy === "WEATHER") {
        return `Lowest weather score (${weatherScore(selected, severity).toFixed(2)}), based on delivery time, weather risk and traffic.`;
    }
    return `Lowest balanced score (${balancedScore(selected, validRoutes, priority).toFixed(3)}) using time, cost, distance and CO₂.`;
}

function formatCost(value) {
    return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })} KZT`;
}

function displayRecommendation(result, strategy, severity, priority) {
    const container = document.getElementById("result");
    const selected = result.selected;

    if (!selected) {
        container.innerHTML = '<div class="result-box"><strong>No suitable route</strong><p>Try increasing the budget or deadline.</p></div>';
        return;
    }

    const explanation = explainChoice(strategy, selected, result.second, result.validRoutes, severity, priority);
    container.innerHTML = `
        <div class="result-box">
            <div class="route-id">${selected.id}</div>
            <div class="metrics">
                <div class="metric"><small>Effective time</small><strong>${effectiveTime(selected)} min</strong></div>
                <div class="metric"><small>Total cost</small><strong>${formatCost(totalCost(selected, priority))}</strong></div>
                <div class="metric"><small>CO₂ emissions</small><strong>${selected.co2} kg</strong></div>
            </div>
            <strong>Why this route?</strong>
            <p class="reason">${explanation}</p>
        </div>
    `;
}

function displayCandidateRoutes(result, priority) {
    const body = document.getElementById("routesTable");
    body.innerHTML = result.routes.map(route => {
        const isSelected = result.selected && route.id === result.selected.id;
        const status = isSelected ? "Selected" : route.status === "Valid" ? "Valid alternative" : route.status;
        const rowClass = isSelected ? "selected-row" : route.status !== "Valid" ? "rejected-row" : "";

        return `<tr class="${rowClass}">
            <td>${route.id}</td>
            <td>${effectiveTime(route)} min</td>
            <td>${formatCost(totalCost(route, priority))}</td>
            <td>${route.co2} kg</td>
            <td class="${isSelected ? "status-selected" : ""}">${status}</td>
        </tr>`;
    }).join("");

    document.getElementById("routeCount").textContent = `${result.validRoutes.length} / ${routes.length} valid`;
}

function displayComparison(budget, deadline, severity) {
    const body = document.getElementById("comparisonTable");
    const strategies = ["URGENT", "ECONOMY", "ECO", "STANDARD", "WEATHER"];

    body.innerHTML = strategies.map(strategy => {
        const result = selectRoute(strategy, budget, deadline, severity, "STANDARD");
        const selected = result.selected;

        return `<tr>
            <td>${strategyNames[strategy]}</td>
            <td>${selected ? selected.id : "No route"}</td>
            <td>${selected ? effectiveTime(selected) + " min" : "—"}</td>
            <td>${selected ? formatCost(totalCost(selected, "STANDARD")) : "—"}</td>
        </tr>`;
    }).join("");
}

function displayWeatherExamples(budget, deadline) {
    const container = document.getElementById("weatherExamples");
    container.innerHTML = [0, 3, 7, 10].map(severity => {
        const result = selectRoute("WEATHER", budget, deadline, severity, "STANDARD");
        const selected = result.selected;
        return `<div class="weather-item">Severity: ${severity}/10
            <strong>${selected ? selected.id : "None"}</strong>
            <span class="hint">${selected ? "Score: " + weatherScore(selected, severity).toFixed(2) : "No suitable route"}</span>
        </div>`;
    }).join("");
}

function updateDashboard() {
    const strategy = document.getElementById("strategy").value;
    const budget = Number(document.getElementById("budget").value);
    const deadline = Number(document.getElementById("deadline").value);
    const severity = Number(document.getElementById("weather").value);
    const priority = strategy === "WEATHER" ? "STANDARD" : strategy;

    document.getElementById("budgetValue").textContent = formatCost(budget);
    document.getElementById("deadlineValue").textContent = `${deadline} min`;
    document.getElementById("weatherValue").textContent = `${severity} / 10`;
    document.getElementById("strategyName").textContent = strategyNames[strategy];

    const result = selectRoute(strategy, budget, deadline, severity, priority);
    displayRecommendation(result, strategy, severity, priority);
    displayCandidateRoutes(result, priority);
    displayComparison(budget, deadline, severity);
    displayWeatherExamples(budget, deadline);
}

function resetSettings() {
    document.getElementById("strategy").value = "URGENT";
    document.getElementById("budget").value = 6000;
    document.getElementById("deadline").value = 45;
    document.getElementById("weather").value = 3;
    updateDashboard();
}

for (const inputId of ["strategy", "budget", "deadline", "weather"]) {
    document.getElementById(inputId).addEventListener("input", updateDashboard);
}

document.getElementById("resetButton").addEventListener("click", resetSettings);
updateDashboard();
