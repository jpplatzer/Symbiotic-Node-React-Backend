// Symbiotic common server configuration
// Copyright 2018 Jeff Platzer. All rights reserved.

const Vals = require('../common/ValCmn');

const nullFcn = () => null;
const nullPromiseFcn = () => Promise.resolve();
const tempPath = process.env.TEMP_PATH;
const downloadsDir = 'downloads';
const registrationDir = 'registration';

const defaultLogger = {
  log: nullFcn,
  error: nullFcn,
  warn: nullFcn,
  info: nullFcn,
  verbose: nullFcn,
  debug: nullFcn,
  silly: nullFcn,
};

function setLogger(config, logger) {
  config.logging.logger = logger;
  return config;
}

module.exports = {
  app: {
    init: nullFcn,
  },
  server: {
    httpPort: 3080,
    mode: "production",
    useProxy: false,
    baseUrl: "https://monitor.symbioticsecurity.com",
  },
  requiredAgreements: [
    { name: "terms", version: "1" },
  ],
  session: {
    maxAgeMs: Vals.msPerDay,
  },
  cookies: {
    requireSecure: false,
    requireSameSite: true,
  },
  logging: {
    defaultLevel: 'info',
    logger: defaultLogger,
    setLogger: (config, logger) => setLogger(config, logger),
  },
  password: {
    reset: {
      maxRequests: 3,
      resetExpirationMins: 30,
      newAcctExpirationMins: 7 * 24 * 60,
    },
  },
  bodyParserLimits: {
    json: '10mb',
    text: '5mb',
    urlencoded: '1mb',
  },
  files: {
    tempPath: tempPath,
    filesPath: tempPath,
    downloadsDir: downloadsDir,
    registrationDir: registrationDir,
    downloadsPath: tempPath + '/' + downloadsDir,
    registrationPath: tempPath + '/' + registrationDir,
    putStoredFile: nullPromiseFcn,      // putStoredFile(loc, filePath, storePath)
    getStoredFile: nullPromiseFcn,      // getStoredFile(loc, storePath, filePath)
    sendStoredFile: nullFcn,            // sendStoredFile(loc, storePath, res)
    receiveStoredFile: nullPromiseFcn,  // receiveStoredFile(loc, req, storePath)
  },
  secrets: {
    createSecretsManager: nullFcn,     // secretsManager(secretName)
    keys: {},
  },
  db: {
    hosts: [],
  },
  audit: {
    maxDevices: 5,
    maxPerDevice: 5,
    registrationFilename: 'register.json',
    baseUrl: 'https://monitor.symbioticsecurity.com',
    urlFiles: [
      { filename: 'reg_url.txt', subpath: '/device/register' },
      { filename: 'login_url.txt', subpath: '/device/login' },
      { filename: 'audit_url.txt', subpath: '/device/audit' },
    ],
  },
  email: {
    notificationFromAddr: "Symbiotic Security Notifications <no-reply@symbioticsecurity.com>",
  },
  packages: {
    defaultSecurity: [
      {
        distro: "debian",
        release: "jessie",
        architectures: ["amd64", "armel", "armhf", "i386"] ,
      },
      {
        distro: "debian",
        release: "stretch",
        architectures: ["amd64", "arm64", "armel", "armhf", "i386", "mips", "mips64el", "mipsel"] ,
      },
    ],
  },
  downloads: [
    {
      type: "audit",
      useUntilMs: Vals.msPerDay,
      deleteAfterMs: 8 * Vals.msPerDay,
    },
  ],
};

