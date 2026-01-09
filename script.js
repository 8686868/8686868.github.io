document.addEventListener('DOMContentLoaded', function() { //only run the script once page is finished loading

    //Creating map
    var map = L.map('map').setView([51.04, -114.07], 10);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    let marker = null;

    var mqtt = null;
    var connected_flag = 0;

    document.querySelector("#start").onclick = function() {
        MQTTconnect();
    }

    document.querySelector("#end").onclick = function() {
        
        if (connected_flag==1) {
            mqtt.disconnect();

            connected_flag = 0;
            document.getElementById("status").innerHTM = "Disconnected";

            document.querySelector("#start").disabled = false;
            document.querySelector("#end").disabled = true;
            document.querySelector("#share").disabled = true;
        }
    }

    document.querySelector("#share").onclick = function() {
        MQTTshareInfo();
    }
    
    //after lost connection try to connect again
    function onConnectionLost() {
        document.getElementById("status").innerHTML = "Connection Lost";
        connected_flag=0;
        setTimeout(MQTTconnect, 3000);
    }

    //receiving mqtt messages
    function onMessageArrived(r_message) {
        
        const data = JSON.parse(r_message.payloadString);
        const [lon, lat] = data.geometry.coordinates;
        const temp = data.properties.temperature;

        //determining colour of marker based on temp
        var colour = "";

        if (temp >= -40 && temp < 10) {
            colour="blue";
        }

        if (temp >= 10 && temp < 30) {
            colour="green";
        }

        if (temp >= 30 && temp <= 60) {
            colour="red";
        }

        //removing marker if already on map
        if (marker) {
            map.removeLayer(marker);
        }

        //creating new marker with temp popup
        marker = L.circleMarker([lat, lon], {color: colour, fillColor: colour}).bindPopup(`Temperature: ${temp} °C`);
        marker.addTo(map);
    }

    function onConnect(topic) {
        connected_flag=1;
        document.getElementById("status").innerHTML="Connected";

        mqtt.subscribe(topic);

        document.querySelector("#start").disabled = true;
        document.querySelector("#end").disabled = false;
        document.querySelector("#share").disabled = false;
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
            onFailure: function() { document.getElementById("status").innerHTML = "Connection Failed" },
        }

        mqtt.onConnectionLost = onConnectionLost;
        mqtt.onMessageArrived = onMessageArrived;

        mqtt.connect(options);
    };

    function MQTTshareInfo() {

        //using geolocation to get currect position
        navigator.geolocation.getCurrentPosition(function(position) {

            const lat = showPosition.coords.latitude;
            const lon = showPosition.coords.longitude;            

            const temp = Math.floor(Math.random() * 100) - 40;

            //using standard geojson format
            const geojson = {
                type: "Feature",
                geometry: {
                    type: "Point",
                    coordinates: [lon, lat]
                },
                properties: {
                    temperature: temp
                }
            };

            const r_message = new Paho.MQTT.Message(JSON.stringify(geojson));
            r_message.destinationName = document.getElementById("topic").value;
            mqtt.send(r_message);

        });
    };
});
