/**
 * LeaCon II — Application endpoint (Google Apps Script Web App)
 * ---------------------------------------------------------------
 * HTML form -> JavaScript (js/form.js) -> this Web App -> Google Sheet
 *                                                     -> Google Drive photo
 *
 * DEPLOYMENT
 * 1. Open the LeaCon II applications Google Sheet.
 * 2. Extensions -> Apps Script -> paste this file as Code.gs.
 * 3. Project Settings -> check "Show appsscript.json manifest file"
 *    and replace it with appsscript.json from this folder.
 * 4. Deploy -> Manage deployments -> New deployment -> type "Web app":
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. The frontend already points at the deployed /exec URL in js/form.js.
 *
 * REQUEST / RESPONSE CONTRACT (keep aligned with js/form.js)
 * - Reads e.parameter, so the frontend sends URLSearchParams - never JSON.
 * - Success: { success: true,  applicationId, message }
 * - Failure: { success: false, message }
 *
 * SECURITY NOTES
 * - Never put API keys or secrets in the frontend. This endpoint relies
 *   on server-side validation, a honeypot field and a per-email rate limit.
 * - Validate everything again here - never trust the frontend.
 */

/* ------------------------------------------------------------------ config */

var SPREADSHEET_ID = "1vjHm51yX-PWH2-H-oIcI24Cl-QX14OPfjgF6NVdsqEA";
var SHEET_NAME = "Applications";
var PHOTO_FOLDER_ID = "1qK7NDEtN_1TXBIuBvhVClC54bfLJWlvP";

var SHEET_HEADERS = [
  "Timestamp",
  "Application ID",
  "Email",
  "Full Name",
  "Contact Number",
  "Front Office Function",
  "Back Office Function",
  "Inspiration",
  "Skills",
  "Leadership Experience",
  "Challenge Handling",
  "Successful Event",
  "Strengths",
  "Weaknesses",
  "First Preference",
  "Second Preference",
  "Professional Photo URL",
  "Policies Accepted"
];

var FRONT_OFFICE = ["oGV", "oGT"];
var BACK_OFFICE = ["BD & Finance", "TM", "Brand MKT", "Product MKT"];
var ROLES = [
  "OCP",
  "OCVP Delegates",
  "OCVP Marketing",
  "OCVP Partnership Development",
  "OCVP Events & Logistics"
];

var CONFIG = {
  MAX_PHOTO_BYTES: 3 * 1024 * 1024,
  MAX_TEXT_LEN: 8000,
  RATE_LIMIT_PER_EMAIL: 5
};

/* ------------------------------------------------------------------- entry */

function doGet() {
  return json_({
    success: true,
    message: "LeaCon II application endpoint is running."
  });
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    /* Honeypot: humans never fill this. Reject without alerting the bot. */
    if (String(p.website || "").trim() !== "") {
      return json_({
        success: true,
        applicationId: makeId_(),
        message: "Application submitted successfully."
      });
    }

    var error = validate_(p);
    if (error) return json_({ success: false, message: error });

    if (emailExists_(p.email)) {
      return json_({
        success: false,
        message:
          "An application from this email address already exists. Only one application per email is allowed."
      });
    }

    if (isRateLimited_(p.email)) {
      return json_({
        success: false,
        message: "Too many submissions from this email. Please try again in a few minutes."
      });
    }

    var applicationId = makeId_();
    var photoUrl = storePhoto_(p.photoBase64, p.photoName);

    appendRow_([
      new Date().toISOString(),
      applicationId,
      clean_(p.email, 320),
      clean_(p.fullName, 200),
      clean_(p.contactNumber, 60),
      clean_(p.frontOffice, 60),
      clean_(p.backOffice, 60),
      clean_(p.inspiration),
      clean_(p.skills),
      clean_(p.leadershipExperience),
      clean_(p.challengeHandling),
      clean_(p.successfulEvent),
      clean_(p.strengths),
      clean_(p.weaknesses),
      clean_(p.firstPreference, 80),
      clean_(p.secondPreference, 80),
      photoUrl,
      "Yes"
    ]);

    bumpRateLimit_(p.email);

    return json_({
      success: true,
      applicationId: applicationId,
      message: "Application submitted successfully."
    });
  } catch (err) {
    console.error(err);
    return json_({
      success: false,
      message: "Server error while saving the application."
    });
  }
}

/* ---------------------------------------------------------------- validation */

