// Alert components
// Copyright 2018 Jeff Platzer. All rights reserved.

import React from 'react';

const AlertClasses = {
  primary: "alert alert-primary",
  secondary: "alert alert-secondary",
  success: "alert alert-success",
  error: "alert alert-danger",
  warning: "alert alert-warning",
  info: "alert info-info",
  light: "alert info-light",
  dark: "alert info-dark",
}
exports.AlertClasses = AlertClasses;

function ErrorAlert(props) {
  return (
    <div className={props.alertClass} role="alert">
      <strong>{props.message}</strong>
    </div>
  );
}

ErrorAlert.defaultProps = {
  alertClass: AlertClasses.error,
  message: 'An error occurred',
};

exports.ErrorAlert = ErrorAlert;
