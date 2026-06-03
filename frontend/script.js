

var count = 0;
function getData(state_data, line, tables) {
    fetch("/data")
        .then(response => response.json())
        .then(data => {
            state_data.push(data);
            updateCompletionBar(state_data, line);
            // updateTableChart("workquantum", state_data, tables["workquantum"]);
            for (const name of getTableNames(data)) {
                updateTableChart(name, state_data, tables[name]);
            }
            setTimeout(() => {
                getData(state_data, line, tables);
            }, 5000);
        });
}


function getTableNames(data) {
    return Object.keys(data["latest data"]);
}

function createCompletionBar(container) {
    const barElement = document.createElement("div");
    container.appendChild(barElement);
    var line = new ProgressBar.Line(barElement, {
        color: 'lightblue',
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

function calcRate(name, data) {
    if (data.length > 1) {
        const latestUpdate = data[data.length - 1];
        const secondLatestUpdate = data[data.length - 2];
        if (secondLatestUpdate["update time"] - latestUpdate["update time"] == 0) {
            return 0;
        }
        // return (latestUpdate["latest data"][name] - secondLatestUpdate["latest data"][name]) / (latestUpdate["update time"] - secondLatestUpdate["update time"]);
        return latestUpdate["latest data"][name] - secondLatestUpdate["latest data"][name];
    } else if (data.length == 1) {
        const latestUpdate = data[data.length - 1];
        // return (latestUpdate["latest data"][name] - latestUpdate["starting data"][name]) / (latestUpdate["update time"] - latestUpdate["start time"]);
        return latestUpdate["latest data"][name] - latestUpdate["starting data"][name];
    }
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
                // borderWidth: 1
            }]
        },
        options: {
            maintainAspectRatio: false,
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
        }
    });
    const startRate = calcRate(name, data);
    if (startRate > 0) {
        chart.data.datasets[0].data.push(startRate);
    }
    chartContainer.appendChild(tableDisplay);
    return chart;
}

function updateTableChart(name, data, chart) {
    chart.data.labels.push("");
    chart.data.datasets[0].data.push(calcRate(name, data));
    chart.data.datasets[0].label = `Amount of ${name} added (${data[data.length - 1]["latest data"][name]} total)`;
    if (chart.data.datasets[0].data.length > 100) {
        chart.data.datasets[0].data.shift();
        chart.data.labels.shift();
    }
    chart.update();
}




async function main() {
    const stateData = [];
    const container = document.getElementById("app");
    const line = createCompletionBar(container);
    const tables = await createAllTableCharts(stateData, container);
    getData(stateData, line, tables);
    console.log(stateData);
    console.log(stateData.length)


}

main();

