// Renderer for dashboard content page
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { AlertClasses, ErrorAlert } from './Alerts';
import Paths from '../paths';
import '../../../app_server/public/css/App.css';

class DashContent extends Component {
  renderAlerts(alertClass, msg) {
    // console.log("Props in render alerts:", this.props);
    return msg ? <ErrorAlert alertClass={alertClass}
      message={ msg } /> : null;
  }

  renderTitle = (title) => <h4 className="page-header">{title}</h4>;

  renderContent() {
    return null;
  }

  render() {
    const alertData = this.props.notify && this.props.notify.alert ?
      this.props.notify.alert : undefined;
    const errorMsg = alertData ? alertData.message : undefined;
    const alertClass = alertData ? alertData.alertClass : undefined;
    const devicePath = this.props.dash && this.props.dash.group
      ? Paths.devices.build(this.props.dash) : "#";
    return (
      <div className="col-sm-9 col-sm-offset-3 col-md-10 col-md-offset-2 main">
        {this.renderAlerts(alertClass, errorMsg)}
        {this.renderContent()}
      </div>
    );
  }
}

module.exports = DashContent;