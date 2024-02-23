// Render modal dialogs
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import ReactDOM from 'react-dom';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../modules';

/***
  props may contain:
    * dialogClass - optional dialog class qualifier, e.g. modal-lg
    * title - title rendering function
    * body - dialog content rending function
    * buttons - an array of button rendering functions
    * onClose - function called when the dialog closes
***/
class ModalDialog extends React.Component {
  resetProps = () => {
    if (this.props.modal && this.props.modal.onClose) {
      this.props.modal.onClose();
    }
    this.props.actions.setModal();
  }

  componentDidUpdate(prevProps) {
    // console.log('ModalDialog componentDidUpdate props:', prevProps, this.props);
    if (!prevProps.modal && this.props.modal && !this.props.modal.dismissed) {
      $(ReactDOM.findDOMNode(this)).modal('show');
      $(ReactDOM.findDOMNode(this)).on('hidden.bs.modal', this.resetProps);
    }
    else if (this.props.modal && this.props.modal.dismissed) {
      $(ReactDOM.findDOMNode(this)).modal('hide');
    }
  }

  render() {
    // console.log('Render modal dialog props:', this.props.modal);
    return (this.props.modal ?
      <div className="modal" tabIndex="-1" role="dialog">
        <div className={this.props.modal.dialogClass
          ? "modal-dialog " + this.props.modal.dialogClass
          : "modal-dialog"} role="document">
          <div className="modal-content">
            { this.props.modal.title ?
              <div className="modal-header">
                {this.props.modal.title()}
              </div>
              : null
            }
            { this.props.modal.body ?
              <div className="modal-body">
                {this.props.modal.body()}
              </div>
              : null
            }
            { this.props.modal.buttons ?
              <div className="modal-footer">
                <div className="text-center">
                  {this.props.modal.buttons.map((buttonRenderer, idx) => buttonRenderer(idx))}
                </div>
              </div>
              : null
            }
          </div>
        </div>
      </div>
      : null
    );
  }
};

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { modal } = state;
  return { modal };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(ModalDialog);
