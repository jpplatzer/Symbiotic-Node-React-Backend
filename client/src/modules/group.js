// Get Group Data
// Copyright 2018 Jeff Platzer. All rights reserved.

const DLC = require('../dataLifecycle');

const GET_GROUP_CONTENT = 'group/GET_GROUP';
const groupSubUrl = '/api/group';

const getGroupActionCreator = (data) => ({
  type: GET_GROUP_CONTENT,
  payload: { data, timeMs: Date.now() }
});
exports.getGroupActionCreator = getGroupActionCreator;

const groupTimeoutMs = 3600 * 1000;

function getGroupRqstUrlFcn(group) {
  return groupSubUrl + '/' + group;
}
exports.getGroupRqstUrlFcn = getGroupRqstUrlFcn;

exports.getGroup = (group, resultsObj) => (dispatch) => {
  return DLC.getRqst(getGroupRqstUrlFcn(group))
    .then((doc) => {
      dispatch(getGroupActionCreator(doc.data));
      return Promise.resolve(DLC.resultsValue("group", doc.data, resultsObj));
    })
}

exports.reducer = (state = {}, action) => {
  return action.type == GET_GROUP_CONTENT ? action.payload : state;
};

