// Devices module
// Copyright 2018 Jeff Platzer. All rights reserved.

const DLC = require('../dataLifecycle');
const { handleActions } = require('redux-actions')
import Cmn from '../../../common/CmnFcns';

const SET_LOADED_STATUSES = 'devices/SET_LOADED_STATUSES';
const deviceStatusesSubUrl = '/api/deviceStatuses';

const setLoadedStatusesActionCreator = (params, data) => ({
  type: SET_LOADED_STATUSES,
  payload: { params, data, timeMs: Date.now() }
});
exports.setLoadedStatusesActionCreator = setLoadedStatusesActionCreator;

const statusesDataTimeoutMs = 120 * 1000;

const updateFcns = DLC.createUpdateFcns(
  areStatusesDataParamsValid,
  areStatusesDataParamsEqual,
  getStatusesRqstUrlFcn,
  getStatusesDataFromProps,
  updateStatusesAction,
  DLC.contentTypes.deviceStatuses,
  DLC.UpdateSettings.noUpdateWhenNotMounted,
  statusesDataTimeoutMs);
exports.updateFcns = updateFcns;

function areStatusesDataParamsValid(params) {
  return params.group ? true : false;
}
exports.areStatusesDataParamsValid = areStatusesDataParamsValid;

function areStatusesDataParamsEqual(lhs, rhs) {
  // console.log('areStatusesDataParamsEqual', lhs, rhs);
  return lhs && rhs && lhs.group == rhs.group;
}
exports.areStatusesDataParamsEqual = areStatusesDataParamsEqual;

function getStatusesRqstUrlFcn(params) {
  return deviceStatusesSubUrl + '/' + params.group;
}
exports.getStatusesRqstUrlFcn = getStatusesRqstUrlFcn;

function getStatusesDataFromProps(props) {
  return props.devices ? props.devices.statuses : undefined;
}
exports.getStatusesDataFromProps = getStatusesDataFromProps;

function updateStatusesAction(dispatch, params, doc) {
  return dispatch(setLoadedStatusesActionCreator(params, (doc ? doc.data : doc)));
}

exports.deleteDevices = (deviceObjs, deviceKeys, params) => (dispatch) => {
  const deleteDevicesUrl = '/api/deleteDevices';
  const devices = deviceObjs.map(device => Cmn.cloneObjProps(device, deviceKeys));
  // console.log('deleteDevices', devices, params);
  const deleteDoc = { devices };
  return DLC.updateRqst(deleteDevicesUrl, deleteDoc)
    .then((response) => DLC.getRqst(getStatusesRqstUrlFcn(params)))
    .then((doc) => updateStatusesAction(dispatch, params, doc))
    .catch((alertData) => DLC.notifyAlert(dispatch, alertData))
}

exports.reducer = handleActions({
  [SET_LOADED_STATUSES]: (state, action) => ({
    ...state,
    statuses: action.payload,
  }),
}, {
  statuses: {},
  devices: {}
});
