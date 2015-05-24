'use strict';
/**
 * Created by tpineau
 *
 */

var mongoClient = require('mongodb').MongoClient;

var database = require('./db.json');

function run(query, callback){
//
    var login = '';
    if (database.mongoDB.user != '' && database.mongoDB.password != ''){
        login = database.mongoDB.user + ':' + database.mongoDB.password;
    }
    var mongoPath = 'mongodb://' + login + database.mongoDB.domain + ':' + database.mongoDB.port + '/' + query.db;
    mongoClient.connect(mongoPath, function(err, db) {
        if (err){
            callback({error: err});
        }
        else {
            db.collection(query.col).find({}).limit(20).toArray(function (err,res){db.close(); callback(res);});
            //db.close();
            //callback(query);
        }
    });
}

exports.run = run;
