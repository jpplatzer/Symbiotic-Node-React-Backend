// React Route Path Definitions
// Copyright 2018 Jeff Platzer. All rights reserved.

const defaultPath = '/';
const loginPath = '/login';
const changePasswordPath = '/changePassword';
const setPasswordPath = '/setPassword';
const resetPasswordPath = '/resetPassword';
const accountPath = '/account';
const cancelAccountPath = '/cancelAccount';
const welcomePath = '/welcome';
const termsPath = '/terms';
const privacyPath = '/privacy';
const runScanHelpPath = '/runScanHelp';
const viewScanHelpPath = '/viewScanHelp';

const paths = {
  home: {
    name: 'Home',
    path: '/',
    build: () => '/',
  },
  devices: {
    name: 'Devices',
    path: '/deviceStatuses/:group',
    build: (data) => ( data && data.group
      ? '/deviceStatuses/' + data.group
      : defaultPath )
  },
  audits: {
    name: 'Audits',
    path: '/audits/:group/:subgroup/:device',
    build: (data) => ( data && data.group && data.subgroup && data.device
      ? '/audits/' + data.group + '/' + data.subgroup + '/' + data.device
      : defaultPath )
  },
  audit: {
    name: 'Audit',
    path: '/audit/:group/:subgroup/:device/:time',
    build: (data) => ( data && data.group && data.subgroup && data.device && data.item
      ? '/audit/' + data.group + '/' + data.subgroup + '/' + data.device + '/' + data.item
      : defaultPath )
  },
  downloads: {
    name: 'Downloads',
    path: '/downloads/:type',
    build: (type) => ( type  ?  '/downloads/' + type : defaultPath )
  },
  login: {
    name: 'Login',
    path: loginPath,
    build: () => loginPath,
  },
  changePassword: {
    name: 'ChangePassword',
    path: changePasswordPath,
    build: () => changePasswordPath,
  },
  setPassword: {
    name: 'SetPassword',
    path: setPasswordPath,
    build: () => setPasswordPath,
  },
  resetPassword: {
    name: 'ResetPassword',
    path: resetPasswordPath,
    build: () => resetPasswordPath,
  },
  account: {
    name: 'Account',
    path: accountPath,
    build: () => accountPath,
  },
  cancelAccount: {
    name: 'CancelAccount',
    path: cancelAccountPath,
    build: () => cancelAccountPath,
  },
  welcome: {
    name: 'Welcome',
    path: welcomePath,
    build: () => welcomePath,
  },
  terms: {
    name: 'Terms',
    path: termsPath,
    build: () => termsPath,
  },
  privacy: {
    name: 'Privacy',
    path: privacyPath,
    build: () => privacyPath,
  },
  runScanHelp: {
    name: 'RunScanHelp',
    path: runScanHelpPath,
    build: () => runScanHelpPath,
  },
  viewScanHelp: {
    name: 'ViewScanHelp',
    path: viewScanHelpPath,
    build: () => viewScanHelpPath,
  },
};

module.exports = paths;