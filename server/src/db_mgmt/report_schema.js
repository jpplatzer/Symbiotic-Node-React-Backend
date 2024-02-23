// Security report schema module
// Copyright 2017 Jeff Platzer. All rights reserved.

const Schema = require('mongoose').Schema;

exports.reportCollection = "Reports";
exports.lastReportCollection = "LastReports";
exports.securityPackagesCollection = "SecPackages";
exports.releasePackagesCollection = "RelPackages";

exports.DataTypes = {
  kvpType: 1,
  softwarePackageStatusType: 2,
  itemSecurityStatusType: 3
};

exports.StatusTypes = {
  unknown: 0,
  pass: 1,
  notify: 2,
  warn: 3,
  fail: 4
};

exports.KvpSchema = {
  key: {type: String, required: true},
  value: {type: String, required: true}
};

exports.SoftwarePackageStatusSchema = {
  name: {type: String, required: true},
  version: {type: String, required: true},
  availVersion: String,
  secureVersion: String,
  arch: {type: String, required: true},
  status: {type: Number, required: true}
};

exports.ItemSecurityStatusSchema = {
  item: {type: String, required: true},
  remedy: {type: String, required: true},
  status: {type: Number, required: true},
  moreInfo: [String]
};

exports.SectionSchema = {
  label: {type: String, required: true},
  dataType: {type: Number, required: true},
  values: [Schema.Types.Mixed]
};

exports.ReportSchema = {
  time: {type: Date, required: true},
  device: {type: String, required: true},
  subgroup: {type: String, required: true},
  report: [exports.SectionSchema],
  lastUpdated: Date,
};

exports.LatestReleaseSchema = {
  distro: {type: String, required: true},
  release: {type: String, required: true},
  version: {type: String, required: true},
  lastChecked: {type: Date, required: true},
};

exports.SecurityPackagesSchema = {
  active: {type: Boolean, required: true},
  distro: {type: String, required: true},
  release: {type: String, required: true},
  arch: {type: String, required: true},
  packages: Schema.Types.Mixed,
  lastChecked: {type: Date, required: true},
  lastUpdated: {type: Date, required: true},
};

exports.ReleasePackagesSchema = {
  distro: {type: String, required: true},
  release: {type: String, required: true},
  arch: {type: String, required: true},
  packages: Schema.Types.Mixed,
  lastChecked: {type: Date, required: true},
  lastUpdated: {type: Date, required: true},
};