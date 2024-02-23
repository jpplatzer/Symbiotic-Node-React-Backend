// Table Props management class
// Copyright 2018 Jeff Platzer. All rights reserved.

class TableProps {
  _title = null;
  _secondTitle = null;
  _tableClass = "table table-striped";
  _tableStyle = {};
  _colInfo = [];
  _dataToolsEnabled = false;
  _dataToolsKeys = null;
  _deleteDataFcn = null;

  set title(val) {
    this._title = val;
  }

  get title() {
    return this._title;
  }

  set secondTitle(val) {
    this._secondTitle = val;
  }

  get secondTitle() {
    return this._secondTitle;
  }

  set tableClass(val) {
    this._tableClass = val;
  }

  get tableClass() {
    return this._tableClass;
  }

  set colInfo(val) {
    this._colInfo = val;
  }

  get colInfo() {
    return this._colInfo;
  }

  set tableStyle(val) {
    this._tableStyle = val;
  }

  get tableStyle() {
    return this._tableStyle;
  }

  enableDataTools(dataKeys) {
    this._dataToolsEnabled = true;
    this._dataToolsKeys = dataKeys;
  }

  get dataToolsEnabled() {
    return this._dataToolsEnabled;
  }

  get dataToolsKeys() {
    return this._dataToolsKeys;
  }

  setDeleteDataHandler(deleteDataFcn, promptMsg) {
    this._deleteDataFcn = deleteDataFcn;
    this._deletePromptMessage = promptMsg;
  }

  get deleteDataFcn() {
    return this._deleteDataFcn;
  }

  get deletePromptMessage() {
    return this._deletePromptMessage;
  }
};

module.exports = TableProps;