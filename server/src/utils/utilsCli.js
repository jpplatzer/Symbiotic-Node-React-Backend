// Symbiotic utils CLI
// Copyright 2018 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');
Cfg.app.init();

const Cli = require('../common/CliCmn');
const Cmn = require('../common/CmnFcns');
const DB = require('../db_mgmt/device_db');
const Pkg = require('../security_proc/packageUpdateMgr');
const DebPkg = require('../security_proc/debianPackageUpdates');
var mongoose = require('mongoose');
const mongoConnect = require('../mongo-connect');
var path = require('path');
const AuditAcct = require('../db_mgmt/createAuditAcct');
const Auth = require('../app_api/controllers/authApi');
const Acct = require('../db_mgmt/account');
const winston = require('winston');

var db;
var secretsManager = Cfg.secrets.createSecretsManager(Cfg);

secretsManager.getSecret(Cfg.secrets.keys.dbUser)
  .then((passwd) => {
    mongoConnect.connect("devices", process.env.MONGO_USER, passwd);
    secretsManager = {};
    db = mongoose.connection;
  })

const logger = winston.createLogger({
  level: Cfg.logging.defaultLevel,
  transports: [
    new winston.transports.Console(),
  ],
});
Cfg.logging.setLogger(Cfg, logger);

function closeDb() {
  db.close();
}

const cmds = {
  showResetEmail: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), showResetEmail,
      Cli.logErr, Cli.createCmdResponse("Email html:\n")),
    help: "showResetEmail resetUrl"

  },
  showWelcomeEmail: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(1), showWelcomeEmail,
      Cli.logErr, Cli.createCmdResponse("Email html:\n")),
    help: "showWelcomeEmail welcomeUrl"
  },
  showGroups: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), DB.getGroups,
      Cli.logErr, Cli.createJsonResponse("Groups:\n")),
    help: "showGroups"
  },
  showProfiles: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 1), DB.getProfiles,
      Cli.logErr, Cli.createCmdResponse("Profiles:\n", Cli.JsonStringify)),
    help: "showProfiles [<id>]"
  },
  createScanAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3, 4), createScanAccount),
    help: "createScanAccount <userId> <firstName> <lastName> [<Org>]"
  },
  deleteScanAccount: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(2), deleteScanAccount),
    help: "deleteScanAccount <userId> <group>"
  },
  updatePackages: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), Pkg.updatedSecurityAndReleasePackages,
      Cli.logErr, Cli.createCmdResponse("Update packages results:\n")),
    help: "updatePackages"
  },
  showPackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), showPackagesInfo),
    help: "showPackagesInfo"
  },
  showPackagesContent: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), showPackagesContent),
    help: "showPackagesContent <0 (security) | 1 (release)> <distro> <release> <arch>"
  },
  deletePackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(4), DB.delPackagesInfo),
    help: "deletePackagesInfo <0 (security) | 1 (release)> <distro> <release> <arch>"
  },
  updateAllSecurityPackages: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0), updateAllSecurityPackages),
    help: "updateAllSecurityPackages"
  },
  updateSecurityPackagesInfo: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(3, 4), updateSecurityPackagesInfo),
    help: "updateSecurityPackagesInfo <distro> <release> <arch> [force]"
  },
  updateScan: {
    proc: Cli.createCmdProc(Cli.createParmCntValidation(0, 1), updateSecurityScan),
    help: "updateScan <userId>"
  },
  exit: {
    proc: Cli.exitFcn,
    help: "exit"
  },
};

Cli.runCli(cmds, closeDb);

function createScanAccount(userid, firstName, lastName, org_opt, completeCB) {
  if (!completeCB) {
    completeCB = org_opt;
    org_opt = null;
  }
  AuditAcct.createAuditAcct(userid, firstName, lastName, org_opt)
    .then(() => Auth.addPwReset(userid, Cfg.password.reset.newAcctExpirationMins, true))
    .then((resetData) => sendWelcomeEmail(resetData, userid, Cfg.password.reset.newAcctExpirationMins))
    .then(() => completeCB(null))
    .catch((err) => completeCB(err));
}

function sendWelcomeEmail(resetData, userid, expirationMins) {
  const welcomeUrl = Cfg.server.baseUrl + "/welcome?user=" +
    userid + "&tempCode=" + resetData.tempCode;
  const contentObj = Cfg.email.welcomeContentObj(welcomeUrl, expirationMins);
  // console.log("Html content:", Cfg.email.httpContent({}, contentObj));
  if (!Cfg.email.sendEmail) {
    console.log("Html content:", Cfg.email.httpContent({}, contentObj));
    return Promise.reject("Sending email not supported on this platform");
  }
  else {
    const senderAddr = Cfg.email.notificationFromAddr;
    const emailParams = {
      to: [ userid ],
      source: senderAddr,
      replyTo: [ senderAddr ],
      subjectLine: "Get started with your Security Scan",
    };
    return Cfg.email.sendEmail(emailParams, contentObj);
  }
}

