// Download state action creator, reducer and helpers
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
const DLC = require('../dataLifecycle');
const DownCmn = require('../../../common/DownloadCmn');
const Vals = require('../../../common/ValCmn');
const Paths = require('../paths');
const DownloadFcns = require('../modules/download');

const securityScanHelpLinkFcn = () => (
  <p>Help running and viewing the security scan report can be found
    on the <Link to={Paths.runScanHelp.path} >Running a Security Scan</Link> help page.</p>
);

const downloadInfo = {
  [DownCmn.downloadFileTypes.audit]: {
    name: 'Security Scan',
    usageFcn: securityScanHelpLinkFcn,
  },
};

const downloadName = (type) => downloadInfo[type] ? downloadInfo[type].name : type;
exports.downloadName = downloadName;

const downloadDialogProps = (type, bodyFcn) => {
  // console.log('download for', type);
  const dialogProps = {};
  dialogProps.title = () => (
    <div>
      <h4>{downloadName(type)} Help</h4>
    </div>);
  dialogProps.body = bodyFcn;
  const okButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary" data-dismiss="modal">OK</button>
  dialogProps.buttons = [okButton];
  return dialogProps;
}

function downloadFile(group, type) {
  const downloadPath = DownCmn.groupDownloadUrl(group, type);
  return window.open(downloadPath);
}

exports.initiateDownload = (group, type, actions) => (dispatch, getState) => {
  const downloadProps = {
    isDownloadProps: true,
    group,
    type,
    actions,
    dispatch,
    getState,
  };
  return downloadInfo[type]
    ? procDownload(downloadProps)
    : procDownloadErr('Undefined download type: ' + type);
}

function procDownload(downloadProps) {
  // console.log('procDownload props:', downloadProps);
  const type = downloadProps.type;
  downloadFile(downloadProps.group, type);
  return downloadProps.actions.setModal(
    downloadDialogProps(type, downloadInfo[type].usageFcn));
}

function procDownloadErr(err) {
  // console.log('procDownloadErr:', err);
  if (!err.isDownloadProps) {
    console.log('File dounload error:', err);
  }
}

exports.scanDownloadCmdText = "Scan Download Command";

exports.getScanDownloadCmd = (groupId, actions) => (dispatch) => {
  // console.log("Getting scan download command");
  return makeScanDownloadCmdRqst(groupId)
    .then((cmdResp) => actions.setModal(cmdRespDialogProps(cmdResp)))
    .catch((alertData) => actions.setModal(cmdErrRespDialogProps(alertData)));
}

function makeScanDownloadCmdRqst(groupId) {
  const auditType = DownCmn.downloadFileTypes.audit;
  const cmdRqstUrl = '/api/downloadCmd/' + groupId + '/' +
    auditType + '/' + DownCmn.downloadFileName[auditType];
  return DLC.updateRqst(cmdRqstUrl);
}

function cmdRespDialogProps(cmdResp) {
  // console.log('cmdRespDialogProps for:', cmdResp);
  const linkValidText = Vals.expireTimeText(cmdResp.data.deleteAfterMs / Vals.msPerMin);
  const dialogProps = {};
  dialogProps.title = () => <h4>Scan Download Command</h4>;
  dialogProps.body = () => (
    <div>
      <p>Copy the following command and run it on your devices in the directory where you want to install the Security Scan:</p>
      <p style={{marginLeft: "20px", wordWrap: "break-word"}}><b><i>{cmdResp.data.cmd}</i></b></p>
      <p>The link in this command is good for {linkValidText}.</p>
      <p>Note, the <b>curl</b> application with https support must be installed on your devices to run this command and the Security Scan.</p>
      {securityScanHelpLinkFcn()}
    </div>
  );
  const okButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary" data-dismiss="modal">OK</button>
  dialogProps.buttons = [okButton];
  return dialogProps;
}

function cmdErrRespDialogProps(alertData) {
  // console.log('cmdErrRespDialogProps for:', alertData);
  const dialogProps = {};
  dialogProps.title = () => <h4>Error Getting the Scan Download Command</h4>;
  dialogProps.body = () => (
    <div>
      <p>The following error occurred while trying to get the Security Scan download command:</p>
      <p style={{marginLeft: "20px"}}><i>{alertData.message ? alertData.message : alertData}</i></p>
      {securityScanHelpLinkFcn()}
    </div>
  );
  const okButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary" data-dismiss="modal">OK</button>
  dialogProps.buttons = [okButton];
  return dialogProps;
}
