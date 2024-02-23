// Functional programming helpers HTTP API processing
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('./FcnHelp.js');
const Cmn = require('./CmnFcns');
const Joi = require('@hapi/joi');
const Maybe = require('./Maybe.js').Maybe;
const Either = require('./Either.js').Either;
var Acct = require('../db_mgmt/account');
const Cfg = require('../app_server/serverConfig');

const authorizationSessionKey = "symbiotic_auth";

const httpStatus = {
  ok: 200,
  created: 201,
  noContent: 204,
  badRequest: 400,
  unauthorized: 401,
  forbidden: 403,
  notFound: 404,
  notAllowed: 405,
  conflict: 409,
  tooMany: 429,
  internalError: 500
};
exports.httpStatus = httpStatus;

const httpStatusMsg = {
  badRequest: "Bad request",
  internalError: "Oops, something went wrong",
  loginFailed: "Login failed",
  unauthorized: "Not authorized",
  notFound: "Not found",
  loginLocked: "Logins temporarily locked - too many failed attempts",
  expired: "This request has expired",
};
exports.httpStatusMsg = httpStatusMsg;

const authorizationTypes = {
  device: 0,
  user: 1,
  admin: 2,
  url: 3
};
exports.authorizationTypes = authorizationTypes;

const createApiResp = function(statusVal, objVal = {}) {
  return { status: statusVal, obj: objVal };
};
exports.createApiResp = createApiResp;

const createApiRespMsg = function(statusVal, msg) {
  return createApiResp(statusVal, msg ? { message: msg }: {} );
}
exports.createApiRespMsg = createApiRespMsg;

const createReqResp = function(req, res, next, allowEmptyReq) {
  const validReq = allowEmptyReq || (req.body !== undefined && req.body !== null);
  const respVal = Maybe.fromNullable(validReq ? null : createApiResp(httpStatus.badRequest));
  const reqResp = { rqst: req, resp: respVal, res: res, next: next };
  return validReq ? Either.right(reqResp) : Either.left(reqResp);
};
exports.createReqResp = createReqResp;

const validateUserAuth = function(reqResp) {
  const username = reqResp.rqst.user ? reqResp.rqst.user.username : null;
  if (username) {
    return Either.right(reqResp);
  }
  else {
    reqResp.resp = Maybe.of(createApiRespMsg(httpStatus.unauthorized,
      httpStatusMsg.unauthorized));
    return Either.left(reqResp);
  }
};
exports.validateUserAuth = validateUserAuth;

const validateReqValue = function(joiSchema, value, reqResp) {
  const result = Joi.validate(value, joiSchema);
  if (result.error !== null) {
    Cfg.logging.logger.debug("Request validation error:", result.error );
    reqResp.resp = Maybe.of(createApiRespMsg(httpStatus.badRequest,
      httpStatusMsg.badRequest));
    return Either.left(reqResp);
  }
  return Either.of(reqResp);
};
exports.validateReqValue = validateReqValue;

exports.chainedValidateReq = (joiSchema) => (reqResp) =>
  validateReqValue(joiSchema, reqResp.rqst.body, reqResp);

exports.chainedValidateValue = (joiSchema, getValueFcn) => (reqResp) =>
  validateReqValue(joiSchema, getValueFcn(reqResp), reqResp);

const errorResp = function(res, err) {
  let reqResp = err;
  if (err.resp === undefined) {
    Cfg.logging.logger.warn("Error response: " + err);
    const resp = Maybe.of(createApiResp(httpStatus.internalError));
    reqResp = { resp: resp, res: res };
  }
  sendResponse(reqResp);
};
exports.errorResp = errorResp;

const sendResponse = function(reqResp) {
  let resp;
  // console.log('sendResponse:', reqResp.resp);
  if (reqResp.resp.isNothing) {
    Cfg.logging.logger.error("sendResponse: Unhandled error response");
    resp = createApiResp(httpStatus.internalError);
  }
  else {
    resp = reqResp.resp.value;
  }
  Cfg.logging.logger.debug("Sending response status:", resp.status, "content: ", resp.obj);
  reqResp.res.status(resp.status);
  reqResp.res.json(resp.obj);
};
exports.sendResponse = sendResponse;

