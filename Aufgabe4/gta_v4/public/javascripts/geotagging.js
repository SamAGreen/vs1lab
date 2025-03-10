/* Dieses Skript wird ausgeführt, wenn der Browser index.html lädt. */

// Befehle werden sequenziell abgearbeitet ...

class GeoTag {
    constructor(lat, long, name, hashtag) {
        this.latitude = lat;
        this.longitude = long;
        this.name = name;
        this.hashtag = hashtag;
    }
}

// Es folgen einige Deklarationen, die aber noch nicht ausgeführt werden ...

// Hier wird die verwendete API für Geolocations gewählt
// Die folgende Deklaration ist ein 'Mockup', das immer funktioniert und eine fixe Position liefert.
GEOLOCATIONAPI = {
    getCurrentPosition: function (onsuccess) {
        onsuccess({
            "coords": {
                "latitude": 49.013790,
                "longitude": 8.390071,
                "altitude": null,
                "accuracy": 39,
                "altitudeAccuracy": null,
                "heading": null,
                "speed": null
            },
            "timestamp": 1540282332239
        });
    }
};

// Die echte API ist diese.
// Falls es damit Probleme gibt, kommentieren Sie die Zeile aus.
GEOLOCATIONAPI = navigator.geolocation;

/**
 * GeoTagApp Locator Modul
 */
var gtaLocator = (function GtaLocator(geoLocationApi) {

    // Private Member

    /**
     * Funktion spricht Geolocation API an.
     * Bei Erfolg Callback 'onsuccess' mit Position.
     * Bei Fehler Callback 'onerror' mit Meldung.
     * Callback Funktionen als Parameter übergeben.
     */
    var tryLocate = function (onsuccess, onerror) {
        if (geoLocationApi) {
            geoLocationApi.getCurrentPosition(onsuccess, function (error) {
                var msg;
                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        msg = "User denied the request for Geolocation.";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        msg = "Location information is unavailable.";
                        break;
                    case error.TIMEOUT:
                        msg = "The request to get user location timed out.";
                        break;
                    case error.UNKNOWN_ERROR:
                        msg = "An unknown error occurred.";
                        break;
                }
                onerror(msg);
            });
        } else {
            onerror("Geolocation is not supported by this browser.");
        }
    };

    // Auslesen Breitengrad aus der Position
    var getLatitude = function (position) {
        return position.coords.latitude;
    };

    // Auslesen Längengrad aus Position
    var getLongitude = function (position) {
        return position.coords.longitude;
    };

    // Hier API Key eintragen
    var apiKey = "zwmh14qk7RwnybFWnzX5BUN53cAvtKue";

    /**
     * Funktion erzeugt eine URL, die auf die Karte verweist.
     * Falls die Karte geladen werden soll, muss oben ein API Key angegeben
     * sein.
     *
     * lat, lon : aktuelle Koordinaten (hier zentriert die Karte)
     * tags : Array mit Geotag Objekten, das auch leer bleiben kann
     * zoom: Zoomfaktor der Karte
     */
    var getLocationMapSrc = function (lat, lon, tags, zoom) {
        zoom = typeof zoom !== 'undefined' ? zoom : 10;

        if (apiKey === "YOUR_API_KEY_HERE") {
            console.log("No API key provided.");
            return "images/mapview.jpg";
        }

        var tagList = "&pois=You," + lat + "," + lon;
        if (tags !== undefined) tags.forEach(function (tag) {
            tagList += "|" + tag.name + "," + tag.latitude + "," + tag.longitude;
        });

        var urlString = "https://www.mapquestapi.com/staticmap/v4/getmap?key=" +
            apiKey + "&size=600,400&zoom=" + zoom + "&center=" + lat + "," + lon + "&" + tagList;

        console.log("Generated Maps Url: " + urlString);
        return urlString;
    };

    return { // Start öffentlicher Teil des Moduls ...
        // Public Member

        readme: "Dieses Objekt enthält 'öffentliche' Teile des Moduls.",

        updateLocation: function () {
            // TODO Hier Inhalt der Funktion "update" ergänzen
            if (document.getElementById("tag_lat").value == "") {
                tryLocate(function (position) {
                        var lat_vis = document.getElementById("tag_lat");
                        var lat_invis = document.getElementById("hi_lat");
                        var long_vis = document.getElementById("tag_long");
                        var long_invis = document.getElementById("hi_long");
                        var lat = getLatitude(position);
                        var long = getLongitude(position);
                        lat_vis.value = lat_invis.value = lat;
                        long_vis.value = long_invis.value = long;
                        map = getLocationMapSrc(lat, long, JSON.parse(document.getElementById("result-img").dataset.tag), 12);
                        document.getElementById("result-img").setAttribute("src", map);
                    },
                    function (onerror) {
                        alert(onerror);
                    });
            } else {
                map = getLocationMapSrc(document.getElementById("tag_lat").value,
                    document.getElementById("tag_long").value,
                    JSON.parse(document.getElementById("result-img").dataset.tag),
                    12);
                document.getElementById("result-img").setAttribute("src", map);
            }
        },
        //erzeugt neue Map und setzt diese dann ein
        refreshMap: function (taglist) {
            map = getLocationMapSrc(document.getElementById("tag_lat").value,
                document.getElementById("tag_long").value,
                taglist,
                12);
            document.getElementById("result-img").setAttribute("src",map);
        }

    }; // ... Ende öffentlicher Teil
})(GEOLOCATIONAPI);

