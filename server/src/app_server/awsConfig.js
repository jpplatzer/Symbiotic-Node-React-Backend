// Symbiotic AWS cloud-based server configuration
// Copyright 2018 Jeff Platzer. All rights reserved.

const CommonCfg = require('./commonConfig');
/***
  Do not require any other local source files at a global-level that could
  introduce a circular dependency on this config module.
  Use the init function instead.
***/

const awsCfg = CommonCfg;

awsCfg.app.init = initAwsApp;
awsCfg.app.region = 'us-west-2';

awsCfg.server.useProxy = true;

awsCfg.cookies.requireSecure = true;

awsCfg.files.filesLoc = 'symbioticsecurity-files';

awsCfg.secrets.keys.dbUser = 'webapp/db_user';
awsCfg.secrets.keys.dbLogs = 'webapp/db_logs';
awsCfg.secrets.keys.sessionSec = 'webapp/session_sec';
awsCfg.secrets.keys.redisSec = 'webapp/redis_sec';

awsCfg.db.hosts = [ "172.31.31.115:27017", "172.31.15.115:27017", "172.31.47.115:27017" ];
awsCfg.db.replicaSet = "webApp";

function initAwsApp() {
  const awsInit = require('../aws_fcns/awsInit');
  awsInit.init(awsCfg);
}

module.exports = awsCfg;