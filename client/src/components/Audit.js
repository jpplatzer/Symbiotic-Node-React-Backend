// Renderer for dashboard content page
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import T, { DataTable }  from './DataTable';
import DashContent from './DashContent';
import { actionCreators } from '../modules';
import TableProps from './TableProps';
import { createAuditSidebarProps } from './Sidebar';
import AuditsUpdater from '../modules/audits';
import ScrollTo from './ScrollTo';

const kvpSectionKey = 1;
const spssSectionKey = 2;
const sasSectionKey = 3;

const sectionIdLabels = {
  [kvpSectionKey]: "kvpSectionId",
  [spssSectionKey]: "spssSectionId",
  [sasSectionKey]: "sasSectionId",
};

const kvpColInfo = [
  {
    style: { 'width': '50%' },
    renderer: T.renderer(T.propertyValue('key'))
  },
  {
    style: { 'width': '50%' },
    renderer: T.renderer(T.propertyValue('value'))
  },
];

const kvpSettings = {
  tableClass: 'table table-bordered table-striped',
  tableStyle: { 'width': '70%' },
  colInfo: kvpColInfo,
};

function pkgSecurityStatusCellClass(dataRowObj) {
  const summaryObj = dataRowObj[T.summaryDataObjKey];
  return !summaryObj ? ""
    : summaryObj.category == "Update Needed" ? "danger"
    : summaryObj.category == "Up-To-Date" ? "success"
    : "active";
}

function pkgVersionStatusCellClass(dataRowObj) {
  const statusValue = dataRowObj.status;
  return statusValue == 3 ? 'warning' : "";
}


const spssColInfo = [
  {
    header: 'Security Status',
    cellClass: pkgSecurityStatusCellClass,
    // No redering for this column because it's spanned
  },
  {
    header: 'Packages',
    renderer: T.renderer(T.propertyValue('name')),
  },
  {
    header: 'Device Version',
    renderer: T.renderer(T.propertyValue('version')),
    cellClass: pkgVersionStatusCellClass,
  },
  {
    header: 'Secure Version',
    renderer: T.renderer(T.propertyValueOrUndefined('secureVersion', 'Undetermined'))
  },
  {
    header: 'Release Version',
    renderer: T.renderer(T.propertyValueOrUndefined('availVersion', 'Undetermined'))
  },
];

const spssSettings = {
  tableClass: 'table table-bordered table-striped',
  tableStyle: {},
  sectionSpacer: true,
  colInfo: spssColInfo,
};

function sasSecurityStatusCellClass(dataRowObj) {
  const summaryObj = dataRowObj[T.summaryDataObjKey];
  return !summaryObj ? ""
    : summaryObj.category == "Warning" ? "danger"
    : summaryObj.category == "Suggestion" ? "warning"
    : summaryObj.category == "Passed" ? "success"
    : "active";
}

function addtInfoRenderer(key) {
  return (data) => {
    const lines = data[key] ? data[key] : [];
    return (
      <div>
        { lines.map((line, idx) => ( line.startsWith('http')
            ? <a key={idx} href={line}>{line}</a>
            : <span key={idx} >{line}<br /></span> )
          )
        }
      </div>
    );
  }
}

function valueWithAddtInfoRenderer(valueKey, addtInfoKey) {
  return (data) => {
    const valueLine = data[valueKey] ? <span>{data[valueKey]} <br /></span> : null;
    const addtInfoLines = data[addtInfoKey] ? data[addtInfoKey] : [];
    return (
      <div>
        {valueLine}
        {addtInfoLines.map((line, idx) => line.startsWith('http')
          ? null
          : <span key={idx} >{line}<br /></span> )}
      </div>
    );
  }
}

const sasColInfo = [
  {
    header: 'Security Status',
    cellClass: sasSecurityStatusCellClass,
    // No redering for this column because it's spanned
  },
  {
    header: 'Scan Items',
    renderer: T.renderer(T.propertyValue('item'))
  },
  {
    header: 'Scan Finding',
    renderer: T.customRenderer(valueWithAddtInfoRenderer('finding', 'moreInfo'))
  },
];

const sasSettings = {
  tableClass: 'table table-bordered table-striped',
  tableStyle: {},
  sectionSpacer: true,
  colInfo: sasColInfo,
};