const createDataResp = function(reqResp, data) {
  reqResp.resp = Maybe.of(createApiResp(httpStatus.ok, { data: data }));
  return reqResp;
}
exports.createDataResp = createDataResp;

const dataRespFcn = R.curry((reqResp, reportableFields, data) => {
  const reportableData = data.map
    ? data.map((o) => Cmn.cloneObjProps(o, reportableFields))
    : Cmn.cloneObjProps(data, reportableFields)
    ;
  return createDataResp(reqResp, reportableData);
});
exports.dataRespFcn = dataRespFcn;

const createStatusObjResp = function(reqResp, status, obj) {
  reqResp.resp = Maybe.of(createApiResp(status, obj));
  return reqResp;
};
exports.createStatusObjResp = createStatusObjResp;

const createErrorResp = function(reqResp, respObj) {
  return Maybe.of(createApiRespMsg(respObj.status, respObj.msg))
};
exports.createErrorResp = createErrorResp;

const createInternalErrorResp = function(reqResp, err) {
  Cfg.logging.logger.error("Internal error response:", err);
  return createErrorResp(reqResp,
    { status: httpStatus.internalError, msg: httpStatusMsg.internalError });
};
exports.createInternalErrorResp = createInternalErrorResp;

const handleErrorResp = function(reqResp, err) {
  reqResp.resp = err.resp ? err.resp
    : err.status ? createErrorResp(reqResp, err)
    : createInternalErrorResp(reqResp, err);
  // console.log('handleErrorResp', err, reqResp.resp);
  return reqResp;
}
exports.handleErrorResp = handleErrorResp;

const setAuthorizedValues = function(reqResp, authType, authValues) {
  if (reqResp.rqst.session !== undefined) {
    if (reqResp.rqst.session[authorizationSessionKey] === undefined) {
      reqResp.rqst.session[authorizationSessionKey] = {};
    }
    reqResp.rqst.session[authorizationSessionKey][authType] = authValues;
  }
  else {
    Cfg.logging.logger.warn("No session available for setAuthorizedValues");
  }
};
exports.setAuthorizedValues = setAuthorizedValues;

const getAuthorizedValues = function(reqResp, authType) {
  return (reqResp.rqst.session === undefined ? null :
    (reqResp.rqst.session[authorizationSessionKey] === undefined ? null :
      (reqResp.rqst.session[authorizationSessionKey][authType] === undefined ? null :
        reqResp.rqst.session[authorizationSessionKey][authType])));
};
exports.getAuthorizedValues = getAuthorizedValues;

const httpResponsePromise = function(reqResp, statusVal, objVal = {}) {
  reqResp.resp = Maybe.of(createApiResp(statusVal, objVal));
  return statusVal == httpStatus.ok ? Promise.resolve(reqResp) : Promise.reject(reqResp);
};
exports.httpResponsePromise = httpResponsePromise;

const httpErrorLogPromise = function(reqResp, statusVal, err) {
  if (R.is(String, err)) {
    Cfg.logging.logger.warn("Error processing request:", err);
  }
  return httpResponsePromise(reqResp, statusVal);
};
exports.httpErrorLogPromise = httpErrorLogPromise;

const authRqstPromise = (chainableAuthFcn) => (req, res, next, allowEmptyReq) =>
  R.compose(
    F.eitherToPromise,
    F.chain(chainableAuthFcn),
    createReqResp)(req, res, next, allowEmptyReq);
exports.authRqstPromise = authRqstPromise;

const procValidatedRqst = function(req, res, next, allowEmptyReq,
  promiseAuthFcn, promiseProcFcn) {
  promiseAuthFcn(req, res, next, allowEmptyReq)
    .then(promiseProcFcn)
    .then(sendResponse)
    .catch((err) => errorResp(res, err))
}
exports.procValidatedRqst = procValidatedRqst;
