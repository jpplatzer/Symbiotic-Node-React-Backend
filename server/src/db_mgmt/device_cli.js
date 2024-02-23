// Symbiotic device management CLI
// Copyright 2017 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const fs = require('fs');
const R = require('ramda');
const Cli = require('../common/CliCmn');
const Download = require('../common/DownloadCmn');
const DB = require('./device_db');
const Acct = require('./account');
const Auth = require('../app_api/controllers/authApi');
const AuditAcct = require('./createAuditAcct');
var mongoose = require('mongoose');
const mongoConnect = require('../mongo-connect');
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

const cmds = {
  testInput: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), testInput),
    help: "testInput <input>"
  },
  delObj: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.delObjById),
    help: "delObj <DB ID>"
  },
  createGroupName: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0),
      (cb) => cb(null, DB.createGroupName()),
      Cli.logErr, Cli.createCmdResponse("Group name:")),
    help: "createGroupName"
  },
  addGroup: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 1), DB.addGroup),
    help: "addGroup [<group>]"
  },
  delGroup: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.delGroup),
    help: "delGroup <group>"
  },
  delAllGroupData: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1),
      Cli.procPromise(DB.delAllGroupData)),
    help: "delAllGroupData <group>"
  },
  delUserAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), Acct.delAccount),
    help: "delUserAccount <id>"
  },
  showUserAccounts: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), Acct.getAccounts,
      Cli.logErr, Cli.createJsonResponse("Accounts:\n")),
    help: "showUserAccounts"
  },
  showGroups: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), DB.getGroups,
      Cli.logErr, Cli.createJsonResponse("Groups:\n")),
    help: "showGroups"
  },
  incLastDeviceNum: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.incLastDeviceNum,
      Cli.logErr, Cli.createCmdResponse("Response:\n")),
    help: "incLastDeviceNum <group>"
  },
  addGroupUser: {
    proc: Cli.createCmdProc(validateAddGroupUserParms, DB.addGroupUser),
    help: "addGroupUser <group> <viewer|admin> <id>"
  },
  delGroupUser: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), DB.delGroupUser),
    help: "delGroupUser <group> <id>"
  },
  showUserGroups: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.getUserGroups,
      Cli.logErr, Cli.createCmdResponse("Groups:\n", Cli.JsonStringify)),
    help: "showUserGroups <id>"
  },
  addSubgroup: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), DB.addSubgroup),
    help: "addSubgroup <group> <subgroup>"
  },
  delSubgroup: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), DB.delSubgroup),
    help: "delGroup <group> <subgroup>"
  },
  addLot: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), DB.addLot),
    help: "addLot <group> <lot>"
  },
  delLot: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), DB.delLot),
    help: "delLot <group> <lot>"
  },
  setLotPolicyProp: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), DB.setLotPolicyProp),
    help: "setLotPolicyProp <group> <lot> <key> <value>"
  },
  showLots: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 2), DB.getLots,
      Cli.logErr, Cli.createCmdResponse("Lots:\n", Cli.JsonStringify)),
    help: "showLots [<group>] [<lot>]"
  },
  addDevice: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4,6), DB.addDevice),
    help: "addDevice <id> <subgroup> <lot> <nonce> [<sn> <model>]"
  },
  delDevice: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), delDevice),
    help: "delDevice <id> <subgroup>"
  },
  showDevices: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0,5), getDevices,
      Cli.logErr, Cli.createCmdResponse("Devices:\n", Cli.JsonStringify)),
    help: "showDevices [countOnly|countBySubgroup] [group=<group>] [subgroup=<subgroup>] [device=<id>] [lot=<lot>]"
  },
  delDeviceAccounts: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), delDeviceAccounts),
    help: "delDeviceAccounts <subgroup>"
  },
  delLastDevice: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.delLastDevice),
    help: "delLastDevice <group>"
  },
  showLastDevices: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0,1), DB.getLastDevice,
      Cli.logErr, Cli.createCmdResponse("Last devices:\n")),
    help: "showLastDevices [<group>]"
  },
  delEvents: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2),
      Cli.procPromise(DB.getEvents)),
    help: "delEvents <id> <subgroup>"
  },
  getEvents: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2),
      Cli.procPromise(DB.getEvents), Cli.logErr, Cli.createCmdResponse("Events:\n")),
    help: "getEvents <id> <subgroup>"
  },
  addProfile: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3,5), DB.addProfile),
    help: "addProfile <id> <first> <last> [<startGroup>][<org>]"
  },
  delProfile: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.delProfile),
    help: "delProfile <id>"
  },
  showProfiles: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 1), DB.getProfiles,
      Cli.logErr, Cli.createCmdResponse("Profiles:\n", Cli.JsonStringify)),
    help: "showProfiles [<id>]"
  },
  addTestReportDoc: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), addTestReportDoc),
    help: "addTestReportDoc"
  },
  delReportDoc: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3), DB.delReportDoc),
    help: "delReportDoc device subgroup time"
  },
  showReportDoc: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3), DB.getReportDoc,
      Cli.logErr, Cli.createCmdResponse("Report:\n")),
    help: "showReportDoc device subgroup time"
  },
  showReports: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 2),
      Cli.procPromise(DB.getReportTimes),
      Cli.logErr, Cli.createCmdResponse("Reports:\n")),
    help: "showReports [<subgroup>] [<device>]"
  },
  createRegFile: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3), createRegistrationFile),
    help: "createRegFile <group> <lot> <nonce>"
  },
  createAuditInstaller: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3), createAuditInstaller),
    help: "createAuditInstaller <group> <lot> <nonce>"
  },
  addGroupDownload: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), addGroupDownload),
    help: "addGroupDownload <group> <downloadType> <agreementName> <agreementVersion>"
  },
  resetPw: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), resetPw,
      Cli.logErr, Cli.createCmdResponse("Reset url:\n")),
    help: "resetPw id"
  },
  resetAgreementAcceptance: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), DB.resetAgreementAcceptance),
    help: "resetAgreementAcceptance id"
  },
  testFcn: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 3), testFcn,
      Cli.logErr, Cli.createCmdResponse("Result:\n")),
    help: "testFcn [<parm1>] [<parm2>] [<parm3>]"
  },
  exit: {
    proc: Cli.exitFcn,
    help: "exit"
  }
};

