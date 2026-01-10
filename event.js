// archives.js

// Get URL params
const urlParams = new URLSearchParams(window.location.search); 
const distance = urlParams.get("distance");
const stroke = urlParams.get("stroke");
const course = urlParams.get("course");

// Normalize strokes
function normalizeStroke(s) {
    s = s.toLowerCase();
    if (s.includes("free")) return "Free";
    if (s.includes("back")) return "Back";
    if (s.includes("breast")) return "Breast";
    if (s.includes("fly")) return "Fly";
    if (s.includes("im")) return "IM";
    return s;
}

// Set page title
document.getElementById("eventTitle").textContent =
    `${distance} ${stroke} (${course})`;

// Load user
const users = JSON.parse(localStorage.getItem("users")) || [];
const username = localStorage.getItem("username");
const user = users.find(u => u.Name === username);

if (!user) {
    alert("User not found. Please log in again.");
    window.location.href = "index.html";
}

user.times = user.times || [];

// Sorting state
let currentSort = { key: "time", asc: true };

// Convert time to seconds
function timeToSeconds(t) {
    if (!t.includes(":")) return parseFloat(t);
    const [min, sec] = t.split(":");
    return parseInt(min) * 60 + parseFloat(sec);
}

// Filter entries for this event
function filteredEntries() {
    let all = user.times.filter(t =>
        t.distance == distance &&
        normalizeStroke(t.stroke) === normalizeStroke(stroke) &&
        t.course === course
    );

    const year = document.getElementById("yearFilter")?.value;
    if (year && year !== "all") {
        all = all.filter(e => e.date.startsWith(year));
    }
    return all;
}

// Get PB
function getPB() {
    const entries = filteredEntries();
    if (entries.length === 0) return null;
    return entries.reduce((pb, t) =>
        timeToSeconds(t.time) < timeToSeconds(pb.time) ? t : pb
    , entries[0]);
}

// Trend analysis
function analyzeTrend() {
    const entries = filteredEntries().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (entries.length < 2) return "No trend yet";
    const first = timeToSeconds(entries[0].time);
    const last = timeToSeconds(entries[entries.length - 1].time);
    if (last < first) return "Improving!";
    if (last > first) return "Slowing down";
    return "Stable";
}

// Populate year filter
function populateYearFilter() {
    const select = document.getElementById("yearFilter");
    if (!select) return;

    const entries = user.times.filter(t =>
        t.distance == distance &&
        normalizeStroke(t.stroke) === normalizeStroke(stroke) &&
        t.course === course
    );

    const years = [...new Set(entries.map(e => e.date.substring(0, 4)))].sort();
    select.innerHTML = `<option value="all">All years</option>`;
    years.forEach(y => {
        select.innerHTML += `<option value="${y}">${y}</option>`;
    });

    select.addEventListener("change", populateEventTable);
}