/**Map wird geupdatet:
 * refreshMap erzeugt neue Karte, setzt diese ein
 * Array wird in DOM eingesetzt:
 * Liste wird in HTML geleert. Fuer jedes Element aus dem gegebenen Array wird ein Listenelement erzeugt,
 * dazu ein Text. Dieser wird an das Listenelement gehaengt, das Listenelement wird dann an die Liste gehaengt
 */
function insertArray(array){
    gtaLocator.refreshMap(array);
    var ul = document.getElementById("results");
    ul.innerHTML = "";
    array.forEach(function (tag) {
        var li = document.createElement("li");
        var linput = document.createTextNode(tag.name + " (" + tag.latitude + "," + tag.longitude + ")" + tag.hashtag);
        li.appendChild(linput);
        ul.appendChild(li);
    });
}
/**
 * $(function(){...}) wartet, bis die Seite komplett geladen wurde. Dann wird die
 * angegebene Funktion aufgerufen. An dieser Stelle beginnt die eigentliche Arbeit
 * des Skripts.
 */
const ajax = new XMLHttpRequest();
$(function () {
    gtaLocator.updateLocation();

    /**Event Listener fuer Tagging
     * Wenn Form Submit passiert:
     * Der normale Post wird abgehalten, die Werte werden aus den Feldern ausgelesen, Name & Hashtag Feld werden geleert
     * Neuer Tag erzeugt, Ajax Post Request auf /geotags wird geöffnet, Request MIME-Type auf JSON gesetzt, der Tag wird als JSON geschickt
     * Nach Antwort:
     * insertArray mit der Antwort(Array an Tags)
     */
    document.getElementById("tag-form").addEventListener("submit", function () {
        event.preventDefault();
        ajax.onreadystatechange = function (){
        if (ajax.readyState === 4 && ajax.status === 201) {
            var response = JSON.parse(ajax.responseText);
            insertArray(response);
        }}
        var long = document.getElementById("tag_long").value;
        var lat = document.getElementById("tag_lat").value;
        var name = document.getElementById("tag_name").value;
        var hashtag = document.getElementById("tag_hashtag").value;
        document.getElementById("tag_name").value= document.getElementById("tag_hashtag").value = "";
        var tag = new GeoTag(lat, long, name, hashtag);
        ajax.open("POST", "/geotags", true);
        ajax.setRequestHeader("Content-Type", "application/json");
        ajax.send(JSON.stringify(tag));
    });
    /**Event Listener fuer Discovery
     * Wenn Form Submit passiert:
     * Normale Post abgehalten, Werte aus Feldern ausgelesen, als Queries in die URI eingesetzt
     * Als GET auf /geotags abgeschickt
     * Nach Antwort:
     * insertArray() wird mit dem zurückgeschickten Array ausgeführt
     */
    document.getElementById("filter-form").addEventListener("submit", function () {
        event.preventDefault();
        ajax.onreadystatechange = function () {
        if (ajax.readyState === 4 && ajax.status === 200) {
            var response = JSON.parse(ajax.responseText);
            insertArray(response);
        }}
        var searchterm = document.getElementById("searchterm").value;
        document.getElementById("searchterm").value="";
        if(searchterm.charAt()==="#"){
        searchterm = searchterm.substring(1);
        searchterm = "%" + searchterm;
        }
        var params = "searchterm=" + searchterm +
            "&latitude=" + document.getElementById("hi_lat").value +
            "&longitude=" + document.getElementById("hi_long").value;
        ajax.open("GET", "/geotags?" + params, true);
        ajax.send();
    });
});
