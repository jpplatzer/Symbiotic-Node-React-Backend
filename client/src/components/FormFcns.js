// It's not form over function, it's functions for forms
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../modules';

const nullFcn = () => null;

function createFormProps(title) {
  return ({
    title,
    formMsg: nullFcn,
    formSizeClass: "col-sm-offset-4 col-sm-6 col-md-offset-4 col-md-6",
    formBoarderClass: "sym-u-2 sym-fm-bdr",
    formTitleClass: "sym-center sym-u-2",
    formMsgClass: "sym-center sym-u-1",
    formAlertClass: "sym-center sym-u-1",
    belowFormMsgClass: "sym-l-20pct",
    inputClass: "symform1-inp",
    buttonStyleClass: "sym-center sym-u-2",
    formGroups: [],
    buttons: [],
    belowFormMsg: nullFcn,
  });
}
exports.createFormProps = createFormProps;

function createFormGroup() {
  return ({
    props: {},
    items: [],
  });
}
exports.createFormGroup = createFormGroup;

function createGroupItem(validationFcn, notificationFcn, notificationMsg) {
  return ({
    label: {},
    input: {},
    divProps: {},
    validationFcn,
    notificationFcn,
    notificationMsg,
  });
}
exports.createGroupItem = createGroupItem;

function createButton(text, onClickFcn) {
  return ({
    text,
    onClickFcn,
    props: {},
  });
}
exports.createButton = createButton;

exports.createGoBackFcn = (componentProps) => () =>
  componentProps.router ? componentProps.router.goBack() : null;

exports.createSetStateFcn = (componentObj) => componentObj.setState.bind(componentObj);

function getItemProps(props, groupIdx, itemIdx) {
  return props.formGroups[groupIdx].items[itemIdx];
}
exports.getItemProps = getItemProps;

function getItemState(state, groupIdx, itemIdx) {
  return !state[groupIdx] ? {}
    : !state[groupIdx][itemIdx] ? {}
    : state[groupIdx][itemIdx];
}
exports.getItemState = getItemState;

function setItemState(state, setStateFcn, groupIdx, itemIdx, itemState) {
  const groupState = state[groupIdx] ? state[groupIdx] : {};
  groupState[itemIdx] = itemState;
  setStateFcn({ [groupIdx]: groupState });
}
exports.setItemState = setItemState;

function getItemValues(state) {
  const values = {};
  for (const key in state) {
    if (!isNaN(key) && state[key][0] && state[key][0].value) {
      values[key] = state[key][0].value;
    }
  }
  return values;
}
exports.getItemValues = getItemValues;

function createItemValue(itemIdx, value, isValid) {
  return { [itemIdx]: {
      value,
      isValid,
    }
  }
}
exports.createItemValue = createItemValue;

const onChangeFcn = (state, setStateFcn, props, item, groupIdx, itemIdx) => (event) => {
  if (item.input.onChangeFcn) {
    item.input.onChangeFcn(event);
  }
  else {
    const itemState = getItemState(state, groupIdx, itemIdx);
    itemState.value = event.target.value;
    itemState.isValid = item.validationFcn(itemState.value, groupIdx, itemIdx);
    setItemState(state, setStateFcn, groupIdx, itemIdx, itemState);
  }
}

const onFocusFcn = (state, setStateFcn, props, item, groupIdx, itemIdx, inFocus) => () => {
  if (item.input.onFocusFcn) {
    item.input.onFocusFcn(inFocus);
  }
  else {
    const itemState = getItemState(state, groupIdx, itemIdx);
    itemState.inFocus = inFocus;
    setItemState(state, setStateFcn, groupIdx, itemIdx, itemState);
  }
}

const onClickFcn = (actions, button) => () =>
  button.onClickFcn ? button.onClickFcn(actions, button) : null;

function notifyOnFocus(itemState) {
  return itemState.inFocus == true;
}
exports.notifyOnFocus = notifyOnFocus;

function notifyOnInvalid(itemState) {
  return itemState.isValid == false;
}
exports.notifyOnInvalid = notifyOnInvalid;

function notifyNever() {
  return false;
}
exports.notifyNever = notifyNever;

