// Device schema module
// Copyright 2017 Jeff Platzer. All rights reserved.

const Schema = require('mongoose').Schema;
const Maybe = require('../common/Maybe').Maybe;

exports.groupCollection = "Groups";
exports.lotCollection = "Lots";
exports.deploymentCollection = "Deployments";
exports.eventCollection = "Events";
exports.deviceCollection = "Devices";
exports.lastDeviceCollection = "LastDevices";
exports.profileCollection = "Profiles";

exports.GroupSchema = {
  name: {type: String, required: true},
  subgroups: [String],
  admin_users: [String],
  viewer_users: [String],
  policies: Schema.Types.Mixed
};

exports.LotSchema = {
  name: {type: String, required: true},
  group: {type: String, required: true},
  nonce: String,                          // Deprecated
  securityCode: String,                   // Replaces nonce
  policies: Schema.Types.Mixed
};

exports.DeploymentSchema = {
  name: {type: String, required: true},
  group: {type: String, required: true},
  policies: Schema.Types.Mixed
};

exports.IncidentSchema = {  // Obsoleted, replaced by events
  device: {type: String, required: true},
  subgroup: {type: String, required: true},
  type: {type: String, required: true},
  id: {type: String, required: true},
  sev: {type: Number, required: true},
  count: {type: Number, required: true},
  time: {type: Date, required: true},
  details: String,
  values: [String]
};

exports.EventSchema = {
  device: {type: String, required: true},
  subgroup: {type: String, required: true},
  source: {type: String, required: true},
  type: {type: String, required: true},
  severity: {type: Number, required: true},
  aggr: {type: Boolean, required: true, default: true},
  matched: Schema.Types.Mixed,
  unmatched: Schema.Types.Mixed,
  last: {type: Number, required: true},
  count: {type: Number, required: true, default: 0},
  desc: String
};

exports.DeviceSchema = {
  device: {type: String, required: true},
  subgroup: {type: String, required: true},
  deployment: Schema.Types.ObjectId,
  lot: {type: String, required: true},
  sn: String,
  model: String,
  nonce: String,              // Deprecated
  securityCode: String,       // Replaces nonce
  lastUpdateTime: Date
};

exports.LastDeviceSchema = {
  group: {type: String, required: true},
  num: {type: Number, required: true, default: 0},
};

AgreementsSchema = {
  name: {type: String, required: true},
  version: {type: Number, required: true},
  accepted: {type: Date, required: true},
}
exports.AgreementsSchema = AgreementsSchema;

exports.ProfileSchema = {
  id: {type: String, required: true},
  firstName: {type: String, required: true},
  lastName: {type: String, required: true},
  org: String,
  startGroup: String,
  active: {type: Boolean, required: true, default: true},
  agreementsAccepted: [AgreementsSchema],
  agreementsCurrent: {type: Boolean, default: false},
  passwordCurrent: {type: Boolean, default: false},
  policies: Schema.Types.Mixed,
};

exports.createDefaultGroup = function (name) {
  return ({
    name: name,
    subgroups: ["1"],
    admin_users: [],
    viewer_users: [],
    policies: {},
  });
};

exports.getDeviceSubGroup = function(id) {
  const entities = id.split('|');
  return (entities.length == 3)
    ? Maybe.of({
        device: device = entities[2],
        subgroup: id.substr(0, id.length - device.length - 1)
      })
    : Maybe.nothing();
};


/***
***/
