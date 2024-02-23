// Common initialization functions
// Copyright 2018 Jeff Platzer. All rights reserved.

const sysFcns = require('../common/SysFcns');
const sskm = require('../sskm');
const email = require('../aws_fcns/email');

exports.init = function(config) {
  createPaths(config);
  config.secrets.createSecretsManager = sskm.createSecretsManager;
  initEmail(config);
}

function createPaths(config) {
  sysFcns.createSubDir(config.files.tempPath, config.files.registrationDir);
  sysFcns.createSubDir(config.files.filesPath, config.files.downloadsDir);
}

function initEmail(config) {
  config.email.httpContent = email.httpContent;
  config.email.resetPwContentObj = email.resetPwContentObj;
  config.email.welcomeContentObj = email.welcomeContentObj;
}