const sectionSettings = {
  [kvpSectionKey]: kvpSettings,
  [spssSectionKey]: spssSettings,
  [sasSectionKey]: sasSettings,
}

function tablePropsFromSection(section) {
  const settings = sectionSettings[section.dataType];
  const label = section.label;
  if (settings) {
    const tableProps = new TableProps;
    tableProps.title = settings.sectionSpacer ? ' ' : label;
    tableProps.secondTitle = settings.sectionSpacer ? label : null;
    tableProps.tableClass = settings.tableClass;
    tableProps.tableStyle = settings.tableStyle;
    tableProps.colInfo = settings.colInfo;
    return tableProps;
  }
  return null;
}

const noOpCategorization = (values) => values;

function getSectionValues(report, sectionKey) {
  const getSectionValuesReducer = (values, section) => values ? values
      : section.dataType == sectionKey ? section.values : null;
  console.log("getSectionValues", report);
  return report.reduce(getSectionValuesReducer, null);
}

function findingsSummaryReducer(summary, dataObj) {
  console.log("findingsSummaryReducer", dataObj);
  if (dataObj.status == 3) {
    ++summary.warnings;
  }
  else if (dataObj.status == 2) {
    ++summary.suggestions;
  }
  return summary;
}

function packagesSummaryReducer(summary, dataObj) {
  console.log("packagesSummaryReducer", dataObj);
  if (dataObj.status == 4) {
    ++summary.insecure;
  }
  else if (dataObj.status == 1) {
    ++summary.secure;
  }
  else {
    ++summary.undetermined;
  }
  return summary;
}

class Audit extends DashContent {
  constructor(props) {
    super(props);
    this.spssSectionKey = "spss";
    this.sasSectionKey = "sas";
    this.state = {
      [this.spssSectionKey]: {
        ["Update Needed"]: { expanded: true, order: 0 },
        ["Up-To-Date"]: { expanded: false, order: 1 },
        Undetermined: { expanded: false, order: 2 },
      },
      [this.sasSectionKey]: {
        Warning: { expanded: true, order: 0 },
        Suggestion: { expanded: true, order: 1 },
        Undetermined: { expanded: false, order: 2 },
      }
    }
    this.categorizeSectionFcns = {
      [kvpSectionKey]: noOpCategorization,
      [spssSectionKey]: this.categorizeValues(this.spssSectionKey, this.spssCalcCategory),
      [sasSectionKey]: this.categorizeValues(this.sasSectionKey, this.sasCalcCategory),
    }
  }

  orderedCategories(categoryObjs) {
    const orderedArr = [];
    for (const key in categoryObjs) {
      orderedArr.push(key);
    }
    orderedArr.sort((key1, key2) =>
      categoryObjs[key1].order - categoryObjs[key2].order);
    return orderedArr;
  }

  createCategoriesSettings(sectionKey) {
    const summarySettings = T.createSummarySettings(this.toggleSpssExpansion(sectionKey), 0, 1);
    const categoryObjs = this.state[sectionKey];
    const orderedCategories = this.orderedCategories(categoryObjs);
    return orderedCategories.map((category) =>
      T.createCatergorySettings(category, categoryObjs[category].expanded, summarySettings));
  }

  toggleSpssExpansion = (sectionKey) => (category) => () => {
    const categoryObjs = Object.assign({}, this.state[sectionKey]);
    const categoryObj = categoryObjs[category];
    categoryObj.expanded = !categoryObj.expanded;
    this.setState({ [sectionKey]: categoryObjs });
  }

  spssCalcCategory = (rowObj) =>
    rowObj.status == 1 ? "Up-To-Date"
      : rowObj.status == 4 ? "Update Needed"
      : "Undetermined";

  sasCalcCategory = (rowObj) =>
    rowObj.status == 3 ? "Warning"
      : rowObj.status == 2 ? "Suggestion"
      : "Undetermined";

  categoryReducer = (calcCategoryFcn) => (categorizedValuesObj, rowObj) => {
    const category = calcCategoryFcn(rowObj);
    if (!categorizedValuesObj[category]) {
      categorizedValuesObj[category] = [];
    }
    categorizedValuesObj[category].push(rowObj);
    return categorizedValuesObj;
  }

  categorizeValues = (sectionKey, calcCategoryFcn) => (values) => {
    const categoriesSettings = this.createCategoriesSettings(sectionKey);
    return T.catergorizeValues(values, categoriesSettings, this.categoryReducer(calcCategoryFcn));
  }

