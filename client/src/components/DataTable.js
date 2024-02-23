// Render Data Table
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../modules';
import '../../../app_server/public/css/App.css';
import Cmn from '../../../common/CmnFcns';

const dataColor = '#404040';
// const redColor = '#F01010';
const redColor = '#C71C0D';
exports.redColor = redColor;
const greenColor = '#2EB82E';
exports.greenColor = greenColor;
const yellowColor = '#E2CF06';
exports.yellowColor = yellowColor;
const grayColor = '#8F8F8A';
exports.grayColor = grayColor;
const summaryDataObjKey = "_summary";
exports.summaryDataObjKey = summaryDataObjKey;

const defaultDataStyle = {
  color: dataColor
};

const propertyValueOrUndefined = function(key, undefValue) {
  return (renderObj, data) => {
    renderObj.value = data[key] ? data[key] : undefValue;
    return renderObj;
  };
}
exports.propertyValueOrUndefined = propertyValueOrUndefined;

exports.propertyValue = function(key) {
  return propertyValueOrUndefined(key, '');
}

const setStyleProp = function(renderObj, key, value) {
  if (!renderObj.style) {
    renderObj.style = {};
  }
  renderObj.style[key] = value;
}
exports.setStyleProp = setStyleProp;

exports.redIfNot = function(value) {
  return (renderObj) => {
    if (renderObj.value != value) {
      setStyleProp(renderObj, 'color', redColor);
    }
    return renderObj;
  };
}

exports.statusClass = function(statusKey) {
  return (data) => {
    const status = data[statusKey];
    return status <= 0 | status > 4 ? 'active'
      : status == 1 ? 'success'
      : status == 2 ? 'info'
      : status == 3 ? 'warning'
      : 'danger';
  }
}

function catergorizeValues(values, categoriesSettings, categoryReducer) {
  const catergoryValuesReducer = (categoryValues, categorySettings) => (results, rowObj, idx) => {
    if (idx == 0) {
      results.push(createSummaryObj(categorySettings, categoryValues));
    }
    if (categorySettings.expanded) {
      results.push(rowObj);
    }
    return results;
  }
  const categorizedValuesObj = values.reduce(categoryReducer, {});
  return categoriesSettings.reduce((results, categorySettings) => {
    const categoryValues = categorizedValuesObj[categorySettings.name];
    return !categoryValues ? results
      : categoryValues.reduce(catergoryValuesReducer(categoryValues, categorySettings), results);
  }, []);
}
exports.catergorizeValues = catergorizeValues;

function createCatergorySettings(name, expanded, summarySettings) {
  return ({
    name,
    expanded,
    summarySettings,
  });
}
exports.createCatergorySettings = createCatergorySettings;

function createSummarySettings(toggleExpansionCallback, categoryCol, sizeCol) {
  return ({
    toggleExpansionCallback,
    categoryCol,
    sizeCol,
  });
}
exports.createSummarySettings = createSummarySettings;

function createSummaryObj(categorySettings, categoryValues) {
  return ({
    [summaryDataObjKey]: {
      category: categorySettings.name,
      expanded: categorySettings.expanded,
      settings: categorySettings.summarySettings,
      size: categoryValues.length,
    }
  });
}

function renderObject(obj) {
  if (obj.url) {
    return (
      <div className="sym-link" >
        {obj.style
          ? <Link to={obj.url} activeClassName="active">
              {obj.value}
            </Link>
          : <Link to={obj.url} activeClassName="active">
              <span style={obj.style}>{obj.value}</span>
            </Link>}
      </div>
    );
  }
  else {
    return ( obj.style
      ? <span style={obj.style}>{obj.value}</span>
      : obj.value
    );
  }
}

exports.renderer = function(f) {
  const renderer = {};
  renderer.exec = (renderObj, data) => f(renderObj, data);
  renderer.next = (f) => {
    const prev = renderer.exec;
    renderer.exec = (renderObj, data) => f(prev(renderObj, data));
    return renderer;
  }
  renderer.render = (data) => {
    const renderObj = renderer.exec({}, data);
    return renderObject(renderObj);
  }
  return renderer;
}

exports.customRenderer = function(f) {
  return {
    render: (data) => f(data)
  }
}

