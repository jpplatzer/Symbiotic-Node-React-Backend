// Symbiotic device database management module
// Copyright 2017 Jeff Platzer. All rights reserved.

const crypto = require('crypto');
const S = require('./device_schema');
const RS = require('./report_schema');
const Acct = require('./account');
const Cmn = require('../common/CmnFcns');
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const GroupSchema = new Schema(S.GroupSchema);
const GroupModel = mongoose.model(S.groupCollection, GroupSchema);
const LotSchema = new Schema(S.LotSchema);
const LotModel = mongoose.model(S.lotCollection, LotSchema);
const DeviceSchema = new Schema(S.DeviceSchema);
const DeviceModel = mongoose.model(S.deviceCollection, DeviceSchema);
const EventSchema = new Schema(S.EventSchema);
const EventModel  = mongoose.model(S.eventCollection, EventSchema);
const LastDeviceSchema = new Schema(S.LastDeviceSchema);
const LastDeviceModel  = mongoose.model(S.lastDeviceCollection, LastDeviceSchema);
const ProfileSchema = new Schema(S.ProfileSchema);
const ProfileModel  = mongoose.model(S.profileCollection, ProfileSchema);

const ReportSchema = new Schema(RS.ReportSchema);
const ReportModel  = mongoose.model(RS.reportCollection, ReportSchema);
const LastReportModel  = mongoose.model(RS.lastReportCollection, ReportSchema);
const SecurityPackagesSchema = new Schema(RS.SecurityPackagesSchema);
const SecurityPackagesModel  = mongoose.model(RS.securityPackagesCollection, SecurityPackagesSchema);
const ReleasePackagesSchema = new Schema(RS.ReleasePackagesSchema);
const ReleasePackagesModel  = mongoose.model(RS.releasePackagesCollection, ReleasePackagesSchema);

const viewerRole = 'viewer';
exports.viewerRole = viewerRole;
const adminRole = 'admin';
exports.adminRole = adminRole;
const viewerKey = 'viewer_users';
const adminKey = 'admin_users';
const subgroupsKey = 'subgroups';

const packageTypes = {
  security: 0,
  release: 1,
};
exports.packageTypes = packageTypes;

function* containerValueGen(cont) {
  for (const idx in cont) {
    yield cont[idx];
  };
}
exports.containerValueGen = containerValueGen;

function getArrayIdx(doc, arrayKey, arrayValue) {
  const arr = doc[arrayKey];
  return { arr: arr, idx: (arr!== undefined) ? arr.indexOf(arrayValue) : -1 };
}

function delArrayValue(doc, arrayKey, arrayValue) {
  const arrayIdx = getArrayIdx(doc, arrayKey, arrayValue);
  if (arrayIdx.idx >= 0) {
    arrayIdx.arr.splice(arrayIdx.idx, 1);
    return true;
  }
  return false;
}

function addArrayValue(doc, arrayKey, arrayValue) {
  const arrayIdx = getArrayIdx(doc, arrayKey, arrayValue);
  if (arrayIdx.idx < 0) {
    arrayIdx.arr.push(arrayValue);
    return true;
  }
  return false;
}

function modifyDoc(model, queryObj, lookupFailMsg,
  modifyFcn, modifyFailMsg, completeCB) {
  model.findOne(queryObj, (err, doc) => {
    if (err) {
      completeCB(err);
    }
    else if (!doc) {
      completeCB(lookupFailMsg);
    }
    else if (modifyFcn(doc)) {
      // console.log('modifyDoc saving:', doc);
      doc.save(completeCB);
    }
    else {
      completeCB(modifyFailMsg);
    }
  });
}

function updateOrCreateDoc(model, queryObj, updateDoc, completeCB) {
  model.findOneAndUpdate(
      queryObj,
      updateDoc,
      {upsert: true, new: true, runValidators: true},
      completeCB
    );
}

function deleteDoc(model, queryObj, completeCB) {
  model.remove( queryObj, completeCB );
}

function getOneDoc(model, queryObj, completeCB) {
  model.findOne(queryObj, completeCB);
}

function getAllDocs(model, queryObj, completeCB) {
  model.find(queryObj, completeCB);
}

function randomHexValue(numBytes) {
  return crypto.randomBytes(numBytes).toString('hex');
}
exports.randomHexValue = randomHexValue;

