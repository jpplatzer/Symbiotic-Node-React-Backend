// AAA-related functionality
// Copyright 2017 Jeff Platzer. All rights reserved.

const R = require('ramda');
var passport = require('passport');
const F = require('../../common/FcnHelp');
const DB = require('../../db_mgmt/device_db');
const Acct = require('../../db_mgmt/account');
const Maybe = require('../../common/Maybe').Maybe;
const Either = require('../../common/Either.js').Either;
const rrFcns = require('../../common/RqstRespFcns');
const Cmn = require('../../common/CmnFcns');
const Val = require('../../common/ValCmn');
const Log = require('../../common/LogFcns');
const reqValidate = require('../../db_mgmt/reqValidate');
const Cfg = require('../../app_server/serverConfig');

const reportableProfileProps = ["id", "firstName", "lastName", "org",
  "startGroup", "active", "agreementsAccepted",
  "agreementsCurrent", "passwordCurrent", "policies"];
exports.reportableProfileProps = reportableProfileProps;

const rejectResp = (reqResp, status, msg, reject) =>
  reject ? reject(rrFcns.handleErrorResp(reqResp, { status, msg }))
    : Promise.reject(rrFcns.handleErrorResp(reqResp, { status, msg }));

const tempLockedMsg = "Temporarily locked. Too many attempts.";

function processLockedStatus(reqResp) {
  return Acct.getLockedStatus(reqResp)
    .then(() => {
      if (!reqResp.user) {
        return rejectResp(reqResp, rrFcns.httpStatus.unauthorized, "Email address not recognized");
      }
      else if (reqResp.isLocked) {
        return rejectResp(reqResp, rrFcns.httpStatus.unauthorized, tempLockedMsg);
      }
      else {
        Log.logReq("info", "Req url: ", reqResp.rqst.path, reqResp.rqst.body.id,
          reqResp.rqst.connection.remoteAddress, reqResp.user.delayFailedAttempts);
        return Acct.procLoginAttempt(reqResp.user, false);
      }
    })
}

const loginUserPromise = R.compose(
  F.then(performLogin),
  F.then(checkFailedLogins),
  checkLoginValues);
exports.loginUserPromise = loginUserPromise;

function checkLoginValues(reqResp) {
  if (reqResp.rqst.body.id !== undefined &&
    reqResp.rqst.body.authCode !== undefined &&
    reqValidate.isDataValid(reqResp.rqst.body.id, reqValidate.idField) &&
    reqValidate.isDataValid(reqResp.rqst.body.authCode, reqValidate.pwField)) {
    return Promise.resolve(reqResp);
  }
  else {
    return rejectResp(reqResp, rrFcns.httpStatus.badRequest,
      rrFcns.httpStatusMsg.badRequest);
  }
}

function checkFailedLogins(reqResp) {
  return Acct.getLockedStatus(reqResp)
    .then((reqResp) => reqResp.isLocked
      ? rejectResp(reqResp, rrFcns.httpStatus.unauthorized, rrFcns.httpStatusMsg.loginLocked)
      : Promise.resolve(reqResp))
    .catch((err) => Promise.reject(rrFcns.handleErrorResp(reqResp, err)));
}

function performLogin(reqResp) {
  return new Promise((resolve,reject) => {
    // http://passportjs.org/docs/authenticate
    passport.authenticate('local', function(err, user, info) {
      if (err) {
        rejectResp(reqResp, rrFcns.httpStatus.internalError,
          rrFcns.httpStatusMsg.internalError, reject);
      }
      else if (!user) {
        if (reqResp.user) {
          Acct.procLoginAttempt(reqResp.user, false)
            .then(() => loginFailure(reqResp, "info", reject))
            .catch(() => loginFailure(reqResp, "info", reject))
        }
        else {
          loginFailure(reqResp, "debug", reject);
        }
      }
      else {
        reqResp.user = user;
        logInUser(reqResp, resolve, reject);
      }
    })(reqResp.rqst, reqResp.res, reqResp.next);
  });
};

