// Client to server communications module
// Copyright 2018 Jeff Platzer. All rights reserved.

const { handleActions } = require('redux-actions');
import Paths from '../paths';
import { AlertClasses } from '../components/Alerts';

function resultsValue(key, value, results) {
  if (results) {
    results[key] = value;
  }
  else {
    results = value;
  }
  return results;
}
exports.resultsValue = resultsValue;

const NOTIFY_ALERT = 'notify/NOTIFY_ALERT';

const notifyAlertActionCreator = (alert) => ({
  type: NOTIFY_ALERT,
  payload: alert,
});
exports.notifyAlertActionCreator = notifyAlertActionCreator;

function redirectToLogin() {
  // JPP ToDo - There has to be a better way to redirect to a non-hash login path
  // But, after a number of tries this is the only one that worked
  window.location.href = Paths.login.path;
}
exports.redirectToLogin = redirectToLogin;

const alertMsgs = {
  400: "Invalid request",
  401: "Unauthorized request",
  404: "Requested resource not found"
};

const headers = new Headers();

const fetchParms = {
  method: 'GET',
  headers: headers,
  credentials: 'same-origin'
};

function alertResponse(response) {
  let message = response.status === undefined
    ? "Failure communicating with the server. Retrying ..."
    : alertMsgs[response.status];
  message = message ? message : "Unexpected server error";
  return {
    alertClass: AlertClasses.error,
    status: response.status ? response.status : null,
    message,
  }
}

const loadingMsg = "Loading. Please wait.";
const retryTimeoutMs = 60 * 1000;

const NOTIFY_MOUNTING = 'notify/NOTIFY_MOUNTING';

const contentTypes = {
  devices: 1,
  deviceStatuses: 2,
  groups: 3,
  groupStatuses: 4,
  audits: 5,
  audit: 6,
  dash: 7,
  group: 8,
  welcome: 9,
  setPassword: 10,
};
exports.contentTypes = contentTypes;

const UpdateSettings = {
  noUpdateWhenNotMounted: 0,
  updateWhenNotMounted: 1,
};
exports.UpdateSettings = UpdateSettings;

function createMountingState(contentType, params) {
  return ({
    contentType,
    params,
  });
}
exports.createMountingState = createMountingState;

const notifyMountingActionCreator = (mountingState) => ({
  type: NOTIFY_MOUNTING,
  payload: mountingState,
});
exports.notifyMountingActionCreator = notifyMountingActionCreator;

const NOTIFY_MOUNTING_AND_ALERT = 'notify/NOTIFY_MOUNTING_AND_ALERT';

const notifyMountingAndAlertActionCreator = (mountingState, alert) => ({
  type: NOTIFY_MOUNTING_AND_ALERT,
  payload: {
    mountingState,
    alert,
  },
});
exports.notifyMountingAndAlertActionCreator = notifyMountingAndAlertActionCreator;

const getDataRqst = (subUrl) => {
  return fetch(subUrl, fetchParms)
    .then((response) => {
      // console.log(response);
      if (response.ok && response.status == 200) {
        return response.json();
      }
      else {
        return Promise.reject(response);
      }
    });
};
exports.getDataRqst = getDataRqst;

function notifyAlert(dispatch, alertData) {
  // console.log('notifyAlert:', alertData);
  return dispatch(notifyAlertActionCreator(alertData));
}
exports.notifyAlert = notifyAlert;

function notifyFailedResponse(dispatch, response) {
  const alert = alertResponse(response);
  // console.log('procFailedRqst:', response);
  return notifyAlert(dispatch, alert);
}
exports.notifyFailedResponse = notifyFailedResponse;

function createUpdateFcns(
  areDataParamsValid,
  areDataParamsEqual,
  getDataRqstUrl,
  getStateDataFromProps,
  updateLoadedDataAction,
  contentType,
  updateSetting,
  dataTimeoutMs,
  loadingDataMsg = loadingMsg,
  ) {
  return ({
    areDataParamsValid,
    areDataParamsEqual,
    getDataRqstUrl,
    getStateDataFromProps,
    updateLoadedDataAction,
    contentType,
    updateSetting,
    dataTimeoutMs,
    loadingDataMsg,
  });
}
exports.createUpdateFcns = createUpdateFcns;

