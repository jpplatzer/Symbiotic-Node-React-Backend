// Retrieve and store package updates to/from the DB
// Copyright 2018 Jeff Platzer. All rights reserved.

const request = require('request');
const zlib = require('zlib');
const { Writable } = require('stream');
const Cmn = require('../common/CmnFcns');
const DB = require('../db_mgmt/device_db');
const RS = require('../db_mgmt/report_schema');
const secureVersions = require('./secureKernelVersions');
const Cfg = require('../app_server/serverConfig');

const archNames = {
  amd64: 'amd64',
  arm64: 'arm64',
  armel: 'armel',
  armhf: 'armhf',
  i386: 'i386',
  mips: 'mips',
  mipsel: 'mipsel',
  mips64el: 'mips64el',
  powerpc: 'powerpc',
  ppc64el: 'ppc64el',
  s390x: 's390x',
};
exports.archNames = archNames;

const distroNames = {
  debian: 'debian',
  raspbian: 'raspbian',
};
exports.distroNames = distroNames;

const securityPackageDistros = [];

function registerSecurityPackageDistros(distro, releases) {
  const distroObj = { distro, releases };
  securityPackageDistros.push(distroObj);
}
exports.registerSecurityPackageDistros = registerSecurityPackageDistros;

function* securityPackages() {
  for (const idx in securityPackageDistros) {
    const obj = securityPackageDistros[idx];
    const distro = obj.distro;
    for (const release in obj.releases) {
      const archs = obj.releases[release];
      for (const releaseIdx in archs) {
        const arch = archs[releaseIdx];
        const packageObj = { distro, release, arch };
        yield packageObj;
      }
    }
  }
}
exports.securityPackages = securityPackages;

const valueRelation = {
  less: -1,
  equal: 0,
  greater: 1,
};
exports.valueRelation = valueRelation;

const oneDayMs = 24 * 60 * 60 * 1000;
exports.oneDayMs = oneDayMs;
const oneWeekMs = 7 * oneDayMs;
exports.oneWeekMs = oneWeekMs;

function timeHasElapsed(startDate, timeUntilElapsedMs, compDate) {
  const startTimeMs = new Date(startDate).getTime();
  const compTimeMs = compDate ? new Date(compDate).getTime() : Date.now();
  return (compTimeMs > (startTimeMs + timeUntilElapsedMs));
}
exports.timeHasElapsed = timeHasElapsed;

let registeredGetSecurityPackagesFcns = [];
const registeredGetReleasePackagesFcn = {};

exports.registerGetSecurityPackages = function(getSecurityPackagesFcn) {
  registeredGetSecurityPackagesFcns.push(getSecurityPackagesFcn);
}

function getReportSectionReducer(sectionType) {
  return (result, section) => {
    if (section.dataType == sectionType) {
      result = section;
    }
    return result;
  }
}
exports.getReportSectionReducer = getReportSectionReducer;

function kvpReducer(accum, kvp) {
  const keyReducer = (keyAccum, key) => {
    return keyAccum ? keyAccum + '_' + key : key;
  }
  if (kvp.key && kvp.value) {
    const key = kvp.key.split(' ').reduce(keyReducer, '');
    accum[key] = kvp.value;
  }
  return accum;
}
exports.kvpReducer = kvpReducer;

const getSecurityPackages = function(distro, release, arch, options) {
  function securityPkgsReducer(allPkgs, getSecurityPackagesFcn) {
    return getSecurityPackagesFcn(distro, release, arch, options)
      .then((pkgs) => Promise.resolve(allPkgs.concat(pkgs)));
  }
  return registeredGetSecurityPackagesFcns.length == 0
    ? Promise.reject('Security update processing not registered')
    : Cmn.arrayAsyncReduce(registeredGetSecurityPackagesFcns, securityPkgsReducer, []);
}
exports.getSecurityPackages = getSecurityPackages;

exports.registerGetReleasePackages = function(distro, getInfoFcn, getArchFcn) {
  registeredGetReleasePackagesFcn[distro] = {
    getInfoFcn,
    getArchFcn,
  };
}

const getReleasePackages = function(distro, release, arch, options) {
  const packagesInfoFcns = registeredGetReleasePackagesFcn[distro];
  if (!packagesInfoFcns) {
    return Promise.reject('Unrecognized ditribution');
  }
  else {
    arch = packagesInfoFcns.getArchFcn
      ? packagesInfoFcns.getArchFcn(distro, release, arch) : arch;
    return packagesInfoFcns.getInfoFcn([release], arch, options);
  }
}
exports.getReleasePackages = getReleasePackages;