function loginFailure(reqResp, logLevel, reject) {
  const failedAttempts = reqResp.user ? reqResp.user.delayFailedAttempts : undefined;
  Log.logReq(logLevel, "Req url: ", reqResp.rqst.path, reqResp.rqst.body.id,
    reqResp.rqst.connection.remoteAddress, failedAttempts);
  return rejectResp(reqResp,
    rrFcns.httpStatus.unauthorized, rrFcns.httpStatusMsg.loginFailed, reject);
}

function logInUser(reqResp, resolve, reject) {
  reqResp.rqst.logIn(reqResp.user, function(err) {
    if (err) {
      reqResp.resp = rrFcns.createInternalErrorResp(reqResp, err);
      reject(reqResp);
    }
    else {
      Cfg.logging.logger.info("Successful authentication for: " + reqResp.user.username);
      Acct.procLoginAttempt(reqResp.user, true)
        .then(() => resolve(reqResp))
        .catch((err) => {
          Cfg.logging.logger.warn("Error processing login attempt:", err);
          resolve(reqResp);
        });
    }
  });
}

const setUserAuthorizations = function(reqResp) {
  return new Promise((resolve,reject) => {
    const setAuthCB = (err, userGroups) => {
      if (err) {
        Cfg.logging.logger.info("Get DB user groups error:", err);
        rejectResp(reqResp, rrFcns.httpStatus.internalError,
          rrFcns.httpStatusMsg.internalError, reject);
      }
      else {
        rrFcns.setAuthorizedValues(reqResp,
          rrFcns.authorizationTypes.user, userGroups.viewer);
        rrFcns.setAuthorizedValues(reqResp,
          rrFcns.authorizationTypes.admin, userGroups.admin);
        reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.ok));
        resolve(reqResp);
      }
    }
    DB.getUserGroups(reqResp.rqst.user.username, setAuthCB);
  });
};

exports.procApiLogin = function(req, res, next) {
  R.compose(
    F.catchP((err) => rrFcns.errorResp(res, err)),
    F.then(rrFcns.sendResponse),
    F.then(setUserAuthorizations),
    F.then(loginUserPromise),
    F.eitherToPromise,
    rrFcns.createReqResp)(req, res, next, true);
};

exports.procUILogin = function(req, res, next, failRedirect) {
  const failFcn = (err) => {
    // console.log("procUILogin failure:", err.resp.value);
    const errMsg = err && err.resp && err.resp.isJust &&
      err.resp.value.obj && err.resp.value.obj.message
      ? err.resp.value.obj.message
      : "Failure processing login";
    if (req.session) {
      if (!req.session.messages) {
        req.session.messages = [];
      }
      req.session.messages.push(errMsg);
    }
    res.redirect(failRedirect);
  };
  R.compose(
    F.catchP(failFcn),
    F.then(() => next()),
    F.then(setUserAuthorizations),
    F.then(loginUserPromise),
    F.eitherToPromise,
    rrFcns.createReqResp)(req, res, next, true);
};

const validateUserPromise = rrFcns.authRqstPromise(rrFcns.validateUserAuth);

exports.getUserProfile = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true, validateUserPromise, getDbProfile);
};

function profileDoesNotExistResponse(reqResp) {
  return rrFcns.handleErrorResp(reqResp,  {
    status: rrFcns.httpStatus.badRequest,
    msg: "User profile does not exist",
  });
}

const getDbProfile = function(reqResp) {
  return DB.getProfileDoc(reqResp.rqst.user.username)
    .then((profileDoc) => profileDoc
      ? Promise.resolve(rrFcns.dataRespFcn(reqResp, reportableProfileProps, profileDoc))
      : Promise.resolve(profileDoesNotExistResponse(reqResp)));
}

