// Symbiotic local server configuration
// Copyright 2018 Jeff Platzer. All rights reserved.

const path = require('path');
const CommonCfg = require('./commonConfig');
/***
  Do not require any other local source files at a global-level that could
  introduce a circular dependency on this config module.
  Use the init function instead.
***/

const nullFcn = () => null;
const filesPath = '/usr/src/app/files';
const localCfg = CommonCfg;

localCfg.app.init = initLocalApp;

localCfg.server.httpsPort = 3443;
localCfg.server.certFile = filesPath + '/certs/server-cert.pem';
localCfg.server.keyFile = filesPath + '/certs/server-key.pem';
localCfg.server.mode = 'development';
localCfg.server.baseUrl = 'http://192.168.1.14:49080';

localCfg.files.filesPath = filesPath;
localCfg.files.filesLoc = filesPath;
localCfg.files.downloadsPath = filesPath + '/' + localCfg.files.downloadsDir;
localCfg.files.sendStoredFile =
  (loc, storePath, res) => res.sendFile(storePath, { root: loc });

localCfg.secrets.masterKey = process.env.SSKM_MASTER;
localCfg.secrets.keyFilepath = path.join(__dirname, '../config/sskm_app.dat');
localCfg.secrets.keys.dbUser = 'db_user';
localCfg.secrets.keys.dbLogs = 'db_logs';
localCfg.secrets.keys.sessionSec = 'session_sec';
localCfg.secrets.keys.redisSec = 'redis_sec';

localCfg.db.hosts = [process.env.MONGO_HOST];

localCfg.audit.baseUrl = 'http://192.168.1.14:49080';

function initLocalApp() {
  const localInit = require('./localInit');
  localInit.init(localCfg);
}

module.exports = localCfg;