const loadPage = (props, updateFcns, sidebarProps) => (dispatch, getState) => {
  loadPageImpl(dispatch, getState, false, props, updateFcns, sidebarProps);
}
exports.loadPage = loadPage;

const updatePage = (props, updateFcns, sidebarProps) => (dispatch, getState) => {
  loadPageImpl(dispatch, getState, true, props, updateFcns, sidebarProps);
}
exports.updatePage = updatePage;

function loadPageImpl(dispatch, getState, isUpdating, props, updateFcns, sidebarProps) {
  // console.log('loadPageImpl loading user data:', isUpdating, props, updateFcns, sidebarProps);
  loadUserData(dispatch, getState, props)
    .then((profileData) => {
      if (!conditionalRedirectHome(props, profileData)) {
        const state = getState();
        if (updateFcns && (!isUpdating || paramsChanged(state, props, updateFcns))) {
          updateData(dispatch, getState, props, updateFcns);
        }
        if (sidebarProps) {
          props.actions.setSidebarProps(sidebarProps);
        }
      }
    })
    .catch((alertData) => {
      console.log("loadPageImpl error:", alertData);
      notifyAlert(dispatch, alertData)
    });
}

function loadUserData(dispatch, getState, props) {
  const state = getState();
  if (!state.profile || !state.profile.data) {
    // console.log("loadUserData: getting user profile information");
    return props.actions.getProfile({})
      .then((contentInfo) => props.actions.getGroup(contentInfo.profile.startGroup, contentInfo))
      .then((contentInfo) => {
        props.actions.setDashContent(contentInfo.profile);
        return Promise.resolve(contentInfo.profile);
      });
  }
  return Promise.resolve(state.profile.data);
}

function isRestrictedToHomePage(profileData)  {
  return !profileData.agreementsCurrent || !profileData.passwordCurrent;
  // return false;
}
exports.isRestrictedToHomePage = isRestrictedToHomePage;

function conditionalRedirectHome(props, profileData) {
  const homePath = Paths.home.path;
  if (props.location && props.router &&
    !props.noRedirectHome &&
    isRestrictedToHomePage(profileData) &&
    props.location.pathname != homePath) {
      console.log("conditionalRedirectHome: true");
      props.router.push(homePath);
      return true;
  }
  return false;
}

function paramsChanged(state, props, updateFcns) {
  const stateData = updateFcns.getStateDataFromProps(state);
  return (updateFcns.areDataParamsValid(stateData.params) &&
    !updateFcns.areDataParamsEqual(props.params, stateData.params));
}

function updateData(dispatch, getState, props, updateFcns) {
  const results = dataUpdateStatus(getState, props, updateFcns);
  // console.log('updateLoadedDataOnMount:', props, results);
  if (results.error) {
    notifyAlert(dispatch, results.error);
  }
  else {
    if (results.paramsChanged || results.contentTypeChanged) {
      updateMountingDataAction(dispatch, props, updateFcns, results.updateData);
      if (results.paramsChanged) {
        updateFcns.updateLoadedDataAction(dispatch, props.params);
      }
    }
    if (results.updateData) {
      performDataUpdate(dispatch, getState, props, updateFcns);
    }
  }
}

// Use a mounted timeout
function dataUpdateStatus(getState, props, updateFcns) {
  const results = {};
  if (updateFcns.areDataParamsValid(props.params)) {
    const stateProps = getState();
    results.paramsChanged = !updateFcns.areDataParamsEqual(props.params,
      getLoadedDataParamsFromProps(props, updateFcns));
    results.updateData = (results.paramsChanged || isDataTimedOut(props, updateFcns));
    results.contentTypeChanged = updateFcns.contentType != mountedContentType(stateProps);
  }
  else {
    results.error = {
      alertClass: AlertClasses.error,
      message: 'Invalid page values',
    }
  }
  return results;
}

function performDataUpdate(dispatch, getState, props, updateFcns) {
  const url = updateFcns.getDataRqstUrl(props.params);
  // console.log('Updating loaded data for:', url, props);
  return getDataRqst(url)
    .then((doc) => procDataResp(dispatch, getState, props, updateFcns, doc))
    .catch((err) => procFailedRqst(dispatch, getState, props, updateFcns, err));
}
exports.performDataUpdate = performDataUpdate;

