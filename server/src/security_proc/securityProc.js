// Security processing on updates
// Copyright 2018 Jeff Platzer. All rights reserved.

const RS = require('../db_mgmt/report_schema');
const Pkg = require('./packageUpdateMgr');
const secureVersions = require('./secureKernelVersions');

const filterSecurityStatusContaining = [
  "This release is more than",
  "Lynis",
];

function securityStatusesPostProc(auditDoc) {
  const kvpSection = auditDoc.report.reduce(
    Pkg.getReportSectionReducer(RS.DataTypes.kvpType), null);
  const kvpProps = kvpSection ? kvpSection.values.reduce(Pkg.kvpReducer, {}) : null;
  const kernelVersion = kvpProps ? kvpProps['Version'] : null;
  const issSection = auditDoc.report.reduce(
    Pkg.getReportSectionReducer(RS.DataTypes.itemSecurityStatusType), null);
  issSection.values = filterSecurityStatuses(issSection.values);
  const msg = kernelVersionStatusMsg(kernelVersion);
  if (msg) {
    issSection.values.splice(0, 0, msg);
  }
}
exports.securityStatusesPostProc = securityStatusesPostProc;

function filterSecurityStatuses(issValues) {
  const statusReducer = (status) => (filtered, filteredString) =>
    filtered ? filtered
      : status.finding && status.finding.includes(filteredString) ? true
      : false;
  function filterReducer(results, status) {
    if (!filterSecurityStatusContaining.reduce(statusReducer(status), false)) {
      results.push(status);
    }
    return results;
  }
  return issValues.reduce(filterReducer, [])
}

function kernelVersionStatusMsg(version) {
  function kernelVersionReducer(version, value, idx) {
    if (idx === 0) {
      version = String(value);
    }
    else {
      version += '.' + String(value);
    }
    return version;
  }
  const kernelSecurityStatus = getKernelSecurityStatus(version);
  if (kernelSecurityStatus.comp.relation == Pkg.valueRelation.less) {
    const kernelVersion = kernelSecurityStatus.values.reduce(kernelVersionReducer);
    const secureVersion = kernelSecurityStatus.secureVersionValues.reduce(kernelVersionReducer);
    const finding = "The device's kernel version is: " + kernelVersion +
        ". For security, the version should be at least: " + secureVersion;
    const msg = {
      item: 'The Linux kernel version has security vulnerabilities',
      finding,
      status: RS.StatusTypes.warn,
    };
    // console.log('kernelVersionStatusMsg:', JSON.stringify(msg));
    return msg;
  }
  return null;
}
exports.kernelVersionStatusMsg = kernelVersionStatusMsg;

function getKernelSecurityStatus(version) {
  const values = getKernelValues(version);
  function bestMatchReducer(result, secureVersionValues) {
    const compResult = Pkg.versionComparisonResults(values, secureVersionValues);
    // console.log('comparing:', values, secureVersionValues, compResult.relation);
    if ((compResult.matched >= 2 || compResult.relation == Pkg.valueRelation.less) &&
      (!result ||
       Pkg.versionComparisonResults(secureVersionValues,
        result.secureVersionValues).relation == Pkg.valueRelation.less)) {
      return { values, secureVersionValues, comp: compResult };
    }
    return result;
  }
  const bestMatch = secureVersions.reduce(bestMatchReducer, null);
  return bestMatch;
}
exports.getKernelSecurityStatus = getKernelSecurityStatus;

function getKernelValues(version) {
  const debianFormatRe = /\d+\.\d+\.0-\d+/;
  const valuesRe = /(\d+)+/g;
  const debianFormat = debianFormatRe.test(version);
  const numValues = debianFormat ? 4 : 3;
  const values = [];
  for (let i = 0; i < numValues; ++i) {
    const results = valuesRe.exec(version);
    if (!results) {
      break;
    }
    if (i !== 2 || !debianFormat) {
      values.push(Number(results[0]));
    }
  }
  return values;
}

