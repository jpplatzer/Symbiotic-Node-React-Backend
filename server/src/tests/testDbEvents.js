// Test DB event operations
// Copyright 2020 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const DB = require('../db_mgmt/device_db');
var mongoose = require('mongoose');
const mongoConnect = require('../mongo-connect');

const source1 = "source1";
const type1 = "type1";
const sev1 = 1;
const matched1 = {
  m1: "1",
  m2: "2",
};
const matched2 = {
  m1: "2",
  m2: "2",
};
const unmatched1 = {
  u1: "1",
  u2: "2",
};
const count1 = 3;
const count2 = 1;

var db;
var secretsManager = Cfg.secrets.createSecretsManager(Cfg);

const cmdArgs = process.argv.slice(2);

if (cmdArgs.length != 2) {
  console.log("Command line arguments must be: <device> <subgroup>");
  process.exit(1);
}

const deviceStr = cmdArgs[0];
const subgroupStr = cmdArgs[1];

console.log("Running event tests for: " + deviceStr + " " + subgroupStr);

runEventTests();

function initDb() {
  return secretsManager.getSecret(Cfg.secrets.keys.dbUser)
    .then((passwd) => {
      mongoConnect.connect("devices", process.env.MONGO_USER, passwd);
      secretsManager = {};
      db = mongoose.connection;
      return Promise.resolve();
    });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function delEvents() {
  console.log("Deleting events");
  return DB.delEvents(deviceStr, subgroupStr);
}

function showEvents() {
  console.log("Showing events");
  DB.getEvents(deviceStr, subgroupStr)
    .then((events) => {
      console.log("Got events:\n" + JSON.stringify(events, null, 1));
      return Promise.resolve();
    });
}

function runEventTests() {
  return initDb()
    .then(() => sleep(2000))
    .then(() => delEvents())
    .then(() => addEvent1())
    .then(() => showEvents())
    .then(() => addEvents1_2())
    .then(() => showEvents())
    .then(() => addEvent1())
    .then(() => showEvents())
    .then(() => addEvent1())
    .then(() => showEvents())
    .then(() => addEvents1_2())
    .then(() => showEvents())
    .catch((err) => {
      console.log("Error running event test: " + err);
      return Promise.resolve();
    })
    .then(() => delEvents())
    .then(() => sleep(2000))
    .then(() => process.exit(0));
}

function addEvent1() {
  console.log("Adding event 1");
  const event = createEvent1();
  const events = [event];
  return DB.addEvents(events);
}

function addEvents1_2() {
  console.log("Adding events 1 and 2");
  const event1 = createEvent1();
  const event2 = createEvent2();
  const events = [event1, event2];
  return DB.addEvents(events);
}

 function createEvent1() {
  return ({
    device: deviceStr,
    subgroup: subgroupStr,
    source: source1,
    type: type1,
    severity: sev1,
    aggr: true,
    matched: matched1,
    unmatched: unmatched1,
    last: 1588638156,
    count: count1,
    desc: "Event 1",
  });
}

 function createEvent2() {
  return ({
    device: deviceStr,
    subgroup: subgroupStr,
    source: source1,
    type: type1,
    severity: sev1,
    aggr: true,
    matched: matched2,
    unmatched: unmatched1,
    last: 1588638156,
    count: count2,
    desc: "Event 2",
  });
}