// Populate event table
function populateEventTable() {
    const tbody = document.getElementById("eventTable");
    tbody.innerHTML = "";

    let entries = filteredEntries();

    // Apply sorting
    entries.sort((a, b) => {
        if (currentSort.key === "time") return timeToSeconds(a.time) - timeToSeconds(b.time);
        if (currentSort.key === "date") return new Date(a.date) - new Date(b.date);
        if (currentSort.key === "happiness") return (a.happiness || 0) - (b.happiness || 0);
        return 0;
    });

    if (!currentSort.asc) entries.reverse();

    if (entries.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="color: gray;">No archived times yet</td></tr>`;
        return;
    }

    const pb = getPB();

    entries.forEach(e => {
        const tr = document.createElement("tr");

        const tdDate = document.createElement("td");
        tdDate.textContent = e.date;

        const tdTime = document.createElement("td");
        tdTime.textContent = e.time;
        if (pb && e === pb) tdTime.style.color = "gold";

        const tdHappy = document.createElement("td");
        tdHappy.textContent = e.happiness || "-";

        const tdComments = document.createElement("td");
        tdComments.textContent = e.comments || "-";

        const tdActions = document.createElement("td");

        const editBtn = document.createElement("button");
        editBtn.textContent = "Edit";
        editBtn.onclick = () => editEntry(e);
        tdActions.appendChild(editBtn);

        const delBtn = document.createElement("button");
        delBtn.textContent = "Delete";
        delBtn.onclick = () => {
            if (confirm("Delete this entry?")) {
                user.times = user.times.filter(entry => entry !== e);
                localStorage.setItem("users", JSON.stringify(users));
                populateYearFilter();
                populateEventTable();
            }
        };
        tdActions.appendChild(delBtn);

        tr.appendChild(tdDate);
        tr.appendChild(tdTime);
        tr.appendChild(tdHappy);
        tr.appendChild(tdComments);
        tr.appendChild(tdActions);

        tbody.appendChild(tr);
    });

    // Update trend
    const trendDiv = document.getElementById("trendAnalysis");
    if (trendDiv) trendDiv.textContent = "Trend: " + analyzeTrend();

    // Update sorting arrows
    updateSortArrows();
}

// Edit entry
function editEntry(entry) {
    localStorage.setItem("editEntry", JSON.stringify(entry));
    window.location.href = "inputtimes.html";
}

// Show chart
function showChart(type) {
    const entries = filteredEntries().sort((a, b) => new Date(a.date) - new Date(b.date));
    if (entries.length === 0) {
        alert("No times to graph.");
        return;
    }

    const modal = document.getElementById("chartModal");
    modal.style.display = "flex";

    const ctx = document.getElementById("eventChart").getContext("2d");
    if (window.chartInstance) window.chartInstance.destroy();

    const labels = entries.map(e => e.date);
    let data, label;

    if (type === "happiness") {
        data = entries.map(e => Number(e.happiness));
        label = "Happiness Over Time";
    } else {
        data = entries.map(e => timeToSeconds(e.time));
        label = `${distance} ${stroke} (${course})`;
    }

    const pb = getPB();

    window.chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: 'blue',
                backgroundColor: 'rgba(0,0,255,0.2)',
                fill: true,
                pointBackgroundColor: type !== "happiness"
                    ? entries.map(e => e === pb ? 'gold' : 'blue')
                    : 'blue'
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                x: { title: { display: true, text: "Date" } },
                y: { title: { display: true, text: type === "happiness" ? "Happiness" : "Time (sec)" } }
            }
        }
    });
}

function closeChart() {
    document.getElementById("chartModal").style.display = "none";
}

// Export CSV with quoted dates and comments
function exportCSV() {
    let csv = "Distance,Stroke,Course,Time,Date,Comments,Happiness\n";

    const entries = filteredEntries();

    entries.forEach(e => {
        function quote(str) { return `"${String(str).replace(/"/g, '""')}"`; }
        csv += [
            e.distance,
            e.stroke,
            e.course,
            e.time,
            quote(e.date),
            quote(e.comments || ""),
            e.happiness || ""
        ].join(",") + "\n";
    });

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${username}_${distance}_${stroke}_${course}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// Sorting arrows
function updateSortArrows() {
    const headers = document.querySelectorAll("th.sortable");
    headers.forEach(h => {
        h.textContent = h.textContent.replace(/ ↑| ↓/g, "");
        if (h.dataset.sort === currentSort.key) {
            h.textContent += currentSort.asc ? " ↑" : " ↓";
        }
    });
}

// Sorting
function sortTable(key) {
    if (currentSort.key === key) currentSort.asc = !currentSort.asc;
    else {
        currentSort.key = key;
        currentSort.asc = true;
    }
    populateEventTable();
}

// Back button fix
function goBack() {
    if (course === "LC") window.location.href = "archivesLC.html";
    else if (course === "SC") window.location.href = "archivesSC.html";
    else window.history.back();
}

// Initial load
populateYearFilter();
populateEventTable();

