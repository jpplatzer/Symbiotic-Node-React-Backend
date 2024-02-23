// Symbiotic Mongoose connection handler.
// Copyright 2017 Jeff Platzer. All rights reserved.

var mongoose = require('mongoose');
const config = require('../app_server/serverConfig');

mongoose.Promise = Promise;

function dbSetReducer(setStr, url, idx) {
  if (idx > 0) {
    setStr += ',';
  }
  setStr += url;
  return setStr;
}

const mongoUrl = function(db, user, password) {
  return "mongodb://" +
    user + ":" +
    password + "@" +
    config.db.hosts.reduce(dbSetReducer, "") + "/" +
    db +
    (config.db.replicaSet ? "?replicaSet=" + config.db.replicaSet : "");
};

// CAPTURE APP TERMINATION / RESTART EVENTS
// To be called when process is restarted or terminated
const gracefulShutdown = function(msg, callback) {
    mongoose.connection.close(function() {
        console.log('Mongoose disconnected through ' + msg);
        callback();
    });
};

const mongoConnect = function(db, user, password) {
  var dbURI = mongoUrl(db, user, password);
  console.log("Mongoose connecting to mongo DB");

  mongoose.connect(dbURI, { useNewUrlParser: true });

  // CONNECTION EVENTS
  mongoose.connection.on('connected', function() {
      console.log('Mongoose connected to DB');
  });
  mongoose.connection.on('error', function(err) {
      console.log('Mongoose connection error: ' + err);
  });
  mongoose.connection.on('disconnected', function() {
      console.log('Mongoose disconnected');
  });

  // For nodemon restarts
  process.once('SIGUSR2', function() {
      gracefulShutdown('nodemon restart', function() {
          process.kill(process.pid, 'SIGUSR2');
      });
  });
  // For app termination
  process.on('SIGINT', function() {
      gracefulShutdown('app termination', function() {
          process.exit(0);
      });
  });
  // For Heroku app termination
  process.on('SIGTERM', function() {
      gracefulShutdown('termination signal', function() {
          process.exit(0);
      });
  });
};

module.exports = {
  url: mongoUrl,
  connect: mongoConnect
};


