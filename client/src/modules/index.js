// Client to server reducers
// Copyright 2018 Jeff Platzer. All rights reserved.

const { combineReducers } = require('redux');

const {
  reducer: notify,
  loadPage,
  updatePage,
} = require('../dataLifecycle');

const {
  reducer: dash,
  setDashContent,
} = require('./dashboard');

const {
  reducer: profile,
  getProfile,
  setProfile,
  setProfileData,
  updateUserAgreementAction,
} = require('./profile');

const {
  reducer: devices,
  deleteDevices,
} = require('./devices');

const {
  reducer: audits,
  deleteAudits,
} = require('./audits');

const {
  reducer: group,
  getGroup,
} = require('./group');

const {
  initiateDownload,
  getScanDownloadCmd,
} = require('./download');

const {
  logout,
} = require('./auth');

const {
  reducer: modal,
  setModal,
  dismissModal,
} = require('./modal');

const {
  reducer: sidebar,
  setSidebarProps,
} = require('./sidebar');

const {
  reducer: scrollToName,
  setScrollTo,
} = require('./scrollTo');

exports.reducers = combineReducers({
  notify,
  dash,
  profile,
  devices,
  audits,
  group,
  modal,
  sidebar,
  scrollToName,
});

exports.actionCreators = {
  loadPage,
  updatePage,
  setDashContent,
  getProfile,
  setProfileData,
  getGroup,
  setProfile,
  deleteDevices,
  deleteAudits,
  initiateDownload,
  getScanDownloadCmd,
  updateUserAgreementAction,
  logout,
  setModal,
  dismissModal,
  setSidebarProps,
  setScrollTo,
};
