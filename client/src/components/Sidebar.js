// Renderer for menu for dashboard sidebar
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import Paths from '../paths';
import Cmn from '../../../common/CmnFcns';

const createSubsection = (subsectionsArr) => (name, active, path, iconClass, props) => {
  subsectionsArr.push({
    name,
    active,
    path,
    iconClass,
    props,
  });
};

const createSection = (sectionsArr) => (name, path, iconClass, props) => {
  const subsections = [];
  sectionsArr.push({
    subsections,
    name,
    path,
    iconClass,
    props,
    createSubsection: createSubsection(subsections),
  });
}

const createSidebarProps = function() {
  const sections = [];
  const sidebarProps = {
    sections,
    createSection: createSection(sections),
  };
  sidebarProps.createSection("Dashboard", "/", "fa fa-table");
  return sidebarProps;
};
exports.createSidebarProps = createSidebarProps;

const createDevicesSidebarProps = function(group, active) {
  const props = createSidebarProps();
  const devicesPath = Paths.devices.build({ group });
  props.sections[0].createSubsection("Devices", active, devicesPath, "fa fa-sitemap");
  return props;
}
exports.createDevicesSidebarProps = createDevicesSidebarProps;

const createAuditSidebarProps = function(group, subgroup, device, active) {
  const props = createDevicesSidebarProps(group, false);
  const auditsPath = Paths.audits.build({ group, subgroup, device });
  props.sections[0].createSubsection("Scan Reports", active, auditsPath, "fa fa-file-text-o");
  return props;
}
exports.createAuditSidebarProps = createAuditSidebarProps;

const createAccountPageProps = function(activeSubIndex) {
  const props = createSidebarProps();
  const profilePath = Paths.account.build();
  const chgPwPath = Paths.changePassword.build();
  const cancelPath = Paths.cancelAccount.build();
  props.sections[0].createSubsection("Profile", activeSubIndex == 0, profilePath, "fa fa-id-card-o");
  props.sections[0].createSubsection("Change Password", activeSubIndex == 1, chgPwPath, "fa fa-lock");
  props.sections[0].createSubsection("Cancel Account", activeSubIndex == 2, cancelPath, "glyphicon glyphicon-remove-circle");
  return props;
}
exports.createAccountPageProps = createAccountPageProps;

class Sidebar extends Component {
  renderItem(item, isSub, active, idx) {
    const liClass = active ? "active" : "";
    const linkClass = isSub ? "sym_sb_sub" : "";
    return (
      <li key={idx} className={liClass} >
        <Link to={item.path}
          className={linkClass} >
          {item.iconClass ? <i className={item.iconClass} /> : null}
          {item.name}
        </Link>
      </li>
    );
  }

  renderSections(sections, renderedItems = [], sectionIdx = 0, itemIdx = 0) {
    if (sectionIdx >= sections.length) {
      return renderedItems;
    }
    const section = sections[sectionIdx];
    renderedItems.push(this.renderItem(section, false, false, itemIdx));
    section.subsections.forEach((subsection, subidx) => {
      renderedItems.push(this.renderItem(subsection, true,
        subsection.active, itemIdx + subidx + 1));
    })
    return this.renderSections(sections, renderedItems, sectionIdx + 1,
      itemIdx + section.subsections.length + 1);
  }

  render() {
    const props = this.props.sidebar ? this.props.sidebar : createSidebarProps();
    // console.log('Sidebar render:', this.props.sidebar, props);
    return (
      <div className="col-sm-2 col-md-2 sidebar">
        <ul className="nav nav-sidebar">
          {this.renderSections(props.sections)}
        </ul>
      </div>
    );
  }
};

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { sidebar } = state;
  return { sidebar };
}

exports.Sidebar = connect(mapStateToProps)(Sidebar);
