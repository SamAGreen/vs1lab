/**
 * Template für Übungsaufgabe VS1lab/Aufgabe3
 * Das Skript soll die Serverseite der gegebenen Client Komponenten im
 * Verzeichnisbaum implementieren. Dazu müssen die TODOs erledigt werden.
 */

/**
 * Definiere Modul Abhängigkeiten und erzeuge Express app.
 */

var http = require('http');
//var path = require('path');
var logger = require('morgan');
var bodyParser = require('body-parser');
var express = require('express');

var app;
app = express();
app.use(logger('dev'));
app.use(bodyParser.urlencoded({
    extended: false
}));

// Setze ejs als View Engine
app.set('view engine', 'ejs');

/**
 * Konfiguriere den Pfad für statische Dateien.
 * Teste das Ergebnis im Browser unter 'http://localhost:3000/'.
 */

app.use(express.static(__dirname + "/public/"));

/**
 * Konstruktor für GeoTag Objekte.
 * GeoTag Objekte sollen min. alle Felder des 'tag-form' Formulars aufnehmen.
 */
class GeoTag {
    constructor(lat,long,name,hashtag) {
        this.latitude = lat;
        this.longitude = long;
        this.name = name;
        this.hashtag = hashtag;
    }
}

/**
 * Modul für 'In-Memory'-Speicherung von GeoTags mit folgenden Komponenten:
 * - Array als Speicher für Geo Tags.
 * - Funktion zur Suche von Geo Tags in einem Radius um eine Koordinate.
 * - Funktion zur Suche von Geo Tags nach Suchbegriff.
 * - Funktion zum hinzufügen eines Geo Tags.
 * - Funktion zum Löschen eines Geo Tags.
 */
var taglist = [];
function findByCoordinate(long, lat){
    var temptag = [];
    taglist.forEach(function (element) {
        var difflong = element.longitude - long;
         difflong = difflong>0 ? difflong : -difflong;
         var difflat = element.latitude - lat;
         difflat = difflat>0 ? difflat : -difflat;
         if(difflong <= 1 && difflat <= 1)
         temptag.push(element);
         });
         return temptag;

}
function findByName(list,name){
    var temptag = [];
    list.forEach(function (elem){
        if(elem.hashtag === name || elem.name === name)
            temptag.push(elem);
    });
    return temptag;
}
function addTag(tag){
    taglist.push(tag);
}
function deleteTag(tag){
    var index = taglist.findIndex(tag);
    if(index >= 0){
        taglist.splice(index,1);
    }
}

/**
 * Route mit Pfad '/' für HTTP 'GET' Requests.
 * (http://expressjs.com/de/4x/api.html#app.get.method)
 *
 * Requests enthalten keine Parameter
 *
 * Als Response wird das ejs-Template ohne Geo Tag Objekte gerendert.
 */

app.get('/', function(req, res) {
    res.render('gta', {
        lat: undefined,
        long: undefined,
        taglist: []
    });
});

/**
 * Route mit Pfad '/tagging' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'tag-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Mit den Formulardaten wird ein neuer Geo Tag erstellt und gespeichert.
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 */


app.post('/tagging',function(req,res){
    var gtag = new GeoTag(req.body.latitude,req.body.longitude,req.body.name,req.body.hashtag);
    addTag(gtag);
    res.render('gta',{
        lat: req.body.latitude,
        long: req.body.longitude,
        taglist : taglist,

    })
});
/**
 * Route mit Pfad '/discovery' für HTTP 'POST' Requests.
 * (http://expressjs.com/de/4x/api.html#app.post.method)
 *
 * Requests enthalten im Body die Felder des 'filter-form' Formulars.
 * (http://expressjs.com/de/4x/api.html#req.body)
 *
 * Als Response wird das ejs-Template mit Geo Tag Objekten gerendert.
 * Die Objekte liegen in einem Standard Radius um die Koordinate (lat, lon).
 * Falls 'term' vorhanden ist, wird nach Suchwort gefiltert.
 */


app.post('/discovery',function (req,res){
    var templist = findByCoordinate(req.body.longitude,req.body.latitude);
    if(req.body.searchterm !== "")
        templist = findByName(templist,req.body.searchterm);
    res.render('gta',{
        lat: req.body.latitude,
        long: req.body.longitude,
        taglist : templist,
    })

});
/**
 * Setze Port und speichere in Express.
 */

var port = 3000;
app.set('port', port);

/**
 * Erstelle HTTP Server
 */

var server = http.createServer(app);

/**
 * Horche auf dem Port an allen Netzwerk-Interfaces
 */

server.listen(port);