function validate_(p) {
  var required = [
    ["fullName", "Full name"],
    ["contactNumber", "Contact number"],
    ["email", "Email"],
    ["frontOffice", "Front office function"],
    ["backOffice", "Back office function"],
    ["inspiration", "Inspiration answer"],
    ["skills", "Skills answer"],
    ["leadershipExperience", "Leadership experience"],
    ["challengeHandling", "Challenge handling"],
    ["successfulEvent", "Successful event"],
    ["strengths", "Strengths"],
    ["weaknesses", "Weaknesses"],
    ["firstPreference", "First preference"],
    ["secondPreference", "Second preference"]
  ];

  for (var i = 0; i < required.length; i++) {
    if (!String(p[required[i][0]] || "").trim()) {
      return required[i][1] + " is required.";
    }
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(p.email).trim())) {
    return "A valid email address is required.";
  }

  if (FRONT_OFFICE.indexOf(String(p.frontOffice).trim()) === -1) {
    return "Unknown front office function.";
  }

  if (BACK_OFFICE.indexOf(String(p.backOffice).trim()) === -1) {
    return "Unknown back office function.";
  }

  if (String(p.firstPreference).trim() === String(p.secondPreference).trim()) {
    return "First and second preference must be different.";
  }

  if (
    ROLES.indexOf(String(p.firstPreference).trim()) === -1 ||
    ROLES.indexOf(String(p.secondPreference).trim()) === -1
  ) {
    return "Unknown role preference.";
  }

  if (p.policiesAccepted !== "Yes") {
    return "OC policies must be accepted.";
  }

  if (!p.photoBase64 || !/^data:image\/(jpeg|png);base64,/.test(p.photoBase64)) {
    return "A professional photo (JPG or PNG) is required.";
  }

  if (estimatePhotoBytes_(p.photoBase64) > CONFIG.MAX_PHOTO_BYTES) {
    return "The professional picture must be smaller than 3 MB.";
  }

  return null;
}

function estimatePhotoBytes_(dataUrl) {
  var comma = String(dataUrl).indexOf(",");
  if (comma === -1) return 0;
  return Math.round((String(dataUrl).length - comma - 1) * 0.75);
}

function isRateLimited_(email) {
  var key = "sub:" + String(email || "").toLowerCase();
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || 0);
  return count >= CONFIG.RATE_LIMIT_PER_EMAIL;
}

function bumpRateLimit_(email) {
  var key = "sub:" + String(email || "").toLowerCase();
  var cache = CacheService.getScriptCache();
  var count = Number(cache.get(key) || 0);
  cache.put(key, String(count + 1), 600); // 10 minute window
}

/* -------------------------------------------------- one application / email */

function emailExists_(email) {
  var sheet = getSheet_();
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;

  var values = sheet.getRange(2, 3, lastRow - 1, 1).getValues(); // column C = Email
  var target = String(email || "").trim().toLowerCase();
  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0] || "").trim().toLowerCase() === target) return true;
  }
  return false;
}

/* -------------------------------------------------------------------- photo */

function storePhoto_(photoBase64, photoName) {
  var match = /^data:(image\/(?:jpeg|png));base64,([\s\S]+)$/.exec(
    String(photoBase64 || "")
  );
  if (!match) return "[PHOTO UPLOAD FAILED - invalid data]";

  var mime = match[1];
  var bytes = Utilities.base64Decode(match[2].replace(/\s/g, ""));
  var ext = mime === "image/png" ? ".png" : ".jpg";
  var safeName = String(photoName || "photo")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
  if (!/\.(jpg|jpeg|png)$/i.test(safeName)) safeName += ext;

  var blob = Utilities.newBlob(bytes, mime, safeName);
  var folder = DriveApp.getFolderById(PHOTO_FOLDER_ID);
  var file = folder.createFile(blob);

  // The folder stays private; reviewers open the link stored in the Sheet.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

/* -------------------------------------------------------------------- sheet */

function getSheet_() {
  var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SHEET_HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function appendRow_(values) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    getSheet_().appendRow(values);
  } finally {
    lock.releaseLock();
  }
}

/* ------------------------------------------------------------------ helpers */

function clean_(value, maxLen) {
  var s = String(value === undefined || value === null ? "" : value);
  s = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
  return maxLen ? s.slice(0, maxLen) : s.slice(0, CONFIG.MAX_TEXT_LEN);
}

function makeId_() {
  var now = new Date();
  var stamp = Utilities.formatDate(now, Session.getScriptTimeZone(), "yyyyMMdd-HHmmss");
  return "LEACON-" + stamp;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
