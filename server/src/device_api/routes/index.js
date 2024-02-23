// Route device requests
// Copyright 2017 Jeff Platzer. All rights reserved.

var express = require('express');
var router = express.Router();
var regCtl = require('../controllers/registration');
var authCtl = require('../controllers/deviceAuth');
var updateCtl = require('../controllers/deviceUpdate');
var auditCtl = require('../controllers/deviceAudit');

/* Locations pages */
router.post('/register', regCtl.procDeviceRegistration);
router.post('/login', authCtl.procDeviceLogin);
router.post('/update', updateCtl.procDeviceUpdate);
router.post('/audit', auditCtl.procDeviceAudit);

module.exports = router;