const validateSetProfileRqst = R.compose(
  F.chain(rrFcns.chainedValidateReq(reqValidate.SetProfileSchema)),
  rrFcns.validateUserAuth
);

exports.setUserProfile = function(req, res, next) {
  const validationFcn = rrFcns.authRqstPromise(validateSetProfileRqst);
  rrFcns.procValidatedRqst(req, res, next, false, validationFcn, setProfile);
};

function setProfile(reqResp) {
  return DB.updateProfileDoc(reqResp.rqst.user.username,
    reqResp.rqst.body.firstName,
    reqResp.rqst.body.lastName,
    reqResp.rqst.body.org)
    .then((doc) => doc
      ? Promise.resolve(rrFcns.dataRespFcn(reqResp, reportableProfileProps, doc))
      : Promise.reject(profileDoesNotExistResponse(reqResp)))
    .catch((err) => Promise.reject(rrFcns.handleErrorResp(reqResp, err)));
}

const validateChgPwRqst = R.compose(
  F.chain(rrFcns.chainedValidateReq(reqValidate.ChgPasswordSchema)),
  /***
  F.map(F.logValueFcn('User functions:',
    F.valuesOfType('function', (reqResp) => reqResp.rqst.user))),
  F.map(F.logValueFcn('Session functions:',
    F.valuesOfType('function', (reqResp) => reqResp.rqst.session))),
  ***/
  rrFcns.validateUserAuth
);

exports.chgPasswordRqst = function(req, res, next) {
  const validateFcn = rrFcns.authRqstPromise(validateChgPwRqst);
  rrFcns.procValidatedRqst(req, res, next, false, validateFcn, chgPassword);
}

function chgPassword(reqResp) {
  return DB.getProfileDoc(reqResp.rqst.user.username)
    .then((profileDoc) => profileDoc ? Promise.resolve(reqResp) :
      rejectResp(reqResp, rrFcns.httpStatus.unauthorized, "Not allowed"))
    .then(() => reqResp.rqst.user.changePassword(
      reqResp.rqst.body.curPw, reqResp.rqst.body.newPw))
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})))
    .catch((err) => procChgPasswordErr(reqResp, err));
}

function procChgPasswordErr(reqResp, err) {
  return err && err.name == 'IncorrectPasswordError'
    ? rejectResp(reqResp, rrFcns.httpStatus.unauthorized, "Invalid password")
    : Promise.reject(rrFcns.handleErrorResp(reqResp, err));
}

const sendResetValidateFcn = rrFcns.authRqstPromise(
  rrFcns.chainedValidateReq(reqValidate.ResetPasswordSchema));

exports.sendResetRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, false, sendResetValidateFcn, procResetRqst);
}

exports.procUiResetRqst = function(req, res, next) {
  return sendResetValidateFcn(req, res, next, false)
    .then(procResetRqst)
    .catch((reqResp) => Promise.resolve(reqResp));
}

function procResetRqst(reqResp) {
  return processLockedStatus(reqResp)
    .then(() => addPwReset(reqResp.user.username, Cfg.password.reset.resetExpirationMins, false))
    .then((resetData) => sendResetEmail(resetData, reqResp.user.username, Cfg.password.reset.resetExpirationMins))
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})))
    .catch((err) => Promise.resolve(rrFcns.handleErrorResp(reqResp, err)));
}

const pruneExpiredResetsReducer = (date) => (result, entry) => {
  if (entry.expires > date) {
    result.push(entry);
  }
  return result;
}

