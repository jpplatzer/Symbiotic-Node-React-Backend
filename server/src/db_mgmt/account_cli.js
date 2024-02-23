// Symbiotic account management CLI
// Copyright 2017 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const Cli = require('../common/CliCmn');
var Acct = require('./account');
const mongoConnect = require('../mongo-connect');
var mongoose = require('mongoose');
var path = require('path');
const winston = require('winston');

var db;
var secretsManager = Cfg.secrets.createSecretsManager(Cfg);

secretsManager.getSecret(Cfg.secrets.keys.dbUser)
  .then((passwd) => {
    mongoConnect.connect("devices", process.env.MONGO_USER, passwd);
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

const setFailedLogins = (id, ip, completeCB) => Acct.setFailedLogins(id, ip, true, completeCB);
const resetFailedLogins = (id, ip, completeCB) => Acct.setFailedLogins(id, ip, false, completeCB);

const cmds = {
  addAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), Acct.addAccount),
    help: "addAccount <id> <authCode>"
  },
  delAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), Acct.delAccount),
    help: "delAccount <id>"
  },
  resetAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), Acct.resetAccount),
    help: "resetAccount <id>"
  },
  addAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), Acct.addAccount),
    help: "addAccount <id> <authCode>"
  },
  showAccounts: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), Acct.getAccounts,
      Cli.logErr, Cli.createCmdResponse("Accounts:\n")),
    help: "showAccounts"
  },
  isLoginLocked: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), Acct.isLoginLocked,
      Cli.logErr, Cli.createCmdResponse("Result:")),
    help: "isLoginLocked <id> <ip address>"
  },
  setFailedLogins: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), setFailedLogins),
    help: "setFailedLogins <id> <ip address>"
  },
  resetFailedLogins: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), resetFailedLogins),
    help: "resetFailedLogins <id> <ip address>"
  },
  delAllFailedLogins: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), Acct.delAllFailedLogins),
    help: "delAllFailedLogins"
  },
  showFailedLogins: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), Acct.getFailedLogins,
      Cli.logErr, Cli.createCmdResponse("Failed Logins:\n")),
    help: "showFailedLogins"
  },
  exit: {
    proc: Cli.exitFcn,
    help: "exit"
  }
};

Cli.runCli(cmds, closeDb);
