// Modal Dialog action creator and reducer
// Copyright 2018 Jeff Platzer. All rights reserved.

const SET_MODAL = 'modal/SET_MODAL';

const setModalActionCreator = (modalProps) => ({
  type: SET_MODAL,
  payload: modalProps,
});
exports.setModalActionCreator = setModalActionCreator;

exports.setModal = (modalProps = null) => (dispatch) => {
  if (modalProps) {
    modalProps.dismissed = false;
  }
  dispatch(setModalActionCreator(modalProps));
}

exports.dismissModal = () => (dispatch, getState) => {
  const modalProps = getState().modal;
  if (modalProps) {
    modalProps.dismissed = true;
    modalProps.onClose = null;
  }
  dispatch(setModalActionCreator(modalProps));
}

exports.reducer = (props = null, action) => {
  return action.type == SET_MODAL ? (action.payload ? {...action.payload} : null)
    : props;
};