function getSecurityAndReleasePackages(distro, release, arch, options) {
  return getSecurityPackages(distro, release, arch, options)
    .then((securityPackages) => {
      const packages = { security: securityPackages };
      return getReleasePackages(distro, release, arch, options)
        .then((releasePackages) => {
          packages.release = releasePackages;
          return Promise.resolve(packages);
        })
        .catch((err) => {
          console.log("Release package error:", err);
          return Promise.resolve(packages);
        })
    })
}

function updateSecurityAndReleasePackages(distro, release, arch, options={}) {
  const modOptions = Object.assign({}, options, { update: true });
  return getSecurityAndReleasePackages(distro, release, arch, modOptions);
}
exports.updateSecurityAndReleasePackages = updateSecurityAndReleasePackages;

function procDevicesPackagesStatuses(distro, release, arch, devicePackages) {
  return getSecurityAndReleasePackages(distro, release, arch)
    .then((packages) =>
      updatePackagesStatuses(packages.security, packages.release, devicePackages));
}
exports.procDevicesPackagesStatuses = procDevicesPackagesStatuses;

function updatePackagesStatuses(securityPackages, releasePackages, packages) {
  /***
  console.log('updatePackagesStatuses securityPackages:', securityPackages);
  console.log("Comparing security package values:", securityPackages.map(release =>
      Object.keys(release.packages).map(val => [val, release.packages[val].name])));
  ***/
  // console.log("Comparing release packages:", releasePackages);
  packages.forEach((package) => procPackageStatus(securityPackages, releasePackages, package));
  return Promise.resolve(packages);
}

function procPackageStatus(securityPackages, releasePackages, package) {
  const normName = normalizePackageName(package.name);
  const verProps = versionProps(package.version);
  const secVerComp = securityPackages
    ? securityPackages.reduce(verCompReducer(package.name, normName, verProps), null) : null;
  const relVerComp = releasePackages
    ? releasePackages.reduce(verCompReducer(package.name, normName, verProps), null) : null;
  if (relVerComp) {
    package.availVersion = relVerComp.normVersion;
  }
  if (secVerComp) {
    package.secureVersion = secVerComp.normVersion;
    package.status = secVerComp.relation != valueRelation.less ? RS.StatusTypes.pass
      : RS.StatusTypes.fail;
  }
  else {
    package.status = !relVerComp ? RS.StatusTypes.unknown
      : relVerComp.relation == valueRelation.less ? RS.StatusTypes.warn
      : RS.StatusTypes.unknown;
  }
}

function verCompReducer(packageName, normName, verProps) {
  return (result, doc) => {
    const nextResult = compareVersions(doc.packages, packageName, normName, verProps);
    return nextResult && (!result || result.matched < nextResult.matched)
      ? nextResult
      : result;
  }
}

function versionComparisonResults(lhsValues, rhsValues) {
  function valueCompReducer(rhsValues) {
    return (result, lhsValue, idx) => {
      const rhsValue = idx < rhsValues.length ? rhsValues[idx] : null;
      return result.relation !== undefined || rhsValue === null || lhsValue == rhsValue ? result
        : lhsValue < rhsValue ? { relation: valueRelation.less, matched: idx }
        : { relation: valueRelation.greater, matched: idx }
    }
  }
  const result = lhsValues.reduce(valueCompReducer(rhsValues), {});
  return result.relation !== undefined ? result
    : lhsValues.length == rhsValues.length ? { relation: valueRelation.equal, matched: lhsValues.length }
    : lhsValues.length < rhsValues.length ? { relation: valueRelation.less, matched: lhsValues.length }
    : { relation: valueRelation.greater, matched: rhsValues.length }
}
exports.versionComparisonResults = versionComparisonResults;

function compareVersions(packages, packageName, normName, verProps) {
  function findBestMatchingPackageVersionReducer(result, packageInfo) {
    const pkgName = packageInfo.name;
    if (pkgName.startsWith(packageName)) {
      const compResult = versionComparisonResults(verProps.values, packageInfo.values);
      if (!result ||
        compResult.matched > result.matched ||
        (compResult.matched == result.matched && compResult.relation == valueRelation.greater)) {
        result = compResult;
        result.normVersion = packageInfo.norm;
      }
    }
    // console.log('Comparing:', normName, verProps.values, (package ? package : null));
    return result;
  }

  const matchingPackages = packages[normName];
  const result = !matchingPackages || matchingPackages.length == 0 ? null
    : matchingPackages.reduce(findBestMatchingPackageVersionReducer, null);
  /***
  if (result && result.relation != valueRelation.greater) {
    console.log('compareVersions:', packageName, normName, matchingPackages, result);
  }
  ***/
  return result;
}

