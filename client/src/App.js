// Main React app renderer
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from './modules';
import Download from './modules/download';
import Paths from './paths';
import ModalDialog from './components/ModalDialog';
import { Sidebar } from './components/Sidebar';
import DLC from './dataLifecycle';
import '../../app_server/public/css/App.css';

// https://www.w3schools.com/howto/howto_css_dropdown_navbar.asp
class NavbarImpl extends React.Component {
  renderScanCmdLink(groupId, idx) {
    const requestDownloadCmd = () => this.props.actions.getScanDownloadCmd(groupId, this.props.actions);
    return (
      <div key={idx} className="dropdown-item">
        <a onClick={requestDownloadCmd} >{Download.scanDownloadCmdText}</a>
      </div>
    )
  }

  renderDownloadMenuItem() {
    const profileData = this.props.profile ? this.props.profile.data : null;
    const groupData = this.props.group ? this.props.group.data : null;
    return groupData && groupData.policies &&
      groupData.policies.downloads && groupData.policies.downloads.map &&
      profileData && !DLC.isRestrictedToHomePage(profileData)
      ? (<li className="nav-item dropdown">
           <a className="nav-link dropdown-toggle" href="#" id="downloadDropdown"
              role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
             Downloads <i className="fa fa-caret-down" />
           </a>
           <div className="dropdown-menu dropdown-menu-right" aria-labelledby="downloadDropdown">
             {groupData.policies.downloads.map((type, idx) => {
              // console.log('requestDownload props:', this.props);
              const requestDownload = () => this.props.actions.initiateDownload(
                  groupData.name, type, this.props.actions);
              return (
                <div key={idx} className="dropdown-item">
                  <a onClick={requestDownload} >{Download.downloadName(type)}</a>
                </div>
              )}
             )}
             <a className="dropdown-header"><hr id="sym-dropdown-hr" /></a>
             {this.renderScanCmdLink(groupData.name, groupData.policies.downloads.length)}
           </div>
         </li>)
      : null;
  }

  signOut = () => {
    this.props.actions.logout(this.props.actions);
  }

  renderGearMenuItem = () => {
    const profileData = this.props.profile ? this.props.profile.data : null;
    return (!profileData || DLC.isRestrictedToHomePage(profileData) ? null :
      <li className="nav-item dropdown">
        <a className="nav-link dropdown-toggle" href="#" id="gearDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
          <i className="fa fa-gear" style={{fontSize:"20px"}}/>
        </a>
        <div className="dropdown-menu dropdown-menu-right" aria-labelledby="gearDropdown">
          <div key="0" className="dropdown-item">
            <a className="dropdown-header">Hello {profileData ? profileData.firstName : null}</a>
            <a className="dropdown-header"><hr id="sym-dropdown-hr" /></a>
          </div>
          <div key="1" className="dropdown-item">
            <Link to={Paths.account.path} >Account</Link>
          </div>
          <div key="2" className="dropdown-item">
            <a onClick={this.signOut} >Sign Out</a>
          </div>
        </div>
      </li>
    );
  };

  renderHelpMenuItem = () => {
    return (
      <li className="nav-item dropdown">
        <a className="nav-link dropdown-toggle" href="#" id="helpDropdown"
          role="button" data-toggle="dropdown"
          aria-haspopup="true" aria-expanded="false">Help</a>
        <div className="dropdown-menu dropdown-menu-right" id="sym-dropdown-wide" aria-labelledby="helpDropdown">
          <div key="0" className="dropdown-item">
            <Link to={Paths.runScanHelp.path} >Running a Security Scan</Link>
          </div>
          <div key="1" className="dropdown-item">
            <Link to={Paths.viewScanHelp.path} >Viewing Scan Reports</Link>
            <a className="dropdown-header"><hr id="sym-dropdown-hr" /></a>
          </div>
          <div key="2" className="dropdown-item">
            <Link to={Paths.terms.path} >Terms of Service</Link>
          </div>
          <div key="3" className="dropdown-item">
            <Link to={Paths.privacy.path} >Privacy Policy</Link>
          </div>
        </div>
      </li>
    );
  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-default navbar-fixed-top">
            <div className="container-fluid">
                <div className="navbar-header">
                    <button type="button" className="navbar-toggle" data-toggle="collapse" data-target="#navbar">
                      <span className="icon-bar"></span>
                      <span className="icon-bar"></span>
                      <span className="icon-bar"></span>
                    </button>
                    <a className="navbar-brand" href="#"><img src="/img/icon.png" style={{width:"24px", height:"24px"}} /></a>
                    <a className="navbar-brand" href="#">Symb<span className="sym_orange">iot</span>ic Security</a>
                </div>
                <div id="navbar" className="navbar-collapse collapse">
                    <ul className="nav navbar-nav navbar-right">
                        <li>
                            <a href="#">Dashboard</a>
                        </li>
                        {this.renderDownloadMenuItem()}
                        {this.renderHelpMenuItem()}
                        {this.renderGearMenuItem()}
                    </ul>
                </div>
            </div>
        </nav>
      </div>
    );
  }
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

function mapNavBarStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { group, profile } = state;
  return { group, profile };
}

const Navbar = connect(mapNavBarStateToProps, mapDispatchToProps)(NavbarImpl);

class App extends React.Component {
  render() {
    return (
      <div className="App">
        <ModalDialog />
        <Navbar />
        <div className="container-fluid">
            <div className="row">
              <Sidebar />
              {this.props.children}
            </div>
        </div>
      </div>
    )
  };
}

module.exports = App;
