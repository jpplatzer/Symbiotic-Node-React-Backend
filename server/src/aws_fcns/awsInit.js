// AWS initialization functions
// Copyright 2018 Jeff Platzer. All rights reserved.

const AWS = require('aws-sdk');
const s3Ops = require('./s3Ops');
const secrets = require('./secrets');
const email = require('./email');
const sysFcns = require('../common/SysFcns');

exports.init = function(awsConfig) {
  initAwsSdk(awsConfig);
  createPaths(awsConfig);
  initStorageFcns(awsConfig);
  initCreateSecretsManager(awsConfig);
  initEmail(awsConfig);
}

function initAwsSdk(config) {
  AWS.config.update({ region: config.app.region });
}

function createPaths(config) {
  sysFcns.createSubDir(config.files.tempPath, config.files.registrationDir);
  sysFcns.createSubDir(config.files.tempPath, config.files.downloadsDir);
}

function initStorageFcns(config) {
  config.files.sendStoredFile = s3Ops.sendStoredFile;
  config.files.putStoredFile = s3Ops.putStoredFile;
}

function initCreateSecretsManager(config) {
  config.secrets.createSecretsManager = secrets.createSecretsManager;
}

function initEmail(config) {
  config.email.httpContent = email.httpContent;
  config.email.resetPwContentObj = email.resetPwContentObj;
  config.email.welcomeContentObj = email.welcomeContentObj;
  config.email.sendEmail = email.sendAWSEmail;
}
