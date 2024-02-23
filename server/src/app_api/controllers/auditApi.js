// Audit report web access API
// Copyright 2018 Jeff Platzer. All rights reserved.

const R = require('ramda');
const Maybe = require('../../common/Maybe').Maybe;
const rrFcns = require('../../common/RqstRespFcns');
const F = require('../../common/FcnHelp');
const Cmn = require('../../common/CmnFcns');
const DB = require('../../db_mgmt/device_db');
const RS = require('../../db_mgmt/report_schema');
const Pkg = require('../../security_proc/packageUpdateMgr');
const DPkg = require('../../security_proc/debianPackageUpdates');
const Group = require('./groupApi');
const reqValidate = require('../../db_mgmt/reqValidate');
const Cfg = require('../../app_server/serverConfig');

const reportTimeFields = ["time"];
const reportDataFields = ["time", "device", "subgroup", "report"];

const getSubgroupParam = (reqResp) => reqResp.rqst.params.subgroup;
const getDeviceParam = (reqResp) => reqResp.rqst.params.device;
const getTimeParam = (reqResp) => reqResp.rqst.params.time;

const validateAuditsRqst = R.compose(
  F.chain(Group.authGroupRqstHelper(Group.roles.any)),
  F.chain(rrFcns.chainedValidateValue(reqValidate.partialIdField, getDeviceParam)),
  rrFcns.chainedValidateValue(reqValidate.partialIdField, getSubgroupParam)
);

exports.auditsRqst = function(req, res, next) {
  const authFcn = rrFcns.authRqstPromise(validateAuditsRqst);
  rrFcns.procValidatedRqst(req, res, next, true, authFcn, procAuditsRqst);
};

function procAuditsRqst(reqResp) {
  const subgroup = Group.getRqstQualifiedSubgroup(reqResp);
  if (!subgroup ||
    !reqResp.rqst.params.device) {
    reqResp.resp = Maybe.of(rrFcns.createApiRespMsg(rrFcns.httpStatus.badRequest,
      rrFcns.httpStatusMsg.badRequest));
    return Promise.reject(reqResp);
  }
  return DB.getReportTimes(subgroup, reqResp.rqst.params.device)
    .then((doc) => Promise.resolve(rrFcns.dataRespFcn(reqResp, reportTimeFields, doc)))
    .catch((err) => Promise.reject(rrFcns.createInternalErrorResp(reqResp, err)));
}

const validateAuditRqst = R.compose(
  F.chain(Group.authGroupRqstHelper(Group.roles.any)),
  F.chain(rrFcns.chainedValidateValue(reqValidate.dateField, getTimeParam)),
  F.chain(rrFcns.chainedValidateValue(reqValidate.partialIdField, getDeviceParam)),
  rrFcns.chainedValidateValue(reqValidate.partialIdField, getSubgroupParam)
);

exports.auditRqst = function(req, res, next) {
  const authFcn = rrFcns.authRqstPromise(validateAuditRqst);
  rrFcns.procValidatedRqst(req, res, next, true, authFcn, procAuditRqst);
};

function procAuditRqst(reqResp) {
  const subgroup = Group.getRqstQualifiedSubgroup(reqResp);
  if (!subgroup ||
    !reqResp.rqst.params.device ||
    !reqResp.rqst.params.time) {
    reqResp.resp = Maybe.of(rrFcns.createApiRespMsg(rrFcns.httpStatus.badRequest,
      rrFcns.httpStatusMsg.badRequest));
    return Promise.reject(reqResp);
  }
  const getAudit = (completeCB) => DB.getReportDoc(reqResp.rqst.params.device,
    subgroup, reqResp.rqst.params.time, completeCB);
  const createErrResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  return R.compose(
    F.then(rrFcns.dataRespFcn(reqResp, reportDataFields)),
    F.then((auditDoc) => procPackagesUpdates(auditDoc)),
    Cmn.fcnCbToPromise
  )(getAudit, createErrResp);
};

function procPackagesUpdates(auditDoc) {
  if (!auditDoc.lastUpdated ||
    Pkg.timeHasElapsed(auditDoc.lastUpdated, Pkg.oneDayMs)) {
    const packagesSection = auditDoc.report.reduce(
      Pkg.getReportSectionReducer(RS.DataTypes.softwarePackageStatusType), null);
    const kvpSection = auditDoc.report.reduce(
      Pkg.getReportSectionReducer(RS.DataTypes.kvpType), null);
    const kvpProps = kvpSection ? kvpSection.values.reduce(Pkg.kvpReducer, {}) : null;
    const distro = kvpProps ? kvpProps['Distribution'] : null;
    const release = kvpProps ? kvpProps['Release'] : null;
    const arch = kvpProps ? kvpProps['Processor'] : null;
    if (distro && release && arch && packagesSection && packagesSection.values) {
      Cfg.logging.logger.info('procPackagesUpdates distro, release, arch:', distro, release, arch);
      return Pkg.procDevicesPackagesStatuses(distro, release, arch, packagesSection.values)
        .then(() => {
          auditDoc.lastUpdated = new Date();
          return DB.updateReportDoc(auditDoc);
          // return Promise.resolve(auditDoc);
        })
        .catch((err) => {
          Cfg.logging.logger.warn('Error processing audit packages updates: ' + err);
          return Promise.resolve(auditDoc);
        });
    }
    else {
      Cfg.logging.logger.warn('Skipping processing packages updates due to missing audit information');
    }
  }
  else {
    Cfg.logging.logger.info('Skipping package updates because the audit was recently updated');
  }
  return Promise.resolve(auditDoc);
}

exports.deleteAuditsRqst = function(req, res, next) {
  const validationFcn = rrFcns.authRqstPromise(validateDeleteRqst);
  rrFcns.procValidatedRqst(req, res, next, false, validationFcn, deleteAudits);
};

function getAuditsFromRequestFcn(reqResp) {
  return reqResp.rqst.body.audits;
}

function getGroupFromAuditFcn(auditObj) {
  const props = DB.subgroupProps(auditObj.subgroup);
  return props.group;
}

const validateDeleteRqst = R.compose(
  F.chain((reqResp) =>
    Group.chainableGroupItemsAdminAuthorization(reqResp, getAuditsFromRequestFcn, getGroupFromAuditFcn)),
  F.chain(rrFcns.chainedValidateReq(reqValidate.DeleteAuditsSchema)),
  rrFcns.validateUserAuth
);

function deleteAudits(reqResp) {
  const reducer = function(notUsed, auditObj) {
    return DB.delAuditData(auditObj);
  };
  const audits = getAuditsFromRequestFcn(reqResp);
  return Cmn.arrayAsyncReduce(audits, reducer)
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})));
}
