// Common validation and qualification functions
// Copyright 2018 Jeff Platzer. All rights reserved.

exports.msPerMin = 60 * 1000;
exports.msPerDay = 24 * 60 * 60 * 1000;

function expireTimeText(expireMins) {
  const minsInDay = 24 * 60;
  const timeStr = expireMins < 60 ? "" + Math.trunc(expireMins) + " minutes"
    : expireMins < minsInDay ? "" + Math.trunc(expireMins / 60) + " hours"
    : "" + Math.trunc(expireMins / minsInDay) + " days";
  return timeStr;
}
exports.expireTimeText = expireTimeText;

const validEmailRegex = /^[a-z0-9!#&*+?_|~.-]+@[a-z0-9-]+(\.[a-z0-9-]+)*$/;
exports.validEmailRegex = validEmailRegex;

const emailValid = (email) => {
  return email.match !== undefined && email.match(validEmailRegex) !== null;
}
exports.emailValid = emailValid;

const emailResetPrompt = `Enter the email address you use to login.
  A link to reset your password will be sent to this address.`
exports.emailResetPrompt = emailResetPrompt;

const pwChkRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d\@!#&*+?_-]{8,60}$/;
exports.pwChkRegex = pwChkRegex;

const pwValid = (pw) => {
  return pw.match && pw.match(pwChkRegex) !== null;
}
exports.pwValid = pwValid;

const pwValidPrompt = 'Your new password must have at least 8 alphanumeric characters plus !#&*?_+- with at least one uppercase, one lowercase and one number';
exports.pwValidPrompt = pwValidPrompt;

