// API Router
// Copyright 2017 Jeff Platzer. All rights reserved.

var express = require('express');
var router = express.Router();
var authCtl = require('../controllers/authApi');
var groupCtl = require('../controllers/groupApi');
var deviceCtl = require('../controllers/deviceApi');
var auditCtl = require('../controllers/auditApi');
var downloadCtl = require('../controllers/downloadApi');

/* Locations pages */
router.use('/login', authCtl.procApiLogin);
router.post('/logout', authCtl.procApiLogout);
router.post('/chgPassword', authCtl.chgPasswordRqst);
router.post('/setPassword', authCtl.setPasswordRqst);
router.post('/sendReset', authCtl.sendResetRqst);
router.get('/profile', authCtl.getUserProfile);
router.post('/profile', authCtl.setUserProfile);
router.post('/cancelAccount', authCtl.cancelAccountRqst);
router.get('/group/:group', groupCtl.getGroupRqst);
router.post('/deleteGroup/:group', groupCtl.deleteGroupRqst);
router.get('/devices/:group', deviceCtl.devicesRqst);
router.get('/deviceStatuses/:group', deviceCtl.deviceStatusesRqst);
router.post('/deleteDevices', deviceCtl.deleteDevicesRqst);
router.get('/audit/:group/:subgroup/:device/:time', auditCtl.auditRqst);
router.get('/audits/:group/:subgroup/:device', auditCtl.auditsRqst);
router.post('/deleteAudits', auditCtl.deleteAuditsRqst);
router.get('/downloads/:group/:type/:file', downloadCtl.downloadRqst);
router.post('/downloadCmd/:group/:type/:file', downloadCtl.downloadCmdRqst);
router.get('/downloadWithId/:user/:id/:file', downloadCtl.downloadWithIdRqst);
router.post('/userAgreement/:group/:name/:version', downloadCtl.updateUserAgreement);

module.exports = router;