// Symbiotic log management CLI
// Copyright 2018 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const fs = require('fs');
const Cli = require('../common/CliCmn');
const mongoose = require('mongoose');
const { Schema } = require('mongoose');
const mongoConnect = require('../mongo-connect');
var path = require('path');
const winston = require('winston');

var db;
var secretsManager = Cfg.secrets.createSecretsManager(Cfg);

secretsManager.getSecret(Cfg.secrets.keys.dbLogs)
  .then((passwd) => {
    mongoConnect.connect("logs", "logs", passwd);
    secretsManager = {};
    db = mongoose.connection;
  })

const logger = winston.createLogger({
  level: Cfg.logging.defaultLevel,
  transports: [
    new winston.transports.Console(),
  ],
});
Cfg.logging.setLogger(Cfg, logger);

function closeDb() {
  db.close();
}

// https://github.com/winstonjs/winston-mongodb/blob/master/lib/winston-mongodb.js
const LogSchemaDef = {
  timestamp: Date,
  level: String,
  message: String,
  meta: Schema.Types.Mixed,
  host: String,
  label: String,
};
const logCollection = 'Log';
const LogSchema = new Schema(LogSchemaDef);
const LogModel = mongoose.model(logCollection, LogSchema, 'log');

const cmds = {
  showLogs: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 1), showLogs,
      Cli.logErr, Cli.createCmdResponse("Logs:\n")),
    help: "showLogs [<startTime>]"
  },
  delLogs: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), delLogs),
    help: "delLogs <beforeTime>"
  },
  timeDaysAgo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), timeDaysAgo,
      Cli.logErr, Cli.createCmdResponse("Past date: ")),
    help: "timeDaysAgo <numDays>"
  },
  exit: {
    proc: Cli.exitFcn,
    help: "exit"
  }
};

function showLogs(startTime, completeCB) {
  const queryObj = completeCB ? { timestamp: { $gte: startTime }} : {};
  const cb = completeCB ? completeCB : startTime;
  LogModel.find(queryObj, cb);
}

function delLogs(beforeTime, completeCB) {
  const queryObj = { timestamp: { $lt: beforeTime }};
  LogModel.remove(queryObj, completeCB);
}

function timeDaysAgo(numDays, completeCB) {
  const pastMs = numDays * 24 * 60 * 60 * 1000;
  const pastDate = new Date(Date.now() - pastMs);
  completeCB(null, pastDate.toISOString());
}

Cli.runCli(cmds, closeDb);
