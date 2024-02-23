// Symbiotic web application entry point
// Copyright 2017 Jeff Platzer. All rights reserved.

const express = require('express');
var session = require('express-session');
var path = require('path');
var helmet = require('helmet')
var favicon = require('serve-favicon');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
const mongoConnect = require('../mongo-connect');
const winston = require('winston');
const { combine, timestamp, printf } = winston.format;
require('winston-mongodb');
var appCtl = require('./controllers/appCtl');
var deviceRoutes = require('../device_api/routes/index');
var apiRoutes = require('../app_api/routes/index');
const Log = require('../common/LogFcns');
const config = require('./serverConfig');

function createAppObj() {
  const app = express();
  config.app.init();
  const secretsManager = config.secrets.createSecretsManager(config);
  const appObj = {
    app,
    config,
    secretsManager,
  };
  if (config.server.useProxy) {
    app.set('trust proxy', true);
  }
  return Promise.resolve(appObj);
}

function connectDb(appObj) {
  return appObj.secretsManager.getSecret(appObj.config.secrets.keys.dbUser)
    .then((secret) => {
      mongoConnect.connect("devices", process.env.MONGO_USER, secret);
      return Promise.resolve(appObj);
    })
}

function logReq(req, res, next) {
  // Use x-forwarded-for only if behind a proxy we control like NGINX
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

  /***
  req.sessionStore.client.keys("sess:*", (err, keys) => {
    console.log("Redis session keys:", keys);
  })
  console.log("HTTP request headers, id, content:", req.headers, "\n\n", req.body.id, "\n\n", req.body);
  ***/

  if (req.user) {
    Log.logReq("info", "Req url: ", req.path, req.user.username, ip);
  }
  next();
}

function startLogging(appObj) {
  return appObj.secretsManager.getSecret(appObj.config.secrets.keys.dbLogs)
    .then((secret) => {
      const logFormat = printf(({ level, message, timestamp }) =>
        `${timestamp} ${level}: ${message}`);
      const dbLogOptions = {
        level: appObj.config.logging.defaultLevel,
        db: mongoConnect.url("logs", "logs", secret),
      };
      const logger = winston.createLogger({
        level: appObj.config.logging.defaultLevel,
        format: combine(
          timestamp(),
          logFormat,
        ),
        transports: [
          new winston.transports.Console(),
          new winston.transports.MongoDB(dbLogOptions),
        ],
      });
      appObj.config.logging.setLogger(appObj.config, logger);
      appObj.config.logging.logger.info('Webapp started, environment:' + appObj.app.get('env'));
      return Promise.resolve(appObj);
    })
}

function setHelmetSecurity(appObj) {
  // Added security using helmet
  appObj.app.use(helmet({
    noCache: false,
    expectCt: false
  }));
  return Promise.resolve(appObj);
}

function setStaticViews(appObj) {
  // view engine setup
  appObj.app.set('views', path.join(__dirname, 'views'));
  appObj.app.set('view engine', 'pug');
  appObj.app.use(favicon(__dirname + '/public/img/favicon.jpg'));
  return Promise.resolve(appObj);
}

function setBodyParser(appObj) {
  appObj.app.use(bodyParser.json({ limit: appObj.config.bodyParserLimits.json }));
  appObj.app.use(bodyParser.text({ limit: appObj.config.bodyParserLimits.text, extended: false }));
  appObj.app.use(bodyParser.urlencoded({ limit: appObj.config.bodyParserLimits.urlencoded, extended: false }));
  return Promise.resolve(appObj);
}

