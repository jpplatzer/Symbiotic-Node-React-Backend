// Symbiotic account schema
// Copyright 2017 Jeff Platzer. All rights reserved.

const S = require('./product_schema');
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
var Log = require('../common/LogFcns');

// https://www.npmjs.com/package/passport-local-mongoose

const Account = new Schema({
    username: String,
    password: String,
    delayFailedAttempts: { type: Number, default: 0 },
    delayLastAttempt: { type: Date, default: Date.now },
});

Account.plugin(passportLocalMongoose);

const AccountModel = mongoose.model('accounts', Account);
exports.Account = AccountModel;

function addAccount(id, authCode, completeCB) {
  AccountModel.register({username: id, active: false}, authCode, function(err, user) {
    if (err) {
      completeCB(err);
    }
    else {
      var authenticate = AccountModel.authenticate();
      authenticate(id, authCode, function(err, result) {
        if (err) {
          const msg = "Error authenticating account: " + err;
          completeCB(msg);
        }
        else {
          completeCB(err, result);
        }
     });
    }
  });
}
exports.addAccount = addAccount;

function delAccount(id, completeCB) {
  const acctQuery = {username: id};
  return completeCB
    ?  AccountModel.remove(acctQuery, completeCB)
    : AccountModel.remove(acctQuery).exec();
}
exports.delAccount = delAccount;

function getAccounts(username, completeCB) {
  const query = completeCB ? { username } : {};
  completeCB = completeCB ? completeCB : username;
  AccountModel.find(query, completeCB);
}
exports.getAccounts = getAccounts;

function procLoginAttempt(user, success, completeCB) {
  let isModified = false;
  if (success) {
    isModified = user.delayFailedAttempts > 0;
    user.delayFailedAttempts = 0;
  }
  else {
    isModified = true;
    user.delayFailedAttempts++;
    user.delayLastAttempt = Date.now();
  }
  return !isModified ? Promise.resolve(user)
    : user.save();
}
exports.procLoginAttempt = procLoginAttempt;

function getLockedStatus(reqResp) {
  return AccountModel.findByUsername(reqResp.rqst.body.id)
    .then((user) => {
      if (user) {
        reqResp.user = user;
        reqResp.isLocked = isLocked(
            user.delayFailedAttempts ? user.delayFailedAttempts : 0,
            user.delayLastAttempt ? user.delayLastAttempt : 0);
      }
      return Promise.resolve(reqResp);
    })
}
exports.getLockedStatus = getLockedStatus;

function isLocked(failedAttempts, lastFailedAttempt) {
  const failedLoginLimit = 5;
  const initialDelayMs = 30000;
  const delayExp = Math.trunc(failedAttempts / failedLoginLimit);
  if (delayExp == 0) {
    return false;
  }
  const delayTimeMs = initialDelayMs * Math.pow(2, (delayExp - 1));
  /***
  console.log("getLockedStatus", failedAttempts, lastFailedAttempt, delayExp, delayTimeMs,
    Date.now() - lastFailedAttempt - delayTimeMs);
  ***/
  return failedAttempts % failedLoginLimit == 0 &&
    Date.now() - lastFailedAttempt - delayTimeMs < 0;
}