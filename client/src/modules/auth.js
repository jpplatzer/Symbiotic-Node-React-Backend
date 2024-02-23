// Authentication action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
const DLC = require('../dataLifecycle');

exports.logout = (actions) => (dispatch) => {
  logoutDialog(actions)
    .then(() => rqstLogout(dispatch))
    .catch(() => null);
}

function dialogProps(okAction, onClose) {
  const dialogProps = {};
  dialogProps.body = () => (
    <h4>Sign out?</h4>
  );
  const okButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary"
      onClick={okAction} >OK</button>
  const cancelButton = (idx) =>
    <button key={idx} type="button" className="btn btn-default"
      data-dismiss="modal">Cancel</button>
  dialogProps.buttons = [okButton, cancelButton];
  dialogProps.onClose = onClose;
  return dialogProps;
}

function logoutDialog(actions) {
  return new Promise((resolve, reject) => {
    const okAction = () => {
      actions.dismissModal();
      return resolve();
    }
    const onClose = () => reject();
    const props = dialogProps(okAction, onClose);
    actions.setModal(props);
  });
}

function rqstLogout(dispatch) {
  const logoutUrl = '/api/logout';
  return DLC.updateRqst(logoutUrl)
    .then(() => {
      DLC.redirectToLogin();
      return Promise.resolve();
    })
    .catch((alertData) => {
      DLC.notifyAlert(dispatch, alertData);
      DLC.redirectToLogin();
      return Promise.resolve();
    })
}
