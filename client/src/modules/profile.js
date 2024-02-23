// Profile action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

const DLC = require('../dataLifecycle');
const GET_PROFILE = 'profile/GET';
const profileSubUrl = '/api/profile';

const getProfileActionCreator = (data) => ({
  type: GET_PROFILE,
  payload: { data, timeMs: Date.now() }
});
exports.getProfileActionCreator = getProfileActionCreator;

const setProfileData = (data) => (dispatch) => dispatch(getProfileActionCreator(data));
exports.setProfileData = setProfileData;

function getProfileRqstUrlFcn() {
  return profileSubUrl;
}
exports.getProfileRqstUrlFcn = getProfileRqstUrlFcn;

exports.getProfile = (resultsObj) => (dispatch) => {
  return DLC.getRqst(profileSubUrl)
    .then((doc) => {
      // console.log('getProfile doc:', doc);
      dispatch(getProfileActionCreator(doc.data));
      return Promise.resolve(DLC.resultsValue("profile", doc.data, resultsObj));
    })
}

exports.setProfile = (firstName, lastName, org) => (dispatch) => {
  const profileDoc = { firstName, lastName, org };
  return DLC.updateRqst(profileSubUrl, profileDoc)
    .then((doc) => Promise.resolve(dispatch(getProfileActionCreator(doc.data))))
}

function updateUserAgreementRqst(group, agreement) {
  const updateUrl = '/api/userAgreement/' + group + '/' +
    agreement.name + '/' + agreement.version;
  return DLC.updateRqst(updateUrl);
}
exports.updateUserAgreementRqst = updateUserAgreementRqst;

function updateUserAgreement(dispatch, group, agreement) {
  return updateUserAgreementRqst(group, agreement)
    .then((doc) => {
      if (doc) {
        dispatch(getProfileActionCreator(doc.data));
        return Promise.resolve(doc.data);
      }
      else {
        return Promise.reject("Unexpected empty server response");
      }
    })
}

const updateUserAgreementAction = (group, agreement) => (dispatch) =>
  updateUserAgreement(dispatch, group, agreement);
exports.updateUserAgreementAction = updateUserAgreementAction;

exports.reducer = (state = {}, action) => (action.type == GET_PROFILE ?
  action.payload : state );