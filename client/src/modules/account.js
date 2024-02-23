// Account action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
const DLC = require('../dataLifecycle');

function ruSureDialogProps(contAction, onClose) {
  const dialogProps = {};
  dialogProps.body = () => (
    <div>
      <p>This will cause the account and all of the devices' data to be lost</p>
      <p>Are you sure you want to continue?</p>
    </div>
  );
  const contButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary"
      onClick={contAction} >Continue</button>
  const cancelButton = (idx) =>
    <button key={idx} type="button" className="btn btn-default"
      data-dismiss="modal">Keep Account</button>
  dialogProps.buttons = [contButton, cancelButton];
  dialogProps.onClose = onClose;
  return dialogProps;
}

function ruSureDialogAction(actions) {
  return new Promise((resolve, reject) => {
    const contAction = () => {
      actions.dismissModal();
      return resolve();
    }
    const onClose = () => reject();
    const props = ruSureDialogProps(contAction, onClose);
    actions.setModal(props);
  });
}

class WhyDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = { reasonObj: {} };
  }

  handleRadioInput = (event) => {
    if (this.state.reasonObj.reason != event.target.value) {
      const reasonObj = {
        reason: event.target.value,
        details: "",
      }
      this.setState({ reasonObj });
      this.props.onUpdateReasonCB(reasonObj);
      console.log(reasonObj);
    }
  }

  handleTextInput = (event) => {
    const reasonObj = {
      reason: this.state.reasonObj.reason,
      details: event.target.value,
    }
    this.setState({ reasonObj });
    this.props.onUpdateReasonCB(reasonObj);
    console.log(reasonObj);
  }

  elaborateInput = (reason, promptText) => {
    return ( this.state.reasonObj.reason == reason
      ? <div>
          <p>{promptText}</p>
          <textarea rows="4" cols="50" onChange={this.handleTextInput}
            name="details" value={this.state.reasonObj.details} />
          <br />
        </div>
      : null
    );
  }

  render() {
    return (
      <div>
        <p>Before you go, would you mind telling us why you're leaving?</p>
        <input type="radio" name="reason" value="needsNotMet"
         onChange={this.handleRadioInput} /> Did not meet my needs<br />
        {this.elaborateInput("needsNotMet", "Can you please tell us what was missing?")}
        <br />
        <input type="radio" name="reason" value="tryingItOut"
         onChange={this.handleRadioInput} /> Just trying it out<br />
        {this.elaborateInput("tryingItOut", "Can you please tell us what might make it more useful?")}
        <br />
        <input type="radio" name="reason" value="otherConcerns"
         onChange={this.handleRadioInput} /> Concerns about using the product<br />
        {this.elaborateInput("otherConcerns", "Can you please tell us what your concerns are?")}
        <br />
        <input type="radio" name="reason" value="otherReason"
         onChange={this.handleRadioInput} /> Other<br />
        {this.elaborateInput("otherReason", "Can you please tell us more about why you're canceling?")}
        <br />
        <input type="radio" name="reason" value="noResponse"
         onChange={this.handleRadioInput} /> Prefer not to answer<br />
      </div>
    );
  }
}

function whyDialogProps(contAction, onUpdateReasonCB, onClose) {
  const dialogProps = {};
  dialogProps.title = () => (<h4>We're sorry to see you go</h4>);
  dialogProps.body = () => (
    <WhyDialog onUpdateReasonCB={onUpdateReasonCB} />
  );
  const contButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary"
      onClick={contAction} >Continue</button>
  const cancelButton = (idx) =>
    <button key={idx} type="button" className="btn btn-default"
      data-dismiss="modal">Keep Account</button>
  dialogProps.buttons = [contButton, cancelButton];
  dialogProps.onClose = onClose;
  return dialogProps;
}

function whyDialogAction(actions) {
  return new Promise((resolve, reject) => {
    let reasonObj = {};
    const onUpdateReasonCB = (updatedReasonObj) => {
      reasonObj = updatedReasonObj;
    }

    const contAction = () => {
      actions.dismissModal();
      return resolve(reasonObj);
    }
    const onClose = () => reject();
    const props = whyDialogProps(contAction, onUpdateReasonCB, onClose);
    actions.setModal(props);
  });
}

function finalDialogProps(contAction, onClose, reasonObj) {
  const dialogProps = {};
  dialogProps.body = () => (
    <div>
      { reasonObj && reasonObj.reason != "noResponse"
        ? <h4>Thank you for your feedback and for trying our security scan</h4>
        : <h4>Thank you for trying our security scan</h4> }
      <p>Select 'Continue' once more to finish closing your account</p>
    </div>
  );
  const contButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary"
      onClick={contAction} >Continue</button>
  const cancelButton = (idx) =>
    <button key={idx} type="button" className="btn btn-default"
      data-dismiss="modal">Keep Account</button>
  dialogProps.buttons = [contButton, cancelButton];
  dialogProps.onClose = onClose;
  return dialogProps;
}

function finalDialogAction(actions, reasonObj) {
  return new Promise((resolve, reject) => {
    const contAction = () => {
      actions.dismissModal();
      return resolve(reasonObj);
    }
    const onClose = () => reject();
    const props = finalDialogProps(contAction, onClose, reasonObj);
    actions.setModal(props);
  });
}

function cancelAcctDialog(props) {
  return ruSureDialogAction(props.actions)
    .then(() => whyDialogAction(props.actions))
    .then((reasonObj) => finalDialogAction(props.actions, reasonObj))
}

exports.cancelAccount = function(props) {
  const deleteGroupDataUrl = '/api/deleteGroup/' + props.profile.data.startGroup;
  const cancelAcctUrl = '/api/cancelAccount';
  cancelAcctDialog(props)
    .then((reasonObj) => {
      return DLC.updateRqst(deleteGroupDataUrl)
        .then(() => DLC.updateRqst(cancelAcctUrl, reasonObj))
    })
    .then(() => DLC.redirectToLogin())
    .catch((alertData) => {
      if (props.router) {
        props.router.goBack();
      }
      if (alertData) {
        DLC.notifyAlert(dispatch, alertData);
      }
    });
}
