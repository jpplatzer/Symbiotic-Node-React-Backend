import React, { Component } from 'react';
const FF = require('./FormFcns');

class InfoPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      formProps: this.createFormProps(),
    };
  }

  createFormProps() {
    const props = FF.createFormProps(this.props.title);
    props.form = {
      id: "info",
      autoComplete: "on",
    }
    props.formSizeClass = "col-sm-offset-3 col-sm-7 col-md-offset-3 col-md-7";
    props.formBoarderClass = "sym-u-2";
    props.formMsgClass = "sym-u-3";
    props.formMsg = this.props.infoTextFcn;
    props.belowFormMsgClass = "sym-u-1";
    props.belowFormMsg = () => (<br />);

    props.buttons.push(this.createOkButton());

    return props;
  }

  createOkButton = () => {
    const buttonProps = FF.createButton("OK", FF.createGoBackFcn(this.props));
    buttonProps.props = {
      type: "button",
      className: "btn btn-primary sym-l-1",
      name: "ok",
    };
    return buttonProps;
  }

  setStateFcn = FF.createSetStateFcn(this);

  render() {
    // console.log('Profile render state, formProps:', this.state, this.state.formProps);
    return (this.state.formProps
      ? <div>
          {FF.renderForm(this.state, this.setStateFcn, this.state.formProps)}
        </div>
      : null
    );
  }
}

module.exports = InfoPage;