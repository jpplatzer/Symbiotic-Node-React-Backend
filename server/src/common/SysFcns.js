// System functions module
// Copyright 2018 Jeff Platzer. All rights reserved.

const { exec } = require('child_process');
const fs = require('fs');
const Cmn = require('./CmnFcns');

function createSubDir(parentDir, subDir) {
  const path = parentDir + '/' + subDir;
  const fcnWithCb = (cb) => fs.mkdir(path, cb);
  const errFcn = (err, resolve, reject) => {
    if (err && err.code == 'EEXIST') {
      resolve(path);
    }
    else {
      reject(err);
    }
  };
  const successFcn = (unused, resolve) => resolve(path);
  return Cmn.fcnCbToPromise(fcnWithCb, errFcn, successFcn);
}
exports.createSubDir = createSubDir;

function createFile(filePath, content) {
  const fcnWithCb = (cb) => fs.writeFile(filePath, content, cb);
  const successFcn = (unused, resolve) => resolve(filePath);
  return Cmn.fcnCbToPromise(fcnWithCb, null, successFcn);
}
exports.createFile = createFile;

function createObjFile(filePath, obj) {
  return createFile(filePath, JSON.stringify(obj));
}
exports.createObjFile = createObjFile;

function shellCmd(cmd, params) {
  params = params ? params : [];
  const cmdParamsReducer = (acc, param) => acc + ' ' + param;
  const wholeCmd = params.reduce(cmdParamsReducer, cmd);
  return new Promise((resolve, reject) => {
    exec(wholeCmd, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}
exports.shellCmd = shellCmd;
