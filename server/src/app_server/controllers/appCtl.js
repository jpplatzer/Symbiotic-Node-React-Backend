// Symbiotic web application controller
// Copyright 2017 Jeff Platzer. All rights reserved.

const express = require('express');
var authCtl = require('../../app_api/controllers/authApi');
const Val = require('../../common/ValCmn');
const reqValidate = require('../../db_mgmt/reqValidate');

function getMessages(req) {
  return req.session ? req.session.messages : [];
}

function setMessages(req, messages) {
  if (req.session) {
    req.session.messages = messages;
  }
}

function clearMessages(req) {
  if (req.session) {
    req.session.messages = [];
  }
}

exports.getHealth = function(req, res, next) {
  res.status(200);
  res.send("<h3>I'm not dead yet</h3>");
}

exports.renderLogin = function(req, res, next) {
  const options = {
    user : req.user,
    error: getMessages(req),
  };
  clearMessages(req);
  // console.log(req);
  res.render('login', options);
}

exports.procAppLogin = function(req, res, next) {
  authCtl.procUILogin(req, res, next, '/login');
}

exports.enforceLogin = function(req, res, next) {
  if(req.user === null || req.user === undefined){
    // console.log(req);
    res.redirect('/login');
  }
  else {
    // console.log(req);
    next();
  }
}

exports.renderResetPw = function(req, res, next) {
  res.render('resetpw', {
    prompt: Val.emailResetPrompt,
    error: getMessages(req),
  });
  clearMessages(req);
}

exports.procResetPw = function(req, res, next) {
  // console.log('procResetPw body:', req.body);
  const options = {};
  authCtl.procUiResetRqst(req, res, next)
    .then((reqResp) => {
      if (reqResp.resp.value.status == 200) {
        setMessages(req, ['Reset email was successfully sent']);
        res.redirect('/login');
      }
      else {
        setMessages(req, [reqResp.resp.value.obj.message]);
        res.redirect('back');
      }
    });
}

exports.renderSetPw = function(req, res, next) {
  // console.log('renderSetPw params:', req.query);
  if (req.query.user !== undefined &&
    req.query.tempCode !== undefined &&
    reqValidate.isDataValid(req.query.user, reqValidate.idField) &&
    reqValidate.isDataValid(req.query.tempCode, reqValidate.largeHexNum)) {
    res.render('setpw', {
      user: req.query.user,
      tempCode: req.query.tempCode,
      prompt: Val.pwValidPrompt,
      error: getMessages(req),
    });
    clearMessages(req);
  }
  else {
    setMessages(req, [ "Invalid request" ]);
    res.redirect('/login');
  }
}

exports.procSetPw = function(req, res, next) {
  // console.log('procResetPw body:', req.body);
  authCtl.procUISetPasswordRqst(req, res, next)
    .then((reqResp) => {
      if (reqResp.resp.value.status == 200) {
        setMessages(req, ['Password was successfully reset']);
        res.redirect('/login');
      }
      else {
        setMessages(req, [reqResp.resp.value.obj.message]);
        res.redirect('back');
      }
    });
}

exports.procWelcome = function(req, res, next) {
  authCtl.procUIWelcomeLogin(req, res, next,
    req.query.user, req.query.tempCode)
    .then((reqResp) => {
      if (reqResp.resp.value.status == 200) {
        res.redirect('/');
      }
      else {
        setMessages(req, [reqResp.resp.value.obj.message]);
        res.redirect('/login');
      }
    });
}