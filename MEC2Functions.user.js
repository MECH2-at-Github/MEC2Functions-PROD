// ==UserScript==
// @name         mec2functions
// @namespace    http://github.com/MECH2-at-Github
// @description  Add functionality to MEC2 to improve navigation and workflow
// @author       MECH2
// @match        mec2.childcare.dhs.state.mn.us/*
// @version      0.3.8
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements */

'use strict';
// ====================================================================================================
// PRIMARY_NAVIGATION BUTTONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ====================================================================================================
// console.time('MEC2Functions')
document.getElementById('help')?.insertAdjacentHTML('afterend', '<span style="margin-left: 10px; color: var(--aLinkColor);">' + GM_info.script.name + ' v' + GM_info.script.version + '</span>')
let pageWrap = document.querySelector('#page-wrap')
let notEditMode = document.querySelectorAll('#page-wrap').length;
document.querySelector('.container:has(.line_mn_green)').insertAdjacentHTML('afterend', `
<div id="primaryNavigation" class="container primary-navigation">
    <div class="primary-navigation-row">
        <div id="buttonPanelOne">
        </div>
        <div id="buttonPanelOneNTF">
        </div>
    </div>
    <div class="primary-navigation-row">
        <div id="buttonPanelTwo">
        </div>
    </div>
    <div class="primary-navigation-row">
        <div id="buttonPanelThree">
        </div>
    </div>
    <div id="secondaryActionArea" class="button-container flex-horizontal db-container">
    </div>
</div>
`)
document.getElementsByClassName("line_mn_green")[0].id = "greenline"
try {
    if (notEditMode) {
        document.getElementById('primaryNavigation').before(pageWrap); pageWrap.classList.add('container')
    }
} catch(err) {console.trace()}
finally { document.documentElement.style.setProperty('--mainPanelMovedDown', '0') }
let buttonDivOne = document.getElementById('buttonPanelOne');
let buttonDivTwo = document.getElementById('buttonPanelTwo');
let buttonDivThree = document.getElementById('buttonPanelThree');
let searchIcon = "<span style='font-size: 80%'>🔍</span>"
let thisPageName = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1, window.location.pathname.lastIndexOf("."))
let thisPageNameHtm = thisPageName + ".htm"
let slashThisPageNameHtm = "/" + thisPageNameHtm
if (("Welcome.htm").includes(thisPageNameHtm)) {
    location.assign("Alerts.htm") //auto-redirect from Welcome to Alerts
}
let reviewingEligibility = ( thisPageNameHtm.indexOf("CaseEligibilityResult") > -1 && thisPageNameHtm.indexOf("CaseEligibilityResultSelection.htm") < 0 )

function fGetCaseParameters() {
    let caseTable = document.querySelectorAll('table#caseOrProviderAlertsTable').length ? [document.querySelector('table#caseOrProviderAlertsTable >tbody'), 3] : [document.querySelector('table >tbody'), 1]
    let parameter2alerts = caseTable[0].querySelector('tr > td:nth-of-type(2)') === null ? caseTable[0].querySelector('tr.selected > td:nth-of-type(' + caseTable[1] + ')')?.textContent : caseTable[0].querySelector('tr.selected > td:nth-of-type(' + caseTable[1] + ')')?.textContent
    let parameter3alerts = document.getElementById('periodBeginDate')?.value === undefined ? '' : '&parm3=' + document.getElementById('periodBeginDate')?.value.replace(/\//g, '') + document.getElementById('periodEndDate')?.value.replace(/\//g, '')
    return '?parm2=' + parameter2alerts + parameter3alerts
}
function fGetProviderParameters() {
    let providerTable = document.querySelectorAll('table#caseOrProviderAlertsTable').length ? [document.querySelector('table#caseOrProviderAlertsTable >tbody'), 3] : [document.querySelector('table#providerRegistrationTable >tbody'), 2]
    let parameter2alerts = providerTable[0].querySelector('tr > td:nth-of-type(2)') === null ? providerTable[0].querySelector('tr.selected > td:nth-of-type(' + providerTable[1] + ')')?.textContent : providerTable[0].querySelector('tr.selected > td:nth-of-type(' + providerTable[1] + ')')?.textContent
    return '?providerId=' + parameter2alerts
}

// ------------------------------------------------------------------------------------------------
//////////////////////////////// NAVIGATION BUTTONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ------------------------------------------------------------------------------------------------

//SECTION START Declaring navigation button arrays
const oRowOneButtons = { //Goto Buttons, objectGroupName: { buttonText: "Name as it appears on a button", gotoPage: "gotoPageName", opensIn: "_self or _blank", parentId: "Id of parent", buttonId: "Id of Button'],
    alerts: { buttonText: "Alerts", gotoPage: "Alerts", opensIn: "_self", parentId: "Alerts", buttonId: "AlertsSelf" },
    alertsPlus: { buttonText: "+", gotoPage: "Alerts", opensIn: "_blank", parentId: "Alerts", buttonId: "AlertsBlank" },
    notes: { buttonText: "Notes", gotoPage: "CaseNotes", opensIn: "_self", parentId: "Case Notes", buttonId: "CaseNotesSelf" },
    notesPlus: { buttonText: "+", gotoPage: "CaseNotes", opensIn: "_blank", parentId: "Case Notes", buttonId: "CaseNotesBlank" },
    overview: { buttonText: "Overview", gotoPage: "CaseOverview", opensIn: "_self", parentId: "Case Overview", buttonId: "CaseOverviewSelf" },
    overviewPlus: { buttonText: "+", gotoPage: "CaseOverview", opensIn: "_blank", parentId: "Case Overview", buttonId: "CaseOverviewBlank" },
    summary: { buttonText: "Summary", gotoPage: "CasePageSummary",opensIn: "_self", parentId: "Page Summary", buttonId: "CasePageSummarySelf" },
    clientSearch: { buttonText: "Client "+searchIcon, gotoPage: "ClientSearch", opensIn: "_self", parentId: "Client Search", buttonId: "ClientSearchSelf" },
    clientSearchPlus: { buttonText: "+", gotoPage: "ClientSearch", opensIn: "_blank", parentId: "Client Search", buttonId: "ClientSearchBlank" },
    providerSearch: { buttonText: "Provider "+searchIcon, gotoPage: "ProviderSearch", opensIn: "_self", parentId: "Provider Search", buttonId: "ProviderSearchSelf" },
    providerSearchPlus: { buttonText: "+", gotoPage: "ProviderSearch", opensIn: "_blank", parentId: "Provider Search", buttonId: "ProviderSearchBlank" },
    activeCaseList: { buttonText: "Active", gotoPage: "ActiveCaseList", opensIn: "_self", parentId: "Active Caseload List", buttonId: "ActiveCaseListSelf" },
    activeCaseListPlus: { buttonText: "+", gotoPage: "ActiveCaseList", opensIn: "_blank", parentId: "Active Caseload List", buttonId: "ActiveCaseListBlank" },
    pendingCaseList: { buttonText: "Pending", gotoPage: "PendingCaseList", opensIn: "_self", parentId: "Pending Case List", buttonId: "PendingCaseListSelf" },
    pendingCaseListPlus: { buttonText: "+", gotoPage: "PendingCaseList", opensIn: "_blank", parentId: "Pending Case List", buttonId: "PendingCaseListBlank" },
    inactiveCaseList: { buttonText: "Inactive", gotoPage: "InactiveCaseList", opensIn: "_self", parentId: "Inactive Case List", buttonId: "InactiveCaseListSelf" },
    inactiveCaseListPlus: { buttonText: "+", gotoPage: "InactiveCaseList", opensIn: "_blank", parentId: "Inactive Case List", buttonId: "InactiveCaseListBlank" },
    newApplication: { buttonText: "New App", gotoPage: "CaseApplicationInitiation",opensIn: "_self", parentId: "Case Application Initiation", buttonId: "NewAppSelf" },
    newApplicationPlus: { buttonText: "+", gotoPage: "CaseApplicationInitiation",opensIn: "_blank", parentId: "Case Application Initiation", buttonId: "NewAppBlank" },
};
const oRowTwoButtons = { //   Main Row (2nd row) buttons, { buttonText: "Name as it appears on a button", buttonId: "oRowTwoButtonsId" },
    member: { buttonText: "Member", buttonId: "memberMainButtons" },
    case: { buttonText: "Case", buttonId: "caseButtons" },
    activityIncome: { buttonText: "Activity and Income", buttonId: "activityIncomeButtons" },
    eligibility: { buttonText: "Eligibility", buttonId: "eligibilityButtons" },
    sa: { buttonText: "SA", buttonId: "saButtons" },
    notices: { buttonText: "Notices", buttonId: "noticesButtons" },
    providerInfo: { buttonText: "Provider Info", buttonId: "providerButtons" },
    providerNotices: { buttonText: "Provider Notices", buttonId: "providerNoticesButtons" },
    billing: { buttonText: "Billing", buttonId: "billingButtons" },
    csi: { buttonText: "CSI", buttonId: "csiButtons" },
    transfer: { buttonText: "Transfer", buttonId: "transferButtons" },
    claims: { buttonText: "Claims", buttonId: "claimsButtons" },
};

const oRowThreeButtons = {
    memberMainButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        caseMemberi: { buttonName: "Member I", pageWithoutDotHtm: "CaseMember", opensIn: "_self", parentId: "Member", buttonId: "CaseMemberSelf", rowTwoParent: "memberMainButtons"},
        caseMemberii: { buttonName: "Member II", pageWithoutDotHtm: "CaseMemberII", opensIn: "_self", parentId: "Member II", buttonId: "CaseMemberIISelf", rowTwoParent: "memberMainButtons"},
        caseParent: { buttonName: "Parent", pageWithoutDotHtm: "CaseParent", opensIn: "_self", parentId: "Parent", buttonId: "CaseParentSelf", rowTwoParent: "memberMainButtons"},
        caseCse: { buttonName: "CSE", pageWithoutDotHtm: "CaseCSE", opensIn: "_self", parentId: "Child Support Enforcement", buttonId: "CaseCSESelf", rowTwoParent: "memberMainButtons"},
        caseSchool: { buttonName: "School", pageWithoutDotHtm: "CaseSchool", opensIn: "_self", parentId: "School", buttonId: "CaseSchoolSelf", rowTwoParent: "memberMainButtons"},
        caseProvider: { buttonName: "Provider", pageWithoutDotHtm: "CaseChildProvider", opensIn: "_self", parentId: "Child Provider", buttonId: "CaseChildProviderSelf", rowTwoParent: "memberMainButtons"},
        caseSpecialNeeds: { buttonName: "Special Needs", pageWithoutDotHtm: "CaseSpecialNeeds", opensIn: "_self", parentId: "Special Needs", buttonId: "CaseSpecialNeedsSelf", rowTwoParent: "memberMainButtons"},
        caseDisability: { buttonName: "Disability", pageWithoutDotHtm: "CaseDisability", opensIn: "_self", parentId: "Disability", buttonId: "CaseDisabilitySelf", rowTwoParent: "memberMainButtons"},
        caseFraud: { buttonName: "Fraud", pageWithoutDotHtm: "CaseFraud", opensIn: "_self", parentId: "Case Fraud", buttonId: "CaseFraudSelf", rowTwoParent: "memberMainButtons"},
        caseImmigration: { buttonName: "Immigration", pageWithoutDotHtm: "CaseImmigration", opensIn: "_self", parentId: "Immigration", buttonId: "CaseImmigrationSelf", rowTwoParent: "memberMainButtons"},
        caseAlias: { buttonName: "Alias", pageWithoutDotHtm: "CaseAlias", opensIn: "_self", parentId: "Case Alias", buttonId: "CaseAliasSelf", rowTwoParent: "memberMainButtons"},
        caseRemoveMember: { buttonName: "Remove", pageWithoutDotHtm: "CaseRemoveMember", opensIn: "_self", parentId: "Remove a Member", buttonId: "CaseRemoveMemberSelf", rowTwoParent: "memberMainButtons"},
        caseMemberHistory: { buttonName: "History", pageWithoutDotHtm: "CaseMemberHistory", opensIn: "_self", parentId: "Member History", buttonId: "CaseMemberHistorySelf", rowTwoParent: "memberMainButtons"},
        caseMemberHistoryPlus: { buttonName: "+", pageWithoutDotHtm: "CaseMemberHistory", opensIn: "_blank", parentId: "Member History", buttonId: "CaseMemberHistoryBlank", rowTwoParent: "memberMainButtons"},
    },
    activityIncomeButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        caseEarnedIncome: { buttonName: "Earned", pageWithoutDotHtm: "CaseEarnedIncome", opensIn: "_self", parentId: "Earned Income", buttonId: "CaseEarnedIncomeSelf", rowTwoParent: "activityIncomeButtons"},
        caseUnearnedIncome: { buttonName: "Unearned", pageWithoutDotHtm: "CaseUnearnedIncome", opensIn: "_self", parentId: "Unearned Income", buttonId: "CaseUnearnedIncomeSelf", rowTwoParent: "activityIncomeButtons"},
        caseLumpSumIncome: { buttonName: "Lump Sum", pageWithoutDotHtm: "CaseLumpSum", opensIn: "_self", parentId: "Lump Sum", buttonId: "CaseLumpSumSelf", rowTwoParent: "activityIncomeButtons"},
        caseExpensesIncome: { buttonName: "Expenses", pageWithoutDotHtm: "CaseExpense", opensIn: "_self", parentId: "Expenses", buttonId: "CaseExpensesSelf", rowTwoParent: "activityIncomeButtons"},
        caseEducationActivity: { buttonName: "Education", pageWithoutDotHtm: "CaseEducationActivity", opensIn: "_self", parentId: "Education Activity", buttonId: "CaseEducationActivitySelf", rowTwoParent: "activityIncomeButtons"},
        caseEmploymentActivity: { buttonName: "Employment", pageWithoutDotHtm: "CaseEmploymentActivity", opensIn: "_self", parentId: "Employment Activity", buttonId: "CaseEmploymentActivitySelf", rowTwoParent: "activityIncomeButtons"},
        caseSupportActivity: { buttonName: "Support", pageWithoutDotHtm: "CaseSupportActivity", opensIn: "_self", parentId: "Support Activity", buttonId: "CaseSupportActivitySelf", rowTwoParent: "activityIncomeButtons"},
        caseJobSearchTracking: { buttonName: "Job Search", pageWithoutDotHtm: "CaseJobSearchTracking", opensIn: "_self", parentId: "Job Search Tracking", buttonId: "CaseJobSearchTrackingSelf", rowTwoParent: "activityIncomeButtons"},
    },
    caseButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        editSummary: { buttonName: "Edit Summary", pageWithoutDotHtm: "CaseEditSummary", opensIn: "_self", parentId: "Edit Summary", buttonId: "CaseEditSummarySelf", rowTwoParent: "caseButtons"},
        caseAddress: { buttonName: "Address", pageWithoutDotHtm: "CaseAddress", opensIn: "_self", parentId: "Case Address", buttonId: "CaseAddressSelf", rowTwoParent: "caseButtons"},
        caseAction: { buttonName: "Case Action", pageWithoutDotHtm: "CaseAction", opensIn: "_self", parentId: "Case Action", buttonId: "CaseActionSelf", rowTwoParent: "caseButtons"},
        caseFunding: { buttonName: "Funding Availability", pageWithoutDotHtm: "FundingAvailability", opensIn: "_self", parentId: "Funding Availability", buttonId: "FundingAvailabilitySelf", rowTwoParent: "caseButtons"},
        caseRedetermination: { buttonName: "Redetermination", pageWithoutDotHtm: "CaseRedetermination", opensIn: "_self", parentId: "Case Redetermination", buttonId: "CaseRedeterminationSelf", rowTwoParent: "caseButtons"},
        caseAppInfo: { buttonName: "Application Info", pageWithoutDotHtm: "ApplicationInformation", opensIn: "_self", parentId: "Case Application Info", buttonId: "CaseApplicationInfoSelf", rowTwoParent: "caseButtons"},
        caseReinstate: { buttonName: "Reinstate", pageWithoutDotHtm: "CaseReinstate", opensIn: "_self", parentId: "Reinstate", buttonId: "CaseReinstateSelf", rowTwoParent: "caseButtons"},
    },
    eligibilityButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        eligibilitySelection: { buttonName: "Selection", pageWithoutDotHtm: "CaseEligibilityResultSelection", opensIn: "_self", parentId: "Eligibility Results Selection", buttonId: "CaseEligibilityResultSelectionSelf", rowTwoParent: "eligibilityButtons"},
        eligibilityOverview: { buttonName: "Overview", pageWithoutDotHtm: "CaseEligibilityResultOverview", opensIn: "_self", parentId: "Results Overview", buttonId: "CaseEligibilityResultOverviewSelf", rowTwoParent: "eligibilityButtons"},
        eligibilityFamily: { buttonName: "Family", pageWithoutDotHtm: "CaseEligibilityResultFamily", opensIn: "_self", parentId: "Family Results", buttonId: "CaseEligibilityResultFamilySelf", rowTwoParent: "eligibilityButtons"},
        eligibilityPerson: { buttonName: "Person", pageWithoutDotHtm: "CaseEligibilityResultPerson", opensIn: "_self", parentId: "Person Results", buttonId: "CaseEligibilityResultPersonSelf", rowTwoParent: "eligibilityButtons"},
        eligibilityActivity: { buttonName: "Activity", pageWithoutDotHtm: "CaseEligibilityResultActivity", opensIn: "_self", parentId: "Activity Results", buttonId: "CaseEligibilityResultActivitySelf", rowTwoParent: "eligibilityButtons"},
        eligibilityFinancial: { buttonName: "Financial", pageWithoutDotHtm: "CaseEligibilityResultFinancial", opensIn: "_self", parentId: "Financial Results", buttonId: "CaseEligibilityResultFinancialSelf", rowTwoParent: "eligibilityButtons"},
        eligibilityApproval: { buttonName: "Approval", pageWithoutDotHtm: "CaseEligibilityResultApproval", opensIn: "_self", parentId: "Approval Results", buttonId: "CaseEligibilityResultApprovalSelf", rowTwoParent: "eligibilityButtons"},
        eligibilityCreateResults: { buttonName: "Create Eligibility Results", pageWithoutDotHtm: "CaseCreateEligibilityResults", opensIn: "_self", parentId: "Create Eligibility Results", buttonId: "CaseCreateEligibilityResultsSelf", rowTwoParent: "eligibilityButtons"},
    },
    saButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        saOverview: { buttonName: "Overview", pageWithoutDotHtm: "CaseServiceAuthorizationOverview", opensIn: "_self", parentId: "Service Authorization Overview", buttonId: "CaseServiceAuthorizationOverviewSelf", rowTwoParent: "saButtons"},
        saCopay: { buttonName: "Copay", pageWithoutDotHtm: "CaseCopayDistribution", opensIn: "_self", parentId: "Copay Distribution", buttonId: "CaseCopayDistributionSelf", rowTwoParent: "saButtons"},
        saApproval: { buttonName: "Approval", pageWithoutDotHtm: "CaseServiceAuthorizationApproval", opensIn: "_self", parentId: "Service Authorization Approval", buttonId: "CaseServiceAuthorizationApprovalSelf", rowTwoParent: "saButtons"},
        saCreateResults: { buttonName: "Create SA", pageWithoutDotHtm: "CaseCreateServiceAuthorizationResults", opensIn: "_self", parentId: "Create Service Authorization Results", buttonId: "CaseCreateServiceAuthorizationResultsSelf", rowTwoParent: "saButtons"},
    },
    csiButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        csiA: { buttonName: "CSIA", pageWithoutDotHtm: "CaseCSIA", opensIn: "_self", parentId: "CSIA", buttonId: "CSIAself", rowTwoParent: "csiButtons"},
        csiB: { buttonName: "CSIB", pageWithoutDotHtm: "CaseCSIB", opensIn: "_self", parentId: "CSIB", buttonId: "CSIBself", rowTwoParent: "csiButtons"},
        csiC: { buttonName: "CSIC", pageWithoutDotHtm: "CaseCSIC", opensIn: "_self", parentId: "CSIC", buttonId: "CSICself", rowTwoParent: "csiButtons"},
        csiD: { buttonName: "CSID", pageWithoutDotHtm: "CaseCSID", opensIn: "_self", parentId: "CSID", buttonId: "CSIDself", rowTwoParent: "csiButtons"},
    },
    noticesButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        caseNotices: { buttonName: "Notices", pageWithoutDotHtm: "CaseNotices", opensIn: "_self", parentId: "Case Notices", buttonId: "CaseNoticesSelf", rowTwoParent: "noticesButtons"},
        caseSpecialLetter: { buttonName: "Special Letter", pageWithoutDotHtm: "CaseSpecialLetter", opensIn: "_self", parentId: "Case Special Letter", buttonId: "CaseSpecialLetterSelf", rowTwoParent: "noticesButtons"},
        caseMemo: { buttonName: "Memo", pageWithoutDotHtm: "CaseMemo", opensIn: "_self", parentId: "Case Memo", buttonId: "CaseMemoSelf", rowTwoParent: "noticesButtons"},
    },
    billingButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        financialBilling: { buttonName: "Billing", pageWithoutDotHtm: "FinancialBilling", opensIn: "_self", parentId: "Billing", buttonId: "FinancialBillingSelf", rowTwoParent: "billingButtons"},
        financialBillingApproval: { buttonName: "Billing Approval", pageWithoutDotHtm: "FinancialBillingApproval", opensIn: "_self", parentId: "Billing Approval", buttonId: "FinancialBillingApprovalSelf", rowTwoParent: "billingButtons"},
        financialBillsList: { buttonName: "Bills List", pageWithoutDotHtm: "BillsList", opensIn: "_self", parentId: "Bills List", buttonId: "BillsListSelf", rowTwoParent: "billingButtons"},
        financialPayHistory: { buttonName: "Payment History", pageWithoutDotHtm: "CasePaymentHistory", opensIn: "_self", parentId: "Case Payment History", buttonId: "CasePaymentHistorySelf", rowTwoParent: "billingButtons"},
        financialAbsentDays: { buttonName: "Absent Days", pageWithoutDotHtm: "FinancialAbsentDayHolidayTracking", opensIn: "_self", parentId: "Tracking Absent Day Holiday", buttonId: "FinancialAbsentDayHolidayTrackingSelf", rowTwoParent: "billingButtons"},
        financialRegistrationFee: { buttonName: "Registration Fee Tracking", pageWithoutDotHtm: "FinancialBillingRegistrationFeeTracking", opensIn: "_self", parentId: "Tracking Registration Fee", buttonId: "FinancialBillingRegistrationFeeTrackingSelf", rowTwoParent: "billingButtons"},
        financialManualPayments: { buttonName: "Manual Payments", pageWithoutDotHtm: "FinancialManualPayment", opensIn: "_self", parentId: "Manual Payments", buttonId: "FinancialManualPaymentSelf", rowTwoParent: "billingButtons"},
    },
    providerButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        providerOverview: { buttonName: "Overview", pageWithoutDotHtm: "ProviderOverview", opensIn: "_self", parentId: "Provider Overview", buttonId: "ProviderOverviewSelf", rowTwoParent: "providerButtons"},
        providerNotes: { buttonName: "Notes", pageWithoutDotHtm: "ProviderNotes", opensIn: "_self", parentId: "Provider Notes", buttonId: "ProviderNotesSelf", rowTwoParent: "providerButtons"},
        providerInformation: { buttonName: "Info", pageWithoutDotHtm: "ProviderInformation", opensIn: "_self", parentId: "Provider Information", buttonId: "ProviderInformationSelf", rowTwoParent: "providerButtons"},
        providerAddress: { buttonName: "Address", pageWithoutDotHtm: "ProviderAddress", opensIn: "_self", parentId: "Provider Address", buttonId: "ProviderAddressSelf", rowTwoParent: "providerButtons"},
        providerParentAware: { buttonName: "Parent Aware", pageWithoutDotHtm: "ProviderParentAware", opensIn: "_self", parentId: "Parent Aware", buttonId: "ProviderParentAwareSelf", rowTwoParent: "providerButtons"},
        providerAccreditation: { buttonName: "Accred.", pageWithoutDotHtm: "ProviderAccreditation", opensIn: "_self", parentId: "Accreditation", buttonId: "ProviderAccreditationSelf", rowTwoParent: "providerButtons"},
        providerTraining: { buttonName: "Training", pageWithoutDotHtm: "ProviderTraining", opensIn: "_self", parentId: "Training", buttonId: "ProviderTrainingSelf", rowTwoParent: "providerButtons"},
        providerRates: { buttonName: "Rates", pageWithoutDotHtm: "ProviderRates", opensIn: "_self", parentId: "Rates", buttonId: "ProviderRatesSelf", rowTwoParent: "providerButtons"},
        providerLicense: { buttonName: "License", pageWithoutDotHtm: "ProviderLicense", opensIn: "_self", parentId: "License", buttonId: "ProviderLicenseSelf", rowTwoParent: "providerButtons"},
        providerAlias: { buttonName: "Alias", pageWithoutDotHtm: "ProviderAlias", opensIn: "_self", parentId: "Provider Alias", buttonId: "ProviderAliasSelf", rowTwoParent: "providerButtons"},
        providerBackground: { buttonName: "Background", pageWithoutDotHtm: "ProviderBackgroundStudy", opensIn: "_self", parentId: "Background Study", buttonId: "ProviderBackgroundStudySelf", rowTwoParent: "providerButtons"},
        providerFeesAndAccounts: { buttonName: "Accounts", pageWithoutDotHtm: "ProviderFeesAndAccounts", opensIn: "_self", parentId: "Fees Accounts", buttonId: "ProviderFeesAndAccounts", rowTwoParent: "providerButtons"},
        providerRegistrationAndRenewal: { buttonName: "Registration", pageWithoutDotHtm: "ProviderRegistrationAndRenewal", opensIn: "_self", parentId: "Registration Renewal", buttonId: "ProviderRegistrationSelf", rowTwoParent: "providerButtons"},
        providerTaxInfo: { buttonName: "Tax", pageWithoutDotHtm: "ProviderTaxInfo", opensIn: "_self", parentId: "Tax Info", buttonId: "ProviderTaxInfoSelf", rowTwoParent: "providerButtons"},
        // providerFraud: { buttonName: "Fraud", pageWithoutDotHtm: "ProviderFraud", opensIn: "_self", parentId: "Provider Fraud", buttonId: "ProviderFraudSelf", rowTwoParent: "providerButtons"},
        providerPaymentHistory: { buttonName: "Payments", pageWithoutDotHtm: "ProviderPaymentHistory", opensIn: "_self", parentId: "Provider Payment History", buttonId: "ProviderPaymentHistory", rowTwoParent: "providerButtons"},
    },
    providerNoticesButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        providerNotices: { buttonName: "Notices", pageWithoutDotHtm: "ProviderNotices", opensIn: "_self", parentId: "Provider Notices", buttonId: "ProviderNoticesSelf", rowTwoParent: "providerNoticesButtons"},
        providerSpecialLetter: { buttonName: "Special Letter", pageWithoutDotHtm: "ProviderSpecialLetter", opensIn: "_self", parentId: "Provider Special Letter", buttonId: "ProviderSpecialLetterSelf", rowTwoParent: "providerNoticesButtons"},
        providerMemo: { buttonName: "Memo", pageWithoutDotHtm: "ProviderMemo", opensIn: "_self", parentId: "Provider Memo", buttonId: "ProviderMemoSelf", rowTwoParent: "providerNoticesButtons"},
    },
    transferButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        caseTransfer: { buttonName: "Case Transfer", pageWithoutDotHtm: "CaseTransfer", opensIn: "_self", parentId: "Case Transfer", buttonId: "CaseTransferSelf", rowTwoParent: "transferButtons"},
        incomingTransfer: { buttonName: "Incoming", pageWithoutDotHtm: "ServicingAgencyIncomingTransfers", opensIn: "_blank", parentId: "Incoming Transfers", buttonId: "ServicingAgencyIncomingTransfersSelf", rowTwoParent: "transferButtons"},
        outgoingTransfer: { buttonName: "Outgoing", pageWithoutDotHtm: "ServicingAgencyOutgoingTransfers", opensIn: "_blank", parentId: "Outgoing Transfers", buttonId: "ServicingAgencyOutgoingTransfersSelf", rowTwoParent: "transferButtons"},
        financialClaimTransfer: { buttonName: "Claim Transfer", pageWithoutDotHtm: "FinancialClaimTransfer", opensIn: "_blank", parentId: "Claim Transfer", buttonId: "FinancialClaimTransferSelf", rowTwoParent: "transferButtons"},
    },
    claimsButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
        claimEstablishment: { buttonName: "Establishment", pageWithoutDotHtm: "FinancialClaimEstablishment", opensIn: "_blank", parentId: "Claim Establishment", buttonId: "FinancialClaimEstablishmentBlank", rowTwoParent: "claimsButtons"},
        claimDetails: { buttonName: "Details", pageWithoutDotHtm: "FinancialClaimMaintenanceAmountDetails", opensIn: "_self", parentId: "Maintenance Details", buttonId: "FinancialClaimMaintenanceAmountDetailsSelf", rowTwoParent: "claimsButtons"},
        claimSummary: { buttonName: "Summary", pageWithoutDotHtm: "FinancialClaimMaintenanceSummary", opensIn: "_self", parentId: "Maintenance Summary", buttonId: "FinancialClaimMaintenanceSummarySelf", rowTwoParent: "claimsButtons"},
        claimOverpaymentText: { buttonName: "Overpayment Text", pageWithoutDotHtm: "FinancialClaimNoticeOverpaymentText", opensIn: "_self", parentId: "Overpayment Text", buttonId: "FinancialClaimNoticeOverpaymentTextSelf", rowTwoParent: "claimsButtons"},
        claimNotes: { buttonName: "Notes", pageWithoutDotHtm: "FinancialClaimNotes", opensIn: "_self", parentId: "Claim Notes", buttonId: "FinancialClaimNotesSelf", rowTwoParent: "claimsButtons"},
        claimNotices: { buttonName: "Notices", pageWithoutDotHtm: "FinancialClaimNotices", opensIn: "_self", parentId: "Claim Notices History", buttonId: "FinancialClaimNoticesSelf", rowTwoParent: "claimsButtons"},
        claimMaintenanceCase: { buttonName: "Maint-Case", pageWithoutDotHtm: "FinancialClaimMaintenanceCase", opensIn: "_self", parentId: "Maintenance Case", buttonId: "FinancialClaimMaintenanceCaseSelf", rowTwoParent: "claimsButtons"},
        claimMaintenancePerson: { buttonName: "Maint-Person", pageWithoutDotHtm: "FinancialClaimMaintenancePerson", opensIn: "_self", parentId: "Maintenance Person", buttonId: "FinancialClaimMaintenancePersonSelf", rowTwoParent: "claimsButtons"},
        claimMaintenanceProvider: { buttonName: "Maint-Provider", pageWithoutDotHtm: "FinancialClaimMaintenanceProvider", opensIn: "_self", parentId: "Maintenance Provider", buttonId: "FinancialClaimMaintenanceProviderSelf", rowTwoParent: "claimsButtons"},
    }
}

