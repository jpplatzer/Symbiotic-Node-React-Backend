// Validate device requests
// Copyright 2017 Jeff Platzer. All rights reserved.

const Joi = require('@hapi/joi');

const partialIdRegex = /^[^\$\[\]\{\}\|]+$/;
const keyRegex = /^[^\$\[\]\{\}]+$/;

const partialIdField = Joi.string().regex(partialIdRegex).min(1).max(60);
exports.partialIdField = partialIdField;
const idField = Joi.string().regex(keyRegex).min(4).max(120);
exports.idField = idField;
const keyField = Joi.string().regex(keyRegex).min(1).max(60);
exports.keyField = keyField;
const validField = Joi.string().min(1).max(120);
exports.validField = validField;
const largeHexNum = Joi.string().hex().min(1).max(80);
exports.largeHexNum = largeHexNum;
const pwField = Joi.string().regex(keyRegex).min(8).max(60);
exports.pwField = pwField;
const dateField = Joi.string().isoDate();
exports.dateField = dateField;

const isDataValid = function(data, joiSchema) {
  const result = Joi.validate(data, joiSchema);
  return !result.error;
}
exports.isDataValid = isDataValid;

const eventSchema = Joi.object({
  source: Joi.string().alphanum().required(),
  type: Joi.string().alphanum().required(),
  severity: Joi.number().integer().min(0).max(5).required(),
  aggr: Joi.boolean().required(),
  matched: Joi.object().max(50),
  unmatched: Joi.object().max(50),
  last: Joi.number().integer().min(0).required(),
  count: Joi.number().integer().min(1).required(),
  desc: validField,
});
exports.eventSchema = eventSchema;

const updateSchema = Joi.object({
  id: idField.required(),
  authCode: largeHexNum.required(),
  securityCode: largeHexNum.required(),
  time: Joi.number().integer().min(0).required(),
  events: Joi.array().items(eventSchema).allow(null)
});
exports.updateSchema = updateSchema;

const registerSchema = Joi.object({
  group: keyField.required(),
  lot: keyField.required(),
  nonce: largeHexNum,           // Deprecated
  securityCode: largeHexNum,    // Replaces nonce
});
exports.registerSchema = registerSchema;

const loginSchema = Joi.object({
  lot: keyField,
  id: idField.required(),
  authCode: largeHexNum.required(),
  nonce: largeHexNum,           // Deprecated
  securityCode: largeHexNum,    // Replaces nonce
});
exports.loginSchema = loginSchema;

const ChgPasswordSchema = Joi.object({
  curPw: pwField.required(),
  newPw: pwField.required(),
});
exports.ChgPasswordSchema = ChgPasswordSchema;

const ResetPasswordSchema = Joi.object({
  id: idField.required(),
});
exports.ResetPasswordSchema = ResetPasswordSchema;

const SetPasswordSchema = Joi.object({
  id: idField.required(),
  tempCode: largeHexNum.required(),
  newPw: pwField.required(),
  newPw2: pwField.required(),
});
exports.SetPasswordSchema = SetPasswordSchema;

const deviceObj = Joi.object({
  device: Joi.string().hex().min(1).required(),
  subgroup: idField.required(),
});

const DeleteDevicesSchema = Joi.object({
  devices: Joi.array().items(deviceObj).required(),
});
exports.DeleteDevicesSchema = DeleteDevicesSchema;

const auditObj = Joi.object({
  time: dateField.required(),
  device: largeHexNum.required(),
  subgroup: idField.required(),
});

const DeleteAuditsSchema = Joi.object({
  audits: Joi.array().items(auditObj).required(),
});
exports.DeleteAuditsSchema = DeleteAuditsSchema;

const SetProfileSchema = Joi.object({
  firstName: keyField.required(),
  lastName: keyField.required(),
  org: keyField.required(),
});
exports.SetProfileSchema = SetProfileSchema;

const CancelSchema = Joi.object({
  reason: keyField,
  details: Joi.string(),
});
