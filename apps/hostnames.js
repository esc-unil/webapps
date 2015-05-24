'use strict';
/**
 * Created by tpineau
 *
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
            async.each(
                ['platforms'],
                function (item, cb){
                    requests[item](db, query, function(err, res){
                        if (err){results['platforms']={error: err};}
                        else {results['platforms']=res;}
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


requests.platforms = function(db, query, callback){
    var results = {};
    async.each(
        database.platforms,
        function(item, cb) {
            var target = {};
            if (item != 'total') target = {platforms: item};
            db.collection(query.col).count(target, function (err, res) {
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