function fRowOneButtonsString() {//row 2 buttons - Member, Case, Activity and Income...
    let vRowOneButtonsString = ""
    for (let page in oRowOneButtons) {
        let buttonProperties = {
            text: oRowOneButtons[page].buttonText,
            id: oRowOneButtons[page].buttonId,
            pageName: oRowOneButtons[page].gotoPage,
            howToOpen: notEditMode ? oRowOneButtons[page].opensIn : "_blank",
            parentId: oRowOneButtons[page].parentId,
            classes: oRowOneButtons[page].buttonText === "+" ? 'cButton cButton__nav cButton__nav__plus' : 'cButton cButton__nav',
        }
        let vButtonHtml = '<button type="button" tabindex="-1" class="' + buttonProperties.classes + '" id="' + buttonProperties.id + '" data-how-to-open="' + buttonProperties.howToOpen + '" data-page-name="' + buttonProperties.pageName + '" data-page-link-using-id="' + buttonProperties.parentId + '">' + buttonProperties.text + '</button>'
        vRowOneButtonsString += vButtonHtml
    }
    return vRowOneButtonsString
}

buttonDivOne.insertAdjacentHTML("beforeend", fRowOneButtonsString())
buttonDivOne.onclick = function(event) {//sends the gotoButtons array value 4 to gotoPage
    if (event.target.closest('button')?.tagName?.toLowerCase() === 'button' && !(["FieldNotesNT", "FieldOverviewNT"]).includes(event.target.closest('button').id)) {
        gotoPage(event.target.closest('button').id)
    }
}
function fRow2ButtonsString() {//row 2 buttons - Member...
    let vRowTwoButtonsString = ""
    for (let group in oRowTwoButtons) {
        let vButtonHtml = '<button type="button" tabindex="-1" class="cButton cButton__nav" id="' + oRowTwoButtons[group].buttonId + '">' + oRowTwoButtons[group].buttonText + '</button>'
        vRowTwoButtonsString += vButtonHtml
    }
    return vRowTwoButtonsString
}
if (notEditMode) {
    buttonDivTwo.insertAdjacentHTML("beforeend", fRow2ButtonsString())
    buttonDivTwo.onclick = function(event) {// sends the oRowTwoButtons button ID
        if (notEditMode && event.target.tagName?.toLowerCase() === 'button') {
            $('#buttonPanelThree').empty()
            fRowThreeButtonsString(event.target.id)
            highlightPageAndCategory()
        }
    }
}

function highlightPageAndCategory() { // highlights buttons in rows 2 and 3
    if (notEditMode) {
        try {
            let parentPage = findPageParent()
            if (parentPage !== undefined) {
                if (parentPage[0] !== "undefined") {
                    $('#' + oRowThreeButtons[parentPage[0]][parentPage[1]].rowTwoParent).add('#' + oRowThreeButtons[parentPage[0]][parentPage[1]].buttonId).addClass('cButton__nav__open-page')
                } else if ([parentPage[1]] !== "undefined") {
                    $('#' + oRowOneButtons[parentPage[1]].buttonId).addClass('cButton__nav__open-page')
                }
            }
        }
        catch(error) { console.log("highlightPageAndCategory", error) }
        finally {
            if ($('#eligibilityButtons.cButton__nav__open-page, #eligibilityButtons.cButton__nav__browsing').length && !reviewingEligibility) {
                $('#buttonPanelThree > button[id^="CaseEligibilityResult"]:not(#CaseEligibilityResultSelectionSelf)').addClass('hidden')
            }
        }
    } }

//SECTION START Activate row three from click or page load
function fRowThreeButtonsString(idOfRowTwoGroupButton) {
    let vRowThreeButtonsString = ""
    for (let button in oRowThreeButtons[idOfRowTwoGroupButton]) {
        let buttonProperties = oRowThreeButtons[idOfRowTwoGroupButton][button]
        buttonProperties.classes = buttonProperties.buttonName === "+" ? "cButton cButton__nav cButton__nav__plus" : "cButton cButton__nav"
        let vButtonHtml = '<button type="button" tabindex="-1" class="' + buttonProperties.classes + '" id="' + buttonProperties.buttonId + '" data-how-to-open="' + buttonProperties.opensIn + '" data-page-name="' + buttonProperties.pageWithoutDotHtm + '" data-page-link-using-id="' + buttonProperties.parentId + '">' + buttonProperties.buttonName + '</button>'
        vRowThreeButtonsString += vButtonHtml
    }
    buttonDivThree.insertAdjacentHTML("beforeend", vRowThreeButtonsString)
}

function findPageParent() {
    for (let grouping in oRowThreeButtons) {
        for (let page in oRowThreeButtons[grouping]) {
            if (Object.hasOwn(oRowThreeButtons[grouping][page], "pageWithoutDotHtm") && oRowThreeButtons[grouping][page].pageWithoutDotHtm === thisPageName) {
                if (notEditMode && $('#buttonPanelThree').children().length === 0) { fRowThreeButtonsString(oRowThreeButtons[grouping][page].rowTwoParent) }
                return [grouping, page] }
            else {
                for (let page in oRowOneButtons) {
                    if (Object.hasOwn(oRowOneButtons[page], "gotoPage") && oRowOneButtons[page].gotoPage === thisPageName) {
                        return ["undefined", page] }
                } } } } }

$('#primaryNavigation').click(function(event) {
    if (event.target.tagName === 'BUTTON') {
        if (event.target.parentNode.id !== "buttonPanelThree") { $('.cButton__nav__browsing').removeClass('cButton__nav__browsing') }
        $('.primary-navigation-row button#' + event.target.id + ':not(.cButton__nav__open-page):not(#buttonPanelOneNTF>button):not([data-how-to-open="_blank"])').addClass("cButton__nav__browsing")
        if ($('#eligibilityButtons.cButton__nav__open-page, #eligibilityButtons.cButton__nav__browsing').length && !reviewingEligibility) { $('#buttonPanelThree > button[id^="CaseEligibilityResult"]:not(#CaseEligibilityResultSelectionSelf)').addClass('hidden') } //.addClass('cButton__disabled') //.attr('disabled', 'disabled')
    }
})

highlightPageAndCategory()// to highlight on page load

buttonDivThree.onclick = function(event) {
    if (notEditMode && event.target.tagName?.toLowerCase() === 'button') { gotoPage(event.target.id) }
}
//SECTION END Activate row three from click or page load

//SECTION START Using Id from button click to load href of associated element
function gotoPage(loadThisPage) {
    let loadThisPageNode = document.getElementById(`${loadThisPage}`)
    if (loadThisPageNode.id.match(/Search|List|Alerts|NewApp/)?.length) {
        if (notEditMode) {
            window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen);
        } else if (loadThisPageNode.dataset.howToOpen === "_blank") {
            window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen);
        }
    } else if (loadThisPageNode.id.match(/CaseNotesBlank|CaseOverviewBlank/)?.length) {
        window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen);
    } else if (["Alerts.htm","ActiveCaseList.htm","InactiveCaseList.htm","PendingCaseList.htm", "ProviderRegistrationList.htm"].includes(thisPageNameHtm)) {
        if (["ProviderRegistrationList.htm"].includes(thisPageNameHtm) || document.querySelector('#caseOrProviderAlertsTable > tbody > tr.selected > td:nth-of-type(1)')?.textContent === "Provider") {
            if (loadThisPageNode.id.match(/^Provider/)?.length) {
                window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm' + fGetProviderParameters(), loadThisPageNode.dataset.howToOpen)
            }
        }
        else {
            if (!loadThisPageNode.id.match(/^Provider/)?.length) {
                let caseParameters = fGetCaseParameters()
                caseParameters.match(/undefined/) ? window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm', loadThisPageNode.dataset.howToOpen) : window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm' + caseParameters, loadThisPageNode.dataset.howToOpen)
            }
        }
    }
    else if (notEditMode) {
        window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen);
    }
};
//SECTION END Using Id from button click to load href of associated element

if (("getProviderOverview.htm").includes(thisPageNameHtm)) {
    $('#providerButtons').click()
    $('#ProviderOverviewSelf').addClass('cButton__nav__open-page')
}

//SECTION START Create text field and buttons for case number to open in new tab
function newTabFieldButtons() { //Text field to enter a case number to open in a new tab
    const openNotesOrOverview = [ // ["button innerHTML", "PageName", "ButtonID"]
        ["Notes", "CaseNotes", "FieldNotesNT"],
        ["Overview", "CaseOverview", "FieldOverviewNT"],
    ];
    let buttonDivOneNTF = document.getElementById("buttonPanelOneNTF")
    $('#buttonPanelOneNTF').append('<input id="newTabField" list="history" autocomplete="off" class="form-control" placeholder="Case #" style="width: 10ch;"></input>')
    // $('#buttonPanelOneNTF').append('<input id="newTabField" list="history" type="number" min="1" max="99999999" class="form-control" placeholder="Case #" style="width: 10ch;"></input>')
    for (let i = 0; i < openNotesOrOverview.length; i++){
        let btnNavigation = document.createElement('button');
        btnNavigation.type = 'button';
        btnNavigation.textContent = [openNotesOrOverview[i][0]]
        btnNavigation.dataset.pageName = [openNotesOrOverview[i][1]]
        btnNavigation.id = [openNotesOrOverview[i][2]];
        btnNavigation.className = 'cButton cButton__nav';
        buttonDivOneNTF.appendChild(btnNavigation);
    }
    buttonDivOneNTF.onclick = function(event) {
        if (event.target.closest('button')?.tagName?.toLowerCase() === 'button' && document.getElementById('newTabField').value.match(/\b\d{1,8}\b/)) {
            event.preventDefault()
            openCaseNumber(event.target.dataset.pageName, document.getElementById('newTabField').value)
        }
    }
    $('#newTabField').keydown(function(e) {
        e.stopImmediatePropagation()
        switch (e.key) {
            case 'n':
                e.preventDefault();
                window.open('/ChildCare/CaseNotes.htm?parm2=' + $('#newTabField').val(), '_blank');
                break
            case 'o':
            case 'Enter':
                e.preventDefault();
                window.open('/ChildCare/CaseOverview.htm?parm2=' + $('#newTabField').val(), '_blank');
                break
        }
    })
};
function openCaseNumber(pageName, enteredCaseNumber) {
    if (pageName == "CaseNotes") {
        window.open('/ChildCare/CaseNotes.htm?parm2=' + enteredCaseNumber, '_blank');
    } else {
        window.open('/ChildCare/CaseOverview.htm?parm2=' + enteredCaseNumber, '_blank');
    };
};
newTabFieldButtons();
!notEditMode && ($('#buttonPanelTwo, #buttonPanelThree').hide());
//SECTION END Create text field and buttons for case number to open in new tab

// ====================================================================================================
// PRIMARY_NAVIGATION BUTTONS SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ====================================================================================================

//SECTION START Reverses Period options order, makes most recent visible
function selectPeriodReversal(selectPeriod) {
    if (selectPeriod) {
        $('#selectPeriod option').each(function () {
            $(this).prependTo($(this).parent());
        });
    };
};
let selectPeriodToReverse = document.getElementById("selectPeriod");
if (notEditMode && selectPeriodToReverse && !selectPeriodToReverse?.disabled) { selectPeriodReversal(selectPeriodToReverse) }
//SECTION END Reverses Period options order, makes most recent visible


//SECTION START Next/Prev buttons next to period drop down
function nextPrevPeriodButtons() {
    try {
        let currentPeriod = document.querySelector('#selectPeriod').value
        if (reviewingEligibility || thisPageNameHtm.indexOf("CaseApplicationInitiation.htm") > -1 || $('#submit').attr('disabled') === 'disabled') { return }
        let lastAvailablePeriod = document.querySelector('#selectPeriod > option:first-child').value
        let selectPeriodDropdown = document.getElementById('selectPeriod');
        let selectPeriodParent = document.getElementById('selectPeriod').parentNode;
        const buttonsNextPrev = [ //"Button Text", "ButtonId", "Next or Prev", "Stay or Go"]
            ["«", "backGoSelect", "Prev", "Go", "Left"],
            ["‹", "backSelect", "Prev", "Stay", "Right"],
            ["»", "forwardGoSelect", "Next", "Go", "Right"],
            ["›", "forwardSelect", "Next", "Stay", "Left"],
        ];
        for (let i = 0; i < buttonsNextPrev.length; i++){ //optimize
            let btnNavigation = document.createElement('button');
            btnNavigation.textContent = buttonsNextPrev[i][0];
            btnNavigation.id = buttonsNextPrev[i][1];
            btnNavigation.tabIndex = '-1';
            btnNavigation.type = 'button';
            btnNavigation.dataset.NextOrPrev = buttonsNextPrev[i][2]
            btnNavigation.dataset.StayOrGo = buttonsNextPrev[i][3]
            btnNavigation.className = 'npp-button'
            buttonsNextPrev[i][2] === 'Prev' ? selectPeriodParent.insertBefore(btnNavigation, selectPeriodDropdown) : selectPeriodParent.insertBefore(btnNavigation, selectPeriodDropdown.nextSibling)
        };
        currentPeriod === lastAvailablePeriod && document.getElementById('forwardGoSelect').classList.add('cButton__disabled')
        function checkPeriodMobility() {
            document.querySelector('#selectPeriod').value === lastAvailablePeriod ? $('#forwardSelect').addClass('cButton__disabled') : $('#forwardSelect').removeClass('cButton__disabled')
        }
        checkPeriodMobility()

        document.getElementById('selectPeriod').parentNode.onclick = function(event) {
            if (event.target.closest('button')?.tagName.toLowerCase() === 'button') { selectNextPrev(event.target.closest('button').id) }
        }
        function selectNextPrev(clickedButton) { //Subtracting goes up/forward dates;
            if (document.getElementById(clickedButton).dataset.NextOrPrev === "Next") {
                if (selectPeriodDropdown.selectedIndex === 0) { // top of list
                    if (document.getElementById(clickedButton).dataset.StayOrGo === "Go") { document.getElementById('caseInputSubmit').click(); return }
                    else { return }
                }
                selectPeriodDropdown.selectedIndex--;
                if (document.getElementById(clickedButton).dataset.StayOrGo === "Go") { document.getElementById('caseInputSubmit').click() }
            } else if (document.getElementById(clickedButton).dataset.NextOrPrev === "Prev") {
                selectPeriodDropdown.selectedIndex++;
                if (document.getElementById(clickedButton).dataset.StayOrGo === "Go") { document.getElementById('caseInputSubmit').click() }
            }
            checkPeriodMobility()
        };
    } catch(error) { console.error("nextPrevPeriodButtons", error)}
};
$('#selectPeriod:not([disabled], [readonly], [type=hidden])').length && nextPrevPeriodButtons()
//SECTION END Next/Prev buttons next to period drop down


// =========================================================================================================
// END CUSTOM_NAVIGATION SECTION  (THE MEC2NAVIGATION SCRIPT SHOULD MIMIC THE ABOVE)  END NAVIGATION SECTION
// =========================================================================================================
let periodDates = {}
let selectPeriod = document.getElementById('selectPeriod')?.value
if (selectPeriod?.length) {
    periodDates = { range: selectPeriod, parm3: selectPeriod.replace(' - ', '').replaceAll('/',''), start: selectPeriod.slice(0, 10), end: selectPeriod.slice(13) }
}
let caseId = document.getElementById('caseId')?.value ?? undefined
let providerId = caseId ?? document.getElementById('providerId')?.value
let caseIdORproviderId = caseId ?? providerId

//eval parsing variables
let dateRange = undefined
//let evalString = undefined
//let evalNum = undefined
//let page = undefined
//let parm2providerId = undefined

