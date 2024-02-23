// Symbiotic web application server
// Copyright 2017-2018 Jeff Platzer. All rights reserved.

const https = require('https');
const path = require('path');
const fs = require('fs');
const app = require('./app.js');
const Cfg = require('./serverConfig');
const sskm = require('../sskm');
var keys = sskm.load(process.env.SSKM_MASTER, path.join(__dirname, '../config/sskm_server.dat'));

const options = {
  key: fs.readFileSync(Cfg.server.keyFile),
  cert: fs.readFileSync(Cfg.server.certFile),
  passphrase: keys.cert_pf
};

// start https server with the app
https.createServer(options, app).listen(Cfg.server.httpsPort);

// Reset keys
keys = {};
