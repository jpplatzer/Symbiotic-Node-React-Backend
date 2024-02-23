// Device DB records operations
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('../../common/FcnHelp.js');
const Maybe = require('../../common/Maybe').Maybe;
const rqstRespFcns = require('../../common/RqstRespFcns');
const DB = require('../../db_mgmt/device_db');
const S = require('../../db_mgmt/device_schema');


function deviceQuery(device, subgroup, reqResp) {
  return new Promise((resolve,reject) => {
    const completeCB = (err, doc) => {
      if (err) {
        reqResp.resp = Maybe.of(rqstRespFcns.createApiResp(
          rqstRespFcns.httpStatus.internalError, {error: err}));
        reject(reqResp);
      }
      else if (doc === null) {
        reqResp.resp = Maybe.of(rqstRespFcns.createApiResp(rqstRespFcns.httpStatus.badRequest));
        reject(reqResp);
      }
      else {
        reqResp.rqst.doc = doc;
        resolve(reqResp);
      }
    };
    DB.getDevice(device, subgroup, completeCB);
  });
};

exports.getDbDeviceDoc = function(reqResp) {
  const c = S.getDeviceSubGroup(reqResp.rqst.body.id);
  if (!c.isNothing) {
    return deviceQuery(c.value.device, c.value.subgroup, reqResp);
  }
  else {
    reqResp.resp = Maybe.of(rqstRespFcns.createApiResp(rqstRespFcns.httpStatus.badRequest));
    return Promise.reject(reqResp);
  }
};

const saveDeviceDoc = function(reqResp) {
  const doc = reqResp.rqst.doc;
  doc.lastUpdateTime = Date.now();
  return new Promise((resolve,reject) => {
    doc.save((err, doc) => {
      if (err) {
        reqResp.resp = Maybe.of(rqstRespFcns.createApiResp(
          rqstRespFcns.httpStatus.internalError, {error: err}));
        reject(reqResp);
      }
      else {
        resolve(reqResp);
      }
    });
  });
};

const rqstToDBEvent = function(device, subgroup, timeDelta, rqstEvent) {
  let dbEvent = {
    device: device,
    subgroup: subgroup
  };
  Object.assign(dbEvent, rqstEvent);
  dbEvent.time += timeDelta;
  return dbEvent;
};

const saveDeviceEvents = function(reqResp) {
  if (reqResp.rqst.body.events === undefined || reqResp.rqst.body.events.length == 0) {
    return Promise.resolve(reqResp);
  }
  else {
    const timeDelta = Date.now() - reqResp.rqst.body.time;
    const conv = R.curry(rqstToDBEvent)(reqResp.rqst.doc.device, reqResp.rqst.doc.subgroup, timeDelta);
    const dbEvents = reqResp.rqst.body.events.map(conv);
    return DB.addEvents(dbEvents)
      .then(() => Promise.resolve(reqResp));
  }
};

exports.updateDeviceDb = R.compose(
  F.then(saveDeviceEvents),
  saveDeviceDoc);
