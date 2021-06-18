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
    let page = [];          //Speichert relevanten Tags, damit wir immer nur die Tags auf den Seiten zurueck schicken die wir brauchen
                            //z.B. nach dem Filtern wollen wir beim Seiten rumklicken weiterhin immer nur die gefilterten Tags haben,
                            //damit das funktioniert muessen wir diese semi-permanent abspeichern
    var currentpage = 1;
    var maxpage = 1;
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

        //
        /**hier fangen die Pagination Methoden an:
         * setPageArray: Setzt unser Seitenarray auf das relevante Array und berechnet dann die MaxPage
         * setCurrentPage: setzt die Variable currentpage
         * getRelevantPage: berechnet auf Basis der itemsperpage und einem seiten index welche Elemente aus dem Array
         *                  zurueck gegeben werden muessen z.B.: itemsperpage = 10, page_index = 2 => high = 20, low = 10
         *                  es werden item 10 bis (nicht einschliesslich) 20 als Array zurueck gegeben
         * getMax: gibt Maximale Seitenanzahl zurueck
         */
        setPageArray : function (array){
            page = array;
            maxpage = page.length<1? 1 : Math.ceil(((page.length) / itemsperpage)); //damit Max-Page nicht 0 wird
        },
        setCurrentPage : function (index){
            currentpage = index;
        },
        getRelevantPage : function (page_index){
            var high = page_index * itemsperpage ;
            var low = high - itemsperpage;
            return page.slice(low,high);
        },
        getMax : function (){
            return maxpage;
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
app.post('/geotags',jsonParser,function (req,res) {
   let lat = req.body.latitude;
   let long = req.body.longitude;
   let name = req.body.name;
   let hashtag = req.body.hashtag;
   var tag = new GeoTag(lat,long,name,hashtag);
   inMemory.addTag(tag);
   res.status(201);
   res.json(inMemory.getList());
});
/**Get mit ID:
 * Prüfen ob Item unter dem Index überhaupt im Array vorhanden ist
 *  true: das Item wird mit status:200 zurückgeschickt
 *  false: status:404, not found zurückgeschickt
 */
app.get("/geotags/:userID",function (req,res){
    var list = inMemory.getList();
    var index = req.params.userID;
    if(index < list.length && index >= 0){
        res.status(200);
        res.json(list[req.params.userID]);
    }else{
        res.sendStatus(404);
    }
});
/**Get mit Query:
 * Die Filterwerte werden aus URI ausgelesen, prüfen ob searchterm ein Hashtag ist (unescape)
 * Wenn kein radius vorhanden ist, ist default radius 1
 * Dann wird gefiltert und das daraus erzeugte Array zurück geschickt
 */
app.get("/geotags",function (req,res){
    let lat = req.query.latitude;
    let long = req.query.longitude;
    let searchterm = req.query.searchterm;
    if (searchterm.charAt(0)==="%"){ //reverse escape
        searchterm = searchterm.substring(1);
        searchterm = "#" + searchterm;
    }
    let radius = req.query.radius;
    radius = (radius == null) ? 1 : radius;
    var taglist = inMemory.findByCoordinate(long,lat,radius);
    if (searchterm !== "" && searchterm !== undefined){
        taglist = inMemory.findByName(taglist,searchterm);
    }
        res.status(200);
        res.json(taglist);

});
/**Put mit ID:
 * Getestet ob Index in Array
 *  true: Tag werte werden ausgelesen, erzeugt und ersetzt dann das Element unter der ID status:204=No Content
 *  false: 404 Antwort
 */
app.put("/geotags/:userID",jsonParser,function (req,res) {
    var index = req.params.userID;
    if(index < inMemory.getList().length && index >= 0){
        let lat = req.body.latitude;
        let long = req.body.longitude;
        let name = req.body.name;
        let hashtag = req.body.hashtag;
        var tag = new GeoTag(lat,long,name,hashtag);
        inMemory.deleteTag(index,tag);
        res.sendStatus(204);
    }else
        res.sendStatus(404);
});
/**Delete mit ID:
    * Prüfen ob Item unter dem Index überhaupt im Array vorhanden ist
*  true: das Item wird gelöscht status:204=No Content
*  false: status:404, not found zurückgeschickt
*/
app.delete("/geotags/:userID",function (req,res){
    var list = inMemory.getList();
    var index = req.params.userID;
    if(index < list.length && index >= 0){
        inMemory.deleteTag(req.params.userID,null);
        res.sendStatus(204);
    }else
        res.sendStatus(404);
});
//Ab hier ist Pagination
/**post auf /Pagination:
 * funktioniert grossteils normal, nur nach addTag() wird das page-Array immer neu gesetzt
 * und die Max-Seite wird mit den tags der letzten Seite als string konkatiniert und zurueck geschickt
 */
app.post("/Pagination",jsonParser,function (req,res){
    let lat = req.body.latitude;
    let long = req.body.longitude;
    let name = req.body.name;
    let hashtag = req.body.hashtag;
    var tag = new GeoTag(lat,long,name,hashtag);
    inMemory.addTag(tag);
    inMemory.setPageArray(inMemory.getList());
    const max = inMemory.getMax();
    const ret = max + JSON.stringify(inMemory.getRelevantPage(max));
    res.status(201);
    res.send(ret);
});
/**get mit query auf /Pagination:
* Auch grossteils wie normal, nach dem Filtern wird das page-Array auf das erzeugte Array gesetzt,
* wieder mit max konkatiniert und zurueck geschickt
*/
app.get("/Pagination",function (req,res){
    let lat = req.query.latitude;
    let long = req.query.longitude;
    let searchterm = req.query.searchterm;
    if (searchterm.charAt(0)==="%"){ //reverse escape
        searchterm = searchterm.substring(1);
        searchterm = "#" + searchterm;
    }
    let radius = req.query.radius;
    radius = (radius == null) ? 1 : radius;
    var taglist = inMemory.findByCoordinate(long,lat,radius);
    if (searchterm !== "" && searchterm !== undefined){
        taglist = inMemory.findByName(taglist,searchterm);
    }
    inMemory.setPageArray(taglist);
    var ret = inMemory.getMax() + JSON.stringify(inMemory.getRelevantPage(1));
    res.status(200);
    res.send(ret);
});
/**get mit ID auf /Pagination:
 * Es wird mit getRelevantPage(ID) ein Array zurueck gegeben
 * Wenn nicht leer: Send mit status:200
 * Sonst: 404
 */
app.get("/Pagination/:pageID",function (req,res){
    var ret = inMemory.getRelevantPage(req.params.pageID);
    if(ret.length!==0){
        res.status(200);
        res.json(ret);
    }else{
        res.status(404);
    }
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
