// Modal Dialog action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

const SET_SCROLL_TO = 'scrollToName/SET_SCROLL_TO';

const setScrollToCreator = (name) => ({
  type: SET_SCROLL_TO,
  payload: name,
});
exports.setScrollToCreator = setScrollToCreator;

exports.setScrollTo = (name) => (dispatch) => {
  dispatch(setScrollToCreator(name));
}

exports.reducer = (props = null, action) => {
  return action.type == SET_SCROLL_TO ? ({ name: action.payload }) : props;
};
