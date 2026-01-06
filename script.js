// ---------- MAP ----------
const map = L.map("map").setView([51.0447, -114.0719], 11);

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors"
}).addTo(map);

let marker = null;

// ---------- MQTT ----------
let client = null;
let connected = false;

// UI elements
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const endBtn = document.getElementById("endBtn");
const shareBtn = document.getElementById("shareBtn");

// ---------- CONNECT ----------
startBtn.onclick = () => {
    const host = document.getElementById("host").value;
    const port = Number(document.getElementById("port").value);
    const topic = document.getElementById("topic").value;

    client = new Paho.MQTT.Client(
        host,
        port,
        "client-" + Math.random().toString(16).substr(2, 8)
    );

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    client.connect({
        onSuccess: () => onConnect(topic),
        onFailure: () => {
            statusEl.textContent = "Connection failed";
        },
        useSSL: true
    });
};

// ---------- ON CONNECT ----------
function onConnect(topic) {
    connected = true;
    statusEl.textContent = "Connected";
    client.subscribe(topic);

    startBtn.disabled = true;
    endBtn.disabled = false;
    shareBtn.disabled = false;

    document.getElementById("host").disabled = true;
    document.getElementById("port").disabled = true;
    document.getElementById("topic").disabled = true;
}

// ---------- DISCONNECT ----------
endBtn.onclick = () => {
    if (client && connected) {
        client.disconnect();
    }

    connected = false;
    statusEl.textContent = "Disconnected";

    startBtn.disabled = false;
    endBtn.disabled = true;
    shareBtn.disabled = true;

    document.getElementById("host").disabled = false;
    document.getElementById("port").disabled = false;
    document.getElementById("topic").disabled = false;
};

// ---------- AUTO RECONNECT ----------
function onConnectionLost() {
    statusEl.textContent = "Connection lost – reconnecting...";
    connected = false;
    setTimeout(() => startBtn.click(), 3000);
}

// ---------- SHARE MY STATUS ----------
shareBtn.onclick = () => {
    if (!navigator.geolocation) {
        alert("Geolocation not supported");
        return;
    }

    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const temp = Math.floor(Math.random() * 100) - 40;

        const geojson = {
            type: "Feature",
            geometry: {
                type: "Point",
                coordinates: [lng, lat]
            },
            properties: {
                temperature: temp,
                timestamp: new Date().toISOString()
            }
        };

        const msg = new Paho.MQTT.Message(JSON.stringify(geojson));
        msg.destinationName = document.getElementById("topic").value;
        client.send(msg);
    });
};

// ---------- RECEIVE MQTT ----------
function onMessageArrived(message) {
    const data = JSON.parse(message.payloadString);
    const [lng, lat] = data.geometry.coordinates;
    const temp = data.properties.temperature;

    let color = "blue";
    if (temp >= 10 && temp < 30) color = "green";
    if (temp >= 30) color = "red";

    if (marker) map.removeLayer(marker);

    marker = L.circleMarker([lat, lng], {
        radius: 10,
        color: color,
        fillColor: color,
        fillOpacity: 0.8
    }).addTo(map);

    marker.bindPopup(`Temperature: ${temp} °C`);
    map.setView([lat, lng], 15);
}
