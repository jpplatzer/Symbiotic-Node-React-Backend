// Reset password form
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
const DLC = require('../dataLifecycle');
const FF = require('./FormFcns');
const Val = require('../../../common/ValCmn');

class ResetPassword extends React.Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.formProps = this.createResetPwProps();
  }

  createResetPwProps() {
    const props = FF.createFormProps("Reset Password");
    props.form = {
      id: "resetpw",
      autoComplete: "on",
    }
    props.formMsg = () => Val.emailResetPrompt;
    props.formGroups.push(this.createResetPwGroupItem());
    props.buttons.push(this.createResetPwButton());
    props.buttons.push(this.createCancelButton());
    return props;
  }

  createResetPwGroupItem() {
    const group = FF.createFormGroup();
    const item = FF.createGroupItem(Val.emailValid,
      FF.notifyOnInvalid, "Enter a valid email address");
    item.label.text = "Email Address";
    item.label.props = {
      /* className: "sr-only", */
    };
    item.input.props = {
      type: "email",
      name: "emailaddr",
      placeholder: "Enter email address",
    }
    group.items.push(item);
    return group;
  }

  resetPasswordRqst = () => {
    const resetPwUrl = '/api/sendReset';
    const chgDoc = {
      id: this.state[0][0].value,
    };
    return DLC.updateRqst(resetPwUrl, chgDoc);
  }

  goBack = FF.createGoBackFcn(this.props);

  setStateFcn = FF.createSetStateFcn(this);

  procSubmit = (actions) => {
    const dialogFcn = FF.renderSuccessDialogFcn(actions, "Reset email sent", this.goBack);
    if (FF.validateFormState(this.state, this.setStateFcn, this.formProps)) {
      this.resetPasswordRqst()
        .then(dialogFcn)
        .catch((alertData) => FF.setAlertMsg(this.setStateFcn,
          alertData.status == 404 ? "Unrecognized email address" : alertData.message));
    }
  }

  createResetPwButton() {
    const buttonProps = FF.createButton("Send Reset", this.procSubmit);
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
    // console.log('Reset Password render state:', this.state);
    return (
      <div>
        {FF.renderForm(this.state, this.setStateFcn, this.formProps)}
      </div>
    );
  }

};

module.exports = ResetPassword;