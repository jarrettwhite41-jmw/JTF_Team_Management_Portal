import React, { useEffect, useMemo, useState } from 'react';
import { Loader } from '../components/common/Loader';
import { Message } from '../components/common/Message';
import { AppSetting, ShowTypes } from '../types';
import { supabaseService } from '../services/supabaseService';

const rentalScriptSnippet = `// ==========================================
// JTF Rental Inquiries -> Supabase Webhook
// ==========================================

const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";

function onFormSubmit(e) {
  try {
    let rowValues = [];
    if (e && e.values) {
      rowValues = e.values;
    } else {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const lastRow = sheet.getLastRow();
      rowValues = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    const companyName = String(rowValues[1] || "").trim();
    const contactName = String(rowValues[2] || "Unknown Client").trim();
    const contactEmail = String(rowValues[3] || "no-email-provided@jtf.internal").trim();
    const contactPhone = String(rowValues[4] || "").trim();
    const eventType = String(rowValues[5] || rowValues[6] || "Corporate Event").trim();
    const guestCount = parseInt(rowValues[7], 10) || null;
    const preferredDate = String(rowValues[8] || "").trim();
    const startTimeEstimate = String(rowValues[9] || "").trim();
    const techServices = String(rowValues[10] || "").trim();
    const specificRequirements = String(rowValues[11] || "").trim();
    const referral = String(rowValues[12] || "").trim();
    const notesOptional = String(rowValues[13] || "").trim();

    let startDate = new Date();
    if (preferredDate && !isNaN(Date.parse(preferredDate))) {
      startDate = new Date(preferredDate);
    }
    const endDate = new Date(startDate.getTime() + 4 * 60 * 60 * 1000);

    const payload = {
      organization_name: companyName,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      event_type: eventType,
      guest_count: guestCount,
      preferred_date: preferredDate,
      start_time_estimate: startTimeEstimate,
      event_start: startDate.toISOString(),
      event_end: endDate.toISOString(),
      rental_rate: 0,
      deposit_amount: 0,
      deposit_paid: false,
      insurance_cert_on_file: false,
      tech_requirements: techServices,
      referral_source: referral,
      notes: [specificRequirements, notesOptional].filter(Boolean).join(" | "),
      status: "inquiry"
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/venue_rentals", options);
    Logger.log("Supabase response: " + response.getContentText());
  } catch (err) {
    Logger.log("Error posting rental inquiry: " + err.toString());
  }
}
`;

const contactScriptSnippet = `// ==========================================
// JTF Contact Inquiries -> Supabase Webhook
// ==========================================

const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";

function onFormSubmit(e) {
  try {
    let rowValues = [];
    if (e && e.values) {
      rowValues = e.values;
    } else {
      const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
      const lastRow = sheet.getLastRow();
      rowValues = sheet.getRange(lastRow, 1, 1, sheet.getLastColumn()).getValues()[0];
    }

    const submittedOn = String(rowValues[0] || "").trim();
    const senderName = String(rowValues[1] || "Website Visitor").trim();
    const senderEmail = String(rowValues[2] || "").trim();
    const subject = String(rowValues[3] || "General Contact Inquiry").trim();
    const message = String(rowValues[4] || "").trim();

    const fullBody = "From: " + senderName + " (" + senderEmail + ")\\n\\n" + message;

    const payload = {
      channel: "email",
      category: "general",
      direction: "inbound",
      subject: subject,
      body: fullBody,
      staff_email: senderEmail,
      sender_name: senderName,
      submitted_at: submittedOn || new Date().toLocaleString(),
      status: "open"
    };

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "return=representation"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/communication_logs", options);
    Logger.log("Supabase response: " + response.getContentText());
  } catch (err) {
    Logger.log("Error posting contact inquiry: " + err.toString());
  }
}
`;

