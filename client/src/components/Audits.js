// Renderer for dashboard content page
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import T, { DataTable }  from './DataTable';
import DashContent from './DashContent';
import { actionCreators } from '../modules';
import Paths from '../paths';
import TableProps from './TableProps';
import { createAuditSidebarProps } from './Sidebar';
import AuditsUpdater from '../modules/audits';

function createAuditLink(key, group, subgroup, device) {
  return (renderObj, data) => {
    const time = data[key];
    const dash = {
      group,
      subgroup,
      device,
      item: time
    };
    renderObj.value = new Date(time).toString();
    renderObj.url = Paths.audit.build(dash);
    return renderObj;
  }
}

class Audits extends DashContent {
  auditKeys = ['time'];
  deleteDevicesPrompt = "Are you sure you want to delete the selected audits.";

  constructor(props) {
    super(props);
    this.tableProps = new TableProps;
    this.tableProps.enableDataTools(this.auditKeys);
    this.tableProps.setDeleteDataHandler(this.deleteAudits, this.deleteDevicesPrompt);
  }

  sidebarProps() {
    return this.props.params && this.props.params.group
      ? createAuditSidebarProps(this.props.params.group,
          this.props.params.subgroup,
          this.props.params.device, true)
      : null;
  }

  componentDidMount() {
    // console.log('Audits mounted:',  this.props);
    this.props.actions.loadPage(this.props, AuditsUpdater.auditsUpdateFcns, this.sidebarProps());
  }

  componentDidUpdate() {
    // console.log('Audits componentDidUpdate:', this.props);
    this.props.actions.updatePage(this.props, AuditsUpdater.auditsUpdateFcns, this.sidebarProps());
  }

  deleteAudits = (audits) => {
    // console.log("Will delete audits, params:", audits, this.props.params);
    this.props.actions.deleteAudits(audits, this.props.params);
  }

  renderData() {
    const auditsData = this.props.audits &&
      this.props.audits.audits && this.props.audits.audits.data
      ? this.props.audits.audits.data : undefined;
    if (auditsData) {
      if (auditsData.length > 0) {
        this.tableProps.colInfo = [
          {
            header: 'Scan Time',
            renderer: T.renderer(createAuditLink('time', this.props.params.group,
              this.props.params.subgroup, this.props.params.device))
          },
        ];
        return (
          <DataTable data={auditsData} tableProps={this.tableProps} />
        );
      }
      else {
        return (
          <h3>No audits available</h3>
        );
      }
    }
    else {
      return T.loadingSpinner();
    }
  }

  renderContent() {
    const title = 'Security Scans for Device: ' + this.props.params.device;
    return (
      <div>
        {this.renderTitle(title)}
        {this.renderData()}
      </div>
    );
  }
}

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { audits, notify } = state;
  return { audits, notify };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(Audits);