function getPackagesFileContent(packagesFileUrl) {
  return new Promise((resolve,reject) => {
    const chunks = [];
    const outStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      }
    });
    request(packagesFileUrl)
        .on('error', (err) => reject(err))
      .pipe(zlib.createGunzip())
        .on('error', (err) => reject(err))
      .pipe(outStream)
        .on('finish', () => resolve(chunks.join('')))
    ;
  });
}
exports.getPackagesFileContent = getPackagesFileContent;

function getReleaseFileContent(releaseFileUrl) {
  return new Promise((resolve,reject) => {
    const chunks = [];
    const outStream = new Writable({
      write(chunk, encoding, callback) {
        chunks.push(chunk.toString());
        callback();
      }
    });
    request(releaseFileUrl)
        .on('error', (err) => reject(err))
      .pipe(outStream)
        .on('finish', () => resolve(chunks.join('')))
    ;
  });
}
exports.getReleaseFileContent = getReleaseFileContent;

function getStoredPackagesInfo(packageType, distro, release, arch) {
  const dbFcn = (completeCB) => DB.getPackagesInfo(packageType,
    distro, release, arch, completeCB);
  const dbErrFcn = (err, resolve, reject) => reject(
    'Error getting package stored updates ' +
      packageType + ', ' +
      distro + ', ' +
      release + ', ' +
      arch +
      ': ' + err
  );
  const dbSuccessFcn = (packagesInfo, resolve) => resolve( packagesInfo
    ? { packagesInfo }
    : { packagesInfo: {
        distro,
        release,
        arch,
        packages: {}
      }
    });
  return Cmn.fcnCbToPromise(dbFcn, dbErrFcn, dbSuccessFcn);
}
exports.getStoredPackagesInfo = getStoredPackagesInfo;

function updatePackagesInfo(packages, packageName, version, options) {
  function findExactMatchReducer(result, packageObj) {
    return result ? result
      : packageObj.name === packageName ? packageObj : result;
  }
  let packageObj;
  const normName = normalizePackageName(packageName);
  const verProps = versionProps(version, options);
  const packageObjs = packages[normName];
  if (packageObjs) {
    packageObj = packageObjs.reduce(findExactMatchReducer, null);
    if (packageObj) {
      // Only update a matching package if the version is greater
      const compResult = versionComparisonResults(verProps.values, packageObj.values);
      packageObj = compResult.relation == valueRelation.greater ? packageObj : null;
    }
    else {
      // Add a package
      packageObj = { name: packageName };
      packageObjs.push(packageObj);
    }
    /***
    console.log('updatePackagesInfo:', packageName, normName, verProps,
      packageObj ? 'added to' : 'did not add to', packages[normName]);
    ***/
  }
  else {
    // Create a new packages props and add a package
    packageObj = { name: packageName };
    packages[normName] = [ packageObj ];
  }
  if (packageObj) {
    Object.assign(packageObj, verProps);
    if (options && options.packagePropsPostProc) {
      Object.assign(packageObj, options.packagePropsPostProc(normName, packageObj));
    }
  }
}
exports.updatePackagesInfo = updatePackagesInfo;

function storePackagesInfo(packagesObj, packagesType) {
  const packagesInfo = packagesObj.packagesInfo;
  packagesInfo.lastChecked = new Date();
  packagesInfo.lastUpdated = new Date(packagesObj.releaseDate);
  if (packagesType == DB.packageTypes.security) {
    packagesInfo.active = true;
  }
  const dbFcn = (completeCB) => DB.setPackagesInfo(packagesType, packagesObj.packagesInfo, completeCB);
  const dbErrFcn = (err, resolve) => {
    const msg = 'Error storing package ' +
      packageType + ', ' +
      packagesInfo.distro + ', ' +
      packagesInfo.release + ', ' +
      packagesInfo.arch +
      ': ' + err;
    Cfg.logging.logger.warn(msg);
    resolve(packagesObj);
  }
  const dbSuccessFcn = (unused, resolve) => resolve(packagesObj);
  return Cmn.fcnCbToPromise(dbFcn, dbErrFcn, dbSuccessFcn);
}
exports.storePackagesInfo = storePackagesInfo;

function updateReleaseInfo(packagesObj, releaseUrl) {
  return getReleaseFileContent(releaseUrl)
    .then((releaseDoc) => {
      const releaseDate = getReleaseDate(releaseDoc);
      if (!releaseDate) {
        return Promise.reject('Error getting release date from: ' + releaseUrl);
      }
      packagesObj.releaseDate = releaseDate;
      const result = getNextDelimData(releaseDoc, 'Components: ');
      if (!result.data) {
        return Promise.reject('Error getting release components from: ' + releaseUrl);
      }
      packagesObj.releaseComponents = result.data.split(' ');
      // console.log('updateReleaseInfo data, component:', result.data, packagesObj.releaseComponents);
      return Promise.resolve(packagesObj);
    });
}
exports.updateReleaseInfo = updateReleaseInfo;

