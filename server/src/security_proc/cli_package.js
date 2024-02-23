// Process debian-style package updates
// Copyright 2018 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const Cli = require('../common/CliCmn');
const DB = require('../db_mgmt/device_db');
var mongoose = require('mongoose');
const mongoConnect = require('../mongo-connect');
var path = require('path');
const debPkg = require('./debianPackageUpdates');
const Pkg = require('./packageUpdateMgr');

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

const cmds = {
  getPackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), getPackagesInfo,
      Cli.logErr, (info) => displayPackagesInfo(info)),
    help: "getPackagesInfo <security|release> <distro> <release> <arch>"
  },
  delPackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), delPackagesInfo),
    help: "delPackagesInfo <security|release> <distro> <release> <arch>"
  },
  showPackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), showPackagesInfo,
      Cli.logErr, (info) => displayPackagesInfo(info)),
    help: "showPackagesInfo <security|release> <distro> <release> <arch>"
  },
  exit: {
    proc: Cli.exitFcn,
    help: "exit"
  }
};

Cli.runCli(cmds, closeDb);

function packageTypeStrToEnum(typeStr) {
  return typeStr == 'security' ? DB.packageTypes.security
    : typeStr == 'release' ? DB.packageTypes.release
    : null;
}

function packageTypeStrToGetFcn(typeStr) {
  return typeStr == 'security' ? Pkg.getSecurityPackages
    : typeStr == 'release' ? Pkg.getReleasePackages
    : null;
}

function getPackagesInfo(type, distro, release, arch, completeCB) {
  const getPackagesFcn = packageTypeStrToGetFcn(type);
  if (getPackagesFcn) {
    getPackagesFcn(distro, release, arch)
      .then((result) => completeCB(null, result))
      .catch((err) => completeCB('getPackagesInfo unexpected error: ' + err));
  }
  else {
    completeCB('Invalid package type');
  }
}

function delPackagesInfo(type, distro, release, arch, completeCB) {
  const packagesType = packageTypeStrToEnum(type);
  if (packagesType !== null) {
    DB.delPackagesInfo(packagesType, distro, release, arch, completeCB);
  }
  else {
    completeCB('Invalid package type');
  }
}

function showPackagesInfo(type, distro, release, arch, completeCB) {
  const packagesType = packageTypeStrToEnum(type);
  if (packagesType !== null) {
    DB.getPackagesInfo(packagesType, distro, release, arch, completeCB);
  }
  else {
    completeCB('Invalid package type');
  }
}

function displayPkgInfo(info) {
  console.log('Package for:', info.distro, info.release, info.arch,
    info.lastChecked, info.lastUpdated);
  const keys = Object.keys(info.packages);
  console.log('Package count:', keys.length);
  if (keys.length > 0) {
    console.log('Package 0:', keys[0], info.packages[keys[0]]);
  }
}

function displayPackagesInfo(info) {
  console.log('Packages info:');
  if (!info) {
    console.log('None found');
  }
  else if (info.length) {
    info.forEach((item) => displayPkgInfo(item));
  }
  else {
    displayPkgInfo(info);
  }
}

