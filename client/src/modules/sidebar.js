// Sidebar action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

const SET_SIDEBAR = 'sidebar/SET_SIDEBAR';

const setSidebarActionCreator = (sidebarProps) => ({
  type: SET_SIDEBAR,
  payload: sidebarProps,
});
exports.setSidebarActionCreator = setSidebarActionCreator;

exports.setSidebarProps = (sidebarProps) => (dispatch) => {
  // console.log('setSidebarProps', sidebarProps);
  dispatch(setSidebarActionCreator(sidebarProps));
}

exports.reducer = (props = null, action) => {
  return action.type == SET_SIDEBAR ? (action.payload ? {...action.payload} : null)
    : props;
};

