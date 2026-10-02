/**
 * LeaCon II — Application endpoint (Google Apps Script Web App)
 * ---------------------------------------------------------------
 * HTML form → JavaScript → this Web App → Google Sheet (+ Drive photo)
 *
 * DEPLOYMENT
 * 1. Create a Google Sheet named "LeaCon II OC Applications".
 * 2. Extensions → Apps Script → paste this file as Code.gs.
 * 3. Project Settings → check "Show appsscript.json manifest file"
 *    and replace it with appsscript.json from this folder.
 * 4. Deploy → New deployment → type "Web app":
 *      - Execute as: Me
 *      - Who has access: Anyone
 * 5. Copy the /exec URL into js/form.js → APPS_SCRIPT_ENDPOINT.
 *
 * SECURITY NOTES
 * - Never put API keys or secrets in the frontend. This endpoint relies
 *   on server-side validation, a honeypot, a minimum fill-time check and
 *   a simple per-email rate limit.
 * - Validate everything again here — never trust the frontend.
 */

var CONFIG = {
  // "" means: use the spreadsheet this script is bound to.
  SPREADSHEET_ID: "",
  SHEET_NAME: "Applications",
  // Drive folder that stores uploaded professional photos.
  // "" means photos are NOT uploaded and the row is flagged instead.
  PHOTO_FOLDER_ID: "",
  SHEET_HEADERS: [
    "Timestamp",
    "Email",
    "Full Name",
    "Contact Number",
    "Front Office Function",
    "Back Office Function",
    "Inspiration",
    "Relevant Skills",
    "Leadership Experience",
    "Challenge Handling",
    "Definition of Successful Event",
    "Three Strengths",
    "Three Weaknesses",
    "First Preferred Role",
    "Second Preferred Role",
    "Professional Photo URL",
    "Policies Accepted",
    "Submission ID"
  ],
  MIN_FILL_MS: 3000,
  RATE_LIMIT_PER_EMAIL: 5,
  MAX_PHOTO_BYTES: 6 * 1024 * 1024,
  MAX_TEXT_LEN: 8000
};

var ROLES = [
  "OCVP Delegates",
  "OCVP Marketing",
  "OCVP Partnership Development",
  "OCVP Events & Logistics"
];

function doGet() {
  return json_({ result: "ok", service: "leacon-ii-application-endpoint" });
}

function doPost(e) {
  try {
    var p = (e && e.parameter) || {};

    // Honeypot + speed check: pretend success, store nothing.
    if (p.website || isTooFast_(p)) {
      return json_({
        result: "success",
        submissionId: p.submissionId || makeId_(),
        timestamp: new Date().toISOString()
      });
    }

    var error = validate_(p);
    if (error) return json_({ result: "error", message: error });

    if (isRateLimited_(p.email)) {
      return json_({
        result: "error",
        message: "Too many submissions from this email. Please try again in a few minutes."
      });
    }

    var photoUrl = storePhoto_(p.photoData, p.photoName);

    var submissionId = p.submissionId || makeId_();
    var timestamp = new Date().toISOString();

    appendRow_([
      timestamp,
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
      p.policiesAccepted === "Yes" ? "Yes" : "No",
      submissionId
    ]);

    bumpRateLimit_(p.email);

    return json_({ result: "success", submissionId: submissionId, timestamp: timestamp });
  } catch (err) {
    console.error(err);
    return json_({ result: "error", message: "Server error while saving the application." });
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

  if (String(p.firstPreference).trim() === String(p.secondPreference).trim()) {
    return "First and second preference must be different.";
  }

  if (ROLES.indexOf(String(p.firstPreference).trim()) === -1 ||
      ROLES.indexOf(String(p.secondPreference).trim()) === -1) {
    return "Unknown role preference.";
  }

  if (p.policiesAccepted !== "Yes") {
    return "OC policies must be accepted.";
  }

  if (p.accurateConfirmation !== "Yes") {
    return "Accuracy confirmation is required.";
  }

  if (!p.photoData || !/^data:image\/(jpeg|png);base64,/.test(p.photoData)) {
    return "A professional photo (JPG or PNG) is required.";
  }

  if (p.photoData.length * 0.75 > CONFIG.MAX_PHOTO_BYTES) {
    return "Photo is larger than 5 MB.";
  }

  return null;
}

function isTooFast_(p) {
  if (!p.timestamp) return false;
  var sent = Date.parse(p.timestamp);
  if (isNaN(sent)) return true;
  return Date.now() - sent < CONFIG.MIN_FILL_MS;
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

/* -------------------------------------------------------------------- photo */

function storePhoto_(photoData, photoName) {
  if (!CONFIG.PHOTO_FOLDER_ID) {
    console.warn("PHOTO_FOLDER_ID is not configured — photo was not uploaded.");
    return "[PHOTO NOT UPLOADED — folder not configured]";
  }

  var match = /^data:(image\/(?:jpeg|png));base64,(.+)$/.exec(photoData);
  if (!match) return "[PHOTO UPLOAD FAILED — invalid data]";

  var mime = match[1];
  var bytes = Utilities.base64Decode(match[2]);
  var ext = mime === "image/png" ? ".png" : ".jpg";
  var safeName = String(photoName || "photo")
    .replace(/[^\w.\-]+/g, "_")
    .slice(0, 80);
  if (!/\.(jpg|jpeg|png)$/i.test(safeName)) safeName += ext;

  var blob = Utilities.newBlob(bytes, mime, safeName);
  var folder = DriveApp.getFolderById(CONFIG.PHOTO_FOLDER_ID);
  var file = folder.createFile(blob);

  // Reviewers need to open the link without requesting access.
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return file.getUrl();
}

/* -------------------------------------------------------------------- sheet */

function getSheet_() {
  var ss = CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(CONFIG.SHEET_HEADERS);
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
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  return maxLen ? s.slice(0, maxLen) : s.slice(0, CONFIG.MAX_TEXT_LEN);
}

function makeId_() {
  var d = new Date();
  var stamp =
    String(d.getFullYear()).slice(2) +
    ("0" + (d.getMonth() + 1)).slice(-2) +
    ("0" + d.getDate()).slice(-2);
  return "LC2-" + stamp + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}
