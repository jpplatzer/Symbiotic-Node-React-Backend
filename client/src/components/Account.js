// Account page
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { actionCreators } from '../modules';
import { bindActionCreators } from 'redux';
const FF = require('./FormFcns');
const Paths = require('../paths');
import { createAccountPageProps } from './Sidebar';
const Acct = require('../modules/account');

class Profile extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.sidebarProps = createAccountPageProps(0);
    this.firstNameGroupIdx = 0;
    this.lastNameGroupIdx = 1;
    this.orgGroupIdx = 2;
  }

  componentDidMount() {
    // console.log("Profile componentDidMount props", this.props);
    this.props.actions.loadPage(this.props, null, this.sidebarProps);
    this.setFormProps(true);
    if (this.props.cancel) {
      console.log("Cancel Account Requested");
      Acct.cancelAccount(this.props);
    }
  }

  componentDidUpdate() {
    this.setFormProps(false);
  }

  setFormProps(force) {
    if (this.props.profile && this.props.profile.data) {
      if (force || !this.state.formProps) {
        this.setState({
          formProps: this.createProfileProps(),
          [this.firstNameGroupIdx]:
            FF.createItemValue(0, this.props.profile.data.firstName, true),
          [this.lastNameGroupIdx]:
            FF.createItemValue(0, this.props.profile.data.lastName, true),
          [this.orgGroupIdx]:
            FF.createItemValue(0, this.props.profile.data.org, true),
        });
      }
    }
  }

  createProfileProps() {
    const props = FF.createFormProps("Profile");
    props.form = {
      id: "profile",
      autoComplete: "on",
    }
    props.formMsg = () => <i>{this.props.profile.data.id}</i>
    props.formGroups.push(this.createItemGroup("firstname", "First Name", {
      type: "text",
      name: "firstname",
      placeholder: "Enter first name",
      defaultValue: this.props.profile.data.firstName,
    }));
    props.formGroups.push(this.createItemGroup("lastname", "Last Name", {
      type: "text",
      name: "lastname",
      placeholder: "Enter last name",
      defaultValue: this.props.profile.data.lastName,
    }));
    props.formGroups.push(this.createItemGroup("org", "Organization", {
      type: "text",
      name: "org",
      placeholder: "Enter organization",
      defaultValue: this.props.profile.data.org,
    }));

    props.buttons.push(this.createUpdateButton());
    return props;
  }

  createItemGroup(id, label, inputProps) {
    const group = FF.createFormGroup();
    const item = FF.createGroupItem(() => true, FF.notifyNever, "");
    item.id = id;
    item.label.text = label;
    item.input.props = inputProps;
    group.items.push(item);
    return group;
  }

  valuesChanged(values) {
    return values[this.firstNameGroupIdx] != this.props.profile.data.firstName ||
      values[this.lastNameGroupIdx] != this.props.profile.data.lastName ||
      values[this.orgGroupIdx] != this.props.profile.data.org;
  }

  procUpdate = () => {
    const values = FF.getItemValues(this.state);
    // console.log('values:', values)
    if (this.valuesChanged(values)) {
      const successDialogFcn = FF.renderSuccessDialogFcn(this.props.actions,
        "Profile successfully updated");
       this.props.actions.setProfile(values[this.firstNameGroupIdx],
          values[this.lastNameGroupIdx], values[this.orgGroupIdx])
        .then(successDialogFcn)
        .catch((alertData) => FF.setAlertMsg(this.setStateFcn,
          alertData.status == 400 ? "Invalid values" : alertData.message));
 }
    else {
      const unchangedDialogFcn = FF.renderSuccessDialogFcn(this.props.actions,
        "No changes were made");
      unchangedDialogFcn();
    }
  }

  createUpdateButton() {
    const buttonProps = FF.createButton("Update", this.procUpdate);
    buttonProps.props = {
      type: "button",
      className: "btn btn-primary sym-l-1",
      name: "submit",
    };
    return buttonProps;
  }

  setStateFcn = FF.createSetStateFcn(this);

  renderDeleteDialog(shouldRender) {
    return null;
  }

  render() {
    // console.log('Profile render state, formProps:', this.state, this.state.formProps);
    return (this.state.formProps
      ? <div>
          {this.renderDeleteDialog(this.props.deleteAccount)}
          {FF.renderForm(this.state, this.setStateFcn, this.state.formProps)}
        </div>
      : null
    );
  }
}

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { profile } = state;
  return { profile };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

exports.Account = connect(mapStateToProps, mapDispatchToProps)(Profile);