class ColHeaders extends Component {
  render() {
    const tableProps = this.props.tableProps;
    const baseIdx = tableProps.deleteDataFcn ? 1 : 0;
    return ( tableProps.colInfo.length > 0 && tableProps.colInfo[0].header
      ? <thead>
          <tr>
            {tableProps.deleteDataFcn ? <th key="0" /> : null}
            {tableProps.colInfo.map((col, idx) => <th key={baseIdx + idx}>{col.header}</th>)}
          </tr>
        </thead>
      : null
    );
  }
};

class Rows extends Component {
  constructor(props) {
    super(props);
    this.state = { dataSelections: [] };
  }

  componentDidMount() {
    if (this.props.tableProps.dataToolsEnabled) {
      this.setDataSelections(this.createDataSelections());
    }
  }

  componentDidUpdate() {
    if (this.props.tableProps.dataToolsEnabled) {
      this.updateDataSelections();
    }
  }

  createDataSelections() {
    return this.props.data.map(data => ({
      selected: false,
      data,
    }));
  }

  setDataSelections(dataSelections) {
    this.setState({
      dataSelections,
    });
  }

  setDataItemSelection(index, selected) {
    if (index < this.state.dataSelections.length &&
      index < this.props.data.length) {
      const updatedSelections = this.state.dataSelections.slice(0);
      updatedSelections[index].selected = selected;
      updatedSelections[index].data = this.props.data[index];
      return updatedSelections;
    }
    return this.state.dataSelections;
  }

  updateDataSelections() {
    let hasChanged = this.props.data.length != this.state.dataSelections.length;
    const matchesFcn = (obj1, obj2) =>
      Cmn.objectsMatch(obj1, obj2, this.props.tableProps.dataToolsKeys);
    const isSelectedReducer = (newData) => (result, prevDataSelection) =>
      result || prevDataSelection.selected && matchesFcn(newData, prevDataSelection.data);
    const newSelections = this.props.data.map((data, idx) => {
      hasChanged = hasChanged ||
        !Cmn.objectsMatch(data, this.state.dataSelections[idx].data, this.props.tableProps.dataToolsKeys);
      return ({
        selected: this.state.dataSelections.reduce(isSelectedReducer(data), false),
        data,
      })
    });
    if (hasChanged) {
      this.setDataSelections(newSelections);
      this.props.onDataSelectionChange(newSelections);
    }
  }

  onDataSelectionChange = (event) => {
    const updatedSelections = this.setDataItemSelection(event.target.value, event.target.checked);
    this.setDataSelections(updatedSelections);
    this.props.onDataSelectionChange(updatedSelections);
  }

  renderDeleteCheckbox(rowIdx) {
    // console.log('renderDeleteCheckbox:', this.state.dataSelections);
    return this.props.tableProps.dataToolsEnabled &&
      this.state.dataSelections.length == this.props.data.length ?
      <th key="0">
        <input type="checkbox"
          name="selectedItems"
          checked={this.state.dataSelections[rowIdx].selected}
          onChange={this.onDataSelectionChange}
          value={rowIdx} />
      </th>
      : null;
  }

  renderSummaryExpansion(summary) {
    const callbackFcn = summary.settings.toggleExpansionCallback(summary.category);
    const className = summary.expanded ? "fa fa-caret-down" : "fa fa-caret-right";
    return <a onClick={callbackFcn} ><i className={className} /></a>;
  }

  renderSummaryCell(summary, cellIdx) {
    return cellIdx == summary.settings.categoryCol
      ? <span>{summary.category} {this.renderSummaryExpansion(summary)}</span>
      : cellIdx == summary.settings.sizeCol
        ? "" + summary.size
        : "";
  }

  renderCell(data, col, baseIdx, cellIdx) {
    const summaryObj = data[summaryDataObjKey];
    // console.log('renderCell summary:', summaryObj);
    if (!summaryObj && !col.renderer) {
      return null;
    }
    const cellProps = { key: baseIdx + cellIdx };
    if (col.cellClass) {
      cellProps.className = col.cellClass(data);
    }
    if (summaryObj && summaryObj.expanded &&
      cellIdx == summaryObj.settings.categoryCol) {
      cellProps.rowSpan = summaryObj.size + 1;
    }
    return (
      <th {...cellProps} >
        {summaryObj
          ? this.renderSummaryCell(summaryObj, cellIdx)
          : col.renderer.render(data)}
      </th>
    );
  }

