// AWS email functions
// Copyright 2019 Jeff Platzer. All rights reserved.

var AWS = require('aws-sdk');
const Cfg = require('../app_server/serverConfig');
const Vals = require('../common/ValCmn');

exports.sendAWSEmail = function(emailParams, contentObj){
 const ses = new AWS.SES({ region: Cfg.app.region });
 const email = createEmail(emailParams, contentObj);
 return ses.sendEmail(email).promise();
}

function createEmail(emailParams, contentObj){
 const cc = emailParams.cc ? emailParams.cc : [];
 const bcc = emailParams.bcc ? emailParams.bcc : [];
 const email = {
   Destination: {
     BccAddresses: bcc,
     CcAddresses: cc,
     ToAddresses: emailParams.to,
   },
   Message: {
     Body: {
       Html: {
         Data: httpContent(emailParams, contentObj),
         Charset: 'UTF-8',
       }
     },
     Subject: {
       Data: emailParams.subjectLine,
       Charset: 'UTF-8',
     }
   },
   Source: emailParams.source,
   ReplyToAddresses: emailParams.replyTo,
   ReturnPath: emailParams.returnPath,
 }
 return email
}

function httpContent(emailParams, contentObj) {
  const content = contentObj.contentFcn(emailParams);
  return (`
    <div style="margin:0px">
      <table cellpadding="0" cellspacing="0" width="700" align="center" border="0" style="font-family:'Open Sans',sans-serif;font-size:12px;margin-top:10px;border-spacing:0 1em">
        <thead>
          <tr>
          <th align="left" style="padding-bottom:10px;">
            <a href="https://www.symbioticsecurity.com" style="text-decoration:none;margin:20px 0px;color:#2d5f8b;font-family:'Museo Sans',Heveltica,Arial;font-size:28px;font-weight:400">Symb<span style="color:#f7682b">iot</span>ic Security</a>
          </th>
          </tr>
        </thead>
        <tbody style="background-color:#d8d8d8;vertical-align:top;line-height:20px">
          <tr>
            <td style="background-color:#ffffff;padding:0px 20px;border:1px solid #c2c2c2;border-radius:7px">
              <div style="border-bottom:1px solid #e5e5e5;padding-bottom:10px;margin-bottom:10px">
                <h1 style="color:#1e2b33;font-size:20px;margin:15px 0px 0px;font-weight:300;font-family:'Museo Sans',Heveltica,Arial">${contentObj.headline}</h1>
              </div>
              <div style="border-bottom:1px solid #e5e5e5;margin-bottom:10px;padding-bottom:10px;color:#111111;font-size:15px;font-weight:300;font-family:'Helvetica Neue','Helvetica',Helvetica,Arial,sans-serif">
                ${content}
              </div>
              <div>
                <dl style="font-family:'Helvetica Neue','Helvetica',Helvetica,Arial,sans-serif;font-weight:300">
                  <dd style="color:#111111;font-size:15px;margin:0">Thank you,</dd>
                  <dd style="color:#111111;font-size:15px;margin:0">Symbiotic Security</dd>
                </dl>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color:rgba(241,245,247,0.5);padding:0px 25px;border-radius:7px">
              <label style="margin-top:10px;color:#111111;font-size:17px;margin-bottom:10px;display:block;font-weight:300;font-family:'Museo Sans',Heveltica,Arial">Contact Info</label>
              <dl style="margin:0px 0px 10px 0px;color:#111111;line-height:initial;font-weight:300;font-family:'Helvetica Neue','Helvetica',Helvetica,Arial,sans-serif;font-size:13px">
                <dd style="margin:0 0 10px 0">For further assistance, you can contact us at</dd>
                <dd style="margin:0 0 10px 0"><a href="mailto:support@symbioticsecurity.com" target="_blank">support@symbioticsecurity.com</a> <br /> </dd>
              </dl>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  `);
}
exports.httpContent = httpContent;

const resetPwContentFcn = (resetUrl, expireTimeMins) => () => {
  const expireText = Vals.expireTimeText(expireTimeMins);
  return (`
    <p>
      Symbiotic Security received a request to reset the password for your account.
    </p>
    <p>
      To reset your password, click the following link: <a href="${resetUrl}">${resetUrl}</a>
    </p>
    <p>This link is good for ${expireText}</p>
  `);
}

function resetPwContentObj(resetUrl, timeout) {
  return ({
    headline: "Password Reset Requested",
    contentFcn: resetPwContentFcn(resetUrl, timeout),
  });
}
exports.resetPwContentObj = resetPwContentObj;

const welcomeContentFcn = (welcomeUrl, expireTimeMins) => () => {
  const expireText = Vals.expireTimeText(expireTimeMins);
  return (`
    <p>
      Thank you for signing up for our Security Scan.
    </p>
    <p>
      Click the following link to sign in and get started: <a href="${welcomeUrl}">${welcomeUrl}</a>
    </p>
    <p>This link is good for ${expireText}</p>
  `);
}

function welcomeContentObj(welcomeUrl, timeout) {
  return ({
    headline: "Welcome to Symbiotic Security",
    contentFcn: welcomeContentFcn(welcomeUrl, timeout),
  });
}
exports.welcomeContentObj = welcomeContentObj;
