'use strict';
/**
 * Created by tpineau
 *
 * Pour une utilisation avec le Visualizer: https://github.com/npellet/visualizer
 *
 * query : {
 *  db: 'string',              le nom de la mongoDB
 *  col: 'string';             la collection contenant les hostnames
 *  class: 'string'            la classification cible (all pour toute)
 * }
 */

var async = require('async');
var mongoClient = require('mongodb').MongoClient;
var database = require('./db.json');

var requests = {};

function run(query, app){
    var login = '';
    if (database.mongoDB.user != '' && database.mongoDB.password != ''){
        login = database.mongoDB.user + ':' + database.mongoDB.password;
    }
    var mongoPath = 'mongodb://' + login + database.mongoDB.domain + ':' + database.mongoDB.port + '/' + query.db;
    mongoClient.connect(mongoPath, function(err, db) {
        if (err){app.json({error: err});}
        else {
            var results = {};
            async.eachSeries(
                ['platforms', 'keywords', 'timelines'],
                function (item, cb){
                    query.target = {};
                    if (query.class != 'all' && query.class != 'null' && query.class != ''){query.target.class = query.class;}
                    else if (query.class === 'null') {query.target.class = null;}
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

requests.timelines = function(db, query, callback){
    // timelines par plates-formes
    var results = {
        type: 'chart',
        value: {
            data: []
        }
    };
    async.concatSeries(
        database.platforms,
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
                    var serie = {
                        label: item,
                        x: [],
                        y: []
                    };

                    var x, y;
                    for (var i=0; i < res.length; i++) {
                        var x_p = x, y_p = y; //var precedentes
                        if (item != 'total') {
                            x = res[i].stats[item].date.getTime();
                            y = i+1;
                            if (i === res.length-1){
                                serie.x.push(x);
                                serie.y.push(y);
                            }
                            else if (i != 0 && res[i].stats[item].date.toDateString() != res[i-1].stats[item].date.toDateString()){
                                serie.x.push(x_p);
                                serie.y.push(y_p);
                            }
                        }
                        else {
                            x = res[i].date.getTime();
                            y = i+1;
                            if (i === res.length-1){
                                serie.x.push(x);
                                serie.y.push(y);
                            }
                            else if (i != 0 && res[i].date.toDateString() != res[i-1].date.toDateString()){
                                serie.x.push(x_p);
                                serie.y.push(y_p);
                            }
                        }
                    }
                    cb(null, serie);
                }
            });
        },
        function(err, series){
            if (err){callback(err);}
            else{
                results.value.data = series;
                callback(null, results);
            }
        }
    );
};

//-------------------------------------stats count------------------------------------------------------------------

requests.data = function(db, query, callback){
    // contenu de la collection
    db.collection(query.col).find(query.target).toArray(function (err, res) {
        if (err) {callback(err);}
        else {callback(null, res);}
    });
};

requests.platforms = function(db, query, callback){
    // stats par plates-formes
    var results = {};
    async.each(
        database.platforms,
        function(item, cb) {
            if (item != 'total') query.target.platforms = item;
            db.collection(query.col).count(query.target, function (err, res) {
                if (err) {results[item] = 'error';}
                else {results[item]= res;}
                cb();
            });
        },
        function(err){
            if (err){callback(err);}
            else{callback(null,results);}
        }
    );
};

requests.keywords = function(db, query, callback){
    // stats par mots-clefs
    var results = {};
    async.eachLimit(
        database.keywords,
        20,
        function(item, cb) {
            if (item != 'total') query.target.keywords = item;
            db.collection(query.col).count(query.target, function (err, res) {
                if (err) {results[item] = 'error';}
                else {results[item]= res;}
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