function createGroupName() {
  return randomHexValue(12);
}
exports.createGroupName = createGroupName;

function createSubgroupName(group, subgroup) {
  return group + '|' + subgroup;
}
exports.createSubgroupName = createSubgroupName;

function createFullDeviceID(id, subgroupName) {
  return subgroupName + '|' + id;
}
exports.createFullDeviceID = createFullDeviceID;

function createGroup(groupObj, completeCB) {
  GroupModel.create(groupObj, completeCB);
}
exports.createGroup = createGroup;

function deviceIdProps(id) {
  const entities = id.split('|');
  return (entities.length == 3)
    ? { group: entities[0], subgroup: entities[1], device: entities[2] }
    : {}
}
exports.deviceIdProps = deviceIdProps;

function subgroupProps(subgroup) {
  const entities = subgroup.split('|');
  return (entities.length == 2)
    ? { group: entities[0], subgroup: entities[1] }
    : {}
}
exports.subgroupProps = subgroupProps;

function createLot(lotObj, completeCB) {
  LotModel.create(lotObj, completeCB);
}
exports.createLot = createLot;

function addGroup(name, completeCB) {
  const group = completeCB ? name : createGroupName();
  completeCB = completeCB ? completeCB : name;
  const newDoc = S.createDefaultGroup(group);
  updateOrCreateDoc(GroupModel, { name: group }, newDoc, completeCB);
}
exports.addGroup = addGroup;

function delGroup(name, completeCB) {
  deleteDoc(GroupModel, {name: name}, completeCB);
}
exports.delGroup = delGroup;

function delGroupDoc(name) {
  return GroupModel.remove({ name }).exec();
}
exports.delGroupDoc = delGroupDoc;

function delAllGroupData(group) {
  return delGroupsDeviceData(group)
    .then(() => LotModel.remove({ group }))
    .then(() => LastDeviceModel.remove({ group }))
    .then(() => GroupModel.remove({ name: group }))
}
exports.delAllGroupData = delAllGroupData;

function delGroupsDeviceData(group) {
  const subgroupReducer = (promise, subgroupId) => {
    const subgroup = createSubgroupName(group, subgroupId);
    console.log('subgroupReducer for:', subgroup);
    return promise
      .then(() => delDeviceAccounts(subgroup))
      .then(() => delAllDevicesDataExceptAcct({ subgroup }))
  };
  return GroupModel.findOne({ name: group })
    .then((groupDoc) => !groupDoc ? Promise.resolve()
      : groupDoc.subgroups.reduce(subgroupReducer, Promise.resolve()));
}

function delDeviceAccounts(subgroup) {
  const deviceReducer = (promise, deviceDoc) => {
    const fullId = createFullDeviceID(deviceDoc.device, subgroup);
    console.log('deviceReducer for:', fullId);
    return promise
      .then(() => Acct.Account.remove( {username: fullId} ));
  };
  return DeviceModel.find({ subgroup })
    .then((devices) => devices.reduce(deviceReducer, Promise.resolve()));
}
exports.delDeviceAccounts = delDeviceAccounts;

function getGroup(group, completeCB) {
  const query = { name: group };
  return completeCB ? getOneDoc(GroupModel, query, completeCB)
    : GroupModel.findOne(query).exec();
}
exports.getGroup = getGroup;

function getGroups(completeCB) {
  getAllDocs(GroupModel, {}, completeCB);
}
exports.getGroups = getGroups;

function roleFieldName(role) {
  return role == viewerRole ? viewerKey : adminKey;
}

function addGroupUserDoc(doc, role, id) {
  const roleField = roleFieldName(role);
  const added = addArrayValue(doc, roleField, id);
  if (added) {
    const otherRoleField = role == viewerRole ? adminKey : viewerKey;
    delArrayValue(doc, otherRoleField, id);
  }
  return added;
}

