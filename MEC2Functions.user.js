// ==UserScript==
// @name         mec2functions
// @namespace    http://github.com/MECH2-at-Github
// @description  Add functionality to MEC2 to improve navigation and workflow
// @author       MECH2
// @match        mec2.childcare.dhs.state.mn.us/*
// @version      0.4.83
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements */

'use strict';
// ====================================================================================================
// /////////////////////////////////// CUSTOM_NAVIGATION SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ====================================================================================================
function isDeveloperModeEnabled() {
    let devModeWarning = localStorage.getItem('MECH2.devModeWarning')
    if (!devModeWarning) {
        document.querySelector('div.container:has(form)')?.insertAdjacentHTML('afterbegin', `
        <div id="devModeWarningBox" class="error_alertbox_new">
            <strong class="rederrortext">Notice: <a style="text-decoration: underline;" href="https://www.tampermonkey.net/changelog.php?show=dhdg" target="_blank">Tampermonkey</a> now requires "Developer Mode" enabled in Chrome. ⋮ › Extension › Manage Extensions (upper right corner).</strong>
            <span style="float: right !important; cursor: pointer;" id="devModeWarningClose">✖</span>
        </div>`)
        document.getElementById('devModeWarningClose').addEventListener('click', function() {
            localStorage.setItem('MECH2.devModeWarning', true)
            document.getElementById('devModeWarningBox').remove()
        })
    }
}
isDeveloperModeEnabled()
console.time('MEC2Functions')
document.getElementById('help')?.insertAdjacentHTML('afterend', '<a href="/ChildCare/PrivacyAndSystemSecurity.htm?from=mec2functions" target="_blank" style="margin-left: 10px;">' + GM_info.script.name + ' v' + GM_info.script.version + '</a>')
let pageWrap = document.querySelector('#page-wrap')
let notEditMode = document.querySelectorAll('#page-wrap').length;
let iFramed = window.location !== window.parent.location ? 1 : 0
let greenline = document.querySelector(".line_mn_green")
let focusEle = "blank"
let caseId = document.getElementById('caseId')?.value ?? undefined
let providerId = caseId ?? document.getElementById('providerId')?.value
let caseIdORproviderId = caseId ?? providerId
greenline.id = "greenline"
greenline.closest('.container')?.insertAdjacentHTML('afterend', `
<nav class="primary-navigation container">
    <div class="primary-navigation-row">
        <div id="buttonPanelOne"></div>
        <div id="buttonPanelOneNTF"></div>
    </div>
    <div class="primary-navigation-row">
        <div id="buttonPanelTwo"></div>
    </div>
    <div class="primary-navigation-row">
        <div id="buttonPanelThree"></div>
    </div>
    <div id="secondaryActionArea" class="button-container flex-horizontal db-container"></div>
</nav>
`)
try {
    if (notEditMode) {
        document.querySelector('.primary-navigation')?.insertAdjacentElement('beforebegin', pageWrap);
        pageWrap?.classList.add('container')
    }
}
catch (error) { console.trace(error) }
finally { document.documentElement.style.setProperty('--mainPanelMovedDown', '0') }
let buttonDivOne = document.getElementById('buttonPanelOne');
let buttonDivTwo = document.getElementById('buttonPanelTwo');
let buttonDivThree = document.getElementById('buttonPanelThree');
let searchIcon = "<span style='font-size: 80%'>🔍</span>"
let thisPageName = window.location.pathname.substring(window.location.pathname.lastIndexOf("/") + 1, window.location.pathname.lastIndexOf("."))
let thisPageNameHtm = thisPageName + ".htm"
let slashThisPageNameHtm = "/" + thisPageNameHtm
if (("Welcome.htm").includes(thisPageNameHtm)) { location.assign("Alerts.htm") } //auto-redirect from Welcome to Alerts
let reviewingEligibility = (thisPageNameHtm.indexOf("CaseEligibilityResult") > -1 && thisPageNameHtm.indexOf("CaseEligibilityResultSelection.htm") < 0)
document.querySelectorAll('tbody').forEach((e) => {
    e.addEventListener('click', (event) => {
        if (event.target.closest('tr') && !event.target.closest('tr').classList.contains('selected') ) {
            e.querySelector('.selected')?.classList.remove('selected')
            event.target.closest('tr')?.classList.add('selected')
        }
    })
}) //Fix for table entries losing selected class when clicked on. There is no way to know if a table shouldn't get the .selected class, so it does it for all.
$("h4").click((e) => $(e.target).nextAll().toggleClass("hidden")) //Make all h4 clicky hidden

