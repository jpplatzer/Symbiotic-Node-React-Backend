// Handle app device API requests
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const Maybe = require('../../common/Maybe').Maybe;
const rrFcns = require('../../common/RqstRespFcns');
const F = require('../../common/FcnHelp');
const Cmn = require('../../common/CmnFcns');
const DB = require('../../db_mgmt/device_db');
const Group = require('./groupApi');
const procCol = require('../../db_mgmt/procColAsync');
const reqValidate = require('../../db_mgmt/reqValidate');

const reportableDeviceFields = ["device", "lot", "model",
  "sn", "subgroup", "lastUpdateTime"];
const reportableDeviceStatusFields = ["device", "subgroup",
  "audits", "active", "connected", "errors", "security"];

exports.devicesRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true,
    Group.authGroupRqstPromise(Group.roles.any),
    (reqResp) => getDevicesForGroup(reqResp,
      rrFcns.dataRespFcn(reqResp, reportableDeviceFields)));
};

function getDevicesForGroup(reqResp, dataRespFcn = null) {
  const getDevices = (completeCB) =>
    DB.getDevicesForGroup(Group.getRqstGroup(reqResp), {}, {}, completeCB);
  const createErrResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  const successRespFcn = (data, resolve) => resolve(dataRespFcn(data));
  return Cmn.fcnCbToPromise(getDevices, createErrResp,
    !dataRespFcn ? null : successRespFcn);
};

exports.deviceStatusesRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true,
    Group.authGroupRqstPromise(Group.roles.any), getDeviceStatusesRqstSeq);
};

const getDeviceStatusesRqstSeq = function(reqResp) {
  return R.compose(
    F.then((devices) => getDeviceStatuses(reqResp, devices,
      rrFcns.dataRespFcn(reqResp, reportableDeviceStatusFields))),
    getDevicesForGroup
  )(reqResp);
};

function getDeviceStatuses(reqResp, devices, dataRespFcn = null) {
  const getStatusesFcn = (completeCB) => populateStatusData(devices, completeCB);
  const createErrResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  const successRespFcn = (data, resolve) => resolve(dataRespFcn(data));
  return Cmn.fcnCbToPromise(getStatusesFcn, createErrResp,
    !dataRespFcn ? null : successRespFcn);

  return Cmn.fcnCbToPromise(getStatusesFcn, createErrResp, dataRespFcn);
};

function deviceAuditCounts(device, procCompleteCB) {
  DB.getReportTimes(device.subgroup, device.device)
    .then((data) => {
      device.audits = data && data.length ? data.length : 0 ;
      procCompleteCB();
    })
    .catch((err) => procCompleteCB(err));
}

function otherDeviceStatus(device, procCompleteCB) {
  device.active = "no";
  device.connected = "n/a";
  device.errors = "n/a";
  device.security = "n/a";
  procCompleteCB();
}

const deviceStatusesProcFcns = procCol.createFcnCollectionProcFcn(
  procCol.createFcnChainCollection()
    .then(deviceAuditCounts)
    .then(otherDeviceStatus)
    .collection
);

function populateStatusData(devices, completeCB) {
  procCol.procCollectionAsync(devices, deviceStatusesProcFcns,
    devices, completeCB);
}

exports.deleteDevicesRqst = function(req, res, next) {
  const validationFcn = rrFcns.authRqstPromise(validateDeleteRqst);
  rrFcns.procValidatedRqst(req, res, next, false, validationFcn, deleteDevices);
};

function getDevicesFromRequestFcn(reqResp) {
  return reqResp.rqst.body.devices;
}

function getGroupFromDeviceFcn(deviceObj) {
  const props = DB.subgroupProps(deviceObj.subgroup);
  return props.group;
}

const validateDeleteRqst = R.compose(
  F.chain((reqResp) =>
    Group.chainableGroupItemsAdminAuthorization(reqResp, getDevicesFromRequestFcn, getGroupFromDeviceFcn)),
  F.chain(rrFcns.chainedValidateReq(reqValidate.DeleteDevicesSchema)),
  rrFcns.validateUserAuth
);

function deleteDevices(reqResp) {
  const reducer = function(notUsed, deviceObj) {
    return DB.delAllDeviceData(deviceObj);
  };
  const devices = getDevicesFromRequestFcn(reqResp);
  return Cmn.arrayAsyncReduce(devices, reducer)
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})));
}
