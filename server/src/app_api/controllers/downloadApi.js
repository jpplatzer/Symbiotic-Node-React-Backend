// Download web access API
// Copyright 2018 Jeff Platzer. All rights reserved.

const R = require('ramda');
const F = require('../../common/FcnHelp');
const rrFcns = require('../../common/RqstRespFcns');
const Cmn = require('../../common/CmnFcns');
const DB = require('../../db_mgmt/device_db');
const Download = require('../../common/DownloadCmn');
const Group = require('./groupApi');
const Auth = require('./authApi');
const reqValidate = require('../../db_mgmt/reqValidate');
const Cfg = require('../../app_server/serverConfig');

const downloadWithIdSubpath = "/api/downloadWithId";

const getParam = (key) => (reqResp) => reqResp.rqst.params[key];

const validateDownloadRqst = R.compose(
  F.chain(Group.authGroupRqstHelper(Group.roles.any)),
  F.chain(rrFcns.chainedValidateValue(reqValidate.partialIdField, getParam("type"))),
  rrFcns.chainedValidateValue(reqValidate.partialIdField, getParam("file"))
);

exports.downloadRqst = function(req, res, next) {
  rrFcns.authRqstPromise(validateDownloadRqst)(req, res, next, true)
    .then((reqResp) => sendFileResp(reqResp, reqResp.rqst.params))
    .catch((err) => rrFcns.errorResp(res, err));
};

function sendFileResp(reqResp, params) {
  const downloadPath = Download.groupDownloadObjLoc(Cfg.files.downloadsDir,
    params.group, params.type, params.file);
  if (downloadPath) {
    return Cfg.files.sendStoredFile(Cfg.files.filesLoc, downloadPath, reqResp.res);
  }
  else {
    return Promise.reject(rrFcns.handleErrorResp(reqResp,
      { status: rrFcns.httpStatus.badRequest, msg: rrFcns.httpStatusMsg.expired }));
  }
}

const validateUpdateAgreementRqst = R.compose(
  F.chain(Group.authGroupRqstHelper(Group.roles.any)),
  F.chain(rrFcns.chainedValidateValue(reqValidate.partialIdField, getParam("version"))),
  rrFcns.chainedValidateValue(reqValidate.partialIdField, getParam("name"))
);

exports.updateUserAgreement = function(req, res, next) {
  const authFcn = rrFcns.authRqstPromise(validateUpdateAgreementRqst);
  rrFcns.procValidatedRqst(req, res, next, true, authFcn, updateUserAgreementResp);
}

function updateUserAgreementResp(reqResp) {
  const name = reqResp.rqst.params.name;
  const version = reqResp.rqst.params.version;
  if (!name || !version) {
    return Promise.reject(rrFcns.handleErrorResp(reqResp, {
      status: rrFcns.httpStatus.badRequest,
      msg: rrFcns.httpStatusMsg.badRequest
    }));
  }
  else {
    const agreement = {
      name,
      version,
      accepted: Date.now(),
    };
    return updateProfileDoc(reqResp, agreement)
      .then((doc) => {
        // console.log('updateUserAgreementResp updateProfileDoc:', doc);
        return Promise.resolve(rrFcns.createDataResp(reqResp, doc))
      });
  }
}

function updateProfileDoc(reqResp, agreement) {
  const updateProfile = (completeCB) => DB.addAgreementAcceptance(
    reqResp.rqst.user.username, agreement, completeCB);
  const createErrorResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  const successFcn = (doc, resolve) =>
    resolve(Cmn.cloneObjProps(doc, Auth.reportableProfileProps));
  return Cmn.fcnCbToPromise(updateProfile, createErrorResp, successFcn);
};

const validateUserPromise = rrFcns.authRqstPromise(rrFcns.validateUserAuth);

/***
***/
exports.downloadCmdRqst = function(req, res, next) {
  const authFcn = rrFcns.authRqstPromise(validateDownloadRqst);
  rrFcns.procValidatedRqst(req, res, next, true, authFcn, procDownloadCmdRqst);
};

const downloadTypeReducer = (type) => (result, downloadCfgDoc) => {
  // JPP ToDo - May need to handle group and/or file matching as well
  return result ? result
    : downloadCfgDoc.type == type ? downloadCfgDoc
    : null;
}

/***
  Download doc format: {
    type: <type string>,
    group: <group ID>,
    file: <file string>,
    code: <hex code for this download>,
    useUntil: <time in ms before which this code can be returned as the current code>,
    deleteAfter: <time in ms after which this code can be deleted>,
  }
***/

const deletedDownloadsReducer = (curDate) => (remainingDownloads, downloadDoc) => {
  if (downloadDoc.deleteAfter > curDate) {
    remainingDownloads.push(downloadDoc);
  }
  return remainingDownloads;
}

const matchingDownloadRqstReducer = (rqst, curDate) => (matchingDoc, downloadDoc) => {
  // JPP ToDo - May need to handle group and/or file matching as well
  return matchingDoc ? matchingDoc
    : downloadDoc.type == rqst.params.type && downloadDoc.useUntil > curDate ? downloadDoc
    : null;
}

function createReqDownloadsDoc(rqst, curDate, downloadTypeConfig) {
  const code = DB.randomHexValue(24);
  return {
    type: rqst.params.type,
    group: rqst.params.group,
    file: rqst.params.file,
    code,
    useUntil: curDate + downloadTypeConfig.useUntilMs,
    deleteAfter: curDate + downloadTypeConfig.deleteAfterMs,
  };
}

