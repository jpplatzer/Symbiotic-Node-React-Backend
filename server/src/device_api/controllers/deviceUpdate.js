// Device update processing
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('../../common/FcnHelp');
const Maybe = require('../../common/Maybe').Maybe;
const rrFcns = require('../../common/RqstRespFcns');
const UpDB = require('../models/update_db');
const {authDeviceReq} = require('./deviceAuth');
const reqValidate = require('../../db_mgmt/reqValidate');

const procSecurityCode = function(reqResp) {
  if (reqResp.rqst.body.securityCode != reqResp.rqst.doc.securityCode &&
    reqResp.rqst.body.securityCode != reqResp.rqst.doc.nonce) {
    // JPP Todo return throttled (to prevent DOS) config, rerun, report response
    // For now just return unauthorized
    console.log("procSecurityCode rqst code, doc:", reqResp.rqst.body.securityCode, reqResp.rqst.doc);
    reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.unauthorized));
    return Promise.reject(reqResp);
  }
  else {
    return Promise.resolve(reqResp);
  }
};

const updateResp = function(reqResp) {
  // JPP Todo add return commands to the device
  // For now just return empty commands
  return rrFcns.httpResponsePromise(reqResp, rrFcns.httpStatus.ok,
    {accepted: true, commands: []});
}

const validateUpdatePromise = R.compose(
  F.eitherToPromise,
  F.chain(rrFcns.chainedValidateReq(reqValidate.updateSchema)),
  rrFcns.createReqResp
);

/* POST an update */
/* /device/update */
exports.procDeviceUpdate = function(req, res, next) {
  return validateUpdatePromise(req, res, next, false)
    .then(authDeviceReq)
    .then(UpDB.getDbDeviceDoc)
    .then(procSecurityCode)
    .then(UpDB.updateDeviceDb)
    .then(updateResp)
    .then(rrFcns.sendResponse)
    .catch((err) => rrFcns.errorResp(res, err));
}
