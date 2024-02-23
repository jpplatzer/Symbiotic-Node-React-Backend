// React Route Renderer
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Router, Route, IndexRoute, hashHistory } from 'react-router';
const App = require('./App.js');
const Paths = require('./paths');
const Home = require('./components/Home');
const DeviceStatuses = require('./components/DeviceStatuses');
const Audits = require('./components/Audits');
const Audit = require('./components/Audit');
const ChangePassword = require('./components/ChangePassword');
const ResetPassword = require('./components/ResetPassword');
const { Account } = require('./components/Account');
const { Welcome } = require('./components/Welcome');
const InfoPage = require('./components/InfoPage');
const termsTextFcn = require('./components/help/Terms_1_0');
const privacyTextFcn = require('./components/help/Privacy_1_0');
const { runScanHelpTextFcn, viewScanHelpTextFcn } = require('./components/help/SecurityScans');

// https://stackoverflow.com/questions/31079081/programmatically-navigate-using-react-router

module.exports = (
  <Router history={hashHistory}>
    <Route path='/' component={App}>
      <IndexRoute component={Home} />
      <Route path={Paths.devices.path} component={DeviceStatuses} />
      <Route path={Paths.audits.path} component={Audits} />
      <Route path={Paths.audit.path} component={Audit} />
      <Route path={Paths.changePassword.path} component={ChangePassword} />
      <Route path={Paths.setPassword.path}
        component={(props) => <ChangePassword {...props} setPwOnly={true} />} />
      <Route path={Paths.resetPassword.path} component={ResetPassword} />
      <Route path={Paths.account.path} component={Account} />
      <Route path={Paths.cancelAccount.path} component={() => <Account cancel={true} />} />
      <Route path={Paths.welcome.path} component={Welcome} />
      <Route path={Paths.terms.path}
        component={(props) => <InfoPage {...props}
          title="Terms of Service" infoTextFcn={termsTextFcn} />} />
      <Route path={Paths.privacy.path}
        component={(props) => <InfoPage {...props}
          title="Privacy Policy" infoTextFcn={privacyTextFcn} />} />
      <Route path={Paths.runScanHelp.path}
        component={(props) => <InfoPage {...props}
          title="Running a Security Scan" infoTextFcn={runScanHelpTextFcn} />} />
      <Route path={Paths.viewScanHelp.path}
        component={(props) => <InfoPage {...props}
          title="Viewing Scan Reports" infoTextFcn={viewScanHelpTextFcn} />} />
      <Route path='*' component={NotFound} />
    </Route>
    <Route path={Paths.login.path} component={() => window.location.href = Paths.login.build()}/>
  </Router>
);

const NotFound = () => (<h1>404.. This page is not found!</h1>);

// JPP ToDo - add path to login using a component