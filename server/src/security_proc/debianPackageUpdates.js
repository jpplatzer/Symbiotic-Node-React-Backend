// Process debian-style package updates
// Copyright 2018 Jeff Platzer. All rights reserved.

const R = require('ramda');
const DB = require('../db_mgmt/device_db');
const Pkg = require('./packageUpdateMgr');
const Cfg = require('../app_server/serverConfig');

const debianReleases = ['jessie', 'stretch'];
const raspbianReleases = ['jessie', 'stretch'];
const debianArchDirs = {
  [Pkg.archNames.amd64]: 'binary-amd64',
  [Pkg.archNames.i386]: 'binary-i386',
  [Pkg.archNames.armhf]: 'binary-armhf',
  [Pkg.archNames.armel]: 'binary-armel',
  [Pkg.archNames.mips]: 'binary-mips',
  [Pkg.archNames.mipsel]: 'binary-mipsel',
  [Pkg.archNames.mips64el]: 'binary-mips64el',
};
const raspbianArchPaths = {
  [Pkg.archNames.armhf]: 'binary-armhf',
};

const securityDistros = {
  jessie: [
    Pkg.archNames.amd64,
    Pkg.archNames.i386,
    Pkg.archNames.armhf,
    Pkg.archNames.armel,
  ],
  stretch: [
    Pkg.archNames.amd64,
    Pkg.archNames.i386,
    Pkg.archNames.armhf,
    Pkg.archNames.armel,
    Pkg.archNames.mips,
    Pkg.archNames.mipsel,
  ],
};

Pkg.registerSecurityPackageDistros('debian', securityDistros);

const debianSecurityPackagesFileInfo = {
  distro: Pkg.distroNames.debian,
  packagesType: DB.packageTypes.security,
  packagesFileName: 'Packages.gz',
  signedReleaseFileSubPath: 'updates/InRelease',
  baseUrls: [ 'http://security.debian.org/debian-security/dists/' ],
};

const debianReleasePackagesFileInfo = {
  distro: Pkg.distroNames.debian,
  packagesType: DB.packageTypes.release,
  packagesFileName: 'Packages.gz',
  signedReleaseFileSubPath: 'Release',
  baseUrls: [ 'http://cdn-fastly.deb.debian.org/debian/dists/' ],
};

const raspbianReleasePackagesFileInfo = {
  distro: Pkg.distroNames.raspbian,
  packagesType: DB.packageTypes.release,
  packagesFileName: 'Packages.gz',
  signedReleaseFileSubPath: 'InRelease',
  baseUrls: [
    'http://mirrordirector.raspbian.org/raspbian/dists/',
    'http://archive.raspberrypi.org/debian/dists/',
  ],
};

function getAllPackagesInfo(packagesFileInfo, releases, arch, options) {
  options = options ? options : {};
  const releasePackagesInfo = [];
  const releaseIter = DB.containerValueGen(releases);

  // console.log('getAllPackagesInfo', releases);
  function getNextPkgInfo() {
    const result = releaseIter.next();
    if (!result.done) {
      const release = result.value;
      Cfg.logging.logger.info('Getting packages info for: ' + packagesFileInfo.packagesType + ', ' +
        packagesFileInfo.distro + ', ' + release + ', ' + arch);
      return Pkg.getStoredPackagesInfo(packagesFileInfo.packagesType, packagesFileInfo.distro, release, arch)
        .then((packagesObj) => {
          return options.update
            ? updateAllPackagesInfo(packagesObj, packagesFileInfo)
            : Promise.resolve(packagesObj);
        })
        .then(procPackagesInfo)
        .catch((err) => procPackagesError(err));
    }
    else {
      return Promise.resolve(releasePackagesInfo);
    }
  }

  function procPackagesInfo(packagesObj) {
    if (packagesObj && packagesObj.packagesInfo) {
      releasePackagesInfo.push(packagesObj.packagesInfo);
    }
    return getNextPkgInfo();
  }

  function procPackagesError(err) {
    Cfg.logging.logger.warn(err);
    return getNextPkgInfo();
  }

  return getNextPkgInfo();
}

function updateAllPackagesInfo(packagesObj, packagesFileInfo) {
  const releaseBaseUrlIter = DB.containerValueGen(packagesFileInfo.baseUrls);

  const updateNextPkgInfo = (packagesObj) => {
    const result = releaseBaseUrlIter.next();
    if (!result.done) {
      const releaseDirUrl = result.value + packagesObj.packagesInfo.release + '/';
      const releaseFileUrl = releaseDirUrl + packagesFileInfo.signedReleaseFileSubPath;
      Cfg.logging.logger.info('Processing release info for release dir, file: ' + releaseDirUrl, releaseFileUrl);
      return Pkg.updateReleaseInfo(packagesObj, releaseFileUrl)
        .then((packagesObj) => !packagesObj.packagesInfo.lastUpdated ||
          Pkg.timeHasElapsed(packagesObj.packagesInfo.lastUpdated, 0, packagesObj.releaseDate)
          ? procPackagesInfoUpdate(packagesObj, releaseDirUrl)
          : procPackagesInfoMsg(Cfg.logging.logger.info, packagesObj,
              'Package update is current for release: ' + releaseDirUrl)
        )
        .catch((msg) => procPackagesInfoMsg(Cfg.logging.logger.warn, packagesObj, msg));
    }
    else {
      return Promise.resolve(packagesObj);
    }
  }

  function procPackagesInfoUpdate(packagesObj, releaseDirUrl) {
    return updateAllComponentPackagesInfo(packagesObj, packagesFileInfo, releaseDirUrl)
      .then(updateNextPkgInfo);
  }

  function procPackagesInfoMsg(logFcn, packagesObj, msg) {
    logFcn('Status processing release info: ' + msg);
    return updateNextPkgInfo(packagesObj);
  }

  if (packagesObj.packagesInfo.lastChecked &&
    !Pkg.timeHasElapsed(packagesObj.packagesInfo.lastChecked, Pkg.oneDayMs)) {
    Cfg.logging.logger.info("Skipping updating packages for release because it's not time");
    return Promise.resolve(packagesObj);      // Not time to check for an update
  }
  return updateNextPkgInfo(packagesObj);
}