function setAppSession(appObj) {
  // JPP Todo - an optimization would be to only use sessions for authenticated uses
  // Redis store config
  const redisUrl = "redis://" + process.env.REDIS_HOST;
  return appObj.secretsManager.getSecret(appObj.config.secrets.keys.redisSec)
    .then((redisSecret) =>
      appObj.secretsManager.getSecret(appObj.config.secrets.keys.sessionSec)
        .then((sessionSecret) => Promise.resolve({ redisSecret, sessionSecret }))
    )
    .then((secrets) => {
      var redisClient = require("redis").createClient(redisUrl);
      redisClient.auth(secrets.redisSecret);
      var RedisStore = require('connect-redis')(session);
      var redisStore = new RedisStore({client: redisClient, logErrors: true});
      appObj.app.use(session({
          store: redisStore,
          secret: secrets.sessionSecret,
          resave: false,
          saveUninitialized: false,
          name: 'sessionId',
          rolling: true,
          cookie: {
            secure: appObj.config.cookies.requireSecure,
            httpOnly: false,
            maxAge: appObj.config.session.maxAgeMs,
            sameSite: appObj.config.cookies.requireSameSite,
          },
      }));
      return Promise.resolve(appObj);
    })
}

function setPassportAuth(appObj) {
  // passport config
  appObj.app.use(passport.initialize());
  appObj.app.use(passport.session());

  var Account = require('../db_mgmt/account').Account;
  const localAuthOptions = {
    usernameField: "id",
    passwordField: "authCode"
  };
  passport.use(new LocalStrategy(localAuthOptions, Account.authenticate()));
  passport.serializeUser(Account.serializeUser());
  passport.deserializeUser(Account.deserializeUser());
  return Promise.resolve(appObj);
}

function setLogRequests(appObj) {
  appObj.app.use(logReq);
  return Promise.resolve(appObj);
}

function setApiRoutes(appObj) {
  // establish API routes
  appObj.app.use('/device', deviceRoutes);
  appObj.app.use('/api', apiRoutes);
  return Promise.resolve(appObj);
}

function setPublicFileAccess(appObj) {
  // set up authenticated access for static files, server browser.js (webpacked file) from root
  appObj.app.use('/css', express.static(path.join(__dirname, 'public/css'), {redirect: false}));
  appObj.app.use('/img', express.static(path.join(__dirname, 'public/img'), {redirect: false}));
  appObj.app.get('/health', appCtl.getHealth);
  appObj.app.get('/login', appCtl.renderLogin);
  appObj.app.post('/login', appCtl.procAppLogin, (req, res, next) => res.redirect('/'));
  appObj.app.get('/resetpw', appCtl.renderResetPw);
  appObj.app.post('/resetpw', appCtl.procResetPw);
  appObj.app.get('/setpw', appCtl.renderSetPw);
  appObj.app.post('/setpw', appCtl.procSetPw);
  appObj.app.get('/welcome', appCtl.procWelcome);
  appObj.app.use('/', appCtl.enforceLogin, express.static(path.join(__dirname, 'public')));
  return Promise.resolve(appObj);
}

function setNotFoundStatus(appObj) {
// catch 404 and forward to error handler
  appObj.app.use(function(req, res, next) {
      var err = new Error('Not Found');
      err.status = 404;
      next(err);
  });
  return Promise.resolve(appObj);
}

function setErrorHandlers(appObj) {
  // error handlers
  // development error handler
  // will print stacktrace
  if (appObj.config.server.mode == 'development') {
      appObj.app.use(function(err, req, res, next) {
          res.status(err.status || 500);
          res.render('error', {
              message: err.message,
              error: err
          });
      });
  }

  // production error handler
  // no stacktraces leaked to user
  appObj.app.use(function(err, req, res, next) {
      res.status(err.status || 500);
      res.render('error', {
          message: err.message,
          error: {}
      });
  });
  return Promise.resolve(appObj);
}

function createApp() {
  return createAppObj()
    .then(connectDb)
    .then(startLogging)
    .then(setHelmetSecurity)
    .then(setStaticViews)
    .then(setAppSession)
    .then(setBodyParser)
    .then(setPassportAuth)
    .then(setLogRequests)
    .then(setApiRoutes)
    .then(setPublicFileAccess)
    .then(setNotFoundStatus)
    .then(setErrorHandlers)
    .then((appObj) => Promise.resolve(appObj.app));
}

exports.createApp = createApp;