function validateFormState(state, setStateFcn, props) {
  let isValid = true;
  const procItem = (groupIdx) => (item, itemIdx) => {
    const itemState = getItemState(state, groupIdx, itemIdx);
    if (itemState.isValid === undefined) {
      itemState.value = '';
      itemState.isValid = item.validationFcn(itemState.value, groupIdx, itemIdx);;
      itemState.inFocus = false;
    }
    if (!itemState.isValid) {
      isValid = false;
    }
  }
  const procGroup = (group, groupIdx) => group.items.forEach(procItem(groupIdx));
  props.formGroups.forEach(procGroup);
  return isValid;
}
exports.validateFormState = validateFormState;

const goBack = (router) => router.goBack();
exports.goBack = goBack;

function setAlertMsg(setState, alertMsg) {
  setState({ alertMsg });
}
exports.setAlertMsg = setAlertMsg;

class FormRenderer extends React.Component {
  renderAlertMsg = (state) => !state.alertMsg ? null :
    <p className="error-msg">{state.alertMsg}</p>;

  renderNotification = (state, props, item, groupIdx, itemIdx) => {
    const itemState = getItemState(state, groupIdx, itemIdx);
    return (item.notificationFcn(itemState)
      ? <h6 className="error-msg" >{item.notificationMsg}</h6>
      : null);
  }

  renderGroupItems() {
    const {state, setStateFcn, formProps} = this.props;
    return (
      <div className="sym-l-20pct" >
        {formProps.formGroups.map((group, groupIdx) =>
          <div key={groupIdx} {...group.groupProps} >
            {group.items.map((item, itemIdx) =>
              <div key={itemIdx} >
                {!item.label ? null :
                  <label htmlFor={item.id} className="symform1-lbl" >{item.label.text}</label>}
                {!item.input ? null :
                  <input id={item.id}
                    className="symform1-inp"
                    onChange={onChangeFcn(state, setStateFcn, formProps, item, groupIdx, itemIdx)}
                    onFocus={onFocusFcn(state, setStateFcn, formProps, item, groupIdx, itemIdx, true)}
                    onBlur={onFocusFcn(state, setStateFcn, formProps, item, groupIdx, itemIdx, false)}
                    {...item.input.props} />}
                {this.renderNotification(state, formProps, item, groupIdx, itemIdx)}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  renderButtons() {
    const {formProps} = this.props;
    return (
      <div className={formProps.buttonStyleClass} >
        {formProps.buttons.map((button, buttonIdx) =>
          <button key={buttonIdx}
            onClick={onClickFcn(this.props.actions, button)}
            {...button.props} >{button.text}</button>
        )}
      </div>
    );
  }

  render() {
    const {state, setStateFcn, formProps} = this.props;
    return (
      <div className={formProps.formSizeClass} >
        <div className={formProps.formBoarderClass} >
          <span className={formProps.formTitleClass} ><h3>{formProps.title}</h3></span>
          <form {...formProps.form}>
            <div className={formProps.formMsgClass} >
              {formProps.formMsg(state)}
            </div>
            <div className={formProps.formAlertClass} >
              {this.renderAlertMsg(state)}
            </div>
            {this.renderGroupItems()}
            {this.renderButtons()}
          </form>
          <div className={formProps.belowFormMsgClass} >
            {formProps.belowFormMsg(state)}
          </div>
        </div>
       </div>
    );
  }
};
const ConnectedFormRenderer = connect(null, mapDispatchToProps)(FormRenderer);

exports.renderForm = (state, setStateFcn, formProps) => (
  <ConnectedFormRenderer state={state} setStateFcn={setStateFcn} formProps={formProps} />
)

function mapDispatchToProps(dispatch) {
  return { actions: bindActionCreators(actionCreators, dispatch) };
}

const successDialogProps = (dialogMsg, onCloseFcn) => {
  const dialogProps = {};
  dialogProps.body = () => <p>{dialogMsg}</p>;
  const okButton = (idx) =>
    <button key={idx} type="button" className="btn btn-primary"
      data-dismiss="modal" >OK</button>
  dialogProps.buttons = [okButton];
  dialogProps.onClose = onCloseFcn;
  return dialogProps;
}

const renderSuccessDialogFcn = (actions, dialogMsg, onCloseFcn) => () => {
  const dialogProps = successDialogProps(dialogMsg, onCloseFcn);
  actions.setModal(dialogProps);

}
exports.renderSuccessDialogFcn = renderSuccessDialogFcn;
