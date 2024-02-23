// Device authentication processing
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('../../common/FcnHelp');
const Maybe = require('../../common/Maybe').Maybe;
const rrFcns = require('../../common/RqstRespFcns');
const reqValidate = require('../../db_mgmt/reqValidate');
const authCtl = require('../../app_api/controllers/authApi');

const authorizeDevice = function(reqResp) {
  rrFcns.setAuthorizedValues(reqResp,
    rrFcns.authorizationTypes.device, reqResp.rqst.user.username);
  return Promise.resolve(reqResp)
}

const performDeviceAaa = R.compose(
  F.then(authorizeDevice),
  authCtl.loginUserPromise
);
exports.performDeviceAaa = performDeviceAaa;

exports.authDeviceReq = function(reqResp) {
  return (reqResp.rqst.user === null || reqResp.rqst.user === undefined)
    ? performDeviceAaa(reqResp)
    : Promise.resolve(reqResp);
}

exports.procDeviceLogin = function(req, res, next) {
  return R.compose(
    F.catchP((err) => rrFcns.errorResp(res, err)),
    F.then(rrFcns.sendResponse),
    F.then((reqResp) => rrFcns.httpResponsePromise(reqResp, rrFcns.httpStatus.ok)),
    F.then(performDeviceAaa),
    F.eitherToPromise,
    F.chain(rrFcns.chainedValidateReq(reqValidate.loginSchema)),
    rrFcns.createReqResp)(req, res, next, false);
}