const pipelineSyncScriptSnippet = `// ============================================================================
// JTF Rental & Opportunity Pipeline -> Supabase Sync Script
// Sheet: 1W4xaUVlFaOs23sjlPYD5K5dEaotEvK9RONE4gfQNBzQ
// ============================================================================

const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || "{}");
    const expectedToken = PropertiesService.getScriptProperties().getProperty("JTF_PIPELINE_WEBHOOK_TOKEN");
    if (!expectedToken || body.token !== expectedToken) {
      return pipelineJson({ success: false, error: "Unauthorized." });
    }

    const sheet = SpreadsheetApp.openById(String(body.sheetId || "")).getSheets()[0];
    const opportunityId = String(body.opportunityId || "").trim();
    if (!opportunityId) throw new Error("Opportunity ID is required.");

    if (body.action === "delete") {
      const rowNumber = findPipelineRow(sheet, opportunityId);
      if (rowNumber) sheet.deleteRow(rowNumber);
      return pipelineJson({ success: true, deleted: Boolean(rowNumber) });
    }
    if (body.action !== "upsert" || !body.rental) throw new Error("Unsupported action or missing rental data.");

    const rental = body.rental;
    const eventDate = rental.event_start ? new Date(rental.event_start) : "";
    const followUpDate = rental.follow_up_date ? new Date(rental.follow_up_date + "T12:00:00") : "";
    const paymentDueDate = rental.payment_due_date ? new Date(rental.payment_due_date + "T12:00:00") : "";
    const rowValues = [[
      opportunityId,
      rental.opportunity_name || rental.organization_name || "",
      rental.status || "inquiry",
      rental.event_type || "",
      eventDate,
      rental.date_time_details || "",
      rental.facilitators_planned || "",
      rental.guests_crew_notes || "",
      rental.location_spaces || "",
      rental.contact_name || "",
      rental.contact_email || "",
      rental.contact_phone || "",
      rental.lead_source || rental.referral_source || "",
      rental.next_action || "",
      followUpDate,
      rental.latest_update || "",
      rental.budget || "",
      rental.quoted_fee || "",
      rental.agreed_fee || "",
      rental.contract_status || "",
      rental.contract_signed ? "Yes" : "No",
      rental.deposit_status || "",
      rental.deposit_due || rental.deposit_amount || "",
      rental.paid_to_date || "",
      rental.balance_due || "",
      paymentDueDate,
      rental.staffing_logistics || "",
      rental.open_questions || "",
      rental.client_folder_url || "",
      rental.lead_owner || ""
    ]];
    const targetRow = findPipelineRow(sheet, opportunityId) || Math.max(sheet.getLastRow() + 1, 2);
    sheet.getRange(targetRow, 1, 1, 30).setValues(rowValues);
    return pipelineJson({ success: true, row: targetRow });
  } catch (error) {
    return pipelineJson({ success: false, error: String(error && error.message || error) });
  }
}

function findPipelineRow(sheet, opportunityId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;
  const match = sheet.getRange(2, 1, lastRow - 1, 1)
    .createTextFinder(opportunityId)
    .matchEntireCell(true)
    .findNext();
  return match ? match.getRow() : null;
}

function pipelineJson(value) {
  return ContentService.createTextOutput(JSON.stringify(value))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Trigger: On Edit (or run manually to sync all rows).
 * Automatically detects whether the edit is on the 'Events' or 'Outreach /Leads' sheet!
 */
function onEdit(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  if (row <= 1) return; // Skip headers

  if (isOutreachSheet(sheet)) {
    syncOutreachLeadRow(sheet, row);
  } else {
    syncRowToSupabase(sheet, row);
  }
}

/**
 * Returns true if this sheet is the Outreach / Leads tab, either by name or by tab ID (gid).
 */
function isOutreachSheet(sheet) {
  if (!sheet) return false;
  try {
    if (sheet.getSheetId && sheet.getSheetId() === 1576425752) return true;
  } catch (err) {}
  const name = (sheet.getName() || "").toLowerCase();
  return name.indexOf("lead") !== -1 || name.indexOf("outreach") !== -1;
}

function syncAllRows() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  Logger.log("Found " + sheets.length + " sheet tabs in spreadsheet.");

  for (let s = 0; s < sheets.length; s++) {
    const sheet = sheets[s];
    const sheetName = sheet.getName();
    const sheetGid = sheet.getSheetId ? sheet.getSheetId() : "unknown";
    const lastRow = sheet.getLastRow();
    Logger.log("Scanning tab: '" + sheetName + "' (gid=" + sheetGid + "), rows: " + lastRow);

    if (isOutreachSheet(sheet)) {
      Logger.log("--> Backfilling Outreach / Leads sheet: " + sheetName);
      for (let r = 2; r <= lastRow; r++) {
        syncOutreachLeadRow(sheet, r);
        Utilities.sleep(100);
      }
    } else {
      Logger.log("--> Backfilling Events / Pipeline sheet: " + sheetName);
      for (let r = 2; r <= lastRow; r++) {
        syncRowToSupabase(sheet, r);
        Utilities.sleep(100);
      }
    }
  }
}

/**
 * Dedicated runner to sync ONLY the Outreach / Leads sheet directly!
 * You can select 'syncOutreachSheetOnly' in the Apps Script function dropdown and click Run.
 */
function syncOutreachSheetOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let outreachSheet = null;

  // Try finding by gid 1576425752 first
  const sheets = ss.getSheets();
  for (let i = 0; i < sheets.length; i++) {
    if (isOutreachSheet(sheets[i])) {
      outreachSheet = sheets[i];
      break;
    }
  }

  if (!outreachSheet) {
    Logger.log("ERROR: Could not find Outreach / Leads sheet by name or gid!");
    return;
  }

  const lastRow = outreachSheet.getLastRow();
  Logger.log("Syncing Outreach sheet '" + outreachSheet.getName() + "', total rows: " + lastRow);
  for (let r = 2; r <= lastRow; r++) {
    syncOutreachLeadRow(outreachSheet, r);
    Utilities.sleep(100);
  }
  Logger.log("Outreach sync finished!");
}

function syncOutreachLeadRow(sheet, rowNumber) {
  try {
    const range = sheet.getRange(rowNumber, 1, 1, 14);
    const row = range.getValues()[0];
    const richTexts = range.getRichTextValues()[0];

    const leadId = String(row[0] || "").trim(); // Col A: ID
    if (!leadId || leadId.toLowerCase() === "id") return;

    const org = String(row[1] || "").trim(); // Col B: Organization / prospect
    if (!org) {
      Logger.log("Row " + rowNumber + " has ID " + leadId + " but no Organization name. Skipping.");
      return;
    }

    const category = String(row[2] || "").trim(); // Col C: Category
    const status = String(row[3] || "New").trim(); // Col D: Status
    const contact = String(row[4] || "").trim(); // Col E: Contact
    const email = String(row[5] || "").trim(); // Col F: Email
    const phone = String(row[6] || "").trim(); // Col G: Phone
    const offer = String(row[7] || "").trim(); // Col H: Offer / purpose
    const nextAction = String(row[8] || "").trim(); // Col I: Next action
    const followUpRaw = row[9]; // Col J: Follow-up date
    const lastContactRaw = row[10]; // Col K: Last contact
    const notes = String(row[11] || "").trim(); // Col L: Notes

    // Col M: Website / document (extract link URL if present)
    let website = "";
    if (richTexts && richTexts[12]) {
      website = richTexts[12].getLinkUrl() || "";
    }
    if (!website) {
      website = String(row[12] || "").trim();
    }

    const owner = String(row[13] || "").trim(); // Col N: Owner

    const payload = {
      sheet_lead_id: leadId,
      organization_name: org,
      category: category,
      status: status,
      contact_name: contact,
      contact_email: email,
      contact_phone: phone,
      offer_purpose: offer,
      next_action: nextAction,
      notes: notes,
      website_url: website,
      owner: owner,
      updated_at: new Date().toISOString()
    };

    if (followUpRaw instanceof Date) {
      payload.follow_up_date = followUpRaw.toISOString().slice(0, 10);
    } else if (followUpRaw && !isNaN(Date.parse(followUpRaw))) {
      payload.follow_up_date = new Date(followUpRaw).toISOString().slice(0, 10);
    }

    if (lastContactRaw instanceof Date) {
      payload.last_contact_date = lastContactRaw.toISOString().slice(0, 10);
    } else if (lastContactRaw && !isNaN(Date.parse(lastContactRaw))) {
      payload.last_contact_date = new Date(lastContactRaw).toISOString().slice(0, 10);
    }

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/crm_outreach_leads?on_conflict=sheet_lead_id", options);
    Logger.log("Outreach row " + rowNumber + " synced: " + response.getContentText());
  } catch (err) {
    Logger.log("Error syncing outreach row " + rowNumber + ": " + err.toString());
  }
}

function syncRowToSupabase(sheet, rowNumber) {
  try {
    const range = sheet.getRange(rowNumber, 1, 1, 30);
    const row = range.getValues()[0];
    const richTexts = range.getRichTextValues()[0];

    const oppId = String(row[0] || "").trim(); // Col A: ID
    if (!oppId || oppId.toLowerCase() === "id" || oppId.toLowerCase().indexOf("source:") !== -1) {
      return; // Skip headers, descriptions, blank title rows
    }

    const oppName = String(row[1] || "").trim(); // Col B: Client / opportunity
    const status = String(row[2] || "inquiry").trim().toLowerCase().replace(/\\s+/g, '_'); // Col C: Status
    const eventType = String(row[3] || "Corporate Event").trim(); // Col D: Event type
    const eventDateRaw = row[4]; // Col E: Event date
    const dateTimeDetails = String(row[5] || "").trim(); // Col F: Date / time details
    const facilitatorsPlanned = parseInt(row[6], 10) || null; // Col G: # of Facilitators
    const guestsCrew = String(row[7] || "").trim(); // Col H: Guests / crew
    const locationSpaces = String(row[8] || "").trim(); // Col I: Location / spaces
    const contactName = String(row[9] || oppName || "Unknown Client").trim(); // Col J: Contact
    const email = String(row[10] || "no-email-provided@jtf.internal").trim(); // Col K: Email
    const phone = String(row[11] || "").trim(); // Col L: Phone
    const leadSource = String(row[12] || "").trim(); // Col M: Lead source
    const nextAction = String(row[13] || "").trim(); // Col N: Next action
    const followUpDateRaw = row[14]; // Col O: Follow-up date
    const latestUpdate = String(row[15] || "").trim(); // Col P: Latest update
    const budget = parseFloat(String(row[16] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col Q
    const quotedFee = parseFloat(String(row[17] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col R
    const agreedFee = parseFloat(String(row[18] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col S
    const contractStatus = String(row[19] || "").trim(); // Col T: Contract status
    const contractSigned = String(row[20] || "").trim().toLowerCase() === "yes" || String(row[20] || "").trim().toLowerCase() === "true"; // Col U
    const depositStatus = String(row[21] || "").trim(); // Col V: Deposit status
    const depositDue = parseFloat(String(row[22] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col W
    const paidToDate = parseFloat(String(row[23] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col X
    const balance = parseFloat(String(row[24] || 0).replace(/[^0-9.-]+/g, "")) || 0; // Col Y
    const paymentDueRaw = row[25]; // Col Z: Payment due
    const staffingLogistics = String(row[26] || "").trim(); // Col AA
    const openQuestions = String(row[27] || "").trim(); // Col AB

    // Col AC: Client folder link (extract rich text hyperlink if present, otherwise cell value)
    let clientFolder = "";
    if (richTexts && richTexts[28]) {
      clientFolder = richTexts[28].getLinkUrl() || "";
    }
    if (!clientFolder) {
      clientFolder = String(row[28] || "").trim();
    }

    const owner = String(row[29] || "").trim(); // Col AD: Owner

    if (!oppId && !oppName && !contactName) return;

    let eventStart = new Date();
    if (eventDateRaw instanceof Date) {
      eventStart = eventDateRaw;
    } else if (eventDateRaw && !isNaN(Date.parse(eventDateRaw))) {
      eventStart = new Date(eventDateRaw);
    }
    const eventEnd = new Date(eventStart.getTime() + 4 * 60 * 60 * 1000);

    const payload = {
      sheet_opportunity_id: oppId || ("OPP-" + rowNumber),
      opportunity_name: oppName,
      organization_name: oppName,
      contact_name: contactName,
      contact_email: email,
      contact_phone: phone,
      event_type: eventType,
      date_time_details: dateTimeDetails,
      facilitators_planned: facilitatorsPlanned,
      guests_crew_notes: guestsCrew,
      location_spaces: locationSpaces,
      lead_owner: owner,
      lead_source: leadSource,
      referral_source: leadSource,
      next_action: nextAction,
      latest_update: latestUpdate,
      budget: budget,
      quoted_fee: quotedFee,
      agreed_fee: agreedFee,
      rental_rate: agreedFee || quotedFee,
      contract_status: contractStatus,
      contract_signed: contractSigned,
      deposit_status: depositStatus,
      deposit_due: depositDue,
      deposit_amount: depositDue,
      deposit_paid: depositStatus.toLowerCase().indexOf("paid") !== -1 || depositStatus.toLowerCase().indexOf("received") !== -1,
      paid_to_date: paidToDate,
      balance_due: balance,
      staffing_logistics: staffingLogistics,
      open_questions: openQuestions,
      client_folder_url: clientFolder,
      status: status || "inquiry",
      event_start: eventStart.toISOString(),
      event_end: eventEnd.toISOString(),
      insurance_cert_on_file: false,
    };

    if (followUpDateRaw instanceof Date) {
      payload.follow_up_date = followUpDateRaw.toISOString().slice(0, 10);
    }
    if (paymentDueRaw instanceof Date) {
      payload.payment_due_date = paymentDueRaw.toISOString().slice(0, 10);
    }

    const options = {
      method: "post",
      contentType: "application/json",
      headers: {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + SUPABASE_ANON_KEY,
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(SUPABASE_URL + "/rest/v1/venue_rentals?on_conflict=sheet_opportunity_id", options);
    Logger.log("Row " + rowNumber + " synced: " + response.getContentText());
  } catch (err) {
    Logger.log("Error syncing row " + rowNumber + ": " + err.toString());
  }
}
`;

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'app' | 'show_types' | 'integrations' | 'squarespace'>('show_types');
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [draftValues, setDraftValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Show types state
  const [showTypes, setShowTypes] = useState<ShowTypes[]>([]);
  const [draftShowTypes, setDraftShowTypes] = useState<Record<number, string>>({});
  const [savingShowTypeId, setSavingShowTypeId] = useState<number | null>(null);
  const [newShowTypeName, setNewShowTypeName] = useState('');
  const [isAddingShowType, setIsAddingShowType] = useState(false);

  // Script code modal / drawer state
  const [activeScriptModal, setActiveScriptModal] = useState<'rental' | 'contact' | 'pipeline' | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const [appRes, showTypesRes] = await Promise.all([
        supabaseService.getAppSettings(),
        supabaseService.getAllShowTypes(),
      ]);

      if (appRes.success && appRes.data) {
        const sorted = [...appRes.data].sort((a, b) => a.setting_key.localeCompare(b.setting_key));
        setSettings(sorted);
        const nextDrafts: Record<string, string> = {};
        sorted.forEach((row) => {
          nextDrafts[row.setting_key] = row.setting_value;
        });
        setDraftValues(nextDrafts);
      } else if (appRes.error) {
        setMessage({ type: 'error', text: appRes.error });
      }

      if (showTypesRes.success && showTypesRes.data) {
        setShowTypes(showTypesRes.data);
        const drafts: Record<number, string> = {};
        showTypesRes.data.forEach((st) => {
          drafts[st.ShowTypeID] = st.ShowTypeName;
        });
        setDraftShowTypes(drafts);
      }
    } catch {
      setMessage({ type: 'error', text: 'Unexpected error while loading settings.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const hasChanges = useMemo(() => {
    return settings.some((row) => String(draftValues[row.setting_key] ?? '') !== String(row.setting_value ?? ''));
  }, [draftValues, settings]);

  const handleValueChange = (key: string, value: string) => {
    setDraftValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveRow = async (setting: AppSetting) => {
    const nextValue = String(draftValues[setting.setting_key] ?? '').trim();
    if (!nextValue) {
      setMessage({ type: 'error', text: `${setting.setting_key} cannot be empty.` });
      return;
    }

    setSavingKey(setting.setting_key);
    setMessage(null);
    try {
      const response = await supabaseService.updateAppSetting(setting.setting_key, nextValue);
      if (!response.success) {
        setMessage({ type: 'error', text: response.error || `Failed to update ${setting.setting_key}.` });
        return;
      }

      setSettings((prev) => prev.map((row) => (
        row.setting_key === setting.setting_key
          ? { ...row, setting_value: nextValue, updated_at: new Date().toISOString() }
          : row
      )));
      setMessage({ type: 'success', text: `${setting.setting_key} updated.` });
    } catch {
      setMessage({ type: 'error', text: `Unexpected error while updating ${setting.setting_key}.` });
    } finally {
      setSavingKey(null);
    }
  };

  // Show Type Handlers
  const handleShowTypeNameChange = (id: number, val: string) => {
    setDraftShowTypes((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveShowType = async (st: ShowTypes) => {
    const nextVal = String(draftShowTypes[st.ShowTypeID] ?? '').trim();
    if (!nextVal) {
      setMessage({ type: 'error', text: 'Show type name cannot be empty.' });
      return;
    }

    setSavingShowTypeId(st.ShowTypeID);
    setMessage(null);
    try {
      const res = await supabaseService.updateShowType(st.ShowTypeID, nextVal);
      if (!res.success) {
        setMessage({ type: 'error', text: res.error || 'Failed to update show type.' });
        return;
      }

      setShowTypes((prev) =>
        prev.map((item) =>
          item.ShowTypeID === st.ShowTypeID ? { ...item, ShowTypeName: nextVal } : item
        )
      );
      setMessage({ type: 'success', text: `Show type updated to "${nextVal}".` });
    } catch {
      setMessage({ type: 'error', text: 'Error updating show type.' });
    } finally {
      setSavingShowTypeId(null);
    }
  };

  const handleAddShowType = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newShowTypeName.trim();
    if (!name) return;

    setIsAddingShowType(true);
    setMessage(null);
    try {
      const res = await supabaseService.createShowType(name);
      if (!res.success || !res.data) {
        setMessage({ type: 'error', text: res.error || 'Failed to add show type.' });
        return;
      }

      setShowTypes((prev) => [...prev, res.data!]);
      setDraftShowTypes((prev) => ({ ...prev, [res.data!.ShowTypeID]: res.data!.ShowTypeName }));
      setNewShowTypeName('');
      setMessage({ type: 'success', text: `Added new show type "${name}".` });
    } catch {
      setMessage({ type: 'error', text: 'Error creating show type.' });
    } finally {
      setIsAddingShowType(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading settings..." />;
  }

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <div className="mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure show types, event alignment names, and application parameters.
          </p>
        </div>
        <button
          onClick={loadData}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 font-medium"
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('show_types')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'show_types'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🎭</span> Show Types & Names
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-mono">
            {showTypes.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('app')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'app'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>⚙️</span> App System Values
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'integrations'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>📊</span> Google Sheets & Webhooks
        </button>
        <button
          onClick={() => setActiveTab('squarespace')}
          className={`pb-3 text-sm font-semibold transition-colors flex items-center gap-2 ${
            activeTab === 'squarespace'
              ? 'border-b-2 border-primary-600 text-primary-600'
              : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>🌐</span> Squarespace Widgets
        </button>
      </div>

      {message && (
        <div className="mb-4">
          <Message
            type={message.type}
            message={message.text}
            onClose={() => setMessage(null)}
          />
        </div>
      )}

      {/* TAB 1: SHOW TYPES & NAMES */}
      {activeTab === 'show_types' && (
        <div className="space-y-6">
          <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs text-blue-900 leading-relaxed">
            <p className="font-bold text-sm mb-1 text-blue-950 flex items-center gap-1.5">
              <span>💡</span> Event Matching & Sync Guidance
            </p>
            When syncing tickets from <strong>Eventbrite</strong>, <strong>TicketWeb</strong>, or <strong>Square Door POS</strong> on nights with multiple shows (such as an early and late show), the system matches by date, show time, and these show names. Make sure your show names below align with what you list on Eventbrite (e.g. <em>Friday Night Live</em>, <em>The BIG Show</em>, <em>¡Dale! Impro</em>, <em>Death Match</em>).
          </div>

          {/* Add New Show Type Form */}
          <form
            onSubmit={handleAddShowType}
            className="flex flex-col sm:flex-row gap-3 p-4 bg-white border border-gray-200 rounded-xl shadow-xs"
          >
            <input
              type="text"
              value={newShowTypeName}
              onChange={(e) => setNewShowTypeName(e.target.value)}
              placeholder="Add new show name (e.g. Saturday Late Show, Harold Night)..."
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
            />
            <button
              type="submit"
              disabled={isAddingShowType || !newShowTypeName.trim()}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {isAddingShowType ? 'Adding...' : '+ Add Show Type'}
            </button>
          </form>

          {/* Show Types List */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-sm">Active Show Types</h2>
              <span className="text-xs text-gray-400">Edit any name and click Save to update</span>
            </div>
            <div className="divide-y divide-gray-100">
              {showTypes.map((st) => {
                const draft = draftShowTypes[st.ShowTypeID] ?? st.ShowTypeName;
                const isDirty = draft.trim() !== st.ShowTypeName.trim();
                const isSaving = savingShowTypeId === st.ShowTypeID;

                return (
                  <div
                    key={st.ShowTypeID}
                    className="p-3 sm:p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 hover:bg-gray-50/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-xs font-mono text-gray-400 w-8">
                        #{st.ShowTypeID}
                      </span>
                      <input
                        type="text"
                        value={draft}
                        onChange={(e) => handleShowTypeNameChange(st.ShowTypeID, e.target.value)}
                        className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => handleSaveShowType(st)}
                        disabled={isSaving || !isDirty}
                        className="rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isSaving ? 'Saving...' : 'Save Name'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SYSTEM CONFIGURATION VALUES */}
      {activeTab === 'app' && (
        <div className="space-y-3">
          {settings.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-gray-500">
              No settings rows found.
            </div>
          ) : (
            settings.map((setting) => {
              const isSaving = savingKey === setting.setting_key;
              const currentValue = String(draftValues[setting.setting_key] ?? '');
              const isDirty = currentValue !== String(setting.setting_value ?? '');
              return (
                <section key={setting.setting_key} className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
                  <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                    <div className="flex-1">
                      <label className="mb-1 block text-sm font-semibold text-gray-800">{setting.setting_key}</label>
                      <input
                        type="number"
                        value={currentValue}
                        onChange={(event) => handleValueChange(setting.setting_key, event.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                      />
                      <p className="mt-1 text-xs text-gray-500">{setting.description || 'No description provided.'}</p>
                    </div>
                    <button
                      onClick={() => handleSaveRow(setting)}
                      disabled={isSaving || !isDirty}
                      className="min-h-[40px] rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </section>
              );
            })
          )}

          <div className="pt-1 text-xs text-gray-500">
            {hasChanges ? 'You have unsaved changes.' : 'All system values are up to date.'}
          </div>
        </div>
      )}

      {/* TAB 3: GOOGLE SHEETS & INQUIRY INTEGRATIONS */}
      {activeTab === 'integrations' && (
        <div className="space-y-6">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 leading-relaxed space-y-2">
            <p className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <span>📋</span> Connected Google Sheets Reference
            </p>
            <p>
              When web visitors fill out the Corporate Rental form or Contact form on the public website, their submissions are captured in your Google Sheets and immediately posted into the Team Management Portal.
            </p>
            <p>
              If you ever replace or recreate either Google Sheet, paste the new Sheet ID or URL here to keep your records updated. Then open the new Sheet, go to <strong>Extensions &rarr; Apps Script</strong>, and paste the webhook script.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Rental Sheet Card */}
            {(() => {
              const rentalSetting = settings.find((s) => s.setting_key === 'google_sheet_rental_inquiries_id');
              const currentId = draftValues['google_sheet_rental_inquiries_id'] ?? rentalSetting?.setting_value ?? '';
              const isSaving = savingKey === 'google_sheet_rental_inquiries_id';
              const isDirty = currentId !== (rentalSetting?.setting_value ?? '');

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        🏢 Rental & Corporate Gigs Sheet
                      </span>
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Destination CRM Table: <code className="text-slate-800 font-mono">venue_rentals</code>
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Google Sheet ID or Full URL:
                      </label>
                      <input
                        type="text"
                        value={currentId}
                        onChange={(e) => {
                          const val = e.target.value.includes('/d/')
                            ? e.target.value.split('/d/')[1].split('/')[0]
                            : e.target.value;
                          handleValueChange('google_sheet_rental_inquiries_id', val);
                        }}
                        placeholder="e.g. 10teUHafSmhCu6vofiY9T_RlDYTILFMOxmMjYwH2D_KM"
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {currentId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${currentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                      >
                        🔗 Open Rental Sheet in Google Drive &rarr;
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveScriptModal('rental')}
                      className="flex-1 rounded-lg border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      📜 View Apps Script
                    </button>
                    <button
                      onClick={() => rentalSetting && handleSaveRow(rentalSetting)}
                      disabled={isSaving || !isDirty}
                      className="flex-1 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Update Sheet ID'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Contact Inquiries Sheet Card */}
            {(() => {
              const contactSetting = settings.find((s) => s.setting_key === 'google_sheet_contact_inquiries_id');
              const currentId = draftValues['google_sheet_contact_inquiries_id'] ?? contactSetting?.setting_value ?? '';
              const isSaving = savingKey === 'google_sheet_contact_inquiries_id';
              const isDirty = currentId !== (contactSetting?.setting_value ?? '');

              return (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        📬 Contact Inquiries Sheet
                      </span>
                      <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full">
                        Live Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      Destination CRM Table: <code className="text-slate-800 font-mono">communication_logs</code>
                    </p>
                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Google Sheet ID or Full URL:
                      </label>
                      <input
                        type="text"
                        value={currentId}
                        onChange={(e) => {
                          const val = e.target.value.includes('/d/')
                            ? e.target.value.split('/d/')[1].split('/')[0]
                            : e.target.value;
                          handleValueChange('google_sheet_contact_inquiries_id', val);
                        }}
                        placeholder="e.g. 1fbrKTcjTVTiKIyLwHpZk8OrDDxtj64pU0ujd_85Eqvs"
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    {currentId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${currentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline pt-1"
                      >
                        🔗 Open Contact Sheet in Google Drive &rarr;
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveScriptModal('contact')}
                      className="flex-1 rounded-lg border border-slate-300 bg-slate-50 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                    >
                      📜 View Apps Script
                    </button>
                    <button
                      onClick={() => contactSetting && handleSaveRow(contactSetting)}
                      disabled={isSaving || !isDirty}
                      className="flex-1 rounded-lg bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Update Sheet ID'}
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Rental & Opportunity Working Pipeline Tracker Sheet Card */}
            {(() => {
              const pipelineSetting = settings.find((s) => s.setting_key === 'google_sheet_rental_pipeline_id');
              const currentId = draftValues['google_sheet_rental_pipeline_id'] ?? pipelineSetting?.setting_value ?? '';
              const isSaving = savingKey === 'google_sheet_rental_pipeline_id';
              const isDirty = currentId !== (pipelineSetting?.setting_value ?? '');

              const writebackSetting = settings.find((s) => s.setting_key === 'enable_rental_sheet_writeback');
              const isWritebackActive = (draftValues['enable_rental_sheet_writeback'] ?? writebackSetting?.setting_value ?? 'false') === 'true';
              const isSavingWriteback = savingKey === 'enable_rental_sheet_writeback';

              return (
                <div className="bg-white border-2 border-indigo-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between md:col-span-2">
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                          📊 Deal / Opportunity Pipeline Working Tracker
                        </span>
                        <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                          Working Environment
                        </span>
                      </div>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-semibold text-slate-700">Write-back to Sheet:</span>
                        <button
                          type="button"
                          disabled={isSavingWriteback}
                          onClick={async () => {
                            const nextVal = isWritebackActive ? 'false' : 'true';
                            setSavingKey('enable_rental_sheet_writeback');
                            setMessage(null);
                            try {
                              handleValueChange('enable_rental_sheet_writeback', nextVal);
                              const response = await supabaseService.updateAppSetting('enable_rental_sheet_writeback', nextVal);
                              if (!response.success) {
                                setMessage({ type: 'error', text: response.error || 'Failed to update write-back setting.' });
                                handleValueChange('enable_rental_sheet_writeback', isWritebackActive ? 'true' : 'false');
                                return;
                              }
                              setSettings((prev) =>
                                prev.map((row) =>
                                  row.setting_key === 'enable_rental_sheet_writeback'
                                    ? { ...row, setting_value: nextVal, updated_at: new Date().toISOString() }
                                    : row
                                )
                              );
                              setMessage({
                                type: 'success',
                                text: `Rental Pipeline Sheet write-back is now ${nextVal === 'true' ? 'ENABLED' : 'DISABLED'}.`,
                              });
                            } catch (err: any) {
                              setMessage({ type: 'error', text: err?.message || 'Error updating write-back setting.' });
                              handleValueChange('enable_rental_sheet_writeback', isWritebackActive ? 'true' : 'false');
                            } finally {
                              setSavingKey(null);
                            }
                          }}
                          className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                            isWritebackActive ? 'bg-indigo-600' : 'bg-slate-300'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                              isWritebackActive ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span className={`text-[11px] font-bold ${isWritebackActive ? 'text-indigo-700' : 'text-slate-500'}`}>
                          {isWritebackActive ? 'ENABLED' : 'DISABLED (Read/Sync Only)'}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">
                      Tracks deals from the shared pipeline sheet. Portal additions, edits, and removals sync to the sheet only after the protected Apps Script endpoint and Supabase Edge Function are deployed and write-back is enabled.
                    </p>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Working Google Sheet ID or Full URL:
                      </label>
                      <input
                        type="text"
                        value={currentId}
                        onChange={(e) => {
                          const val = e.target.value.includes('/d/')
                            ? e.target.value.split('/d/')[1].split('/')[0]
                            : e.target.value;
                          handleValueChange('google_sheet_rental_pipeline_id', val);
                        }}
                        placeholder="e.g. 1W4xaUVlFaOs23sjlPYD5K5dEaotEvK9RONE4gfQNBzQ"
                        className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                    {currentId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${currentId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline pt-1"
                      >
                        🔗 Open Opportunity Tracking Sheet in Google Drive &rarr;
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-indigo-100">
                    <button
                      type="button"
                      onClick={() => setActiveScriptModal('pipeline')}
                      className="flex-1 rounded-lg border border-indigo-300 bg-indigo-50 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                    >
                      📜 View Pipeline Apps Script (Install in Sheet)
                    </button>
                    <button
                      onClick={() => pipelineSetting && handleSaveRow(pipelineSetting)}
                      disabled={isSaving || !isDirty}
                      className="flex-1 rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isSaving ? 'Saving...' : 'Update Pipeline Sheet ID'}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 4: SQUARESPACE EMBEDDABLE WIDGETS */}
      {activeTab === 'squarespace' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-xs text-emerald-900 leading-relaxed space-y-2">
            <p className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
              <span>🎟️</span> Squarespace Public Website Integration
            </p>
            <p>
              Display your live theater schedule on Squarespace without duplicate entry! When you publish a season or sync Eventbrite tickets, these widgets automatically refresh on your website.
            </p>
            <ul className="list-disc list-inside space-y-1 text-emerald-800">
              <li><strong>Authoritative Eventbrite Sync:</strong> If an event matches Eventbrite, the direct ticket purchase link is automatically featured. If an event or class is internal or not on Eventbrite, it displays cleanly with venue details.</li>
              <li><strong>Zero Maintenance:</strong> Self-contained vanilla JS & CSS widgets with no external dependencies or npm builds required on Squarespace. Works inside any Squarespace <em>Code Block</em>.</li>
              <li><strong>Fast & Secure:</strong> Uses read-only Supabase RPC endpoints (<code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">get_public_upcoming_shows</code> & <code className="font-mono bg-emerald-100 px-1 py-0.5 rounded">get_public_upcoming_classes</code>). Internal notes, cast pay, and financial data are never exposed.</li>
            </ul>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Widget 1: Upcoming Shows */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎭</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Upcoming Shows Widget</h3>
                      <p className="text-[11px] text-slate-500">For your Squarespace <code className="font-mono bg-slate-100 px-1 rounded">/shows</code> page</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                    Shows & Tickets
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Renders responsive show cards with date, time, stage, show format, and a direct <strong>Get Tickets</strong> button linked to Eventbrite.
                </p>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">Preview Layout:</span>
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">Friday Night Live (Main Stage)</div>
                        <div className="text-[11px] text-slate-500">📅 Friday • 9:00 PM • Main Stage</div>
                      </div>
                      <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                        🎟️ Get Tickets
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 italic text-center">
                      + Auto-populates from database in real time
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Squarespace Embed Code (HTML/JS):
                  </label>
                  <textarea
                    readOnly
                    rows={6}
                    value={`<!-- JTF Upcoming Shows Squarespace Widget -->
<div id="jtf-shows-widget" style="max-width:800px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
  <div id="jtf-shows-loading" style="text-align:center;padding:24px;color:#666;">Loading upcoming performances...</div>
  <div id="jtf-shows-list" style="display:grid;gap:16px;"></div>
</div>
<script>
(async function() {
  const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_public_upcoming_shows", {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ limit_count: 20, include_internal: true })
    });
    const shows = await res.json();
    const loading = document.getElementById("jtf-shows-loading");
    const container = document.getElementById("jtf-shows-list");
    if (!shows || shows.length === 0) {
      loading.innerHTML = "<p style='color:#777;padding:20px;'>No upcoming shows currently scheduled. Check back soon!</p>";
      return;
    }
    loading.style.display = "none";
    container.innerHTML = shows.map(s => {
      const dateStr = new Date(s.show_date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = s.show_time ? s.show_time.slice(0, 5) : "8:00 PM";
      const ticketBtn = s.ticket_url ? 
        \`<a href="\${s.ticket_url}" target="_blank" rel="noopener" style="display:inline-block;background:#e11d48;color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:13px;">🎟️ Get Tickets</a>\` : 
        \`<span style="display:inline-block;background:#f1f5f9;color:#64748b;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;">Box Office / At Door</span>\`;
      return \`<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="font-weight:700;font-size:16px;color:#0f172a;">\${s.show_type_name || 'Main Stage Show'}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">📅 \${dateStr} • \${timeStr} • 📍 \${s.venue || 'Main Stage'}</div>
        </div>
        <div>\${ticketBtn}</div>
      </div>\`;
    }).join("");
  } catch (e) {
    document.getElementById("jtf-shows-loading").innerText = "Unable to load schedule at this time.";
  }
})();
</script>`}
                    className="w-full text-[11px] font-mono bg-slate-900 text-slate-100 rounded-lg p-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const code = `<!-- JTF Upcoming Shows Squarespace Widget -->
<div id="jtf-shows-widget" style="max-width:800px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
  <div id="jtf-shows-loading" style="text-align:center;padding:24px;color:#666;">Loading upcoming performances...</div>
  <div id="jtf-shows-list" style="display:grid;gap:16px;"></div>
</div>
<script>
(async function() {
  const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_public_upcoming_shows", {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ limit_count: 20, include_internal: true })
    });
    const shows = await res.json();
    const loading = document.getElementById("jtf-shows-loading");
    const container = document.getElementById("jtf-shows-list");
    if (!shows || shows.length === 0) {
      loading.innerHTML = "<p style='color:#777;padding:20px;'>No upcoming shows currently scheduled. Check back soon!</p>";
      return;
    }
    loading.style.display = "none";
    container.innerHTML = shows.map(s => {
      const dateStr = new Date(s.show_date + "T00:00:00").toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      const timeStr = s.show_time ? s.show_time.slice(0, 5) : "8:00 PM";
      const ticketBtn = s.ticket_url ? 
        \`<a href="\${s.ticket_url}" target="_blank" rel="noopener" style="display:inline-block;background:#e11d48;color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:13px;">🎟️ Get Tickets</a>\` : 
        \`<span style="display:inline-block;background:#f1f5f9;color:#64748b;padding:8px 14px;border-radius:6px;font-size:12px;font-weight:600;">Box Office / At Door</span>\`;
      return \`<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="font-weight:700;font-size:16px;color:#0f172a;">\${s.show_type_name || 'Main Stage Show'}</div>
          <div style="font-size:13px;color:#64748b;margin-top:4px;">📅 \${dateStr} • \${timeStr} • 📍 \${s.venue || 'Main Stage'}</div>
        </div>
        <div>\${ticketBtn}</div>
      </div>\`;
    }).join("");
  } catch (e) {
    document.getElementById("jtf-shows-loading").innerText = "Unable to load schedule at this time.";
  }
})();
</script>`;
                    navigator.clipboard.writeText(code);
                    setCopiedKey('widget-shows');
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="w-full rounded-lg bg-purple-600 py-2.5 text-xs font-semibold text-white hover:bg-purple-700 transition-colors shadow-xs"
                >
                  {copiedKey === 'widget-shows' ? '✓ Copied to Clipboard!' : '📋 Copy Shows Widget Code'}
                </button>
              </div>
            </div>

            {/* Widget 2: Classes & Workshops */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎓</span>
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Classes & Workshops Widget</h3>
                      <p className="text-[11px] text-slate-500">For your Squarespace <code className="font-mono bg-slate-100 px-1 rounded">/classes</code> page</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-semibold uppercase px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    Conservatory
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  Renders upcoming 7-week conservatory cohorts and intensive workshops with start dates, run times, location, and registration status.
                </p>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                  <span className="text-xs font-semibold text-slate-700 block">Preview Layout:</span>
                  <div className="bg-white p-3 rounded border border-slate-200 shadow-2xs space-y-2">
                    <div className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="text-xs font-bold text-slate-900">IA1: Fundamentals of Improv</div>
                        <div className="text-[11px] text-slate-500">📅 Starts Sep 10 • Thursdays 7:30-10:00 PM • Main Stage</div>
                      </div>
                      <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                        Enroll Now
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 italic text-center">
                      + Auto-populates from database in real time
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 block">
                    Squarespace Embed Code (HTML/JS):
                  </label>
                  <textarea
                    readOnly
                    rows={6}
                    value={`<!-- JTF Upcoming Classes Squarespace Widget -->
<div id="jtf-classes-widget" style="max-width:800px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
  <div id="jtf-classes-loading" style="text-align:center;padding:24px;color:#666;">Loading upcoming conservatory courses...</div>
  <div id="jtf-classes-list" style="display:grid;gap:16px;"></div>
</div>
<script>
(async function() {
  const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_public_upcoming_classes", {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ limit_count: 20 })
    });
    const items = await res.json();
    const loading = document.getElementById("jtf-classes-loading");
    const container = document.getElementById("jtf-classes-list");
    if (!items || items.length === 0) {
      loading.innerHTML = "<p style='color:#777;padding:20px;'>No new classes currently open for enrollment. Check back soon!</p>";
      return;
    }
    loading.style.display = "none";
    container.innerHTML = items.map(c => {
      const startStr = new Date(c.start_date + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const tag = c.item_type === 'workshop' ? 
        '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">WORKSHOP</span>' : 
        '<span style="background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">7-WEEK COURSE</span>';
      return \`<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-weight:700;font-size:16px;color:#0f172a;">\${c.title}</span>
            \${tag}
          </div>
          <div style="font-size:13px;color:#64748b;">📅 Starts \${startStr} • \${c.meeting_days_or_time || 'Weekly'} • 📍 \${c.venue || 'Conservatory'}</div>
        </div>
        <div>
          <a href="/register" style="display:inline-block;background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:13px;">Enroll Now</a>
        </div>
      </div>\`;
    }).join("");
  } catch (e) {
    document.getElementById("jtf-classes-loading").innerText = "Unable to load courses at this time.";
  }
})();
</script>`}
                    className="w-full text-[11px] font-mono bg-slate-900 text-slate-100 rounded-lg p-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const code = `<!-- JTF Upcoming Classes Squarespace Widget -->
<div id="jtf-classes-widget" style="max-width:800px;margin:0 auto;font-family:system-ui,-apple-system,sans-serif;">
  <div id="jtf-classes-loading" style="text-align:center;padding:24px;color:#666;">Loading upcoming conservatory courses...</div>
  <div id="jtf-classes-list" style="display:grid;gap:16px;"></div>
</div>
<script>
(async function() {
  const SUPABASE_URL = "https://jsitpkzeszwwrgjfivbi.supabase.co";
  const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpzaXRwa3plc3p3d3JnamZpdmJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgwODk2MjUsImV4cCI6MjA5MzY2NTYyNX0.1j7-j7fO5KPvAk0xJe7CNbuQ5fwsH3lOriUK0qU8q1g";
  try {
    const res = await fetch(SUPABASE_URL + "/rest/v1/rpc/get_public_upcoming_classes", {
      method: "POST",
      headers: { "apikey": SUPABASE_ANON, "Authorization": "Bearer " + SUPABASE_ANON, "Content-Type": "application/json" },
      body: JSON.stringify({ limit_count: 20 })
    });
    const items = await res.json();
    const loading = document.getElementById("jtf-classes-loading");
    const container = document.getElementById("jtf-classes-list");
    if (!items || items.length === 0) {
      loading.innerHTML = "<p style='color:#777;padding:20px;'>No new classes currently open for enrollment. Check back soon!</p>";
      return;
    }
    loading.style.display = "none";
    container.innerHTML = items.map(c => {
      const startStr = new Date(c.start_date + "T00:00:00").toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const tag = c.item_type === 'workshop' ? 
        '<span style="background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">WORKSHOP</span>' : 
        '<span style="background:#e0f2fe;color:#0369a1;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;">7-WEEK COURSE</span>';
      return \`<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;box-shadow:0 1px 3px rgba(0,0,0,0.05);">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
            <span style="font-weight:700;font-size:16px;color:#0f172a;">\${c.title}</span>
            \${tag}
          </div>
          <div style="font-size:13px;color:#64748b;">📅 Starts \${startStr} • \${c.meeting_days_or_time || 'Weekly'} • 📍 \${c.venue || 'Conservatory'}</div>
        </div>
        <div>
          <a href="/register" style="display:inline-block;background:#2563eb;color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;text-decoration:none;font-size:13px;">Enroll Now</a>
        </div>
      </div>\`;
    }).join("");
  } catch (e) {
    document.getElementById("jtf-classes-loading").innerText = "Unable to load courses at this time.";
  }
})();
</script>`;
                    navigator.clipboard.writeText(code);
                    setCopiedKey('widget-classes');
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="w-full rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  {copiedKey === 'widget-classes' ? '✓ Copied to Clipboard!' : '📋 Copy Classes Widget Code'}
                </button>
              </div>
            </div>
          </div>

          {/* Squarespace How-To Guide Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <span>📖</span> How to Add to Squarespace (30 Seconds)
            </h4>
            <ol className="list-decimal list-inside text-xs text-slate-700 space-y-1.5 leading-relaxed">
              <li>Log into your <strong>Squarespace</strong> site editor and navigate to the page (e.g. <em>/shows</em> or <em>/classes</em>).</li>
              <li>Click <strong>Edit Page</strong> &rarr; <strong>Add Block</strong> (+) &rarr; select <strong>Code</strong>.</li>
              <li>Set the block format to <strong>HTML</strong> and ensure <em>Display Source</em> is turned OFF.</li>
              <li>Paste the widget code copied above into the code field and click <strong>Save / Publish</strong>.</li>
              <li>The widget will immediately pull live showtimes and Eventbrite links straight from your database whenever a visitor arrives!</li>
            </ol>
          </div>
        </div>
      )}

      {/* Script Copy/Paste Modal */}
      {activeScriptModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-slate-900">
                  {activeScriptModal === 'rental'
                    ? '🏢 Venue Rentals Apps Script'
                    : activeScriptModal === 'pipeline'
                    ? '📊 Opportunity Pipeline Tracker Apps Script'
                    : '📬 Contact Inquiries Apps Script'}
                </h3>
                <p className="text-xs text-slate-500">
                  Paste this in Google Sheets under <strong>Extensions &rarr; Apps Script</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveScriptModal(null)}
                className="text-slate-400 hover:text-slate-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 leading-relaxed">
                <strong>Setup Steps in Google Sheets:</strong>
                <ol className="list-decimal list-inside mt-1 space-y-0.5">
                  <li>In your Google Sheet, click <strong>Extensions &rarr; Apps Script</strong>.</li>
                  <li>Paste the code below into the code editor and press <strong>Save</strong>.</li>
                  {activeScriptModal === 'pipeline' ? (
                    <>
                      <li>Click <strong>Triggers</strong> (alarm clock icon ⏰ on left) &rarr; <strong>+ Add Trigger</strong>.</li>
                      <li>Select event source: <strong>From spreadsheet</strong>, event type: <strong>On edit</strong>, function: <strong>onEdit</strong>.</li>
                      <li><em>Optional:</em> Run <code>syncAllRows()</code> once in the editor to backfill existing rows immediately into the Portal.</li>
                      <li>In Apps Script <strong>Project Settings</strong>, add Script Property <code>JTF_PIPELINE_WEBHOOK_TOKEN</code> with a unique secret value.</li>
                      <li>Deploy &rarr; <strong>New deployment</strong> &rarr; <strong>Web app</strong>; execute as yourself, allow access to anyone, and copy the deployment URL.</li>
                      <li>From the Team Portal project, run <code>supabase functions deploy rental-sheet-bridge --project-ref jsitpkzeszwwrgjfivbi</code>.</li>
                      <li>Run <code>supabase secrets set GOOGLE_SHEETS_WEB_APP_URL="WEB_APP_URL" GOOGLE_SHEETS_WEBHOOK_TOKEN="SAME_TOKEN" --project-ref jsitpkzeszwwrgjfivbi</code>, replacing both values.</li>
                      <li>Enable write-back only after both deployments and secrets are configured. Portal adds, edits, and removals will then update the sheet.</li>
                    </>
                  ) : (
                    <>
                      <li>Click <strong>Triggers</strong> (alarm clock icon ⏰ on left) &rarr; <strong>+ Add Trigger</strong>.</li>
                      <li>Select event source: <strong>From spreadsheet</strong>, event type: <strong>On form submit</strong>, function: <strong>onFormSubmit</strong>.</li>
                    </>
                  )}
                </ol>
              </div>

              <div className="relative">
                <pre className="bg-slate-900 text-slate-100 p-4 rounded-lg text-xs font-mono overflow-x-auto max-h-72">
                  {activeScriptModal === 'rental'
                    ? rentalScriptSnippet
                    : activeScriptModal === 'pipeline'
                    ? pipelineSyncScriptSnippet
                    : contactScriptSnippet}
                </pre>
                <button
                  type="button"
                  onClick={() => {
                    const code =
                      activeScriptModal === 'rental'
                        ? rentalScriptSnippet
                        : activeScriptModal === 'pipeline'
                        ? pipelineSyncScriptSnippet
                        : contactScriptSnippet;
                    navigator.clipboard.writeText(code);
                    setCopiedKey(activeScriptModal);
                    setTimeout(() => setCopiedKey(null), 2500);
                  }}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                >
                  {copiedKey === activeScriptModal ? '✓ Copied!' : '📋 Copy Script'}
                </button>
              </div>
            </div>

            <div className="border-t pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveScriptModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
