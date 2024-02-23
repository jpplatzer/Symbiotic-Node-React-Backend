// Device audit processing
// Copyright 2017 Jeff Platzer. All rights reserved.

const fs = require('fs');
const path = require('path');
const R = require('ramda');
const Maybe = require('../../common/Maybe').Maybe;
const Either = require('../../common/Either').Either;
const rrFcns = require('../../common/RqstRespFcns');
const F = require('../../common/FcnHelp');
const Cmn = require('../../common/CmnFcns');
const DS = require('../../db_mgmt/device_schema');
const RS = require('../../db_mgmt/report_schema');
const DB = require('../../db_mgmt/device_db');
const Sec = require('../../security_proc/securityProc');
const Cfg = require('../../app_server/serverConfig');

const testDescFilepath =  path.join(__dirname, '../../app_api/helpers/testDescriptions.json');
const testDescriptions = JSON.parse(fs.readFileSync(testDescFilepath, 'ascii'));
// console.log(JSON.stringify(testDescriptions));

const auditDocKey = "auditDoc";
const sectionDelim = ">>>>>SSA_Section:";

function getKeyValue(line, delim) {
  let kvp = line.split(delim);
  return kvp.length > 1 ? kvp[1] : undefined;
}

function findNextLineStartingWith(lines, lineNum, beginStr) {
  while (lineNum < lines.length && !lines[lineNum].startsWith(beginStr)) {
    lineNum++;
  }
  return lineNum < lines.length ? lineNum : undefined;
}

function findNextLineMatching(lines, lineNum, regex) {
  while (lineNum < lines.length && !lines[lineNum].match(regex)) {
    lineNum++;
  }
  return lineNum < lines.length ? lineNum : undefined;
}

function findNextLineContaining(lines, lineNum, str) {
  while (lineNum < lines.length && !lines[lineNum].includes(str)) {
    lineNum++;
  }
  return lineNum < lines.length ? lineNum : undefined;
}

const procKvpSection = function(lines, lineNum) {
  let c = Maybe.of([]);
  for (; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (line.startsWith(sectionDelim)) {
      break;
    }
    const kvp = line.split('=');
    if (kvp.length < 2) {
      c = Maybe.nothing();
      break;
    }
    c.value.push({key: kvp[0], value: kvp[1]});
  }
  return c;
};

function getPkgVersionInfo(line) {
  const entities = line.split(/(\s+)/, 6);
  return (entities.length >= 2) ? {
        name: entities[0],
        version: entities[2],
        arch: entities[4],
        status: RS.StatusTypes.unknown
      }
    : undefined;
}

function procPkgVersionList(lines, lineNum) {
  let c = Maybe.of([]);
  for (; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum];
    if (line.startsWith(sectionDelim)) {
      break;
    }
    const info = getPkgVersionInfo(line);
    if (info !== undefined) {
      c.value.push(info);
    }
  }
  return c;
};

const specialPkgProcFcns = {
};

const procSpsSection = function(lines, lineNum) {
  let c = Maybe.of([]);
  const distro = getKeyValue(lines[lineNum], ':');
  const release = getKeyValue(lines[lineNum+1], ':');
  const distro2 = getKeyValue(lines[lineNum+2], ':');
  const release2 = getKeyValue(lines[lineNum+3], ':');
  if (distro !== undefined && release !== undefined) {
    const pkgProc = specialPkgProcFcns[distro] ? specialPkgProcFcns[distro] : procPkgVersionList;
    c = pkgProc(lines, lineNum+4);
  }
  else {
    c = Maybe.nothing();
  }
  return c;
}

const procIssSection = function(lines, lineNum) {
  lineNum = findNextLineMatching(lines, lineNum, /Lynis\s+[\d\.]+\s+Results/);
  if (!lineNum) {
    return Maybe.nothing();
  }
  let warningLine;
  let suggestionsLine;
  let endLine = findNextLineContaining(lines, lineNum, '==========');
  const resultsStatusDelim = '------';
  lineNum = findNextLineContaining(lines, lineNum, resultsStatusDelim);
  if (!lineNum || lineNum > endLine) {
    return Maybe.nothing();
  }
  if (lines[lineNum-1].includes('Warnings')) {
    warningLine = lineNum;
    lineNum = findNextLineContaining(lines, lineNum+1, resultsStatusDelim);
  }
  if (lineNum && lines[lineNum-1].includes('Suggestions')) {
    suggestionsLine = lineNum;
    lineNum = findNextLineContaining(lines, lineNum+1, resultsStatusDelim);
  }
  if (lineNum) {
    endLine = lineNum-2;
  }
  if (!warningLine && !suggestionsLine) {
    return Maybe.of([]);
  }
  return procIssResults(lines,
    (warningLine ? warningLine + 1 : suggestionsLine + 1),
    suggestionsLine,
    endLine,
    []);
}