  categorizeSectionValues(section) {
    return this.categorizeSectionFcns[section.dataType](section.values);
  }

  sidebarProps() {
    return this.props.params && this.props.params.group
      ? createAuditSidebarProps(this.props.params.group,
          this.props.params.subgroup,
          this.props.params.device, true)
      : null;
  }

  // Create state for expanded status for each pkg security status
  // Add a function for changing expanded state

  componentDidMount() {
    // console.log('Audit mounted:',  this.props);
    this.props.actions.loadPage(this.props, AuditsUpdater.auditUpdateFcns, this.sidebarProps());
  }

  componentDidUpdate() {
    // console.log('Audit componentDidUpdate:', this.props);
    this.props.actions.updatePage(this.props, AuditsUpdater.auditUpdateFcns, this.sidebarProps());
  }


  renderSection(section, idx) {
    const tableProps = tablePropsFromSection(section);
    const values = this.categorizeSectionValues(section);
    const idLabel = sectionIdLabels[section.dataType];
    if (tableProps) {
      // https://blog.hubspot.com/marketing/jump-link-same-page
      return (
        <div>
          <ScrollTo name={idLabel} />
          <DataTable key={idx} tableProps={tableProps} data={values} />
        </div>
      );
    }
    else {
      return <h3>Error processing content</h3>;
    }
  }

  renderSummary(audit) {
    const sasSectionValues = getSectionValues(audit.report, sasSectionKey);
    let findingsSummary = { warnings: 0, suggestions: 0 };
    findingsSummary = sasSectionValues ?
      sasSectionValues.reduce(findingsSummaryReducer, findingsSummary) : findingsSummary;
    const spssSectionValues = getSectionValues(audit.report, spssSectionKey);
    let packagesSummary = { insecure: 0, secure: 0, undetermined: 0 };
    packagesSummary = spssSectionValues ?
      spssSectionValues.reduce(packagesSummaryReducer, packagesSummary) : packagesSummary;
    const sasScrollToFcn = () => this.props.actions.setScrollTo(sectionIdLabels[sasSectionKey]);
    const spssScrollToFcn = () => this.props.actions.setScrollTo(sectionIdLabels[spssSectionKey]);
    return (
      <div className="table-responsive">
        <table className="table table-bordered outer-border" style={{ 'width': '70%' }}>
          <tbody>
            <tr>
              <th style={{ textAlign: "center", width: "50%" }}>Device: {audit.device}</th>
              <th style={{ textAlign: "center", width: "50%" }}>Scan time: {new Date(audit.time).toUTCString()}</th>
            </tr>
            <tr>
              <td className="sym-center">
                <a className="sym-black-link" onClick={sasScrollToFcn}>
                  <div className="sym-bold-menu">Security Findings</div><br />
                  <div className="summary_font">
                    <span style={{ color: T.redColor }}>{findingsSummary.warnings}</span>/
                    <span style={{ color: T.yellowColor }}>{findingsSummary.suggestions}</span>
                  </div>
                </a>
              </td>
              <td className="sym-center">
                <a className="sym-black-link" onClick={spssScrollToFcn}>
                  <div className="sym-bold-menu">Package Security Statuses</div><br />
                  <div className="summary_font">
                    <span style={{ color: T.redColor }}>{packagesSummary.insecure}</span>/
                    <span style={{ color: T.greenColor }}>{packagesSummary.secure}</span>/
                    <span style={{ color: T.grayColor }}>{packagesSummary.undetermined}</span>
                  </div>
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  renderContent() {
    const auditData = this.props.audits && this.props.audits.audit &&
      this.props.audits.audit.data ? this.props.audits.audit.data : undefined;
    const title = 'Security Scan Report';
    if (auditData && auditData.device) {
      return (
        <div>
          {this.renderTitle(title)}
          {this.renderSummary(auditData)}
          {auditData.report.map((section, idx) => this.renderSection(section, idx))}
        </div>
      );
    }
    else {
      return (
        <div>
          {this.renderTitle(title)}
          {T.loadingSpinner()}
        </div>
      );
    }
  }
};

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { audits, notify } = state;
  return { audits, notify };
}

function mapDispatchToProps(dispatch, getState) {
  return { actions: bindActionCreators(actionCreators, dispatch, getState) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(Audit);
