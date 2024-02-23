// Renderer for dashboard content page
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import T, { DataTable }  from './DataTable';
import DashContent from './DashContent';
import { actionCreators } from '../modules';
import Paths from '../paths';
import Devices from '../modules/devices';
import TableProps from './TableProps';
import Cmn from '../../../common/CmnFcns';
import { createDevicesSidebarProps } from './Sidebar';

function createAuditsLink(key) {
  return (renderObj, data) => {
    renderObj.value = data[key];
    if (renderObj.value > 0) {
      const vals = data.subgroup.split('|');
      const dash = {
        group: vals[0],
        subgroup: vals[1],
        device: data.device,
      }
      renderObj.url = Paths.audits.build(dash);
    }
    return renderObj;
  }
}

const colInfo = [
  {
    header: 'Device',
    renderer: T.renderer(T.propertyValue('device'))
  },
  {
    header: 'Scans',
    renderer: T.renderer(createAuditsLink('audits'))
  },
  {
    header: 'Active',
    renderer: T.renderer(T.propertyValue('active'))
        .next(T.redIfNot('yes'))
  },
  {
    header: 'Connected',
    renderer: T.renderer(T.propertyValue('connected'))
        .next(T.redIfNot('yes'))
  },
  {
    header: 'Errors',
    renderer: T.renderer(T.propertyValue('errors'))
        .next(T.redIfNot(0))
  },
  {
    header: 'Security Issues',
    renderer: T.renderer(T.propertyValue('security'))
        .next(T.redIfNot(0))
  },
];

class DeviceStatuses extends DashContent {
  deviceDataKeys = ['device', 'subgroup'];
  deleteDevicesPrompt = "Are you sure you want to delete the selected devices. All device data will be lost.";

  constructor(props) {
    super(props);
    this.tableProps = new TableProps;
    this.tableProps.colInfo = colInfo;
    this.tableProps.enableDataTools(this.deviceDataKeys);
    this.tableProps.setDeleteDataHandler(this.deleteDevices, this.deleteDevicesPrompt);
  }

  sidebarProps() {
    return this.props.params && this.props.params.group ?
      createDevicesSidebarProps(this.props.params.group, true) : null;
  }

  componentDidMount() {
    // console.log('DeviceStatuses mounted:',  this.props);
    this.props.actions.loadPage(this.props, Devices.updateFcns, this.sidebarProps());
  }

  componentDidUpdate() {
    // console.log('DeviceStatuses componentDidUpdate:', this.props);
    this.props.actions.updatePage(this.props, Devices.updateFcns, this.sidebarProps());
  }

  deleteDevices = (devices) => {
    // console.log("Will delete devices, params:", devices, this.props.params);
    this.props.actions.deleteDevices(devices, this.deviceDataKeys, this.props.params);
  }

  renderData() {
    const statuses = Devices.getStatusesDataFromProps(this.props);
    return statuses && statuses.data
      ? <DataTable data={statuses.data} tableProps={this.tableProps} />
      : T.loadingSpinner();
  }

  renderContent() {
    const title = "Devices";
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
  const { devices, notify } = state;
  return { devices, notify };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(DeviceStatuses);
