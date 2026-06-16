
const CHART_VISIBLE_COUNT = 100;

var count = 0;
function getData(state_data, line, tables, clientsContainer) {
    fetch("/data")
        .then(response => response.json())
        .then(data => {
            state_data.push(data);
            // Keep only the latest items
            if (state_data.length > CHART_VISIBLE_COUNT) {
                state_data.shift();
            }
            updateCompletionBar(state_data, line);
            // updateTableChart("workquantum", state_data, tables["workquantum"]);
            for (const name of getTableNames(data)) {
                updateTableChart(name, state_data, tables[name]);
            }
            updateClientCards(data, clientsContainer);
            setTimeout(() => {
                getData(state_data, line, tables, clientsContainer);
            }, 5000);
        }).catch(error => {
            console.error(error);
            setTimeout(() => {
                getData(state_data, line, tables, clientsContainer);
            }, 5000);
        });
}


function getTableNames(data) {
    return ["completed_work", "workquantum", "users", "feeds", "posts", "comments", "useractions"];
}

function createCompletionBar(container) {
    const barElement = document.createElement("div");
    container.appendChild(barElement);
    var line = new ProgressBar.Line(barElement, {
        color: '#ffcc00',
        trailColor: 'var(--light_background)',
        strokeWidth: 1,
        trailWidth: 1,
        text: {
            value: '110',
            className: 'progress-bar-text',
            style: null,
        }
    });
    return line;
}

function updateCompletionBar(state_data, line) {
    // console.log(state_data.length)
    const latestUpdate = state_data[state_data.length - 1]["latest data"];
    const percentDone = latestUpdate["completed_work"] / latestUpdate["workquantum"];
    const newText = `${(percentDone * 100).toFixed(4)}% (${latestUpdate["completed_work"]}/${latestUpdate["workquantum"]}) completed`;
    line.setText(newText);
    line.animate(percentDone, {duration: 1000, easing: 'easeInOutQuad'});
}

function calcChange(name, data) {
    let updateValue = 0;
    if (data.length > 1) {
        const latestUpdate = data[data.length - 1];
        const secondLatestUpdate = data[data.length - 2];
        if (secondLatestUpdate["update time"] - latestUpdate["update time"] == 0) {
            return 0;
        }
        // return (latestUpdate["latest data"][name] - secondLatestUpdate["latest data"][name]) / (latestUpdate["update time"] - secondLatestUpdate["update time"]);
        updateValue = latestUpdate["latest data"][name] - secondLatestUpdate["latest data"][name];
    } else if (data.length == 1) {
        const latestUpdate = data[data.length - 1];
        // return (latestUpdate["latest data"][name] - latestUpdate["starting data"][name]) / (latestUpdate["update time"] - latestUpdate["start time"]);
        updateValue = latestUpdate["latest data"][name] - latestUpdate["starting data"][name];
    }
    return Math.max(updateValue, 0);
}

function calcRate(name, data) {
    // Use up to the last 10 data points to calculate rate in items per second
    const sampleSize = Math.min(10, data.length);
    if (sampleSize < 2) {
        return 0;
    }

    const latestUpdate = data[data.length - 1];
    const oldestUpdate = data[data.length - sampleSize];
    
    const latestValue = latestUpdate["latest data"][name];
    const oldestValue = oldestUpdate["latest data"][name];
    const valueChange = latestValue - oldestValue;
    
    const latestTime = latestUpdate["update time"];
    const oldestTime = oldestUpdate["update time"];
    const timeChange = latestTime - oldestTime;
    
    if (timeChange === 0) {
        return 0;
    }
    
    // Calculate rate in items per second
    const ratePerSecond = valueChange / timeChange;
    return Math.max(ratePerSecond, 0);
}


async function createAllTableCharts(state_data, container) {
    // use data fetch to get table names
    return await fetch("/data")
        .then(response => response.json())
        .then(data => {
            state_data.push(data)
            tables = {};
            for (const name of getTableNames(data)) {
                tables[name] = createTableChart(name, data, container);
            }
            return tables;
        });
}

function createTableChart(name, data, container) {
    const chartContainer = document.createElement("div");
    chartContainer.className = "chart-container";
    container.appendChild(chartContainer);
    const tableDisplay = document.createElement("canvas");
    const chart = new Chart(tableDisplay, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: `Amount of ${name} added`,
                data: [],
                borderColor: '#ffcc00',
                pointBackgroundColor: '#ffcc00',
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: `Amount of ${name} added`,
                    font: {
                        size: 16,
                    }
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        }
    });
    const startRate = calcChange(name, data);
    if (startRate > 0) {
        chart.data.datasets[0].data.push(startRate);
    }
    chartContainer.appendChild(tableDisplay);
    return chart;
}

