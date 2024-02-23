// Devices module
// Copyright 2018 Jeff Platzer. All rights reserved.

const DLC = require('../dataLifecycle');
const { handleActions } = require('redux-actions')

const GET_AUDITS = 'audits/GET_AUDITS';
const auditsSubUrl = '/api/audits';
const GET_AUDIT = 'audits/GET_AUDIT';
const auditSubUrl = '/api/audit';

const getAuditsActionCreator = (params, data) => ({
  type: GET_AUDITS,
  payload: { params, data, timeMs: Date.now() }
});
exports.getAuditsActionCreator = getAuditsActionCreator;

const getAuditActionCreator = (params, data) => ({
  type: GET_AUDIT,
  payload: { params, data, timeMs: Date.now() }
});
exports.getAuditActionCreator = getAuditActionCreator;

const auditsDataTimeoutMs = 120 * 1000;

const auditsUpdateFcns = DLC.createUpdateFcns(
  areAuditsDataParamsValid,
  areAuditsDataParamsEqual,
  getAuditsRqstUrlFcn,
  getAuditsDataFromProps,
  updateAuditsAction,
  DLC.contentTypes.audits,
  DLC.UpdateSettings.noUpdateWhenNotMounted,
  auditsDataTimeoutMs);
exports.auditsUpdateFcns = auditsUpdateFcns;

function areAuditsDataParamsValid(params) {
  return params.group !== undefined &&
    params.subgroup  !== undefined &&
    params.device  !== undefined ? true : false;
}
exports.areAuditsDataParamsValid = areAuditsDataParamsValid;

function areAuditsDataParamsEqual(lhs, rhs) {
  // console.log('areAuditsDataParamsEqual', lhs, rhs);
  return lhs && rhs &&
    lhs.group == rhs.group &&
    lhs.subgroup == rhs.subgroup &&
    lhs.device == rhs.device;
}
exports.areAuditsDataParamsEqual = areAuditsDataParamsEqual;

function getAuditsRqstUrlFcn(params) {
  return auditsSubUrl + '/' + params.group + '/' +
    params.subgroup + '/' + params.device;
}
exports.getAuditsRqstUrlFcn = getAuditsRqstUrlFcn;

function getAuditsDataFromProps(props) {
  return props.audits.audits;
}
exports.getAuditsDataFromProps = getAuditsDataFromProps;

function updateAuditsAction(dispatch, params, doc) {
  return dispatch(getAuditsActionCreator(params, (doc ? doc.data : doc)));
}

const auditLoadingMsg = 'Loading audit results. This could take a few minutes if package statuses need updating ...';

const auditUpdateFcns = DLC.createUpdateFcns(
  areAuditDataParamsValid,
  areAuditDataParamsEqual,
  getAuditRqstUrlFcn,
  getAuditDataFromProps,
  updateAuditAction,
  DLC.contentTypes.audit,
  DLC.UpdateSettings.noUpdateWhenNotMounted,
  0,
  auditLoadingMsg);
exports.auditUpdateFcns = auditUpdateFcns;

function areAuditDataParamsValid(params) {
  return params.group !== undefined &&
    params.subgroup !== undefined &&
    params.device !== undefined &&
    params.time !== undefined ? true : false;
}
exports.areAuditDataParamsValid = areAuditDataParamsValid;

function areAuditDataParamsEqual(lhs, rhs) {
  // console.log('areAuditDataParamsEqual', lhs, rhs);
  return lhs && rhs &&
    lhs.group == rhs.group &&
    lhs.subgroup == rhs.subgroup &&
    lhs.device == rhs.device &&
    lhs.time == rhs.time;
}
exports.areAuditDataParamsEqual = areAuditDataParamsEqual;

function getAuditRqstUrlFcn(params) {
  return auditSubUrl + '/' + params.group + '/' +
    params.subgroup + '/' + params.device + '/' + params.time;
}
exports.getAuditRqstUrlFcn = getAuditRqstUrlFcn;

function getAuditDataFromProps(props) {
  return props.audits.audit;
}
exports.getAuditDataFromProps = getAuditDataFromProps;

function updateAuditAction(dispatch, params, doc) {
  return dispatch(getAuditActionCreator(params, (doc ? doc.data : doc)));
}

exports.deleteAudits = (auditTimeObjs, params) => (dispatch) => {
  const deleteAuditsUrl = '/api/deleteAudits';
  const audits = auditTimeObjs.map(auditTime => ({
    time: auditTime.time,
    device: params.device,
    subgroup: params.group + "|" + params.subgroup,
  }));
  // console.log('deleteAudits', audits, params);
  const deleteDoc = { audits };
  return DLC.updateRqst(deleteAuditsUrl, deleteDoc)
    .then((response) => DLC.getRqst(getAuditsRqstUrlFcn(params)))
    .then((doc) => updateAuditsAction(dispatch, params, doc))
    .catch((alertData) => DLC.notifyAlert(dispatch, alertData))
}

exports.reducer = handleActions({
  [GET_AUDITS]: (state, action) => ({
    ...state,
    audits: action.payload
  }),
  [GET_AUDIT]: (state, action) => ({
    ...state,
    audit: action.payload
  })
}, {
  audits: {},
  audit: {}
});