function addPwReset(id, expirationMins, force) {
  const date = Date.now();
  return DB.getProfileDoc(id)
    .then((profileDoc) => {
      if (profileDoc) {
        const resets = profileDoc.policies && profileDoc.policies.resets && profileDoc.policies.resets.reduce
          ? profileDoc.policies.resets.reduce(pruneExpiredResetsReducer(date), [])
          : [];
        if (force || resets.length < Cfg.password.reset.maxRequests) {
          const resetData = createResetObj(date, expirationMins);
          resets.push(resetData);
          return setProfileResetPolicy(profileDoc, resets)
            .then(() => Promise.resolve(resetData));
        }
        else {
          return Promise.reject({ status: rrFcns.httpStatus.tooMany, msg: tempLockedMsg });
        }
      }
      else {
        return Promise.reject({ status: rrFcns.httpStatus.notFound, msg: "The email address is not recognized" });
      }
    });
}
exports.addPwReset = addPwReset;

function setProfileResetPolicy(profileDoc, resets) {
  profileDoc.policies = profileDoc.policies ? profileDoc.policies : {};
  profileDoc.policies.resets = resets;
  profileDoc.markModified('policies');
  return profileDoc.save();
}

function createResetObj(date, expirationMins) {
  const expirationMs = expirationMins * 60 * 1000;
  return {
    tempCode: DB.randomHexValue(24),
    expires: date + expirationMs,
  };
}

const validateSetPwRqst = R.compose(
  F.chain((reqResp) => {
    if (reqResp.rqst.body.newPw != reqResp.rqst.body.newPw2) {
      return Either.left(rrFcns.handleErrorResp(reqResp, {
        status: rrFcns.httpStatus.badRequest,
        msg: "The passwords must match",
      }));
    }
    else if (!Val.pwValid(reqResp.rqst.body.newPw)) {
      return Either.left(rrFcns.handleErrorResp(reqResp, {
        status: rrFcns.httpStatus.badRequest,
        msg: "Invalid password",
      }));
    }
    else {
      return Either.right(reqResp);
    }
  }),
  rrFcns.chainedValidateReq(reqValidate.SetPasswordSchema)
);

function sendResetEmail(resetData, userid, expirationMins) {
  const resetUrl = Cfg.server.baseUrl + "/setpw?user=" +
    userid + "&tempCode=" + resetData.tempCode;
  const contentObj = Cfg.email.resetPwContentObj(resetUrl, expirationMins);
  // console.log("Html content:", Cfg.email.httpContent({}, contentObj));
  if (!Cfg.email.sendEmail) {
    return Promise.reject("Sending email not supported on this platform");
  }
  else {
    const senderAddr = Cfg.email.notificationFromAddr;
    const emailParams = {
      to: [ userid ],
      source: senderAddr,
      replyTo: [ senderAddr ],
      subjectLine: "Password Reset Request for Symbiotic Security",
    };
    return Cfg.email.sendEmail(emailParams, contentObj);
  }
}

const setPwValidateFcn = rrFcns.authRqstPromise(validateSetPwRqst);

exports.setPasswordRqst = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, false, setPwValidateFcn, setPassword);
}

exports.procUISetPasswordRqst = function(req, res, next) {
  return setPwValidateFcn(req, res, next, false)
    .then(setPassword)
    .catch((reqResp) => Promise.resolve(reqResp));
}

function setPassword(reqResp) {
  return processLockedStatus(reqResp)
    .then(() => DB.getProfileDoc(reqResp.rqst.body.id))
    .then((profileDoc) => {
      const reset = findMatchingResetEntry(profileDoc, reqResp.rqst.body.tempCode);
      if (reset) {
        if (reset.expires > Date.now()) {
          return reqResp.user.setPassword(reqResp.rqst.body.newPw)
            .then((user) => user.save())
            .then(() => {
              profileDoc.passwordCurrent = true;
              return setProfileResetPolicy(profileDoc, []);
            })
            .then((profileDoc) =>
              Promise.resolve(rrFcns.dataRespFcn(reqResp, reportableProfileProps, profileDoc)));
        }
        else {
          return rejectResp(reqResp, rrFcns.httpStatus.badRequest,
            "The password reset request has expired. Select the forgot password link to request a new one.");
        }
      }
      else {
        return rejectResp(reqResp, rrFcns.httpStatus.badRequest, "This request is not valid");
      }
    })
    .catch((err) => Promise.resolve(rrFcns.handleErrorResp(reqResp, err)));
}