/***
  Download cmd response doc format: {
    cmd: <cmd string for the user to call to download the file>,
    useUntilMs: <number ms remaining for this code can be returned as the current code>,
    deleteAfterMs: <time in ms after which this code can be deleted>,
  }
***/

function createDownloadCmdResp(rqst, curDate, downloadDoc) {
  const cmd = "curl -k -O " + Cfg.server.baseUrl + downloadWithIdSubpath + '/' +
    rqst.user.username + '/' + downloadDoc.code + '/' + rqst.params.file;
  return ({
    cmd,
    useUntilMs: downloadDoc.useUntil - curDate,
    deleteAfterMs: downloadDoc.deleteAfter - curDate - 1000,
  });
}

function procDownloadCmdRqst(reqResp) {
  const type = reqResp.rqst.params.type;
  const downloadTypeConfig = Cfg.downloads ? Cfg.downloads.reduce(downloadTypeReducer(type), null) : null;
  // console.log("procDownloadCmdRqst: ", reqResp.rqst.user, reqResp.rqst.params);
  return downloadTypeConfig
    ? DB.getProfileDoc(reqResp.rqst.user.username)
        .then((profileDoc) => profileDoc
          ? downloadCmdResp(reqResp, downloadTypeConfig, profileDoc)
          : Promise.reject(rrFcns.createInternalErrorResp(reqResp,
              "downloadCmdResp: user profile not available")))
    : Promise.reject(rrFcns.handleErrorResp(reqResp,
        { status: rrFcns.httpStatus.badRequest,   msg: "Unsupported download type" }));
}

function downloadCmdResp(reqResp, downloadTypeConfig, profileDoc) {
  // console.log("downloadCmdResp:", downloadTypeConfig, profileDoc);
  const curDate = Date.now();
  const downloads = profileDoc.policies && profileDoc.policies.downloads ? profileDoc.policies.downloads : null;
  // console.log("downloadCmdResp downloads:", downloads);
  const modifiedDownloads = downloads ? downloads.reduce(deletedDownloadsReducer(curDate), []) : [];
  let modified = downloads ? downloads.length != modifiedDownloads.length : true;
  let downloadDoc = modifiedDownloads.reduce(matchingDownloadRqstReducer(reqResp.rqst, curDate), null);
  if (!downloadDoc) {
    modified = true;
    downloadDoc = createReqDownloadsDoc(reqResp.rqst, curDate, downloadTypeConfig);
    modifiedDownloads.push(downloadDoc);
  }
  const resp = rrFcns.createDataResp(reqResp,
    createDownloadCmdResp(reqResp.rqst, curDate, downloadDoc));
  if (modified) {
    console.log("downloadCmdResp modified downloads:", modifiedDownloads);
    profileDoc.policies.downloads = modifiedDownloads;
    profileDoc.markModified('policies');
    return DB.setProfileDoc(reqResp.rqst.user.username, profileDoc)
      .then(() => Promise.resolve(resp))
  }
  else {
    return Promise.resolve(resp);
  }
}

const validateDownloadWithIdRqst = R.compose(
  F.chain(rrFcns.chainedValidateValue(reqValidate.largeHexNum, getParam("id"))),
  rrFcns.chainedValidateValue(reqValidate.partialIdField, getParam("user"))
);

exports.downloadWithIdRqst = function(req, res, next) {
  // console.log("downloadWithIdRqst:", req.params);
  rrFcns.authRqstPromise(validateDownloadWithIdRqst)(req, res, next, true)
    .then(procDownloadIdRqst)
    .catch((err) => {
      return rrFcns.errorResp(res, err);
    })
};

const matchingDownloadIdReducer = (rqst) => (matchingDoc, downloadDoc) => {
  // JPP ToDo - May need to handle group and/or file matching as well
  return matchingDoc ? matchingDoc
    : downloadDoc.code == rqst.params.id ? downloadDoc
    : null;
}

function downloadDocParams(downloadDoc) {
  return ({
    group: downloadDoc.group,
    type: downloadDoc.type,
    file: downloadDoc.file,
  });
}

function procDownloadIdInProfile(reqResp, profileDoc) {
  const curDate = Date.now();
  const downloads = profileDoc.policies && profileDoc.policies.downloads ? profileDoc.policies.downloads : [];
  const downloadDoc = downloads.reduce(matchingDownloadIdReducer(reqResp.rqst), null);
  return downloadDoc
    ? downloadDoc.deleteAfter > curDate
      ? sendFileResp(reqResp, downloadDocParams(downloadDoc))
      : Promise.reject(rrFcns.handleErrorResp(reqResp,
          { status: rrFcns.httpStatus.badRequest, msg: rrFcns.httpStatusMsg.expired }))
    : Promise.reject(rrFcns.handleErrorResp(reqResp,
          { status: rrFcns.httpStatus.unauthorized, msg: rrFcns.httpStatusMsg.unauthorized }));
}

function procDownloadIdRqst(reqResp) {
  return DB.getProfileDoc(reqResp.rqst.params.user)
    .then((profileDoc) => profileDoc
      ? procDownloadIdInProfile(reqResp, profileDoc)
      : Promise.reject(rrFcns.handleErrorResp(reqResp,
          { status: rrFcns.httpStatus.unauthorized,   msg: rrFcns.httpStatusMsg.unauthorized })));
}
