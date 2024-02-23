// Change and Set Password forms
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { actionCreators } from '../modules';
import { bindActionCreators } from 'redux';
const DLC = require('../dataLifecycle');
const FF = require('./FormFcns');
const Paths = require('../paths');
const Val = require('../../../common/ValCmn');
import { createAccountPageProps } from './Sidebar';

class ChangePassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
  }

  componentDidMount() {
    // console.log('ChangePassword mounted:',  this.props);
    const formProps = this.createChgPwFormProps(this.props.setPwOnly);
    if (!this.props.setPwOnly) {
      this.sidebarProps = createAccountPageProps(1);
      this.props.actions.loadPage(this.props, null, this.sidebarProps);
    }
    this.setState({ formProps });
  }

  validateCurPw = (value) => value.length >= 8;

  newPwsMatch = (newPw2) => {
    // console.log('newPwsMatch', this, this.state);
    const newPwState = FF.getItemState(this.state, this.newPwGroupIdx, 0);
    return newPwState.value == newPw2;
  }

  createChgPwFormProps(setPwOnly) {
    const newPwIdx = setPwOnly ? 0 : 1;
    const title = setPwOnly ? "Set Password" : "Change Password";
    const props = FF.createFormProps(title);

    props.form = {
      id: "chgpw",
      autoComplete: "on",
    }

    if (setPwOnly) {
      props.formTitleClass = "sym-center sym-u-2 sym_blue";
    }
    else {
      props.belowFormMsg = this.forgotPasswordLink;
      props.formGroups.push(this.createGroupItem(
        "current-pw", "Current Password", "current-pw", "Enter current password",
        this.validateCurPw, FF.notifyOnInvalid,
        'Enter your current password'));
      this.curPwGroupIdx = 0;
    }

    props.formGroups.push(this.createGroupItem(
      "new-pw",
      setPwOnly ? "Password" : "New Password",
      "new-pw",
      setPwOnly ? "Enter password" : "Enter new password",
      Val.pwValid,
      FF.notifyOnInvalid,
      Val.pwValidPrompt));
    this.newPwGroupIdx = newPwIdx;
    props.formGroups.push(this.createGroupItem(
      "new-pw2",
      setPwOnly ? "Re-enter Password" : "Re-enter New Password",
      "new-pw2",
      setPwOnly ? "Re-enter password" : "Re-enter new password",
      this.newPwsMatch,
      FF.notifyOnInvalid,
      'Must match your new password'));
    this.newPw2GroupIdx = newPwIdx + 1;

    if (setPwOnly) {
      props.buttons.push(this.createSetPwButton());
    }
    else {
      props.buttons.push(this.createChgPwButton());
      props.buttons.push(this.createCancelButton());
    }

    return props;
  }

  forgotPasswordLink = () =>
    <div className="sym-u-1">
      <Link to={Paths.resetPassword.path} >Forgot Password?</Link>
    </div>;

  createGroupItem(id, labelText, name, placeholder,
    validationFcn, notificationFcn, notificationMsg) {
    const group = FF.createFormGroup();
    const item = FF.createGroupItem(validationFcn, notificationFcn, notificationMsg);
    item.label.text = labelText;
    item.input.props = {
      type: "password",
      name,
      placeholder,
    }
    group.items.push(item);
    return group;
  }

  changePasswordRqst = () => {
    const chgPwUrl = '/api/chgPassword';
    const chgDoc = {
      curPw: this.state[this.curPwGroupIdx][0].value,
      newPw: this.state[this.newPwGroupIdx][0].value,
    };
    return DLC.updateRqst(chgPwUrl, chgDoc);
  }

  goBack = FF.createGoBackFcn(this.props);

  setStateFcn = FF.createSetStateFcn(this);


  getTempCode = () => {
    let entry;
    const getTempCodeReducer = (curTime) => (result, entry) => {
      console.log("getTempCode", entry);
      if (!result && entry.expires > curTime) {
        result = entry;
      }
      return result;
    }

    const profileDoc = this.props.profile ? this.props.profile.data : null;
    if (profileDoc && profileDoc.policies &&
      profileDoc.policies.resets && profileDoc.policies.resets.reduce) {
        entry = profileDoc.policies.resets.reduce(getTempCodeReducer(Date.now()));
    }
    return entry;
  }

  setPassword = (tempCode) => {
    const setPwUrl = '/api/setPassword';
    const newPw = this.state[this.newPwGroupIdx][0].value;
    const doc = {
      id: this.props.profile.data.id,
      tempCode: tempCode,
      newPw: newPw,
      newPw2: newPw,
    };
    return DLC.updateRqst(setPwUrl, doc)
      .then((doc) => {
        this.props.actions.setProfileData(doc.data);
        this.props.actions.setDashContent(doc.data);
        return Promise.resolve();
      });
  }

  procSetPw = (actions) => {
    if (FF.validateFormState(this.state, this.setStateFcn, this.state.formProps)) {
      const tempCodeEntry = this.getTempCode();
      console.log("procSetPw code, props:", tempCodeEntry, this.props);
      if (tempCodeEntry) {
        const homePath = Paths.home.path;
        this.setPassword(tempCodeEntry.tempCode)
          .then(() => this.props.router.push(homePath))
          .catch((alertData) => FF.setAlertMsg(this.setStateFcn, alertData.message));
      }
    }
    else {
      console.log("procSetPw is not valid");
    }
  }

  createSetPwButton() {
    const buttonProps = FF.createButton("Set Password", this.procSetPw);
    buttonProps.props = {
      type: "button",
      className: "btn btn-primary sym-l-1",
      name: "submit",
    };
    return buttonProps;
  }

  procSubmit = (actions) => {
    const dialogFcn = FF.renderSuccessDialogFcn(actions,
      "Successfully changed password", this.goBack);
    if (FF.validateFormState(this.state, this.setStateFcn, this.state.formProps)) {
      this.changePasswordRqst()
        .then(dialogFcn)
        .catch((alertData) => FF.setAlertMsg(this.setStateFcn,
          alertData.status == 401 ? "Invalid password" : alertData.message));
    }
  }

  createChgPwButton() {
    const buttonProps = FF.createButton("Save", this.procSubmit);
    buttonProps.props = {
      type: "button",
      className: "btn btn-primary sym-l-1",
      name: "submit",
    };
    return buttonProps;
  }

  createCancelButton() {
    const buttonProps = FF.createButton("Cancel", this.goBack);
    buttonProps.props = {
      type: "button",
      className: "btn btn-default sym-l-2",
      name: "cancel",
    };
    return buttonProps;
  }

  render() {
    // console.log('Change Password render state:', this.state);
    return (this.state.formProps
      ? <div>
        {FF.renderForm(this.state, this.setStateFcn, this.state.formProps)}
      </div>
      : null
    );
  }
};

function mapStateToProps(state) {
  // console.log("Welcome mapStateToProps:", state);
  const { profile } = state;
  return { profile };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(ChangePassword);
