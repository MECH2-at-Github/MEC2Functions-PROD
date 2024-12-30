// ==UserScript==
// @name         mec2functions
// @namespace    http://github.com/MECH2-at-Github
// @description  Add functionality to MEC2 to improve navigation and workflow
// @author       MECH2
// @match        http://mec2.childcare.dhs.state.mn.us/*
// @match        https://mec2.childcare.dhs.state.mn.us/*
// @version      0.5.65
// ==/UserScript==
/* globals jQuery, $, waitForKeyElements */

'use strict';
// ("global elements list", "selectPeriod, save, pageWrap, "
// ("global strings list", "selectPeriodValue, inCurrentPeriod, userXnumber, !editMode, iFramed, focusEle, caseId, providerId (provider pages), caseOrProviderId, reviewingEligibility, thisPageName, thisPageNameHtm, slashThisPageNameHtm, doNotDupe, selectPeriodValue")
// ("global object list", "countyInfo, userCountyObj, selectPeriodDates, stateData, ")
// ("global array list", "listPagesArray, ")
//
const pageName = window.location.pathname.slice(11, window.location.pathname.lastIndexOf(".htm")), thisPageName = pageName.indexOf("/") === 0 ? pageName.slice(1) : pageName, thisPageNameHtm = thisPageName + ".htm";
//
console.time('mec2functions load time');
const sanitize = {
    evalText(text) { return String(text)?.replace(/\\/g,'').trim() },
    query(query, all = 0) {
        if (!query) { return undefined }
        if (query instanceof HTMLElement || query instanceof NodeList) { return query }
        if (!typeof query === "string") { console.log("sanitize.query: argument 1 invalid (" + query + ") - must be a valid query string, an HTMLElement, or a NodeList"); return undefined; }
        return getSanitizedQuery(query)
        function getSanitizedQuery(queryInput) {
            let queryFromTextInput = ( queryInput.indexOf(',') > -1 || all ) ? document.querySelectorAll( queryInput )
            : queryInput.indexOf('#') === 0 ? document.getElementById( queryInput.slice(1) )
            : document.querySelector( queryInput )
            return ( queryFromTextInput instanceof HTMLElement || queryFromTextInput instanceof NodeList ) ? queryFromTextInput : undefined
        };
    },
    string(text) { return String(text)?.replace(/[^a-z0-9áéíóúñü \.,'_-]/gim, '') },
    timeStamp(time) { return String(time)?.replace(/[^apm0-9:,\/ ]/gi, '') },
    date(inputDate, dateTypeNeeded = "date") {
        const isDateObject = inputDate instanceof Date, inputTypeof = typeof inputDate
        switch (dateTypeNeeded) {
            case "date": return isDateObject ? inputDate : new Date(inputDate)
            case "number":
                if ( inputTypeof === "number" && (Math.log(inputDate) * Math.LOG10E + 1 | 0) === 13 ) { return inputDate }
                if ( inputTypeof === "string" ) { return Date.parse(inputDate) }
                if ( isDateObject ) { return inputDate.getTime() }
                break
            case "string":
                if ( inputTypeof === "number" && (Math.log(inputDate) * Math.LOG10E + 1 | 0) === 13 ) { return new Date(inputDate).toLocaleDateString() }
                if ( inputTypeof === "string" ) { return inputDate }
                if ( isDateObject ) { return inputDate.toLocaleDateString() }
                break
        }
    },
    JSON(obj) { try { return JSON.parse(obj) } catch (err) { return undefined } },
};
const clearStorageItems = (storage = "both") => {
    if (["session", "both"].includes(storage)) { Object.keys(sessionStorage).forEach(ssKey => { if ( (/actualDateSS|processingApplication|actualDateSSChange/).test(ssKey) ) { sessionStorage.removeItem(ssKey) } }) }
    if (["local", "both"].includes(storage)) { Object.keys(localStorage).forEach(lsKey => { if ( (/caseTransfer|autnoteDetails|copiedNote|providerEndings/).test(lsKey) ) { localStorage.removeItem(lsKey) } }) }
};
if ("Logout.htm".includes(thisPageNameHtm)) { clearStorageItems(); return; };
if ( "Welcome.htm".includes(thisPageNameHtm) ) { clearStorageItems(); location.assign("Alerts.htm"); return; }; //auto-redirect from Welcome to Alerts
document.getElementById('help')?.insertAdjacentHTML('afterend', '<a id="versionNumber" href="/ChildCare/PrivacyAndSystemSecurity.htm?from=mec2functions" target="_blank" style="margin-left: 10px;">' + GM_info.script.name + ' v' + GM_info.script.version + '</a>'
                                                    + '<span class="tooltips" style="margin-left: 10px;">ⓘ<span style="width: 35ch;" id="mec2functionEnhancementsTooltip" class="tooltips-text tooltips-left">Click to show a list of enhancements by mec2functions on this page.</span></span>');
document.getElementById('mec2functionEnhancementsTooltip')?.addEventListener( 'click', mec2enhancements)
const mec2functionFeatures = [
        { title: 'Primary Navigation', desc: 'Buttons added to replace the drop-down menus for navigating MEC2.', selector: '.primary-navigation' },
        { title: 'User Settings', desc: 'Settings menu for mec2functions.', selector: '#mec2functionsDropdown' },
        { title: 'Open Case in New Tab', desc: 'An input field for a case number, with buttons that open the case in Notes or Overview. Pressing Enter opens Overview, and N opens Notes.', selector: '#buttonPanelOneNTF' },
        { title: 'Case History', desc: 'A list of the last 10 cases opened. Includes the case name, number, and date with time.', selector: '#newTabField' },
        { title: 'Addtional Footer Links', desc: 'Links added to the footer of sites commonly used by CCAP workers. Some links are only added to specific pages, such as on the CaseTransfer page.', selector: '#footer_links' },
        { title: 'Hotkeys', desc: 'Hotkeys to operate buttons. Hotkey combinations are "Alt" plus:<br><u>N</u>ew, <u>S</u>ave, <u>E</u>dit, <u>D</u>elete, <u>O</u>k, <u>C</u>ancel, <u>R</u>esend, <u>R</u>eturn, <u>W</u>rap-Up, <u>←</u> (previous), <u>→</u> (next).<br>Hotkey is typically the first letter of the button.' },
        { title: 'Auto-Focus', desc: 'When loading a page, or with certain page changes, an item on the page is automatically "focused" so that it can be interacted with immediately. The selected item is designed to be the item most likely needing interaction.' },
        { title: 'Theme colors', desc: 'Using the Stylus extension and MEC2Stylus, MEC2 theme colors are changed to beige and light grays or black and dark grays. This follows the "color" setting in "System Colors" in Windows.' },
        // {title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL"},
        { separator: true },
];
//
const countyInfo = {
    info: { ...sanitize.JSON( localStorage.getItem('MECH2.countyInfo') ) } ?? {},
    userSettings: { ...sanitize.JSON( localStorage.getItem('MECH2.userSettings') ) } ?? {},
    updateCountyInfoLS(countyInfoKey, countyInfoValue) { // keyName, newValue or "delete"
        countyInfoValue === "delete" ? delete this.info[countyInfoKey] : this.info[countyInfoKey] = countyInfoValue
        localStorage.setItem( 'MECH2.countyInfo', JSON.stringify(this.info) )
    },
    updateUserSettingsLS(userSettingsKey, userSettingsValue) {
        this.userSettings[userSettingsKey] = userSettingsValue
        localStorage.setItem( 'MECH2.userSettings', JSON.stringify(this.userSettings) )
    },
    countyInfoPrompt(questionString, countyInfoKey) {
        let promptAnswer = prompt(questionString, countyInfo.info[countyInfoKey] ?? "")
        if (typeof promptAnswer === "string") { this.updateCountyInfoLS(countyInfoKey, ( promptAnswer.length ? promptAnswer : "delete") ) }
        return promptAnswer
    },
}; // function_and_values
// updating to new system, can remove after pushed to Prod
if (GM_info.script.name === "mec2functions") {
    if (localStorage.getItem('MECH2.userIdNumber')) { countyInfo.updateCountyInfoLS('userIdNumber', localStorage.getItem('MECH2.userIdNumber')); localStorage.removeItem('MECH2.userIdNumber') };
    if (localStorage.getItem('MECH2.closedCaseBank')) { countyInfo.updateCountyInfoLS('closedCaseBank', localStorage.getItem('MECH2.closedCaseBank')); localStorage.removeItem('MECH2.closedCaseBank') };
    if (localStorage.getItem('MECH2.userName')) { countyInfo.updateCountyInfoLS( 'userName', localStorage.getItem('MECH2.userName') ); localStorage.removeItem('MECH2.userName') };
};
//
const newFeatureNotice = {
    newNoticesToUsers: [ // ["lsValue", [ "Description_of_setting. Default: On_Off" ], trueIsOn_falseIsOff_omitForNonSettingNotices],
        ["workerRole", ["Notice: Worker Role can be changed via the mec2functions drop-down (in the upper right).", "Currently, switching roles only changes the button order for Primary Navigation's second row. Default: Financial Worker."],],
        ["eleFocus", ["On page load, auto-focus on a field. Default: On."], true],
        ["caseHistory", ["Case History (most recent 10 cases accessed, found in the 'Case #' field to the right of the navigation buttons. Default: On."], true],
        ["actualDateStorage", ["'Actual Date' & 'Begin Date' auto-fill using the date entered on a previous entry. Default: On."], true],
        ["selectPeriodReversal", ["The 'Select Period' drop-down order set to 'Descending.' Default: On."], true],
        ["duplicateFormButtons", ["Form buttons duplicated and placed at the top of the page (Save, Edit, etc.). Default: On."], true],
        ["fundsAvailable", ["On the Funding Availability page, auto-select 'Yes'. Default: On."], true],
        ["autoHideDatePicker", ["Auto-hide the date picker calendar popup. Clicking the date field opens the picker, typing hides it.", "Resets to saved setting when a page is loaded. Default: Off."], false],
        ["userAccessibility", [ "Set items on page, such as table headers used for sorting, to be accessible using the Tab key. Default: On" ], true],
        ["starFall", ["Starfall. Note: MECH2 is not liable for lost work time or for your computer melting due to usage of Starfall. Default: Off."], false],
        ["promptUserNameTitle", ["Add a user-input title to the Automated Case Note signature.", "If your name was 'Worker N' you can add ', Hennepin County' as your title and your signature would be 'Worker N, Hennepin County'. Default: Off."], false ],
    ],
    noticeToUsersLS: (() => sanitize.JSON( localStorage.getItem('MECH2.noticeToUsersArrayLS') ) ?? [] )(),
    noticeToUsersBuildHTML() {
        let formElement = document.querySelector('div.container:has(form)')
        if (!formElement) { return };
        const noticeHTML = this.newNoticesToUsers.map( ([lsValue, textArray, newUserSetting] = []) => {
            if (this.noticeToUsersLS.includes(lsValue)) { return }; // return if acknowledged;
            countyInfo.updateUserSettingsLS(lsValue, newUserSetting) // add to stored settings if new;
            return ['<div id="Notice', lsValue, '" class="error_alertbox_new mec2functions"><div>', textArray.map(item => '<p class="redcolortext mec2functions" style="display: block;">' + item + '</p>').join(''), '</div><span style="cursor: pointer; color: black !important;">✖</span></div>'].join('')
        }).join('');
        if (!noticeHTML) { return };
        formElement?.insertAdjacentHTML('afterbegin', '<details class="error_alertbox_new" id="noticeDetails"><summary><strong style="cursor: pointer;">New mec2functions setting available, click here for details.</strong></summary>' + noticeHTML + '</details>');
        this.noticeAcknowledged();
    },
    noticeAcknowledged() {
        const noticeDetails = document.getElementById('noticeDetails')
        noticeDetails.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "SPAN") { return }
            let targetParent = clickEvent.target.parentElement
            this.noticeToUsersLS.push( sanitize.string(targetParent.id.slice(6)) )
            localStorage.setItem( 'MECH2.noticeToUsersArrayLS', JSON.stringify(this.noticeToUsersLS) )
            targetParent.remove()
            if (noticeDetails.children?.length === 1) { noticeDetails.remove() }
        });
    },
}; // function_and_values
newFeatureNotice.noticeToUsersBuildHTML();
//
const rederrortextContent = [...document.querySelectorAll('strong.rederrortext')].map(ele => ele.textContent);
const noResultsForCase = rederrortextContent?.some(ele => ele.includes('No results for case'));
const pageWrap = document.getElementById('page-wrap'), save = document.getElementById('save'), quit = document.getElementById('quit');
const editMode = (!pageWrap && !noResultsForCase), appModeNotEdit = (quit && save?.disabled);
const iFramed = window.location !== window.parent.location;
let focusEle = "blank";
const doNotDupe = {
    buttons: [],
    doNotUnderline: [],
    pages: ["ProviderSearch.htm", "ClientSearch.htm", "MaximumRates.htm", "ReportAProblem.htm", "WorkerSearch.htm", "Alerts.htm", "CaseLockStatus.htm", "CaseApplicationInitiation.htm", "CaseReapplicationAddCcap.htm", "CaseOverview.htm", "CasePaymentHistory.htm", "FinancialPaymentStatusHistory.htm", "FinancialClaimTransfer.htm", "FinancialPaymentDetail.htm", ],
};
const caseIdElement = document.querySelector('#caseId:not([type=hidden])'), caseId = caseIdElement?.value;
const providerIdElement = document.querySelector('#providerInput > #providerId:not([type=hidden])'), providerId = providerIdElement?.value;
const caseOrProviderId = caseId ?? providerId;
const pageTitle = document.querySelector('title').innerText;
const submitButton = document.querySelector('#submit, #caseInputSubmit, #alertInputSubmit, #submitProviderId, #providerIdSubmit');
//
!function navButtonDivs() {
    try {
        let greenline = document.querySelector("div.container:has(.line_mn_green)") ?? undefined
        greenline?.insertAdjacentHTML('afterend', `
        <nav class="navigation container">
          <div class="primary-navigation">
            <div class="primary-navigation-row"> <div id="buttonPanelOne"></div> <div id="buttonPanelOneNTF"></div> </div>
            <div class="primary-navigation-row"> <div id="buttonPanelTwo"></div> </div>
            <div class="primary-navigation-row"> <div id="buttonPanelThree"></div> </div>
          </div>
          <div id="secondaryActionArea"><div id="duplicateButtons" class="db-container"></div></div>
        </nav>
		`)
        if (!pageWrap) { return }
        greenline?.insertAdjacentElement('afterend', pageWrap);
        pageWrap?.classList.add('container')
    } catch(error) { console.trace(error) }
    finally { document.documentElement.style.setProperty('--mainPanelMovedDown', '0') }
}();
const secondaryActionArea = document.getElementById('secondaryActionArea'), duplicateButtons = document.getElementById('duplicateButtons');
//
const workerRole = countyInfo.info.workerRole ?? "mec2functionsFinancialWorker";
!function userSettingDivs() {
    if (iFramed || editMode) { return }; // User_Settings_Divs // code to check for affirmative setting is 'if (userSettings.settingId)'
    try {
        let isNavOnly = GM_info.script.name === "mec2navigation" ? '<div>Notice: Some settings, while available to change here, only apply to the full version (mec2functions)</div>' : ''
        document.getElementById('Claim Establishment').parentElement.classList.add('sub_menu')
        const settingsDivs = [
            { title: "Automatic field focus on page load", shortText: "Page Load Focus", id: "eleFocus" },
            { title: "Creates duplicated form \"Action\" buttons at top of page. e.g., Save, Edit.", shortText: "Duplicated Form Action Buttons", id: "duplicateFormButtons" },
            { title: "Sets Period Order drop-downs so that newest dates are on top.", shortText: "Descending Period Order", id: "selectPeriodReversal" },
            { title: "Displays last 10 unique cases in the Navigation Buttons \"Case #\" field.", shortText: "Case History", id: "caseHistory" },
            { title: "Fills Actual Date and Start Date fields, if date known.", shortText: "Actual Date Auto-Fill", id: "actualDateStorage" },
            { title: "Auto-selects Yes on the Funding Availability page.", shortText: "Funds Available: Yes", id: "fundsAvailable" },
            { title: "Auto-hide the date picker calendar popup until a date field is clicked. Resets to saved setting when a page is loaded.", shortText: "Auto-hide datepicker calendar", id: "autoHideDatePicker" },
            { title: "User accessibility features will be active (e.g., table headers access using tab)", shortText: "User Accessibility functionality", id: "userAccessibility" },
            { title: "Add a custom title to your signature name. Turn off and back on to change the title.", shortText: "Custom signature title", id: "promptUserNameTitle" },
            { title: "Pretty stars appear when the cursor is moved. MECH2 is not responsible for lost work time due to Starfall.", shortText: "Starfall ✨", id: "starFall" },
            // { title: "", shortText: "", id: "" },
        ].map(({ title, shortText, id } = {}) => '<div class="settings-div"><label class="settings-label" for="' + id + '" title="' + title + '">' + shortText + '</label><label class="switch"><input type="checkbox" id="' + id + '"><span class="slider round"></span></label></div>').join('')
        document.body.insertAdjacentHTML('beforeend', `
        <div class="container">
          <dialog class="settingsOuter" id="mec2functionsSettings">
            <div class="settingsInner" id="settingsInner">`
            + isNavOnly + settingsDivs
         + `</div>
            <div class="settingsButtons" id="mec2functionsSettingsButtonDiv">
              <button class="cButton" type="button" id="mec2functionsSave">Save</button> <button class="cButton" type="button" id="mec2functionsClose">Close</button>
            </div>
          </dialog>
        </div>
        `)
        let mec2functionsSettingsDialog = document.getElementById('mec2functionsSettings')
        document.getElementById('settingsInner').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "INPUT" || clickEvent.target.id.indexOf('prompt') < 0 || !clickEvent.target.checked) { return };
            let promptKey = "input" + clickEvent.target.id.slice(6), promptInfo = getPromptQuestion(promptKey)
            if ( !countyInfo.countyInfoPrompt( getPromptQuestion(promptKey), promptKey ) ) { clickEvent.target.checked === false }
        })
        function getPromptQuestion(promptKey) {
            switch(promptKey) {
                case "inputUserNameTitle": { return "Input username signature title, including any punctuation\n(ex: , Hennpin County)." }
            }
        }
        document.getElementById('mec2functionsSettingsButtonDiv').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            if (clickEvent.target.id === "mec2functionsSave") {
                let userSettingsInputs = [...document.querySelectorAll('#settingsInner input')].forEach(ele => countyInfo.updateUserSettingsLS(ele.id, ele.checked) )
                snackBar('Page must be reloaded before settings are applied.', 'Settings Saved!')
            }
            mec2functionsSettingsDialog.close()
        })
        let mec2functionsSettingsHTML = ''
        + '<a href="#">mec2functions</a>'
        + '<ul class="sub_menu" style="width: fit-content;" id="mec2functionsSubMenu">'
            + [{ id: "mec2functionsFinancialWorker", text: "Financial Worker" }, { id: "mec2functionsPaymentWorker", text: "Payment Worker" }, { id: "mec2functionsProviderWorker", text: "Provider Worker" }, { id: "mec2functionsOpenSettings", text: "Settings" }, ].map(({ id, text } = {}) => '<li><a href="#" id="' + id + '">' + text + '</a>').join('')
        + '</ul>'
        let mec2functionsDropdown = document.createElement('li')
        mec2functionsDropdown.id = "mec2functionsDropdown"
        mec2functionsDropdown.innerHTML = mec2functionsSettingsHTML
        document.querySelector('ul.dropdown').append(mec2functionsDropdown)
        let mec2functionsSubMenu = document.getElementById('mec2functionsSubMenu')
        mec2functionsDropdown.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "A") { return }
            mec2functionsSubMenu.style.visibility = "hidden"
            if (clickEvent.target.id.indexOf("Worker") > -1) { countyInfo.updateCountyInfoLS('workerRole', clickEvent.target.id) }
            if (clickEvent.target.id === "mec2functionsOpenSettings") {
                let userSettingsInputs = [...document.querySelectorAll('#settingsInner input')]
                userSettingsInputs.forEach(ele => { ele.checked = countyInfo.userSettings[ele.id] ?? false })
                mec2functionsSettingsDialog.showModal()
            }
        })
    }
    catch (error) { console.trace(error) }
}();
//
const h4objects = h4list();
function h4list() { // h4elementText: { h4element, indexNumber, siblings }
    class h4object {
        constructor(h4) {
            this.h4 = h4;
            this.text = h4.textContent.replace(/\W/g, '').toLowerCase();
            this.h4parentChildren = h4.parentElement.children;
            this.indexNumber = [...this.h4parentChildren].indexOf(h4);
            this.siblings = [];
            this.h4siblingsFunc();
            return this
        }
        h4siblingsFunc() {
            let h4nextSiblings = []
            for (let child of this.h4parentChildren) {
                if ( child === this.h4 || ['SCRIPT', 'STYLE', 'BR', 'NAV'].includes(child.nodeName) ) { continue }
                if (!child || child.nodeName === "H4") { break }
                this.siblings.push(child)
            }
        }
    }
    let h4objectsQuery = [...document.getElementsByTagName('h4')]
    let h4objectsObj = {}
    h4objectsQuery.forEach(h4 => {
        let h4collection = new h4object(h4)
        h4objectsObj[h4collection.text] = h4collection
    })
    return h4objectsObj
};
!function h4clickyCollapse() {
    if (iFramed) { return }
    try {
        for (let h4prop in h4objects) {
            h4objects[h4prop].h4.addEventListener('click', () => h4objects[h4prop].siblings.forEach( ele => ele.classList.toggle('hidden') ))
        }
    } catch(err) { console.trace(err) }
}();
//
const reviewingEligibility = (thisPageNameHtm.indexOf("CaseEligibilityResult") > -1 && thisPageNameHtm.indexOf("CaseEligibilityResultSelection.htm") < 0);
const selectPeriod = document.getElementById('selectPeriod'), selectPeriodValue = selectPeriod?.value;
const selectPeriodDates = selectPeriodValue?.length ? { range: selectPeriodValue, parm3: selectPeriodValue.replace(' - ', '').replaceAll('/', ''), start: selectPeriodValue.slice(0, 10), end: selectPeriodValue.slice(13) } : {};
const getListAndAlertTableParameters = { // Parameters for navigating from Alerts or Lists, and the column
    parameterTwo(tableData) {
        let [ tableId, childNum ] = tableData.get(thisPageNameHtm) ?? ['table > tbody', 0]
        let mappedRowChildren = document.querySelector(tableId + '> tr.selected')?.children
        if (!mappedRowChildren) { return }
        return mappedRowChildren[childNum]?.textContent
    },
    case() {
        const tableMap = new Map([
            ["Alerts.htm", ["table#caseOrProviderAlertsTable > tbody", 2] ],
            ["ClientSearch.htm", ['table#clientSearchProgramResults > tbody', 0] ],
            ["ServicingAgencyIncomingTransfers.htm", ['table#incomingTransfersTable > tbody', 5] ],
            ["ServicingAgencyOutgoingTransfers.htm", ['table#outgoingTransfersTable > tbody', 5] ],
            ["BillsList.htm", ['table#billsTable > tbody', 0] ],
        ])
        let param2 = this.parameterTwo(tableMap)
        if (!param2 || Number.isNaN(param2)) { return '?parm2=' }
        let param3 = "Alerts.htm".includes(thisPageNameHtm) ? '&parm3=' + ( document.getElementById('periodBeginDate')?.value + document.getElementById('periodEndDate')?.value ).replace(/\//g, '')
        : "BillsList.htm".includes(thisPageNameHtm) ? '&parm3=' + (document.querySelector('table#billsTable > tbody > tr.selected > td:nth-child(5)').textContent).replace(/[\/\- ]/g, '')
        : ''
        return '?parm2=' + param2 + param3
    },
    provider() {
        const tableMap = new Map([
            ["Alerts.htm", ["table#caseOrProviderAlertsTable > tbody", 2] ],
            ["ProviderRegistrationList.htm", ['table#providerRegistrationTable > tbody', 1] ],
            ["ProviderSearch.htm", ['table#providerSearchTable > tbody', 0] ],
            ["BillsList.htm", ['table#billsTable > tbody', 2] ],
        ])
        let param2 = this.parameterTwo(tableMap)
        if (!param2 || Number.isNaN(param2)) { return '?providerId=' }
        return '?providerId=' + param2
    },
}; // function_and_values
let newTabField;
//
document.body.insertAdjacentHTML('beforeend', '<div id="snackBarDiv"></div>'); // snack_bar start
function snackBar(text, title = "Copied!", textAlign = "left") {
    let snackBarDiv = document.getElementById('snackBarDiv')
    snackBarDiv.replaceChildren()
    let snackBarTxt = ""
    if (title !== 'notitle') { snackBarTxt += "<span class='snackBar-title'>" + title + "</span>" }
    let snackBarTextArray = text.split('\n')
    for (const line of snackBarTextArray) {
        snackBarTxt += "<span>" + line + "</span>";
    }
    snackBarDiv.insertAdjacentHTML('beforeend', '<div class="snackBar">' + snackBarTxt + '</div>')
    setTimeout(() => snackBarDiv.children[0].classList.add('snackBar-hide'), 1);
}; // snack_bar end
function getTableRow(ele) {
    if (!sanitize.query(ele)) { return };
    while ( !["TR", "TBODY"].includes(ele.nodeName) ) { ele = ele.parentElement }
    if (ele.nodeName === "TBODY") { return undefined }
    return ele
};
function docReady(fn) {
    if (["complete", "interactive"].includes(document.readyState)) { setTimeout(fn, 1) }
    else { document.addEventListener("DOMContentLoaded", fn) }
};
//
!function keepSelectedTableRowOnClick() { //Fix for table entries losing selected class when clicked on.
    if (iFramed) { return };
    document.querySelectorAll('tbody').forEach(tbody => {
        tbody.addEventListener('click', clickEvent => {
            let closestTr = getTableRow(clickEvent.target)
            if (closestTr && !closestTr.classList.contains('selected') ) {
                [...tbody.children].find(ele => ele.classList.contains('selected'))?.classList.remove('selected')
                closestTr.classList.add('selected')
            }
        })
    })
}();
// ====================================================================================================
// /////////////////////////////////// SECTION_START CUSTOM_NAVIGATION \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ///////////////////////////// PRIMARY_NAVIGATION_BUTTONS SECTION_START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\
!function navigationButtons() {
    const searchIcon = "<span style='font-size: 80%; margin-left: 2px;'>🔍</span>";
    const navMaps = {
        rowMap: new Map([
            [ "rowOne", [ "Alerts.htm", "CaseNotes.htm", "CaseOverview.htm", "CasePageSummary.htm", "ClientSearch.htm", "ProviderSearch.htm", "ActiveCaseList.htm", "PendingCaseList.htm", "InactiveCaseList.htm", "CaseApplicationInitiation.htm", ] ],
        ]),
        rowPagesMap: new Map([
            [ "Member.btn", [ "CaseMember.htm", "CaseMemberII.htm", "CaseParent.htm", "CaseCSE.htm", "CaseSchool.htm", "CaseChildProvider.htm", "CaseSpecialNeeds.htm", "CaseDisability.htm", "CaseFraud.htm", "CaseImmigration.htm", "CaseAlias.htm", "CaseRemoveMember.htm", "CaseMemberHistory.htm" ], ],
            [ "Case.btn", [ "CaseEditSummary.htm", "CaseAddress.htm", "CaseAction.htm", "FundingAvailability.htm", "CaseRedetermination.htm", "ApplicationInformation.htm", "CaseReinstate.htm" ], ],
            [ "Activity_and_Income.btn", [ "CaseEarnedIncome.htm", "CaseUnearnedIncome.htm", "CaseLumpSum.htm", "CaseExpense.htm", "CaseEducationActivity.htm", "CaseEmploymentActivity.htm", "CaseSupportActivity.htm", "CaseJobSearchTracking.htm" ], ],
            [ "Eligibility.btn", [ "CaseEligibilityResultSelection.htm", "CaseEligibilityResultOverview.htm", "CaseEligibilityResultFamily.htm", "CaseEligibilityResultPerson.htm", "CaseEligibilityResultActivity.htm", "CaseEligibilityResultFinancial.htm", "CaseEligibilityResultApproval.htm", "CaseCreateEligibilityResults.htm" ], ],
            [ "SA.btn", [ "CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm", "CaseServiceAuthorizationApproval.htm", "CaseCreateServiceAuthorizationResults.htm" ], ],
            [ "Notices.btn", [ "CaseNotices.htm", "CaseSpecialLetter.htm", "CaseMemo.htm" ], ],
            [ "Provider_Info.btn", [ "ProviderOverview.htm", "ProviderNotes.htm", "ProviderInformation.htm", "ProviderAddress.htm", "ProviderParentAware.htm", "ProviderAccreditation.htm", "ProviderTraining.htm", "ProviderRates.htm", "ProviderLicense.htm", "ProviderAlias.htm", "ProviderBackgroundStudy.htm", "ProviderFeesAndAccounts.htm", "ProviderRegistrationAndRenewal.htm", "ProviderTaxInfo.htm", "ProviderPaymentHistory.htm" ], ],
            [ "Provider_Notices.btn", [ "ProviderNotices.htm", "ProviderSpecialLetter.htm", "ProviderMemo.htm" ], ],
            [ "Pro.btn", [ "ProviderProUserAccess.htm", "ProUserDetail.htm", "ProUserSearch.htm", "ProUserProviderRelationship.htm", "ProUserResetPassword.htm" ], ],
            [ "Billing.btn", [ "FinancialBilling.htm", "FinancialBillingApproval.htm", "BillsList.htm", "ElectronicBills.htm", "CasePaymentHistory.htm", "FinancialAbsentDayHolidayTracking.htm", "FinancialBillingRegistrationFeeTracking.htm", "FinancialManualPayment.htm" ], ],
            [ "CSI.btn", [ "CaseCSIA.htm", "CaseCSIB.htm", "CaseCSIC.htm", "CaseCSID.htm" ], ],
            [ "Transfer.btn", [ "CaseTransfer.htm", "ServicingAgencyIncomingTransfers.htm", "ServicingAgencyOutgoingTransfers.htm", "FinancialClaimTransfer.htm", "ProviderTransfer.htm", "TransferWorkloadCase.htm", "TransferWorkloadClaim.htm", "ProviderWorkloadTransfer.htm" ], ],
            [ "Claims.btn", [ "FinancialClaimEstablishment.htm", "FinancialClaimMaintenanceAmountDetails.htm", "FinancialClaimMaintenanceSummary.htm", "FinancialClaimNoticeOverpaymentText.htm", "FinancialClaimNotes.htm", "FinancialClaimNotices.htm", "ProviderFraud.htm", "FinancialClaimMaintenanceCase.htm", "FinancialClaimMaintenancePerson.htm", "FinancialClaimMaintenanceProvider.htm" ], ],
        ]),
        allPagesMap: new Map([
            [ "Alerts.htm", { label: "Alerts", target: "_self", parentId: "Alerts", row: "1" }, ],
            [ "CaseNotes.htm", { label: "Notes", target: "_self", parentId: "Case Notes", row: "1" }, ],
            [ "CaseOverview.htm", { label: "Overview", target: "_self", parentId: "Case Overview", row: "1" }, ],
            [ "CasePageSummary.htm", { label: "Summary", target: "_self", parentId: "Page Summary", row: "1" }, ],
            [ "ClientSearch.htm", { label: "Client " + searchIcon, target: "_self", parentId: "Client Search", row: "1" }, ],
            [ "ProviderSearch.htm", { label: "Provider " + searchIcon, target: "_self", parentId: "Provider Search", row: "1" }, ],
            [ "ActiveCaseList.htm", { label: "Active", target: "_self", parentId: "Active Caseload List", row: "1" }, ],
            [ "PendingCaseList.htm", { label: "Pending", target: "_self", parentId: "Pending Case List", row: "1" }, ],
            [ "InactiveCaseList.htm", { label: "Inactive", target: "_self", parentId: "Inactive Case List", row: "1" }, ],
            [ "CaseApplicationInitiation.htm", { label: "New App", target: "_self", parentId: "Case Application Initiation", row: "1" }, ],

            [ "CaseMember.htm", { label: "Member I", target: "_self", parentId: "Member", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseMemberII.htm", { label: "Member II", target: "_self", parentId: "Member II", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseParent.htm", { label: "Parent", target: "_self", parentId: "Parent", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseCSE.htm", { label: "CSE", target: "_self", parentId: "Child Support Enforcement", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseSchool.htm", { label: "School", target: "_self", parentId: "School", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseChildProvider.htm", { label: "Provider", target: "_self", parentId: "Child Provider", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseSpecialNeeds.htm", { label: "Special Needs", target: "_self", parentId: "Special Needs", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseDisability.htm", { label: "Disability", target: "_self", parentId: "Disability", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseFraud.htm", { label: "Fraud", target: "_self", parentId: "Case Fraud", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseImmigration.htm", { label: "Immigration", target: "_self", parentId: "Immigration", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseAlias.htm", { label: "Alias", target: "_self", parentId: "Case Alias", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseRemoveMember.htm", { label: "Remove", target: "_self", parentId: "Remove a Member", rowTwoParent: "Member.btn", row: "3", }, ],
            [ "CaseMemberHistory.htm", { label: "History", target: "_self", parentId: "Member History", rowTwoParent: "Member.btn", row: "3", }, ],

            [ "CaseEarnedIncome.htm", { label: "Earned", target: "_self", parentId: "Earned Income", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseUnearnedIncome.htm", { label: "Unearned", target: "_self", parentId: "Unearned Income", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseLumpSum.htm", { label: "Lump Sum", target: "_self", parentId: "Lump Sum", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseExpense.htm", { label: "Expenses", target: "_self", parentId: "Expenses", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseEducationActivity.htm", { label: "Education", target: "_self", parentId: "Education Activity", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseEmploymentActivity.htm", { label: "Employment", target: "_self", parentId: "Employment Activity", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseSupportActivity.htm", { label: "Support", target: "_self", parentId: "Support Activity", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],
            [ "CaseJobSearchTracking.htm", { label: "Job Search", target: "_self", parentId: "Job Search Tracking", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],

            [ "CaseEditSummary.htm", { label: "Edit Summary", target: "_self", parentId: "Edit Summary", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "CaseAddress.htm", { label: "Address", target: "_self", parentId: "Case Address", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "CaseAction.htm", { label: "Case Action", target: "_self", parentId: "Case Action", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "FundingAvailability.htm", { label: "Funding Availability", target: "_self", parentId: "Funding Availability", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "CaseRedetermination.htm", { label: "Redetermination", target: "_self", parentId: "Case Redetermination", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "ApplicationInformation.htm", { label: "Application Info", target: "_self", parentId: "Case Application Info", rowTwoParent: "Case.btn", row: "3", }, ],
            [ "CaseReinstate.htm", { label: "Reinstate", target: "_self", parentId: "Reinstate", rowTwoParent: "Case.btn", row: "3", }, ],

            [ "CaseEligibilityResultSelection.htm", { label: "Selection", target: "_self", parentId: "Eligibility Results Selection", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultOverview.htm", { label: "Overview", target: "_self", parentId: "Results Overview", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultFamily.htm", { label: "Family", target: "_self", parentId: "Family Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultPerson.htm", { label: "Person", target: "_self", parentId: "Person Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultActivity.htm", { label: "Activity", target: "_self", parentId: "Activity Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultFinancial.htm", { label: "Financial", target: "_self", parentId: "Financial Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseEligibilityResultApproval.htm", { label: "Approval", target: "_self", parentId: "Approval Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],
            [ "CaseCreateEligibilityResults.htm", { label: "Create Eligibility Results", target: "_self", parentId: "Create Eligibility Results", rowTwoParent: "Eligibility.btn", row: "3", }, ],

            [ "CaseServiceAuthorizationOverview.htm", { label: "Overview", target: "_self", parentId: "Service Authorization Overview", rowTwoParent: "SA.btn", row: "3", }, ],
            [ "CaseCopayDistribution.htm", { label: "Copay", target: "_self", parentId: "Copay Distribution", rowTwoParent: "SA.btn", row: "3", }, ],
            [ "CaseServiceAuthorizationApproval.htm", { label: "Approval", target: "_self", parentId: "Service Authorization Approval", rowTwoParent: "SA.btn", row: "3", }, ],
            [ "CaseCreateServiceAuthorizationResults.htm", { label: "Create SA", target: "_self", parentId: "Create Service Authorization Results", rowTwoParent: "SA.btn", row: "3", }, ],

            [ "CaseCSIA.htm", { label: "CSIA", target: "_self", parentId: "CSIA", rowTwoParent: "CSI.btn", row: "3", }, ],
            [ "CaseCSIB.htm", { label: "CSIB", target: "_self", parentId: "CSIB", rowTwoParent: "CSI.btn", row: "3", }, ],
            [ "CaseCSIC.htm", { label: "CSIC", target: "_self", parentId: "CSIC", rowTwoParent: "CSI.btn", row: "3", }, ],
            [ "CaseCSID.htm", { label: "CSID", target: "_self", parentId: "CSID", rowTwoParent: "CSI.btn", row: "3", }, ],

            [ "CaseNotices.htm", { label: "Notices", target: "_self", parentId: "Case Notices", rowTwoParent: "Notices.btn", row: "3", }, ],
            [ "CaseSpecialLetter.htm", { label: "Special Letter", target: "_self", parentId: "Case Special Letter", rowTwoParent: "Notices.btn", row: "3", }, ],
            [ "CaseMemo.htm", { label: "Memo", target: "_self", parentId: "Case Memo", rowTwoParent: "Notices.btn", row: "3", }, ],

            [ "FinancialBilling.htm", { label: "Billing", target: "_self", parentId: "Billing", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "FinancialBillingApproval.htm", { label: "Billing Approval", target: "_self", parentId: "Billing Approval", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "BillsList.htm", { label: "Bills List", target: "_self", parentId: "Bills List", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "ElectronicBills.htm", { label: "eBills", target: "_self", parentId: "Electronic Bills", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "CasePaymentHistory.htm", { label: "Payment History", target: "_self", parentId: "Case Payment History", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "FinancialAbsentDayHolidayTracking.htm", { label: "Absent Days", target: "_self", parentId: "Tracking Absent Day Holiday", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "FinancialBillingRegistrationFeeTracking.htm", { label: "Registration Fee Tracking", target: "_self", parentId: "Tracking Registration Fee", rowTwoParent: "Billing.btn", row: "3", }, ],
            [ "FinancialManualPayment.htm", { label: "Manual Payments", target: "_self", parentId: "Manual Payments", rowTwoParent: "Billing.btn", row: "3", }, ],

            [ "ProviderOverview.htm", { label: "Overview", target: "_self", parentId: "Provider Overview", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderNotes.htm", { label: "Notes", target: "_self", parentId: "Provider Notes", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderInformation.htm", { label: "Info", target: "_self", parentId: "Provider Information", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderAddress.htm", { label: "Address", target: "_self", parentId: "Provider Address", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderParentAware.htm", { label: "Parent Aware", target: "_self", parentId: "Parent Aware", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderAccreditation.htm", { label: "Accred.", target: "_self", parentId: "Accreditation", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderTraining.htm", { label: "Training", target: "_self", parentId: "Training", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderRates.htm", { label: "Rates", target: "_self", parentId: "Rates", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderLicense.htm", { label: "License", target: "_self", parentId: "License", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderAlias.htm", { label: "Alias", target: "_self", parentId: "Provider Alias", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderBackgroundStudy.htm", { label: "Background", target: "_self", parentId: "Background Study", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderFeesAndAccounts.htm", { label: "Acct.", target: "_self", parentId: "Fees Accounts", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderRegistrationAndRenewal.htm", { label: "Registration", target: "_self", parentId: "Registration Renewal", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderTaxInfo.htm", { label: "Tax", target: "_self", parentId: "Tax Info", rowTwoParent: "Provider_Info.btn", row: "3", }, ],
            [ "ProviderPaymentHistory.htm", { label: "Payments", target: "_self", parentId: "Provider Payment History", rowTwoParent: "Provider_Info.btn", row: "3", }, ],

            [ "ProviderNotices.htm", { label: "Notices", target: "_self", parentId: "Provider Notices", rowTwoParent: "Provider_Notices.btn", row: "3", }, ],
            [ "ProviderSpecialLetter.htm", { label: "Special Letter", target: "_self", parentId: "Provider Special Letter", rowTwoParent: "Provider_Notices.btn", row: "3", }, ],
            [ "ProviderMemo.htm", { label: "Memo", target: "_self", parentId: "Provider Memo", rowTwoParent: "Provider_Notices.btn", row: "3", }, ],

            [ "ProviderProUserAccess.htm", { label: "User Access", target: "_self", parentId: "PRO User Access", rowTwoParent: "Pro.btn", row: "3", }, ],
            [ "ProUserDetail.htm", { label: "User Detail", target: "_self", parentId: "Pro User Details", rowTwoParent: "Pro.btn", row: "3", }, ],
            [ "ProUserSearch.htm", { label: "User Search", target: "_self", parentId: "Pro User Search", rowTwoParent: "Pro.btn", row: "3", }, ],
            [ "ProUserProviderRelationship.htm", { label: "Provider Relationship", target: "_self", parentId: "Pro User Provider Relationships", rowTwoParent: "Pro.btn", row: "3", }, ],
            [ "ProUserResetPassword.htm", { label: "Reset Password", target: "_self", parentId: "Pro User Reset Password", rowTwoParent: "Pro.btn", row: "3", }, ],

            [ "CaseTransfer.htm", { label: "Case Transfer", target: "_self", parentId: "Case Transfer", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "ServicingAgencyIncomingTransfers.htm", { label: "Incoming", target: "_blank", parentId: "Incoming Transfers", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "ServicingAgencyOutgoingTransfers.htm", { label: "Outgoing", target: "_blank", parentId: "Outgoing Transfers", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "FinancialClaimTransfer.htm", { label: "Claim Transfer", target: "_blank", parentId: "Claim Transfer", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "ProviderTransfer.htm", { label: "Provider Transfer", target: "_self", parentId: "Provider Transfer", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "TransferWorkloadCase.htm", { label: "Case Workload", target: "_self", parentId: "Transfer Caseload", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "TransferWorkloadClaim.htm", { label: "Claim Workload", target: "_self", parentId: "Transfer Claim Workload", rowTwoParent: "Transfer.btn", row: "3", }, ],
            [ "ProviderWorkloadTransfer.htm", { label: "Provider Workload", target: "_self", parentId: "Transfer Provider Workload", rowTwoParent: "Transfer.btn", row: "3", }, ],

            [ "FinancialClaimEstablishment.htm", { label: "Establishment", target: "_blank", parentId: "Claim Establishment", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimMaintenanceAmountDetails.htm", { label: "Details", target: "_self", parentId: "Maintenance Details", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimMaintenanceSummary.htm", { label: "Summary", target: "_self", parentId: "Maintenance Summary", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimNoticeOverpaymentText.htm", { label: "Overpayment Text", target: "_self", parentId: "Overpayment Text", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimNotes.htm", { label: "Notes", target: "_self", parentId: "Claim Notes", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimNotices.htm", { label: "Notices", target: "_self", parentId: "Claim Notices History", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "ProviderFraud.htm", { label: "Provider Fraud", target: "_self", parentId: "Provider Fraud", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimMaintenanceCase.htm", { label: "Maint-Case", target: "_self", parentId: "Maintenance Case", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimMaintenancePerson.htm", { label: "Maint-Person", target: "_self", parentId: "Maintenance Person", rowTwoParent: "Claims.btn", row: "3", }, ],
            [ "FinancialClaimMaintenanceProvider.htm", { label: "Maint-Provider", target: "_self", parentId: "Maintenance Provider", rowTwoParent: "Claims.btn", row: "3", }, ],
        ]),
        listPageList: [ "Alerts.htm", "ActiveCaseList.htm", "ClientSearch.htm", "InactiveCaseList.htm", "PendingCaseList.htm", "ProviderRegistrationList.htm", "ProviderSearch.htm", "ServicingAgencyIncomingTransfers.htm", "ServicingAgencyOutgoingTransfers.htm", "BillsList.htm", ],
        setWorkerRole() {
            switch (workerRole) {
                case "mec2functionsFinancialWorker":
                    this.rowMap.set( "rowTwo", [ "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Billing.btn", "Transfer.btn", "Claims.btn", ] )
                    break
                case "mec2functionsPaymentWorker":
                    this.rowMap.set( "rowTwo", [ "Billing.btn", "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Transfer.btn", "Claims.btn", ] )
                    break
                case "mec2functionsProviderWorker":
                    this.rowMap.set( "rowTwo", [ "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Billing.btn", "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Transfer.btn", "Claims.btn", ] )
                    break
            };
        },
    };
    if (iFramed) { return }
    navMaps.setWorkerRole()
    try {
        let buttonDivOne = document.getElementById('buttonPanelOne'), buttonDivTwo = document.getElementById('buttonPanelTwo'), buttonDivThree = document.getElementById('buttonPanelThree'), buttonDivOneNTF = document.getElementById("buttonPanelOneNTF");
        !function createNavButtons() {
            navMaps.rowMap.forEach((valueArray, row) => {
                if (row === "rowOne") {
                    buttonDivOne.insertAdjacentHTML( 'afterbegin', valueArray.map(page => '<button id="' + page + '" class="cButton nav">' + navMaps.allPagesMap.get(page).label + '</button>').join('') )
                } else if (row === "rowTwo") {
                    buttonDivTwo.insertAdjacentHTML( 'afterbegin', valueArray.map(label => '<button id="' + label + '" class="cButton nav">' + label.replaceAll(/_/g,' ').split(".")[0] + '</button>').join('') )
                }
            })
        }();
        //
        !function highlightNavOnPageLoad() {
            let thisPageNameMap = navMaps.allPagesMap.get(thisPageNameHtm)
            if (!thisPageNameMap) { return }
            if ( thisPageNameMap.row === "1" ) {
                document.getElementById(thisPageNameHtm).classList.add('open-page')
            } else if ( thisPageNameMap.row === "3" ) {
                populateNavRowThree(thisPageNameMap.rowTwoParent)
                document.getElementById(thisPageNameMap.rowTwoParent).classList.add('open-page')
            }
        }();
        //
        function populateNavRowThree(rowTwoCategory) {
            buttonDivThree.innerHTML = navMaps.rowPagesMap.get(rowTwoCategory).map(mapPageName => {
                let classList = "cButton nav"
                if (thisPageNameHtm === mapPageName) { classList += " open-page" }
                if (rowTwoCategory === "Eligibility.btn" && !reviewingEligibility && !["CaseEligibilityResultSelection.htm", "CaseCreateEligibilityResults.htm", ].includes(mapPageName) ) { classList += " hidden" }
                return '<button class="' + classList + '" id="' + mapPageName + '">' + navMaps.allPagesMap.get(mapPageName).label + '</button>'
            }).join('')
        }
        //
        function openNav(allPagesMapKey, target) {
            let destinationIsListPage = navMaps.listPageList.includes(allPagesMapKey)
            let qMarkParameters = ""
            let isListPage = navMaps.listPageList.includes(thisPageNameHtm)
            if (!destinationIsListPage && isListPage) {
                qMarkParameters = allPagesMapKey.indexOf("Provider") === 0 ? getListAndAlertTableParameters.provider() ?? '' : getListAndAlertTableParameters.case() ?? ''
                if (target === "_self") { document.body.style.opacity = ".8" }
                window.open('/ChildCare/' + allPagesMapKey + qMarkParameters, target)
                return
            }
            if (!editMode) {
                let targetPage = navMaps.allPagesMap.get(allPagesMapKey).parentId.replace(/ /g, '\ ')
                if (target === "_self") { document.body.style.opacity = ".8" }
                window.open( document.getElementById(targetPage).firstElementChild.href, target )
            } else if (editMode) {
                qMarkParameters = caseId ? "?parm2=" + caseId : ''
                window.open('/ChildCare/' + allPagesMapKey + qMarkParameters, "_blank")
            }
        }
        //
        function clickRowTwo(eventTarget) {
            buttonDivTwo.querySelectorAll('.cButton.nav.browsing').forEach(ele => ele.classList.remove('browsing'))
            populateNavRowThree(sanitize.string(eventTarget.id))
            eventTarget.classList.add('browsing')
        }
        document.querySelector('.primary-navigation').addEventListener('click', eventClick => {
            let eventClickTarget = eventClick.target
            if ( eventClickTarget.parentElement === buttonDivOneNTF || eventClickTarget.nodeName !== "BUTTON") { return }
            if ( eventClickTarget.parentElement === buttonDivTwo ) {
                clickRowTwo(eventClickTarget)
                return
            }
            if (editMode) {
                openNav(sanitize.string(eventClickTarget.id), "_blank")
                return
            }
            openNav(sanitize.string(eventClickTarget.id), "_self")
        })
        document.querySelector('.primary-navigation').addEventListener('contextmenu', eventContextMenu => {
            let parentDiv = eventContextMenu.target.closest('div')
            if ( eventContextMenu.target.nodeName !== "BUTTON" ) { return }
            eventContextMenu.preventDefault();
            if ( parentDiv === buttonDivTwo ) {
                clickRowTwo(eventContextMenu.target)
                return
            }
            openNav(eventContextMenu.target.id, "_blank")
        })

        if ("getProviderOverview.htm".includes(thisPageNameHtm)) {
            let getProviderOverview = document.getElementById('Provider_Info.btn')
            getProviderOverview.click()
            getProviderOverview.classList.replace('browsing', 'open-page')
            document.getElementById('ProviderOverview.htm').classList.add('open-page')
        }
        if (["ProviderSearch.htm", "ProviderRegistrationList.htm"].includes(thisPageNameHtm)) { document.getElementById('Provider_Info.btn').click() };
        // SECTION_START New_Tab_Case_Number_Field
        !function newTabFieldButtons() {
            buttonDivOneNTF.insertAdjacentHTML('afterbegin', ''
                + '<div id="newTabInputDiv"><input id="newTabField" list="" autocomplete="off" class="form-control" placeholder="Case #" style="width: 10ch;"></input></div>'
                + '<button type="button" data-page-name="CaseNotes" id="FieldNotesNT" class="cButton nav">Notes</button>'
                + '<button type="button" data-page-name="CaseOverview" id="FieldOverviewNT" class="cButton nav">Overview</button>')
            newTabField = document.getElementById('newTabField')
            function clearNTF() { newTabField.value = '' }
            buttonDivOneNTF.addEventListener('click', clickEvent => {
                if (clickEvent.target.closest('button')?.nodeName === 'BUTTON' && (/\b\d{1,8}\b/).test(newTabField.value)) {
                    clickEvent.preventDefault()
                    openCaseNumber(sanitize.string(clickEvent.target.dataset.pageName), newTabField.value)
                    clearNTF()
                }
            })
            newTabField.addEventListener('keydown', keydownEvent => {
                keydownEvent.stopImmediatePropagation()
                if (keydownEvent.target.value.length > 7) {
                    if (!['ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Home', 'End', 'Escape'].includes(keydownEvent.key) && ( !keydownEvent.ctrlKey && !['v', 'a', 'z'].includes(keydownEvent.key) ) ) {
                        keydownEvent.preventDefault()
                        return false
                    }
                }
                if ( !keydownEvent.ctrlKey && (/[a-z]/i).test(newTabField.value) ) { return }
                switch (keydownEvent.key) {
                    case 'n':
                        keydownEvent.preventDefault();
                        window.open('/ChildCare/CaseNotes.htm?parm2=' + newTabField.value, '_blank');
                        clearNTF()
                        break
                    case 'o':
                    case 'Enter':
                        keydownEvent.preventDefault();
                        window.open('/ChildCare/CaseOverview.htm?parm2=' + newTabField.value, '_blank');
                        clearNTF()
                        break
                }
            })
            function openCaseNumber(pageName, enteredCaseNumber) {
                if (pageName == "CaseNotes") { window.open('/ChildCare/CaseNotes.htm?parm2=' + enteredCaseNumber, '_blank') }
                else { window.open('/ChildCare/CaseOverview.htm?parm2=' + enteredCaseNumber, '_blank') }
            };
        }();
        editMode && (document.querySelectorAll('#buttonPanelTwo, #buttonPanelThree').forEach(ele => ele.classList.add('hidden') )); // SECTION_END New_Tab_Case_Number_Field
    } catch (error) { console.trace(error) }
}();
// ///////////////////////////// PRIMARY_NAVIGATION_BUTTONS SECTION_END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
if (selectPeriod && countyInfo.userSettings.selectPeriodReversal && !editMode) { selectPeriodReversal() };
function selectPeriodReversal(selectPeriodEleToReverse = selectPeriod, startPos=0) { // don't iife
    selectPeriodEleToReverse = sanitize.query(selectPeriodEleToReverse)
    if (!selectPeriodEleToReverse || selectPeriodEleToReverse.disabled) { return };
    selectPeriodEleToReverse.innerHTML = [...selectPeriodEleToReverse.children].reverse().map(ele => ele.outerHTML).join('')
};
!function nextPrevPeriodButtons() {
    if (iFramed) { return };
    if (!selectPeriod || !sanitize.query(selectPeriod) || !document.querySelector('#selectPeriod:not([disabled], [readonly], [type=hidden])')) { return }
    try {
        if (!editMode) {
            if (reviewingEligibility || thisPageNameHtm.indexOf("CaseApplicationInitiation.htm") > -1 || submitButton?.disabled) { return }
            let selectPeriodReversed = countyInfo.userSettings.selectPeriodReversal
            let lastAvailablePeriod = selectPeriod.children[0].value
            let prevPeriodButtons = '<span id="prevButtons"><button id="backGoSelect" tabindex="-1" type="button" data--next-or-prev="Prev" data--stay-or-go="Go" class="npp-button">«</button><button id="backSelect" tabindex="-1" type="button" data--next-or-prev="Prev" data--stay-or-go="Stay" class="npp-button">‹</button></span>',
                nextPeriodButtons = '<span id="nextButtons"><button id="forwardSelect" tabindex="-1" type="button" data--next-or-prev="Next" data--stay-or-go="Stay" class="npp-button">›</button><button id="forwardGoSelect" tabindex="-1" type="button" data--next-or-prev="Next" data--stay-or-go="Go" class="npp-button">»</button></span>'
            selectPeriod.insertAdjacentHTML('beforebegin', prevPeriodButtons)
            selectPeriod.insertAdjacentHTML('afterend', nextPeriodButtons)
            let nextButtons = document.getElementById('nextButtons')
            function checkPeriodMobility() {
                nextButtons.style.opacity = selectPeriod.value === lastAvailablePeriod ? ".5" : ""
            }
            checkPeriodMobility()

            selectPeriod.parentElement.addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName !== "BUTTON") { return; }
                checkPeriodMobility()
                let clickedButton = clickEvent.target.closest('button')
                selectNextPrev(clickedButton.id, clickedButton.dataset.NextOrPrev, clickedButton.dataset.StayOrGo)
            })
            function selectNextPrev(buttonId, nextOrPrev, stayOrGo) {
                if (nextOrPrev === "Next") {
                    if (selectPeriod.selectedIndex === 0) { // top of list
                        if (stayOrGo === "Go") { submitButton.click() }
                        return
                    }
                    selectPeriodReversed ? selectPeriod.selectedIndex-- : selectPeriod.selectedIndex++; //Subtracting goes up;
                    if (stayOrGo === "Go") { submitButton.click() }
                } else if (nextOrPrev === "Prev") {
                    selectPeriodReversed ? selectPeriod.selectedIndex++ : selectPeriod.selectedIndex--;
                    if (stayOrGo === "Go") { submitButton.click() }
                }
                checkPeriodMobility()
            };
        }
    } catch (error) { console.trace("nextPrevPeriodButtons", error) }
}();
docReady( document.body?.addEventListener('submit', () => { document.body.style.opacity = ".8" }) ); // Dim_Page_On_Submit
// docReady (document.querySelectorAll('input:read-write').forEach(ele => { ele.spellcheck = false }) )
!function footerLinks() {
    if (iFramed) { return }
    try {
        let foot = document.getElementById('footer_links');
        if (foot) {
            [...foot?.childNodes]?.filter(eleFeet => eleFeet.nodeType === 3 && eleFeet.length > 2).forEach(eleFoot => eleFoot.remove());
            let toes = document.getElementById('footer_links').children;
            [...toes]?.toSpliced(-1, 1).forEach(eleToes => eleToes.insertAdjacentHTML('afterend', '<span class="footer">ı</span>'));
            const additionalFooterLinks = [
                ["https://owa.dhssir.cty.dhs.state.mn.us/owa/", "_blank", "SIR Mail"],
                ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/MMR/TSS_General_Request.asp", "_blank", "Help Desk"],
                ["https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_146163", "_blank", "Resources"],
                ["https://policyquest.dhs.state.mn.us/", "_blank", "PolicyQuest"],
                ["https://www.mnworkforceone.com/", "_blank", "WF1"],
                ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/ccforms/TSS_PMI_Merge_Request.aspx", "_blank", "PMI Merge"],
                ["https://moms.mn.gov/", "_blank", "MOMS"],
                ["https://smi.dhs.state.mn.us/", "_blank", "SMI"],
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
            document.querySelector('#footer_links > a[href="https://bi.dhs.state.mn.us/BOE/BI"]').textContent = 'BOBI'
            let newUserManual = document.querySelector('#footer_links>a[href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=mecc-0002"]')
            newUserManual.outerHTML = '<a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=MECC-0001" target="_blank" tabindex="-1">"New" User Manual</a><span class="footer">ı</span><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_139409" target="_blank">User Manual</a>'
            document.getElementById('contactInformation').insertAdjacentHTML('afterend', getFooterLinks())
        }
    } catch (error) { console.trace(error) }
}();
// ///////// SECTION_END CUSTOM_NAVIGATION  (THE MEC2NAVIGATION SCRIPT SHOULD MIMIC THE ABOVE) \\\\\\\\
// ====================================================================================================
function resetTabIndex(excludedListString) {
    const nonResetPages = ["CaseSpecialLetter.htm", "CaseLumpSum.htm"]
    if (nonResetPages.includes(thisPageNameHtm)) { return }
    // document.querySelectorAll('.panel-box-format :is(input, select):not(.toggleSlider, [type=hidden])').forEach(ele => ele.removeAttribute('tabindex'))
};
// setTimeout(() => resetTabIndex(), 400)
const flashRedBorder = {
    animate(ele) { let saniEle = sanitize.query(ele); saniEle && saniEle.animate(this.redBorder, this.redBorderTiming) },
    redBorder: [{ borderColor: "red", borderWidth: "2px", }],
    redBorderTiming: { borderStyle: "solid", duration: 300, iterations: 10, },
};
const nameFuncs = {
    commaNameObject(commaNameO) {
        if (!commaNameO) { return }
        let [ last, first ] = this.toTitleCase( String(commaNameO).replace(/\b\w\b|\./g, '') ).split(",").map(str => str.trim())
        return { first, last, full: first + " " + last }
    },
    commaNameReorder(commaNameR) {
        if (!commaNameR) { return }
        commaNameR = this.toTitleCase( String(commaNameR).replace(/\b\w\b\.*/, '') ).split(",")
        return commaNameR[1].trim() + ' ' + commaNameR[0].trim()
    },
    commaToCommaSpace(value) { return !value ? undefined : String(value).replace(/(\w\,)(\w)/g, "$0 $1") },
    toTitleCase(str) { return !str ? undefined : str.replace(/[^-\s,]+/g, s => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase()) },
    LastFirstToFirstL(name) { return !name ? undefined : this.commaNameReorder(name).replace(/(\s\w)\w+/, '$1') },
};
const dateFuncs = {
    dayInMs: 86400000,
    addDays(date, days) { return sanitize.date(date, "number") + (days * this.dayInMs) },
    dateDiffInDays(a, b) {
        a = sanitize.date(a, "number")
        b = b === undefined ? Date.now() : sanitize.date(b, "number")
        return Math.abs(Math.floor((b - a) / this.dayInMs))
    },
    formatDate(date, format = "mmddyy") {
        date = date instanceof Date ? date : new Date(date)
        switch (format) {
            case "mmddyy": return date.toLocaleDateString(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" })
            case "mdyy": return date.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" })
            case "mmddyyyy": return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
            case "mmddhm": return date.toLocaleDateString('en-US', { hour: "numeric", minute: "2-digit", month: "2-digit", day: "2-digit" })
            default: return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" })
        }
    },
    getDateString(year, month, week, day) {
        const dateToGet = this.getDateofWeekdayWithWeek(year, month, week, day);
        return dateToGet.toLocaleDateString();
    },
    getDateofWeekdayWithWeek(year, month, week, day) {
        if (week < 0) { month++ }
        const dateToGet = new Date(year, month, (week * 7) + 1)
        if (day < dateToGet.getDay()) { day += 7 }
        dateToGet.setDate(dateToGet.getDate() - dateToGet.getDay() + day)
        return dateToGet
    },
    getMonthDifference(firstDate, secondDate) {
        firstDate = sanitize.date(firstDate, "date")
        secondDate = sanitize.date(secondDate, "date")
        let months = (firstDate.getFullYear() - secondDate.getFullYear()) * 12
        let datePassed = (secondDate.getDate() > firstDate.getDate()) ? 1 : 0
        months -= secondDate.getMonth()
        months += firstDate.getMonth()
        months -= datePassed
        return months <= 0 ? 0 : months;
    },
};
const convertLineBreakToSpace = (string) => string.replace(/([\S]) *\n([a-z])/g, '$1 $2');
const eventChange = new Event('change'), doEvent = (element) => sanitize.query(element)?.dispatchEvent(eventChange);
class TrackedMutationObserver extends MutationObserver { // https://stackoverflow.com/questions/63488834/how-to-get-all-active-mutation-observers-on-page // Replace MutationObserver with TrackedMutationObserver
    static instances = []
    constructor(...args) { super(...args); }
    observe(...args) {
        super.observe(...args);
        this.constructor.instances.push(this)
    }
    disconnect() {
        super.disconnect();
        this.constructor.instances = this.constructor.instances.filter(instance => instance !== this);
    }
    static getActive() { return this.instances }
};
//
const userXnumber = countyInfo.info.userIdNumber ?? '';
const userCountyObj = new Map([
        ["x101", { county: "Aitkin", code: "101", neighbors: ["Cass", "Crow Wing", "Mille Lacs", "Kanabec", "Pine", "Carlton", "St. Louis", "Itasca"] }],
        ["x102", { county: "Anoka", code: "102", neighbors: ["Sherburne", "Wright", "Hennepin", "Ramsey", "Washington", "Chisago", "Isanti"] }],
        ["x103", { county: "Becker", code: "103", neighbors: ["Norman", "Clay", "Otter Tail", "Wadena", "Hubbard", "Clearwater", "Mahnomen"] }],
        ["x104", { county: "Beltrami", code: "104", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods"] }],
        ["x105", { county: "Benton", code: "105", neighbors: ["Morrison", "Stearns", "Sherburne", "Mille Lacs"] }],
        ["x106", { county: "Big Stone", code: "106", neighbors: ["Lac Qui Parle", "Swift", "Stevens", "Traverse"], outOfState: [ 57200, 57299 ] }],
        ["x107", { county: "Blue Earth", code: "107", neighbors: ["Brown", "Watonwan", "Martin", "Faribault", "Waseca", "Le Sueur", "Nicollet"] }],
        ["x108", { county: "Brown", code: "108", neighbors: ["Redwood", "Cottonwood", "Watonwan", "Blue Earth", "Nicollet", "Renville"] }],
        ["x109", { county: "Carlton", code: "109", neighbors: ["Aitkin", "Pine", "St. Louis"], outOfState: [ 54800, 54899 ] }],
        ["x110", { county: "Carver", code: "110", neighbors: ["Wright", "Hennepin", "Scott", "Sibley", "McLeod"] }],
        ["x111", { county: "Cass", code: "111", neighbors: ["Beltrami", "Hubbard", "Wadena", "Todd", "Morrison", "Crow Wing", "Aitkin", "Itasca"] }],
        ["x112", { county: "Chippewa", code: "112", neighbors: ["Swift", "Lac Qui Parle", "Yellow Medicine", "Renville", "Kandiyohi"] }],
        ["x113", { county: "Chisago", code: "113", neighbors: ["Pine", "Kanabec", "Isanti", "Anoka", "Washington"], outOfState: [ 54000, 54899 ] }],
        ["x114", { county: "Clay", code: "114", neighbors: ["Wilkin", "Otter Tail", "Becker", "Norman"], outOfState: [ 58000, 58099 ] }],
        ["x115", { county: "Clearwater", code: "115", neighbors: ["Pennington", "Polk", "Mahnomen", "Becker", "Hubbard", "Beltrami"] }],
        ["x116", { county: "Cook", code: "116", neighbors: ["Lake"] }],
        ["x117", { county: "Cottonwood", code: "117", neighbors: ["Redwood", "Murray", "Nobles", "Jackson", "Martin", "Watonwan", "Brown"] }],
        ["x118", { county: "Crow Wing", code: "118", neighbors: ["Cass", "Morrison", "Mille Lacs", "Aitkin"] }],
        ["x119", { county: "Dakota", code: "119", neighbors: ["Goodhue", "Rice", "Scott", "Hennepin", "Ramsey", "Washington"], outOfState: [ 54000, 54799 ] }],
        ["x120", { county: "Dodge", code: "120", neighbors: ["Rice", "Steele", "Freeborn", "Mower", "Olmsted", "Goodhue"] }],
        ["x121", { county: "Douglas", code: "121", neighbors: ["Otter Tail", "Grant", "Stevens", "Pope", "Stearns", "Todd"] }],
        ["x122", { county: "Faribault", code: "122", neighbors: ["Blue Earth", "Martin", "Freeborn", "Waseca"], outOfState: [ 50400, 50599 ] }],
        ["x123", { county: "Fillmore", code: "123", neighbors: ["Olmsted", "Mower", "Houston", "Winona"], outOfState: [ 50450, 52199 ] }],
        ["x124", { county: "Freeborn", code: "124", neighbors: ["Waseca", "Faribault", "Mower", "Dodge", "Steele"], outOfState: [ 50440, 50479] }],
        ["x125", { county: "Goodhue", code: "125", neighbors: ["Wabasha", "Olmsted", "Dodge", "Steele", "Rice", "Dakota"], outOfState: [ 54000, 54799 ] }],
        ["x126", { county: "Grant", code: "126", neighbors: ["Wilkin", "Traverse", "Stevens", "Pope", "Douglas", "Otter Tail"] }],
        ["x127", { county: "Hennepin", code: "127", neighbors: ["Sherburne", "Wright", "Carver", "Scott", "Dakota", "Ramsey", "Anoka", "Sherburne"] }],
        ["x128", { county: "Houston", code: "128", neighbors: ["Winona", "Fillmore"], outOfState: [ 52100, 54799 ] }],
        ["x129", { county: "Hubbard", code: "129", neighbors: ["Clearwater", "Becker", "Wadena", "Cass", "Beltrami"] }],
        ["x130", { county: "Isanti", code: "130", neighbors: ["Mille Lacs", "Sherburne", "Anoka", "Chisago", "Pine", "Kanabec"] }],
        ["x131", { county: "Itasca", code: "131", neighbors: ["Beltrami", "Cass", "Aitkin", "St. Louis", "Koochiching"] }],
        ["x132", { county: "Jackson", code: "132", neighbors: ["Murray", "Nobles", "Martin", "Watonwan", "Cottonwood"], outOfState: [ 50400, 51369 ] }],
        ["x133", { county: "Kanabec", code: "133", neighbors: ["Mille Lacs", "Isanti", "Chisago", "Pine", "Aitkin"] }],
        ["x134", { county: "Kandiyohi", code: "134", neighbors: ["Pope", "Swift", "Chippewa", "Renville", "Meeker", "Stearns"] }],
        ["x135", { county: "Kittson", code: "135", neighbors: ["Marshall", "Roseau"], outOfState: [ 58200, 58299 ] }],
        ["x136", { county: "Koochiching", code: "136", neighbors: ["Lake of the Woods", "Beltrami", "Itasca", "St. Louis"] }],
        ["x137", { county: "Lac qui Parle", code: "137", neighbors: ["Yellow Medicine", "Chippewa", "Swift", "Big Stone"], outOfState: [ 57200, 57299 ] }],
        ["x138", { county: "Lake", code: "138", neighbors: ["Cook", "St. Louis"] }],
        ["x139", { county: "Lake of the Woods", code: "139", neighbors: ["Roseau", "Beltrami", "Koochiching"] }],
        ["x140", { county: "Le Sueur", code: "140", neighbors: ["Sibley", "Nicollet", "Blue Earth", "Waseca", "Rice", "Scott"] }],
        ["x141", { county: "Lincoln", code: "141", neighbors: ["Pipestone", "Murray", "Lyon", "Yellow Medicine"], outOfState: [ 57000, 57299 ] }],
        ["x142", { county: "Lyon", code: "142", neighbors: ["Yellow Medicine", "Lincoln", "Pipestone", "Murray", "Redwood"] }],
        ["x143", { county: "McLeod", code: "143", neighbors: ["Meeker", "Renville", "Sibley", "Carver", "Wright"] }],
        ["x144", { county: "Mahnomen", code: "144", neighbors: ["Polk", "Norman", "Becker", "Clearwater"] }],
        ["x145", { county: "Marshall", code: "145", neighbors: ["Polk", "Pennington", "Beltrami", "Roseau"], outOfState: [ 58200, 58299 ] }],
        ["x146", { county: "Martin", code: "146", neighbors: ["Cottonwood", "Jackson", "Faribault", "Blue Earth", "Watonwan"], outOfState: [ 50400, 51369 ] }],
        ["x147", { county: "Meeker", code: "147", neighbors: ["Kandiyohi", "Renville", "McLeod", "Wright", "Stearns"] }],
        ["x148", { county: "Mille Lacs", code: "148", neighbors: ["Crow Wing", "Morrison", "Benton", "Sherburne", "Isanti", "Kanabec", "Aitkin"] }],
        ["x149", { county: "Morrison", code: "149", neighbors: ["Cass", "Todd", "Stearns", "Benton", "Mille Lacs", "Crow Wing"] }],
        ["x150", { county: "Mower", code: "150", neighbors: ["Steele", "Freeborn", "Fillmore", "Olmsted", "Dodge"], outOfState: [ 50450, 52199 ] }],
        ["x151", { county: "Murray", code: "151", neighbors: ["Lincoln", "Pipestone", "Rock", "Nobles", "Jackson", "Cottonwood", "Redwood", "Lyon"] }],
        ["x152", { county: "Nicollet", code: "152", neighbors: ["Renville", "Brown", "Blue Earth", "Le Sueur", "Sibley"] }],
        ["x153", { county: "Nobles", code: "153", neighbors: ["Pipestone", "Rock", "Jackson", "Cottonwood", "Murray"], outOfState: [ 51369, 54100 ] }],
        ["x154", { county: "Norman", code: "154", neighbors: ["Polk", "Clay", "Becker", "Mahnomen"], outOfState: [ 58000, 58299 ] }],
        ["x155", { county: "Olmsted", code: "155", neighbors: ["Goodhue", "Dodge", "Mower", "Fillmore", "Winona", "Wabasha"] }],
        ["x156", { county: "Otter Tail", code: "156", neighbors: ["Clay", "Wilkin", "Grant", "Douglas", "Todd", "Wadena", "Becker"] }],
        ["x157", { county: "Pennington", code: "157", neighbors: ["Marshall", "Polk", "Red Lake", "Clearwater", "Beltrami"] }],
        ["x158", { county: "Pine", code: "158", neighbors: ["Aitkin", "Kanabec", "Isanti", "Chisago", "Carlton"], outOfState: [ 54800, 54899 ] }],
        ["x159", { county: "Pipestone", code: "159", neighbors: ["Rock", "Nobles", "Murray", "Lyon", "Lincoln"], outOfState: [ 57000, 57099 ] }],
        ["x160", { county: "Polk", code: "160", neighbors: ["Marshall", "Norman", "Mahnomen", "Clearwater", "Pennington", "Red Lake"], outOfState: [ 58000, 58299 ] }],
        ["x161", { county: "Pope", code: "161", neighbors: ["Grant", "Stevens", "Swift", "Kandiyohi", "Stearns", "Todd", "Douglas"] }],
        ["x162", { county: "Ramsey", code: "162", neighbors: ["Washington", "Anoka", "Hennepin", "Dakota"] }],
        ["x163", { county: "Red Lake", code: "163", neighbors: ["Polk", "Pennington"] }],
        ["x164", { county: "Redwood", code: "164", neighbors: ["Yellow Medicine", "Lyon", "Murray", "Cottonwood", "Brown", "Renville"] }],
        ["x165", { county: "Renville", code: "165", neighbors: ["Chippewa", "Yellow Medicine", "Redwood", "Brown", "Nicollet", "Sibley", "McLeod", "Meeker", "Kandiyohi"] }],
        ["x166", { county: "Rice", code: "166", neighbors: ["Scott", "Le Sueur", "Waseca", "Steele", "Dodge", "Goodhue", "Dakota"] }],
        ["x167", { county: "Rock", code: "167", neighbors: ["Pipestone", "Murray", "Nobles"], outOfState: [ 51200, 57199 ] }],
        ["x168", { county: "Roseau", code: "168", neighbors: ["Kittson", "Marshall", "Beltrami", "Lake of the Woods"] }],
        ["x169", { county: "St. Louis", code: "169", neighbors: ["Lake", "Koochiching", "Itasca", "Aitkin", "Carlton"], outOfState: [ 54800, 54899 ] }],
        ["x170", { county: "Scott", code: "170", neighbors: ["Carver", "Sibley", "Le Sueur", "Rice", "Dakota", "Hennepin"] }],
        ["x171", { county: "Sherburne", code: "171", neighbors: ["Stearns", "Wright", "Hennepin", "Anoka", "Isanti", "Mille Lacs", "Benton"] }],
        ["x172", { county: "Sibley", code: "172", neighbors: ["Renville", "Nicollet", "Le Sueur", "Scott", "Carver", "McLeod"] }],
        ["x173", { county: "Stearns", code: "173", neighbors: ["Douglas", "Pope", "Kandiyohi", "Meeker", "Wright", "Sherburne", "Benton", "Morrison", "Todd"] }],
        ["x174", { county: "Steele", code: "174", neighbors: ["Waseca", "Freeborn", "Mower", "Dodge", "Goodhue", "Rice"] }],
        ["x175", { county: "Stevens", code: "175", neighbors: ["Traverse", "Big Stone", "Swift", "Pope", "Douglas", "Grant"] }],
        ["x176", { county: "Swift", code: "176", neighbors: ["Stevens", "Big Stone", "Lac Qui Parle", "Chippewa", "Kandiyohi", "Pope"] }],
        ["x177", { county: "Todd", code: "177", neighbors: ["Otter Tail", "Douglas", "Pope", "Stearns", "Morrison", "Cass", "Wadena"] }],
        ["x178", { county: "Traverse", code: "178", neighbors: ["Big Stone", "Stevens", "Grant", "Wilkin"], outOfState: [ 57200, 58099 ] }],
        ["x179", { county: "Wabasha", code: "179", neighbors: ["Goodhue", "Olmsted", "Winona"], outOfState: [ 54000, 54799 ] }],
        ["x180", { county: "Wadena", code: "180", neighbors: ["Becker", "Otter Tail", "Todd", "Cass", "Hubbard"] }],
        ["x181", { county: "Waseca", code: "181", neighbors: ["Blue Earth", "Faribault", "Freeborn", "Steele", "Rice", "Le Sueur"] }],
        ["x182", { county: "Washington", code: "182", neighbors: ["Chisago", "Anoka", "Ramsey", "Dakota"], outOfState: [ 54000, 54799 ] }],
        ["x183", { county: "Watonwan", code: "183", neighbors: ["Brown", "Cottonwood", "Jackson", "Martin", "Blue Earth"] }],
        ["x184", { county: "Wilkin", code: "184", neighbors: ["Traverse", "Grant", "Otter Tail", "Clay"], outOfState: [ 57200, 58099 ] }],
        ["x185", { county: "Winona", code: "185", neighbors: ["Wabasha", "Olmsted", "Fillmore", "Houston"], outOfState: [ 54000, 54799 ] }],
        ["x186", { county: "Wright", code: "186", neighbors: ["Stearns", "Meeker", "McLeod", "Carver", "Hennepin", "Anoka", "Sherburne"] }],
        ["x187", { county: "Yellow Medicine", code: "187", neighbors: ["Lac Qui Parle", "Lincoln", "Lyon", "Redwood", "Renville", "Chippewa"], outOfState: [ 57000, 57299 ] }],
        ["x192", { county: "White Earth Nation", code: "192", neighbors: ["Polk", "Norman", "Becker", "Clearwater", "Mahnomen"] }],
        ["x194", { county: "Red Lake Nation", code: "194", neighbors: ["Roseau", "Marshall", "Pennington", "Clearwater", "Hubbard", "Cass", "Itasca", "Koochiching", "Lake of the Woods", "Beltrami"] }],
    ]).get(userXnumber?.slice(0, 4).toLowerCase());
//======================== Case_History Section_Start =================================
!function caseHistoryDatalist() {
    if (iFramed || !newTabField || !countyInfo.userSettings.caseHistory) { return };
    try {
        const caseHistory = localStorage.getItem('MECH2.caseHistoryLS') ? sanitize.JSON(localStorage.getItem('MECH2.caseHistoryLS')) : []
        if (pageTitle === pageTitle.toUpperCase() && thisPageNameHtm.indexOf('Provider') !== 0 && caseId && !editMode && localStorage.getItem('MECH2.note') === null) { addToCaseHistoryArray() }
        function addToCaseHistoryArray() {
            const caseName = nameFuncs.commaNameReorder(pageTitle), caseIdTest = (entry) => entry.caseIdNumber === caseId, foundDuplicate = caseHistory.findIndex(caseIdTest)
            if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
            let timestamp = dateFuncs.formatDate(new Date(), "mmddhm"), newEntry = { caseIdNumber: caseId, caseName: caseName, time: timestamp };
            while (caseHistory.length > 9) { caseHistory.pop() }
            caseHistory.unshift(newEntry)
            localStorage.setItem('MECH2.caseHistoryLS', JSON.stringify(caseHistory));
        };
        let viewHistory = sanitize.JSON(localStorage.getItem('MECH2.caseHistoryLS'))
        let viewHistoryDatalist = '<datalist id="caseHistory" style="display: block;" class="hidden">'
        + viewHistory.map(item => '<div class="caseHistoryEntry" id="' + parseInt(item.caseIdNumber) + '"><span>' + sanitize.timeStamp(item.time) + '</span><span>' + sanitize.string(item.caseName) + '</span><span>' + parseInt(item.caseIdNumber) + '</span></div>').join('')
        + '</datalist>'
        newTabField.insertAdjacentHTML('afterend', viewHistoryDatalist)
        let history = document.getElementById('caseHistory'), historyList = [...history.children]
        newTabField.addEventListener('focus', focusEvent => {
            filterHistory(focusEvent.target.value, undefined)
            document.addEventListener('click', hideHistoryClick)
            // newTabField.addEventListener('keydown', hideHistoryEscape)
        })
        newTabField.addEventListener('input', inputEvent => { filterHistory(inputEvent.target.value, inputEvent.inputType) });
        history.addEventListener('click', clickEvent => {
            if ( !["SPAN", "DIV"].includes(clickEvent.target.nodeName) ) { return }
            unhideElement(history, false)
            newTabField.value = clickEvent.target.closest('div.caseHistoryEntry').id
            newTabField.select()
        });
        function filterHistory(inputValue, inputType) {
            if (!inputValue) {
                unhideElement(historyList, true)
                if (inputType && inputType === 'deleteByCut') {
                    unhideElement(history, false);
                    newTabField.blur();
                    return;
                }
                unhideElement(history, true)
                return
            }
            let inputMatch = historyList.filter( ele => ele.id.includes(inputValue) )
            if (inputMatch.length) {
                unhideElement(history, true)
                historyList.forEach(ele => inputMatch.includes(ele) ? unhideElement(ele, true) : unhideElement(ele, false) )
            } else { unhideElement(history, false) }
        }
        function hideHistoryClick(clickEvent) {
            if ( clickEvent.target.closest('#newTabInputDiv') ) { return };
            hideHistory()
        }
        // function hideHistoryEscape(keydownEvent) {
        //     // conflicts with newTabFieldButtons() - no prop;
        //     if (keydownEvent.key !== "Escape") { return };
        //     hideHistory()
        // }
        function hideHistory() {
            unhideElement(history, false)
            document.removeEventListener('click', hideHistoryClick)
            // newTabField.removeEventListener('click', hideHistoryEscape)
        }
    }
    catch (err) { console.trace(err) }
}(); //======================== Case_History Section_End ===================================//
//======================== Actual_Date Section_Start =================================
const actualDate = {
    dateField: document.getElementById('actualDate') ?? document.querySelector('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate, #applicationReceivedDate, #bSfEffectiveDate') ?? document.getElementById('effectiveDate') ?? undefined,
    invalidDateWarning: '<span id="actualDateTooltip" class="tooltips" style="height: 1lh;"><span class="tooltips-text tooltips-bottomleft narrow" style="visibility: visible; opacity: 1;">Warning: Date not valid.</span></span>',
    notInBWPwarning: '<span id="actualDateTooltip" class="tooltips" style="height: 1lh;"><span class="tooltips-text tooltips-bottomleft narrow" style="visibility: visible; opacity: 1;">Warning: Date not in the current period.</span></span>',
    actualDateNeedsFilling: (this.dateField && this.dateField.disabled === false && !this._actualDateMatch()) ? true : false,
    _actualDateMatch() {
        if (!this.dateField) { return undefined };
        let actualDateParsed = sanitize.JSON( sessionStorage.getItem('actualDateSS') )
        if (!actualDateParsed) { return undefined };
        let { adCaseNum, adDate } = actualDateParsed
        if (![caseId, "noCaseNumberYet"].includes(adCaseNum) ) { return false };
        if (adCaseNum === "noCaseNumberYet" && caseId) {//change undefined to caseId
            this._setActualDate({ adCaseNum: caseId, adDate: adDate, })
            return { adCaseNum: caseId, adDate: adDate, }
        }
        return actualDateParsed
    },
    _inCurrentBWP( compareDate = Date.now() ) {
        compareDate = sanitize.date(compareDate, "number")
        if (isNaN(compareDate)) { return false }
        if ( inRange( compareDate, sanitize.date(selectPeriodDates.start, "number"), sanitize.date(selectPeriodDates.end, "number") ) ) { return dateFuncs.formatDate(compareDate, "mmddyyyy") }
        else { return false }
    },
    _setActualDate({ adCaseNum: adSetCaseNum, adDate: adSetDate, } = {}) {
        sessionStorage.setItem('actualDateSS', '{"adCaseNum":"' + adSetCaseNum + '", "adDate":"' + adSetDate + '"}' )
        sessionStorage.setItem('actualDateSSChange', ['pageName: ' + thisPageName, 'caseNumber: ' + adSetCaseNum, 'dateField: ' + this.dateField.id, 'changeTime: ' + dateFuncs.formatDate(new Date(), "mmddhm")].join(', ') )
    },
    _actualDateMatches({ adDate: adMatchedDate, adCaseNum: adMatchedCaseNum } = {}) {
        let wrapUp = document.getElementById('wrapUp'), quit = document.getElementById('quit')
        if (wrapUp && !editMode && wrapUp.disabled) { window.addEventListener( "beforeunload", () => { clearStorageItems('session'); return; }) }
        if (editMode && quit) { quit.addEventListener('click', () => { clearStorageItems('session'); return; }) }
        if (submitButton?.id === "caseInputSubmit") { // field for user to manually edit Actual Date;
            submitButton.insertAdjacentHTML('afterend', '<div class="float-right-imp" style="display: flex; align-items: center;"><label>Actual Date: </label><input id="userInputActualDate" class="form-control" style="width: var(--dateInput);"></input></div>')
            let userInputActualDate = document.getElementById('userInputActualDate')
            userInputActualDate.addEventListener( 'click', () => document.getElementById('actualDateTooltip')?.remove() )
            userInputActualDate.value = adMatchedDate
            userInputActualDate.addEventListener('blur', blurEvent => {
                let userActualDateValue = blurEvent.target.value
                if (!userActualDateValue) { sessionStorage.removeItem('actualDateSS'); return; }
                let userActualDateValueNumber = sanitize.date(userActualDateValue, "number")
                if (isNaN(userActualDateValueNumber)) { userInputActualDate.classList.add('red-outline'); userInputActualDate.insertAdjacentHTML('afterend', this.invalidDateWarning); return; }
                let dateInCurrentPeriod = this._inCurrentBWP(userActualDateValueNumber)
                if (dateInCurrentPeriod) {
                    userInputActualDate.classList.remove('red-outline')
                    this._setActualDate({adMatchedCaseNum: caseId, adDate: dateInCurrentPeriod, adField: this.dateField.id})
                } else { userInputActualDate.classList.add('red-outline'); userInputActualDate.insertAdjacentHTML('afterend', this.notInBWPwarning); }
            })
        }
        if (!editMode || !this.dateField) { return }
        if (!this.dateField.value) { this.dateField.value = adMatchedDate } // Actual date field being filled;
        else if ( "CaseAddress.htm".includes(thisPageNameHtm) && document.getElementById('edit').disabled ) {
            this.dateField.parentElement.insertAdjacentHTML('afterend', '<button type="button" id="useActualDate" style="margin-left: 20px;" class="cButton sidePadding">Use: ' + adMatchedDate + '</button>')
            document.getElementById('useActualDate').addEventListener('click', () => { this.dateField.value = adMatchedDate; eleFocus(save) })
        }
    },
    _dateStorage() {
        let actualDateMatch = this._actualDateMatch()
        if (actualDateMatch && typeof actualDateMatch === "object") { this._actualDateMatches(actualDateMatch) }
        if ( actualDateMatch || !editMode || !this.dateField || this.dateField?.disabled || this.dateField.value ) { return }
        if ( !"CaseApplicationInitiation.htm".includes(thisPageNameHtm) ) {
            let inCurrentPeriod = this._inCurrentBWP()
            if (inCurrentPeriod) { this.dateField.value = inCurrentPeriod }
        }
        save?.addEventListener('click', () => {
            if (this.dateField.value.length !== 10) { return }
            let adCaseId = caseId ?? "noCaseNumberYet"
            this._setActualDate({ adCaseNum: adCaseId, adDate: this.dateField.value })
        })
    },
}; //======================== Actual_Date Section_End =================================
if (!iFramed && ( caseId || "CaseApplicationInitiation.htm".includes(thisPageNameHtm) ) && countyInfo.userSettings.actualDateStorage) { actualDate._dateStorage() };
//======================== Actual_Date Section_End =================================
// ======================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
!function pageSpecificChanges() {
try {
!function _CaseList_Pages() {
if (thisPageNameHtm.indexOf("CaseList") === -1) { return };
!function __ActiveCaseList() {
    if (!("ActiveCaseList.htm").includes(thisPageNameHtm) || !document.querySelector('#activeCaseTable > tbody > tr:nth-child(2)')) { return }
    mec2functionFeatures.push(
        { title: "Case queries", desc:
         "Queries cases based on selection."
         + "<br>Homeless: Checks for if the case is or was homeless, and the dates thereof. For reporting purposes."
         + "<br>Redet/Suspend: Checks suspended cases that have an upcoming redetermination. If the case will likely be suspended for 1 year, adds a button to delay redetermination so the case closes prior to the redetermination being mailed."
         + "<br>Subprogram: Checks all cases to ensure the CCAP subprogram is correct."
         + "<br>Residence: Fetches the city of residence for all cases."
         + "<br>Job Search Hours: Checks all cases for the job search activity, and fetches the weekly job search hours listed."
         + "<br>Self-Employment: Checks all cases for the self-employment activity."
         + "<br>Check Reporter Type: Fetches the reporter type for Active status cases."
         , selector: "#afterResults" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "#resultHeaderMsg" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
    )
    !function caseListTypeCount() {
        let caseLength = { reinstatedCases: 0, activeCases: 0, suspendedCases: 0, tempIneligCases: 0 }
        document.querySelectorAll('tbody > tr > td:nth-child(3)').forEach(ele => {
            switch (ele.textContent) {
                case "Active": { caseLength.activeCases++; break; }
                case "Suspended": { caseLength.suspendedCases++; break; }
                case "Reinstated": { caseLength.reinstatedCases++; break; }
                case "Temporarily Ineligible": { caseLength.tempIneligCases++; break; }
            }
        })
        document.querySelector('h5').insertAdjacentHTML( 'beforeend', " " + [caseLength.activeCases, "active,", caseLength.suspendedCases, "suspended,", caseLength.tempIneligCases, "temp inelig. "].join(" ") + (caseLength.reinstatedCases ? caseLength.reinstatedCases + " reinstated but not approved." : "") )
        document.getElementById('resultHeaderMsg').addEventListener('click', () => {
            let copyText = [caseLength.activeCases, caseLength.suspendedCases, caseLength.tempIneligCases].join('\n')
            copy(copyText, copyText, 'Copied!', )
        })
    }();
    // query idea: CaseEditSummary, inhibiting errors. Object.case#.0.editType ("Warning Error", "Inhibiting Error"), .currentPeriod/.selectPeriod/.selectPeriodSelected (all have the same BWP)
    let aclTbody = document.querySelector('tbody'), caseResultsData = document.getElementById('caseResultsData'), footer_links = document.getElementById('footer_links')
    if (!caseResultsData) { return };
    let caseListSelectOptionsArray = ["Homeless", "Redet/Suspend", "Subprogram", "Residence", "Job Search Hours", "Self-Employment", "Check Reporter Type"]
    let caseListSelect = "<select class='form-control' style='width: fit-content;' id='caseListSelected'>" + caseListSelectOptionsHTML() + "</select>"
    let afterResults = '<div id="afterResults" style="display: inline-flex; gap: 5px;"> ' + caseListSelect + ' <button type="button" id="getCaseDataPointButton" class="cButton" type="button">Get Selected Data</button><button type="button" id="exportLoadedData" class="cButton" type="button" disabled="disabled">Copy Excel Data</button></div>'
    caseResultsData.insertAdjacentHTML('afterend', afterResults)
    function caseListSelectOptionsHTML() {
        let caseListSelectOptions = "<option value></option>"
        for (let i = 0; i < caseListSelectOptionsArray.length; i++) {
            caseListSelectOptions += '<option value="' + caseListSelectOptionsArray[i] + '" id="' + caseListSelectOptionsArray[i] + '">' + caseListSelectOptionsArray[i] + '</option>'
        }
        return caseListSelectOptions
    }
    let caseListSelected = document.getElementById('caseListSelected')
    const caseListArray = listPageLinksAndList()
    // const caseListArraySlice = caseListArray.slice(20, 30)
    // const testArray = ["2618988", "1755426", "1774242"]
    let outputDataObj = {}
    async function checkResidence() {
        forAwaitMultiCaseEval(caseListArray, "CaseAddress").then(result => {
            for (let caseNum in result) {
                let residenceCity = nameFuncs.toTitleCase(result[caseNum][0][0].residenceCity)
                let mailingCity = result[caseNum][0][0].mailingCity?.length ? " / " + nameFuncs.toTitleCase(result[caseNum][0][0].mailingCity) : ''
                let tRowTd = document.getElementById(caseNum).children[3]
                tRowTd.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan tableAmend float-right-imp">(' + residenceCity + mailingCity + ')</span>')
            }
        })
    }
    async function checkReportingType() {
        const caseListArrayActive = Array.from([...document.querySelectorAll('#activeCaseTable > tbody > tr')].filter(ele => ele.children[2].innerText === "Active"), caseNumber => caseNumber.id)
        forAwaitMultiCaseEval(caseListArrayActive, "CaseChildProvider").then(result => {
            for (let caseNum in result) {
                reporterTypeLoop:
                for (let row in result[caseNum][0]) {
                    if (result[caseNum][0][row].reporterType === "Schedule Reporter") {
                        let targetTd = document.getElementById(caseNum).children[3]
                        let addedText = "Sched"
                        if (result[caseNum][0][row].reporterTypeSelectionArray.includes('LNL Provider Used')) { addedText += ", LNL" }
                        else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Employee - DHS Licensed Child Care Cntr')) { addedText += ", Emp" }
                        else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Multiple Providers Per Child')) { addedText += ", 2+" }
                        targetTd.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan tableAmend red-text float-right-imp" style="font-stretch: condensed;">' + addedText + '</span>')
                        break reporterTypeLoop
                    }
                }
            }
        })
    }
    async function checkSupportActivityJS() {
        forAwaitMultiCaseEval(caseListArray, "CaseSupportActivity").then(result => { //result[caseNum].0.0.originalHoursPerWeek //object.table.row.data
            for (let caseNum in result) {
                for (let row in result[caseNum][0]) {
                    let jobSearchHours = Number(result[caseNum][0][row].originalHoursPerWeek)
                    if (jobSearchHours > 0) {
                        let targetTd = document.getElementById(caseNum).children[3]
                        // let targetTd = document.getElementById(caseNum).querySelector('td:nth-child(4)')
                        if (targetTd.children?.length === 1) {
                            targetTd.insertAdjacentHTML('beforeend', '<span class="tableAmend float-right-imp">JS:</span>')
                        }
                        let activeButOneHour = (document.getElementById(caseNum).children[2].textContent.indexOf('Active') > -1 && jobSearchHours < 10) ? " font-weight: bold; color: var(--textColorNegative);" : ""
                        let output = "<span class='ACLaddedSpan' style='margin-left: 5px;" + activeButOneHour + "'>M" + result[caseNum][0][row].memberReferenceNumber + ": " + jobSearchHours + "</span>"
                        targetTd.insertAdjacentHTML('beforeend', output)
                    }
                }
            }
        })
    }
    async function checkSelfEmployment() {
        forAwaitMultiCaseEval(caseListArray, "CaseEmploymentActivity").then(result => { //result[caseNum][0][0].employmentActivityDescription //objectGroup[object][table][row].data
            for (let caseNum in result) {
                selfEmployLoop:
                for (let row in result[caseNum][0]) {
                    let selfEmployActivity = result[caseNum][0][row].employmentActivityDescription
                    if (selfEmployActivity === "Self-employment") {
                        let targetTd = document.getElementById(caseNum).children[3]
                        let output = "<span class='ACLaddedSpan float-right-imp'>Has self-employment</span>"
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
        forAwaitMultiCaseEval(caseListArray, "CaseOverview").then(result => {
            const filteredResult = {}
            for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] }
            for (let caseNum in filteredResult) {
                for (let program in filteredResult[caseNum]) {
                    if (filteredResult[caseNum][program].programNameHistory === "MFIP") {
                        let mfipDate = filteredResult[caseNum][program].programBeginDateHistory
                        let mfipDateDiff = dateFuncs.dateDiffInDays(mfipDate)
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
    async function redetDateVsSuspendDate() {
        let today = Date.now()
        aclTbody.addEventListener('click', clickEvent => { if ( clickEvent.target.classList.contains("cSpan") ) { redetTbodyEvent(clickEvent.target) } })
        let suspendedTrs = [...document.querySelectorAll('tr.suspended')]
        const suspendedCaseListArray = suspendedTrs.map(ele => {
            // let trSuspendedChildren = ele.children
            // let tdSuspendedDate = ele.children[4]
            // let tdSuspendedSpan = ele.children[3]
            let [ ,,, tdSuspendedSpan, tdSuspendedDate] = ele.children
            tdSuspendedSpan.insertAdjacentHTML('beforeend', '<span class="ACLaddedSpan float-right-imp tableAmend"></span>')
            tdSuspendedDate.classList.add('suspendedDate')
            let redetDateNumber = sanitize.date(tdSuspendedDate.textContent, "number")
            let dateDiff = (redetDateNumber - today) / dateFuncs.dayInMs
            if (redetDateNumber <= today) { tdSuspendedSpan.children[0].textContent = "Closing" }
            else if (dateDiff < 46) { tdSuspendedSpan.children[0].textContent = "Mailed" }
            else if (dateDiff > 180) { tdSuspendedSpan.children[0].textContent = "Redet 6+ months out" }
            else { return ele.children[0].textContent }
        })
        forAwaitMultiCaseEval(suspendedCaseListArray, "CaseOverview").then(result => {
            for (let caseNum in result) {
                let tRow = document.getElementById(caseNum), tRowTdSpan = tRow.children[3].children[0]
                let redetDateNumber = sanitize.date(tRow.children[4].textContent, "number")
                let caseStatus = result[caseNum][0][0].programStatusHistory, suspendDate = getOneYearSuspended(caseStatus)
                if (!suspendDate) { tRowTdSpan.textContent = "Status Issue"; continue }
                let suspendDateNumber = sanitize.date(suspendDate, "number"), suspendDatePlus = dateFuncs.formatDate( dateFuncs.addDays( suspendDateNumber, 416) , "mmddyyyy" )
                let suspendToRedetDiff = Math.floor( (redetDateNumber - suspendDateNumber) / dateFuncs.dayInMs )
                if (suspendToRedetDiff < 335) { tRowTdSpan.textContent = "Suspended " + suspendDate; continue }
                if (inRange(suspendToRedetDiff, 334, 415)) {
                    tRowTdSpan.classList.add('cSpan')
                    tRowTdSpan.textContent = "est. suspend " + suspendToRedetDiff + " days"
                    tRowTdSpan.title = 'Set new Redet date to ' + suspendDatePlus
                    tRowTdSpan.dataset.delayDate = suspendDatePlus
                    continue
                }
                if (suspendToRedetDiff > 415) { tRowTdSpan.textContent = "Closes before Redet"; continue }
            }
            function getOneYearSuspended(currentStatus) {
                try { return currentStatus.programStatusHistory === "Suspend" ? currentStatus.programBeginDateHistory : undefined }
                catch(err) { console.trace(err) }
            }
        })
        async function redetTbodyEvent(eventSpan) {
            footer_links.insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="height: 400px;"><iframe id="redetiframe" name="redetiframe" style="width: 100%; height: 100%;"></iframe></div>')
            let redetiframe = document.getElementById('redetiframe'), iframeContainer = document.getElementById('iframeContainer')
            let eventCaseId = eventSpan.parentElement.parentElement.id, delayDateObj = JSON.stringify({ id: eventCaseId, delayDate: eventSpan.dataset.delayDate })
            sessionStorage.setItem('MECH2.suspendPlus45', delayDateObj)
            delayRedetDate(eventSpan, eventCaseId, redetiframe).then(eventSpan => {
                window.onstorage = null
                iframeContainer.remove()
                eventSpan.classList.remove('cSpan')
                thankYouForWaiting()
            })
        }
        async function delayRedetDate(eventSpan, tRowId, redetiframe) {
            return new Promise(resolve => {
                pleaseWait("Please wait...")
                window.onstorage = (storageEvent) => {
                    if (storageEvent.key === 'MECH2.suspendPlus45') {
                        if (storageEvent.newValue === "finished") { resolve(eventSpan) }
                        if (storageEvent.newValue === "Case Locked") { eventSpan.textContent = storageEvent.newValue; resolve(eventSpan) }
                    }
                }
                redetiframe.src = "/ChildCare/CaseRedetermination.htm?parm2=" + tRowId
            })
        }
    }
    async function isHomelessStart() {
        forAwaitMultiCaseEval(caseListArray, "CaseOverview").then(result => {
            // forAwaitMultiCaseEval(testArray, "CaseOverview").then(result => {
            const filteredResult = {}
            for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] } // evalTable 1
            const homelessResults = { No: [], Yes: [] }
            for (let caseNum in filteredResult) {
                let singleResult = isHomelessCheck(filteredResult[caseNum], caseNum)
                (typeof singleResult !== "object") || singleResult[1] === "No" ? homelessResults.No.push(singleResult) : homelessResults.Yes.push(singleResult)
                }
            let caseListSelectedValue = caseListSelected.value
            storeData(homelessResults)
            return // evalResults
        })
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
    }
    document.getElementById('getCaseDataPointButton').addEventListener('click', async () => {
        // aclTbody.removeEventListener('click', functionName)
        switch (caseListSelected.value) {
            case "Homeless": { await isHomelessStart(); break; }
            case "Redet/Suspend": { await redetDateVsSuspendDate(); break; }
            case "Subprogram": { await checkSubprogram(); break; }
            case "Residence": { await checkResidence(); break; }
            case "Job Search Hours": { await checkSupportActivityJS(); break; }
            case "Self-Employment": { await checkSelfEmployment(); break; }
            case "Check Reporter Type": { await checkReportingType(); break; }
                // case "ThingToLookUp": { await functionIjustMadeUp(); break; }
        }
    })
    function storeData(storeDataResults) {
        !([caseListSelected.value] in outputDataObj) && ( outputDataObj[caseListSelected.value] = {} )
        // !Object.hasOwn(outputDataObj, [caseListSelected.value]) && (outputDataObj[caseListSelected.value] = {})
        outputDataObj[caseListSelected.value][document.getElementById('activeCaseSearchWorkerId').value] = storeDataResults
        sessionStorage.setItem("outputDataObjSS", JSON.stringify(outputDataObj))
        document.getElementById('exportLoadedData').disabled = false
    }
    function excelifyData(evalDataToExcelify) {
        let excelData = JSON.stringify(evalDataToExcelify)
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
    caseListSelected.addEventListener('change', changeEvent => {
        let outputImport = sanitize.JSON(sessionStorage.getItem("outputDataObjSS"))
        outputDataObj = outputImport ?? {}
        // Object.hasOwn(outputDataObj, [e.target.value]) ? document.getElementById('exportLoadedData').disabled = false : document.getElementById('exportLoadedData').disabled = true
        document.getElementById('exportLoadedData').disabled = ([changeEvent.target.value] in outputDataObj) ? false : true
    })
    document.getElementById('exportLoadedData').addEventListener('click', () => { copy(excelifyData(outputDataObj), "Excel Data", "notitle") })
}(); // SECTION_END Active_Case_List;
!function __InactiveCaseList() {
    if (!("InactiveCaseList.htm").includes(thisPageNameHtm) || !document.querySelector('#inActiveCaseTable > tbody > tr:nth-child(2)')) { return };
    listPageLinksAndList()
    let closedCaseLS = countyInfo.info.closedCaseBank ?? ''
    let closedCaseBank = (/[a-z0-9]{7}/i).test(closedCaseLS) ? closedCaseLS : ''
    // let validTransferWorker = (/[a-z0-9]{7}/i).test(closedCaseBank)
    let closedCaseBankLastThree = (closedCaseBank) ? closedCaseBank.slice(4) : ''
    let todayDate = Date.now()
    let changedToLinks, iframeContainer, transferiframe
    let transferWorker = document.getElementById('transferWorker'), footer_links = document.getElementById('footer_links')
    document.querySelectorAll('#inActiveCaseTable > tbody > tr > td:nth-of-type(4)').forEach(thisTd => {
        let closedDatePlus46 = dateFuncs.addDays(thisTd.textContent, 46);
        if (closedDatePlus46 < todayDate) {
            let closedDate = thisTd.textContent
            thisTd.textContent = ''
            thisTd.insertAdjacentHTML('beforeend', '<a href="CaseTransfer.htm?parm2=' + thisTd.parentElement.firstChild.textContent + '", target="_blank">' + closedDate + '</a>')
            thisTd.parentElement.classList.add('oldClosed')
            if (closedCaseBank) { thisTd.insertAdjacentHTML('beforeend', '<span class="cSpan">→ ' + closedCaseBankLastThree + '</span>') }
        };
    })
    document.getElementById('workerSearch').parentElement.parentElement.insertAdjacentHTML('beforeend',
    `<div style="vertical-align: middle;" class="float-right-imp">
        <button type="button" class="cButton" tabindex="-1" id="closedTransferAll">Transfer closed \>45 days to:</button>
        <input type="text" class="form-control" style="display: inline-block; margin-left: 10px; width: var(--eightNumbers)" id="transferWorker" placeholder="Worker #" value=${closedCaseBank}></input>
    </div>`
    )
    function addTableButtons() {
        document.querySelectorAll('span.cSpan').forEach(cSpanEle => cSpanEle.remove() )
        if ((/[a-z0-9]{7}/i).test(closedCaseBank)) {
            document.querySelectorAll('tr.oldClosed > td:nth-child(4)').forEach(ele => ele.insertAdjacentHTML('beforeend', '<span class="cSpan">→ ' + closedCaseBankLastThree + '</span>'))
        }
    }
    function removeTableButtons() {
        document.querySelectorAll('span.cSpan').forEach( cSpanEle => cSpanEle.remove() )
    }
    transferWorker?.addEventListener('blur', blurEvent => checkClosedCaseBank(blurEvent.target.value))
    function checkClosedCaseBank(eventValue) {
        if ((/[a-z0-9]{7}/i).test(eventValue)) {
            if (eventValue !== countyInfo.info.closedCaseBank) {
                countyInfo.updateCountyInfoLS('closedCaseBank', eventValue)
                closedCaseBank = eventValue
                closedCaseBankLastThree = closedCaseBank.slice(4)
                addTableButtons()
            }
        } else {
            closedCaseBank = ''
            closedCaseBankLastThree = ''
            countyInfo.updateCountyInfoLS('closedCaseBank', "delete")
            transferWorker.value = ''
            removeTableButtons()
            flashRedBorder.animate(transferWorker)
        }
    }
    document.getElementById('inActiveCaseTable').addEventListener('click', clickEvent => {
        if (clickEvent.target.nodeName === "SPAN") {
            let closestSpanASibling = clickEvent.target.previousElementSibling
            if (checkForClosedCaseBank() && closestSpanASibling?.nodeName === 'A') {
                transferSingleClosed(clickEvent.target.parentElement.id)
            }
        }
    })
    async function transferSingleClosed(tRowId) {
        pleaseWait("Please wait...")
        await createIframe()
        await caseTransferEvent(tRowId)
            .catch(error => { console.trace(error) })
            .finally(() => {
                iframeContainer.remove()
                thankYouForWaiting()
            })
    }
    async function transferMultiClosed(tRowIdArray) {
        pleaseWait("Please wait...", 1)
        let progressReport = document.getElementById('progressReport')
        let progressBar = document.getElementById('progressBar')
        await createIframe()
        return new Promise(async (resolve, reject) => {
            let tRowIdArraylength = tRowIdArray.length
            for await (let [index, caseNumberTransfer] of tRowIdArray.entries()) {
                if (closedCaseBank) {
                    progressReport.textContent = "Please wait... " + (Number(index)+1) + " of " + tRowIdArraylength
                    progressBar.value = index/tRowIdArraylength
                    await caseTransferEvent(caseNumberTransfer)
                        .catch(error => { console.trace(error) })
                }
            }
            iframeContainer.remove()
            thankYouForWaiting()
            resolve()
        })
    }
    async function createIframe() {
        return new Promise((resolve, reject) => {
            footer_links.insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="visibility: hidden;"><iframe id="transferiframe" name="transferiframe" style="width: 100%; height: 100%;"></iframe></div>')
            transferiframe = document.getElementById('transferiframe')
            iframeContainer = document.getElementById('iframeContainer')
            window.onmessage = (messageEvent) => {
                if (messageEvent.origin !== "https://mec2.childcare.dhs.state.mn.us") { reject() }
                if (messageEvent.data[1] === "pageLoaded") { resolve() }
            }
            window.open('/ChildCare/CaseTransfer.htm', 'transferiframe')
        });
    }
    async function caseTransferEvent(tRowId) {
        console.log(tRowId)
        return new Promise((resolve, reject) => {
            transferiframe.contentWindow.postMessage(['newTransfer', tRowId], "https://mec2.childcare.dhs.state.mn.us")
            let tRow = document.getElementById(tRowId)
            window.onmessage = (messageEvent) => {
                if (messageEvent.data[0] === "transferError") {
                    window.onmessage = null
                    let tRowButton = tRow.querySelector('span')
                    tRowButton.textContent = messageEvent.data[1]
                    tRowButton.style.pointerEvents = "none"
                    switch (messageEvent.data[1]) {/* eslint-disable no-fallthrough */
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
                    reject(messageEvent.data[1])
                }
                if (messageEvent.data[0] === "transferStatus" && messageEvent.data[1] === "Success") {
                    window.onmessage = null
                    tRow.style.opacity = '.35'
                    tRow.querySelector('span').remove()
                    tRow.classList.remove('oldClosed')
                    resolve()
                }
            }
        });
    }
    document.getElementById('closedTransferAll').addEventListener('click', async () => {
        const oldClosedArray = Array.from(document.querySelectorAll('.oldClosed'), caseNumber => caseNumber.id)
        if (checkForClosedCaseBank() && oldClosedArray?.length) { await transferMultiClosed(oldClosedArray) }
    })
    function checkForClosedCaseBank() {
        if (closedCaseBank) { return 1 }
        else { eleFocus(transferWorker); return 0 }
    }
}(); // SECTION_END Inactive_Case_List;
!function __PendingCaseList() {
    if (!("PendingCaseList.htm").includes(thisPageNameHtm)) { return };
    document.querySelectorAll('#pendingCaseTable > tbody > tr > td:nth-child(8)').forEach(ele => {
        if (ele.textContent === '') {
            let lastExtPendDate = dateFuncs.formatDate( dateFuncs.addDays(ele.previousSibling.textContent, 15), "mmddyyyy")
            ele.textContent = 'Plus 15 days: ' + lastExtPendDate
            ele.classList.add('plus15days')
        }
    })
}(); // SECTION_END Pending_Case_List;
}();
!function Alerts() { // (major sub-section) ==============================================================================================================================================;
    if (!"Alerts.htm".includes(thisPageNameHtm)) { return };
    mec2functionFeatures.push(
        { title: "Delete All", desc: "Deletes all alerts for a case. Undeleteable alerts will be 'deleted' but will show up again on reload.", selector: "#deleteAll" },
        { title: "Extra navigation buttons", desc: "Static and alert specific Case or Provider navigation buttons that open pages in new tabs.", selector: ".panel > #workerCreatedAlertActionsArea" },
        { title: "Automated Note", desc: "Opens the Notes page and enters a contextual note. The summary and/or message may have text replaced or added, such as checking for an address match for NCP address change.", selector: "#autonoteButton" },
        { title: "Reselect row when reloading", desc: "Reselects the alert row when reloading the page or returning from Worker Created Alert.", },
        { title: "Case subprogram check", desc: "For cases that have the 'Delay CCMF approval' worker alert, checks the Overview page for current MFIP status.<br>Button only appears when these alerts are present.", selector: "#doMfipCheck" },
    )
    let deleteButton = document.getElementById('delete'), createButton = document.getElementById('new')
    let inputEffectiveDate = document.getElementById('inputEffectiveDate')
    let caseOrProviderAlertsTableTbody = document.querySelector('#caseOrProviderAlertsTable > tbody')
    let caseOrProviderType = document.getElementById('caseOrProviderType'), caseOrProviderAlertTotal = document.getElementById('caseOrProviderAlertTotal')
    let alertTotal = document.getElementById('alertTotal'), alertTable = document.querySelector('#alertTable > tbody'), alertGroupId = document.getElementById("groupId"), alertMessage = document.getElementById("message"),
        alertRowIndx = document.getElementById('rowIndex'), inputWorkerId = document.getElementById('inputWorkerId'), workerName = document.getElementById('workerName')
    function findSelected() { return [...alertTable.children].find(ele => ele.classList.contains('selected')) }
    let selectedAlert, selectedCaseOrProvider = {} // set with click event
    addDateControls("month", "#inputEffectiveDate")
    !async function storeWorkerName() {
        if (document.referrer !== "https://mec2.childcare.dhs.state.mn.us/ChildCare/Welcome.htm") { return };
        await intervalCheckForValue({element: workerName, interval: 400, iterations: 3}).then(workerNameValue => { countyInfo.updateCountyInfoLS( 'userName', nameFuncs.LastFirstToFirstL(workerNameValue) ) })
    }();
    let storeNumberTask = [submitButton, createButton].forEach(ele => ele.addEventListener('click', () => {
        if (caseOrProviderAlertTotal.value > 0) { sessionStorage.setItem('MECH2.preWorkerAlertCase', JSON.stringify({ numberId: alertGroupId.value, worker: inputWorkerId.value }) )}
    }) )
    //alertsByCategories reduction code, untested.
    //minify code: .replace(/(?:\n {20})(\w)/g, " $1").replace(/(?:\n {16})(},\n)/g, " $1")
    //unminify code: .replace(/(?:{)( \w+: )g, "\n                   $1").replace(/(: {|",|\/,) (\w+: )/g, "$1\n                    $2").replace(/, },\n/g, ",\n                },")
    const alertsByCategories = { //sorted by either likelyhood of occurrence or match priority - priority names should start with "_";
        childsupport: {
            messages: {
                ncpAddress: { textIncludes: /Absent Parent of Child Ref #\d{2} has an address/, noteCategory: "NCP Information", noteSummary: [/(?:[A-Za-z\- ]+)(\#\d{2})(?:[a-z\- ]+)(.+?\d{5})(?:\d{0,4})\./, "ABPS of $1 address: $2"], textFetchData: ["CaseAddress:0.0.residenceFullAddress"], noteText: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseAddress"], },
                cpAddress: { textIncludes: /Parentally Responsible Individual Ref #\d{2} add/, noteCategory: "Household Change", noteSummary: [/(?:[A-Za-z- ]+)(?:\#\d{2})(?:[a-z- +]+)(.+)(\d{5})(?:\d{0,4})/i, "HH address per PRISM: $1$2"], omniPageButtons: ["CaseAddress"], },
                csInterface: { textIncludes: /Complete Child Support Interface win/, noteCategory: "Child Support Note", omniPageButtons: ["CaseCSIA"], },
                csCSES: { textIncludes: /CSES\: Parentage|CSES\: Residence Address|CSES\: Birthdate|CSES\: Employer\'s name for Absent Parent|CSES\: Child support amount|CSES\: Support payment frequency|Absent Parent of Child Ref #\d{2} has an SSN change to/, noteSummary: "CSES Messages", noteCategory: "Child Support Note", noteText: "doFunctionOnNotes", omniPageButtons: ["delete"], },
                csDeleteFocus: { textIncludes: /Absent Parent of Child Ref #\d{2} has a new empl|Amount of child support|Child support payment|Disbursed child care support|Paternity for Child Ref/, noteCategory: "Child Support Note", omniPageButtons: ["delete"], },
                nonCoopCS: { textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is not cooperating/, noteCategory: "Child Support Note", noteSummary: [/(?:[a-z- ]+)(\#\d{2})/i, "PRI$1"], omniPageButtons: ["CaseCSE"], },
                coopCS: { textIncludes: /Parentally Responsible Individual Ref (#\d{2}) is cooperating/, noteCategory: "Child Support Note", noteSummary: [/(?:[a-z- ]+)(\#\d{2})/i, "PRI$1"], omniPageButtons: ["CaseCSE"], },
                csCpNewEmployer: { textIncludes: /Child support reported new employer for Parentally Responsible Individual/, noteCategory: "Child Support Note", omniPageButtons: ["CaseEmploymentActivity"], },
                cpNameChange: { textIncludes: /Parentally Responsible Individual Ref #\d{2} reported a name change/, noteCategory: "Child Support Note", noteSummary: [/(?:[a-z- ]+)(\#\d{2})/i, "PRI$1"], intendedPerson: true, omniPageButtons: ["CaseMember"], },
                csRecordsDiffer: { textIncludes: /differs with child support records/, noteCategory: "Child Support Note", omniPageButtons: ["CaseMember", "CaseAddress"], },
                ncpNameChange: { textIncludes: /Absent Parent of Child Ref #\d{2} has a name change/, noteCategory: "Child Support Note", noteSummary: [/(?:[a-z-\# ]+)(\d{2})(?: has a name change to )([a-z\'\-\,\. ]+)(?:\.)/i, "ABPS of M$1 name change: $2"], omniPageButtons: ["CaseCSE"], },
                employerAddress: { textIncludes: /Complete Employer Address on the Earned Incom/, noteCategory: "Child Support Note", omniPageButtons: ["CaseEarnedIncome"], },
            },
        },
        eligibility: {
            messages: {
                unapprovedElig: { textIncludes: /Unapproved results have/, noteCategory: "Other", omniPageButtons: ["CaseEligibilityResultSelection"], },
                eligWarningInhib: { textIncludes: /Warning messages exist|Eligibility Results have/, noteCategory: "Other", omniPageButtons: ["CaseEditSummary"], },
                unpaidCopay: { textIncludes: /Failure to pay copayment/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4}) - (\d{2}\/\d{2}\/\d{2,4})/, "Unpaid copay for period $1 - $2"], omniPageButtons: ["FinancialBillingApproval"], noteText: "doFunctionOnNotes", },
                noProgramSwitch: { textIncludes: /The program switch is not/, noteCategory: "Other", omniPageButtons: ["CaseOverview", "CaseSupportActivity"], },
            },
        },
        information: {
            messages: {
                mailed: { textIncludes: /Redetermination form has been mailed/, noteCategory: "Redetermination", noteSummary: 'doFunction', omniPageButtons: ["autonoteButton"], },
                noRedet: { textIncludes: /Redetermination has not been received/, noteCategory: "Redetermination", noteSummary: "Closing %0: Redet not complete/received", summaryFetchData: ["CaseOverview:0.0.programBeginDateHistory"], omniPageButtons: ["autonoteButton"], },
                autoDenied: { textIncludes: /This case has been auto-denied/, noteCategory: "Application", noteSummary: "This case has been auto-denied", omniPageButtons: ["autonoteButton"], },
                terminatedSA: { textIncludes: /The system auto approved a terminated Service/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton"], },
                homelessApp: { textIncludes: /^Homeless/, noteCategory: "Application", omniPageButtons: ["autonoteButton"], },
                autoApprovedSA: { textIncludes: /The system auto approved a Service Auth/, noteSummary: "SA for age category change was auto-approved", noteCategory: "Provider Change", omniPageButtons: ["autonoteButton"], },
                xferStatusChanged: { textIncludes: /changed to In Progress/, noteCategory: "Other", omniPageButtons: ["delete"], },
                dualAccess: { textIncludes: /Dual access has been initiated/, noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
                closeSusp: { textIncludes: /allowed period of suspension expires/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Auto-closing: 1yr suspension expires on $1"], omniPageButtons: ["autonoteButton"], },
                closeTI: { textIncludes: /allowed period of temporary ineligibility expires/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Auto-closing: TI period expires on $1"], omniPageButtons: ["autonoteButton"], },
                caseTransferring: { textIncludes: /This case is transferring to your Servicing/, noteCategory: "Other", omniPageButtons: ["CaseAddress", "ServicingAgencyIncomingTransfers"], },
                caseTransferInProgress: { textIncludes: /The transfer status has been changed/, noteCategory: "Other", omniPageButtons: ["delete"], },
                caseTransferInProgress: { textIncludes: /A new Job Search Tracking window/, noteCategory: "Other", omniPageButtons: ["CasePageSummary"], },
                servicingEnd: { textIncludes: /The Servicing Ends date/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Servicing Ends date changed to $1"], omniPageButtons: ["autonoteButton"], },
            },
        },
        masschange: {
            messages: {
                autoCopayApproval: { textIncludes: /Case was auto-approved with a copay decrease/, noteSummary: [/[A-Z0-9\,\.\- ]+ (\$\d+) [A-Z0-9\,\.\- ]+/i, "Elig with copay decrease of $1+ auto-approved"], noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
            },
        },
        maxis: {
            messages: {
                gcReviewDate: { textIncludes: /Good Cause (?:Claim|Review) date/i, noteCategory: "Child Support Note", intendedPerson: true, noteSummary: [/(?:[a-z0-9 ]+)(\d{1,2}\/\d{1,2}\/\d{2,4}) to (Blank|\d{1,2}\/\d{1,2}\/\d{2,4})(?:[a-z0-9 ]+.)/i, "Good Cause review date: $1 to $2"], omniPageButtons: ["autonoteButton", "CaseCSE"], noteText: "doFunctionOnNotes", },
                genGoodCauseChanged: { textIncludes: /Good Cause/, noteCategory: "Child Support Note", intendedPerson: true, noteSummary: [/([a-z ]+)(?: for [a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseCSE"], noteText: "doFunctionOnNotes", },
                abpsChange: { textIncludes: /for Absent Parent/, noteCategory: "Child Support Note", noteSummary: [/([a-z ]+)(?: for Absent Parent [a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseCSE"], },
                schoolChanged: { textIncludes: /SCHL Panel|Ver has been changed on the School|Kindergarten|School Type|School Status|Last Grade Completed/, noteCategory: "Other", omniPageButtons: ["delete", "CaseSchool", "CaseEducationActivity"], },
                childRef: { textIncludes: /for Child Ref/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+)(?: for Child Ref # \d\d has[a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseMember"], },
                windowAddedRemoved: { textIncludes: /window [a-z0-9 ]+ been/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+ window)(?:[a-z0-9 ]+ been )([a-z ]+)(?: by.+)/i, "$1: $2"], omniPageButtons: ["autonoteButton", "CaseMember"], },
                changeReported: { textIncludes: /reported to MAXIS/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+ has been reported to MAXIS)(?:.*)/i, "$1"], omniPageButtons: ["autonoteButton", "CaseMember", "CaseUnearnedIncome"], },
                csCoop: { textIncludes: /from Not Cooperating to Cooperating/, noteCategory: "Child Support Note", intendedPerson: true, noteSummary: "MAXIS: CP is cooperating with CS", omniPageButtons: ["autonoteButton", "CaseCSE"], },
                csNonCoop: { textIncludes: /from Cooperating to Not Cooperating/, noteCategory: "Child Support Note", intendedPerson: true, noteSummary: "MAXIS: CP is not cooperating with CS", omniPageButtons: ["autonoteButton", "CaseCSE"], },
                marriage: { textIncludes: /Marriage Date|Marital status|Designated Spouse/, noteCategory: "Household Change", noteSummary: "Marriage alerts from MAXIS worker", noteText: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseMemberII"], },
                memberLeft: { textIncludes: /Member Left date/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/(?:[A-Za-z ]*)(?:X[A-Z0-9]{6})(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2,4})./, "REMO: personName left $1"], omniPageButtons: ["CaseRemoveMember", "CaseMember", "CaseCSE"], },
                memberJoined: { textIncludes: /Member window for Reference Number/, noteCategory: "Household Change", intendedPerson: true, noteSummary: 'doFunction', omniPageButtons: ["CaseNotes", "CaseMember"], },
                childRemoved: { textIncludes: /Child's Reference Number has been removed/, noteCategory: "Other", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseParent", "CaseRemoveMember"], },
                childCseRemoved: { textIncludes: /Child Ref Nbr \d{2} has been removed/, noteCategory: "Other", omniPageButtons: ["CaseCSE", "CaseRemoveMember"], },
                dateOfDeath: { textIncludes: /Date of Death/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseRemoveMember", "CaseMember"], },
                remoPanelAdded: { textIncludes: /Remo Panel has been added/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["CaseRemoveMember", "CaseMember", "CaseCSE"], },
                schoolPanelAdded: { textIncludes: /SCHL Panel|School Type/, noteCategory: "Other", omniPageButtons: ["CaseNotes", "CaseSchool", "CaseEducationActivity"], },
                livingSituation: { textIncludes: /Living Situation has been/, noteCategory: "Other", omniPageButtons: ["delete"], },
                disabilityStart: { textIncludes: /Disability start date/, noteCategory: "Other", intendedPerson: true, omniPageButtons: ["delete", "CaseDisability"], },
                residenceAddress: { textIncludes: /Residence Address has been/, noteCategory: "Household Change", noteSummary: "Residence address changed by MAXIS worker", textFetchData: ["CaseAddress:0.0.residenceFullAddress"], noteText: "doFunctionOnNotes", pageFilter: "", omniPageButtons: ["autonoteButton", "CaseAddress"], },
                mailingAddress: { textIncludes: /Mailing Address has been/, noteCategory: "Household Change", noteSummary: "Mailing address changed by MAXIS worker", textFetchData: ["CaseAddress:0.0.mailingStreet1", "CaseAddress:0.0.mailingStreet2", "CaseAddress:0.0.mailingCity", ], noteText: "doFunctionOnNotes", pageFilter: "", omniPageButtons: ["autonoteButton", "CaseAddress"], },
                // unemployment: { textIncludes: /Unemployment Insurance reported/, noteCategory: "Other", omniPageButtons: ["CaseUnearnedIncome"], },
                // reportedToMaxis: { textIncludes: /reported to MAXIS/, noteCategory: "Other", omniPageButtons: ["CaseNotes"], },
                // memberVerChanged: { textIncludes: /Verification has been changed on the Member window/, noteCategory: "Other", omniPageButtons: ["CaseMember",], },
                // memberIIVerChanged: { textIncludes: /has been changed on the Member II/, noteCategory: "Other", omniPageButtons: ["CaseMemberII",], },
                verSourceChanged: { textIncludes: /has been changed/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/(?:[a-z0-9 ]+ on the )([a-z]+)(?: window from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "Maxis: $1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseMember", "CaseMemberII", "CaseAddress", ], },
                // hasBeenChanged: { textIncludes: /has been changed/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+)(?: has[a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseMember", "CaseMemberII", "CaseAddress", ], },
                verSsnChanged: { textIncludes: /SSN has been changed|SSN Verification has been changed|Paternity for Child Ref|Last Grade Completed/, noteCategory: "Other", omniPageButtons: ["delete"], },
            },
        },
        parisinterstate: {
            messages: {
                parisMatch: { textIncludes: /PARIS/, noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
            },
        },
        periodicprocessing: {
            messages: {
                jsHours: { textIncludes: /Job Search Hours available will run out/, noteCategory: "Activity Change", noteSummary: [/(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})/, "Job search hours end $1"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseSupportActivity"], },
                missingKindergarten: { textIncludes: /Member missing Kindergarten/, noteCategory: "Other", omniPageButtons: ["CaseSchool"], },
                ageCategory: { textIncludes: /Member turned/, noteCategory: "Other", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseMember"], },
                tyExpires: { textIncludes: /The allowed time on Transition Year will expi/, noteCategory: "Other", noteSummary: [/(?:[a-z ]+)(\d{2}\/\d{2}\/\d{2,4})(?:[a-z\. ]+)/i, "Approved TY to BSF elig results eff $1"], pageFilter: "", omniPageButtons: ["FundingAvailability"], },
                extendedEligExpiring: { textIncludes: /activity extended eligibility/, noteCategory: "Activity Change", noteSummary: [/The (\w+)(?:[A-Za-z- ]+) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z-. ]+)/, "Ext Elig ($1) ends $2. Review elig"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseEmploymentActivity", "CaseSupportActivity"], },
                homelessExpiring: { textIncludes: /The Homeless 3 month period will expire/, noteCategory: "Application", noteSummary: [/(?:[A-Za-z0-9 ]*) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "Homeless period expires $1; case set to TI"], omniPageButtons: ["autonoteButton", "CaseAction"], },
                homelessMissing: { textIncludes: /Homeless case has one or more missing/, noteCategory: "Application", noteSummary: "Homeless case has missing verifications", omniPageButtons: ["autonoteButton"], },
                goodCauseReview: { textIncludes: /The Next Good Cause Review/, noteCategory: "Child Support Note", omniPageButtons: ["autonoteButton"], },
                disabilityExpires: { textIncludes: /The allowed disability period/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z ]*) (\d{2}\/\d{2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "The allowed disability period will end $1"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseDisability"], },
            },
        },
        provider: {
            messages: {
                parentAwareRatingStartEnd: { textIncludes: /Parent Aware/, noteCategory: "Provider Change", omniPageButtons: ["CaseServiceAuthorizationApproval"], },
                providerUnsafe: { textIncludes: /Provider has been deactivated for unsafe care./, noteCategory: "Provider Change", noteSummary: "Provider has been deactivated for unsafe care.", fetchData: ["CaseServiceAuthorizationOverview:1"], pageFilter: "Provider No Longer Eligible", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
                providerDeactivatedRenewal: { textIncludes: /Provider has been deactivated.  Renewal/, noteCategory: "Provider Change", noteSummary: "Provider deactivated. Renewal was not received.", fetchData: ["CaseServiceAuthorizationOverview:1"], pageFilter: "Provider No Longer Eligible", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
                providerRegistrationClosed: { textIncludes: /Provider's Registration Status is closed/, noteCategory: "Provider Change", noteSummary: "Provider's Registration Status is closed.", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
                providerRegistrationReactivated: { textIncludes: /Registration for Provider/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
                providerDeactivatedRegistration: { textIncludes: /Provider has been deactivated. Registration/, noteCategory: "Registration", noteSummary: "Provider deactivated. Reg. pended 30 days.", omniPageButtons: ["autonoteButton", "ProviderRegistrationAndRenewal"], },
                providerBackgroundStudy: { textIncludes: /Provider background study is due/, noteCategory: "Background Study", omniPageButtons: ["autonoteButton", "ProviderRegistrationAndRenewal"], },
            },
        },
        serviceauthorization: {
            messages: {
                unapprovedSA: { textIncludes: /Unapproved Service Authorization results/, noteCategory: "Provider Change", omniPageButtons: ["CaseServiceAuthorizationApproval", "CaseServiceAuthorizationOverview"], },
            },
        },
        workercreated: {
            messages: {
                approveMFIPclosing: { textIncludes: /Approve new results/, noteCategory: "Other", noteSummary: "Approved CCMF to TY switch", omniPageButtons: ["CaseCreateEligibilityResults"], },
            },
        },
    }
    function whatAlertType(caseOrProviderTypeValue) {
        switch (caseOrProviderTypeValue) {
            case "Case": return { page: "CaseNotes.htm", type: "Case", numberId: 'caseNumber', numberId: document.getElementById('caseNumber').value, parameters: getListAndAlertTableParameters.case() };
            case "Provider": return { page: "ProviderNotes.htm", type: "Provider", numberId: 'providerId', numberId: document.getElementById('providerId').value, parameters: getListAndAlertTableParameters.provider() };
        }
    }
    evalData().then(( { 0: tableOneAlerts, 1: tableTwoAlerts } = {} ) => {
        if (!tableOneAlerts) { return }
        caseOrProviderAlertsTableTbody.addEventListener( 'click', clickEvent => {
            // console.log(clickEvent.target) // goes off like 4 times when the page loads!
            // if (clickEvent.clientX < 1) { console.log("not clicked by human") }
            let tableRow = getTableRow(clickEvent.target)
            if (!tableRow) { return }
            fBaseCategoryButtons()
            selectedCaseOrProvider.idTd = tableRow.children[2]
            selectedCaseOrProvider.caseId = selectedCaseOrProvider.idTd?.innerText
        })
        alertTable.addEventListener('click', clickEvent => {
            if ( !['TR', 'TD', 'A'].includes(clickEvent.target.nodeName) ) { return };
            identifyAlertAndDoOmnibuttons( getTableRow(clickEvent.target) )
        })
        waitForElmHeight("#caseOrProviderAlertsTable > tbody > tr").then(() => {
            if (caseOrProviderAlertsTableTbody.children[0].textContent === "No records found" && alertTotal.value > 0) { doClick(submitButton); return; }; // reloads the page if it incorrectly shows 0 alerts;
            let caseOrProviderAlertsTableTbodyChildren = caseOrProviderAlertsTableTbody.children
            !function checkForDelayMfipAlerts() {
                const checkCashArray = []
                const cashAlertResults = {}
                if (typeof tableTwoAlerts !== "object") { return }
                tableTwoAlerts.forEach(item => {
                    if (item.message.indexOf("Approve new") === 0) {
                        let thisRow = caseOrProviderAlertsTableTbody.children[item.rowIndex]
                        if (checkCashArray.includes(thisRow.id)) { return }
                        thisRow.classList.add('checkCash')
                        thisRow.id = thisRow.children[2].innerText
                        checkCashArray.push(thisRow.id)
                        cashAlertResults[thisRow.id] = { rowIndex: item.rowIndex }
                    }
                })
                if (!checkCashArray.length) { return }
                alertDetailRow.insertAdjacentHTML('beforeend', '<button type="button" id="doMfipCheck" class="cButton" tabindex="-1">Check MFIP Alerts</button>')
                document.getElementById('doMfipCheck').addEventListener( 'click', () => checkMfipResults(checkCashArray) )
                function checkMfipResults(checkMFIPArray) {
                    forAwaitMultiCaseEval(checkMFIPArray, "CaseOverview").then(multiCaseResult => {
                        for (let [thisCase, thisCaseData] of multiCaseResult) {
                            let programTable = thisCaseData[0]
                            for (let row in programTable) {
                                if ( ["MFIP", "DWP"].includes(programTable[row].programNameHistory) ) {
                                    let mfipStatus = programTable[row].programNameHistory + ': ' + programTable[row].programStatusHistory
                                    let ccapStatus = ' | CCAP: ' + programTable[0].programNameHistory
                                    let inactiveDate = programTable[row].programStatusHistory === "Inactive" ? ' ' + programTable[row].programBeginDateHistory.replace(/20(\d\d)/, '$1').replace(/0(\d)/g, '$1') : ''
                                    cashAlertResults[thisCase] = { ...cashAlertResults[thisCase], mfipStatus, inactiveDate, ccapStatus }
                                    break
                                }
                            }
                        }
                        placeMfipResults()
                        const replaceMfipResults = new TrackedMutationObserver(mutations => {
                            if (deleteButton.value === "Delete Alert" && !document.querySelector('.tableSpan')) { placeMfipResults() }
                        })
                        replaceMfipResults.observe(deleteButton, { attributes: true })
                    })
                    function placeMfipResults() {
                        for (let caseNum in cashAlertResults) {
                            let thisCaseObj = cashAlertResults[caseNum]
                            caseOrProviderAlertsTableTbodyChildren[thisCaseObj.rowIndex].children[1].insertAdjacentHTML('beforeend', '<span class="tableSpan">' + thisCaseObj.mfipStatus + thisCaseObj.inactiveDate + thisCaseObj.ccapStatus +'</span>')
                        }
                    }
                }
            }();
            !function preWorkerAlertClick() {
                setTimeout(() => {
                    let preWorkerAlertCaseSS = sanitize.JSON(sessionStorage.getItem('MECH2.preWorkerAlertCase'))
                    let matchedCaseOrProvIdRow = (preWorkerAlertCaseSS && typeof preWorkerAlertCaseSS === "object" && preWorkerAlertCaseSS.worker === inputWorkerId.value) ? tableOneAlerts.find(item => item.caseNumberOrProviderId.indexOf(preWorkerAlertCaseSS.numberId) > 0)?.rowIndex : 0
                    let selectedCase = caseOrProviderAlertsTableTbodyChildren[matchedCaseOrProvIdRow]
                    selectedCase?.click()
                    selectedCase?.scrollIntoView({ behavior: "smooth", block: "center" })
                    if (!findSelected()) { setTimeout(() => { console.log('Clicking due to no alert being selected'); doClick(caseOrProviderAlertsTableTbodyChildren[0]) }, 500) }
                    sessionStorage.removeItem('MECH2.preWorkerAlertCase')
                }, 600)
            }();
        });

        deleteButton.insertAdjacentElement('afterend', createButton)
        alertTotal.insertAdjacentHTML('afterend', `
        <button type="button" class="form-button centered-text" id="deleteTop">Delete Alert</button>
        <button type="button" class="form-button centered-text" id="deleteAll" title="Delete All" value="Delete All">Delete All</button>
        <button type="button" class="form-button centered-text hidden" id="stopDeleteAll" title="Stop Deleting" value="Stop Deleting">Deleting...</button>
        `)
        doNotDupe.buttons.push('#deleteAll', '#stopDeleteAll', '#deleteTop')
        let deleteAllButton = document.getElementById('deleteAll'), stopDeleteAllButton = document.getElementById('stopDeleteAll'), deleteTopButton = document.getElementById('deleteTop')
        let deleteAllButtons = [deleteAllButton, stopDeleteAllButton], deleteButtons = [deleteButton, deleteTopButton, deleteAllButton]
        deleteTopButton.addEventListener( 'click', () => doClick(deleteButton) )

        // SECTION_START Delete_all_alerts
        doWrap(h4objects.caseproviderlist.h4)
        h4objects.caseproviderlist.h4.insertAdjacentHTML('afterend', '<h4 class="float-right-imp" style="display:inline-flex;" id="alertMessageh4"></h4>')
        let alertMessageh4 = document.getElementById('alertMessageh4')
        let manualHaltDeleting = 0
        stopDeleteAllButton.addEventListener("click", () => { manualHaltDeleting = 1 })
        deleteAllButton.addEventListener("click", () => {
            manualHaltDeleting = 0
            let caseDetails = structuredClone(whatAlertType(caseOrProviderType.value))
            if ( !["Case", "Provider"].includes(caseDetails.type) ) { return }
            deleteAllButtons.forEach( ele => ele.classList.toggle('hidden') )
            doDeleteAll(caseDetails)
        })
        function doDeleteAll({ type: caseOrProvider, numberId: numberToDelete } = {}) {//Test worker ID PWSCSP9
            const observerDelete = new MutationObserver( () => deleteAll() )
            observerDelete.observe(deleteButton, { attributeFilter: ['value'] })
            let alertRowIndexValue = alertRowIndx.value, alertCount = () => caseOrProviderAlertsTableTbody.children[alertRowIndexValue]?.children[3]?.innerText
            let caseProviderRow = caseOrProviderAlertsTableTbody.children[alertRowIndx.value], isCaseProviderRowSelected = () => caseProviderRow?.classList?.contains('selected')
            selectedCaseOrProvider.idTd = (selectedCaseOrProvider.idTd ? selectedCaseOrProvider.idTd : caseOrProviderAlertsTableTbody.querySelector('.selected').children[2]) ?? undefined
            deleteAll()
            function deleteAllMsg(h4MsgText) { alertMessageh4.innerText = h4MsgText }
            function deleteAll() {
                selectedCaseOrProvider.caseId = selectedCaseOrProvider.idTd?.textContent
                const isCaseProviderRowSelectedBool = isCaseProviderRowSelected(), alertCountNumber = Number(alertCount())
                if (manualHaltDeleting) { endDeleteAll(); return deleteAllMsg("Halting Delete All") }
                if (deleteButton.value === "Please wait") { return }
                if (alertCountNumber < 0) { endDeleteAll(); return deleteAllMsg(["Delete All halted for", numberToDelete, "- reload page (MEC2 database mismatch)"].join(' ')) }
                if (alertCountNumber < 1) { endDeleteAll(); return deleteAllMsg( ['Delete All ended - all alerts deleted from', caseOrProvider.toLowerCase(), numberToDelete].join(' ') ); }
                if (isCaseProviderRowSelectedBool && alertCountNumber > 0 && selectedCaseOrProvider.caseId === numberToDelete && deleteButton.value === "Delete Alert") { return doClick(deleteButton) }
                else {
                    if (selectedCaseOrProvider.caseId === undefined) {
                        deleteAllMsg(["Delete All halted for", numberToDelete, "- no row was 'clicked' in Case/Provider"].join(' '))
                        return deleteAllErrorLogging("selectedCaseOrProvider.caseId is undefined. '.selected' row in caseOrProviderAlertsTableTbody is ", caseOrProviderAlertsTableTbody.querySelector('.selected'))
                    } else if (selectedCaseOrProvider.caseId && alertCountNumber > 0 && (selectedCaseOrProvider.caseId !== numberToDelete) || !isCaseProviderRowSelectedBool ) {
                        deleteAllMsg(["Delete All halted for", numberToDelete, "- reload page (MEC2 database mismatch)"].join(' '))
                        deleteButtons.forEach(ele => { ele.disabled = true })
                        return deleteAllErrorLogging( "selectedCaseOrProvider.caseId: ", selectedCaseOrProvider.caseId, "\nalertCount(): ", alertCount(), "\nselectedCaseOrProvider.caseId !== numberToDelete: ", selectedCaseOrProvider.caseId, numberToDelete, "\n!isCaseProviderRowSelected(): ", !isCaseProviderRowSelectedBool )
                    } else if ( numberToDelete !== selectedCaseOrProvider.caseId || !isCaseProviderRowSelectedBool ) {
                        deleteAllMsg(caseOrProvider === "Case" ? "Case number doesn't match." : "Provider ID doesn't match.")
                        return deleteAllErrorLogging( "numberToDelete !== selectedCaseOrProvider.caseId: ", numberToDelete, selectedCaseOrProvider.caseId, "\n!isCaseProviderRowSelected(): ", !isCaseProviderRowSelectedBool )
                    } else {
                        doClick(caseProviderRow)
                        setTimeout(() => deleteAll(), 200)
                    }
                }
            };
            function deleteAllErrorLogging(errorMsg) {
                console.error(errorMsg)
                endDeleteAll()
            };
            function endDeleteAll() {
                deleteAllButtons.forEach( ele => ele.classList.toggle('hidden') )
                observerDelete.disconnect()
            };
        };
        localStorage.setItem( 'MECH2.alertsPageReload', Math.random() )
        addEventListener('storage', (key, newValue) => {
            if (event.key === 'MECH2.alertsPageReload') {
                deleteButtons.forEach(ele => { ele.disabled = true })
                alertMessageh4.innerText = "Alert page loaded in new tab. Reload or close this tab."
                eleFocus(submitButton)
            }
        })
// SECTION_END Delete_all_alerts
// SECTION_START Alert_Type_Based_Action
        let categoryButtonsOuterHTML = '<div id="baseCategoryButtonsDiv" class="form-group-no-margins form-group-button-parent">'
        + '<div id="caseCategoriesButtonsDiv" class="hidden"></div>'
        + '<div id="providerCategoriesButtonsDiv" class="hidden"></div>'
        + '<div id="omniButtonsDiv"></div></div>'
        deleteButton.parentElement.insertAdjacentHTML('beforeend', categoryButtonsOuterHTML)
        let caseCategoriesButtonsDiv = document.getElementById('caseCategoriesButtonsDiv')
        let providerCategoriesButtonsDiv = document.getElementById('providerCategoriesButtonsDiv')
        let omniButtonsDiv = document.getElementById('omniButtonsDiv')
        !function categoryButtonsInnerHTML() {
            const aCaseCategoryButtons = [ ["Notes", "CaseNotes"], ["Overview", "CaseOverview"], ["Elig.", "CaseEligibilityResultSelection"], ["SA:O", "CaseServiceAuthorizationOverview"], ["Provider", "CaseChildProvider"], ["Summary", "CasePageSummary"], ]
            caseCategoriesButtonsDiv.insertAdjacentHTML("beforeend", aCaseCategoryButtons.map(([ buttonText, buttonId ] = []) => '<button type="button" class="form-button" id="' + buttonId + '">' + buttonText + '</button>').join(''))
            const aProviderCategoryButtons = [ ["Address", "ProviderAddress"], ["Alias", "ProviderAlias"], ["Info", "ProviderInformation"], ["Notices", "ProviderNotices"], ["Overview", "ProviderOverview"], ["Rates", "ProviderRates"], ["Registration", "ProviderRegistrationAndRenewal"], ]
            providerCategoriesButtonsDiv.insertAdjacentHTML("beforeend", aProviderCategoryButtons.map(([ buttonText, buttonId ] = []) => '<button type="button" class="form-button" id="' + buttonId + '">' + buttonText + '</button>').join(''))
        }();
        function fBaseCategoryButtons() {
            switch (caseOrProviderType.value) {
                case "Case": if (caseCategoriesButtonsDiv.classList.contains('hidden')) { providerCategoriesButtonsDiv.classList.add('hidden'); caseCategoriesButtonsDiv.classList.remove('hidden'); } break;
                case "Provider": if (providerCategoriesButtonsDiv.classList.contains('hidden')) { caseCategoriesButtonsDiv.classList.add('hidden'); providerCategoriesButtonsDiv.classList.remove('hidden'); } break;
            }
        }
        document.getElementById('baseCategoryButtonsDiv').addEventListener('click', ele => {
            if (ele.target.nodeName !== "BUTTON") { return }
            window.open('/ChildCare/' + ele.target.id + '.htm' + whatAlertType(caseOrProviderType.value).parameters, '_blank')
        })
// SECTION_END Alert_Type_Based_Action

// SECTION_START AutoCaseNoting
        let foundAlert = {}
        // categories: Absent Days, Activity Change, Appeal, Application, Child Support Note, Email Contact, Expense Change, Fraud, Household Change, Income Change,
        // Medical Leave, NCP Information, Office Contact, Phone Contact, Provider Change, Redetermination, Special Needs, Other
        // textIncludes: regex search to match alert;
        // noteCategory: Notes page category;
        // noteSummary: Note page summary. Regex to replace text; %# to auto-replace text with summaryFetchedData; omit to use first 50 characters of noteMessage;
        // summaryFetchData: Data fetched from another page using evalData();
        // noteText: if not blank, sends through switch along with textFetchedData; if = "doFunctionOnNotes", __Notes.htm will send the category through a switch;
        // textFetchData: Data fetched from another page using evalData(); request format: ["pageNameWithoutHtm:key.key.key"]
        // createAlert (not implemented yet, might get moved to __Notes.htm): if true, will open WorkerCreateAlert and auto-fill;
        const omniPages = new Map([
            ["CaseAction", "Case Action",], ["CaseAddress", "Address"], ["CaseCreateEligibilityResults", "Create Elig"], ["CaseCSE", "CSE"], ["CaseCSIA", "CSIA"], ["CaseDisability", "Disa"], ["CaseEarnedIncome", "Earned"], ["CaseEditSummary", "Edits"],
            ["CaseEducationActivity", "Education"], ["CaseEmploymentActivity", "Employment"], ["CaseMember", "Member"], ["CaseMemberII", "Member II"], ["CaseRemoveMember", "Remo"], ["CaseSchool", "School"], ["CaseServiceAuthorizationApproval", "SA:A"],
            ["CaseSupportActivity", "Support"], ["CaseUnearnedIncome", "Unearned"], ["FinancialBillingApproval", "Billing"], ["FundingAvailability", "Funding"], ["ServicingAgencyIncomingTransfers", "Transfer"],
        ])
        function groupTableTwoAlerts() {
            let alertsByRowIndex = {}
            for (let index in tableTwoAlerts) {
                let currentIndex = alertsByRowIndex[tableTwoAlerts[index].rowIndex] ?? []
                currentIndex.push(tableTwoAlerts[index].message + "newline    (Intended Person: " + tableTwoAlerts[index].intendedPersonName + ")" )
                alertsByRowIndex[tableTwoAlerts[index].rowIndex] = currentIndex
            }
            return alertsByRowIndex
        }
        let tableTwoAlertsGrouped = groupTableTwoAlerts()
        const noteTextJoinReplace = msgArray => msgArray.join('newline').replace(/\\/g, '').replace(/newline/g, '\n').replace(/Snoozed: [A-Za-z ]+: /g,'')
        window.addEventListener( "beforeunload", () => localStorage.removeItem("MECH2.note") )
        function identifyAlertAndDoOmnibuttons(selectedAlertTableRow) {
            if (selectedAlertTableRow === undefined) { return undefined };
            omniButtonsDiv.replaceChildren()
            let [selectedRowCategory, , selectedRowName ] = selectedAlertTableRow.children
            foundAlert = Object.assign( getMessageTextAndCategory(alertMessage.value, selectedRowCategory.textContent), { selectedAlertTableRow } )
            if (typeof alertsByCategories[foundAlert.messageCategory] !== "object") { return };
            fBaseCategoryButtons()
            let alertMessagesInCategory = alertsByCategories[foundAlert.messageCategory]?.messages
            if (!Object.keys(alertMessagesInCategory).length) { return };
            for (let message in alertMessagesInCategory) {
                if (alertMessagesInCategory[message]?.textIncludes.test(alertMessage.value) === false) { continue };
                if (!"omniPageButtons" in alertMessagesInCategory[message]) { break };
                foundAlert = Object.assign( foundAlert, alertMessagesInCategory[message], { message } )
                omniButtonsDiv.insertAdjacentHTML('afterbegin', createOmniButtons(foundAlert.omniPageButtons) )
                eleFocus('#' + foundAlert.omniPageButtons[0])
                break;
            }
            function createOmniButtons( omniArray ) {
                return omniArray.map(item => {
                    let omniPageMapData = omniPages.get(item)
                    if ( ["delete", "autonoteButton"].includes(item) || !omniPageMapData ) { return }
                    return '<button type="button" class="form-button" id=' + item +'>' + omniPageMapData + '</button>'
                }).join('')
            }
            function getMessageTextAndCategory(alertMessageText, alertTableCategory) {
                let [ , messageCategory, noteMessage ] = alertMessageText.indexOf('Snoozed') === 0 ? alertMessageText.split(': ') : [ '', alertTableCategory, alertMessageText ]
                return { messageCategory: messageCategory.toLowerCase().replace(/\W/g, ""), noteMessage, noteCategory: 'Other', }
            }
        }
        doWrap(h4objects.alertdetail.h4)
        h4objects.alertdetail.h4.parentElement.style.display = "inline-block"
        h4objects.alertdetail.h4.parentElement.insertAdjacentHTML('afterend', '<div style="display: inline-flex; gap: 10px; margin-left: 10px;" id="alertDetailRow"><button type="button" class="cButton" tabindex="-1" id="autonoteButton">Automated Note</button></div>')
        let alertDetailRow = document.getElementById('alertDetailRow')
        async function automatedCaseNote() {
            let oWhatAlertType = whatAlertType(caseOrProviderType.value)
            let [ , effectiveDate, selectedRowName ] = foundAlert.selectedAlertTableRow.children
            let dateRange = undefined // not yet implemented
            if ("noteSummary" in foundAlert) {
                if (foundAlert.noteSummary === "doFunction") { foundAlert.noteSummary = noteSummaryFunction({ alertByCategory: foundAlert.messageCategory + ".messages." + foundAlert.message, effectiveDate, selectedRowName }) }
                else if (typeof foundAlert.noteSummary === "object") { foundAlert.noteSummary = await noteSummaryReplacement(foundAlert.noteSummary, foundAlert.noteMessage, foundAlert.intendedPerson) }
                if ("summaryFetchData" in foundAlert) {
                    for await ( let [i, page] of foundAlert.summaryFetchData.entries() ) { // reminder: can't .map() promises;
                        let [ pageName, evalString ] = page.split(":")
                        let fetchedData = await evalData({ caseProviderNumber: oWhatAlertType.numberId, pageName, dateRange, evalString })
                        foundAlert.noteSummary = foundAlert.noteSummary.replace("%" + i, fetchedData)
                    }
                }
            } else { foundAlert.noteSummary = foundAlert.noteMessage.slice(0, 50) }
            if ( "noteText" in foundAlert ) {
                if ( "textFetchData" in foundAlert ) {
                    let textFetchedData = []
                    for await (let page of foundAlert.textFetchData) {
                        let [ pageName, evalString ] = page.split(":")
                        let fetchedData = await evalData({ caseProviderNumber: oWhatAlertType.numberId, pageName, dateRange, evalString })
                        textFetchedData.push(fetchedData)
                        foundAlert.noteMessage = await noteMessageReplacement({ alertByCategory: foundAlert.messageCategory + ".messages." + foundAlert.message, noteMessage: foundAlert.noteMessage, fetchedDataArray: textFetchedData, alertTableSelectedRow: foundAlert.selectedAlertTableRow}) ?? foundAlert.noteMessage
                    }
                } else { foundAlert.noteMessage = await noteMessageReplacement({ alertByCategory: foundAlert.messageCategory + ".messages." + foundAlert.message, alertTableSelectedRow: foundAlert.selectedAlertTableRow }) ?? foundAlert.noteMessage }
            }
            if ("intendedPerson" in foundAlert) { foundAlert.intendedPerson = nameFuncs.commaNameObject(selectedRowName.textContent).first }
            // currently unused and untested // if ("dateRange" in foundAlert) { //     if (Number.isNaN(foundAlert.dateRange)) { return } //     let startDate = document.getElementById('periodBeginDate').value, endDate = document.getElementById('periodEndDate').value //     foundAlert.dateRange = foundAlert.dateRange !== 0 ? foundAlert.dateRange = (dateFuncs.formatDate(dateFuncs.addDays(startDate, dateRange * 14), "mmddyyyy") + dateFuncs.formatDate(dateFuncs.addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') : 0 //     if (foundAlert.dateRange !== 0) { foundAlert.dateRange = (dateFuncs.formatDate(dateFuncs.addDays(startDate, dateRange * 14), "mmddyyyy") + dateFuncs.formatDate(dateFuncs.addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') } // }
            let shortWorkerName = nameFuncs.LastFirstToFirstL(workerName.value)
            foundAlert.worker = shortWorkerName
            foundAlert.xNumber = inputWorkerId.value.toLowerCase()
            foundAlert.page = oWhatAlertType.page
            foundAlert.parameters = oWhatAlertType.parameters
            foundAlert.numberId = oWhatAlertType.numberId
            return foundAlert
            function noteMessageReplacement({ alertByCategory, noteMessage, fetchedDataArray, alertTableSelectedRow } = {}) {
                switch (alertByCategory) {
                    case "childsupport.messages.csCSES": return tableTwoAlertsGrouped[childOrRowIndex(alertTableSelectedRow)].filter( item => item.includes('CSES') )
                    case "childsupport.messages.ncpAddress": {
                        let parentAndNCPAddress = foundAlert.noteSummary + "\n-\nCase Address: " + fetchedDataArray[0]
                        if ((noteMessage).includes(fetchedDataArray[0].slice(0, 12))) {
                            foundAlert.noteSummary = "MATCH: " + foundAlert.noteSummary
                            parentAndNCPAddress = parentAndNCPAddress.concat("\n-\nAddresses match. Sending special letter requesting additional information.")
                        }
                        return parentAndNCPAddress
                    }
                    case "eligibility.messages.unpaidCopay": return tableTwoAlertsGrouped[childOrRowIndex(alertTableSelectedRow)].filter( item => item.includes('Failure') )
                    case "maxis.messages.gcReviewDate": return tableTwoAlertsGrouped[childOrRowIndex(alertTableSelectedRow)].filter( item => item.includes('Good Cause') )
                    case "maxis.messages.genGoodCauseChanged": return tableTwoAlertsGrouped[childOrRowIndex(alertTableSelectedRow)].filter( item => item.includes('Good Cause') )
                    case "maxis.messages.mailingAddress": return fetchedDataArray[0].length ? foundAlert.noteMessage + "\n-\nMailing Address: " + fetchedDataArray[0] + " " + fetchedDataArray[1] + " " + fetchedDataArray[2] : foundAlert.noteMessage + "\n-\nMailing address removed."
                    case "maxis.messages.marriage": return tableTwoAlertsGrouped[childOrRowIndex(alertTableSelectedRow)].filter( item => ['Marriag','Marital','Designa'].includes(item.slice(0, 7)) )
                    case "maxis.messages.residenceAddress": return foundAlert.noteMessage + "\n-\nResidence Address: " + fetchedDataArray[0]
                }
            }
            function noteSummaryReplacement(noteSummaryArray, msgText, personName) { return msgText.replace(noteSummaryArray[0], noteSummaryArray[1]).replace("personName", personName) }
            function noteSummaryFunction({ alertByCategory, effectiveDate, selectedRowName } = {}) {
                switch (alertByCategory) {
                    case "maxis.messages.memberJoined": { return foundAlert.noteMessage.replace(/(?:[A-Za-z0-9 ]+)(\d{2}\/\d{2}\/\d{2,4})./, "Added: $1: " + nameFuncs.commaNameObject(selectedRowName.textContent).first ) }
                    case "information.messages.mailed": { return "Redetermination mailed, due " + dateFuncs.formatDate(dateFuncs.addDays(effectiveDate.textContent, 45), "mdyy") }
                }
            }
        };
        document.getElementById('autonoteButton').addEventListener('click', () => {
            automatedCaseNote().then(returnedAlert => {
                let readiedAlert = {}
                readiedAlert[returnedAlert.numberId] = Object.assign({}, returnedAlert)
                localStorage.setItem("MECH2.note", JSON.stringify(readiedAlert))
                eleFocus(deleteButton)
                window.open('/ChildCare/' + returnedAlert.page + returnedAlert.parameters, '_blank')
            })
        }) // SECTION_END AutoCaseNoting
        createButton.addEventListener('click', () => {
            let { messageCategory, noteMessage } = foundAlert ?? {}
            let workerCreatedObject = JSON.stringify({ messageCategory, noteMessage })
            localStorage.setItem( 'MECH2.workerCreatedObject', workerCreatedObject )
        }) // Worker_Created_Alert_Data;
    }).catch(err => { console.trace(err) });
}(); // SECTION_END Alerts end (major sub-section) =========================================================================================================;
!function AlertWorkerCreatedAlert() {
if (!["AlertWorkerCreatedAlert.htm"].includes(thisPageNameHtm)) { return }
    let workerCreatedAlert = sanitize.JSON(localStorage.getItem('MECH2.workerCreatedObject'))
    if (!workerCreatedAlert) { return }
    localStorage.removeItem('MECH2.workerCreatedObject')
    document.querySelector('label[for=message]').parentElement.insertAdjacentHTML('afterend', '<div class="form-group" id="workerAlertButtons"></div>')
    let workerAlertButtons = document.getElementById('workerAlertButtons')
    let matchesDelayStrings = ( ["Unapproved results", "The program switch"].includes(workerCreatedAlert.noteMessage?.slice(0, 18)) ) ? delayMfipButtons() : snoozeButtons()
    function snoozeButtons() {
        workerAlertButtons.insertAdjacentHTML('beforeend','<button type="button" class="cButton delay" id="snooze1">Snooze One Day</button><button type="button" class="cButton delay" id="snooze7">Snooze One Week</button><button type="button" class="cButton delay" id="snooze14">Snooze Two Weeks</button>')
        workerAlertButtons.addEventListener('click', doSnooze )
        focusEle = '#snooze1'
        function doSnooze(clickEvent) {
            clickEvent.preventDefault()
            let snoozeDays = Number(clickEvent.target.id.slice(6))
            if (Number.isNaN(snoozeDays)) { return }
            let todayDate = new Date()
            let snoozeDate = dateFuncs.formatDate(todayDate.setDate(todayDate.getDate() + snoozeDays), 'mmddyyyy')
            enterAlertInfo("Snoozed: " + workerCreatedAlert.messageCategory + ": " + workerCreatedAlert.noteMessage, snoozeDate)
        }
    }
    function delayMfipButtons() {
        let todayDate = new Date()
        let nextMonth = dateFuncs.formatDate(todayDate.setMonth(todayDate.getMonth() + 1, 1), 'mmddyyyy')
        let monthAfter = dateFuncs.formatDate(todayDate.setMonth(todayDate.getMonth() + 1, 1), 'mmddyyyy')
        workerAlertButtons.insertAdjacentHTML('beforeend','<button type="button" class="cButton delay" id="delayNextMonth">MFIP Close Delay Alert: ' + nextMonth + '</button><button type="button" class="cButton delay" id="delayMonthAfter">MFIP Close Delay Alert: ' + monthAfter + '</button>')
        workerAlertButtons.addEventListener('click', doMfipDelay )
        focusEle = '#delayNextMonth'
        function doMfipDelay(clickEvent) {
            let delayDate = clickEvent.target.innerText.slice(24)
            enterAlertInfo("Approve new results (BSF/TY/extended eligibility) if MFIP not reopened.", delayDate)
        }
    }
    function enterAlertInfo(message, effectiveDate) {
        document.getElementById('message').value = message
        document.getElementById('effectiveDate').value = effectiveDate
        save.click();
    }
}(); // SECTION_END Alert_Worker_Created_Alert;
!function _Application_Pages() {
    !function __CaseApplicationInitiation() {
        if (!("CaseApplicationInitiation.htm").includes(thisPageNameHtm) || !editMode) { return };
        countyInfo.userSettings.selectPeriodReversal && selectPeriodReversal()
        document.getElementById('next').addEventListener('click', () => { sessionStorage.setItem('processingApplication', "yes") })
        function appDateChanged(changeEvent) {
            let appDateChange = changeEvent.target.value
            if (appDateChange.length < 10) { return false }
            let appDate = sanitize.date(appDateChange, "number"), benPeriodDate = { start: sanitize.date(selectPeriodDates.start, "number"), end: sanitize.date(selectPeriodDates.end, "number") }
            if ( inRange(appDate, benPeriodDate.start, benPeriodDate.end) ) { return false }
            let selectPeriodDatesArray = countyInfo.userSettings.selectPeriodReversal ? [...selectPeriod.children].slice(0, 18) : [...selectPeriod.children].slice(-18)
            const matchingPeriod = selectPeriodDatesArray.find(dates => {
                if ( (sanitize.date(dates.value.slice(13), "number") - appDate ) < 1123200001) {
                    selectPeriod.value = dates.value
                    eleFocus(save)
                    return dates.value
                }
            })
            }
        $('#applicationReceivedDate').on("change", appDateChanged ) // jQuery event doesn't allow for additional 'click' events on its datepicker, so can't replace jQuery.
    }(); // SECTION_END Case_Application_Initiation;
    !function __CaseReapplicationAddCcap() {
        if (!("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) { return };
        document.getElementById('quit')?.addEventListener('click', () => clearStorageItems("session") )
        let unchecked = [...document.querySelectorAll('input[type=checkbox]')].filter(box => box.checked === false).forEach(box2 => { box2.parentElement.style.backgroundColor = 'yellow' })
        }(); // SECTION_END Case_Reapplication_Add_Ccap;
}();
!function ApplicationInformation() {
    if (!("ApplicationInformation.htm").includes(thisPageNameHtm)) { return }
    let appReceivedField = document.getElementById('receivedDate')
    let appReceivedDate = appReceivedField.value
    let appDateCompare = sanitize.date(appReceivedField.value, "number")
    if (appReceivedField.value !== '') {
        h4objects.dates.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton float-right-imp" style="margin-top: 5px;" tabindex="-1" id="appReceivedDateButton">Copy App Date</button>')
        document.getElementById('appReceivedDateButton').addEventListener('click', (() => {
            actualDate._setActualDate({adCaseNum: "noCaseNumberYet", adDate: appReceivedDate, adField: 'receivedDate'})
            // sessionStorage.setItem('actualDateSS', appReceivedDate)
            sessionStorage.setItem('processingApplication', "yes")
            snackBar("Stored application date", 'notitle')
            if ( !inRange( appDateCompare, sanitize.date(selectPeriodDates.start, "number"), sanitize.date(selectPeriodDates.end, "number") ) ) {
                document.getElementById('retroAppDateLbl').style.visibility = "hidden"
                document.getElementById('retroAppDate').insertAdjacentHTML('afterend','<span>Notice: Application date is outside the current biweekly period.</span>')
            }
        }))
    }
}(); // SECTION_END Application_Information;
!function BillsList() {
    if (!"BillsList.htm".includes(thisPageNameHtm)) { return };
    listPageLinksAndList([0, "FinancialBilling", 4], [2, "ProviderInformation"])
    addDateControls("day", document.getElementById('searchStartDate'))
}(); // SECTION_END Bills_List;
!function CaseAction() {
    if (!("CaseAction.htm").includes(thisPageNameHtm)) { return }
    if (!editMode) {
        if ( document.referrer.indexOf("https://mec2.childcare.dhs.state.mn.us/ChildCare/CaseAction.htm") > -1 ) {
            focusEle = document.getElementById('failHomeless').checked ? document.getElementById('FundingAvailability.htm') : "#wrapUpDB"
        }
    } else {
        document.getElementById('failHomeless').addEventListener('click', () => eleFocus('#saveDB') )
    }
}(); // SECTION_END Case_Action;
!function CaseAddress() {
    if (!("CaseAddress.htm").includes(thisPageNameHtm)) { return };
    if (!editMode) {
        let mailingStreet1 = document.getElementById('mailingStreet1'), edit = document.getElementById('edit'), caseName = nameFuncs.commaNameReorder(pageTitle), mailFields = [...document.querySelectorAll('#mailingAddressPanelData > div > div')]
        secondaryActionArea.insertAdjacentHTML('beforeend', '<button type="button" class="cButton float-right-imp" style="margin-top: 5px;" tabindex="-1" id="copyMailing">Copy Mail Address</button>');
        evalData().then(results => {
            document.getElementById('copyMailing').addEventListener('click', () => {
                let addressTableRow = childOrRowIndex(document.querySelector('.selected')), addressData = results[0][addressTableRow], mailingData
                if (addressData.mailingStreet1) {
                    mailingData = {
                        streetData: [addressData.mailingStreet1, addressData.mailingStreet2].join(' '),
                        cityData: addressData.mailingCity,
                        stateData: stateDataSwap.swapStateNameAndAcronym(addressData.mailingStateProvince),
                        zipData: [addressData.mailingZipCode, addressData.mailingZipCodePlus4].join('-'),
                    }
                } else {
                    mailingData = {
                        streetData: [addressData.residenceStreet1, addressData.residenceStreet2].join(' '),
                        cityData: addressData.residenceCity,
                        stateData: stateDataSwap.swapStateNameAndAcronym(addressData.residenceStateProvince),
                        zipData: [addressData.residenceZipCode, addressData.residenceZipCodePlus4].join('-'),
                    }
                };
                let copyText = caseName + "\n" + mailingData.streetData + "\n" + mailingData.cityData + ", " + mailingData.stateData + " " + mailingData.zipData;
                navigator.clipboard.writeText(copyText);
                snackBar(copyText);
            })
            let phone2 = document.getElementById('phone2'); !phone2.value && phone2.parentElement.parentElement.classList.add('hidden')
            let phone3 = document.getElementById('phone3'); !phone3.value && [...phone3.parentElement.parentElement.children].forEach(ele => { if (ele.classList.contains('form-group')) { return }; ele.classList.add('hidden') })
            checkMailingAddress()
            function checkMailingAddress() { document.getElementById('mailingCountry').value ? h4objects.mailingaddress.siblings.forEach(ele => { ele.style.visibility = "visible" }) : h4objects.mailingaddress.siblings.forEach(ele => { ele.style.visibility = "hidden" }) };
            document.getElementById('caseAddressTable').addEventListener( 'click', () => checkMailingAddress() );
        }).catch(err => { console.trace(err) })
    };
}(); // SECTION_END Case_Address;
!function CaseChildProvider() { // (major_subsection) ======================================================================================================================================================;
    if (!("CaseChildProvider.htm").includes(thisPageNameHtm)) { return };
    const ccpEle = Object.fromEntries([ 'providerType', 'providerId', 'carePeriodBeginDate', 'carePeriodEndDate', 'primaryBeginDate', 'primaryEndDate', 'secondaryBeginDate',
                                       'secondaryEndDate', 'careEndReason', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild', 'relatedToChild',
                                       'careInHome', 'exemptionReason', 'exemptionPeriodBeginDate', 'formSent', 'providerLivesWithChildBeginDate', 'providerLivesWithChildEndDate',
                                       'careInHomeOfChildBeginDate', 'careInHomeOfChildEndDate', 'childCareMatchesEmployer' ].map(item => [item, document.getElementById(item)]) )
    let childProviderTableTbodyRows = [...document.querySelector('#childProviderTable > tbody').children]
    secondaryActionArea.style.justifyContent = "flex-start"
    secondaryActionArea.insertAdjacentHTML('beforeend', '<div id="childProviderSaaButtons" class="db-container"></div>')
    let childProviderSaaButtons = document.getElementById('childProviderSaaButtons')
    document.getElementById('reporterType').disabled = true
    if (!editMode) {
        !function providerPagesButtons() {
            let providerButtonHTML = [ ["buttonProviderAddress", "Address"], ["buttonProviderInformation", "Email"], ["buttonProviderParentAware", "Parent Aware"], ["buttonProviderAccreditation", "Accred."] ]
            .map(([id, name]) => { return '<button type="button" class="cButton sidePadding" tabindex="-1" id="' + id + '">' + name + '</button>' }).join('');
            h4objects.providerinformation.h4.insertAdjacentHTML('afterend','<div id="providerPageButtons" class="float-right-imp h4-line" style="display: flex; gap: 5px;">' + providerButtonHTML + '</div>');
            document.getElementById('providerPageButtons').addEventListener('click', clickEvent => {
                let providerPageName = clickEvent.target.id.slice(6)
                clickEvent.preventDefault()
                window.open("/ChildCare/" + providerPageName + ".htm?providerId=" + ccpEle.providerId.value, "_blank");
            })
        }()
        evalData().then(({ 0: childProvidersData} = {}) => {
            if (!childProvidersData) { return };
            childProvidersData.forEach(providerData => { childProviderTableTbodyRows[providerData.rowIndex].children[2].innerHTML = '<a href="https://mec2.childcare.dhs.state.mn.us/ChildCare/ProviderOverview.htm?providerId=' + providerData.providerId + '" target="_blank">' + sanitize.evalText(providerData.providerName) + '</a>' })
        }).catch(err => { console.trace(err) })
    } else if (editMode) {
        h4objects.providerdesignation.h4.insertAdjacentHTML('afterend','<div id="resetButtons" class="float-right-imp h4-line" style="display: flex; gap: 10px;">'
                                                            + '<button type="button" class="cButton" tabindex="-1" id="resetCCPForm">Clear Dates & Hours</button>'
                                                            + '<button type="button" class="cButton" tabindex="-1" id="unendSACCPForm">Clear End Dates & Reason</button>'
                                                            + '</div>')
        const resetButtons = {
            resetCCPForm: { resetValueEles: [ccpEle.primaryBeginDate, ccpEle.secondaryBeginDate, ccpEle.carePeriodBeginDate, ccpEle.carePeriodEndDate, ccpEle.primaryEndDate, ccpEle.secondaryEndDate, ccpEle.hoursOfCareAuthorized, ccpEle.careEndReason], focus: ccpEle.primaryBeginDate },
            unendSACCPForm: { resetValueEles: [ccpEle.carePeriodEndDate, ccpEle.primaryEndDate, ccpEle.secondaryEndDate, ccpEle.careEndReason], focus: ccpEle.hoursOfCareAuthorized }
        }
        document.getElementById('resetButtons').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            clickEvent.preventDefault()
            let resetTarget = resetButtons[clickEvent.target.id]
            resetTarget.resetValueEles.forEach(ele => { ele.value = '' })
            doEvent(resetTarget.focus)
        })
        tabIndxNegOne(ccpEle.providerLivesWithChild)
        ccpEle.providerId.addEventListener('change', () => {
            let mute = new MutationObserver(() => { providerTypeExists(); mute.disconnect(); })
            mute.observe(ccpEle.formSent, { attributes: true })
        });
    }
    //
    !function ccpStartEndDateButtons() {
        if (!editMode) { // Copy/paste start/end dates
            queueMicrotask(() => {
                let editDB = document.getElementById('editDB')
                document.getElementById('childProviderTable').addEventListener('click', () => {
                    childProviderPage()
                    checkForDates()
                    eleFocus(editDB)
                })
                childProviderSaaButtons.insertAdjacentHTML("afterbegin", "<button type='button' id='copyStart' class='form-button hidden'>Copy Start</button><button type='button' id='copyEndings' class='form-button hidden'>Copy Endings</button>")
                let copyStartButton = document.getElementById('copyStart'), copyEndingsButton = document.getElementById('copyEndings')
                function checkForDates() {
                    ccpEle.carePeriodBeginDate?.value && !ccpEle.carePeriodEndDate?.value ? copyStartButton.classList.remove('hidden') : copyStartButton.classList.add('hidden')
                    ccpEle.carePeriodEndDate?.value ? copyEndingsButton.classList.remove('hidden') : copyEndingsButton.classList.add('hidden')
                }
                copyStartButton.addEventListener('click', () => copyStartToSS() )
                function copyStartToSS() {
                    let selectedRow = document.querySelector('.selected')
                    if (ccpEle.carePeriodBeginDate?.value && selectedRow) {
                        let oProviderStart = Object.fromEntries( ['providerId', 'primaryBeginDate', 'secondaryBeginDate', 'carePeriodBeginDate', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild'].map(ele => [ele, ccpEle[ele].value]) )
                        sessionStorage.setItem("MECH2.providerStart", JSON.stringify(oProviderStart))
                        snackBar('Copied start data!', 'notitle')
                        eleFocus('#newDB')
                    } else if (!selectedRow) { snackBar('No entry selected') }
                }
                copyEndingsButton.addEventListener('click', (() => copyEndingsToSS()))
                function copyEndingsToSS() {
                    let selectedRow = document.querySelector('.selected')
                    if (ccpEle.carePeriodEndDate?.value && selectedRow) {
                        let oProviderEndings = Object.fromEntries( ['primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason'].map(ele => [ele, ccpEle[ele].value]) )
                        sessionStorage.setItem("MECH2.providerEndings", JSON.stringify(oProviderEndings))
                        snackBar('Copied ending data!', 'notitle')
                    } else if (!selectedRow) { snackBar('No entry selected') }
                }
                checkForDates()
            })
        } else if (editMode) {
            queueMicrotask(() => {
                let oProviderEndings = sanitize.JSON(sessionStorage.getItem("MECH2.providerEndings"))
                if (oProviderEndings !== null) {
                    document.getElementById('wrapUpDB').insertAdjacentHTML("afterend", "<button type='button' id='pasteEndings' class='form-button'>Autofill Endings</button>")
                    document.getElementById('pasteEndings').addEventListener('click', pasteEndingData)
                    function pasteEndingData() {
                        if (ccpEle.providerId?.value?.length) {
                            [ 'primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason' ].forEach(item => { ccpEle[item].value = oProviderEndings[item] })
                            save.click()
                        }
                    }
                }
                let oProviderStart = sanitize.JSON(sessionStorage.getItem("MECH2.providerStart"))
                if (oProviderStart !== null) {
                    const childDropDown = document.getElementById('memberReferenceNumberNewMember')
                    childProviderSaaButtons.insertAdjacentHTML('afterbegin', "<button type='button' id='pasteStart' class='form-button'>Autofill Start</button>")
                    document.getElementById('pasteStart').addEventListener('click', pasteStartData)
                    function pasteStartData() {
                        if (!ccpEle.providerId?.value?.length) {
                            ccpEle.providerId.value = oProviderStart.providerId
                            doEvent(ccpEle.providerId)
                        }
                        let setValues = ['primaryBeginDate', 'secondaryBeginDate', 'carePeriodBeginDate', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild', ].forEach(item => { ccpEle[item].value = oProviderStart[item] })
                        let setValuesBlank = ['primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason', ].forEach(item => { ccpEle[item].value = '' })
                        if (childDropDown) {
                            childDropDown.value?.length ? setTimeout(() => { eleFocus(save) }, 800) : setTimeout(() => { eleFocus(childDropDown) }, 800)
                        } else { eleFocus(save) }
                    }
                }
            })
        }
    }()
    // SECTION_END Open provider information page from Child's Provider page
    function childProviderPage() {
        if (!ccpEle.providerType.value) { return };
        const beginEndFields = {
            primary: { start: ccpEle.primaryBeginDate, end: ccpEle.primaryEndDate },
            secondary: { start: ccpEle.secondaryBeginDate, end: ccpEle.secondaryEndDate },
            carePeriod: { start: ccpEle.carePeriodBeginDate, end: ccpEle.carePeriodEndDate },
        }
        for (let fields in beginEndFields) { !beginEndFields[fields].start?.value && beginEndFields[fields].end?.setAttribute('tabindex', '-1') }
        if (ccpEle.providerType.value !== "Legal Non-licensed") {
            let setLnlItemsToNo = [ ccpEle.providerLivesWithChild, ccpEle.careInHome, ccpEle.relatedToChild ]
            let setLnlItems = [ ccpEle.providerLivesWithChild, ccpEle.careInHome, ccpEle.relatedToChild, ccpEle.exemptionReason, ccpEle.exemptionPeriodBeginDate, ccpEle.formSent, ccpEle.signedFormReceived, ccpEle.providerLivesWithChildBeginDate, ccpEle.providerLivesWithChildEndDate, ccpEle.careInHomeOfChildBeginDate, ccpEle.careInHomeOfChildEndDate ]
            if (editMode) {//not LNL
                let checkBoxes = [...document.getElementById('reporterTypeCheckboxes').children]
                let boxesChecked = [...checkBoxes].filter(ele => ele.checked).forEach(ele2 => { ele2.tabindex = '-1' })
                }
            setLnlItems.forEach(element => {
                element.tabindex = '-1'
                element.parentElement.parentElement.style.opacity = "0.5"
                if (setLnlItemsToNo.includes(element) ) { element.value = "N" }
            })
            // evalData(ccpProviderId.value, 'ProviderParentAware', undefined, '0.parentAwareType', 'provider').then( result => {}) BLORG
            // evalData(ccpProviderId.value, 'ProviderAccreditation', undefined, '0.parentAwareType', 'provider').then(result => {})
            // evalData({ caseProviderNumber: '', pageName: '', dateRange: '', evalString: '', caseOrProvider: '', })
        } else if (ccpEle.providerType.value === "Legal Non-licensed") {//is LNL
            let lnlReportingTypeBox = document.querySelector('#reporterTypeCheckboxes > input[value="LNL Provider Used"]')
            !lnlReportingTypeBox.checked && lnlReportingTypeBox.click()
            let naBox = document.querySelector('#reporterTypeCheckboxes > input[value="Not Applicable"]')
            naBox.checked && naBox.click()
            lnlTraining()
        }
    };
    let lnlOnly = [ ccpEle.providerLivesWithChildBeginDate, ccpEle.careInHome, ccpEle.relatedToChild, ccpEle.providerLivesWithChild, ccpEle.formSent, ccpEle.signedFormReceived, ccpEle.exemptionReason, ccpEle.exemptionPeriodBeginDate, ]
    let licensedOnly = [ ccpEle.childCareMatchesEmployer, ccpEle.primaryBeginDate, ccpEle.primaryEndDate, ccpEle.secondaryBeginDate, ccpEle.secondaryEndDate, ]
    async function lnlTraining() {
        ccpEle.relatedToChild.addEventListener( 'change', checkIfRelated )
        let ccpProvIdValue = ccpEle.providerId.value
        let lnlDataProvId = "lnlData" + ccpProvIdValue, lnlDataProvIdEle = document.getElementById(lnlDataProvId)
        let providerTypeFormGroup = ccpEle.providerType.closest('.row')
        let lnlSS = sessionStorage.getItem('lnlSS.' + ccpProvIdValue)
        if (lnlSS) {
            let lnlDiv = providerTypeFormGroup.insertAdjacentHTML('afterend', '<div class="lnlData" id=' + lnlDataProvId + '>' + lnlSS + '</div>')
            checkIfRelated()
            return false
        }
        if (!lnlDataProvIdEle) {
            let lnlDiv = providerTypeFormGroup.insertAdjacentHTML('afterend', '<div class="lnlData" id=' + lnlDataProvId + '></div>')
            $("#" + lnlDataProvId).load('/ChildCare/ProviderTraining.htm?providerId=' + ccpProvIdValue + ' #providerTrainingData', () => {//jquery
                let ptd = document.querySelector('#' + lnlDataProvId + ' > #providerTrainingData')
                ptd.querySelector('div.form-group:has(input.form-button)').remove()
                ptd.querySelectorAll('h4, br').forEach( ele => ele.remove() )
                ptd.querySelectorAll('input, select').forEach(ele => { ele.disabled = true; ele.classList.add('borderless') })
                ptd.querySelectorAll('div.col-lg-2').forEach( ele => ele.removeAttribute('style') )
                let trainingDateNodes = ptd.querySelectorAll('.panel-box-format input[id]')
                let trainingMap = new Map([
                    ["cardio", { name: "CPR", verified: "cardioVerification" }],
                    ["firstAid", { name: "First Aid", verified: "firstAidVerification" }],
                    ["suids", { name: "SUIDS", verified: "suidsVerification", related: "Yes", careForRelated: "Any related child < 1 year" }],
                    ["headTrauma", { name: "AHT", verified: "headTraumaVerification", related: "Yes", careForRelated: "Any related child < 5 years" }],
                    ["orientation", { name: "Supervising for Safety", related: "No", verified: "orientationVerification", careForRelated: "All related children instead of AHT if age < 5 years and SUIDS if age < 1 year", careForUnrelated: "All unrelated children age < 5 years, all unrelated children age > 5 years after 90 days" }],
                    ["ongoing", { name: "Ongoing Training", verified: "ongoingVerification" }],
                    ["annual", { name: "Annual Inspection", verified: undefined }]
                ])
                trainingDateNodes.forEach(ele => {
                    let trainingName = ele.id.slice(0, -4)
                    document.querySelector('label[for=' + ele.id + ']').textContent = trainingMap.get(trainingName).name + ": "
                    // if (ele.value?.length) {
                    // }
                })
                $(ptd.querySelectorAll('.form-group')).unwrap()//jquery
                ptd.classList.remove('displayNone')
                let childUnderFive, childUnderOne
                let resultsHTML = `
                    <div class="form-group"> <div class="col-lg-12 textInherit">
                            <label for="registration" class="col-lg-2 control-label textR textInherit marginTop10">Registration:</label>
                            <div class="col-lg-6 padL0 textInherit">
                                <div id="registration" type="text" name="registration" title="LNL Registration Status and Effective Date"></div>
                            </div>
                    </div> </div>
                    <div class="form-group"> <div class="col-lg-12 textInherit related" id="hasRelatedCare">
                            <label for="relatedCare" class="col-lg-2 control-label textR textInherit marginTop10 related">Related Care:</label>
                            <div class="col-lg-7 padL0 textInherit" style="text-decoration: inherit;">
                                <div id="relatedCare" type="text" name="relatedCare" class="inline-text related" style="text-decoration: inherit;" title="LNL Related Care Breakdown"></div>
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
                let registrationArray = evalData({ caseProviderNumber: ccpProvIdValue, pageName: 'ProviderRegistrationAndRenewal', evalString: '0', caseOrProvider: 'provider', }).then(registrationResult => {
                    for (let registration in registrationResult) {
                        if (registrationResult[registration].financiallyResponsibleAgency === userCountyObj?.county + ' County') {
                            let matchedRegistration = registrationResult[registration], registrationResultsArray = [ matchedRegistration.registrationStatus, matchedRegistration.statusEffective ] // status, date
                            ptd.querySelector('#registration').textContent = registrationResultsArray.join(' ')
                            return registrationResultsArray
                        }
                    }
                }).catch(err => { console.trace(err) })
                checkIfRelated()
                sessionStorage.setItem('lnlSS.' + ccpProvIdValue, document.getElementById(lnlDataProvId).outerHTML)
            })
        }
        if (lnlDataProvIdEle) {
            // document.getElementById(lnlDataProvId).classList.remove('hidden')
            checkIfRelated()
            return false
        }
        function checkIfRelated() {
            ccpEle.relatedCare ??= document.getElementById('relatedCare')
            ccpEle.unrelatedCare ??= document.getElementById('unrelatedCare')
            ccpEle.hasRelatedCare ??= document.getElementById('hasRelatedCare')
            ccpEle.unrelatedCare.replaceChildren()
            let todayDate = Date.now()
            let trainingDates = { ahtDate: '', ahtDateDiff: '', suidsDate: '', suidsDateDiff: '', sfsDate: '', sfsDateDiff: '', }
            let underOne = '<span style="display: inline-block;">Under 1:&nbsp;</span>', underFive = '<span style="display: inline-block;">Under 5:&nbsp;</span>', overFive = '<span style="display: inline-block;">Over 5:&nbsp;</span>'
            let yieldSign = '<div style="background: center center / cover; line-height: 14px;"><span style="background: yellow; color: black;">⚠</span>.&nbsp;</div>'
            let careStartDate = ccpEle.carePeriodBeginDate.value
            let careBreakdown = { relatedLTfive: "Under 5: ❌. ", relatedLTone: "Under 1: ❌. ", relatedGTfive: "Over 5: ✅", unrelatedLTfive: "<span>Under 5: ❌.&nbsp;</span>", unrelatedLTone: "<span>Under 1: ❌.&nbsp;</span>", unrelatedGTfive: overFive + yieldSign, sfsValue: 0 }
            trainingDates.sfsDate = document.getElementById('orientationDate'); trainingDates.sfsDateDiff = trainingDates.sfsDate ? dateFuncs.dateDiffInDays(todayDate, trainingDates.sfsDate.value) : ''
            if (document.getElementById('orientationVerification').value === "Yes") {
                if (trainingDates.sfsDateDiff > 730) { trainingDates.sfsDate.style = 'color: var(--textColorNegative) !important;'; trainingDates.sfsDateDiff = undefined }
                else {
                    careBreakdown.sfsValue = 1
                    careBreakdown.relatedLTfive = "Under 5: ✅. "
                    careBreakdown.relatedLTone = "Under 1: ✅. "
                    careBreakdown.unrelatedLTfive = "<span>Under 5: ✅.&nbsp;</span>"
                    careBreakdown.unrelatedLTone = "<span>Under 1: ✅.&nbsp;</span>"
                    careBreakdown.unrelatedGTfive = "<span>Over 5: ✅.</span>"
                }
            }
                trainingDates.ahtDate = document.getElementById('headTraumaDate')
                trainingDates.ahtDateDiff = trainingDates.sfsDateDiff ?? dateFuncs.dateDiffInDays(careStartDate, trainingDates.ahtDate.value)
                trainingDates.suidsDate = document.getElementById('suidsDate')
                trainingDates.suidsDateDiff = trainingDates.sfsDateDiff ?? dateFuncs.dateDiffInDays(careStartDate, trainingDates.suidsDate.value)
            if (document.getElementById('headTraumaVerification').value === "Yes") {
                if (trainingDates.ahtDateDiff < 730) { careBreakdown.relatedLTfive = "Under 5: ✅. "; careBreakdown.unrelatedLTfive = underFive + yieldSign }
                else { trainingDates.ahtDate.style = 'color: var(--textColorNegative) !important;' }
            }//orientationVerification
            if (document.getElementById('suidsVerification').value === "Yes") {
                if (trainingDates.suidsDateDiff < 730) { careBreakdown.relatedLTone = "Under 1: ✅. "; careBreakdown.unrelatedLTone = underOne + yieldSign }
                else { trainingDates.suidsDate.style = 'color: var(--textColorNegative) !important;' }
            }
            ccpEle.relatedCare.textContent = careBreakdown.relatedLTone + careBreakdown.relatedLTfive + careBreakdown.relatedGTfive
            ccpEle.unrelatedCare.insertAdjacentHTML('afterbegin', careBreakdown.unrelatedLTone + careBreakdown.unrelatedLTfive + careBreakdown.unrelatedGTfive)
            if (ccpEle.relatedToChild.value !== "Y") { ccpEle.hasRelatedCare.setAttribute('style', 'text-decoration: line-through; opacity: .6;') } else { ccpEle.hasRelatedCare.removeAttribute('style') }
        }
    }
    childProviderPage()
    function providerTypeExists() {
        childProviderPage()
        let providerTypeValue = ccpEle.providerType.value
        if (!providerTypeValue) { console.trace('CaseChildProvider.htm section, !providerTypeValue') }
        else if (providerTypeValue !== "Legal Non-licensed") { eleFocus(ccpEle.primaryBeginDate) }
        else if (providerTypeValue === "Legal Non-licensed") { eleFocus(ccpEle.providerLivesWithChild) }
    }
    let listenForDateChange = [ccpEle.primaryBeginDate, ccpEle.secondaryBeginDate].forEach(ele => {
        ele.addEventListener( 'keydown', () => updateValuesAndFocus(event, ccpEle.carePeriodBeginDate.value) )
        ele.addEventListener( 'change', () => updateValuesAndFocus(event, ccpEle.carePeriodBeginDate.value) )
    })
    function updateValuesAndFocus(event, carePeriodBeginDateValue) {
        if (event.key && event.key !== "Tab") { return }
        if (!ccpEle.carePeriodBeginDate.value && event.target.value?.length === 10) {
            event.preventDefault()
            ccpEle.carePeriodBeginDate.value = event.target.value
            eleFocus(ccpEle.hoursOfCareAuthorized)
        }
    }
}(); // SECTION_END CaseChildProvider end (major_subsection) =====================================================================================;
!function CaseCreateEligibilityResults() {
    if (!("CaseCreateEligibilityResults.htm").includes(thisPageNameHtm)) { return };
    if ( rederrortextContent.includes('Results successfully submitted.') ) {
        doNotDupe.pages.push(thisPageNameHtm)
        document.getElementById('caseCERDetail').insertAdjacentHTML('beforeend', '<button type="button" id="eligibilityResults" class="form-button center-vertical">Eligibility Results</button>')
        document.getElementById('eligibilityResults').addEventListener('click', clickEvent => { clickEvent.preventDefault(); document.getElementById(`Eligibility Results Selection`).children[0].click() })
        eleFocus('#eligibilityResults')
    } else { focusEle = '#createDB' }
}(); // SECTION_END Case_Create_Eligibility_Results;
!function CaseCreateServiceAuthorizationResults() {
    if (!"CaseCreateServiceAuthorizationResults.htm".includes(thisPageNameHtm)) { return };
    if ( rederrortextContent.includes("Results successfully submitted.") ) {
        doNotDupe.pages.push(thisPageNameHtm)
        const postWrap = new Map([
            [ "goSAOverview", { page: "CaseServiceAuthorizationOverview", name: "SA Overview" }],
            [ "goSAApproval", { page: "CaseServiceAuthorizationApproval", name: "SA Approval" }],
        ])
        secondaryActionArea.insertAdjacentHTML('afterbegin', '<div id="postWrapUpButtons" style="display: flex; gap: 10px;">' + postWrapButtons() + '</div>')
        function postWrapButtons() { return [...postWrap].map( ([key, item] = []) => '<button class="form-button" type="button" id="'+ key +'">'+ item.name +'</button>').join('') }
        document.getElementById('postWrapUpButtons').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            window.open('/ChildCare/' + postWrap.get(clickEvent.target.id).page + '.htm?parm2=' + caseId + '&parm3=' + selectPeriodDates.parm3, '_self')
        })
    }
}();
!function CaseCSE() {
    if (!("CaseCSE.htm").includes(thisPageNameHtm)) { return };
    let absentParentDivs = [...document.querySelectorAll('#cseAbsentParentInfoMiddleInitial, #cseAbsentParentInfoSsn, #cseAbsentParentInfoBirthdate, #cseAbsentParentInfoAbsentParentSmi, #cseAbsentParentInfoAbsentParentId')].map(ele => ele.closest('.form-group') )
    let goodCauseDivs = [...h4objects.goodcause.siblings]
    if (editMode) { // Auto-fill fields if Foster Child button
        h4objects.details.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton float-right-imp" tabindex="-1" style="margin-top: 5px;" id="fosterChild">Foster Child</button>');
        document.getElementById('fosterChild').addEventListener('click', () => {
            new Map([
                [ 'csePriNewReferenceNumber', '01' ],
                [ 'cseDetailsFormsCompleted', 'Not Required' ],
                [ 'cseDetailsCooperationStatus', 'Cooperating' ],
                [ 'cseGoodCauseClaimStatus', 'Not Claimed' ],
                [ 'cseChildrenGridParentalStatus', 'Parental Rights Severed' ],
                [ 'cseChildrenGridCustodyStatus', 'Majority of Time with Caregiver' ],
            ]).forEach( (value, key) => { document.getElementById(key).value = value } )
            eleFocus( document.getElementById('cseChildrenGridChildNewReferenceNumber') )
        })
    }
    if (!editMode) {
        actualDate.dateField.closest('.form-group').classList.add('hidden')
        if ("169".includes(userCountyObj?.code) ) { // SECTION_START Fill_Child_Support_PDF_Forms
            h4objects.details.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton float-right-imp" tabindex="-1" style="margin-top: 5px;" id="csForms">Generate CS Forms</button>');
            document.getElementById('csForms').addEventListener('click', () => {
                let cpInfo = nameFuncs.commaNameObject(document.querySelector('#csePriTable .selected td:nth-child(2)').textContent)
                let ncpInfo = nameFuncs.commaNameObject(document.querySelector('#csePriTable .selected td:nth-child(3)').textContent)
                let childList = {};
                let createdList = [...document.querySelectorAll('#childrenTable tbody tr')].forEach( (row, index) => { childList["child" + index] = row.children[1].textContent } );
                const formInfo = { pdfType: "csForms", xNumber: userXnumber, caseNumber: caseId, cpInfo, ncpInfo, ...childList };
                window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank");
            });
        } // SUB_SECTION_END Fill_Child_Support_PDF_Forms
        goodCauseDivs.forEach( ele => hideFormGroupIfNoValue(ele) )
        document.getElementById('csePriTable').addEventListener('click', () => { goodCauseDivs.forEach( ele => hideFormGroupIfNoValue(ele) ) });
        let cseGoodCauseClaimStatusSlider = createSlider({ label: "Show empty fields", title: "Show hidden fields in the Good Cause Claim subheader section.", id: "gccsShowHide", defaultOn: false, classes: "float-right-imp h4-line", })
        h4objects.goodcause.h4.insertAdjacentHTML('afterend', cseGoodCauseClaimStatusSlider);
        document.getElementById('gccsShowHide').addEventListener('click', ele => { ele.target.checked ? ( goodCauseDivs.forEach(ele2 => ele2.classList.remove('hidden') )) : ( goodCauseDivs.forEach( ele2 => hideFormGroupIfNoValue(ele2) )) })
    }
    // SUB_SECTION_START Hide unnecessary fields
    unhideElement(absentParentDivs, false)
    function hideFormGroupIfNoValue(ele) {
        let elementWithValue = ele.querySelector('input, select')
        elementWithValue.value ? ele.classList.remove('hidden') : ele.classList.add('hidden')
    }
    let abpsShowHideSlider = createSlider({ label: "Show hidden fields", title: "Show hidden fields in the Absent Parent subheader section.", id: "abpsShowHide", defaultOn: false, classes: "float-right-imp h4-line", })
    h4objects.absentparentinformation.h4.insertAdjacentHTML('afterend', abpsShowHideSlider);
    document.getElementById('abpsShowHide').addEventListener( 'click', ele => unhideElement(absentParentDivs, ele.target.checked) )
    //
    evalData().then(({ 0: memberData } = {}) => {
        let caseMemberTableChildren = document.querySelector('#csePriTable > tbody').children
        let memberDataObject = {
            cseDetailsCooperationStatus: { label: 'Cooperation', keywords: ["Not Cooperating", ], },
            cseDetailsFormsCompleted: { label: 'Forms', keywords: ["No", ], },
        }
        checkTablesForBlankOrNo(memberData, memberDataObject, caseMemberTableChildren)
    }).catch(err => { console.trace(err) })
}(); // SECTION_END Case_CSE;
!function CaseCSIA() {
    if (!("CaseCSIA.htm").includes(thisPageNameHtm)) { return };//jquery
    let csiahidden = ['middleInitial', 'birthDate', 'ssn', 'gender'].map(item => document.getElementById(item).parentElement)
    // let countyName = userCountyObj?.county ?? ''
    // let birthplaceStateOrProvince = document.getElementById('birthplaceStateOrProvince')
    // let birthplaceCountry = document.getElementById('birthplaceCountry')
    // let birthplaceCounty = document.getElementById('birthplaceCounty')
    let deceasedDateFormGroup = document.getElementById('deceasedDate').parentElement
    // countyName = countyName.replace(/\W/g, '')
    let toggleAbsentParentName = createSlider({ label: "Show extra info", title: "Toggle displaying some name fields", id: "toggleAbsentParentNameSlider", defaultOn: false, classes: "h4-line float-right-imp", })
    h4objects.absentparent.h4.insertAdjacentHTML('afterend', toggleAbsentParentName)
    document.getElementById('toggleAbsentParentNameSlider').addEventListener( 'click', ele => unhideElement(csiahidden, ele.target.checked) )
    unhideElement(csiahidden, false)
    h4objects.address.h4.click()
    deceasedDateFormGroup.classList.add('hidden')
    if (editMode) {
        if (document.getElementById('lastName').value !== '') {
            addValueClassDoEvent(document.getElementById('nameKnown'), 'Yes', 'red-outline', false)
            eleFocus('#deceased')
        } else { eleFocus('#nameKnown') }
    }
    document.getElementById('deceased').addEventListener('change', changeEvent => {
        changeEvent.value === "Yes" ? deceasedDateFormGroup.classList.remove('hidden') : deceasedDateFormGroup.classList.add('hidden')
    })
}(); // SECTION_END Case_CSIA;
!function CaseEarnedIncome() {
    if (!("CaseEarnedIncome.htm").includes(thisPageNameHtm)) { return };
    let ceiIncomeType = document.getElementById('ceiIncomeType'), ceiEmpCountry = document.getElementById('ceiEmpCountry')
    let ceiAddressLabels = ['ceiEmpCountry', 'ceiEmpStreet', 'ceiEmpStreet2', 'ceiEmpCity', 'ceiEmpStateOrProvince', 'ceiEmpZipOrPostalCode', 'ceiPhone', ].map(ele => document.querySelector('label[for=' + ele + ']'))
    let ceiAddressLabelsAndDivs = [...ceiAddressLabels, ...ceiAddressLabels.map(ele => ele.nextElementSibling) ]
    h4objects.actualincome.h4.click();
    tabIndxNegOne('#providerId, #providerSearch, #ceiCPUnitType, #ceiNbrUnits, #ceiTotalIncome')
    function checkEmploymentType() {
        let ceiIncomeTypeValue = ceiIncomeType?.value
        if (ceiIncomeTypeValue === "Self-employment") {
            unhideElement(h4objects.annualselfemploymentcalculation.siblings, true)
            unhideElement(h4objects.incomeprojection.siblings, false)
        } else if (ceiIncomeTypeValue !== "Self-employment" || (!editMode && !document.getElementById('ceiTotalIncome')?.value)) {//move second check outside of this if statement to its own?
            unhideElement(h4objects.annualselfemploymentcalculation.siblings, false)
            unhideElement(h4objects.incomeprojection.siblings, true)
        }
    };
    checkEmploymentType()
    let toggleEmployerAddress = createSlider({ label: "Display Employer Address", title: "Toggle displaying Employer Address labels and fields", id: "toggleEmployerAddressSlider", defaultOn: false, classes: "float-right-imp h4-line", })
    h4objects.details.h4.insertAdjacentHTML('afterend', toggleEmployerAddress)
    document.getElementById('toggleEmployerAddressSlider').addEventListener('click', ele => unhideElement(ceiAddressLabelsAndDivs, ele.target.checked) )
    unhideElement(ceiAddressLabelsAndDivs, false)
    if (editMode) {
        ceiIncomeType.addEventListener('change', changeEvent => {
            checkEmploymentType()
            if ( changeEvent.target.value === "Self-employment") { return }
            addValueClassDoEvent(ceiEmpCountry, 'USA', false, true)
        })
        ifNoPersonUntabEndAndDisableChange('#memberReferenceNumberNewMember', '#ceiPaymentEnd', '#ceiPaymentChange')
        let ceiGrossIncome = document.getElementById('ceiGrossIncome'), ceiGrossAllowExps = document.getElementById('ceiGrossAllowExps')
        ceiGrossIncome.parentElement.insertAdjacentHTML('afterend', '<div id="autoFiftyPercent"><div id="fiftyPercent"></div><button type="button" id="grossButton" class="cButton">Use 50%</button></div>');
        let fiftyPercent = document.getElementById('fiftyPercent')
        fiftyPercent.innerText = '50%: ' + (ceiGrossIncome.value * .5).toFixed(2)
        ceiGrossIncome.addEventListener('input', () => { fiftyPercent.innerText = '50%: ' + (ceiGrossIncome.value * .5).toFixed(2) })
        document.getElementById('grossButton').addEventListener('click', () => {
            ceiGrossAllowExps.value = (ceiGrossIncome.value * .5).toFixed(2)
            doEvent(ceiGrossAllowExps)
            eleFocus(save)
        });
    } else if (!editMode) {
        document.getElementById('earnedIncomeMemberTable').addEventListener('click', () => checkEmploymentType() );
    }
}(); // SECTION_END Case_Earned_Income;
!function _Case_Activity_Pages() {
    if ( !["CaseEmploymentActivity.htm", "CaseEducationActivity.htm", "CaseSupportActivity.htm"].includes(thisPageNameHtm) ) { return };
    if (!editMode) { return };
    document.querySelectorAll('#leaveDetailExtendedEligibilityBegin, #leaveDetailExpires, #redeterminationDate, #extendedEligibilityBegin, #extendedEligibilityExpires, #leaveDetailRedeterminationDue').forEach(ele => { ele.disabled = true })
    tabIndxNegOne('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')
    if (document.querySelector('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')?.value === "") { tabIndxNegOne('#tempLeavePeriodEnd, #leaveDetailTemporaryLeavePeriodTo') }
    !function __CaseSupportActivity() {
        if (!("CaseSupportActivity.htm").includes(thisPageNameHtm)) { return }
        let doNotReset = [ "#tempLeavePeriodBegin", "#tempLeavePeriodEnd", "#activityEnd" ]
        let memberDescription = document.getElementById('memberDescription'), verification = document.getElementById('verification'), planRequired = document.getElementById('planRequired'), activityEnd = document.getElementById('activityEnd'), activityBegin = document.getElementById('activityBegin')
        activityBegin.addEventListener('blur', () => {
            if (memberDescription.value === "PE" || memberDescription.value === "NP") { //extended elig
                activityEnd.value = activityBegin.value
                doEvent(activityEnd)
                eleFocus(save)
            }
        })
        let beforeFirst = rederrortextContent.find(arrItem => arrItem.indexOf('before the first day') > -1) && eleFocus(save)
        memberDescription.addEventListener('change', changeEvent => {
            const autoflllValues = supportAutoFill.get(changeEvent.target.value)
            addValueClassDoEvent(verification, autoflllValues.verif, false, true)
            addValueClassDoEvent(planRequired, autoflllValues.plan, false, true)
            autoflllValues.focus && eleFocus(autoflllValues.focus)
        })
        const supportAutoFill = new Map([
            [ "JS", { verif: "Other", plan: "No", focus: "#hoursPerWeek" } ],
            [ "ES", { verif: "Employment Plan", plan: "Yes", focus: "#planApproved" } ],
            [ "NP", { verif: "Other", plan: "No" } ],
            [ "PE", { verif: "Other", plan: "No" } ],
        ])
        void doEvent(planRequired)
    }(); // SECTION_END Case_Support_Activity;
}(); // SECTION_END _Case_Activity_Pages;
!function _Case_Eligibility_Pages() {
if (thisPageNameHtm.indexOf("CaseEligibilityResult") !== 0) { return };
!function __reviewing_Eligibility() {
    if (!reviewingEligibility) { return };
    let alreadyRedirecting = 0
    setIntervalLimited(() => {
        if ( !alreadyRedirecting && document.querySelector('[id$="TableAndPanelData"]')?.style?.display === "none" ) {
            window.open(document.getElementById("Eligibility Results Selection").firstElementChild.href, '_self')
            alreadyRedirecting = 1
        }
    }, 200, 5)
}(); // SECTION_END reviewing_Eligibility_Redirect;
!function __CaseEligibilityResult() {
    if ( ["CaseEligibilityResultSelection.htm", "CaseEligibilityResultApprovalPackage.htm"].includes(thisPageNameHtm) ) { return };
    let eligTableArray = { // Page: { result.category: ["TextToMatch", tableColumnToHighlight] }
        CaseEligibilityResultPerson: { eligibility: ["Ineligible", 3], inFamilySize: ["No", 5] },
        CaseEligibilityResultOverview: { eligibility: ["Ineligible", 2], inFamilySize: ["No", 4] },
    }
    let eligTableArrayMultiRefNums = {
        CaseEligibilityResultFinancial: [ ["No", 9], ],
        CaseEligibilityResultActivity: [ ["Ineligible", 7], ["Fail", 8] ],
    }
    let eligTableArrayMatch = eligTableArray[thisPageName]
    let tableRows = [...document.querySelectorAll('table > tbody > tr')]
    let setTrIds = tableRows?.forEach(ele => { ele.id = "ref" + (ele.children[0].innerText) })
    function eligHighlight() {
        document.querySelectorAll('select, input:is(.eligibility-highlight)').forEach(ele => { ele.classList.remove('eligibility-highlight', 'ineligible') })
        let selectInputFail = [...document.querySelectorAll('.panel-box-format :is(select, input')].filter(ele => (/\bF\b|\bFail\b/).test(ele.value) ).forEach(ele2 => ele2.classList.add('eligibility-highlight', 'ineligible'));
    }
    function eligHighlightPageLoad() {
        let divFail = [...document.querySelectorAll('#caseEligibilityResultFamilyDetail div.form-group > div')].filter(ele => ele.innerText === "Fail").forEach(ele2 => ele2.classList.add('eligibility-highlight', 'ineligible'))
        if (eligTableArrayMatch) {
            evalData().then(({ 0: people } = {}) => {
                people.forEach((person, i) => {
                    let membNumber = ('reference' in person) ? person.reference : person.ref
                    let personRowChildCells = tableRows.find(row => row.id === 'ref' + membNumber).children
                    if ( !('ageUnderThresholdTest' in person) || person.role === "PRI") {
                        for (let [category, [value, cell] = []] of Object.entries(eligTableArrayMatch)) {
                            if (person[category] === value) { personRowChildCells[cell].classList.add('eligibility-highlight', 'ineligible') }
                        }
                    } else if (person.role === "Child" && person.eligibility === "Ineligible" && person.ageUnderThresholdTest.length < 1) {
                        personRowChildCells[eligTableArrayMatch.eligibility[1]].classList.add('eligibility-highlight', 'ineligible')
                        if (person.inFamilySize === "No") {
                            personRowChildCells[eligTableArrayMatch.inFamilySize[1]].classList.add('eligibility-highlight', 'ineligible')
                        }
                    }
                })
            }).catch(err => { console.trace(err) })
        } else {
            let eligTableArrayMultiRefNumsMatch = eligTableArrayMultiRefNums[thisPageName]
            if (eligTableArrayMultiRefNumsMatch) {
                eligTableArrayMultiRefNumsMatch.forEach( ([eleValue, tableCol] = []) => {
                    let tableData = [...document.querySelectorAll('table > tbody > tr > td:nth-child(' + tableCol + ')')]
                    .filter(tdCell => tdCell.innerText === eleValue)
                    .forEach(match => match.classList.add('eligibility-highlight', 'ineligible'));
                })
            }
        }
        let notInUnit = [...document.querySelectorAll('tbody > tr > td')].filter(ele => ele.textContent === "Not in Unit").forEach(ele2 => ele2.parentElement.classList.add('notInUnit') )
        document.querySelector('div[title="Family Result"]')?.innerText === "Ineligible" && document.querySelector('div[title="Family Result"]').classList.add('eligibility-highlight', 'ineligible')
    }
    queueMicrotask(() => { eligHighlightPageLoad(); eligHighlight() })
    document.querySelector('tbody')?.addEventListener('click', () => eligHighlight() )
}(); // SECTION_END Highlight_eligibility_results;
!function __CaseEligibilityResultApproval() {
    if (!("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) { return };
    if (editMode) {
        if (sessionStorage.getItem('MECH2.TI.' + caseId) !== null) {
            let tempInelig = sanitize.JSON(sessionStorage.getItem('MECH2.TI.' + caseId))
            document.getElementById('type').value = tempInelig.type
            document.getElementById('reason').value = tempInelig.reason
            document.getElementById('beginDate').value = tempInelig.start
            document.getElementById('allowedExpirationDate').value = tempInelig.end
            $('.hasDatepicker').datepicker("hide")
            eleFocus(save)
            return false
        }
        save.addEventListener("click", () => {
            let tempInelig = { type: document.getElementById('type').value, reason: document.getElementById('reason').value, start: document.getElementById('beginDate').value, end: document.getElementById('allowedExpirationDate').value }
            sessionStorage.setItem('MECH2.TI.' + caseId, JSON.stringify(tempInelig))
        })
        $('#beginDate').on("input change", () => {
            if (this.value.length < 10) { return false }
            // let extEligPlus90 = dateFuncs.addDays(document.getElementById('beginDate').value, 90);
            // extEligPlus90 = dateFuncs.formatDate(new Date(extEligPlus90), "ddmmyyyy")
            let extEligPlus90 = dateFuncs.formatDate( dateFuncs.addDays(document.getElementById('beginDate').value, 90), "ddmmyyyy" )
            document.getElementById('allowedExpirationDate').value = extEligPlus90
            doEvent('#allowedExpirationDate')
        })
    }
}(); // SECTION_END Case_Eligibility_Result_Approval;
!function __CaseEligibilityResultFinancial() {
    if (!("CaseEligibilityResultFinancial.htm").includes(thisPageNameHtm)) { return };
    let totalAnnualizedIncome = Number(document.querySelector('label[for="totalAnnualizedIncome"]+div').innerText.replace(/[^0-9.-]+/g, ""))
    let maxAllowed = Number(document.querySelector('label[for="maxIncomeAllowed"]+div').innerText.replace(/[^0-9.-]+/g, ""))
    if (totalAnnualizedIncome > maxAllowed) { document.querySelector('label[for="totalAnnualizedIncome"]').closest('div').classList.add('eligibility-highlight', 'ineligible') }
}(); // SECTION_END Case_Eligibility_Result_Financial;
!function __CaseEligibilityResultSelection() {
    if (!("CaseEligibilityResultSelection.htm").includes(thisPageNameHtm)) { return };
    let eligibilityTableRows = [...document.querySelector('#caseEligibilitySelectionTable > tbody').children]
    const eligibilityResults = {}
    function arrayCreatePush(arr, value) { !Array.isArray(arr) ? arr = [value] : arr.unshift(value); return arr }
    eligibilityTableRows.forEach(ele => {
        let [version, ofVersion] = ele.children[0]?.textContent.split(" of ")
        if (version === ofVersion) {
            ele.classList.add("current"); eligibilityResults.current = arrayCreatePush(eligibilityResults.current, ele)
            if (ele.children[5].textContent === "Unapproved") { ele.classList.add("unapproved"); eligibilityResults.unapproved = arrayCreatePush(eligibilityResults.unapproved, ele) }
            if (ele.children[4].textContent.indexOf("Ineligible") > -1) { ele.classList.add("ineligible"); eligibilityResults.ineligible = arrayCreatePush(eligibilityResults.ineligible, ele) }
            if (ele.children[4].textContent === "Eligible") { ele.classList.add("eligible"); eligibilityResults.eligible = arrayCreatePush(eligibilityResults.eligible, ele) }
        }
    })
    let priorityEligResult = "unapproved" in eligibilityResults ? "eligible" in eligibilityResults ? eligibilityResults.eligible[0] : eligibilityResults.ineligible[0] : eligibilityResults.current[0]
    priorityEligResult.click()
    if (!("unapproved" in eligibilityResults)) {
        document.getElementById('delete').insertAdjacentHTML('afterend', `<div id="goSA" style="display: inline-block; margin-left: 5rem;">
        <button type="button" id="goSAOverview" class="form-button">SA Overview</button>
        <button type="button" id="goSAApproval" class="form-button">SA Approval</button>
    </div>`)
        document.getElementById('goSA').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return };
            clickEvent.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorization' + clickEvent.target.id.slice(4) + '.htm?parm2=' + caseId + '&parm3=' + selectPeriodDates.parm3, '_self');
        })
    };
    tbodiesFocus('#selectDB')
    if ("current" in eligibilityResults) { document.getElementsByClassName('sorting')[1].click() };//sort by program type
}(); // SECTION_END CaseEligibilityResultSelection;
!function __CaseEligibilityResultPerson() {
    if (!("CaseEligibilityResultPerson.htm").includes(thisPageNameHtm)) { return };
    let toLabel = document.createElement('label')
    toLabel.classList.add('to'); toLabel.innerHTML = "to";
    document.getElementById('eligibilityPeriodStart').nextSibling.replaceWith(toLabel)
}(); // SECTION_END Case_Eligibility_Result_Person;
}(); // SECTION_END _Case_Eligibility_Pages;
!function _Case_ServiceAuthorization_Copay_Pages() {
!function __CaseCopayDistribution() {
if (!("CaseCopayDistribution.htm").includes(thisPageNameHtm)) { return };
    if (editMode) {
        waitForTableCells('#providerInformationTable').then(() => {
            let copayProviderId = document.querySelector('#providerInformationTable > tbody > tr.selected > td:nth-child(1)'), overrideReason = document.getElementById('overrideReason'), recoupment = document.getElementById('recoupment'), copay= document.getElementById('copay')
            let storedCopayInfo = sessionStorage.getItem('MECH2.ageCategory.' + caseId + '.' + copayProviderId.textContent)
            if (storedCopayInfo !== null) {
                let copayDist = sanitize.JSON(storedCopayInfo)
                copay.value = copayDist.copay
                recoupment.value = copayDist.recoupment
                overrideReason.value = copayDist.overrideReason
                eleFocus(save)
            }
            save.addEventListener("click", () => {
                let copayDist = {
                    copay: copay.value,
                    recoupment: recoupment.value,
                    overrideReason: overrideReason.value,
                    copayProviderId: copayProviderId.textContent,
                }
                sessionStorage.setItem('MECH2.copayDist.' + caseId + '.' + copayDist.copayProviderId, JSON.stringify(copayDist))
            })
        })
    }
}(); // SECTION_END Case_Copay_Distribution;
if (thisPageName.indexOf("CaseServiceAuthorization") !== 0) { return };
!function __CaseServiceAuthorization_And_Copay() { // Hide_Duplicate_Buttons_when_no_SA
if (!["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) { return }
    if (rederrortextContent.find(arrItem => arrItem.indexOf('No results') > -1)) {
        doNotDupe.pages.push(thisPageNameHtm)
        eleFocus(submitButton)
    }
}(); // SECTION_END Hide_Duplicate_Buttons_when_no_SA;
!function __CaseServiceAuthorizationApprovalPackage() {
    if (!("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) { return }
    let serviceAuthorizationInfoTable = document.getElementById('serviceAuthorizationInfoTable'), providerInfoTable = document.getElementById('providerInfoTable')
    let providerInfoTableRowIndex = 1
    providerInfoTable.addEventListener('click', clickEvent => {
        if (clickEvent.screenX !== 0) {
            providerInfoTableRowIndex = providerInfoTable.querySelector('tbody > tr.selected').rowIndex
        }
    })
    serviceAuthorizationInfoTable.addEventListener('click', () => {
        if (providerInfoTableRowIndex !== providerInfoTable.querySelector('tbody > tr.selected').rowIndex) {
            queueMicrotask(() => {
                providerInfoTable.querySelector('tbody > tr:nth-child(' + providerInfoTableRowIndex + ')').click()
            })
        }
    })
    queueMicrotask(() => {
        serviceAuthorizationInfoTable.rows[1].classList.add('selected')
        providerInfoTable.rows[1].classList.add('selected')
    })
}(); // SECTION_END Case_SA_Approval_Package;
!function __CaseServiceAuthorizationOverview() {
if (!("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm)) { return };
    let status = document.getElementById('status'), providerInfoTable = document.getElementById('providerInfoTable'), copayAmountManual = document.getElementById('copayAmountManual')
    listPageLinksAndList([0, "ProviderOverview",])
    if (typeof userCountyObj !== undefined && userCountyObj.code === "169") {
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
    status.style.width = "15ch"
    status?.closest('.col-lg-4').insertAdjacentHTML('beforeend', '<button type="button" class="cButton float-right-imp" tabindex="-1" id="copySAinfo" style="display: inline-flex;">Copy for Email</button>')
    document.getElementById('providerAddressButton')?.addEventListener('click', () => {
        let selectedProviderChildren = providerInfoTable.querySelector('.selected').children, providerIdInTable = selectedProviderChildren[0].textContent, providerNameInTable = selectedProviderChildren[1].textContent
        evalData({ caseProviderNumber: providerIdInTable, pageName: 'ProviderAddress', evalString: '0.0', caseOrProvider: 'provider', }).then(providerAddress => {
            const providerMailToAddress = determineProviderAddress(providerAddress, providerNameInTable)
            copy(providerMailToAddress, providerMailToAddress, 'notitle')
        }).catch(err => { console.trace(err) });
    })
    function determineProviderAddress(providerAddr, providerName) {
        if (providerAddr.mailingStreet1 === '') { return providerName + "\n" + providerAddr.mailingSiteHomeStreet1 + " " + providerAddr.mailingSiteHomeStreet2 + "\n" + providerAddr.mailingSiteHomeCity + ", " + providerAddr.mailingSiteHomeState + " " + providerAddr.mailingSiteHomeZipCode }
        else { return providerName + "\n" + providerAddr.mailingStreet1 + " " + providerAddr.mailingStreet2 + "\n" + providerAddr.mailingCity + ", " + providerAddr.mailingState + " " + providerAddr.mailingZipCode }
    }
    document.getElementById('billingForm')?.addEventListener('click', () => fetchCopay("billingForm"))
    document.getElementById('copySAinfo')?.addEventListener('click', () => fetchCopay("clipboard"))
    async function fetchCopay(destination) {
        let providerNameInTable = document.querySelector('#providerInfoTable > tbody > tr.selected > td:nth-child(2)').textContent
        if (copayAmountManual?.value) { billingFormInfo(copayAmountManual.value, destination) }
        else {
            evalData({ caseProviderNumber: caseId, pageName: 'CaseCopayDistribution', dateRange: selectPeriodDates.parm3, caseOrProvider: 'case', }).then(result => { getCopayFromResult(result, destination) })
                .catch(err => { console.trace(err) });
        }
        function getCopayFromResult(result, destination) {
            let copayAmountGet = document.getElementById('copayAmountGet')
            if (result === undefined) {
                copayAmountGet.outerHTML = '<input class="centered-text form-control" style="height: 22px; width: 40px;" id="copayAmountManual"></input><a href="/ChildCare/CaseCopayDistribution.htm?parm2=' + caseId + '&parm3=' + selectPeriodDates.parm3 + '" target="_blank">Copay Page</a>'
                snackBar('Auto-retrieval of copay failed.', 'notitle')
            } else {
                let { 1: copayArray } = result
                const providerMatch = copayArray.find(provider => providerNameInTable === provider.providerName.replace(/\\/g, '').replace(/&amp/g, '&') ), copayInt = String(parseInt(providerMatch.copay))
                document.getElementById('copayAmountGet').textContent = copayInt
                return saFilterEvalData(copayInt, destination)
            }
        }
        async function saFilterEvalData(integerCopay, destination) {
            evalData().then(({ 0: providers, 1: children } = {}) => {
                const providerMatch = providers.find( saRow => providerNameInTable === saRow.providerName.replace(/\\/g, '').replace(/&amp/g, '&') )
                return billingFormInfo(children.filter( child => child.providerRowIndex === providerMatch.providerRowIndex ), integerCopay, destination)
            }).catch(err => { console.trace(err) });
        }
        function billingFormInfo(childMatches, integerCopay, destination) {
            let childList = {};
            for (let child in childMatches) {
                let thisChild = childMatches[child]
                childList[child] = { name: nameFuncs.commaNameReorder(thisChild.childName), authHours: thisChild.authorizedHours, ageCat0: thisChild.ageRateCategory, ageCat1: thisChild.ageRateCategory2 }
            }
            let oCaseName = nameFuncs.commaNameObject(pageTitle)
            const formInfo = {
                pdfType: "BillingForm",
                xNumber: userXnumber,
                caseFirstName: oCaseName.first,
                caseLastName: oCaseName.last,
                caseName: oCaseName.full,
                caseNumber: caseId,
                startDate: selectPeriodDates.start,
                providerId: document.querySelector('#providerInfoTable .selected td:nth-child(1)').textContent,
                providerName: document.querySelector('#providerInfoTable .selected td:nth-child(2)').textContent,
                copayAmount: integerCopay ? integerCopay : document.getElementById('copayAmountManual').value,
                children: childList,
            }
            if (formInfo.copayAmount.length && destination === "billingForm") { window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank") }
            else if (formInfo.copayAmount.length && destination === "clipboard") {
                let childInfoArray = []
                for (let child in formInfo.children) {
                    let array1 = [[["Child:", formInfo.children[child].name], ["Authorized Hours:", formInfo.children[child].authHours], ["Age Category:", formInfo.children[child].ageCat0 ?? formInfo.children[child].ageCat1], ["Authorization Starts:", childMatches[child].saBegin]]
                                  .map(item => item.join(" "))].join()
                    childInfoArray.push(array1)
                    let array2 = [[["Max Rates:", "Hourly: $", childMatches[child].hourly ?? childMatches[child].hourly2], ["Daily: $", childMatches[child].daily ?? childMatches[child].daily2], ["Weekly: $", childMatches[child].weekly ?? childMatches[child].weekly2], ["Provider Primary/Secondary Designation:", childMatches[child].providerDesignation ?? childMatches[child].providerDesignation2], ["\n"]]
                                  .map(item => item.join(" "))].join()
                    childInfoArray.push(array2)
                }
                let joinedChildInfoArray = childInfoArray.join("\n").replace(/,\n/g, "\n").replace(/,/g, ",   ")
                joinedChildInfoArray += "\nCopayment for biweekly period " + selectPeriodDates.range + ": $" + formInfo.copayAmount
                navigator.clipboard.writeText(joinedChildInfoArray)
                snackBar('Copied Service Authorization Info!', 'notitle')
            }
        }
    }
}(); // SECTION_END Case SA_Overview Fill_manual_Billing_Forms;
}();
!function CaseExpense() {
    if (!("CaseExpense.htm").includes(thisPageNameHtm)) { return };
    h4objects.actualexpense.h4.click();
    if (editMode) {
        let paymentEndDate = document.getElementById('paymentEndDate')
        ifNoPersonUntabEndAndDisableChange('#refPersonName', paymentEndDate, '#paymentChangeDate')
        paymentEndDate.addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
        })
        tempIncomes('temporaryExpense', 'paymentEndDate')
    }
}(); // SECTION_END Case_Expense;
!function CaseJobSearchTracking() {
    if (!("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) { return }
    document.getElementById('hoursUsed').addEventListener('keydown', keydownEvent => {
        if (!['Enter', 'Tab'].includes(keydownEvent.key) ) { return }
        keydownEvent.preventDefault()
        keydownEvent.stopPropagation()
        keydownEvent.stopImmediatePropagation()
        save.click()
    })
}(); // SECTION_END Case_Job_Search_Tracking;
!function CaseMember() {
    if (!("CaseMember.htm").includes(thisPageNameHtm)) { return }
    document.querySelector('label[for="memberReferenceNumber"]').onclick = () => void window.open('/ChildCare/CaseMemberHistory.htm?parm2=' + caseId, '_blank')
    document.getElementById('memberBirthDate')?.insertAdjacentHTML('afterend', '<div style="display: inline-block; margin-left: 15px;" id="birthMonths">')
    let today = new Date(), birthMonths = document.getElementById('birthMonths'), memberBirthDate = document.getElementById('memberBirthDate')
    let caseMemberTable = document.getElementById('caseMemberTable'), caseMemberTableChildren = caseMemberTable?.children[1]?.children
    function calculateCurrAge(birthDate) {
        let monthsAge = dateFuncs.getMonthDifference(today, birthDate)
        let age = { years: ~~(monthsAge / 12), months: monthsAge % 12 }
        let birthMonthsText = monthsAge < 48 ? age.years + 'y ' + age.months + 'm (' + monthsAge + 'm)' : age.years + 'y ' + age.months + 'm'
        if (monthsAge < 13) { birthMonthsText = monthsAge + (monthsAge === 1 ? ' month' : ' months') }
        return birthMonthsText
    }
    function determineChildAge(determinationDate, memberAge, birthDate) {
        let plusAge = memberAge.includes("+") ? '+' : ''
        let monthsAge = dateFuncs.getMonthDifference(determinationDate, birthDate)
        let age = { years: ~~(monthsAge / 12), months: monthsAge % 12 }
        let birthMonthsText = monthsAge < 48 ? age.years + 'y ' + age.months + 'm' + plusAge + ' (' + monthsAge + 'm)' : age.years + 'y ' + age.months + 'm' + plusAge
        if (monthsAge < 13) { birthMonthsText = monthsAge + (monthsAge === 1 ? ' month' : ' months') }
        return birthMonthsText
    }
    evalData().then(({ 0: memberData} = {}) => {
        let memberDataObject = {
            memberBirthDateVerification: { label: 'BD', keywords: ["No Verification Provided"], },
            memberIdVerification: { label: 'ID', keywords: ["No Verification Provided"], },
            memberSsn: { label: 'SSN', keywords: [""], requiredFunc(membObj) { return membObj.memberRelationshipToApplicant !== "Not Related" }},
            memberKnownRace: { label: 'Race', keywords: [""], },
        }
        checkTablesForBlankOrNo(memberData, memberDataObject, caseMemberTableChildren)
        let memberObject = {}
        for (let member in memberData) {
            let memberAge = memberData[member].memberAge
            if (parseInt(memberAge) > 5) { continue }
            let memberTableAgeCell = caseMemberTableChildren[member].children[2]
            let birthDate = new Date(memberData[member].memberBirthDate)
            memberTableAgeCell.textContent = determineChildAge(new Date(selectPeriodDates.start), memberAge, birthDate)
            memberObject[memberData[member].memberReferenceNumber] = calculateCurrAge(birthDate)
        }
        document.querySelector('table > thead > tr > td:nth-child(3)').textContent = "Age (in BWP)"
        caseMemberTable?.addEventListener('click', () => {
            let memberNumber = [...caseMemberTableChildren].find(ele => ele.classList.contains("selected")).firstElementChild.textContent
            if (memberObject[memberNumber]) {
                birthMonths.textContent = "Curr: " + memberObject[memberNumber]
            } else { birthMonths.textContent = "" }
        })
    }).catch(err => { console.trace(err) })
    if (!editMode) {
        document.getElementById('raceCheckBoxes')?.parentElement.classList.add('hidden')
    }
    if (editMode && !appModeNotEdit) {
        let raceLabels = [...document.querySelectorAll('#raceCheckBoxes label')]
        raceLabels.find(ele => ele.innerText.includes('Alaskan Native')).innerText = 'American Indian or AK Native';
        raceLabels.find(ele => ele.innerText.includes('Pacific Islander')).innerText = 'Pacific Islander or HI Native';
        tabIndxNegOne('#memberAlienId, #memberDateOfDeath')
        let membRefNum = document.getElementById('memberReferenceNumber') //hidden when editing existing
        membRefNum?.addEventListener('blur', fillMemberData)
        function fillMemberData() { //autofilling
            const memberFillData = {
                memberSsnVerification: { id: "memberSsnVerification", value: "SSN Not Provided", class: "red-outline", doEvent: false, },
                memberBirthDateVerification: { id: "memberBirthDateVerification", value: "No Verification Provided", class: "red-outline", doEvent: false, },
                memberIdVerification: { id: "memberIdVerification", value: "No Verification Provided", class: "red-outline", doEvent: false, },
                memberKnownRace: { id: "memberKnownRace", value: "No", class: "red-outline", doEvent: true, },
                memberSpokenLanguage: { id: "memberSpokenLanguage", value: "English", class: "red-outline", doEvent: true, },
                memberWrittenLanguage: { id: "memberWrittenLanguage", value: "English", class: "red-outline", doEvent: true, },
                memberNeedsInterpreter: { id: "memberNeedsInterpreter", value: "No", class: "red-outline", doEvent: false, },
            }
            for (let memberData in memberFillData) {
                let member = memberFillData[memberData];
                let memberDataField = document.getElementById(member.id)
                !memberDataField.value && addValueClassDoEvent(memberDataField, member.value, member.class, member.doEvent)
            }
            if (membRefNum.value > 2 && membRefNum.value < 11) {
                let memberRelationshipToApplicant = document.getElementById('memberRelationshipToApplicant')
                if (!memberRelationshipToApplicant.value) { addValueClassDoEvent(memberRelationshipToApplicant, "Child", "red-outline", true) }
            }
            let arrivalDate = document.querySelector('#arrivalDate:not(:disabled)')
            arrivalDate && addValueClassDoEvent(arrivalDate, "", 'red-outline', false)
        }
        fillMemberData()
    }
}(); // SECTION_END Case_Member;
!function CaseMemberII() {
    if (!("CaseMemberII.htm").includes(thisPageNameHtm)) { return }
    if (editMode && !appModeNotEdit) {
        let memberMaritalStatus = document.getElementById('memberMaritalStatus'), memberCitizenshipVerification = document.getElementById('memberCitizenshipVerification'), memberSpouseReferenceNumber = document.getElementById('memberSpouseReferenceNumber'), membRef = document.getElementById('memberReferenceNumberNewMember')
        function fillMemberIIDataForChildren() {
            membRef ??= document.querySelector('table > tbody > tr.selected > td:nth-child(1)')
            let membRefNum = membRef.nodeName === "SELECT" ? parseInt(membRef.value) : parseInt(membRef.textContent)
            if ( isNaN(membRefNum) || membRefNum < 3 || membRefNum > 10 ) { return }
            const memberiiFillDataForChildren = {
                memberMaritalStatus: { id: "memberMaritalStatus", value: "Never Married", class: 'red-outline', doEvent: true, },
                memberLastGradeCompleted : { id: "memberLastGradeCompleted", value: "Pre-First Grade or Never Attended", class: 'red-outline', doEvent: false },
                memberUSCitizen : { id: 'memberUSCitizen', value: "Yes", class: 'red-outline', doEvent: true },
                memberCitizenshipVerification : { id: 'memberCitizenshipVerification', value: "No Verification Provided", class: 'red-outline', doEvent: false },
            }
            for (let memberFillData in memberiiFillDataForChildren) {
                let member = memberiiFillDataForChildren[memberFillData];
                let memberDataField = document.getElementById(member.id);
                !memberDataField.value && addValueClassDoEvent(memberDataField, member.value, member.class, member.doEvent);
            };
            memberSpouseReferenceNumber.tabIndex = '-1'
            eleFocus(memberCitizenshipVerification)
        }
        fillMemberIIDataForChildren()
        membRef?.addEventListener( 'blur', () => fillMemberIIDataForChildren() )
    }
    evalData().then(({ 0: memberData } = {}) => {
        let caseMemberTableChildren = document.querySelector('#memberIITable > tbody').children
        let memberDataObject = {
            memberUSCitizen: { label: 'Cit', keywords: ["", "Unknown", ], requiredFunc(membObj) { return Number(membObj.memberAge) < 15 }},
            memberCitizenshipVerification: { label: 'Cit Ver', keywords: ["No Verification Provided", "", ], requiredFunc(membObj) { return Number(membObj.memberAge) < 15 }},
            memberMaritalStatus: { label: 'Marr', keywords: [""], },
        }
        checkTablesForBlankOrNo(memberData, memberDataObject, caseMemberTableChildren)
    }).catch(err => { console.trace(err) })
}(); // SECTION_END Case_Member_II;
!function CaseOverview() {
    if (!("CaseOverview.htm").includes(thisPageNameHtm)) { return };
    $('#participantInformationData').DataTable().order([1, 'asc']).draw() // jQuery table sort order
    let redetDate = document.querySelector('label[for="redeterminationDueDate"]').parentElement.nextElementSibling?.nextElementSibling?.innerText
    if (redetDate) {
        submitButton.insertAdjacentHTML('afterend', '<button type="button" id="copyFollowUpButton" class="cButton afterH4" tabindex="-1">Follow Up Date</button>');
        document.getElementById('copyFollowUpButton').addEventListener('click', () => {
            let redetPlus = dateFuncs.formatDate( dateFuncs.addDays(redetDate, 44), "mmddyyyy")
            copy(redetPlus, redetPlus, 'notitle')
        });
    }
    let programInformationData = document.getElementById('programInformationData')
    waitForElmHeight('#programInformationData > tbody > tr > td').then(() => {
        let programInformationDataTbody = programInformationData.querySelector('tbody'), programInformationTrows = [...programInformationDataTbody.children], trLength = programInformationTrows.length
        let stickyTrs = programInformationTrows.filter( ele => ["MFIP", "DWP", "FS"].includes(ele.firstElementChild.innerText) )
        if (programInformationTrows.length > 20) {
            programInformationTrows.slice(20).forEach(ele => {
                if (!["MFIP", "DWP", "FS"].includes(ele.firstElementChild.innerText)) {
                    ele.classList.add('hiddenRow')
                }
            })
            programInformationData.classList.add('toggledTable')
            let overviewStyle = cssStyle()
            const invisEle = document.createElement('div')
            overviewStyle.replaceSync(doTableStyleToggle(invisEle, 'hiddenRow') + " .hiddenRow { display: none !important; }" );
            let unhideElementProgInfo = createSlider({ label: 'Show hidden rows', title: "Shows or hides CCAP rows exceeding 20, and 'HC' / 'WB' rows.", id: 'unhideElementProgInfo', defaultOn: false, classes: 'float-right-imp h4-line' })
            h4objects.programinformation.h4.insertAdjacentHTML('afterend', unhideElementProgInfo)
            let notHiddenTrLength = programInformationTrows.filter( ele => !ele.classList.contains('hiddenRow') ).length
            document.getElementById('unhideElementProgInfo').addEventListener('click', clickEvent => {
                let toggleRule = doTableStyleToggle(invisEle, 'hiddenRow')
                if (clickEvent.target.checked === true) {
                    overviewStyle.replaceSync(toggleRule + " .hiddenRow { display: table-row; }")
                    calculateAndSetBottomHeight(programInformationData, trLength, stickyTrs)
                } else {
                    overviewStyle.replaceSync(toggleRule + " .hiddenRow { display: none; }")
                    calculateAndSetBottomHeight(programInformationData, notHiddenTrLength, stickyTrs)
                }
            })
            calculateAndSetBottomHeight(programInformationData, notHiddenTrLength, stickyTrs);
            setTimeout(() => { programInformationDataTbody.style.scrollSnapAlign = "start" }, 500)
        } else { calculateAndSetBottomHeight(programInformationData, trLength, stickyTrs) }
    })
    function calculateAndSetBottomHeight(tableElement, tableRowCount, elementQuery) {
        tableElement = sanitize.query(tableElement)
        let heightDivByCount = tableElement.getBoundingClientRect().height / tableRowCount
        elementQuery = Array.isArray(elementQuery) ? elementQuery : sanitize.query(elementQuery)
        let bottomHeights = [...elementQuery].reverse().forEach((ele, index) => { ele.classList.add('stickyRow'); ele.style.bottom = index * heightDivByCount + 'px' });
    };
    programInformationData.addEventListener('click', () => {
        let providerTableTr = document.querySelector('#providerInformationData > tbody').children
        let addLinksToProviders = [...providerTableTr].forEach(ele => {
            let childTd = ele.firstElementChild
            if (childTd.textContent > 0) { childTd.innerHTML = '<a href="ProviderOverview.htm?providerId=' + childTd.textContent + '" target="_blank">' + childTd.textContent + '</a>' }
        })
    })
}(); // SECTION_END Case_Overview;
!function CasePageSummary() {
    if (!("CasePageSummary.htm").includes(thisPageNameHtm)) { return }
    let wrapUpDropDown = document.querySelector('[id="Wrap Up"] > a')
    if (wrapUpDropDown && !wrapUpDropDown.classList.contains('disabled_lightgray') ) {
        submitButton.insertAdjacentHTML('afterend', '<a href="/ChildCare/CaseWrapUp.htm?parm2=' + caseId + '&parm3=' + selectPeriodDates.parm3 + '"> <input class="form-button" type="button" name="wrapUp" id="wrapUp" value="Wrap-Up" title="Wrap-Up"></a>')
        doNotDupe.buttons.push('#wrapUp')
    }
}(); // SECTION_END Case_Page_Summary;
!function CaseParent() {
    if (!("CaseParent.htm").includes(thisPageNameHtm)) { return };
    doNotDupe.doNotUnderline.push('new', 'deleteParent', 'remove')
    let caseMemberTableChildren = document.querySelector('#parentMemberTable > tbody').children
    evalData().then(({ 0: memberData} = {}) => {
        let memberDataArray = [
            { key: "parentVerification", label: 'Parentage', keywords: ["No Verification Provided" ] },
        ]
        memberData?.forEach( member => {
            let noResponses = member.childDetails.map(child => {
                return memberDataArray.map( memberDataItem => { if ( (memberDataItem.keywords).includes(child[memberDataItem.key]) ) { return child.childReferenceNumber } })//.filter(item => item)
            }).flat().filter(item => item).join(', ')
            if (noResponses) {
                caseMemberTableChildren[member.rowIndex].children[0].insertAdjacentHTML('beforeend', '<span class="float-right-imp" style="color: var(--textColorNegative);">' + noResponses + '</span>')
            }
        })
    }).catch(err => { console.trace(err) })
}(); // SECTION_END Case_Parent;
!function CasePaymentHistory() {
    if (!("CasePaymentHistory.htm").includes(thisPageNameHtm)) { return };
    document.querySelectorAll('#paymentHistoryTable > tbody > tr > td:nth-of-type(3)').forEach(ele => {
        ele.innerHTML = '<td><a href="FinancialBilling.htm?parm2=' + caseId + '&parm3=' + ele.innerText.replace(" - ", "").replaceAll("/", "") + '", target="_blank">' + ele.innerText + '</a></td>'
    });
    let providerTableList = new Set(), childTableList = new Set()
    let getPaymentHTML = '<div style="display: flex; gap: 10px;" id="paymentFilterDiv"><select style="width: fit-content;" class="form-control" id="filterProvider"><option value>Provider Filter...</option></select>'
    + '<select style="width: fit-content;" class="form-control" id="filterChild"><option value>Child Filter...</option></select>'
    + '<button class="cButton" type="button" id="sendPaymentInfoToCB">Copy Payments</button></div>'
    secondaryActionArea.insertAdjacentHTML('beforeend', getPaymentHTML)
    let paymentPeriodBegin = document.getElementById('paymentPeriodBegin'), paymentPeriodEnd = document.getElementById('paymentPeriodEnd'), selectionProvider = document.getElementById('filterProvider'), selectionChild = document.getElementById('filterChild')
    addDateControls("month", paymentPeriodBegin, paymentPeriodEnd)
    evalData().then(({ 0: providerResult, 1: childResult } = {}) => {
        for (let row in providerResult) { providerTableList.add(providerResult[row].providerName) }
        for (let row in childResult) { childTableList.add(childResult[row].childName) }
        const providerSelectList = [...providerTableList].map(provider => "<option>" + provider + "</option>").join(''), childSelectList = [...childTableList].map(child => "<option>" + child + "</option>").join('')
        selectionProvider.insertAdjacentHTML('beforeend', providerSelectList)
        selectionChild.insertAdjacentHTML('beforeend', childSelectList)
        document.getElementById('sendPaymentInfoToCB').addEventListener('click', () => {
            getProviderAndChildPaymentInfo(selectionProvider.value, selectionChild.value)
        })
        function getProviderAndChildPaymentInfo(providerName, childName) {
            let caseName = nameFuncs.commaNameReorder(pageTitle)
            let concatPaymentHTML = { providerPaymentsTotal: 0, providerPaymentFilter: '', childPaymentsTotal: 0 }
            const childPaymentTableArray = [], providerPaymentTableArray = []
            let selectedChild = selectionChild?.value
            if (selectedChild) {
                concatPaymentHTML.childsProviderSetList = new Set()
                let childNameProper = nameFuncs.commaNameReorder(selectionChild?.value)
                childResult.forEach(thisRow => {
                    let correspondingTableOneRow = providerResult[thisRow.rowIndex2]
                    if (thisRow.childName !== selectedChild || (providerName && !!(correspondingTableOneRow.providerName !== providerName))) { return }
                    concatPaymentHTML.childsProviderSetList.add(correspondingTableOneRow.providerName)
                    childPaymentTableArray.push([ correspondingTableOneRow.billingPeriod, correspondingTableOneRow.providerName, thisRow.amount, thisRow.childName, ])
                    concatPaymentHTML.childPaymentsTotal += Number( thisRow.amount.slice(1) * 100 )
                })
                let childPaymentTableHeaderHTML = "<thead><tr><td>Care Period</td><td>Provider</td><td>Pre-Copay $</td><td>Child</td></tr></thead>"
                childPaymentTableArray.sort( (a, b) => sanitize.date(b[0].slice(0, 10), "number") > sanitize.date(a[0].slice(0, 10), "number") )
                let childPaymentTbodyHTML = childPaymentTableArray.map(trow => '<tr><td>' + trow.join('</td><td>') + '</td></tr>').join('')
                concatPaymentHTML.childTable = [ '<br><div class="marginBottom">Payment filter applied to table below. Child filter selected: ', childNameProper, '.</div><table class="marginBottom">', childPaymentTableHeaderHTML, childPaymentTbodyHTML, '</table>' ].join('')
                let childAmountsTotalCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USA' }).format( (concatPaymentHTML.childPaymentsTotal / 100) ).slice(4)
                concatPaymentHTML.footer = "<div>Pre-Copay amounts total: $" + childAmountsTotalCurrency + ".</div><div>(Pre-Copay $ means the payment amount calculated for the child prior to deducting the household's copay from the provider payment.)</div>"
            }

            let providerNameList = providerName.length ? [providerName]
            : concatPaymentHTML.childsProviderSetList?.size ? [...concatPaymentHTML.childsProviderSetList]
            : providerTableList
            concatPaymentHTML.style = '<style>table { border: 2px solid green !important; font-size: 24px; white-space: nowrap; table-layout: fixed; } table td { padding: 2px 20px; } table thead td { font-weight: 700; background: #07416f; color: white; } table tbody td { color: black; background: white; } .marginBottom { margin-bottom: 10px; }</style>'
            concatPaymentHTML.tableOneText = [ '<div class="marginBottom" id="casePaymentTitle"><span>', caseName, ' - ', caseId, ' - CCAP payments from ', paymentPeriodBegin.value, ' to ', paymentPeriodEnd.value, '. </span>' ].join('')
            providerNameList.forEach(provider => {
                providerResult.forEach(thisRow => {
                    if (thisRow.providerName !== provider) { return };
                    providerPaymentTableArray.push([ thisRow.billingPeriod, thisRow.providerName, thisRow.issuanceAmount, thisRow.copayAmount, thisRow.recoupAmount ])
                    concatPaymentHTML.providerPaymentsTotal += Number( thisRow.issuanceAmount.slice(1) * 100 )
                })
                let providerPaymentsTotalCurrency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USA' }).format( (concatPaymentHTML.providerPaymentsTotal / 100) ).slice(4)
                concatPaymentHTML.paymentsTotal = '<span>Payments Total: $' + providerPaymentsTotalCurrency + '.</span></div>'
            })
            providerPaymentTableArray.sort( (a, b) => sanitize.date(b[0].slice(0, 10), "number") > sanitize.date(a[0].slice(0, 10), "number") )
            let providerPaymentTbodyHTML = providerPaymentTableArray.map(trow => '<tr><td>' + trow.join('</td><td>') + '</td></tr>').join('')
            let providerPaymentTableHeaderHTML = '<thead><tr><td>Care Period</td><td>Provider</td><td>Payment</td><td>Copay</td><td>Recoup</td></tr></thead>'
            concatPaymentHTML.providerPaymentFilter = providerName ? '<div class="marginBottom">Payment filter applied to table below. Provider filter selected: ' + providerName + '.</div>' : ''
            concatPaymentHTML.providerTable = '<table><thead><tr><td>Care Period</td><td>Provider</td><td>Payment</td><td>Copay</td><td>Recoup</td></tr></thead>' + providerPaymentTbodyHTML + '</table>'

            let tableHTML = [ concatPaymentHTML.tableOneText, concatPaymentHTML.paymentsTotal, concatPaymentHTML.providerPaymentFilter, concatPaymentHTML.providerTable, (concatPaymentHTML.paymentFilter ?? ''), (concatPaymentHTML.childTable ?? ''), (concatPaymentHTML.footer ?? '') ].join('')
            // let tableHTML = [ concatPaymentHTML.style, concatPaymentHTML.tableOneText, concatPaymentHTML.paymentsTotal, concatPaymentHTML.providerPaymentFilter, concatPaymentHTML.providerTable, (concatPaymentHTML.paymentFilter ?? ''), (concatPaymentHTML.childTable ?? ''), (concatPaymentHTML.footer ?? '') ].join('')
            // copyFormattedHTML('<body style="color: unset !important; background: unset !important;"><div id="paymentStyleAndData">' + tableHTML + '</div></body>')
            copyFormattedHTML({ html: '<div id="paymentStyleAndData">' + tableHTML + '</div>', addTableStyle: true })
            snackBar('Copied Payments', 'notitle')
        }
    }).catch(err => { console.trace(err) })
}(); // SECTION_END Case_Payment_History;
!function CaseRedetermination() {
    if (!("CaseRedetermination.htm").includes(thisPageNameHtm)) { return };
    let redeterminationDueDate = document.getElementById('redeterminationDueDate')
    let suspendPlus45 = sessionStorage.getItem('MECH2.suspendPlus45')
    if (iFramed && suspendPlus45) {
        if (!editMode) {
            if ( rederrortextContent.find(arrItem => arrItem.indexOf('CASE LOCKED') > -1) ) { sessionStorage.setItem('MECH2.suspendPlus45', "Case Locked") }
            else if (suspendPlus45 === 'needsWrapUp') { document.getElementById('wrapUp').click() }
            else { document.getElementById('edit').click() }
        }
        if (editMode) {
            suspendPlus45 = sanitize.JSON(suspendPlus45)
            if (caseId === suspendPlus45.id) {
                redeterminationDueDate.value = suspendPlus45.delayDate
                doEvent(redeterminationDueDate)
                sessionStorage.setItem('MECH2.suspendPlus45', 'needsWrapUp')
                save.click()
            }
        }
    } else {
        sessionStorage.removeItem('MECH2.suspendPlus45')
        $('#receiveDate').on('input change', () => { //jQuery
            if ($(this).val().length === 10 && Math.abs(new Date().getFullYear() - $(this).val().slice(6)) < 2) {
                preventKeys(["Tab"])
                eleFocus(save)
                $('.hasDatepicker').datepicker("hide")
            }
        })
    }
}(); // SECTION_END Case_Redetermination;
!function CaseReinstate() {
    if (!("CaseReinstate.htm").includes(thisPageNameHtm)) { return };
    let redText = rederrortextContent.find(arrItem => arrItem.indexOf('This case can only be reinstated in the period') > -1)
    if (redText) {
        let redTextSplit = redText.textContent.split(': ')
        let reinstatePeriod = redTextSplit[1].replace(/[\/\- ]/g, '')
        redText.innerHTML = '<a href="/ChildCare/CaseReinstate.htm?parm2=' + caseId + '&parm3=' + reinstatePeriod + '" target="_self" style="color: #CC0000 !important; text-decoration: underline;">' + redText.textContent + '</a>'
    }
}(); // SECTION_END Case_Reinstate;
!function CaseSchool() {
    if (!("CaseSchool.htm").includes(thisPageNameHtm)) { return }
    if (!editMode) { return }
    let memberSchoolStatus = document.getElementById('memberSchoolStatus'), memberSchoolType = document.getElementById('memberSchoolType'), memberKindergartenStart = document.getElementById('memberKindergartenStart'),
        memberSchoolVerification = document.getElementById('memberSchoolVerification'), memberHeadStartParticipant = document.getElementById('memberHeadStartParticipant'), memberReferenceNumberNewMember = document.getElementById('memberReferenceNumberNewMember')
    let today = Date.now()
    async function kindergartenStartDate(memberArray, memberNumber) {
        let memberMatch = memberArray.filter(obj => obj.memberReferenceNumber === memberNumber)
        let birthDate = new Date(memberMatch[0].memberBirthDate), approxAge = new Date().getFullYear() - birthDate.getFullYear()
        if (approxAge < 17) {
            let eightteenButStillHHmember = document.getElementById('memberFinancialSupport50PercentOrMore')
            eightteenButStillHHmember.value = ""
            eightteenButStillHHmember.disabled = true
        }
        if (approxAge > 10) { return false }
        let fifthBirthDate = new Date(birthDate.setFullYear(birthDate.getFullYear() + 5)), fifthBirthDateValue = sanitize.date(fifthBirthDate, "number")
        let laborDay = dateFuncs.getDateofWeekdayWithWeek(fifthBirthDate.getFullYear(), 8, 0, 1), laborDayValue = sanitize.date(laborDay, "number")
        if (fifthBirthDateValue > laborDayValue) { laborDay = dateFuncs.getDateofWeekdayWithWeek(fifthBirthDate.getFullYear() + 1, 8, 0, 1); laborDayValue = sanitize.date(laborDay, "number") }
        let olderThanKindergartenStart = today > laborDayValue ? 1 : 0
        if (olderThanKindergartenStart) {
            !memberSchoolStatus.value && (memberSchoolStatus.value = "Fulltime")
            !memberSchoolType.value && (memberSchoolType.value = "Preschool Through  Sixth Grade")
        } else {
            !memberSchoolStatus.value && (memberSchoolStatus.value = "Not Attending School")
            !memberSchoolType.value && (memberSchoolType.value = "Child Not in School")
        }
        !memberHeadStartParticipant.value && (memberHeadStartParticipant.value = "No")
        !memberSchoolVerification.value && (memberSchoolVerification.value = "No Verification  Provided")
        !memberKindergartenStart.value && (memberKindergartenStart.value = dateFuncs.formatDate(dateFuncs.addDays(laborDay, 3), "mmddyyyy"))
        if (actualDate.dateField?.disabled || actualDate.dateField?.value) { eleFocus('#saveDB') }
        else { eleFocus(actualDate.dateField) }
    }
    let schoolMemberTableSelected = document.querySelectorAll('#schoolMemberTable > tbody > tr.selected')
    if (schoolMemberTableSelected.length === 1) {
        evalData({ pageName: 'CaseMember', evalString: '0', }).then(memberArray => {
            let memberNumber = schoolMemberTableSelected[0].children[0].textContent
            if (Number(memberNumber) > 2) { kindergartenStartDate(memberArray, memberNumber) }
        }).catch(err => { console.trace(err) })
    }
    if (memberReferenceNumberNewMember) {
        evalData({ pageName: 'CaseMember', evalString: '0', }).then(memberArray => {
            memberReferenceNumberNewMember.addEventListener('blur', blurEvent => {
                let memberNumberValue = memberReferenceNumberNewMember.value
                if (Number(blurEvent.target.value) > 2) { kindergartenStartDate(memberArray, memberNumberValue) }
            })
        }).catch(err => { console.trace(err) })
    }
}(); // SECTION_END Case_School;
!function CaseSpecialNeeds() {
    if (!["CaseSpecialNeeds.htm"].includes(thisPageNameHtm)) { return }
    document.getElementById('reasonText')?.setAttribute('type', 'text')
}(); // SECTION_END Case_Special_Needs;
!function CaseTransfer() {
    if (!("CaseTransfer.htm").includes(thisPageNameHtm)) { return };
    if (iFramed && !editMode) {
        window.onmessage = ([ status, transferCaseNum ] = []) => {
            if (event.origin !== "https://mec2.childcare.dhs.state.mn.us") return false;
            if (status === "newTransfer") { startWorkerTransfer(transferCaseNum) }
        }
    }
    let ssTransferCase = 'MECH2.caseTransfer.' + caseId
    let ssError = "MECH2.transferError"
    let transferWorkerIdLS = countyInfo.info.closedCaseBank ?? ''
    let transferWorkerId = (/[a-z0-9]{7}/i).test(transferWorkerIdLS) ? transferWorkerIdLS : ''
    let transferSS = sessionStorage.getItem(ssTransferCase) ?? ''
    const redTextMap = new Map([
        ["Transfer To Worker ID is not valid for Servicing Agency.", "Invalid Agency"],
        ["Transfer To Worker ID is invalid.", "Invalid Worker"],
        ["Transfer To Worker ID is missing.", "ID is blank"],
        ["Transfer From Worker ID cannot be the same as Transfer To Worker ID.", "Same Worker ID"],
        ["Case Number is missing.", "No case #"],
        ["Case Number does not exist for this period.", "Check individually"],
    ])
    if (rederrortextContent.length) { queueMicrotask(() => checkRedErrorText()) }

    if (transferSS) {
        if (!editMode) {
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
        if (editMode && transferWorkerId && transferSS === "transferActive") {
            doCaseTransfer()
        }
    };
    if (!iFramed) {
        // document.getElementById('caseTransferFromType').addEventListener('change', (() => {
        //     resetTabIndex()
        //     setTimeout(() => {
        //         tabIndxNegOne('#workerSearch')
        //         document.querySelectorAll(':is(input, select).form-control[readonly]').forEach(e => { e.disabled = true })
        //     }, 300)
        // }))
        document.getElementById('footer_links').insertAdjacentHTML('beforeend', '<span class="footer" tabindex="-1">ı</span><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_140754" target="_blank">Moving to New County</a>')
    }
    if (!editMode && !iFramed) {
        let caseTransferButtons = '<div style="display: flex; gap: 10px; padding-right: 20px;">'
            // + '<button type="button" class="cButton" tabindex="-1" style="margin-right: 10px; padding: 3px 6px;" id="sendMemo">Memo</button>'
            // + '<button type="button" class="cButton" tabindex="-1" style="margin-right: 30px; padding: 3px 6px;" id="sendMemo">Reset</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="closedTransfer">Transfer to:</button>'
            + '<input type="text" class="form-control" style="width: var(--eightNumbers);" id="transferWorker" placeholder="Worker #" value=' + transferWorkerId + '></input>'
        + '</div>'
        secondaryActionArea.insertAdjacentHTML('beforeend', caseTransferButtons)
        document.getElementById('transferWorker')?.addEventListener( 'blur', () => validateTransferWorkerId(this.value) )
        document.getElementById('closedTransfer')?.addEventListener('click', () => {
            if (checkTransferWorkerId()) {
                sessionStorage.setItem('MECH2.caseTransfer.' + caseId, 'transferActive')
                document.getElementById('new').click()
            }
        })
        document.getElementById('sendMemo')?.addEventListener('click', () => {
            // todo: make into its own function so it can work on CaseList pages
            // on active case list page: make a button to "activate transfer mode" which then shows buttons by every case (akin to inactive). Clicking buttons transfers the case and sends a memo. Also shows the xfer worker and memo reset button.
            if (localStorage.getItem('transferMemo') === "") { return }
        })
    }
    if (iFramed && !editMode) {
        queueMicrotask(() => {
            if (!caseId) { parent.postMessage(['transferStatus', 'pageLoaded'], "https://mec2.childcare.dhs.state.mn.us") }
        })
    }

    function checkRedErrorText() {
        if (editMode) {
            switch (rederrortextContent[0]) {/* eslint-disable no-fallthrough */
                case "Transfer To Worker ID is not valid for Servicing Agency.":
                case "Transfer To Worker ID is invalid.":
                    countyInfo.updateCountyInfoLS('closedCaseBank', "delete")
                case "Transfer To Worker ID is missing.":
                case "Transfer From Worker ID cannot be the same as Transfer To Worker ID.":
                    sessionStorage.setItem(ssTransferCase, 'transferError')
                    sessionStorage.setItem(ssError, rederrortextContent[0])
                    document.getElementById('cancel').click()
                    break
            }/* eslint-enable no-fallthrough */
        } else if (!editMode) {
            if (rederrortextContent[0] === "Case Number is missing.") { return }
            else if (rederrortextContent[0].includes("CASE LOCKED")) {
                iFramed && parent.postMessage(['transferError', 'Locked Case'], "https://mec2.childcare.dhs.state.mn.us")
            } else {
                let errorMessage = redTextMap.get(rederrortextContent[0])
                sessionStorage.removeItem(ssTransferCase)
                sessionStorage.removeItem(ssError)
                iFramed && parent.postMessage(['transferError', errorMessage], "https://mec2.childcare.dhs.state.mn.us")
            }
        }
    }
    function startWorkerTransfer(transferCase) {
        if (transferCase) {
            sessionStorage.setItem('MECH2.caseTransfer.' + transferCase, 'transferStart')
            window.open("/ChildCare/CaseTransfer.htm?parm2=" + transferCase, '_self')
        }
    }
    function doCaseTransfer() {
        let caseTransferFromType = document.getElementById('caseTransferFromType')
        if (caseTransferFromType.querySelector('option[value="Worker To Worker"]')) {
            sessionStorage.setItem(ssTransferCase, 'transferDone')
            caseTransferFromType.value = "Worker To Worker"
            doEvent('#caseTransferFromType')
            document.getElementById('caseTransferToWorkerId').value = transferWorkerId
            doEvent('#caseTransferToWorkerId')
            save.click() // disable while testing!
        }
    };
    function checkTransferWorkerId() {
        if (transferWorkerId) { return 1 }
        else { eleFocus('#transferWorker'); flashRedBorder.animate(document.getElementById('transferWorker')); return 0 }
    }
    function validateTransferWorkerId(transferIdOfWorker) {
        if ((/[a-z0-9]{7}/i).test(transferIdOfWorker)) {
            if (transferWorkerId !== transferIdOfWorker) {
                countyInfo.updateCountyInfoLS('closedCaseBank', transferIdOfWorker)
                transferWorkerId = transferIdOfWorker
            }
            return 1
        } else {
            transferWorkerId = ''
            countyInfo.updateCountyInfoLS('closedCaseBank', "delete")
            document.getElementById('transferWorker').placeholder = 'Invalid #'
            flashRedBorder.animate(document.getElementById('transferWorker'))
            eleFocus('#transferWorker')
            return 0
        }
    }
}(); // SECTION_END Case_Transfer;
!function CaseUnearnedIncome() {
    if (!("CaseUnearnedIncome.htm").includes(thisPageNameHtm)) { return };
    h4objects.actualincome.h4.click();
    h4objects.studentincome.h4.click();
    if (editMode) {
        let paymentEndDate = document.getElementById('paymentEndDate')
        ifNoPersonUntabEndAndDisableChange('#memberReferenceNumberNewMember', paymentEndDate, '#paymentChangeDate')
        paymentEndDate.addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
        }, { once: true } )
        document.getElementById('incomeType').addEventListener('blur', blurEvent => {
            if (blurEvent.target.value === "Unemployment Insurance") {
                document.getElementById('tempIncome').value = "Yes"
                paymentEndDate.tabIndex = 0
            }
        })
        tempIncomes('tempIncome', 'paymentEndDate')
    }
    // if (!editMode) {
    //     evalData().then(({ 0: unearnedData } = {}) => {
    //     }).catch(err => { console.trace(err) });
    // }
}(); // SECTION_END Unearned_Income;
!function CaseWrapUp() {
    if (!("CaseWrapUp.htm").includes(thisPageNameHtm)) { return };
    const done = document.getElementById('done')
    if (iFramed) { // iFramed
        let suspendPlus45 = sessionStorage.getItem('MECH2.suspendPlus45')
        switch (suspendPlus45) {
            case "needsWrapUp":
                sessionStorage.setItem('MECH2.suspendPlus45', "wrapUpDone")
                doClick(done)
                break
            case "wrapUpDone":
                sessionStorage.setItem('MECH2.suspendPlus45', "finished")
                break
        }
        return;
    }
    done?.addEventListener( 'click', () => clearStorageItems() )
    if (done.disabled === false) {
        sessionStorage.setItem('MECH2.previousPage', document.referrer)
    } else {
        const postWrap = new Map([
            [ "goEligibility", { page: "CaseEligibilityResultSelection", name: "Eligibility"}],
            [ "goSAOverview", { page: "CaseServiceAuthorizationOverview", name: "SA Overview" }],
            [ "goSAApproval", { page: "CaseServiceAuthorizationApproval", name: "SA Approval" }],
            [ "goEditSummary", { page: "CaseEditSummary", name: "Edit Summary" }],
            [ "goSpecialLetter", { page: "CaseSpecialLetter", name: "Special Letter" }],
            [ "goCaseTransfer", { page: "CaseTransfer", name: "Case Transfer" }],
        ])
        secondaryActionArea.insertAdjacentHTML('afterbegin', '<div id="postWrapUpButtons" style="display: flex; gap: 10px;">' + postWrapButtons() + '</div>')
        function postWrapButtons() { return [...postWrap].map( ([key, item] = []) => '<button class="form-button" type="button" id="'+ key +'">'+ item.name +'</button>').join('') }
        document.getElementById('postWrapUpButtons').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            window.open('/ChildCare/' + postWrap.get(clickEvent.target.id).page + '.htm?parm2=' + caseId + '&parm3=' + selectPeriodDates.parm3, '_self')
        })
    }
}(); // SECTION_END Case_Wrap_Up;
if (("ClientSearch.htm").includes(thisPageNameHtm)) {
//     let selectBtnDB = document.getElementById('selectBtnDB')
//     selectBtnDB && tbodiesFocus(selectBtnDB)
//     // document.getElementById('selectBtnDB') && document.querySelector('#clientSearchTable > tbody').addEventListener( 'click', () => eleFocus('#selectBtnDB') )
//     if (document.getElementById('resetbtn')) {
//         document.querySelectorAll('input.form-control, select.form-control').forEach(e => {
//             e.disabled = false
//         })

//         let clientSearchNthChild = { "ssnReq": 1, "lastNameReq": 3, "firstNameReq": 4, "genderReq": 6, "birthdateReq": 7, "pmiReq": 9 }
//         let clientSearchTable = document.getElementById('clientSearchTable')
//         for (let field in clientSearchNthChild) {
//             let fieldValue = document.getElementById([field]).value
//             if (field === "genderReq") {
//                 if (fieldValue === 'M') { fieldValue = "Male" }
//                 else if (fieldValue === 'F') { fieldValue = "Female" }
//             }
//             let segmentedFields = ['ssnReq', 'birthdateReq']
//             if (fieldValue) {
//                 let clientSearchTableRows = [...clientSearchTable.children[1].children]
//                 let tdElements = [...clientSearchTable.children[1].children].map(e => e.children[clientSearchNthChild-1])
//                 // tdElements.forEach(ele => {
//                 clientSearchTableRows.forEach(ele => {
//                 // clientSearchTable.querySelectorAll('tbody > tr > td:nth-child(' + clientSearchNthChild[field] + ')').forEach((ele, row) => {
//                     let eleTextContent = ele.textContent
//                     let fieldValueLength = fieldValue.length
//                     if (fieldValueLength && eleTextContent === fieldValue) { ele.classList.add('match') }

//                     if (fieldValueLength && !ele.classList.contains('match') && eleTextContent.length && segmentedFields.includes(field)) {
//                         let haystack = eleTextContent.split(/-|\//)
//                         let needle = fieldValue.split(/-|\//)

//                         let reggy = new RegExp(("plicat"), "i")
//                         document.querySelectorAll('tbody > tr > td:nth-child(2)').forEach(e => {
//                             if (e.innerText.match(reggy)) {
//                                 let repText = e.innerText
//                                 repText = repText.replace((reggy), '<span class="match">$&</span>')
//                                 e.innerHTML = repText
//                             }
//                         })

//                         // for (let i = 0; i < haystack.length; i++) {
//                         //     if (haystack[i] === needle[i]) {
//                         //         if (needle[0] !== needle[1] && haystack.filter(e => e.match(needle[i])).length > 1) {
//                         //             let firstHay = new RegExp("(?:"+haystack[i]+")"+haystack[i]) // blarg can't figure out how to target a specific instance... maybe with an index?!
//                         //             ele.innerHTML = ele.innerHTML.replace(/(?:haystack[i])/, '<span class="match">'+haystack[i]+'</span>')
//                         //         }
//                         //         ele.innerHTML = ele.innerHTML.replace(haystack[i], '<span class="match">'+haystack[i]+'</span>')
//                         //     }
//                         // }
//                         let filteredSplit = haystack.filter(split => needle.includes(split))
//                         if (filteredSplit.length) {
//                             filteredSplit.forEach(match => { ele.innerHTML = ele.innerHTML.replace(match, '<span class="match">' + match + '</span>') })
//                         }
//                     }
//                 })
//             }
//         }
//     }
//     let resultTable = document.getElementById('clientSearchProgramResults')
//     if (resultTable) {
//         waitForTableCells('#clientSearchProgramResults').then(() => {
//             [...resultTable.children[1].children].forEach(tr => {
//                 let td = tr.children
//                 if (["MFIP/DWP Child Care", "Basic Sliding Fee", "Transition Year", "Transition Year Extension"].includes(td[2].textContent)) { td[1].classList.add('match'); td[0].children[0].classList.add('match') }
//                 if ( ['Current', 'PEND'].includes(td[2].textContent.split(' ')[1]) ) { td[2].classList.add('match'); td[0].children[0].classList.add('match') }
//                 if ( ['Current', 'PEND'].includes(td[3].textContent.split(' ')[1]) ) { td[3].classList.add('match'); td[0].children[0].classList.add('match') }
//             })
//             // resultTable.querySelectorAll('tbody > tr > td:nth-child(2)').forEach(e => {
//             //     if (["MFIP/DWP Child Care", "Basic Sliding Fee", "Transition Year", "Transition Year Extension"].includes(e.innerText)) { e.classList.add('match') }
//             // })
//             // resultTable.querySelectorAll('tbody > tr > td:nth-child(3)').forEach(e => {
//             //     if ( ['Current', 'PEND'].includes(e.textContent.split(' ')[1]) ) { e.classList.add('match') }
//             //     // if (e.innerText.indexOf("Current") > -1) { e.classList.add('match') }
//             // })
//         })
//     }
}; // SECTION_END Client_Search;
!function ClientSearch() {
    if (!("ClientSearch.htm").includes(thisPageNameHtm)) { return };
    if (rederrortextContent.find(arrItem => arrItem.indexOf("Warning: SSN is missing") > -1)) { [...document.getElementById('selectBtn'), document.getElementById('createPMIBtn')].forEach(ele => { ele.style.display = "inline-block" }) }
    let searchTableTbody = document.querySelector('#clientSearchTable > tbody'), selectBtn = document.getElementById('selectBtn'), programBtn = document.getElementById('programBtn'), returnBtn = document.getElementById('returnBtn'), h5 = document.querySelector('h5')
    if (selectBtn) { let focusBtn = selectBtn.style.display !== "none" ? selectBtn : programBtn; searchTableTbody?.addEventListener( 'click', () => eleFocus(focusBtn) ) }
    if (document.getElementById('resetbtn')) {
        document.querySelectorAll('input.form-control, select.form-control').forEach( ele => { ele.disabled = false })
        const clientSearchNthChild = { "ssnReq": 1, "lastNameReq": 3, "firstNameReq": 4, "genderReq": 6, "birthdateReq": 7, "pmiReq": 9 }
        const fieldValueElements = {}
        for (let element in clientSearchNthChild) { fieldValueElements[element] = document.getElementById(element) }
        const genderMap = { M: "Male", F: "Female" }
        for (let field in clientSearchNthChild) {
            let fieldValue = fieldValueElements[field].value
            if (!fieldValue) { continue }
            if (field === "genderReq" && fieldValue) { fieldValue = genderMap[fieldValue] }
            let segmentedFields = ['ssnReq', 'birthdateReq']
            searchTableTbody.querySelectorAll('tr > td:nth-child(' + clientSearchNthChild[field] + ')').forEach((ele2, row) => {
                if (ele2.textContent === fieldValue) { ele2.classList.add('match') }
                else if (ele2.textContent.length && segmentedFields.includes(field)) {
                    let haystack = ele2.textContent.split(/-|\//), needle = fieldValue.split(/-|\//), filteredSplit = haystack.filter(split => needle.includes(split))
                    if (filteredSplit.length) { filteredSplit.forEach(match => { ele2.innerHTML = ele2.innerHTML.replace(match, '<span class="match">' + match + '</span>') }) }
                }
            })
        }
    }
    if (returnBtn && returnBtn.style.display !== "none") {
        waitForTableCells('#clientSearchProgramResults').then(resultTable => {
            [...resultTable.querySelectorAll('tr > td:nth-child(2)')].filter(ele => ["MFIP/DWP Child Care", "Basic Sliding Fee", "Transition Year", "Transition Year Extension"].includes(ele.innerText)).forEach(ele2 => ele2.classList.add('match'));
            [...resultTable.querySelectorAll('tr > td:nth-child(3)')].filter(ele => ele.innerText.indexOf("Current") > -1).forEach(ele2 => ele2.classList.add('match'));
        })
    }
    if ( programBtn ) {
        reselectSelectedTableRow();
        programBtn.addEventListener( 'click', () => storeSelectedTableRow() )
    }
}(); // SECTION_END Client_Search;
!function ContactInformation() {
    if (!"ContactInformation.htm".includes(thisPageNameHtm)) { return };
    [...document.querySelector('.content_40pad').querySelectorAll('br')].forEach(ele => { if (ele.previousSibling?.nodeType === 3) { doWrap(ele.previousSibling) } })
}(); // SECTION_END Contact Information;
!function ElectronicBills() {
    if (!"ElectronicBills.htm".includes(thisPageNameHtm)) { return };
    selectPeriodReversal(document.getElementById('searchDateRange'), 1)
}(); // SECTION_END Electronic_Bills;
!function _Financial_Pages() {
    if (thisPageNameHtm.indexOf("Financial") !== 0) { return };
!function __FinancialBilling() {
    if (!("FinancialBilling.htm").includes(thisPageNameHtm) || !caseId) { return };
    listPageLinksAndList([4, "ProviderInformation"])
    let billingProviderTableTbody = document.querySelector('table#billingProviderTable > tbody'), billingProviderTableChildren = billingProviderTableTbody.children
    if (editMode) {
        let totalHoursBilledWeekOne = document.getElementById('totalHoursBilledWeekOne'), totalHoursBilledWeekTwo = document.getElementById('totalHoursBilledWeekTwo'), totalHoursOfCareAuthorized = document.getElementById('totalHoursOfCareAuthorized'), totalHours = [ totalHoursBilledWeekOne, totalHoursBilledWeekTwo, totalHoursOfCareAuthorized ]
        let daysArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], weekOneDays = weekHtmlCollection('weekOne'), weekTwoDays = weekHtmlCollection('weekTwo'), weekOneMonday = weekOneDays[0]
        function weekHtmlCollection(weekOneOrTwo) { return daysArray.map( ele => document.getElementById(weekOneOrTwo + ele) ) }
        let providerName = billingProviderTableTbody.querySelector('tr.selected > td:nth-child(1)').textContent
        let billedHoursTbody = weekOneMonday.closest('tbody'), billedHoursPanel = h4objects.billedhours.h4.parentElement
        document.getElementById('billedTimeType').addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key !== 'Tab' || keydownEvent.target.value !== '') { return };
            keydownEvent.preventDefault()
            keydownEvent.shiftKey ? eleFocus('#registrationFee') : eleFocus(weekOneMonday); weekOneMonday.select()
        })
        setTimeout(() => {
            let childFirstName = nameFuncs.commaNameObject(document.querySelector('#billingChildTable > tbody > tr.selected > td:nth-child(2)').textContent).first, childAndProviderNames = "<span>" + [" for ", childFirstName, " at ", providerName].join('</span><span style="margin-left: 5px;">') + "</span>"
            for (let h4name in h4objects) {
                if (h4objects[h4name].text !== "versioninformation") { h4objects[h4name].h4.innerHTML = h4objects[h4name].h4.textContent + childAndProviderNames }
            }
        }, 100)
        function addBillingRows(changedId) {
            let whichBilledWeek = changedId.indexOf("weekOne") > -1 ? totalHoursBilledWeekOne : totalHoursBilledWeekTwo, weekDaysChanged = changedId.indexOf("weekOne") > -1 ? weekOneDays : weekTwoDays
            whichBilledWeek.value = weekDaysChanged.reduce((partialSum, e) => partialSum + parseInt(e.value), 0 )
            Number(totalHoursBilledWeekOne.value) + Number(totalHoursBilledWeekTwo.value) > Number(totalHoursOfCareAuthorized.value) ? totalHours.forEach( eleAdd => eleAdd.classList.add('red-outline') ) : totalHours.forEach( eleRemove => eleRemove.classList.remove('red-outline') )
        }
        billedHoursTbody.addEventListener('click', clickEvent => { if (clickEvent.target.nodeName === "INPUT") { clickEvent.target.select() } })
        billedHoursTbody.addEventListener('input', inputEvent => {
            if (inputEvent.target.id.indexOf('week') !== 0) { return };
            if (inputEvent.target.value !== '') { addBillingRows(inputEvent.target.id) }
            else if (inputEvent.target.value === '') { inputEvent.target.value = 0; inputEvent.target.select() }
        })
    }
    if (!editMode) {
        window.addEventListener('beforeunload', () => {
            let selectedTRow = billingProviderTableTbody.querySelector('tr.selected')
            if (selectedTRow) { sessionStorage.setItem('MECH2.billingApproval.' + caseId, selectedTRow.children[4]?.textContent) }
        })
        evalData().then(({ 0: billingProviderListDataArr } = {}) => {
            let lastSelectedProvider = sessionStorage.getItem('MECH2.billingApproval.' + caseId), billingReferAndSelectedProvider = document.referrer.indexOf("FinancialBilling") > -1 && lastSelectedProvider
            if (!billingReferAndSelectedProvider) { return };
            billingProviderListDataArr.find(item => { if (item.providerId === lastSelectedProvider) { billingProviderTableChildren[item.rowIndex].click(); } })
        }).catch(err => { console.trace(err) })
    }
}(); // SECTION_END Financial_Billing;
!function __FinancialBillingApproval() {
    if (!("FinancialBillingApproval.htm").includes(thisPageNameHtm) || !caseId) { return };
    listPageLinksAndList([0, "ProviderInformation"])
    if (editMode) {
        h4objects.comments.h4.insertAdjacentHTML('afterend', ''
            + '<div class="float-right-imp" id="commentsButtons">'
                + '<button type="button" id="unpaidCopayNote" class="cButton inRow" tabindex="-1">Unpaid Copay</button>'
                + '<button type="button" id="paymentPlanNote" class="cButton inRow" tabindex="-1">Payment Plan</button>'
            + '</div>')
        document.getElementById('commentsButtons').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return };
            document.getElementById('userComments').value = (() => {
                switch (clickEvent.target.id) {
                    case "unpaidCopayNote": return 'Copay is unpaid, provider did not indicate if there is a payment plan.'
                    case "paymentPlanNote": return 'Provider indicated there is a payment plan for the unpaid copay.'
                    default: return ''
                }
            })()
        })
    }
    else if (!editMode) {
        let billingProviderTableTbody = document.querySelector('table#financialBillingApprovalTable > tbody'), billingProviderTableChildren = [...billingProviderTableTbody?.children]
        window.addEventListener('beforeunload', () => {
            let selectedTRow = billingProviderTableTbody.querySelector('tr.selected')
            if (selectedTRow) { sessionStorage.setItem('MECH2.billingApproval.' + caseId, selectedTRow.children[0]?.textContent) }
        })
        evalData().then(({ 0: billingProviderListDataArr } = {}) => {
            let lastSelectedProvider = sessionStorage.getItem('MECH2.billingApproval.' + caseId), billingReferAndSelectedProvider = document.referrer.indexOf("FinancialBilling") > -1 && lastSelectedProvider
            if (!billingReferAndSelectedProvider) { return };
            billingProviderListDataArr.find(item => { if (item.providerId === lastSelectedProvider) { billingProviderTableChildren[item.rowIndex].click(); } })
        }).catch(err => { console.trace(err) })
    }
}(); // SECTION_END Financial_Billing_Approval;
!function __FinancialBilling_FinancialBillingApproval() {
    if (!["FinancialBillingApproval.htm", "FinancialBilling.htm"].includes(thisPageNameHtm)) { return };
    let billingProviderTableTbody = document.querySelector('table#billingProviderTable > tbody, table#financialBillingApprovalTable > tbody')
    secondaryActionArea.insertAdjacentHTML('beforeend', '<div><button class="cButton" id="copyBillingInfo">Copy Billing Info</button></div>')
    let typeAndNameColumns = {
        FinancialBilling: { type: 1, name: 0 },
        FinancialBillingApproval: { type: 2, name: 1 },
    }
    let thisPageTypeAndNameColumns = typeAndNameColumns[thisPageName]
    document.getElementById('copyBillingInfo').addEventListener( 'click', () => copyBillingInfoForEmails(thisPageTypeAndNameColumns.type, thisPageTypeAndNameColumns.name) )
    function copyBillingInfoForEmails(typeChild, nameChild) {
        let selectedTRowChildren = billingProviderTableTbody.querySelector('tr.selected').children
        let selectedProviderType = selectedTRowChildren[typeChild].textContent
        let selectedProviderName = selectedTRowChildren[nameChild].textContent
        selectedProviderName = selectedProviderType.indexOf("Center") > -1 ? selectedProviderName
        : selectedProviderName.indexOf(",") > -1 ? nameFuncs.commaNameReorder(selectedProviderName)
        : reorderFamilyProviderName(selectedProviderName)
        let caseName = nameFuncs.commaNameReorder(pageTitle)
        let copyString = selectedProviderName + '  Case: ' + caseId + ', ' + caseName + '  ' + dateFuncs.formatDate(selectPeriodDates.start, "mdyy") + '-' + dateFuncs.formatDate(selectPeriodDates.end, "mdyy")
        copy(copyString, copyString, "Copied!")
    };
    function reorderFamilyProviderName(misorderedName) {
        misorderedName = misorderedName.split(" ")
        return misorderedName[1] + ' ' + misorderedName[0]
    };
}() // SECTION_END Financial_Billing_Financial_Billing_Approval_Copy_Button;
!function __FinancialManualPayment() {
    if (!("FinancialManualPayment.htm").includes(thisPageNameHtm)) { return };
    selectPeriodReversal( document.getElementById('mpSelectBillingPeriod') )
}(); // SECTION_END Financial_Manual_Payment;
}(); // SECTION_END _Financial_Pages;
!function FundingAvailability() {
    if (!("FundingAvailability.htm").includes(thisPageNameHtm)) { return };
    if (!editMode) {
        focusEle = document.getElementById('new').disabled ? '#wrapUpDB' : '#newDB'
    } else if (editMode) {
        let basicSlidingFeeFundsAvailableCode = document.getElementById('basicSlidingFeeFundsAvailableCode'), bSfEffectiveDate = document.getElementById('bSfEffectiveDate')
        if (countyInfo.userSettings.fundsAvailable) { basicSlidingFeeFundsAvailableCode.value = 'Y' }
        focusEle = basicSlidingFeeFundsAvailableCode.value && bSfEffectiveDate.value ? '#saveDB' : bSfEffectiveDate
    }
}(); // SECTION_END Funding_Availability;
!function Login_ChangePassword() {
    if (!["Login.htm", "ChangePassword.htm"].includes(thisPageNameHtm) && !("/ChildCare/").includes(thisPageName)) { return }; // Looks dumb, but catches if there's no Page.htm, which can only happen for logging in.
    let userId = document.getElementById('userId')
    if (rederrortextContent.find(arrItem => arrItem.indexOf("Password has expired.") > -1)) {
	focusEle = "#password"
	} else if (userXnumber.length && document.getElementById("terms")) {
        userId.value = userXnumber;
        document.getElementById("terms").click();
        document.getElementById("password").focus();
    } else {
        focusEle = userId
        addEventListener('beforeunload', () => {
            if (userId.value !== '') { countyInfo.updateCountyInfoLS('userIdNumber', userId.value) };
        });
    }
}(); // SECTION_END Log_in;
!function MaximumRates() {
    if (!("MaximumRates.htm").includes(thisPageNameHtm)) { return };
    let maximumRatesCounty = document.getElementById('maximumRatesCounty'), ratesProviderType = document.getElementById('ratesProviderType'), providerType = ratesProviderType.value, maxRatesTable = document.querySelector('table'), maximumRatesPeriod = document.getElementById('maximumRatesPeriod'), firstNonBlankPeriod = maximumRatesPeriod.children[1]
    let ageDefinitions = providerType === "Child Care Center" ? '<div><label>Infant:</label><span> Birth until 16 months.</span></div> <div><label>Toddler:</label><span> 16 months until 33 months.</span></div> <div><label>Preschooler:</label><span> 33 months until the August prior to the Kindergarten date.</span></div>'
            : '<div><label>Infant:</label><span> Birth until 12 months.</span></div> <div><label>Toddler:</label><span> 12 months until 24 months.</span></div> <div><label>Preschooler:</label><span> 24 months until the August prior to the Kindergarten date.</span></div>'
    let nonStandardTds = document.querySelectorAll('table > tbody > tr > :is(th, td):nth-child(5)')
    let nonStandardRates = [...nonStandardTds].filter(ele => ele.innerText > 0)
    if (nonStandardRates.length === 0) {
        nonStandardTds.forEach(ele => ele.remove())
    }
    if (maximumRatesCounty.value === "" && typeof userCountyObj !== undefined) { maximumRatesCounty.value = userCountyObj.county; doEvent('#maximumRatesCounty') }
    if (providerType === '') { ratesProviderType.value = "Child Care Center"; doEvent(ratesProviderType) }
    if (maximumRatesPeriod.value === '') { maximumRatesPeriod.value = firstNonBlankPeriod.value; doEvent(maximumRatesPeriod) }
    ratesProviderType.addEventListener('change', () => { maximumRatesPeriod.value = firstNonBlankPeriod.value; doEvent(maximumRatesPeriod) })
    maximumRatesCounty.addEventListener('change', () => { maximumRatesPeriod.value = firstNonBlankPeriod.value; doEvent(maximumRatesPeriod) })
    if (providerType !== "Legal Non-licensed") {
        document.querySelectorAll('tbody > tr > th:nth-child(n+2):nth-child(-n+4)').forEach( ele => ele.insertAdjacentHTML('beforeend', '<span class="maxRates"> (15%, 20%)</span>') )
        let maxRatesTds = [...document.querySelectorAll('tbody > tr > td')].forEach(ele2 => {
            if (!ele2.textContent || ele2.textContent === "0.00" || isNaN(Number(ele2.textContent))) { return }
            ele2.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (ele2.textContent * 1.15).toFixed(2) + ", " + (ele2.textContent * 1.2).toFixed(2) + ')</span>')
        })
        maxRatesTable.insertAdjacentHTML('afterend', '<i><span class="maxRates" style="margin-right: 25px; text-align: right; width: 100%;">Note: Table includes max rates for daycares with Parent Aware 3-star (15%) and 4-star (20%) ratings.</span></i>')
    } else if (providerType === "Legal Non-licensed") {
        document.querySelector('tbody > tr > th:nth-child(2)').insertAdjacentHTML('beforeend', '<span class="maxRates">(15%)</span>')
        let maxRatesTds = [...document.querySelectorAll('tbody > tr > td')].forEach(ele3 => {
            if (!ele3.textContent || ele3.textContent === "0.00" || isNaN(Number(ele3.textContent))) { return }
            ele3.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (ele3.textContent * 1.15).toFixed(2) + ')</span>')
        })
    }
    let toggleDifferentialRates = createSlider({ label: "Show Differential Rates", title: "Toggle differential rates being added to the provider payment rate table", id: "toggleDifferentialRatesSlider", defaultOn: true, classes: "float-right-imp", })
    secondaryActionArea.insertAdjacentHTML('beforeend', ''
    + '<div class="db-container">'
        + '<button type="button" class="cButton" id="copyRates">Copy Rates</button>'
        + toggleDifferentialRates
    + '</div>')
    document.querySelector('h4').innerText = "Rates for " + providerType + " for " + maximumRatesPeriod.value
    let tableParentElement = maxRatesTable.parentElement
    let [ registrationFeeLabel, registrationFeeAmount ] = tableParentElement.querySelectorAll('.form-group > div')
    doUnwrap(registrationFeeLabel)
    registrationFeeAmount ? registrationFeeAmount.outerHTML = '<span> ' + registrationFeeAmount.innerText + '</span>' : undefined
    document.getElementById('copyRates').addEventListener('click', () => {
        copyFormattedHTML({html: tableParentElement.innerHTML.replace(/(<span class="maxRates hidden".+?<\/span>)/g, ''), addTableStyle: true, removeStyles: true})
        snackBar('Copied table!', 'notitle')
    })
    // function copyRatesTempTable() {
    // }
    let maxRatesSpans = [...document.querySelectorAll('.maxRates')]
    document.getElementById('toggleDifferentialRatesSlider').addEventListener( 'click', ele => unhideElement(maxRatesSpans, ele.target.checked) )
    document.querySelector('div.panel-box-format > div.form-group').insertAdjacentHTML('afterend', '<div id="ageCategories">' + ageDefinitions + '</div>')
    //https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_0927 // Accreditations
}(); // SECTION_END Maximum_Rates;
!function _Notes__CaseNotes_ProviderNotes() { // (major_subsection) =====================================================================================================================================;
    if (!["CaseNotes.htm", "ProviderNotes.htm"].includes(thisPageNameHtm)) { return };
    doNotDupe.buttons.push('#changeType', '#search', '#reset', '#storage')
    let noteCategory = document.getElementById('noteCategory'), noteSummary = document.getElementById('noteSummary'), noteStringText = document.getElementById('noteStringText'), noteMemberReferenceNumber = document.getElementById('noteMemberReferenceNumber'), newButton = document.getElementById('new')
    if (editMode) { save.addEventListener('click', () => { noteStringText.value = splitStringAtWordBoundary(noteStringText.value, 100) }) }
    let caseNotesTableTbody = document.querySelector('table#caseNotesTable > tbody'), notesTableNoRecords = caseNotesTableTbody?.children[0].textContent === "No records found" ? 1 : 0
    function restyleCreated() { // Case_Notes_and_Provider_Notes_layout_fix
        document.getElementById('noteCreateDate').closest('div.panel-box-format').classList.add('hidden')
        let noteCreatorChildren = [...document.querySelector('label[for=noteCreator]').parentElement.children], noteSummaryRow = noteSummary.closest('.row')
        noteCreatorChildren.forEach(ele => noteSummaryRow.append(ele))
        tabIndxNegOne('#noteArchiveType, #noteSearchStringText, #noteImportant #noteCreator')
    }
    //pasted from AHK
    window.addEventListener('paste', pasteEvent => {
        let pastedText = pasteEvent.clipboardData.getData("text")
        if (pastedText.indexOf("CaseNoteFromAHK") < 0) { return }
        pasteEvent.preventDefault()
        pasteEvent.stopImmediatePropagation()
        if (!editMode) {
            noteSummary.value = "Click the 'New' button first ⬇"
            noteStringText.value = "Click the 'New' button first ⬇"
            document.getElementById('noteCreator').value = "X1D10T"
            flashRedBorder.animate(newButton)
        } else {
            let [, noteCategoryData, noteSummaryData, noteStringTextData ] = pastedText.split('SPLIT')
            noteCategory.value = noteCategoryData
            noteSummary.value = noteSummaryData
            noteStringText.value = noteStringTextData
            eleFocus(save)
        }
    })
    let noteInfo = localStorage.getItem("MECH2.note") !== null ? sanitize.JSON(localStorage.getItem("MECH2.note"))[caseOrProviderId] : undefined
    if (noteInfo) {
        !function doAutoNote() { // Auto_Case_Noting
            if (!editMode) {
                let continueToMakeNote = 1
                    evalData().then(results => {
                        let firstTenAlerts = results[0].slice(0, 10), firstTenAlertsLength = firstTenAlerts.length
                        let todayValue = Date.now(), twoMonthsValue = 5270400000
                        firstTenAlerts.forEach(alert => {
                            let alertDateValue = sanitize.date(alert.noteCreateDate, "number")
                            if (alertDateValue + twoMonthsValue < todayValue) { return }
                            if (noteInfo.noteSummary.slice(0, 45) === alert.noteSummary.replace(/\\/g, '').slice(0, 45)) {
                                noteStringText.value = "\n\n\n\t\tNote already exists, duplicate note not entered.\n\t\tClick 'Override Duplicate Check' to enter duplicate note.\n\t\t(Date range for duplicate check: 60 days.)"
                                caseNotesTableTbody.children[alert.rowIndex].setAttribute('style', "color: var(--textColorPositive) !important;")
                                localStorage.removeItem("MECH2.note")
                                continueToMakeNote = 0
                                h4objects.note.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton afterH4" id="overrideDupe">Override Duplicate Check</button>')
                                document.getElementById('overrideDupe').addEventListener('click', () => {
                                    let noteInfoCaseId = {}
                                    noteInfoCaseId[caseOrProviderId] = noteInfo
                                    localStorage.setItem( "MECH2.note", JSON.stringify(noteInfoCaseId) )
                                    doClick(newButton)
                                })
                                restyleCreated()
                                return
                            }
                        })
                        continueToMakeNote && doClick(newButton)
                    }).catch(err => { console.trace(err) })
            } else if (editMode) {
                let userNameTitle = countyInfo.userSettings.promptUserNameTitle ? countyInfo.info.inputUserNameTitle : ""
                if (noteInfo.noteCategory === "Child Support Note") { document.querySelector('option[value="Application"]').insertAdjacentHTML('afterend', '<option value="Child Support Note">Child Support Note</option>'); }
                let signatureName, workerName = countyInfo.info.userName
                if (["CaseNotes.htm"].includes(thisPageNameHtm)) {
                    if (noteInfo.xNumber) { signatureName = document.getElementById('noteCreator').value.toLowerCase() === noteInfo.xNumber ? countyInfo.info.userName + userNameTitle : countyInfo.info.userName + userNameTitle + " for " + noteInfo.worker }
                    else { signatureName = countyInfo.info.userName + userNameTitle }
                }
                setTimeout(() => {
                    if (noteInfo.intendedPerson) {
                        // let intendedPerson = [...document.querySelectorAll('#noteMemberReferenceNumber > option')].find( ele => ele.innerText.includes(noteInfo.intendedPerson.toUpperCase()) ).value
                        noteMemberReferenceNumber.value = [...document.querySelectorAll('#noteMemberReferenceNumber > option')].find( ele => ele.innerText.includes(noteInfo.intendedPerson.toUpperCase()) ).value
                    }
                    noteCategory.value = noteInfo.noteCategory
                    noteSummary.value = noteInfo.noteSummary
                    noteStringText.value = noteInfo.noteMessage + "\n=====\n" + signatureName
                    localStorage.removeItem("MECH2.note")
                    save.click()
                }, 50)
            }
        }();
    } else { // END Auto_Case_Noting
        restyleCreated()
        secondaryActionArea.style.justifyContent = "start"
        !function duplicateNote() {
            let storedNoteDetails = sanitize.JSON(localStorage.getItem("MECH2.storedNote")) ?? {}, storedNoteExists = "noteCategory" in storedNoteDetails ? 1 : 0
            if (!storedNoteExists || storedNoteDetails?.noteSummary === noteSummary?.value) { localStorage.removeItem("MECH2.storedNote"); storedNoteExists = 0 }
            if (!editMode) {
                let storedNoteInfoHTML = storedNoteExists ? '<span style="margin-left: 10px;">Unsaved note exists for #' + storedNoteDetails.identifier + '</span>' : ''
                secondaryActionArea?.insertAdjacentHTML('beforeend', '<div class="db-container"><button type="button" id="duplicate" class="form-button">Duplicate</button> ' + storedNoteInfoHTML + ' </div>')
                document.getElementById('duplicate')?.addEventListener('click', copyNoteToLS)
                function copyNoteToLS() {
                    let selectedLength = document.getElementsByClassName('selected').length
                    if (noteCategory?.value && selectedLength) {
                        localStorage.setItem("MECH2.copiedNote", JSON.stringify( getNoteDetails() ))
                        snackBar('Copied note!', 'notitle')
                    } else if (!selectedLength) { snackBar('No note selected') }
                    eleFocus("#newDB")
                }
            } else if (editMode) {
                window.addEventListener('beforeunload', getDetailsStoreInLS)
                function getDetailsStoreInLS() { if (!noteCategory?.value) { return }; localStorage.setItem('MECH2.storedNote', JSON.stringify( getNoteDetails() )) }
                if (noteStringText.value) { noteStringText.value = convertLineBreakToSpace(noteStringText.value) }
                let noteDetails = sanitize.JSON(localStorage.getItem("MECH2.copiedNote")) ?? {}, noteDetailsExists = "noteCategory" in noteDetails ? 1 : 0
                if (!noteDetailsExists && !storedNoteExists) { return };
                //
                if (noteDetailsExists && ["Application", "Redetermination"].includes(noteDetails.noteCategory)) { noteDetails.noteSummary = noteDetails.noteCategory + " update" }
                let autofillButton = noteDetailsExists ? '<button type="button" id="autofill" class="form-button">Autofill</button>' : '', storedNoteButton = storedNoteExists ? '<button type="button" id="storedNote" class="form-button">Stored Note</button>' : ''
                secondaryActionArea?.insertAdjacentHTML('beforeend', '<div class="db-container">' + autofillButton + storedNoteButton + '</div>')
                secondaryActionArea?.addEventListener('click', clickEvent => {
                    if (clickEvent.target.nodeName !== "BUTTON" || noteCategory?.value.length) { return };
                    let selectedNoteDetails = clickEvent.target.id === "autofill" ? noteDetails : storedNoteDetails
                    fillNoteDetails(selectedNoteDetails)
                })
                document.getElementById('save').addEventListener('click', function() { localStorage.removeItem('MECH2.storedNote') })
            }
            function getNoteDetails() { return { noteSummary: noteSummary.value, noteCategory: noteCategory.value, noteMessage: noteStringText.value, noteMemberReferenceNumber: noteMemberReferenceNumber.value, identifier: caseOrProviderId, }; }
            function fillNoteDetails(noteDetails) {
                noteSummary.value = noteDetails.noteSummary
                noteCategory.value = noteDetails.noteCategory
                noteMemberReferenceNumber.value = noteDetails.noteMemberReferenceNumber
                noteStringText.value = convertLineBreakToSpace(noteDetails.noteMessage)
                eleFocus(noteStringText)
                noteStringText.setSelectionRange(0, 0)
            }
        }(); // End Duplicate_Note
        // SECTION_START Case_Notes_Only
        if (("CaseNotes.htm").includes(thisPageNameHtm)) {
            if (editMode && !notesTableNoRecords) {
                document.querySelector('option[value="Application"]').insertAdjacentHTML('afterend', '<option value="Child Support Note">Child Support Note</option>');
                let autoFormatSlider = createSlider({ label: "Auto-Formatting", title: "Auto-Format Note text when pasting and saving.", id: "autoFormat", defaultOn: true, classes: "float-right-imp h4-line", })
                h4objects.note.h4.insertAdjacentHTML('afterend', autoFormatSlider)
                let autoFormat = document.getElementById('autoFormat')
                save.addEventListener('click', () => { // fixing spacing around titles
                    if (autoFormat.checked) { noteStringText.value = noteStringText.value.replace(/\:\,/g, ': ,').replace(/^(?! *RSDI| *SSI)( *[ A-Z]{2,8}: *)/gm, (wholeMatch, captured1) => captured1.trim().padStart(9, ' ').padEnd(13, ' ') )}
                })
                noteStringText.addEventListener('paste', pasteEvent => {
                    if (!autoFormat.checked) { return }
                    let pastedText = (pasteEvent.clipboardData || window.clipboardData).getData("text")
                    let formattedPastedText = convertLineBreakToSpace(pastedText)
                        .replace( /(\w)\(/g, "$1 (" ).replace( /\)(\w)/g, ") $1" )//Spaces around parentheses
                        .replace( /\n\ {0,9}\u0009|\n\ {16}/g, "\n             " ) //excel "tab"
                        .replace(/\u0009/g, "    ")
                        .replace( /\n+/g, "\n" )//Multiple new lines to single new line
                    if (pastedText !== formattedPastedText) {
                        pasteEvent.preventDefault()
                        insertTextAndMoveCursor(formattedPastedText)
                    }
                })
                noteStringText.addEventListener('keydown', keydownEvent => {
                    if (keydownEvent.key !== "`") { return }
                    keydownEvent.preventDefault()
                    insertTextAndMoveCursor("             ")
                })
            }
            if (!editMode) {
                evalData().then(notesTableData => { //Hiding PMI/SMI Merge and Disbursed Child Care Support Payment rows
                    let hiddenTr = 0
                    if (!notesTableData[0]) { return }
                    let { 0: noteData } = notesTableData
                    noteData.slice(0, 75).forEach(note => {
                        if ( note.noteSummary.indexOf("Disbursed child care") > -1 || note.noteSummary.indexOf("PMI/SMI") > -1 ) {
                            hiddenTr++
                            caseNotesTableTbody.children[note.rowIndex].classList.add('hiddenRow')
                        }
                    })
                    if (hiddenTr) {
                        const invisEle = document.createElement('div')
                        let noteStyle = cssStyle()
                        noteStyle.replaceSync(doTableStyleToggle(invisEle, 'hiddenRow') + " .hiddenRow { display: none !important; }" );
                        caseNotesTableTbody.parentElement.classList.add('toggledTable')
                        let unhideElementCaseNotes = createSlider({ label: 'Show ' + hiddenTr + ' Hidden Notes', title: "Shows or hides PMI Merge and CS disbursion auto-notes.", id: 'unhideElementCaseNotes', defaultOn: false, classes: 'float-right-imp h4-line', })
                        document.getElementById('reset').insertAdjacentHTML('afterend', unhideElementCaseNotes)
                        let toggleRule = doTableStyleToggle(invisEle, 'hiddenRow')
                        document.getElementById('unhideElementCaseNotes').addEventListener('click', clickEvent => {
                            clickEvent.target.checked === true ? noteStyle.replaceSync(toggleRule + " .hiddenRow { display: table-row; }") : noteStyle.replaceSync(toggleRule + " .hiddenRow { display: none; }")
                        })
                        queueMicrotask(() => { document.querySelector('tbody > tr:not(.hiddenRow)').click() })
                    }
                }).catch(err => { console.trace(err) })
            }
        }; // SECTION_END Case_Notes_Only
    }
}(); // SECTION_END _Notes__CaseNotes_ProviderNotes (major_subsection) =============================================================;
!function _Notices_SpecialLetter_Memo__Case_Provider() {
    if (!["CaseSpecialLetter.htm", "CaseMemo.htm", "ProviderMemo.htm", "ProviderSpecialLetter.htm", "CaseNotices.htm", "ProviderNotices.htm"].includes(thisPageNameHtm)) { return };
    let textbox = document.querySelector('textarea:not([disabled])')
    if (textbox) {
        let status = document.getElementById('status')
        if (status) {
            status.value = "Application"
            void doEvent(status)
            status.value = ""
        }
        document.querySelector('.panel-default.panel-box-format')?.addEventListener('click', clickEvent => { //click checkbox if clicking label
            if (clickEvent.target.nodeName !== "STRONG") { return }
            let checkboxParent = clickEvent.target.closest('div.col-lg-4')
            checkboxParent?.querySelector('input[type="checkbox"]:not(:disabled)')?.click()
        })
        document.querySelector('#caseData input#other')?.addEventListener('click', clickEvent => { document.getElementById('otherTextbox').value = clickEvent.target.checked ? 'See Worker Comments below' : '' })
        document.querySelectorAll('div.col-lg-offset-3').forEach( ele => ele.firstElementChild.setAttribute("for", ele.querySelector('input.checkbox').id) )
        // [ "proofOfIdentity", "proofOfActivitySchedule", "proofOfBirth", "providerInformation", "proofOfRelation", "childSchoolSchedule", "citizenStatus", "proofOfDeductions", "proofOfResidence", "scheduleReporter", "proofOfAty", "twelveMonthReporter", "proofOfFInfo", "other" ]
        function pasteEventAHK(pasteEvent) { //AHK code: "LetterTextFromAHKSPLIT" %LetterGUINumber% "SPLIT" MEC2DocType "SPLIT" IdList
            let pastedText = (event.clipboardData || window.clipboardData).getData("text")
            if (pastedText.indexOf("LetterTextFromAHK") !== 0) { return }
            pasteEvent.preventDefault()
            pasteEvent.stopImmediatePropagation()
            let [SpecialLetterFromAHK, commentsText, caseStatus, checkBoxIds] = pastedText.split('SPLIT')
            if (status) {
                status.value = caseStatus
                void doEvent(status)
                queueMicrotask(() => { checkBoxIds.split(',').forEach( ele => document.getElementById(ele).click() ) })
            }
            textbox.value = commentsText
            eleFocus(save)
        }
        document.addEventListener('paste', pasteEventAHK )
        save.addEventListener('click', () => { textbox.value = splitStringAtWordBoundary(textbox.value, 60) })
        if ( ["CaseSpecialLetter.htm", "CaseMemo.htm", "CaseNotices.htm"].includes(thisPageNameHtm) ) { // || ("CaseNotices.htm".includes(thisPageNameHtm) && document.getElementById('textbox2')?.disabled === false) ) {
            save.addEventListener('click', () => { textbox.value = splitStringAtWordBoundary(textbox.value, 60) })
            let textareaButtonText = {
                jsHoursUsed: 'Your case is closing because you have expended your available job search hours.\nTo continue to be eligible for Child Care Assistance, you must have an eligible activity from one of the following:'
                + '\n* Employment of a verified 20 hours per week minimum\n* Education with an approved education plan\n* Activities listed on a DWP/MFIP Employment Plan\nContact me with any questions.',
                extEligEnds: 'Your case is closing because your 3 months of Extended Eligibility are ending and you have not reported participation in an eligible activity.\nTo continue to be eligible for Child Care Assistance,'
                + ' you must have an eligible activity from one of the following:\n* Employment\n* Education with an approved education plan\n* Activities listed on a DWP/MFIP Employment Plan\nContact me with any questions.',
                abpsInHh() {
                    let abpsInput = prompt("What is the absent parent's name?")
                    return 'I have been notified that ' + abpsInput + '\'s address has been changed to match your address. If ' + abpsInput + ' is now residing in your household, please submit the following verifications:'
                        + '\n1. Verification of ' + abpsInput + '\'s work schedule, which must include the days of the week and start/end times\n2. Most recent 30 days income for ' + abpsInput + '\n3. ID for ' + abpsInput + '\n'
                        + 'If this household change is not accurate, please contact me for further instructions. Otherwise ' + abpsInput + ' will be added to your household in 15 days.'
                },
                lnlTraining() {
                    const providerWorkerPhone = countyInfo.info.pwPhone ?? countyInfo.countyInfoPrompt("What is the phone number for provider registrations?", 'pwPhone'), providerWorkerPhoneText = providerWorkerPhone ? ' at ' + providerWorkerPhone : ''
                    return 'As a reminder, you must complete "Supervising for Safety" through DevelopMN to receive payments for care provided past 90 days for any unrelated children. Visit:\n https://app.developtoolmn.org/v7/trainings/search\n'
                        + 'and search for Course Title:\n "Supervising for Safety Legally Nonlicensed"\nContact the Provider Worker' + providerWorkerPhoneText + ' to answer questions about trainings and registration.'
                },
                deniedOpen: 'Recently you submitted an application for the Child Care Assistance Program (CCAP). Your request has been denied for the following reason:\n\nYour CCAP case is currently open.\n\nYour CCAP case will remain open and has been updated with the information reported on this application.',
                fosterChildCcap: 'You must report receiving Child Care Assistance for a foster child if you receive payments from:\n• Foster Care maintenance\n    (Report to: child\'s Tribal or county case manager.)\n• Northstar Kinship/Adoption Assistance\n    (Report to: adoption.assistance@state.mn.us.)',
            }
            let lnlTrainingButton = "CaseMemo.htm".includes(thisPageNameHtm) ? '<button type="button" class="cButton" tabindex="-1" id="lnlTraining">LNL Training</button>' : ''
            let textareaButtonsDivHTML = ''
            + '<div class="float-right-imp" id="textareaButtonsDiv" style="display: flex; flex-direction: column; gap: 8px;">'
            + '<button type="button" class="cButton" tabindex="-1" id="jsHoursUsed">JS Hours Used</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="extEligEnds">Ext Elig Ends</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="abpsInHh">ABPS in HH</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="fosterChildCcap">CCAP for Foster</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="deniedOpen">Denied, Case Open</button>'
            + lnlTrainingButton
            + '</div>'
            !function addTextareaButtons() {
                if (!textbox) { return };
                let targetDiv = "CaseMemo.htm".includes(thisPageNameHtm) ? textbox.closest('.form-group')
                : "CaseNotices.htm".includes(thisPageNameHtm) ? textbox.closest('.form-group').children[0]
                : textbox.closest('.col-lg-12')
                targetDiv?.insertAdjacentHTML('beforeend', textareaButtonsDivHTML)
                document.getElementById('textareaButtonsDiv')?.addEventListener('click', clickEvent => {
                    if (clickEvent.target.nodeName !== "BUTTON") { return }
                    let newLine = textbox.value ? '\n\n' : ''
                    insertTextAndMoveCursor(newLine + textareaButtonText[clickEvent.target.id], textbox)
                })
            }();
        }
    }
    !function Notices_PdfExport() {
        if (!["CaseNotices.htm", "ProviderNotices.htm"].includes(thisPageNameHtm)) { return };
        if (!editMode) { addDateControls("month", '#selectionBeginDate', '#selectionEndDate') }
        let textbox1 = document.getElementById('textbox1'), textbox2 = document.getElementById('textbox2')
        if ( textbox2?.disabled ) {
            function dynamicallyLoadScript(url) {
                let script = document.createElement("script")
                script.src = url
                document.head.append(script)
            }
            function mergeTextboxesText() {
                let textboxText = textbox2.value ? textbox1.value + '\nPAGEBREAK\n\n                      WORKER COMMENTS\n============================================================\n\n' + textbox2.value + '\n\n============================================================' : textbox1.value
                return textboxText
            }
            function createPdfThenDownload(pdfText, pdfName) {
                dynamicallyLoadScript("https://unpkg.com/downloadjs@1.4.7")
                pleaseWait()
                createPdf(pdfText, pdfName).then( thankYouForWaiting() )
            }
            /* globals download, PDFLib */
            async function createPdf(text, fileName) {
                const { PDFDocument, StandardFonts, rgb, PageSizes } = await import("https://unpkg.com/pdf-lib")
                text = text.replaceAll(/(\n)(?=.+Page \d)/g, '\nPAGEBREAK\n')
                text = text.replaceAll(/(?: {74}\n){2,}(?![\s\w])/g, '') // removes the last set of repeated spaces/returns
                text = text.replaceAll(/(?: {74}\n){1,}(?=PAGEBREAK)/g, '') //removes the others
                let textArray = text.split("PAGEBREAK")
                const pdfDoc = await PDFLib.PDFDocument.create()
                const courierFont = await pdfDoc.embedFont(PDFLib.StandardFonts.Courier)
                for await (let pagesText of textArray) {
                    const page = pdfDoc.addPage(), { width, height } = page.getSize(), fontSize = 12
                    page.drawText(pagesText, { lineHeight: 12, x: 35, y: height - 55, size: 12, font: courierFont, })
                }
                const pdfBytes = await pdfDoc.save()
                download(pdfBytes, fileName + ".pdf", "application/pdf");
            }
            textbox2.insertAdjacentHTML('afterend', '<button type="button" class="form-button" style="vertical-align: top;" id="downloadAsPdf">Download as PDF</button>')
            document.getElementById('downloadAsPdf').addEventListener( 'click', () => createPdfThenDownload(mergeTextboxesText(), pageTitle + " " + caseOrProviderId) )
        } else if ( textbox2?.disabled === false ) { focusEle = textbox2 }
    }(); // SECTION_END Notices__Export_to_PDF;
}(); // SECTION_END _Notices_SpecialLetter_Memo__Case_Provider;
!function _Provider_Pages() {
    if ( thisPageNameHtm.indexOf("Provider") !== 0 ) { return; }
!function __ProviderAddress() {
    if (!("ProviderAddress.htm").includes(thisPageNameHtm)) { return };
    let mailingCountry = document.getElementById('mailingCountry')
    if (editMode) {
        if (!document.getElementById('mailingSiteHomeCountry').value) {
            document.getElementById('mailingSiteHomeCountry').value = 'USA'
            document.getElementById('mailingSiteHomeState').value = 'Minnesota'
            typeof userCountyObj !== undefined && (document.getElementById('mailingSiteHomeCounty').value = userCountyObj.county)
        }
        $(mailingCountry).change(() => { //jquery
            if (!document.getElementById('mailingState').value) {
                document.getElementById('mailingState').value = 'Minnesota'
            }
        })
    }
    // SECTION_END ProviderAddress Default values for Country, State, County
    // SECTION_START ProviderAddress Copy Provider mailto Address
    if (!editMode) {
        let mailingStreet1 = document.getElementById('mailingStreet1'), edit = document.getElementById('edit'), addrBillFormDisplay = document.getElementById('addrBillFormDisplay')
        let providerType = document.getElementById('providerData').children[3].children[0].childNodes[2].textContent.trim()
        let providerName = ["Legal Non-licensed", "MN DHS Licensed Family"].includes(providerType) ? nameFuncs.commaNameReorder(pageTitle) : pageTitle
        secondaryActionArea.insertAdjacentHTML('beforeend', ''
                                               + '<div id="copyAddresses" style="display: flex; gap: 5px;">'
                                               + '<button type="button" class="cButton float-right-imp" style="margin-top: 5px;" tabindex="-1" id="copySiteHome">Copy Site/Home Address</button>'
                                               + '<button type="button" class="cButton float-right-imp" style="margin-top: 5px;" tabindex="-1" id="copyMailing">Copy Mailing Address</button>'
                                               + '</div>');
        evalData().then(({ 0: addressData } = {}) => {
            function copyAddress(addressType) {
                let addressTableRow = childOrRowIndex(document.querySelector('.selected'))
                addressData = addressData[addressTableRow]
                const mailingDataCheck = () => {
                    switch(addressType) {
                        case "copyMailing":
                            if (!addressData.mailingStreet1) { return { streetData: false } };
                            return {
                                streetData: [addressData.mailingStreet1, addressData.mailingStreet2].join(' '),
                                cityData: addressData.mailingCity,
                                stateData: stateDataSwap.swapStateNameAndAcronym(addressData.mailingStateProvince),
                                zipData: [addressData.mailingZipCode, addressData.mailingZipCodePlus4].join('-'),
                            }
                        case "copySiteHome":
                            return {
                                streetData: [addressData.mailingSiteHomeStreet1, addressData.mailingSiteHomeStreet2].join(' '),
                                cityData: addressData.mailingSiteHomeCity,
                                stateData: stateDataSwap.swapStateNameAndAcronym(addressData.mailingSiteHomeState),
                                zipData: [addressData.mailingSiteHomeZipCode, addressData.mailingSiteHomeZipCodePlus4].join('-'),
                            }
                    }
                }
                let mailingData = mailingDataCheck()
                if (!mailingData.streetData) { snackBar('No mailing address.', 'notitle'); return };
                let copyText = providerName + "\n" + mailingData.streetData + "\n" + mailingData.cityData + ", " + mailingData.stateData + " " + mailingData.zipData;
                copy(copyText, copyText)
            }
            document.getElementById('copyAddresses').addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName !== "BUTTON") { return }
                copyAddress(clickEvent.target.id)
            })
            let whereinfoissentParent = h4objects.whereinfoissent.h4.parentElement
            whereinfoissentParent.id = "whereinfoissentParent"
            whereinfoissentParent.insertAdjacentHTML('afterbegin', '<style>#whereinfoissentParent select { cursor: pointer !important; }</style>')
            whereinfoissentParent.addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName !== "SELECT") { return }
                copyAddress(clickEvent.target.value === "Mailing" ? "copyMailing" : "copySiteHome")
            })
            !mailingStreet1?.value && !edit.disabled && (checkMailingAddress())//Removes visibility of mailing address fields if blank
            checkMailingAddress()
            function checkMailingAddress() {
                mailingCountry.value ? h4objects.mailingaddress.siblings.forEach(ele => ele.classList.remove('hidden')) : h4objects.mailingaddress.siblings.forEach(ele => ele.classList.add('hidden'))
            };
            document.getElementById('providerAddressData').addEventListener('click', () => { checkMailingAddress() });
        }).catch(err => { console.trace(err) });
    };
}(); // SECTION_END Provider_Address;
!function __ProviderNotices() {
    if (!("ProviderNotices.htm").includes(thisPageNameHtm)) { return };
    let removeButton = document.getElementById('remove'), cancelButton = document.getElementById('cancel'), resendButton = document.getElementById('resend')
    let providerNoticesTableTbody = document.querySelector('#providerNoticesSearchData > tbody')
    if (removeButton && providerNoticesTableTbody.children[0].textContent !== "No records found") {
        function addRemDisabled(target) {
            if (!cancelButton.disabled && target.nodeName === "TR" && target.children[5].textContent.indexOf("Waiting") > -1) { cancelButton.disabled = false; resendButton.disabled = true }//says waiting, cancel is disabled: disable resend, remove disable cancel;
            else if (resendButton.disabled && target.nodeName === "TR" && target.children[5].textContent.indexOf("Waiting") < 0) { resendButton.disabled = false; cancelButton.disabled = true }//doesn't say waiting, disable cancel, remove disable resend;
        }
        waitForTableCells('#providerNoticesSearchData').then( () => addRemDisabled( providerNoticesTableTbody.children[0] ) )
        providerNoticesTableTbody.addEventListener('click', clickEvent => { addRemDisabled( getTableRow(clickEvent.target) ) })
    }
}(); // SECTION_END Provider_Notices;
!function __ProviderPaymentHistory() {
    if (!("ProviderPaymentHistory.htm").includes(thisPageNameHtm)) { return };
    addDateControls("month", "#paymentPeriodBegin", "#paymentPeriodEnd")
}(); // SECTION_END Provider_Payment_History;
!function __ProviderRates() {
    if (!("ProviderRates.htm").includes(thisPageNameHtm)) { return }
    doNotDupe.buttons.push('#ratePeriodSelectButtonDB')
}(); // SECTION_END Provider_Rates;
!function __ProviderRegistrationAndRenewal() {
    if (!("ProviderRegistrationAndRenewal.htm").includes(thisPageNameHtm)) { return };
    doNotDupe.buttons.push('#providerIdSubmit')
    if (!editMode) {
        if (typeof userCountyObj !== undefined) {
            let userCountyRow = [...document.querySelectorAll('#providerRegistrationAndRenewalTable > tbody > tr')].find(ele => ele.innerText.includes(userCountyObj?.county + ' County') );
            if (userCountyRow) {
                userCountyRow.click()
                focusEle = '#editDB'
            }
        } else { focusEle = '#newDB' }
    } else { focusEle = '#nextRenewalDue' }
}(); // SECTION_END Provider_Registration_and_Renewal;
!function __ProviderRegistrationList() {
    if (!("ProviderRegistrationList.htm").includes(thisPageNameHtm)) { return };
    let searchServicingAgencyCode = document.getElementById('searchServicingAgencyCode')
    searchServicingAgencyCode.prepend( searchServicingAgencyCode.querySelector('option[value="' + userCountyObj.code.slice(1) + '"]') )
}(); // SECTION_END Provider_Registration_List;
!function __ProviderTraining() {
    if (!("ProviderTraining.htm").includes(thisPageNameHtm)) { return };
    document.querySelector('div#providerTrainingData > div.form-group').insertAdjacentHTML('beforebegin', '<div style="margin: 0 0 5px;"><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_110909" target="_blank">CCAP Policy Manual - Legal Non-Licensed Provider Trainings</a></div>')
}(); // SECTION_END Provider_Training;
}(); // SECTION_END _Provider_Pages;
!function ProviderSearch() {
    if (!("ProviderSearch.htm").includes(thisPageNameHtm)) { return };
    document.getElementById('providerSearchTable').classList.add('toggledTable')
    let providerSearchTableTbody = document.querySelector('#providerSearchTable > tbody'), providerSearchTableTbodyChildren = providerSearchTableTbody.children, providerSearchResultsLength = providerSearchTableTbodyChildren.length
    tabIndxNegOne('#ssn, #itin, #fein, #licenseNumber, #middleInitName')
    if (providerSearchResultsLength > 1) {
        let localCounties = {
            neighbors: [...userCountyObj?.neighbors, userCountyObj?.county],
            outOfState: userCountyObj?.outOfState
        }
        const invisEle = document.createElement('div')
        document.body.append(invisEle)
        invisEle.classList.add('inactiveToggle')
        const hiddenClassSet = new Set(['inactiveToggle', 'outOfAreaToggle'])
        let searchStyle = cssStyle(), replaceStyle = doTableStyleToggle(invisEle, 'outOfAreaToggle')
        searchStyle.replaceSync( replaceStyle + " tbody .inactiveToggle { display: none !important; } tbody .outOfAreaToggle { display: none !important; }" );
        evalData().then(providerArray => {
            const { 0: providerList } = providerArray
            for (let index in providerList) {
                let providerData = providerList[index], countyName = providerData.county.replace(/<.*?>/g, '')
                if (providerData.status.indexOf("Inactive") > -1) { // adding inactive
                    providerSearchTableTbodyChildren[providerData.selectedRowIndex].classList.add('inactiveToggle')
                }
                if ( !localCounties.neighbors?.includes(countyName) ) { // adding out-of-area
                    if (countyName === "Out-of-State" && localCounties.outOfState) {
                        let providerZip = providerData.address.slice(-9, -4)
                        if ( inRange(providerZip, localCounties.outOfState[0], localCounties.outOfState[1]) ) { continue }
                    }
                    providerSearchTableTbodyChildren[providerData.selectedRowIndex].classList.add('outOfAreaToggle')
                }
            }
            let openActiveNearby = providerSearchTableTbody.querySelectorAll('tr:not(.inactiveToggle, .outOfAreaToggle').length, openActive = providerSearchTableTbody.querySelectorAll('tr:not(.inactiveToggle').length
            let inactiveToggle = createSlider({ label: "Show Inactive", title: "Show or hide providers that are inactive", id: "inactiveToggle", defaultOn: false, }), outOfAreaToggle = createSlider({ label: "Show Out-of-Area", title: "Show or hide providers that are more than 1 county away", id: "outOfAreaToggle", defaultOn: false, })
            let h5element = document.querySelector('h5')
            h5element.textContent += " " + openActiveNearby + " open local providers. " + openActive + " active providers."
            h5element.insertAdjacentHTML('afterend', '<div id="searchFilters" style="gap: 30px; display: flex; justify-content: center; margin: -2px 0 5px;">' + inactiveToggle + outOfAreaToggle + '</div>')
            document.getElementById('searchFilters').addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName !== "INPUT") { return }
                let replaceStyle = doTableStyleToggle(invisEle, clickEvent.target.id)
                let nonHidden = hiddenClassSet.difference(new Set([...invisEle.classList])), hidden = hiddenClassSet.difference(nonHidden)
                let nonHiddenRule = [...nonHidden].map(item1 => " ." + item1 + " { display: table-row; }").join(''), hiddenRule = [...hidden].map(item2 => " ." + item2 + " { display: none; }").join('')
                searchStyle.replaceSync( replaceStyle + nonHiddenRule + hiddenRule )
            })
            queueMicrotask(() => { providerSearchTableTbody.querySelector('tr:not(.inactiveToggle, .outOfAreaToggle)').click() })
        }).catch(err => { console.trace(err) });
    }
    if (providerSearchResultsLength === 1 && providerSearchTableTbodyChildren[0].textContent !== "No records found" ) {
        [...providerSearchTableTbody.querySelectorAll('a')].forEach(ele => { ele.target = '_self' })
    }
    let docRef = document.referrer
    if (!['CaseChildProvider.htm?', 'ProviderSearch.htm?'].includes(docRef.slice(docRef.indexOf("/ChildCare/") + 11, docRef.indexOf(".htm") + 5))) { [...document.querySelectorAll('#back, #select, #backDB, #selectDB')].forEach(ele => { ele.style.display = "none" }) }
}(); // SECTION_END Provider_Search;
!function _Transfers_ServicingAgency_Incoming_Outgoing() {
    if (!["ServicingAgencyIncomingTransfers.htm", "ServicingAgencyOutgoingTransfers.htm"].includes(thisPageNameHtm)) { return };
    listPageLinksAndList(5, "CaseAddress")
}(); // SECTION_END _Transfers_ServicingAgency_Incoming_Outgoing;
!function _WorkerPages_ProviderRegistrationList() {
    if (!["CaseWorker.htm", "lastUpdateWorker.htm", "WorkerSearch.htm", "ProviderWorker.htm", "ProviderRegistrationList.htm"].includes(thisPageNameHtm)) { return };
    document.querySelector('form').addEventListener('click', clickEvent => {
        if (clickEvent.target.nodeName !== "LABEL") { return }
        let inputSiblingsText = [...clickEvent.target.parentNode.querySelectorAll('input, output, textarea')].map(ele => ele.value).filter(item => item.length).join('\n')
        inputSiblingsText && copy(inputSiblingsText, inputSiblingsText, 'Copied!')
    })
    let selectWorker = document.getElementById('selectWorker')
    if (selectWorker) { document.getElementById('workerSearchTable_wrapper').insertAdjacentElement('afterend', selectWorker); selectWorker.style.marginBottom = "10px" }
}(); // SECTION_END _WorkerPages_ProviderRegistrationList;
} catch(err) { console.trace(err) };
}();
// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================
!function duplicateFormButtons() { // SECTION_START Duplicate_Form_Buttons_Above_Form
    if (iFramed || !countyInfo.userSettings.duplicateFormButtons) { return };
    if ("CaseWrapUp.htm".includes(thisPageNameHtm) && document.querySelector('.rederrortext')?.innerText === 'Case Wrap-Up successfully submitted.') { return };
    if (thisPageNameHtm.indexOf('List.htm') > -1 || doNotDupe.pages.includes(thisPageNameHtm)) { return; }
    if (thisPageNameHtm.indexOf('Provider') > -1 && rederrortextContent.find(arrItem => arrItem.indexOf("This page is not available") > -1)) { return };
    let mutable = document.getElementsByClassName('mutable')
    try {
        document.querySelectorAll('tbody').forEach(table => { table.addEventListener( 'click', () => checkDBclickability() ) })
        let doNotDupeButtons = doNotDupe.buttons.length ? ', ' + doNotDupe.buttons.join() : ''
        document.querySelectorAll('input.form-button:not(.panel-box-format input.form-button, form > div.form-group input.form-button, .modal-button, .modal .form-button, [hidden]' + doNotDupeButtons + ')').forEach(ele2 => {
            if (ele2.value) {
                let idName = ele2.id + "DB";
                let underlineFirst = !doNotDupe.doNotUnderline.includes(ele2.id) ? ' ulfl' : ''
                duplicateButtons.insertAdjacentHTML('beforeend', '<button type="button" class="form-button mutable' + underlineFirst + '" id="' + idName + '" disabled="disabled">' + ele2.value + '</button>');
            };
        })
        !duplicateButtons.children.length && (duplicateButtons.classList.add('hidden'))
        duplicateButtons.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            clickEvent.preventDefault()
            let clickedButton = clickEvent.target.closest('button.mutable:not(:disabled)')
            document.getElementById(clickedButton.id.slice(0, -2))?.click()
        })
    }
    catch (err) { console.trace(err) }
    finally { setTimeout(() => checkDBclickability(), 100) }
    function checkDBclickability() {
        [...mutable].forEach(ele => {
            let oldButtonId = ele.id.split('DB')[0];
            if ( document.getElementById(oldButtonId)?.disabled ) { ele.disabled = true }
            else { ele.disabled = false }
        })
    }
}(); // SECTION_END Duplicate_Form_Buttons_Above_Form;
// ======================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// ELEMENT_FOCUS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
!function focusElement() {
    if (iFramed) { return };
    function firstEmptyElement() { return [...document.querySelectorAll('.panel-box-format :is(input, select):not(:disabled, .form-button, [readonly], [type="hidden"], [type=checkbox])')].find( ele => ["No Verification Provided", 'No', 'Not Cooperating', ''].includes(ele.value) ) };
    !function autoFocusOnPageLoad() {
    try { //========== Auto_Focus_On_Page_Load Start =================
        if ( caseIdElement && !caseId ) { focusEle = caseIdElement; return; }
        else if ( providerIdElement && !providerId ) { focusEle = providerIdElement; return; }
        if (!countyInfo.userSettings.eleFocus) { return };
        !function autoFocusCaseId() {
            if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#new' : document.getElementById('pmiNumber').disabled ? '#next' : '#pmiNumber' };
            if (!caseId) { return };
            !function activity_income_tab_pages() {
                if (["CaseEarnedIncome.htm", "CaseUnearnedIncome.htm", "CaseExpense.htm"].includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB'; return };
                    let warning = rederrortextContent.find(arrItem => arrItem.indexOf('Warning: This data will expire') > -1)
                    let newMember = document.querySelector('#memberReferenceNumberNewMember, #refPersonName'), hasVerif = document.querySelector('#ceiVerification, #verification, #verificationType'), amount = document.querySelector('#ceiPrjAmount, #incomeProjectionAmount, #projectionExpenseAmount')
                    focusEle = warning ? '#saveDB'
                    : newMember ? newMember
                    : hasVerif?.value === 'No Verification Provided' ? hasVerif
                    : amount
                }
                if (("CaseLumpSum.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB' }
                    else if (document.getElementById('lumpSumVerification').value === 'No Verification Provided') { focusEle = '#lumpSumVerification' }
                    else { focusEle = '#memberReferenceNumberNewMember' }
                }
                //activity pages that aren't the elig result one
                if ( thisPageNameHtm.indexOf("Activity.htm") > -1 && !("CaseEligibilityResultActivity.htm").includes(thisPageNameHtm) ) {
                    if (!editMode) { focusEle = '#newDB' }
                    else if (rederrortextContent.find(arrItem => arrItem.indexOf('Warning: This data will expire') > -1)) { focusEle = '#saveDB' }
                    else if (document.querySelector('#employmentActivityVerification, #verification').value === 'No Verification Provided') { focusEle = document.querySelector('#employmentActivityVerification, #verification') }
                    else if (document.querySelector('#memberReferenceNumberNewMember, #pmiNbrNew')) { focusEle = document.querySelector('#memberReferenceNumberNewMember, #pmiNbrNew'); tabIndxNegOne('#activityEnd, #employmentActivityEnd, #activityPeriodEnd, #leaveDetailExtendedEligibilityBegin, #leaveDetailRedeterminationDue') }
                    else { focusEle = document.querySelector('#activityEnd, #employmentActivityEnd, #activityPeriodEnd') }
                }
                if (("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) {
                    if (editMode) { focusEle = '#hoursUsed'; setTimeout(document.getElementById('hoursUsed').select(), 1) }
                    else if (!editMode) { focusEle = '#editDB' }
                } //SUB-SECTION Activity_and_Income_tab_pages
            }();
            !function member_tab_pages() {
                if (("CaseCSE.htm").includes(thisPageNameHtm)) {
                    if (!editMode) {
                        tbodiesFocus('#addChildDB')
                        focusEle = document.referrer.indexOf(thisPageNameHtm) > -1 ? '#newDB' : document.getElementById('addChild')?.disabled === false ? '#addChildDB' : '#newDB'
                    } else {
                        let csePriNewReferenceNumber = document.getElementById('csePriNewReferenceNumber'), cseDetailsFormsCompleted = document.getElementById('cseDetailsFormsCompleted'), cseDetailsCooperationStatus = document.getElementById('cseDetailsCooperationStatus'), cseChildrenGridChildNewReferenceNumber = document.getElementById('cseChildrenGridChildNewReferenceNumber')
                        focusEle = csePriNewReferenceNumber?.value !== undefined ? csePriNewReferenceNumber
                        : cseChildrenGridChildNewReferenceNumber && !document.getElementById('cseChildrenGridChildNewReferenceNumber').value ? '#cseChildrenGridChildNewReferenceNumber'
                        : actualDate.dateField && !actualDate.dateField.disabled && !actualDate.dateField.value ? actualDate.dateField
                        : cseDetailsFormsCompleted?.value === "No" ? cseDetailsFormsCompleted
                        : cseDetailsCooperationStatus?.value === "Not Cooperating" ? cseDetailsCooperationStatus
                        : firstEmptyElement()
                    }
                };
                if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB' }
                    else if (editMode) {
                        focusEle = rederrortextContent.find(arrItem => arrItem.indexOf("Warning") > -1) ? '#saveDB'
                        : document.getElementById('memberReferenceNumberNewMember') && !document.getElementById('memberReferenceNumberNewMember')?.value ? '#memberReferenceNumberNewMember'
                        : document.getElementById('providerType').value === "Legal Non-licensed" ? ''
                        : (!document.getElementById('primaryBeginDate').value && !document.getElementById('secondaryBeginDate').value) && document.getElementById('providerType').value !== "Legal Non-licensed" ? '#primaryBeginDate'
                        : '#hoursOfCareAuthorized'
                    }
                }
                if (["CaseFraud.htm", "CaseImmigration.htm"].includes(thisPageNameHtm)) { if (!editMode) { focusEle = '#newDB' } }
                if (("CaseMember.htm").includes(thisPageNameHtm)) {
                    tbodyFocusNextEdit()
                    if (!editMode) { focusEle = '#newDB' }
                    else {
                        focusEle = document.getElementById('next')?.disabled === false ? '#next'
                        : !document.getElementById('memberReferenceNumber')?.value ? '#memberReferenceNumber'
                        : firstEmptyElement()
                    }
                }
                if (("CaseMemberII.htm").includes(thisPageNameHtm)) {
                    const membRefNumNewMemb = document.getElementById('memberReferenceNumberNewMember'), membCitVer = document.getElementById('memberCitizenshipVerification')
                    setTimeout(() => {
                        tbodyFocusNextEdit()
                        if ( document.getElementById('new')?.disabled === false ) { focusEle = '#newDB' }
                        else {
                            if ( document.getElementById('next')?.disabled === false ) { focusEle = '#next' }
                            else if (!editMode) { focusEle = '#editDB' }
                            else if (editMode) {
                                if (membRefNumNewMemb && !membRefNumNewMemb?.value) { focusEle = membRefNumNewMemb } // eslint-disable-line no-undef
                                else if (actualDate.dateField?.value === '') { focusEle = actualDate.dateField }
                                else if ( ['', 'No Verification Provided'].includes(membCitVer.value) ) { focusEle = membCitVer } // eslint-disable-line no-undef
                                else { focusEle = firstEmptyElement() }
                            }
                        }
                    }, 75)
                }
                if (("CaseParent.htm").includes(thisPageNameHtm)) {
                    if (editMode) {
                        let parentReferenceNumberNewMember = document.getElementById('parentReferenceNumberNewMember')
                        if ( parentReferenceNumberNewMember ) { focusEle = parentReferenceNumberNewMember }
                        else if ( !parentReferenceNumberNewMember && document.getElementById('childReferenceNumberNewMember') ) { focusEle = '#childReferenceNumberNewMember' }
                        else if ( ['No Verification Provided', ''].includes(document.getElementById('parentVerification')?.value) ) { focusEle = '#parentVerification' }
                        else { focusEle = document.querySelector('#cancel, #revert') }
                    }
                    else if (!editMode) {
                        tbodiesFocus('#editDB')
                        if (document.referrer.indexOf(thisPageNameHtm) > -1) { focusEle = '#newDB' }
                        else { focusEle = document.getElementById('add')?.disabled === false ? '#addDB' : '#newDB' }
                    }
                }
                if (("CaseRemoveMember.htm").includes(thisPageNameHtm)) {
                    focusEle = editMode ? '#memberReferenceNumberNewMember' : '#newDB'
                }
                if (("CaseSchool.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB' }
                    else {
                        let memberReferenceNumberNewMember = document.getElementById('memberReferenceNumberNewMember')
                        focusEle = memberReferenceNumberNewMember ? memberReferenceNumberNewMember : !actualDate.dateField?.value ? actualDate.dateField : '#saveDB'
                    }
                }
            }();
            !function case_tab_pages() {
                if (("CaseAction.htm").includes(thisPageNameHtm)) {
                    if (!editMode) {
                        if (document.referrer.match(thisPageNameHtm)) { focusEle = '#wrapUpDB' }
                        else { focusEle = document.getElementById('delete').disabled ? '#newDB' : '#deleteDB' }
                    } else { focusEle = '#failHomeless' }
                }
                if (("CaseAddress.htm").includes(thisPageNameHtm)) {
                    tbodyFocusNextEdit()
                    if (editMode && rederrortextContent.find(arrItem => arrItem.indexOf("Warning: Effective date has changed - Review Living Situation") > -1)) {
                        doClick(save)
                    }
                    else {
                        let previousButton = document.getElementById('previous'), residenceStreet1 = document.getElementById('residenceStreet1')
                        let editingMode = ( previousButton ) ? /*true*/ previousButton.disabled ? "appEditing" : "appNotEditing" : /*false*/ document.getElementById('edit').disabled ? "editing" : "notEditing"
                        if (editingMode === "appNotEditing") { focusEle = residenceStreet1?.value ? '#wrapUpDB' : '#new' }
                        if (editingMode === "notEditing") { focusEle = '#editDB' }
                        if (editingMode === "appEditing" || editingMode === "editing") {
                            let subsidizedHousing = document.getElementById('subsidizedHousing')
                            if (!subsidizedHousing?.value) { focusEle = subsidizedHousing }
                            else if (residenceStreet1?.value) { focusEle = '#effectiveDate' }
                        }
                    }
                }
                if (("CaseDisability.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#memberReferenceNumberNewMember' }
                if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
                    if (!editMode) {
                        if (document.getElementById('redeterminationStatus').value === 'Updates Required') { focusEle = '#wrapUpDB' }
                        else { focusEle = '#editDB' }
                    }
                    else if ( rederrortextContent.find(arrItem => arrItem.indexOf("Warning") > -1 )) { focusEle = '#saveDB' }
                    else { document.getElementById('redeterminationStatus').value = 'Updates Required'; focusEle = '#receiveDate' }
                }
                if (("CaseReinstate.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { document.getElementById('reason').value.length ? focusEle = '#wrapUpDB' : focusEle = '#editDB' }
                    else { document.getElementById('reason')?.value?.length ? focusEle = '#saveDB' : focusEle = '#reason' }
                }
            }();
            !function eligibility_SA_tabs_pages() {
                if (["CaseEligibilityResultSelection.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
                    !function checkIfBackground() {
                        let proceedButton = document.querySelector('#approveDB, #selectDB')
                        setTimeout(() => { // eleFocus due to timeout;
                            if (rederrortextContent.includes("Background transaction in process.")) {
                                document.querySelector('#approve, #select').disabled = true
                                proceedButton.disabled = true
                                eleFocus(submitButton)
                            } else {
                                eleFocus(proceedButton)
                                tbodiesFocus(proceedButton)
                            }
                        }, 400)
                    }();
                }
                if ([ "CaseEligibilityResultOverview.htm", "CaseEligibilityResultFamily.htm", "CaseEligibilityResultPerson.htm", "CaseEligibilityResultActivity.htm", "CaseEligibilityResultFinancial.htm", ].includes(thisPageNameHtm)) {
                    focusEle = !editMode ? '#nextDB' : '#overrideReason'
                    tbodiesFocus('#nextDB')
                }
                if (("CaseEligibilityResultApproval.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#approveDB' : '#type' }
                if (["CaseEligibilityResultApprovalPackage.htm", "CaseServiceAuthorizationApprovalPackage.htm"].includes(thisPageNameHtm)) {
                    tbodiesFocus('#confirmDB')
                    focusEle = '#confirmDB'
                }
                if (["CaseCreateEligibilityResults.htm", "CaseCreateServiceAuthorizationResults.htm"].includes(thisPageNameHtm) && !editMode) { focusEle = !rederrortextContent.includes("Results successfully submitted.") ? '#createDB' : '#postWrapUpButtons > button' }
                if (["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm"].includes(thisPageNameHtm) && !editMode && !noResultsForCase) { focusEle = '#nextDB' }
            }();
            !function case_other_pages() {
                if (["CaseSpecialLetter.htm", "CaseMemo.htm"].includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : document.querySelector('#memberComments, #status') }
                if (("CaseTransfer.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#caseTransferFromType' }
                if (["CaseCSIA.htm", "CaseCSIB.htm", "CaseCSIC.htm", "CaseCSID.htm"].includes(thisPageNameHtm)) {
                    focusEle = !editMode ? '#newDB' : firstEmptyElement()
                    tbodiesFocus('#newDB')
                }
                if (("CaseNotes.htm").includes(thisPageNameHtm)) {
                    if (!editMode) {
                        waitForElmHeight('#caseNotesTable > tbody > tr:not(.hidden-tr)').then(() => {
                            let notHiddenTrs = document.querySelectorAll('#caseNotesTable > tbody > tr:not(.hidden-tr)')
                            if (notHiddenTrs.length) { notHiddenTrs[0].click(); focusEle = '#newDB' }
                        })
                    } else if (!localStorage.getItem("MECH2.note")?.length) {
                        let noteMemberReferenceNumber = document.getElementById('noteMemberReferenceNumber')
                        noteMemberReferenceNumber.addEventListener( 'focus', () => setTimeout(save.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0) )
                        focusEle = noteMemberReferenceNumber
                    }
                };
                if (("CaseWrapUp.htm").includes(thisPageNameHtm)) {
                    if ( document.getElementById('done').disabled === false ) {
                        if (sessionStorage.getItem('processingApplication') && document.referrer.indexOf("CaseAddress.htm") > -1) {
                            document.getElementById('Member.btn').click()
                            focusEle = document.getElementById('CaseParent.htm')
                        } else { focusEle = '#doneDB' }
                    } else {
                        let previousPage = sessionStorage.getItem('MECH2.previousPage')
                        focusEle = previousPage.indexOf("https://mec2.childcare.dhs.state.mn.us/ChildCare/CaseChildProvider.htm") > -1 ? '#goSAApproval' : '#goEligibility'
                        window.addEventListener( 'unload', () => sessionStorage.removeItem('MECH2.previousPage') )
                    }
                }
                if (("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) {
                    if ( document.getElementById('next')?.disabled ) {
                        let unchecked = [...document.querySelectorAll('#countiesTable td>input.form-check-input')].filter(ele => ele.hasAttribute('checked') === false)
                        if (unchecked.length) {
                            unchecked.forEach(ele2 => ele2.classList.add('required-field'))
                            focusEle = '#' + unchecked[0].id
                        } else { focusEle = '#addccap' }
                    }
                    else { focusEle = '#next' }
                }
            }();
            // Billing_Pages
            !function financial_tab_pages() {
                if (("FinancialBilling.htm").includes(thisPageNameHtm)) { !editMode ? focusEle = '#editDB' : setTimeout(() => { focusEle = '#billedTimeType' }, 1000) }
                if (("FinancialBillingApproval.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#approveBillingDB' : '#remittanceComments' }
                if (("FinancialBillingRegistrationFeeTracking.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#addDB' : '#caseTransferFromType' }
                if (("FinancialAbsentDayHolidayTracking.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#addDB' : '#caseTransferFromType' }
                if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) { focusEle = '#mpProviderId' }
            }();
        }();
        !function autoFocusProviderId() {
            if (!providerId) { return };
            //SUB-SECTION START Provider pages
            if (("ProviderAccreditation.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#editDB' : '#accreditationType' }
            if (("ProviderAddress.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#editDB' : '#mailingSiteHomeStreet1' }
            if (("ProviderAlias.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#addBusiness' : '#name' }
            if (("ProviderInformation.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#editDB' : '#contactEmail' }
            if (("ProviderLicense.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#editButtonDB' : '#licenseNumber' }
            if (("ProviderSpecialLetter.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#activity' }
            if (("ProviderTaxInfo.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#taxType' }
        }();
        if (("ClientSearch.htm").includes(thisPageNameHtm)) { document.querySelector('#clientSearchTable > tbody > tr > td.dataTables_empty') && (focusEle = '#ssnReq') }
        if (("ProviderSearch.htm").includes(thisPageNameHtm)) { document.querySelector('#providerSearchTable > tbody > tr > td.dataTables_empty') && (focusEle = '#providerIdNumber') }
        if (("ServicingAgencyIncomingTransfers.htm").includes(thisPageNameHtm) && editMode) { focusEle = '#workerIdTo' }
        !function check_for_redtext_errors() {
            if (!editMode || !rederrortextContent.length) { return }
            if ( rederrortextContent.some( item => item.indexOf('is missing') > -1 ) ) {
                focusEle = document.querySelector('errordiv').closest('div').querySelector('input, select') ?? document.querySelector('errordiv').closest('div').previousElementSibling.querySelector('input, select')
            }
        }();
    } catch (error) { console.trace("eleFocus section", focusEle, error) } //========== Auto_Focus_On_Page_Load End =================
    }();
    !function hotkeysForModals() {
        try { //========== Hotkeys_for_Modals Start =================
            let popupModal = [...document.getElementsByClassName('modal')]
            if (popupModal?.length) {
                const popupModalConfig = { attributes: true }
                popupModal.forEach(ele => {
                    let popupModalObserver = new TrackedMutationObserver(() => {
                        const controllerModal = new AbortController()
                        if ( document.querySelector('.modal.in') ) {
                            window.addEventListener('keydown', keydownEvent => {
                                if (['o', 'c'].includes(keydownEvent.key)) { keydownEvent.preventDefault() } else { return };
                                switch (keydownEvent.key) {
                                    case 'o': document.querySelector('.in input.form-button:nth-child(1)').click(); break;
                                    case 'c': document.querySelector('.in input.form-button:nth-child(2)').click(); break;
                                }
                            }, { signal: controllerModal.signal })
                            setTimeout(() => { eleFocus(document.querySelector('.modal.in input') ) }, 250)
                            return false
                        } else {
                            controllerModal.abort()
                        }
                    })
                    popupModalObserver.observe(ele, popupModalConfig);
                });
            }
        } catch(err) { console.trace(err) }; //========== Hotkeys_for_Modals End =================
    }();
}();
function eleFocus(ele) {
    if (ele === "blank") { return };
    let eleToFocus = sanitize.query(ele)
    if (eleToFocus) {
        function doEleFocus() {
            if ( eleToFocus.nodeName === "INPUT" && eleToFocus.classList.contains('form-control') ) { eleToFocus.select() }
            else { eleToFocus.focus() }
        }
        docReady(doEleFocus)
    } else { console.trace("eleFocus failed to find element based on query:", ele, ". Check for missing #.") }
};
// ////////////////////////////////////////////////////////////////////////// ELEMENT_FOCUS SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================
// ======================================================================================================================================================================================================
// ///////////////////////////////////////////////////////////////////////////// SITE_WIDE_FUNCTIONS SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
//           datePicker related;
let datepickerDiv = document.getElementById('ui-datepicker-div');
!function jQueryDatePickerSettings() {
    if (iFramed) { return }; // Sets jQuery calendar to show 3 months
    try {
        if ($.datepicker !== undefined) {
            $.datepicker.setDefaults({
                numberOfMonths: 3,
                showCurrentAtPos: 1,//middle, 0 index
                stepMonths: 3,
                maxDate: "+5y",
            })
        }
    } catch (error) { console.trace(error) }
}(); // Sets jQuery calendar to show 3 months;
function closeDatePicker(dateInputElement=0) {
    if (!datepickerDiv || !dateInputElement) { return }
    datepickerDiv.classList.add('hidden')
    let sanitizedDateInputElement = sanitize.query(dateInputElement) ?? undefined
    if (sanitizedDateInputElement) {
        sanitizedDateInputElement.addEventListener('click', () => datepickerDiv.classList.remove('hidden') )
        setTimeout(() => {
            sanitizedDateInputElement.addEventListener('focus', () => datepickerDiv.classList.remove('hidden') )
        }, 1000)
    }
};
!function autoHideDatePicker() {
        if (!countyInfo.userSettings.autoHideDatePicker || !datepickerDiv) { return }
        datepickerDiv?.classList.add('hidden')
        let datepickerFields = [...document.querySelectorAll('.hasDatepicker')]
        let removeHidden = datepickerFields?.forEach(ele => ele.addEventListener('click', () => datepickerDiv.classList.remove('hidden') ))
        let addHidden = datepickerFields?.forEach( ele2 => ele2.addEventListener('input', inputEvent => { if (inputEvent.data && parseInt(inputEvent.data) < 10) { datepickerDiv.classList.add('hidden') } }) )
        async function getClipboardText() { return await navigator.clipboard.readText() }
        let pasteDate = datepickerFields?.forEach( ele3 => ele3.addEventListener('keydown', async keydownEvent => {
            if (keydownEvent.key === 'v' && keydownEvent.ctrlKey) { keydownEvent.target.value = await getClipboardText() }
        }) )
}();
function datePickerDateChanged(dateField) {
//     // dateField.addEventListener('keyup', )
//     // dateField.addEventListener('blur', )
//     const datepicker = document.getElementById('ui-datepicker-div')
//     if (!datepicker) { return }
//     const datepickerObserver = new MutationObserver(m => {
//         if (!datepicker.style.opacity && datepicker.style.display === "none") {
//         }
//     })
//     const datepickerObserverSettings = { attributeFilter: ['style'], attributeOldValue: true, }
//     datepickerObserver.observe(datepicker, datepickerObserverSettings)
};
function addDateControls(increment, ...eles) {
    eles.forEach(dateControl => {
        dateControl = sanitize.query(dateControl)
        if (!dateControl) { return }
        let dateControlParent = dateControl.parentElement
        if (dateControlParent.nodeName !== "DIV") { doWrap(dateControl); dateControlParent = dateControl.parentElement }
        dateControlParent.classList.add('has-controls')
        dateControl.insertAdjacentHTML('beforebegin', '<button type="button" class="controls prev-control" id="prev.' + dateControl.id + '">-</button>')
        dateControl.insertAdjacentHTML('afterend', '<button type="button" class="controls next-control" id="next.' + dateControl.id + '">+</button>')
        dateControlParent.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            let prevOrNext = clickEvent.target.id.split(".")[0], datePickerElement = prevOrNext === "prev" ? clickEvent.target.nextElementSibling : clickEvent.target.previousElementSibling, controlDate = new Date(datePickerElement.value)
            if (increment === "month") {
                if (prevOrNext === "prev") { datePickerElement.value = dateFuncs.formatDate( new Date(controlDate.setMonth(controlDate.getMonth() - 1)), "mmddyyyy" ) }
                else if (prevOrNext === "next") { datePickerElement.value = dateFuncs.formatDate( new Date(controlDate.setMonth(controlDate.getMonth() + 1)), "mmddyyyy" ) }
            } else if (increment === "day") {}
        })
    })
};
//           highly specific operations;
function ifNoPersonUntabEndAndDisableChange(member, end, change) {
    if (member = sanitize.query(member)) {
        sanitize.query(end).tabindex = "-1"
        sanitize.query(change).disabled = true
    }
};
function checkTablesForBlankOrNo(memberData, memberDataObject, caseMemberTableChildren) {
	for (let member in memberData) {
		let thisMember = memberData[member]
		let noResponses = []
		for (let mdKey in memberDataObject) {
			let memberDataItem = memberDataObject[mdKey]
			if ('requiredFunc' in memberDataItem && !memberDataItem.requiredFunc(thisMember) ) { continue }
			if ( !thisMember[mdKey] ) { noResponses.push( "(" + memberDataItem.label + ")" )}
			else if ( (memberDataItem.keywords).includes(thisMember[mdKey]) ) { noResponses.push(memberDataItem.label) }
		}
		if (noResponses.length) {
			caseMemberTableChildren[member].children[1].insertAdjacentHTML('beforeend', '<span class="float-right-imp" style="color: var(--textColorNegative);">' + noResponses.join(', ') + '</span>')
		}
	}
};
function addValueClassDoEvent(ele, addValue, addClass, event) {
    ele = sanitize.query(ele)
    if (!ele) { return }
    addValue ? ele.value = addValue : 0
    addClass && ele.classList.add(addClass)
    event && doEvent(ele)
};
//           add/change element styles;
function cssStyle() {
    const newStyleSheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(newStyleSheet)
    return newStyleSheet
};
function doTableStyleToggle(invisElem, togClass) {
    function doToggle(element, togClass) { invisElem.classList.toggle(togClass); return '.' + [...invisElem.classList].join(', .') }
    let doToggleClass = doToggle(invisElem, togClass)
    let togClassList = doToggleClass.length > 1 ? ':not(' + doToggleClass + ')' : ''
    let evenOddStyle = ''
    for (let evenOdd of ['even', 'odd']) { evenOddStyle += ' & > :nth-child(' + evenOdd + ' of tr' + togClassList + ') { background: var(--table-' + evenOdd + '); }' }
    return 'html > body > div.container table.dataTable.toggledTable > tbody {' + evenOddStyle + ' }'
}; //sets style for every other row in a table, for visible rows only;
function pleaseWait(customText, progressBar) {
    progressBar = progressBar ? '<progress id="progressBar" value=0 style="display: block; margin: 10px;"></progress>' : ''
    customText = customText ? customText : ''
    document.body.insertAdjacentHTML('afterbegin', '<dialog id="popovertarget" popover="manual"><div id="progressReport" style="margin: 10px; text-align: center;">' + customText + '</div>' + progressBar + '</dialog>')
    document.getElementById('popovertarget')?.showPopover()
    document.head.insertAdjacentHTML('beforeend', '<style id="inProgress">body > div.container { opacity: .7; }</style>')
};
function thankYouForWaiting() {
    document.getElementById('inProgress')?.remove()
    document.getElementById('popovertarget')?.remove()
};
//           evalData to fetch and parse table data;
async function multiEvalData(listArray) {
    const evalObj = {}
    for await (const [index, caseNum] of listArray.entries()) {
    }
    return evalObj
};
async function forAwaitMultiCaseEval(listArray, pageName) {
    pleaseWait('Please Wait... ', true)
    let progressReport = document.getElementById('progressReport'), progressBar = document.getElementById('progressBar')
    const evalObj = {}
    let listArrayLength = Number(listArray.length)
    for await (const [index, caseNum] of listArray.entries()) {
        let indexNumber = Number(index)+1
        progressReport.textContent = "Please wait... " + indexNumber + " of " + listArrayLength
        progressBar.value = (indexNumber/listArrayLength)
        evalObj[caseNum] = await evalData({ caseProviderNumber: caseNum, pageName: pageName }).catch(err => { console.trace(err) });
    }
    thankYouForWaiting()
    return evalObj
};
async function evalData({caseProviderNumber = caseId, pageName = thisPageName, dateRange = '', evalString = '', caseOrProvider = 'case'} = {}) { // evalData({ caseProviderNumber: '', pageName: '', dateRange: '', evalString: '', caseOrProvider: '', })
    let parm2providerId = caseOrProvider === "case" ? "parm2" : "providerId"
    let parmDateRange = dateRange.length ? "&parm3=" + dateRange : ''
    let unParsedEvalData = await getEvalData(caseProviderNumber, pageName, parmDateRange, parm2providerId).catch(err => { console.trace(err) })
    if (!unParsedEvalData?.length) { return false };
    let parsedEvalData = await parseEvalData(unParsedEvalData).catch(err => { console.trace(err, unParsedEvalData); })
    if (evalString) { parsedEvalData = await resolveEvalData(parsedEvalData, evalString) }
    return parsedEvalData
    async function getEvalData(caseProviderNumber, pageName, parm3 = '', parm2providerId) {
        return new Promise(resolve => {
            if (caseProviderNumber !== caseOrProviderId || pageName !== thisPageName) {
                $.get('/ChildCare/' + pageName + '.htm?' + parm2providerId + '=' + caseProviderNumber + parm3, (result, status, json) => { resolve(result) }) //jquery
            } else { resolve( [...document.querySelectorAll('script')].find(scr => scr.textContent.indexOf('eval') > -1)?.getHTML() ) }
        })
    }
    function parseEvalData(dataObject) {
        return new Promise(resolve => {
            let parsedEvalData = {}
            let dataObjectMatches = dataObject.match(/eval\(\'\[\{.*?\}\]\'\)\;/g) ?? []
            dataObjectMatches.forEach((match, i) => {
                match = match
                    .replaceAll(/eval\(\'|\'\)\;/g,'')
                    .replaceAll(/:,/g, ':"",')
                match = ("ProviderSearch.htm").includes(thisPageNameHtm) ? match.replaceAll(/\\"/g, '"') : match.replaceAll(/\\'/g, "'")
                parsedEvalData[i] = sanitize.JSON(match)
            })
            resolve(parsedEvalData)
        })
    }
    function resolveEvalData(obj, prop) {
        if (typeof obj !== 'object' || typeof prop !== 'string') throw 'resolveEvalData: obj is not of type object or prop is not of type string'
        prop = prop.replace(/\[["'`](.*)["'`]\]/g, ".$1") // Replaces [] notation with dot notation
        return prop.split('.').reduce((prev, curr) => { return prev?.[curr] }, obj || self)
    }
};
//           delay until condition is met;
function setIntervalLimited(callback, interval=100, x=1) {
    if (Number.isNaN(x)) { return };
    for (let i = 0; i < x; i++) {
        setTimeout(callback, i * interval);
    };
}; // setIntervalLimited(() => { alert('hit') }, 1000, 10);//=> hit...hit...etc (every second, stops after 10);
function intervalCheckForValue({element, interval=100, iterations=1}) {
    if (Number.isNaN(iterations) || Number.isNaN(interval)) { return };
    element = sanitize.query(element)
    return new Promise((resolve, reject) => {
        checkForValue()
        for (let i = 0; i < iterations; i++) {
            if (!element) { element = sanitize.query(element) }
            setTimeout(checkForValue, i * interval);
        };
        function checkForValue() { if (element?.value) { resolve(element.value) } }
    })
};
function waitForTableCells(tableStr = 'table') { // table = 'table' or '#tableId', must be string;
    if (typeof tableStr !== "string") { return };
    return new Promise(resolve => {
        let waitForTable = document.querySelector('div.dataTables_scrollBody > ' + tableStr)
        if (waitForTable?.children[1]?.children[0]?.children) {
            let recordsFound = waitForTable?.children[1]?.children[0]?.children.length
            return resolve(waitForTable, recordsFound);
        };
        const observer = new MutationObserver(mutations => {
            waitForTable = document.querySelector('div.dataTables_scrollBody > ' + tableStr)
            if (waitForTable?.children[1]?.children[0]?.children) {
                let recordsFound = waitForTable?.children[1]?.children[0]?.children.length
                observer.disconnect();
                resolve(waitForTable, recordsFound);
            };
        });
        observer.observe(document.body, { childList: true, subtree: true, });
    })
}; //based on https://stackoverflow.com/a/61511955 ;
function waitForElmHeight(selectorStr) { // selector must be string;
    if (typeof selectorStr !== "string") { return };
    return new Promise(resolve => {
        let selectedElement = document.querySelector(selectorStr)
        if (selectedElement && selectedElement?.offsetHeight > 0) {
            return resolve(selectedElement);
        };
        const observer = new MutationObserver(mutations => {
            selectedElement = document.querySelector(selectorStr)
            if (selectedElement && selectedElement?.offsetHeight > 0) {
                observer.disconnect();
                resolve(selectedElement);
            };
        });
        observer.observe(document.body, { attributes: true, childList: true, subtree: true });
    });
}; //based on https://stackoverflow.com/a/61511955 ;
//           return value, no page changes;
const stateDataSwap = {
    stateNamesAndLetters: {
        AZ: 'Arizona', AL: 'Alabama', AK: 'Alaska', AR: 'Arkansas', CA: 'California', CO: 'Colorado', CT: 'Connecticut', DC: 'District of Columbia', DE: 'Delaware', FL: 'Florida',
        GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho', IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana', ME: 'Maine', MD: 'Maryland',
        MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi', MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
        NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma', OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina',
        SD: 'South Dakota', TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington', WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', AS: "American Samoa",
        GU: "Guam", MP: "Northern Mariana Islands", PR: "Puerto Rico", VI: "U.S. Virgin Islands", UM: "U.S. Minor Outlying Islands",
    },
    acronymToStateName(acronym) { return this.stateNamesAndLetters[acronym] ?? acronym },
    stateNameToAcronym(stateName) { return Object.keys(this.stateNamesAndLetters).find(key => this.stateNamesAndLetters[key] === this.stateNamesAndLetters) ?? this.stateNamesAndLetters },
    swapStateNameAndAcronym(stateInfo) { return Object.keys(this.stateNamesAndLetters).find(key => this.stateNamesAndLetters[key] === stateInfo) ?? this.stateNamesAndLetters[stateInfo] },
};
function inRange(x, min, max) { return x >= min && x <= max };
function childOrRowIndex(childEle) { return childEle.nodeName === "TR" ? (childEle.rowIndex -1) : [...childEle.parentElement.children].indexOf(childEle) };
function splitStringAtWordBoundary(str, maxLength) {
    if (str.length <= maxLength) { return str }
    const stringArray = str.split('\n')
    const splitStringArray = stringArray.map( item => doStringSplitAtBoundary(item) )
    return splitStringArray.join('\n')
    function doStringSplitAtBoundary(stringArrayItem) {
        const tempStringArray = []
        while (stringArrayItem.length > maxLength) {
            const lastSpaceIndex = stringArrayItem.lastIndexOf(' ', maxLength);
            tempStringArray.push(stringArrayItem.substring(0, lastSpaceIndex))
            stringArrayItem = stringArrayItem.substring(lastSpaceIndex + 1)
        }
        tempStringArray.push(stringArrayItem)
        return tempStringArray.join('\n')
    }
};
//           send value to clipboard;
function copyMailing() {
    let providerData = document.getElementById('providerData'), providerType = providerData.children[3].children[0].childNodes[2].textContent.trim(), providerName = providerData.children[0].childNodes[4].textContent.trim()
    if ( ["Legal Non-licensed", "MN DHS Licensed Family"].includes(providerType) ) { providerName = nameFuncs.commaNameReorder(providerName) }
    if (document.getElementById('addrBillFormDisplay').value === "Site/Home") {
        let state = stateDataSwap.swapStateNameAndAcronym(document.getElementById('mailingSiteHomeState').value)
        let copyText = providerName + "\n" + document.getElementById('mailingSiteHomeStreet1').value + " " + document.getElementById('mailingSiteHomeStreet2').value + "\n" + document.getElementById('mailingSiteHomeCity').value + ", " + state + " " + document.getElementById('mailingSiteHomeZipCode').value
        navigator.clipboard.writeText(copyText);
        snackBar(copyText);
    } else {
        let state = stateDataSwap.swapStateNameAndAcronym(document.getElementById('mailingState').value)
        let copyText = providerName + "\n" + document.getElementById('mailingStreet1').value + " " + document.getElementById('mailingStreet2').value + "\n" + document.getElementById('mailingCity').value + ", " + state + " " + document.getElementById('mailingZipCode').value
        navigator.clipboard.writeText(copyText);
        snackBar(copyText);
    };
};
function copy(clipText, sbText, sbTitle, sbAlign) {
    navigator.clipboard.writeText(clipText)
    sbText?.length && snackBar(sbText ?? '', sbTitle ?? '', sbAlign ?? '')
};
async function copyFormattedHTML({html, extraStyle='', addTableStyle=true, removeStyles=true} = {}) {
    let tableStyle = 'table { border: 2px solid green !important; font-size: 24px; white-space: nowrap; table-layout: fixed; } td, th { padding: 2px 20px; margin: auto; } thead td, thead th { font-weight: 700; background: #07416f; color: white; } table tbody td { color: black; background: white; } .hidden { display: none !important; }'
    let style = ['<style>body { color: unset !important; background: unset !important; font-size: 24px; }', addTableStyle ? tableStyle : '', extraStyle, '</style>'].join(' ')
    html = ('<html><head>' + style + '</head><body>' + (removeStyles ? html.replace(/style=".+?"/ig, '') : html) + '</body>').replace(/\n|\t|&nbsp;|<br>/g, '')
    const htmlBlob = new Blob([html], { type: "text/html" });
    console.log(htmlBlob.text())
    const data = new ClipboardItem({ "text/html": htmlBlob, });
    await navigator.clipboard.write([data]);
};
//           send value to sessionStorage;
function storeSelectedTableRow(storeTable = 'table') {
    storeTable = sanitize.query('div.dataTables_scrollBody > ' + storeTable)
    if (!storeTable) { return };
    let storeTableRow = [...storeTable.children[1].children].find(ele => ele.classList.contains('selected'))
    storeTableRow && sessionStorage.setItem( 'selectedTableRow', (storeTableRow ? childOrRowIndex(storeTableRow) : 0) )
};
//           return value to operate on page;
function createSlider({ label, title, id: sliderId, defaultOn: isChecked, font: sliderFontSize, classes: extraClasses, styles: extraStyles} = {}) {
    isChecked = isChecked ? "checked" : ''
    extraClasses = !extraClasses ? ' "'
    : Array.isArray(extraClasses) ? ' ' + extraClasses.join(" ") + '"' : ' ' + extraClasses + '"'
    extraStyles = !extraStyles ? ''
    : Array.isArray(extraStyles) ? ' style="' + extraStyles.join(" ") + '"' : ' style="' + extraStyles + '"'
    sliderFontSize = !sliderFontSize ? '' : ' style="font-size: ' + sliderFontSize + ';"'
    return '<div class="toggle-slider' + extraClasses + extraStyles + '><label title="' + title + '">' + label + '</label><label class="switch"' + sliderFontSize + '><input class="toggleSlider" type="checkbox" id="' + sliderId + '" ' + isChecked + '><span class="slider round"></span></label></div>'
};
//           perform basic operations on page, don't return anything. some replacements for jQuery;
function doClick(ele) {
    ele = sanitize.query(ele)
    if (!ele) { return }
    let clickEvent = new MouseEvent('click')
    ele.dispatchEvent(clickEvent);
};
function doWrap(ele, type='div') {
    ele = sanitize.query(ele)
    if (!ele) { return }
    const wrappingElement = document.createElement(type);
    ele.replaceWith(wrappingElement);
    wrappingElement.append(ele);
};
function doToggle(elOrArray) {
    [...elOrArray].forEach(el => {
        el = sanitize.query(el)
        if (el.style.display == 'none') { el.style.display = '' }
        else { el.style.display = 'none' }
    })
};
function doUnwrap(ele) { ele = sanitize.query(ele); ele.outerHTML = ele.innerHTML };
function unhideElement(element, trueFalse) { // true to remove hidden, false to add hidden;
    if (element instanceof HTMLElement) { addRemoveHidden(element, trueFalse) }
    else if (element instanceof NodeList) { element = [...element] }
    else if (Array.isArray(element)) {
        [...element].forEach( ele => addRemoveHidden(sanitize.query(ele), trueFalse) )
    }
    function addRemoveHidden(ele2, trueFalse) { trueFalse ? ele2.classList.remove('hidden') : ele2.classList.add('hidden') }
};
function tbodiesFocus(elementToFocus) {
    elementToFocus = sanitize.query(elementToFocus)
    if (!elementToFocus) { return }
    document.querySelectorAll('tbody').forEach(ele => { ele.addEventListener('click', clickEvent => {
        if (clickEvent.altKey) { return };
        eleFocus(elementToFocus)
    }) })
};
function tbodyFocusNextEdit() {
    if (!appModeNotEdit) { return };
    document.querySelector('tbody').addEventListener('click', clickEvent => {
        if (clickEvent.altKey) { return }
        let next = document.getElementById('next'), wrapUpDB = document.getElementById('wrapUpDB')
        next?.disabled === false ? eleFocus(next) : eleFocus(wrapUpDB)
    })
};
function reselectSelectedTableRow( reselectObj = {} ) {
    waitForTableCells(reselectObj.storeTable ?? 'table').then((storeTable, recordsFound) => {
        if (!storeTable || recordsFound < 2) { return };
        let rowOrValue = reselectObj.rowOrValue ?? "row"
        let storedTableRow = Number( sessionStorage.getItem('selectedTableRow') ?? 0 )
        if (Number.isNaN(storedTableRow)) { return };
        storedTableRow = rowOrValue === "row" ? storedTableRow : childOrRowIndex([...storeTable.children[1].children].find(row => row.textContent.indexOf(rowOrValue) > -1))
        // "OrValue" not yet implemented. Intention: store the textContent of the <tr> or <td> to search for. Need to modify storeSelectedTableRow to store this data (as an object/array) and then modify reselectSelectedTableRow() to retrieve/structure this data.
        storeTable.children[1].children[storedTableRow ?? 0].click()
        sessionStorage.removeItem('selectedTableRow')
    })
};
function listPageLinksAndList(...rowAndPageArrays) { // listPageLinksAndList([table#OnPage, "PageToLinkTo", columnIfNot0], [etc])
    waitForTableCells().then(() => {
        let trs = [...document.querySelector('tbody').children], trNumberArray = []
        if (rowAndPageArrays?.length) {
            trs.forEach(tRow => {
                rowAndPageArrays.forEach(subArray => { rowAndPageForEach( tRow, subArray[0], subArray[1], subArray[2] ) })
            })
        } else { trs.forEach(tRow => { rowAndPageForEach(tRow, 0) }) }
        return trNumberArray
        function rowAndPageForEach(tRow, td, pageToOpen, parm3child) {
            let tdWithNumber = tRow.children[td], tdWithNumberText = tdWithNumber.textContent
            tRow.id = tdWithNumberText
            trNumberArray.push(tdWithNumberText)
            if (pageToOpen) {
                let paramName = pageToOpen.indexOf("Provider") === 0 ? "providerId" : "parm2"
                let parm3 = parm3child ? "&parm3=" + tRow.children[parm3child].textContent.replace(/[\/\- ]/g, '') : ''
                tdWithNumber.innerHTML = '<a target="_blank" href="/ChildCare/' + pageToOpen + '.htm?' + paramName + '=' + tdWithNumberText + parm3 + '">' + tdWithNumberText + '</a>'
            }
        }
    })
};
function insertTextAndMoveCursor(textToInsert, activeEle) {
    activeEle = activeEle ? sanitize.query(activeEle) : document.activeElement
    let cursorPosition = activeEle.selectionStart; // current position of the cursor
    let currentText = activeEle.value
    activeEle.value = currentText.slice(0, cursorPosition) + textToInsert + currentText.slice(cursorPosition) // setting the modified text in the text area
    textSelect(activeEle, cursorPosition + textToInsert.length);
    function textSelect(element, start, end) { //moves cursor to selected position (start) or selects text between (start) and (end);
        if (!element.setSelectionRange) { return };
        end = end || start;
        element.focus();
        element.setSelectionRange(start, end);
    };
};
function tabIndxNegOne(elementStringList) { queueMicrotask(() => { [...sanitize.query(elementStringList, true)].forEach(ele => { ele.tabindex = '-1' }) }) };
function tempIncomes(tempIncome, endDate) {
    tempIncome = sanitize.query(tempIncome)
    endDate = sanitize.query(endDate)
    document.querySelector('.stylus')?.insertAdjacentHTML('beforeend', 'label[for=' + tempIncome.id + ']:first-letter { text-decoration:underline; }')
    window.addEventListener('keydown', keydownEvent => { //Keyboard shortcut
        if (keydownEvent.altKey && keydownEvent.key === 't') {
            keydownEvent.preventDefault()
            if (tempIncome.value === "") { tempIncome.value = "Yes"; endDate.tabIndex = 0; }
            else { tempIncome.value = ""; endDate.tabIndex = -1; }
        }
    })
};
//           keydown/paste event related;
function preventKeys(keyArray, ms=1500) {
    window.addEventListener('keydown', keyShortDisable)
    function keyShortDisable(keydownEvent) { if (keyArray.includes(keydownEvent.key)) { keydownEvent.preventDefault() } }
    setTimeout(() => { window.removeEventListener('keydown', keyShortDisable) }, ms)
};
!function keyboardHotkeys() {
    if (iFramed) { return };
    window.addEventListener('keydown', keydownEvent => {
        if (keydownEvent.key === "Alt") { keydownEvent.preventDefault(); return; }; // alt pressed without additional key;
        if (keydownEvent.altKey) {
            if (["d", "s", "n", "c", "e", "r", "w", "ArrowLeft", "ArrowRight", ].includes(keydownEvent.key)) { keydownEvent.preventDefault() } else { return };
            switch (keydownEvent.key) {
                case 'd': document.querySelector(':is(#done, #delete):not(:disabled)')?.click(); break;
                case 's': document.querySelector('#save:not(:disabled)')?.click(); break;
                case 'n': document.querySelector('#new:not(:disabled)')?.click(); break;
                case 'c': document.querySelector(':is(#Cancel, #cancel, #cancelnotice, #revert, #exit):not(:disabled)')?.click(); break;
                case 'e': document.querySelector('#edit:not(:disabled)')?.click(); break;
                case 'r': document.querySelector(':is(#resend, #return):not(:disabled)')?.click(); break;
                case 'w': document.querySelector('#wrapUp:not(:disabled)')?.click(); break;
                case 'a': document.querySelector('#add:not(:disabled)')?.click(); break;
                case 'ArrowLeft': document.querySelector('#previous:not(:disabled)')?.click(); break;
                case 'ArrowRight': document.querySelector('#next:not(:disabled)')?.click(); break;
                default: break;
            }
        } else if (keydownEvent.ctrlKey) {
            if (["w", "s", ].includes(keydownEvent.key)) { keydownEvent.preventDefault() } else { return };
            switch (keydownEvent.key) {
                case 's': document.querySelector('#save:not(:disabled)')?.click(); break;
                case "w": { if (editMode || document.getElementById('wrapUp').disabled === false) { document.getElementById('wrapUp').click(); } break }
            }
        }
    })
}();
!function openIdOnPasteFromAnywhere() {
    try {
        let caseOrProviderInput = caseIdElement ?? providerIdElement
        if (editMode || iFramed || !caseOrProviderInput || caseOrProviderInput.disabled) { return }
        window.addEventListener('paste', async () => {
            navigator.clipboard.readText()
                .then(text => {
                text = text.trim()
                if (!(/^[0-9]{1,8}$/).test(text)) { return }
                if (!["TEXT", "INPUT"].includes(document.activeElement.nodeName) || document.activeElement.id === caseOrProviderInput.id) {
                    caseOrProviderInput.value = text
                    submitButton.click()
                }
            })
        })
    } catch (error) { console.trace(error) }; // Accepts paste input from non-input fields, assumes it to be case or provider #, loads the page with that #. Also allows pasting into the Provider ID field.
}();
//           personal amusement;
function starFall() {
    if (!countyInfo.userSettings.starFall) { return };
    // if (!new Date().toLocaleDateString().slice(0, 4) === "4/1" || !Math.ceil(Math.random() * 4) / 4 === 1) { return }
    document.body.classList.add('starfall')
    let start = Date.now()
    const originPosition = { x: 0, y: 0 };
    const last = {
        starTimestamp: start,
        starPosition: originPosition,
        mousePosition: originPosition
    }
    const config = {
        starAnimationDuration: 1000,
        minimumTimeBetweenStars: 350,
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
    const withUnit = (value, unit) => value + unit,
        px = value => withUnit(value, "px"),
        ms = value => withUnit(value, "ms");
    // const calcDistance = (a, b) => {
    //     const diffX = b.x - a.x,
    //         diffY = b.y - a.y;
    //     return Math.hypot(diffX, diffY);
    // }
    const calcDistance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const calcElapsedTime = (start, end) => end - start;
    const appendElement = element => document.body.append(element),
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
        last.starTimestamp = Date.now()
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
        const now = Date.now(),
            hasMovedFarEnough = calcDistance(last.starPosition, mousePosition) >= config.minimumDistanceBetweenStars,
            hasBeenLongEnough = calcElapsedTime(last.starTimestamp, now) > config.minimumTimeBetweenStars;
        if (hasMovedFarEnough || hasBeenLongEnough) {
            createStar(mousePosition);
            updateLastStar(mousePosition);
        }
        updateLastMousePosition(mousePosition);
    }
    window.onmousemove = mousemoveEvent => handleOnMove(mousemoveEvent);
    document.body.onmouseleave = () => updateLastMousePosition(originPosition);
};
// ///////////////////////////////////////////////////////////////////////////// SITE_WIDE_FUNCTIONS SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================
setTimeout(() => { if (focusEle !== "blank" && !document.querySelector('.modal.in')) { eleFocus(focusEle) } }, 200);
function mec2enhancements() {
    const mec2functionEnhancementsDiv = ''
            + '<dialog class="helpOuter" id="mec2functionsEnhancementsDialog">'
                + '<ul class="helpInner" id="helpInner"></ul>'
                + '<div class="settingsButtons" id="mec2functionsEnhancementsButtons">'
                    + '<button class="cButton" type="button" autofocus id="mec2functionsEnhancementsClose">Close</button>'
                + '</div>'
            + '</dialog>'
    document.body.insertAdjacentHTML('beforeend', mec2functionEnhancementsDiv)
    let mec2functionsEnhancementsDialog = document.getElementById('mec2functionsEnhancementsDialog')
    !function mec2functionEnhancementsHTML() {
        let helpStyleSheet = cssStyle()
        let mec2functionEnhancementsHTMLtext = mec2functionFeatures.map(feature => {
            if ("separator" in feature) { return "<li>____________pretend_this_is_a_separator____________</li>" }
            let animationButton = ("selector" in feature) ? '<span style="cursor: pointer;" class="playButton" data-animate-target="' + feature.selector + '">▶</span>' : '<span></span>'
            return "<li class='help-div'>" + animationButton + "<details name='mec2functionsHelp'><summary style='cursor: help; font-weight: bold;'>" + feature.title + "</summary><span>" + feature.desc.replace(/\<br\>/g, '</span><span>') + "</span></details></li>"
        }).join('')
        let helpInner = document.getElementById('helpInner')
        helpInner.insertAdjacentHTML('beforeend', mec2functionEnhancementsHTMLtext)
        helpInner.addEventListener('click', clickEvent => {
            if (!clickEvent.target.classList.contains('playButton')) { return }
            addPulsateAnimation(event.target.dataset.animateTarget, helpStyleSheet)
        })
    }();
    mec2functionsEnhancementsDialog.showModal()
    document.getElementById('mec2functionsEnhancementsClose')?.addEventListener( 'click', () => { mec2functionsEnhancementsDialog.remove() }, { once: true, });
    // document.getElementById('mec2functionsEnhancementsClose')?.addEventListener( 'click', () => { document.getElementById('mec2functionsEnhancementsContainer').remove() }, { once: true, });
    function addPulsateAnimation(selector, styleSheet) {
        let firstVisibleOfSelector = document.querySelector(selector)
        firstVisibleOfSelector.scrollIntoView(false, { behavior: "smooth", })
        firstVisibleOfSelector.addEventListener( 'animationend', () => { styleSheet.replaceSync(""); }, { once: true } )
        styleSheet.replaceSync( selector + " { animation: shake-top 3.5s cubic-bezier(0.455, 0.030, 0.515, 0.955) 1 both; box-shadow: var(--highlightFocus) !important; }" );
        // helpStyleSheet.replaceSync( selector + " { animation: pulsate 0.5s linear 5 both; box-shadow: var(--highlightFocus) !important; }" );
    };
};
!function postLoadChanges() {
    !function fixToLabels() {
        [...document.querySelectorAll('div.col-md-2 + label.col-lg-1:has(+ div.col-md-2)')].forEach(label => {
            if ( (["DIV", "INPUT"].includes(label.nextElementSibling.nodeName) && label.nextElementSibling.children[0]?.type === "text") ) {
                label.previousElementSibling.classList.add('to-next')
                label.nextElementSibling.classList.add('to-next')
            }
        });
    }();
    queueMicrotask(() => { // Removing items from the tabindex // also see resetTabIndex()
        let negOneElements = '#quit, #countiesTable #letterChoice, #reset, #noteCreator, #leaveDetailTemporaryLeavePeriodFrom, #leaveDetailTemporaryLeavePeriodTo, #leaveDetailExtendedEligibilityBegin, #tempLeavePeriodBegin, #tempLeavePeriodEnd'
        + '#extendedEligibilityBegin, #extendedEligibilityExpires, #redeterminationDate, #tempPeriodStart, #tempPeriodEnd, #deferValue, #leaveDetailRedeterminationDue, #leaveDetailExpires, #caseInputSubmit, #caseId, #selectPeriod'
        tabIndxNegOne(negOneElements); //quit, countiesTable=application; redet date, eEE=activity pages; cIS=submit button; lC=specialletter; reset=caseNotes; tempLeave = activities; defer=redet
        !countyInfo.userSettings.userAccessibility && tabIndxNegOne(document.querySelectorAll('table>thead>tr>td'))
        tabIndxNegOne(document.querySelectorAll('.borderless'))
    })
    if (!editMode) { document.getElementById('Report\ a\ Problem')?.children[0]?.setAttribute('target', '_blank'); document.getElementById('Maximum\ Rates')?.children[0]?.setAttribute('target', '_blank'); }; //change_to_open_in_new_tab
    document.querySelector('h1')?.closest('div.row')?.classList.add('h1-parent-row');
}();
console.timeEnd('mec2functions load time');