function updateTableChart(name, data, chart) {
    chart.data.labels.push("");
    chart.data.datasets[0].data.push(calcChange(name, data));
    chart.options.plugins.title.text = `Amount of ${name} added - ${data[data.length - 1]["latest data"][name].toLocaleString()} total at ${calcRate(name, data).toFixed(2)} items/s`;
    if (chart.data.datasets[0].data.length > CHART_VISIBLE_COUNT) {
        chart.data.datasets[0].data.shift();
        chart.data.labels.shift();
    }
    chart.update();
}

function createClientsContainer(container) {
    const clientsContainer = document.createElement("div");
    clientsContainer.id = "clients-container";
    clientsContainer.className = "clients-container";
    container.appendChild(clientsContainer);
    return clientsContainer;
}

function updateClientCards(data, clientsContainer) {
    // Clear existing cards
    clientsContainer.innerHTML = "";
    
    // Create title
    const title = document.createElement("h2");
    title.textContent = "Active Clients";
    clientsContainer.appendChild(title);
    
    // Create cards container
    const cardsWrapper = document.createElement("div");
    cardsWrapper.className = "cards-wrapper";
    clientsContainer.appendChild(cardsWrapper);
    
    // Get client updates from the latest data
    let clientUpdates = data["client updates"] || [];
    
    if (clientUpdates.length === 0) {
        const noClients = document.createElement("p");
        noClients.textContent = "No active clients";
        cardsWrapper.appendChild(noClients);
        return;
    }
    
    // Sort clients by ClientId
    clientUpdates = clientUpdates.sort((a, b) => {
        const idA = a["ClientId"] || "";
        const idB = b["ClientId"] || "";
        return idA.localeCompare(idB);
    });
    
    // Create a card for each client
    clientUpdates.forEach((client) => {
        const card = document.createElement("div");
        card.className = "client-card";
        
        const clientId = client["ClientId"] || "Unknown";
        const timeSent = client["TimeSent"] || 0;
        
        // Parse ClientData JSON
        let clientData = {};
        try {
            clientData = JSON.parse(client["ClientData"] || "{}");
        } catch (e) {
            console.error("Failed to parse ClientData:", e);
        }
        
        const scrapeCount = clientData["scrape_count"] || 0;
        const currentWork = clientData["current_work"] || null;
        const scrapeStart = clientData["start_time"] || 0;
        const requestsMade = clientData["work_requests_made"] || 0;
        const requestRate = Math.round(clientData["requests_rate"] * 100) / 100 || 0;
        
        // Build card HTML
        let cardHTML = `
            <div class="card-header">
                <h3>${clientId}</h3>
                <span class="card-time">${new Date(timeSent * 1000).toLocaleTimeString()}</span>
            </div>
            <div class="card-content">
                <div class="card-field">
                    <span class="field-label">Scrape Count:</span>
                    <span class="field-value">${scrapeCount}</span>
                </div>
        `;
        
        if (currentWork) {
            cardHTML += `
                <div class="card-field">
                    <span class="field-label">Priority:</span>
                    <span class="field-value">${currentWork["Priority"]}</span>
                </div>
                <div class="card-field">
                    <span class="field-label">Time Spent on Current Work:</span>
                    <span class="field-value">${timeSent - scrapeStart} seconds</span>
                    <span class="field-value">${requestsMade} requests made at ${requestRate} requests/s</span>
                </div>
                <div class="card-field">
                    <span class="field-label">URL:</span>
                    <span class="field-value url">${currentWork["WorkUrl"]}</span>
                </div>
                <div class="card-field">
                    <span class="field-label">Work Type:</span>
                    <span class="field-value">${currentWork["WorkType"]}</span>
                </div>
            `;
        }
        
        cardHTML += `</div>`;
        card.innerHTML = cardHTML;
        cardsWrapper.appendChild(card);
    });
}

async function main() {
    const stateData = [];
    const container = document.getElementById("app");
    const line = createCompletionBar(container);
    const tables = await createAllTableCharts(stateData, container);
    const clientsContainer = createClientsContainer(container);
    getData(stateData, line, tables, clientsContainer);
    console.log(stateData);
    console.log(stateData.length)


}

main();

