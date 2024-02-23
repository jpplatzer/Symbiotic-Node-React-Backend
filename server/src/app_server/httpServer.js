// Symbiotic web application server
// Copyright 2017-2018 Jeff Platzer. All rights reserved.

const http = require('http');
const App = require('./app.js');
const Cfg = require('./serverConfig');

// start http server with the app
App.createApp()
  .then((app) => http.createServer(app).listen(Cfg.server.httpPort))
  .catch((err) => console.log("Error initializing the app:", err));