function showResetEmail(resetUrl, completeCB) {
  const contentObj = Cfg.email.resetPwContentObj(resetUrl, Date());
  const httpContent = Cfg.email.httpContent({}, contentObj);
  completeCB(null, httpContent);
}

function showWelcomeEmail(welcomeUrl, completeCB) {
  const contentObj = Cfg.email.welcomeContentObj(welcomeUrl, Date());
  const httpContent = Cfg.email.httpContent({}, contentObj);
  completeCB(null, httpContent);
}

function deleteScanAccount(userid, group, completeCB) {
  DB.delAllGroupData(group)
    .then(() => DB.deactivateProfile(userid))
    .then(() => Acct.delAccount(userid))
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function updateSecurityPackagesInfo(distro, release, arch, force, completeCB) {
  const options = { update: true };
  if (completeCB) {
    options.force = true;
  }
  else {
    completeCB = force;
  }
  console.log('updateSecurityPackagesInfo', distro, release, arch, options);
  Pkg.getSecurityPackages(distro, release, arch, options)
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function showPackagesInfo(completeCB) {
  DB.getSecurityPackagesInfoDocs()
    .then((packagesInfo) => {
      displayPackagesInfo("Security packages info:", packagesInfo);
      return DB.getReleasePackagesInfoDocs();
    })
    .then((packagesInfo) => {
      displayPackagesInfo("Release packages info:", packagesInfo);
      completeCB();
    })
    .catch((err) => completeCB(err));
}

function showPackagesContent(type, distro, release, arch, completeCB) {
  function showCB(err, doc) {
    if (err) {
      completeCB(err);
    }
    else {
      const libstdObjs = Object.keys(doc.packages).reduce((result, key) => {
        if (key.indexOf('libstd') >= 0) {
          result.push({
            key,
            obj: JSON.stringify(doc.packages[key])
          });
        }
        return result;
      }, []);
      console.log("Packages content:", libstdObjs);
      /***
      console.log("Packages content:", Object.keys(doc.packages).forEach(
        pkg => pkg.indexOf('libstd') >= 0 ? { pkg, obj: doc.packages[pkg] } : ''));
      ***/
      completeCB();
    }
  }
  DB.getPackagesInfo(type, distro, release, arch, showCB);
}

function displayPackagesInfo(label, packagesInfo) {
  console.log(label);
  console.log(JSON.stringify(packagesInfo, null, 1));
}

function updateAllSecurityPackages(completeCB) {
  const packageIter = Pkg.securityPackages();
  updateSecurityPackage(packageIter)
    .then(() => completeCB());
}

function updateSecurityPackage(packageIter) {
  const result = packageIter.next();
  if (!result.done) {
    const options = { update: true };
    const packageObj = result.value;
    console.log(packageObj);
    return Pkg.getSecurityPackages(packageObj.distro, packageObj.release, packageObj.arch, options)
      .then(() => updateSecurityPackage(packageIter))
      .catch(() => updateSecurityPackage(packageIter));
  }
  else {
    return Promise.resolve();
  }
}

function updateSecurityScan(accountId, completeCB) {
  // Get the lots for the all active accounts or the specified account
    // Build a new scan for each lot
  completeCB = completeCB ? completeCB : accountId;
  accountId = accountId === completeCB ? null : accountId;
  getActiveAccountLots(accountId)
    .then((lotDocs) => Cmn.arrayAsyncReduce(lotDocs, updateScanReducer))
    .then(() => completeCB())
    .catch((err) => completeCB(err));
}

function getActiveAccountLots(accountId) {
  return DB.getProfilesDocs(accountId)
    .then((profileDocs) => Cmn.arrayAsyncReduce(profileDocs, profileToLotsReducer, []))
}

function profileToLotsReducer(lotDocs, profileDoc) {
  const query = { group: profileDoc.startGroup };
  return profileDoc.active
    ? DB.getLotDocs(query)
        .then((lots) => Promise.resolve(lotDocs.concat(lots)))
    : Promise.resolve(lotDocs);
}

function updateScanReducer(unused, lotDoc) {
  console.log("Updating scan for lot:", lotDoc.group, lotDoc.name);
  return AuditAcct.createRegistrationFile(lotDoc)
    .then(() => AuditAcct.createUrlFiles(lotDoc))
    .then(() => AuditAcct.createAuditInstaller(lotDoc));
/****
  return Promise.resolve();
***/
}
