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
var inMemory = (function () {
    let taglist = [];

    return {
        findByCoordinate : function (long, lat){
            var temptag = [];
            taglist.forEach(function (element) {
                var difflong = element.longitude - long;
                var difflat = element.latitude - lat;
                const radius = Math.sqrt(difflong*difflong + difflat*difflat);
                if(radius <= 1)
                    temptag.push(element);
            });
            return temptag;
        },
        getList : function (){
            return taglist;
        },
        findByName: function (list,name){
            var temptag = [];
            list.forEach(function (elem){
                if(elem.hashtag.toString().search(name)>=0||elem.name.toString().search(name)>=0)
                    temptag.push(elem);
            });
            return temptag;
        },

        addTag :function (tag){
            taglist.push(tag);
        },

        deleteTag : function (tag){
            var index = taglist.findIndex(tag);
            if(index >= 0){
                taglist.splice(index,1);
            }
        }

    }

})();
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
        taglist: inMemory.getList()
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
    inMemory.addTag(gtag);
    res.render('gta',{
        lat: req.body.latitude,
        long: req.body.longitude,
        taglist : inMemory.getList()
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
    var templist = inMemory.findByCoordinate(req.body.longitude,req.body.latitude);
    if(req.body.searchterm !== "")
        templist = inMemory.findByName(inMemory.getList(),req.body.searchterm);
    res.render('gta',{
        lat: req.body.latitude,
        long: req.body.longitude,
        taglist : templist
    })

});
//REST API
app.post('/geotags',function (req,res) {
    console.log(req.body.longitude);
   let lat = 40;
   let long = 40;
   let name = "A";
   let hashtag = "#test";
   var tag = new GeoTag(lat,long,name,hashtag);
   inMemory.addTag(tag);
   console.log("Tag: "+ name + " added");
   res.status(201);
   res.json(inMemory.getList());
});

app.get("/geotags/:userID",function (req,res){
    var list = inMemory.getList();
    if(req.params.userID < list.length){
        res.status(200);
        res.json(list[req.params.userID]);
    }else{
        res.sendStatus(404);
    }
});
app.delete("/geotags/:userID",function (req,res){
    var list = inMemory.getList();
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