function updateAllComponentPackagesInfo(packagesObj, packagesFileInfo, releaseDirUrl) {
  const componentDirIter = DB.containerValueGen(packagesObj.releaseComponents);

  // console.log('updateAllComponentPackagesInfo ', packagesObj);
  const updateNextComponentPkgInfo = (packagesObj) => {
    const result = componentDirIter.next();
    if (!result.done) {
      // console.log('updateAllComponentPackagesInfo next release component:', result.value);
      const packagesFileUrl = releaseDirUrl + result.value + '/' +
        debianArchDirs[packagesObj.packagesInfo.arch] +
        '/' + packagesFileInfo.packagesFileName;
      Cfg.logging.logger.info('Updating component packages from file: ' + packagesFileUrl);
      return updatePackagesInfo(packagesObj, packagesFileInfo.packagesType, packagesFileUrl)
        .then(updateNextComponentPkgInfo)
        .catch((err) => {
          Cfg.logging.logger.warn('Error updating component packages from file, ' +
            packagesFileUrl + ', ' + err);
          return updateNextComponentPkgInfo(packagesObj);
        })
    }
    else {
      return Promise.resolve(packagesObj);
    }
  }

  return updateNextComponentPkgInfo(packagesObj);
}

const updatePackagesInfo = function (packagesObj, packagesType, packagesUrl) {
  const createOptions = packagesType == DB.packageTypes.security
    ? { distro: Pkg.distroNames.debian }
    : {};
  return Pkg.getPackagesFileContent(packagesUrl)
    .then((packagesDoc) => createPackagesInfo(packagesObj, packagesDoc, createOptions))
    .then((packagesObj) => Pkg.storePackagesInfo(packagesObj, packagesType));
}

function createPackagesInfo(packagesObj, packagesDoc, options) {
  const packageDelim = 'Package: ';
  const versionDelim = 'Version: ';
  const packages = packagesObj.packagesInfo.packages;
  let result, packageName, version;
  let numPackages = 0;
  for (;;) {
    result = Pkg.getNextDelimData(packagesDoc, packageDelim, result);
    packageName = result.data;
    result = Pkg.getNextDelimData(packagesDoc, versionDelim, result);
    if (result.done) {
      break;
    }
    version = result.data;
    Pkg.updatePackagesInfo(packages, packageName, version, options);
    numPackages++;
  }
  return (!result.error && numPackages > 0) ? Promise.resolve(packagesObj)
    : Promise.reject('Failure creating packages info doc');
}

function raspbianGetArch() {
  return Pkg.archNames.armhf;
}

function debianGetDebianEquivReleases(release) {
  let relIdx = debianReleases.indexOf(release);
  relIdx = relIdx < 0 ? 0 : relIdx;
  return relIdx < (debianReleases.length - 1)
    ? [debianReleases[relIdx], debianReleases[relIdx+1]]
    : [debianReleases[relIdx]];
}

const getRaspbianReleasePackages = (releases, arch, options) =>
  getAllPackagesInfo(raspbianReleasePackagesFileInfo, releases, arch, options);

Pkg.registerGetReleasePackages(Pkg.distroNames.raspbian, getRaspbianReleasePackages, raspbianGetArch);

function debianGetArch(distro, release, arch) {
  const archMap = {
    amd64: Pkg.archNames.amd64,
    x86_64: Pkg.archNames.amd64,
    i386: Pkg.archNames.i386,
    x86: Pkg.archNames.i386,
    armv7l: Pkg.archNames.armhf,
    armhf: Pkg.archNames.armhf,
    armel: Pkg.archNames.armel,
    mips: Pkg.archNames.mips,
    mipsel: Pkg.archNames.mipsel,
    mips64el: Pkg.archNames.mips64el,
  };
  return archMap[arch] ? archMap[arch]
    : arch.startsWith('arm') ? Pkg.archNames.armhf
    : arch.startsWith('mips') ? Pkg.archNames.mips
    : archMap[Pkg.archNames.i386];
}

function debianGetReleases(release) {
  return [release];
}

const getDebianReleasePackages = (releases, arch, options) =>
  getAllPackagesInfo(debianReleasePackagesFileInfo, releases, arch, options);

Pkg.registerGetReleasePackages(Pkg.distroNames.debian, getDebianReleasePackages, debianGetArch);

function getSecurityReleasePackages(distro, release, arch, options) {
  const debRelease = distro == Pkg.distroNames.debian ||
    distro == Pkg.distroNames.raspbian ? release : null;
  const debReleases = debianGetDebianEquivReleases(debRelease);
  const debArch = debianGetArch(distro, release, arch);
  return getAllPackagesInfo(debianSecurityPackagesFileInfo, debReleases, debArch, options);
}
Pkg.registerGetSecurityPackages(getSecurityReleasePackages);

