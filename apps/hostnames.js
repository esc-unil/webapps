'use strict';
/**
 * Created by tpineau
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
            query.target = {};
            if (query.class != 'all' && query.class != 'null'){query.target.class = query.class;}
            else if (query.class === 'null') {query.target.class = null;}
            async.each(
                ['platforms', 'keywords', 'data'],
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

requests.data = function(db, query, callback){
    db.collection(query.col).find(query.target).toArray(function (err, res) {
        if (err) {callback(err);}
        else {callback(null, res);}
    });
};

requests.platforms = function(db, query, callback){
    var results = {};
    async.each(
        database.platforms,
        function(item, cb) {
            //var target = {};
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
    var results = {};
    async.each(
        database.keywords,
        function(item, cb) {
            //var target = {};
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