let userXnumber = localStorage.getItem('MECH2.userIdNumber') ?? ''
const countyNumbersNeighbors = [
    { county: "Aitkin", code: "101", neighbors: ["Cass", "Crow Wing", "Mille Lacs", "Kanabec", "Pine", "Carlton", "St. Louis", "Itasca"] },
    { county: "Anoka", code: "102", neighbors: ["Sherburne", "Wright", "Hennepin", "Ramsey", "Washington", "Chisago", "Isanti"] },
    { county: "Becker", code: "103", neighbors: ["Norman", "Clay", "Otter Tail", "Wadena", "Hubbard", "Clearwater", "Mahnomen"] },
    { county: "Beltrami", code: "104", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods"] },
    { county: "Benton", code: "105", neighbors: ["Morrison", "Stearns", "Sherburne", "Mille Lacs"] },
    { county: "Big Stone", code: "106", neighbors: ["Lac Qui Parle", "Swift", "Stevens", "Traverse", "Out-of-State"], outOfState: "" },
    { county: "Blue Earth", code: "107", neighbors: ["Brown", "Watonwan", "Martin", "Faribault", "Waseca", "Le Sueur", "Nicollet"] },
    { county: "Brown", code: "108", neighbors: ["Redwood", "Cottonwood", "Watonwan", "Blue Earth", "Nicollet", "Renville"] },
    { county: "Carlton", code: "109", neighbors: ["Aitkin", "Pine", "St. Louis", "Out-of-State"], outOfState: "" },
    { county: "Carver", code: "110", neighbors: ["Wright", "Hennepin", "Scott", "Sibley", "McLeod"] },
    { county: "Cass", code: "111", neighbors: ["Beltrami", "Hubbard", "Wadena", "Todd", "Morrison", "Crow Wing", "Aitkin", "Itasca"] },
    { county: "Chippewa", code: "112", neighbors: ["Swift", "Lac Qui Parle", "Yellow Medicine", "Renville", "Kandiyohi"] },
    { county: "Chisago", code: "113", neighbors: ["Pine", "Kanabec", "Isanti", "Anoka", "Washington", "Out-of-State"], outOfState: "" },
    { county: "Clay", code: "114", neighbors: ["Wilkin", "Otter Tail", "Becker", "Norman", "Out-of-State"], outOfState: "" },
    { county: "Clearwater", code: "115", neighbors: ["Pennington", "Polk", "Mahnomen", "Becker", "Hubbard", "Beltrami"] },
    { county: "Cook", code: "116", neighbors: ["Lake"] },
    { county: "Cottonwood", code: "117", neighbors: ["Redwood", "Murray", "Nobles", "Jackson", "Martin", "Watonwan", "Brown"] },
    { county: "Crow Wing", code: "118", neighbors: ["Cass", "Morrison", "Mille Lacs", "Aitkin"] },
    { county: "Dakota", code: "119", neighbors: ["Goodhue", "Rice", "Scott", "Hennepin", "Ramsey", "Washington"] },
    { county: "Dodge", code: "120", neighbors: ["Rice", "Steele", "Freeborn", "Mower", "Olmsted", "Goodhue"] },
    { county: "Douglas", code: "121", neighbors: ["Otter Tail", "Grant", "Stevens", "Pope", "Stearns", "Todd"] },
    { county: "Faribault", code: "122", neighbors: ["Blue Earth", "Martin", "Freeborn", "Waseca", "Out-of-State"], outOfState: "" },
    { county: "Fillmore", code: "123", neighbors: ["Olmsted", "Mower", "Houston", "Winona", "Out-of-State"], outOfState: "" },
    { county: "Freeborn", code: "124", neighbors: ["Waseca", "Faribault", "Mower", "Dodge", "Steele", "Out-of-State"], outOfState: "" },
    { county: "Goodhue", code: "125", neighbors: ["Wabasha", "Olmsted", "Dodge", "Steele", "Rice", "Dakota", "Out-of-State"], outOfState: "" },
    { county: "Grant", code: "126", neighbors: ["Wilkin", "Traverse", "Stevens", "Pope", "Douglas", "Otter Tail"] },
    { county: "Hennepin", code: "127", neighbors: ["Sherburne", "Wright", "Carver", "Scott", "Dakota", "Ramsey", "Anoka", "Sherburne"] },
    { county: "Houston", code: "128", neighbors: ["Winona", "Fillmore", "Out-of-State"], outOfState: "" },
    { county: "Hubbard", code: "129", neighbors: ["Clearwater", "Becker", "Wadena", "Cass", "Beltrami"] },
    { county: "Isanti", code: "130", neighbors: ["Mille Lacs", "Sherburne", "Anoka", "Chisago", "Pine", "Kanabec"] },
    { county: "Itasca", code: "131", neighbors: ["Beltrami", "Cass", "Aitkin", "St. Louis", "Koochiching"] },
    { county: "Jackson", code: "132", neighbors: ["Murray", "Nobles", "Martin", "Watonwan", "Cottonwood", "Out-of-State"], outOfState: "" },
    { county: "Kanabec", code: "133", neighbors: ["Mille Lacs", "Isanti", "Chisago", "Pine", "Aitkin"] },
    { county: "Kandiyohi", code: "134", neighbors: ["Pope", "Swift", "Chippewa", "Renville", "Meeker", "Stearns"] },
    { county: "Kittson", code: "135", neighbors: ["Marshall", "Roseau", "Out-of-State"], outOfState: "" },
    { county: "Koochiching", code: "136", neighbors: ["Lake of the Woods", "Beltrami", "Itasca", "St. Louis"], outOfState: "" },
    { county: "Lac qui Parle", code: "137", neighbors: ["Yellow Medicine", "Chippewa", "Swift", "Big Stone", "Out-of-State"], outOfState: "" },
    { county: "Lake", code: "138", neighbors: ["Cook", "St. Louis"] },
    { county: "Lake of the Woods", code: "139", neighbors: ["Roseau", "Beltrami", "Koochiching"] },
    { county: "Le Sueur", code: "140", neighbors: ["Sibley", "Nicollet", "Blue Earth", "Waseca", "Rice", "Scott"] },
    { county: "Lincoln", code: "141", neighbors: ["Pipestone", "Murray", "Lyon", "Yellow Medicine", "Out-of-State"], outOfState: "" },
    { county: "Lyon", code: "142", neighbors: ["Yellow Medicine", "Lincoln", "Pipestone", "Murray", "Redwood"] },
    { county: "McLeod", code: "143", neighbors: ["Meeker", "Renville", "Sibley", "Carver", "Wright"] },
    { county: "Mahnomen", code: "144", neighbors: ["Polk", "Norman", "Becker", "Clearwater"] },
    { county: "Marshall", code: "145", neighbors: ["Polk", "Pennington", "Beltrami", "Roseau", "Out-of-State"], outOfState: "" },
    { county: "Martin", code: "146", neighbors: ["Cottonwood", "Jackson", "Faribault", "Blue Earth", "Watonwan", "Out-of-State"] },
    { county: "Meeker", code: "147", neighbors: ["Kandiyohi", "Renville", "McLeod", "Wright", "Stearns"] },
    { county: "Mille Lacs", code: "148", neighbors: ["Crow Wing", "Morrison", "Benton", "Sherburne", "Isanti", "Kanabec", "Aitkin"] },
    { county: "Morrison", code: "149", neighbors: ["Cass", "Todd", "Stearns", "Benton", "Mille Lacs", "Crow Wing"] },
    { county: "Mower", code: "150", neighbors: ["Steele", "Freeborn", "Fillmore", "Olmsted", "Dodge", "Out-of-State"], outOfState: "" },
    { county: "Murray", code: "151", neighbors: ["Lincoln", "Pipestone", "Rock", "Nobles", "Jackson", "Cottonwood", "Redwood", "Lyon"] },
    { county: "Nicollet", code: "152", neighbors: ["Renville", "Brown", "Blue Earth", "Le Sueur", "Sibley"] },
    { county: "Nobles", code: "153", neighbors: ["Pipestone", "Rock", "Jackson", "Cottonwood", "Murray", "Out-of-State"], outOfState: "" },
    { county: "Norman", code: "154", neighbors: ["Polk", "Clay", "Becker", "Mahnomen"] },
    { county: "Olmsted", code: "155", neighbors: ["Goodhue", "Dodge", "Mower", "Fillmore", "Winona", "Wabasha"] },
    { county: "Otter Tail", code: "156", neighbors: ["Clay", "Wilkin", "Grant", "Douglas", "Todd", "Wadena", "Becker"] },
    { county: "Pennington", code: "157", neighbors: ["Marshall", "Polk", "Red Lake", "Clearwater", "Beltrami"] },
    { county: "Pine", code: "158", neighbors: ["Aitkin", "Kanabec", "Isanti", "Chisago", "Carlton", "Out-of-State"], outOfState: "" },
    { county: "Pipestone", code: "159", neighbors: ["Rock", "Nobles", "Murray", "Lyon", "Lincoln"] },
    { county: "Polk", code: "160", neighbors: ["Marshall", "Norman", "Mahnomen", "Clearwater", "Pennington", "Red Lake", "Out-of-State"], outOfState: "" },
    { county: "Pope", code: "161", neighbors: ["Grant", "Stevens", "Swift", "Kandiyohi", "Stearns", "Todd", "Douglas"] },
    { county: "Ramsey", code: "162", neighbors: ["Washington", "Anoka", "Hennepin", "Dakota"] },
    { county: "Red Lake", code: "163", neighbors: ["Polk", "Pennington"] },
    { county: "Redwood", code: "164", neighbors: ["Yellow Medicine", "Lyon", "Murray", "Cottonwood", "Brown", "Renville"] },
    { county: "Renville", code: "165", neighbors: ["Chippewa", "Yellow Medicine", "Redwood", "Brown", "Nicollet", "Sibley", "McLeod", "Meeker", "Kandiyohi"] },
    { county: "Rice", code: "166", neighbors: ["Scott", "Le Sueur", "Waseca", "Steele", "Dodge", "Goodhue", "Dakota"] },
    { county: "Rock", code: "167", neighbors: ["Pipestone", "Murray", "Nobles", "Out-of-State"], outOfState: "" },
    { county: "Roseau", code: "168", neighbors: ["Kittson", "Marshall", "Beltrami", "Lake of the Woods"] },
    { county: "St. Louis", code: "169", neighbors: ["Lake", "Koochiching", "Itasca", "Aitkin", "Carlton", "Out-of-State"], outOfState: "" },
    { county: "Scott", code: "170", neighbors: ["Carver", "Sibley", "Le Sueur", "Rice", "Dakota", "Hennepin"] },
    { county: "Sherburne", code: "171", neighbors: ["Stearns", "Wright", "Hennepin", "Anoka", "Isanti", "Mille Lacs", "Benton"] },
    { county: "Sibley", code: "172", neighbors: ["Renville", "Nicollet", "Le Sueur", "Scott", "Carver", "McLeod"] },
    { county: "Stearns", code: "173", neighbors: ["Douglas", "Pope", "Kandiyohi", "Meeker", "Wright", "Sherburne", "Benton", "Morrison", "Todd"] },
    { county: "Steele", code: "174", neighbors: ["Waseca", "Freeborn", "Mower", "Dodge", "Goodhue", "Rice"] },
    { county: "Stevens", code: "175", neighbors: ["Traverse", "Big Stone", "Swift", "Pope", "Douglas", "Grant"] },
    { county: "Swift", code: "176", neighbors: ["Stevens", "Big Stone", "Lac Qui Parle", "Chippewa", "Kandiyohi", "Pope"] },
    { county: "Todd", code: "177", neighbors: ["Otter Tail", "Douglas", "Pope", "Stearns", "Morrison", "Cass", "Wadena"] },
    { county: "Traverse", code: "178", neighbors: ["Big Stone", "Stevens", "Grant", "Wilkin", "Out-of-State"], outOfState: "" },
    { county: "Wabasha", code: "179", neighbors: ["Goodhue", "Olmsted", "Winona", "Out-of-State"] },
    { county: "Wadena", code: "180", neighbors: ["Becker", "Otter Tail", "Todd", "Cass", "Hubbard"] },
    { county: "Waseca", code: "181", neighbors: ["Blue Earth", "Faribault", "Freeborn", "Steele", "Rice", "Le Sueur"] },
    { county: "Washington", code: "182", neighbors: ["Chisago", "Anoka", "Ramsey", "Dakota", "Out-of-State"], outOfState: "" },
    { county: "Watonwan", code: "183", neighbors: ["Brown", "Cottonwood", "Jackson", "Martin", "Blue Earth"] },
    { county: "Wilkin", code: "184", neighbors: ["Traverse", "Grant", "Otter Tail", "Clay", "Out-of-State"], outOfState: "" },
    { county: "Winona", code: "185", neighbors: ["Wabasha", "Olmsted", "Fillmore", "Houston", "Out-of-State"], outOfState: "" },
    { county: "Wright", code: "186", neighbors: ["Stearns", "Meeker", "McLeod", "Carver", "Hennepin", "Anoka", "Sherburne"] },
    { county: "Yellow Medicine", code: "187", neighbors: ["Lac Qui Parle", "Lincoln", "Lyon", "Redwood", "Renville", "Chippewa"] },
    { county: "White Earth Nation", code: "192", neighbors: ["Polk", "Norman", "Becker", "Clearwater", "Mahnomen"] },
    { county: "Red Lake Nation", code: "194", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods", "Beltrami"] },
]
const userCountyObject = countyNumbersNeighbors.find((countylist) => {
    return countylist.code === userXnumber?.slice(1, 4)
})

const changeEvent = new Event('change')
const doEvent = (element) => document.querySelector(element)?.dispatchEvent(changeEvent)
//
let caseHistory = []
if (localStorage.getItem('MECH2.caseHistoryLS') !== null) { caseHistory = JSON.parse(localStorage.getItem('MECH2.caseHistoryLS')) }
function addToCaseHistoryArray() {
    let caseName = fCaseName()
    const caseIdTest = (entry) => entry.caseIdNumber === caseId
    let foundDuplicate = caseHistory.findIndex(caseIdTest)
    if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
    let timestamp = new Date().toLocaleDateString('en-US', { hour: "numeric", minute: "2-digit", month: "2-digit", day: "2-digit" })
    let newEntry = { caseIdNumber: caseId, caseName: caseName.first + ' ' + caseName.last, time: timestamp };
    if (caseHistory.length === 10) { caseHistory.pop() }
    caseHistory.unshift(newEntry)
    localStorage.setItem('MECH2.caseHistoryLS', JSON.stringify(caseHistory));
    // https://www.w3schools.com/css/css_dropdowns.asp
    // https://www.w3schools.com/tags/tag_datalist.asp
};

if (caseId && notEditMode && localStorage.getItem('MECH2.note') === null) { addToCaseHistoryArray() }

let viewHistory = JSON.parse(localStorage.getItem('MECH2.caseHistoryLS'))
function makeViewHistoryDatalist() {
    let tempDatalist = '<datalist id="history">'
    for (let history in viewHistory) {
        tempDatalist += '<option value="' + viewHistory[history].caseIdNumber + '">' + viewHistory[history].caseIdNumber + ' ' + viewHistory[history].caseName + ' ' + viewHistory[history].time +'</option>'
    }
    tempDatalist += '</datalist>'
    return tempDatalist
}
let viewHistoryDatalist = makeViewHistoryDatalist()
document.getElementById('newTabField').insertAdjacentHTML('afterend', viewHistoryDatalist)

function firstEmptyId() { return $('.panel-box-format :is(input, select):not(:disabled, .form-button, [readonly], [type="hidden"])').filter(function() {return $(this).val()?.length === 0}).eq(0).attr('id') || "" }

//Fix for table entries losing selected class when clicked on. There is no way to know if a table shouldn't get the .selected class, so it does it for all.
$('tbody').click( (event) => $(event.target.closest('tr')).addClass('selected') )

//Make all h4 clicky collapse
$("h4").click( (e) => $(e.target).nextAll().toggleClass("collapse") )

if (!notEditMode) {
    let actualDateField = document.getElementById('actualDate')
    let storedActualDate = sessionStorage.getItem('actualDate')
    if (actualDateField) {
        if (storedActualDate === null || storedActualDate === '') {
            document.getElementById('save').addEventListener('click', function() {
                sessionStorage.setItem('actualDate', actualDateField.value)
            })
        }
        else {
            if (storedActualDate?.length && !actualDateField?.value.length) {
                actualDateField.classList.add('prefilled-field')
                actualDateField.value = storedActualDate
            }
        }
    }
}
if (!notEditMode && sessionStorage.getItem('processingApplication') === "yes" && $('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').length && !$('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').val().length) {
    $('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').val(sessionStorage.getItem('actualDate'))
}
function resetTabIndex() {
    const nonResetPages = ["CaseSpecialLetter.htm"]
    if ( !nonResetPages.includes(thisPageNameHtm) ) { $(':is(select, input, textarea, td.sorting)[tabindex]').removeAttr('tabindex') }
}
setTimeout(function() { resetTabIndex() }, 200)


// ==============================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// FOCUS ELEMENT SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ==============================================================================================================================================================================================

//SECTION START Focusing the first desired element on pages (eleFocus start)
function eleFocus(ele) {
    $('.focusedElement').removeClass('focusedElement')
    $(document).ready(function() {
        setTimeout(function() {
            if (!notEditMode && $('div:has(>errordiv)').length) {
                $('strong:contains(This data will expire)').length ? document.querySelector('#saveDB').classList.add('focusedElement') : $('div:has(>errordiv)').prev().children('input, select').addClass('focusedElement')
            }
            else { $(ele).addClass('focusedElement') }
            $('.focusedElement').focus()
        }, 200);
    });
};
//SUB-SECTION START All pages - popup menu
let popupModal = $('#confirmPopup, #addChildConfirmPopup')
if (popupModal.length > 0) {
    $(popupModal).each(function () {
        let popupModalObserver = new MutationObserver(function(mutations) {
            for (const mutation of mutations) {
                if (mutation.attributeName === "style") {
                    const controllerModal = new AbortController()
                    if ($(mutation.target).filter('.in').length > 0) {
                        $(mutation.target).filter('.in').each(function() {
                            eleFocus($(mutation.target).find('#confirmButtons>input:first-child'))
                            window.addEventListener('keydown', function(event) {
                                switch (event.code) {
                                    case 'KeyO':
                                        event.preventDefault()
                                        $('.in #confirmButtons>input:eq(0)').click()
                                        break
                                    case 'KeyC':
                                        event.preventDefault()
                                        $('.in #confirmButtons>input:eq(1)').click()
                                        break
                                }
                            }, { signal: controllerModal.signal })
                            return false
                        })
                    } else { controllerModal.abort(); break }
                }
            }
        });
        popupModalObserver.observe(this, { attributes: true});
    });
}
if (document.querySelectorAll('#caseId')?.length && !caseId) { eleFocus('#caseId') }
else if (document.querySelectorAll('#providerInput>#providerId')?.length && !providerId) { eleFocus('#providerId') }

//SUB-SECTION START Activity and Income tab pages
try {
    if (caseId) {
        if (("CaseEarnedIncome.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#memberReferenceNumberNewMember').length > 0) { eleFocus('#memberReferenceNumberNewMember') }
            else if ($('#ceiVerification').val() === 'No Verification Provided') { eleFocus('#ceiVerification') }
            else { $('#ceiPrjAmount').select() } }
        if (("CaseUnearnedIncome.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#memberReferenceNumberNewMember').length > 0) { eleFocus('#memberReferenceNumberNewMember') }
            else if ($('#verification').val() === 'No Verification Provided') { eleFocus('#verification') }
            else { $('#incomeProjectionAmount').select() } }
        if (("CaseExpense.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#refPersonName').length > 0) { eleFocus('#refPersonName') }
            else if ($('#verificationType').val() === 'No Verification Provided') { eleFocus('#verificationType') }
            else { $('#projectionExpenseAmount').select() } }
        if (("CaseLumpSum.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#lumpSumVerification').val() === 'No Verification Provided') { eleFocus('#lumpSumVerification') }
            else { eleFocus('#memberReferenceNumberNewMember') } }
        if (!("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm) && thisPageNameHtm.indexOf("Activity.htm") > -1) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('strong:contains("Warning: This data will expire")').length > 0) { eleFocus('#saveDB') }
            else if ($('#employmentActivityVerification, #verification').val() === 'No Verification Provided') { eleFocus('#employmentActivityVerification, #verification') }
            else if ($('#memberReferenceNumberNewMember, #pmiNbrNew').length) { eleFocus('#memberReferenceNumberNewMember, #pmiNbrNew'); tabIndxNegOne('#activityEnd, #employmentActivityEnd, #activityPeriodEnd, #leaveDetailExtendedEligibilityBegin, #leaveDetailRedeterminationDue') }
            else { eleFocus('#activityEnd, #employmentActivityEnd, #activityPeriodEnd') }
        }
        if (("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) {
            if (!notEditMode) { eleFocus('#hoursUsed'); setTimeout($('#hoursUsed').select(),1) }
            else if (notEditMode) { eleFocus('#editDB') }	}

        //SUB-SECTION START Member tab pages
        if (("CaseMember.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#next').length && $('#next').attr('disabled') !== "disabled") { eleFocus('#next') }
            else if ($('#memberReferenceNumber').val() === "") { eleFocus('#memberReferenceNumber') }
            else { eleFocus('#'+ firstEmptyId()) } }
        if (("CaseMemberII.htm").includes(thisPageNameHtm)) {
            setTimeout(function() {
                if (notEditMode) {
                    if ($('#new').attr('disabled') !== "disabled") { eleFocus('#newDB') }
                    else if ($('#edit').attr('disabled') !== "disabled") { eleFocus('#editDB') }
                } else {
                    if ($('#next').length && $('#next').attr('disabled') !== "disabled") { eleFocus('#next') }
                    else if ($('#memberReferenceNumberNewMember').length < 1 && $('#next').length && $('#next').attr('disabled') === "disabled") { eleFocus('#newDB') }
                    else if ($('#memberReferenceNumberNewMember').length && $('#memberReferenceNumberNewMember').val().length === 0) { eleFocus('#memberReferenceNumberNewMember') }
                    else if (!$('#actualDate').val()?.length === 0 && $('#memberCitizenshipVerification').val() === 'No Verification') { eleFocus('#memberCitizenshipVerification') }
                    else if ($('#actualDate').val()?.length === 0) { eleFocus('#actualDate') } }
            }, 50) }
        if (("CaseParent.htm").includes(thisPageNameHtm)) {
            if (!notEditMode) {
                if ($('#parentVerification').val() === 'No Verification Provided') { eleFocus('#parentVerification') }
                else if ($('#parentReferenceNumberNewMember').length > 0) { eleFocus('#parentReferenceNumberNewMember') }
                else if ($('#parentReferenceNumberNewMember').length === 0 && $('#childReferenceNumberNewMember').length > 0) { eleFocus('#childReferenceNumberNewMember') }
                else { eleFocus('#cancel, #revert') }
            }
            else if (notEditMode) {
                if ($('strong').text().indexOf('Each child must be listed') > -1) { $('table').click(function() { eleFocus('#addDB') }) }
                if (document.referrer.indexOf(thisPageNameHtm) > -1) { eleFocus('#newDB') }
                else if (!$('#add:disabled').length) { eleFocus('#addDB') }
                else { eleFocus('#newDB') } }
        }
        if (("CaseRemoveMember.htm").includes(thisPageNameHtm)) {
            if (!notEditMode) { eleFocus('#memberReferenceNumberNewMember') }
            else { eleFocus('#newDB') }
        }

        if (("CaseCSE.htm").includes(thisPageNameHtm)) {
            if (notEditMode) {
                if ($('strong').text().indexOf('Each child must be listed') > -1) { $('table').click(function() { eleFocus('#addChildDB') }) }
                if (!$('#addChild:disabled').length) { eleFocus('#addChildDB') }
                else { eleFocus('#newDB') } }
            else if ($('#csePriNewReferenceNumber').length === 0 && $('#cseChildrenGridChildNewReferenceNumber').length > 0) { eleFocus('#cseChildrenGridChildNewReferenceNumber') }
            else if ($('#csePriNewReferenceNumber').length > 0 && $('#csePriNewReferenceNumber').val()?.length === 0) { eleFocus('#csePriNewReferenceNumber') }
            else if ($('#actualDate').val()?.length === 0) { eleFocus('#actualDate') }
            else { eleFocus('#cseDetailsFormsCompleted') }
        };

        if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('strong:contains("Warning")').length > 0) { eleFocus('#saveDB') }
            else if ($('#memberReferenceNumberNewMember').val()?.length === 0) { eleFocus('#memberReferenceNumberNewMember') }
            else if (($('#primaryBeginDate').val()?.length === 0 && $('#secondaryBeginDate').val()?.length === 0) && $('#providerType').val() !== "Legal Non-licensed") { eleFocus('#primaryBeginDate') }
            else { $('#hoursOfCareAuthorized').select() }
        }

        if (("CaseSchool.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#newDB') }
            else if ($('#memberReferenceNumberNewMember').length) { eleFocus('#memberReferenceNumberNewMember') }
            else { eleFocus('#actualDate') } }
        //SUB-SECTION END Member Tab pages

        //SUB-SECTION START Case Tab pages
        if (("CaseAddress.htm").includes(thisPageNameHtm)) {
            if ($('strong:contains("Warning")').length > 0 && !notEditMode) { eleFocus('#saveDB') }
            else {
                if (notEditMode) { eleFocus('#editDB') }
                else if (!notEditMode) {
                    if ($('#effectiveDate').attr('disabled') === "disabled") {//new app mode
                        if ($('#previous').attr('disabled') === "disabled") { $('#effectiveDate').select() }//new app, editing
                        else if (!$('#residenceStreet1').val().length) {
                            if ($('#new').attr('disabled') !== "disabled") { eleFocus('#newDB') }
                            else if ($('#new').attr('disabled') === "disabled") { eleFocus('#subsidizedHousing') }
                        }
                        else { eleFocus('#wrapUpDB') } }//new app, not editing
                    else //not new app, editing
                        if ($('#subsidizedHousing').val()?.length === 0) { eleFocus('#subsidizedHousing') }
                }
            }
        }
        if (("CaseAction.htm").includes(thisPageNameHtm)) {
            if (notEditMode) {
                if (document.referrer.match(thisPageNameHtm)) { eleFocus('#wrapUpDB') }
                else { document.getElementById('delete').getAttribute('disabled') ? eleFocus ('#newDB') : eleFocus('#deleteDB') }
            } else { eleFocus('#failHomeless') } }

        if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
            if (notEditMode) {
                if (document.getElementById('redeterminationStatus').value === 'Updates Required') { eleFocus('#wrapUpDB') }
                else { eleFocus('#editDB') } }
            else if ($('strong:contains("Warning")').length > 0) { eleFocus('#saveDB') }
            else { document.getElementById('redeterminationStatus').value = 'Updates Required'; eleFocus('#receiveDate') } }

        if (("FundingAvailability.htm").includes(thisPageNameHtm)) {
            let noAutoFunds = localStorage.getItem('MECH2.autoFunds')

            let toggleFundsBtnText = noAutoFunds?.value.length ? "Default to Yes" : "Disable Auto-Yes" // value only exists if 'disabled'
            $('div#caseInput').append('<button id="toggleFunding" class="cButton float-right" type="button">'+ toggleFundsBtnText +'</button>')
            document.getElementById('toggleFunding').addEventListener('click', function() {
                if (this.textContent === "Disable Auto-Yes") {
                    localStorage.setItem('MECH2.autoFunds', 'No')
                    this.textContent = "Default to Yes"
                    noAutoFunds = "No"
                } else if (this.textContent === "Default to Yes") {
                    localStorage.removeItem('MECH2.autoFunds')
                    this.textContent = "Disable Auto-Yes"
                    noAutoFunds = ""
                }
            })
            if (notEditMode) {
                if (document.getElementById('new').getAttribute('disabled')) { eleFocus('#wrapUpDB') }
                else { eleFocus('#newDB') } }
            else if (!notEditMode) {
                let appDate = sessionStorage.getItem('actualDate')
                let bsfCode = document.getElementById('basicSlidingFeeFundsAvailableCode')
                if (bsfCode.value === '' && !noAutoFunds) {
                    bsfCode.value = 'Y' //.addClass('prefilled-field')
                    eleFocus('#saveDB')
                }
                if (appDate?.length) { document.getElementById('bSfEffectiveDate').value = appDate }
                else if (appDate?.length === 0) { eleFocus('#bSfEffectiveDate') }
            }
        }

        if (("CaseReinstate.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#editDB') }
            else { $('#reason').val().length > 0 ? eleFocus('#saveDB') : eleFocus('#reason') } }

        if (("CaseDisability.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#newDB') : eleFocus('#memberReferenceNumberNewMember') }
        //SUB-SECTION END Case Tab pages

        //SUB-SECTION START Notices Tab pages
        if (("CaseMemo.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#newDB') : eleFocus('#memberComments') }
        if (("CaseSpecialLetter.htm").includes(thisPageNameHtm) || ("ProviderSpecialLetter.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#newDB') : eleFocus('#status, #activity') }

        //SUB-SECTION START Eligibility pages
        if (["CaseEligibilityResultSelection.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
            let backgroundTransaction = $('strong:contains("Background transaction in process.")').length ? true : false
            let reloadButton = document.querySelectorAll('#submit').length ? '#submit' : '#caseInputSubmit'
            let proceedButton = document.querySelectorAll('#approve').length ? '#approveDB' : '#selectDB'
            function checkIfBackground() {
                if (backgroundTransaction) {
                    $('#approve, #select').attr('disabled','disabled')
                    $('#approveDB, #selectDB').addClass('custom-form-button__disabled');
                    eleFocus(reloadButton)
                }
                else { eleFocus(proceedButton) }}
            setTimeout(function() {
                checkIfBackground()
            },200)
            $('table').click(function() {
                checkIfBackground()
            })
        }
        if (("CaseEligibilityResultOverview.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#nextDB') : eleFocus('#type') }
        if (("CaseEligibilityResultFamily.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#nextDB') : eleFocus('#overrideReason') }
        if (("CaseEligibilityResultPerson.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#nextDB') : eleFocus('#overrideReason') }
        if (("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#nextDB') : eleFocus('#overrideReason') }
        if (("CaseEligibilityResultFinancial.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#nextDB') : eleFocus('#overrideReason') }
        if (("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#approveDB') : eleFocus('#type') }
        if (("CaseEligibilityResultApprovalPackage.htm").includes(thisPageNameHtm)) {
            if (notEditMode) { eleFocus('#approveDB')
                              $('table').click(function() { eleFocus('#confirmDB') }) }
            else { eleFocus('#confirmDB') } }
        //SUB-SECTION START Service Authorization pages
        if (("CaseCreateServiceAuthorizationResults.htm").includes(thisPageNameHtm) && notEditMode) { eleFocus('#createDB') }
        if (("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm) && notEditMode) { eleFocus('#nextDB') }
        if (("CaseCopayDistribution.htm").includes(thisPageNameHtm) && notEditMode) { eleFocus('#nextDB') }
        if (("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) {
            eleFocus('#confirmDB')
            $('table').click(function() { eleFocus('#confirmDB') })
        }

        if (("CaseTransfer.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#newDB') : eleFocus('#caseTransferFromType') }

        if (("CaseCSIA.htm").includes(thisPageNameHtm)) {
            notEditMode ? eleFocus('#newDB') : eleFocus('#nameKnown')
            document.querySelector('#caseCSIADetailData').addEventListener('click', function() { eleFocus('#newDB') })
        }

        if (("CaseNotes.htm").includes(thisPageNameHtm)) {
            if (notEditMode) {
                waitForElmHeight('#caseNotesTable > tbody > tr:not(.hidden-tr)').then(() => { if ($('#caseNotesTable > tbody > tr:not(.hidden-tr)').length) { document.querySelector('#caseNotesTable > tbody > tr:not(.hidden-tr)').click(); eleFocus('#newDB') } })
            }
            else if (!localStorage.getItem("MECH2.note")?.length) {
                $('#noteMemberReferenceNumber').focus(function() { setTimeout(document.querySelector('#save').scrollIntoView({ behavior: 'smooth', block: 'end' }), 0) })
                eleFocus('#noteMemberReferenceNumber')
            }
        };
        if (("CaseWrapUp.htm").includes(thisPageNameHtm)) {
            if (sessionStorage.getItem('processingApplication') !== null && document.referrer.indexOf("FundingAvailability.htm") < 0) {
                document.getElementById('memberMainButtons').click()
                eleFocus('#CaseParentSelf')
            } else {
                eleFocus('#doneDB')
            }
        }
        //SUB-SECTION START Billing Pages
        if (("FinancialBilling.htm").includes(thisPageNameHtm)) {
            if (notEditMode) {
                eleFocus('#editDB')
            } else {
                setTimeout(function() {
                    eleFocus('#billedTimeType')
                }, 1000)
            }
        }
        if (("FinancialBillingApproval.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#approveBillingDB') : eleFocus('#remittanceComments') }
        if (("FinancialBillingRegistrationFeeTracking.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#addDB') : eleFocus('#caseTransferFromType') }
        if (("FinancialAbsentDayHolidayTracking.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#addDB') : eleFocus('#caseTransferFromType') }
        if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#mpProviderId') : eleFocus('#mpProviderId') }

        if (!notEditMode && document.querySelectorAll('strong').length) {
            if ($('strong:contains("Actual Date is missing")').length) {
                eleFocus('#actualDate')
                let today = new Date()
                if ( new Date(periodDates.start) < today && today < new Date(periodDates.end) ) { $('#actualDate').val(today.toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit" }) )}
            } else if ($('strong:contains("is missing")')) {
                eleFocus($('errordiv').prev('div').find('select, input'))
            }
        }
    }

    if (providerId) {
        //SUB-SECTION START Provider pages
        // if (("ProviderRegistrationAndRenewal") > -1) { notEditMode ? eleFocus('#editDB') : eleFocus('#nextRenewalDue') }
        if (("ProviderInformation.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#editDB') : eleFocus('#contactEmail') }
        if (("ProviderAddress.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#editDB') : eleFocus('#mailingSiteHomeStreet1') }
        if (("ProviderAccreditation.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#editDB') : eleFocus('#accreditationType') }
        if (("ProviderLicense.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#editDB') : eleFocus('#licenseNumber') }
        if (("ProviderAlias.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#addBusiness') : eleFocus('#name') }
        if (("ProviderTaxInfo.htm").includes(thisPageNameHtm)) { notEditMode ? eleFocus('#newDB') : eleFocus('#taxType') }

    }
    //SUB-SECTION START Non-collection pages
    if (("/AlertWorkerCreatedAlert.htm").includes(thisPageNameHtm)) { eleFocus('#delayNextMonth') }
    if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm)) { if (notEditMode) { eleFocus('#new') } else { $('#pmiNumber').attr('disabled') === 'disabled' ? eleFocus('#next') : eleFocus('#pmiNumber') } };
    if (("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) {
        if ($('#next').attr('disabled') === 'disabled') {
            let unchecked = $('#countiesTable td>input.form-check-input').filter(function() { return $(this).prop('checked') === false }).addClass('required-field')
            if (unchecked.length) { eleFocus('#' + unchecked[0].id) }
            else { eleFocus('#addccap') } }
        else { eleFocus('#next') }
    }
    if (("ClientSearch.htm").includes(thisPageNameHtm)) { $('#clientSearchTable>tbody>tr>td.dataTables_empty').length === 1 && eleFocus('#ssnReq') }
    if (("ProviderSearch.htm").includes(thisPageNameHtm)) { $('#providerSearchTable>tbody>tr>td.dataTables_empty').length === 1 && eleFocus('#providerIdNumber') }
    //
    if (("ServicingAgencyIncomingTransfers.htm").includes(thisPageNameHtm) && !notEditMode) { eleFocus('#workerIdTo') }

} catch(error) { console.log("eleFocus section"); console.log(error); console.trace() }
//SECTION END Focusing the first desired element on pages


//SECTION START Footer links
document.querySelector('#contactInformation').textContent = "Help Info"
$('#footer_links>a[href="https://bi.dhs.state.mn.us/BOE/BI"]').text('BOBI')
$('#footer_links>a[href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=mecc-0001"]')
    .text('Incomplete User Manual')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_139409" target="_blank">Old User Manual</a>')
    .attr('href', 'https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=MECC-0001')
$('#footer_links>#contactInformation')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://moms.mn.gov/" target="_blank">MOMS</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://smi.dhs.state.mn.us/" target="_blank">SMI</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://www.mnworkforceone.com/" target="_blank">WF1</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://owa.dhssir.cty.dhs.state.mn.us/owa/" target="_blank">SIR Mail</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://policyquest.dhs.state.mn.us/" target="_blank">PolicyQuest</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://owa.dhssir.cty.dhs.state.mn.us/csedforms/ccforms/TSS_PMI_Merge_Request.aspx" target="_blank">PMI Merge</a>')
    .after('<span style="margin: 0 .3rem; pointer-events: none;">ı</span><a href="https://owa.dhssir.cty.dhs.state.mn.us/csedforms/MMR/TSS_General_Request.asp" target="_blank">Help Desk</a>')
$('#footer_links').contents().filter(function() { return this.nodeType === 3 }).replaceWith('<span style="margin: 0 .3rem; pointer-events: none;">ı</span>')
//SECTION END Footer links


// ======================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// PAGE SPECIFIC CHANGES SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================

//SECTION START Active caseload numbers
if (("ActiveCaseList.htm").includes(thisPageNameHtm)) {
    $('h5').append(" " + $('td:contains("Active")').length + " active. " + ($('td:contains("Suspended")').length + $('td:contains("Temporarily Ineligible")').length) + " suspended/TI.")

    // function checkCaseInfo(caseNumber) { // evalData!
    //     // blarg
    // }

    function getResidenceCity(caseNumber, ele) {
        $.get('/ChildCare/CaseAddress.htm?parm2=' + caseNumber, function(result) {
            let dataObject = result.slice(result.indexOf('\"residenceCity\"')+17);
            dataObject = dataObject.slice(0, dataObject.indexOf(",") -1);
            $(ele).parent().next().append(" - ").append(dataObject);
        });
    };

    $('#caseResultsData').after(' <div class="flex-horizontal"> <button type="button" id="locationCopyButton" class="cButton" type="button">Copy Location Data for Excel</button> <button type="button" id="getLocationDataButton" class="cButton" type="button">Get Location Data</button> </div> ')
    $('#locationCopyButton').click(function() {
        const copiedData = [];
        $('tbody a').each(function() {
            const newRow = [$(this).html(), $(this).parent().next().contents().eq(0).text(), $(this).parent().next().contents().eq(2).text()]
            copiedData.push(newRow);
        });
        const excelData = copiedData
        .map(lines => lines.join("\t"))
        .join("\n");
        navigator.clipboard.writeText(excelData);
    });
    $('#getLocationDataButton').click(function() {
        $('tbody a').each(function() {
            getResidenceCity($(this).html(), $(this));
        });
    });
};
//SECTION END Active caseload numbers

// =============================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// Alerts (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// =============================================================================================================================================================================================

////// ALERTS.htm start ////// ("Alerts.htm")
if ("/Alerts.htm".includes(slashThisPageNameHtm)) {
    let caseOrProviderAlertsTable = document.querySelector('table#caseOrProviderAlertsTable >tbody')
    let $caseOrProviderAlertsTable = $('#caseOrProviderAlertsTable >tbody')
    let preCreated = sessionStorage.getItem('MECH2.preCreated')
    document.getElementById('new').addEventListener('click', function() { sessionStorage.setItem('MECH2.preCreated', document.getElementById("groupId").value) })
    if (localStorage.getItem('MECH2.userName') === null || localStorage.getItem('MECH2.userName') === undefined && document.referrer === "https://mec2.childcare.dhs.state.mn.us/ChildCare/Welcome.htm") {
        let userNameObserver = new MutationObserver(function(mutations) {
            mutations.forEach((mutation) => {
                let workerName = mutation.target.value
                workerName = reorderCommaName(workerName)
                let truncatedWorkerName = workerName.replace(/(\s\w)\w+/, '$1')
                localStorage.setItem('MECH2.userName', truncatedWorkerName)
                userNameObserver.disconnect()
            })
        })
        const workerName = document.querySelector('#workerName')
        userNameObserver.observe(workerName, { attributeFilter: ["tabindex"] })
    }
    // setTimeout(function() {
    //     if (preCreated?.length && caseOrProviderAlertsTable.querySelectorAll('tr')?.length > 1) {
    //         $('td:contains(' + preCreated + ')', $caseOrProviderAlertsTable).parent('tr').attr('id','preCreated')
    //         let activeCase = document.getElementById('preCreated')
    //         activeCase.click()
    //         activeCase.scrollIntoView({ behavior: "smooth", block: "center" })
    //         sessionStorage.removeItem('MECH2.preCreated')
    //     }
    // }, 200)
    setTimeout(function() {
        if ($('#alertTotal').val() > 0 && $('td.dataTables_empty', $caseOrProviderAlertsTable).length) { $('#alertInputSubmit').click() }
        if (preCreated?.length && caseOrProviderAlertsTable.querySelectorAll('tr')?.length > 1) {
            $('td:contains(' + preCreated + ')', $caseOrProviderAlertsTable).parent('tr').attr('id','preCreated')
            let activeCase = document.getElementById('preCreated')
            activeCase.click()
            activeCase.scrollIntoView({ behavior: "smooth", block: "center" })
            sessionStorage.removeItem('MECH2.preCreated')
        }
    }, 300)
    $('#delete').after($('#new'))
    $('#alertTotal').after('<button type="button" class="form-button centered-text" id="deleteTop">Delete Alert</button>')
    $('#deleteTop').click(function() { $('#delete').click()});

    //SECTION START Delete all alerts of current name onclick
    let oCaseDetails = {}
    let vNumberToDelete
    let vCaseName
    let vCaseOrProvider
    let vCaseNumberOrProviderId
    function whatAlertType() {
        switch ($('>tr.selected>td:eq(0)', $caseOrProviderAlertsTable).html().toLowerCase()) {
            case "case":
                return { page: "CaseNotes.htm", type: "Case", number: $('#caseNumber').val(), name: $(''), parameters: fGetCaseParameters() }
                break
            case "provider":
                return { page: "ProviderNotes.htm", type: "Provider", number: $('#providerId').val(), parameters: fGetProviderParameters() }
                break
            default:
                break
        }
    }
    $('#deleteTop').after('<button type="button" class="form-button centered-text doNotDupe" id="deleteAll" title="Delete All" value="Delete All">Delete All</button>');
    $('#deleteTop').after('<button type="button" class="form-button centered-text doNotDupe hidden" id="stopDeleteAll" title="Stop Deleting" value="Stop Deleting">Deleting...</button>');
    $('h4:contains("Case/Provider List")')
        .wrap('<div>')
        .after('<h4 style="float: right; display:inline-flex color: #003865; font-size: 1.2em; font-weight: bold;" id="alertMessage"></h4>');
    $('#alertsPanelData>div.panel-default').addClass('flex-vertical')
    let vDeleteAllButton = document.getElementById('deleteAll')
    let vHaltDeleting
    const observerDelete = new MutationObserver(e => { fDoDeleteAll() })
    $('#deleteAll').on("click", function(button) {
        oCaseDetails = whatAlertType()
        vCaseOrProvider = oCaseDetails.type
        if (!["case", "provider"].includes(vCaseOrProvider.toLowerCase())) { return }
        vNumberToDelete = oCaseDetails.number
        vCaseName = $('#groupName').val()//name on page
        observerDelete.observe(document.querySelector('#delete'), {attributeFilter: ['value']})
        $('#deleteAll, #stopDeleteAll').toggleClass('hidden')
        fDoDeleteAll()
    })
    $('#stopDeleteAll').on("click", function(button) {
        vHaltDeleting = 1
    })
    function fDoDeleteAll(e) {//Test worker ID PWSCSP9
        if ($('#delete').val() !== "Please wait") {
            if (!vHaltDeleting) {
                if ($('#delete').val() === "Delete Alert" && $('#caseNumber, #providerId').val() === oCaseDetails.number && vNumberToDelete === $('#groupId').val() && $('#caseOrProviderAlertsTable td:contains("' + vCaseName + '")').nextAll().eq(1).html() > 0) {
                    $('#delete').click();
                } else {
                    fDoDeleteAllCheck()
                }
            } else if (vHaltDeleting) {
                $('#deleteAll, #stopDeleteAll').toggleClass('hidden')
                observerDelete.disconnect()
                vHaltDeleting = 0
            }
        }
    }
    function fDoDeleteAllCheck() {
        if ($('#delete').val() === "Please wait") { return }
        if ($('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').nextAll().eq(1).html() > 0) {
            $('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').parent('tr').click()
            setTimeout(function() { return fDoDeleteAll() }, 100)
        }
        if ($('#caseOrProviderAlertsTable td:contains("' + vCaseName + '")').nextAll().eq(1).html() < 1) {//Any alerts to delete?
            $('#alertMessage').text('Delete All ended. All alerts deleted from ' + vCaseOrProvider + ' ' + vNumberToDelete + '.');
        } else if (vNumberToDelete !== $('#caseNumber, #providerId').val()) {
            if (!$('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')')) {
                switch(vCaseOrProvider) {
                    case "case":
                        $('#alertMessage').text('Case number not present.')
                        break
                    case "provider":
                        $('#alertMessage').text('Provider ID not present.')
                        break
                    default:
                        break
                }
            };
        };
        $('#deleteAll, #stopDeleteAll').toggleClass('hidden')
        observerDelete.disconnect()
    };
    //SECTION END Delete all alerts of current name onclick

    //SECTION START Do action based on Alert Type
    const aCaseCategoryButtons = [
        ["Elig.", "CaseEligibilityResultSelection"],
        ["SA:O", "CaseServiceAuthorizationOverview"],
        ["SA:A", "CaseServiceAuthorizationApproval"],
        ["Address", "CaseAddress"],
        ["Members", "CaseMember"],
        ["Provider", "CaseChildProvider"],
        ["Notes", "CaseNotes"],
        ["Overview", "CaseOverview"],
        ["Edits", "CaseEditSummary"],
        ["Pages", "CasePageSummary"],
        ["CSI", "CaseCSIA"],
        /*
        ["", ""],
        */
    ]
    const aProviderCategoryButtons = [
        ["Address", "ProviderAddress"],
        ["Alias", "ProviderAlias"],
        ["Info", "ProviderInformation"],
        ["Notices", "ProviderNotices"],
        ["Overview", "ProviderOverview"],
        ["Rates", "ProviderRates"],
        ["Registration", "ProviderRegistrationAndRenewal"],
        /*
        ["", ""],
        */
    ]
    $('#delete').parent().append('<div id="baseCategoryButtonsDiv" class="form-group-no-margins"><div id="caseCategoriesButtonsDiv" class="collapse form-group-button-children"></div><div id="providerCategoriesButtonsDiv" class="collapse form-group-button-children"></div></div>')
    function createCategoryButtons() {
        let caseCategoryButtons = ""
        aCaseCategoryButtons.forEach(function(i) {
            let vButtonHtml = '<button type="button" class="narrow-form-button form-button" id="' + [i[1]] + '">' + [i[0]] + '</button>'
            caseCategoryButtons += vButtonHtml
        })
        document.getElementById('caseCategoriesButtonsDiv').insertAdjacentHTML("beforeend", caseCategoryButtons)
        let providerCategoryButtons = ""
        aProviderCategoryButtons.forEach(function(i) {
            let vButtonHtml = '<button type="button" class="narrow-form-button form-button" id="' + [i[1]] + '">' + [i[0]] + '</button>'
            providerCategoryButtons += vButtonHtml
        })
        document.getElementById('providerCategoriesButtonsDiv').insertAdjacentHTML("beforeend", providerCategoryButtons)
    }
    createCategoryButtons()
    function fBaseCategoryButtons() {
        switch ($('#caseOrProviderAlertsTable>tbody>.selected>td:eq(0)').text()) {
            case "Case":
                if ($('#caseCategoriesButtonsDiv').hasClass('collapse')) {
                    $('#providerCategoriesButtonsDiv').addClass('collapse')
                    $('#caseCategoriesButtonsDiv').removeClass('collapse')
                }
                break
            case "Provider":
                if ($('#providerCategoriesButtonsDiv').hasClass('collapse')) {
                    $('#caseCategoriesButtonsDiv').addClass('collapse')
                    $('#providerCategoriesButtonsDiv').removeClass('collapse')
                }
                break
            default:
                break
        }
    }
    fBaseCategoryButtons()
    $('#caseOrProviderAlertsTable').click(() => fBaseCategoryButtons() )
    $('#baseCategoryButtonsDiv').click(function(e) { if (e.target.tagName === "BUTTON") {
        window.open('/ChildCare/' + e.target.id + '.htm' + whatAlertType().parameters, '_blank')
    } })
    //SECTION END Do action based on Alert Type

    //AutoCaseNoting; Alert page section
    let pagesData = []
        //categories: Absent Days, Activity Change, Appeal, Application, Child Support Note, Email Contact, Expense Change, Fraud, Household Change, Income Change,
        //Medical Leave, NCP Information, Office Contact, Phone Contact, Provider Change, Redetermination, Special Needs, Other
    const oAlertCategoriesLowerCase = {//categories are alpha-sorted
        childsupport: {
            messages: {
                nameChange: {
                    textIncludes: /Parentally Responsible Individual Ref #\d{2} reported a name change/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
                },
                ncpAddress: {
                    textIncludes: /Absent Parent of Child Ref #\d{2} has an address/,
                    noteCategory: "NCP Information",
                    noteSummary: "doReplace",
                    page: "",
                },
                cpAddress: {
                    textIncludes: /Parentally Responsible Individual Ref #\d{2} add/,
                    noteCategory: "Household Change",
                    noteSummary: "doReplace",
                    page: "",
                },
                nonCoopCS: {
                    textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is not cooperating/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
                },
                coopCS: {
                    textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is cooperating/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
                },
            },
        },
        eligibility: {
            messages: {
                unpaidCopay: {
                    textIncludes: /Failure to pay copayment/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                },
            },
        },
        information: {
            messages: {
                closeSusp: {
                    textIncludes: /allowed period of suspension expires/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                },
                closeTI: {
                    textIncludes: /allowed period of temporary ineligibility expires/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                },
                mailed: {
                    textIncludes: /Redetermination form has been mailed/,
                    noteCategory: "Redetermination",
                    noteSummary: "doReplace",
                    page: "",
                },
                noRedet: {
                    textIncludes: /Redetermination has not been received/,
                    noteCategory: "Redetermination",
                    noteSummary: "Closing %0: Redet not complete/received",
                    pages: ["CaseOverview:0.0.programBeginDateHistory"],
                },
                autoDenied: {
                    textIncludes: /This case has been auto-denied/,
                    noteCategory: "Application",
                    noteSummary: "This case has been auto-denied",
                },
                servicingEnd: {
                    textIncludes: /The Servicing Ends date/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                },
            }
        },
        maxis: {
            messages: {
                memberLeft: {
                    textIncludes: /Member Left date/,
                    noteCategory: "Household Change",
                    intendedPerson: true,
                    noteSummary: "doReplace",
                    page: "",
                },
                residenceAddress: {
                    textIncludes: /Residence Address has been/,
                    noteCategory: "Household Change",
                    noteSummary: "Residence address changed by MAXIS worker",
                    page: "CaseAddress",
                    pageFilter: "",
                },
                mailingAddress: {
                    textIncludes: /Mailing Address has been/,
                    noteCategory: "Household Change",
                    noteSummary: "Mailing address changed by MAXIS worker",
                    page: "CaseAddress",
                    pageFilter: "",
                },
            },
        },
        periodicprocessing: {
            messages: {
                jsHours: {
                    textIncludes: /Job Search Hours available will run out/,
                    noteCategory: "Activity Change",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
                },
                homelessExpiring: {
                    textIncludes: /The Homeless 3 month period will expire/,
                    noteCategory: "Application",
                    noteSummary: "doReplace",
                    page: "",
                },
                homelessMissing: {
                    textIncludes: /Homeless case has one or more missing/,
                    noteCategory: "Application",
                    noteSummary: "Homeless case has missing verifications",
                    page: "",
                },
                extendedEligExpiring: {
                    textIncludes: /activity extended eligibility/,
                    noteCategory: "Activity Change",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
                },
                tyExpires: {
                    textIncludes: /The allowed time on Transition Year will expi/,
                    noteCategory: "Other",
                    noteSummary: "Approved TY to BSF eligibility results",
                    page: "CaseOverview",
                    pageFilter: "",
                },
                disabilityExpires: {
                    textIncludes: /The allowed disability period/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
                },
                ageCategory: {
                    textIncludes: /Member turned/,
                    noteCategory: "Other",
                    noteSummary: "",
                    page: "",
                    intendedPerson: true,
                },
            },
        },
        provider: {
            messages: {
                providerDeactivated: {
                    textIncludes: /Provider has been deactivated/,
                    noteCategory: "Provider Change",
                    noteSummary: "Provider deactivated. Renewal was not received.",
                    pages: ["CaseServiceAuthorizationOverview:1"],
                    pageFilter: "Provider No Longer Eligible",
                },
                providerRegistrationClosed: {
                    textIncludes: /Provider's Registration Status is closed/,
                    noteCategory: "Provider Change",
                    noteSummary: "Provider's Registration Status is closed.",
                    page: "",
                    pageFilter: "",
                },
            },
        },
        serviceauthorization: {
            messages: {
                paEnd: {
                    textIncludes: /ParentAwareEnd/,
                    noteCategory: "Provider Change",
                    noteSummary: "doReplace",
                    page: "",
                },
                paStart: {
                    textIncludes: /ParentAwareStart/,
                    noteCategory: "Provider Change",
                    noteSummary: "doReplace",
                    page: "",
                },
                providerClosed: {
                    textIncludes: /ProviderClosed/,
                    noteCategory: "Provider Change",
                    noteSummary: "doReplace",
                    page: "",
                },
            },
        },
        workercreated: {
            messages: {
                approveMFIPclosing: {
                    textIncludes: /Approve new results/,
                    noteCategory: "Other",
                    noteSummary: "Approved CCMF to TY switch",
                    page: "Overview.htm",
                    pageFilter: "",
                },
            },
        },
    };
    async function fGetNoteSummary(obj, msgText, personName) {
        switch(obj) {
            case "eligibility.messages.unpaidCopay.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4}) - (\d{2}\/\d{2}\/\d{2,4})/, "Unpaid copay for period $1 - $2")
                break

            case "information.messages.mailed.noteSummary":
                return "Redetermination mailed, due " + addDays(document.querySelectorAll('#alertTable .selected>td')[1].textContent, 45).toLocaleDateString('en-US', {year: "2-digit", month: "numeric", day: "numeric"})
                break
            case "information.messages.closeSusp.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Auto-closing: 1yr suspension expires on $1")
                break
            case "information.messages.closeTI.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Auto-closing: TI period expires on $1")
                break
            case "information.messages.servicingEnd.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Servicing Ends date changed to $1")
                break

            case "maxis.messages.memberLeft.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z ]*)(?:X[A-Z0-9]{6})(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2,4})./, "REMO: " + personName + " left $1")
                break
                // case "maxis.messages.residenceAddress.noteSummary":
                //     return document.getElementById("message").value.replace(/(?:[A-Za-z ]*)(?:X[A-Z0-9]{6})(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2})./, "REMO: " + personName + " left $1")
                //     break

            case "childsupport.messages.nameChange.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/, "PRI$1")
                break
            case "childsupport.messages.ncpAddress.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})(?:[a-z- +]+)/, "ABPS of $1 address: ").replace(/(\d{5})(?:\d{4})/, "$1")
                break
            case "childsupport.messages.cpAddress.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(?:\#\d{2})(?:[A-Za-z- +]+)/, "HH address per PRISM: ").replace(/(\d{5})(?:\d{4})/, "$1")
                break
            case "childsupport.messages.nonCoopCS.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/,"PRI$1")
                break
            case "childsupport.messages.coopCS.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/,"PRI$1")
                break

            case "periodicprocessing.messages.extendedEligExpiring.noteSummary":
                return document.getElementById("message").value.replace(/The (\w+)(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Ext Elig ($1) ends $2")
                break
            case "periodicprocessing.messages.jsHours.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Job search hours end $1")
                break
            case "periodicprocessing.messages.tyExpires.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\d{2}\/\d{2}\/\d{2,4})/, "Approved TY to BSF elig results eff $1")
                break
            case "periodicprocessing.messages.homelessExpiring.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z0-9 ]*) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "Homeless period expires $1; case set to TI")
                break
            case "periodicprocessing.messages.disabilityExpires.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "The allowed disability period will end $1")
                break
            case "periodicprocessing.messages.ageCategory.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "The allowed disability period will end $1")
                break
        }
    }
    window.addEventListener("beforeunload", () => localStorage.removeItem( "MECH2.note") )
    function findAlertCategory() {}
    async function fAutoCaseNote() {
        pagesData = []
        let foundAlert = {}
        let oWhatAlertType = await whatAlertType() // Case or Provider
        let messageText = document.getElementById("message").value
        let alertCategory = document.querySelector('#alertTable .selected>td').textContent.toLowerCase().replace(" ", "")
        for (let message in oAlertCategoriesLowerCase[alertCategory]?.messages) {
            if (Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "noteSummary") && oAlertCategoriesLowerCase[alertCategory]?.messages[message]?.textIncludes.test(messageText) === true) {
                foundAlert = structuredClone(oAlertCategoriesLowerCase[alertCategory].messages[message])
                if ( Object.hasOwn(foundAlert, "intendedPerson") ) {
                    foundAlert.personName = reorderCommaName(document.querySelector('#alertTable_wrapper #alertTable > tbody > tr.selected > td:nth-of-type(3)').textContent)
                    foundAlert.intendedPerson = foundAlert.personName.replace(/(\b\w+\b)(?:.+)/, "$1").toUpperCase()
                }
                if (foundAlert.noteSummary === "doReplace") {
                    foundAlert.noteSummary = await fGetNoteSummary(alertCategory + ".messages." + message + ".noteSummary", foundAlert.noteMessage, foundAlert.personName)
                } else if (foundAlert.noteSummary === "") { foundAlert.noteSummary = messageText }
                if (Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "pages")) {
                    let dateRange = undefined
                    if (Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "dateRange")) {
                        let startDate = document.getElementById('periodBeginDate').value
                        let endDate = document.getElementById('periodEndDate').value
                        if (dateRange !== 0) {
                            startDate = addDays(startDate, dateRange*14)
                            endDate = addDays(endDate, dateRange*14)
                            dateRange = (startDate.toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit" })+endDate.toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit" })).replaceAll(/\//g, '')
                        }
                    }
                    let pages = oAlertCategoriesLowerCase[alertCategory]?.messages[message].pages
                    for (let page of pages) {
                        let pageSplit = page.split(":")
                        pagesData.push(await evalData(oWhatAlertType.number, pageSplit[0], dateRange, pageSplit[1]))
                    }
                    for (let i = 0; i < pagesData.length; i++) {
                        foundAlert.noteSummary = foundAlert.noteSummary.replace("%"+i, pagesData[i])
                    }
                }
            }
        }
        if (foundAlert === 'undefined' || !Object.keys(foundAlert)?.length) { foundAlert = { noteSummary: messageText.slice(0, 50), noteCategory: "Other" } } // Generic case note
        foundAlert.noteMessage = messageText
        let longWorkerName = document.getElementById('workerName').value
        let workerName = longWorkerName.replace(/\w\./,)
        workerName = await reorderCommaName(document.getElementById('workerName').value)
        let shortWorkerName = workerName.replace(/(\s\w)\w+/, '$1')
        foundAlert.worker = shortWorkerName
        foundAlert.xNumber = document.getElementById("inputWorkerId").value.toLowerCase()
        foundAlert.page = oWhatAlertType.page
        foundAlert.parameters = oWhatAlertType.parameters
        foundAlert.number = oWhatAlertType.number
        // console.log(foundAlert)
        return foundAlert
    }
    $('h4:contains(Alert Detail)')
        .attr('style', 'display: inline-block;')
        .wrap('<div>')
        .after('<button type="button" class="cButton" style="display: inline-block; margin-left: 10px;" tabindex="-1" id="autoCaseNote">Automated Note</button>');
    $('#autoCaseNote').click(function() { fAutoCaseNote().then( function(returnedAlert) {
        let readiedAlert = {}
        readiedAlert[returnedAlert.number] = structuredClone(returnedAlert)
        localStorage.setItem( "MECH2.note", JSON.stringify( readiedAlert ) )
        window.open('/ChildCare/' + returnedAlert.page + returnedAlert.parameters, '_blank')
    } ) })
    //function in Object
    //let testObj = { groupId: function() { return document.getElementById('groupId') }}
    //testObj.groupId()//.value, etc

    /*
    //SECTION END Copy Alert text, navigate to Notes

    //SECTION START Copy alert text to Case Notes via iframe
    $('div.panel:has(>div#alertButtonHouse)').after('<div class="panel panel-default panel-box-format collapse"><iframe id="notesIframe" name="notesIframe" height="300px" width="100%"></iframe></div>')
    let notesIframe = document.getElementById('notesIframe')
    // // notesIframe.contentWindow //To operate on iframe window...
    function fAutoNote() {//whatAlertType().number
        let copyText = document.getElementById("message").value.replaceAll('/n', ' ');
        localStorage.setItem("MECH2.caseNote." +$('#groupId').val(), copyText)
        addEventListener('storage', function(key, newValue) {
            switch (event.key) {
                case "MECH2.' + $('#groupId').val() + '.notesViewOrEdit": //case "MECH.autoNoteText":
                    console.log(event.newValue)
                    break
                case "MECH2.' + $('#groupId').val() + '.notesViewOrEdit": //case "MECH.autoNoteStatus":
                    console.log(event.newValue)
                    break
            }
        })
        let vDetailToNotes = [$('#message').val(), $( vCaseNumberOrProviderId ).val()]
    }
    function fAutoNoteSwitch() {}
    //SECTION END Copy alert text to Case Notes via iframe
*/
};
// =================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// Alerts end (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// =================================================================================================================================================================================================


//SECTION START Buttons to delay approving MFIP switching to TY/BSF
if (["/AlertWorkerCreatedAlert.htm"].includes(slashThisPageNameHtm)) {
    if ($('#providerAlertDisplay').css('display') === "none") {//Exclude provider alerts
        let delayNextMonth = new Date(new Date().setMonth(new Date().getMonth() +1, 1)).toLocaleDateString('en-US', {year: "numeric", month: "2-digit", day: "2-digit", });
        let delayMonthAfter = new Date(new Date().setMonth(new Date().getMonth() +2, 1)).toLocaleDateString('en-US', {year: "numeric", month: "2-digit", day: "2-digit", });
        $('#message').parent().after('<div class="col-lg-3" id="delay"><button type="button" class="cButton__nodisable" style="margin-bottom: 3px;" id="delayNextMonth">MFIP Close Delay Alert: ' + delayNextMonth + '</button><button type="button" class="cButton__nodisable" id="delayMonthAfter">MFIP Close Delay Alert: ' + delayMonthAfter + '</button></div>')
        $('#delayNextMonth').click(function(e) {
            $('#message').val("Approve new results (BSF/TY/extended eligibility) if MFIP not reopened.");
            $('#effectiveDate').val(delayNextMonth);
            $('#save').click();
        });
        $('#delayMonthAfter').click(function(e) {
            $('#message').val("Approve new results (BSF/TY/extended eligibility) if MFIP not reopened.");
            $('#effectiveDate').val(delayMonthAfter);
            $('#save').click();
        });
    }
};
//SECTION END Add date delay to approving MFIP close and TY/BSF open
//
if (("CaseAction.htm").includes(thisPageNameHtm)) {
    document.getElementById('failHomeless').addEventListener('click', (() => eleFocus('#saveDB') ))
}
//SECTION START CaseAddress Copy client mail to address to clipboard on Case Address page
if (("CaseAddress.htm").includes(thisPageNameHtm)) {
    let $mailingFields = $('h4:contains("Mailing Address")').siblings().find('input, select').add($('#residenceStreet2')).not($('#mailingZipCodePlus4'))
    $('h4:contains(Residence Address)').after('<button type="button" class="cButton centered-text float-right" tabindex="-1" id="copyMailing">Copy Mail Address</button>');
    // $('#effectiveDate').parent().after('<button type="button" class="cButton centered-text float-right" tabindex="-1" id="copyMailing">Copy Mail Address</button>');
    $('#copyMailing').click(function() {
        let oCaseName = fCaseName()
        if ($('#mailingStreet1').val() !== "") {
            let state = swapStateNameAndAcronym(document.getElementById('mailingStateProvince').value)
            let copyText = oCaseName.first + " " + oCaseName.last + "\n" + document.getElementById('mailingStreet1').value + " " + document.getElementById('mailingStreet2').value + "\n" + document.getElementById('mailingCity').value + ", " + state + " " + document.getElementById('mailingZipCode').value
            navigator.clipboard.writeText(copyText)
            snackBar(copyText);
        } else {
            let state = swapStateNameAndAcronym(document.getElementById('residenceStateProvince').value)
            let copyText = oCaseName.first + " " + oCaseName.last + "\n" + document.getElementById('residenceStreet1').value + " " + document.getElementById('residenceStreet2').value + "\n" + document.getElementById('residenceCity').value + ", " + state + " " + document.getElementById('residenceZipCode').value
            navigator.clipboard.writeText(copyText)
            snackBar(copyText);
        };
    });

    $('#mailingStreet1').val()?.length === 0 && !$('#edit').prop('disabled') && (checkMailingAddress())//Shrinks mailing address if blank
    $('#providerData :is(input, select)').filter(function() { return this.value === '' }).closest('.form-group').addClass('collapse')
    if (notEditMode) {
        $('#phone2, #phone3, #contactNotes, #email').filter(function() { return this.value === '' }).closest('.form-group').addClass('collapse')
        checkMailingAddress()
    };
    function checkMailingAddress() {
        $mailingFields.filter(function() { return this.value === '' }).closest('.form-group').addClass('collapse')
        $mailingFields.filter(function() { return this.value !== '' }).closest('.form-group').removeClass('collapse')
    };
    $('#caseAddressTable').click(function() { checkMailingAddress() });
};
//SECTION END CaseAddress

if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm) && !notEditMode) {
    selectPeriodReversal('#selectPeriod')
    document.getElementById('save').addEventListener('click', function() {
        sessionStorage.setItem('actualDate', document.getElementById('applicationReceivedDate').value)
        sessionStorage.setItem('processingApplication', "yes")
    })
    // fRemoveWhitespace($('#selectPeriod').closest('.form-group'))
    $('#applicationReceivedDate').on("blur change", function() {
        if (this.value.length < 10) { return false }
        let appDate = new Date(this.value)
        if ( appDate < new Date('1/1/2020') ) { return false }
        else {

            let benPeriodDate = { start: new Date($('#selectPeriod').val().slice(0,10)), end: new Date($('#selectPeriod').val().slice(13)) }
            if (benPeriodDate.end > appDate && appDate > benPeriodDate.start) { return false }
            let periodValue = $('#selectPeriod option').slice(0, 26).filter(function() {
                return new Date(this.value.slice(13)) >= appDate && appDate >= new Date(this.value.slice(0 ,10))
            })
            $('#selectPeriod').val(periodValue[0].value)
            eleFocus('#save')
            $('.hasDatepicker').datepicker("hide")
            $('#applicationReceivedDate').off("blur change")
        }
    })
};
//SECTION START auto-fill, Open provider information page from Child's Provider page
if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
    //custom CSS to rearrange the page
    $('label[for="providerLivesWithChild"]').text('Lives with Child: ').attr('class', 'control-label textInherit textR col-md-2 col-lg-2')
    $('label[for="providerLivesWithChild"]').add($('label[for="providerLivesWithChild"]').siblings()).appendTo($('label[for="childCareMatchesEmployer"]').parent())
    $('label[for="relatedToChild"]').attr('class', 'control-label textInherit textR col-md-2 col-lg-2')
    $('label[for="relatedToChild"]').add($('label[for="relatedToChild"]').siblings()).appendTo($('label[for="careInHome"]').parent());
    $('div.form-group:has(div.col-lg-12:not(:has(*)))').remove()
    let $lnlGroup = $('#careInHome, #providerLivesWithChildBeginDate, #careInHomeOfChildBeginDate, #formSent, #signedFormReceived').parents('.form-group')
    let $lnlTrainingDivs = $('#emptyDiv')
    let $licensedGroup = $('#primaryBeginDate, #secondaryBeginDate').parents('.form-group')
    let $careInHomeGroup = $('#exemptionReason, #exemptionPeriodBeginDate').parents('.form-group')
    let $livesWithChildGroup = $('label[for=providerLivesWithChild], label[for=providerLivesWithChild]+div.col-lg-2').removeAttr('style')
    document.getElementById('reporterType').setAttribute('disabled', 'disabled')
    // Buttons for added functionality
    if (notEditMode) {
        $('#providerName').parent().after('<button type="button" class="cButton float-right" tabindex="-1" id="providerAddressButton">Provider Address</button>')
        $('#providerAddressButton').click(function(e) {
            e.preventDefault()
            window.open("/ChildCare/ProviderAddress.htm?providerId=" + $('#providerId').val(), "_blank");
        })
        $('#providerSearch').parent().after('<button type="button" class="cButton float-right" tabindex="-1" id="providerInfoButton">Provider Contact</button>')
        $('#providerInfoButton').click(function(e) {
            e.preventDefault()
            window.open("/ChildCare/ProviderInformation.htm?providerId=" + $('#providerId').val(), "_blank");
        })
    } else if (!notEditMode) {
        $('#providerType').parent().after('<button type="button" class="cButton float-right cButton__nodisable" tabindex="-1" id="resetCCPForm">Clear Dates & Hours</button>')
        $('#resetCCPForm').click(function(e) {
            e.preventDefault()
            $('#careEndReason').val($('#careEndReason').val(''))
            $('#primaryBeginDate, #secondaryBeginDate, #carePeriodBeginDate, #carePeriodEndDate, #primaryEndDate, #secondaryEndDate, #hoursOfCareAuthorized').val('')
            eleFocus('#primaryBeginDate')
        })
        $('#primaryEndDate').parent().after('<button type="button" class="cButton float-right cButton__nodisable" tabindex="-1" id="unendSACCPForm">Clear End Dates & Reason</button>')
        $('#unendSACCPForm').click(function(e) {
            e.preventDefault()
            $('#careEndReason').val($('#careEndReason').val(''))
            doEvent('#careEndReason')
            $('#carePeriodEndDate, #primaryEndDate, #secondaryEndDate').val('')
            eleFocus('#hoursOfCareAuthorized')
        })
    }
    //

    // Copy/paste start/end dates
    if (notEditMode) {
        queueMicrotask(() => {
            // setTimeout(function() {
            document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='copyStart' class='form-button hidden'>Copy Start</button><button type='button' id='copyEndings' class='form-button hidden'>Copy Endings</button>")
            let copyStartButton = document.getElementById('copyStart')
            let copyEndingsButton = document.getElementById('copyEndings')
            function checkForDates() {
                document.getElementById('carePeriodBeginDate')?.value?.length && !document.getElementById('carePeriodEndDate')?.value?.length ? copyStartButton.classList.remove('hidden') : copyStartButton.classList.add('hidden')
                document.getElementById('carePeriodEndDate')?.value?.length ? copyEndingsButton.classList.remove('hidden') : copyEndingsButton.classList.add('hidden')
            }
            document.getElementById('childProviderTable').addEventListener('click', checkForDates)
            copyStartButton.addEventListener('click', copyStartToSS )
            function copyStartToSS() {
                if (document.getElementById('carePeriodBeginDate')?.value?.length && document.querySelectorAll('.selected')?.length) {
                    let oProviderStart = {
                        providerId: document.getElementById("providerId").value,
                        primaryBeginDate: document.getElementById("primaryBeginDate").value,
                        secondaryBeginDate: document.getElementById("secondaryBeginDate").value,
                        carePeriodBeginDate: document.getElementById("carePeriodBeginDate").value,
                        hoursOfCareAuthorized: document.getElementById("hoursOfCareAuthorized").value,
                    }
                    sessionStorage.setItem("MECH2.providerStart", JSON.stringify(oProviderStart))
                    snackBar('Copied start data!', 'blank')
                } else if (!document.querySelectorAll('.selected')?.length) { snackBar('No entry selected') }
            }
            copyEndingsButton.addEventListener('click', copyEndingsToSS )
            function copyEndingsToSS() {
                if (document.getElementById('carePeriodEndDate')?.value?.length && document.querySelectorAll('.selected')?.length) {
                    let oProviderEndings = {
                        primaryEndDate: document.getElementById("primaryEndDate").value,
                        secondaryEndDate: document.getElementById("secondaryEndDate").value,
                        carePeriodEndDate: document.getElementById("carePeriodEndDate").value,
                        careEndReason: document.getElementById("careEndReason").value,
                    }
                    sessionStorage.setItem("MECH2.providerEndings", JSON.stringify(oProviderEndings))
                    snackBar('Copied ending data!', 'blank')
                } else if (!document.querySelectorAll('.selected')?.length) { snackBar('No entry selected') }
            }
            checkForDates()
        })
        // }, 100)
    } else if (!notEditMode) {
        // setTimeout(function() {
        queueMicrotask(() => {
            let oProviderEndings = JSON.parse(sessionStorage.getItem("MECH2.providerEndings"))
            if (oProviderEndings !== null) {
                document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='pasteEndings' class='form-button'>Autofill Endings</button>")
                document.getElementById('pasteEndings').addEventListener('click', pasteEndingData )
                function pasteEndingData() {
                    if (document.getElementById('providerId')?.value?.length) {
                        document.getElementById("primaryEndDate").value = oProviderEndings.primaryEndDate
                        document.getElementById("secondaryEndDate").value = oProviderEndings.secondaryEndDate
                        document.getElementById("carePeriodEndDate").value = oProviderEndings.carePeriodEndDate
                        document.getElementById("careEndReason").value = oProviderEndings.careEndReason
                        document.getElementById("save").click()
                    }
                }
            }
            let oProviderStart = JSON.parse(sessionStorage.getItem("MECH2.providerStart"))
            if (oProviderStart !== null) {
                const childDropDown = document.getElementById('memberReferenceNumberNewMember')
                document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='pasteStart' class='form-button'>Autofill Start</button>")
                document.getElementById('pasteStart').addEventListener('click', pasteStartData )
                function pasteStartData() {
                    if (!document.getElementById('providerId')?.value?.length) {
                        if (childDropDown.value.length) {
                            document.getElementById("providerId").value = oProviderStart.providerId
                            doEvent("#providerId")
                            document.getElementById("primaryBeginDate").value = oProviderStart.primaryBeginDate
                            document.getElementById("secondaryBeginDate").value = oProviderStart.secondaryBeginDate
                            document.getElementById("carePeriodBeginDate").value = oProviderStart.carePeriodBeginDate
                            document.getElementById("hoursOfCareAuthorized").value = oProviderStart.hoursOfCareAuthorized
                            setTimeout(function() { document.getElementById("save").click() }, 500)
                        } else { childDropDown.animate(redBorder, redBorderTiming) }
                    }
                }
            }
            // }, 100)
        })
    }



    //SECTION END Open provider information page from Child's Provider page
    function childProviderPage() { // duplicated, will replace original
        if ($('#providerType').val() !== "Legal Non-licensed" && $('#providerType').val()?.length > 0) {//not LNL
            $lnlGroup.addClass('hidden')
            document.querySelectorAll('.lnlData, .lnlInfo').forEach(function(e) { e.classList.add('hidden') } )
            $livesWithChildGroup.addClass('hidden')
            $careInHomeGroup.addClass('hidden')
            $licensedGroup.removeClass('hidden')
            $('label[for=childCareMatchesEmployer]').css('visibility','visible')
            if (!notEditMode) {
                $('#providerLivesWithChild, #careInHome, #relatedToChild').val("N") }//not LNL, edit mode
            else { $lnlGroup.addClass('hidden') }//not LNL, view mode
        } else if ($('#providerType').val() === "Legal Non-licensed") {//is LNL
            lnlTraining()
            document.querySelectorAll('.lnlInfo').forEach(function(e) { e.classList.remove('hidden') } )
            $licensedGroup.addClass('hidden')
            // if ($('#careInHome').val() === 'N') { $careInHomeGroup.addClass('collapse') }
            // if (!notEditMode) { $lnlGroup.removeClass('collapse') }//is LNL, edit mode
            $lnlGroup.removeClass('hidden')
            document.getElementById('')
            $careInHomeGroup.removeClass('hidden')
            $livesWithChildGroup.removeClass('hidden')
            $('label[for=childCareMatchesEmployer]').css('visibility','hidden')
            // else {//is LNL, view mode
            $('#providerLivesWithChildBeginDate, #careInHomeOfChildBeginDate').each(function() {
                if ($(this).val()?.length === 0) { $(this).parents('.form-group').addClass('collapse') }
                else { $(this).parents('.form-group').removeClass('collapse') }
            })
            // }
        }
    };
    function lnlTraining() {
        let providerId = document.getElementById('providerId').value
        let lnlDataProviderId = "lnlData" + providerId
        if (document.getElementById(lnlDataProviderId)) {
            document.getElementById(lnlDataProviderId).classList.remove('hidden')
            checkIfRelated()
            return false
        }
        let lnlSS = sessionStorage.getItem('lnlSS.' + providerId)
        if (lnlSS) {
            let lnlDiv = document.querySelector('.form-group:has(#providerType)').insertAdjacentHTML('afterend','<div class="lnlData" id=' + lnlDataProviderId + '>' + lnlSS + '</div>')
            checkIfRelated()
            return false
        }
        if (!document.getElementById(lnlDataProviderId)) {
            let lnlDiv = document.querySelector('.form-group:has(#providerType)').insertAdjacentHTML('afterend','<div class="lnlData" id=' + lnlDataProviderId + '></div>')
            $( "#" + lnlDataProviderId ).load('/ChildCare/ProviderTraining.htm?providerId=' + providerId + ' #providerTrainingData', function() {
                let ptd = document.querySelector('#' + lnlDataProviderId + ' > #providerTrainingData')
                ptd.querySelector('div.form-group:has(input.form-button)').remove()
                ptd.querySelectorAll('h4, br').forEach(function(e) { e.remove() })
                ptd.querySelectorAll('input, select').forEach(function(e) { e.setAttribute('disabled', 'disabled'); e.classList.add('borderless') })
                ptd.querySelectorAll('div.col-lg-2').forEach(function(e) { e.removeAttribute('style') })
                let trainingDateNodes = ptd.querySelectorAll('.panel-box-format input[id]')
                let trainingMap = new Map([
                    [ "cardio", {name: "CPR", verified: "cardioVerification"} ],
                    [ "firstAid", {name: "First Aid", verified: "firstAidVerification"} ],
                    [ "suids", {name: "SUIDS", verified: "suidsVerification", related: "Yes", careForRelated: "Any related child < 1 year" } ],
                    [ "headTrauma", {name: "AHT", verified: "headTraumaVerification", related: "Yes", careForRelated: "Any related child < 5 years" } ],
                    [ "orientation", {name: "Supervising for Safety", related: "No", verified: "orientationVerification", careForRelated: "All related children instead of AHT if < 5 years and SUIDS if < 1 year", careForUnrelated: "All unrelated children < 5 years, all unrelated children > 5 years after 90 days" } ],
                    [ "ongoing", {name: "Ongoing Training", verified: "ongoingVerification"} ],
                    [ "annual", {name: "Annual Inspection", verified: undefined} ]
                ])
                trainingDateNodes.forEach(function(e) {
                    let trainingName = e.id.slice(0, -4)
                    document.querySelector('label[for=' + e.id + ']').textContent = trainingMap.get(trainingName).name + ": "
                    if (e.value?.length) {
                    }
                })
                $(ptd.querySelectorAll('.form-group')).unwrap()
                ptd.classList.remove('displayNone')
                let childUnderFive
                let childUnderOne
                let todayDate = new Date()
                let resultsHTML = `
                                <div class="form-group"> <div class="col-lg-12 textInherit">
                                        <label for="registration" class="col-lg-2control-label textR textInherit marginTop10">Registration:</label>
                                        <div class="col-lg-6 padL0 textInherit">
                                            <div id="registration" type="text" name="registration" title="LNL Registration Status and Effective Date"></div>
                                        </div>
                                </div> </div>
                                <div class="form-group"> <div class="col-lg-12 textInherit" id="hasRelatedCare">
                                        <label for="relatedCare" class="col-lg-2 control-label textR textInherit marginTop10">Related Care:</label>
                                        <div class="col-lg-7 padL0 textInherit">
                                            <div id="relatedCare" type="text" name="relatedCare" class="inline-text" title="LNL Related Care Breakdown"></div>
                                            <span class="tooltips">ⓘ
                                                <span class="tooltips-text tooltips-topleft">Child’s sibling, grandparent, great-grandparent, aunt, or uncle of the child, based on blood relationship, marriage or court decree.</span>
                                            </span>
                                        </div>
                                </div> </div>
                                <div class="form-group"> <div class="col-lg-12 textInherit" id="hasUnrelatedCare">
                                        <label for="unrelatedCare" class="col-lg-2 control-label textR textInherit marginTop10">Unrelated Care:</label>
                                        <div class="col-lg-7 padL0 textInherit">
                                            <div class="inline-text" id="unrelatedCare" type="text" name="unrelatedCare" title="LNL Unrelated Care Breakdown"></div>
                                            <span class="tooltips">ⓘ
                                                <span class="tooltips-text tooltips-topleft">Provider is eligible to be paid for children over five for up to 90 days without Supervising for Safety training. The 90 days is NOT tracked by MEC2 automatically.</span>
                                            </span>
                                        </div>
                                </div> </div>
                                `
                ptd.insertAdjacentHTML('beforeend', resultsHTML)
                document.querySelector('label[for=carePeriodBeginDate]').insertAdjacentHTML('beforebegin', `
                                <span class="tooltips lnlInfo" style="position: absolute; width: 24%; text-align: right;">ⓘ
                                    <span class="tooltips-text tooltips-top">Provider is eligible to be registered and paid effective the date CPR and First Aid trainings are complete. Age and relationship based trainings are required before the Service Authorization approval.</span>
                                </span>
                `)
                let registrationArray = evalData(providerId, "ProviderRegistrationAndRenewal", dateRange, "0", "providerId").then(function(resultObject) {
                    for (let results in resultObject) {
                        if (resultObject[results].financiallyResponsibleAgency === userCountyObject?.county + ' County') {
                            let resultsArray = [resultObject[results].registrationStatus, resultObject[results].statusEffective] // status, date

                            ptd.querySelector('#registration').textContent = resultsArray[0] + ' ' + resultsArray[1]
                            return(resultsArray)
                        }
                    }
                })
                let careBreakdown = { relatedLTfive: "Under 5: ❌. ", relatedLTone: "Under 1: ❌. ", relatedGTfive: "Over 5: ✅", unrelatedLTfive: "Under 5: ❌. ", unrelatedLTone: "Under 1: ❌. ", unrelatedGTfive: "Over 5: Up to 90 days", sfsValue: 0 }
                if ( ptd.querySelector('#orientationVerification').value === "Yes") {
                    let sfsDate = ptd.querySelector('#orientationDate')
                    if ( dateDiff(sfsDate.value) > 730) {
                        sfsDate.classList.add('rederrortext')
                    } else {
                        careBreakdown.sfsValue = 1
                        careBreakdown.relatedLTfive = "Under 5: ✅. "
                        careBreakdown.relatedLTone = "Under 1: ✅. "
                        careBreakdown.unrelatedLTfive = "Under 5: ✅. "
                        careBreakdown.unrelatedLTone = "Under 1: ✅. "
                        careBreakdown.unrelatedGTfive = "Over 5: ✅."
                    }
                }
                let ahtDate = ptd.querySelector('#headTraumaDate')
                let ahtDateDiff = dateDiff(ahtDate.value)
                let suidsDate = ptd.querySelector('#suidsDate')
                let suidsDateDiff = dateDiff(suidsDate.value)
                if (ptd.querySelector('#headTraumaVerification').value === "Yes") {
                    if (ahtDateDiff < 730) { careBreakdown.relatedLTfive = "Under 5: ✅. " }
                    else { ahtDate.classList.add('rederrortext') }
                }
                if (ptd.querySelector('#suidsVerification').value === "Yes") {
                    if (suidsDateDiff < 730) { careBreakdown.relatedLTone = "Under 1: ✅. " }
                    else { suidsDate.classList.add('rederrortext') }
                }
                ptd.querySelector('#relatedCare').textContent = careBreakdown.relatedLTone + careBreakdown.relatedLTfive + careBreakdown.relatedGTfive
                ptd.querySelector('#unrelatedCare').textContent = careBreakdown.unrelatedLTone + careBreakdown.unrelatedLTfive + careBreakdown.unrelatedGTfive
                sessionStorage.setItem('lnlSS.' + providerId, document.getElementById(lnlDataProviderId).outerHTML)
                checkIfRelated()
            })
        }
    }
    function checkIfRelated() {
        let relatedToChild = document.getElementById('relatedToChild')
        let hasRelatedCare = document.getElementById('hasRelatedCare')
        if (relatedToChild.value === "Y") { hasRelatedCare.classList.remove('rederrortext'); relatedToChild.classList.remove('rederrortext') } else { hasRelatedCare.classList.add('rederrortext'); relatedToChild.classList.add('rederrortext') }
    }
    if (!notEditMode) {
        const beginEndFields = {
            primary: { start: '#primaryBeginDate', end: '#primaryEndDate' },
            secondary: { start: '#secondaryBeginDate', end: '#secondaryEndDate' },
            carePeriod: { start: '#carePeriodBeginDate', end: '#carePeriodEndDate' },
        }
        function caseChildProviderTabindex() { for (let fields in beginEndFields) { document.querySelector(beginEndFields[fields].start).value === '' && document.querySelector(beginEndFields[fields].end).setAttribute('tabindex', '-1') } }
    };
    childProviderPage()
    document.getElementById('relatedToChild').addEventListener('change', function() { checkIfRelated() } )
    $('#childProviderTable').click(function() { childProviderPage() });
    $('#providerId').change(function() {
        setTimeout(function() {
            if ($('#providerId').val()?.length > 0) {
                childProviderPage()
                if ($('#providerType').val() !== "Legal Non-licensed") { eleFocus('#primaryBeginDate') }
                else if ($('#providerType').val() === "Legal Non-licensed") { eleFocus('#providerLivesWithChild') }
                else if ($('#providerType').val()?.length === 0) { console.trace('CaseChildProvider.htm section') }
            }
        }, 200)
    });
    $('#primaryBeginDate, #secondaryBeginDate')
        .keydown(function(e) {
        if (e.key === "Tab" && $('#carePeriodBeginDate').val()?.length === 0 && $(this).val()?.length > 0) {
            e.preventDefault()
            if ($('#carePeriodBeginDate').val()?.length === 0 && $(this).val()?.length > 0) {
                $(this, '#carePeriodBeginDate').datepicker("isDisabled")
                $('#carePeriodBeginDate').val($(this).val())
                eleFocus('#hoursOfCareAuthorized')
                queueMicrotask(() => { $('.hasDatepicker').datepicker("hide") })
            }
        }
    })
        .blur(function() {
        if ($('#carePeriodBeginDate').val()?.length === 0 && $(this).val()?.length > 0) {
            $(this, '#carePeriodBeginDate').datepicker("isDisabled")
            $('#carePeriodBeginDate').val($(this).val())
            eleFocus('#hoursOfCareAuthorized')
            queueMicrotask(() => { $('.hasDatepicker').datepicker("hide") })
        }
    })
};
//SECTION END CaseChildProvider hiding fields if provider type is not LNL

if (("CaseCopayDistribution.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        waitForTableCells('#providerInformationTable').then(() => {
            let providerId = document.querySelector('#providerInformationTable > tbody > tr.selected > td:nth-child(1)').textContent
            console.log(providerId)
            if (sessionStorage.getItem( 'MECH2.ageCategory.' + caseId + '.' + providerId ) !== null) {
                let copayDist = JSON.parse( sessionStorage.getItem( 'MECH2.copayDist.' + caseId + '.' + providerId ))
                document.getElementById('copay').value = copayDist.copay
                document.getElementById('recoupment').value = copayDist.recoupment
                document.getElementById('overrideReason').value = copayDist.overrideReason
                eleFocus('#save')
            }
        })
        document.getElementById('save').addEventListener("click", function() {
            let copayDist = {
                copay: document.getElementById('copay').value,
                recoupment: document.getElementById('recoupment').value,
                overrideReason: document.getElementById('overrideReason').value,
                providerId: document.querySelector('#providerInformationTable > tbody > tr.selected > td:nth-child(1)').textContent,
            }
            sessionStorage.setItem('MECH2.copayDist.' + caseId + '.' + copayDist.providerId, JSON.stringify(copayDist))
        })
    }
}

if (("CaseCreateEligibilityResults.htm").includes(thisPageNameHtm)) {
    if ($('strong:contains("Results successfully submitted.")').length) {
        $('#secondaryActionArea').addClass('hidden')
        $('#caseCERDetail').append('<button type="button" id="eligibilityResults" class="form-button center-vertical">Eligibility Results</button>')
        $('#eligibilityResults').click(function(e) { e.preventDefault(); document.getElementById(`Eligibility Results Selection`).children[0].click() })
        eleFocus('#eligibilityResults')
        // document.addEventListener('load', () => (eleFocus('#eligibilityResults')) )
    } else { eleFocus('#createDB') }
}

//SECTION START Fill Child Support PDF Forms
if (("CaseCSE.htm").includes(thisPageNameHtm)) {
    if (typeof userCountyObject !== undefined && userCountyObject.code === "169") {
        $('#cseDetailsFormsCompleted').parent().after('<button type="button" class="cButton centered-text float-right" tabindex="-1" id="csForms">Generate CS Forms</button>');
        $('#csForms').click(function() {
            let caseNumber = caseId
            let cpInfo = $('#csePriTable .selected td').eq(1).text();
            let ncpInfo = $('#csePriTable .selected td').eq(2).text();
            let childList = {};
            $('#childrenTable tbody tr').each(function(index) {
                if ($(this).children('td').eq(1).text().length > 0) {
                    childList["child" + index] = $(this).children('td').eq(1).text();
                };
            });
            const formInfo = {pdfType:"csForms", xNumber:userXnumber, caseNumber:caseNumber, cpInfo:cpInfo, ncpInfo:ncpInfo, ...childList};
            window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank");
        });
    }
    //SECTION END Fill Child Support PDF Forms

    //SECTION START Remove unnecessary fields from Child Support Enforcement
    if (notEditMode) {$('#actualDate').parents('.form-group').addClass('collapse')}
    let $hiddenCSE = $('#cseAbsentParentInfoMiddleInitial, #cseAbsentParentInfoSsn, #cseAbsentParentInfoBirthdate, #cseAbsentParentInfoAbsentParentSmi, #cseAbsentParentInfoAbsentParentId').closest('.form-group')
    $($hiddenCSE).addClass('collapse');
    $('#cseAbsentParentInfoLastName').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="abpsShowHideToggle">Toggle extra info</button>');
    $('#abpsShowHideToggle').click(function() { $($hiddenCSE).toggleClass('collapse toggle') });
    let $goodCause = $('#cseGoodCauseClaimStatus').parents('.form-group').siblings().not('h4')
    function hideBlankGoodCause() {
        if ($('#cseGoodCauseClaimStatus').val() === 'Not Claimed') { $goodCause.addClass('collapse') }
        else { $goodCause.removeClass('collapse') }
    };
    hideBlankGoodCause();
    $('#cseGoodCauseClaimStatus').change(function () {hideBlankGoodCause()});
    $('#csePriTable').click(function() { cseReviewDate() });
    function cseReviewDate() {
        $('h4:contains("Good Cause")').siblings().removeClass('collapse')
        $('h4:contains("Good Cause")').siblings().children('div').children('input, select').filter(function() {return $(this).val()?.length === 0}).not('#cseGoodCauseClaimStatus').closest('.form-group').addClass('collapse')
    };
    cseReviewDate()
    $('#cseGoodCauseClaimStatus').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="cseGoodCauseClaimStatusToggle">Toggle extra info</button>');
    $('#cseGoodCauseClaimStatusToggle').click(function() { $goodCause.toggleClass('collapse toggle') });
};
//SECTION END Remove unnecessary fields from Child Support Enforcement

//SECTION START CaseCSIA
if (("CaseCSIA.htm").includes(thisPageNameHtm)) {
    let $csiaCollapse = $('#middleInitial, #birthDate, #ssn, #gender').parents('.form-group')
    let countyName = userCountyObject?.county ?? ''
    countyName = countyName.replace(/\W/g,'')
    $csiaCollapse.addClass('collapse')
    $('#actualDate').parents('.form-group').append('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="csiaExtra">Toggle extra info</button>');
    $('#csiaExtra').click(function() { $csiaCollapse.toggleClass('collapse toggle') });
    $('h4:contains("Address")').click()
    $('#deceasedDate').parents('.form-group').addClass('collapse')
    function childOfAbpsInfo() {
        if ($('#caseCSIADetailData .selected td:eq(3)').html() !== "") { $('#nameKnown').val('Yes').addClass('prefilled-field') }
        $('#birthplaceCountry').change(function() {
            queueMicrotask(() => {
                $('#birthplaceStateOrProvince').removeAttr('tabindex')
                if ($('#birthplaceStateOrProvince').val() === "") {
                    $('#birthplaceStateOrProvince').val('Minnesota').addClass('prefilled-field')
                    doEvent('#birthplaceStateOrProvince')
                }
            })
        })
        $('#birthplaceStateOrProvince').change(function() {
            queueMicrotask(() => {
                if ($('#birthplaceCounty').val() === "" && countyName?.length) {
                    $('#birthplaceCounty').val(countyName).addClass('prefilled-field')
                    doEvent('#birthplaceCounty')
                    eleFocus('#birthplaceStateOrProvince')
                }
            })
        })
        if ($('#birthplaceCountry').val() === "") {
            $('#birthplaceCountry').val('USA').addClass('prefilled-field')
            doEvent('#birthplaceCountry')
        }
    }
    if (!notEditMode) {
        queueMicrotask(() => {
            $('#caseCSIAChildData').click(function() { childOfAbpsInfo() })
            $('#priRelationshiptoChild').change(function() { childOfAbpsInfo() })

        })
    }
    $('#deceased').change(function() {
        if ($(this).val() === "Yes") { $('#deceasedDate').parents('.form-group').removeClass('collapse') }
    })
}
//SECTION END CaseCSIA

//SECTION START Case Earned Income
if (("CaseEarnedIncome.htm").includes(thisPageNameHtm)) {
    tempIncomes('ceiTemporaryIncome', 'ceiPaymentEnd')
    tabIndxNegOne('#providerId, #providerSearch, #ceiCPUnitType, #ceiNbrUnits, #ceiTotalIncome')
    let ceiEmployment = $('#ceiPrjAmount, #ceiAmountFrequency, #ceiHrsPerWeek, #ceiEmployer, #ceiCPUnitType, #ceiNbrUnits').parents('.form-group');
    let ceiSelfEmployment = $('#ceiGrossIncome, #ceiGrossAllowExps, #ceiTotalIncome').parents('.form-group')
    $('#earnedIncomeMemberTable').click( function() { checkSelfEmploy() });
    $('#ceiIncomeType').change( function() { checkSelfEmploy() })
    function checkSelfEmploy() {
        if ($('#ceiIncomeType').val() === "Self-employment") {
            ceiSelfEmployment.removeClass('collapse');
            ceiEmployment.addClass('collapse'); }
        else if ($('#ceiIncomeType').val() !== "Self-employment" || (notEditMode && $('#ceiTotalIncome').val()?.length === 0)) {
            ceiSelfEmployment.addClass('collapse');
            ceiEmployment.removeClass('collapse');
        }
    };
    checkSelfEmploy()
    let hiddenCEI1 = $('#ceiEmpStreet, #ceiEmpStreet2, #ceiEmpCity, #ceiEmpStateOrProvince, #ceiPhone, #ceiEmpCountry').parents('.form-group')
    hiddenCEI1.addClass('collapse');
    $('#ceiIncomeType').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="ceiShowHide1">Toggle extra info</button>');
    $('#ceiShowHide1').click(function() { $(hiddenCEI1).toggleClass('collapse toggle') });
    //

    if ($('#providerName').val().length < 1) {
        let hiddenCEI3 = $('#providerName, #addressStreet').parents('.form-group')
        hiddenCEI3.addClass('collapse');
        $('#providerSearch').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="ceiShowHide3">Toggle extra info</button>');
        $('#providerSearch').parents('.col-lg-12').addClass('form-group')
        $('#ceiShowHide3').click(function() { $(hiddenCEI3).toggleClass('collapse toggle') });
    };
    if (!notEditMode) {
        $('#ceiGrossIncome').parent().after('<div class="height28" style="align-content: center; display: inline-flex; flex-wrap: wrap; margin-right: 10px;" id="fiftyPercent"></div>');
        $('#fiftyPercent').text('50%: ' + ($('#ceiGrossIncome').val()*.5).toFixed(2));
        $('#ceiGrossIncome').on('input', function() {$('#fiftyPercent').text('50%: ' + ($('#ceiGrossIncome').val()*.5).toFixed(2)) })
        $('#fiftyPercent').after('<button type="button" id="grossButton" class="cButton__nodisable">Use 50%</button>')
        $('#grossButton').click(function() {
            $('#ceiGrossAllowExps').val(($('#ceiGrossIncome').val()*.5).toFixed(2));
            doEvent('#ceiGrossAllowExps')
            eleFocus('#save')
        });
        //SUB-SECTION START Set state to MN, country to USA when leaving Employer Name field
        if ($('#ceiEmpCountry').val()?.length === 0) {
            $('#ceiEmpCountry').val('USA');
            doEvent('#ceiEmpCountry')
        }
        if ($('#ceiEmpStateOrProvince').val()?.length === 0) {
            $('#ceiEmpStateOrProvince').val('Minnesota');
            doEvent('#ceiEmpStateOrProvince')
        };
        document.getElementById('ceiPaymentEnd').addEventListener('keydown', function(e) {
            if (e.key === "2") { document.getElementById('ceiPaymentChange').tabIndex = -1 }
        })
    };
};
//SECTION END Remove unnecessary fields from CaseEarnedIncome, set to MN, USA when leaving Employer Name field

//SECTION START CaseEarnedIncome CaseUnearnedIncome CaseExpense collapse unnecessary H4s
if (["CaseEarnedIncome.htm","CaseUnearnedIncome.htm","CaseExpense.htm"].includes(thisPageNameHtm)) {
    if (notEditMode) {
        $('table').click(function() {
            showHidePaymentChange()
            eleFocus('#editDB')
        })
        $('#ceiPaymentChange, #paymentChangeDate').each(function() {
            if ($(this).val()?.length === 0) { $(this).parents('.form-group').addClass('collapse') }
        })
    }
    function showHidePaymentChange() {
        if ($('#memberReferenceNumberNewMember, #refPersonName').val()?.length === 0) {
            $('#ceiPaymentChange, #paymentChangeDate').parents('.form-group').addClass('collapse')
        }
    }
    if (!notEditMode) {
        showHidePaymentChange()
        tabIndxNegOne('#ceiTemporaryIncome, #tempIncome, #temporaryExpense')
        if ($('#memberReferenceNumberNewMember, #refPersonName').val()?.length === 0) {
            tabIndxNegOne('#ceiPaymentEnd, #paymentEndDate')
        }
    }
    $( "h4:contains('Actual Income'), h4:contains('Student Income'), h4:contains('Actual Expense')" ).nextAll().addClass("collapse")
};
//SECTION END CaseEarnedIncome CaseUnearnedIncome CaseExpense collapse unnecessary H4s


if (!("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm) && thisPageNameHtm.indexOf("Activity.htm") > -1) {
    document.querySelectorAll('#leaveDetailExtendedEligibilityBegin, #leaveDetailExpires, #redeterminationDate, #extendedEligibilityBegin, #extendedEligibilityExpires, #leaveDetailRedeterminationDue').forEach(function(e) { e.setAttribute('disabled', 'disabled') })
    tabIndxNegOne('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')
    if (!$('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom').filter(function() { if ($(this).val()?.length > 0) return($(this)) }).length) {
        tabIndxNegOne('#tempLeavePeriodEnd, #leaveDetailTemporaryLeavePeriodTo')
    }
}

//SECTION START Highlight "Fail|Ineligible" in eligibility results
if (slashThisPageNameHtm.indexOf("/CaseEligibilityResult") > -1) {
    let F = new RegExp("\bF\b")
    let tableBody = $('table tbody').parent().DataTable()
    let $isNo = $('tbody > tr > td').filter(function() { return $(this).text() === 'No' });
    $isNo.filter(function() {
        return $(tableBody.column( tableBody.cell( $(this) ).index().column ).header()).html() == "In Family Size" || $(tableBody.column( tableBody.cell( $(this) ).index().column ).header()).html() == "Verified"
    })
        .addClass('eligibility-highlight-table')
    function eligHighlight() {
        $('.eligibility-highlight').removeClass('eligibility-highlight')
        $('div>input[type="text"]').filter(function() {return $(this).val() === "Fail" }).addClass('eligibility-highlight textFail')
        $('div[title="Family Result"]:contains("Ineligible")').addClass('eligibility-highlight ineligible')
        $('div:contains("Fail"):not(:has("option")):last-child').addClass('eligibility-highlight divFail')
        $('option:selected:contains('+F+'), option:selected:contains("Fail")').parents('select').addClass('eligibility-highlight optionFail')
        // $('option:selected:contains("F"), option:selected:contains("Fail")').parents('select').addClass('eligibility-highlight optionFail')
        document.querySelectorAll('#caseEligibilityResultPersonTable > tbody > tr, #caseEligibilityResultOverviewTable > tbody > tr').forEach(function(e) {
            let roleCell = thisPageNameHtm === "CaseEligibilityResultOverview.htm" ? e.querySelector('td:nth-child(4)') : e.querySelector('td:nth-child(5)')
            if (['PRI', 'Child'].includes(roleCell.textContent) ) {
                let eligibilityCell = thisPageNameHtm === "CaseEligibilityResultOverview.htm" ? e.querySelector('td:nth-child(3)') : e.querySelector('td:nth-child(4)')
                let inFamilyCell = thisPageNameHtm === "CaseEligibilityResultOverview.htm" ? e.querySelector('td:nth-child(5)') : e.querySelector('td:nth-child(6)')
                if (inFamilyCell.textContent === "No") { inFamilyCell.classList.add('eligibility-highlight') }
                if (inFamilyCell.textContent === "No" && eligibilityCell.textContent === "Ineligible") { eligibilityCell.classList.add('eligibility-highlight') }
            }
        })
        document.querySelectorAll('#caseEligibilityResultActivityTable > tbody > tr').forEach(function(e) {
            let result = e.querySelector('td:nth-child(7)')
            if (result.textContent === "Ineligible") { result.classList.add('eligibility-highlight') }
        })
        // document.querySelectorAll('#caseEligibilityResultPersonTable > tbody > tr').forEach(function(e) {
        //     if (['PRI', 'Child'].includes(e.querySelector('td:nth-child(5)').textContent) ) {
        //         if (e.querySelector('td:nth-child(4)').textContent === "Ineligible") {
        //             e.classList.add('eligibility-highlight')
        //         }
        //     }
        // })
        // $('select').filter(function() {
        //     return $(this).val() === "F"
        // }).addClass('eligibility-highlight')
    }
    eligHighlight()
    $('table').click(function() { eligHighlight(); eleFocus('#nextDB') })
};
//SECTION END Highlight "Fail" in eligibility results

//SECTION START CaseEligibilityResultApproval Add 90 days to date entered to ExtElig Begin Date
if (("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        queueMicrotask(() => {
            $('#type').attr('tabindex','1')
            $('#reason').attr('tabindex','2')
            $('#beginDate').attr('tabindex','3')
            $('#allowedExpirationDate').attr('tabindex','4')
        })
        if (sessionStorage.getItem( 'MECH2.TI.' + caseId ) !== null) {
            let tempInelig = JSON.parse( sessionStorage.getItem( 'MECH2.TI.' + caseId ))
            document.getElementById('type').value = tempInelig.type
            document.getElementById('reason').value = tempInelig.reason
            document.getElementById('beginDate').value = tempInelig.start
            document.getElementById('allowedExpirationDate').value = tempInelig.end
            $('.hasDatepicker').datepicker("hide")
            eleFocus('#save')
            return false
        }
        document.getElementById('save').addEventListener("click", function() {
            let tempInelig = { type: document.getElementById('type').value, reason: document.getElementById('reason').value, start: document.getElementById('beginDate').value, end: document.getElementById('allowedExpirationDate').value }
            sessionStorage.setItem('MECH2.TI.' + caseId, JSON.stringify(tempInelig))
        })
        $('#beginDate').on("input change", function() {
            if (this.value.length < 10) { return false }

            let extEligPlus90 = addDays($('#beginDate').val(), 90);
            extEligPlus90 = new Date(extEligPlus90).toLocaleDateString('en-US', {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            document.getElementById('allowedExpirationDate').value = extEligPlus90
            doEvent('#allowedExpirationDate')
            $('.hasDatepicker').datepicker("hide")
            eleFocus('#save')
        })
    }
};
//SECTION END CaseEligibilityResultApproval Add 90 days to date entered to ExtElig Begin Date

//SECTION START CaseEligibilityResultFinancial highlighting if income exceeds limit
if (("CaseEligibilityResultFinancial").includes(thisPageNameHtm)) {
    let totalAnnualizedIncome = Number($('label[for="totalAnnualizedIncome"]').next().html().replace(/[^0-9.-]+/g,""))
    let maxAllowed = Number($('label[for="maxIncomeAllowed"]').next().html().replace(/[^0-9.-]+/g,""))
    if (totalAnnualizedIncome > maxAllowed) { $('label[for="totalAnnualizedIncome"]').parent().addClass('eligibility-highlight') }
}

//SECTION START CaseEligibilityResultSelection
if (("CaseEligibilityResultSelection.htm").includes(thisPageNameHtm)) {
    let $eligibilityTableRows = $('#caseEligibilitySelectionTable > tbody > tr')
    $eligibilityTableRows.filter(function() {
        $(this).find('td:contains(Ineligible)').length && $(this).addClass('Ineligible')
        $(this).find('td:contains(Eligible)').length && $(this).addClass('Eligible')
        $(this).find('td:contains(Unapproved)').length && $(this).addClass('Unapproved')
    })
    if ($('.Unapproved').length) {
        if ($('.Unapproved.Eligible').length) { $('.selected').removeClass('selected'); $('.Unapproved.Eligible').click().addClass('selected') }
        else if ($('.Unapproved.Ineligible').length) { $('.selected').removeClass('selected'); $('.Unapproved.Ineligible').click().addClass('selected') }
    } else {
        $('#delete').after(`
            <button type="button" id="goSAOverview" class="form-button">SA Overview</button>
            <button type="button" id="goSAApproval" class="form-button">SA Approval</button>
            `)
        $('#goSAOverview').click(function(e) {
            e.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorizationOverview.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self');
        });
        $('#goSAApproval').click(function(e) {
            e.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorizationApproval.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self');
        });
    };
    if (document.getElementsByClassName('dataTables_empty').length === 0) { document.getElementsByClassName('sorting')[1].click() };//sort by program type
    document.getElementById('caseEligibilitySelectionTable').addEventListener('click', function() { eleFocus('#selectDB') })
};
//SECTION END CaseEligibilityResultSelection


//SECTION START CaseEligibilityResultPerson
if (("CaseEligibilityResultPerson.htm").includes(thisPageNameHtm)) {
    $('#eligibilityPeriodEnd').parent().contents().eq(2).replaceWith('<label class="to">to</label>')
}

//SECTION START Redirect if we're on elig results and there's no version selected
if (reviewingEligibility) {
    let alreadyRedirecting = 0
    setIntervalLimited(function() {
        if ($('[id$="TableAndPanelData"]').css('display') === "none" && !alreadyRedirecting) {
            window.open(document.getElementById("Eligibility Results Selection").firstElementChild.href, "_self")
            alreadyRedirecting = 1
        }
    }, 200, 5)
}; //SECTION END Redirect if we're on elig results and there's no version selected

//SECTION START Remove unnecessary fields from CaseExpense
if (("CaseExpense.htm").includes(thisPageNameHtm)) {
    document.getElementById('paymentEndDate').addEventListener('keydown', function(e) {
        if (e.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
    })
    // let hiddenExp = $('#projectionExpenseUnitType, #projectionExpenseNumberOfUnits').parents('.form-group');
    // hiddenExp.addClass('collapse');
    // $('label[for="projectionExpenseAmount"]').parent().append('<button type="button" class="cButton__floating cButton__nodisable float-right" tabindex="-1" id="ceiShowHide2">Toggle extra info</button>');
    // $('#ceiShowHide2').click(function() { $(hiddenExp).toggleClass('collapse') });
    document.getElementById('expenseTypeDisplay').addEventListener('blur', function() {
        if (this.value === "Lump Sum Exemption") {
            document.getElementById('temporaryExpense').value = "Yes"
            document.getElementById('verificationType').value = "Other"
            document.getElementById('paymentFrequency').value = "Annually"
            document.getElementById('projectionExpenseFrequency').value = "Annually"
            document.getElementById('projectionExpenseAmount').value = "60"
            doEvent('projectionExpenseAmount')
            eleFocus('#paymentBeginDate')
            document.getElementById('paymentBeginDate').addEventListener('keydown', function() {
                if (this.value?.length === 10) {
                    let startDate = document.getElementById('paymentBeginDate').value
                    let endDate = addDays(startDate, 365)
                    document.getElementById('paymentEndDate').value = endDate.toLocaleDateString()
                    eleFocus('#saveDB')
                }
            })
        }
    })
    tempIncomes('temporaryExpense','paymentEndDate')
};
//SECTION END Remove unnecessary fields from CaseExpense

//SECTION START CaseMember.htm
if (("CaseMember.htm").includes(thisPageNameHtm)) {
    $('label[for="memberReferenceNumber"]').attr('id','openHistory') // Open CaseMemberHistory page from CaseMember with 'button'
    $('#openHistory').click(function() {
        window.open('/ChildCare/CaseMemberHistory.htm?parm2=' + caseId, '_blank');
    });
    $( "label:contains('American Indian or Alaskan Native')" ).text('American Indian or AK Native');
    $( "label:contains('Pacific Islander or  Native Hawaiian')" ).text('Pacific Islander or HI Native');
    if ($('#next').length > 0) { $('table').click(function() { eleFocus('#next') } )}
    if (notEditMode) {
        function fMonthDifference(today, birthdate) {
            let months;
            months = (today.getFullYear() - birthdate.getFullYear()) * 12
            let datePassed = (birthdate.getDate() > today.getDate()) ? 1 : 0
            months -= birthdate.getMonth()
            months += today.getMonth()
            months -= datePassed
            return months <= 0 ? 0 : months;
        }
        fMonthDifference(new Date('1/10/24'), new Date('12/9/22'))
        $('#memberBirthDate')
            .attr('style','width: var(--dateInput)')
            .after('<div style="display: inline-flex; margin-left: 5px;" id="birthMonths">')
        $('#raceCheckBoxes').parent().addClass('collapse')
        $('#caseMemberTable').click(function() {
            if ($('#caseMemberTable .selected>td:eq(2)').text() < 6) {
                let monthsAge = fMonthDifference( new Date(), new Date($('#memberBirthDate').val()) )
                let birthMonthsText = monthsAge < 49 ? Math.floor((monthsAge)/12) +'y '+ (monthsAge)%12 +'m / ' + monthsAge + ' months' : Math.floor((monthsAge)/12) +'y '+ (monthsAge)%12 +'m'
                if (monthsAge < 13) { birthMonthsText = monthsAge + ' months' }
                $('#birthMonths').text(birthMonthsText)
                // $('#birthMonths').text(monthsAge + ' months / ' + Math.floor((monthsAge)/12) +'y '+ (monthsAge)%12 +'m')
            } else { $('#birthMonths').text("") }
        })
    }
    if (!notEditMode) {
        tabIndxNegOne('#memberAlienId, #memberDateOfDeath')
        let filledValueFields = []
        $('#memberPanelsData :is(input, select):not([type="checkbox"], .wiz-form-button, .form-button, [type="hidden"], [disabled="disabled"])').filter(function() { filledValueFields.push( "#" + $(this).attr('id') ) })
        tabIndxNegOne(filledValueFields)
        $('#memberReferenceNumber').blur(function(event) {
            if (event.target.value.length > 1 && Number(event.target.value) > 2 && Number(event.target.value) < 10) { fillMemberDataChild(event.target) }
        })
        function fillMemberDataChild(memberReferenceNumber) { //autofilling
            $('#memberSsnVerification').val()?.length === 0 && $('#memberSsnVerification').val("SSN Not Provided").addClass('prefilled-field')
            $('#memberRelationshipToApplicant').val()?.length === 0 && $('#memberRelationshipToApplicant').val("Child").addClass('prefilled-field');doEvent('#memberRelationshipToApplicant')
            $('#memberBirthDateVerification').val()?.length === 0 && $('#memberBirthDateVerification').val("No Verification Provided").addClass('prefilled-field')
            $('#memberIdVerification').val()?.length === 0 && $('#memberIdVerification').val("No Verification Provided").addClass('prefilled-field')
            $('#memberKnownRace').val()?.length === 0 && $('#memberKnownRace').val("No").addClass('prefilled-field');doEvent('#memberKnownRace')
            $('#memberSpokenLanguage').val()?.length === 0 && $('#memberSpokenLanguage').val("English").addClass('prefilled-field');doEvent('#memberSpokenLanguage')
            $('#memberWrittenLanguage').val()?.length === 0 && $('#memberWrittenLanguage').val("English").addClass('prefilled-field');doEvent('#memberWrittenLanguage')
            $('#memberNeedsInterpreter').val()?.length === 0 && $('#memberNeedsInterpreter').val("No").addClass('prefilled-field')
            $('#arrivalDate:not([read-only])').val()?.length === 0 && $('#arrivalDate').addClass('required-field')
        }
        if (Number($('#memberReferenceNumber').val()) > 2 && Number($('#memberReferenceNumber').val()) < 10) { fillMemberDataChild() }
    }
};
//SECTION END CaseMember

//SECTION START CaseMemberII fixing column sizes
if (("CaseMemberII.htm").includes(thisPageNameHtm)) {
    if ($('#next').length) { $('table').click(function() { eleFocus('#next') } )}
    if (!notEditMode) {
        $('#memberReferenceNumberNewMember').blur(function(event) { //autofilling
            if ( Number(event.target.value) > 2 && Number(event.target.value) < 11 ) {
                $('#memberMaritalStatus').val("Never Married").addClass('prefilled-field'); doEvent('#memberMaritalStatus')
                $('#memberSpouseReferenceNumber').attr('tabindex', '-1')
                $('#memberLastGradeCompleted').val("Pre-First Grade or Never Attended").addClass('prefilled-field')
                $('#memberUSCitizen').val("Yes").addClass('prefilled-field'); doEvent('#memberUSCitizen')
                $('#memberCitizenshipVerification').val("No Verification Provided").addClass('prefilled-field')
            }
        })
    }
}
//SECTION END CaseMemberII fixing column sizes


// ==================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// Notes start (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ==================================================================================================================================================================================================

//SECTION START Case Notes custom styles
if (("CaseNotes.htm").includes(thisPageNameHtm)) {
    $(window).on('paste', function(e) {
        if (e.originalEvent.clipboardData.getData('text').indexOf("CaseNoteFromAHK") === 0) {
            e.preventDefault()
            e.stopImmediatePropagation()
            if (notEditMode) {
                document.getElementById('noteSummary').value = "Click the 'New' button first ⬇"
                document.getElementById('noteStringText').value = "Click the 'New' button first ⬇"
                document.getElementById('noteCreator').value = "X1D10T"
            } else {
                let aCaseNoteData = e.originalEvent.clipboardData.getData('text').split('SPLIT')
                if (["Application","Redetermination"].includes(aCaseNoteData[1])) { document.getElementById('noteCategory').value = aCaseNoteData[1] }
                document.getElementById('noteSummary').value = aCaseNoteData[2]
                document.getElementById('noteStringText').value = aCaseNoteData[3]
                eleFocus('#save')
            }
        }
    })
    // $('h4:contains("Note")').wrap('<div style="display: flex;">')
    if (!notEditMode) { $('h4:contains("Note")').after('<button type="button" class="cButton float-right" id="disAutoFormat" tabindex="-1">Disable Auto-Format</button>') }
    $('#disAutoFormat').click(function(e) { e.preventDefault(); $(this).text($(this).text() === "Disable Auto-Format" ? "Enable Auto-Format" : "Disable Auto-Format") })
    $('#save').click(function() {
        if ($('#disAutoFormat').text() === "Disable Auto-Format") {
            $('#noteStringText').val($('#noteStringText').val().replace(/\n\ *`\ */g,"\n             ").replace(/^\ *([A-Z]+\ ?[A-Z]+:)\ */gm, (text, a) => `${' '.repeat(9- a.length)}${a}    `))//Using ` to auto-insert/correct spacing, and fix spacing around titles
        }
    })
    $('#noteStringText').on('paste', function (event) {
        if ($('#disAutoFormat').text() === "Disable Auto-Format") {
            queueMicrotask(() => {
                $('#noteStringText').val($('#noteStringText').val().replace(/(\w)\(/g,"$1 (").replace(/\)(\w)/g,") $1")//Spaces around parentheses
                                         .replace(/\n\u0009/g,"\n             ").replace(/\n\ {9}\u0009/g, "\n             ").replace(/\n\ {16}/g,"\n             ").replace(/\u0009/g, "    ")//Spacing from pasting Excel cells
                                         .replace(/\n+/g,"\n"))//Multiple new lines to single new line
            })
        }
    })
    function textSelect(inp, s, e) {//moves cursor to selected position (s) or selects text between (s) and (e)
        e = e || s;
        if (inp.createTextRange) {
            var r = inp.createTextRange();
            r.collapse(true);
            r.moveEnd('character', e);
            r.moveStart('character', s);
            r.select();
        } else if (inp.setSelectionRange) {
            inp.focus();
            inp.setSelectionRange(s, e);
        }
    }
    $('#noteStringText').keydown(function(e) {
        if (e.key === "`") {
            e.preventDefault()
            let curPos = document.getElementById("noteStringText").selectionStart; // will give the current position of the cursor
            let currentText = $('#noteStringText').val();
            let text_to_insert = "             ";
            $('#noteStringText').val(currentText.slice(0,curPos) + text_to_insert + currentText.slice(curPos)); // setting the modified text in the text area
            textSelect(document.getElementById('noteStringText'), curPos+13);
        }
    })
    !notEditMode && $('option[value="Application"]').after('<option value="Child Support Note">Child Support Note</option>');
    //Hiding PMI/SMI Merge and Disbursed Child Care Support Payment rows
    let $hiddenTr = $('table#caseNotesTable>tbody>tr').slice(0,120).find('td:contains("Disbursed child care support"), td:contains("PMI/SMI Merge")').closest('tr')
    if ($hiddenTr.length) {
        $('#reset').after('<button type="button" id="toggleCaseNotesRows" class="cButton__float cButton__nodisable float-right" data-hiding="true" title="Shows or hides PMI Merge and CS disbursion auto-notes">Show '+ $hiddenTr.length +' Hidden Rows</button>')
        $('#toggleCaseNotesRows').click(function(e) {
            switch (e.target.dataset.hiding) {
                case "true":
                    e.target.dataset.hiding = "false"
                    e.target.textContent = "Hide "+ $hiddenTr.length +" Extra Rows"
                    $hiddenTr.toggle()
                    break
                case "false":
                    e.target.dataset.hiding = "true"
                    e.target.textContent = "Show "+ $hiddenTr.length +" Hidden Rows"
                    $hiddenTr.toggle()
                    break
            }
        })
        queueMicrotask(() => { $hiddenTr.toggle() })
    }
};
//SECTION END CaseNotes

//SECTION START CaseNotes and ProviderNotes
if (thisPageNameHtm.indexOf("Notes.htm") > -1) {//CaseNotes, ProviderNotes
    //AutoCaseNoting; Notes pages section
    if (localStorage.getItem("MECH2.note") !== null) {
        try {
            let noteInfo = JSON.parse(localStorage.getItem("MECH2.note"))[document.querySelectorAll('#providerInput>#providerId, #caseId')[0].value]
            console.log(noteInfo)
            if (noteInfo !== null && noteInfo !== undefined) {
                if (notEditMode) { document.getElementById("new").click() }
                else if (!notEditMode) {
                    let signatureName
                    let workerName = localStorage.getItem('MECH2.userName')
                    if ( ["CaseNotes.htm"].includes(thisPageNameHtm) ) {
                        if (noteInfo.xNumber?.length) {
                            signatureName = document.getElementById('noteCreator').value.toLowerCase() === noteInfo.xNumber ? workerName : workerName + " for " + noteInfo.worker
                        } else { signatureName = workerName }
                    }
                    setTimeout(function() {
                        noteInfo.intendedPerson?.length && $('#noteMemberReferenceNumber').val($('#noteMemberReferenceNumber>option:contains(' + noteInfo.intendedPerson + ')').val())
                        document.getElementById("noteCategory").value = noteInfo.noteCategory
                        document.getElementById("noteSummary").value = noteInfo.noteSummary
                        document.getElementById("noteStringText").value = noteInfo.noteMessage + "\n=====\n" + signatureName
                        localStorage.removeItem("MECH2.note")
                        document.getElementById("save").click()
                    },50)
                }
            }
        }
        catch(error) {console.error(error)}
        //End AutoCaseNoting

    } else {
        tabIndxNegOne('#noteArchiveType, #noteSearchStringText, #noteImportant #noteCreator')

        $('label[for="noteCreator"]').siblings().addBack().appendTo($('label[for="noteSummary"]').closest('.row'));
        $('#noteCreateDate').closest('div.panel-box-format').addClass('hidden')

        //Duplicate Note
        if (notEditMode) {
            setTimeout(function() {
                document.getElementById('deleteDB').insertAdjacentHTML("afterend", "<button type='button' id='duplicate' class='form-button'>Duplicate</button>")
                document.getElementById('duplicate').addEventListener('click', copyNoteToLS )
                function copyNoteToLS() {
                    if (document.getElementById('noteCategory')?.value?.length && document.querySelectorAll('.selected').length) {
                        let oCaseNote = {
                            noteSummary: document.getElementById("noteSummary").value,
                            noteCategory: document.getElementById("noteCategory").value,
                            noteMessage: document.getElementById("noteStringText").value,
                        }
                        localStorage.setItem("MECH2.copiedNote", JSON.stringify(oCaseNote))
                        snackBar('Copied note!', 'blank')
                    } else if (!document.querySelectorAll('.selected').length) { snackBar('No note selected') }
                }
            }, 100)
        } else if (!notEditMode) {
            setTimeout(function() {
                let oCaseNote = JSON.parse(localStorage.getItem("MECH2.copiedNote"))
                if (oCaseNote !== null) {
                    document.getElementById('deleteDB').insertAdjacentHTML("afterend", "<button type='button' id='Autofill' class='form-button'>Autofill</button>")
                    document.getElementById('Autofill').addEventListener('click', pasteNoteToLS )
                    if ( ["Application", "Redetermination"].includes(oCaseNote.noteCategory) ) {oCaseNote.noteSummary = oCaseNote.noteCategory + " update" }
                    function pasteNoteToLS() {
                        if (!document.getElementById('noteCategory')?.value?.length) {
                            document.getElementById("noteSummary").value = oCaseNote.noteSummary
                            document.getElementById("noteCategory").value = oCaseNote.noteCategory
                            document.getElementById("noteStringText").value = oCaseNote.noteMessage
                        }
                    }
                }
            }, 100)
        }
    }
};
//SECTION END CaseNotes and ProviderNotes layout fix
// ================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// Notes end (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ================================================================================================================================================================================================

if (notEditMode && ["CaseNotices.htm", "ProviderNotices.htm"].includes(thisPageNameHtm)) {
    addDateControls('#selectionBeginDate')
    addDateControls('#selectionEndDate')
}

//SECTION START Custom items for CaseOverview
if (("CaseOverview.htm").includes(thisPageNameHtm)) {
    let redetDate = $('label[for="redeterminationDueDate"].col-lg-3').parent().siblings('div.col-lg-3.col-md-3').eq(0).text().trim()
    if (redetDate) {
        $('#caseInputSubmit').after('<button type="button" id="copyFollowUpButton" class="cButton float-right" tabindex="-1">Follow Up Date</button>');
        $('#copyFollowUpButton').click(function() {
            let redetPlus = addDays(redetDate, 44)
            let localedDate = new Date(redetPlus).toLocaleDateString();
            navigator.clipboard.writeText(localedDate);
            snackBar(localedDate);
        });
    }
    $('#programInformationData td:contains("HC"), #programInformationData td:contains("FS"), #programInformationData td:contains("DWP"), #programInformationData td:contains("MFIP"), #programInformationData td:contains("WB")').parent().addClass('stickyRow stillNeedsBottom')
    waitForElmHeight('#programInformationData > tbody > tr > td').then(() => {
        document.querySelectorAll('.stickyRow').forEach(function(element, index) {
            element.style.bottom = (($('.stillNeedsBottom').length -1) * (document.querySelector('#programInformationData').getBoundingClientRect().height / document.querySelectorAll('#programInformationData tbody tr').length)) + "px"
            $(element).removeClass('stillNeedsBottom')
        })
    })
    waitForTableText('#participantInformationData > tbody > tr > td').then(() => {
        if ($('#participantInformationData_wrapper thead td:eq(0)').attr('aria-sort') !== "ascending") { $('#participantInformationData_wrapper thead td:eq(0)').click() }
    })
    $('table:not(#providerInformationData)').click(function() {
        if ($('#providerInformationData>tbody>tr>td:first-child').length && $('#providerInformationData>tbody>tr>td:first-child').text().toLowerCase() !== "no records found") {
            $('#providerInformationData>tbody>tr>td:first-child').each(function() {
                $(this).replaceWith('<td><a href="ProviderOverview.htm?providerId=' + $(this).text() + '" target="_blank">' + $(this).text() + '</a></td>')
            })
        }
    })
}; //SECTION END Case Overview

if (("CasePageSummary.htm").includes(thisPageNameHtm)) {
    if (!document.querySelector('[id="Wrap Up"] >a').classList.value.includes('disabled_lightgray')) {
        $('#caseInputSubmit').after('<a href="/ChildCare/CaseWrapUp.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3 + '"> <input class="form-button doNotDupe" type="button" name="wrapUp" id="wrapUp" value="Wrap-Up" title="Wrap-Up"></a>')
    }
} //SECTION END Case Page Summary

//SECTION START CasePaymentHistory Add links to navigate to FinancialBilling in correct BWP
if (("CasePaymentHistory.htm").includes(thisPageNameHtm)) {
    //leftover CSS?
    $('div.col-lg-3.col-md-3>input').width('100%');
    $('#paymentHistoryTable>tbody>tr>td:nth-of-type(3)').each(function() {
        let linkText = $(this).text();
        $(this).text('');
        $(this).append('<a href="FinancialBilling.htm?parm2=' + caseId + '&parm3=' + linkText.replace(" - ", "").replaceAll("/","") + '", target="_blank">' + linkText + '</a>');
    });
    $('#paymentHistoryTable>thead>tr>td:eq(2)').click()
}; //SECTION END Case Payment History

//SECTION START Highlighting unchecked household members on reapplication
if (("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) {
    $('input[type=checkbox]').each(function() {
        if (!$(this).prop('checked')) {
            $(this).parents('tr').css('background-color','yellow');
        };
    });
}; //SECTION END Case Reapplication Add Ccap

//SECTION START Case Redetermination
if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
    $('#receiveDate').on('input change', function() {
        if ($(this).val().length === 10 && Math.abs(new Date().getFullYear() - $(this).val().slice(6)) < 2) {
            eleFocus('#save')
            $('.hasDatepicker').datepicker("hide")
        }
    })
} //SECTION END Case Redetermination

if (("CaseReinstate.htm").includes(thisPageNameHtm)) {
    $('h4').prependTo($('#caseData > .panel'))
    $('#caseData > .panel').addClass('flex-vertical')
    $('#caseData .panel-box-format label+input').wrap('<div class="col-lg-4 col-md-4">').removeAttr('style').removeAttr('size')
    $('.form-group>textarea').wrap('<div>')
} ////SECTION END Case Reinstate
// SECTION START Case School
if (["CaseSchool.htm"].includes(thisPageNameHtm)) {
    if (document.getElementById('memberReferenceNumberNewMember')) {
        let memberArray = await evalData(undefined, "CaseMember", undefined, "0")
        async function kindergartenStartDate() {
            let memberNumber = document.getElementById('memberReferenceNumberNewMember').value
            // await evalData(undefined, "CaseMember", undefined, "0").then((memberArray) => {
                let memberMatch = memberArray.filter((obj) => obj.memberReferenceNumber === memberNumber)
                let birthDate = new Date(memberMatch[0].memberBirthDate)
                let approxAge = new Date().getFullYear() - birthDate.getFullYear()
                if (approxAge < 17) {
                    let eightteenButStillHHmember = document.getElementById('memberFinancialSupport50PercentOrMore')
                    eightteenButStillHHmember.value = ""
                    eightteenButStillHHmember.setAttribute("disabled", "disabled")
                }
                if (approxAge > 9) { return false }
                let fifthBirthDate = new Date(birthDate.setFullYear(birthDate.getFullYear() + 5))
                let laborDay = getDateofDay(fifthBirthDate.getFullYear(), 8, 0, 1)
                if (fifthBirthDate > laborDay) { laborDay = getDateofDay(fifthBirthDate.getFullYear() + 1, 8, 0, 1) }
                // let kindergartenStartDate = addDays(laborDay, 3).toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
                // document.getElementById('memberKindergartenStart').value = kindergartenStartDate
                document.getElementById('memberKindergartenStart').value = formatDate(addDays(laborDay, 3), "mmddyyyy")
            // })
        }
        document.getElementById('memberReferenceNumberNewMember').addEventListener('blur', function(e) {
            if ( Number(e.target.value) > 2 ) { kindergartenStartDate() }
        })
    }
} // SECTION END Case School
//SECTION START Hide DBs when no results
if (["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
    queueMicrotask(() => {
        if ( document.querySelector('strong.rederrortext')?.textContent.indexOf('No results') > -1) {
            document.getElementById('secondaryActionArea').style.display = "none"
            eleFocus('#submit')
        }
    })
} //SECTION END Case SA no results

//SECTION START Retains "Providers" row selection when changing BWP
if (("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) {
    let serviceAuthorizationInfoTable = document.querySelector('#serviceAuthorizationInfoTable')
    serviceAuthorizationInfoTable.addEventListener('click', function(e) {
        if (providerInfoTableRowIndex !== providerInfoTable.querySelector('tbody > tr.selected').rowIndex) {
            queueMicrotask(() => {
                providerInfoTable.querySelector('tbody > tr:nth-child('+providerInfoTableRowIndex+')').click()
            })
        }
    })

    let providerInfoTable = document.querySelector('#providerInfoTable')
    let providerInfoTableRow = providerInfoTable.querySelector('tbody > tr')
    let providerInfoTableRowIndex = 1
    providerInfoTable.addEventListener('click', function(e) {
        if (e.screenX !== 0) {
            providerInfoTableRow = e.target.parentNode
            providerInfoTableRowIndex = providerInfoTable.querySelector('tbody > tr.selected').rowIndex
        }
    })

    queueMicrotask(() => {
        serviceAuthorizationInfoTable.rows[1].classList.add('selected')
        providerInfoTable.rows[1].classList.add('selected')
    })
} //SECTION END Case SA Approval Package

//SECTION START Fill manual Billing PDF Forms, also nav to Provider Address
if (("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        if (sessionStorage.getItem( 'MECH2.ageCategory.' + caseId ) !== null) {
            let ageCategory = JSON.parse( sessionStorage.getItem( 'MECH2.ageCategory.' + caseId ))
            document.getElementById('ageRateCategory').value = ageCategory.ageRateWeekOne
            document.getElementById('ageRateCategory2').value = ageCategory.ageRateWeekTwo
            document.getElementById('overrideReason').value = ageCategory.overrideReason
            document.getElementById('atRiskPopulationFacility').value = ageCategory.atRiskWeekOne
            document.getElementById('atRiskPopulationFacility2').value = ageCategory.atRiskWeekTwo
            eleFocus('#save')
        }
        document.getElementById('save').addEventListener("click", function() {
            let ageCategory = {
                ageRateWeekOne: document.getElementById('ageRateCategory').value,
                ageRateWeekTwo: document.getElementById('ageRateCategory2').value,
                overrideReason: document.getElementById('overrideReason').value,
                atRiskWeekOne: document.getElementById('atRiskPopulationFacility').value,
                atRiskWeekTwo: document.getElementById('atRiskPopulationFacility2').value
            }
            sessionStorage.setItem('MECH2.ageCategory.' + caseId, JSON.stringify(ageCategory))
        })
    }
    if (typeof userCountyObject !== undefined && userCountyObject.code === "169") {
        $('body').append('<div id="hiddenLoadDiv" style="display: none"></div>');
        $('#csicTableData1').before(`
            <div style="overflow: hidden" id="billingFormDiv">
                <div class="form-group">
                    <button type="button" class="cButton" tabindex="-1" id="billingForm" style="display: inline-flex;">Create Billing Form</button>
                    <label for="copayAmount" class="control-label" style="display: inline-flex;"> Copay Amount: $</label>
                    <output id="copayAmountGet" style="display: inline-flex;">-</output>
                    <button type="button" class="cButton" tabindex="-1" id="providerAddressButton" style="display: inline-flex;">Open Provider Address Page</button>
                </div>
            </div>
        `);
        $('#providerAddressButton').click(function() {
            window.open("/ChildCare/ProviderAddress.htm?providerId=" + $('#providerInfoTable .selected td:eq(0)').text(), "_blank");
        });

        $('#billingForm').click(function() { getCopay( caseId, periodDates.parm3 ) })
        function getCopay(caseNumber, periodRange) {
            $.get('/ChildCare/CaseCopayDistribution.htm?parm2=' + caseNumber + '&parm3=' + periodRange, function (result, status, json) {
                let dataObject = result.slice(result.indexOf("var data = eval('[")+18);
                dataObject = dataObject.substring(0, dataObject.indexOf("]');"));
                dataObject = dataObject.replace(/},{/g, "}splithere{");
                let copayData = dataObject.split("splithere");
                for (let i = copayData.length-1; i >= 0; i--) {
                    let tempObject = JSON.parse(copayData[i]);
                    if ($('#providerInfoTable>tbody>tr.selected>td:eq(0)').text() == tempObject.providerId) {
                        if (tempObject.version == $('#versionInDropdown').val()) {
                            $('#copayAmountGet').html(tempObject.copay.split(".")[0]);
                        };
                    };
                };
            }).done(function() { billingFormInfo() })
        }
        function billingFormInfo() {
            if ($('#copayAmountGet').text() === '') {
                $('#copayAmountGet').replaceWith('<input class="centered-text" style="height: 22px; width: 40px;" id="copayAmountManual"></input><a href="/ChildCare/CaseCopayDistribution.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3 + '" target="_blank">Copay Page</a>');
                snackBar('Auto-retrieval of copay failed.', 'blank')
                return
            };
            let childList = {};
            $('#childInfoTable tbody tr').each(function(index) {//child#.name:, child#.authHours:, child#.ageCat0:, child#.ageCat1:
                $('#childInfoTable tbody tr').click().eq([index]);
                childList["child" + index] = {};
                childList["child" + index].name = reorderCommaName( toTitleCase($(this).children('td').eq(1).text()) );
                childList["child" + index].authHours = $(this).children('td').eq(3).text();
                childList["child" + index].ageCat0 = $('#ageRateCategory').val();
                childList["child" + index].ageCat1 = $('#ageRateCategory2').val();
            });
            let oCaseName = fCaseName()
            const formInfo = {
                pdfType: "BillingForm",
                xNumber: userXnumber,
                caseFirstName: oCaseName.first,
                caseLastName: oCaseName.last,
                caseName: oCaseName.first + " " + oCaseName.last,
                caseNumber: caseId,
                startDate: periodDates.start,
                endDate: periodDates.end,
                providerId: $('#providerInfoTable .selected td:eq(0)').text(),
                providerName: $('#providerInfoTable .selected td:eq(1)').text(),
                copayAmount: $('#copayAmountGet').text().length ? $('#copayAmountGet').text() : $('#copayAmountManual').val(),
                attendance0: new Date(periodDates.start).toLocaleDateString('en-US', {year: "2-digit", month: "numeric", day: "numeric"}),
                attendance7: addDays(periodDates.start, 7).toLocaleDateString('en-US', {year: "2-digit", month: "numeric", day: "numeric"}),
                ...childList
            };
            if (formInfo.copayAmount.length) { window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank") }
        };
    }
}; //SECTION END Case SA Overview

if (["CaseSpecialLetter.htm", "ProviderSpecialLetter.htm"].includes(thisPageNameHtm)) {
    //click checkbox if clicking label
    if ( document.querySelector('.panel-box-format') ) {
        document.querySelector('.panel-default.panel-box-format').addEventListener('click', function(e) {
            if (e.target.tagName === "STRONG") {
                let checkboxParent = e.target.closest('div.col-lg-4')
                checkboxParent?.querySelector('input[type="checkbox"]:not(:disabled)')?.click()
            }
        })
    }
    $('#caseData input#other').click(function() {
        if ($(this).prop('checked')) {
            $('#otherTextbox')
                .val('See Worker Comments below')
                .select()
        }
    })
    $('div.col-lg-offset-3').each(function() {
        $(this).children('label').attr("for", $(this).children('input.textInherit').attr('id'))
    })
    $('#status, #activity').on('input', function() { setTimeout(function() { resetTabIndex() }, 300) })
} //SECTION END Special Letters

//SECTION START Case Special Needs
if (["CaseSpecialNeeds.htm"].includes(thisPageNameHtm)) {
    document.getElementById('reasonText').setAttribute('type', 'text')
}; //SECTION END Case Special Needs

//SECTION START Case Support Activity
if (("CaseSupportActivity.htm").includes(thisPageNameHtm)) {
    $('#activityBegin').blur(function() {
        if ($('#memberDescription').val() === "PE" || $('#memberDescription').val() === "NP") {//extended elig
            $('#activityEnd').val($('#activityBegin').val())
            doEvent("#activityEnd")
            $('#verification').val("Other")
            $('#planRequired').val("No")
            eleFocus('#save')
        } })
    $('strong:contains("before the first day")').length > 0 && $('#save').focus();
    document.getElementById('memberDescription').addEventListener('change', function(e) {
        switch (e.target.value) {
            case "JS":
                document.getElementById('hoursPerWeek').removeAttribute('tabindex')
                document.getElementById('verification').value = "Other"
                document.getElementById('planRequired').value = "No"
                break
            case "ES":
                document.getElementById('verification').value = "Employment Plan"
                document.getElementById('planRequired').value = "Yes"
                break
            case "NP":
                document.getElementById('verification').value = "Other"
                document.getElementById('planRequired').value = "No"
                break
            case "PE":
                document.getElementById('verification').value = "Other"
                document.getElementById('planRequired').value = "No"
                break
            default:
                document.getElementById('verification').value = ""
                document.getElementById('planRequired').value = ""
                break
        }
        doEvent("#planRequired")
    })
}; //SECTION END Case Support Activity

//SECTION START Close case AutoTransfer to closed case bank; Auto enter transfer info if have localStorage value; Add button to notEditMode page to do transfer;
if (("CaseTransfer.htm").includes(thisPageNameHtm)) {
    let closedCaseLS = localStorage.getItem('MECH2.closedCaseBank')
    let closedCaseBank = closedCaseLS.length === 7 ? closedCaseLS : ''

    if ($('strong.rederrortext:contains("Transfer From Worker ID cannot be the same as Transfer To Worker ID.")').length) { localStorage.setItem('MECH2.caseTransfer', 'transferError'); $('#cancel').click() }
    if ($('strong.rederrortext:contains("Transfer To Worker ID is invalid.")').length) { localStorage.removeItem('MECH2.closedCaseBank') }
    $('#footer_links').append('<span style="margin: 0 .3rem; pointer-events: none;"><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_140754" target="_blank">Moving to New County</a>')
    tabIndxNegOne('#caseTransferFromAllowedUREndsDate, #caseTransferFromAssignmentServicingEndsDate, #caseTransferFromVoid, #caseTransferFromTransferImmediately, #caseTransferToTransferEffectiveDate, #caseTransferToEarlyAcceptance, #caseTransferToName')



    // if (transferToWorker) {

    function doCaseTransfer() {
        if (!notEditMode && closedCaseBank) {
            localStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferDone')
            $('#caseTransferFromType:contains("Worker To Worker")').val('Worker To Worker')
            doEvent('#caseTransferFromType')
            $('#caseTransferToWorkerId').val(closedCaseBank);
            doEvent('#caseTransferToWorkerId')
            $('#save').click()
        }
    };

    let transferLS = localStorage.getItem('MECH2.caseTransfer.' + caseId)

    if (transferLS?.length) {
        if (notEditMode) {
            switch (transferLS) {
                case "transferError":
                case "transferDone":
                    localStorage.removeItem('MECH2.caseTransfer.' + caseId)
                    if (localStorage.getItem('closeAfter')?.length ) { localStorage.removeItem('closeAfter'); window.open('about:blank', '_self'); }
                    break
                case "transferStart":
                    localStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferActive')
                    document.getElementById('new').click()
                    break
            }

        }
        if (!notEditMode && transferLS === "transferActive") {
            localStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferDone')
            doCaseTransfer()
        }
    };

    if (notEditMode && localStorage.getItem('MECH2.doClose.' + caseId) === 'closeWindow' && localStorage.getItem('MECH2.activelyTransferring.' + caseId) === 'noThanks') { // Opens about:blank after transferring from inactive caseload list iframe // move to inactivecaseload?
        localStorage.setItem('MECH2.doClose.' + caseId,'didClose.' + caseId);
        window.open('about:blank', '_self');
    };

    //Automatic case transfer section end

    //Semi-manual transfer with a button
    function checkForClosedCaseBank() {
        if (closedCaseBank) {
            buttonClosedTransfer()
        } else {
            eleFocus('#transferWorker')
        }
    }
    function buttonClosedTransfer() {
        localStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferActive')
        document.getElementById('new').click()
    };
    if (notEditMode) {
        ($('#caseTransferToName').parents('.form-group').after(`
            <div class="col-lg-6 col-md-6" style="vertical-align: middle;">
                <button type="button" class="cButton" tabindex="-1" style="float: left;" id="closedTransfer">Transfer to:</button>
                <input type="text" class="form-control" style="float: left; margin-left: 10px; width: var(--eightNumbers)" id="transferWorker" placeholder="Worker #" value=${closedCaseBank}></input>
            </div>
        `))
        // if (closedCaseBank) { document.getElementById('transferWorker').value = closedCaseBank }
        document.getElementById('transferWorker')?.addEventListener('blur', function() {
            if (this.value?.length === 7) {
                localStorage.setItem('MECH2.closedCaseBank', this.value)
            } else {
                closedCaseBank = ''
                localStorage.removeItem('MECH2.closedCaseBank')
            }
        })
        document.getElementById('closedTransfer')?.addEventListener('click', function() { checkForClosedCaseBank() })
        document.getElementById('transferWorker')?.addEventListener('keydown', function(e) { if (e.key === 'enter') { e.preventDefault; checkForClosedCaseBank() } })
    }
} //SECTION END Case Transfer

if (("CaseUnearnedIncome.htm").includes(thisPageNameHtm)) {
    document.getElementById('paymentEndDate').addEventListener('keydown', function(e) {
        if (e.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
    })
    document.getElementById('incomeType').addEventListener('blur', function() {
        if (this.value === "Unemployment Insurance") {
            document.getElementById('tempIncome').value = "Yes"
            document.getElementById('paymentEndDate').tabIndex = 0
        }
    })
    tempIncomes('tempIncome', 'paymentEndDate')
} //SECTION END Case Unearned Income

//SECTION START Navigation buttons to goto Eligibility Selection, Service Authorization Overview, and Case Overview from CaseWrapUp page
if (("CaseWrapUp.htm").includes(thisPageNameHtm) && $('#done').attr('Disabled')) {
    $('#caseHeaderData').after(`<div id="postWrapUpButtons" class="flex-horizontal">
    <button class="form-button" type="button" id="goEligibility">Eligibility</button>
    <button class="form-button" type="button" id="goSAOverview">SA Overview</button>
    <button class="form-button" type="button" id="goSAApproval">SA Approval</button>
    <button class="form-button" type="button" id="goEditSummary">Edit Summary</button>
    <button class="form-button" type="button" id="goSpecialLetter">Special Letter</button>
    </div>`)
    $('#goEligibility').click(function() { window.open('/ChildCare/CaseEligibilityResultSelection.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSAOverview').click(function() { window.open('/ChildCare/CaseServiceAuthorizationOverview.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSAApproval').click(function() { window.open('/ChildCare/CaseServiceAuthorizationApproval.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goEditSummary').click(function() { window.open('/ChildCare/CaseEditSummary.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSpecialLetter').click(function() { window.open('/ChildCare/CaseSpecialLetter.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    eleFocus('#goEligibility')

    sessionStorage.removeItem('actualDate')
    sessionStorage.removeItem('processingApplication')
    localStorage.removeItem('MECH2.activelyTransferring')//cleaning up old local storage items.
    localStorage.removeItem('MECH2.autoCaseNote')
    localStorage.removeItem('MECH2.doClose')
    localStorage.removeItem('MECH2.copiedNote')
}; //SECTION END Case Wrap Up

//SECTION START Client Search
if (("ClientSearch.htm").includes(thisPageNameHtm)) {
    $('#clientSearchTable>tbody').click(function() { eleFocus('#selectBtnDB') })
    let resetbtn = document.getElementById('resetbtn')
    if (resetbtn) {
        document.querySelectorAll('input.form-control, select.form-control').forEach(function(e) {
            e.removeAttribute('disabled')
        })

        let clientSearchNthChild = {"ssnReq": 1, "lastNameReq": 3, "firstNameReq": 4, "genderReq": 6, "birthdateReq": 7, "pmiReq": 9}
        let searchTable = document.querySelector('#clientSearchTable')
        for (let field in clientSearchNthChild) {
            let fieldValue = document.getElementById([field]).value
            if ([field][0] === "genderReq") {
                if (fieldValue === 'M') { fieldValue = "Male" }
                else if (fieldValue === 'F') { fieldValue = "Female" }
            }
            let segmentedFields = ['ssnReq', 'birthdateReq']
            if (fieldValue) {
                searchTable.querySelectorAll('tbody > tr > td:nth-child('+ clientSearchNthChild[field] +')').forEach(function(e, f) {
                    if ( fieldValue.length && e.textContent === fieldValue) { e.classList.add('wholeMatch') }// { e.style.color = 'red' }
                    if ( fieldValue.length && !e.classList.contains('wholeMatch') && e.textContent.length && segmentedFields.includes([field][0]) ) {
                        let fieldValueSplit = (/-/).test(fieldValue) ? fieldValue.split('-') : fieldValue.split('/')
                        // let splitTest = new RegExp(fieldValueSplit[0])
                        let splitTest = new RegExp('(?:/b' + fieldValueSplit[0] + '/b|/b' + fieldValueSplit[1] + '/b|/b' +fieldValueSplit[2] + '/b)')
                        console.log( e.textContent.match(splitTest) )
                        // if ( splitTest.test(fieldValue) ) { e.classList.add('partialMatch'); return }
                        // let ssnSplit = (/-/).test(e.textContent) ? e.textContent.split('-') : ''
                        // let birthdateSplit = (/\//).test(e.textContent) ? e.textContent.split('/') : ''
                        // console.log( splitTest.test(fieldValue) )
                        // console.log(splitTest)
                    }
                })
            }
        }

    }
    let resultTable = document.querySelector('#clientSearchProgramResults')
    if (resultTable) {
        waitForTableCells('#clientSearchProgramResults').then(() => {
        // waitForElmHeight('#clientSearchProgramResults > tbody > tr > td').then(() => {
            $('#clientSearchProgramResults td:contains("Child Care")').parent().addClass('stickyRow stillNeedsBottom')
            document.querySelectorAll('.stickyRow').forEach(function(element, index) {
                element.style.bottom = ((document.querySelectorAll('.stillNeedsBottom').length -1) * (resultTable.getBoundingClientRect().height / resultTable.querySelectorAll('tbody tr').length)) + "px"
                $(element).removeClass('stillNeedsBottom')
            })
        })
    }
}; //SECTION END Client Search

//SECTION START FinancialBilling Fix to display table, edit h4 for billing worker
if (("FinancialBilling.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        let weekOneMonday = document.querySelector('#weekOneMonday')
        let billedHoursPanel = document.querySelector('div.panel-box-format:has(#weekOneMonday)')
        $('#billedTimeTableData').nextAll('div.form-group').eq(0).keydown(function(e) {
            if (e.target.id === "billedTimeType" && e.key === 'Tab' && e.shiftKey && e.target.value === '') {
                e.preventDefault()
                eleFocus('#registrationFee')
            }
            else if (e.target.id === "billedTimeType" && e.key === 'Tab' && !e.shiftKey && e.target.value === '') {
                e.preventDefault()
                eleFocus('#weekOneMonday')
                document.querySelector('#weekOneMonday').select()
            }
        })
        setTimeout(function() {
            let childAndProviderNames = "for " + getFirstName($('#billingChildTable>tbody>tr.selected>td:eq(1)').html()) + " at " + $('#billingProviderTable>tbody>tr.selected>td:eq(0)').html()
            $('h4:not(h4:contains("Version Information"))').each(function() {
                $(this).html($(this).html() + ' ' + childAndProviderNames)
            })
        }, 100)
        function addBillingRows(changedId) {
            let weekOneDays = [parseInt($('#weekOneMonday').val()), parseInt($('#weekOneTuesday').val()), parseInt($('#weekOneWednesday').val()), parseInt($('#weekOneThursday').val()), parseInt($('#weekOneFriday').val()), parseInt($('#weekOneSaturday').val()), parseInt($('#weekOneSunday').val())]
            let weekTwoDays = [parseInt($('#weekTwoMonday').val()), parseInt($('#weekTwoTuesday').val()), parseInt($('#weekTwoWednesday').val()), parseInt($('#weekTwoThursday').val()), parseInt($('#weekTwoFriday').val()), parseInt($('#weekTwoSaturday').val()), parseInt($('#weekTwoSunday').val())]
            let $whichBilledWeek = changedId.indexOf("weekOne") > -1 ? $('#totalHoursBilledWeekOne') : $('#totalHoursBilledWeekTwo')
            let weekDaysChanged = changedId.indexOf("weekOne") > -1 ? weekOneDays : weekTwoDays
            $whichBilledWeek.val(weekDaysChanged.reduce((partialSum, a) => partialSum + a, 0))//adds up array
            parseInt($('#totalHoursBilledWeekOne').val()) + parseInt($('#totalHoursBilledWeekTwo').val()) > parseInt($('#totalHoursOfCareAuthorized').val()) ? $('#totalHoursBilledWeekOne, #totalHoursBilledWeekTwo, #totalHoursOfCareAuthorized').addClass('red-outline') : $('#totalHoursOfCareAuthorized, #totalHoursBilledWeekOne, #totalHoursBilledWeekTwo').removeClass('red-outline')
        }
        $('table').click(function(e) {
            if (e.target.tagName.toLowerCase() === "input") { e.target.select() }
        })
        $('table:has(#weekOneMonday)').keyup(function(e) {
            if (e.target.id.indexOf('week') === 0) {
                if (e.target.value !== 0 && e.target.value !== '') { addBillingRows(e.target.id) }
                else if (e.target.value === '') { e.target.value = 0 }
            }
        })
    }
    if (notEditMode) {
        document.getElementById('FinancialBillingApprovalSelf').addEventListener('click', function() {
            if (caseId.length && document.querySelectorAll('#billingProviderTable>tbody>tr.selected')?.length) {
                console.log('MECH2.billingApproval.' + caseId, document.querySelector('#billingProviderTable>tbody>tr.selected>td:nth-child(5)')?.textContent)
                sessionStorage.setItem('MECH2.billingApproval.' + caseId, document.querySelector('#billingProviderTable>tbody>tr.selected>td:nth-child(5)')?.textContent)
            }
        })
        function setActiveProvider() {
            sessionStorage.setItem('MECH2.billingApproval.' + caseId, document.querySelector('#billingProviderTable>tbody>tr.selected>td:nth-child(5)')?.textContent)
        }
        let lastSelectedProvider = sessionStorage.getItem('MECH2.billingApproval.' + caseId)
        if (document.referrer.indexOf("FinancialBillingApproval.htm") > -1) {
            waitForTableCells('#billingProviderTable').then(() => {
                if (lastSelectedProvider?.length) { $('#billingProviderTable>tbody>tr>td:contains(' + lastSelectedProvider + ')').click() }
            })
        }
    }
}; //SECTION END Financial Billing

//SECTION START FinancialBillingApproval
if (("FinancialBillingApproval.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        $('#remittanceComments').parents('.form-group').append('<button type="button" id="unpaidCopayNote" class="cButton__nodisable" tabindex="-1">Unpaid Copay</button>');
        $('#unpaidCopayNote').click(function() { $('#userComments').val('Copay is unpaid, provider did not indicate if there is a payment plan.') })
        $('#remittanceComments').parents('.form-group').append('<button type="button" id="paymentPlanNote" class="cButton__nodisable float-right" tabindex="-1">Payment Plan</button>');
        $('#paymentPlanNote').click(function() { $('#userComments').val('Provider indicated there is a payment plan for the unpaid copay.') })
    }
    else if (notEditMode) {
        document.getElementById('FinancialBillingSelf').addEventListener('click', function() {
            if (caseId.length && document.querySelectorAll('#financialBillingApprovalTable>tbody>tr.selected')?.length) {
                sessionStorage.setItem('MECH2.billingApproval.' + caseId, document.querySelector('#financialBillingApprovalTable>tbody>tr.selected>td:nth-child(1)')?.textContent)
            }
        })
        if (document.referrer.indexOf("FinancialBilling.htm") > -1) {
            let lastSelectedProvider = sessionStorage.getItem('MECH2.billingApproval.' + caseId)
            waitForTableCells('#financialBillingApprovalTable').then(() => {
                if (lastSelectedProvider?.length) { $('#financialBillingApprovalTable>tbody>tr>td:contains(' + lastSelectedProvider + ')').click() }
            })
        }
    }
}; //SECTION END Financial Billing Approval

//SECTION START FinancialManualPayment
if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) {
    let manualSelectPeriodToReverse = document.getElementById('mpSelectBillingPeriod')
    selectPeriodReversal(manualSelectPeriodToReverse)
}; //SECTION END Financial Manual Payment

//SECTION START Close case transfer to closed case bank; Changing dates to links
if (("InactiveCaseList.htm").includes(thisPageNameHtm)) {
    let closedCaseLS = localStorage.getItem('MECH2.closedCaseBank')
    let closedCaseBank = closedCaseLS.length === 7 ? closedCaseLS : ''
    let closedCaseBankLastThree = closedCaseBank.length === 7 ? closedCaseBank.slice(4) : ''
    let todayDate = new Date().getTime();
    let changedToLinks
    $('#inActiveCaseTable > tbody > tr > td:nth-of-type(4)').each(function() {
        let closedDatePlus46 = addDays($(this).text(), 46).getTime();
        if (closedDatePlus46 < todayDate) {
            let linkText = $(this).text();
            $(this).text('');
            $(this).append('<a class="oldClosed" id=' + $(this).siblings().eq(0).text() + ' href="CaseTransfer.htm?parm2=' + $(this).siblings().eq(0).text() + '", target="_blank">' + linkText + '</a>')
            if (closedCaseBank.length === 7) { $(this).append('<span style="display: inline-block; margin-left: 15px;" class="cSpan">→ ' + closedCaseBankLastThree + '</span>') }
        };
    })
    $('#workerSearch').closest('.col-lg-12').append(//'<button type="button" id="transferAllClosed" class="cButton__floating cButton float-right" tabindex="-1">Transfer All Old Closed</button>')
        `<div style="vertical-align: middle; float: right !important;">
            <button type="button" class="cButton" tabindex="-1" id="closedTransfer">Transfer old closed to:</button>
            <input type="text" class="form-control" style="display: inline-block; margin-left: 10px; width: var(--eightNumbers)" id="transferWorker" placeholder="Worker #" value=${closedCaseBank}></input>
        </div>`
    )
    function addTableButtons() {
        $('.cSpan').remove()
        $('.oldClosed').after('<span style="display: inline-block; margin-left: 15px;" class="cSpan">→ ' + closedCaseBankLastThree + '</span>')
    }
    function removeTableButtons() {
        $('.cSpan').remove()
    }
    const oldClosedArray = Array.from(document.querySelectorAll('.oldClosed'), (caseNumber) => caseNumber.id)
    document.getElementById('transferWorker')?.addEventListener('blur', function() {
        console.log(this.value)
        if (this.value?.length === 7) {
            if ( this.value !== localStorage.getItem('MECH2.closedCaseBank') ) {
                localStorage.setItem('MECH2.closedCaseBank', this.value)
                closedCaseBank = this.value
                closedCaseBankLastThree = closedCaseBank.slice(4)
                addTableButtons()
            }
        } else {
            closedCaseBank = ''
            closedCaseBankLastThree = ''
            localStorage.removeItem('MECH2.closedCaseBank')
            removeTableButtons()
        }
    })
    $('#footer_links').before('<div id="iframeContainer" style="height: 400px; width: ' + $(".panel.panel-default").width() + '; display: none;"><iframe id="transferiframe" name="transferiframe" style="width: 100%; height: 100%;"></iframe></div>');
    let transferiframe = document.getElementById('transferiframe')
    let iframeContainer = document.getElementById('iframeContainer')
    document.getElementById('inActiveCaseTable').onclick = function(event) {
        if (event.target.closest('span')?.tagName.toLowerCase() === 'span') {
            if (!closedCaseBank) { return false }
            transferSingleClosed(event.target.closest('span').previousElementSibling)
        }
    }
    function transferSingleClosed(ele) { // AutoTransfer
        localStorage.setItem('MECH2.caseTransfer.' + ele.getAttribute('id'), 'transferStart')
        sessionStorage.setItem('MECH2.singleClose','closeWindow');
        $(ele).closest('tr').hide();
        window.open('/ChildCare/' + $(ele).attr('href'), 'transferiframe');
    };
    function transferAllClosed() {//blarg
        sessionStorage.setItem('MECH2.massClose', "closeWindow")
        caseTransferEvent()
    }
    function caseTransferEvent() {
        localStorage.setItem('MECH2.caseTransfer.' + oldClosedArray[0], 'transferStart');
        window.open('/ChildCare/CaseTransfer.htm?parm2=' + oldClosedArray[0], 'transferiframe');
        iframeContainer.style.display = "block"
        oldClosedArray.shift()
    }
    $('#closedTransfer').click(function() { transferAllClosed() });

    window.addEventListener('storage', function(key, newValue, oldValue) {
        if (event.key === 'MECH2.closedCaseBank' && event.newValue === null) {
            return false
        }
        if (sessionStorage.getItem('MECH2.singleClose')?.length && event.key.indexOf('MECH2.caseTransfer') > -1 && event.newValue === null) {
            sessionStorage.removeItem('MECH2.singleClose')
            window.open('about:blank', 'transferiframe')
            iframeContainer.style.display = "none"
        }
        if (sessionStorage.getItem('MECH2.massClose')?.length && event.key.indexOf('MECH2.caseTransfer') > -1 && event.newValue === null) {
            if (oldClosedArray.length > 0 && event.key.indexOf('MECH2.caseTransfer') > -1 && event.newValue === null) {
                caseTransferEvent();
                // $('tr>td:first-child:contains(' + oldClosedArray[0] + ')').closest('tr').hide()
                $('tr>td:first-child:contains(' + oldClosedArray[0] + ')').closest('tr').css('opacity', '.5')
            }
            if (oldClosedArray.length === 0 && event.key.indexOf('MECH2.caseTransfer') > -1 && event.newValue === null) {
                sessionStorage.removeItem('MECH2.massClose')
                window.open('about:blank', 'transferiframe')
                iframeContainer.style.display = "none"
            }
        }
    })
    function checkForClosedCaseBank() {
        if (closedCaseBank) {
        } else {
            eleFocus('#transferWorker')
        }
    }
    document.getElementById('closedTransfer')?.addEventListener('click', function() { checkForClosedCaseBank() })
}; //SECTION END Inactive Case List

if ( ["Login.htm", "ChangePassword.htm"].includes(thisPageNameHtm) || ("/ChildCare/").includes(thisPageName) ) {
    if (userXnumber.length && document.getElementById("terms")) {
        document.getElementById("userId").value = userXnumber;
        document.getElementById("terms").click();
        document.getElementById("password").focus();
    } else {
        eleFocus('#userId')
        addEventListener('beforeunload', (event) => {
            if (document.getElementById("userId").value !== '') {
                let enteredUserId = document.getElementById("userId").value
                localStorage.setItem('MECH2.userIdNumber', enteredUserId)
            };
        });
    }
} //SECTION END Login

if (("MaximumRates.htm").includes(thisPageNameHtm)) {
    let providerType = document.getElementById('ratesProviderType').value
    let ageDefinitions = ''
    let infant
    let toddler
    let preschooler
    switch (providerType) {
        case "Child Care Center":
            infant = "Birth until 16 months."
            toddler = "16 months until 33 months."
            preschooler = "33 months until the August prior to the Kindergarten date on the School page"
            ageDefinitions = '<div><label>Infant:</label><span>'+infant+'</span></div> <div><label>Toddler:</label><span>'+toddler+'</span></div> <div><label>Preschooler:</label><span>'+preschooler+'</span></div>'
            break
        case "Family Child Care":
        case "Legal Non-licensed":
            infant = "Birth until 12 months."
            toddler = "12 months until 24 months."
            preschooler = "24 months until the August prior to the Kindergarten date on the School page"
            ageDefinitions = '<div><label>Infant:</label><span>'+infant+'</span></div> <div><label>Toddler:</label><span>'+toddler+'</span></div> <div><label>Preschooler:</label><span>'+preschooler+'</span></div>'
            break
        default:
            break
    }
    let maxRatesCounty = document.getElementById('maximumRatesCounty')
    let ratesProviderType = document.getElementById('ratesProviderType')
    let maximumRatesPeriod = document.getElementById('maximumRatesPeriod')
    let firstNonBlankPeriod = maximumRatesPeriod.querySelector('option:nth-child(2)')
    if (maxRatesCounty.value === "" && typeof userCountyObject !== undefined) { maxRatesCounty.value = userCountyObject.county ; doEvent('#maximumRatesCounty') }
    if (ratesProviderType.value === '') { ratesProviderType.value = "Child Care Center" ; doEvent('#ratesProviderType') }
    if (maximumRatesPeriod.value === '') { maximumRatesPeriod.value = firstNonBlankPeriod.value ; doEvent('#maximumRatesPeriod') }
    ratesProviderType.addEventListener('change', function() { maximumRatesPeriod.value = firstNonBlankPeriod.value ; doEvent('#maximumRatesPeriod') })
    if (document.getElementById('ratesProviderType').value !== "Legal Non-licensed") {
        document.querySelectorAll('tbody>tr>th:nth-child(n+2):nth-child(-n+4)').forEach(function(e) {
            e.textContent = e.textContent + " (15%, 20%)"
        })
        document.querySelectorAll('tbody>tr>td').forEach(function(e) {
            if (isFinite(e.textContent) && e.textContent > 0) {
                e.textContent = e.textContent + " (" + (e.textContent * 1.15).toFixed(2) +", " + (e.textContent * 1.2).toFixed(2) + ")"
            }
        })
    } else if (document.getElementById('ratesProviderType').value === "Legal Non-licensed") {
        document.querySelectorAll('tbody>tr>th:nth-child(n+2):nth-child(-n+4)').forEach(function(e) {
            e.textContent = e.textContent + " (15%)"
        })
        document.querySelectorAll('tbody>tr>td').forEach(function(e) {
            if (isFinite(e.textContent) && e.textContent > 0) {
                e.textContent = e.textContent + " (" + (e.textContent * 1.15).toFixed(2) +")"
            }
        })
    }
    document.querySelector('div.panel-box-format > div.form-group').insertAdjacentHTML('afterend', '<div id="ageCategories">'+ ageDefinitions +'</div>')
    //https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_0927 // Accreditations
} //SECTION END Maximum Rates

if (thisPageNameHtm.indexOf("Notices.htm") > 0) {
    if (document.getElementById('textbox2') ) {
        function dynamicallyLoadScript(url) {
            var script = document.createElement("script")
            script.src = url
            document.head.appendChild(script)
        }
        dynamicallyLoadScript("https://unpkg.com/downloadjs@1.4.7")
        /* globals download, PDFLib */
        async function createPdf(text, fileName) {
            // await import("https://unpkg.com/downloadjs@1.4.7")
            const { PDFDocument, StandardFonts, rgb, PageSizes } = await import("https://unpkg.com/pdf-lib")
            // const fontkit = await import("https://unpkg.com/@pdf-lib/fontkit")
            text = text.replaceAll(/(\n)(?=.+Page \d)/g, '\nPAGEBREAK\n')
            text = text.replaceAll(/(?: {74}\n){2,}(?![\s\w])/g, '') // removes the last set of repeated spaces/returns
            text = text.replaceAll(/(?: {74}\n){1,}(?=PAGEBREAK)/g, '') //removes the others
            let textArray = text.split("PAGEBREAK")
            // const url = 'https://github.com/Hopding/pdf-lib/blob/master/assets/fonts/ubuntu/UbuntuMono-R.ttf'
            // const fontBytes = await fetch(url).then(res => res.arrayBuffer())
            const pdfDoc = await PDFLib.PDFDocument.create()
            const courierFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier)
            // pdfDoc.registerFontkit(fontkit)
            // const customFont = await pdfDoc.embedFont(fontBytes)
            for await (let pagesText of textArray) {

                const page = pdfDoc.addPage() //PDFLib.PageSizes.Letter)
                const { width, height } = page.getSize()
                const fontSize = 12
                page.drawText(pagesText, {
                    lineHeight: 12,
                    x: 35,
                    y: height-55,
                    size: 12,
                    font: courierFont,
                })
            }
            const pdfBytes = await pdfDoc.save()
            download(pdfBytes, fileName + ".pdf", "application/pdf");
            // pdfBytes.download(fileName + ".pdf", "application/pdf")
        }
        document.querySelector('#textbox2').insertAdjacentHTML('afterend', '<button type="button" class="form-button" style="vertical-align: top;" id="downloadAsPdf">Download as PDF</button>')
        document.querySelector('#downloadAsPdf').addEventListener('click', function() { createPdf( document.querySelector('#textbox1').textContent, document.querySelector('title').textContent + " " + caseIdORproviderId ) })
    }
}

if (("PendingCaseList.htm").includes(thisPageNameHtm)) {
    document.querySelectorAll('#pendingCaseTable > tbody > tr > td:nth-child(8)').forEach(function(e) {
        if (e.textContent === '') {
            let lastExtPendDate = addDays(new Date(e.previousSibling.textContent), 15).toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit" })
            e.textContent = 'Plus 15 days: ' + lastExtPendDate
        }
    })
} //SECTION END Pending Case List

//SECTION START Provider Address
if (("ProviderAddress.htm").includes(thisPageNameHtm)) {
    if (notEditMode) {
        function removeNoEntryRows() {
            $('#providerData :is(input, select):not(#mailingZipCodePlus4, #mailingSiteHomeZipCodePlus4)').filter(function() { return this.value === '' }).closest('.form-group').addClass('collapse noEntry')
        }
        removeNoEntryRows()
        $('table').click(function() {
            $('.noEntry').removeClass('collapse noEntry')
            removeNoEntryRows()
        })
    }
    if (!notEditMode) {
        if ($('#mailingSiteHomeCountry').val()?.length === 0) {
            $('#mailingSiteHomeCountry').val('USA').addClass('prefilled-field')
            $('#mailingSiteHomeState').val('Minnesota').addClass('prefilled-field')
            typeof userCountyObject !== undefined && $('#mailingSiteHomeCounty').val(userCountyObject.county).addClass('prefilled-field')
        }
        $('#mailingCountry').change(function() {
            if (('#mailingState').val()?.length === 0) {
                ('#mailingState').val('Minnesota').addClass('prefilled-field')
            }
        })
    }
    //SECTION END ProviderAddress Default values for Country, State, County
    //SECTION START ProviderAddress Copy Provider mailto Address
    $('#providerInput').append('<button type="button" class="cButton float-right" tabindex="-1" id="copyMailing">Billing Form Address to Clipboard</button>');
    $('#copyMailing').click(function() {
        // copyMailing() });
        if ($('#addrBillFormDisplay').val() == "Site/Home") {
            let state = swapStateNameAndAcronym(document.getElementById('mailingSiteHomeState').value)
            let copyText = $('#providerData').children(0).contents().eq(4).text() + "\n" + document.getElementById('mailingSiteHomeStreet1').value + " " + document.getElementById('mailingSiteHomeStreet2').value + "\n" + document.getElementById('mailingSiteHomeCity').value + ", " + state + " " + document.getElementById('mailingSiteHomeZipCode').value
            navigator.clipboard.writeText(copyText);
            snackBar(copyText);
        } else {
            let state = swapStateNameAndAcronym(document.getElementById('mailingState').value)
            let copyText = $('#providerData').children(0).contents().eq(4).text() + "\n" + document.getElementById('mailingStreet1').value + " " + document.getElementById('mailingStreet2').value + "\n" + document.getElementById('mailingCity').value + ", " + state + " " + document.getElementById('mailingZipCode').value
            navigator.clipboard.writeText(copyText);
            snackBar(copyText);
        };
    });
}; //SECTION END Provider Address

if (("ProviderNotices.htm").includes(thisPageNameHtm)) {
    if ($('#remove').length && $('#providerNoticesSearchData>tbody>tr>td').text() !== "No records found") {
        function addRemDisabled(event) {
            if ($('#cancel').prop('disabled') && event.tagName?.toLowerCase() === "td" && $(event).siblings().addBack().last().text().indexOf("Waiting") > -1 ) { $('#cancel').removeAttr('disabled'); $('#resend').attr('disabled', 'disabled') }//says waiting, cancel is disabled: disable resend, remove disable cancel;
            else if ($('#resend').prop('disabled') && event.tagName?.toLowerCase() === "td" && $(event).siblings().addBack().last().text().indexOf("Waiting") < 0) { $('#resend').removeAttr('disabled'); $('#cancel').attr('disabled', 'disabled') }//doesn't say waiting, disable cancel, remove disable resend;
        }
        waitForTableCells('#providerNoticesSearchData').then(() => addRemDisabled(document.querySelector('tr>td')) )
        $('#providerNoticesSearchData').click(function() { addRemDisabled(event.target) })
    }
} //SECTION END Provider Notices

if (("ProviderSearch.htm").includes(thisPageNameHtm)) {
    tabIndxNegOne('#ssn, #itin, #fein, #licenseNumber, #middleInitName')
    let searchByNumbers = $('#ssn, #providerIdNumber, #itin, #fein, #licenseNumber').filter(function() { return this.value > 0 }).length
    let justOneResult = $('h5:contains("Search Results: 1 matches found.")').length
    if (!searchByNumbers && !justOneResult) {
        if (typeof userCountyObject !== undefined) {
            const localCounties = userCountyObject.neighbors
            localCounties.push(userCountyObject.county)
            waitForTableText('#providerSearchTable > tbody > tr > td').then(() => {
                $('tbody tr:contains("Inactive")').addClass('inactive inactive-hidden')
                $('tbody tr td:last-of-type').each(function() {
                    if (!localCounties.includes($(this).text())) {
                        $(this).parent('tr')
                            .addClass('out-of-area out-of-area-hidden')
                    };
                });
            });
        }
        $('h5').after('<div class="primary-navigation-row" style="justify-content: flex-end;"><button type="button" id="inactiveToggle" class="cButton__floating cButton">Toggle Inactive</button><button type="button" id="outOfAreaToggle" class="cButton__floating cButton">Toggle Out of Area</button></div>');
        $('#inactiveToggle').click(function() { $('.inactive').toggleClass('inactive-hidden'); $('.dataTables_scrollBody').css('height',''); });
        $('#outOfAreaToggle').click(function() { $('.out-of-area').toggleClass('out-of-area-hidden'); $('.dataTables_scrollBody').css('height',''); });
        waitForElmHeight('#providerSearchTable > tbody > tr').then(() => {
            if ($('tbody > tr:not(tbod y> tr[class$="hidden"])').length) { $('tbody > tr:not(tbody > tr[class$="hidden"]):eq(0)').click() }
            let openActiveNearby = document.querySelectorAll('table > tbody > tr:not(.inactive, .out-of-area').length
            let openActive = document.querySelectorAll('table > tbody > tr:not(.out-of-area').length
            document.querySelector('h5').textContent += " " + openActiveNearby + " open local providers. " + openActive + " active providers."
        } )
    } else { console.log(searchByNumbers, justOneResult) }
    if (searchByNumbers || justOneResult) { $('tbody >tr >td >a').each(function() { $(this).attr('target', '_self') }) }

    if (!['CaseChildProvider.htm?', 'ProviderSearch.htm?'].includes(document.referrer.substring(document.referrer.indexOf("/ChildCare/") + 11, document.referrer.indexOf(".htm")+5))) { $('#back, #select, #backDB, #selectDB').hide() }
}; //SECTION END Provider Search

if (("ProviderRegistrationAndRenewal.htm").includes(thisPageNameHtm)) {
    if (notEditMode) {
        if (typeof userCountyObject !== undefined) {
            if ($('#providerRegistrationAndRenewalTable>tbody>tr:contains(' + userCountyObject?.county + ' County)').length > 0) {
                $('#providerRegistrationAndRenewalTable>tbody>tr:contains(' + userCountyObject.county + ' County)').click()
                eleFocus('#editDB')
            }
        } else { eleFocus('#newDB') }
    } else { eleFocus('#nextRenewalDue') }
} //SECTION END Provider Registration And Renewal


/////////////////////////////////////////////////////// PAGE SPECIFIC CHANGES SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ */



///////////////////////////////////////////////////////////// FUNCTIONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ */

//jQuery datePicker options (calendar)
try {
    if ($.datepicker !== undefined) {
        $.datepicker.setDefaults({
            numberOfMonths: 3,
            showCurrentAtPos: 1,//middle, 0 index
            stepMonths: 2,
            maxDate: "+2y",
        })
    }
} catch(error) { console.error(error) }
//

async function evalData(caseProviderNumber = caseId, pageName = thisPageName, dateRange = '', evalString = '', parm2providerId = 'parm2') {
    let parmDateRange = dateRange.length ? "&parm3=" + dateRange : undefined
    let unParsedEvalData = await getEvalData(caseProviderNumber, pageName, parmDateRange, parm2providerId).catch((err) => {
        console.trace(err);
        return false
    })
    if (!unParsedEvalData?.length) { return false }
    let parsedEvalData = await parseEvalData(unParsedEvalData).catch((err) => {
        console.trace(err);
        return false
    })
    if (evalString) {
        parsedEvalData = await resolveEvalData(parsedEvalData, evalString)
    }
    return parsedEvalData
}

async function getEvalData(caseProviderNumber, pageName, parm3 = '', parm2providerId) {
    let idNumber = parm2providerId === "parm2" ? caseId : providerId
    return new Promise((resolve) => {
        if (caseProviderNumber !== idNumber || pageName !== thisPageName) {
            $.get('/ChildCare/' + pageName + '.htm?' + parm2providerId + '=' + caseProviderNumber + parm3, function (result, status, json) {
                resolve(result)
            })
        } else {
            let evalData = $('script:contains(eval)').html()
            resolve(evalData)
        }
    })
}
function parseEvalData(dataObject) {
    return new Promise((resolve) => {
        let parsedEvalData = {}
        let dataObjectMatches = dataObject.match(/eval\(\'\[\{.*?\}\]\'\)\;/g)
        for (let i = 0; i < dataObjectMatches.length; i++) {
            let dataObjectReplacements = dataObjectMatches[i]
            .replaceAll(/eval\(\'|\'\)\;/g,'')
            .replaceAll(/:,/g, ':"",')
            .replaceAll(/\\'/g, "'")
            parsedEvalData[i] = JSON.parse(dataObjectReplacements)
        }
        resolve(parsedEvalData)
    })
}
function resolveEvalData(parsedEvalData, evalString){
    evalString = evalString.split('.');
    while(evalString.length) {
        if (typeof parsedEvalData !== 'object') { return undefined }
        parsedEvalData = parsedEvalData[evalString.shift()];
    }
    return parsedEvalData;
}

const stateData = {
    AZ: 'Arizona', AL: 'Alabama', AK: 'Alaska', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DC: 'District of Columbia', DE: 'Delaware', FL: 'Florida',
    GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
    MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
    SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', AS: "American Samoa",
    GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "U.S. Virgin Islands", UM: "U.S. Minor Outlying Islands",
}
function acronymToStateName(acronym) { return stateData[acronym] ?? acronym }
function stateNameToAcronym(stateName) { return Object.keys(stateData).find((key) => stateData[key] === stateName) ?? stateName }
function swapStateNameAndAcronym(stateInfo) { return Object.keys(stateData).find((key) => stateData[key] === stateInfo) ?? stateData[stateInfo] }
//
function copyMailing() {
    let providerName = (("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm)) ? $('label[for="providerName"]').parent().contents().eq(4).text().trim() : $('#providerInfoTable>tbody>tr.selected>td:eq(1)').html().trim()
    if ($('#addrBillFormDisplay').val() == "Site/Home") {
        let state = swapStateNameAndAcronym(document.getElementById('mailingSiteHomeState').value)
        let copyText = providerName + "\n" + document.getElementById('mailingSiteHomeStreet1').value + " " + document.getElementById('mailingSiteHomeStreet2').value + "\n" + document.getElementById('mailingSiteHomeCity').value + ", " + state + " " + document.getElementById('mailingSiteHomeZipCode').value
        navigator.clipboard.writeText(copyText);
        snackBar(copyText);
    } else {
        let state = swapStateNameAndAcronym(document.getElementById('mailingState').value)
        let copyText = providerName + "\n" + document.getElementById('mailingStreet1').value + " " + document.getElementById('mailingStreet2').value + "\n" + document.getElementById('mailingCity').value + ", " + state + " " + document.getElementById('mailingZipCode').value
        navigator.clipboard.writeText(copyText);
        snackBar(copyText);
    };
}
//
function fRemoveWhitespace(d) {
    let $div = $(d)
    $div.contents().filter(function() { return this.nodeType === 3 }).each(function() { this.textContent = this.textContent.trim() });
}
//
function autoOpenOnPaste() {
    if (document.querySelector('#caseInputSubmit, #submitProviderId, #providerIdSubmit') !== null) {
        $('#providerInput').off('paste')
        document.querySelector('#caseInput>#caseId, #providerInput>#providerId').addEventListener('paste', function(event) {
            try {
                event.stopPropagation()
                setTimeout(function() {
                    event.target.value = event.target.value.trim()
                    if ( (/^[0-9]+$/).test(event.target.value.trim()) > 0 ) { document.querySelector('#caseInputSubmit, #submitProviderId, #providerIdSubmit').click() }
                },1)
            } catch(error) { console.log(error) }
        })
    }
}
autoOpenOnPaste()

let caseOrProviderNumber = document.querySelectorAll('#caseInput>#caseId, #providerInput>#providerId')
if (notEditMode && caseOrProviderNumber.length) {//blirg
    window.addEventListener('paste', async function(e) {
        navigator.clipboard.readText()
            .then(text => {
            if (!["text", "input"].includes( document.activeElement.nodeName?.toLowerCase() ) && text < 10000000) {// && document.activeElement.id !== "newTabField"
                caseOrProviderNumber[0].value = text.trim()
                document.querySelector('#caseInputSubmit, #submitProviderId, #providerIdSubmit').click()
            }
        })
        // console.log( )
        // console.log( e.originalEvent?.clipboardData?.getData('text') )
        // if ( !["text"].includes( document.activeElement.type?.toLowerCase() ) ) {//&& e.originalEvent.clipboardData.getData('text') < 10000000
        //     // try {
        //     //     event.stopPropagation()
        //     //     setTimeout(function() {
        //     //         event.target.value = event.target.value.trim()
        //     //         if ( (/^[0-9]+$/).test(event.target.value.trim()) > 0 ) { document.querySelector('#caseInputSubmit, #submitProviderId, #providerIdSubmit').click() }
        //     //     },1)
        //     // } catch(error) { console.log(error) }
        // }
    })
}

const redBorder = [ { borderColor: "red", borderWidth: "2px", } ]
const redBorderTiming = {
    borderStyle: "solid",
    duration: 300,
    iterations: 10,
};
//element.animate(redBorder, redBorderTiming)

function addGlobalStyle(css) { //To allow for adding CSS styles
    var head, style;
    head = document.getElementsByTagName('head')[0];
    if (!head) { return; }
    style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    head.appendChild(style);
};
//
function addCommaSpace(value) {
    return String(value)
        .replace(/,([^0-9])/g, ", $1")
}
//
function tableCapitalize(tableName) {
    ($('#' + tableName + '>tbody>tr>td').filter( ":nth-child(2)" )).each(function() {
        $(this).text($(this).text().toLowerCase())
        $(this).addClass('capitalize')
    })
}
//
function toTitleCase(value, ...excludedWordList) {
    // const exceptions = excludedWordList
    // .flat(Infinity)
    // .map(item => String(item).trim())
    // .join('\\b|\\b');
    return String(value)
    // console.log(String(value).trim().replace(/\s+/g, ' '))
        .trim()
        .replace(/\s+/g, ' ')
        .replace(
        RegExp(`\\b(?<upper>[\\w])(?<lower>[\\w]+)\\b`, 'g'),
        (match, upper, lower) => `${ upper.toUpperCase() }${ lower.toLowerCase() }`,
    )
}
//
function reorderCommaName(commaName) {
    try {
        commaName = commaName.replace(/\b\w\b|\./g, '')
        commaName = commaName.trim()
        commaName = toTitleCase(commaName)
        let commaNameSplit = commaName.split(",")
        commaName = commaNameSplit[1].trim() + " " + commaNameSplit[0].replace(/,/,'')
        return commaName
    } catch(error) { console.trace(error) }
};
//
function getFirstName(commaName) {
    let caseNameBackwards = toTitleCase(commaName).replace(/\b\w\b/,'').trim();
    let firstName = caseNameBackwards.split(",")[1].trim()
    return firstName
};
//
function getLastName(commaName) {
    let caseNameBackwards = toTitleCase(commaName).replace(/\b\w\b/,'').trim();
    let lastName = caseNameBackwards.split(",")[0].replace(/,/,'')
    return lastName
};
//
function fCaseName() {
    let aCaseName = $('#caseHeaderData div.col-lg-4').contents().eq(2).text().trim().split(/[\s,]+/)
    return { first: aCaseName[1], last: aCaseName[0] }
}
//
function addDateControls(element, insideDiv=1) {
    let elementName = element.replace(/\#/,'')
    let prevMonth = "-"
    let nextMonth = "+"
    if (insideDiv) { document.querySelector(element)?.parentNode?.classList.add('has-controls') }
    document.querySelector(element).insertAdjacentHTML('beforebegin', '<button type="button" class="controls prev-control" id="prev.'+elementName+'">'+prevMonth+'</button>')
    document.getElementById('prev.'+elementName).addEventListener('click', function(e) { controlDatePicker(e.target.id) })
    document.querySelector(element).insertAdjacentHTML('afterend', '<button type="button" class="controls next-control" id="next.'+elementName+'">'+nextMonth+'</button>')
    document.getElementById('next.'+elementName).addEventListener('click', function(e) { controlDatePicker(e.target.id) })
}
//
function controlDatePicker(elementId) {
    let datePickerControl = elementId.split(".")
    const options = {}
    let controlDate = new Date(document.getElementById(datePickerControl[1]).value)
    if (datePickerControl[0] === "prev") {
        document.getElementById(datePickerControl[1]).value = new Date(controlDate.setMonth(controlDate.getMonth() -1)).toLocaleDateString('en-US', {day: "2-digit", month: "2-digit", year: "numeric"})
    } else if (datePickerControl[0] === "next") {
        document.getElementById(datePickerControl[1]).value = new Date(controlDate.setMonth(controlDate.getMonth() +1)).toLocaleDateString('en-US', {day: "2-digit", month: "2-digit", year: "numeric"})
    }
}
//

function setIntervalLimited(callback, interval, x) {
    for (var i = 0; i < x; i++) {
        setTimeout(callback, i * interval);
    };
};
/*
//Usage
setIntervalLimited(function() {
    console.log('hit');          //=> hit...hit...etc (every second, stops after 10)
}, 1000, 10);
*/
//SECTION START Wait for something to be available //https://stackoverflow.com/a/61511955
function waitForElm(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector)) {
            return resolve(document.querySelector(selector));
        };
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            };
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
};
function waitForElmValue(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector).value) {
            return resolve(document.querySelector(selector));
        };
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector).value) {
                resolve(document.querySelector(selector));
                observer.disconnect();
            };
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
};
function waitForTableText(selector) {
    return new Promise(resolve => {
        if (document.querySelector(selector).textContent !== "0") {
            return resolve(document.querySelector(selector));
        };
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector).textContent !== "0") {
                resolve(document.querySelector(selector));
                observer.disconnect();
            };
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
};
function waitForTableCells(table) {
    return new Promise(resolve => {
        if (document.querySelector(table + ' > tbody > tr.selected')) {
            return resolve(document.querySelector(table));
        };
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(table + ' > tbody > tr.selected')) {
                resolve(document.querySelector(table));
                observer.disconnect();
            };
        });
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            // attributeFilter: ['class'],
        });
    })
}
function waitForElmHeight(selector) {
    return new Promise(resolve => {
            if (document.querySelector(selector)?.offsetHeight > 0) {
                return resolve(document.querySelector(selector));
            };
        const observer = new MutationObserver(mutations => {
            if (document.querySelector(selector)?.offsetHeight !== null) {
                if (document.querySelector(selector).offsetHeight > 0) {
                    resolve(document.querySelector(selector));
                    observer.disconnect();
                };
            }
        });
        observer.observe(document.body, {
            attributes: true,
            childList: true,
            subtree: true
        });
    });
};
//

/* To use waitForElm:
    waitForElm('.some-class').then((elm) => {
        console.log('Element is ready');
        console.log(elm.textContent);
    });
Or with async/await:
    const elm = await waitForElm('.some-class'); */
//SECTION END Wait for something to be available

function tempIncomes(tempIncome, endDate) {
    if (!notEditMode) {
        let tempIncomeSelect = document.getElementById(tempIncome)
        document.querySelector('.stylus').insertAdjacentHTML('beforeend', 'label[for='+tempIncome+']:first-letter { text-decoration:underline; }')
        window.addEventListener('keydown', function(e) {//Keyboard shortcuts
            if (e.altKey && e.key === 't') {
                e.preventDefault()
                if (tempIncomeSelect.value === "") {
                    tempIncomeSelect.value = "Yes"
                    document.getElementById(endDate).tabIndex = 0
                }
                else {
                    tempIncomeSelect.value = ""
                    document.getElementById(endDate).tabIndex = -1
                }
            }
        })
    }
}

//
function addDays(date, days) {
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
//
function dateDiff(date1, date2) {
    let daysInMS = 86400000
    date1 = new Date(date1)
    date2 = "" ? new Date(date2) : new Date()
    return Math.abs( Math.floor(( date1 - date2 ) / daysInMS ) )
}
//
function tabIndxNegOne(elements) {
    setTimeout(function(e) { document.querySelectorAll(elements).forEach((element) => element.setAttribute('tabindex', '-1')) },400)
}

window.addEventListener('keydown', function(e) {//Keyboard shortcuts
    if (e.altKey) {
        if (["d","s", "n", "c", "e", "r", "w", "ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault() }
        switch (e.key) {
            case 'd':
                if ($('#done:not([disabled])').length) { $('#done').click() }
                else if ($('#delete:not([disabled])').length) { $('#delete').click() }
                break
            case 's':
                if ($('#save:not([disabled])').length) { $('#save').click() }
                break
            case 'n':
                if ($('#new:not([disabled])').length) { $('#new').click() }
                break
            case 'c':
                if ($(':is(#cancel, #cancelnotice, #revert):not([disabled])').length) { $('#cancel, #cancelnotice, #revert').click() }
                break
            case 'e':
                if ($('#edit:not([disabled])').length) { $('#edit').click() }
                break
            case 'r':
                if ($('#resend:not([disabled])').length) { $('#resend').click() }
                break
            case 'w':
                if ($('#wrapUp:not([disabled])').length) { $('#wrapUp').click() }
                break
            case 'ArrowLeft':
                if ($('#previous:not([disabled])').length) { $('#previous').click() }
                break
            case 'ArrowRight':
                if ($('#next:not([disabled])').length) { $('#next').click() }
                break
            default:
                break
        }
    }
});
window.addEventListener('keydown', function(e) {//Keyboard shortcuts
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        $('#save').click()
    }
});

$('body').append('<div id="snackBar" class="snackBar"></div>')
function snackBar(text, title="Copied!", textAlign="left") {
    $('#snackBar').empty()
    let snackBarTxt = ""
    if (title !== "blank") { snackBarTxt += "<span class='snackBar-title'>" + title + "</span>" }
    let snackBarTextBlob = text.split('\n')
    for (const line of snackBarTextBlob) {
        snackBarTxt += "<span>" + line + "</span>";
    }
    $('#snackBar').append(snackBarTxt)
    $('#snackBar').addClass('snackBar-show');
    setTimeout(function(){ $('#snackBar').removeClass('snackBar-show'); }, 3000);
};
//

//SECTION START Duplicate buttons above H1 row
if (!(thisPageNameHtm).match("List.htm") && !["ProviderSearch.htm", "CaseLockStatus.htm", "ClientSearch.htm", "MaximumRates.htm", "ReportAProblem.htm", "FinancialClaimTransfer.htm", "CaseApplicationInitiation.htm", "CaseReapplicationAddCcap.htm"].includes(thisPageNameHtm)) {
    function checkDBclickability() {
        $('.mutable').each(function() { //optimize
            let oldButtonId = $(this).attr('id').split('DB')[0];
            if ($('#' + oldButtonId).prop('disabled')) {
                $(this).attr('disabled', 'disabled');
            } else {
                $(this).removeAttr('disabled');
            };
        });
    }
    try {
        $('.modal .form-button').addClass('modal-button');//popup buttons
        $('table').click(function() { checkDBclickability() });//check on table click if buttons were enabled/disabled and add/remove disabled
        $('.form-button:not([style$=none i], [id$="Business" i], [id$="Person" i], [id*=submit i], [id*=billed i], [id*=registration i], [id*=button i], [id*=search i], [type=hidden i], .panel-box-format input.form-button, .modal-button, #contactInfo, #selectFra, #reset, #changeType, #storage, #calculate, #cappingInfo, #calcAmounts, .cButton, .cButton__floating, .doNotDupe').each(function() {
            if ($(this).val()) {
                // let disabledStatus = $(this).attr('disabled') ? 'disabled' : '';
                let idName = $(this).attr('id') + "DB";
                $('#secondaryActionArea').append('<button  class="form-button mutable" id="' + idName + '" disabled="disabled"><span class="sAAspan">' + $(this).val() + '</span></button>');
            };
        })
        $('#secondaryActionArea').children().length === 0 && ($('#secondaryActionArea').hide());
        $('#secondaryActionArea').click(function(e) {
            e.preventDefault()
            if ( e.target.closest('button:not(:disabled)')?.classList.contains('mutable') ) { $('#' + e.target.closest('button').id.slice(0, -2)).click() }
        })
    }
    catch(err) { console.error(err) }
    finally {
        setTimeout(function() { checkDBclickability() }, 100)
    }
};
//SECTION END Buttons above H1 row
if ("CaseWrapUp.htm".includes(thisPageNameHtm) && $('.rederrortext').text() === 'Case Wrap-Up successfully submitted.') {
    $('#secondaryActionArea').hide();
};
//SECTION START Retract drop-down menu on page load
$('.sub_menu').css('visibility', 'hidden');
//SECTION END Retract drop-down menu on page load

//open in new tab
notEditMode && ($("#Report\\ a\\ Problem>a").attr('target','_blank'));
notEditMode && ($("#Maximum\\ Rates>a").attr('target','_blank'));

//SECTION START Removing items from the tabindex
$('#footer_links, #footer_info, #popup').children().attr('tabindex', '-1')
tabIndxNegOne('#quit, #countiesTable #letterChoice, #reset, #noteCreator') //quit, countiesTable=application; redet date, eEE=activity pages; cIS=submit button; lC=specialletter; reset=caseNotes; tempLeave = activities; defer=redet
tabIndxNegOne('#leaveDetailTemporaryLeavePeriodFrom, #leaveDetailTemporaryLeavePeriodTo, #leaveDetailExtendedEligibilityBegin, #tempLeavePeriodBegin, #tempLeavePeriodEnd, #extendedEligibilityBegin, #extendedEligibilityExpires, #redeterminationDate, #tempPeriodStart, #tempPeriodEnd, #deferValue') //.attr('tabindex', '-1') //EmploymentActivity, SupportActivity
tabIndxNegOne('#leaveDetailRedeterminationDue, #leaveDetailExpires, #caseInputSubmit, #caseId, #selectPeriod')
tabIndxNegOne('table>thead>tr>td')
tabIndxNegOne('.borderless')
//SECTION END Removing items from the tabindex

//SECTION START Post load changes to the page
$('h1').parents('div.row').addClass('h1-parent-row')
$(".marginTop5").removeClass("marginTop5")
$(".marginTop10").removeClass("marginTop10")
$(".padding-top-5px").removeClass("padding-top-5px")
//SECTION END Post load changes to the page

// Fixing 'to'
$('#financialTableAndPanelData :is(label[for=annualizedDateRangeStart], label[for=annualizationPeriodStart])~div.col-lg-1.col-xs-1').replaceWith('<label class="to">to</label>')
$('label[for="paymentEndDate"], label[for="extendedPeriodEnd"], label[for="leaveDetailExpires"], label[for="extendedEligibilityExpires"]').addClass('to').text("to")
let $to = $('label.col-lg-1.textInherit, div.col-lg-1.textInherit').filter(function() { return $(this).text().trim() === 'to' || $(this).text().trim() === 'to:' }).addClass('to').text("to")//Making "to" between x to y elements smaller//(['to', 'to:']).includes($(this).text().trim())
$('.to').parent().find('div:has(input[type=text]), div:contains("20"), input[type=text]').addClass('to-next')

// DIVIDER ///////////////////////////////// FUNCTIONS SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

/*
// if (!notEditMode || $('.prefilled-field, .tabindex-negative-one, .required-field').length && $(':is(#next, #previous):not([disabled="disabled"])').length < 1 && $('div.row > div > h1').length) {
if (!notEditMode && $(':is(#next, #previous):not([disabled="disabled"])').length < 1 && $('div.row > div > h1').length) {
    let preFilledFields = '<div class="prefilled-field" id="preFilledFields">Pre-Filled</div>'
    let notTabbableFields = '<div class="tabindex-negative-one" id="notTabbableFields">Not tabbable</div>'
    let requiredFields = '<div class="required-fields" id="requiredFields">Required</div>'
    $('h1').parent().after('<div class="auto-fill-formatting col-lg-4 col-md-4">' + preFilledFields + notTabbableFields + requiredFields + '<div>')
    // $('h1').parent().after('<div class="auto-fill-formatting col-lg-4 col-md-4"> <div id="preFilledFields"> <div id="notTabbableFields"> <div id="requiredFields"> <div>')
    $('#worker, #help').parent().removeClass('col-lg-6 col-md-6 col-sm-6 col-xs-6').addClass('float-right')
    //!notEditMode && ( $('h4:eq(0)').after('<div class="auto-fill-formatting"> <div id="preFilledFields"> <div id="notTabbableFields"> <div id="requiredFields"> <div>') )
}
*/

//Check for specific class changes
// function showOutlineLegend() {
// if ($('.prefilled-field, .tabindex-negative-one, .required-field').length) { $('.auto-fill-formatting').removeClass() }
// }
setTimeout(function() {
    window.dispatchEvent(new Event('resize'))
    $('buttonPanelOneNTF>*').removeAttr('tabindex')
},200)//fixes table headers being wrongly sized due to the container size change in ReStyle
// console.timeEnd('MEC2Functions')
//
function starFall() {
    let start = new Date().getTime();
    const originPosition = { x: 0, y: 0 };
    const last = {
        starTimestamp: start,
        starPosition: originPosition,
        mousePosition: originPosition
    }
    const config = {
        starAnimationDuration: 1200,
        minimumTimeBetweenStars: 250,
        minimumDistanceBetweenStars: 75,
        glowDuration: 75,
        maximumGlowPointSpacing: 10,
        colors: [ "var(--star1)", "var(--star2)", "var(--star3)", "var(--star4)", "var(--star5)", "var(--star6)" ],
        sizes: ["2.2rem", "1.8rem", "1.2rem"],
        animations: ["fall-1", "fall-2", "fall-3"]
    }
    let count = 0;
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
          selectRandom = items => items[rand(0, items.length - 1)];
    const withUnit = (value, unit) => `${value}${unit}`,
          px = value => withUnit(value, "px"),
          ms = value => withUnit(value, "ms");
    const calcDistance = (a, b) => {
        const diffX = b.x - a.x,
              diffY = b.y - a.y;
        return Math.sqrt(Math.pow(diffX, 2) + Math.pow(diffY, 2));
    }
    const calcElapsedTime = (start, end) => end - start;
    const appendElement = element => document.body.appendChild(element),
          removeElement = (element, delay) => setTimeout(() => document.body.removeChild(element), delay);
    const createStar = position => {
        const star = document.createElement("span"),
              color = selectRandom(config.colors);
        star.className = "star fa-solid fa-sparkle";
        star.style.left = px(position.x);
        star.style.top = px(position.y);
        star.style.fontSize = selectRandom(config.sizes);
        star.style.color = `${color}`;
        star.style.textShadow = `0px 0px 1.5rem ${color} / 0.5`;
        star.style.animationName = config.animations[count++ % 3];
        star.style.starAnimationDuration = ms(config.starAnimationDuration);
        appendElement(star);
        removeElement(star, config.starAnimationDuration);
    }
    const updateLastStar = position => {
        last.starTimestamp = new Date().getTime();
        last.starPosition = position;
    }
    const updateLastMousePosition = position => { last.mousePosition = position }
    const adjustLastMousePosition = position => {
        if (last.mousePosition.x === 0 && last.mousePosition.y === 0) {
            last.mousePosition = position;
        }
    };
    const handleOnMove = e => {
        const mousePosition = { x: e.clientX, y: e.clientY }
        adjustLastMousePosition(mousePosition);
        const now = new Date().getTime(),
              hasMovedFarEnough = calcDistance(last.starPosition, mousePosition) >= config.minimumDistanceBetweenStars,
              hasBeenLongEnough = calcElapsedTime(last.starTimestamp, now) > config.minimumTimeBetweenStars;
        if (hasMovedFarEnough || hasBeenLongEnough) {
            createStar(mousePosition);
            updateLastStar(mousePosition);
        }
        updateLastMousePosition(mousePosition);
    }
    window.onmousemove = e => handleOnMove(e);
    window.ontouchmove = e => handleOnMove(e.touches[0]);
    document.body.onmouseleave = () => updateLastMousePosition(originPosition);
}
if (new Date().setHours(0, 0, 0, 0) === new Date("4/1/24").setHours(0, 0, 0, 0) && thisPageNameHtm.indexOf("Notes.htm") > -1 ) { starFall() }
