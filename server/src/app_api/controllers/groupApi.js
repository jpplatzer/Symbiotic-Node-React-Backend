// Handle app group API requests
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const Maybe = require('../../common/Maybe').Maybe;
const Either = require('../../common/Either.js').Either;
const rrFcns = require('../../common/RqstRespFcns');
const F = require('../../common/FcnHelp');
const Cmn = require('../../common/CmnFcns');
const DB = require('../../db_mgmt/device_db');
const reqValidate = require('../../db_mgmt/reqValidate');

const groupVisibleFields = ["name", "subgroups", "policies"];

const roles = {
  any: 0,
  viewer: 1,
  admin: 2
};
exports.roles = roles;

const authGroupRqst = R.curry((role, reqResp) => authGroupRqstChain(reqResp, role));
exports.authGroupRqst = authGroupRqst;

function isGrouproleAuth(reqResp, group, groupRole) {
  const authGroups = rrFcns.getAuthorizedValues(reqResp, groupRole);
  return authGroups != null && authGroups.includes(group);
}
exports.isGrouproleAuth = isGrouproleAuth;

function chainableGroupItemsAdminAuthorization(reqResp, getItemsFromRequestFcn, getGroupFromItemFcn) {
  const isAuthReducer = function(result, item) {
    const group = getGroupFromItemFcn(item);
    return !result ? false
      : group ? isGrouproleAuth(reqResp, group, rrFcns.authorizationTypes.admin)
      : false;
  }
  const groupItems = getItemsFromRequestFcn(reqResp);
  return groupItems.reduce(isAuthReducer, true) ? Either.right(reqResp)
    : Either.left(rrFcns.handleErrorResp(reqResp, {
        status: rrFcns.httpStatus.badRequest,
        msg: "Bad request",
      }));
}
exports.chainableGroupItemsAdminAuthorization = chainableGroupItemsAdminAuthorization;

const getRqstGroup = function(reqResp) {
  return reqResp.rqst.params.group;
};
exports.getRqstGroup = getRqstGroup;

const getRqstQualifiedSubgroup = function(reqResp) {
  return reqResp.rqst.params.group && reqResp.rqst.params.subgroup
    ? reqResp.rqst.params.group + '|' + reqResp.rqst.params.subgroup
    : undefined;
};
exports.getRqstQualifiedSubgroup = getRqstQualifiedSubgroup;


const authGroupRqstChain = function(reqResp, role) {
  return R.compose(
    F.chain((group) => authGroupRqstImpl(reqResp, group, role)),
    F.chain(validateGroup),
    rrFcns.validateUserAuth
  )(reqResp);
};

const authGroupRqstHelper = (role) => (reqResp) => authGroupRqstChain(reqResp, role);
exports.authGroupRqstHelper = authGroupRqstHelper;

const authGroupRqstPromise = (role) => rrFcns.authRqstPromise(authGroupRqstHelper(role));
exports.authGroupRqstPromise = authGroupRqstPromise;

function validateGroup(reqResp) {
  const group = getRqstGroup(reqResp);
  if (group) {
    const valid = reqValidate.isDataValid(group, reqValidate.keyField);
    if (valid) {
      return Either.right(group)
    }
  }
  reqResp.resp = Maybe.of(rrFcns.createApiRespMsg(rrFcns.httpStatus.badRequest,
    rrFcns.httpStatusMsg.badRequest));
  return Either.left(reqResp);
}

function authGroupRqstImpl(reqResp, group, role) {
  if (isGroupAuth(reqResp, group, role,
      roles.viewer, rrFcns.authorizationTypes.user) ||
    isGroupAuth(reqResp, group, role,
      roles.admin, rrFcns.authorizationTypes.admin)) {
    return Either.right(reqResp);
  }
  reqResp.resp = Maybe.of(rrFcns.createApiRespMsg(rrFcns.httpStatus.badRequest,
    rrFcns.httpStatusMsg.badRequest));
  return Either.left(reqResp);
}

function isGroupAuth(reqResp, group, role, tgtRole, groupRole) {
  if (role == roles.any || role == tgtRole) {
    return isGrouproleAuth(reqResp, group, groupRole);
  }
  return false;
}

const getGroupDoc = function(reqResp) {
  const getGroup = (completeCB) => DB.getGroup(getRqstGroup(reqResp), completeCB);
  const createErrorResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  return Cmn.fcnCbToPromise(getGroup, createErrorResp);
};
exports.getGroupDoc = getGroupDoc;

function groupDataResp(reqResp) {
  return getGroupDoc(reqResp)
    .then((doc) => Promise.resolve(rrFcns.dataRespFcn(reqResp, groupVisibleFields, doc)));
}

exports.getGroupRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true,
    authGroupRqstPromise(roles.any), groupDataResp);
};

exports.deleteGroupRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true,
    authGroupRqstPromise(roles.admin), deleteGroupData);
}

function deleteGroupData(reqResp) {
  const group = getRqstGroup(reqResp);
  return DB.delAllGroupData(group)
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})))
    .catch((err) => Promise.resolve(rrFcns.handleErrorResp(reqResp, err)));
}
