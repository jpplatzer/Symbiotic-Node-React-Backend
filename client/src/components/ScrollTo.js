// Render Data Table
// Copyright 2019 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { connect } from 'react-redux';
import { bindActionCreators } from 'redux';
import { actionCreators } from '../modules';

// https://stackoverflow.com/questions/43441856/reactjs-how-to-scroll-to-an-element

class ScrollTo extends Component {
  constructor(props) {
    super(props);
    this.myRef = React.createRef();
  }

  scrollToMyRef = () => window.scrollTo(0, this.myRef.current.offsetTop) ;

  componentDidUpdate() {
    if (this.props.scrollToName && this.props.scrollToName.name == this.props.name) {
      console.log("Scrolling to: " + this.props.name);
      this.scrollToMyRef();
    }
  }

  render() {
    return <div ref={this.myRef}></div>;
  }
}

function mapStateToProps(state) {
  // console.log("mapStateToProps:", state);
  const { scrollToName } = state;
  return { scrollToName };
}

function mapDispatchToProps(dispatch) {
  return { actions: bindActionCreators(actionCreators, dispatch) };
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(ScrollTo);