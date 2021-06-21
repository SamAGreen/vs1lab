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
    constructor(lat,long,name,hashtag,id) {
        this.latitude = lat;
        this.longitude = long;
        this.name = name;
        this.hashtag = hashtag;
        this.identifier = id;
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
    let global_index = 0;
    let itemsperpage = 8;   //kann man aendern wie man will,brauchen wir spaeter zur berechnung von welchen Tags wir zurueck geben
    return {
        findByCoordinate : function (long, lat,userradius){
            var temptag = [];
            taglist.forEach(function (element) {
                var difflong = element.longitude - long;
                var difflat = element.latitude - lat;
                const radius = Math.sqrt(difflong*difflong + difflat*difflat);
                if(radius <= userradius)
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

        deleteTag : function (index,replacement){
            if(replacement == null)
                taglist.splice(index,1);
            else
                taglist.splice(index,1,replacement);
        },
        getIndex : function (){
            return global_index++;
        },
        //Pagination
        getRelevantPage : function (array,page_index){
            var high = page_index * itemsperpage ;
            var low = high - itemsperpage;
            return array.slice(low,high);
        },
        getMax : function (array){
           return array.length<1? 1 : Math.ceil(((array.length) / itemsperpage));
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
    inMemory.setCurrentPage(1);
    res.render('gta', {
        lat: undefined,
        long: undefined,
        page : 1 + "/" + inMemory.getMax(), //speichern page, max, min in DOM ab, damit beim neuladen der Seite
        max : inMemory.getMax(),            //die richtigen Werte trotzdem vorhanden sind
        min : 1,
        taglist: inMemory.getRelevantPage(1)
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
        page : 100,
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
    var templist = inMemory.findByCoordinate(req.body.longitude,req.body.latitude,1);
    if(req.body.searchterm !== "")
        templist = inMemory.findByName(inMemory.getList(),req.body.searchterm);
    res.render('gta',{
        lat: req.body.latitude,
        long: req.body.longitude,
        page : 100,
        taglist : templist
    })

});
//Aber hier ist Aufgabe 4: REST API
var jsonParser = bodyParser.json();
/**Post:
 * Aus dem request body werden die Werte des Geotags genommen und neuer Tag wird erzeugt
 * Der Tag wird in unser Array hinzugefügt, es wird als Antwort(mit status:201=creation successful)
 * das aktuelle Array als JSON zurück geschickt
 */
app.post('/geotags', jsonParser, function (req, res) {
    let lat = req.body.latitude;
    let long = req.body.longitude;
    let name = req.body.name;
    let hashtag = req.body.hashtag;
    var tag = new GeoTag(lat, long, name, hashtag, inMemory.getIndex());
    if(lat >= -90 && lat <=90 && long >=-180 && long <180){
        inMemory.addTag(tag);
        var retlist = inMemory.getList();
        var max = inMemory.getMax(retlist);
        var ret = [max, inMemory.getRelevantPage(retlist,max)];
        res.status(201);
        res.json(ret);
    }else{
        res.status(400);
    }

});
/**Get mit ID:
 * Prüfen ob Item unter der ID überhaupt im Array vorhanden ist
 *  true: das Item wird mit status:200 zurückgeschickt
 *  false: status:404, not found zurückgeschickt
 */
app.get("/geotags/:userID", function (req, res) {
    var list = inMemory.getList();
    var index = req.params.userID.toString();
    var found = false;
    list.every(function (tag) {
        if (index == tag.identifier) {
            res.status(200);
            res.json(tag);
            found = true;
            return false;
        }
        return true;
    });
    if (found == false) {
        res.sendStatus(404);
    }
});
/**Get mit Query:
 * Die Filterwerte werden aus URI ausgelesen, prüfen ob searchterm ein Hashtag ist (unescape)
 * Wenn kein radius vorhanden ist, ist default radius 1
 * Dann wird gefiltert, wenn eine page mitgeliefert wird wird die gewünschte Seite zurückgeschickt
 */
app.get("/geotags",function (req,res){
    let lat = req.query.latitude;
    let long = req.query.longitude;
    let searchterm = req.query.searchterm;
    let page = req.query.page;
    let radius = req.query.radius;
    radius = (radius == null) ? 1 : radius;
    if (searchterm.charAt(0)==="%"){ //reverse escape
        searchterm = searchterm.substring(1);
        searchterm = "#" + searchterm;
    }
    var taglist = inMemory.findByCoordinate(long,lat,radius);
    if (searchterm !== "" && searchterm !== undefined) {
        taglist = inMemory.findByName(taglist, searchterm);
    }
    let max = inMemory.getMax(taglist);
    page = (page == null) ? 1 : page;
    taglist = inMemory.getRelevantPage(taglist,page);
        res.status(200);
        res.json([max,taglist]);

});
/**Put mit ID:
 * Getestet ob Index in Array
 *  true: Tag werte werden ausgelesen, erzeugt und ersetzt dann das Element unter der ID status:204=No Content
 *  false: 404 Antwort
 */
app.put("/geotags/:userID", jsonParser, function (req, res) {
    var list = inMemory.getList();
    var index = req.params.userID;
    let lat = req.body.latitude;
    let long = req.body.longitude;
    let name = req.body.name;
    let hashtag = req.body.hashtag;
    var found = false;
    var newtag = new GeoTag(lat, long, name, hashtag, index);
    if(lat >= -90 && lat <=90 && long >=-180 && long <180){
        list.every(function (tag, ind) {
            if (index == tag.identifier) {
                inMemory.deleteTag(ind, newtag);
                res.sendStatus(204);
                found = true;
                return false;
            }
            return true;
        });
        if(found == false)
            res.sendStatus(404);
    }else
        res.sendStatus(400);
});
/**Delete mit ID:
 * Prüfen ob Item mit der ID überhaupt im Array vorhanden ist
 *  true: das Item wird gelöscht status:204=No Content
 *  false: status:404, not found zurückgeschickt
 */
app.delete("/geotags/:userID", function (req, res) {
    var list = inMemory.getList();
    var index = req.params.userID;
    var found = false;
    list.every(function (tag,ind){
        if(index == tag.identifier){
            inMemory.deleteTag(ind,null);
            res.sendStatus(204);
            found = true;
            return false;
        }
        return true;
    });
    if(found==false)
        res.sendStatus(404);
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
