'use strict';
/**
 * Created by tpineau
 *
 */

var mongoClient = require('mongodb').MongoClient;
var database = require('./db.json');

function run(query, app){
//
    var login = '';
    if (database.mongoDB.user != '' && database.mongoDB.password != ''){
        login = database.mongoDB.user + ':' + database.mongoDB.password;
    }
    var mongoPath = 'mongodb://' + login + database.mongoDB.domain + ':' + database.mongoDB.port + '/' + query.db;
    mongoClient.connect(mongoPath, function(err, db) {
        if (err){
            app.json({error: err});
        }
        else {
            if (query.method === 'count') {
                db.collection(query.col).count({}, function (err,res){
                    db.close();
                    if (err) {app.json({error: err});}
                    else {app.json(res);}
                });
            }
            else {db.close();}

        }
    });
}

exports.run = run;