function fGetCaseParameters() { // Parameters for navigating from Alerts or Lists, and the column
    const caseTableMap = new Map([
        ["Alerts.htm", [document.querySelector("table#caseOrProviderAlertsTable > tbody"), 3] ],
        ["ClientSearch.htm", [document.querySelector('table#clientSearchProgramResults > tbody'), 1] ],
    ])
    let caseTableFromMap = caseTableMap.get(thisPageNameHtm) ?? [document.querySelector('table > tbody'), 1]
    let parameter2alerts = caseTableFromMap[0].querySelector('tr > td:nth-of-type(2)') === null ? undefined : '?parm2=' + caseTableFromMap[0].querySelector('tr.selected > td:nth-of-type(' + caseTableFromMap[1] + ') > a')?.textContent
    if (parameter2alerts === undefined) { return }
    let parameter3alerts = document.getElementById('periodBeginDate')?.value === undefined ? '' : '&parm3=' + document.getElementById('periodBeginDate')?.value.replace(/\//g, '') + document.getElementById('periodEndDate')?.value.replace(/\//g, '')
    return parameter2alerts + parameter3alerts
}
function fGetProviderParameters() {
    const providerTableMap = new Map([
        ["Alerts.htm", [document.querySelector("table#caseOrProviderAlertsTable > tbody"), 3] ],
        ["ProviderRegistrationList.htm", [document.querySelector('table#providerRegistrationTable > tbody'), 2] ],
        ["ProviderSearch.htm", [document.querySelector('table#providerSearchTable > tbody'), 1] ],
    ])
    let providerTableFromMap = providerTableMap.get(thisPageNameHtm) ?? undefined
    let parameter2alerts = providerTableFromMap[0].querySelector('tr > td:nth-of-type(2)') === null ? '' : '?providerId=' + providerTableFromMap[0].querySelector('tr.selected > td:nth-of-type(' + providerTableFromMap[1] + ')')?.textContent
    return parameter2alerts
}
// ================================================================================================
// ////////////////////////////// NAVIGATION_BUTTONS SECTION_START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ================================================================================================

// ====================================================================================================
// ///////////////////////////// PRIMARY_NAVIGATION_BUTTONS SECTION_START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ====================================================================================================

if (!iFramed) {
    try {
        // SECTION_START Declaring_navigation_button_arrays
    // const objectToMap = obj => { // https://www.tutorialspoint.com/convert-object-to-a-map-javascript
    //    const keys = Object.keys(obj);
    //    const map = new Map();
    //    for(let i = 0; i < keys.length; i++){
    //       //inserting new key value pair inside map
    //       map.set(keys[i], obj[keys[i]]);
    //    };
    //    return map;
    // };
        const oRowOneButtons = { //Goto Buttons, objectGroupName: { buttonText: "Name as it appears on a button", gotoPage: "gotoPageName", opensIn: "_self or _blank", parentId: "Id of parent", buttonId: "Id of Button'],
            alerts: { buttonText: "Alerts", gotoPage: "Alerts", opensIn: "_self", parentId: "Alerts", buttonId: "AlertsSelf" },
            alertsPlus: { buttonText: "+", gotoPage: "Alerts", opensIn: "_blank", parentId: "Alerts", buttonId: "AlertsBlank" },
            notes: { buttonText: "Notes", gotoPage: "CaseNotes", opensIn: "_self", parentId: "Case Notes", buttonId: "CaseNotesSelf" },
            notesPlus: { buttonText: "+", gotoPage: "CaseNotes", opensIn: "_blank", parentId: "Case Notes", buttonId: "CaseNotesBlank" },
            overview: { buttonText: "Overview", gotoPage: "CaseOverview", opensIn: "_self", parentId: "Case Overview", buttonId: "CaseOverviewSelf" },
            overviewPlus: { buttonText: "+", gotoPage: "CaseOverview", opensIn: "_blank", parentId: "Case Overview", buttonId: "CaseOverviewBlank" },
            summary: { buttonText: "Summary", gotoPage: "CasePageSummary", opensIn: "_self", parentId: "Page Summary", buttonId: "CasePageSummarySelf" },
            clientSearch: { buttonText: "Client " + searchIcon, gotoPage: "ClientSearch", opensIn: "_self", parentId: "Client Search", buttonId: "ClientSearchSelf" },
            clientSearchPlus: { buttonText: "+", gotoPage: "ClientSearch", opensIn: "_blank", parentId: "Client Search", buttonId: "ClientSearchBlank" },
            providerSearch: { buttonText: "Provider " + searchIcon, gotoPage: "ProviderSearch", opensIn: "_self", parentId: "Provider Search", buttonId: "ProviderSearchSelf" },
            providerSearchPlus: { buttonText: "+", gotoPage: "ProviderSearch", opensIn: "_blank", parentId: "Provider Search", buttonId: "ProviderSearchBlank" },
            activeCaseList: { buttonText: "Active", gotoPage: "ActiveCaseList", opensIn: "_self", parentId: "Active Caseload List", buttonId: "ActiveCaseListSelf" },
            activeCaseListPlus: { buttonText: "+", gotoPage: "ActiveCaseList", opensIn: "_blank", parentId: "Active Caseload List", buttonId: "ActiveCaseListBlank" },
            pendingCaseList: { buttonText: "Pending", gotoPage: "PendingCaseList", opensIn: "_self", parentId: "Pending Case List", buttonId: "PendingCaseListSelf" },
            pendingCaseListPlus: { buttonText: "+", gotoPage: "PendingCaseList", opensIn: "_blank", parentId: "Pending Case List", buttonId: "PendingCaseListBlank" },
            inactiveCaseList: { buttonText: "Inactive", gotoPage: "InactiveCaseList", opensIn: "_self", parentId: "Inactive Case List", buttonId: "InactiveCaseListSelf" },
            inactiveCaseListPlus: { buttonText: "+", gotoPage: "InactiveCaseList", opensIn: "_blank", parentId: "Inactive Case List", buttonId: "InactiveCaseListBlank" },
            newApplication: { buttonText: "New App", gotoPage: "CaseApplicationInitiation", opensIn: "_self", parentId: "Case Application Initiation", buttonId: "NewAppSelf" },
            newApplicationPlus: { buttonText: "+", gotoPage: "CaseApplicationInitiation", opensIn: "_blank", parentId: "Case Application Initiation", buttonId: "NewAppBlank" },
        };
        const oRowTwoButtons = { //   Main Row (2nd row, categories) buttons, { buttonText: "Name as it appears on a button", buttonId: "oRowTwoButtonsId" },
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
                caseMemberi: { buttonName: "Member I", pageWithoutDotHtm: "CaseMember", opensIn: "_self", parentId: "Member", buttonId: "CaseMemberSelf", rowTwoParent: "memberMainButtons" },
                caseMemberii: { buttonName: "Member II", pageWithoutDotHtm: "CaseMemberII", opensIn: "_self", parentId: "Member II", buttonId: "CaseMemberIISelf", rowTwoParent: "memberMainButtons" },
                caseParent: { buttonName: "Parent", pageWithoutDotHtm: "CaseParent", opensIn: "_self", parentId: "Parent", buttonId: "CaseParentSelf", rowTwoParent: "memberMainButtons" },
                caseCse: { buttonName: "CSE", pageWithoutDotHtm: "CaseCSE", opensIn: "_self", parentId: "Child Support Enforcement", buttonId: "CaseCSESelf", rowTwoParent: "memberMainButtons" },
                caseSchool: { buttonName: "School", pageWithoutDotHtm: "CaseSchool", opensIn: "_self", parentId: "School", buttonId: "CaseSchoolSelf", rowTwoParent: "memberMainButtons" },
                caseProvider: { buttonName: "Provider", pageWithoutDotHtm: "CaseChildProvider", opensIn: "_self", parentId: "Child Provider", buttonId: "CaseChildProviderSelf", rowTwoParent: "memberMainButtons" },
                caseSpecialNeeds: { buttonName: "Special Needs", pageWithoutDotHtm: "CaseSpecialNeeds", opensIn: "_self", parentId: "Special Needs", buttonId: "CaseSpecialNeedsSelf", rowTwoParent: "memberMainButtons" },
                caseDisability: { buttonName: "Disability", pageWithoutDotHtm: "CaseDisability", opensIn: "_self", parentId: "Disability", buttonId: "CaseDisabilitySelf", rowTwoParent: "memberMainButtons" },
                caseFraud: { buttonName: "Fraud", pageWithoutDotHtm: "CaseFraud", opensIn: "_self", parentId: "Case Fraud", buttonId: "CaseFraudSelf", rowTwoParent: "memberMainButtons" },
                caseImmigration: { buttonName: "Immigration", pageWithoutDotHtm: "CaseImmigration", opensIn: "_self", parentId: "Immigration", buttonId: "CaseImmigrationSelf", rowTwoParent: "memberMainButtons" },
                caseAlias: { buttonName: "Alias", pageWithoutDotHtm: "CaseAlias", opensIn: "_self", parentId: "Case Alias", buttonId: "CaseAliasSelf", rowTwoParent: "memberMainButtons" },
                caseRemoveMember: { buttonName: "Remove", pageWithoutDotHtm: "CaseRemoveMember", opensIn: "_self", parentId: "Remove a Member", buttonId: "CaseRemoveMemberSelf", rowTwoParent: "memberMainButtons" },
                caseMemberHistory: { buttonName: "History", pageWithoutDotHtm: "CaseMemberHistory", opensIn: "_self", parentId: "Member History", buttonId: "CaseMemberHistorySelf", rowTwoParent: "memberMainButtons" },
                caseMemberHistoryPlus: { buttonName: "+", pageWithoutDotHtm: "CaseMemberHistory", opensIn: "_blank", parentId: "Member History", buttonId: "CaseMemberHistoryBlank", rowTwoParent: "memberMainButtons" },
            },
            activityIncomeButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                caseEarnedIncome: { buttonName: "Earned", pageWithoutDotHtm: "CaseEarnedIncome", opensIn: "_self", parentId: "Earned Income", buttonId: "CaseEarnedIncomeSelf", rowTwoParent: "activityIncomeButtons" },
                caseUnearnedIncome: { buttonName: "Unearned", pageWithoutDotHtm: "CaseUnearnedIncome", opensIn: "_self", parentId: "Unearned Income", buttonId: "CaseUnearnedIncomeSelf", rowTwoParent: "activityIncomeButtons" },
                caseLumpSumIncome: { buttonName: "Lump Sum", pageWithoutDotHtm: "CaseLumpSum", opensIn: "_self", parentId: "Lump Sum", buttonId: "CaseLumpSumSelf", rowTwoParent: "activityIncomeButtons" },
                caseExpensesIncome: { buttonName: "Expenses", pageWithoutDotHtm: "CaseExpense", opensIn: "_self", parentId: "Expenses", buttonId: "CaseExpensesSelf", rowTwoParent: "activityIncomeButtons" },
                caseEducationActivity: { buttonName: "Education", pageWithoutDotHtm: "CaseEducationActivity", opensIn: "_self", parentId: "Education Activity", buttonId: "CaseEducationActivitySelf", rowTwoParent: "activityIncomeButtons" },
                caseEmploymentActivity: { buttonName: "Employment", pageWithoutDotHtm: "CaseEmploymentActivity", opensIn: "_self", parentId: "Employment Activity", buttonId: "CaseEmploymentActivitySelf", rowTwoParent: "activityIncomeButtons" },
                caseSupportActivity: { buttonName: "Support", pageWithoutDotHtm: "CaseSupportActivity", opensIn: "_self", parentId: "Support Activity", buttonId: "CaseSupportActivitySelf", rowTwoParent: "activityIncomeButtons" },
                caseJobSearchTracking: { buttonName: "Job Search", pageWithoutDotHtm: "CaseJobSearchTracking", opensIn: "_self", parentId: "Job Search Tracking", buttonId: "CaseJobSearchTrackingSelf", rowTwoParent: "activityIncomeButtons" },
            },
            caseButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                editSummary: { buttonName: "Edit Summary", pageWithoutDotHtm: "CaseEditSummary", opensIn: "_self", parentId: "Edit Summary", buttonId: "CaseEditSummarySelf", rowTwoParent: "caseButtons" },
                caseAddress: { buttonName: "Address", pageWithoutDotHtm: "CaseAddress", opensIn: "_self", parentId: "Case Address", buttonId: "CaseAddressSelf", rowTwoParent: "caseButtons" },
                caseAction: { buttonName: "Case Action", pageWithoutDotHtm: "CaseAction", opensIn: "_self", parentId: "Case Action", buttonId: "CaseActionSelf", rowTwoParent: "caseButtons" },
                caseFunding: { buttonName: "Funding Availability", pageWithoutDotHtm: "FundingAvailability", opensIn: "_self", parentId: "Funding Availability", buttonId: "FundingAvailabilitySelf", rowTwoParent: "caseButtons" },
                caseRedetermination: { buttonName: "Redetermination", pageWithoutDotHtm: "CaseRedetermination", opensIn: "_self", parentId: "Case Redetermination", buttonId: "CaseRedeterminationSelf", rowTwoParent: "caseButtons" },
                caseAppInfo: { buttonName: "Application Info", pageWithoutDotHtm: "ApplicationInformation", opensIn: "_self", parentId: "Case Application Info", buttonId: "CaseApplicationInfoSelf", rowTwoParent: "caseButtons" },
                caseReinstate: { buttonName: "Reinstate", pageWithoutDotHtm: "CaseReinstate", opensIn: "_self", parentId: "Reinstate", buttonId: "CaseReinstateSelf", rowTwoParent: "caseButtons" },
            },
            eligibilityButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                eligibilitySelection: { buttonName: "Selection", pageWithoutDotHtm: "CaseEligibilityResultSelection", opensIn: "_self", parentId: "Eligibility Results Selection", buttonId: "CaseEligibilityResultSelectionSelf", rowTwoParent: "eligibilityButtons" },
                eligibilityOverview: { buttonName: "Overview", pageWithoutDotHtm: "CaseEligibilityResultOverview", opensIn: "_self", parentId: "Results Overview", buttonId: "CaseEligibilityResultOverviewSelf", rowTwoParent: "eligibilityButtons" },
                eligibilityFamily: { buttonName: "Family", pageWithoutDotHtm: "CaseEligibilityResultFamily", opensIn: "_self", parentId: "Family Results", buttonId: "CaseEligibilityResultFamilySelf", rowTwoParent: "eligibilityButtons" },
                eligibilityPerson: { buttonName: "Person", pageWithoutDotHtm: "CaseEligibilityResultPerson", opensIn: "_self", parentId: "Person Results", buttonId: "CaseEligibilityResultPersonSelf", rowTwoParent: "eligibilityButtons" },
                eligibilityActivity: { buttonName: "Activity", pageWithoutDotHtm: "CaseEligibilityResultActivity", opensIn: "_self", parentId: "Activity Results", buttonId: "CaseEligibilityResultActivitySelf", rowTwoParent: "eligibilityButtons" },
                eligibilityFinancial: { buttonName: "Financial", pageWithoutDotHtm: "CaseEligibilityResultFinancial", opensIn: "_self", parentId: "Financial Results", buttonId: "CaseEligibilityResultFinancialSelf", rowTwoParent: "eligibilityButtons" },
                eligibilityApproval: { buttonName: "Approval", pageWithoutDotHtm: "CaseEligibilityResultApproval", opensIn: "_self", parentId: "Approval Results", buttonId: "CaseEligibilityResultApprovalSelf", rowTwoParent: "eligibilityButtons" },
                eligibilityCreateResults: { buttonName: "Create Eligibility Results", pageWithoutDotHtm: "CaseCreateEligibilityResults", opensIn: "_self", parentId: "Create Eligibility Results", buttonId: "CaseCreateEligibilityResultsSelf", rowTwoParent: "eligibilityButtons" },
            },
            saButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                saOverview: { buttonName: "Overview", pageWithoutDotHtm: "CaseServiceAuthorizationOverview", opensIn: "_self", parentId: "Service Authorization Overview", buttonId: "CaseServiceAuthorizationOverviewSelf", rowTwoParent: "saButtons" },
                saCopay: { buttonName: "Copay", pageWithoutDotHtm: "CaseCopayDistribution", opensIn: "_self", parentId: "Copay Distribution", buttonId: "CaseCopayDistributionSelf", rowTwoParent: "saButtons" },
                saApproval: { buttonName: "Approval", pageWithoutDotHtm: "CaseServiceAuthorizationApproval", opensIn: "_self", parentId: "Service Authorization Approval", buttonId: "CaseServiceAuthorizationApprovalSelf", rowTwoParent: "saButtons" },
                saCreateResults: { buttonName: "Create SA", pageWithoutDotHtm: "CaseCreateServiceAuthorizationResults", opensIn: "_self", parentId: "Create Service Authorization Results", buttonId: "CaseCreateServiceAuthorizationResultsSelf", rowTwoParent: "saButtons" },
            },
            csiButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                csiA: { buttonName: "CSIA", pageWithoutDotHtm: "CaseCSIA", opensIn: "_self", parentId: "CSIA", buttonId: "CSIAself", rowTwoParent: "csiButtons" },
                csiB: { buttonName: "CSIB", pageWithoutDotHtm: "CaseCSIB", opensIn: "_self", parentId: "CSIB", buttonId: "CSIBself", rowTwoParent: "csiButtons" },
                csiC: { buttonName: "CSIC", pageWithoutDotHtm: "CaseCSIC", opensIn: "_self", parentId: "CSIC", buttonId: "CSICself", rowTwoParent: "csiButtons" },
                csiD: { buttonName: "CSID", pageWithoutDotHtm: "CaseCSID", opensIn: "_self", parentId: "CSID", buttonId: "CSIDself", rowTwoParent: "csiButtons" },
            },
            noticesButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                caseNotices: { buttonName: "Notices", pageWithoutDotHtm: "CaseNotices", opensIn: "_self", parentId: "Case Notices", buttonId: "CaseNoticesSelf", rowTwoParent: "noticesButtons" },
                caseSpecialLetter: { buttonName: "Special Letter", pageWithoutDotHtm: "CaseSpecialLetter", opensIn: "_self", parentId: "Case Special Letter", buttonId: "CaseSpecialLetterSelf", rowTwoParent: "noticesButtons" },
                caseMemo: { buttonName: "Memo", pageWithoutDotHtm: "CaseMemo", opensIn: "_self", parentId: "Case Memo", buttonId: "CaseMemoSelf", rowTwoParent: "noticesButtons" },
            },
            billingButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                financialBilling: { buttonName: "Billing", pageWithoutDotHtm: "FinancialBilling", opensIn: "_self", parentId: "Billing", buttonId: "FinancialBillingSelf", rowTwoParent: "billingButtons" },
                financialBillingApproval: { buttonName: "Billing Approval", pageWithoutDotHtm: "FinancialBillingApproval", opensIn: "_self", parentId: "Billing Approval", buttonId: "FinancialBillingApprovalSelf", rowTwoParent: "billingButtons" },
                financialBillsList: { buttonName: "Bills List", pageWithoutDotHtm: "BillsList", opensIn: "_self", parentId: "Bills List", buttonId: "BillsListSelf", rowTwoParent: "billingButtons" },
                financialPayHistory: { buttonName: "Payment History", pageWithoutDotHtm: "CasePaymentHistory", opensIn: "_self", parentId: "Case Payment History", buttonId: "CasePaymentHistorySelf", rowTwoParent: "billingButtons" },
                financialAbsentDays: { buttonName: "Absent Days", pageWithoutDotHtm: "FinancialAbsentDayHolidayTracking", opensIn: "_self", parentId: "Tracking Absent Day Holiday", buttonId: "FinancialAbsentDayHolidayTrackingSelf", rowTwoParent: "billingButtons" },
                financialRegistrationFee: { buttonName: "Registration Fee Tracking", pageWithoutDotHtm: "FinancialBillingRegistrationFeeTracking", opensIn: "_self", parentId: "Tracking Registration Fee", buttonId: "FinancialBillingRegistrationFeeTrackingSelf", rowTwoParent: "billingButtons" },
                financialManualPayments: { buttonName: "Manual Payments", pageWithoutDotHtm: "FinancialManualPayment", opensIn: "_self", parentId: "Manual Payments", buttonId: "FinancialManualPaymentSelf", rowTwoParent: "billingButtons" },
            },
            providerButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                providerOverview: { buttonName: "Overview", pageWithoutDotHtm: "ProviderOverview", opensIn: "_self", parentId: "Provider Overview", buttonId: "ProviderOverviewSelf", rowTwoParent: "providerButtons" },
                providerNotes: { buttonName: "Notes", pageWithoutDotHtm: "ProviderNotes", opensIn: "_self", parentId: "Provider Notes", buttonId: "ProviderNotesSelf", rowTwoParent: "providerButtons" },
                providerInformation: { buttonName: "Info", pageWithoutDotHtm: "ProviderInformation", opensIn: "_self", parentId: "Provider Information", buttonId: "ProviderInformationSelf", rowTwoParent: "providerButtons" },
                providerAddress: { buttonName: "Address", pageWithoutDotHtm: "ProviderAddress", opensIn: "_self", parentId: "Provider Address", buttonId: "ProviderAddressSelf", rowTwoParent: "providerButtons" },
                providerParentAware: { buttonName: "Parent Aware", pageWithoutDotHtm: "ProviderParentAware", opensIn: "_self", parentId: "Parent Aware", buttonId: "ProviderParentAwareSelf", rowTwoParent: "providerButtons" },
                providerAccreditation: { buttonName: "Accred.", pageWithoutDotHtm: "ProviderAccreditation", opensIn: "_self", parentId: "Accreditation", buttonId: "ProviderAccreditationSelf", rowTwoParent: "providerButtons" },
                providerTraining: { buttonName: "Training", pageWithoutDotHtm: "ProviderTraining", opensIn: "_self", parentId: "Training", buttonId: "ProviderTrainingSelf", rowTwoParent: "providerButtons" },
                providerRates: { buttonName: "Rates", pageWithoutDotHtm: "ProviderRates", opensIn: "_self", parentId: "Rates", buttonId: "ProviderRatesSelf", rowTwoParent: "providerButtons" },
                providerLicense: { buttonName: "License", pageWithoutDotHtm: "ProviderLicense", opensIn: "_self", parentId: "License", buttonId: "ProviderLicenseSelf", rowTwoParent: "providerButtons" },
                providerAlias: { buttonName: "Alias", pageWithoutDotHtm: "ProviderAlias", opensIn: "_self", parentId: "Provider Alias", buttonId: "ProviderAliasSelf", rowTwoParent: "providerButtons" },
                providerBackground: { buttonName: "Background", pageWithoutDotHtm: "ProviderBackgroundStudy", opensIn: "_self", parentId: "Background Study", buttonId: "ProviderBackgroundStudySelf", rowTwoParent: "providerButtons" },
                providerFeesAndAccounts: { buttonName: "Accounts", pageWithoutDotHtm: "ProviderFeesAndAccounts", opensIn: "_self", parentId: "Fees Accounts", buttonId: "ProviderFeesAndAccounts", rowTwoParent: "providerButtons" },
                providerRegistrationAndRenewal: { buttonName: "Registration", pageWithoutDotHtm: "ProviderRegistrationAndRenewal", opensIn: "_self", parentId: "Registration Renewal", buttonId: "ProviderRegistrationSelf", rowTwoParent: "providerButtons" },
                providerTaxInfo: { buttonName: "Tax", pageWithoutDotHtm: "ProviderTaxInfo", opensIn: "_self", parentId: "Tax Info", buttonId: "ProviderTaxInfoSelf", rowTwoParent: "providerButtons" },
                providerPaymentHistory: { buttonName: "Payments", pageWithoutDotHtm: "ProviderPaymentHistory", opensIn: "_self", parentId: "Provider Payment History", buttonId: "ProviderPaymentHistory", rowTwoParent: "providerButtons" },
            },
            providerNoticesButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                providerNotices: { buttonName: "Notices", pageWithoutDotHtm: "ProviderNotices", opensIn: "_self", parentId: "Provider Notices", buttonId: "ProviderNoticesSelf", rowTwoParent: "providerNoticesButtons" },
                providerSpecialLetter: { buttonName: "Special Letter", pageWithoutDotHtm: "ProviderSpecialLetter", opensIn: "_self", parentId: "Provider Special Letter", buttonId: "ProviderSpecialLetterSelf", rowTwoParent: "providerNoticesButtons" },
                providerMemo: { buttonName: "Memo", pageWithoutDotHtm: "ProviderMemo", opensIn: "_self", parentId: "Provider Memo", buttonId: "ProviderMemoSelf", rowTwoParent: "providerNoticesButtons" },
            },
            transferButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                caseTransfer: { buttonName: "Case Transfer", pageWithoutDotHtm: "CaseTransfer", opensIn: "_self", parentId: "Case Transfer", buttonId: "CaseTransferSelf", rowTwoParent: "transferButtons" },
                incomingTransfer: { buttonName: "Incoming", pageWithoutDotHtm: "ServicingAgencyIncomingTransfers", opensIn: "_blank", parentId: "Incoming Transfers", buttonId: "ServicingAgencyIncomingTransfersSelf", rowTwoParent: "transferButtons" },
                outgoingTransfer: { buttonName: "Outgoing", pageWithoutDotHtm: "ServicingAgencyOutgoingTransfers", opensIn: "_blank", parentId: "Outgoing Transfers", buttonId: "ServicingAgencyOutgoingTransfersSelf", rowTwoParent: "transferButtons" },
                financialClaimTransfer: { buttonName: "Claim Transfer", pageWithoutDotHtm: "FinancialClaimTransfer", opensIn: "_blank", parentId: "Claim Transfer", buttonId: "FinancialClaimTransferSelf", rowTwoParent: "transferButtons" },
            },
            claimsButtons: {//objectName: { buttonName: "Button Name", pageWithoutDotHtm: "PageNameWithoutDotHtm", opensIn: "_self or _blank", parentId: "Id of Parent", buttonId: "Id of Button", rowTwoParent: "RowTwoParent"},
                claimEstablishment: { buttonName: "Establishment", pageWithoutDotHtm: "FinancialClaimEstablishment", opensIn: "_blank", parentId: "Claim Establishment", buttonId: "FinancialClaimEstablishmentBlank", rowTwoParent: "claimsButtons" },
                claimDetails: { buttonName: "Details", pageWithoutDotHtm: "FinancialClaimMaintenanceAmountDetails", opensIn: "_self", parentId: "Maintenance Details", buttonId: "FinancialClaimMaintenanceAmountDetailsSelf", rowTwoParent: "claimsButtons" },
                claimSummary: { buttonName: "Summary", pageWithoutDotHtm: "FinancialClaimMaintenanceSummary", opensIn: "_self", parentId: "Maintenance Summary", buttonId: "FinancialClaimMaintenanceSummarySelf", rowTwoParent: "claimsButtons" },
                claimOverpaymentText: { buttonName: "Overpayment Text", pageWithoutDotHtm: "FinancialClaimNoticeOverpaymentText", opensIn: "_self", parentId: "Overpayment Text", buttonId: "FinancialClaimNoticeOverpaymentTextSelf", rowTwoParent: "claimsButtons" },
                claimNotes: { buttonName: "Notes", pageWithoutDotHtm: "FinancialClaimNotes", opensIn: "_self", parentId: "Claim Notes", buttonId: "FinancialClaimNotesSelf", rowTwoParent: "claimsButtons" },
                claimNotices: { buttonName: "Notices", pageWithoutDotHtm: "FinancialClaimNotices", opensIn: "_self", parentId: "Claim Notices History", buttonId: "FinancialClaimNoticesSelf", rowTwoParent: "claimsButtons" },
                providerFraud: { buttonName: "Provider Fraud", pageWithoutDotHtm: "ProviderFraud", opensIn: "_self", parentId: "Provider Fraud", buttonId: "ProviderFraudSelf", rowTwoParent: "providerButtons"},
                claimMaintenanceCase: { buttonName: "Maint-Case", pageWithoutDotHtm: "FinancialClaimMaintenanceCase", opensIn: "_self", parentId: "Maintenance Case", buttonId: "FinancialClaimMaintenanceCaseSelf", rowTwoParent: "claimsButtons" },
                claimMaintenancePerson: { buttonName: "Maint-Person", pageWithoutDotHtm: "FinancialClaimMaintenancePerson", opensIn: "_self", parentId: "Maintenance Person", buttonId: "FinancialClaimMaintenancePersonSelf", rowTwoParent: "claimsButtons" },
                claimMaintenanceProvider: { buttonName: "Maint-Provider", pageWithoutDotHtm: "FinancialClaimMaintenanceProvider", opensIn: "_self", parentId: "Maintenance Provider", buttonId: "FinancialClaimMaintenanceProviderSelf", rowTwoParent: "claimsButtons" },
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
        buttonDivOne.addEventListener('click', function(event) {//sends the gotoButtons array value 4 to gotoPage
            if (event.target.closest('button')?.tagName?.toLowerCase() === 'button' && !(["FieldNotesNT", "FieldOverviewNT"]).includes(event.target.closest('button').id)) {
                gotoPage(event.target.closest('button').id)
            }
        })
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
            buttonDivTwo.addEventListener('click', function(event) {// sends the oRowTwoButtons button ID
                if (notEditMode && event.target.tagName?.toLowerCase() === 'button') {
                    document.getElementById('buttonPanelThree').replaceChildren()
                    fRowThreeButtonsString(event.target.id)
                    highlightPageAndCategory()
                }
            })
        }

        function highlightPageAndCategory() { // Highlight_Row_2_3_Buttons
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
                catch (error) { console.trace("highlightPageAndCategory", error) }
                finally {
                    if ($('#eligibilityButtons.cButton__nav__open-page, #eligibilityButtons.cButton__nav__browsing').length && !reviewingEligibility) {
                        $('#buttonPanelThree > button[id^="CaseEligibilityResult"]:not(#CaseEligibilityResultSelectionSelf)').addClass('hidden')
                    }
                }
            }
        } // Highlight_Row_2_3_Buttons
        // Activate_Row_3_from_click_or_page_load
        function fRowThreeButtonsString(idOfRowTwoGroupButton) {
            let vRowThreeButtonsString = ""
            for (let button in oRowThreeButtons[idOfRowTwoGroupButton]) {
                let buttonProperties = oRowThreeButtons[idOfRowTwoGroupButton][button]
                buttonProperties.classes = buttonProperties.buttonName === "+" ? "cButton cButton__nav cButton__nav__plus" : "cButton cButton__nav"
                let vButtonHtml = '<button type="button" tabindex="-1" class="' + buttonProperties.classes + '" id="' + buttonProperties.buttonId + '" data-how-to-open="' + buttonProperties.opensIn + '" data-page-name="' + buttonProperties.pageWithoutDotHtm + '" data-page-link-using-id="' + buttonProperties.parentId + '">' + buttonProperties.buttonName + '</button>'
                vRowThreeButtonsString += vButtonHtml
            }
            buttonDivThree.insertAdjacentHTML("beforeend", vRowThreeButtonsString)
        } // Activate_Row_3_from_click_or_page_load

        function findPageParent() {
            for (let grouping in oRowThreeButtons) {
                for (let page in oRowThreeButtons[grouping]) {
                    if (Object.hasOwn(oRowThreeButtons[grouping][page], "pageWithoutDotHtm") && oRowThreeButtons[grouping][page].pageWithoutDotHtm === thisPageName) {
                        if (notEditMode && $('#buttonPanelThree').children().length === 0) { fRowThreeButtonsString(oRowThreeButtons[grouping][page].rowTwoParent) }
                        return [grouping, page]
                    }
                    else {
                        for (let page in oRowOneButtons) {
                            if (Object.hasOwn(oRowOneButtons[page], "gotoPage") && oRowOneButtons[page].gotoPage === thisPageName) {
                                return ["undefined", page]
                            }
                        }
                    }
                }
            }
        }

        document.querySelector('.primary-navigation').addEventListener('click', (event) => {
            if (event.target.dataset.howToOpen === "_self") { document.querySelector('body').style.opacity = ".8" }
            if (event.target.tagName === 'BUTTON') {
                if (event.target.parentNode.id !== "buttonPanelThree") { document.querySelectorAll('.cButton__nav__browsing').forEach((e) => e?.classList.remove('cButton__nav__browsing')) }
                document.querySelector('.primary-navigation-row button#' + event.target.id + ':not(.cButton__nav__open-page):not(#buttonPanelOneNTF>button):not([data-how-to-open="_blank"])')?.classList.add("cButton__nav__browsing")
                if (document.querySelectorAll('#eligibilityButtons.cButton__nav__open-page, #eligibilityButtons.cButton__nav__browsing').length && !reviewingEligibility) {
                    document.querySelectorAll('#buttonPanelThree > button[id^="CaseEligibilityResult"]:not(#CaseEligibilityResultSelectionSelf)').forEach((e) => e?.classList.add('hidden'))
                }
            }
        })
        highlightPageAndCategory() // to highlight on page load

        buttonDivThree.addEventListener('click', function(event) {
            if (notEditMode && event.target.tagName?.toLowerCase() === 'button') { gotoPage(event.target.id) }
        })
        // Activate row three from click or page load

        // Use_Button_Click_Id_to_Load_href
        function gotoPage(loadThisPage) {
            let loadThisPageNode = document.getElementById(loadThisPage)
            let loadThisPageNodeName = loadThisPageNode.dataset.pageName
            let listPages = ["Alerts", "ActiveCaseList", "ClientSearch", "InactiveCaseList", "PendingCaseList", "ProviderRegistrationList", "ProviderSearch"]
            if ( listPages.includes(loadThisPageNodeName) ) { window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen); return } //Going to a list page...
            if ( listPages.includes(thisPageName) ) {
                if (["ProviderRegistrationList.htm", "ProviderSearch.htm"].includes(thisPageNameHtm) || (thisPageNameHtm === "Alerts.htm" && (document.querySelector('#caseOrProviderAlertsTable > tbody > tr.selected > td:nth-of-type(1)')?.textContent === "Provider")) ) {
                    if (loadThisPageNode.id.indexOf("Provider") === 0) { window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm' + fGetProviderParameters(), loadThisPageNode.dataset.howToOpen) }
                } else {
                    let caseParameters = fGetCaseParameters() ?? ""
                    window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm' + caseParameters, loadThisPageNode.dataset.howToOpen)
                }
            } else {
                if (notEditMode) { window.open(document.getElementById(loadThisPageNode.dataset.pageLinkUsingId).firstElementChild.href, loadThisPageNode.dataset.howToOpen) }
                else if (!notEditMode && (loadThisPageNode.dataset.howToOpen === "_blank")) {
                    let maybeParm2 = caseId ? "?parm2=" + caseId : ''
                    window.open('/ChildCare/' + loadThisPageNode.dataset.pageName + '.htm' + maybeParm2, "_blank")
                }
            }
        } // SECTION_END Use_Button_Click_Id_to_Load_href

        if (("getProviderOverview.htm").includes(thisPageNameHtm)) {
            document.querySelector('#providerButtons').click()
            document.querySelector('#ProviderOverviewSelf').classList.add('cButton__nav__open-page')
        }
        // SECTION_START New_Tab_Case_Number_Field
        function newTabFieldButtons() {
            let buttonDivOneNTF = document.getElementById("buttonPanelOneNTF")
            document.getElementById('buttonPanelOneNTF').insertAdjacentHTML('afterbegin', `
<input id="newTabField" list="history" autocomplete="off" class="form-control" placeholder="Case #" style="width: 10ch;"></input>
<button type="button" data-page-name="CaseNotes" id="FieldNotesNT" class="cButton cButton__nav">Notes</button>
<button type="button" data-page-name="CaseOverview" id="FieldOverviewNT" class="cButton cButton__nav">Overview</button>
`)
            buttonDivOneNTF.addEventListener('click', function(event) {
                if (event.target.closest('button')?.tagName?.toLowerCase() === 'button' && (/\b\d{1,8}\b/).test(document.getElementById('newTabField').value)) {
                    event.preventDefault()
                    openCaseNumber(event.target.dataset.pageName, document.getElementById('newTabField').value)
                }
            })
            $('#newTabField').keydown(function(e) {
                if (e.target.value.length > 7) {
                    e.stopImmediatePropagation()
                    if (!['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'v', 'Home', 'End', 'a', 'z'].includes(e.key)) {
                        e.preventDefault()
                        return false
                    }
                }
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
        !notEditMode && (document.querySelectorAll('#buttonPanelTwo, #buttonPanelThree').forEach((e) => e.classList.add('hidden') )); // SECTION_END New_Tab_Case_Number_Field

        // SECTION_START Reverse_Period_Options_order
        let selectPeriodToReverse = document.getElementById("selectPeriod");
        if (notEditMode && selectPeriodToReverse && !selectPeriodToReverse?.disabled) { selectPeriodReversal(selectPeriodToReverse) } // SECTION_END Reverse_Period_Options_order
    } catch (error) { console.trace(error) }
} // SECTION_END PRIMARY_NAVIGATION_BUTTONS
//
function selectPeriodReversal(selectPeriod) {
    if (selectPeriod) {
        $('#selectPeriod option').each(function() {
            $(this).prependTo($(this).parent())
        })
    }
};
// ====================================================================================================
// ///////////////////////////// PRIMARY_NAVIGATION_BUTTONS SECTION_END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ====================================================================================================
// SECTION_START Period_Dropdown_Next_Prev_Buttons
function nextPrevPeriodButtons() {
    try {
        if (notEditMode) {
            let currentPeriod = document.querySelector('#selectPeriod').value
            if (reviewingEligibility || thisPageNameHtm.indexOf("CaseApplicationInitiation.htm") > -1 || $('#submit').attr('disabled') === 'disabled') { return }
            let lastAvailablePeriod = document.querySelector('#selectPeriod > option:first-child').value
            let selectPeriodDropdown = document.getElementById('selectPeriod');
            let selectPeriodParent = document.getElementById('selectPeriod').parentNode;
            const buttonsNextPrev = [ //"Button Text", "ButtonId", "Next|Prev", "Stay|Go", "Left|Right - side of dropdown"]
                ["«", "backGoSelect", "Prev", "Go", "Left"],
                ["‹", "backSelect", "Prev", "Stay", "Right"],
                ["»", "forwardGoSelect", "Next", "Go", "Right"],
                ["›", "forwardSelect", "Next", "Stay", "Left"],
            ];
            for (let i = 0; i < buttonsNextPrev.length; i++) { //optimize
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

            document.getElementById('selectPeriod').parentNode.addEventListener('click', function(event) {
                if (event.target.closest('button')?.tagName.toLowerCase() === 'button') { selectNextPrev(event.target.closest('button').id) }
            })
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
        }
    } catch (error) { console.trace("nextPrevPeriodButtons", error) }
} // SECTION_END Period_Dropdown_Next_Prev_Buttons
document.querySelector('#selectPeriod:not([disabled], [readonly], [type=hidden])') && nextPrevPeriodButtons() // SECTION_END Period_Dropdown_Next_Prev_Buttons
queueMicrotask(() => { document.querySelector('body')?.addEventListener('submit', function() { document.querySelector('body').style.opacity = ".8" }) }) // Dim_Page_On_Submit
// =================================================================================================================
// SECTION_END CUSTOM_NAVIGATION  (THE MEC2NAVIGATION SCRIPT SHOULD MIMIC THE ABOVE)  SECTION_END NAVIGATION_BUTTONS
// =================================================================================================================

//
class TrackedMutationObserver extends MutationObserver { // https://stackoverflow.com/questions/63488834/how-to-get-all-active-mutation-observers-on-page // Replace MutationObserver with TrackedMutationObserver
    static instances = []
    constructor(...args) {
        super(...args);
    }
    observe(...args) {
        super.observe(...args);
        this.constructor.instances.push(this)
    }
    disconnect() {
        super.disconnect();
        this.constructor.instances = this.constructor.instances.filter(instance => instance !== this);
    }
    static getActive() {
        return this.instances
    }
}
//
let selectPeriod = document.getElementById('selectPeriod')?.value
let periodDates = selectPeriod?.length ? { range: selectPeriod, parm3: selectPeriod.replace(' - ', '').replaceAll('/', ''), start: selectPeriod.slice(0, 10), end: selectPeriod.slice(13) } : {}
function inCurrentBWP(compareDate = new Date()) {
    if (new Date(periodDates.start) <= compareDate && compareDate <= new Date(periodDates.end)) { return formatDate(compareDate, "mmddyyyy") }
}
let inCurrentPeriod = inCurrentBWP() ?? undefined

let userXnumber = localStorage.getItem('MECH2.userIdNumber') ?? ''
const countyNumbersNeighbors = new Map([
    ["x101", { county: "Aitkin", code: "101", neighbors: ["Cass", "Crow Wing", "Mille Lacs", "Kanabec", "Pine", "Carlton", "St. Louis", "Itasca"] }],
    ["x102", { county: "Anoka", code: "102", neighbors: ["Sherburne", "Wright", "Hennepin", "Ramsey", "Washington", "Chisago", "Isanti"] }],
    ["x103", { county: "Becker", code: "103", neighbors: ["Norman", "Clay", "Otter Tail", "Wadena", "Hubbard", "Clearwater", "Mahnomen"] }],
    ["x104", { county: "Beltrami", code: "104", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods"] }],
    ["x105", { county: "Benton", code: "105", neighbors: ["Morrison", "Stearns", "Sherburne", "Mille Lacs"] }],
    ["x106", { county: "Big Stone", code: "106", neighbors: ["Lac Qui Parle", "Swift", "Stevens", "Traverse", "Out-of-State"], outOfState: "" }],
    ["x107", { county: "Blue Earth", code: "107", neighbors: ["Brown", "Watonwan", "Martin", "Faribault", "Waseca", "Le Sueur", "Nicollet"] }],
    ["x108", { county: "Brown", code: "108", neighbors: ["Redwood", "Cottonwood", "Watonwan", "Blue Earth", "Nicollet", "Renville"] }],
    ["x109", { county: "Carlton", code: "109", neighbors: ["Aitkin", "Pine", "St. Louis", "Out-of-State"], outOfState: "" }],
    ["x110", { county: "Carver", code: "110", neighbors: ["Wright", "Hennepin", "Scott", "Sibley", "McLeod"] }],
    ["x111", { county: "Cass", code: "111", neighbors: ["Beltrami", "Hubbard", "Wadena", "Todd", "Morrison", "Crow Wing", "Aitkin", "Itasca"] }],
    ["x112", { county: "Chippewa", code: "112", neighbors: ["Swift", "Lac Qui Parle", "Yellow Medicine", "Renville", "Kandiyohi"] }],
    ["x113", { county: "Chisago", code: "113", neighbors: ["Pine", "Kanabec", "Isanti", "Anoka", "Washington", "Out-of-State"], outOfState: "" }],
    ["x114", { county: "Clay", code: "114", neighbors: ["Wilkin", "Otter Tail", "Becker", "Norman", "Out-of-State"], outOfState: "" }],
    ["x115", { county: "Clearwater", code: "115", neighbors: ["Pennington", "Polk", "Mahnomen", "Becker", "Hubbard", "Beltrami"] }],
    ["x116", { county: "Cook", code: "116", neighbors: ["Lake"] }],
    ["x117", { county: "Cottonwood", code: "117", neighbors: ["Redwood", "Murray", "Nobles", "Jackson", "Martin", "Watonwan", "Brown"] }],
    ["x118", { county: "Crow Wing", code: "118", neighbors: ["Cass", "Morrison", "Mille Lacs", "Aitkin"] }],
    ["x119", { county: "Dakota", code: "119", neighbors: ["Goodhue", "Rice", "Scott", "Hennepin", "Ramsey", "Washington"] }],
    ["x120", { county: "Dodge", code: "120", neighbors: ["Rice", "Steele", "Freeborn", "Mower", "Olmsted", "Goodhue"] }],
    ["x121", { county: "Douglas", code: "121", neighbors: ["Otter Tail", "Grant", "Stevens", "Pope", "Stearns", "Todd"] }],
    ["x122", { county: "Faribault", code: "122", neighbors: ["Blue Earth", "Martin", "Freeborn", "Waseca", "Out-of-State"], outOfState: "" }],
    ["x123", { county: "Fillmore", code: "123", neighbors: ["Olmsted", "Mower", "Houston", "Winona", "Out-of-State"], outOfState: "" }],
    ["x124", { county: "Freeborn", code: "124", neighbors: ["Waseca", "Faribault", "Mower", "Dodge", "Steele", "Out-of-State"], outOfState: "" }],
    ["x125", { county: "Goodhue", code: "125", neighbors: ["Wabasha", "Olmsted", "Dodge", "Steele", "Rice", "Dakota", "Out-of-State"], outOfState: "" }],
    ["x126", { county: "Grant", code: "126", neighbors: ["Wilkin", "Traverse", "Stevens", "Pope", "Douglas", "Otter Tail"] }],
    ["x127", { county: "Hennepin", code: "127", neighbors: ["Sherburne", "Wright", "Carver", "Scott", "Dakota", "Ramsey", "Anoka", "Sherburne"] }],
    ["x128", { county: "Houston", code: "128", neighbors: ["Winona", "Fillmore", "Out-of-State"], outOfState: "" }],
    ["x129", { county: "Hubbard", code: "129", neighbors: ["Clearwater", "Becker", "Wadena", "Cass", "Beltrami"] }],
    ["x130", { county: "Isanti", code: "130", neighbors: ["Mille Lacs", "Sherburne", "Anoka", "Chisago", "Pine", "Kanabec"] }],
    ["x131", { county: "Itasca", code: "131", neighbors: ["Beltrami", "Cass", "Aitkin", "St. Louis", "Koochiching"] }],
    ["x132", { county: "Jackson", code: "132", neighbors: ["Murray", "Nobles", "Martin", "Watonwan", "Cottonwood", "Out-of-State"], outOfState: "" }],
    ["x133", { county: "Kanabec", code: "133", neighbors: ["Mille Lacs", "Isanti", "Chisago", "Pine", "Aitkin"] }],
    ["x134", { county: "Kandiyohi", code: "134", neighbors: ["Pope", "Swift", "Chippewa", "Renville", "Meeker", "Stearns"] }],
    ["x135", { county: "Kittson", code: "135", neighbors: ["Marshall", "Roseau", "Out-of-State"], outOfState: "" }],
    ["x136", { county: "Koochiching", code: "136", neighbors: ["Lake of the Woods", "Beltrami", "Itasca", "St. Louis"], outOfState: "" }],
    ["x137", { county: "Lac qui Parle", code: "137", neighbors: ["Yellow Medicine", "Chippewa", "Swift", "Big Stone", "Out-of-State"], outOfState: "" }],
    ["x138", { county: "Lake", code: "138", neighbors: ["Cook", "St. Louis"] }],
    ["x139", { county: "Lake of the Woods", code: "139", neighbors: ["Roseau", "Beltrami", "Koochiching"] }],
    ["x140", { county: "Le Sueur", code: "140", neighbors: ["Sibley", "Nicollet", "Blue Earth", "Waseca", "Rice", "Scott"] }],
    ["x141", { county: "Lincoln", code: "141", neighbors: ["Pipestone", "Murray", "Lyon", "Yellow Medicine", "Out-of-State"], outOfState: "" }],
    ["x142", { county: "Lyon", code: "142", neighbors: ["Yellow Medicine", "Lincoln", "Pipestone", "Murray", "Redwood"] }],
    ["x143", { county: "McLeod", code: "143", neighbors: ["Meeker", "Renville", "Sibley", "Carver", "Wright"] }],
    ["x144", { county: "Mahnomen", code: "144", neighbors: ["Polk", "Norman", "Becker", "Clearwater"] }],
    ["x145", { county: "Marshall", code: "145", neighbors: ["Polk", "Pennington", "Beltrami", "Roseau", "Out-of-State"], outOfState: "" }],
    ["x146", { county: "Martin", code: "146", neighbors: ["Cottonwood", "Jackson", "Faribault", "Blue Earth", "Watonwan", "Out-of-State"] }],
    ["x147", { county: "Meeker", code: "147", neighbors: ["Kandiyohi", "Renville", "McLeod", "Wright", "Stearns"] }],
    ["x148", { county: "Mille Lacs", code: "148", neighbors: ["Crow Wing", "Morrison", "Benton", "Sherburne", "Isanti", "Kanabec", "Aitkin"] }],
    ["x149", { county: "Morrison", code: "149", neighbors: ["Cass", "Todd", "Stearns", "Benton", "Mille Lacs", "Crow Wing"] }],
    ["x150", { county: "Mower", code: "150", neighbors: ["Steele", "Freeborn", "Fillmore", "Olmsted", "Dodge", "Out-of-State"], outOfState: "" }],
    ["x151", { county: "Murray", code: "151", neighbors: ["Lincoln", "Pipestone", "Rock", "Nobles", "Jackson", "Cottonwood", "Redwood", "Lyon"] }],
    ["x152", { county: "Nicollet", code: "152", neighbors: ["Renville", "Brown", "Blue Earth", "Le Sueur", "Sibley"] }],
    ["x153", { county: "Nobles", code: "153", neighbors: ["Pipestone", "Rock", "Jackson", "Cottonwood", "Murray", "Out-of-State"], outOfState: "" }],
    ["x154", { county: "Norman", code: "154", neighbors: ["Polk", "Clay", "Becker", "Mahnomen"] }],
    ["x155", { county: "Olmsted", code: "155", neighbors: ["Goodhue", "Dodge", "Mower", "Fillmore", "Winona", "Wabasha"] }],
    ["x156", { county: "Otter Tail", code: "156", neighbors: ["Clay", "Wilkin", "Grant", "Douglas", "Todd", "Wadena", "Becker"] }],
    ["x157", { county: "Pennington", code: "157", neighbors: ["Marshall", "Polk", "Red Lake", "Clearwater", "Beltrami"] }],
    ["x158", { county: "Pine", code: "158", neighbors: ["Aitkin", "Kanabec", "Isanti", "Chisago", "Carlton", "Out-of-State"], outOfState: "" }],
    ["x159", { county: "Pipestone", code: "159", neighbors: ["Rock", "Nobles", "Murray", "Lyon", "Lincoln"] }],
    ["x160", { county: "Polk", code: "160", neighbors: ["Marshall", "Norman", "Mahnomen", "Clearwater", "Pennington", "Red Lake", "Out-of-State"], outOfState: "" }],
    ["x161", { county: "Pope", code: "161", neighbors: ["Grant", "Stevens", "Swift", "Kandiyohi", "Stearns", "Todd", "Douglas"] }],
    ["x162", { county: "Ramsey", code: "162", neighbors: ["Washington", "Anoka", "Hennepin", "Dakota"] }],
    ["x163", { county: "Red Lake", code: "163", neighbors: ["Polk", "Pennington"] }],
    ["x164", { county: "Redwood", code: "164", neighbors: ["Yellow Medicine", "Lyon", "Murray", "Cottonwood", "Brown", "Renville"] }],
    ["x165", { county: "Renville", code: "165", neighbors: ["Chippewa", "Yellow Medicine", "Redwood", "Brown", "Nicollet", "Sibley", "McLeod", "Meeker", "Kandiyohi"] }],
    ["x166", { county: "Rice", code: "166", neighbors: ["Scott", "Le Sueur", "Waseca", "Steele", "Dodge", "Goodhue", "Dakota"] }],
    ["x167", { county: "Rock", code: "167", neighbors: ["Pipestone", "Murray", "Nobles", "Out-of-State"], outOfState: "" }],
    ["x168", { county: "Roseau", code: "168", neighbors: ["Kittson", "Marshall", "Beltrami", "Lake of the Woods"] }],
    ["x169", { county: "St. Louis", code: "169", neighbors: ["Lake", "Koochiching", "Itasca", "Aitkin", "Carlton", "Out-of-State"], outOfState: "" }],
    ["x170", { county: "Scott", code: "170", neighbors: ["Carver", "Sibley", "Le Sueur", "Rice", "Dakota", "Hennepin"] }],
    ["x171", { county: "Sherburne", code: "171", neighbors: ["Stearns", "Wright", "Hennepin", "Anoka", "Isanti", "Mille Lacs", "Benton"] }],
    ["x172", { county: "Sibley", code: "172", neighbors: ["Renville", "Nicollet", "Le Sueur", "Scott", "Carver", "McLeod"] }],
    ["x173", { county: "Stearns", code: "173", neighbors: ["Douglas", "Pope", "Kandiyohi", "Meeker", "Wright", "Sherburne", "Benton", "Morrison", "Todd"] }],
    ["x174", { county: "Steele", code: "174", neighbors: ["Waseca", "Freeborn", "Mower", "Dodge", "Goodhue", "Rice"] }],
    ["x175", { county: "Stevens", code: "175", neighbors: ["Traverse", "Big Stone", "Swift", "Pope", "Douglas", "Grant"] }],
    ["x176", { county: "Swift", code: "176", neighbors: ["Stevens", "Big Stone", "Lac Qui Parle", "Chippewa", "Kandiyohi", "Pope"] }],
    ["x177", { county: "Todd", code: "177", neighbors: ["Otter Tail", "Douglas", "Pope", "Stearns", "Morrison", "Cass", "Wadena"] }],
    ["x178", { county: "Traverse", code: "178", neighbors: ["Big Stone", "Stevens", "Grant", "Wilkin", "Out-of-State"], outOfState: "" }],
    ["x179", { county: "Wabasha", code: "179", neighbors: ["Goodhue", "Olmsted", "Winona", "Out-of-State"] }],
    ["x180", { county: "Wadena", code: "180", neighbors: ["Becker", "Otter Tail", "Todd", "Cass", "Hubbard"] }],
    ["x181", { county: "Waseca", code: "181", neighbors: ["Blue Earth", "Faribault", "Freeborn", "Steele", "Rice", "Le Sueur"] }],
    ["x182", { county: "Washington", code: "182", neighbors: ["Chisago", "Anoka", "Ramsey", "Dakota", "Out-of-State"], outOfState: "" }],
    ["x183", { county: "Watonwan", code: "183", neighbors: ["Brown", "Cottonwood", "Jackson", "Martin", "Blue Earth"] }],
    ["x184", { county: "Wilkin", code: "184", neighbors: ["Traverse", "Grant", "Otter Tail", "Clay", "Out-of-State"], outOfState: "" }],
    ["x185", { county: "Winona", code: "185", neighbors: ["Wabasha", "Olmsted", "Fillmore", "Houston", "Out-of-State"], outOfState: "" }],
    ["x186", { county: "Wright", code: "186", neighbors: ["Stearns", "Meeker", "McLeod", "Carver", "Hennepin", "Anoka", "Sherburne"] }],
    ["x187", { county: "Yellow Medicine", code: "187", neighbors: ["Lac Qui Parle", "Lincoln", "Lyon", "Redwood", "Renville", "Chippewa"] }],
    ["x192", { county: "White Earth Nation", code: "192", neighbors: ["Polk", "Norman", "Becker", "Clearwater", "Mahnomen"] }],
    ["x194", { county: "Red Lake Nation", code: "194", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods", "Beltrami"] }],
])
const userCountyObject = countyNumbersNeighbors.get( userXnumber?.slice(0, 4).toLowerCase() ) ?? undefined

const changeEvent = new Event('change')
const doEvent = (element) => document.querySelector(element)?.dispatchEvent(changeEvent)
//
//======================== Case_History Section_Start =================================
if (!iFramed) {
    try {
        let caseHistory = []
        if (localStorage.getItem('MECH2.caseHistoryLS') !== null) { caseHistory = JSON.parse(localStorage.getItem('MECH2.caseHistoryLS')) }
        function addToCaseHistoryArray() {
            let caseName = commaNameToObject($('#caseHeaderData div.col-lg-4').contents().eq(2).text())
            const caseIdTest = (entry) => entry.caseIdNumber === caseId
            let foundDuplicate = caseHistory.findIndex(caseIdTest)
            if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
            let timestamp = new Date().toLocaleDateString('en-US', { hour: "numeric", minute: "2-digit", month: "2-digit", day: "2-digit" })
            let newEntry = { caseIdNumber: caseId, caseName: caseName.first + ' ' + caseName.last, time: timestamp };
            if (caseHistory.length === 10) { caseHistory.pop() }
            caseHistory.unshift(newEntry)
            localStorage.setItem('MECH2.caseHistoryLS', JSON.stringify(caseHistory));
        };

        if ((/^\d+/).test(caseId) && caseId.length < 8 && notEditMode && localStorage.getItem('MECH2.note') === null) { addToCaseHistoryArray() }

        let viewHistory = JSON.parse(localStorage.getItem('MECH2.caseHistoryLS'))
        function makeViewHistoryDatalist() {
            let tempDatalist = '<datalist id="history">'
            for (let history in viewHistory) {
                tempDatalist += '<option value="' + viewHistory[history].caseIdNumber + '">' + viewHistory[history].caseIdNumber + ' ' + viewHistory[history].caseName + ' ' + viewHistory[history].time + '</option>'
            }
            tempDatalist += '</datalist>'
            return tempDatalist
        }
        let viewHistoryDatalist = makeViewHistoryDatalist()
        document.getElementById('newTabField').insertAdjacentHTML('afterend', viewHistoryDatalist)
    }
    catch (err) { console.trace(err) }
}
//======================== Case_History Section_End =================================

if (!notEditMode && !iFramed) { //actualDate
    let actualDateField = document.querySelector('#actualDate:not([disabled])')
    var storedActualDate = sessionStorage.getItem('actualDateSS')
    if (actualDateField) {
        if (storedActualDate?.length === undefined) {//storedActualDate === null || storedActualDate === '') {
            document.getElementById('save').addEventListener('click', function() {
                sessionStorage.setItem('actualDateSS', actualDateField.value)
            })
        }
        else {
            if (storedActualDate?.length && !actualDateField?.value.length && !actualDateField?.getAttribute('disabled')) {
                actualDateField.classList.add('red-outline')
                actualDateField.value = storedActualDate
            }
        }
    }
} // actualDate
if (!notEditMode && sessionStorage.getItem('processingApplication') === "yes" && $('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').length && !$('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').val().length) {
    $('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate').val(sessionStorage.getItem('actualDateSS'))
}
let excludedResetTabIndexList;
function resetTabIndex(excludedList) {
    const nonResetPages = ["CaseSpecialLetter.htm"]
    // if ( !nonResetPages.includes(thisPageNameHtm) ) { $(':is(select, input, textarea, td.sorting)[tabindex]').removeAttr('tabindex') }
    // if (!nonResetPages.includes(thisPageNameHtm)) { queueMicrotask(() => { document.querySelectorAll(':is(select, input, textarea, td.sorting):not([disabled], [readonly], ' + excludedList + ')[tabindex]').forEach((e) => e.removeAttribute('tabindex')) }) }
    if (!nonResetPages.includes(thisPageNameHtm)) { queueMicrotask(() => { document.querySelectorAll('form > div[id] :is(.form-button, .form-control):not([type=hidden], .modal, ' + excludedList + ')').forEach((e) => e.removeAttribute('tabindex')) }) }
    document.querySelectorAll('input').forEach(function(e) { e.spellcheck = false })
}
// console.log(document.querySelectorAll('form > div[id] :is(.form-button, .form-control):not([type=hidden])'))
setTimeout(function() { resetTabIndex() }, 400)

// ==============================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// FOCUS_ELEMENT SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// SECTION_START Element_Focus
function eleFocus(ele) {
    // document.querySelectorAll('.focusedElement').forEach((e) => e.classList.remove('focusedElement'))
    let eleToFocus = typeof(ele) === "object" ? ele : document.querySelector(ele)
    if (eleToFocus) {
        $(document).ready(function() {
            if ( eleToFocus.nodeName === "INPUT" && eleToFocus.classList.contains('form-control') ) { eleToFocus.select() }
            else { eleToFocus.focus() }
            // eleToFocus.classList.add('focusedElement')
            // document.querySelector('.focusedElement').focus()
        });
    } else { console.log("eleFocus failed to find element based on query:", ele, ". Check for missing #.") }
};
if (!iFramed) { // More element_focus
    // function firstEmptyId() { return $('.panel-box-format :is(input, select):not(:disabled, .form-button, [readonly], [type="hidden"])').filter(function() {return $(this).val()?.length === 0}).eq(0).attr('id') || "" }
    function firstEmptyId() {
        let firstEmpty = [...document.querySelectorAll('.panel-box-format :is(input, select):not(:disabled, .form-button, [readonly], [type="hidden"], [type=checkbox])')].filter(function(e) { return e.value === '' })
        return firstEmpty[0].id
    }
    function firstEmptyElement() {
        let firstEmpty = [...document.querySelectorAll('.panel-box-format :is(input, select):not(:disabled, .form-button, [readonly], [type="hidden"], [type=checkbox])')].filter(function(e) { return e.value === '' })
        return firstEmpty[0]
    }
    try {
        //========== Hotkeys_for_Modals Start =================
        let popupModal = [...document.getElementsByClassName('modal')]
        if (popupModal?.length) {
            const config = { attributes: true }
            popupModal.forEach(function(ele) {
                let popupModalObserver = new MutationObserver(function(mutations) {
                    const controllerModal = new AbortController()
                    if (document.querySelectorAll('.modal.in').length === 1) {
                        eleFocus(document.querySelector('.modal.in input') )
                        window.addEventListener('keydown', function(event) {
                            switch (event.code) {
                                case 'KeyO':
                                    event.preventDefault()
                                    document.querySelector('.in input.form-button:nth-child(1)').click()
                                    break
                                case 'KeyC':
                                    event.preventDefault()
                                    document.querySelector('.in input.form-button:nth-child(2)').click()
                                    break
                            }
                        }, { signal: controllerModal.signal })
                        return false
                    } else {
                        controllerModal.abort()
                    }
                })
                popupModalObserver.observe(ele, config);
            });
        }
        //========== Hotkeys_for_Modals End =================
        if ( document.getElementById('caseId') && !caseId ) { focusEle = '#caseId' }
        else if ( document.querySelector('#providerInput>#providerId') && !providerId ) { focusEle = '#providerId' }

        //SUB-SECTION START Activity and Income tab pages
        if (caseId) {
            if (("CaseEarnedIncome.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else if (document.getElementById('memberReferenceNumberNewMember')) { focusEle = '#memberReferenceNumberNewMember' }
                else if (document.getElementById('ceiVerification').value === 'No Verification Provided') { focusEle = '#ceiVerification' }
                else { $('#ceiPrjAmount').select() }
            }
            if (("CaseUnearnedIncome.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else if (document.getElementById('memberReferenceNumberNewMember')) { focusEle = '#memberReferenceNumberNewMember' }
                else if ($('#verification').val() === 'No Verification Provided') { focusEle = '#verification' }
                else { $('#incomeProjectionAmount').select() }
            }
            if (("CaseExpense.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else if (document.getElementById('refPersonName')) { focusEle = '#refPersonName' }
                else if (document.getElementById('verificationType').value === 'No Verification Provided') { focusEle = '#verificationType' }
                else { $('#projectionExpenseAmount').select() }
            }
            if (("CaseLumpSum.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else if (document.getElementById('lumpSumVerification').value === 'No Verification Provided') { focusEle = '#lumpSumVerification' }
                else { focusEle = '#memberReferenceNumberNewMember' }
            }
            if (!("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm) && thisPageNameHtm.indexOf("Activity.htm") > -1) {//activity pages that aren't the elig result one
                if (notEditMode) { focusEle = '#newDB' }
                else if ($('strong:contains("Warning: This data will expire")').length > 0) { focusEle = '#saveDB' }
                else if (document.querySelector('#employmentActivityVerification, #verification').value === 'No Verification Provided') { focusEle = document.querySelector('#employmentActivityVerification, #verification') }
                else if (document.querySelector('#memberReferenceNumberNewMember, #pmiNbrNew')) { focusEle = document.querySelector('#memberReferenceNumberNewMember, #pmiNbrNew'); tabIndxNegOne('#activityEnd, #employmentActivityEnd, #activityPeriodEnd, #leaveDetailExtendedEligibilityBegin, #leaveDetailRedeterminationDue') }
                else { focusEle = document.querySelector('#activityEnd, #employmentActivityEnd, #activityPeriodEnd') }
            }
            if (("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) {
                if (!notEditMode) { focusEle = '#hoursUsed'; setTimeout($('#hoursUsed').select(), 1) }
                else if (notEditMode) { focusEle = '#editDB' }
            }

            //SUB-SECTION START Member tab pages
            if (("CaseMember.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    tbodyFocusNextEdit()
                    focusEle = '#newDB'
                } else if (!notEditMode) {
                    if (document.getElementById('next') && document.getElementById('next').getAttribute('disabled') !== "disabled") { focusEle = '#next' }
                    else if (document.getElementById('memberReferenceNumber')?.value === "") { focusEle = '#memberReferenceNumber' }
                    else { focusEle = '#' + firstEmptyId() }
                }
            }
            if (("CaseMemberII.htm").includes(thisPageNameHtm)) {
                setTimeout(function() {
                    if (notEditMode) {
                        tbodyFocusNextEdit()
                        if (document.getElementById('new').getAttribute('disabled') !== "disabled") { focusEle = '#newDB' }
                        else if (document.getElementById('edit').getAttribute('disabled') !== "disabled") { focusEle = '#editDB' }
                    } else if (!notEditMode) {
                        document.getElementById('memberReferenceNumberNewMember')?.addEventListener('change', function() { resetTabIndex() })
                        // if (document.getElementById('next') && document.getElementById('next').getAttribute('disabled') !== "disabled") { focusEle = '#next' }
                        if ( document.getElementById('next') ) {
                            if (document.getElementById('next').getAttribute('disabled') !== "disabled") { focusEle = '#next' }
                            else if (!document.getElementById('memberReferenceNumberNewMember') ) { focusEle = '#newDB' }
                        }
                        // else if (!document.getElementById('memberReferenceNumberNewMember') && document.getElementById('next') && document.getElementById('next').getAttribute('disabled') === "disabled") { focusEle = '#newDB' }
                        else if (document.getElementById('memberReferenceNumberNewMember') && !document.getElementById('memberReferenceNumberNewMember').value) { focusEle = '#memberReferenceNumberNewMember' }
                        else if (document.getElementById('actualDate').value && ( document.getElementById('memberCitizenshipVerification').value === 'No Verification Provided' || !document.getElementById('memberCitizenshipVerification').value )) { focusEle = '#memberCitizenshipVerification' }
                        else if (!document.getElementById('actualDate').value) { focusEle = '#actualDate' }
                        else { focusEle = '#' + firstEmptyId() }
                    }
                }, 100)
            }
            if (("CaseParent.htm").includes(thisPageNameHtm)) {
                if (!notEditMode) {
                    // if (document.getElementById('parentVerification').value === 'No Verification Provided') { focusEle = '#parentVerification' }
                    if ( document.getElementById('parentReferenceNumberNewMember') ) { focusEle = '#parentReferenceNumberNewMember' }
                    else if ( ['No Verification Provided', ''].includes(document.getElementById('parentVerification').value) ) { focusEle = '#parentVerification' }
                    else if ( !document.getElementById('parentReferenceNumberNewMember') && document.getElementById('childReferenceNumberNewMember') ) { focusEle = '#childReferenceNumberNewMember' }
                    else { focusEle = document.querySelector('#cancel, #revert') }
                }
                else if (notEditMode) {
                    tbodiesFocus('#editDB')
                    if (document.referrer.indexOf(thisPageNameHtm) > -1) { focusEle = '#newDB' }
                    else {
                        if (!document.querySelector('#add:disabled')) { focusEle = '#addDB' }
                        else { focusEle = '#newDB' }
                    }
                }
            }
            if (("CaseRemoveMember.htm").includes(thisPageNameHtm)) {
                if (!notEditMode) { focusEle = '#memberReferenceNumberNewMember' }
                else { focusEle = '#newDB' }
            }

            if (("CaseCSE.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                   tbodiesFocus('#addChildDB')
                    if (document.referrer.indexOf(thisPageNameHtm) > -1) { focusEle = '#newDB' }
                    else if (!document.querySelector('#addChild:disabled')) { focusEle = '#addChildDB' }
                    else { focusEle = '#newDB' }
                }
                else if (!document.getElementById('csePriNewReferenceNumber') && document.getElementById('cseChildrenGridChildNewReferenceNumber')) { focusEle = '#cseChildrenGridChildNewReferenceNumber' }
                else if (document.getElementById('csePriNewReferenceNumber') && !document.getElementById('csePriNewReferenceNumber').value) { focusEle = '#csePriNewReferenceNumber' }
                else if (!document.getElementById('actualDate').value) { focusEle = '#actualDate' }
                else { focusEle = '#cseDetailsFormsCompleted' }
            };

            if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else if (!notEditMode) {
                    if ($('strong:contains("Warning")').length > 0) { focusEle = '#saveDB' }
                    else if ( document.getElementById('memberReferenceNumberNewMember') && !document.getElementById('memberReferenceNumberNewMember')?.value ) { focusEle = '#memberReferenceNumberNewMember' }
                    else if ( document.getElementById('providerType').value === "Legal Non-licensed" ) { focusEle = '' }
                    else if ( (!document.getElementById('primaryBeginDate').value && !document.getElementById('secondaryBeginDate').value) && document.getElementById('providerType').value !== "Legal Non-licensed" ) { focusEle = '#primaryBeginDate' }
                    else { focusEle = '#hoursOfCareAuthorized' }
                    // else { document.getElementById('hoursOfCareAuthorized').select() }
                }
            }

            if (("CaseSchool.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { focusEle = '#newDB' }
                else {
                    if (document.getElementById('memberReferenceNumberNewMember')) { focusEle = '#memberReferenceNumberNewMember' }
                    else if (!storedActualDate) { focusEle = '#actualDate' }
                    else { focusEle = '#saveDB' }
                }
            }
            //SUB-SECTION END Member Tab pages

            //SUB-SECTION START Case Tab pages
            if (("CaseAddress.htm").includes(thisPageNameHtm)) {
                if ($('strong:contains("Warning"), strong:contains("Effective")').length && !notEditMode) {
                    let storedActualDate = sessionStorage.getItem('actualDateSS')
                    if (document.querySelector('strong.rederrortext')) {
                        if (document.querySelector('strong.rederrortext').innerText === 'Effective Date must be entered in the corresponding biweekly period.' && storedActualDate) {
                            if (new Date(periodDates.start) < new Date(storedActualDate) && new Date(storedActualDate) < new Date(periodDates.end)) {
                                document.getElementById('effectiveDate').value === storedActualDate
                            }
                        }
                    }
                    if (document.querySelector('div.error_alertbox_new > strong:not(.rederrortext)').innerText === " Warning: Effective date has changed - Review Living Situation") {
                        // document.getElementById('save').click()
                        doClick('#save')
                    }
                    focusEle = '#saveDB'
                }
                else {
                    let previousStatus = document.getElementById('previous')?.getAttribute('disabled')
                    let editingMode = ( previousStatus === "disabled" ) ? "appEditing" : previousStatus === null ? "appNotEditing" : document.getElementById('edit')?.getAttribute('disabled') === "disabled" ? "editing" : "notEditing"
                    if (editingMode === "appNotEditing") { focusEle = '#wrapUpDB' }
                    if (editingMode === "notEditing") { focusEle = '#editDB' }
                    if (editingMode === "appEditing" || editingMode === "editing") {
                        if (document.getElementById('subsidizedHousing').value === '' && document.getElementById('residenceStreet1').value !== '') { focusEle = '#subsidizedHousing' }
                        else if (document.getElementById('residenceStreet1').value) { focusEle = '#effectiveDate' }
                    }
                }
            }
            if (("CaseAction.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    if (document.referrer.match(thisPageNameHtm)) { focusEle = '#wrapUpDB' }
                    else { document.getElementById('delete').getAttribute('disabled') ? focusEle = '#newDB' : focusEle = '#deleteDB' }
                } else { focusEle = '#failHomeless' }
            }

            if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    if (document.getElementById('redeterminationStatus').value === 'Updates Required') { focusEle = '#wrapUpDB' }
                    else { focusEle = '#editDB' }
                }
                else if ($('strong:contains("Warning")').length > 0) { focusEle = '#saveDB' }
                else { document.getElementById('redeterminationStatus').value = 'Updates Required'; focusEle = '#receiveDate' }
            }

            if (("FundingAvailability.htm").includes(thisPageNameHtm)) {
                let noAutoFunds = localStorage.getItem('MECH2.autoFunds')

                let toggleFundsBtnText = noAutoFunds?.value.length ? "Default to Yes" : "Disable Auto-Yes" // value only exists if 'disabled'
                $('div#caseInput').append('<button id="toggleFunding" class="cButton float-right" type="button">' + toggleFundsBtnText + '</button>')
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
                    if (document.getElementById('new').getAttribute('disabled')) { focusEle = '#wrapUpDB' }
                    else { focusEle = '#newDB' }
                }
                else if (!notEditMode) {
                    let appDate = sessionStorage.getItem('actualDateSS')
                    let bsfCode = document.getElementById('basicSlidingFeeFundsAvailableCode')
                    if (bsfCode.value === '' && !noAutoFunds) {
                        bsfCode.value = 'Y'
                        focusEle = '#saveDB'
                    }
                    if (appDate?.length) { document.getElementById('bSfEffectiveDate').value = appDate }
                    else if (!appDate?.length) { focusEle = '#bSfEffectiveDate' }
                }
            }

            if (("CaseReinstate.htm").includes(thisPageNameHtm)) {
                if (notEditMode) { document.getElementById('reinstateDate').value !== '' ? focusEle = '#wrapUpDB' : focusEle = '#editDB' }
                else { document.getElementById('reason')?.value.length > 0 ? focusEle = '#saveDB' : focusEle = '#reason' }
            }

            if (("CaseDisability.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#newDB' : focusEle = '#memberReferenceNumberNewMember' }
            //SUB-SECTION END Case Tab pages

            //SUB-SECTION START Notices Tab pages
            if (("CaseMemo.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#newDB' : focusEle = '#memberComments' }
            if (("CaseSpecialLetter.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#newDB' : focusEle = '#status' }

            //SUB-SECTION START Eligibility pages
            if (["CaseEligibilityResultSelection.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
                let backgroundTransaction = $('strong:contains("Background transaction in process.")').length
                let reloadButton = document.getElementById('submit') ? '#submit' : '#caseInputSubmit'
                let proceedButton = document.getElementById('approve') ? '#approveDB' : '#selectDB'
                function checkIfBackground() {
                    if (backgroundTransaction) {
                        document.querySelector('#approve, #select').setAttribute('disabled', 'disabled')
                        document.querySelector('#approveDB, #selectDB').classList.add('custom-form-button__disabled');
                        focusEle = reloadButton
                    }
                    else { focusEle = proceedButton }
                }
                setTimeout(function() {
                    checkIfBackground()
                    document.querySelectorAll('tbody').forEach((e) => {
                        e.click(function() { checkIfBackground() })
                    })
                }, 200)
            }
            const eligibilityPagesNextFocus = ["CaseEligibilityResultFamily.htm", "CaseEligibilityResultPerson.htm", "CaseEligibilityResultActivity.htm", "CaseEligibilityResultFinancial.htm", "CaseEligibilityResultApproval.htm"]
            if (("CaseEligibilityResultOverview.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#nextDB' : focusEle = '#type' }
            if (eligibilityPagesNextFocus.includes(thisPageNameHtm)) { notEditMode ? focusEle = '#nextDB' : focusEle = '#overrideReason' }
            if (("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#approveDB' : focusEle = '#type' }
            if (("CaseEligibilityResultApprovalPackage.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    focusEle = '#approveDB'
                    tbodiesFocus('#confirmDB')
                }
                else { focusEle = '#confirmDB' }
            }
            if (("CaseCreateEligibilityResults.htm").includes(thisPageNameHtm)) { focusEle = '#createDB' }
            //SUB-SECTION START Service Authorization pages
            if (("CaseCreateServiceAuthorizationResults.htm").includes(thisPageNameHtm) && notEditMode) { focusEle = '#createDB' }
            if (["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm"].includes(thisPageNameHtm) && notEditMode) { focusEle = '#nextDB' }
            if (("CaseServiceAuthorizationApproval.htm").includes(thisPageNameHtm)) {
                tbodiesFocus('#approveDB')
            }
            if (("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) {
                focusEle = '#confirmDB'
                tbodiesFocus('#confirmDB')
            }

            if (("CaseTransfer.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#newDB' : focusEle = '#caseTransferFromType' }

            if (("CaseCSIA.htm").includes(thisPageNameHtm)) {
                notEditMode ? focusEle = '#newDB' : focusEle = '#nameKnown'
                document.querySelector('#caseCSIADetailData').addEventListener('click', function() { eleFocus('#newDB') })
            }

            if (("CaseNotes.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    waitForElmHeight('#caseNotesTable > tbody > tr:not(.hidden-tr)').then(() => { if (document.querySelectorAll('#caseNotesTable > tbody > tr:not(.hidden-tr)').length) { document.querySelector('#caseNotesTable > tbody > tr:not(.hidden-tr)').click(); focusEle = '#newDB' } })
                }
                else if (!localStorage.getItem("MECH2.note")?.length) {
                    document.getElementById('noteMemberReferenceNumber').addEventListener('focus', function() { setTimeout(document.querySelector('#save').scrollIntoView({ behavior: 'smooth', block: 'end' }), 0) })
                    focusEle = '#noteMemberReferenceNumber'
                }
            };
            if (("CaseWrapUp.htm").includes(thisPageNameHtm)) {
                // if (sessionStorage.getItem('processingApplication') !== null && document.referrer.indexOf("FundingAvailability.htm") < 0) {
                if (sessionStorage.getItem('processingApplication') !== null && document.referrer.indexOf("CaseAddress.htm") > -1) {
                    document.getElementById('memberMainButtons').click()
                    focusEle = '#CaseParentSelf'
                } else {
                    focusEle = '#doneDB'
                }
            }
            //SUB-SECTION START Billing Pages
            if (("FinancialBilling.htm").includes(thisPageNameHtm)) {
                if (notEditMode) {
                    focusEle = '#editDB'
                } else {
                    setTimeout(function() {
                        focusEle = '#billedTimeType'
                    }, 1000)
                }
            }
            if (("FinancialBillingApproval.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#approveBillingDB' : focusEle = '#remittanceComments' }
            if (("FinancialBillingRegistrationFeeTracking.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#addDB' : focusEle = '#caseTransferFromType' }
            if (("FinancialAbsentDayHolidayTracking.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#addDB' : focusEle = '#caseTransferFromType' }
            if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) { notEditMode ? focusEle = '#mpProviderId' : focusEle = '#mpProviderId' }

            if (!notEditMode && document.querySelectorAll('strong.rederrortext').length) {
                if ([...document.querySelectorAll('strong.rederrortext')].filter((el) => el.textContent.includes('Actual Date is missing')).length) {
                // if ($('strong.rederrortext:contains("Actual Date is missing")').length) {
                    focusEle = '#actualDate'
                    if (inCurrentPeriod) { document.getElementById('actualDate').value = inCurrentPeriod }
                } else if ([...document.querySelectorAll('strong.rederrortext')].filter((el) => el.textContent.includes('is missing')).length) {
                // } else if ($('strong.rederrortext:contains("is missing")')) {
                    // document.querySelector('errordiv').closest('div').previousElementSibling.querySelector('input, select')
                    let erroredEntry = document.querySelector('errordiv').closest('div').querySelector('input, select') ?? document.querySelector('errordiv').closest('div').previousElementSibling.querySelector('input, select')
                    // eleFocus($('errordiv').prev('div').find('select, input'))
                    focusEle = erroredEntry
                }
            }
        }

        if (providerId) {
            //SUB-SECTION START Provider pages
            if (("ProviderInformation.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#editDB' : '#contactEmail' }
            if (("ProviderAddress.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#editDB' : '#mailingSiteHomeStreet1' }
            if (("ProviderAccreditation.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#editDB' : '#accreditationType' }
            if (("ProviderLicense.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#editDB' : '#licenseNumber' }
            if (("ProviderAlias.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#addBusiness' : '#name' }
            if (("ProviderTaxInfo.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#newDB' : '#taxType' }
            if (("ProviderSpecialLetter.htm").includes(thisPageNameHtm)) { focusEle = notEditMode ? '#newDB' : '#activity' }

        }
        //SUB-SECTION START Non-collection pages
        if (("/AlertWorkerCreatedAlert.htm").includes(thisPageNameHtm)) { focusEle = '#delayNextMonth' }
        if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm)) { if (notEditMode) { focusEle = '#new' } else { focusEle = $('#pmiNumber').attr('disabled') === 'disabled' ? '#next' : '#pmiNumber' } };
        if (("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) {
            if (document.getElementById('next').getAttribute('disabled') === 'disabled') {
                let unchecked = [...document.querySelectorAll('#countiesTable td>input.form-check-input')].filter((e) => e.getAttribute('checked') !== "checked")
                if (unchecked.length > 0) {
                    unchecked.forEach((e) => e.classList.add('required-field'))
                    focusEle = '#' + unchecked[0].id
                } else { focusEle = '#addccap' }
            }
            else { focusEle = '#next' }
        }
        if (("ClientSearch.htm").includes(thisPageNameHtm)) { document.querySelector('#clientSearchTable>tbody>tr>td.dataTables_empty') && (focusEle = '#ssnReq') }
        if (("ProviderSearch.htm").includes(thisPageNameHtm)) { document.querySelector('#providerSearchTable>tbody>tr>td.dataTables_empty') && (focusEle = '#providerIdNumber') }
        //
        if (("ServicingAgencyIncomingTransfers.htm").includes(thisPageNameHtm) && !notEditMode) { focusEle = '#workerIdTo' }

    } catch (error) { console.trace("eleFocus section", error) }
}
// ////////////////////////////////////////////////////////////////////////// FOCUS_ELEMENT SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ==============================================================================================================================================================================================

// SECTION_START Footer_links
if (!iFramed) { // SECTION_START Footer_links
    try {
        const additionalFooterLinks = [
            ["https://www.mnworkforceone.com/", "_blank", "WF1"],
            ["https://owa.dhssir.cty.dhs.state.mn.us/owa/", "_blank", "SIR Mail"],
            ["https://policyquest.dhs.state.mn.us/", "_blank", "PolicyQuest"],
            ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/ccforms/TSS_PMI_Merge_Request.aspx", "_blank", "PMI Merge"],
            ["https://moms.mn.gov/", "_blank", "MOMS"],
            ["https://smi.dhs.state.mn.us/", "_blank", "SMI"],
            ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/MMR/TSS_General_Request.asp", "_blank", "Help Desk"],
        ]
        function getFooterLinks() {
            let footerLinks = ""
            let separatorSpan = '<span class="footer">ı</span>'
            for (let link in additionalFooterLinks) {
                let linkArray = additionalFooterLinks[link]
                footerLinks += separatorSpan + '<a href="' + linkArray[0] + '" target="' + linkArray[1] + '">' + linkArray[2] + '</a>'
            }
            return footerLinks
        }
        document.querySelector('#contactInformation').textContent = "Help Info"
        document.querySelector('#footer_links>a[href="https://bi.dhs.state.mn.us/BOE/BI"]').textContent = 'BOBI'
        $('#footer_links>a[href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=mecc-0002"]')
            .text('Incomplete User Manual')
            .after('<span class="footer">ı</span><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_139409" target="_blank">Old User Manual</a>')
            .attr('href', 'https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=MECC-0001')
        document.getElementById('contactInformation').insertAdjacentHTML('afterend', getFooterLinks())
        $('#footer_links').contents().filter(function() { return this.nodeType === 3 && this.length > 2 }).replaceWith('<span class="footer">ı</span>') // replace with treeWalker?
    }
    catch (error) { console.trace(error) }
} // SECTION_END Footer_links

// ======================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// SECTION_START Active_Case_List
if (("ActiveCaseList.htm").includes(thisPageNameHtm) && document.querySelector('#activeCaseTable > tbody > tr:nth-child(2)')) {
    // query idea: CaseEditSummary, inhibiting errors. Object.case#.0.editType ("Warning Error", "Inhibiting Error"), .currentPeriod/.selectPeriod/.selectPeriodSelected (all have the same BWP)
    listPageLinksAndList()
    let aclTbody = document.querySelector('tbody')
    if (document.getElementById('caseResultsData')) {
        let caseListSelectOptionsArray = ["Homeless", "Redet/Suspend", "Subprogram", "Residence", "Job Search Hours", "Self-Employment", "Check Reporter Type"]
        let caseListSelect = "<select class='form-control' style='width: fit-content;' id='caseListSelected'>" + caseListSelectOptionsHTML() + "</select>"
        let afterResults = '<div id="afterResults" style="display: inline-flex; gap: 5px;"> ' + caseListSelect + ' <button type="button" id="getCaseDataPointButton" class="cButton" type="button">Get Selected Data</button><button type="button" id="exportLoadedData" class="cButton" type="button" disabled="disabled">Copy Excel Data</button></div>'
        document.getElementById('caseResultsData').insertAdjacentHTML('afterend', afterResults)
        function caseListSelectOptionsHTML() {
            let caseListSelectOptions = "<option value></option>"
            for (let i = 0; i < caseListSelectOptionsArray.length; i++) {
                caseListSelectOptions += '<option value="' + caseListSelectOptionsArray[i] + '" id="' + caseListSelectOptionsArray[i] + '">' + caseListSelectOptionsArray[i] + '</option>'
            }
            return caseListSelectOptions
        }
        document.querySelectorAll('tr').forEach((e) => {
            let caseStatus = e.querySelector('td:nth-child(3)').textContent
            let childNode = e.childNodes[4]
            switch (caseStatus) {
                case "Active":
                    e.classList.add('active')
                   childNode.classList.add('active')
                    // e.querySelector('td:nth-child(5)').classList.add('active')
                    break
                case "Suspended":
                    e.classList.add('suspended')
                    childNode.classList.add('suspended')
                    // e.querySelector('td:nth-child(5)').classList.add('suspended')
                    break
                case "Reinstated":
                    e.classList.add('reinstated')
                    childNode.classList.add('reinstated')
                    // e.querySelector('td:nth-child(5)').classList.add('reinstated')
                    break
                case "Temporarily Ineligible":
                    e.classList.add('tempinelig')
                    childNode.classList.add('tempinelig')
                    // e.querySelector('td:nth-child(5)').classList.add('tempinelig')
                    break
            }
        })
        let reinstatedCaseLength = document.querySelectorAll('tr.reinstated').length
        let reinstatedCases = reinstatedCaseLength > 0 ? reinstatedCaseLength + " reinstated but not approved." : ""
        let activeCaseLength = document.querySelectorAll('tr.active').length
        let suspendedCaseLength = document.querySelectorAll('tr.suspended').length
        let tempIneligCaseLength = document.querySelectorAll('tr.tempinelig').length
        document.querySelector('h5').insertAdjacentHTML('beforeend', " " + [activeCaseLength, "active,", suspendedCaseLength, "suspended,", tempIneligCaseLength, "temp inelig. "].join(" ") + reinstatedCases)
        document.querySelector('h5').addEventListener('click', function() {
            let copyText = [activeCaseLength, suspendedCaseLength + tempIneligCaseLength].join('\n')
            navigator.clipboard.writeText(copyText)
            snackBar(copyText)
        })
        let caseListSelected = document.getElementById('caseListSelected')
        const caseListArray = Array.from(document.querySelectorAll('tbody > tr'), (caseNumber) => caseNumber.id)
        const caseListArraySlice = caseListArray.slice(20, 30)
        // const testArray = ["2618988", "1755426", "1774242"]
        let outputDataObj = {}
        // let evalResults = ""
        async function checkResidence() {
            forAwaitMultiCaseEval(caseListArray, "CaseAddress").then(function(result) {
                for (let caseNum in result) {
                    let residenceCity = toTitleCase(result[caseNum][0][0].residenceCity)
                    let mailingCity = result[caseNum][0][0].mailingCity?.length ? " / " + toTitleCase(result[caseNum][0][0].mailingCity) : ''
                    let tRowTd = document.getElementById(caseNum).childNodes[1]
                    // let tRowTd = document.getElementById(caseNum).querySelector('td:nth-child(2)')
                    tRowTd.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan tableAmend">(' + residenceCity + mailingCity + ')</span>')
                }
            })
        }
        async function checkReporterType() {
            const caseListArrayActive = Array.from([...document.querySelectorAll('#activeCaseTable > tbody > tr')].filter((e) => e.childNodes[2].innerText === "Active"), caseNumber => caseNumber.id)
            forAwaitMultiCaseEval(caseListArrayActive, "CaseChildProvider").then(function(result) {
                for (let caseNum in result) {
                    reporterTypeLoop:
                    for (let row in result[caseNum][0]) {
                        if (result[caseNum][0][row].reporterType === "Schedule Reporter") {
                            let targetTd = document.getElementById(caseNum).childNodes[2]
                            let addedText = "Sched"
                            if (result[caseNum][0][row].reporterTypeSelectionArray.includes('LNL Provider Used')) { addedText += ", LNL" }
                            else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Employee - DHS Licensed Child Care Cntr')) { addedText += ", Emp" }
                            else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Multiple Providers Per Child')) { addedText += ", 2+" }
                            targetTd.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan tableAmend red-text" style="font-stretch: condensed;">' + addedText + '</span>')
                            break reporterTypeLoop
                        }
                    }
                }
            })
        }
        async function checkSupportActivityJS() {
            forAwaitMultiCaseEval(caseListArray, "CaseSupportActivity").then(function(result) { //result[caseNum].0.0.originalHoursPerWeek //object.table.row.data
                for (let caseNum in result) {
                    for (let row in result[caseNum][0]) {
                        let jobSearchHours = Number(result[caseNum][0][row].originalHoursPerWeek)
                        if (jobSearchHours > 0) {
                            let targetTd = document.getElementById(caseNum).childNodes[3]
                            // let targetTd = document.getElementById(caseNum).querySelector('td:nth-child(4)')
                            if (targetTd.childNodes?.length === 1) {
                                targetTd.insertAdjacentHTML('beforeend', '<span class="tableAmend">JS:</span>')
                            }
                            let activeButOneHour = (document.getElementById(caseNum).querySelector('td:nth-child(3)').textContent.indexOf('Active') > -1 && jobSearchHours < 10) ? " font-weight: bold; color: var(--redErrorText);" : ""
                            let output = "<span class='ACLaddedSpan' style='margin-left: 5px;" + activeButOneHour + "'>M" + result[caseNum][0][row].memberReferenceNumber + ": " + jobSearchHours + "</span>"
                            targetTd.insertAdjacentHTML('beforeend', output)
                        }
                    }
                }
            })
        }
        async function checkSelfEmployment() {
            forAwaitMultiCaseEval(caseListArray, "CaseEmploymentActivity").then(function(result) { //result[caseNum][0][0].employmentActivityDescription //objectGroup[object][table][row].data
                for (let caseNum in result) {
                    selfEmployLoop:
                    for (let row in result[caseNum][0]) {
                        let selfEmployActivity = result[caseNum][0][row].employmentActivityDescription
                        if (selfEmployActivity === "Self-employment") {
                            let targetTd = document.getElementById(caseNum).querySelector('td:nth-child(4)')
                            let output = "<span class='ACLaddedSpan' style='margin-left: 10px;'>Has self-employment</span>"
                            targetTd.insertAdjacentHTML('beforeend', output)
                            break selfEmployLoop
                        }
                    }
                }
            })
        }
        async function checkSubprogram() {
            const subprogramMap = new Map([
                ["Transition Year", "TY"],
                ["Transition Year Extension", "TYE"],
                ["MFIP/DWP", "CCMF"],
                ["Basic Sliding Fee", "BSF"],
                ["Child Care Assistance", "???"]
            ])
            forAwaitMultiCaseEval(caseListArray, "CaseOverview").then(function(result) {
                const filteredResult = {}
                for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] }
                for (let caseNum in filteredResult) {
                    for (let program in filteredResult[caseNum]) {
                        if (filteredResult[caseNum][program].programNameHistory === "MFIP") {
                            let mfipDate = filteredResult[caseNum][program].programBeginDateHistory
                            let mfipDateDiff = dateDiffInDays(mfipDate)
                            let mfipStatus = filteredResult[caseNum][program].programStatusHistory
                            let subprogram = filteredResult[caseNum][0].programNameHistory
                            let tRowTd = document.getElementById(caseNum).querySelector('td:nth-child(4)')
                            let mappedSubprogram = subprogramMap.get(tRowTd.textContent)
                            if ((subprogram === "CCMF" && mfipStatus !== "Active") || (mfipStatus === "Active" && subprogram !== "CCMF")) {
                                (mfipDateDiff > 30 && mfipDateDiff < 360) && (tRowTd.textContent = mappedSubprogram + " (MFIP: " + mfipStatus + " - " + mfipDate + ")")
                            }
                        }
                    }
                }
            })
        }
        async function redetTbodyEvent(eventSpan) {
            document.getElementById('footer_links').insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="height: 400px;"><iframe id="redetiframe" name="redetiframe" style="width: 100%; height: 100%;"></iframe></div>')
            let redetiframe = document.getElementById('redetiframe')
            let iframeContainer = document.getElementById('iframeContainer')
            // let eventSpanId = eventSpan.closest('tr').id
            // let eventDelayDate = eventSpan.dataset.delayDate
            let delayDateObj = JSON.stringify({ id: eventSpan.closest('tr').id, delayDate: eventSpan.dataset.delayDate })
            sessionStorage.setItem('MECH2.suspendPlus45', delayDateObj)
            delayRedetDate(eventSpan, eventSpan.closest('tr').id, redetiframe).then((eventSpan) => {
                window.onstorage = null
                sessionStorage.removeItem('MECH2.suspendPlus45')
                iframeContainer.remove()
                eventSpan.classList.remove('cSpan')
                thankYouForWaiting()
            })
        }
        async function delayRedetDate(eventSpan, tRowId, redetiframe) {
            return new Promise((resolve) => {
                pleaseWait()
                window.onstorage = (event) => {
                    if (event.key === 'MECH2.suspendPlus45' && event.newValue === null) {
                        resolve(eventSpan)
                    }
                }
                redetiframe.src = "/ChildCare/CaseRedetermination.htm?parm2=" + tRowId
            })
        }
        async function redetDateVsSuspendDate() {
            aclTbody.addEventListener('click', (event) => { if (event.target.className.indexOf("cSpan") > -1) { redetTbodyEvent(event.target) } })
            let suspendedTrs = document.querySelectorAll('tr.suspended')
            suspendedTrs.forEach((e) => {
                let tdSuspendedData = e.querySelector('td:nth-child(5)')
                tdSuspendedData.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan" class="tableAmend"></span>')
                tdSuspendedData.classList.add('suspendedDate')
            })
            const today = new Date().setHours(0)
            const suspendedCaseListArray = Array.from(suspendedTrs, (caseNumber) => caseNumber.id)
            for (let [index, caseNum] of suspendedCaseListArray.entries()) {
                let tRowTd = document.getElementById(caseNum).querySelector('td:nth-child(5)')
                let redetDate = tRowTd.textContent
                if (dateDiffInDays(today, redetDate) < 46) {
                    tRowTd.querySelector('span').textContent = "Mailed"
                    suspendedCaseListArray.splice(index, 1)
                }
            }
            forAwaitMultiCaseEval(suspendedCaseListArray, "CaseOverview").then(function(result) {
                function getOneYearSuspended(history) {
                    for (let change in history) {
                        if (history[change].programStatusHistory === "Suspend" && history[0].programApplDateHistory === history[change].programBeginDateHistory) {
                            return history[change].programBeginDateHistory
                        } else if (history[change].programStatusHistory === "Active" && new Date(history[0].programApplDateHistory).setHours(0) < new Date(history[change].programBeginDateHistory).setHours(0)) {
                            return history[change - 1].programBeginDateHistory
                        }
                    }
                    return undefined
                }
                for (let caseNum in result) {
                    let history = result[caseNum][0]
                    let caseStatus = history[0].programStatusHistory
                    let tRowTd = document.getElementById(caseNum).querySelector('td.suspended')
                    let tRowTdSpan = tRowTd.querySelector('span')
                    let redetDate = tRowTd.textContent
                    if (caseStatus === "Inactive") {
                        tRowTdSpan.textContent = "Closing"
                    } else {
                        let today = new Date()
                        let redetToTodayDiff = dateDiffInDays(redetDate, today)
                        if (redetToTodayDiff > 180) { continue }
                        let suspendDate = getOneYearSuspended(history)
                        let suspendToRedetDiff = dateDiffInDays(redetDate, suspendDate)
                        if (suspendToRedetDiff > 334 && suspendToRedetDiff < 450) {
                            let redetPlus45 = formatDate(addDays(redetDate, 45), "mmddyyyy")
                            tRowTdSpan.classList.add('cSpan')
                            tRowTdSpan.textContent = suspendToRedetDiff + " days"
                            tRowTdSpan.dataset.delayDate = redetPlus45
                        }
                    }
                }
            })
        }
        async function isHomelessStart() {
            forAwaitMultiCaseEval(caseListArray, "CaseOverview").then(function(result) {
                // forAwaitMultiCaseEval(testArray, "CaseOverview").then(function(result) {
                const filteredResult = {}
                for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] } // evalTable 1
                const homelessResults = { No: [], Yes: [] }
                for (let caseNum in filteredResult) {
                    let singleResult = isHomelessCheck(filteredResult[caseNum], caseNum)
                    typeof(singleResult) !== "object" || singleResult[1] === "No" ? homelessResults.No.push(singleResult) : homelessResults.Yes.push(singleResult)
                }
                let caseListSelectedValue = caseListSelected.value
                storeData(homelessResults)
                return // evalResults
            })
        }
        function isHomelessCheck(evalObjSingleCase, caseNum) {
            for (let item in evalObjSingleCase) {
                for (let i = 0; i < evalObjSingleCase.length; i++) {
                    if (evalObjSingleCase[i].programHomelessIndicator === "Yes") {
                        return i > 0 ? [caseNum, "Prior", "Current Status:", evalObjSingleCase[0].programStatusHistory, "Effective:", isHomelessNextStatusDate(evalObjSingleCase, i)] : [caseNum, "Current"]
                    }
                }
                return [caseNum, "No"]
            }
        }
        function isHomelessNextStatusDate(evalObjSingleCase, i) {
            for (let j = i + 1; j !== 0; j--) {
                if (evalObjSingleCase[j - 1].programHomelessIndicator === "No") { return evalObjSingleCase[j - 1].programBeginDateHistory }
            }
        }
        document.getElementById('getCaseDataPointButton').addEventListener('click', async function() {
            // aclTbody.removeEventListener('click', functionName)
            switch (caseListSelected.value) {
                case "Homeless": {
                    await isHomelessStart()
                    break
                }
                case "Redet/Suspend": {
                    await redetDateVsSuspendDate()
                    break
                }
                case "Subprogram": {
                    await checkSubprogram()
                    break
                }
                case "Residence": {
                    await checkResidence()
                    break
                }
                case "Job Search Hours": {
                    await checkSupportActivityJS()
                    break
                }
                case "Self-Employment": {
                    await checkSelfEmployment()
                    break
                }
                case "Check Reporter Type": {
                    await checkReporterType()
                    break
                }
                // case "ThingToLookUp": {
                //     await functionIjustMadeUp()
                //     break
                // }
            }
        })
        function storeData(evalData) {
            !Object.hasOwn(outputDataObj, [caseListSelected.value]) && (outputDataObj[caseListSelected.value] = {})
            outputDataObj[caseListSelected.value][document.getElementById('activeCaseSearchWorkerId').value] = evalData
            sessionStorage.setItem("outputDataObjSS", JSON.stringify(outputDataObj))
            document.getElementById('exportLoadedData').removeAttribute('disabled')
        }
        function excelifyData(evalData) {
            let excelData = JSON.stringify(evalData)
            let excelifiedData = excelData
                .replace(/\{/, "")
                .replace(/"/g, "")
                .replace(/(X[A-Za-z0-9]{6}:)/g, "\n\t$1\n\t\t")
                .replace(/\[\[|\],\[/g, "\n\t\t\t")
                .replace(/\]\],/g, "\n\t\t")
                .replace(/\},|\]|\{|\}/g, "")
                .replace(/,/g, "\t")
            return excelifiedData
        }
        caseListSelected.addEventListener('change', function(e) {
            let outputImport = JSON.parse(sessionStorage.getItem("outputDataObjSS"))
            outputDataObj = outputImport ?? {}
            Object.hasOwn(outputDataObj, [e.target.value]) ? document.getElementById('exportLoadedData').removeAttribute('disabled') : document.getElementById('exportLoadedData').setAttribute('disabled', 'disabled')
        })
        document.getElementById('exportLoadedData').addEventListener('click', function() {
            navigator.clipboard.writeText(excelifyData(outputDataObj))
            snackBar("Excel Data")
        })
    }
}; // SECTION_END Active_Case_List

// =================================================================================================================================================================================================
// /////////////////////////////////////////////////////////////////////// Alerts ("Alerts.htm") (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\alertTotal
if ("/Alerts.htm".includes(slashThisPageNameHtm)) {
    // document.querySelectorAll('#caseOrProviderAlertsTable > tbody > tr').forEach((e) => { e.id = e.childNodes[2].textContent }) // This doesn't persist after deleting alerts. Table is replaced with non marked rows.
    function checkIfMfip() {
        let alertsTable = document.querySelector('table#caseOrProviderAlertsTable > tbody')
        evalData().then(async function(tableTwoAlerts) {
            tableTwoAlerts[1].forEach((checkAlert) => {
                if (checkAlert.message.indexOf("Approve new") === 0) {
                    let rowIndexPlusOne = Number(checkAlert.rowIndex)+1
                    alertsTable.querySelector('tr:nth-child(' + rowIndexPlusOne + ')').id = checkAlert.caseNumber
                    document.getElementById(checkAlert.caseNumber).classList.add('checkCash')
                }
            })
            const checkCashArray = Array.from(document.querySelectorAll('.checkCash'), (caseNumber) => caseNumber.id)
            forAwaitMultiCaseEval(checkCashArray, "CaseOverview").then(function(multiCaseResult) {
                console.log(multiCaseResult)
                for (let singleCase in multiCaseResult) {
                    let programTable = multiCaseResult[singleCase][0]
                    for (let i = 0; i < programTable.length; i++) {
                        if (programTable[i].programNameHistory === "MFIP") {
                            let mfipStatus = 'MFIP: ' + programTable[i].programStatusHistory
                            let ccapStatus = ' - CCAP: ' + programTable[0].programNameHistory
                            let inactiveDate = programTable[i].programStatusHistory === "Inactive" ? ' ' + programTable[i].programBeginDateHistory.replace(/20(\d\d)/, '$1').replace(/0(\d)/g, '$1') : ''
                            document.getElementById(singleCase).querySelector('td:nth-child(2)').insertAdjacentHTML('beforeend', '<span style="margin: 0 10px 0 auto; float: right !important; font-size: small;">' + mfipStatus + inactiveDate + ccapStatus +'</span>')
                        }
                    }
                }
            })
        })
    }
    // checkIfMfip()
    let deleteButton = document.getElementById('delete')
    let inputEffectiveDate = document.getElementById('inputEffectiveDate')
    doWrap(inputEffectiveDate)
    addDateControls("#inputEffectiveDate")
    let caseOrProviderAlertsTable = document.getElementById('caseOrProviderAlertsTable')
    let $caseOrProviderAlertsTableTbody = $('#caseOrProviderAlertsTable > tbody')
    let caseOrProviderAlertsTableTbody = document.querySelector('#caseOrProviderAlertsTable > tbody')
    let preWorkerAlertCaseSS = sessionStorage.getItem('MECH2.preWorkerAlertCase')
    document.getElementById('new').addEventListener('click', function() { sessionStorage.setItem('MECH2.preWorkerAlertCase', document.getElementById("groupId").value) })
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
    setTimeout(function() {
        if (Number(document.getElementById('alertTotal').value) && caseOrProviderAlertsTableTbody.querySelector('td.dataTables_empty')) { doClick(document.getElementById('alertInputSubmit') ) }
        // if (Number(document.getElementById('alertTotal').value) && caseOrProviderAlertsTable.querySelectorAll('td.dataTables_empty').length) { document.getElementById('alertInputSubmit').click() }
        else if (preWorkerAlertCaseSS && caseOrProviderAlertsTableTbody.childNodes.length > 1) {
            let preWorkerCase = [...caseOrProviderAlertsTableTbody.querySelectorAll('tr > td:nth-child(3)')].filter((ele) => ele.innerText.includes(preWorkerAlertCaseSS) )
            if (preWorkerCase?.length) {
                preWorkerCase = preWorkerCase[0].parentElement
                doClick(preWorkerCase)
                preWorkerCase.scrollIntoView({ behavior: "smooth", block: "center" })
            }
            // $('td:nth-child(3):contains(' + preWorkerAlertCase + ')', $caseOrProviderAlertsTableTbody).parent('tr').attr('id', 'preWorkerAlertCase')
            // let activeCase = document.getElementById('preWorkerAlertCase')
            // doClick(activeCase)
            // activeCase.click()
            // activeCase.scrollIntoView({ behavior: "smooth", block: "center" })
            sessionStorage.removeItem('MECH2.preWorkerAlertCase')
        }
    }, 300)
    deleteButton.insertAdjacentElement('afterend', document.getElementById('new'))
    document.getElementById('alertTotal').insertAdjacentHTML('afterend', `
        <button type="button" class="form-button centered-text" id="deleteTop">Delete Alert</button>
        <button type="button" class="form-button centered-text doNotDupe" id="deleteAll" title="Delete All" value="Delete All">Delete All</button>
        <button type="button" class="form-button centered-text doNotDupe hidden" id="stopDeleteAll" title="Stop Deleting" value="Stop Deleting">Deleting...</button>
    `)
    document.getElementById('deleteTop').addEventListener('click', function() { $('#delete').click() }) // don't change from jQuery or it won't 'hide' undeleteable alerts.

    // SECTION_START Delete all alerts of current name onclick
    let oCaseDetails = {}
    let vNumberToDelete
    let vCaseName
    let vCaseOrProvider
    let vCaseNumberOrProviderId
    function whatAlertType() {
        switch ($('>tr.selected>td:eq(0)', $caseOrProviderAlertsTableTbody).html().toLowerCase()) {
            case "case":
                return { page: "CaseNotes.htm", type: "Case", number: document.getElementById('caseNumber').value, name: $(''), parameters: fGetCaseParameters() }
                break
            case "provider":
                return { page: "ProviderNotes.htm", type: "Provider", number: document.getElementById('providerId').value, parameters: fGetProviderParameters() }
                break
            default:
                break
        }
    }
    // document.getElementById('deleteTop').insertAdjacentHTML('afterend', ``);
    $('h4:contains("Case/Provider List")')
        .wrap('<div>')
        .after('<h4 style="float: right; display:inline-flex color: #003865; font-size: 1.2em; font-weight: bold;" id="alertMessage"></h4>');
    let vDeleteAllButton = document.getElementById('deleteAll')
    let vHaltDeleting
    const observerDelete = new MutationObserver(e => { fDoDeleteAll() })
    document.getElementById('deleteAll').addEventListener("click", function(button) {
        oCaseDetails = whatAlertType()
        vCaseOrProvider = oCaseDetails.type
        if (!["case", "provider"].includes(vCaseOrProvider.toLowerCase())) { return }
        vNumberToDelete = oCaseDetails.number
        vCaseName = document.getElementById('groupName').value//name on page
        observerDelete.observe(document.getElementById('delete'), { attributeFilter: ['value'] })
        document.querySelectorAll('#deleteAll, #stopDeleteAll').forEach((e) => e.classList.toggle('hidden') )
        fDoDeleteAll()
    })
    $('#stopDeleteAll').on("click", function (button) {
        vHaltDeleting = 1
    })
    function fDoDeleteAll(e) {//Test worker ID PWSCSP9
        let deleteButton = document.getElementById('delete')
        if (deleteButton.value !== "Please wait") {
            if (!vHaltDeleting) {
                let thisCasesAlertNumber = [...document.querySelectorAll('#caseOrProviderAlertsTable > tbody > tr > td:nth-child(2)')].filter( (e) => e.innerText === vCaseName )[0]?.nextElementSibling?.nextElementSibling?.innerText
                if (deleteButton.value === "Delete Alert" && document.querySelector('#caseNumber, #providerId').value === oCaseDetails.number && vNumberToDelete === document.getElementById('groupId').value && thisCasesAlertNumber > 0) {
                // if (deleteButton.value === "Delete Alert" && document.querySelector('#caseNumber, #providerId').value === oCaseDetails.number && vNumberToDelete === document.getElementById('groupId').value && $('#caseOrProviderAlertsTable td:contains("' + vCaseName + '")').nextAll().eq(1).html() > 0) {
                    //if (deleteButton.getAttribute('disabled') === disabled) { deleteButton.removeAttribute('disabled') }
                    //doClick(deleteButton)
                    $('#delete').click(); // don't change from jQuery or undeletable alerts can't be deleted
                } else {
                    fDoDeleteAllCheck()
                }
            } else if (vHaltDeleting) {
                document.querySelectorAll('#deleteAll, #stopDeleteAll').forEach((e) => e.classList.toggle('hidden') )
                observerDelete.disconnect()
                vHaltDeleting = 0
            }
        }
    }
    function fDoDeleteAllCheck() {
        if (document.getElementById('delete').value === "Please wait") { return }
        let caseProviderRow = [...document.querySelectorAll('#caseOrProviderAlertsTable > tbody > tr > td:nth-child(2)')].filter((ele) => ele.innerText.includes(vCaseName) )[0]
        if (!caseProviderRow) {
            switch (vCaseOrProvider) {
                case "case":
                    $('#alertMessage').text('Case number not present.')
                    break
                case "provider":
                    $('#alertMessage').text('Provider ID not present.')
                    break
                default:
                    break
            }
            return
        }
        caseProviderRow = caseProviderRow.parentElement
        if ( vNumberToDelete !== document.querySelector('#caseNumber, #providerId').value ) {
            if (!$('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')')) {
                switch (vCaseOrProvider) {
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
        if (caseProviderRow.childNodes[3].innerText > 0) {
            doClick(caseProviderRow)
            setTimeout(function() { return fDoDeleteAll() }, 100)
        }
        // if ($('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').nextAll().eq(1).html() > 0) {
        //     $('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').parent('tr').click()
        //     setTimeout(function() { return fDoDeleteAll() }, 100)
        // }
        else { $('#alertMessage').text('Delete All ended. All alerts deleted from ' + vCaseOrProvider + ' ' + vNumberToDelete + '.') }
        document.querySelectorAll('#deleteAll, #stopDeleteAll').forEach((e) => e.classList.toggle('hidden') )
        observerDelete.disconnect()
    };
    // SECTION_END Delete all alerts of current name onclick



//     let deleteButton = document.getElementById('delete')
//     addDateControls("#inputEffectiveDate")
//     let caseOrProviderAlertsTable = document.getElementById('caseOrProviderAlertsTable')
//     let $caseOrProviderAlertsTableTbody = $('#caseOrProviderAlertsTable > tbody')
//     let preWorkerAlertCase = sessionStorage.getItem('MECH2.preWorkerAlertCase')
//     document.getElementById('new').addEventListener('click', function() { sessionStorage.setItem('MECH2.preWorkerAlertCase', document.getElementById("groupId").value) })
//     if (localStorage.getItem('MECH2.userName') === null || localStorage.getItem('MECH2.userName') === undefined && document.referrer === "https://mec2.childcare.dhs.state.mn.us/ChildCare/Welcome.htm") {
//         let userNameObserver = new TrackedMutationObserver(function(mutations) {
//             mutations.forEach((mutation) => {
//                 let workerName = mutation.target.value
//                 workerName = reorderCommaName(workerName)
//                 let truncatedWorkerName = workerName.replace(/(\s\w)\w+/, '$1')
//                 localStorage.setItem('MECH2.userName', truncatedWorkerName)
//                 userNameObserver.disconnect()
//             })
//         })
//         const workerName = document.getElementById('workerName')
//         userNameObserver.observe(workerName, { attributeFilter: ["tabindex"] })
//     }
//     setTimeout(function() {
//         if (Number(document.getElementById('alertTotal').value) && caseOrProviderAlertsTable.querySelectorAll('td.dataTables_empty').length) { document.getElementById('alertInputSubmit').click() }
//         else if (preWorkerAlertCase?.length && caseOrProviderAlertsTable.querySelectorAll('tr')?.length > 1) {
//             $('td:nth-child(3):contains(' + preWorkerAlertCase + ')', $caseOrProviderAlertsTableTbody).parent('tr').attr('id', 'preWorkerAlertCase')
//             let activeCase = document.getElementById('preWorkerAlertCase')
//             activeCase.click()
//             activeCase.scrollIntoView({ behavior: "smooth", block: "center" })
//             sessionStorage.removeItem('MECH2.preWorkerAlertCase')
//         }
//     }, 300)
//     function checkIfMfip() {
//         let alertsTable = document.querySelector('table#caseOrProviderAlertsTable > tbody')
//         evalData().then(async function(tableTwoAlerts) {
//             tableTwoAlerts[1].forEach((checkAlert) => {
//                 if (checkAlert.message.indexOf("Approve new") === 0) {
//                     let rowIndexPlusOne = Number(checkAlert.rowIndex)+1
//                     alertsTable.querySelector('tr:nth-child(' + rowIndexPlusOne + ')').id = checkAlert.caseNumber
//                     document.getElementById(checkAlert.caseNumber).classList.add('checkCash')
//                 }
//             })
//             const checkCashArray = Array.from(document.querySelectorAll('.checkCash'), (caseNumber) => caseNumber.id)
//             forAwaitMultiCaseEval(checkCashArray, "CaseOverview").then(function(multiCaseResult) {
//                 console.log(multiCaseResult)
//                 for (let singleCase in multiCaseResult) {
//                     let programTable = multiCaseResult[singleCase][0]
//                     for (let i = 0; i < programTable.length; i++) {
//                         if (programTable[i].programNameHistory === "MFIP") {
//                             let mfipStatus = 'MFIP: ' + programTable[i].programStatusHistory
//                             let ccapStatus = ' - CCAP: ' + programTable[0].programNameHistory
//                             let inactiveDate = programTable[i].programStatusHistory === "Inactive" ? ' ' + programTable[i].programBeginDateHistory.replace(/20(\d\d)/, '$1').replace(/0(\d)/g, '$1') : ''
//                             document.getElementById(singleCase).querySelector('td:nth-child(2)').insertAdjacentHTML('beforeend', '<span style="margin: 0 10px 0 auto; float: right !important; font-size: small;">' + mfipStatus + inactiveDate + ccapStatus +'</span>')
//                         }
//                     }
//                 }
//             })
//         })
//     }
//     // checkIfMfip()
//     deleteButton.insertAdjacentElement('afterend', document.getElementById('new'))
//     document.getElementById('alertTotal').insertAdjacentHTML('afterend', '<button type="button" class="form-button centered-text" id="deleteTop">Delete Alert</button>')
//     document.getElementById('deleteTop').addEventListener('click', function() { $('#delete').click() })

//     // SECTION_START Delete all alerts of current name onclick
//     let oCaseDetails = {}
//     let vNumberToDelete
//     let vCaseName
//     let vCaseOrProvider
//     let vCaseNumberOrProviderId
//     function whatAlertType() {
//         switch ($('>tr.selected>td:eq(0)', $caseOrProviderAlertsTableTbody).html().toLowerCase()) {
//             case "case":
//                 return { page: "CaseNotes.htm", type: "Case", number: document.getElementById('caseNumber').value, name: $(''), parameters: fGetCaseParameters() }
//                 break
//             case "provider":
//                 return { page: "ProviderNotes.htm", type: "Provider", number: document.getElementById('providerId').value, parameters: fGetProviderParameters() }
//                 break
//             default:
//                 break
//         }
//     }
//     document.getElementById('deleteTop').insertAdjacentHTML('afterend', '<button type="button" class="form-button centered-text doNotDupe" id="deleteAll" title="Delete All" value="Delete All">Delete All</button><button type="button" class="form-button centered-text doNotDupe hidden" id="stopDeleteAll" title="Stop Deleting" value="Stop Deleting">Deleting...</button>');
//     $('h4:contains("Case/Provider List")')
//         .wrap('<div>')
//         .after('<h4 style="float: right; display:inline-flex color: #003865; font-size: 1.2em; font-weight: bold;" id="alertMessage"></h4>');
//     // $('#alertsPanelData>div.panel-default').addClass('flex-vertical')
//     let vDeleteAllButton = document.getElementById('deleteAll')
//     let vHaltDeleting
//     const observerDelete = new TrackedMutationObserver(e => { fDoDeleteAll() })
//     document.getElementById('deleteAll').addEventListener("click", function(button) {
//         oCaseDetails = whatAlertType()
//         vCaseOrProvider = oCaseDetails.type
//         if (!["case", "provider"].includes(vCaseOrProvider.toLowerCase())) { return }
//         vNumberToDelete = oCaseDetails.number
//         vCaseName = document.getElementById('groupName').value//name on page
//         observerDelete.observe(document.getElementById('delete'), { attributeFilter: ['value'] })
//         document.querySelectorAll('#deleteAll, #stopDeleteAll').forEach((e) => e.classList.toggle('hidden') )
//         fDoDeleteAll()
//     })
//     document.getElementById('stopDeleteAll').addEventListener("click", function(button) {
//         vHaltDeleting = 1
//     })
//     function fDoDeleteAll(e) {//Test worker ID PWSCSP9
//         if (document.getElementById('delete').value !== "Please wait") {
//             if (!vHaltDeleting) {
//                 if (document.getElementById('delete').value === "Delete Alert" && document.querySelector('#caseNumber, #providerId').value === oCaseDetails.number && vNumberToDelete === document.getElementById('groupId').value && $('#caseOrProviderAlertsTable td:contains("' + vCaseName + '")').nextAll().eq(1).html() > 0) {
//                     document.getElementById('delete').click();
//                 } else {
//                     fDoDeleteAllCheck()
//                 }
//             } else if (vHaltDeleting) {
//                 document.querySelectorAll('#deleteAll, #stopDeleteAll').forEach((e) => e.classList.toggle('hidden') )
//                 observerDelete.disconnect()
//                 vHaltDeleting = 0
//             }
//         }
//     }
//     function fDoDeleteAllCheck() {
//         if ($('#delete').val() === "Please wait") { return }
//         if ($('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').nextAll().eq(1).html() > 0) {
//             $('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')').parent('tr').click()
//             setTimeout(function() { return fDoDeleteAll() }, 100)
//         }
//         if ($('#caseOrProviderAlertsTable td:contains("' + vCaseName + '")').nextAll().eq(1).html() < 1) {//Any alerts to delete?
//             $('#alertMessage').text('Delete All ended. All alerts deleted from ' + vCaseOrProvider + ' ' + vNumberToDelete + '.');
//         } else if (vNumberToDelete !== $('#caseNumber, #providerId').val()) {
//             if (!$('#caseOrProviderAlertsTable td:contains(' + vCaseName + ')')) {
//                 switch (vCaseOrProvider) {
//                     case "case":
//                         $('#alertMessage').text('Case number not present.')
//                         break
//                     case "provider":
//                         $('#alertMessage').text('Provider ID not present.')
//                         break
//                     default:
//                         break
//                 }
//             };
//         };
//         $('#deleteAll, #stopDeleteAll').toggleClass('hidden')
//         observerDelete.disconnect()
//     };
//     // SECTION_END Delete all alerts of current name onclick

    // SECTION_START Do action based on Alert Type
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
        // ["", ""],
    ]
    const aProviderCategoryButtons = [
        ["Address", "ProviderAddress"],
        ["Alias", "ProviderAlias"],
        ["Info", "ProviderInformation"],
        ["Notices", "ProviderNotices"],
        ["Overview", "ProviderOverview"],
        ["Rates", "ProviderRates"],
        ["Registration", "ProviderRegistrationAndRenewal"],
        // ["", ""],
    ]
    deleteButton.parentNode.insertAdjacentHTML('beforeend', '<div id="baseCategoryButtonsDiv" class="form-group-no-margins"><div id="caseCategoriesButtonsDiv" class="hidden form-group-button-children"></div><div id="providerCategoriesButtonsDiv" class="hidden form-group-button-children"></div></div>')
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
        let caseCategoriesButtonsDiv = document.getElementById('caseCategoriesButtonsDiv')
        let providerCategoriesButtonsDiv = document.getElementById('providerCategoriesButtonsDiv')
        switch (document.querySelector('#caseOrProviderAlertsTable>tbody>tr.selected>td:nth-child(1)')?.textContent) {
            case "Case":
                if (caseCategoriesButtonsDiv.classList.contains('hidden')) {
                    providerCategoriesButtonsDiv.classList.add('hidden')
                    caseCategoriesButtonsDiv.classList.remove('hidden')
                }
                break
            case "Provider":
                if (providerCategoriesButtonsDiv.classList.contains('hidden')) {
                    caseCategoriesButtonsDiv.classList.add('hidden')
                    providerCategoriesButtonsDiv.classList.remove('hidden')
                }
                break
            default:
                break
        }
    }
    fBaseCategoryButtons()
    //highlighting Category buttons, creating category buttons.
    document.getElementById('alertTable').addEventListener( 'click', ((e) => {
        //empty omniButtons
        let selectedAlertTableRow = e.target.closest('tr')
        let alertCategory = selectedAlertTableRow.childNodes[0]?.textContent.toLowerCase().replace(" ", "")
        let messageText = selectedAlertTableRow.childNodes[3]?.textContent
        for (let message in oAlertCategoriesLowerCase[alertCategory]?.messages) {
            if (oAlertCategoriesLowerCase[alertCategory]?.messages[message]?.textIncludes.test(messageText) === true) {
                if ( Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "baseCategoryButton") ) {
                    foundAlert = Object.assign({}, oAlertCategoriesLowerCase[alertCategory].messages[message])
                    eleFocus('#' + foundAlert.baseCategoryButton)
                }
                if ( Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "omniPageButtons") ) {
                    foundAlert = Object.assign({}, oAlertCategoriesLowerCase[alertCategory].messages[message])
                    //createOmniButtons( foundAlert.omniPageButtons )
                }
                break
            }
        }
    }) )
    function createOmniButtons( omniArray ) {
        let omniButtonHTML
        omniArray.forEach((buttonInArray) => {
            omniButtonHTML += '<button type="button" class="narrow-form-button" id=' + buttonInArray +'>' + omniPages.get(buttonInArray) + '</button>'
        })
    }
    document.getElementById('caseOrProviderAlertsTable').addEventListener( 'click', (() => fBaseCategoryButtons()) )
    document.getElementById('baseCategoryButtonsDiv').addEventListener( 'click', function(e) {
        if (e.target.tagName === "BUTTON") {
            window.open('/ChildCare/' + e.target.id + '.htm' + whatAlertType().parameters, '_blank')
        }
    } )
    // SECTION_END Do action based on Alert Type

    //AutoCaseNoting; Alert page section
    let summaryFetchedData = []
    let textFetchedData = []
    let foundAlert = {}
    //categories: Absent Days, Activity Change, Appeal, Application, Child Support Note, Email Contact, Expense Change, Fraud, Household Change, Income Change,
    //Medical Leave, NCP Information, Office Contact, Phone Contact, Provider Change, Redetermination, Special Needs, Other
    // textIncludes: regex search to match alert; // noteCategory: Notes page category;
    // noteSummary: Note page summary. %# to auto-replace text with summaryFetchedData; "doReplace" sends through switch(); omit to use first 50 characters of noteMessage; // summaryFetchData: Data fetched from another page using evalData();
    // noteText: if not blank, sends through switch along with textFetchedData; if = "doFunctionOnNotes", __Notes.htm will send the category through a switch; // textFetchData: Data fetched from another page using evalData();
    // createAlert (not implemented yet, might get moved to __Notes.htm): if true, will open WorkerCreateAlert and auto-fill;
    // fetchData format: ["pageNameWithoutHtm:key.key.key"]
    const omniPages = new Map([
        ["CaseAddress", "Address"],
        ["CaseChildProvider", "Provider"],
        ["CaseCSIA", "CSI"],
        ["CaseEligibilityResultSelection", "Elig"],
        ["CaseMember", "Member"],
        ["CaseNotes", "Notes"],
        ["CaseOverview", "Overview"],
        ["CasePageSummary", "Summary"],
        ["CaseRemoveMember", "Remo"],
        ["CaseServiceAuthorizationApproval", "SA:A"],
        ["CaseServiceAuthorizationOverview", "SA:O"],
        ["CaseDisability", "Disa"],
        // [ ""],
        // [ ""],
    ])
    const oAlertCategoriesLowerCase = {//categories are alpha-sorted
        childsupport: {
            messages: {
                nameChange: {
                    textIncludes: /Parentally Responsible Individual Ref #\d{2} reported a name change/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
baseCategoryButton: "CaseMember",
omniPageButtons: ["", "", ""],
                },
                ncpAddress: {
                    textIncludes: /Absent Parent of Child Ref #\d{2} has an address/,
                    noteCategory: "NCP Information",
                    noteSummary: "doReplace",
                    textFetchData: ["CaseAddress:0.0.residenceFullAddress"],
                    noteText: "doFunctionOnNotes",
baseCategoryButton: "CaseAddress",
omniPageButtons: ["", "", ""],
                },
                cpAddress: {
                    textIncludes: /Parentally Responsible Individual Ref #\d{2} add/,
                    noteCategory: "Household Change",
                    noteSummary: "doReplace",
                    page: "",
baseCategoryButton: "CaseAddress",
omniPageButtons: ["", "", ""],
                },
                nonCoopCS: {
                    textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is not cooperating/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
omniPageButtons: ["", "", ""],
                },
                coopCS: {
                    textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is cooperating/,
                    noteCategory: "Child Support Note",
                    noteSummary: "doReplace",
                    page: "",
omniPageButtons: ["", "", ""],
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
omniPageButtons: ["", "", ""],//FinancialBillingApproval
                },
                unapprovedElig: {
                    textIncludes: /Unapproved results have/,
                    noteCategory: "Other",
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
                warningElig: {
                    textIncludes: /Warning messages exist fo/,
                    noteCategory: "Other",
baseCategoryButton: "CaseEditSummary",
omniPageButtons: ["", "", ""],
                },
                inhibitedElig: {
                    textIncludes: /Eligibility Results have/,
                    noteCategory: "Other",
baseCategoryButton: "CaseEditSummary",
omniPageButtons: ["", "", ""],
                },
                noProgramSwitch: {
                    textIncludes: /The program switch is not/,
                    noteCategory: "Other",
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
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
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
                closeTI: {
                    textIncludes: /allowed period of temporary ineligibility expires/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
                mailed: {
                    textIncludes: /Redetermination form has been mailed/,
                    noteCategory: "Redetermination",
                    noteSummary: "doReplace",
                    page: "",
baseCategoryButton: "CaseOverview",
omniPageButtons: ["", "", ""],
                },
                noRedet: {
                    textIncludes: /Redetermination has not been received/,
                    noteCategory: "Redetermination",
                    noteSummary: "Closing %0: Redet not complete/received",
                    summaryFetchData: ["CaseOverview:0.0.programBeginDateHistory"],
baseCategoryButton: "CaseOverview",
omniPageButtons: ["", "", ""],
                },
                autoDenied: {
                    textIncludes: /This case has been auto-denied/,
                    noteCategory: "Application",
                    noteSummary: "This case has been auto-denied",
baseCategoryButton: "CaseOverview",
omniPageButtons: ["", "", ""],
                },
                servicingEnd: {
                    textIncludes: /The Servicing Ends date/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
omniPageButtons: ["", "", ""],
                },
                terminatedSA: {
                    textIncludes: /The system auto approved a terminated Service/,
                    noteCategory: "Provider Change",
baseCategoryButton: "CaseServiceAuthorizationOverview",
omniPageButtons: ["", "", ""],
                },
            }
        },
        maxis: {
            messages: {
                csCoop: {
                    textIncludes: /from Not Cooperating to Cooperating/,
                    noteCategory: "Child Support Note",
                    intendedPerson: true,
                    noteSummary: "MAXIS: CP is cooperating with CS",
                    page: "",
omniPageButtons: ["", "", ""],
                },
                csNonCoop: {
                    textIncludes: /from Cooperating to Not Cooperating/,
                    noteCategory: "Child Support Note",
                    intendedPerson: true,
                    noteSummary: "MAXIS: CP is not cooperating with CS",
                    page: "",
omniPageButtons: ["", "", ""],
                },
                memberLeft: {
                    textIncludes: /Member Left date/,
                    noteCategory: "Household Change",
                    intendedPerson: true,
                    noteSummary: "doReplace",
                    page: "",
omniPageButtons: ["", "", ""],
                },
                memberJoined: {
                    textIncludes: /Member window for Reference Number/,
                    noteCategory: "Household Change",
                    intendedPerson: true,
                    noteSummary: "doReplace",
                    page: "",
baseCategoryButton: "CaseMember",
omniPageButtons: ["", "", ""],
                },
                residenceAddress: {
                    textIncludes: /Residence Address has been/,
                    noteCategory: "Household Change",
                    noteSummary: "Residence address changed by MAXIS worker",
                    textFetchData: ["CaseAddress:0.0.residenceFullAddress"],
                    noteText: "doFunctionOnNotes",
                    page: "CaseAddress",
                    pageFilter: "",
baseCategoryButton: "CaseAddress",
omniPageButtons: ["", "", ""],
                },
                mailingAddress: {
                    textIncludes: /Mailing Address has been/,
                    noteCategory: "Household Change",
                    noteSummary: "Mailing address changed by MAXIS worker",
                    textFetchData: ["CaseAddress:0.0.mailingStreet1", "CaseAddress:0.0.mailingStreet2", "CaseAddress:0.0.mailingCity", ],
                    noteText: "doFunctionOnNotes",
                    page: "CaseAddress",
                    pageFilter: "",
baseCategoryButton: "CaseAddress",
omniPageButtons: ["", "", ""],
                },
            },
        },
        parisinterstate: {
            messages: {
                parisMatch: {
                    textIncludes: /A PARIS Interstate match/,
                    noteCategory: "Other",
baseCategoryButton: "CaseNotes",
omniPageButtons: ["", "", ""],
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
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
                homelessExpiring: {
                    textIncludes: /The Homeless 3 month period will expire/,
                    noteCategory: "Application",
                    noteSummary: "doReplace",
                    page: "",
baseCategoryButton: "CaseNotes",
omniPageButtons: ["", "", ""],
                },
                homelessMissing: {
                    textIncludes: /Homeless case has one or more missing/,
                    noteCategory: "Application",
                    noteSummary: "Homeless case has missing verifications",
                    page: "",
baseCategoryButton: "CaseNotes",
omniPageButtons: ["", "", ""],
                },
                extendedEligExpiring: {
                    textIncludes: /activity extended eligibility/,
                    noteCategory: "Activity Change",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
baseCategoryButton: "CaseNotes",
omniPageButtons: ["", "", ""],
                },
                tyExpires: {
                    textIncludes: /The allowed time on Transition Year will expi/,
                    noteCategory: "Other",
                    noteSummary: "Approved TY to BSF eligibility results",
                    page: "CaseOverview",
                    pageFilter: "",
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
                disabilityExpires: {
                    textIncludes: /The allowed disability period/,
                    noteCategory: "Other",
                    noteSummary: "doReplace",
                    page: "",
                    intendedPerson: true,
omniPageButtons: ["", "", ""],
                },
                ageCategory: {
                    textIncludes: /Member turned/,
                    noteCategory: "Other",
                    noteSummary: "",
                    page: "",
                    intendedPerson: true,
baseCategoryButton: "CaseServiceAuthorizationOverview",
omniPageButtons: ["", "", ""],
                },
            },
        },
        provider: {
            messages: {
                parentAwareRatingStart: {
                    textIncludes: /Provider received Parent Aware Rating/,
                    noteCategory: "Provider Change",
baseCategoryButton: "CaseServiceAuthorizationApproval",
omniPageButtons: ["", "", ""],
                },
                providerUnsafe: {
                    textIncludes: /Provider has been deactivated for unsafe care./,
                    noteCategory: "Provider Change",
                    noteSummary: "Provider has been deactivated for unsafe care.",
                    fetchData: ["CaseServiceAuthorizationOverview:1"],
                    pageFilter: "Provider No Longer Eligible",
baseCategoryButton: "CaseServiceAuthorizationOverview",
omniPageButtons: ["", "", ""],
                },
                providerDeactivated: {
                    textIncludes: /Provider has been deactivated. Renewal/,
                    noteCategory: "Provider Change",
                    noteSummary: "Provider deactivated. Renewal was not received.",
                    fetchData: ["CaseServiceAuthorizationOverview:1"],
                    pageFilter: "Provider No Longer Eligible",
baseCategoryButton: "CaseServiceAuthorizationOverview",
omniPageButtons: ["", "", ""],
                },
                providerRegistrationClosed: {
                    textIncludes: /Provider's Registration Status is closed/,
                    noteCategory: "Provider Change",
                    noteSummary: "Provider's Registration Status is closed.",
baseCategoryButton: "CaseServiceAuthorizationOverview",
omniPageButtons: ["", "", ""],
                },
            },
        },
        serviceauthorization: {
            messages: {
                paStartOrEnd: {
                    textIncludes: /Parent Aware/,
                    noteCategory: "Provider Change",
                    noteSummary: "doReplace",
baseCategoryButton: "CaseServiceAuthorizationApproval",
omniPageButtons: ["", "", ""],
                },
                providerClosed: {
                    textIncludes: /ProviderClosed/,
                    noteCategory: "Provider Change",
                    noteSummary: "doReplace",
baseCategoryButton: "CaseServiceAuthorizationApproval",
omniPageButtons: ["", "", ""],
                },
                unapprovedSA: {
                    textIncludes: /Unapproved Service Authorization results/,
                    noteCategory: "Provider Change",
baseCategoryButton: "CaseServiceAuthorizationApproval",
omniPageButtons: ["CaseServiceAuthorizationOverview", "", ""],
                },
            },
        },
        workercreated: {
            messages: {
                approveMFIPclosing: {
                    textIncludes: /Approve new results/,
                    noteCategory: "Other",
                    noteSummary: "Approved CCMF to TY switch",
baseCategoryButton: "CaseEligibilityResultSelection",
omniPageButtons: ["", "", ""],
                },
            },
        },
    };
    async function fGetNoteMessage(obj, noteMessage, fetchedDataArray) {
        switch (obj) {
            case "childsupport.messages.ncpAddress.noteText": {
                let parentAndNCPAddress = foundAlert.noteSummary + "\n-\nCase Address: " + fetchedDataArray[0]
                if ((noteMessage).includes(fetchedDataArray[0].slice(0, 12))) {
                    foundAlert.noteSummary = "MATCH: " + foundAlert.noteSummary
                    parentAndNCPAddress = parentAndNCPAddress.concat("\n-\nAddresses match. Sending special letter requesting additional information.")
                }
                return (parentAndNCPAddress)
                break
            }
            case "maxis.messages.residenceAddress.noteText": {
                let parentAddress = foundAlert.noteMessage + "\n-\nResidence Address: " + fetchedDataArray[0]
                return (parentAddress)
                break
            }
            case "maxis.messages.mailingAddress.noteText": {
                let parentAddress = fetchedDataArray[0].length > 0 ? foundAlert.noteMessage + "\n-\nMailing Address: " + fetchedDataArray[0] + " " + fetchedDataArray[1] + " " + fetchedDataArray[2] : foundAlert.noteMessage + "\n-\nMailing address removed."
                return (parentAddress)
                break
            }
        }
    }
    async function fGetNoteSummary(obj, msgText, personName) {
        switch (obj) {
            case "eligibility.messages.unpaidCopay.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4}) - (\d{2}\/\d{2}\/\d{2,4})/, "Unpaid copay for period $1 - $2")
                break

            case "information.messages.mailed.noteSummary":
                return "Redetermination mailed, due " + formatDate(addDays(document.querySelectorAll('#alertTable .selected>td')[1].textContent, 45), "mdyy")
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
            case "maxis.messages.memberJoined.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z0-9 ]+)(\d{2}\/\d{2}\/\d{2,4})./, "Joined: $1: " + document.querySelector('#alertTable tr.selected > td:nth-child(3)').textContent)
                break

            case "childsupport.messages.nameChange.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/, "PRI$1")
                break
            case "childsupport.messages.ncpAddress.noteSummary":
                return msgText.replace(/(?:[A-Za-z- ]+)(\#\d{2})(?:[a-z- +]+)/, "ABPS of $1 address: ").replace(/(\d{5})(?:\d{4})/, "$1")
                break
            case "childsupport.messages.cpAddress.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(?:\#\d{2})(?:[A-Za-z- +]+)/, "HH address per PRISM: ").replace(/(\d{5})(?:\d{4})/, "$1")
                break
            case "childsupport.messages.nonCoopCS.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/, "PRI$1")
                break
            case "childsupport.messages.coopCS.noteSummary":
                return document.getElementById("message").value.replace(/(?:[A-Za-z- ]+)(\#\d{2})/, "PRI$1")
                break

            case "periodicprocessing.messages.extendedEligExpiring.noteSummary":
                return document.getElementById("message").value.replace(/The (\w+)(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z-. ]+)/, "Ext Elig ($1) ends $2. Review elig")
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
    window.addEventListener("beforeunload", () => localStorage.removeItem("MECH2.note"))
    function findAlertCategory() { }
    async function fAutoCaseNote() {
        summaryFetchedData = []
        textFetchedData = []
        foundAlert = {}
        let oWhatAlertType = await whatAlertType() // Case or Provider
        let messageText = document.getElementById("message").value
        let alertCategory = document.querySelector('#alertTable .selected>td').textContent.toLowerCase().replace(" ", "")
        for (let message in oAlertCategoriesLowerCase[alertCategory]?.messages) {
            let dateRange = undefined
            if (Object.hasOwn(oAlertCategoriesLowerCase[alertCategory]?.messages[message], "noteSummary") && oAlertCategoriesLowerCase[alertCategory]?.messages[message]?.textIncludes.test(messageText) === true) {
                foundAlert = Object.assign({}, oAlertCategoriesLowerCase[alertCategory].messages[message])
                if (Object.hasOwn(foundAlert, "intendedPerson")) {
                    foundAlert.personName = reorderCommaName(document.querySelector('#alertTable_wrapper #alertTable > tbody > tr.selected > td:nth-of-type(3)').textContent)
                    foundAlert.intendedPerson = foundAlert.personName.replace(/(\b\w+\b)(?:.+)/, "$1").toUpperCase()
                }
                foundAlert.noteMessage = messageText
                if (foundAlert.noteSummary === "doReplace") {
                    foundAlert.noteSummary = await fGetNoteSummary(alertCategory + ".messages." + message + ".noteSummary", foundAlert.noteMessage, foundAlert.personName)
                } else if (foundAlert.noteSummary === "") { foundAlert.noteSummary = messageText }
                if (Object.hasOwn(foundAlert, "summaryFetchData")) {
                    if (Object.hasOwn(foundAlert, "dateRange")) { // currently unused and untested
                        if (isNaN(foundAlert.dateRange)) { return }
                        let startDate = document.getElementById('periodBeginDate').value
                        let endDate = document.getElementById('periodEndDate').value
                        foundAlert.dateRange = foundAlert.dateRange !== 0 ? foundAlert.dateRange = (formatDate(addDays(startDate, dateRange * 14), "mmddyyyy") + formatDate(addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') : 0
                        if (foundAlert.dateRange !== 0) { foundAlert.dateRange = (formatDate(addDays(startDate, dateRange * 14), "mmddyyyy") + formatDate(addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') }
                    }
                    let summaryFetchData = foundAlert.summaryFetchData
                    for (let page of summaryFetchData) {
                        let pageSplit = page.split(":")
                        summaryFetchedData.push(await evalData(oWhatAlertType.number, pageSplit[0], dateRange, pageSplit[1])) // evalData(case, page, date, key.key.key...)
                    }
                    for (let i = 0; i < summaryFetchedData.length; i++) {
                        foundAlert.noteSummary = foundAlert.noteSummary.replace("%" + i, summaryFetchedData[i])
                    }
                }
                if (Object.hasOwn(foundAlert, "textFetchData") && Object.hasOwn(foundAlert, "noteText")) {
                    let textFetchData = foundAlert.textFetchData
                    for (let page of textFetchData) {
                        let pageSplit = page.split(":")
                        textFetchedData.push(await evalData(oWhatAlertType.number, pageSplit[0], dateRange, pageSplit[1])) // evalData(case, page, date, key.key.key...)
                    }
                    foundAlert.textFetchedData = textFetchedData
                    let noteMessage = await fGetNoteMessage(alertCategory + ".messages." + message + ".noteText", foundAlert.noteMessage, textFetchedData)
                    foundAlert.noteMessage = noteMessage ?? foundAlert.noteMessage
                }
                break
            }
        }
        if (foundAlert === 'undefined' || !Object.keys(foundAlert)?.length) { foundAlert = { noteSummary: messageText.slice(0, 50), noteCategory: "Other", noteMessage: messageText } } // Generic case note
        let longWorkerName = document.getElementById('workerName').value
        let workerName = longWorkerName.replace(/\w\./,)
        workerName = await reorderCommaName(document.getElementById('workerName').value)
        let shortWorkerName = workerName.replace(/(\s\w)\w+/, '$1')
        foundAlert.worker = shortWorkerName
        foundAlert.xNumber = document.getElementById("inputWorkerId").value.toLowerCase()
        foundAlert.page = oWhatAlertType.page
        foundAlert.parameters = oWhatAlertType.parameters
        foundAlert.number = oWhatAlertType.number
        return foundAlert
    }
    $('h4:contains(Alert Detail)')
        .attr('style', 'display: inline-block;')
        .wrap('<div>')
        .after('<button type="button" class="cButton" style="display: inline-block; margin-left: 10px;" tabindex="-1" id="autoCaseNote">Automated Note</button>');
    $('#autoCaseNote').click(function() {
        fAutoCaseNote().then(function(returnedAlert) {
            let readiedAlert = {}
            readiedAlert[returnedAlert.number] = Object.assign({}, returnedAlert)
            localStorage.setItem("MECH2.note", JSON.stringify(readiedAlert))
            window.open('/ChildCare/' + returnedAlert.page + returnedAlert.parameters, '_blank')
        })
    })
    //function in Object
    //let testObj = { groupId: function() { return document.getElementById('groupId') }}
    //testObj.groupId()//.value, etc
    // SECTION_END Copy Alert text, navigate to Notes

    // // SECTION_START Copy alert text to Case Notes via iframe
    // $('div.panel:has(>div#alertButtonHouse)').after('<div class="panel panel-default panel-box-format hidden"><iframe id="notesIframe" name="notesIframe" height="300px" width="100%"></iframe></div>')
    // let notesIframe = document.getElementById('notesIframe')
    // // // notesIframe.contentWindow //To operate on iframe window...
    // function fAutoNote() {//whatAlertType().number
    //     let copyText = document.getElementById("message").value.replaceAll('/n', ' ');
    //     localStorage.setItem("MECH2.caseNote." +$('#groupId').val(), copyText)
    //     addEventListener('storage', function(key, newValue) {
    //         switch (event.key) {
    //             case "MECH2.' + $('#groupId').val() + '.notesViewOrEdit": //case "MECH.autoNoteText":
    //                 console.log(event.newValue)
    //                 break
    //             case "MECH2.' + $('#groupId').val() + '.notesViewOrEdit": //case "MECH.autoNoteStatus":
    //                 console.log(event.newValue)
    //                 break
    //         }
    //     })
    //     let vDetailToNotes = [$('#message').val(), $( vCaseNumberOrProviderId ).val()]
    // }
    // function fAutoNoteSwitch() {}
    // // SECTION_END Copy alert text to Case Notes via iframe
};
// ////////////////////////////////////////////////////////////////////////// Alerts end (major sub-section) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// =================================================================================================================================================================================================

// SECTION_START Delay_MFIP_switch
if (["/AlertWorkerCreatedAlert.htm"].includes(slashThisPageNameHtm)) {
    if (document.getElementById('recordType').value === "Case Alert") {
        let delayNextMonth = new Date(new Date().setMonth(new Date().getMonth() + 1, 1)).toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit", });
        let delayMonthAfter = new Date(new Date().setMonth(new Date().getMonth() + 2, 1)).toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit", });
        document.getElementById('message').closest('div.form-group').insertAdjacentHTML('afterend','<button type="button" class="cButton__nodisable delay" id="delayNextMonth">MFIP Close Delay Alert: ' + delayNextMonth + '</button><button type="button" class="cButton__nodisable delay" id="delayMonthAfter">MFIP Close Delay Alert: ' + delayMonthAfter + '</button>')
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
}; // SECTION_END Delay_MFIP_switch
// SECTION_START Application_Information
if (("ApplicationInformation.htm").includes(thisPageNameHtm)) {
    let appReceivedField = document.getElementById('receivedDate')
    let appReceivedDate = appReceivedField.value
    let appDateCompare = new Date(appReceivedField.value).setHours(0)
    if (appReceivedField.value !== '') {
        appReceivedField.closest('.form-group').insertAdjacentHTML('beforeend', '<button type="button" id="appReceivedDateButton" class="cButton centered-text float-right">Copy App Date</button>')
        document.getElementById('appReceivedDateButton').addEventListener('click', (() => {
            sessionStorage.setItem('actualDateSS', appReceivedDate)
            sessionStorage.setItem('processingApplication', "yes")
            snackBar("Stored application date", 'blank')
            if (appDateCompare < new Date(periodDates.start).setHours(0) || appDateCompare > new Date(periodDates.end).setHours(0)) {
                document.getElementById('retroAppDateLbl').style.visibility = "hidden"
                document.getElementById('retroAppDate').insertAdjacentHTML('afterend','<span>Notice: Application date is outside the current biweekly period.</span>')
            }
        }))
    }
} // SECTION_END Case_Action
// SECTION_START Application_Information
if (("CaseAction.htm").includes(thisPageNameHtm)) {
    if (notEditMode) {
        if ( document.referrer.indexOf("https://mec2.childcare.dhs.state.mn.us/ChildCare/CaseAction.htm") > -1 ) {
            focusEle = document.getElementById('failHomeless').checked ? "#FundingAvailabilitySelf" : "#wrapUpDB"
        }
    } else {
        document.getElementById('failHomeless').addEventListener('click', function() { eleFocus('#saveDB') })
    }
} // SECTION_END Case_Action
// SECTION_START Case_Address
if (("CaseAddress.htm").includes(thisPageNameHtm)) {
    let $mailingFields = $('h4:contains("Mailing Address")').siblings().find('input, select').add($('#residenceStreet2')).not($('#mailingZipCodePlus4'))
    document.getElementById('effectiveDate').closest('.form-group').insertAdjacentHTML('beforeend', '<button type="button" class="cButton centered-text float-right" tabindex="-1" id="copyMailing">Copy Mail Address</button>');
    $('#copyMailing').click(function() {
        let oCaseName = commaNameToObject($('#caseHeaderData div.col-lg-4').contents().eq(2).text())
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
    $('#providerData :is(input, select)').filter(function() { return this.value === '' }).closest('.form-group').addClass('hidden')
    if (notEditMode) {
        $('#phone2, #phone3, #contactNotes, #email').filter(function() { return this.value === '' }).closest('.form-group').addClass('hidden')
        checkMailingAddress()
    };
    function checkMailingAddress() {
        $mailingFields.filter(function() { return this.value === '' }).closest('.form-group').addClass('hidden')
        $mailingFields.filter(function() { return this.value !== '' }).closest('.form-group').removeClass('hidden')
    };
    $('#caseAddressTable').click(function() { checkMailingAddress() });
}; // SECTION_END Case_Address
// SECTION_START Case_Application_Initiation
if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm) && !notEditMode) {
    selectPeriodReversal('#selectPeriod')
    document.getElementById('save').addEventListener('click', () => {
        sessionStorage.setItem('actualDateSS', document.getElementById('applicationReceivedDate').value)
        sessionStorage.setItem('processingApplication', "yes")
    })
    $('#applicationReceivedDate').on("blur change", function() {
        if (this.value.length < 10) { return false }
        let appDate = new Date(this.value)
        if (appDate < new Date('1/1/2020')) { return false }
        else {
            let benPeriodDate = { start: new Date($('#selectPeriod').val().slice(0, 10)), end: new Date(document.getElementById('selectPeriod').value.slice(13)) }
            if (benPeriodDate.end > appDate && appDate > benPeriodDate.start) { return false }
            let periodValue = $('#selectPeriod option').slice(0, 26).filter(function() {
                return new Date(this.value.slice(13)) >= appDate && appDate >= new Date(this.value.slice(0, 10))
            })
            document.getElementById('selectPeriod').value = periodValue[0].value
            eleFocus('#save')
            $('.hasDatepicker').datepicker("hide")
            //$('#applicationReceivedDate').off("blur change")
        }
    })
}; // SECTION_END Case_Application_Initiation

// =================================================================================================================================================================================================
// /////////////////////////////////////////////////////////////////////// CaseChildProvider (major_subsection) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
    //custom CSS to rearrange the page
    // $('label[for="providerLivesWithChild"]').text('Lives with Child: ').attr('class', 'control-label textInherit textR col-md-2 col-lg-2')
    // $('label[for="providerLivesWithChild"]').add($('label[for="providerLivesWithChild"]').siblings()).appendTo($('label[for="childCareMatchesEmployer"]').parent())
    // $('label[for="relatedToChild"]').attr('class', 'control-label textInherit textR col-md-2 col-lg-2')
    // $('label[for="relatedToChild"]').add($('label[for="relatedToChild"]').siblings()).appendTo($('label[for="careInHome"]').parent());
    // $('div.form-group:has(div.col-lg-12:not(:has(*)))').remove()
    let $lnlGroup = $('#careInHome, #providerLivesWithChildBeginDate, #careInHomeOfChildBeginDate, #formSent, #signedFormReceived').parents('.form-group')
    let $lnlTrainingDivs = $('#emptyDiv')
    let $licensedGroup = $('#primaryBeginDate, #secondaryBeginDate').parents('.form-group')
    let $careInHomeGroup = $('#exemptionReason, #exemptionPeriodBeginDate').parents('.form-group')
    let $livesWithChildGroup = $('label[for=providerLivesWithChild], label[for=providerLivesWithChild]+div.col-lg-2')//.removeAttr('style')
    document.getElementById('reporterType').setAttribute('disabled', 'disabled')
    // Buttons for added functionality
    if (notEditMode) {
        let matchestEmployerRow = document.getElementById('childCareMatchesEmployer').closest('div.row')
        matchestEmployerRow.insertAdjacentHTML('beforeend',`
        <button type="button" class="cButton float-right" tabindex="-1" id="providerAddressButton">Provider Address</button>
        <button type="button" class="cButton float-right" tabindex="-1" id="providerInfoButton">Provider Contact</button>
        `)
        $('#providerAddressButton').click(function(e) {
            e.preventDefault()
            window.open("/ChildCare/ProviderAddress.htm?providerId=" + document.getElementById('providerId').value, "_blank");
        })
        $('#providerInfoButton').click(function(e) {
            e.preventDefault()
            window.open("/ChildCare/ProviderInformation.htm?providerId=" + document.getElementById('providerId').value, "_blank");
        })
    } else if (!notEditMode) {
        document.getElementById('providerType').closest('div.row').insertAdjacentHTML('beforeend',`
        <button type="button" class="cButton float-right cButton__nodisable" tabindex="-1" style="margin-left: 5px;" id="resetCCPForm">Clear Dates & Hours</button>
        <button type="button" class="cButton float-right cButton__nodisable" tabindex="-1" style="margin-left: 5px;" id="unendSACCPForm">Clear End Dates & Reason</button>
        `)
        document.getElementById('resetCCPForm').addEventListener('click', function(e) {
            e.preventDefault()
            $('#careEndReason').val($('#careEndReason').val(''))
            $('#primaryBeginDate, #secondaryBeginDate, #carePeriodBeginDate, #carePeriodEndDate, #primaryEndDate, #secondaryEndDate, #hoursOfCareAuthorized').val('')
            eleFocus('#primaryBeginDate')
        })
        document.getElementById('unendSACCPForm').addEventListener('click', function(e) {
            e.preventDefault()
            $('#careEndReason').val($('#careEndReason').val(''))
            doEvent('#careEndReason')
            $('#carePeriodEndDate, #primaryEndDate, #secondaryEndDate').val('')
            eleFocus('#hoursOfCareAuthorized')
        })
        tabIndxNegOne('#providerLivesWithChild')
    }
    //
    if (notEditMode) { // Copy/paste start/end dates
        queueMicrotask(() => {
            document.getElementById('childProviderTable').addEventListener('click', () => {
                childProviderPage()
                checkForDates()
            })
            document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='copyStart' class='form-button hidden'>Copy Start</button><button type='button' id='copyEndings' class='form-button hidden'>Copy Endings</button>")
            let copyStartButton = document.getElementById('copyStart')
            let copyEndingsButton = document.getElementById('copyEndings')
            function checkForDates() {
                document.getElementById('carePeriodBeginDate')?.value?.length && !document.getElementById('carePeriodEndDate')?.value?.length ? copyStartButton.classList.remove('hidden') : copyStartButton.classList.add('hidden')
                document.getElementById('carePeriodEndDate')?.value?.length ? copyEndingsButton.classList.remove('hidden') : copyEndingsButton.classList.add('hidden')
            }
            copyStartButton.addEventListener('click', (() => copyStartToSS()))
            function copyStartToSS() {
                if (document.getElementById('carePeriodBeginDate')?.value?.length && document.querySelectorAll('.selected')?.length) {
                    let oProviderStart = {
                        providerId: document.getElementById("providerId").value,
                        primaryBeginDate: document.getElementById("primaryBeginDate").value,
                        secondaryBeginDate: document.getElementById("secondaryBeginDate").value,
                        carePeriodBeginDate: document.getElementById("carePeriodBeginDate").value,
                        hoursOfCareAuthorized: document.getElementById("hoursOfCareAuthorized").value,
                        lnlAckSigned: document.getElementById('signedFormReceived').value,
                        livesWithProvider: document.getElementById('providerLivesWithChild').value,
                    }
                    sessionStorage.setItem("MECH2.providerStart", JSON.stringify(oProviderStart))
                    snackBar('Copied start data!', 'blank')
                    eleFocus('#newDB')
                } else if (!document.querySelectorAll('.selected')?.length) { snackBar('No entry selected') }
            }
            copyEndingsButton.addEventListener('click', (() => copyEndingsToSS()))
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
    } else if (!notEditMode) {
        queueMicrotask(() => {
            let oProviderEndings = JSON.parse(sessionStorage.getItem("MECH2.providerEndings"))
            if (oProviderEndings !== null) {
                document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='pasteEndings' class='form-button'>Autofill Endings</button>")
                document.getElementById('pasteEndings').addEventListener('click', pasteEndingData)
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
                document.getElementById('pasteStart').addEventListener('click', pasteStartData)
                function pasteStartData() {
                    if (!document.getElementById('providerId')?.value?.length) {
                        document.getElementById("providerId").value = oProviderStart.providerId
                        doEvent("#providerId")
                        document.getElementById("primaryBeginDate").value = oProviderStart.primaryBeginDate
                        document.getElementById("secondaryBeginDate").value = oProviderStart.secondaryBeginDate
                        document.getElementById("carePeriodBeginDate").value = oProviderStart.carePeriodBeginDate
                        document.getElementById("hoursOfCareAuthorized").value = oProviderStart.hoursOfCareAuthorized
                        document.getElementById('signedFormReceived').value = oProviderStart.lnlAckSigned
                        document.getElementById('providerLivesWithChild').value = oProviderStart.livesWithProvider
                        setTimeout(() => { $('.hasDatepicker').datepicker("hide") }, 600)
                        if (childDropDown.value.length) {
                            setTimeout(() => { eleFocus('#save') }, 800)
                        } else {
                            setTimeout(() => { eleFocus(childDropDown) }, 800)
                        }
                    }
                }
            }
            let checkBoxes = document.querySelectorAll('input[type=checkbox]')
            let boxesChecked = [...checkBoxes].filter((e) => e.checked)
            if (!boxesChecked.length) { checkBoxes.forEach((e) => e.removeAttribute('tabindex') )}
        })
    }
    // SECTION_END Open provider information page from Child's Provider page
    function childProviderPage() {
        if (document.getElementById('providerType').value !== "Legal Non-licensed" && document.getElementById('providerType').value) {//not LNL
            // $lnlGroup.addClass('hidden')
            // document.querySelectorAll('.lnlData, .lnlInfo').forEach(function(e) { e.classList.add('hidden') })
            // $livesWithChildGroup.addClass('hidden')
            // $careInHomeGroup.addClass('hidden')
            // $licensedGroup.removeClass('hidden')
            // $('label[for=childCareMatchesEmployer], label[for=childCareMatchesEmployer]+div').css('visibility', 'visible')
            if (!notEditMode) {
                $('#providerLivesWithChild, #careInHome, #relatedToChild').val("N")
            }//not LNL, edit mode
            else { $lnlGroup.addClass('hidden') }//not LNL, view mode
        } else if ($('#providerType').val() === "Legal Non-licensed") {//is LNL
            lnlTraining()
            // document.querySelectorAll('.lnlInfo').forEach(function(e) { e.classList.remove('hidden') })
            // $licensedGroup.addClass('hidden')
            // $lnlGroup.removeClass('hidden')
            // document.getElementById('')
            // $careInHomeGroup.removeClass('hidden')
            // $livesWithChildGroup.removeClass('hidden')
            // $('label[for=childCareMatchesEmployer], label[for=childCareMatchesEmployer]+div').css('visibility', 'hidden')
            // document.querySelectorAll('#providerLivesWithChildBeginDate, #careInHomeOfChildBeginDate').forEach((e) => {
            //     if (!e.value) { e.closest('.form-group').classList.add('hidden') }
            //     else { e.closest('.form-group').classList.remove('hidden') }
            // })
        }
    };
    function lnlTraining() {
        let providerId = document.getElementById('providerId').value
        let lnlDataProviderId = "lnlData" + providerId
        let providerTypeFormGroup = document.getElementById('providerType').closest('.form-group')
        if (document.getElementById(lnlDataProviderId)) {
            // document.getElementById(lnlDataProviderId).classList.remove('hidden')
            checkIfRelated()
            return false
        }
        let lnlSS = sessionStorage.getItem('lnlSS.' + providerId)
        if (lnlSS) {
            let lnlDiv = providerTypeFormGroup.insertAdjacentHTML('afterend', '<div class="lnlData" id=' + lnlDataProviderId + '>' + lnlSS + '</div>')
            checkIfRelated()
            return false
        }
        if (!document.getElementById(lnlDataProviderId)) {
            let lnlDiv = providerTypeFormGroup.insertAdjacentHTML('afterend', '<div class="lnlData" id=' + lnlDataProviderId + '></div>')
            $("#" + lnlDataProviderId).load('/ChildCare/ProviderTraining.htm?providerId=' + providerId + ' #providerTrainingData', function() {
                let ptd = document.querySelector('#' + lnlDataProviderId + ' > #providerTrainingData')
                ptd.querySelector('div.form-group:has(input.form-button)').remove()
                ptd.querySelectorAll('h4, br').forEach(function(e) { e.remove() })
                ptd.querySelectorAll('input, select').forEach(function(e) { e.setAttribute('disabled', 'disabled'); e.classList.add('borderless') })
                ptd.querySelectorAll('div.col-lg-2').forEach(function(e) { e.removeAttribute('style') })
                let trainingDateNodes = ptd.querySelectorAll('.panel-box-format input[id]')
                let trainingMap = new Map([
                    ["cardio", { name: "CPR", verified: "cardioVerification" }],
                    ["firstAid", { name: "First Aid", verified: "firstAidVerification" }],
                    ["suids", { name: "SUIDS", verified: "suidsVerification", related: "Yes", careForRelated: "Any related child < 1 year" }],
                    ["headTrauma", { name: "AHT", verified: "headTraumaVerification", related: "Yes", careForRelated: "Any related child < 5 years" }],
                    ["orientation", { name: "Supervising for Safety", related: "No", verified: "orientationVerification", careForRelated: "All related children instead of AHT if < 5 years and SUIDS if < 1 year", careForUnrelated: "All unrelated children < 5 years, all unrelated children > 5 years after 90 days" }],
                    ["ongoing", { name: "Ongoing Training", verified: "ongoingVerification" }],
                    ["annual", { name: "Annual Inspection", verified: undefined }]
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
                let resultsHTML = `
<div class="form-group"> <div class="col-lg-12 textInherit">
        <label for="registration" class="col-lg-2control-label textR textInherit marginTop10">Registration:</label>
        <div class="col-lg-6 padL0 textInherit">
            <div id="registration" type="text" name="registration" title="LNL Registration Status and Effective Date"></div>
        </div>
</div> </div>
<div class="form-group"> <div class="col-lg-12 textInherit related" id="hasRelatedCare">
        <label for="relatedCare" class="col-lg-2 control-label textR textInherit marginTop10 related">Related Care:</label>
        <div class="col-lg-7 padL0 textInherit">
            <div id="relatedCare" type="text" name="relatedCare" class="inline-text related" title="LNL Related Care Breakdown"></div>
            <span class="tooltips">ⓘ
                <span class="tooltips-text tooltips-topleft">Child’s sibling, grandparent, great-grandparent, aunt, or uncle of the child, based on blood relationship, marriage or court decree.</span>
            </span>
        </div>
</div> </div>
<div class="form-group"> <div class="col-lg-12 textInherit unrelated" id="hasUnrelatedCare">
        <label for="unrelatedCare" class="col-lg-2 control-label textR textInherit marginTop10 unrelated">Unrelated Care:</label>
        <div class="col-lg-7 padL0 textInherit">
            <div class="inline-text unrelated" id="unrelatedCare" type="text" name="unrelatedCare" title="LNL Unrelated Care Breakdown"></div>
            <span class="tooltips">ⓘ
                <span class="tooltips-text tooltips-topleft">Provider is eligible to be paid for up to 90 days without Supervising for Safety training (for children under 5, they must have age related trainings if they haven't completed SfS. The 90 days is NOT tracked by MEC2 automatically.</span>
            </span>
        </div>
</div> </div>
`
                ptd.insertAdjacentHTML('beforeend', resultsHTML)
                document.querySelector('label[for=carePeriodBeginDate]').insertAdjacentHTML('beforebegin', `
                                <span class="tooltips lnlInfo" style="position: absolute; width: 24%; text-align: right;">ⓘ
                                    <span class="tooltips-text tooltips-top">Provider is eligible to be registered and paid effective the date CPR and First Aid trainings are complete; however, the Service Authorization start date is the completion date for any required age-based trainings.</span>
                                </span>
                `)
                let registrationArray = evalData(providerId, "ProviderRegistrationAndRenewal", undefined, "0", "provider").then(function(resultObject) {
                    for (let results in resultObject) {
                        if (resultObject[results].financiallyResponsibleAgency === userCountyObject?.county + ' County') {
                            let resultsArray = [resultObject[results].registrationStatus, resultObject[results].statusEffective] // status, date

                            ptd.querySelector('#registration').textContent = resultsArray[0] + ' ' + resultsArray[1]
                            return (resultsArray)
                        }
                    }
                })
                checkIfRelated()
                sessionStorage.setItem('lnlSS.' + providerId, document.getElementById(lnlDataProviderId).outerHTML)
            })
        }
    }
    function checkIfRelated() {
        document.getElementById('unrelatedCare').replaceChildren()
        let todayDate = new Date()
        let underOne = '<span style="display: inline-block;">Under 1:&nbsp;</span>'
        let underFive = '<span style="display: inline-block;">Under 5:&nbsp;</span>'
        let overFive = '<span style="display: inline-block;">Over 5:&nbsp;</span>'
        let yieldSign = '<div style="background: center center / cover; line-height: 14px;"><span style="background: yellow; color: black;">⚠</span>.&nbsp;</div>'
        let careStartDate = document.getElementById('carePeriodBeginDate').value
        let careBreakdown = { relatedLTfive: "Under 5: ❌. ", relatedLTone: "Under 1: ❌. ", relatedGTfive: "Over 5: ✅", unrelatedLTfive: "<span>Under 5: ❌.&nbsp;</span>", unrelatedLTone: "<span>Under 1: ❌.&nbsp;</span>", unrelatedGTfive: overFive + yieldSign, sfsValue: 0 }
        if (document.querySelector('#orientationVerification').value === "Yes") {
            let sfsDate = document.querySelector('#orientationDate')
            if (dateDiffInDays(todayDate, sfsDate.value) > 730) {
                sfsDate.classList.add('rederrortext')
            } else {
                careBreakdown.sfsValue = 1
                careBreakdown.relatedLTfive = "Under 5: ✅. "
                careBreakdown.relatedLTone = "Under 1: ✅. "
                careBreakdown.unrelatedLTfive = "<span>Under 5: ✅.&nbsp;</span>"
                careBreakdown.unrelatedLTone = "<span>Under 1: ✅.&nbsp;</span>"
                careBreakdown.unrelatedGTfive = "<span>Over 5: ✅.</span>"
            }
        }
        let ahtDate = document.querySelector('#headTraumaDate')
        let ahtDateDiff = dateDiffInDays(careStartDate, ahtDate.value)
        let suidsDate = document.querySelector('#suidsDate')
        let suidsDateDiff = dateDiffInDays(careStartDate, suidsDate.value)
        if (document.querySelector('#headTraumaVerification').value === "Yes") {
            if (ahtDateDiff !== NaN && ahtDateDiff < 730) { careBreakdown.relatedLTfive = "Under 5: ✅. " }
            if (ahtDateDiff !== NaN && ahtDateDiff < 730) { careBreakdown.unrelatedLTfive = underFive + yieldSign }
            else { ahtDate.classList.add('rederrortext') }
        }
        if (document.querySelector('#suidsVerification').value === "Yes") {
            if (suidsDateDiff !== NaN && suidsDateDiff < 730) { careBreakdown.relatedLTone = "Under 1: ✅. " }
            if (suidsDateDiff !== NaN && suidsDateDiff < 730) { careBreakdown.unrelatedLTone = underOne + yieldSign }
            else { suidsDate.classList.add('rederrortext') }
        }
        document.querySelector('#relatedCare').textContent = careBreakdown.relatedLTone + careBreakdown.relatedLTfive + careBreakdown.relatedGTfive
        document.querySelector('#unrelatedCare').insertAdjacentHTML('afterbegin', careBreakdown.unrelatedLTone + careBreakdown.unrelatedLTfive + careBreakdown.unrelatedGTfive)
        let relatedToChild = document.getElementById('relatedToChild')
        if (relatedToChild.value !== "Y") { document.querySelectorAll('.related').forEach(function(elem) { elem.style.textDecoration = "line-through" }) } else { document.querySelectorAll('.related').forEach(function(elem) { elem.style.textDecoration = "unset" }) }
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
    document.getElementById('relatedToChild').addEventListener('change', function() { checkIfRelated() })
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
} ////////////////////////////////////////////////////////////////////// CaseChildProvider end (major_subsection) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// =================================================================================================================================================================================================

// SECTION_START Case_Copay_Distribution
if (("CaseCopayDistribution.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        waitForTableCells('#providerInformationTable').then(() => {
            let providerId = document.querySelector('#providerInformationTable > tbody > tr.selected > td:nth-child(1)').textContent
            if (sessionStorage.getItem('MECH2.ageCategory.' + caseId + '.' + providerId) !== null) {
                let copayDist = JSON.parse(sessionStorage.getItem('MECH2.copayDist.' + caseId + '.' + providerId))
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
} // SECTION_END Case_Copay_Distribution
// SECTION_START Case_Create_Eligibility_Results
if (("CaseCreateEligibilityResults.htm").includes(thisPageNameHtm)) {
    if ($('strong:contains("Results successfully submitted.")').length) {
        $('#secondaryActionArea').addClass('hidden')
        $('#caseCERDetail').append('<button type="button" id="eligibilityResults" class="form-button center-vertical">Eligibility Results</button>')
        $('#eligibilityResults').click(function(e) { e.preventDefault(); document.getElementById(`Eligibility Results Selection`).children[0].click() })
        eleFocus('#eligibilityResults')
        // document.addEventListener('load', () => ( eleFocus('#eligibilityResults') ) )
    } else { eleFocus('#createDB') }
} // SECTION_END Case_Create_Eligibility_Results
// SECTION_START Case_CSE Fill_Child_Support_PDF_Forms
if (("CaseCSE.htm").includes(thisPageNameHtm)) {
    if (typeof userCountyObject !== undefined && userCountyObject.code === "169") {
        $('#cseDetailsFormsCompleted').parent().after('<button type="button" class="cButton centered-text float-right" tabindex="-1" id="csForms">Generate CS Forms</button>');
        $('#csForms').click(function() {
            let caseNumber = caseId
            let cpInfo = commaNameToObject(document.querySelector('#csePriTable .selected td:nth-child(2)').textContent)
            let ncpInfo = commaNameToObject(document.querySelector('#csePriTable .selected td:nth-child(3)').textContent)
            let childList = {};
            $('#childrenTable tbody tr').each(function(index) {
                if ($(this).children('td').eq(1).text().length > 0) {
                    childList["child" + index] = $(this).children('td').eq(1).text();
                };
            });
            const formInfo = { pdfType: "csForms", xNumber: userXnumber, caseNumber: caseNumber, cpInfo: cpInfo, ncpInfo: ncpInfo, ...childList };
            window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank");
        });
    }
    // SECTION_END Fill Child Support PDF Forms

    // SECTION_START Remove unnecessary fields from Child Support Enforcement
    if (notEditMode) { $('#actualDate').parents('.form-group').addClass('hidden') }
    let $hiddenCSE = $('#cseAbsentParentInfoMiddleInitial, #cseAbsentParentInfoSsn, #cseAbsentParentInfoBirthdate, #cseAbsentParentInfoAbsentParentSmi, #cseAbsentParentInfoAbsentParentId').closest('.form-group')
    $($hiddenCSE).addClass('hidden');
    $('#cseAbsentParentInfoLastName').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="abpsShowHideToggle">Toggle extra info</button>');
    $('#abpsShowHideToggle').click(function() { $($hiddenCSE).toggleClass('hidden toggle') });
    let $goodCause = $('#cseGoodCauseClaimStatus').parents('.form-group').siblings().not('h4')
    function hideBlankGoodCause() {
        if ($('#cseGoodCauseClaimStatus').val() === 'Not Claimed') { $goodCause.addClass('hidden') }
        else { $goodCause.removeClass('hidden') }
    };
    hideBlankGoodCause();
    $('#cseGoodCauseClaimStatus').change(function() { hideBlankGoodCause() });
    $('#csePriTable').click(function() { cseReviewDate() });
    function cseReviewDate() {
        $('h4:contains("Good Cause")').siblings().removeClass('hidden')
        $('h4:contains("Good Cause")').siblings().children('div').children('input, select').filter(function() { return $(this).val()?.length === 0 }).not('#cseGoodCauseClaimStatus').closest('.form-group').addClass('hidden')
    };
    cseReviewDate()
    $('#cseGoodCauseClaimStatus').parent().after('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="cseGoodCauseClaimStatusToggle">Toggle extra info</button>');
    $('#cseGoodCauseClaimStatusToggle').click(function() { $goodCause.toggleClass('hidden toggle') });
}; // SECTION_START Case_CSE Fill_Child_Support_PDF_Forms
// SECTION_START Case_CSIA
if (("CaseCSIA.htm").includes(thisPageNameHtm)) {
    let $csiahidden = $('#middleInitial, #birthDate, #ssn, #gender').parents('.form-group')
    let countyName = userCountyObject?.county ?? ''
    let birthplaceStateOrProvince = document.getElementById('birthplaceStateOrProvince')
    let birthplaceCountry = document.getElementById('birthplaceCountry')
    let birthplaceCounty = document.getElementById('birthplaceCounty')
    countyName = countyName.replace(/\W/g, '')
    $csiahidden.addClass('hidden')
    $('#actualDate').parents('.form-group').append('<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="csiaExtra">Toggle extra info</button>');
    $('#csiaExtra').click(function() { $csiahidden.toggleClass('hidden toggle') });
    $('h4:contains("Address")').click()
    $('#deceasedDate').parents('.form-group').addClass('hidden')
    function childOfAbpsInfo() {
        if ($('#caseCSIADetailData .selected td:eq(3)').text() !== "") { $('#nameKnown').val('Yes').addClass('red-outline') }
        birthplaceCountry.addEventListener('change', function() {
            queueMicrotask(() => {
                birthplaceStateOrProvince.removeAttribute('tabindex')
                if (!birthplaceStateOrProvince.value) {
                    document.getElementById('birthplaceStateOrProvince').value = 'Minnesota'
                    birthplaceStateOrProvince.classList.add('red-outline')
                    doEvent('#birthplaceStateOrProvince')
                }
            })
        })
        birthplaceStateOrProvince.addEventListener('change', function() {
            queueMicrotask(() => {
                if (document.getElementById('birthplaceCounty').value === "" && countyName?.length) {
                    birthplaceCounty.value = countyName
                    birthplaceCounty.classList.add('red-outline')
                    doEvent('#birthplaceCounty')
                    eleFocus('#birthplaceStateOrProvince')
                }
            })
        })
        if (document.getElementById('birthplaceCountry').value === "") {
            birthplaceCountry.value = 'USA'
            birthplaceCountry.classList.add('red-outline')
            doEvent('#birthplaceCountry')
        }
    }
    if (!notEditMode) {
        queueMicrotask(() => {
            document.getElementById('caseCSIAChildData').addEventListener('click', function() { childOfAbpsInfo() })
            document.getElementById('priRelationshiptoChild').addEventListener('change', function() { childOfAbpsInfo() })

        })
    }
    document.querySelector('#deceased').addEventListener('change', function(e) {
        if (e.value === "Yes") { document.querySelector('#deceasedDate').closest('.form-group').classList.remove('hidden') }
    })
} // SECTION_END Case_CSIA
// SECTION_START Case_Earned_Income
if (("CaseEarnedIncome.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) { tempIncomes('ceiTemporaryIncome', 'ceiPaymentEnd') }
    tabIndxNegOne('#providerId, #providerSearch, #ceiCPUnitType, #ceiNbrUnits, #ceiTotalIncome')
    let ceiEmployment = [...document.querySelectorAll('#ceiPrjAmount, #ceiAmountFrequency, #ceiHrsPerWeek, #ceiEmployer, #ceiCPUnitType, #ceiNbrUnits')].map((e) => e.closest('.form-group'))
    let ceiSelfEmployment = [...document.querySelectorAll('#ceiGrossIncome, #ceiGrossAllowExps, #ceiTotalIncome')].map((e) => e.closest('.form-group'))
    document.getElementById('earnedIncomeMemberTable').addEventListener('click', function() { checkSelfEmploy() });
    document.getElementById('ceiIncomeType').addEventListener('change', function() { checkSelfEmploy() })
    function checkSelfEmploy() {
        if (document.getElementById('ceiIncomeType').value === "Self-employment") {
            ceiSelfEmployment.forEach( (e) => e.classList.remove('hidden') )
            ceiEmployment.forEach( (e) => e.classList.add('hidden') )
        }
        else if (document.getElementById('ceiIncomeType').value !== "Self-employment" || (notEditMode && !document.getElementById('ceiTotalIncome').value)) {
            ceiSelfEmployment.forEach( (e) => e.classList.add('hidden') )
            ceiEmployment.forEach( (e) => e.classList.remove('hidden') )
        }
    };
    checkSelfEmploy()
    let hiddenCEI1 = [...document.querySelectorAll('#ceiEmpStreet, #ceiEmpStreet2, #ceiEmpCity, #ceiEmpStateOrProvince, #ceiPhone, #ceiEmpCountry')].map((e) => e.closest('.form-group'))
    hiddenCEI1.forEach((e) => e.classList.add('hidden'))
    document.getElementById('ceiIncomeType').parentNode.insertAdjacentHTML('afterend', '<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="ceiShowHide1">Toggle extra info</button>');
    document.getElementById('ceiShowHide1').addEventListener('click', function() { hiddenCEI1.forEach((e) => e.classList.toggle('hidden') ) })
    //
    if (!document.getElementById('providerName')?.value) {
        let hiddenCEI3 = [...document.querySelectorAll('#providerName, #addressStreet')].map((e) => e.closest('.form-group'))
        hiddenCEI3.forEach( (e) => e.classList.add('hidden') )
        document.getElementById('providerSearch').parentNode.insertAdjacentHTML('afterend', '<button type="button" class="cButton__floating cButton__nodisable centered-text float-right" tabindex="-1" id="ceiShowHide3">Toggle extra info</button>');
        document.getElementById('providerSearch').closest('.col-lg-12').classList.add('form-group')
        document.getElementById('ceiShowHide3').addEventListener('click', function() { hiddenCEI3.forEach( (e) => e.classList.toggle('hidden') ) });
    };
    if (!notEditMode) {
        document.getElementById('ceiGrossIncome').parentNode.insertAdjacentHTML('afterend', '<div class="height28" style="align-content: center; display: inline-flex; flex-wrap: wrap; margin-right: 10px;" id="fiftyPercent"></div>');
        document.getElementById('fiftyPercent').innerText = '50%: ' + (document.getElementById('ceiGrossIncome').value * .5).toFixed(2)
        document.getElementById('ceiGrossIncome').addEventListener('input', function() { document.getElementById('fiftyPercent').innerText = '50%: ' + (document.getElementById('ceiGrossIncome').value * .5).toFixed(2) })
        document.getElementById('fiftyPercent').insertAdjacentHTML('afterend', '<button type="button" id="grossButton" class="cButton__nodisable">Use 50%</button>')
        document.getElementById('grossButton').addEventListener('click', function() {
            document.getElementById('ceiGrossAllowExps').value = (document.getElementById('ceiGrossIncome').value * .5).toFixed(2)
            doEvent('#ceiGrossAllowExps')
            eleFocus('#save')
        });
        //SUB-SECTION START Set state to MN, country to USA when leaving Employer Name field
        if (!document.getElementById('ceiEmpCountry').value) {
            document.getElementById('ceiEmpCountry').value = 'USA'
            doEvent('#ceiEmpCountry')
        }
        if (!document.getElementById('ceiEmpStateOrProvince').value) {
            document.getElementById('ceiEmpStateOrProvince').value = 'Minnesota'
            doEvent('#ceiEmpStateOrProvince')
        };
        document.getElementById('ceiPaymentEnd').addEventListener('keydown', function(e) {
            if (e.key === "2") { document.getElementById('ceiPaymentChange').setAttribute('disabled', 'disabled') } //.tabIndex = -1 }
        })
    };
}; // SECTION_END Case_Earned_Income
// SECTION_START Case_Earned_Income__Case_Unearned_Income__Case_Expense
if (["CaseEarnedIncome.htm", "CaseUnearnedIncome.htm", "CaseExpense.htm"].includes(thisPageNameHtm)) {
    if (notEditMode) {
        document.querySelector('tbody').addEventListener('click', () => {
            showHidePaymentChange()
            eleFocus('#editDB')
        })
    }
    function showHidePaymentChange() {
        let paymentChangeGroup = document.querySelectorAll('#ceiPaymentChange, #paymentChangeDate')
        if ( (notEditMode && !document.querySelector('#paymentChangeDate, #ceiPaymentChange').value ) || ( !notEditMode && document.querySelector('#memberReferenceNumberNewMember, #refPersonName') ) ) {
            if ("CaseExpense.htm".includes(thisPageNameHtm) ) {
                document.querySelectorAll('label[for="paymentChangeDate"], #paymentChangeDate').forEach( (e) => e.classList.add('hidden') )
            }
            else { document.querySelectorAll('#paymentChangeDate, #ceiPaymentChange').forEach( (e) => e.closest('.form-group').classList.add('hidden') ) }
        }
    }
    if (!notEditMode) {
        excludedResetTabIndexList = "#ceiTemporaryIncome, #tempIncome, #temporaryExpense"
        document.querySelector('body').addEventListener('change', function(e) {
            if (e.target.nodeName === "SELECT") { tabIndxReset() }
        })
        showHidePaymentChange()
        function tabIndxReset() {
            resetTabIndex(excludedResetTabIndexList)
            tabIndxNegOne('#ceiTemporaryIncome, #tempIncome, #temporaryExpense')
            if (document.querySelector('#memberReferenceNumberNewMember, #refPersonName')) {
                tabIndxNegOne('#ceiPaymentEnd, #paymentEndDate')
            }
            if (document.querySelector('#ceiPaymentBegin, #paymentBeginDate')?.value) {
                tabIndxNegOne('#ceiPaymentBegin, #paymentBeginDate')
            }
        }
        tabIndxReset()
    }
    showHidePaymentChange()
    $("h4:contains('Actual Income'), h4:contains('Student Income'), h4:contains('Actual Expense')").nextAll().addClass("hidden")
}; // SECTION_END Case_Earned_Income__Case_Unearned_Income__Case_Expense
// SECTION_START Case_Activity_pages
if (!("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm) && thisPageNameHtm.indexOf("Activity.htm") > -1) {
    document.querySelectorAll('#leaveDetailExtendedEligibilityBegin, #leaveDetailExpires, #redeterminationDate, #extendedEligibilityBegin, #extendedEligibilityExpires, #leaveDetailRedeterminationDue').forEach(function(e) { e.setAttribute('disabled', 'disabled') })
    tabIndxNegOne('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')
    if (!$('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom').filter(function() { if ($(this).val()?.length > 0) return ($(this)) }).length) {
        tabIndxNegOne('#tempLeavePeriodEnd, #leaveDetailTemporaryLeavePeriodTo')
    }
} // SECTION_END Case_Activity_pages
// SECTION_START Highlight_eligibility_results
if (slashThisPageNameHtm.indexOf("/CaseEligibilityResult") > -1) {
    let eligTableArray = { // Page: { result.category: ["TextToMatch", tableColumnToHighlight] }
        CaseEligibilityResultPerson: { eligibility: ["Ineligible", 4], inFamilySize: ["No", 6] },
        CaseEligibilityResultOverview: { eligibility: ["Ineligible", 3], inFamilySize: ["No", 5] },
    }
    let eligTableArrayMultiRefNums = {
        CaseEligibilityResultFinancial: [ ["No", 9], ],
        CaseEligibilityResultActivity: [ ["Ineligible", 7], ["Fail", 8] ],
    }
    let eligTableArrayMatch = eligTableArray[thisPageName]
    document.querySelectorAll('tbody > tr > td:nth-child(1)')?.forEach(function(e) { e.parentNode.id = "ref" + (e.innerText) })
    function eligHighlight() {
        document.querySelectorAll('select, input:is(.eligibility-highlight)').forEach( (e) => { e.classList.remove('eligibility-highlight', 'ineligible') })
        let selectInputFail = [...document.querySelectorAll('.panel-box-format :is(select, input')].filter(function(e) {
            return ( (/\bF\b|\bFail\b/).test(e.value) )
        }).forEach((e) => e.classList.add('eligibility-highlight', 'ineligible'));
    }
    function eligHighlightPageLoad() {
        let divFail = [...document.querySelectorAll('#caseEligibilityResultFamilyDetail div.form-group > div')].filter(function(e) { return e.innerText === "Fail" }).forEach((e) => e.classList.add('eligibility-highlight', 'ineligible'))
        if (eligTableArrayMatch) {
            let thisTable = document.querySelector('table > tbody')
            evalData().then(function(result) {
                for (let person in result[0]) {
                    let thisRow = result[0][person]
                    let membNumber = Object.hasOwn(thisRow, 'reference') ? thisRow.reference : thisRow.ref
                    let rowNumber = 'tr#ref' + membNumber

                    if (!Object.hasOwn(thisRow, 'ageUnderThresholdTest') || thisRow.role === "PRI") {
                        for (let [category, valueCell] of Object.entries(eligTableArrayMatch)) {
                            if (thisRow[category] === valueCell[0]) { thisTable.querySelector(rowNumber + ' > td:nth-child(' + valueCell[1] + ')').classList.add('eligibility-highlight', 'ineligible') }
                        }
                    } else if (thisRow.role === "Child" && thisRow.eligibility === "Ineligible" && thisRow.ageUnderThresholdTest.length < 1) {
                        thisTable.querySelector(rowNumber + ' > td:nth-child(' + eligTableArrayMatch.eligibility[1] + ')').classList.add('eligibility-highlight', 'ineligible')
                        if (thisRow.inFamilySize === "No") {
                            thisTable.querySelector(rowNumber + ' > td:nth-child(' + eligTableArrayMatch.inFamilySize[1] + ')').classList.add('eligibility-highlight', 'ineligible')
                        }
                    }
                }
            })
        } else {
            let eligTableArrayMultiRefNumsMatch = eligTableArrayMultiRefNums[thisPageName]
            if (eligTableArrayMultiRefNumsMatch) {
                eligTableArrayMultiRefNumsMatch.forEach((array) => {
                    let tableData = [...document.querySelectorAll('table > tbody > tr > td:nth-child(' + array[1] + ')')]
                    .filter((tdCell) => tdCell.innerText === array[0])
                    .forEach((match) => match.classList.add('eligibility-highlight', 'ineligible'));
                })
            }
        }
        let notInUnit = [...document.querySelectorAll('tbody > tr > td')].filter((e) => e.textContent === "Not in Unit").forEach((e) => e.parentNode.classList.add('notInUnit') )
        document.querySelector('div[title="Family Result"]')?.innerText === "Ineligible" && document.querySelector('div[title="Family Result"]').classList.add('eligibility-highlight', 'ineligible')
    }
    queueMicrotask(() => { eligHighlightPageLoad(); eligHighlight() })
    document.querySelector('tbody')?.addEventListener('click', function() {
        eligHighlight()
        !("CaseEligibilityResultSelection.htm").includes(thisPageNameHtm) && ( eleFocus('#nextDB') )
    })
}; // SECTION_END Highlight_eligibility_results
// SECTION_START Case_Eligibility_Result_Approval
if (("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        // queueMicrotask(() => {
        //     $('#type').attr('tabindex', '1')
        //     $('#reason').attr('tabindex', '2')
        //     $('#beginDate').attr('tabindex', '3')
        //     $('#allowedExpirationDate').attr('tabindex', '4')
        // })
        if (sessionStorage.getItem('MECH2.TI.' + caseId) !== null) {
            let tempInelig = JSON.parse(sessionStorage.getItem('MECH2.TI.' + caseId))
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
            let extEligPlus90 = addDays(document.getElementById('beginDate').value, 90);
            extEligPlus90 = new Date(extEligPlus90).toLocaleDateString('en-US', {
                year: "numeric",
                month: "2-digit",
                day: "2-digit",
            });
            document.getElementById('allowedExpirationDate').value = extEligPlus90
            doEvent('#allowedExpirationDate')
            // $('.hasDatepicker').datepicker("hide")
            // eleFocus('#save')
        })
    }
}; // SECTION_END Case_Eligibility_Result_Approval
// SECTION_START Case_Eligibility_Result_Financial
if (("CaseEligibilityResultFinancial.htm").includes(thisPageNameHtm)) {
    let totalAnnualizedIncome = Number(document.querySelector('label[for="totalAnnualizedIncome"]+div').innerText.replace(/[^0-9.-]+/g, ""))
    let maxAllowed = Number(document.querySelector('label[for="maxIncomeAllowed"]+div').innerText.replace(/[^0-9.-]+/g, ""))
    // let maxAllowed = Number($('label[for="maxIncomeAllowed"]').next().html().replace(/[^0-9.-]+/g, ""))
    if (totalAnnualizedIncome > maxAllowed) { document.querySelector('label[for="totalAnnualizedIncome"]').closest('div').classList.add('eligibility-highlight', 'ineligible') }
} // SECTION_END Case_Eligibility_Result_Financial
// SECTION_START Case_Eligibility_Result_Selection
if (("CaseEligibilityResultSelection.htm").includes(thisPageNameHtm)) {
    let eligibilityTableRows = document.querySelectorAll('#caseEligibilitySelectionTable > tbody > tr')
    eligibilityTableRows.forEach((e) => {
        let versionNumber = e.childNodes[0]?.textContent.split(" ")
        if (versionNumber[0] === versionNumber[2]) {
            if (e.childNodes[5].textContent === "Unapproved") { e.classList.add("unapproved") }
            if (["Ineligible", "Temporarily Ineligible"].includes(e.childNodes[4].textContent)) { e.classList.add("ineligible") }
            else if (e.childNodes[4].textContent === "Eligible") { e.classList.add("eligible") }
        }
    })
    if (document.querySelector('.unapproved')) {
        if (document.querySelector('.unapproved.eligible')) { document.querySelector('.unapproved.eligible').click() }
        else if (document.querySelector('.unapproved.ineligible')) { document.querySelector('.unapproved.ineligible').click() }
    } else {
        document.getElementById('delete').insertAdjacentHTML('afterend', `
            <button type="button" id="goSAOverview" class="form-button">SA Overview</button>
            <button type="button" id="goSAApproval" class="form-button">SA Approval</button>
        `)
        document.getElementById('goSAOverview').addEventListener('click', function(e) {
            e.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorizationOverview.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self');
        })
        document.getElementById('goSAApproval').addEventListener('click', function(e) {
            e.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorizationApproval.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self');
        })
    };
    if (document.getElementsByClassName('dataTables_empty').length === 0) { document.getElementsByClassName('sorting')[1].click() };//sort by program type
    document.getElementById('caseEligibilitySelectionTable').addEventListener('click', function() { eleFocus('#selectDB') })
}; // SECTION_END CaseEligibilityResultSelection
// SECTION_START Case_Eligibility_Result_Person
if (("CaseEligibilityResultPerson.htm").includes(thisPageNameHtm)) {
    $('#eligibilityPeriodEnd').parent().contents().eq(2).replaceWith('<label class="to">to</label>')
} // SECTION_END Case_Eligibility_Result_Person
// SECTION_START reviewing_Eligibility_Redirect
if (reviewingEligibility) {
    let alreadyRedirecting = 0
    setIntervalLimited(function() {
        if ($('[id$="TableAndPanelData"]').css('display') === "none" && !alreadyRedirecting) {
            window.open(document.getElementById("Eligibility Results Selection").firstElementChild.href, "_self")
            alreadyRedirecting = 1
        }
    }, 200, 5)
}; // SECTION_END reviewing_Eligibility_Redirect
// SECTION_START Case_Expense
if (("CaseExpense.htm").includes(thisPageNameHtm)) {
    document.getElementById('paymentEndDate').addEventListener('keydown', function(e) {
        if (e.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
    })
    // let hiddenExp = $('#projectionExpenseUnitType, #projectionExpenseNumberOfUnits').parents('.form-group');
    // hiddenExp.addClass('hidden');
    // $('label[for="projectionExpenseAmount"]').parent().append('<button type="button" class="cButton__floating cButton__nodisable float-right" tabindex="-1" id="ceiShowHide2">Toggle extra info</button>');
    // $('#ceiShowHide2').click(function() { $(hiddenExp).toggleClass('hidden') });
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
    if (!notEditMode) { tempIncomes('temporaryExpense', 'paymentEndDate') }
}; // SECTION_END Case_Expense
// SECTION_START Case_Job_Search_Tracking
if (("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) {
    document.getElementById('hoursUsed').addEventListener('keydown', function(e) {
        if (['Enter', 'Tab'].includes(e.code) ) {
            document.getElementById('save').click()
        }
    })
} // SECTION_END Case_Job_Search_Tracking
// SECTION_START Case_Member
if (("CaseMember.htm").includes(thisPageNameHtm)) {
    // $('label[for="memberReferenceNumber"]').attr('id','openHistory') // Open CaseMemberHistory page from CaseMember with 'button'
    // $('#openHistory').click(function() {
    //     window.open('/ChildCare/CaseMemberHistory.htm?parm2=' + caseId, '_blank');
    // });
    document.querySelector('label[for="memberReferenceNumber"]').onclick = () => void window.open('/ChildCare/CaseMemberHistory.htm?parm2=' + caseId, '_blank')
    $("label:contains('American Indian or Alaskan Native')").text('American Indian or AK Native');
    $("label:contains('Pacific Islander or  Native Hawaiian')").text('Pacific Islander or HI Native');
    if ( document.getElementById('next') ) { document.querySelector('tbody').addEventListener('click', function() { eleFocus('#next') }) }
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
        $('#memberBirthDate')
            .attr('style', 'width: var(--dateInput)')
            .after('<div style="display: inline-flex; margin-left: 5px;" id="birthMonths">')
        $('#raceCheckBoxes').parent().addClass('hidden')
        document.getElementById('caseMemberTable').addEventListener('click', function() {
            let ageFromMemberTable = document.querySelector('#caseMemberTable .selected>td:nth-child(3)').textContent
            if (parseInt(ageFromMemberTable) < 7 || ageFromMemberTable === "") {
                let monthsAge = fMonthDifference(new Date(), new Date($('#memberBirthDate').val()))
                let birthMonthsText = monthsAge < 49 ? Math.floor((monthsAge) / 12) + 'y ' + (monthsAge) % 12 + 'm / ' + monthsAge + ' months' : Math.floor((monthsAge) / 12) + 'y ' + (monthsAge) % 12 + 'm'
                if (monthsAge < 13) { birthMonthsText = monthsAge + ' months' }
                document.getElementById('birthMonths').textContent = birthMonthsText
            } else { document.getElementById('birthMonths').textContent = "" }
        })
    }
    if (!notEditMode) {
        tabIndxNegOne('#memberAlienId, #memberDateOfDeath')
        // let filledValueFields = []
        // $('#memberPanelsData :is(input, select):not([type="checkbox"], .wiz-form-button, .form-button, [type="hidden"], [disabled="disabled"])').filter(function() { filledValueFields.push( "#" + $(this).attr('id') ) })
        // tabIndxNegOne(filledValueFields)
        let membRefNum = document.getElementById('memberReferenceNumber')
        $('#memberReferenceNumber').blur(function(event) {
            if (event.target.value.length > 1 && Number(event.target.value) > 2 && Number(event.target.value) < 10) { fillMemberDataChild(event.target) }
        })
        function fillMemberDataChild() { //autofilling
            $('#memberSsnVerification').val()?.length === 0 && $('#memberSsnVerification').val("SSN Not Provided").addClass('red-outline')
            $('#memberRelationshipToApplicant').val()?.length === 0 && $('#memberRelationshipToApplicant').val("Child").addClass('red-outline'); doEvent('#memberRelationshipToApplicant')
            $('#memberBirthDateVerification').val()?.length === 0 && $('#memberBirthDateVerification').val("No Verification Provided").addClass('red-outline')
            $('#memberIdVerification').val()?.length === 0 && $('#memberIdVerification').val("No Verification Provided").addClass('red-outline')
            $('#memberKnownRace').val()?.length === 0 && $('#memberKnownRace').val("No").addClass('red-outline'); doEvent('#memberKnownRace')
            $('#memberSpokenLanguage').val()?.length === 0 && $('#memberSpokenLanguage').val("English").addClass('red-outline'); doEvent('#memberSpokenLanguage')
            $('#memberWrittenLanguage').val()?.length === 0 && $('#memberWrittenLanguage').val("English").addClass('red-outline'); doEvent('#memberWrittenLanguage')
            $('#memberNeedsInterpreter').val()?.length === 0 && $('#memberNeedsInterpreter').val("No").addClass('red-outline')
            $('#arrivalDate:not([read-only])').val()?.length === 0 && $('#arrivalDate').addClass('required-field')
        }
        if (Number($('#memberReferenceNumber').val()) > 2 && Number($('#memberReferenceNumber').val()) < 10) { fillMemberDataChild() }
    }
}; // SECTION_END Case_Member
// SECTION_START Case_Member_II
if (("CaseMemberII.htm").includes(thisPageNameHtm)) {
    if (document.getElementById('next')) { document.querySelector('tbody').addEventListener('click', function() { eleFocus('#next') }) }
    if (!notEditMode) {
        function autoFillForChildren() {
            let membRefNum = document.getElementById('memberReferenceNumberNewMember')
            if (Number(membRefNum?.value) > 2 && Number(membRefNum?.value) < 11) {
                document.querySelectorAll('#memberMaritalStatus, #memberLastGradeCompleted, #memberUSCitizen, #memberCitizenshipVerification').forEach((e) => {
                    e.value === '' && e.classList.add('red-outline')
                })
                document.getElementById('memberMaritalStatus').value === "" && (document.getElementById('memberMaritalStatus').value = "Never Married")
                doEvent('#memberMaritalStatus')
                document.getElementById('memberSpouseReferenceNumber').setAttribute('tabindex', '-1')
                document.getElementById('memberLastGradeCompleted').value === "" && (document.getElementById('memberLastGradeCompleted').value = "Pre-First Grade or Never Attended")
                document.getElementById('memberUSCitizen').value === "" && (document.getElementById('memberUSCitizen').value = "Yes")
                doEvent('#memberUSCitizen')
                document.getElementById('memberCitizenshipVerification').value === "" && (document.getElementById('memberCitizenshipVerification').value = "No Verification Provided")
                eleFocus('#memberCitizenshipVerification')
                $('.hasDatepicker').datepicker("hide")
            }
        }
        document.getElementById('memberReferenceNumberNewMember')?.addEventListener('blur', function(event) { autoFillForChildren() })
        queueMicrotask(() => {
            autoFillForChildren()
            document.getElementById('memberMaritalStatus').value === "Never Married" && document.getElementById('memberSpouseReferenceNumber').setAttribute('tabindex', '-1')
        })
    }
} // SECTION_END Case_Member_II

// ==================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// Notes_htm start (major_subsection) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// SECTION_START Case_Notes custom styles
if (("CaseNotes.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        let noteStringText = document.getElementById('noteStringText')
        document.querySelector('option[value="Application"]').insertAdjacentHTML('afterend', '<option value="Child Support Note">Child Support Note</option>');
        $('h4:contains("Note")').after('<button type="button" class="cButton float-right" id="disAutoFormat" tabindex="-1">Disable Auto-Format</button>')
        document.querySelector('#disAutoFormat').addEventListener('click', (e) => { e.preventDefault(); $(this).text($(this).text() === "Disable Auto-Format" ? "Enable Auto-Format" : "Disable Auto-Format") })
        document.getElementById('save').addEventListener('click', () => {
            if (document.querySelector('#disAutoFormat').textContent === "Disable Auto-Format") {
                noteStringText.value = (noteStringText.value.replace(/\n\ *`\ */g, "\n             ").replace(/^(?! *RSDI| *SSI)([ A-Z]{2,8}:) */gm, (text, a) => `${' '.repeat(9 - a.length)}${a}    `))//Using ` to auto-insert/correct spacing, and fix spacing around titles
            }
        })
        noteStringText.addEventListener('paste', function(event) {
            let pastedText = (event.clipboardData || window.clipboardData).getData("text")
            if (document.querySelector('#disAutoFormat').textContent === "Disable Auto-Format" && (/\u0009|\w\(|\)\w|\n\ {16}/).test(pastedText) ) {
                event.preventDefault()
                pastedText = pastedText
                    .replace(/(\w)\(/g, "$1 (").replace(/\)(\w)/g, ") $1")//Spaces around parentheses
                    .replace(/\n\u0009/g, "\n             ").replace(/\n\ {9}\u0009/g, "\n             ").replace(/\n\ {16}/g, "\n             ").replace(/\u0009/g, "    ")//Spacing from pasting Excel cells
                    .replace(/\n+/g, "\n")//Multiple new lines to single new line
                insertTextAndMoveCursor(pastedText)
            }
        })
        noteStringText.addEventListener('keydown', (e) => {
            if (e.key === "`") {
                e.preventDefault()
                insertTextAndMoveCursor("             ")
            }
        })
    }
    //Hiding PMI/SMI Merge and Disbursed Child Care Support Payment rows
    let hiddenTr = [...document.querySelectorAll('table#caseNotesTable>tbody>tr>td:nth-child(5)')].slice(0, 120).filter( e => e.innerText.indexOf("Disbursed child care") > -1 || e.innerText.indexOf("PMI/SMI") > -1 ).map((e) => e.parentNode)
    if (hiddenTr.length) {
        document.getElementById('caseNotesTable').classList.add('toggleTable')
        document.getElementById('reset').insertAdjacentHTML('afterend', '<button type="button" id="toggleCaseNotesRows" class="cButton__float cButton__nodisable float-right" data-hiding="true" title="Shows or hides PMI Merge and CS disbursion auto-notes">Show ' + hiddenTr.length + ' Hidden Rows</button>')
        document.getElementById('toggleCaseNotesRows').addEventListener('click', function(e) {
            switch (e.target.dataset.hiding) {
                case "true":
                    e.target.dataset.hiding = "false"
                    e.target.textContent = "Hide " + hiddenTr.length + " Extra Rows"
                    toggle(hiddenTr)
                    break
                case "false":
                    e.target.dataset.hiding = "true"
                    e.target.textContent = "Show " + hiddenTr.length + " Hidden Rows"
                    toggle(hiddenTr)
                    break
            }
        })
        toggle(hiddenTr)
        queueMicrotask(() => { document.querySelector('tbody > tr:not([style="display: none;"]').click() })
    }
}; // SECTION_END CaseNotes
// SECTION_START Case_Notes and Provider_Notes
if (thisPageNameHtm.indexOf("Notes.htm") > -1) {//CaseNotes, ProviderNotes
    //pasted from AHK
    let noteStringText = document.getElementById('noteStringText')
    window.addEventListener('paste', function(event) {
        let pastedText = (event.clipboardData || window.clipboardData).getData("text")
        if (pastedText.indexOf("CaseNoteFromAHK") === 0) {
            event.preventDefault()
            event.stopImmediatePropagation()
            if (notEditMode) {
                document.getElementById('noteSummary').value = "Click the 'New' button first ⬇"
                noteStringText.value = "Click the 'New' button first ⬇"
                document.getElementById('noteCreator').value = "X1D10T"
                document.getElementById('new').animate(redBorder, redBorderTiming)
            } else {
                let aCaseNoteData = pastedText.split('SPLIT')
                if (["Application", "Redetermination"].includes(aCaseNoteData[1])) { document.getElementById('noteCategory').value = aCaseNoteData[1] }
                document.getElementById('noteSummary').value = aCaseNoteData[2]
                noteStringText.value = aCaseNoteData[3]
                eleFocus('#save')
            }
        }
    })
    //AutoCaseNoting; Notes pages section
    if (localStorage.getItem("MECH2.note") !== null) {
        try {
            let noteInfo = JSON.parse(localStorage.getItem("MECH2.note"))[document.querySelectorAll('#providerInput>#providerId, #caseId')[0].value]
            if (noteInfo !== null && noteInfo !== undefined) {
                if (notEditMode) { document.getElementById("new").click() }
                else if (!notEditMode) {
                    let signatureName
                    let workerName = localStorage.getItem('MECH2.userName')
                    if (["CaseNotes.htm"].includes(thisPageNameHtm)) {
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
                    }, 50)
                }
            }
        }
        catch (error) { console.error(error) }
        //End AutoCaseNoting

    } else {
        tabIndxNegOne('#noteArchiveType, #noteSearchStringText, #noteImportant #noteCreator')

        $('label[for="noteCreator"]').siblings().addBack().appendTo($('label[for="noteSummary"]').closest('.row'));
        document.getElementById('noteCreateDate').closest('div.panel-box-format').classList.add('hidden')

        //Duplicate Note
        if (notEditMode) {
            setTimeout(function() {
                document.getElementById('deleteDB').insertAdjacentHTML("afterend", "<button type='button' id='duplicate' class='form-button'>Duplicate</button>")
                document.getElementById('duplicate').addEventListener('click', copyNoteToLS)
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
                    document.getElementById('Autofill').addEventListener('click', pasteNoteToLS)
                    if (["Application", "Redetermination"].includes(oCaseNote.noteCategory)) { oCaseNote.noteSummary = oCaseNote.noteCategory + " update" }
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
}; // SECTION_END Case_Notes and Provider_Notes layout fix
// ////////////////////////////////////////////////////////////////////////// Notes_htm end (major_subsection) \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ================================================================================================================================================================================================

// SECTION_START Case_Overview
if (("CaseOverview.htm").includes(thisPageNameHtm)) {
    $('#participantInformationData').DataTable().order([1, 'asc']).draw() // jQuery table sort order
    // let redetDate = $('label[for="redeterminationDueDate"].col-lg-3').parent().siblings('div.col-lg-3.col-md-3').eq(0).text().trim()
    let redetDate = document.querySelector('label[for="redeterminationDueDate"]').parentNode.nextElementSibling?.nextElementSibling?.innerText
    if (redetDate) {
        document.getElementById('caseInputSubmit').insertAdjacentHTML('afterend', '<button type="button" id="copyFollowUpButton" class="cButton float-right" tabindex="-1">Follow Up Date</button>');
        document.getElementById('copyFollowUpButton').addEventListener('click', function() {
            let redetPlus = addDays(redetDate, 44)
            let localedDate = new Date(redetPlus).toLocaleDateString();
            navigator.clipboard.writeText(localedDate);
            snackBar(localedDate);
        });
    }

    // $('#programInformationData td:contains("HC"), #programInformationData td:contains("FS"), #programInformationData td:contains("DWP"), #programInformationData td:contains("MFIP"), #programInformationData td:contains("WB")').parent().addClass('stickyRow stillNeedsBottom')
    [...document.querySelectorAll('#programInformationData > tbody> tr > td:nth-child(1)')].filter( (e) => ["MFIP", "DWP", "FS"].includes(e.innerText) ).map((e) => { e.parentNode.classList = "stickyRow stillNeedsBottom" })
    // document.querySelectorAll('#programInformationData > tbody> tr > td:nth-child(1)').forEach((e) => { if (["MFIP", "DWP", "FS"].includes(e.textContent)) { e.parentNode.classList = 'stickyRow stillNeedsBottom' } })
    waitForElmHeight('#programInformationData > tbody > tr > td').then(() => {
        document.getElementById('programInformationData').classList.add('toggleTable')
        document.querySelectorAll('.stickyRow').forEach(function(element, index) {
            element.style.bottom = ( (document.querySelectorAll('.stillNeedsBottom').length - 1) * (document.querySelector('#programInformationData').getBoundingClientRect().height / document.querySelectorAll('#programInformationData tbody tr').length) ) + "px"
            element.classList.remove('stillNeedsBottom')
        })
    })
    document.getElementById('personInformationData').addEventListener('click', function() {
        let providerTableFirstChildren = document.querySelectorAll('#providerInformationData>tbody>tr>td:first-child')
        providerTableFirstChildren.forEach((e) => { if (e.textContent > 0) { e.outerHTML = '<td><a href="ProviderOverview.htm?providerId=' + e.textContent + '" target="_blank">' + e.textContent + '</a></td>' } })
    })
}; // SECTION_END Case_Overview
// SECTION_START Case_Page_Summary
if (("CasePageSummary.htm").includes(thisPageNameHtm)) {
    if (!document.querySelector('[id="Wrap Up"] >a').classList.value.includes('disabled_lightgray')) {
        $('#caseInputSubmit').after('<a href="/ChildCare/CaseWrapUp.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3 + '"> <input class="form-button doNotDupe" type="button" name="wrapUp" id="wrapUp" value="Wrap-Up" title="Wrap-Up"></a>')
    }
} // SECTION_END Case_Page_Summary
// SECTION_START Case_Payment_History
if (("CasePaymentHistory.htm").includes(thisPageNameHtm)) {
    document.querySelectorAll('#paymentHistoryTable>tbody>tr>td:nth-of-type(3)').forEach((e) => {
        let linkText = e.innerText
        e.innerHTML = '<td><a href="FinancialBilling.htm?parm2=' + caseId + '&parm3=' + linkText.replace(" - ", "").replaceAll("/", "") + '", target="_blank">' + linkText + '</a></td>'
    });
    addDateControls('#paymentPeriodBegin')
    addDateControls('#paymentPeriodEnd')
    // Copy_Provider_And_Child_Payments
    let providerTableList = new Set()
    let childTableList = new Set()
    evalData().then(async function(result) {
        for (let row in result[0]) {
            providerTableList.add(result[0][row].providerName)
        }
        for (let row in result[1]) {
            childTableList.add(result[1][row].childName)
        }
        let providerSelectList = ""
        providerTableList.forEach((provider) => {
            let tempText = "<option>" + provider + "</option>"
            providerSelectList += tempText
        })
        let childSelectList = ""
        childTableList.forEach((child) => {
            let tempText = "<option>" + child + "</option>"
            childSelectList += tempText
        })
        let getPaymentHTML1 = '<div style="display: flex;"><div style="margin: 10px 0 0 auto; display: flex; gap: 10px;" id="paymentFilterDiv"><select style="width: fit-content;" class="form-control" id="filterProvider"><option value>Provider Filter...</option>'
        let getPaymentHTML2 = '</select><select style="width: fit-content;" class="form-control" id="filterChild"><option value>Child Filter...</option>'
        let getPaymentHTML3 = '</select><button class="form-button" type="button" id="sendPaymentInfoToCB">Copy Payments</button></div></div>'
        document.getElementById('secondaryActionArea').insertAdjacentHTML('afterend', getPaymentHTML1 + providerSelectList + getPaymentHTML2 + childSelectList + getPaymentHTML3)
        document.getElementById('sendPaymentInfoToCB').addEventListener('click', function() {
            let selectedProvider = document.querySelector('#filterProvider').value
            let selectedChild = document.querySelector('#filterChild').value
            getProviderAndChildPaymentInfo(selectedProvider, selectedChild)
        })
    })
    function getProviderAndChildPaymentInfo(providerName, childName) {
        let providerPaymentListString
        let childPaymentListString
        evalData().then(function(result) {
            let childPaymentListArray = []
            let providerPaymentListArray = []
            let providerNameList = providerName.length > 0 ? [providerName] : providerTableList
            providerNameList.forEach(function(provider) {
                for (let row in result[0]) {
                    let thisRow = result[0][row]
                    if (thisRow.providerName === provider) {
                        providerPaymentListArray.push([ thisRow.billingPeriod, thisRow.providerName, thisRow.issuanceAmount, thisRow.copayAmount, thisRow.recoupAmount ].join("\t") )
                    }
                }
            })
            providerPaymentListString = providerPaymentListArray.sort(((a, b) => a.slice(10) > b.slice(10))).join("\r\n")
            let childNameList = childName.length > 0 ? [childName] : childTableList
            childNameList.forEach(function(child) {
                for (let row in result[1]) {
                    let thisRow = result[1][row]
                    let correspondingTableOneRow = result[0][ thisRow.rowIndex2 ]
                    let providerCheck = (providerName.length < 1 || correspondingTableOneRow.providerName === providerName) ? 1 : 0
                    if (thisRow.childName === child && providerCheck) {
                        childPaymentListArray.push([ correspondingTableOneRow.billingPeriod, correspondingTableOneRow.providerName, thisRow.amount, thisRow.childName, ].join("\t") )
                    }
                }
            })
            childPaymentListString = childPaymentListArray.sort(((a, b) => a.slice(10) > b.slice(10))).join("\r\n")
            let providerPaymentHeaders = providerPaymentListString.length > 0 ? "Care Period\tProvider\tPayment\tCopay\tRecoup\r\n" : ""
            let childPaymentHeaders = childPaymentListString.length > 0 ? "Care Period\tProvider\tPre-Copay Amount\tChild\r\n" : ""
            navigator.clipboard.writeText(providerPaymentHeaders + providerPaymentListString + "\r\n\r\n" + childPaymentHeaders + childPaymentListString)
            snackBar('Child and Provider Payments')
        })
    }
}; // SECTION_END Case_Payment_History
// SECTION_START Case_Reapplication_Add_Ccap
if (("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) {
    $('input[type=checkbox]').each(function() {
        if (!$(this).prop('checked')) {
            $(this).parents('tr').css('background-color', 'yellow');
        };
    });
}; // SECTION_END Case_Reapplication_Add_Ccap
// SECTION_START Case_Redetermination
if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
    if (iFramed) {
        if (addDays(document.getElementById('lastRedeterminationDate').value, 405) < new Date(document.getElementById('redeterminationDueDate').value)) { sessionStorage.removeItem('MECH2.suspendPlus45') }
        else {
            let suspendPlus45 = JSON.parse(sessionStorage.getItem('MECH2.suspendPlus45'))
            let caseToDelay = suspendPlus45.id ?? undefined
            let delayDate = suspendPlus45.delayDate ?? undefined
            if (notEditMode && sessionStorage.getItem('MECH2.suspendPlus45') === 'finished') { sessionStorage.removeItem('MECH2.suspendPlus45') }
            if (notEditMode && caseToDelay === caseId && !document.querySelector('strong.rederrortext')) { document.getElementById('edit').click() }
            if (!notEditMode && caseToDelay === caseId) {
                document.getElementById('redeterminationDueDate').value = delayDate
                sessionStorage.setItem('MECH2.suspendPlus45', 'finished')
                document.getElementById('save').click()
            }
        }
    }
    $('#receiveDate').on('input change', function() {
        if ($(this).val().length === 10 && Math.abs(new Date().getFullYear() - $(this).val().slice(6)) < 2) {
            eleFocus('#save')
            $('.hasDatepicker').datepicker("hide")
        }
    })
} // SECTION_END Case_Redetermination
// SECTION_START Case_Reinstate
// SECTION_END Case_Reinstate
// SECTION_START Case_School
if (["CaseSchool.htm"].includes(thisPageNameHtm)) {
    if (!notEditMode) {
        async function kindergartenStartDate(memberArray, memberNumber) {
            let memberMatch = memberArray.filter((obj) => obj.memberReferenceNumber === memberNumber)
            let birthDate = new Date(memberMatch[0].memberBirthDate)
            let approxAge = new Date().getFullYear() - birthDate.getFullYear()
            if (approxAge < 17) {
                let eightteenButStillHHmember = document.getElementById('memberFinancialSupport50PercentOrMore')
                eightteenButStillHHmember.value = ""
                eightteenButStillHHmember.setAttribute("disabled", "disabled")
            }
            if (approxAge > 10) { return false }
            if (approxAge > 6) {
                !document.getElementById('memberSchoolStatus').value && (document.getElementById('memberSchoolStatus').value = "Fulltime")
                !document.getElementById('memberSchoolType').value && (document.getElementById('memberSchoolType').value = "Preschool Through  Sixth Grade")
                !document.getElementById('memberSchoolVerification').value && (document.getElementById('memberSchoolVerification').value = "No Verification  Provided")
                !document.getElementById('memberKindergartenStart').value && (document.getElementById('memberKindergartenStart').value = formatDate(addDays(laborDay, 3), "mmddyyyy"))
                !document.getElementById('memberHeadStartParticipant').value && (document.getElementById('memberHeadStartParticipant').value = "No")
            }
            let fifthBirthDate = new Date(birthDate.setFullYear(birthDate.getFullYear() + 5))
            let laborDay = getDateofDay(fifthBirthDate.getFullYear(), 8, 0, 1)
            if (fifthBirthDate > laborDay) { laborDay = getDateofDay(fifthBirthDate.getFullYear() + 1, 8, 0, 1) }
            !document.getElementById('memberSchoolStatus').value && (document.getElementById('memberSchoolStatus').value = "Not Attending School")
            !document.getElementById('memberSchoolType').value && (document.getElementById('memberSchoolType').value = "Child Not in School")
            !document.getElementById('memberSchoolVerification').value && (document.getElementById('memberSchoolVerification').value = "No Verification  Provided")
            !document.getElementById('memberKindergartenStart').value && (document.getElementById('memberKindergartenStart').value = formatDate(addDays(laborDay, 3), "mmddyyyy"))
            !document.getElementById('memberHeadStartParticipant').value && (document.getElementById('memberHeadStartParticipant').value = "No")
            eleFocus('#saveDB')
        }
        if (document.querySelectorAll('#schoolMemberTable > tbody > tr.selected').length === 1) {
            let memberArray = await evalData(undefined, "CaseMember", undefined, "0")
            let memberNumber = document.querySelector('#schoolMemberTable > tbody > tr.selected > td:nth-child(1)').textContent
            if (Number(memberNumber) > 2) { kindergartenStartDate(memberArray, memberNumber) }
        }
        if (document.getElementById('memberReferenceNumberNewMember')) {
            let memberArray = await evalData(undefined, "CaseMember", undefined, "0")
            document.getElementById('memberReferenceNumberNewMember').addEventListener('blur', function(e) {
            let memberNumber = document.getElementById('memberReferenceNumberNewMember').value
                if (Number(e.target.value) > 2) { kindergartenStartDate(memberArray, memberNumber) }
            })
        }
    }
} // SECTION_END Case_School
// SECTION_START Hide_Duplicate_Buttons_when_no_SA
if (["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
    queueMicrotask(() => {
        if (document.querySelector('strong.rederrortext')?.textContent.indexOf('No results') > -1) {
            document.getElementById('secondaryActionArea').style.display = "none"
            eleFocus('#submit')
        }
    })
} // SECTION_END Hide_Duplicate_Buttons_when_no_SA
// SECTION_START Case_SA_Approval_Package
if (("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) {
    let serviceAuthorizationInfoTable = document.querySelector('#serviceAuthorizationInfoTable')
    serviceAuthorizationInfoTable.addEventListener('click', function(e) {
        if (providerInfoTableRowIndex !== providerInfoTable.querySelector('tbody > tr.selected').rowIndex) {
            queueMicrotask(() => {
                providerInfoTable.querySelector('tbody > tr:nth-child(' + providerInfoTableRowIndex + ')').click()
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
} // SECTION_END Case_SA_Approval_Package
// SECTION_START SA_Overview Fill_manual_Billing_Forms
if (("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm)) {
    if (typeof userCountyObject !== undefined && userCountyObject.code === "169") {
        document.getElementById('csicTableData1')?.insertAdjacentHTML('beforebegin', `
            <div style="overflow: hidden" id="billingFormDiv">
                <div class="form-group" style="display: flex; gap: 15px; margin-left: 10px; align-items: center;">
                    <button type="button" class="cButton" tabindex="-1" id="billingForm" style="display: inline-flex;">Create Billing Form</button>
                    <label for="copayAmount" class="control-label" style="display: inline-flex;"> Copay Amount: $</label>
                    <span id="copayAmountGet" style="display: inline-flex; margin-left: -5px;">-</span>
                    <button type="button" class="cButton" tabindex="-1" id="providerAddressButton" style="display: inline-flex;">Copy Provider Address</button>
                </div>
            </div>
        `);
    }
    document.getElementById('status').style.width = "15ch"
    document.getElementById('status')?.closest('.col-lg-4').insertAdjacentHTML('beforeend', '<button type="button" class="cButton float-right" tabindex="-1" id="copySAinfo" style="display: inline-flex;">Copy for Email</button>')
    document.getElementById('providerAddressButton')?.addEventListener('click', function() {
        let providerIdInTable = document.querySelector('#providerInfoTable .selected td:first-child').textContent
        let providerNameInTable = document.querySelector('#providerInfoTable .selected td:first-child').textContent
        evalData(providerIdInTable, 'ProviderAddress', undefined, "0.0", 'provider').then(function(providerAddress) {
            const providerMailToAddress = determineProviderAddress(providerAddress)
            navigator.clipboard.writeText(providerMailToAddress);
            snackBar(providerMailToAddress);
        });
    })
    function determineProviderAddress(providerAddress) {
        let providerNameInTable = document.querySelector('#providerInfoTable .selected td:nth-child(2)').textContent
        if (providerAddress.mailingStreet1 === '') {
            return providerNameInTable + "\n" + providerAddress.mailingSiteHomeStreet1 + " " + providerAddress.mailingSiteHomeStreet2 + "\n" + providerAddress.mailingSiteHomeCity + ", " + providerAddress.mailingSiteHomeState + " " + providerAddress.mailingSiteHomeZipCode
        } else {
            return providerNameInTable + "\n" + providerAddress.mailingStreet1 + " " + providerAddress.mailingStreet2 + "\n" + providerAddress.mailingCity + ", " + providerAddress.mailingState + " " + providerAddress.mailingZipCode
        }
    }
    document.getElementById('billingForm')?.addEventListener('click', () => fetchCopay("billingForm"))
    document.getElementById('copySAinfo')?.addEventListener('click', () => fetchCopay("clipboard"))
    async function fetchCopay(destination) {
        if (document.getElementById('copayAmountManual')) {
            document.getElementById('copayAmountManual').value !== "" && billingFormInfo(document.getElementById('copayAmountManual').value, destination)
        } else {
            await evalData(caseId, 'CaseCopayDistribution', periodDates.parm3, undefined, "case").then((result) => {
                getCopayFromResult(result, destination)
            })
        }
    }
    function getCopayFromResult(result, destination) {
        if (result === undefined) {
            $('#copayAmountGet').replaceWith('<input class="centered-text form-control" style="height: 22px; width: 40px;" id="copayAmountManual"></input><a href="/ChildCare/CaseCopayDistribution.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3 + '" target="_blank">Copay Page</a>');
            snackBar('Auto-retrieval of copay failed.', 'blank')
        } else {
            for (let item in result[1]) {
                let domParsing = new DOMParser
                let providerParsedName = domParsing.parseFromString(result[1][item].providerName, "text/html").documentElement.textContent // normalizing characters such as & from &amp;
                if (providerParsedName === document.querySelector('#providerInfoTable > tbody > tr.selected > td:nth-child(2)').textContent) {
                    let integerCopay = parseInt(result[1][item].copay).toString()
                    document.getElementById('copayAmountGet').textContent = integerCopay
                    return saFilterEvalData(integerCopay, destination)
                }
            }
        }
    }
    async function saFilterEvalData(integerCopay, destination) {
        let providerNameInTable = document.querySelector('#providerInfoTable > tbody > tr.selected > td:nth-child(2)').textContent
        evalData().then((saEvalData) => {
            let domParsing = new DOMParser
            for (let saRowIndex in saEvalData[0]) {
                let providerParsedName = domParsing.parseFromString(saEvalData[0][saRowIndex].providerName, "text/html").documentElement.textContent
                if (providerParsedName === providerNameInTable) {
                    let saProviderRowIndex = saEvalData[0][saRowIndex].providerRowIndex
                    let i = 0
                    const childMatches = {}
                    for (let saChildRowIndex in saEvalData[1]) {
                        if (saEvalData[1][saChildRowIndex].providerRowIndex === saProviderRowIndex) {
                            childMatches["child" + i] = saEvalData[1][saChildRowIndex]
                            i++
                        }
                    }
                    return billingFormInfo(childMatches, integerCopay, destination)
                }
            }
        })
    }
    function billingFormInfo(childMatches, integerCopay, destination) {
        let childList = {};
        for (let child in childMatches) {
            let thisChild = childMatches[child]
            childList[child] = { name: reorderCommaName(toTitleCase(thisChild.childName)), authHours: thisChild.authorizedHours, ageCat0: thisChild.ageRateCategory, ageCat1: thisChild.ageRateCategory2 }
        }
        let oCaseName = commaNameToObject($('#caseHeaderData div.col-lg-4').contents().eq(2).text())
        const formInfo = { // blarg convert to evalData
            pdfType: "BillingForm",
            xNumber: userXnumber,
            caseFirstName: oCaseName.first,
            caseLastName: oCaseName.last,
            caseName: oCaseName.first + " " + oCaseName.last,
            caseNumber: caseId,
            startDate: periodDates.start,
            endDate: periodDates.end,
            providerId: document.querySelector('#providerInfoTable .selected td:nth-child(1)').textContent,
            providerName: document.querySelector('#providerInfoTable .selected td:nth-child(2)').textContent,
            copayAmount: integerCopay ? integerCopay : document.getElementById('copayAmountManual').value,
            attendance0: new Date(periodDates.start).toLocaleDateString('en-US', { year: "2-digit", month: "numeric", day: "numeric" }),
            attendance7: addDays(periodDates.start, 7).toLocaleDateString('en-US', { year: "2-digit", month: "numeric", day: "numeric" }),
            children: childList,
        }
        if (formInfo.copayAmount.length && destination === "billingForm") { window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank") }
        else if (formInfo.copayAmount.length && destination === "clipboard") {
            let clipboardObject = {}
            let childInfoArray = []
            for (let child in formInfo.children) {
                let array1 = [[["Child:", formInfo.children[child].name], ["Authorized Hours:", formInfo.children[child].authHours], ["Age Category:", formInfo.children[child].ageCat0 ?? formInfo.children[child].ageCat1], ["Authorization Starts:", childMatches[child].saBegin]]
                    .map((e) => e.join(" "))].join()
                childInfoArray.push(array1)
                let array2 = [[["Hourly: $", childMatches[child].hourly ?? childMatches[child].hourly2], ["Daily: $", childMatches[child].daily ?? childMatches[child].daily2], ["Weekly: $", childMatches[child].weekly ?? childMatches[child].weekly2], ["Provider Primary/Secondary:", childMatches[child].providerDesignation ?? childMatches[child].providerDesignation2], ["\n"]]
                    .map((e) => e.join(" "))].join()
                childInfoArray.push(array2)
            }
            let joinedChildInfoArray = childInfoArray.join("\n").replace(/,\n/g, "\n").replace(/,/g, ",   ")
            joinedChildInfoArray += "\nCopayment for biweekly period " + periodDates.range + ": $" + formInfo.copayAmount
            navigator.clipboard.writeText(joinedChildInfoArray)
            snackBar('Copied Service Authorization Info!', 'blank')
        }
    }
}; // SECTION_END Case SA_Overview Fill_manual_Billing_Forms
// SECTION_START Special_Letters
if (["CaseSpecialLetter.htm", "CaseMemo.htm", "ProviderMemo.htm", "ProviderSpecialLetter.htm"].includes(thisPageNameHtm)) {
    if ( document.getElementById('status') ) {
        document.getElementById('status').value = "Application"
        doEvent("#status")
        document.getElementById('status').value = ""
    }
    //click checkbox if clicking label
    if (document.querySelector('.panel-box-format')) {
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
    document.querySelectorAll('div.col-lg-offset-3').forEach(function(e) {
        e.firstElementChild.setAttribute("for", e.querySelector('input.checkbox').id)
    })
    document.querySelector('#status, #activity').addEventListener('input', function() { setTimeout(function() { resetTabIndex() }, 300) })

    let commentsText = document.querySelector('#comments, #memberComments, #textbox1')
    // [ "proofOfIdentity", "proofOfActivitySchedule", "proofOfBirth", "providerInformation", "proofOfRelation", "childSchoolSchedule", "citizenStatus", "proofOfDeductions", "proofOfResidence", "scheduleReporter", "proofOfAty", "twelveMonthReporter", "proofOfFInfo", "other" ]
    window.addEventListener('paste', function(e) { //AHK code: "LetterTextFromAHKSPLIT" %LetterGUINumber% "SPLIT" MEC2DocType "SPLIT" IdList
        let pastedText = (event.clipboardData || window.clipboardData).getData("text")
        if (pastedText.indexOf("LetterTextFromAHK") === 0) {
            e.preventDefault()
            e.stopImmediatePropagation()
            let aSpecialLetterData = pastedText.split('SPLIT') // [0] = SpecialLetterFromAHK, [1] = gid('comments').value [2] = gid('status').value ("Application", "Homeless App", "Ongoing", "Redetermination"), [3] = checkbox values,
            if (document.getElementById('status')) {
                document.getElementById('status').value = aSpecialLetterData[2]
                void doEvent('#status')
                let checkboxIds = aSpecialLetterData[3].split(',')
                for (let checkbox in checkboxIds) {
                    document.getElementById(checkboxIds[checkbox]).click()
                }
            }
            commentsText.value = aSpecialLetterData[1]
            eleFocus('#save')
        }
    })

} // SECTION_END Special_Letters
// SECTION_START Case_Special_Needs
if (["CaseSpecialNeeds.htm"].includes(thisPageNameHtm)) {
    document.getElementById('reasonText').setAttribute('type', 'text')
}; // SECTION_END Case_Special_Needs
// SECTION_START Case_Support_Activity
if (("CaseSupportActivity.htm").includes(thisPageNameHtm)) {
    let doNoReset = [ "#tempLeavePeriodBegin", "#tempLeavePeriodEnd", "#activityEnd" ]
    $('#activityBegin').blur(function() {
        if ($('#memberDescription').val() === "PE" || $('#memberDescription').val() === "NP") {//extended elig
            $('#activityEnd').val($('#activityBegin').val())
            doEvent("#activityEnd")
            $('#verification').val("Other")
            $('#planRequired').val("No")
            eleFocus('#save')
        }
    })
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
                document.getElementById('planApproved').value = "Yes"
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
        void doEvent("#planRequired")
        void resetTabIndex(doNoReset)
    })
    document.getElementById('planRequired').addEventListener('change', () => void resetTabIndex(doNoReset) )
}; // SECTION_END Case_Support_Activity
// SECTION_START Case_Transfer AutoTransfer to worker ID
if (("CaseTransfer.htm").includes(thisPageNameHtm)) {
    if (iFramed && notEditMode) {
        window.onmessage = (event) => {
            if (event.origin !== "https://mec2.childcare.dhs.state.mn.us") return false;
            if (event.data[0] === "newTransfer") { startWorkerTransfer(event.data[1]) }
        }
    }
    let ssTransferCase = 'MECH2.caseTransfer.' + caseId
    let ssError = "MECH2.transferError"
    let transferWorkerIdLS = localStorage.getItem('MECH2.closedCaseBank') ?? ''
    let transferWorkerId = (/[a-z0-9]{7}/i).test(transferWorkerIdLS) ? transferWorkerIdLS : ''
    let transferSS = sessionStorage.getItem(ssTransferCase) ?? ''
    let redText = document.querySelector('strong.rederrortext')?.textContent ?? sessionStorage.getItem(ssError)
    const redTextMap = new Map([
        ["Transfer To Worker ID is not valid for Servicing Agency.", "Invalid Agency"],
        ["Transfer To Worker ID is invalid.", "Invalid Worker"],
        ["Transfer To Worker ID is missing.", "ID is blank"],
        ["Transfer From Worker ID cannot be the same as Transfer To Worker ID.", "Same Worker ID"],
        ["Case Number is missing.", "No case #"],
        ["Case Number does not exist for this period.", "Check individually"],
    ])
    if (redText) { queueMicrotask(() => checkRedErrorText()) }

    if (transferSS) {
        if (notEditMode) {
            switch (transferSS) { /* eslint-disable no-fallthrough */
                case "transferStart":
                    sessionStorage.setItem(ssTransferCase, 'transferActive')
                    document.getElementById('new').click()
                    break
                case "transferError":
                    document.querySelector('form#caseTransferDetail').insertAdjacentHTML('afterbegin', '<div class="error_alertbox_new"><img src="images/error_alert_small.png"><strong class="rederrortext">' + sessionStorage.getItem(ssError) + '</strong></div>')
                    sessionStorage.removeItem(ssError) // no break
                case "transferDone":
                    sessionStorage.removeItem(ssTransferCase)
                    parent.postMessage(['transferStatus', 'Success'], "https://mec2.childcare.dhs.state.mn.us")
                    break
            } /* eslint-enable no-fallthrough */

        }
        if (!notEditMode && transferWorkerId && transferSS === "transferActive") {
            doCaseTransfer()
        }
    };
    if (!iFramed) {
        // document.getElementById('caseTransferFromType').addEventListener('change', (() => {
        //     resetTabIndex()
        //     setTimeout(() => {
        //         tabIndxNegOne('#workerSearch')
        //         document.querySelectorAll(':is(input, select).form-control[readonly]').forEach((e) => { e.setAttribute('disabled', 'disabled') })
        //     }, 300)
        // }))
        document.getElementById('footer_links').insertAdjacentHTML('beforeend', '<span class="footer" tabindex="-1">ı</span><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_140754" target="_blank">Moving to New County</a>')
    }
    if (notEditMode && !iFramed) {
        document.getElementById('secondaryActionArea').insertAdjacentHTML('afterend', `
<div style="display: inline-flex; padding: 10px 20px 0 20px; float: right !important;">
    <button type="button" class="cButton" tabindex="-1" style="float: left; margin-right: 10px; padding: 3px 6px;" id="sendMemo">Memo</button>
    <button type="button" class="cButton" tabindex="-1" style="float: left; margin-right: 30px; padding: 3px 6px;" id="sendMemo">Reset</button>
    <button type="button" class="cButton" tabindex="-1" style="float: left;" id="closedTransfer">Transfer to:</button>
    <input type="text" class="form-control" style="float: left; margin-left: 10px; width: var(--eightNumbers)" id="transferWorker" placeholder="Worker #" value=${transferWorkerId}></input>
</div>
        `)
        document.getElementById('transferWorker')?.addEventListener('blur', function() { validateTransferWorkerId(this.value) })
        document.getElementById('closedTransfer')?.addEventListener('click', function() {
            if (checkTransferWorkerId()) {
                sessionStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferActive')
                document.getElementById('new').click()
            }
        })
        document.getElementById('sendMemo')?.addEventListener('click', function() {
            // make into its own function so it can work on CaseList pages
            // on active case list page: make a button to "activate transfer mode" which then shows buttons by every case (akin to inactive). Clicking buttons transfers the case and sends a memo. Also shows the xfer worker and memo reset button.
            if (localStorage.getItem('transferMemo') === "") { return }
        })
    }
    if (iFramed && notEditMode) {
        queueMicrotask(() => {
            if (!caseId) { parent.postMessage(['transferStatus', 'pageLoaded'], "https://mec2.childcare.dhs.state.mn.us") }
        })
    }

    function checkRedErrorText() {
        if (!notEditMode && document.querySelector('strong.rederrortext')) {
            redText = document.querySelector('strong.rederrortext')?.textContent
            switch (redText) {/* eslint-disable no-fallthrough */
                case "Transfer To Worker ID is not valid for Servicing Agency.":
                case "Transfer To Worker ID is invalid.":
                    localStorage.removeItem('MECH2.closedCaseBank')
                case "Transfer To Worker ID is missing.":
                case "Transfer From Worker ID cannot be the same as Transfer To Worker ID.":
                    sessionStorage.setItem(ssTransferCase, 'transferError')
                    sessionStorage.setItem(ssError, redText)
                    document.getElementById('cancel').click()
                    break
            }/* eslint-enable no-fallthrough */
        } else if (notEditMode && redText) {
            if (redText === "Case Number is missing.") { return }
            else if (redText.includes("CASE LOCKED")) {
                iFramed && parent.postMessage(['transferError', 'Locked Case'], "https://mec2.childcare.dhs.state.mn.us")
            } else {
                let errorMessage = redTextMap.get(redText)
                sessionStorage.removeItem(ssTransferCase)
                sessionStorage.removeItem(ssError)
                iFramed && parent.postMessage(['transferError', errorMessage], "https://mec2.childcare.dhs.state.mn.us")
            }
        }
    }
    function startWorkerTransfer(transferCase) {
        if (transferCase) {
            sessionStorage.setItem('MECH2.caseTransfer.' + transferCase, 'transferStart')
            window.open("/ChildCare/CaseTransfer.htm?parm2=" + transferCase, "_self")
        }
    }
    function doCaseTransfer() {
        let caseTransferFromType = document.querySelector('#caseTransferFromType')
        if (caseTransferFromType.querySelector('option[value="Worker To Worker"]')) {
            sessionStorage.setItem(ssTransferCase, 'transferDone')
            caseTransferFromType.value = "Worker To Worker"
            doEvent('#caseTransferFromType')
            document.getElementById('caseTransferToWorkerId').value = transferWorkerId
            doEvent('#caseTransferToWorkerId')
            document.getElementById('save').click() // disable while testing!
        }
    };
    function checkTransferWorkerId() {
        if (transferWorkerId) { return 1 }
        else { eleFocus('#transferWorker'); document.getElementById('transferWorker').animate(redBorder, redBorderTiming); return 0 }
    }
    function validateTransferWorkerId(transferIdOfWorker) {
        if ((/[a-z0-9]{7}/i).test(transferIdOfWorker)) {
            if (transferWorkerId !== transferIdOfWorker) {
                localStorage.setItem('MECH2.closedCaseBank', transferIdOfWorker)
                transferWorkerId = transferIdOfWorker
            }
            return 1
        } else {
            transferWorkerId = ''
            localStorage.removeItem('MECH2.closedCaseBank')
            document.getElementById('transferWorker').setAttribute('placeholder', 'Invalid #')
            document.getElementById('transferWorker').animate(redBorder, redBorderTiming)
            eleFocus('#transferWorker')
            return 0
        }
    }
} // SECTION_END Case_Transfer
// SECTION_START Unearned_Income
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
    if (!notEditMode) { tempIncomes('tempIncome', 'paymentEndDate') }
} // SECTION_END Unearned_Income
// SECTION_START Case_Wrap_Up
if (("CaseWrapUp.htm").includes(thisPageNameHtm) && $('#done').attr('Disabled')) {
    $('#caseHeaderData').after(`<div id="postWrapUpButtons" class="flex-horizontal">
    <button class="form-button" type="button" id="goEligibility">Eligibility</button>
    <button class="form-button" type="button" id="goSAOverview">SA Overview</button>
    <button class="form-button" type="button" id="goSAApproval">SA Approval</button>
    <button class="form-button" type="button" id="goEditSummary">Edit Summary</button>
    <button class="form-button" type="button" id="goSpecialLetter">Special Letter</button>
    <button class="form-button" type="button" id="goCaseTransfer">Case Transfer</button>
    </div>`)
    $('#goEligibility').click(function() { window.open('/ChildCare/CaseEligibilityResultSelection.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSAOverview').click(function() { window.open('/ChildCare/CaseServiceAuthorizationOverview.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSAApproval').click(function() { window.open('/ChildCare/CaseServiceAuthorizationApproval.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goEditSummary').click(function() { window.open('/ChildCare/CaseEditSummary.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goSpecialLetter').click(function() { window.open('/ChildCare/CaseSpecialLetter.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    $('#goCaseTransfer').click(function() { window.open('/ChildCare/CaseTransfer.htm?parm2=' + caseId + '&parm3=' + periodDates.parm3, '_self') });
    eleFocus('#goEligibility')

    sessionStorage.removeItem('actualDateSS')
    sessionStorage.removeItem('processingApplication')
    localStorage.removeItem('MECH2.autoCaseNote')
    localStorage.removeItem('MECH2.copiedNote')
    Object.keys(localStorage).forEach(function(e) {
        if (e.includes("MECH2.caseTransfer")) {
            localStorage.removeItem(e)
        }
    })
}; // SECTION_END Case_Wrap_Up
// SECTION_START Client_Search
if (("ClientSearch.htm").includes(thisPageNameHtm)) {
    document.getElementById('selectBtnDB') && document.querySelector('#clientSearchTable>tbody').addEventListener('click', function() { eleFocus('#selectBtnDB') })
    if (document.getElementById('resetbtn')) {
        document.querySelectorAll('input.form-control, select.form-control').forEach(function(e) {
            e.removeAttribute('disabled')
        })

        let clientSearchNthChild = { "ssnReq": 1, "lastNameReq": 3, "firstNameReq": 4, "genderReq": 6, "birthdateReq": 7, "pmiReq": 9 }
        let searchTable = document.querySelector('#clientSearchTable')
        for (let field in clientSearchNthChild) {
            let fieldValue = document.getElementById([field]).value
            if (field === "genderReq") {
                if (fieldValue === 'M') { fieldValue = "Male" }
                else if (fieldValue === 'F') { fieldValue = "Female" }
            }
            let segmentedFields = ['ssnReq', 'birthdateReq']
            if (fieldValue) {
                searchTable.querySelectorAll('tbody > tr > td:nth-child(' + clientSearchNthChild[field] + ')').forEach(function(ele, row) {
                    if (fieldValue.length && ele.textContent === fieldValue) { ele.classList.add('match') }

                    if (fieldValue.length && !ele.classList.contains('match') && ele.textContent.length && segmentedFields.includes(field)) {
                        let haystack = ele.textContent.split(/-|\//)
                        let needle = fieldValue.split(/-|\//)
                        // for (let i = 0; i < haystack.length; i++) {
                        //     if (haystack[i] === needle[i]) {
                        //         if (needle[0] !== needle[1] && haystack.filter((e) => e.match(needle[i])).length > 1) {
                        //             let firstHay = new RegExp("(?:"+haystack[i]+")"+haystack[i]) // blarg can't figure out how to target a specific instance... maybe with an index?!
                        //             ele.innerHTML = ele.innerHTML.replace(/(?:haystack[i])/, '<span class="match">'+haystack[i]+'</span>')
                        //         }
                        //         ele.innerHTML = ele.innerHTML.replace(haystack[i], '<span class="match">'+haystack[i]+'</span>')
                        //     }
                        // }
                        let filteredSplit = haystack.filter((split) => needle.includes(split))
                        if (filteredSplit.length) {
                            filteredSplit.forEach((match) => { ele.innerHTML = ele.innerHTML.replace(match, '<span class="match">' + match + '</span>') })
                        }
                    }
                })
            }
        }
    }
    let resultTable = document.getElementById('clientSearchProgramResults')
    if (resultTable) {
        waitForTableCells('#clientSearchProgramResults').then(() => {
            resultTable.querySelectorAll('tbody > tr > td:nth-child(2)').forEach((e) => {
                if (["MFIP/DWP Child Care", "Basic Sliding Fee", "Transition Year", "Transition Year Extension"].includes(e.innerText)) { e.classList.add('match') }
            })
            resultTable.querySelectorAll('tbody > tr > td:nth-child(3)').forEach((e) => {
                if (e.innerText.indexOf("Current") > -1) { e.classList.add('match') }
            })
        })
    }
}; // SECTION_END Client_Search
// SECTION_START Financial_Billing
if (("FinancialBilling.htm").includes(thisPageNameHtm)) {
    if (!notEditMode) {
        let weekOneMonday = document.querySelector('#weekOneMonday')
        let billedHoursPanel = weekOneMonday.closest('div.panel-box-format')
        // let billedHoursPanel = document.querySelector('div.panel-box-format:has(#weekOneMonday)')
        $('#billedTimeTableData').nextAll('div.form-group').eq(0).keydown(function(e) {
            if (e.target.id === "billedTimeType" && e.key === 'Tab' && e.shiftKey && e.target.value === '') {
                e.preventDefault()
                eleFocus('#registrationFee')
            }
            else if (e.target.id === "billedTimeType" && e.key === 'Tab' && !e.shiftKey && e.target.value === '') {
                e.preventDefault()
                eleFocus('#weekOneMonday')
                weekOneMonday.select()
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
        weekOneMonday.closest('table').addEventListener('keyup', function(e) {
            if (e.target.id.indexOf('week') === 0) {
                if (e.target.value !== 0 && e.target.value !== '') { addBillingRows(e.target.id) }
                else if (e.target.value === '') { e.target.value = 0 }
            }
        })
    }
    if (notEditMode) {
        document.getElementById('FinancialBillingApprovalSelf').addEventListener('click', function() {
            if (caseId.length && document.querySelectorAll('#billingProviderTable>tbody>tr.selected')?.length) {
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
}; // SECTION_END Financial_Billing
// SECTION_START Financial_Billing_Approval
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
}; // SECTION_END Financial_Billing_Approval
// SECTION_START Financial_Manual_Payment
if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) {
    let manualSelectPeriodToReverse = document.getElementById('mpSelectBillingPeriod')
    selectPeriodReversal(manualSelectPeriodToReverse)
}; // SECTION_END Financial_Manual_Payment
// SECTION_START Inactive_Case_List Transfer cases to closed case bank
if (("InactiveCaseList.htm").includes(thisPageNameHtm) && document.querySelector('#inActiveCaseTable > tbody > tr:nth-child(2)')) {
    listPageLinksAndList()
    let closedCaseLS = localStorage.getItem('MECH2.closedCaseBank') ?? ''
    let closedCaseBank = (/[a-z0-9]{7}/i).test(closedCaseLS) ? closedCaseLS : ''
    // let validTransferWorker = (/[a-z0-9]{7}/i).test(closedCaseBank)
    let closedCaseBankLastThree = (closedCaseBank) ? closedCaseBank.slice(4) : ''
    let todayDate = new Date().getTime();
    let changedToLinks
    let iframeContainer
    let transferiframe
    let lsError = "MECH2.transferError"
    document.querySelectorAll('#inActiveCaseTable > tbody > tr > td:nth-of-type(4)').forEach(function(e) {
        let thisTd = e
        let closedDatePlus46 = addDays(thisTd.textContent, 46).getTime();
        if (closedDatePlus46 < todayDate) {
            let closedDate = thisTd.textContent
            thisTd.textContent = ''
            thisTd.insertAdjacentHTML('beforeend', '<a href="CaseTransfer.htm?parm2=' + thisTd.parentNode.firstChild.textContent + '", target="_blank">' + closedDate + '</a>')
            thisTd.closest('tr').classList.add('oldClosed')
            if (closedCaseBank) { thisTd.insertAdjacentHTML('beforeend', '<span class="cSpan">→ ' + closedCaseBankLastThree + '</span>') }
        };
    })
    $('#workerSearch').closest('.col-lg-12').append(
        `<div style="vertical-align: middle; float: right !important;">
        <button type="button" class="cButton" tabindex="-1" id="closedTransferAll">Transfer old closed to:</button>
        <input type="text" class="form-control" style="display: inline-block; margin-left: 10px; width: var(--eightNumbers)" id="transferWorker" placeholder="Worker #" value=${closedCaseBank}></input>
    </div>`
    )
    function addTableButtons() {
        document.querySelectorAll('span.cSpan').forEach((e) => e.remove())
        if ((/[a-z0-9]{7}/i).test(closedCaseBank)) {
            document.querySelectorAll('tr.oldClosed > td:nth-child(4)').forEach((e) => e.insertAdjacentHTML('beforeend', '<span class="cSpan">→ ' + closedCaseBankLastThree + '</span>'))
        }
    }
    function removeTableButtons() {
        $('.cSpan').remove()
    }
    document.getElementById('transferWorker')?.addEventListener('blur', (event) => checkClosedCaseBank(event.target.value))
    function checkClosedCaseBank(eventValue) {
        if ((/[a-z0-9]{7}/i).test(eventValue)) {
            if (eventValue !== localStorage.getItem('MECH2.closedCaseBank')) {
                localStorage.setItem('MECH2.closedCaseBank', eventValue)
                closedCaseBank = eventValue
                closedCaseBankLastThree = closedCaseBank.slice(4)
                addTableButtons()
            }
        } else {
            closedCaseBank = ''
            closedCaseBankLastThree = ''
            localStorage.removeItem('MECH2.closedCaseBank')
            document.getElementById('transferWorker').value = ''
            removeTableButtons()
            document.getElementById('transferWorker').animate(redBorder, redBorderTiming)
        }
    }
    document.getElementById('inActiveCaseTable').addEventListener('click', (event) => {
        if (event.target.tagName === "SPAN") {
            let closestSpanASibling = event.target.previousElementSibling
            if (checkForClosedCaseBank() && closestSpanASibling?.tagName === 'A') {
                transferSingleClosed(event.target.closest('tr').id)
            }
        }
    })
    async function transferSingleClosed(tRowId) {
        pleaseWait()
        await createIframe()
        await caseTransferEvent(tRowId)
            .catch((error) => { console.trace(error) })
            .finally(() => {
                iframeContainer.remove()
                thankYouForWaiting()
            })
    }
    async function transferMultiClosed(tRowIdArray) {
        pleaseWait()
        let i = 0
        await createIframe()
        return new Promise(async function(resolve, reject) {
            for await (let caseNumberTransfer of tRowIdArray) {
                if (closedCaseBank) {
                    i++
                    document.getElementById('progressReport').textContent = [i, tRowIdArray.length].join(" of ")
                    await caseTransferEvent(caseNumberTransfer)
                        .catch((error) => { console.trace(error) })
                }
            }
            iframeContainer.remove()
            thankYouForWaiting()
            resolve()
        })
    }
    async function createIframe() {
        return new Promise((resolve, reject) => {
            document.getElementById('footer_links').insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="visibility: hidden;"><iframe id="transferiframe" name="transferiframe" style="width: 100%; height: 100%;"></iframe></div>')
            transferiframe = document.getElementById('transferiframe')
            iframeContainer = document.getElementById('iframeContainer')
            window.onmessage = (event) => {
                if (event.origin !== "https://mec2.childcare.dhs.state.mn.us") { reject() }
                if (event.data[1] === "pageLoaded") { resolve() }
            }
            window.open('/ChildCare/CaseTransfer.htm', 'transferiframe')
        });
    }
    async function caseTransferEvent(tRowId) {
        return new Promise(function(resolve, reject) {
            transferiframe.contentWindow.postMessage(['newTransfer', tRowId], "https://mec2.childcare.dhs.state.mn.us")
            let tRow = document.getElementById(tRowId)
            window.onmessage = (event) => {
                if (event.data[0] === "transferError") {
                    window.onmessage = null
                    let tRowButton = tRow.querySelector('span')
                    tRowButton.textContent = event.data[1]
                    tRowButton.style.pointerEvents = "none"
                    switch (event.data[1]) {/* eslint-disable no-fallthrough */
                        case "Invalid Agency":
                        case "Invalid Worker": {
                            checkClosedCaseBank(0)
                        }
                        case "Locked Case":
                        case "ID is blank":
                        case "Same Worker ID":
                        case "Check individually":
                            break
                    }/* eslint-enable no-fallthrough */
                    tRow.classList.remove('oldClosed')
                    reject(event.data[1])
                }
                if (event.data[0] === "transferStatus" && event.data[1] === "Success") {
                    window.onmessage = null
                    tRow.style.opacity = '.35'
                    tRow.querySelector('span').remove()
                    tRow.classList.remove('oldClosed')
                    resolve()
                }
            }
        });
    }
    document.getElementById('closedTransferAll').addEventListener('click', async function() {
        const oldClosedArray = Array.from(document.querySelectorAll('.oldClosed'), (caseNumber) => caseNumber.id)
        if (checkForClosedCaseBank()) {
            await transferMultiClosed(oldClosedArray)
        }
    })
    function checkForClosedCaseBank() {
        if (closedCaseBank) {
            return 1
        } else {
            eleFocus('#transferWorker')
            return 0
        }
    }
}; // SECTION_END Inactive_Case_List
// SECTION_START Log_in
if (["Login.htm", "ChangePassword.htm"].includes(thisPageNameHtm) || ("/ChildCare/").includes(thisPageName)) { // Looks dumb, but catches if there's no Page.htm, which can only happen for logging in.
    if (document.querySelector('strong.rederrortext')?.textContent === "Password has expired.") {
	eleFocus("#password")
	} else if (userXnumber.length && document.getElementById("terms")) {
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
} // SECTION_END Log_in
// SECTION_START Maximum_Rates
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
            ageDefinitions = '<div><label>Infant:</label><span>' + infant + '</span></div> <div><label>Toddler:</label><span>' + toddler + '</span></div> <div><label>Preschooler:</label><span>' + preschooler + '</span></div>'
            break
        case "Family Child Care":
        case "Legal Non-licensed":
            infant = "Birth until 12 months."
            toddler = "12 months until 24 months."
            preschooler = "24 months until the August prior to the Kindergarten date on the School page"
            ageDefinitions = '<div><label>Infant:</label><span>' + infant + '</span></div> <div><label>Toddler:</label><span>' + toddler + '</span></div> <div><label>Preschooler:</label><span>' + preschooler + '</span></div>'
            break
        default:
            break
    }
    let nonStandardTds = document.querySelectorAll('table > tbody > tr > td:nth-child(5)')
    let nonStandardRates = [...nonStandardTds].filter((e) => e.innerText > 0)
    if (nonStandardRates.length === 0) {
        nonStandardTds.forEach((e) => e.remove())
        document.querySelector('table > tbody > tr > th:nth-child(5)').remove()
    }
    let maxRatesCounty = document.getElementById('maximumRatesCounty')
    let ratesProviderType = document.getElementById('ratesProviderType')
    let maximumRatesPeriod = document.getElementById('maximumRatesPeriod')
    let firstNonBlankPeriod = maximumRatesPeriod.querySelector('option:nth-child(2)')
    if (maxRatesCounty.value === "" && typeof userCountyObject !== undefined) { maxRatesCounty.value = userCountyObject.county; doEvent('#maximumRatesCounty') }
    if (ratesProviderType.value === '') { ratesProviderType.value = "Child Care Center"; doEvent('#ratesProviderType') }
    if (maximumRatesPeriod.value === '') { maximumRatesPeriod.value = firstNonBlankPeriod.value; doEvent('#maximumRatesPeriod') }
    ratesProviderType.addEventListener('change', function() { maximumRatesPeriod.value = firstNonBlankPeriod.value; doEvent('#maximumRatesPeriod') })
    if (document.getElementById('ratesProviderType').value !== "Legal Non-licensed") {
        document.querySelectorAll('tbody>tr>th:nth-child(n+2):nth-child(-n+4)').forEach(function(e) {
             e.insertAdjacentHTML('beforeend', '<span class="maxRates"> (15%, 20%)</span>')
        })
        document.querySelectorAll('tbody>tr>td').forEach(function(e) {
            if (isFinite(e.textContent) && e.textContent > 0) {
                e.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (e.textContent * 1.15).toFixed(2) + ", " + (e.textContent * 1.2).toFixed(2) + ')</span>')
            }
        })
    } else if (document.getElementById('ratesProviderType').value === "Legal Non-licensed") {
        document.querySelector('tbody>tr>th:nth-child(2)').insertAdjacentHTML('beforeend', '<span class="maxRates">(15%)</span>')
        document.querySelectorAll('tbody>tr>td').forEach(function(e) {
            if (isFinite(e.textContent) && e.textContent > 0) {
                e.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (e.textContent * 1.15).toFixed(2) + ')</span>')
            }
        })
    }
    document.getElementById('secondaryActionArea').insertAdjacentHTML('afterend', `
    <div style="float: right !important;">
        <button type="button" class="cButton" id="copyRates">Copy Rates</button>
        <button type="button" class="cButton" id="toggleDifferentials">Toggle Differentials</button>
    </div>
    `)
    document.getElementById('copyRates').addEventListener('click', function() {
        document.querySelector('h4').innerText = "Rates for " + document.getElementById('ratesProviderType').value
        let tableParentElement = document.querySelector('table').parentElement
        let regFeeDivs = tableParentElement.querySelectorAll('.form-group > div')
        regFeeDivs[0]?.replaceWith(...regFeeDivs[0].childNodes);
        regFeeDivs[1] ? regFeeDivs[1].outerHTML = '<span>' + regFeeDivs[1].innerText + '</span>' : undefined
        copyElement(tableParentElement)
        snackBar('Copied table!', 'blank')
    })
    document.getElementById('toggleDifferentials').addEventListener('click', function() { document.querySelectorAll('.maxRates').forEach((e) => { e.classList.toggle('hidden') }) })
    document.querySelector('div.panel-box-format > div.form-group').insertAdjacentHTML('afterend', '<div id="ageCategories">' + ageDefinitions + '</div>')
    //https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_0927 // Accreditations
} // SECTION_END Maximum_Rates
// SECTION_START Notices__Export_to_PDF
if (["CaseNotices.htm", "ProviderNotices.htm"].includes(thisPageNameHtm)) {
    if (notEditMode) {
        addDateControls('#selectionBeginDate')
        addDateControls('#selectionEndDate')
    }
    if (document.getElementById('textbox2')) {
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
            const pdfDoc = await PDFLib.PDFDocument.create()
            const courierFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier)
            for await (let pagesText of textArray) {
                const page = pdfDoc.addPage() //PDFLib.PageSizes.Letter)
                const { width, height } = page.getSize()
                const fontSize = 12
                page.drawText(pagesText, {
                    lineHeight: 12,
                    x: 35,
                    y: height - 55,
                    size: 12,
                    font: courierFont,
                })
            }
            const pdfBytes = await pdfDoc.save()
            download(pdfBytes, fileName + ".pdf", "application/pdf");
        }
        document.querySelector('#textbox2').insertAdjacentHTML('afterend', '<button type="button" class="form-button" style="vertical-align: top;" id="downloadAsPdf">Download as PDF</button>')
        document.querySelector('#downloadAsPdf').addEventListener('click', function() { createPdf(document.querySelector('#textbox1').textContent, document.querySelector('title').textContent + " " + caseIdORproviderId) })
    }
} // SECTION_END Notices__Export_to_PDF
// SECTION_START Pending_Case_List - adds 15 day calculation to case closure date
if (("PendingCaseList.htm").includes(thisPageNameHtm)) {
    document.querySelectorAll('#pendingCaseTable > tbody > tr > td:nth-child(8)').forEach(function(e) {
        if (e.textContent === '') {
            let lastExtPendDate = addDays(new Date(e.previousSibling.textContent), 15).toLocaleDateString('en-US', { year: "numeric", month: "2-digit", day: "2-digit" })
            e.textContent = 'Plus 15 days: ' + lastExtPendDate
            e.classList.add('plus15days')
        }
    })
} // SECTION_END Pending_Case_List
// SECTION_START Provider_Address
if (("ProviderAddress.htm").includes(thisPageNameHtm)) {
    if (notEditMode) {
        function removeNoEntryRows() {
            $('#providerData :is(input, select):not(#mailingZipCodePlus4, #mailingSiteHomeZipCodePlus4)').filter(function() { return this.value === '' }).closest('.form-group').addClass('hidden noEntry')
        }
        removeNoEntryRows()
        $('table').click(function() {
            $('.noEntry').removeClass('hidden noEntry')
            removeNoEntryRows()
        })
    }
    if (!notEditMode) {
        if (!document.getElementById('#mailingSiteHomeCountry').value) {
            $('#mailingSiteHomeCountry').val('USA').addClass('red-outline')
            $('#mailingSiteHomeState').val('Minnesota').addClass('red-outline')
            typeof userCountyObject !== undefined && $('#mailingSiteHomeCounty').val(userCountyObject.county).addClass('red-outline')
        }
        $('#mailingCountry').change(function() {
            if (!document.getElementById('mailingState').value) {
                $('#mailingState').val('Minnesota').addClass('red-outline')
            }
        })
    }
    // SECTION_END ProviderAddress Default values for Country, State, County
    // SECTION_START ProviderAddress Copy Provider mailto Address
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
}; // SECTION_END Provider_Address
// SECTION_START Provider_Notices - enables resend for all users
if (("ProviderNotices.htm").includes(thisPageNameHtm)) {
    if (document.getElementById('remove') && document.querySelector('#providerNoticesSearchData > tbody > tr > td').innerText !== "No records found") {
        function addRemDisabled(event) {
            if ($('#cancel').prop('disabled') && event.tagName?.toLowerCase() === "td" && $(event).siblings().addBack().last().text().indexOf("Waiting") > -1) { $('#cancel').removeAttr('disabled'); $('#resend').attr('disabled', 'disabled') }//says waiting, cancel is disabled: disable resend, remove disable cancel;
            else if ($('#resend').prop('disabled') && event.tagName?.toLowerCase() === "td" && $(event).siblings().addBack().last().text().indexOf("Waiting") < 0) { $('#resend').removeAttr('disabled'); $('#cancel').attr('disabled', 'disabled') }//doesn't say waiting, disable cancel, remove disable resend;
        }
        waitForTableCells('#providerNoticesSearchData').then(() => addRemDisabled(document.querySelector('tr > td')))
        $('#providerNoticesSearchData').click(function() { addRemDisabled(event.target) })
    }
} // SECTION_END Provider_Notices
// SECTION_START Provider_Search - filters search results
if (("ProviderSearch.htm").includes(thisPageNameHtm)) {
    document.getElementById('providerSearchTable').classList.add('toggleTable')
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
        $('#inactiveToggle').click(function() { $('.inactive').toggleClass('inactive-hidden'); $('.dataTables_scrollBody').css('height', ''); });
        $('#outOfAreaToggle').click(function() { $('.out-of-area').toggleClass('out-of-area-hidden'); $('.dataTables_scrollBody').css('height', ''); });
        waitForElmHeight('#providerSearchTable > tbody > tr').then(() => {
            if ($('tbody > tr:not(tbody > tr[class$="hidden"])').length) { $('tbody > tr:not(tbody > tr[class$="hidden"]):eq(0)').click() }
            let openActiveNearby = document.querySelectorAll('table > tbody > tr:not(.inactive, .out-of-area').length
            let openActive = document.querySelectorAll('table > tbody > tr:not(.out-of-area').length
            document.querySelector('h5').textContent += " " + openActiveNearby + " open local providers. " + openActive + " active providers."
        })
    }
    if (searchByNumbers || justOneResult) { $('tbody >tr >td >a').each(function() { $(this).attr('target', '_self') }) }

    if (!['CaseChildProvider.htm?', 'ProviderSearch.htm?'].includes(document.referrer.substring(document.referrer.indexOf("/ChildCare/") + 11, document.referrer.indexOf(".htm") + 5))) { $('#back, #select, #backDB, #selectDB').hide() }
}; // SECTION_END Provider_Search
// SECTION_START Provider_Payment_History
if ("ProviderPaymentHistory.htm".includes(thisPageNameHtm)) {
    addDateControls("#paymentPeriodBegin")
    addDateControls("#paymentPeriodEnd")
} // SECTION_ENDProvider_Payment_History
// SECTION_START Provider_Registration_and_Renewal
if ("ProviderRegistrationAndRenewal.htm".includes(thisPageNameHtm)) {
    if (notEditMode) {
        if (typeof userCountyObject !== undefined) {
            if ($('#providerRegistrationAndRenewalTable>tbody>tr:contains(' + userCountyObject?.county + ' County)').length > 0) {
                $('#providerRegistrationAndRenewalTable>tbody>tr:contains(' + userCountyObject.county + ' County)').click()
                eleFocus('#editDB')
            }
        } else { eleFocus('#newDB') }
    } else { eleFocus('#nextRenewalDue') }
} // SECTION_END Provider_Registration_and_Renewal
// SECTION_START Provider_Training
if (("ProviderTraining.htm").includes(thisPageNameHtm)) {
    document.querySelector('div#providerTrainingData > div.form-group').insertAdjacentHTML('beforebegin', '<div style="margin: 0 0 5px;"><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_110909" target="_blank">CCAP Policy Manual - Legal Non-Licensed Provider Trainings</a></div>')
} // SECTION_END Provider_Training


// SECTION_START This was going to be a settings page, but if I go the extension route, there's no point...
if ("PrivacyAndSystemSecurity.htm".includes(thisPageNameHtm)) {
    // $('div.content_8pad-15top').wrap('<div id="pass" class="hidden"></div>')
    // document.querySelector('#pass').insertAdjacentElement('beforebegin', document.querySelector('h1'))
    // document.querySelector('h1').addEventListener('click', (() => { document.getElementById('pass').classList.toggle('hidden') }))
    document.querySelector('#primaryNavigation').insertAdjacentHTML('afterend', `
<div class="container">
<div class="settingsContainer">
<div class="settings"><label class="settings">Test setting</label><label class="switch"><input type="checkbox"><span class="slider round"></span></label></div>
<div class="settings"><label class="settings">Test setting</label><label class="switch"><input type="checkbox"><span class="slider round"></span></label></div>
<div class="settings"><label class="settings">Test setting</label><label class="switch"><input type="checkbox"><span class="slider round"></span></label></div>
</div>
</div>
    `)
}

// SECTION_START Servicing_Agency_Incoming_Transfers
if ("ServicingAgencyIncomingTransfers.htm".includes(thisPageNameHtm)) {
    document.querySelectorAll('tbody > tr > td:nth-child(6)').forEach((e) => {
        let caseNumberTransfer = e.innerText
        e.innerHTML = '<a target="_blank" href="/ChildCare/CaseAddress.htm?parm2=' + caseNumberTransfer + '">' + caseNumberTransfer + '</a>'
    })
} // SECTION_END Servicing_Agency_Incoming_Transfers

// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================

// ======================================================================================================================================================================================================
// ///////////////////////////////////////////////////////////////////////////// SITE_WIDE_FUNCTIONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

if (!iFramed) { // Sets jQuery calendar to show 3 months
    try {
        if ($.datepicker !== undefined) {
            $.datepicker.setDefaults({
                numberOfMonths: 3,
                showCurrentAtPos: 1,//middle, 0 index
                stepMonths: 2,
                maxDate: "+5y",
            })
        }
    } catch (error) { console.trace(error) }
} // Sets jQuery calendar to show 3 months
function closeDatepicker() { queueMicrotask(() => { $('.hasDatepicker').datepicker("hide") }) }
//
// document.querySelectorAll('table:has(tbody)').forEach((tableWithBody) => { //probably best left for the extension version - https://developer.chrome.com/docs/extensions/reference/api/contextMenus, https://plainenglish.io/blog/how-to-download-files-with-javascript#2-use-the-download-attribute-of-the-html-aelement
//     let buttonName = "Table"
//     if (tableWithBody.id) { buttonName = tableWithBody.id }
//     else if (tableWithBody.previousElementSibling?.nodeName === "H4") { buttonName = tableWithBody.previousElementSibling.textContent }
//     let buttonId = buttonName + "TableCopy"
//     tableWithBody.insertAdjacentHTML('beforebegin', '<button type="button" class="cButton float-right" id=' + buttonId + '>' + buttonName + '</button>')
//     let tableCopyButton = document.getElementById(buttonName + "TableCopy")
//     tableCopyButton.addEventListener('click', function() {
//         let tableContents = basicTableToCSV(tableWithBody)
//         navigator.clipboard.writeText( tableContents )
//     })
// })
// function basicTableToCSV(tableEle) {//table:has(tbody)
//     let thisTable = typeof(tableEle) === "object" ? tableEle : document.querySelector(tableEle)
//     let tableToCSV = ""
//     thisTable.querySelectorAll('tr').forEach((tr) => {
//         if (tableToCSV.length > 0) {
//             tableToCSV += "\n"
//         }
//         tr.querySelectorAll('td').forEach((td) => {
//             td.previousElementSibling?.nodeName === 'TD' && ( tableToCSV += "\t" )
//             tableToCSV += td.innerText
//         })
//     })
//     return tableToCSV
// }
//
function listPageLinksAndList() {
    document.querySelectorAll('tbody > tr').forEach(function(e) {
        e.id = e.querySelector('td > a').textContent
    })
    return Array.from(document.querySelectorAll('tbody > tr'), (caseNumber) => caseNumber.id)
}
//
function doClick(target) {
    let element = typeof(target) === "object" ? target : document.querySelector(target)
    let clickEvent = new MouseEvent('click')
    element.dispatchEvent(clickEvent);
}
//
function doWrap(ele, type='div') {
  const wrappingElement = document.createElement(type);
  ele.replaceWith(wrappingElement);
  wrappingElement.appendChild(ele);
}
//
function pleaseWait() {
    document.querySelector('body').insertAdjacentHTML('afterbegin', '<div id="popovertarget" popover="manual">Please wait...<span style="margin: 0 5px;" id="progressReport"></span></div>')
    document.querySelector('head').insertAdjacentHTML('beforeend', '<style id="inProgress">body > div.container { opacity: .7; }</style>')
    document.getElementById('popovertarget')?.showPopover()
}
function thankYouForWaiting() {
    document.getElementById('inProgress')?.remove()
    document.getElementById('popovertarget')?.hidePopover()
}
//
async function forAwaitMultiCaseEval(listArray, pageName) {
    pleaseWait()
    const evalObj = {}
    let progressReport = document.getElementById('progressReport')
    let listArrayLength = listArray.length
    for await (const [index, caseNum] of listArray.entries()) {
        // for await(const caseNum of listArray) {
        progressReport.textContent = index + " of " + listArrayLength
        const evaluatedData = await evalData(caseNum, pageName)
        evalObj[caseNum] = evaluatedData
    }
    thankYouForWaiting()
    return evalObj
}
async function evalData(caseProviderNumber = caseId, pageName = thisPageName, dateRange = '', evalString = '', caseOrProvider = 'case') {
    let parm2providerId = caseOrProvider === "case" ? "parm2" : "providerId"
    let parmDateRange = dateRange.length ? "&parm3=" + dateRange : undefined
    let unParsedEvalData = await getEvalData(caseProviderNumber, pageName, parmDateRange, parm2providerId).catch((err) => { console.trace(err); $('h1').append('<div style="display: inline-block; margin-left: 5px;"> GetEvalDataBorkBorkBork</div>'); return false })
    if (!unParsedEvalData?.length) { return false }
    let parsedEvalData = await parseEvalData(unParsedEvalData).catch((err) => { console.trace(err); $('h1').append('<div style="display: inline-block; margin-left: 5px;"> ParseEvalDataBorkBorkBork</div>'); return false })
    if (evalString) {
        parsedEvalData = await resolveEvalData2(parsedEvalData, evalString)
    }
    return parsedEvalData
}
async function getEvalData(caseProviderNumber, pageName, parm3 = '', parm2providerId) {
    let idNumber = parm2providerId === "parm2" ? caseId : providerId
    return new Promise((resolve) => {
        if (caseProviderNumber !== idNumber || pageName !== thisPageName) {
            $.get('/ChildCare/' + pageName + '.htm?' + parm2providerId + '=' + caseProviderNumber + parm3, function(result, status, json) {
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
        let dataObjectMatches = dataObject.match(/eval\(\'\[\{.*?\}\]\'\)\;/g) ?? []
        if (dataObjectMatches.length) {
            for (let i = 0; i < dataObjectMatches.length; i++) {
                let dataObjectReplacements = dataObjectMatches[i]
                    .replaceAll(/eval\(\'|\'\)\;/g, '')
                    .replaceAll(/:,/g, ':"",')
                    .replaceAll(/\\'/g, "'")
                // .replaceAll(/\\"/g, '"')
                parsedEvalData[i] = JSON.parse(dataObjectReplacements)
            }
        }
        resolve(parsedEvalData)
    })
}
function resolveEvalData(parsedEvalData, evalString) {
    evalString = evalString.split('.');
    while (evalString.length) {
        if (typeof parsedEvalData !== 'object') { return undefined }
        parsedEvalData = parsedEvalData[evalString.shift()];
    }
    return parsedEvalData;
}
function resolveEvalData2(obj, prop) {
    if (typeof obj !== 'object') throw 'resolveEvalData3: obj is not an object'
    if (typeof prop !== 'string') throw 'resolveEvalData3: prop is not a string'
    prop = prop.replace(/\[["'`](.*)["'`]\]/g, ".$1") // Replaces [] notation with dot notation
    return prop.split('.').reduce(function(prev, curr) {
        return prev?.[curr]
    }, obj || self)
}
//
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
const redBorder = [{ borderColor: "red", borderWidth: "2px", }]//element.animate(redBorder, redBorderTiming)
const redBorderTiming = { borderStyle: "solid", duration: 300, iterations: 10, }
//
function insertTextAndMoveCursor(textToInsert) {
    let activeElem = document.activeElement
    let cursorPosition = activeElem.selectionStart; // will give the current position of the cursor
    let currentText = activeElem.value
    activeElem.value = currentText.slice(0, cursorPosition) + textToInsert + currentText.slice(cursorPosition) // setting the modified text in the text area
    textSelect(activeElem, cursorPosition + textToInsert.length);
}
function textSelect(inp, s, e) {//moves cursor to selected position (s) or selects text between (s) and (e)
    e = e || s;
    if (inp.createTextRange) {
        var r = inp.createTextRange();
        r.hidden(true);
        r.moveEnd('character', e);
        r.moveStart('character', s);
        r.select();
    } else if (inp.setSelectionRange) {
        inp.focus();
        inp.setSelectionRange(s, e);
    }
}
//
function copyElement(target) {
    const range = document.createRange();
    range.setStart(target, 0);
    range.setEndAfter(target);
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(range);
    document.execCommand("copy");
    window.getSelection()?.removeAllRanges();
};
//
function toggle(elOrArray) {
    [...elOrArray].forEach(function(el) {
        if (el.style.display == 'none') {
            el.style.display = '';
        } else {
            el.style.display = 'none';
        }
    })
}
//
function tbodiesFocus(element) {
    document.querySelectorAll('tbody').forEach((e) => { e.addEventListener('click', function() { eleFocus(element) }) })
}
//
function tbodyFocusNextEdit() {
    document.querySelector('tbody').addEventListener('click', function() {
        if (document.getElementById('next')) { eleFocus("#next") }
        else { eleFocus("#editDB") }
    })
}
//
function tableCapitalize(tableName) {
    ($('#' + tableName + '>tbody>tr>td').filter(":nth-child(2)")).each(function() {
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
            (match, upper, lower) => `${upper.toUpperCase()}${lower.toLowerCase()}`,
        )
}
//
function addCommaSpace(value) {
    return String(value)
        .replace(/,([^0-9])/g, ", $1")
}
function reorderCommaName(commaName) {
    try {
        commaName = commaName.replace(/\b\w\b|\./g, '').replace(/\s+/g, ' ')
        commaName = commaName.trim()
        commaName = toTitleCase(commaName)
        let commaNameSplit = commaName.split(",")
        commaName = commaNameSplit[1].trim() + " " + commaNameSplit[0].replace(/,/, '')
        return commaName
    } catch (error) { console.trace(error) }
}
function commaNameToObject(commaName) {
    try {
        commaName = commaName.replace(/\b\w\b|\./g, '').replace(/\s+/g, ' ')
        commaName = commaName.trim()
        commaName = toTitleCase(commaName)
        let commaNameSplit = commaName.split(",")
        commaName = commaNameSplit[1].trim() + " " + commaNameSplit[0].replace(/,/, '')
        return { first: commaNameSplit[1].trim(), last: commaNameSplit[0].trim() }
    } catch (error) { console.trace(error) }
}
function getFirstName(commaName) {
    let caseNameBackwards = toTitleCase(commaName).replace(/\b\w\b/, '').trim();
    let firstName = caseNameBackwards.split(",")[1].trim()
    return firstName
}
function getLastName(commaName) {
    let caseNameBackwards = toTitleCase(commaName).replace(/\b\w\b/, '').trim();
    let lastName = caseNameBackwards.split(",")[0].replace(/,/, '')
    return lastName
}
function fCaseName() {
    let aCaseName = $('#caseHeaderData div.col-lg-4').contents().eq(2).text().trim().split(/[\s,]+/)
    return { first: aCaseName[1], last: aCaseName[0] }
}
//
// const formatName = function(commaName) { // works in console, not in userscript
//     let self = this
//     self.getFirstName = function(commaName) {
//         let caseNameBackwards = self.toTitleCase(commaName).replace(/\b\w\b/, '').trim();
//         let firstName = caseNameBackwards.split(",")[1].trim()
//         return firstName
//     }
//     self.getLastName = function(commaName) {
//         let caseNameBackwards = self.toTitleCase(commaName).replace(/\b\w\b/, '').trim();
//         let lastName = caseNameBackwards.split(",")[0].replace(/,/, '')
//         return lastName
//     }
//     self.toTitleCase = function (value, ...excludedWordList) {
//         // const exceptions = excludedWordList
//         // .flat(Infinity)
//         // .map(item => String(item).trim())
//         // .join('\\b|\\b');
//         return String(value)
//             // console.log(String(value).trim().replace(/\s+/g, ' '))
//             .trim()
//             .replace(/\s+/g, ' ')
//             .replace(
//                 RegExp(`\\b(?<upper>[\\w])(?<lower>[\\w]+)\\b`, 'g'),
//                 (match, upper, lower) => `${upper.toUpperCase()}${lower.toLowerCase()}`,
//             )
//     }
// }
// let names = new formatName()
// console.log( names.getFirstname("LAST,FIRST") )
//
function addDateControls(element, insideDiv = 1) {
    let elementName = element.replace(/\#/, '')
    let prevMonth = "-"
    let nextMonth = "+"
    if (insideDiv) { document.querySelector(element)?.parentNode?.classList.add('has-controls') }
    document.querySelector(element).insertAdjacentHTML('beforebegin', '<button type="button" class="controls prev-control" id="prev.' + elementName + '">' + prevMonth + '</button>')
    document.getElementById('prev.' + elementName).addEventListener('click', function(e) { controlDatePicker(e.target.id) })
    document.querySelector(element).insertAdjacentHTML('afterend', '<button type="button" class="controls next-control" id="next.' + elementName + '">' + nextMonth + '</button>')
    document.getElementById('next.' + elementName).addEventListener('click', function(e) { controlDatePicker(e.target.id) })
}
//
function controlDatePicker(elementId) {
    let datePickerControl = elementId.split(".")
    const options = {}
    let controlDate = new Date(document.getElementById(datePickerControl[1]).value)
    if (datePickerControl[0] === "prev") {
        document.getElementById(datePickerControl[1]).value = new Date(controlDate.setMonth(controlDate.getMonth() - 1)).toLocaleDateString('en-US', { day: "2-digit", month: "2-digit", year: "numeric" })
    } else if (datePickerControl[0] === "next") {
        document.getElementById(datePickerControl[1]).value = new Date(controlDate.setMonth(controlDate.getMonth() + 1)).toLocaleDateString('en-US', { day: "2-digit", month: "2-digit", year: "numeric" })
    }
}
//
function setIntervalLimited(callback, interval, x) {
    for (var i = 0; i < x; i++) {
        setTimeout(callback, i * interval);
    };
}; // setIntervalLimited(function() { alert('hit') }, 1000, 10);//=> hit...hit...etc (every second, stops after 10)
//
// Wait for something to be available, based on https://stackoverflow.com/a/61511955
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
function tempIncomes(tempIncome, endDate) {
    let tempIncomeSelect = document.getElementById(tempIncome)
    document.querySelector('.stylus')?.insertAdjacentHTML('beforeend', 'label[for=' + tempIncome + ']:first-letter { text-decoration:underline; }')
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
//
function addDays(date, days) {
    days = Number(days)
    if (days === NaN) { return undefined }
    let result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};
function dateDiffInDays(a, b = new Date()) {
    const _MS_PER_DAY = 86400000
    a = new Date(a)
    b = new Date(b)
    const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
    const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
    return Math.abs(Math.floor((utc2 - utc1) / _MS_PER_DAY))
}
function formatDate(date, format = "mmddyy") {
    date = new Date(date)
    switch (format) {
        case "mmddyy":
            date = date.toLocaleDateString(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" })
            break
        case "mdyy":
            date = date.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" })
            break
        case "mmddyyyy":
            date = date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
            break
        default:
            date = date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
            break
    }
    return date
}
function getDateString(year, month, week, day) {
    const date = getDateofDay(year, month, week, day);
    let dateString = date.toLocaleDateString();
    return dateString;
}
function getDateofDay(year, month, week, day) {
    const firstDay = 1
    if (week < 0) { month++ }
    const date = new Date(year, month, (week * 7) + firstDay)
    if (day < date.getDay()) { day += 7 }
    date.setDate(date.getDate() - date.getDay() + day)
    return date
}
//
function tabIndxNegOne(elements) {
    setTimeout(function(e) { document.querySelectorAll(elements).forEach((element) => element.setAttribute('tabindex', '-1')) }, 400)
}
//
document.querySelector('body').insertAdjacentHTML('beforeend', '<div id="snackBar" class="snackBar"></div>') // snack_bar start
function snackBar(text, title = "Copied!", textAlign = "left") {
    let snackBar = document.getElementById('snackBar')
    document.getElementById('snackBar').replaceChildren()
    let snackBarTxt = ""
    if (title !== "blank") { snackBarTxt += "<span class='snackBar-title'>" + title + "</span>" }
    let snackBarTextBlob = text.split('\n')
    for (const line of snackBarTextBlob) {
        snackBarTxt += "<span>" + line + "</span>";
    }
    snackBar.insertAdjacentHTML('beforeend', snackBarTxt)
    snackBar.classList.add('snackBar-show');
    setTimeout(function() { snackBar.classList.remove('snackBar-show'); }, 3000);
}; // snack_bar end
//
if (!iFramed) { // Keyboard_shortcuts start
    try {
        window.addEventListener('keydown', function(e) {
            if (e.altKey) {
                if (["d", "s", "n", "c", "e", "r", "w", "ArrowLeft", "ArrowRight"].includes(e.key)) { e.preventDefault() }
                switch (e.key) {
                    case 'd':
                        if (document.querySelector('#done:not([disabled])')) { document.getElementById('done').click() }
                        else if ($('#delete:not([disabled])').length) { $('#delete').click() }
                        break
                    case 's':
                        if (document.querySelector('#save:not([disabled])')) { document.getElementById('save').click() }
                        break
                    case 'n':
                        if (document.querySelector('#new:not([disabled])')) { document.getElementById('new').click() }
                        break
                    case 'c':
                        if (document.querySelector(':is(#Cancel, #cancel, #cancelnotice, #revert, #exit):not([disabled])')) { document.querySelector('#Cancel, #cancel, #cancelnotice, #revert, #exit').click() }
                        break
                    case 'e':
                        if (document.querySelector('#edit:not([disabled])')) { document.getElementById('edit').click() }
                        break
                    case 'r':
                        if (document.querySelector(':is(#resend, #return):not([disabled])')) { document.querySelector('#resend, #return').click() }
                        break
                    case 'w':
                        if (document.querySelector('#wrapUp:not([disabled])')) { document.getElementById('wrapUp').click() }
                        break
                    case 'ArrowLeft':
                        if (document.querySelector('#previous:not([disabled])')) { document.getElementById('previous').click() }
                        break
                    case 'ArrowRight':
                        if (document.querySelector('#next:not([disabled])')) { document.getElementById('next').click() }
                        break
                    default:
                        break
                }
            }
            else if (e.ctrlKey && e.key === 's' && document.querySelector('#save:not([disabled])')) {
                e.preventDefault();
                document.getElementById('save').click()
            }
        }) // keyboard shortcuts
        if ("CaseWrapUp.htm".includes(thisPageNameHtm) && document.querySelector('.rederrortext').innerText === 'Case Wrap-Up successfully submitted.') {
            document.getElementById('secondaryActionArea').classList.add('hidden')
        };
        // SECTION_START Retract drop-down menu on page load
        $('.sub_menu').css('visibility', 'hidden');
        // SECTION_END Retract drop-down menu on page load

        //open_in_new_tab
        notEditMode && (document.querySelector("#Report\\ a\\ Problem>a").setAttribute('target', '_blank'));
        notEditMode && (document.querySelector("#Maximum\\ Rates>a").setAttribute('target', '_blank'));

        // SECTION_START Removing items from the tabindex // also see resetTabIndex()
        $('#footer_links, #footer_info, #popup').children().attr('tabindex', '-1')
        tabIndxNegOne('#quit, #countiesTable #letterChoice, #reset, #noteCreator') //quit, countiesTable=application; redet date, eEE=activity pages; cIS=submit button; lC=specialletter; reset=caseNotes; tempLeave = activities; defer=redet
        tabIndxNegOne('#leaveDetailTemporaryLeavePeriodFrom, #leaveDetailTemporaryLeavePeriodTo, #leaveDetailExtendedEligibilityBegin, #tempLeavePeriodBegin, #tempLeavePeriodEnd, #extendedEligibilityBegin, #extendedEligibilityExpires, #redeterminationDate, #tempPeriodStart, #tempPeriodEnd, #deferValue') //.attr('tabindex', '-1') //EmploymentActivity, SupportActivity
        tabIndxNegOne('#leaveDetailRedeterminationDue, #leaveDetailExpires, #caseInputSubmit, #caseId, #selectPeriod')
        tabIndxNegOne('table>thead>tr>td')
        tabIndxNegOne('.borderless')
        // SECTION_END Removing items from the tabindex

        // SECTION_START Post load changes to the page
        $('h1').parents('div.row').addClass('h1-parent-row')
        document.querySelectorAll(".marginTop5, .marginTop10, .padding-top-5px").forEach((e) => e.classList.remove('marginTop5', 'marginTop10', 'padding-top-5px') )
        // SECTION_END Post load changes to the page

        // Fixing 'to'
        $('#financialTableAndPanelData :is(label[for=annualizedDateRangeStart], label[for=annualizationPeriodStart])~div.col-lg-1.col-xs-1, div#manualPaymentTopPanelData div.col-lg-1').replaceWith('<label class="to col-lg-1 textInherit">to</label>')
        $('label[for="paymentEndDate"], label[for="extendedPeriodEnd"], label[for="leaveDetailExpires"], label[for="extendedEligibilityExpires"]').addClass('to').text("to")
        let $to = $('label.col-lg-1.textInherit, div.col-lg-1.textInherit').filter(function() { return $(this).text().trim() === 'to' || $(this).text().trim() === 'to:' }).addClass('to').text("to")//Making "to" between x to y elements smaller//(['to', 'to:']).includes($(this).text().trim())
        $to.nextAll('div:has(input[type=text]), div:contains("20"), input[type=text]').addClass('to-next')
        $to.prevAll('div:has(input[type=text]), div:contains("20"), input[type=text]').addClass('to-next')
        $('.to-next > input').addClass('to-next')
    }
    catch (error) { console.trace(error) }
} // Keyboard_shortcuts end

// ///////////////////////////////////////////////////////////////////////////// SITE_WIDE_FUNCTIONS SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================

// SECTION_START Duplicate buttons above H1 row
// if (!(/List.htm/).test(thisPageNameHtm) && !["ProviderSearch.htm", "CaseLockStatus.htm", "ClientSearch.htm", "MaximumRates.htm", "ReportAProblem.htm", "FinancialClaimTransfer.htm", "CaseApplicationInitiation.htm", "CaseReapplicationAddCcap.htm"].includes(thisPageNameHtm)) {
if (thisPageNameHtm.indexOf('List.htm') < 0 && !["ProviderSearch.htm", "CaseLockStatus.htm", "ClientSearch.htm", "MaximumRates.htm", "ReportAProblem.htm", "FinancialClaimTransfer.htm", "CaseApplicationInitiation.htm", "CaseReapplicationAddCcap.htm", "CaseOverview.htm", ].includes(thisPageNameHtm)) {
    function checkDBclickability() {
        document.querySelectorAll('.mutable').forEach((e) => {
            let oldButtonId = e.getAttribute('id').split('DB')[0];
            if (document.querySelector('#' + oldButtonId).getAttribute('disabled') !== null) {
                e.setAttribute('disabled', 'disabled')
            } else {
                e.removeAttribute('disabled')
            }
        })
    }
    try {
        document.querySelectorAll('.modal .form-button').forEach((e) => e.classList.add('modal-button')) //popup buttons
        document.querySelectorAll('tbody').forEach((e) => { e.addEventListener('click', () => checkDBclickability()) })
        document.querySelectorAll('.form-button:not([style$=none i], [id$="Business" i], [id$="Person" i], [id*=submit i], [id*=billed i], [id*=registration i], [id*=button i], [id*=search i], [type=hidden i], .panel-box-format input.form-button, .modal-button, #contactInfo, #selectFra, #reset, #changeType, #storage, #calculate, #cappingInfo, #calcAmounts, .cButton, .cButton__floating, .doNotDupe').forEach((e) => {
            if (e.value) {
                let idName = e.getAttribute('id') + "DB";
                document.querySelector('#secondaryActionArea').insertAdjacentHTML('beforeend', '<button  class="form-button mutable" id="' + idName + '" disabled="disabled"><span class="sAAspan">' + e.value + '</span></button>');
            };
        })
        !document.querySelectorAll('#secondaryActionArea > button').length && (document.querySelector('#secondaryActionArea').classList.add('hidden'))
        document.querySelector('#secondaryActionArea').addEventListener('click', (e) => {
            e.preventDefault()
            if (e.target.closest('button:not(:disabled)')?.classList.contains('mutable')) { document.querySelector('#' + e.target.closest('button').id.slice(0, -2)).click() }
        })
    }
    catch (err) { console.trace(err) }
    finally { setTimeout(() => checkDBclickability(), 100) }
} // SECTION_END Buttons above H1 row
//
try {
    let caseOrProviderInput = document.querySelector(':is(#caseInput>#caseId, #providerInput>#providerId):not([disabled])')
    if (notEditMode && !iFramed && caseOrProviderInput) {
        window.addEventListener('paste', async function(e) {
            navigator.clipboard.readText()
                .then(text => {
                    if ((/[0-9]{1,8}/).test(text)) {
                        if (!["TEXT", "INPUT"].includes(document.activeElement.nodeName) || document.activeElement.id === caseOrProviderInput.id) {
                            caseOrProviderInput.value = text.trim()
                            document.querySelector('#caseInputSubmit, #submitProviderId, #providerIdSubmit').click()
                        }
                    }
                })
        })
    }
} catch (error) { console.trace(error) } // Accepts paste input from non-input fields, assumes it to be case or provider #, loads the page with that #. Also allows pasting into the Provider ID field.
//
function starFall() {
    document.querySelector('body').classList.add('fourOne')
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
        colors: ["var(--star1)", "var(--star2)", "var(--star3)", "var(--star4)", "var(--star5)", "var(--star6)"],
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
if (new Date().toLocaleDateString().slice(0, 4) === "4/1" && Math.ceil(Math.random() * 4) / 4 === 1) { starFall() }

setTimeout(() => { focusEle !== "blank" && eleFocus(focusEle) }, 200)
console.timeEnd('MEC2Functions')