function procIssResults(lines, lineNum, suggestionsLine, endLine, results) {
  const result = procIssResult(lines, lineNum, suggestionsLine, endLine);
  if (result) {
    results.push(result.value);
    return procIssResults(lines, result.lineNum, suggestionsLine, endLine, results);
  }
  else {
    return Maybe.of(results);
  }
}

function procIssResult(lines, lineNum, suggestionsLine, endLine) {
  let findingLineInfo;
  while (lineNum < endLine && !findingLineInfo) {
    findingLineInfo = getIssFindingLineInfo(lines[lineNum]);
    ++lineNum;
  }
  if (!findingLineInfo) {
    return null;
  }
  const moreInfo = [];
  const status = lineNum >= suggestionsLine ? RS.StatusTypes.notify : RS.StatusTypes.warn;
  let itemText = testDescriptions[findingLineInfo.itemKey];
  itemText = itemText ? itemText : findingLineInfo.findingText;
  const detailsLine = (lineNum < endLine) ? getIssDetailsLine(lines[lineNum]) : null;
  if (detailsLine) {
    moreInfo.push(detailsLine);
    ++lineNum;
  }
  const urlLine = (lineNum < endLine) ? getIssUrlLine(lines[lineNum]) : null;
  if (urlLine) {
    moreInfo.push(urlLine);
    ++lineNum;
  }
  return ({
    value: {
      item: itemText,
      finding: findingLineInfo.findingText,
      status,
      moreInfo,
    },
    lineNum,
  });
}

function getIssFindingLineInfo(line) {
  let startIdx = line.indexOf('[0');
  if (startIdx < 0) {
    return null;
  }
  startIdx = line.indexOf('m', startIdx) + 1;
  if (startIdx < 0) {
    return null;
  }
  let endIdx = line.indexOf('[', startIdx);
  if (endIdx < 0) {
    return null;
  }
  const findingText = line.substring(startIdx, endIdx).trim();
  startIdx = endIdx + 1;
  endIdx = line.indexOf(']', startIdx);
  if (endIdx  < 0) {
    return null;
  }
  const itemKey = line.substring(startIdx, endIdx);
  return ({
    findingText,
    itemKey,
  });
}

function getIssDetailsLine(line) {
  let detailsLine = null;
  const detailsTextRegex = /\-\s+(\w+)\s+:/;
  const matches = line.match(detailsTextRegex);
  if (matches) {
    const detailType = matches[1];
    if (detailType == 'Details') {
      const startIdx = line.indexOf('m') + 1;
      if (startIdx > 0) {
        const endIdx = line.indexOf('[', startIdx) - 1;
        if (endIdx > 0) {
          detailsLine = line.substring(startIdx, endIdx).trim();
        }
      }
    }
    else if (detailType == 'Solution') {
      const startIdx = line.indexOf(':') + 1;
      detailsLine = line.substring(startIdx, line.length).trim();
    }
  }
  return detailsLine;
}

function getIssUrlLine(line) {
  let detailsLine = null;
  const urlBase = 'https://cisofy.com/controls/';
  const startIdx = line.indexOf(urlBase);
  if (startIdx >= 0) {
    const endIdx = line.indexOf('/', startIdx + urlBase.length) + 1;
    detailsLine = line.substring(startIdx, endIdx);
  }
  return detailsLine;
}

const sectionProcFcns = {
  KVP: {dataType: RS.DataTypes.kvpType, procFcn: procKvpSection},
  SPS: {dataType: RS.DataTypes.softwarePackageStatusType, procFcn: procSpsSection},
  SAS: {dataType: RS.DataTypes.itemSecurityStatusType, procFcn: procIssSection},
};

function initSection(label, type, values) {
  return {
    label: label,
    dataType: type,
    values: values
  };
};