function procDataResp(dispatch, getState, props, updateFcns, doc) {
  // console.log('procDataResp:', doc);
  const stateProps = getState();
  const stateData = updateFcns.getStateDataFromProps(stateProps);
  if (updateFcns.areDataParamsEqual(props.params, stateData.params)) {
    // Requested data still matches the current params
    if (updateFcns.contentType == mountedContentType(stateProps)) {
      // And mounted content type
      const timeoutMs = calcDataTimeoutMs(stateProps, updateFcns);
      if (timeoutMs) {
        setDataTimeout(dispatch, getState, props, updateFcns, timeoutMs);
      }
      if (stateProps.notify.alert) {
        // Clear the alert
        notifyAlert(dispatch);
      }
    }
    return updateFcns.updateLoadedDataAction(dispatch, props.params, doc);
  }
}

function procFailedRqst(dispatch, getState, props, updateFcns, response) {
  // console.log('procFailedRqst:', response);
  if (response && response.status == 401) {
    redirectToLogin();
  }
  else {
    if (response.status === undefined) {
      setDataTimeout(dispatch, getState, props, updateFcns, retryTimeoutMs);
    }
    return notifyFailedResponse(dispatch, response);
  }
}

function updateMountingDataAction(dispatch, props, updateFcns, paramsChanged) {
  const mountingState = createMountingState(updateFcns.contentType, props.params);
  if (paramsChanged) {
    const alert = {
      alertClass: AlertClasses.primary,
      message: updateFcns.loadingDataMsg,
    };
    return dispatch(notifyMountingAndAlertActionCreator(mountingState, alert));
  }
  else {
    return dispatch(notifyMountingActionCreator(mountingState));
  }
}

function getMountingDataFromProps(props) {
  return props.notify ? props.notify.mounting : null;
}

function mountedContentType(state) {
  const mountingData = getMountingDataFromProps(state);
  return mountingData ? mountingData.contentType : null;
}

function getLoadedDataParamsFromProps(props, updateFcns) {
  const stateData = updateFcns.getStateDataFromProps(props);
  return stateData ? stateData.params : undefined;
}

function isDataTimedOut(props, updateFcns) {
  if (!updateFcns.dataTimeoutMs) {
    return false;
  }
  const stateData = updateFcns.getStateDataFromProps(props);
  return  !stateData || !stateData.timeMs ||
    Date.now() > (stateData.timeMs + updateFcns.dataTimeoutMs);
}

function calcDataTimeoutMs(stateProps, updateFcns) {
  const mountingData = getMountingDataFromProps(stateProps);
  return updateFcns.updateSetting == UpdateSettings.updateWhenNotMounted ||
    (mountingData && mountingData.contentType == updateFcns.contentType)
    ? updateFcns.dataTimeoutMs
    : 0;
}

function setDataTimeout(dispatch, getState, props, updateFcns, timeoutMs) {
  if (timeoutMs) {
    const timeoutFcn = () => performDataUpdate(dispatch, getState, props, updateFcns);
    setTimeout(timeoutFcn, timeoutMs);
  }
}

function updateRqst(updateUrl, dataDoc) {
  const postParms = {
    method: 'POST',
    headers: dataDoc
      ? {
          "Content-Type": "application/json; charset=utf-8",
        }
      : headers,
    credentials: 'same-origin'
  };
  if (dataDoc) {
    postParms.body = JSON.stringify(dataDoc);
  }
  return fetch(updateUrl, postParms)
    .then((response) => {
      // console.log(response);
      if (response.ok && response.status == 200) {
        return response.json();
      }
      else {
        return Promise.reject(response);
      }
    })
    .catch((response) => Promise.reject(alertResponse(response)));
}
exports.updateRqst = updateRqst;

function getRqst(getUrl) {
  return fetch(getUrl, fetchParms)
    .then((response) => {
      if (response.ok && response.status == 200) {
        return response.json();
      }
      else {
        return Promise.reject(response);
      }
    })
    .catch((response) => Promise.reject(alertResponse(response)));
}
exports.getRqst = getRqst;

exports.reducer = handleActions({
  [NOTIFY_ALERT]: (state, action) => ({
    ...state,
    alert: action.payload
  }),
  [NOTIFY_MOUNTING]: (state, action) => ({
    ...state,
    mounting: action.payload
  }),
  [NOTIFY_MOUNTING_AND_ALERT]: (state, action) => ({
    ...state,
    alert: action.payload.alert,
    mounting: action.payload.mountingState
  }),
}, {} );
