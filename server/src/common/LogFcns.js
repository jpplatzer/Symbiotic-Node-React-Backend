// Common logging functions
// Copyright 2018 Jeff Platzer. All rights reserved.

const Cfg = require('../app_server/serverConfig');

function logReq(logLevel, msg, path, id, ip, failedAttepts) {
  const reqLog = msg + path +
    ", user: " + id +
    ", IP: " + ip +
    (failedAttepts ? ", failed attempts: " + failedAttepts : "");
  Cfg.logging.logger[logLevel](reqLog);
}
exports.logReq = logReq;