'use strict';
/**
 * Created by tpineau
 *
 *
 * query : {
 *  db: 'string',              le nom de la mongoDB
 *  col: 'string';             la collection contenant les hostnames
 *  class: 'string'            la classification cible (all pour toute)
 *  platforms : [array]        liste des plates-formes selectionnees
 * }
 */

var async = require('async');
var mongoClient = require('mongodb').MongoClient;
var database = require('./db.json');

var requests = {};

function run(query, app){
    if (query.platforms === undefined){query.platforms = [];}
    var login = '';
    if (database.mongoDB.user != '' && database.mongoDB.password != ''){
        login = database.mongoDB.user + ':' + database.mongoDB.password;
    }
    var mongoPath = 'mongodb://' + login + database.mongoDB.domain + ':' + database.mongoDB.port + '/' + query.db;
    mongoClient.connect(mongoPath, function(err, db) {
        if (err){app.json({error: err});}
        else {
            query.target = {};
            if (query.class != 'all' && query.class != 'null' && query.class != ''){query.target.class = query.class;}
            else if (query.class === 'null') {query.target.class = null;}
            var results = {};
            async.eachSeries(
                query.functions,
                function (item, cb){
                    requests[item](db, query, function(err, res){
                        if (err){results[item]={error: err};}
                        else {results[item]=res;}
                        cb();
                    });
                },
                function (err){
                    db.close();
                    if (err){app.json({error: err});}
                    else {app.json(results);}
                }
            );
        }
    });
}

function dateJour(datebson){
    var date = datebson.getTime() - (datebson.getTime() % 86400000) + new Date().getTimezoneOffset() * 60000;
    return date;
}

//--------------------------------------timelines platforms-------------------------------------------------------------

requests.timelines = function(db, query, callback){
    async.concatSeries(
        query.platforms,
        function(item, cb) {
            var date = {};
            var projection = {_id:0};
            if (item != 'total') {
                query.target.platforms = item;
                date['stats.' + item + '.date'] = 1;
                projection['stats.' + item + '.date'] = 1;
            }
            else {
                delete query.target.platforms;
                date['date'] = 1;
                projection['date'] = 1;
            }
            db.collection(query.col).find(query.target, projection).sort(date).toArray(function (err, res) {
                if (err) {cb(err);}
                else {
                    var serie = [], data = [], obj=[];
                    for (var i=0; i < res.length; i++) {
                        var objp = obj;
                        if (item != 'total') {
                            obj = {name: item, x: dateJour(res[i].stats[item].date),  y: i + 1};
                            if (i === res.length-1){data.push(obj);}
                            else if (i != 0 && objp.x != obj.x){data.push(objp);}
                        }
                        else {
                            obj = {name: item, x: dateJour(res[i].date), y: i + 1};
                            if (i === res.length-1){data.push(obj);}
                            else if (i != 0 && objp.x != obj.x){data.push(objp);}}
                    }
                    for (var i=0; i < data.length; i++){  //ajout des dates sans nouveau hostname
                        if (i>0 && data[i].x-data[i-1].x > 86400000){
                            var n = (data[i].x-data[i-1].x)/86400000;
                            for (var j=1; j < n ; j++){
                                serie.push({name:item, x:data[i-1].x+j*86400000, y:data[i-1].y});
                            }
                        }
                        serie.push({name:item, x:data[i].x, y:data[i].y});
                    }
                    var datelast = serie[serie.length-1].x;
                    while (datelast < dateJour(new Date())){ // ajout des dates jusqu'a ajd
                        datelast = datelast + 86400000;
                        serie.push({name:item, x:datelast, y:serie[serie.length-1].y});
                    }
                    cb(null, [serie]);
                }
            });
        },
        function(err, res){
            if (err){callback(err);}
            else{callback(null, res);}
        }
    );
};

//--------------------------------------timelines keywords----------------------------------------------------------
//requests.compSEO

//-------------------------------------comparaisons-----------------------------------------------------------------

requests.compSEO = function (db, query, callback){
    //selectivite des SEO entre eux
    async.concatSeries(
        [{ $all: [ "google", "bing", "yahoo" ] }, { $all: [ "google", "bing"] }, { $all: ["google", "yahoo" ] },
            { $all: ["bing", "yahoo" ]}, 'google', 'bing', 'yahoo'],
        function(item, cb){
            query.target.platforms = item;
            db.collection(query.col).count(query.target, function (err, res) {
                if (err) {cb(err);}
                else {cb(null, res);}
            });
        },
        function (err, res){
            if (err || res.length != 7){callback(err);}
            else {
                var results = {
                    gby: res[0],
                    gb: res[1] - res[0],
                    gy: res[2] - res[0],
                    by: res[3] - res[0],
                    g: res[4] - res[1] - res[2] + res[0],
                    b: res[5] - res[1] - res[3] + res[0],
                    y: res[6] - res[2] - res[3] + res[0]
                };
                callback(null, results);
            }
        }
    );
};

//-------------------------------------stats count------------------------------------------------------------------

requests.keywords = function(db, query, callback){
    // stats par mots-clefs
    var results = [];
    async.eachSeries(
        database.keywords,
        function(item, cb) {
            if (item != 'total') {query.target.keywords = item;}
            else {delete query.target.keywords;}
            db.collection(query.col).count(query.target, function (err, res) {
                if (err) {results[item] = 'error';}
                else {results.push({name: item, n: res});}
                cb();
            });
        },
        function(err){
            if (err){callback(err);}
            else{callback(null,results);}
        }
    );
};

requests.platforms = function(db, query, callback){
    // stats par plates-formes
    var results = [];
    async.eachSeries(
        query.platforms,
        function(item, cb) {
            if (item != 'total') query.target.platforms = item;
            else {delete query.target.platforms;}
            db.collection(query.col).count(query.target, function (err, res) {
                if (err) {results[item] = 'error';}
                else {results.push({name: item, n: res});}
                cb();
            });
        },
        function(err){
            if (err){callback(err);}
            else{callback(null,results);}
        }
    );
};

exports.run = run;
