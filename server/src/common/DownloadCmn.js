// Common download functions
// Copyright 2018 Jeff Platzer. All rights reserved.

const downloadsBaseUrl = '/api/downloads/';

const downloadFileTypes = {
  audit: 'audit',
} ;
exports.downloadFileTypes = downloadFileTypes;

const downloadFileName = {
  [downloadFileTypes.audit]: 'install',
} ;
exports.downloadFileName = downloadFileName;

function groupDownloadObjLoc(baseDownloadLoc, group, downloadType, downloadFile) {
  const groupDownloadLoc = baseDownloadLoc + '/' + group;
  const fileType = downloadFileTypes[downloadType];
  return fileType && downloadFileName[fileType] == downloadFile
    ? groupDownloadLoc + '/' + downloadType + '/' + downloadFile
    : null;
}
exports.groupDownloadObjLoc = groupDownloadObjLoc;

function groupDownloadUrl(group, downloadType) {
  const downloadFile = downloadFileName[downloadType];
  // console.log('groupDownloadUrl:', downloadType, downloadFile);
  return downloadsBaseUrl + group + '/' + downloadType + '/' + downloadFile;
}
exports.groupDownloadUrl = groupDownloadUrl;
