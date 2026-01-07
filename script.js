document.addEventListener('DOMContentLoaded', function() { //only run the script once page is finished loading

    //Creating map
    var map = L.map('map').setView([51.04, -114.07], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker = null;

    var mqtt = null;
    var connected_flag = 0;

    const startBtn = document.getElementById("startBtn");
    const endBtn = document.getElementById("endBtn");
    const shareBtn = document.getElementById("shareBtn");

    document.querySelector("#startBtn").onclick = function() {
        MQTTconnect();

    }
    
    function MQTTconnect() {
        const host = document.getElementById("host").value;
        const port = Number(document.getElementById("port").value);
        const topic = document.getElementById("topic").value;

        var x = Math.floor(Math.random() * 10000); 
        var cname = "orderform-" +x;   
        
        mqtt = new Paho.MQTT.Client(host, port, cname);

        var options = {
            timeout: 4000,
            useSSL: true,
            onSuccess: function() { onConnect(topic) },
            onFailure: function() { document.getElementById("status").innerHTML = "Connection failed" },
        }

        mqtt.onConnectionLost = onConnectionLost;
        mqtt.onMessageArrived = onMessageArrived;

        mqtt.connect(options);
    };

    function onConnect(topic) {
        connected_flag=1;
        document.getElementById("status").innerHTML="Connected";

        mqtt.subscribe(topic);///////////////////////////////////////////////////////////////////////////??????????

        startBtn.disabled = true;
        endBtn.disabled = false;
        shareBtn.disabled = false;

        document.getElementById("host").disabled = true;
        document.getElementById("port").disabled = true;
        document.getElementById("topic").disabled = true;
    }

    // ---------- DISCONNECT ----------
    endBtn.onclick = () => {
        if (mqtt && connected_flag) {
            mqtt.disconnect();
        }

        connected_flag = false;
        document.getElementById("status").innerHTM = "Disconnected";

        startBtn.disabled = false;
        endBtn.disabled = true;
        shareBtn.disabled = true;

        document.getElementById("host").disabled = false;
        document.getElementById("port").disabled = false;
        document.getElementById("topic").disabled = false;
    };

    //after lost connection try to connect again
    function onConnectionLost() {
        document.getElementById("status").innerHTML = "Connection Lost";
        connected_flag=0;
        setTimeout(MQTTconnect, 3000);
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
            mqtt.send(msg);
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
});
