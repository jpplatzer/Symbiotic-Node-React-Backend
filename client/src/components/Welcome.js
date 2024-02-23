// Welcome react component
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { actionCreators } from '../modules';
import { bindActionCreators } from 'redux';
const FF = require('./FormFcns');
const Paths = require('../paths');

class Welcome extends React.Component {
  constructor(props) {
    super(props);
    this.state = { agreementSelected: false };
    this.formProps = this.createFormProps();
    this.agreement = { name: "terms", version: "1" };
  }

  welcomeDialog = () => (
    <div>
      <p>You can download the security scan and view the scan results from the dashboard.</p>
      <p>Please review and accept the <Link to={Paths.terms.path} >Terms of Service</Link> and <Link to={Paths.privacy.path} >Privacy Policy</Link> to get started.</p>
      <p>Some key takeaways are:</p>
        <ul>
          <li>The content and services on this website are copyrighted by Symbiotic Security.
            You are granted a limited license for its use.</li>
          <li>Protecting your data is our priority. We use several security industry standard measures to secure it.</li>
          <li>We will not sell or lease your data to third parties.</li>
          <li>This site uses cookies to provide a consistent user experience.</li>
          <li>See our <Link to={Paths.terms.path} >Terms of Service</Link> for the complete details.</li>
        </ul>
      <p>
        <input type="checkbox"
          name="agreement"
          checked={this.state.agreementSelected}
          onChange={this.agreementSelection}
          value="accptance" />
        &nbsp;Check here to indicate your acceptance of our Terms of Service.
      </p>
    </div>
  );

  agreementSelection = (event) => {
    this.setState({ agreementSelected: event.target.checked });
  }

  createFormProps() {
    const props = FF.createFormProps("Welcome!");
    props.formTitleClass = "sym-center sym-u-2 sym_blue";
    props.formMsg = this.welcomeDialog;
    props.formMsgClass = "sym-u-2";
    props.buttons.push(this.createContinueButton());
    return props;
  }

  createContinueButton() {
    const buttonProps = FF.createButton("Continue", this.procContinue);
    buttonProps.props = {
      type: "button",
      className: "btn btn-primary sym-l-1",
      name: "submit",
    };
    return buttonProps;
  }

  procContinue = () => {
    // console.log("procContinue agreement:", this.state.agreementSelected);
    if (!this.state.agreementSelected) {
      this.setState({ alertMsg: "Please review and accept the Terms of Service to continue" });
    }
    else {
      // console.log("procContinue:", this.props);
      this.props.actions.updateUserAgreementAction(
        this.props.profile.data.startGroup, this.agreement)
        .then((profileDoc) => {
          this.props.actions.setDashContent(profileDoc);
          if (this.props.router) {
            this.props.router.push(Paths.setPassword.path);
          }
        })
        .catch((err) => FF.setAlertMsg(this.setStateFcn,
          "Error communicating with the server: " + err));
    }
  }

  setStateFcn = FF.createSetStateFcn(this);

  render() {
    return (this.formProps
      ? <div>
          {FF.renderForm(this.state, this.setStateFcn, this.formProps)}
        </div>
      : null
    );
  }
}

function mapStateToProps(state) {
  // console.log("Welcome mapStateToProps:", state);
  const { profile } = state;
  return { profile };
}

function mapDispatchToProps(dispatch) {
  return { actions: bindActionCreators(actionCreators, dispatch) };
}

exports.Welcome = connect(mapStateToProps, mapDispatchToProps)(Welcome);
