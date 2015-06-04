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
                ['youtube'],
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

function dateJour(datebson){
    var date = datebson.getTime() - (datebson.getTime() % 86400000) + new Date().getTimezoneOffset() * 60000;
    return date;
}


requests.timelines = function(db, query, callback){
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
                    var serie = {label: item, x: [], y: []}, data = [], obj=[];
                    for (var i=0; i < res.length; i++) {
                        var objp = obj;
                        if (item != 'total') {
                            obj = {x: dateJour(res[i].stats[item].date),  y: i + 1};
                            if (i === res.length-1){data.push(obj);}
                            else if (i != 0 && objp.x != obj.x){data.push(objp);}
                        }
                        else {
                            obj = {x: dateJour(res[i].date), y: i + 1};
                            if (i === res.length-1){data.push(obj);}
                            else if (i != 0 && objp.x != obj.x){data.push(objp);}}
                    }
                    for (var i=0; i < data.length; i++){  //ajout des dates sans nouveau hostname
                        if (i>0 && data[i].x-data[i-1].x > 86400000){
                            var n = (data[i].x-data[i-1].x)/86400000;
                            for (var j=1; j < n ; j++){
                                serie.x.push(data[i-1].x+j*86400000);
                                serie.y.push(data[i-1].y);
                            }
                        }
                        serie.x.push(data[i].x);
                        serie.y.push(data[i].y);
                    }
                    var datelast = serie.x[serie.x.length-1];
                    while (datelast < dateJour(new Date())){ // ajout des dates jusqu'a ajd
                        datelast = datelast + 86400000;
                        serie.x.push(datelast);
                        serie.y.push(serie.y[serie.y.length-1]);
                    }
                    cb(null, [serie]);
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
    db.collection('hostnames').find({platforms:'twitter'}, {_id:1}).toArray(function (err, hostnames) {
        if (err) {callback(err);}
        else {
            async.concatSeries(
                hostnames,
                function(hostname, cb){
                    var result = {hostname: hostname._id};
                    db.collection('urls').distinct('info.id', {hostname: hostname._id, platform:'twitter',type:'post'}, function (err, res){
                        result.twitter_post = res.length;
                        cb(null, result);
                    });
                },
                function (err, res){callback(null, res);}
            );

        }
    });
};

requests.twitter = function(db, query, callback){
    // contenu de la collection
    db.collection('urls').aggregate(
        {$match:{platform:'twitter', type:'post'}},
        {$group: {_id:"$hostname", posts:{ $sum: 1 }}},
        {$sort:{posts:-1}}, function (err, hostnames) {
        if (err) {callback(err);}
        else {
            var hostname = hostnames[0]["_id"];
            db.collection('urls').aggregate(
                {$match:{platform:'twitter', type:'post', hostname:hostname}},
                {$group: {
                    _id:{ day: {$dayOfMonth: "$info.date"}, month: {$month: "$info.date"}, year: { $year: "$info.date"}},
                    posts:{ $sum: 1 }}},
                {$sort:{posts:1}}, function (err, data) {
                    if (err) {callback(err);}
                    else{callback(null, data);}
                });
        }
    });
};

requests.youtube = function(db, query, callback){
    // contenu de la collection
    db.collection('urls').aggregate(
        {$match:{platform:'youtube', type:'videos'}},
        {$group: {_id:"$hostname", posts:{ $sum: 1 }}},
        {$sort:{posts:-1}},
        {$limit:10}, function (err, hostnames) {
            if (err) {callback(err);}
            else {
                async.concatSeries(
                    hostnames,
                    function(hostname, cb){
                        db.collection('urls').aggregate(
                            {$match:{platform:'youtube', type:'videos', hostname:hostname._id}},
                            {$group: {
                                _id:{ day: {$dayOfMonth: "$info.date"}, month: {$month: "$info.date"}, year: { $year: "$info.date"}},
                                posts:{ $sum: 1 }}},
                            {$sort:{posts:1}}, function (err, data) {
                                if (err) {cb(err);}
                                else{
                                    var result = {hostname: hostname._id, posts: hostname.posts, data:data};
                                    cb(null, result);
                                }
                            });
                    },
                    function(err, res){
                        if (err){callback(err);}
                        else {callback(null, res);}

                    }
                );
            }
        });
};

requests.urls = function(db, query, callback){
    // contenu de la collection
    db.collection('urls').find(query.target).toArray(function (err, res) {
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
