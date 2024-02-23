// Help file for security scans
// Copyright 2018 Jeff Platzer. All rights reserved.

import React, { Component } from 'react';
import { Link } from 'react-router';
const Paths = require('../../paths');

const runScanHelpTextFcn = () => (
  <div>
    <p>The Security Scan tool scans devices for security issues and creates
      a report that you can access from this dashboard.</p>

    <p><b>Security Scan requirements</b></p>
    <ul>
      <li key="0">Devices are running the Linux operating system.</li>
      <li key="1">Devices have a writeable filesystem where the scan can be installed and run.</li>
      <li key="2">Devices have internet connectivity.</li>
      <li key="3">The <b>curl</b> program that is capable of SSL communication is installed on the devices.</li>
      <li key="4">The <b>tar</b> program (this is common) is installed on the devices.</li>
      <li key="5">The Security Scan can be run from root account or with root privileges.</li>
    </ul>

    <p><b>Downloading</b></p>

    <p>The Security Scan can be downloaded in two ways.</p>

    <p>The first way is by downloading the installation file using the browser,
      and copying it to the devices where it will be run using the following steps:</p>

    <ul>
      <li key="0">Download the Security Scan's installation file by selecting <b>Security Scan</b> from
        the dashboard's <b>Downloads</b> dropdown menu.</li>
      <li key="1">Copy the downloaded Security Scan's <b>install</b> file to a directory on
        the devices where the scan software is to be installed and run.</li>
    </ul>

    <p>The second way is to download the scan's installation file directly onto the devices
      using the following steps:</p>

    <ul>
      <li key="0">Get the command to download the scan's installation file
        by selecting <b>Scan Download Command</b> from the dashboard's <b>Downloads</b> dropdown menu.</li>
      <li key="1">Copy the command that is displayed in the dialog box.</li>
      <li key="2">Get the installation file by logging into the devices, changing to the directory
        where the scan will be installed and run, and running the copied download command.</li>
    </ul>

    <p><b>Installation</b></p>
    <ol>
      <li key="2">Log into a device and go to the directory where the <b>install</b> file
        has been copied</li>
      <li key="3">In this directory, make the install file executable
        using the command: <b>chmod +x install</b></li>
      <li key="4">Run the install file as the root user (or using sudo)
        with the command: <b>./install</b></li>
    </ol>

    <p><b>Performing a scan</b></p>
    <ol>
      <li key="0">Run the security scan tool as the root user (or using sudo)
        with the command: <b>./scan</b></li>
      <li key="1">The tool will scan a device's security and
        create a report that can be accessed from this dashboard.</li>
    </ol>

    <p><b>Viewing and managing scan reports</b></p>
    <ol>
      <li key="0">Once the security scan has successfully completed,
        the scan report will be available on this dashboard.</li>
      <li key="1">Help viewing and understanding the scan report can be found
        on the <Link to={Paths.viewScanHelp.path} >Viewing Scan Reports</Link> help page.</li>
    </ol>

    <p><b>Uninstalling the security scan</b></p>
    <ol>
      <li key="0">Change directories to the directory where the
        security scan is installed.</li>
      <li key="1">As the root user (or using sudo), run: <b>./uninstall</b></li>
    </ol>
  </div>
);

exports.runScanHelpTextFcn = runScanHelpTextFcn;

const viewScanHelpTextFcn = () => (
  <div>
    <p>Once the security scan has successfully completed, the scan report will be available on this dashboard.</p>

    <p><b>Viewing and Managing Scan Reports</b></p>
    <ol>
      <li key="0">When you log into the dashboard, a list of registered devices that have been scanned will be displayed.</li>
      <li key="1">Each line in the list represents the information for a device.</li>
      <li key="2">For a given device, a link with the number of scan reports will be displayed in the <b>Scans</b> column by the device's identifier.</li>
      <li key="3">Select this link to view a device's scan reports.</li>
      <li key="4">A list of scans, by the time the scan was performed, will be displayed.</li>
      <li key="5">Select the desired scan to view or delete it.</li>
    </ol>

    <p><b>System Information</b></p>

    <p>Information about a device's hardware, operating system version and distribution is provided in a scan report's <b>System Information</b> section.</p>

    <p><b>Security Scan Findings</b></p>

    <p>The <b>Security Scan Findings</b> section identifies security issues and makes security recommendations. The scan's findings are grouped by their security statuses. Findings with a <b>Warning</b> status identify likely security issues that should be examined and resolved as needed. The <b>Suggestion</b> status identifies changes that could potentially make the device more secure.</p>

    <p><b>Software Package Security Statuses</b></p>

    <p>The security statuses of software packages installed on the device are reported in the Software Package Security Statuses section. For each identified software package, the scan reports the package name and the versions of the package on the device, in the release, and the known secured version.</p>

    <p>Packages are grouped by their security statuses. An <b>Update Needed</b> security status indicates that the specified packages on the device have known security issues and a security update is available to resolve the security issues. Updating to the secure versions will address the security issues. An <b>Up-To-Date</b> status indicates the version of the package on the device has the latest security updates. An <b>Undetermined</b> status indicates the secure version status has not yet been determined for a package.</p>

    <p>At the current time, only software packages associated with a device's operating system distribution are available. Information about package security statuses is incomplete, and may not be available for several of the packages on a device. Package security information is regularly updated and expanded. This information will automatically be updated in your existing reports as it becomes available.</p>

  </div>
);

exports.viewScanHelpTextFcn = viewScanHelpTextFcn;

