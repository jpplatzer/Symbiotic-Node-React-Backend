// Process device registration
// Copyright 2018 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('../../common/FcnHelp');
const rrFcns = require('../../common/RqstRespFcns');
const reqValidate = require('../../db_mgmt/reqValidate');
const DB = require('../../db_mgmt/device_db');
const Cmn = require('../../common/CmnFcns');
var Acct = require('../../db_mgmt/account');
const Cfg = require('../../app_server/serverConfig');

function createInternalErrFcn(reqResp) {
  return (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
}

function getDbLotDoc(reqResp) {
  const dbGetLotFcn = (dbCB) => DB.getLots(reqResp.rqst.body.group, reqResp.rqst.body.lot, dbCB);
  const procDocFcn = (doc, resolve, reject) => {
    if (!doc || !doc.length == 1) {
      reject(rrFcns.handleErrorResp(reqResp, {
        status: rrFcns.httpStatus.notFound,
        msg: "The device's lot is not found",
      }));
    }
    else {
      const docObj = doc[0];
      if ((docObj.securityCode && docObj.securityCode == reqResp.rqst.body.securityCode) ||
        (docObj.nonce && docObj.nonce == reqResp.rqst.body.nonce)) { // Nonce is deprecated by securityCode
        reqResp.doc = {
          group: docObj.group,
          lot: docObj.name,
        }
        if (docObj.policies) {
          reqResp.doc.policies = JSON.parse(JSON.stringify(docObj.policies))
        }
        resolve(reqResp);
      }
      else {
        reject(rrFcns.handleErrorResp(reqResp,  {
          status: rrFcns.httpStatus.unauthorized,
          msg: "Invalid registration values",
        }));
      }
    }
  }
  return Cmn.fcnCbToPromise(dbGetLotFcn, createInternalErrFcn(reqResp), procDocFcn);
}

function getDeviceSubgroup(reqResp) {
  const deviceDoc = reqResp.doc;
  const deviceProps = {
    lot: deviceDoc.lot
  };
  const options = {
    countBySubgroup: true
  };
  const dbFcn = (cb) => DB.getDevicesForGroup(deviceDoc.group, deviceProps, options, cb);
  const successFcn = (subgroupsDevices, resolve, reject) => {
    const subgroup = getSubgroup(subgroupsDevices, deviceDoc.policies);
    if (subgroup) {
      reqResp.doc.subgroup = subgroup;
      resolve(reqResp);
    }
    else {
      reject(rrFcns.handleErrorResp(reqResp, {
        status: rrFcns.httpStatus.forbidden,
        msg: "Exceeded the maximum number of devices",
      }));
    }
  }
  return Cmn.fcnCbToPromise(dbFcn, createInternalErrFcn(reqResp), successFcn);
}

function getSubgroup(subgroupsDevices, policies) {
  const deviceSubgroupReducer = (result, info) => {
    if (!result.subgroup) {
      result.subgroup = info.subgroup;
      result.count = info.count;
      result.lowestCount = info.count;
    }
    else {
      result.count += info.count;
      if (info.count < result.lowestCount) {
        result.subgroup = info.subgroup;
        result.lowestCount = info.count;
      }
    }
    return result;
  }
  const result = subgroupsDevices.reduce(deviceSubgroupReducer, {});
  return !policies || !policies.maxDevices || result.count < policies.maxDevices
    ? result.subgroup : null;
}

function getUniqueDeviceId(reqResp) {
  const deviceDoc = reqResp.doc;
  const dbFcn = (cb) => DB.incLastDeviceNum(deviceDoc.group, cb);
  const successFcn = (lastDeviceDoc, resolve, reject) => {
    if (lastDeviceDoc) {
      reqResp.doc.device = lastDeviceDoc.num;
      resolve(reqResp);
    }
    else {
      reject(rrFcns.createInternalErrorResp(reqResp,
        'Weird - Group document not found when incrementing last device'));
    }
  }
  return Cmn.fcnCbToPromise(dbFcn, createInternalErrFcn(reqResp), successFcn);
}

function addDeviceDB(reqResp) {
  const deviceDoc = reqResp.doc;
  deviceDoc.securityCode = DB.randomHexValue(18);
  const dbFcn = (cb) => DB.addDevice(deviceDoc.device, deviceDoc.subgroup,
    deviceDoc.lot, deviceDoc.securityCode, cb);
  const successFcn = (unused, resolve) => resolve(reqResp);
  return Cmn.fcnCbToPromise(dbFcn, createInternalErrFcn(reqResp), successFcn);
}

function createDeviceAcct(reqResp) {
  const deviceDoc = reqResp.doc;
  // JPP ToDo - the authCode is eventually derived from multiple factors
  // separately on the device and server
  deviceDoc.authCode = DB.randomHexValue(24);
  deviceDoc.fullDeviceID = DB.createFullDeviceID(deviceDoc.device, deviceDoc.subgroup);
  const dbFcn = (cb) => Acct.addAccount(deviceDoc.fullDeviceID, deviceDoc.authCode, cb);
  const successFcn = (unused, resolve) => {
    Cfg.logging.logger.info("Successfully registered device: " + deviceDoc.fullDeviceID);
    resolve(reqResp);
  }
  return Cmn.fcnCbToPromise(dbFcn, createInternalErrFcn(reqResp), successFcn);
}

function createLoginResp(deviceDoc) {
  return ({
    id: deviceDoc.fullDeviceID,
    lot: deviceDoc.lot,
    authCode: deviceDoc.authCode,
    securityCode: deviceDoc.securityCode,
  });
}

const validatedRqst = R.compose(
  F.eitherToPromise,
  F.chain(rrFcns.chainedValidateReq(reqValidate.registerSchema)),
  rrFcns.createReqResp
);

function showDoc(reqResp) {
  console.log('Doc:', reqResp.doc);
  return Promise.resolve(reqResp);
}

exports.procDeviceRegistration = function(req, res, next) {
  validatedRqst(req, res, next, false)
    .then(getDbLotDoc)
    .then(getDeviceSubgroup)
    .then(getUniqueDeviceId)
    .then(addDeviceDB)
    .then(createDeviceAcct)
    // .then(showDoc)
    .then((reqResp) => rrFcns.sendResponse(
      rrFcns.createStatusObjResp(reqResp, rrFcns.httpStatus.ok, createLoginResp(reqResp.doc))))
    .catch((err) => rrFcns.errorResp(res, err));
}