function getReleaseDate(releaseDoc) {
  const dateRe = /Date:\s+(.+)/
  const matches = releaseDoc.match(dateRe);
  if (matches && matches.length > 1) {
    const releaseDate = Date.parse(matches[1]);
    return releaseDate === NaN ? null : releaseDate;
  }
  return null;
}
exports.getReleaseDate = getReleaseDate;

function getNextDelimData(doc, dataDelim, result) {
  if (!result) {
    result = {
      done: false,
      error: false,
      nextIdx: 0,
    };
  }
  if (result.done) {
    return result;
  }
  let begIdx = doc.indexOf(dataDelim, result.nextIdx);
  if (begIdx < 0) {
    result.done = true;
    return result;
  }
  begIdx += dataDelim.length;
  const endIdx = doc.indexOf('\n', begIdx);
  if (endIdx < 0) {
    result.done = true;
    result.error = true;
    return result;
  }
  result.data = doc.substring(begIdx, endIdx);
  // console.log(dataKey, result[dataKey]);
  result.nextIdx = endIdx + 1;
  return result;
}
exports.getNextDelimData = getNextDelimData;

function truncColon(value) {
  const endIdx = value.indexOf(':');
  return endIdx > 0 ? value.substring(0, endIdx) : value;
}

function truncNameVersion(value) {
  const result = value.match(/(-\d+|\d+\.\d+)([-\.]\d+)*$/);
  return result ? value.substring(0, result.index) : value;
}

function replaceDots(value) {
  return value.replace(/\./g, '/_');
}

function normalizePackageName(name) {
  return Cmn.modString(truncColon)(name)
    .next(Cmn.modString(truncNameVersion))
    .next(Cmn.modString(replaceDots))
    .value;
}
exports.normalizePackageName = normalizePackageName;

function versionProps(version) {
  const re = /(\d+)+/g;
  const values = [];
  let normLength = 0;
  while (true) {
    const results = re.exec(version);
    if (!results || results.index > normLength + 1) {
      break;
    }
    let value = results[0];
    normLength = re.lastIndex;
    values.push(Number(value));
    if (re.lastIndex == version.length) {
      break;
    }
    else {
      let ch = version.charAt(re.lastIndex);
      if (ch !== '.' && ch !== ':') {
        if (ch >= 'a' && ch <= 'z') {
          const nextCh = re.lastIndex + 1 < version.length ?
            version.charAt(re.lastIndex+1) : null;
          if (!nextCh || nextCh === '.' || nextCh === '-' ||
            nextCh === '+' || nextCh === '~' || nextCh === ':') {
            normLength += 1;
            values.push(ch);
          }
          if (!nextCh || nextCh !== '.') {
            break;
          }
        }
        else {
          break;
        }
      }
    }
  }
  // console.log('getVersion:', version, values, version.substring(0, normLength));
  return ({
    version,
    values,
    norm: version.substring(0, normLength),
  });
}
exports.versionProps = versionProps;

function updatedSecurityAndReleasePackages(completeCB) {
  DB.getReportKvpSections()
    .then((kvpSections) =>
      Cmn.arrayAsyncReduce(kvpSections, updateDevicePackagesReducer, {})
        .then((updatedPackages) => completeCB(null, updatedPackages)))
    .catch((err) => completeCB(err));
}
exports.updatedSecurityAndReleasePackages = updatedSecurityAndReleasePackages;

function updateDevicePackagesReducer(updatedPackages, kvpSection) {
  const kvpProps = kvpSection.report[0].values.reduce(kvpReducer, {});
  const distro = kvpProps ? kvpProps['Distribution'] : null;
  const release = kvpProps ? kvpProps['Release'] : null;
  const arch = kvpProps ? kvpProps['Processor'] : null;
  if (distro && release && arch) {
    let childObj = addChildObjAsNeeded(distro, updatedPackages);
    childObj = addChildObjAsNeeded(release, childObj);
    childObj = addChildObjAsNeeded(arch, childObj);
    if (!childObj.checked) {
      childObj.checked = true;
      return updateSecurityAndReleasePackages(distro, release, arch)
        .then(() => Promise.resolve(updatedPackages));
    }
  }
  return Promise.resolve(updatedPackages);
}

function addChildObjAsNeeded(key, targetObj) {
  if (!targetObj[key]) {
    targetObj[key] = {};
  }
  return targetObj[key];
}

