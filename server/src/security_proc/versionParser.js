// Parse and normalize package versions
// Copyright 2019 Jeff Platzer. All rights reserved.

const Pkg = require('./packageUpdateMgr');

function getKernelValues(version) {
  const debianFormatRe = /\d+\.\d+\.0-\d+/;
  const valuesRe = /(\d+)+/g;
  const debianFormat = debianFormatRe.test(version);
  const numValues = debianFormat ? 4 : 3;
  const values = [];
  for (let i = 0; i < numValues; ++i) {
    const results = valuesRe.exec(version);
    if (!results) {
      break;
    }
    if (i !== 2 || !debianFormat) {
      values.push(Number(results[0]));
    }
  }
  return values;
}


function test(testStr) {
  const versionProps = Pkg.versionProps(testStr);
  console.log('test', testStr, versionProps);
}

test("012");
test("123.456");
test("234-456");
test("234-456-789");
test("345:456");
test("456.789.012");
test("012y");
test("012y:1");
test("123a:12cd");
test("123ab");
test("1.2.abc.12");
test("3.4.a12");

test("invalid");

function testVersion(testStr) {
  const msg = Pkg.kernelVersionStatusMsg(testStr);
  console.log('testVersion', testStr, msg);
}

testVersion("1.2.3");
testVersion("1.2.0-4");
testVersion("1.2.3.4.5");
testVersion("1.2.0-4.5");

testVersion("3.14.23");
testVersion("3.14.0-23");

testVersion("3.16.23");
testVersion("3.16.0-23");

testVersion("3.16.150");
testVersion("3.16.0-150");

testVersion("4.4.150");
testVersion("4.4.0-150");

testVersion("4.4.174");
testVersion("4.4.0-174");

testVersion("4.5.150");
testVersion("4.5.0-150");