function addGroupUser(group, role, id, completeCB) {
  const modifyFcn = (doc) => addGroupUserDoc(doc, role, id);
  const lookupFailMsg = "Specified group not found";
  const modifyFailMsg = "User with specified role already exists";
  modifyDoc(GroupModel, {name: group}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.addGroupUser = addGroupUser;

function delGroupUser(group, id, completeCB) {
  const modifyFcn = (doc) => delArrayValue(doc, viewerKey, id) ||
    delArrayValue(doc, adminKey, id);
  const lookupFailMsg = "Specified group not found";
  const modifyFailMsg = "User does not exist";
  modifyDoc(GroupModel, {name: group}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.delGroupUser = delGroupUser;

// https://docs.mongodb.com/manual/tutorial/query-documents/ - look for OR conditions
// model.find( { $or: [ { viewer_user: "jeff" }, { admin_user: "jeff" } ] } )
function assignUserGroups(err, docs, id, completeCB) {
  if (err) {
    completeCB(err);
  }
  else {
    let userGroups = {};
    userGroups[viewerRole] = [];
    userGroups[adminRole] = [];
    if (docs) {
      const addGroup = (acc, val, valKey, respKey) => {
        if (val[valKey] !== undefined && val[valKey].includes(id)) {
          acc[respKey].push(val.name);
        }
      }
      const reducer = (acc, val) => {
        addGroup(acc, val, viewerKey, viewerRole);
        addGroup(acc, val, adminKey, adminRole);
        return acc;
      }
      userGroups = docs.reduce(reducer, userGroups);
    }
    completeCB(err, userGroups);
  }
}

function getUserGroups(id, completeCB) {
  const viewerQuery = {};
  viewerQuery[viewerKey] = id;
  const adminQuery = {};
  adminQuery[adminKey] = id;
  const query = { $or: [ viewerQuery, adminQuery ] };
  getAllDocs(GroupModel, query,
    (err, docs) => assignUserGroups(err, docs, id, completeCB));
}
exports.getUserGroups = getUserGroups;

function addSubgroup(group, subgroup, completeCB) {
  const modifyFcn = (doc) => addArrayValue(doc, subgroupsKey, subgroup);
  const lookupFailMsg = "Specified group not found";
  const modifyFailMsg = "Subgroup already exists";
  modifyDoc(GroupModel, {name: group}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.addSubgroup = addSubgroup;

function delSubgroup(group, subgroup, completeCB) {
  const modifyFcn = (doc) => delArrayValue(doc, subgroupsKey, subgroup);
  const lookupFailMsg = "Specified group not found";
  const modifyFailMsg = "Subgroup does not exist";
  modifyDoc(GroupModel, {name: group}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.delSubgroup = delSubgroup;

function addLot(group, lot, completeCB) {
  const query = { name: lot, group };
  const lotDoc = Object.assign({}, query);
  lotDoc.securityCode = randomHexValue(18);
  updateOrCreateDoc(LotModel, query, lotDoc, completeCB);
}
exports.addLot = addLot;

function setLotPolicyProp(group, lot, key, value, completeCB) {
  const queryObj = { name: lot, group };
  const lookupFailMsg = 'Lot not found';
  const modifyFailMsg = 'Error modifying lot';
  const modifyFcn = (lotDoc) => {
    lotDoc.policies = lotDoc.policies ? lotDoc.policies : {};
    lotDoc.policies[key] = value;
    return lotDoc;
  }
  modifyDoc(LotModel, queryObj, lookupFailMsg,
    modifyFcn, modifyFailMsg, completeCB);
}
exports.setLotPolicyProp = setLotPolicyProp;

function delLot(group, lot, completeCB) {
  deleteDoc(LotModel, { name: lot, group }, completeCB);
}
exports.delLot = delLot;

function getLots(group, lot, completeCB) {
  const query = completeCB ? { name: lot, group }
    : lot ? { group }
    : {}
  completeCB = completeCB ? completeCB
    : lot ? lot
    : group;
  getAllDocs(LotModel, query, completeCB);
}
exports.getLots = getLots;

function getLotDocs(query) {
  return LotModel.find(query).exec();
}
exports.getLotDocs = getLotDocs;

function addDevice(device, subgroup, lot, securityCode, sn, model, completeCB) {
  const newDoc = {
    device: device,
    subgroup: subgroup,
    lot: lot,
    securityCode: securityCode,
  };
  if (completeCB) {
    newDoc.sn = sn;
    newDoc.model = model;
  }
  else if (model) {
    newDoc.sn = sn;
    completeCB = model;
  }
  else {
    completeCB = sn;
  }
  const query = { device: device, subgroup: subgroup };
  updateOrCreateDoc(DeviceModel, query, newDoc, completeCB);
}
exports.addDevice = addDevice;

function delDevice(device, subgroup, completeCB) {
  const query = { device: device, subgroup: subgroup };
  deleteDoc(DeviceModel, query, completeCB);
}
exports.delDevice = delDevice;

function getDevice(device, subgroup, completeCB) {
  const query = { device, subgroup };
  getOneDoc(DeviceModel, query, completeCB);
}
exports.getDevice = getDevice;

function getDevices(deviceProps, countOnly, completeCB) {
  if (countOnly) {
    DeviceModel.count(deviceProps, completeCB);
  }
  else {
    getAllDocs(DeviceModel, deviceProps, completeCB);
  }
}
exports.getDevices = getDevices;

function getDevicesForGroup(group, deviceProps, options, completeCB) {
  const countDevices = options.countOnly || options.countBySubgroup;

  function getGroupCB(err, groupDoc) {
    if (err) {
      completeCB(err);
    }
    else if (!groupDoc) {
      completeCB('Group not found');
    }
    else {
      const subgroups = groupDoc.subgroups ? groupDoc.subgroups.slice(0) : [];
      const subgroupIter = containerValueGen(subgroups);
      getNextSubgroupsDevices(subgroupIter, []);
    }
  }

  function getNextSubgroupsDevices(subgroupIter, devices) {
    const result = subgroupIter.next();
    if (!result.done) {
      const subgroup = createSubgroupName(group, result.value);
      deviceProps.subgroup = subgroup;
      getDevices(deviceProps, countDevices,
        (err, doc) => dbCompleteCB(subgroupIter, subgroup, devices, err, doc));
    }
    else {
      completeCB(null, devices);
    }
  }

  function dbCompleteCB(subgroupIter, subgroup, devices, err, doc) {
    if (err) {
      completeCB(err);
    }
    else {
      if (doc || doc == 0) {
        if (options.countOnly) {
          devices = isNaN(devices) ? Number(doc) : Number(devices) + doc;
        }
        else if (options.countBySubgroup) {
          devices.push({
            subgroup: subgroup,
            count: Number(doc),
          });
        }
        else {
          devices = devices.concat(doc);
        }
      }
      getNextSubgroupsDevices(subgroupIter, devices);
    }
  }

  getGroup(group, getGroupCB);
}
exports.getDevicesForGroup = getDevicesForGroup;

function delAllDeviceData(deviceObj) {
  const deviceId = createFullDeviceID(deviceObj.device, deviceObj.subgroup);
  return Acct.Account.remove({ username: deviceId })
    .then(() => delAllDevicesDataExceptAcct(deviceObj))
}
exports.delAllDeviceData = delAllDeviceData;

function delAllDevicesDataExceptAcct(devicesQueryObj) {
  return DeviceModel.remove(devicesQueryObj)
    .then(() => EventModel.remove(devicesQueryObj))
    .then(() => ReportModel.remove(devicesQueryObj))
}

function addLastDevice(group, completeCB) {
  const lastDeviceDoc = { group };
  updateOrCreateDoc(LastDeviceModel, lastDeviceDoc, lastDeviceDoc, completeCB);
}
exports.addLastDevice = addLastDevice;

function incLastDeviceNum(group, completeCB) {
  LastDeviceModel.findOneAndUpdate( { group },
    { $inc: { num: 1 } }, { new: true }, completeCB );
}
exports.incLastDeviceNum = incLastDeviceNum;

function delLastDevice(group, completeCB) {
  deleteDoc(LastDeviceModel, { group }, completeCB);
}
exports.delLastDevice = delLastDevice;

function getLastDevice(group, completeCB) {
  const query = completeCB ? { group } : {};
  completeCB = completeCB ? completeCB : group;
  getAllDocs(LastDeviceModel, query, completeCB);
}
exports.getLastDevice = getLastDevice;

function addEventsReducer(notUsed, event) {
  if (event.aggr === true) {
    const query = {
      device: event.device,
      subgroup: event.subgroup,
      type: event.type,
      severity: event.severity,
      aggr: true,
      matched: event.matched,
    };
    const count = event.count;
    event["$inc"] = { count };
    delete event.count;
    return EventModel.findOneAndUpdate(query, event, { upsert: true }).exec();
  }
  else {
    return EventModel.create(event).exec();
  }
}

function addEvents(events) {
  return Cmn.arrayAsyncReduce(events, addEventsReducer, null);
}
exports.addEvents = addEvents;

function delEvents(device, subgroup) {
  const query = { device, subgroup };
  return EventModel.remove(query).exec();
}
exports.delEvents = delEvents;

function getEvents(device, subgroup) {
  const query = { device, subgroup };
  return EventModel.find(query).exec();
}
exports.getEvents = getEvents;

function addProfile(id, firstName, lastName, startGroup, org, completeCB) {
  const newDoc = {
       id: id,
       firstName: firstName,
       lastName: lastName,
       active: true,
     };
  if (completeCB) {
    newDoc.startGroup = startGroup;
    newDoc.org = org;
  }
  else if (org) {
    newDoc.startGroup = startGroup;
    completeCB = org;
  }
  else {
    completeCB = startGroup;
  }
  updateOrCreateDoc(ProfileModel, { id: id }, newDoc, completeCB);
}
exports.addProfile = addProfile;

function addProfileDoc(doc) {
  return ProfileModel.findOneAndUpdate(
    { id: doc.id },
    doc,
    {upsert: true, new: true, runValidators: true},
  ).exec();
}
exports.addProfileDoc = addProfileDoc;

function delProfile(id, completeCB) {
  deleteDoc(ProfileModel, { id: id }, completeCB);
}
exports.delProfile = delProfile;

function getProfiles(id, completeCB) {
  const query = {};
  if (completeCB) {
    query.id = id;
  }
  else {
    completeCB = id;
  }
  getAllDocs(ProfileModel, query, completeCB);
}
exports.getProfiles = getProfiles;

function getProfileDoc(id) {
  const query = { id };
  return ProfileModel.findOne(query).exec();
}
exports.getProfileDoc = getProfileDoc;

function getProfilesDocs(id) {
  const query = id ? { id } : {};
  return ProfileModel.find(query).exec();
}
exports.getProfilesDocs = getProfilesDocs;

function updateProfileDoc(id, firstName, lastName, org) {
  const query = { id };
  const updateDoc = {id, firstName, lastName, org};
  const options = {new: true};
  return ProfileModel.findOneAndUpdate(query, updateDoc, options).exec();
}
exports.updateProfileDoc = updateProfileDoc;

function setProfileDoc(id, doc) {
  const query = { id };
  const options = {new: true};
  return ProfileModel.findOneAndUpdate(query, doc, options).exec();
}
exports.setProfileDoc = setProfileDoc;

function deactivateProfile(id, reasonObj) {
  return getProfileDoc(id)
    .then((profileDoc) => {
      if (profileDoc) {
        profileDoc.active = false;
        profileDoc.agreementsCurrent = false;
        profileDoc.passwordCurrent = false;
        if (reasonObj) {
          profileDoc.policies = profileDoc.policies ? profileDoc.policies : {};
          profileDoc.policies.inactive = reasonObj;
        }
        return setProfileDoc(id, profileDoc);
      }
      else {
        return Promise.resolve();
      }
    });
}
exports.deactivateProfile = deactivateProfile;

function addReportDoc(doc, completeCB) {
  const addLastReportCallback = function(err) {
    const lastReportQueryDoc = {
     device: doc.device,
     subgroup: doc.subgroup,
    };
    return err ? completeCB(err)
      : updateOrCreateDoc(LastReportModel, lastReportQueryDoc, doc, completeCB);
  }
  ReportModel.create(doc, addLastReportCallback);
}
exports.addReportDoc = addReportDoc;

function updateReportDoc(doc, completeCB) {
  return ReportModel.findByIdAndUpdate(doc._id, doc, { new: true });
}
exports.updateReportDoc = updateReportDoc;

function delReportDoc(device, subgroup, reportTime, completeCB) {
  const query = {
    time: reportTime,
    device,
    subgroup
  };
  deleteDoc(ReportModel, query, completeCB);
}
exports.delReportDoc = delReportDoc;

function getReportDoc(device, subgroup, reportTime, completeCB) {
  const query = {
    time: reportTime,
    device,
    subgroup
  };
  ReportModel.findOne(query, completeCB);
}
exports.getReportDoc = getReportDoc;

function getReportTimes(subgroup, device) {
  const query = device ? { device, subgroup }
    : subgroup ? { subgroup }
    : {};
  return ReportModel.find(query, 'time device subgroup').exec();
}
exports.getReportTimes = getReportTimes;

// https://stackoverflow.com/questions/15117030/how-to-filter-array-in-subdocument-with-mongodb
// https://docs.mongodb.com/master/reference/operator/aggregation/filter/#exp._S_filter
// https://stackoverflow.com/questions/27712022/how-to-use-aggregate-in-mongoose
function getReportKvpSections() {
  return ReportModel.aggregate([
    {
      $project: {
        report: {
          $filter: {
            input: "$report",
            as: "section",
            cond: { $eq: ["$$section.dataType", RS.DataTypes.kvpType] }
          }
        }
      }
    }
  ]);
}
exports.getReportKvpSections = getReportKvpSections;

/***
***/


function modelForPackageType(packageType) {
  return packageType == packageTypes.security ? SecurityPackagesModel : ReleasePackagesModel;
}

function setPackagesInfo(packageType, packagesInfoDoc, completeCB) {
  const queryDoc = {
   distro: packagesInfoDoc.distro,
   release: packagesInfoDoc.release,
   arch: packagesInfoDoc.arch,
  };
  updateOrCreateDoc(modelForPackageType(packageType), queryDoc, packagesInfoDoc, completeCB);
}
exports.setPackagesInfo = setPackagesInfo;

function getPackagesInfo(packageType, distro, release, arch, completeCB) {
  const queryDoc = {
   distro,
   release,
   arch,
  };
  getOneDoc(modelForPackageType(packageType), queryDoc, completeCB);
}
exports.getPackagesInfo = getPackagesInfo;

function getSecurityPackagesInfoDocs() {
  return SecurityPackagesModel.find({ active: true }, 'distro release arch lastChecked lastUpdated').exec();
}
exports.getSecurityPackagesInfoDocs = getSecurityPackagesInfoDocs;

function getReleasePackagesInfoDocs() {
  return ReleasePackagesModel.find({}, 'distro release arch lastChecked lastUpdated').exec();
}
exports.getReleasePackagesInfoDocs = getReleasePackagesInfoDocs;

function delPackagesInfo(packageType, distro, release, arch, completeCB) {
  const queryDoc = {
   distro,
   release,
   arch,
  };
  deleteDoc(modelForPackageType(packageType), queryDoc, completeCB);
}
exports.delPackagesInfo = delPackagesInfo;

function addAgreementAcceptance(userId, agreementObj, completeCB) {
  if (!completeCB) {
    completeCB = isCurrent;
    isCurrent = null;
  }
  const nameMatches = (name) => (obj) => obj.name == name;
  const modifyFcn = (doc) => {
    const idx = doc.agreementsAccepted.findIndex(nameMatches(agreementObj.name));
    if (idx < 0 || agreementObj.version != doc.agreementsAccepted[idx].version) {
      doc.agreementsAccepted.push(agreementObj);
      doc.markModified('agreementsAccepted');
    }
    doc.agreementsCurrent = agreementsAreCurrent(doc);
    return true;
  }
  const lookupFailMsg = "User profile not found";
  const modifyFailMsg = "Failure adding user agreement";
  modifyDoc(ProfileModel, {id: userId}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.addAgreementAcceptance = addAgreementAcceptance;

function agreementsAreCurrent(profileDoc) {
  const agreementMatches = (required) => (accepted) =>
    required.name == accepted.name && required.version == accepted.version;
  const agreementsReducer = (current, agreement) =>
    current && profileDoc.agreementsAccepted.findIndex(agreementMatches(agreement)) >= 0;
  return !profileDoc.policies || !profileDoc.policies.requiredAgreements ||
    profileDoc.policies.requiredAgreements.reduce(agreementsReducer, true);
}

function resetAgreementAcceptance(userId, completeCB) {
  const nameMatches = (name) => (obj) => obj.name == name;
  const modifyFcn = (doc) => {
    if (!doc.policies) {
      doc.policies = {};
    }
    doc.agreementsAccepted = [];
    doc.markModified('agreementsAccepted');
    doc.agreementsCurrent = false;
    doc.passwordCurrent = false;
    return true;
  }
  const lookupFailMsg = "User profile not found";
  const modifyFailMsg = "Failure resetting user agreement";
  modifyDoc(ProfileModel, {id: userId}, lookupFailMsg, modifyFcn, modifyFailMsg, completeCB);
}
exports.resetAgreementAcceptance = resetAgreementAcceptance;

const delAuditData = function(auditObj) {
  return ReportModel.remove(auditObj);
}
exports.delAuditData = delAuditData;
