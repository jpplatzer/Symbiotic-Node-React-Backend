// Create Symbiotic audit accout
// Copyright 2018 Jeff Platzer. All rights reserved.

const DB = require('./device_db');
const Acct = require('./account');
const Cmn = require('../common/CmnFcns');
const Sys = require('../common/SysFcns');
const Download = require('../common/DownloadCmn');
const Cfg = require('../app_server/serverConfig');

const auditFileType = Download.downloadFileTypes.audit;

function createUserAcct(userID) {
  const lockedAuthCode = DB.randomHexValue(24);
  const dbFcn = (cb) => Acct.addAccount(userID, lockedAuthCode, cb);
  return Cmn.fcnCbToPromise(dbFcn);
}

function createGroup(userID) {
  const groupObj = {
    name: DB.createGroupName(),
    subgroups: ['1'],
    admin_users: [userID],
    policies: {
      downloads: [auditFileType],
    },
  };
  const dbFcn = (cb) => DB.createGroup(groupObj, cb);
  const successFcn = (unused, resolve) => resolve(groupObj);
  return Cmn.fcnCbToPromise(dbFcn, null, successFcn);
}

function createLot(groupObj) {
  const lotObj = {
    name: DB.randomHexValue(6),
    group: groupObj.name,
    securityCode: DB.randomHexValue(18),
    policies: {
      maxDevices: Cfg.audit.maxDevices,
    },
  };
  const dbFcn = (cb) => DB.createLot(lotObj, cb);
  const successFcn = (unused, resolve) => resolve(lotObj);
  return Cmn.fcnCbToPromise(dbFcn, null, successFcn);
}

function createLastDevice(group) {
  const dbFcn = (cb) => DB.addLastDevice(group, cb);
  return Cmn.fcnCbToPromise(dbFcn);
}

function createProfile(userID, firstName, lastName, startGroup, org) {
  const profileDoc = {
    id: userID,
    firstName,
    lastName,
    startGroup,
    org,
    active: true,
    policies: { requiredAgreements: Cfg.requiredAgreements },
  };
  return DB.addProfileDoc(profileDoc);
}

function createRegistrationFile(lotObj) {
  if (!Cfg.files.registrationPath) {
    return Promise.reject('Registration file path not specified in the environment');
  }
  const regObj = {
    group: lotObj.group,
    lot: lotObj.name,
    securityCode: lotObj.securityCode,
  };
  return Sys.createSubDir(Cfg.files.registrationPath, lotObj.group)
    .then((parentDir) => Sys.createSubDir(parentDir, 'comms/'))
    .then((parentDir) => Sys.createObjFile(
      parentDir + Cfg.audit.registrationFilename, regObj));
}
exports.createRegistrationFile = createRegistrationFile;

function createUrlFiles(lotObj) {
  const baseRegistrationFilePath = Cfg.files.registrationPath + '/' +
      lotObj.group + '/comms/';
  const createFileReducer = (notUsed, urlFileObj) => {
    const filepath = baseRegistrationFilePath + urlFileObj.filename;
    const content = Cfg.audit.baseUrl + urlFileObj.subpath;
    return Sys.createFile(filepath, content);
  }
  return Cmn.arrayAsyncReduce(Cfg.audit.urlFiles, createFileReducer);
}
exports.createUrlFiles = createUrlFiles;

function createAuditInstaller(lotObj) {
  if (!process.env.AUDIT_PATH) {
    return Promise.reject('Audit path files not specified in the environment');
  }
  const buildFilePath = process.env.AUDIT_PATH + '/' + 'build';
  const regFilePath = Cfg.files.registrationPath + '/' + lotObj.group;
  return Sys.createSubDir(Cfg.files.downloadsPath, lotObj.group)
    .then((parentDir) => Sys.createSubDir(parentDir, auditFileType))
    .then((installDir) =>
      Sys.shellCmd(buildFilePath,
        [ process.env.AUDIT_PATH, regFilePath, installDir ])
    )
    .then((resultsObj) => {
      // console.log(JSON.stringify(resultsObj));
      const downloadPath = Download.groupDownloadObjLoc(Cfg.files.downloadsDir,
        lotObj.group, auditFileType, Download.downloadFileName[auditFileType]);
      const filePath = Cfg.files.filesPath + '/' + downloadPath;
      return Cfg.files.putStoredFile(Cfg.files.filesLoc, filePath, downloadPath)
        .then(() => Promise.resolve(resultsObj));
    })
}
exports.createAuditInstaller = createAuditInstaller;

exports.createAuditAcct = function(userID, firstName, lastName, org) {
  return createUserAcct(userID)
    .then(() => createGroup(userID))
    .then(createLot)
    .then((lot) => {
      return createProfile(userID, firstName, lastName, lot.group, org)
        .then(() => createRegistrationFile(lot))
        .then(() => createUrlFiles(lot))
        .then(() => createLastDevice(lot.group))
        .then(() => createAuditInstaller(lot))
    })
}