function findMatchingResetEntry(profileDoc, tempCode) {
  const matchingTempCodeReducer = (tempCode) => (result, reset) =>
    result || tempCode == reset.tempCode ? reset : result;
  if (profileDoc && profileDoc.policies &&
    profileDoc.policies.resets && profileDoc.policies.resets.reduce) {
    return profileDoc.policies.resets.reduce(matchingTempCodeReducer(tempCode), null);
  }
  return null;
}

const validateWelcomeParams = (user, tempCode) => (reqResp) => {
  if (reqValidate.isDataValid(user, reqValidate.idField) &&
    reqValidate.isDataValid(tempCode, reqValidate.largeHexNum)) {
    return Either.right(reqResp);
  }
  else {
    return Either.left(rrFcns.handleErrorResp(reqResp, {
      status: rrFcns.httpStatus.badRequest,
      msg: "Invalid request values",
    }));
  }
}

exports.procUIWelcomeLogin = function(req, res, next, user, tempCode) {
  return rrFcns.authRqstPromise(validateWelcomeParams(user, tempCode))(req, res, next, true)
    .then((reqResp) => procWelcomeLogin(reqResp, user, tempCode))
    .catch((reqResp) => Promise.resolve(reqResp));
}

function procWelcomeLogin(reqResp, user, tempCode) {
  const invalidMsg = "This request is invalid or has expired. Select the forgot password link to request a new one.";
  reqResp.rqst.body.id = user;
  return processLockedStatus(reqResp)
    .then(() => DB.getProfileDoc(user))
    .then((profileDoc) => {
      const reset = findMatchingResetEntry(profileDoc, tempCode);
      if (reset) {
        if (reset.expires > Date.now()) {
          const promise = new Promise((resolve, reject) => {
              logInUser(reqResp, resolve, reject);
            });
          return promise
            .then(() => setUserAuthorizations(reqResp))
            .then(() => rrFcns.dataRespFcn(reqResp, reportableProfileProps, profileDoc));
        }
        else {
          return rejectResp(reqResp, rrFcns.httpStatus.badRequest, invalidMsg);
        }
      }
      else {
        return rejectResp(reqResp, rrFcns.httpStatus.badRequest, invalidMsg);
      }
    })
    .catch((err) => Promise.resolve(rrFcns.handleErrorResp(reqResp, err)));
}

const validateCancelAccoutRqst = R.compose(
  F.chain(rrFcns.chainedValidateReq(reqValidate.CancelSchema)),
  rrFcns.validateUserAuth
);

exports.cancelAccountRqst = function(req, res, next) {
  const validationFcn = rrFcns.authRqstPromise(validateCancelAccoutRqst);
  rrFcns.procValidatedRqst(req, res, next, false, validateUserPromise, cancelAccount);
};

function cancelAccount(reqResp) {
  const reasonObj = {
    reason: reqResp.rqst.body.reason,
    details: reqResp.rqst.body.details,
  };
  return DB.deactivateProfile(reqResp.rqst.user.username, reasonObj)
    .then(() => Acct.delAccount(reqResp.rqst.user.username))
    .then(() => Promise.resolve(rrFcns.createDataResp(reqResp, {})))
    .catch((err) => Promise.resolve(rrFcns.handleErrorResp(reqResp, err)));
}

exports.procApiLogout = function(req, res, next) {
  rrFcns.procValidatedRqst(req, res, next, true, validateUserPromise, logout);
};

function logout(reqResp) {
  reqResp.rqst.logout();
  reqResp.resp = Maybe.of(rrFcns.createApiResp(rrFcns.httpStatus.ok, {}));
  return Promise.resolve(reqResp);
}
