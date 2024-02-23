// Symbiotic server-side configuration loader
// Copyright 2018 Jeff Platzer. All rights reserved.

var path = require('path');

const defaultCfgFileName = "localConfig";
const cfgFileName = process.env.CFG_FILE ? process.env.CFG_FILE : defaultCfgFileName;
const cfgFilePath = path.join(__dirname, cfgFileName);
const cfg = require(cfgFilePath);

module.exports = cfg;

