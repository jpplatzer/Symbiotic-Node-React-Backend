// Main React app renderer
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { contentTypes } from '../dataLifecycle';
import Paths from '../paths';
import { actionCreators } from '../modules';
import DashContent from './DashContent';

const homePath = Paths.home.path;

const contentPathFcnMap = {
  [contentTypes.deviceStatuses]: Paths.devices.build,
  [contentTypes.welcome]: Paths.welcome.build,
  [contentTypes.setPassword]: Paths.setPassword.build,
};

function buildContentPath(dashContent) {
  const buildFcn = contentPathFcnMap[dashContent.type];
  return dashContent && buildFcn ? buildFcn(dashContent) : null ;
}

class Home extends React.Component {
  componentDidMount() {
    // console.log('Home did mount:', this.props);
    const modProps = {...this.props};
    modProps.noRedirectHome = true;
    this.props.actions.loadPage(modProps);
    this.setPath();
  }

  componentDidUpdate() {
    // console.log('Home did update:', this.props);
    this.setPath();
  }

  contentPath() {
    return this.props.dash && this.props.dash.type ?
      buildContentPath(this.props.dash) : homePath;
  }

  setPath() {
    const path = this.contentPath(this.props.dash);
    // console.log('Home setPath:', path, this.props.location.pathname);
    if (this.props.location.pathname == homePath && path != homePath) {
      // console.log("Pushing path:", path);
      this.props.router.push(path);
    }
  }

  render() {
    return null;
  }
}

function mapStateToProps(state) {
  const { dash, profile } = state;
  return { dash, profile };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(Home);