  render() {
    const tableProps = this.props.tableProps;
    const baseIdx = this.props.tableProps.dataToolsEnabled ? 1 : 0;
    // console.log('Rows render data, colInfo', this.props.data, tableProps.colInfo);
    return (
      <tbody>
        {this.props.data.map((data, rowIdx) =>
          <tr key={rowIdx}>
            {this.renderDeleteCheckbox(rowIdx)}
            {tableProps.colInfo.map((col, cellIdx) =>
              this.renderCell(data, col, baseIdx, cellIdx)
            )}
          </tr>
        )}
      </tbody>
    );
  }
};

function renderTitle(title) {
  return ( title
    ? <h5 className="page-header">{title}</h5>
    : null );
}

exports.loadingSpinner = () => (
  <div>
    <h3 className="page-header" style={{ textAlign: "center" }}>
      <i className="fa fa-spinner fa-spin" style={{ fontSize: "48px" }} /></h3>
  </div>
)

class DataTable extends Component {
  constructor(props) {
    super(props);
    this.state = { toolDisplayEnabled: false };
    this.selectedData = [];
  }

  onDataSelectionChange = (selectedData) => {
    const selectedCntReducer = (cnt, selectedItem) => selectedItem.selected ? cnt + 1 : cnt;
    const selectedDataCnt = selectedData.reduce(selectedCntReducer, 0);
    this.selectedData = selectedData;
    if (this.state.toolDisplayEnabled != (selectedDataCnt > 0)) {
      this.setState({
        toolDisplayEnabled: (selectedDataCnt > 0),
      });
    }
  }

  deleteSelectedData = () => {
    const selectedDataReducer = (results, selectedItem) => {
      if (selectedItem.selected) {
        results.push(selectedItem.data);
      }
      return results;
    }
    const deleteData = this.selectedData.reduce(selectedDataReducer, []);
    const tableProps = this.props.tableProps;
    if (this.selectedData.length > 0) {
      if (tableProps.deletePromptMessage) {
        this.promptDeleteData(tableProps.deletePromptMessage,
          tableProps.deleteDataFcn, deleteData);
      }
      else {
        tableProps.deleteDataFcn(deleteData);
      }
    }
  }

  promptDeleteData(promptMsg, deleteFcn, selectedData) {
    const okAction = () => {
      this.props.actions.dismissModal();
      deleteFcn(selectedData);
    }
    const dialogProps = {};
    dialogProps.body = () => (
      <p>{promptMsg}</p>
    );
    const okButton = (idx) =>
      <button key={idx} type="button" className="btn btn-primary"
        onClick={okAction} >OK</button>
    const cancelButton = (idx) =>
      <button key={idx} type="button" className="btn btn-default"
        data-dismiss="modal">Cancel</button>
    dialogProps.buttons = [okButton, cancelButton];
    this.props.actions.setModal(dialogProps);
  }

  renderColGroup(tableProps) {
    const baseIdx = tableProps.deleteDataFcn ? 1 : 0;
    return ( tableProps.colInfo.length > 0 && tableProps.colInfo[0].style
      ? <colgroup>
          {tableProps.deleteDataFcn ? <col key="0" /> : null}
          {tableProps.colInfo.map((col, idx) =>
            <col key={baseIdx + idx} style={ col.style ? col.style : {} } />)}
        </colgroup>
      : null
    );
  }

  renderDelete() {
    return this.state.toolDisplayEnabled && this.props.tableProps.deleteDataFcn ?
      <button type="button" onClick={this.deleteSelectedData} className="btn btn-default btn-sm">
        <span className="glyphicon glyphicon-trash"></span>
      </button>
      : null;
  }

  render() {
    const tableProps = this.props.tableProps;
    return (
      <div>
        {renderTitle(tableProps.title)}
        {renderTitle(tableProps.secondTitle)}
        <div className="table-responsive sym-u-2">
          {this.renderDelete()}
          <table className={tableProps.tableClass} style={tableProps.tableStyle}>
            {this.renderColGroup(tableProps)}
            <ColHeaders tableProps={tableProps} />
            <Rows data={this.props.data}
              tableProps={tableProps}
              onDataSelectionChange={this.onDataSelectionChange} />
          </table>
        </div>
      </div>
    );
  }
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

exports.DataTable = connect(null, mapDispatchToProps)(DataTable);