function completeSectionProc(reqResp, lines, lineNum, sectionLabel, typeLabel) {
  // console.log("Section:", sectionLabel, "Type:", typeLabel);
  const sectionProc = sectionProcFcns[typeLabel];
  if (sectionProc !== undefined) {
    const c = sectionProc.procFcn(lines, lineNum);
    if (c.isNothing) {
      reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.badRequest));
    }
    else {
      // console.log("Values:", c.value);
      reqResp[auditDocKey].report.push(
        initSection(sectionLabel, sectionProc.dataType, c.value));
    }
  }
  else {
    console.log("Unsupported type:", typeLabel);
  }
  return reqResp;
}

function procAuditSection(reqResp, lines, lineNum) {
  const sectionLabel = getKeyValue(lines[lineNum], ':')
  const typeLabel = getKeyValue(lines[lineNum+1], ':')
  if (sectionLabel === undefined || typeLabel === undefined) {
    reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.badRequest));
  }
  else {
    reqResp = completeSectionProc(reqResp, lines, lineNum+2, sectionLabel, typeLabel);
  }
  return reqResp;
}

function procAuditSections(reqResp, lines, lineNum) {
  lineNum = findNextLineStartingWith(lines, lineNum, sectionDelim);
  // Plus 4 to account for other fields that will be subsequently checked for
  if (lineNum === undefined || lineNum + 4 >= lines.length) {
    return reqResp;
  }
  reqResp = procAuditSection(reqResp, lines, lineNum);
  return reqResp.resp.isNothing ? procAuditSections(reqResp, lines, lineNum+2) : reqResp;
};

function initAuditDoc(device, subgroup) {
  return {
    time: Date.now(),
    device: device,
    subgroup: subgroup,
    report: []
  };
};

const createAuditDoc = function(reqResp) {
  console.log("In createAuditDoc");
  return new Promise((resolve, reject) => {
    const auditLines = reqResp.rqst.body.split('\n');
    procAuditSections(reqResp, auditLines, 0);
    if (reqResp.resp.isNothing) {
      Sec.securityStatusesPostProc(reqResp[auditDocKey]);
    }
    // console.log(reqResp[auditDocKey]);
    return reqResp.resp.isNothing ? resolve(reqResp) : resolve(reject);
  });
}
exports.createAuditDoc = createAuditDoc;

const authorizeReq = function(reqResp) {
  const username = reqResp.rqst.user ? reqResp.rqst.user.username : null;
  if (!username ||
    username != rrFcns.getAuthorizedValues(reqResp, rrFcns.authorizationTypes.device)) {
    Cfg.logging.logger.info("Device authorization failed for:", username);
    reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.unauthorized));
  }
  return reqResp.resp.isNothing ? Either.right(reqResp) : Either.left(reqResp);
}

function validateAuditCompliance(reqResp) {
  const c = DS.getDeviceSubGroup(reqResp.rqst.user.username);
  if (c.isNothing) {
    reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.badRequest));
    Promise.reject(reqResp);
  }
  else {
    reqResp[auditDocKey] = initAuditDoc(c.value.device, c.value.subgroup);
    // console.log('validateAuditCompliance init doc:', reqResp[auditDocKey]);
    return Cfg.audit && Cfg.audit.maxPerDevice
      ? DB.getReportTimes(c.value.subgroup, c.value.device)
          .then((doc) => {
            return !doc || !doc.length || doc.length < Cfg.audit.maxPerDevice
              ? Promise.resolve(reqResp)
              : Promise.reject(rrFcns.handleErrorResp(reqResp, {
                  status: rrFcns.httpStatus.forbidden,
                  msg: "Exceeded the maximum number of audits",
                }));
          })
          .catch((err) => Promise.reject(rrFcns.handleErrorResp(reqResp, err)))
      : Promise.resolve(reqResp);
  }
}

const storeAuditDoc = function(reqResp) {
  const storeAudit = (completeCB) => DB.addReportDoc(reqResp[auditDocKey], completeCB);
  const createErrResp = (err, resolve, reject) =>
    reject(rrFcns.createInternalErrorResp(reqResp, err));
  const createSuccessResp = (doc, resolve, reject) => {
    // JPP ToDo - schedule version check
    reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.ok));
    resolve(reqResp);
  }
  return Cmn.fcnCbToPromise(storeAudit, createErrResp, createSuccessResp);
};

function procAuditDoc(reqResp) {
  return validateAuditCompliance(reqResp)
    .then(createAuditDoc)
    .then(storeAuditDoc);
}

exports.procDeviceAudit = function(req, res, next) {
  const authFcn = rrFcns.authRqstPromise(authorizeReq);
  rrFcns.procValidatedRqst(req, res, next, false, authFcn, procAuditDoc);
};