Cli.runCli(cmds, closeDb);

function testInput(input, cb) {
  console.log(input);
  cb();
}

function validateAddGroupUserParms(parms) {
  return parms.length == 3 && (parms[1] == "viewer" || parms[1] == "admin");
}

function delDevice(id, subgroup, completeCB) {
  const dbCB = (err, doc) => {
    if (err) {
      completeCB(err);
    }
    else {
      const deviceId = DB.createFullDeviceID(id, subgroup);
      Acct.delAccount(deviceId, completeCB);
    }
  }
  DB.delDevice(id, subgroup, dbCB);
}

function kvpParamsReducer(result, param) {
  if (param) {
    if (typeof param === 'string') {
      const kvp = param.split('=');
      if (kvp.length == 2) {
        result.params[kvp[0]] = kvp[1];
      }
      else {
        result.options[kvp[0]] = true;
      }
    }
    else {
      result.completeCB = param;
    }
  }
  return result;
}

function getDevices(p1, p2, p3, p4, p5, p6) {
  const result = [p1, p2, p3, p4, p5, p6].reduce(kvpParamsReducer, { params: {}, options: {} });
  const deviceProps = result.params;
  if (deviceProps.group) {
    const group = deviceProps.group;
    delete deviceProps.group;
    if (deviceProps.subgroup) {
      deviceProps.subgroup = DB.createSubgroupName(group, deviceProps.subgroup);
      DB.getDevices(deviceProps, result.options.countOnly, result.completeCB);
    }
    else {
      DB.getDevicesForGroup(group, deviceProps, result.options, result.completeCB);
    }
  }
  else {
    DB.getDevices(deviceProps, result.options.countOnly, result.completeCB);
  }
}

function addTestReportDoc(completeCB) {
  const testDocFilepath = path.join(__dirname, '../tests/auditDoc.txt');
  const testDoc = JSON.parse(fs.readFileSync(testDocFilepath, 'ascii'));
  DB.addReportDoc(testDoc, completeCB);
}

function createRegistrationFile(group, lot, nonce, completeCB) {
  const lotObj = {
    name: lot,
    group,
    nonce,
  };
  AuditAcct.createRegistrationFile(lotObj)
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function createAuditInstaller(group, lot, nonce, completeCB) {
  const lotObj = {
    name: lot,
    group,
    nonce,
  };
  AuditAcct.createAuditInstaller(lotObj)
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function addGroupDownload(group, downloadType, agreementName, agreementVersion, completeCB) {
  if (Download.downloadFileTypes[downloadType]) {
    const agreementProps = {
      name: agreementName,
      version: agreementVersion,
    };
    DB.addGroupDownload(group, downloadType, agreementProps, completeCB);
  }
  else {
    completeCB('Download type is not defined.');
  }
}

function delDeviceAccounts(subgroup, completeCB) {
  DB.delDeviceAccounts(subgroup)
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function resetPw(id, completeCB) {
  Auth.addPwReset(id, 30, true)
    .then((profileDoc) => {
      const tempCode = profileDoc && profileDoc.policies && profileDoc.policies.resets &&
        profileDoc.policies.resets[0] ? profileDoc.policies.resets[0].tempCode : null;
      const url = tempCode ? "/welcome?user=" + id + "&tempCode=" + tempCode : "Reset code not found";
      completeCB(null, url);
    })
    .catch((err) => completeCB(err));
}

function testFcn(completeCB) {
  const testObj1 = { a: 1, b: 2 };
  const testObj2 = { a: 2 };
  const testArr = [
    { a: 1 },
    { a: 1, b: 2 },
    { a: 1, b: 3 },
  ];
  const findObjInArray = (obj, arr) => R.find((o) => R.equals(obj, o))(arr);
  console.log(findObjInArray(testObj1, testArr));
  console.log(findObjInArray(testObj2, testArr));
  completeCB(null, true);
}
