// ==UserScript==
// @name         mec2functions
// @namespace    http://github.com/MECH2-at-Github
// @description  Add functionality to MEC2 to improve navigation and workflow
// @author       MECH2
// @match        http://mec2.childcare.dhs.state.mn.us/*
// @match        https://mec2.childcare.dhs.state.mn.us/*
// @version      0.6.32
// ==/UserScript==
/* globals jQuery, $ */

'use strict';
//
console.time('mec2functions load time');
let verboseMode = 1;
verbose("PBF to not div:", document.querySelectorAll('.panel-box-format > :is(select, input, output, a, span, p):not([type=hidden])')) // for custom zoom CSS // found on client search, provider search //
const loggedOut = document.querySelector('a[href="Login.htm"]'); loggedOut && verbose('a[href="Login.htm"] present');
const thisPageNameHtm = window.location.pathname.indexOf("//") === 0 ? window.location.pathname.slice(12) : (window.location.pathname.slice(11) || "Login.htm"), thisPageName = thisPageNameHtm.slice(0, -4);
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
    number(num) { return Number(String(num).replace(/[^0-9-.]/gi, '')) || 0 },
    html(text) { return new DOMParser().parseFromString(text, "text/html").documentElement.textContent },
    timeStamp(time) { return String(time)?.replace(/[^apm0-9:,\/ ]/gi, '') }, // [^] = not in list //
    date(inputDate, dateTypeNeeded = "date") {
        const isDateObject = inputDate instanceof Date
        inputDate = (/\d{13}/).test(inputDate) ? Number(inputDate) : inputDate
        const inputTypeof = typeof inputDate
        switch (dateTypeNeeded) {
            case "date":
                return isDateObject ? inputDate : new Date(inputDate)
                break
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
    json(obj) { try { if (!obj || obj.indexOf('{') < 0) { return undefined }; obj = obj; return JSON.parse(obj) } catch (err) { console.log(err, obj); return undefined } },
};
const nameFuncs = {
    commaNameObject(commaNameO) {
        if (!commaNameO) { return };
        let [ last, first ] = this.toTitleCase( String(commaNameO).replace(/\b\w\b|\./g, '') ).split(",").map(str => str.trim())
        return { first, last, full: first + " " + last }
    },
    commaNameReorder(commaNameR) {
        if (!commaNameR) { return };
        if (!commaNameR.indexOf(',')) { return commaNameR };
        commaNameR = this.toTitleCase( String(commaNameR).replace(/\b\w\b\.*/, '') ).split(",")
        return commaNameR[1].trim() + ' ' + commaNameR[0].trim()
    },
    commaToCommaSpace(value) { return !value ? undefined : String(value).replace(/(\w\,)(\w)/g, "$0 $1") },
    toTitleCase(str) { return !str ? undefined : str.replace(/[^-\s,]+/g, s => s.charAt(0).toUpperCase() + s.substring(1).toLowerCase()) },
    LastFirstToFirstL(name) { return !name ? undefined : this.commaNameReorder(name).replace(/(\s\w)\w+/, '$1') },
};
const dateFuncs = {
    dayInMs: 86400000,
    bwpInMs: 1209600000,
    addDays(date, days) {
        date = sanitize.date(date, 'date')
        return date.setDate(date.getDate() + sanitize.number(days));
    },
    addMonths(date, months, dayOfMonth) {
        date = sanitize.date(date, 'date')
        dayOfMonth = !dayOfMonth ? date.getDate() : dayOfMonth
        return date.setMonth(date.getMonth() + sanitize.number(months), dayOfMonth);
    },
    dateDiffInDays(a, b) {
        if (!a) { return };
        a = sanitize.date(a, "date")
        b = b === undefined ? new Date() : sanitize.date(b, "date")
        const utc1 = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
        const utc2 = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
        return Math.floor((utc2 - utc1) / this.dayInMs);
    },
    formatDate(date, format = "mmddyy") {
        date = sanitize.date(date, 'date')
        if ( date === -64800000 || Number.isNaN(date) ) { return undefined }; // -64800000 === 12/31/1969 //
        switch (format.toLowerCase()) {
            case "mmddyy": return date.toLocaleDateString(undefined, { year: "2-digit", month: "2-digit", day: "2-digit" });
            case "mdyy": return date.toLocaleDateString(undefined, { year: "2-digit", month: "numeric", day: "numeric" });
            case "mdyyyy": return date.toLocaleDateString(undefined, { year: "numeric", month: "numeric", day: "numeric" });
            case "mmddyyyy": return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
            case "mmddhm": return date.toLocaleDateString('en-US', { hour: "numeric", minute: "2-digit", month: "2-digit", day: "2-digit" });
            case "utc": return Date.UTC(date.getFullYear(), date.getMonth(), date.getDay());
            default: return date.toLocaleDateString(undefined, { year: "numeric", month: "2-digit", day: "2-digit" });
        }
    },
    getDateOfWeekdayWithWeek(year, month, week, day) {
        if (week < 0) { month++ }
        const dateToGet = new Date(year, month, (week * 7) + 1)
        if (day < dateToGet.getDay()) { day += 7 }
        dateToGet.setDate(dateToGet.getDate() - dateToGet.getDay() + day)
        return dateToGet;
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
    parm3date(date) { return date.replace(/\D/g, '') },
    // parm3date(date) { return this.formatDate(date, 'mmddyyyy').replace(/\D/g, '') },
};
const numberFuncs = {
    toUSD(num) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format( sanitize.number(num) ) },
}
const clearStorageItems = (storage = "both") => {
    if (["session", "both"].includes(storage)) { Object.keys(sessionStorage).forEach(ssKey => { if ( (/actualDateSS|processingApplication|providerEndings|providerStart|storePMIandCSnotes|storeOldNotes|earliestEditPeriod/).test(ssKey) ) { sessionStorage.removeItem(ssKey) } }) }
    if (["local", "both"].includes(storage)) { Object.keys(localStorage).forEach(lsKey => { if ( (/caseTransfer|autnoteDetails|copiedNote/).test(lsKey) ) { localStorage.removeItem(lsKey) } }) }
};
if ( thisPageNameHtm === "Welcome.htm" && document.getElementById('Alerts')?.style?.pointerEvents === "" ) { clearStorageItems(); location.assign("Alerts.htm"); return; }; //auto-redirect from Welcome to Alerts
const gbl = {
    eles: {
        pageWrap: document.getElementById('page-wrap'), save: document.getElementById('save'), quit: document.getElementById('quit'), submitButton: document.querySelector('#submit, #caseInputSubmit, #alertInputSubmit, #submitproviderId, #providerIdSubmit, #search'),
        caseIdElement: document.querySelector('#caseId:not([type=hidden])'), providerIdElement: document.querySelector('#providerInput > #providerId:not([type=hidden])'), wrapUp: document.getElementById('wrapUp'), footerLinks: document.getElementById('footer_links'),
        formContainer: document.querySelector('form')?.closest('.container'),
        selectPeriod: document.querySelector('#selectPeriod, #searchDateRange'), // searchDateRange = eBills page
    },
};
//
const countyInfo = {
    info: { ...sanitize.json( localStorage.getItem('MECH2.countyInfo') ) } ?? {},
    updateInfo(countyInfoKey, countyInfoValue) { // keyName, newValue or "delete"
        countyInfoValue === "delete" ? delete this.info[countyInfoKey] : this.info[countyInfoKey] = countyInfoValue
        localStorage.setItem( 'MECH2.countyInfo', JSON.stringify(this.info) )
    },
    countyInfoPrompt(questionString, countyInfoKey) {
        let promptAnswer = sanitize.string( prompt(questionString, countyInfo.info[countyInfoKey] ?? "") )
        if (typeof promptAnswer === "string") { this.updateInfo(countyInfoKey, ( promptAnswer.length ? sanitize.string(promptAnswer) : "delete") ) }
        return promptAnswer
    },
    userSettings: { ...sanitize.json( localStorage.getItem('MECH2.userSettings') ) } ?? {},
    updateUserSettings(userSettingsKey, userSettingsValue) {
        this.userSettings[userSettingsKey] = userSettingsValue
        localStorage.setItem( 'MECH2.userSettings', JSON.stringify(this.userSettings) )
    },
}; // function_and_values
!function versionAndTooltips() {
    let versionAndTooltipsHome = document.getElementById('help')
    ? { ele: document.getElementById('help'), placement: "afterend", tooltip: true }
    : { ele: document.querySelector('form') ?? document.querySelector('div.panel-invisibleBorder > div.content_8pad-20top'), placement: "afterbegin", tooltip: false }
    let tooltipHTML = versionAndTooltipsHome.tooltip ? '<span class="tooltips" style="margin-left: 10px;">ⓘ<span style="width: 35ch;" id="mec2functionEnhancementsTooltip" class="tooltips-text tooltips-left">Click to show a list of enhancements by mec2functions on this page.</span></span>' : ''
    let versionAndTooltipsHTML = '<a id="versionNumber" href="#" title="Click to copy version numbers" style="margin-left: 10px;">' + GM_info.script.name + ' v' + GM_info.script.version + (countyInfo.info?.navOnly ? " Nav Only" : "") + '</a>' + tooltipHTML
    versionAndTooltipsHome.ele?.insertAdjacentHTML(versionAndTooltipsHome.placement, versionAndTooltipsHTML);
    document.getElementById('versionNumber')?.addEventListener('click', clickEvent => { let versionText = clickEvent.target.innerText + window.getComputedStyle(clickEvent.target, ':after').content.replace(/"/g, ''); copy( versionText, versionText ) })
    document.getElementById('mec2functionEnhancementsTooltip')?.addEventListener( 'click', mec2enhancements)
}();
if (["Logout.htm", "ExceptionError.htm"].includes(thisPageNameHtm)) { clearStorageItems(); return; };
//
const newFeatureNotice = {
    newNoticesToUsers: [ // ["lsValue", [ "Description_of_setting. Default: On_Off" ], trueIsOn_falseIsOff_omitForNonSettingNotices],
        // ["navOnly", [ "Toggle mec2functions between 'Navigation Only' and 'Full Functionality.'","Limits mec2functions to Nav buttons, extra footer links, and period selector reversal/buttons.","Intended uses are to check if an issue is in MEC2 or mec2functions, or during Help Desk calls while still retaining navigation. Default: Off" ], false],
        // //prior to 0.5.70
        // ["workerRole", ["Notice: Worker Role can be changed via the mec2functions drop-down (in the upper right).", "Currently, switching roles only changes the button order for Primary Navigation's second row. Default: Financial Worker."],],
        // ["eleFocus", ["On page load, auto-focus on a field. Default: On."], true],
        // ["caseHistory", ["Case History (most recent 10 cases accessed, found in the 'Case #' field to the right of the navigation buttons. Default: On."], true],
        // ["actualDateStorage", ["'Actual Date' & 'Begin Date' auto-fill using the date entered on a previous entry. Default: On."], true],
        // ["selectPeriodReversal", ["The 'Select Period' drop-down order set to 'Descending.' Default: On."], true],
        // ["duplicateFormButtons", ["Form buttons duplicated and placed at the top of the page (Save, Edit, etc.). Default: On."], true],
        // ["fundsAvailable", ["On the Funding Availability page, auto-select 'Yes'. Default: On."], true],
        // ["autoHideDatePicker", ["Auto-hide the date picker calendar popup. Clicking the date field opens the picker, typing hides it.", "Resets to saved setting when a page is loaded. Default: Off."], false],
        // ["userAccessibility", [ "Set items on page, such as table headers used for sorting, to be accessible using the Tab key. Default: On" ], true],
        // ["starFall", ["Starfall. Note: MECH2 is not liable for lost work time or for your computer melting due to usage of Starfall. Default: Off."], false],
        // ["promptUserNameTitle", ["Add a user-input title to the Automated Case Note signature.", "If your name was 'Worker N' you can add ', Hennepin County' as your title and your signature would be 'Worker N, Hennepin County'. Default: Off."], false ],
    ],
    noticeToUsersLS: (() => sanitize.json( localStorage.getItem('MECH2.noticeToUsersArrayLS') ) ?? [] )(),
    noticeToUsersBuildHTML() {
        if (!gbl.eles.formContainer) { return };
        const noticeHTML = this.newNoticesToUsers.map( ([lsValue, textArray, newUserSetting] = []) => {
            if (this.noticeToUsersLS.includes(lsValue)) { return }; // return if acknowledged;
            countyInfo.updateUserSettings(lsValue, newUserSetting) // add to stored settings if new;
            return ['<div id="Notice', lsValue, '" class="error_alertbox_new mec2functions"><div>', textArray.map(item => '<p class="redcolortext mec2functions" style="display: block;">' + item + '</p>').join(''), '</div><span style="cursor: pointer; color: black !important;">✖</span></div>'].join('')
        }).join('');
        if (!noticeHTML) { return };
        gbl.eles.formContainer?.insertAdjacentHTML('afterbegin', '<details class="error_alertbox_new" id="noticeDetails"><summary><strong style="cursor: pointer;">New mec2functions setting available, click here for details.</strong></summary>' + noticeHTML + '</details>');
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
const rederrortextContent = [...document.querySelectorAll('strong.rederrortext:not(div.error_alertbox_new > strong.rederrortext, #memberHelpDeskPanel strong)'), ...document.querySelectorAll('.error_alertbox_new:has(> strong)')].map(ele => ele.innerText.trim()).filter(ele => ele);
const noResultsForCase = rederrortextContent?.find(ele => ele.includes('No results for case'));
const editMode = (!gbl.eles.pageWrap && !noResultsForCase), appModeNotEdit = (gbl.eles.quit && gbl.eles.save?.disabled);
const iFramed = window.location !== window.parent.location;
let focusEle = "blank";
const doNotDupe = {
    buttons: [],
    doNotUnderline: [],
    pages: ["ProviderSearch.htm", "ClientSearch.htm", "MaximumRates.htm", "ReportAProblem.htm", "WorkerSearch.htm", "Alerts.htm", "CaseLockStatus.htm", "CaseApplicationInitiation.htm", "CaseReapplicationAddCcap.htm", "CaseOverview.htm", "CasePaymentHistory.htm", "FinancialPaymentStatusHistory.htm", "FinancialClaimTransfer.htm", "FinancialPaymentDetail.htm", ],
};
const caseIdVal = gbl.eles.caseIdElement?.value, providerIdVal = gbl.eles.providerIdElement?.value, caseOrproviderIdVal = caseIdVal ?? providerIdVal;
const pageTitle = document.querySelector('title').innerText, searchParamsMap = new URLSearchParams(window.location.search); // searchParamsMap.size = INT //
const reviewingEligibility = (thisPageNameHtm.indexOf("CaseEligibilityResult") > -1 && thisPageNameHtm.indexOf("CaseEligibilityResultSelection.htm") < 0);
const selectPeriod = document.getElementById('selectPeriod'), selectPeriodValue = gbl.eles.selectPeriod?.value;
const selectPeriodDates = selectPeriodValue?.length ? { range: selectPeriodValue, parm3: dateFuncs.parm3date(selectPeriodValue), start: selectPeriodValue.slice(0, 10), end: selectPeriodValue.slice(13) } : {};
let clickCount = null
//
!function primaryNavigationButtonDivs() {
    let greenline = document.querySelector("div.container:has(.line_mn_green)") ?? undefined
    if (!thisPageNameHtm || thisPageNameHtm.indexOf('Log') === 0) { return };
    greenline?.insertAdjacentElement('afterend', createNewEle('nav', { classList: "navigation container" }))
    .appendChild(createNewEle('div', { classList: "primary-navigation" }))
        .appendChild(createNewEle('div', { classList: "primary-navigation-row" }))
            .appendChild(createNewEle('div', { id: "buttonPanelOne" }))
            .insertAdjacentElement('afterend', createNewEle('div', { id: "buttonPanelOneNTF" }))
        .parentElement.insertAdjacentElement('afterend', createNewEle('div', { classList: "primary-navigation-row" }))
            .appendChild(createNewEle('div', { id: "buttonPanelTwo" }))
        .parentElement.insertAdjacentElement('afterend', createNewEle('div', { classList: "primary-navigation-row" }))
            .appendChild(createNewEle('div', { id: "buttonPanelThree" }))
        .parentElement.parentElement.insertAdjacentElement('afterend', createNewEle('div', { id: "secondaryActionArea" }))
            .appendChild(createNewEle('div', { id: "duplicateButtons", classList: "db-container" }))
            .insertAdjacentElement('afterend', createNewEle('div', { id: "tertiaryActionArea", classList: "db-container" }))

    if (!gbl.eles.pageWrap) { return };
    greenline?.insertAdjacentElement('afterend', gbl.eles.pageWrap);
    gbl.eles.pageWrap?.classList.add('container')
    let pageWrapStyle = cssStyle()
    pageWrapStyle.replaceSync("#page-wrap.container { padding: 0 15px; background: none; max-width: 1170px; height: unset; float: none; & > ul.dropdown { display: flex; & > li: flex: 1;} }" );
}();
const secondaryActionArea = document.getElementById('secondaryActionArea'), tertiaryActionArea = document.getElementById('tertiaryActionArea'), duplicateButtons = document.getElementById('duplicateButtons');
// gbl.eles.secondaryActionArea = document.getElementById('secondaryActionArea');
// gbl.eles.duplicateButtons = document.getElementById('duplicateButtons');
//
const workerRole = countyInfo.info?.workerRole ?? "mec2functionsFinancialWorker";
!function userSettingDivs() {
    if (iFramed || editMode) { return }; // User_Settings_Divs // code to check for affirmative setting is 'if (countyInfo.userSettings?.settingId)'
    document.getElementById('Claim Establishment')?.parentElement?.classList.add('sub_menu')
    const uncheckedBox = "☐", checkedBox = "☒", reloadPage = () => snackBar('Page must be reloaded to apply setting.', 'notitle')
    let baseCssOnlyList = countyInfo.info?.baseCssOnlyList ?? []
    if (baseCssOnlyList.includes(thisPageNameHtm)) { document.body.classList.add('baseStyle') }
    let mec2stylusBaseCssCheckbox = () => baseCssOnlyList.includes(thisPageNameHtm) ? checkedBox : uncheckedBox
    let navOnlyCheckbox = () => countyInfo.info?.navOnly ? checkedBox : uncheckedBox
    const mec2functionsSettingsHTML = ''
        + '<a style="pointer-events: none;" href="#">mec2functions</a>'
        + '<ul class="sub_menu" id="mec2functionsSubMenu">'
        + [ { id: "navOnlyToggle", subText: "Navigation Only ", subCheckbox: navOnlyCheckbox(), title: "Disables most functions in mec2functions except for Navigation." }, { id: "mec2stylusBaseCssToggle", subText: "Only Basic Styling ", subCheckbox: mec2stylusBaseCssCheckbox(), title: "Disable page-specific style/layout changes." }, { id: "mec2functionsFinancialWorker", subText: "Financial Worker" }, { id: "mec2functionsPaymentWorker", subText: "Payment Worker" }, { id: "mec2functionsProviderWorker", subText: "Provider Worker" }, { id: "mec2functionsOpenSettings", subText: "Settings" }, ]
        .map(({ id, subText, subCheckbox = '' } = {}) => '<li><a href="#" id="' + id + '">' + subText + '</a>' + (subCheckbox && '<a href="#" id="' + id + '" class="menuBox">' + subCheckbox + '</a>')).join('')
        + '</ul>'
    let mec2functionsMenu = document.createElement('li'); mec2functionsMenu.id = "mec2functionsMenu"; mec2functionsMenu.innerHTML = mec2functionsSettingsHTML
    document.querySelector('ul.dropdown').append(mec2functionsMenu)
    let mec2functionsSubMenu = document.getElementById('mec2functionsSubMenu')
    mec2functionsSubMenu.addEventListener('click', clickEvent => settingsSubMenuClick(clickEvent) )

    function settingsSubMenuClick(clickEvent) {
        if (clickEvent.target.nodeName !== "A") { return }
        toggleVisible(mec2functionsSubMenu, false); setTimeout(() => removeVisible(), 1500);
        if (clickEvent.target.id === "mec2functionsOpenSettings") { setupSettingsMenu(); return; }
        else if (clickEvent.target.id === "navOnlyToggle") { mec2functionsNavOnly() }
        else if (clickEvent.target.id === "mec2stylusBaseCssToggle") { mec2stylusBaseCss(); return; }
        else if (clickEvent.target.id.indexOf("Worker") > -1) { countyInfo.updateInfo('workerRole', clickEvent.target.id); }
        reloadPage()
    }
    function toggleItemInArray(arr, item) { return arr.includes(item) ? arr.filter(val => val !== item) : [...arr, item] }
    function removeVisible() { mec2functionsSubMenu.style.removeProperty('visibility') }
    function mec2functionsNavOnly() {
        countyInfo.updateInfo('navOnly', !countyInfo.info?.navOnly);
        document.querySelector('#navOnlyToggle.menuBox').textContent = navOnlyCheckbox();
    }
    function mec2stylusBaseCss() {
        baseCssOnlyList = toggleItemInArray(baseCssOnlyList, thisPageNameHtm)
        countyInfo.updateInfo('baseCssOnlyList', baseCssOnlyList);
        document.querySelector('#mec2stylusBaseCssToggle.menuBox').textContent = mec2stylusBaseCssCheckbox();
        baseCssOnlyList.includes(thisPageNameHtm) ? document.body.classList.add('baseStyle') : document.body.classList.remove('baseStyle')
    }
    function setupSettingsMenu() {
        let isNavOnlyScript = GM_info.script.name === "mec2navigation" ? '<div>Notice: Some settings, while available to change here, only apply to the full version (mec2functions)</div>' : ''
        const settingsDivs = [
            { title: "Automatic field focus on page load", shortText: "Automatic field focus on page load", id: "eleFocus" },
            { title: "Creates duplicated form \"Action\" buttons at top of page. e.g., Save, Edit.", shortText: "Duplicated Form Action Buttons", id: "duplicateFormButtons" },
            { title: "Sets Period Order drop-downs so that newest dates are on top.", shortText: "Descending Period Order", id: "selectPeriodReversal" },
            { title: "Displays last 10 unique cases in the Navigation Area \"Case #\" field.", shortText: "Case History", id: "caseHistory" },
            { title: "Fills Actual Date and Start Date fields, if date known.", shortText: "Actual Date Auto-Fill", id: "actualDateStorage" },
            { title: "Auto-selects Yes on the Funding Availability page.", shortText: "Funds Available: Yes (auto-select)", id: "fundsAvailable" },
            { title: "Auto-hide the date picker calendar popup until a date field is clicked. Resets to saved setting when a page is loaded.", shortText: "Auto-hide Datepicker Calendar on Keypress", id: "autoHideDatePicker" },
            { title: "User accessibility features will be active (e.g., table headers access using tab)", shortText: "User Accessibility functionality", id: "userAccessibility" },
            { title: "Add a custom title to your signature name. Turn off and back on to change the title.", shortText: "Custom Signature Title", id: "promptUserNameTitle" },
            { title: "Pretty stars appear when the cursor is moved. MECH2 is not responsible for lost work time due to Starfall.", shortText: "Starfall ✨ ✨ ✨ 🖱", id: "starFall" },
            // { title: "", shortText: "", id: "" },
        ].map(({ title, shortText, id } = {}) => '<div class="settings-div"><label class="settings-label" for="' + id + '" title="' + title + '">' + shortText + '</label><label class="switch"><input type="checkbox" id="' + id + '"><span class="slider round"></span></label></div>').join('')
        document.body.insertAdjacentHTML('beforeend', ''
        + '<div class="container">'
          + '<dialog class="settingsOuter" id="mec2functionsSettings">'
            + '<div class="settingsInner" id="settingsInner">'
              + isNavOnlyScript
              + settingsDivs
            + '</div>'
            + '<div class="settingsButtons" id="mec2functionsSettingsButtonDiv">'
              + '<button class="cButton" type="button" id="mec2functionsSave">Save</button> <button class="cButton" type="button" id="mec2functionsClose">Close</button>'
            + '</div>'
          + '</dialog>'
        + '</div>'
        )
        let mec2functionsSettingsDialog = document.getElementById('mec2functionsSettings'), mec2functionsSettingsButtonDiv = document.getElementById('mec2functionsSettingsButtonDiv'), settingsInner = document.getElementById('settingsInner')
        mec2functionsSettingsButtonDiv.addEventListener('click', settingsSaveClose)
        settingsInner.addEventListener('click', settingsInnerEvent)
        function settingsInnerEvent(clickEvent) {
            if (clickEvent.target.id.indexOf('prompt') < 0 || clickEvent.target.nodeName !== "INPUT" || !clickEvent.target.checked) { return };
            let promptKey = "input" + clickEvent.target.id.slice(6), promptInfo = getPromptQuestion(promptKey)
            if ( !countyInfo.countyInfoPrompt( getPromptQuestion(promptKey), promptKey ) ) { clickEvent.target.checked === false }
        }
        function settingsSaveClose(clickEvent) {
            if (clickEvent.target.nodeName !== "BUTTON") { return };
            mec2functionsSettingsDialog.close()
            if (clickEvent.target.id === "mec2functionsClose") { return };
            let userSettingsInputs = [...document.querySelectorAll('#settingsInner input')].forEach(ele => countyInfo.updateUserSettings(ele.id, ele.checked) )
            reloadPage()
            mec2functionsSettingsButtonDiv.removeEventListener('click', settingsSaveClose)
            settingsInner.removeEventListener('click', settingsInnerEvent)
        }
        !function openSettingsMenu() {
            let userSettingsInputs = [...document.querySelectorAll('#settingsInner input')].forEach(ele => { ele.checked = countyInfo.userSettings[ele.id] ?? false })
            mec2functionsSettingsDialog.showModal()
        }();
    }
    function getPromptQuestion(promptKey) {
        switch(promptKey) {
            case "inputUserNameTitle": { return "Input username signature title, including any punctuation\n(ex: , Hennpin County)." }
        }
    }
    if (!countyInfo.userSettings) {
        // localStorage.setItem('MECH2.userSettings', '{"eleFocus":true,"caseHistory":true,"actualDateStorage":true,"selectPeriodReversal":true,"duplicateFormButtons":true,"fundsAvailable":true,"autoHideDatePicker":true,"userAccessibility":true,"starFall":false,"promptUserNameTitle":false,"navOnly":false}')
        snackBar('No user-defined-settings found. Set to default values; review settings.', 'notitle')
    }
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
    // try {
        for (let h4prop in h4objects) {
            h4objects[h4prop]?.h4?.addEventListener('click', () => h4objects[h4prop].siblings.forEach( ele => ele.classList.toggle('hidden') ))
        }
    // } catch(err) { console.trace(err) }
}();
//
const getParamsFromListOrAlertTable = { // Parameters for navigating from Alerts or Lists, and the column
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
        if (!param2 || Number.isNaN(param2)) { return { parm2: '?parm2=', parm3: '' } }
        let param3 = "Alerts.htm".includes(thisPageNameHtm) ? '&parm3=' + dateFuncs.parm3date( document.getElementById('periodBeginDate')?.value + document.getElementById('periodEndDate')?.value )
        : "BillsList.htm".includes(thisPageNameHtm) ? '&parm3=' + dateFuncs.parm3date(document.querySelector('table#billsTable > tbody > tr.selected > td:nth-child(5)').textContent)
        : ''
        return { parm2: '?parm2=' + param2, parm3: param3 }
    },
    provider() {
        const tableMap = new Map([
            ["Alerts.htm", ["table#caseOrProviderAlertsTable > tbody", 2] ],
            ["ProviderRegistrationList.htm", ['table#providerRegistrationTable > tbody', 1] ],
            ["ProviderSearch.htm", ['table#providerSearchTable > tbody', 0] ],
            ["BillsList.htm", ['table#billsTable > tbody', 2] ],
        ])
        let param2 = this.parameterTwo(tableMap)
        if (!param2 || Number.isNaN(param2)) { return { parm2: '?providerId=', parm3: '' } }
        return { parm2: '?providerId=' + param2, parm3: '' }
    },
}; // function_and_values
let newTabField;
//
function addRedTextWarning(redText) { gbl.eles.formContainer.appendChild(createNewEle('div', { classList: "error_alertbox_new", id: "noticeDetails" })).appendChild(createNewEle('strong', { classList: "redcolortext", textcontent: redText })) }
// function addRedTextWarning(redText) { gbl.eles.formContainer.insertAdjacentHTML('afterbegin', '<div class="error_alertbox_new" id="noticeDetails"><strong class="redcolortext">' + redText + '</strong></div>') }
function walkToTableRow(ele) {
    if (!sanitize.query(ele)) { return };
    while ( !["TR", "TBODY"].includes(ele.nodeName) ) { ele = ele.parentElement }
    if (ele.nodeName === "TBODY") { return undefined }
    return ele
};
function docReady(fn) {
    if (["complete", "interactive"].includes(document.readyState)) { setTimeout(fn, 1) }
    else { document.addEventListener("DOMContentLoaded", fn) }
};
function cssStyle() {
    const newStyleSheet = new CSSStyleSheet();
    document.adoptedStyleSheets.push(newStyleSheet)
    return newStyleSheet
};
//
!function keepSelectedTableRowOnClick() { //Fix for table entries losing selected class when clicked on.
    if (iFramed) { return };
    if (['FinancialAbsentDayHolidayTracking.htm'].includes(thisPageNameHtm)) { return };
    document.querySelectorAll('tbody').forEach(tbody => {
        tbody.addEventListener('click', clickEvent => {
            let closestTr = walkToTableRow(clickEvent.target)
            if (!closestTr || closestTr.classList.contains('selected') ) { return };
            [...tbody.children].find(ele => ele.classList.contains('selected'))?.classList.remove('selected')
            closestTr.classList.add('selected')
        })
    })
}();
//
const mec2functionFeatures = [
        { title: 'Primary Navigation', desc: 'Buttons added to replace the drop-down menus for navigating MEC2.', selector: '.primary-navigation' },
        { title: 'User Settings', desc: 'Settings menu for mec2functions.', selector: '#mec2functionsMenu' },
        { title: 'Open Case in New Tab', desc: 'An input field for a case number, with buttons that open the case in Notes or Overview. Pressing Enter opens Overview, and N opens Notes.', selector: '#buttonPanelOneNTF' },
        { title: 'Case History', desc: 'A list of the last 10 cases opened. Includes the case name, number, and date with time.', selector: '#newTabField' },
        { title: 'Addtional Footer Links', desc: 'Links added to the footer of sites commonly used by CCAP workers. Some links are only added to specific pages, such as on the CaseTransfer page.', selector: '#footer_links' },
        { title: 'Hotkeys', desc: 'Hotkeys to operate buttons. Hotkey combinations are "Alt" plus:<br><u>N</u>ew, <u>S</u>ave, <u>E</u>dit, <u>D</u>elete, <u>O</u>k, <u>C</u>ancel, <u>R</u>esend, <u>R</u>eturn, <u>W</u>rap-Up, <u>←</u> (previous), <u>→</u> (next).<br>Hotkey is typically the first letter of the button.' },
        { title: 'Auto-Focus', desc: 'When loading a page, or with certain page changes, an item on the page is automatically "focused" so that it can be interacted with immediately. The selected item is designed to be the item most likely needing interaction.' },
        { title: 'Theme colors', desc: 'Using the Stylus extension and MEC2Stylus, MEC2 theme colors are changed to beige and light grays or black and dark grays. This follows the "color" setting in "System Colors" in Windows.' },
        // {title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL"},
        { separator: true },
];
// ========================================================================================================================================================================================================
// ///////////////////////////////////////////////////////////////////// SECTION_START CUSTOM_NAVIGATION \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ///////////////////////////////////////////////////////////////// PRIMARY_NAVIGATION_BUTTONS SECTION_START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// const searchIcon = "<span style='font-size: 80%; margin-left: 2px;'>🔍</span>";
const allPagesMap = new Map([
    [ "Alerts.htm", { label: "Alerts", target: "_self", parentId: "Alerts", row: "1" }, ],
    [ "CaseNotes.htm", { label: "Notes", target: "_self", parentId: "Case Notes", row: "1" }, ],
    [ "CaseOverview.htm", { label: "Overview", target: "_self", parentId: "Case Overview", row: "1" }, ],
    [ "CasePageSummary.htm", { label: "Summary", target: "_self", parentId: "Page Summary", row: "1" }, ],
    [ "ClientSearch.htm", { label: "Client ", searchIcon: "yes", target: "_self", parentId: "Client Search", row: "1" }, ],
    // [ "ClientSearch.htm", { label: "Client " + searchIcon, target: "_self", parentId: "Client Search", row: "1" }, ],
    [ "ProviderSearch.htm", { label: "Provider ", searchIcon: "yes", target: "_self", parentId: "Provider Search", row: "1" }, ],
    // [ "ProviderSearch.htm", { label: "Provider " + searchIcon, target: "_self", parentId: "Provider Search", row: "1" }, ],
    [ "ActiveCaseList.htm", { label: "Active", target: "_self", parentId: "Active Caseload List", row: "1" }, ],
    [ "PendingCaseList.htm", { label: "Pending", target: "_self", parentId: "Pending Case List", row: "1" }, ],
    [ "InactiveCaseList.htm", { label: "Inactive", target: "_self", parentId: "Inactive Case List", row: "1" }, ],
    [ "CaseApplicationInitiation.htm", { label: "New App", target: "_self", parentId: "Application Initiation", row: "1" }, ],

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
    [ "CaseJobSearchTracking.htm", { label: "Job Search Tracking", target: "_self", parentId: "Job Search Tracking", rowTwoParent: "Activity_and_Income.btn", row: "3", }, ],

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

    [ "FinancialClaimSearch.htm", { label: "Search", target: "_blank", parentId: "Claim Search", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimEstablishment.htm", { label: "Establish", target: "_blank", parentId: "Claim Establishment", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimMaintenanceAmountDetails.htm", { label: "Details", target: "_self", parentId: "Maintenance Details", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimMaintenanceSummary.htm", { label: "Summary", target: "_self", parentId: "Maintenance Summary", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimNoticeOverpaymentText.htm", { label: "Overpayment Text", target: "_self", parentId: "Overpayment Text", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimNotes.htm", { label: "Notes", target: "_self", parentId: "Claim Notes", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimNotices.htm", { label: "Notices", target: "_self", parentId: "Claim Notices History", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "ProviderFraud.htm", { label: "Provider Fraud", target: "_self", parentId: "Provider Fraud", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimMaintenanceCase.htm", { label: "Maint-Case", target: "_self", parentId: "Maintenance Case", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimMaintenancePerson.htm", { label: "Maint-Person", target: "_self", parentId: "Maintenance Person", rowTwoParent: "Claims.btn", row: "3", }, ],
    [ "FinancialClaimMaintenanceProvider.htm", { label: "Maint-Provider", target: "_self", parentId: "Maintenance Provider", rowTwoParent: "Claims.btn", row: "3", }, ],
])
!function primaryNavigation() {
    if (iFramed || !thisPageNameHtm || thisPageNameHtm.indexOf('Log') === 0) { return }
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
            [ "Claims.btn", [ "FinancialClaimSearch.htm", "FinancialClaimEstablishment.htm", "FinancialClaimMaintenanceAmountDetails.htm", "FinancialClaimMaintenanceSummary.htm", "FinancialClaimNoticeOverpaymentText.htm", "FinancialClaimNotes.htm", "FinancialClaimNotices.htm", "ProviderFraud.htm", "FinancialClaimMaintenanceCase.htm", "FinancialClaimMaintenancePerson.htm", "FinancialClaimMaintenanceProvider.htm" ], ],
        ]),
        listPageList: [ "Alerts.htm", "ActiveCaseList.htm", "ClientSearch.htm", "InactiveCaseList.htm", "PendingCaseList.htm", "RedeterminationCaseList.htm", "ProviderRegistrationList.htm", "ProviderSearch.htm", "ServicingAgencyIncomingTransfers.htm", "ServicingAgencyOutgoingTransfers.htm", "BillsList.htm", ],
        setWorkerRole() {
            document.getElementById(workerRole)?.setAttribute('style', 'font-weight: 700;')
            switch (workerRole) {
                case "mec2functionsFinancialWorker": this.rowMap.set( "rowTwo", [ "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Billing.btn", "Transfer.btn", "Claims.btn", ] ); break;
                case "mec2functionsPaymentWorker": this.rowMap.set( "rowTwo", [ "Billing.btn", "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Transfer.btn", "Claims.btn", ] ); break;
                case "mec2functionsProviderWorker": this.rowMap.set( "rowTwo", [ "Provider_Info.btn", "Provider_Notices.btn", "Pro.btn", "Billing.btn", "Member.btn", "Case.btn", "Activity_and_Income.btn", "Eligibility.btn", "SA.btn", "Notices.btn", "CSI.btn", "Transfer.btn", "Claims.btn", ] ); break;
            };
        },
    };
    navMaps.setWorkerRole()
    let buttonDivTwo = document.getElementById('buttonPanelTwo'), buttonDivOneNTF = document.getElementById("buttonPanelOneNTF");
    if (!buttonDivTwo) { return };
    !function createNavButtons() {
        navMaps.rowMap.forEach((valueArray, row) => {
            if (row === "rowOne") {
                let buttonPanelOne = document.getElementById('buttonPanelOne')
                valueArray.forEach(mapPageName => {
                    let mapPageProps = allPagesMap.get(mapPageName),
                        navButtonTemp = buttonPanelOne.appendChild(createNewEle('button', { id: mapPageName, classList: "cButton nav", textContent: mapPageProps?.label ?? 'error' }))
                    if ("searchIcon" in mapPageProps) { navButtonTemp.appendChild(createNewEle('span', { style: 'font-size: 80%; margin-left: 2px;', textContent: "🔍" })) }
                })
            } else if (row === "rowTwo") {
                let buttonPanelTwo = document.getElementById('buttonPanelTwo')
                valueArray.forEach(buttonLabel => buttonPanelTwo.appendChild(createNewEle('button', { id:buttonLabel, classList: "cButton nav", textContent: buttonLabel.replaceAll(/_/g,' ').split(".")[0] })))
            }
        })
        !function highlightNavOnPageLoad() {
            let thisPageNameMap = allPagesMap.get(thisPageNameHtm)
            if (!thisPageNameMap) { return };
            if ( thisPageNameMap.row === "1" ) {
                document.getElementById(thisPageNameHtm).classList.add('open-page')
            } else if ( thisPageNameMap.row === "3" ) {
                populateNavRowThree(thisPageNameMap.rowTwoParent)
                document.getElementById(thisPageNameMap.rowTwoParent).classList.add('open-page')
            }
        }();
    }();
    function populateNavRowThree(rowTwoCategory) {
        document.getElementById('buttonPanelThree').innerHTML = navMaps.rowPagesMap.get(rowTwoCategory).map(mapPageName => {
            let classList = "cButton nav"
            if (thisPageNameHtm === mapPageName) { classList += " open-page" }
            if (rowTwoCategory === "Eligibility.btn" && !reviewingEligibility && !["CaseEligibilityResultSelection.htm", "CaseCreateEligibilityResults.htm", ].includes(mapPageName) ) { classList += " hidden" }
            return '<button class="' + classList + '" id="' + mapPageName + '">' + (allPagesMap.get(mapPageName)?.label ?? 'error') + '</button>'
        }).join('')
    };
    function openNav(mapPageName, target) {
        let destinationIsListPage = navMaps.listPageList.includes(mapPageName)
        let qMarkParameters = ""
        let isListPage = navMaps.listPageList.includes(thisPageNameHtm)
        if (!destinationIsListPage && isListPage) {
            qMarkParameters = mapPageName.indexOf("Provider") === 0 ? getParamsFromListOrAlertTable.provider() ?? '' : getParamsFromListOrAlertTable.case() ?? ''
            if (target === "_self") { document.body.style.opacity = ".8" }
            window.open('/ChildCare/' + mapPageName + qMarkParameters.parm2 + qMarkParameters.parm3, target)
            return
        }
        if (!editMode) {
            let targetPage = allPagesMap.get(mapPageName)?.parentId?.replace(/ /g, '\ ')
            if (!targetPage) { return }
            if (target === "_self") { document.body.style.opacity = ".8" }
            window.open( document.getElementById(targetPage).firstElementChild.href, target )
        } else if (editMode) {
            qMarkParameters = caseIdVal ? "?parm2=" + caseIdVal : ''
            window.open('/ChildCare/' + mapPageName + qMarkParameters, "_blank")
        }
    };
    function clickRowTwo(clickTarget) {
        buttonDivTwo?.querySelectorAll('.cButton.nav.browsing').forEach(ele => ele.classList.remove('browsing'))
        populateNavRowThree(sanitize.string(clickTarget.id))
        clickTarget.classList.add('browsing')
    };
    !function addNavEvents() {
        document.querySelector('.primary-navigation').addEventListener('click', eventClick => {
            if (gbl.eles.wrapUp && !editMode && gbl.eles.wrapUp.disabled) { clearStorageItems('session') }
            let eventClickTarget = eventClick.target
            if ( eventClickTarget.parentElement === buttonDivOneNTF || eventClickTarget.nodeName !== "BUTTON") { return };
            if ( eventClickTarget.parentElement === buttonDivTwo ) { clickRowTwo(eventClickTarget); return };
            if (editMode) { openNav(sanitize.string(eventClickTarget.id), "_blank"); return };
            openNav(sanitize.string(eventClickTarget.id), "_self")
            eventClickTarget.classList.add('open-page')
        })
        document.querySelector('.primary-navigation').addEventListener('contextmenu', contextmenuEvent => {
            let closestDivId = contextmenuEvent.target.closest('div')?.id
            if ( contextmenuEvent.target.nodeName !== "BUTTON" || contextmenuEvent.altKey || closestDivId === "newTabInputDiv" ) { return };
            contextmenuEvent.preventDefault();
            if ( closestDivId === "buttonPanelTwo" ) { clickRowTwo(contextmenuEvent.target); return; };
            openNav(contextmenuEvent.target.id, "_blank")
        })
    }();

    if ("getProviderOverview.htm".includes(thisPageNameHtm)) {
        let getProviderOverview = document.getElementById('Provider_Info.btn')
        getProviderOverview.click()
        getProviderOverview.classList.replace('browsing', 'open-page')
        document.getElementById('ProviderOverview.htm').classList.add('open-page')
    };
    if (["ProviderSearch.htm", "ProviderRegistrationList.htm"].includes(thisPageNameHtm)) { document.getElementById('Provider_Info.btn').click() };
    // SECTION_START New_Tab_Case_Number_Field
    !function newTabFieldSetup() {
        !function newTabFieldHTML() {
            buttonDivOneNTF
                .appendChild(createNewEle('div', { id: "newTabInputDiv" }))
                .appendChild(createNewEle('input', { id: "newTabField", autocomplete:"off", classList: "form-control", placeholder: "Case #", pattern: "^\\d{1,8}$", style: "width: 10ch;" }))
                .parentElement.insertAdjacentElement('afterend', createNewEle('button', { type: "button", dataPageName: "CaseNotes", id: "FieldNotesNT", classList: "cButton nav", textContent: "Notes" }))
                .insertAdjacentElement('afterend', createNewEle('button', { type: "button", dataPageName: "CaseNotes", id: "FieldOverviewNT", classList: "cButton nav", textContent: "Overview" }))
        }();
        newTabField = document.getElementById('newTabField')
        !function newTabFieldEvents() {
            buttonDivOneNTF.addEventListener('click', clickEvent => {
                if (clickEvent.target.closest('button')?.nodeName === 'BUTTON') { pageOpenNTF(clickEvent, clickEvent.target.dataset.pageName) };
            })
            newTabField.addEventListener('paste', pasteEvent => {
                pasteEvent.preventDefault();
                let pastedText = (event.clipboardData || window.clipboardData).getData("text").trim()
                if ( !/^\d{1,8}$/.test(pastedText) ) { return };
                newTabField.value = pastedText
            })
            newTabField.addEventListener('keydown', keydownEvent => {
                keydownEvent.stopImmediatePropagation()
                if (
                    ( /[0-9]/.test(keydownEvent.key) && /^\d{0,7}$/.test(keydownEvent.target.value) )
                    || ( keydownEvent.ctrlKey && ['v', 'a', 'x', 'c', 'z'].includes(keydownEvent.key) )
                    || [ 'ArrowLeft', 'ArrowRight', 'Backspace', 'Delete', 'Home', 'End', 'Tab' ].includes(keydownEvent.key)
                ) { return; }
                switch (keydownEvent.key) {
                    case 'n': pageOpenNTF(keydownEvent, 'CaseNotes'); break;
                    case 'o':
                    case 'Enter': pageOpenNTF(keydownEvent, 'CaseOverview'); break;
                    case 'Escape': toggleVisible(document.getElementById('caseHistory'), false); newTabField.blur(); break;
                }
                keydownEvent.preventDefault()
            })
        }();
        function pageOpenNTF(event, pageNameNTF) {
            event.preventDefault();
            if (!/^\d{1,8}$/.test(newTabField.value)) { return; }
            let pageTarget = gbl.eles.caseIdElement && !caseIdVal ? "_self" : "_blank"
            window.open('/ChildCare/' + (pageNameNTF === "CaseOverview" ? "CaseOverview" : "CaseNotes") + '.htm?parm2=' + newTabField.value, pageTarget);
            newTabField.value = ''
            toggleVisible(document.getElementById('caseHistory'), false);
            newTabField.blur()
        }
    }();
    editMode && (document.querySelectorAll('#buttonPanelTwo, #buttonPanelThree').forEach(ele => ele.classList.add('hidden') )); // SECTION_END New_Tab_Case_Number_Field
}();
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ PRIMARY_NAVIGATION_BUTTONS SECTION_END  //////////////////////////////////////////////////////////////////
function selectPeriodReversal(selectPeriodEleToReverse = gbl.eles.selectPeriod) { // don't iife
    selectPeriodEleToReverse = sanitize.query(selectPeriodEleToReverse)
    if (!selectPeriodEleToReverse || selectPeriodEleToReverse.disabled) { return };
    selectPeriodEleToReverse.innerHTML = [...selectPeriodEleToReverse.children].reverse().map(ele => ele.outerHTML).join('')
};
function selectOption(selectElement, selectedOptionValue) {
    const originallySelectedOption = selectElement.querySelector('[selected]')
    const selectedOption = selectElement.querySelector('[value="' + selectedOptionValue + '"')
    if (originallySelectedOption !== selectedOptionValue) { originallySelectedOption.removeAttribute('selected'); selectedOption.setAttribute('selected', 'selected') }
}
!function nextPrevPeriodButtons() {
    if (iFramed || editMode || !gbl.eles.selectPeriod || !sanitize.query(gbl.eles.selectPeriod) || gbl.eles.selectPeriod.disabled || gbl.eles.selectPeriod.readOnly || gbl.eles.selectPeriod.type === "hidden" || reviewingEligibility || thisPageNameHtm.indexOf("CaseApplicationInitiation.htm") > -1 || gbl.eles.submitButton?.disabled) { return }
    try {
        let selectPeriodReversed = countyInfo.userSettings?.selectPeriodReversal
        let lastAvailablePeriod = gbl.eles.selectPeriod.firstElementChild.value
        gbl.eles.selectPeriod.insertAdjacentElement('beforebegin', createNewEle('span', { id: "prevButtons" }))
        .appendChild(createNewEle('button', { id: "prev.go", tabIndex: "-1", type: "button", classList: "npp-button", textContent: "«" }))
        .insertAdjacentElement('afterend', createNewEle('button', { id: "prev.stay", tabIndex: "-1", type: "button", classList: "npp-button", textContent: "‹" }))
        gbl.eles.selectPeriod.insertAdjacentElement('afterend', createNewEle('span', { id: "nextButtons" }))
        .appendChild(createNewEle('button', { id: "next.stay", tabIndex: "-1", type: "button", classList: "npp-button", textContent: "›" }))
        .insertAdjacentElement('afterend', createNewEle('button', { id: "next.go", tabIndex: "-1", type: "button", classList: "npp-button", textContent: "»" }))
        let nextButtons = document.getElementById('nextButtons')
        checkPeriodMobility()

        gbl.eles.selectPeriod.parentElement.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return; }
            checkPeriodMobility()
            let clickedButton = clickEvent.target.closest('button')
            selectNextPrev(clickedButton.id)
        })
        function checkPeriodMobility() {
            nextButtons.style.opacity = gbl.eles.selectPeriod.value === lastAvailablePeriod ? ".5" : ""
        }
        function selectNextPrev(buttonId) {
            let [ nextOrPrev, stayOrGo ] = buttonId.split('.')
            if (nextOrPrev === "next") {
                if (gbl.eles.selectPeriod.selectedIndex === 0) { // top of list
                    if (stayOrGo === "go") { gbl.eles.submitButton.click() }
                    return
                }
                selectPeriodReversed ? gbl.eles.selectPeriod.selectedIndex-- : gbl.eles.selectPeriod.selectedIndex++; //Subtracting goes up;
                if (stayOrGo === "go") { gbl.eles.submitButton.click() }
            } else if (nextOrPrev === "prev") {
                selectPeriodReversed ? gbl.eles.selectPeriod.selectedIndex++ : gbl.eles.selectPeriod.selectedIndex--;
                if (stayOrGo === "go") { gbl.eles.submitButton.click() }
            }
            checkPeriodMobility()
        };
    } catch (error) { console.trace("nextPrevPeriodButtons", error) }
}();
function findContainingPeriod(selectElement, compareDate=Date.now()) {
    let selectPeriodDatesArray = countyInfo.userSettings?.selectPeriodReversal ? [...selectElement.children].slice(0, 18) : [...selectElement.children].slice(-18)
    if (typeof compareDate === "string") { compareDate = sanitize.date(compareDate) }
    if (typeof compareDate !== "number") { return };
    return selectPeriodDatesArray.find(dates => (sanitize.date(dates.value.slice(13), "number") - compareDate ) < 1123200001).value
}
function inCurrentBWP( compareDate = Date.now() ) {
    compareDate = sanitize.date(compareDate, "number")
    if (Number.isNaN(compareDate)) { return false }
    if ( inRange( compareDate, sanitize.date(selectPeriodDates.start, "number"), sanitize.date(selectPeriodDates.end, "number") ) ) { return dateFuncs.formatDate(compareDate, "mmddyyyy") }
    else { return false }
};
if (gbl.eles.selectPeriod && countyInfo.userSettings?.selectPeriodReversal && !editMode) { selectPeriodReversal() };
docReady( document.body?.addEventListener('submit', () => { document.body.style.opacity = ".8" }) ); // Dim_Page_On_Submit
// docReady (document.querySelectorAll('form input.form-control:read-write').forEach(ele => { ele.spellcheck = false }) )
function addToFooter(...feet) {
    let separatorSpan = '<span class="footer">ı</span>'
    feet = Array.isArray(feet[0]) ? feet.flat(1) : [feet]
    let footerHTML = feet.map(([footerLink, footerText, footerTarget="_blank", footerTitle, footerClass] = []) => separatorSpan + '<a href="' + footerLink + '" target="' + footerTarget + '"' + (footerClass ? ' class="' + footerClass + '"' : "") + (footerTitle ? ' title="' + footerTitle + '"' : "") + '>' + footerText + '</a>').join('')
    gbl.eles.footerLinks.insertAdjacentHTML('beforeend', footerHTML)
}
!function footerLinks() {
    if (iFramed) { return }
    try {
        let foot = gbl.eles.footerLinks
        if (gbl.eles.footerLinks) {
            [...gbl.eles.footerLinks?.childNodes]?.filter(eleFeet => eleFeet.nodeType === 3 && eleFeet.length > 2).forEach(eleFoot => eleFoot.remove());
            let toes = gbl.eles.footerLinks.children;
            [...toes]?.toSpliced(-1, 1).forEach(eleToes => eleToes.insertAdjacentHTML('afterend', '<span class="footer">ı</span>'));
            const additionalFooterLinks = [
                ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/MMR/TSS_General_Request.asp", "Help Desk", "_blank"],
                ["https://owa.dhssir.cty.dhs.state.mn.us/owa/", "SIR Mail", "_blank"],
                ["https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=dhs16_146163", "Resources", "_blank", "Memos & Bulletins, PolicyLink, etc."],
                ["https://policyquest.dhs.state.mn.us/", "PolicyQuest", "_blank"],
                ["https://www.mnworkforceone.com/", "WF1", "_blank"],
                ["https://owa.dhssir.cty.dhs.state.mn.us/csedforms/ccforms/TSS_PMI_Merge_Request.aspx", "PMI Merge", "_blank"],
                ["https://moms.mn.gov/", "MOMS", "_blank"],
                ["https://smi.dhs.state.mn.us/", "SMI", "_blank"],
            ]
            document.getElementById('contactInformation').textContent = "Help Desk Info"
            document.querySelector('#footer_links > a[href="https://bi.dhs.state.mn.us/BOE/BI"]').textContent = 'BOBI'
            addToFooter(additionalFooterLinks)
        }
    } catch (error) { console.trace(error) }
}();
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\ SECTION_END CUSTOM_NAVIGATION  (THE MEC2NAVIGATION SCRIPT SHOULD MIMIC THE ABOVE) ////////////////////////////////////////////////////////////
// ========================================================================================================================================================================================================
if (countyInfo.info?.navOnly) { return };
!function savePeriod() {
    if (thisPageNameHtm.slice(0, 4) !== "Case") { return }
    const earliestSavePeriodStart = sessionStorage.getItem('MECH2.earliestEditPeriod.' + caseIdVal) ?? 9999999999999
    gbl.eles.save?.addEventListener('click', () => {
        if (Date.parse(selectPeriodDates.start) > earliestSavePeriodStart) { return }
        sessionStorage.setItem('MECH2.earliestEditPeriod.' + caseIdVal, selectPeriodDates.range)
    })
}
function resetTabIndex(excludedListString) {
    const nonResetPages = ["CaseSpecialLetter.htm", "CaseLumpSum.htm"]
    if (nonResetPages.includes(thisPageNameHtm)) { return };
    document.querySelectorAll('form .panel-box-format :is(.form-control, .form-button):not([type=hidden])').forEach(ele => ele.removeAttribute('tabindex'))
};
function flashRedOutline(ele) {
    ele = sanitize.query(ele)
    if (!ele) { return };
    const redOutline = [{ outlineColor: "red", outlineWidth: "2px", }], redOutlineTiming = { outlineStyle: "solid", duration: 300, iterations: 10, }
    ele.animate(redOutline, redOutlineTiming)
};
const convertLineBreakToSpace = (string) => string.replace(/([\S]) *\n([a-z])/g, '$1 $2');
const doChange = (element) => { element = sanitize.query(element); element?.dispatchEvent(new Event('change', { bubbles: true })) };
const doInput = (element) => sanitize.query(element)?.dispatchEvent(new Event('input', { bubbles: true }));
const doKeyup = (element) => sanitize.query(element)?.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
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
    static getActive() { return this.instances };
};
//======================== Case_History Section_Start =================================
!function caseHistoryDatalist() {
    if (iFramed || !(newTabField instanceof HTMLElement) || !countyInfo.userSettings?.caseHistory) { return };
    try {
        const caseHistory = sanitize.json(localStorage.getItem('MECH2.caseHistoryLS')) ?? []
        if (pageTitle === pageTitle.toUpperCase() && thisPageNameHtm.indexOf('Provider') !== 0 && caseIdVal && !editMode && localStorage.getItem('MECH2.note') === null) { addToCaseHistoryArray() }
        function addToCaseHistoryArray() {
            const caseName = nameFuncs.commaNameReorder(pageTitle), caseIdValTest = (entry) => entry.caseIdValNumber === caseIdVal, foundDuplicate = caseHistory.findIndex(caseIdValTest)
            if (foundDuplicate > -1) { caseHistory.splice(foundDuplicate, 1) }
            let timestamp = dateFuncs.formatDate(new Date(), "mmddhm"), newEntry = { caseIdValNumber: caseIdVal, caseName: caseName, time: timestamp };
            while (caseHistory.length > 9) { caseHistory.pop() }
            caseHistory.unshift(newEntry)
            localStorage.setItem('MECH2.caseHistoryLS', JSON.stringify(caseHistory));
        };
        let viewHistoryDatalist = '<datalist id="caseHistory" style="visibility: hidden;">'
        + caseHistory.map(item => '<div class="caseHistoryEntry" id="history' + parseInt(item.caseIdValNumber) + '"><span>' + sanitize.timeStamp(item.time) + '</span><span>' + sanitize.string(item.caseName) + '</span><span>' + parseInt(item.caseIdValNumber) + '</span></div>').join('')
        + '</datalist>'
        newTabField.insertAdjacentHTML('afterend', viewHistoryDatalist)
        let history = document.getElementById('caseHistory'), historyList = [...history.children]
        newTabField.addEventListener('focus', focusEvent => {
            filterHistory(focusEvent.target.value, undefined)
            document.addEventListener('click', hideHistoryClick)
        })
        newTabField.addEventListener('paste', pasteEvent => {
            filterHistory(pasteEvent.target.value, undefined)
        })
        newTabField.addEventListener('input', inputEvent => { filterHistory(inputEvent.target.value, inputEvent.inputType) });
        history.addEventListener('click', clickEvent => {
            if ( !["SPAN", "DIV"].includes(clickEvent.target.nodeName) ) { return }
            toggleVisible(history, false)
            newTabField.value = Number(clickEvent.target.closest('div.caseHistoryEntry').id.split('history')[1])
            newTabField.select()
        });
        function filterHistory(inputValue, inputType) {
            if (!inputValue) {
                unhideElement(historyList, true)
                if (inputType && inputType === 'deleteByCut') {
                    toggleVisible(history, false);
                    newTabField.blur();
                    return;
                }
                toggleVisible(history, true)
                return
            }
            let inputMatch = historyList.filter( ele => ele.id.includes(inputValue) )
            if (inputMatch.length) {
                toggleVisible(history, true)
                historyList.forEach(ele => inputMatch.includes(ele) ? unhideElement(ele, true) : unhideElement(ele, false) )
            } else { toggleVisible(history, false) }
        }
        function hideHistoryClick(clickEvent) {
            if ( clickEvent.target.closest('#newTabInputDiv') ) { return };
            hideHistory()
        }
        function hideHistory() {
            toggleVisible(history, false)
            document.removeEventListener('click', hideHistoryClick)
        }
    }
    catch (err) { console.trace(err) }
}(); //======================== Case_History Section_End ===================================//
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
]).get(countyInfo.info?.userIdNumber?.slice(0, 4).toLowerCase());
//======================== Actual_Date Section_Start =================================
const actualDate = {
    dateField: document.getElementById('actualDate') ?? document.querySelector('#employmentActivityBegin, #activityPeriodStart, #activityBegin, #ceiPaymentBegin, #paymentBeginDate, #applicationReceivedDate, #bSfEffectiveDate') ?? document.getElementById('effectiveDate') ?? undefined,
    invalidDateWarning: '<span id="actualDateTooltip" class="tooltips" style="height: 1lh;"><span class="tooltips-text tooltips-bottomleft narrow" style="visibility: visible; opacity: 1;">Warning: Date not valid.</span></span>',
    notInBWPwarning: '<span id="actualDateTooltip" class="tooltips" style="height: 1lh;"><span class="tooltips-text tooltips-bottomleft narrow" style="visibility: visible; opacity: 1;">Warning: Date not in the current period.</span></span>',
    get _actualDateMatch() {
        if (!this.dateField) { return undefined };
        let actualDateParsed = sanitize.json( sessionStorage.getItem('actualDateSS') )
        if (!actualDateParsed) { return undefined };
        let { adCaseNum, adDate } = actualDateParsed
        if (![caseIdVal, "noCaseNumberYet"].includes(adCaseNum) ) { return false };
        if (adCaseNum === "noCaseNumberYet" && caseIdVal) {//change undefined to caseIdVal
            this._setActualDate({ adCaseNum: caseIdVal, adDate, })
            return { adCaseNum: caseIdVal, adDate, }
        }
        return actualDateParsed
    },
    _setActualDate({ adCaseNum, adDate } = {}) {
        sessionStorage.setItem('actualDateSS', '{"adCaseNum":"' + adCaseNum + '", "adDate":"' + adDate + '"}' )
    },
    _actualDateMatches({ adDate, adCaseNum } = {}) {
        if (editMode && gbl.eles.quit) { gbl.eles.quit.addEventListener('click', () => { clearStorageItems('session'); return; }) }
        if (gbl.eles.submitButton?.id === "caseInputSubmit") { // field for user to manually edit Actual Date;
            gbl.eles.submitButton.insertAdjacentHTML('afterend', '<div class="float-right-imp" style="display: flex; align-items: center;"><label>Actual Date: </label><input id="userInputActualDate" class="form-control" style="width: var(--dateInput);"></input></div>')
            let userInputActualDate = document.getElementById('userInputActualDate')
            userInputActualDate.addEventListener( 'click', () => document.getElementById('actualDateTooltip')?.remove() )
            userInputActualDate.value = adDate
            userInputActualDate.addEventListener('blur', blurEvent => {
                let userActualDateValue = blurEvent.target.value
                if (!userActualDateValue) { sessionStorage.removeItem('actualDateSS'); return; }
                let userActualDateValueNumber = sanitize.date(userActualDateValue, "number")
                if (isNaN(userActualDateValueNumber)) { userInputActualDate.classList.add('red-outline'); userInputActualDate.insertAdjacentHTML('afterend', this.invalidDateWarning); return; }
                let dateInCurrentPeriod = inCurrentBWP(userActualDateValueNumber)
                if (dateInCurrentPeriod) {
                    userInputActualDate.classList.remove('red-outline')
                    this._setActualDate({adCaseNum: caseIdVal, adDate: dateInCurrentPeriod, adField: this.dateField.id})
                } else { userInputActualDate.classList.add('red-outline'); userInputActualDate.insertAdjacentHTML('afterend', this.notInBWPwarning); }
            })
        }
        if (!editMode || !this.dateField) { return }
        if (!this.dateField.value) { this.dateField.value = adDate } // Actual date field being filled;
        else if ( "CaseAddress.htm".includes(thisPageNameHtm) && document.getElementById('edit').disabled && this.dateField.value !== adDate ) {
            this.dateField.parentElement.insertAdjacentHTML('afterend', '<button type="button" id="useActualDate" style="margin-left: 20px;" class="cButton sidePadding">Use: ' + adDate + '</button>')
            let useActualDate = document.getElementById('useActualDate')
            useActualDate.addEventListener('click', () => { this.dateField.value = adDate; eleFocus(gbl.eles.save) })
            eleFocus(useActualDate)
        }
    },
    _dateStorage() {
        let actualDateMatch = this._actualDateMatch
        if (actualDateMatch) { this._actualDateMatches(actualDateMatch) }
        if ( actualDateMatch || !editMode || !this.dateField || !actualDateMatch instanceof HTMLInputElement || this.dateField.disabled || this.dateField.value ) { return }
        if ( !"CaseApplicationInitiation.htm".includes(thisPageNameHtm) ) {
            let inCurrentPeriod = inCurrentBWP()
            if (inCurrentPeriod) { this.dateField.value = inCurrentPeriod }
        }
        gbl.eles.save?.addEventListener('click', () => {
            if (this.dateField.value.length !== 10) { return }
            let adcaseIdVal = caseIdVal ?? "noCaseNumberYet"
            this._setActualDate({ adCaseNum: adcaseIdVal, adDate: this.dateField.value })
        })
    },
}; //======================== Actual_Date Section_End =================================
if (!iFramed && ( caseIdVal || "CaseApplicationInitiation.htm".includes(thisPageNameHtm) ) && countyInfo.userSettings?.actualDateStorage) { actualDate._dateStorage() };
//======================== Actual_Date Section_End =================================
// ======================================================================================================================================================================================================
// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION START \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// !function pageSpecificChanges() { try {
!function _CaseList_Pages() {
    if (thisPageNameHtm.indexOf("CaseList") === -1) { return };
    const subprogramMap = new Map([
        ["Transition Year", "TY"],
        ["Transition Year Extension", "TYE"],
        ["MFIP/DWP", "CCMF"],
        ["Basic Sliding Fee", "BSF"],
        ["Child Care Assistance", "???"]
    ])
    !async function __ActiveCaseList() {
        if (!("ActiveCaseList.htm").includes(thisPageNameHtm) || !tableHasData('#activeCaseTable') ) { return };
        document.querySelector('.dataTables_scrollHeadInner table thead tr').children[4].textContent = "Redet Date"
        const activeCaseSearchWorkerId = document.getElementById('activeCaseSearchWorkerId').value, aclTbody = document.querySelector('tbody'), caseResultsData = document.getElementById('caseResultsData')
        mec2functionFeatures.push(
            { title: "Case queries", desc:
             "Queries cases based on selection."
             + "<br>Redet/Suspend: Checks suspended cases that have an upcoming redetermination. If the case will likely be suspended for 1 year, adds a button to delay redetermination so the case closes prior to the redetermination being mailed."
             + "<br>Job Search Hours: Checks all cases for the job search activity, and fetches the weekly job search hours listed."
             + "<br>Subprogram: Checks all cases to ensure the CCAP subprogram is correct."
             + "<br>Edit Summary: Lists any summary edits found for all cases."
             + "<br>Self-Employment: Checks all cases for the self-employment activity."
             + "<br>Reporter Type: Fetches the reporter type for Active status cases."
             + "<br>Residence: Fetches the city of residence for all cases."
             + "<br>Homeless: Checks for if the case is or was homeless, and the dates thereof. For reporting purposes."
             , selector: "#afterResults" },
            // { title: "TITLE", desc: "DESCRIPTION", selector: "#resultHeaderMsg" },
            // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
            // { title: "TITLE", desc: "DESCRIPTION", selector: "OPTIONAL" },
        )
        const openCaseLists = { active: [], suspended: [], reinstated: [], tempInelig: [] }
        !function shortenProgram() { [...document.querySelectorAll('tbody tr td:nth-child(4)')].forEach(td => { td.innerHTML = '<span>' + subprogramMap.get(td.textContent) + '</span>' }) }();
        !function caseListTypeCount() {
            [...aclTbody.children].forEach(ele => {
                switch (ele.children[2].textContent) {
                    case "Active": { openCaseLists.active.push(ele); break; }
                    case "Suspended": { openCaseLists.suspended.push(ele); break; }
                    case "Reinstated": { openCaseLists.reinstated.push(ele); break; }
                    case "Temporarily Ineligible": { openCaseLists.tempInelig.push(ele); break; }
                }
            })
            document.querySelector('h5').insertAdjacentHTML( 'beforeend', " " + [openCaseLists.active.length, "active,", openCaseLists.suspended.length, "suspended,", openCaseLists.tempInelig.length, "temp inelig. "].join(" ") + (openCaseLists.reinstated.length ? openCaseLists.reinstated.length + " reinstated but not approved." : "") )
            document.getElementById('resultHeaderMsg').addEventListener('click', () => {
                let copyText = [openCaseLists.active.length, openCaseLists.suspended.length, openCaseLists.tempInelig.length].join('\n')
                copy(copyText, copyText, 'Copied!')
            })
        }();
        if (!caseResultsData) { return };
        let aclQueriesOptionsArray = ["Redet/Suspend", "Subprogram", "Edit Summary", "Job Search Hours", "Phone Numbers", "Self-Employment", "Reporter Type", "Homeless", "Residence", "Find Case Note"]
        let aclQueries = "<select class='form-control' style='width: fit-content;' id='aclQuerySelect'>" + aclQueriesOptionsHTML() + "</select>"
        let afterResults = '<div id="afterResults" style="display: inline-flex; gap: 5px;"> ' + aclQueries + ' <button type="button" id="getAclData" disabled="disabled" class="cButton" type="button">Get Selected Data</button><button type="button" id="exportLoadedData" class="cButton" type="button" disabled="disabled">Copy Excel Data</button></div>'
        caseResultsData.insertAdjacentHTML('afterend', afterResults)
        const getAclData = document.getElementById('getAclData'), aclQuerySelect = document.getElementById('aclQuerySelect')
        function aclQueriesOptionsHTML() {
            let aclQueriesOptions = "<option value></option>"
            for (let i = 0; i < aclQueriesOptionsArray.length; i++) {
                aclQueriesOptions += '<option value="' + aclQueriesOptionsArray[i] + '" id="' + aclQueriesOptionsArray[i] + '">' + aclQueriesOptionsArray[i] + '</option>'
            }
            return aclQueriesOptions
        }
        const caseListArray = await listPageLinksAndList(), testArray = ["1841151"], caseListArraySliceX = (x) => caseListArray.slice(0, x), caseListArraySliceXY = (x, y) => caseListArray.slice(x, y)
        let outputDataObj = {}

        function addSpan({ tr, child, extraClasses="", baseClasses="ACLaddedSpan float-right-imp tableAmend", attribObj={}, dataObj }) {
            if (!attribObj.textContent) { return };
            let addedSpan = tr.children[child].appendChild(createNewEle('span', Object.assign(attribObj, { classList: [baseClasses, extraClasses].filter(e=>e).join(' ') }), dataObj ))
            // dataSet.length && (addedSpan.dataset[dataSet[0]] = dataSet[1])
        }
        function addDivSpan({ tr, child, baseClasses="ACLaddedSpan float-right-imp tableAmend", extraClasses="", spansArray }) {
            if (!spansArray) { return };
            let addedDiv = tr.children[child].appendChild(createNewEle('div', { classList: [baseClasses, extraClasses].filter(e=>e).join(' ') } ))
            tr.children[child].insertAdjacentHTML('beforeend', '<div class="' + ([ baseClasses, extraClasses ].filter(e=>e).join(' ')) + '">'
                                                  + ( Array.isArray(spansArray[0])
                                                  ? spansArray.map(spanArr => '<span' + (spanArr[1] ?? "") + '>' + spanArr[0] + '</span>').join("") // array of arrays;
                                                  : spansArray.map(spanText => '<span>' + spanText + '</span>').join("") ) // array of text;
                                                  + '</div>')
            // createNewEle('span', { title: spanArr[1], textContent: spanArr[0] })
            // createNewEle('span', { textContent: spanText })
        }
        function removeSpans() {
            [...document.querySelectorAll('.ACLaddedSpan')].forEach(ele => ele.remove())
        }
        async function checkEditSummary() {
            const errorMap = new Map([ // 🅐 🅑 🅒 🅓 🅔 🅕 🅖 🅗 🅘 🅙 🅚 🅛 🅜 🅝 🅞 🅟 🅠 🅡 🅢 🅣 🅤 🅥 🅦 🅧 🅨 🅩 // 🅰 🅱 🅲 🅳 🅴 🅵 🅶 🅷 🅸 🅹 🅺 🅻 🅼 🅽 🅾 🅿 🆀 🆁 🆂 🆃 🆄 🆅 🆆 🆇 🆈 🆉 // 🄌 ➊ ➋ ➌ ➍ ➎ ➏ ➐ ➑ ➒ ➓
                ["Subsidized Housing is missing. This information is needed for federal reporting.", { uniLetter: "➑", errTitle: ' title="Subsidized Housing."' } ],
                ["Head Start Participation is missing.", { uniLetter: "🅗", errTitle: ' title="Head Start participation missing."' } ],
                ["Alien ID Number is missing. It is required when an Immigration page has been entered.", { uniLetter: "🅘", errTitle: ' title="Alien ID # missing."' } ],
                ["Race is missing.", { uniLetter: "🅡", errTitle: ' title="Race is missing."' } ],
                ["Heritage Hispanic/Latino is missing.", { uniLetter: "🅛", errTitle: ' title="Latino/Hispanic heritage missing."' } ],
                ["An Employment Activity page exists but person has no Earned Income page.", { uniLetter: "🅔", errTitle: ' title="Employment activity, no earned income."' } ],
                ["An Earned Income page exists but this person does not have an Employment Activity page.", { uniLetter: "🅔", errTitle: ' title="Earned income, no employment activity."' } ],
                ["School page does not exist for parental adult with claimed Education Activity.", { uniLetter: "🅢", errTitle: ' title="Education activity, no school page."' } ],
                ["Kindergarten Start date has passed. Child is not listed as attending school.", { uniLetter: "🅚", errTitle: ' title="Kindergarten start date passed."' } ],
                ["Next Good Cause Review date is prior to the current biweekly period. Complete the review and update the Good Cause Review date.", { uniLetter: "🅖", errTitle: ' title="Good Cause review due."' } ],
                ["Forms Completed is missing.", { uniLetter: "🅲", errTitle: ' title="CSE: Forms Completed is missing."' } ],
                ["Each child must be listed on a total combination of two Child Support Enforcement and/or Parent pages.", { uniLetter: "🅿", errTitle: ' title="Parent or CSE needed for child."' } ],
                ["Funding Availability page is missing.", { uniLetter: "🅵", errTitle: ' title="Funding Availability page is missing."' } ],
                ["County of residence has changed. The Financially Responsible Agency will be incorrect unless a Transfer page is completed.", { uniLetter: "🆃", errTitle: ' title="Residence county changed - needs transfer."' } ],
                ["Total Hours of Care Authorized on the Child's Provider page exceeds the 120 hour limit in a biweekly period.", { uniLetter: "🅐", errTitle: ' title="Authorized hours > 120."' } ],
            ])
            h4objects.maxiscase.h4.parentElement.style.position = "relative"
            h4objects.maxiscase.siblings[0].insertAdjacentHTML(
                'beforeend', ''
                  + '<div style="position: absolute; top: 0; left: 45cqw; width: 54cqw; line-height: 20px;">'
                  + '<div style="display: grid; grid-template-columns: 5fr 6fr 10fr;">'
                      + '<div style="padding-left: 2cqw;">🅧: Warning</div><div>Edit Summary Key</div><div>🆇: Inhibiting</div>'
                  + '</div>'
                  + '<div style="display: grid; grid-template-columns: 1fr 1fr;">'
                      + '<div>🅔 Employment/Income, missing other</div><div>🅲 CSE Forms Completed missing</div>'
                      + '<div>🅢 Education activity, no school page</div><div>🅿 Parent or CSE needed for child</div>'
                      + '<div>➑ Subsidized Housing</div><div>🆃 Transfer needed - moved</div>'
                      + '<div>🅡/🅛 Race/Heritage</div><div>🅵 Funding Availability missing</div>'
                      + '<div>🅐 Authorized Hours > 120</div><div></div>'
                      + '<div>🅚/🅗 Kindergarten/Head Start</div><div></div>'
                  + '</div>')
            forAwaitMultiCaseEval(caseListArray, "CaseEditSummary.htm").then(result => {
                for (let caseNum in result) {
                    let currCase = result[caseNum][0]
                    if (!currCase) { continue };
                    let allErrors = currCase.map(error => {
                        const foundError = errorMap.get(error.editDescription) ?? { uniLetter: "🅤", errTitle: ' title="' + (error.editDescription.length > 60 ? error.editDescription.slice(0, 60) + '&#8230;' : error.editDescription ) + '"' }
                        return [ foundError.uniLetter, foundError.errTitle ]
                    })
                    const uniqueErrors = reduceArrToUniques(allErrors)
                    addDivSpan({ tr: document.getElementById(caseNum), child: 3, baseClasses: "absPos ACLaddedSpan tableAmend", spansArray: uniqueErrors })
                }
            })
        }
        async function checkResidence() {
            forAwaitMultiCaseEval(caseListArray, "CaseAddress.htm").then(result => {
                for (let caseNum in result) {
                    let currCase = result[caseNum][0][0]
                    let residenceCity = nameFuncs.toTitleCase(currCase.residenceCity)
                    let mailingCity = currCase.mailingCity?.length ? " / " + nameFuncs.toTitleCase(currCase.mailingCity) : ''
                    addSpan({ tr: document.getElementById(caseNum), child: 3, attribObj: { textContent: '(' + residenceCity + mailingCity + ')' } })
                    // addSpan({ tr: document.getElementById(caseNum), child: 3, spanTextContent: '(' + residenceCity + mailingCity + ')' })
                }
            })
        }
        async function checkPhoneNumbers() {
            forAwaitMultiCaseEval(caseListArray, "CaseAddress.htm").then(result => {
                for (let caseNum in result) {
                    let currCase = result[caseNum][0][0]
                    let phones = [ currCase.phone1, currCase.phone2, currCase.phone3 ].filter(e => e)
                    addDivSpan({ tr: document.getElementById(caseNum), child: 3, spansArray: phones, extraClasses: 'separate' })
                }
            })
        }
        async function checkReportingType() {
            // const caseListArrayActive = Array.from([...document.querySelectorAll('#activeCaseTable > tbody > tr')].filter(ele => ele.children[2].innerText === "Active"), caseNumber => caseNumber.id)
            const activeCaseList = openCaseLists.active.map(ele => ele.id)
            forAwaitMultiCaseEval(activeCaseList, "CaseChildProvider.htm").then(result => {
                for (let caseNum in result) {
                    if (!Object.keys(result[caseNum]).length) { continue };
                    reporterTypeLoop:
                    for (let row in result[caseNum][0]) {
                        if (result[caseNum][0][row].reporterType === "Schedule Reporter") {
                            let addedText = "Sched"
                            if (result[caseNum][0][row].reporterTypeSelectionArray.includes('LNL Provider Used')) { addedText += ", LNL" }
                            else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Employee - DHS Licensed Child Care Cntr')) { addedText += ", Emp" }
                            else if (result[caseNum][0][row].reporterTypeSelectionArray.includes('Multiple Providers Per Child')) { addedText += ", 2+" }
                            addSpan({ tr: document.getElementById(caseNum), child: 3, attribObj: { textContent: addedText, style: "font-stretch: condensed;" } })
                            // addSpan({ tr: document.getElementById(caseNum), child: 3, spanTextContent: addedText, style: "font-stretch: condensed;" })
                            break reporterTypeLoop
                        }
                    }
                }
            })
        }
        async function checkSupportActivityJS() {
            forAwaitMultiCaseEval(caseListArray, "CaseSupportActivity.htm").then(result => { //result[caseNum].0.0.originalHoursPerWeek //object.table.row.data
                for (let caseNum in result) {
                    if (!Object.keys(result[caseNum]).length) { continue };
                    const jobSearchFilter = result[caseNum][0].filter(item => item.memberDesc === "Job Search")
                    if (!jobSearchFilter.length) { continue };
                    const tr = document.getElementById(caseNum)
                    const jobSearchMap = jobSearchFilter.map(item => "M" + item.memberReferenceNumber + ": " + item.originalHoursPerWeek).join("\n")
                    let jobSearchStyle = jobSearchFilter.filter(item => ( item.originalHoursPerWeek === "1" && tr.children[2].textContent.indexOf('Active') > -1).length ) ? "font-weight: bold; color: var(--textColorNegative);" : ""
                    // let jobSearchStyle = jobSearchFilter.filter(item => item.originalHoursPerWeek === "1" && document.getElementById(caseNum).children[2].textContent.indexOf('Active') > -1).length ? "font-stretch: condensed; font-weight: bold; color: var(--textColorNegative);" : "font-stretch: condensed;"
                    // addSpan({ tr: document.getElementById(caseNum), child: 3, spanTextContent: "JS: " + jobSearchMap, style: jobSearchStyle })
                    addSpan({ tr, child: 3, attribObj: { textContent: "JS: " + jobSearchMap, style: jobSearchStyle } })
                }
            })
        }
        async function checkSelfEmployment() {
            forAwaitMultiCaseEval(caseListArray, "CaseEmploymentActivity.htm").then(result => { //result[caseNum][0][0].employmentActivityDescription //objectGroup[object][table][row].data
                for (let caseNum in result) {
                    if (!Object.keys(result[caseNum]).length) { continue };
                    selfEmployLoop:
                    for (let row in result[caseNum][0]) {
                        let selfEmployActivity = result[caseNum][0][row].employmentActivityDescription
                        if (selfEmployActivity === "Self-employment") {
                            addSpan({ tr: document.getElementById(caseNum), child: 3, attribObj: { textContent: "Self-employed" } })
                            // addSpan({ tr: document.getElementById(caseNum), child: 3, spanTextContent: "Self-employed" })
                            break selfEmployLoop
                        }
                    }
                }
            })
        }
        async function checkSubprogram() {
            forAwaitMultiCaseEval(caseListArray, "CaseOverview.htm").then(result => {
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
                            if ( ((subprogram === "CCMF" && mfipStatus !== "Active") || (mfipStatus === "Active" && subprogram !== "CCMF")) && inRange(mfipDateDiff, 31, 359)) {
                                addSpan({ tr: document.getElementById(caseNum), child: 3, attribObj: { textContent: tRowTd.textContent + " (MFIP: " + mfipStatus + " - " + mfipDate + ")" } })
                                // addSpan({ tr: document.getElementById(caseNum), child: 3, spanTextContent: tRowTd.textContent + " (MFIP: " + mfipStatus + " - " + mfipDate + ")" })
                            }
                        }
                    }
                }
            })
        }
        async function findCaseNote() {
            const findNotesByWorker = prompt("What is the user ID?").toUpperCase()
            if (!findNotesByWorker || !(/[A-Z0-9]{7}/).test(findNotesByWorker)) { return };
            forAwaitMultiCaseEval(caseListArray, "CaseNotes.htm").then(result => {
                const filteredResult = {}
                for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] }
                for (let caseNum in filteredResult) {
                    let foundNoteDate = filteredResult[caseNum].find(note => note.noteCreator === findNotesByWorker)?.noteCreateDate
                    if (!foundNoteDate) { continue };
                    addSpan({ tr: document.getElementById(caseNum), child: 3, attribObj: { textContent: foundNoteDate } })
                }
            })
        }
        async function redetDateVsSuspendDate() {
            let today = Date.now()
            aclTbody.addEventListener('click', clickEvent => { if ( clickEvent.target.classList.contains("cSpan") ) { redetTbodyEvent(clickEvent.target) } })
            const suspendedCaseListArray = openCaseLists.suspended.map(ele => {
                let redetDateNumber = sanitize.date(ele.children[4].textContent, "number"), dateDiff = (redetDateNumber - today) / dateFuncs.dayInMs
                if (redetDateNumber <= today) { addSpan({ tr: ele, child: 3, attribObj: { textContent: "Closing" } }) }
                else if (dateDiff < 46) { addSpan({ tr: ele, child: 3, attribObj: { textContent: "Mailed" } }) }
                else if (dateDiff > 180) { addSpan({ tr: ele, child: 3, attribObj: { textContent: "6+ months out" } }) }
                else { return ele.id }
            }).filter(ele => ele)
            forAwaitMultiCaseEval(suspendedCaseListArray, "CaseOverview.htm").then(result => {
                for (let caseNum in result) {
                    let tRow = document.getElementById(caseNum), tdRedetDate = tRow.children[4], redetDateNumber = sanitize.date(tdRedetDate.textContent, "number")
                    let caseStatus = result[caseNum][0][0]?.programStatusHistory
                    let suspendDate = (function() {
                        if (caseStatus === "Inactive") { addSpan({ tr: tRow, child: 3, attribObj: { textContent: "Closing" } }); return undefined }
                        if (caseStatus === "Temporarily Ineligible") { addSpan({ tr: tRow, child: 3, attribObj: { textContent: "Temporarily Ineligible" } }); return undefined }
                        else if (caseStatus === "Suspend") { return result[caseNum][0][0].programBeginDateHistory }
                        else { return undefined }
                    }());
                    if (!suspendDate) { if (!tRow.children[3].children.length) { addSpan({ tr: tRow, child: 3, attribObj: { textContent: "Status Issue" } }) }; continue }
                    let suspendDateNumber = sanitize.date(suspendDate, "number"), suspendDatePlus = dateFuncs.formatDate( dateFuncs.addDays( suspendDateNumber, 416), "mmddyyyy" )
                    let suspendToRedetDiff = Math.floor( (redetDateNumber - suspendDateNumber) / dateFuncs.dayInMs )
                    if (suspendToRedetDiff < 335) { addSpan({ tr: tRow, child: 3, attribObj: { textContent: "Est. suspend < 365 days" } }); continue }
                    if (suspendToRedetDiff > 415) { addSpan({ tr: tRow, child: 3, attribObj: { textContent: "Closes before Redet" } }); continue }
                    if (inRange(suspendToRedetDiff, 335, 415)) {
                        addSpan({ tr: tRow, child: 3, extraClasses: 'cSpan', attribObj: { textContent: "est. suspend " + suspendToRedetDiff + " days", title: 'Set new Redet date to ' + suspendDatePlus, }, dataObj: { delayDate: suspendDatePlus } })
                    }
                }
            })
            async function redetTbodyEvent(eventSpan) {
                gbl.eles.footerLinks.insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="height: 400px;"><iframe id="redetiframe" name="redetiframe" style="width: 100%; height: 100%;"></iframe></div>')
                let redetiframe = document.getElementById('redetiframe'), iframeContainer = document.getElementById('iframeContainer')
                let eventcaseIdVal = eventSpan.closest('tr').id, delayDateObj = JSON.stringify({ id: eventcaseIdVal, delayDate: eventSpan.dataset.delayDate })
                sessionStorage.setItem('MECH2.suspendPlus45', delayDateObj)
                delayRedetDate(eventSpan, eventcaseIdVal, redetiframe).then(eventSpan => {
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
        async function checkHomeless() {
            forAwaitMultiCaseEval(caseListArray, "CaseOverview.htm").then(result => {
                const filteredResult = {}
                for (let caseNum in result) { filteredResult[caseNum] = result[caseNum][0] }
                const homelessResults = { No: [], Yes: [] }
                for (let caseNum in filteredResult) {
                    let singleResult = doHomelessCheck(filteredResult[caseNum], caseNum);
                    if ( singleResult.length === 1 ) { [homelessResults.No.push(singleResult)] }
                    else { homelessResults.Yes.push(singleResult) }
                }
                for (let category in homelessResults) { homelessResults[category].push(["Total: " + homelessResults[category].length]) }
                storeData(homelessResults)
            })
            function doHomelessCheck(evalObjSingleCase, caseNum) {
                const evalObjSingleCaseLength = evalObjSingleCase.length
                evalObjSingleCase.forEach( (status, i) => {
                    if (status.programHomelessIndicator === "Yes") {
                        return i > 0 ? [ caseNum, "Current Status: " + evalObjSingleCase[0].programStatusHistory, "Effective: " + evalObjSingleCase[i - 1].programBeginDateHistory ] : [ caseNum, "Current" ]
                    }
                })
                return [caseNum]
            }
        }
        getAclData.addEventListener('click', async () => {
            removeSpans()
            getAclData.disabled = true
            switch (aclQuerySelect.value) {
                case "Homeless": { await checkHomeless(); break; }
                case "Redet/Suspend": { await redetDateVsSuspendDate(); break; }
                case "Subprogram": { await checkSubprogram(); break; }
                case "Edit Summary": { await checkEditSummary(); break; }
                case "Residence": { await checkResidence(); break; }
                case "Job Search Hours": { await checkSupportActivityJS(); break; }
                case "Self-Employment": { await checkSelfEmployment(); break; }
                case "Reporter Type": { await checkReportingType(); break; }
                case "Phone Numbers": { await checkPhoneNumbers(); break; }
                case "Find Case Note": { await findCaseNote(); break; }
                    // case "ThingToLookUp": { await functionIjustMadeUp(); break; }
            }
            getAclData.disabled = false
        })
        function storeData(storeDataResults) {
            outputDataObj[activeCaseSearchWorkerId] ??= {}
            outputDataObj[activeCaseSearchWorkerId][aclQuerySelect.value] = storeDataResults
            sessionStorage.setItem("aclQueryOutput." + activeCaseSearchWorkerId, JSON.stringify(outputDataObj[activeCaseSearchWorkerId]))
            document.getElementById('exportLoadedData').disabled = false
        }
        function excelifyData(evalDataToExcelify) {
            let excelData = JSON.stringify(evalDataToExcelify)
            let excelifiedData = excelData
            .replace(/\{|\]\],/g, "\n\t")
            .replace(/\[\[|\]\,\[/g, "\n\t\t")
            .replace(/\"|\}|\[\]|\]\]/g, '')
            .replace(/,/g, "\t")
            return excelifiedData
        }
        aclQuerySelect.addEventListener('change', changeEvent => {
            getAclData.disabled = !changeEvent.target.value
            outputDataObj[activeCaseSearchWorkerId] = sanitize.json( sessionStorage.getItem("aclQueryOutput." + activeCaseSearchWorkerId) ) ?? {}
            document.getElementById('exportLoadedData').disabled = !(changeEvent.target.value in outputDataObj[activeCaseSearchWorkerId])
        })
        document.getElementById('exportLoadedData').addEventListener('click', () => { copy(aclQuerySelect.value + ' query for ' + activeCaseSearchWorkerId + ":" + excelifyData(outputDataObj[activeCaseSearchWorkerId][aclQuerySelect.value]), "Excel Data", "notitle") })
    }(); // SECTION_END Active_Case_List;
    !function __InactiveCaseList() {
        if (!("InactiveCaseList.htm").includes(thisPageNameHtm) || !tableHasData('#inActiveCaseTable')) { return };
        document.querySelector('.dataTables_scrollHeadInner thead tr td:nth-child(6)').innerText = "MAXIS"
        !function shortenProgram() { [...document.querySelectorAll('tbody tr td:nth-child(3)')].forEach(td => { td.textContent = subprogramMap.get(td.textContent) }) }();
        listPageLinksAndList()
        let closedCaseLS = countyInfo.info?.closedCaseBank ?? ''
        closedCaseLS.toLowerCase() === "${closedcasebank}" ? '' : closedCaseLS
        let closedCaseBank = (/[a-z0-9]{7}/i).test(closedCaseLS) ? closedCaseLS : ''
        let closedCaseBankLastThree = (closedCaseBank) ? closedCaseBank.slice(4) : ''
        let todayDate = Date.now(), fortySixDays = 3974400000
        let changedToLinks, iframeContainer, transferiframe
        document.querySelectorAll('#inActiveCaseTable > tbody > tr > td:nth-of-type(4)').forEach(thisTd => {
            let closedDatePlus46 = sanitize.date(thisTd.textContent, "number") + fortySixDays
            if (closedDatePlus46 < todayDate) {
                let thisTr = thisTd.closest('tr')
                let xferSingleButton = closedCaseBank ? '<span class="cSpan">→ ' + closedCaseBankLastThree + '</span>' : ''
                thisTd.outerHTML = '<td><a href="CaseTransfer.htm?parm2=' + thisTr.firstElementChild.textContent + '", target="_blank">' + thisTd.textContent + '</a>' + xferSingleButton + '</td>'
                thisTr.classList.add('oldClosed')
            };
        });
        document.querySelector('label[for=inActiveCaseSearchWorkerId]').parentElement
            .appendChild(createNewEle( 'div', { style: 'vertical-align: middle;', classList: 'float-right-imp', }))
            .appendChild(createNewEle( 'button', { type: 'button', classList: 'cButton', tabIndex: '-1', id: 'closedTransferAll', textContent: 'Transfer closed >45 days to:' }))
            .insertAdjacentElement( 'afterend', createNewEle( 'input', { type: 'text', classList: 'form-control', style: 'display: inline-block; margin-left: 10px; width: var(--8numbers)', id: 'transferWorker', placeholder: "Worker #", value: closedCaseBank }) )
        function addTableButtons() {
            removeTableButtons()
            if (!(/[a-z0-9]{7}/i).test(closedCaseBank)) { return };
            let closedCaseSpan = createNewEle('span', { classList: 'cSpan', textContent: '→ ' + closedCaseBankLastThree })
            document.querySelectorAll('tr.oldClosed > td:nth-child(4)').forEach(ele => ele.insertAdjacentElement('beforeend', closedCaseSpan))
        }
        function removeTableButtons() { document.querySelectorAll('span.cSpan').forEach( cSpanEle => cSpanEle.remove() ) }
        let transferWorker = document.getElementById('transferWorker')
        transferWorker?.addEventListener('blur', blurEvent => checkClosedCaseBank(blurEvent.target.value.toUpperCase()))
        function checkClosedCaseBank(eventValue) {
            if ((/[a-z0-9]{7}/i).test(eventValue)) {
                if (eventValue === closedCaseBank) { return };
                countyInfo.updateInfo('closedCaseBank', eventValue)
                closedCaseBank = eventValue
                closedCaseBankLastThree = closedCaseBank.slice(4)
                addTableButtons()
            } else {
                closedCaseBank = ''
                closedCaseBankLastThree = ''
                countyInfo.updateInfo('closedCaseBank', "delete")
                transferWorker.value = ''
                removeTableButtons()
                flashRedOutline(transferWorker)
            }
        }
        document.getElementById('inActiveCaseTable').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName === "SPAN") {
                let closestSpanASibling = clickEvent.target.previousElementSibling
                if (checkForClosedCaseBank() && closestSpanASibling?.nodeName === 'A') {
                    transferSingleClosed(clickEvent.target.closest('tr').id)
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
                gbl.eles.footerLinks.insertAdjacentHTML('beforebegin', '<div id="iframeContainer" style="visibility: hidden;"><iframe id="transferiframe" name="transferiframe" style="width: 100%; height: 100%;"></iframe></div>')
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
                    } else if (messageEvent.data[0] === "transferStatus" && messageEvent.data[1] === "Success") {
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
    localStorage.removeItem("MECH2.note")
    let deleteButton = document.getElementById('delete'), createButton = document.getElementById('new'), deleteAllActive = 0
    let inputEffectiveDate = document.getElementById('inputEffectiveDate')
    let caseOrProviderAlertsTableTbody = document.querySelector('#caseOrProviderAlertsTable > tbody')
    let caseOrProviderType = document.getElementById('caseOrProviderType'), caseOrProviderAlertTotal = document.getElementById('caseOrProviderAlertTotal')
    let alertTotal = document.getElementById('alertTotal'), alertTable = document.querySelector('#alertTable > tbody'), alertGroupId = document.getElementById("groupId"), alertMessage = document.getElementById("message"),
        alertRowIndx = document.getElementById('rowIndex'), inputWorkerId = document.getElementById('inputWorkerId'), workerName = document.getElementById('workerName')
    function findSelected() { return [...alertTable.children].find(ele => ele.classList.contains('selected')) ?? undefined }
    let selectedCaseOrProvider = {}, foundAlert = {} // gets set with click event
    addDateControls("month", "#inputEffectiveDate")
    !async function storeWorkerInfo() {
        if (document.referrer !== "https://mec2.childcare.dhs.state.mn.us/ChildCare/Welcome.htm") { return };
        await intervalCheckForValue({ element: '#workerName', interval: 400, iterations: 3 }).then(workerNameValue => {
            countyInfo.updateInfo('userIdNumber', document.getElementById('inputWorkerId')?.value);
            countyInfo.updateInfo( 'userName', nameFuncs.LastFirstToFirstL(workerNameValue) )
        })
        countyInfo.updateInfo('userAccessDenied', [...document.querySelectorAll('div#page-wrap > ul.dropdown ul.sub_menu:not(#toolsList) li[style="pointer-events: none; background: lightgray;"]')].map(e => e.id))
    }();
    const alertsByCategories = {
        // textIncludes: regex search to match alert; // noteCategory: Notes page category; // noteSummary: Note page summary. Regex to replace text; %# to auto-replace text with summaryFetchedData; omit to use first 50 characters of noteMessage;
        // summaryFetchData: Data fetched from another page using evalData(); // noteMsgFunc: if not blank, sends through switch. if noteMsgFetchData exists, fetches (eval)Data first; request format: ["pageNameWithoutHtm:key.key", ["prop1", "prop2"]]
        // createAlert (not implemented yet, might get moved to __Notes.htm): if true, will open WorkerCreateAlert and auto-fill;
        childsupport: {
            ncpAddress: { textIncludes: /Absent Parent of Child Ref #\d{1,2} has an address/, noteCategory: "Child Support/NCP Info", noteSummary: [/(?:[A-Za-z\- ]+)(\#\d{1,2})(?:[a-z\- ]+)(.+?\d{5})(?:\d{0,4})\./, "ABPS of $1 address: $2"], noteMsgFetchData: [ ["CaseAddress.htm:0.0", ["residenceFullAddress"]], ], noteMsgFunc: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseAddress"], },
            ncpInHH: { textIncludes: /Absent Parent of Child Ref #\d{1,2} is living with/, noteCategory: "Child Support/NCP Info", noteSummary: [/(\#\d{1,2})/, "ABPS of child ref #$1 is living in HH"], omniPageButtons: ["autonoteButton", "CaseMember"], },
            cpAddress: { textIncludes: /Parentally Responsible Individual Ref #\d{1,2} add/, noteCategory: "Household Change", noteSummary: [/(?:[A-Za-z- ]+)(?:\#\d{1,2})(?:[a-z- +]+)(.+)(\d{5})(?:\d{0,4})/i, "HH address per PRISM: $1$2"], omniPageButtons: ["CaseAddress"], },
            csInterface: { textIncludes: /Complete Child Support Interface win/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["CaseCSIA"], },
            csCSES: { textIncludes: /CSES\: Parentage|CSES\: Residence Address|CSES\: Birthdate|CSES\: Employer\'s name for Absent Parent|CSES\: Child support amount|CSES\: Support payment frequency|Absent Parent of Child Ref #\d{1,2} has an SSN change to/, noteSummary: "CSES Messages", noteCategory: "Child Support/NCP Info", noteMsgFunc: "doFunctionOnNotes", omniPageButtons: ["delete"], },
            csDeleteFocus: { textIncludes: /Absent Parent of Child Ref #\d{1,2} has a new empl|Amount of child support|Child support payment|Disbursed child care support|Paternity for Child Ref/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["delete"], },
            nonCoopCS: { textIncludes: /Parentally Responsible Individual Ref (#\d{1,2}) is not cooperating/, noteCategory: "Child Support/NCP Info", noteSummary: [/(?:[a-z- ]+)(\#\d{1,2})/i, "PRI$1"], omniPageButtons: ["CaseCSE"], },
            coopCS: { textIncludes: /Parentally Responsible Individual Ref (#\d{1,2}) is cooperating/, noteCategory: "Child Support/NCP Info", noteSummary: [/(?:[a-z- ]+)(\#\d{1,2})/i, "PRI$1"], omniPageButtons: ["CaseCSE"], },
            csCpNewEmployer: { textIncludes: /Child support reported new employer for Parentally Responsible Individual/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["CaseEmploymentActivity"], },
            cpNameChange: { textIncludes: /Parentally Responsible Individual Ref #\d{1,2} reported a name change/, noteCategory: "Child Support/NCP Info", noteSummary: [/(?:[a-z- ]+)(\#\d{1,2})/i, "PRI$1"], intendedPerson: true, omniPageButtons: ["CaseMember"], },
            csRecordsDiffer: { textIncludes: /differs with child support records/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["CaseMember", "CaseAddress"], },
            ncpNameChange: { textIncludes: /Absent Parent of Child Ref #\d{1,2} has a name change/, noteCategory: "Child Support/NCP Info", noteSummary: [/(?:[a-z-\# ]+)(\d{1,2})(?: has a name change to )([a-z\'\-\,\. ]+)(?:\.)/i, "ABPS of M$1 name change: $2"], omniPageButtons: ["CaseCSE"], },
            employerAddress: { textIncludes: /Complete Employer Address/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["CaseEarnedIncome"], },
        },
        eligibility: {
            unapprovedElig: { textIncludes: /Unapproved results have/, noteCategory: "Eligibility", omniPageButtons: ["CaseEligibilityResultSelection"], },
            eligWarningInhib: { textIncludes: /Warning messages exist|Eligibility Results have/, noteCategory: "Eligibility", omniPageButtons: ["CaseEditSummary"], },
            unpaidCopay: { textIncludes: /Failure to pay copayment/, noteCategory: "Eligibility", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4}) - (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Unpaid copay for period $1 - $2"], omniPageButtons: ["FinancialBillingApproval"], noteMsgFunc: "doFunctionOnNotes", },
            noProgramSwitch: { textIncludes: /The program switch is not/, noteCategory: "Eligibility", omniPageButtons: ["CaseOverview", "CaseEditSummary", "CaseSupportActivity"], },
        },
        information: {
            mailed: { textIncludes: /Redetermination form has been mailed/, noteCategory: "Redetermination - Other", noteSummary: 'doFunction', omniPageButtons: ["autonoteButton"], },
            noRedet: { textIncludes: /Redetermination has not been received/, noteCategory: "Redetermination - Other", noteSummary: "Closing %0: Redet not complete/received", summaryFetchData: ["CaseOverview.htm:0.0.programBeginDateHistory"], omniPageButtons: ["autonoteButton"], },
            autoDenied: { textIncludes: /This case has been auto-denied/, noteCategory: "Application - Other", noteSummary: "This case has been auto-denied", omniPageButtons: ["autonoteButton"], },
            terminatedSA: { textIncludes: /The system auto approved a terminated Service/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton"], },
            homelessApp: { textIncludes: /^Homeless/, noteCategory: "Application - Other", omniPageButtons: ["autonoteButton"], },
            autoApprovedSA: { textIncludes: /The system auto approved a Service Auth/, noteSummary: "SA for age category change was auto-approved", noteCategory: "Provider Change", omniPageButtons: ["autonoteButton"], },
            dualAccess: { textIncludes: /Dual access has been initiated/, noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
            closeSusp: { textIncludes: /allowed period of suspension expires/, noteCategory: "Eligibility", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Auto-closing: 1yr suspension expires on $1"], omniPageButtons: ["autonoteButton"], },
            closeTI: { textIncludes: /allowed period of temporary ineligibility expires/, noteCategory: "Eligibility", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Auto-closing: TI period expires on $1"], omniPageButtons: ["autonoteButton"], },
            caseTransferring: { textIncludes: /This case is transferring to your Servicing/, noteCategory: "Other", omniPageButtons: ["CaseAddress", "ServicingAgencyIncomingTransfers"], },
            xferStatusChanged: { textIncludes: /The transfer status has been changed/, noteCategory: "Other", omniPageButtons: ["delete"], },
            newJobSearchWindow: { textIncludes: /A new Job Search Tracking window/, noteCategory: "Other", omniPageButtons: ["CasePageSummary"], },
            servicingEnd: { textIncludes: /The Servicing Ends date/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Servicing Ends date changed to $1"], omniPageButtons: ["autonoteButton"], },
        },
        masschange: {
            autoCopayApproval: { textIncludes: /Case was auto-approved with a copay decrease/, noteSummary: [/[A-Z0-9\,\.\- ]+ (\$\d+) [A-Z0-9\,\.\- ]+/i, "Elig with copay decrease of $1+ auto-approved"], noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
        },
        maxis: {
            gcReviewDate: { textIncludes: /Good Cause (?:Claim|Review) date/i, noteCategory: "Child Support/NCP Info", intendedPerson: true, noteSummary: [/(?:[a-z0-9 ]+)(\d{1,2}\/\d{1,2}\/\d{2,4}) to (Blank|\d{1,2}\/\d{1,2}\/\d{2,4})(?:[a-z0-9 ]+.)/i, "Good Cause review date: $1 to $2"], omniPageButtons: ["autonoteButton", "CaseCSE"], noteMsgFunc: "doFunctionOnNotes", },
            genGoodCauseChanged: { textIncludes: /Good Cause/, noteCategory: "Child Support/NCP Info", intendedPerson: true, noteSummary: [/([a-z ]+)(?: for [a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseCSE"], noteMsgFunc: "doFunctionOnNotes", },
            abpsChange: { textIncludes: /for Absent Parent/, noteCategory: "Child Support/NCP Info", noteSummary: [/([a-z ]+)(?: for Absent Parent [a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseCSE"], },
            schoolChanged: { textIncludes: /SCHL Panel|Ver has been changed on the School|Kindergarten|School Type|School Status|Last Grade Completed/, noteCategory: "Other", omniPageButtons: ["delete", "CaseSchool", "CaseEducationActivity"], },
            childRef: { textIncludes: /for Child Ref/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+)(?: for Child Ref # \d\d has[a-z0-9 ]+ from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "$1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseMember"], },
            changeReported: { textIncludes: /reported to MAXIS/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+ has been reported to MAXIS)(?:.*)/i, "$1"], omniPageButtons: ["autonoteButton", "CaseMember", "CaseUnearnedIncome"], },
            csCoop: { textIncludes: /from Not Cooperating to Cooperating/, noteCategory: "Child Support/NCP Info", intendedPerson: true, noteSummary: "MAXIS: CP is cooperating with CS", omniPageButtons: ["autonoteButton", "CaseCSE"], },
            csNonCoop: { textIncludes: /from Cooperating to Not Cooperating/, noteCategory: "Child Support/NCP Info", intendedPerson: true, noteSummary: "MAXIS: CP is not cooperating with CS", omniPageButtons: ["autonoteButton", "CaseCSE"], },
            marriage: { textIncludes: /Marriage Date|Marital status|Designated Spouse/, noteCategory: "Household Change", noteSummary: "Marriage alerts from MAXIS worker", noteMsgFunc: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseMemberII"], },
            memberLeft: { textIncludes: /Member Left date/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/(?:[A-Za-z ]*)(?:X[A-Z0-9]{6})(?:[A-Za-z ]*) (\d{1,2}\/\d{1,2}\/\d{2,4})./, "REMO: personName left $1"], omniPageButtons: ["CaseRemoveMember", "CaseMember", "CaseCSE"], },
            memberJoined: { textIncludes: /Member window for Reference Number/, noteCategory: "Household Change", intendedPerson: true, noteSummary: 'doFunction', omniPageButtons: ["CaseNotes", "CaseMember"], },
            childRemoved: { textIncludes: /Child\'s Reference Number has been removed|Parent window has been added/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseRemoveMember", "CaseParent"], },
            childCseRemoved: { textIncludes: /Child Ref Nbr \d{1,2} has been removed/, noteCategory: "Household Change", omniPageButtons: ["CaseCSE", "CaseRemoveMember"], },
            dateOfDeath: { textIncludes: /Date of Death/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseRemoveMember", "CaseMember"], },
            schoolPanelAdded: { textIncludes: /SCHL Panel|School Type/, noteCategory: "Other", omniPageButtons: ["CaseNotes", "CaseSchool", "CaseEducationActivity"], },
            livingSituation: { textIncludes: /Living Situation has been/, noteCategory: "Other", omniPageButtons: ["delete"], },
            disabilityStart: { textIncludes: /Disability start date/, noteCategory: "Other", intendedPerson: true, omniPageButtons: ["delete", "CaseDisability"], },
            residenceAddress: { textIncludes: /Residence Address has been/, noteCategory: "Household Change", noteSummary: "Residence address changed by MAXIS worker", noteMsgFetchData: [ ["CaseAddress.htm:0.0", ["residenceFullAddress"]], ], noteMsgFunc: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseAddress"], },
            mailingAddress: { textIncludes: /Mailing Address has been/, noteCategory: "Household Change", noteSummary: "Mailing address changed by MAXIS worker", noteMsgFetchData: [ ["CaseAddress.htm:0.0", ["mailingStreet1", "mailingStreet2", "mailingCity"] ], ], noteMsgFunc: "doFunctionOnNotes", omniPageButtons: ["autonoteButton", "CaseAddress"], },
            windowAddedRemoved: { textIncludes: /window [a-z0-9 ]+ been/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/([a-z ]+ window)(?:[a-z0-9 ]+ been )([a-z ]+)(?: by.+)/i, "$1: $2"], omniPageButtons: ["autonoteButton", "CaseMember"], },
            verMultiChanged: { textIncludes: /SSN has been changed|SSN Verification has been changed|Paternity for Child Ref|Last Grade Completed/, noteCategory: "Other", omniPageButtons: ["delete"], },
            verSourceChangedCatchAll: { textIncludes: /has been changed/, noteCategory: "Household Change", intendedPerson: true, noteSummary: [/(?:[a-z0-9 ]+ on the )([a-z]+)(?: window from )([a-z\/ ]+) to ([a-z\/ ]+)(?: by.+)/i, "Maxis: $1: $2 to $3"], omniPageButtons: ["autonoteButton", "CaseMember", "CaseMemberII", "CaseAddress", ], },
            hasBeenAddedCatchAll: { textIncludes: /has been added/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseMember", "CaseMemberII", "CaseParent"], },
        },
        parisinterstate: {
            parisMatch: { textIncludes: /PARIS/, noteCategory: "Other", omniPageButtons: ["autonoteButton"], },
        },
        periodicprocessing: {
            jsHours: { textIncludes: /Job Search Hours available will run out/, noteCategory: "Activity Change", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Job search hours end $1"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseSupportActivity"], },
            supportActivity: { textIncludes: /The support activity for/, noteCategory: "Activity Change", noteSummary: [/(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})/, "Support activity ends $1"], intendedPerson: true, omniPageButtons: ["CaseSupportActivity"], },
            missingKindergarten: { textIncludes: /Member missing Kindergarten/, noteCategory: "Other", omniPageButtons: ["CaseSchool"], },
            noLongerMember: { textIncludes: /Member turned 18/, noteCategory: "Household Change", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseMember"], },
            ageCategory: { textIncludes: /Member turned/, noteCategory: "Service Authorization", intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseMember"], },
            tyExpires: { textIncludes: /The allowed time on Transition Year will expi/, noteCategory: "Eligibility", noteSummary: [/(?:[a-z ]+)(\d{1,2}\/\d{1,2}\/\d{2,4})(?:[a-z\. ]+)/i, "Approved TY to BSF elig results eff $1"], omniPageButtons: ["FundingAvailability"], },
            extendedEligExpiring: { textIncludes: /activity extended eligibility/, noteCategory: "Activity Change", noteSummary: [/The (\w+)(?:[A-Za-z- ]+) (\d{1,2}\/\d{1,2}\/\d{2,4})(?:[A-Za-z-. ]+)/, "Ext Elig ($1) ends $2. Review elig"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseEmploymentActivity", "CaseSupportActivity"], },
            homelessExpiring: { textIncludes: /The Homeless 3 month period will expire/, noteCategory: "Application Incomplete", noteSummary: [/(?:[A-Za-z0-9 ]*) (\d{1,2}\/\d{1,2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "Homeless period expires $1; case set to TI"], omniPageButtons: ["autonoteButton", "CaseAction"], },
            homelessMissing: { textIncludes: /Homeless case has one or more missing/, noteCategory: "Application Incomplete", noteSummary: "Homeless case has missing verifications", omniPageButtons: ["autonoteButton"], },
            goodCauseReview: { textIncludes: /The Next Good Cause Review/, noteCategory: "Child Support/NCP Info", omniPageButtons: ["autonoteButton", "CaseCSE"], },
            disabilityExpires: { textIncludes: /The allowed disability period/, noteCategory: "Other", noteSummary: [/(?:[A-Za-z ]*) (\d{1,2}\/\d{1,2}\/\d{2,4})(?:[A-Za-z0-9. ]*)/, "The allowed disability period will end $1"], intendedPerson: true, omniPageButtons: ["autonoteButton", "CaseDisability"], },
        },
        provider: {
            parentAwareRatingStartEnd: { textIncludes: /Parent Aware/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationApproval"], },
            accreditationStartEnd: { textIncludes: /Provider's accreditation/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationApproval"], },
            providerUnsafe: { textIncludes: /Provider has been deactivated for unsafe care./, noteCategory: "Provider Change", noteSummary: "Provider has been deactivated for unsafe care.", fetchData: ["CaseServiceAuthorizationOverview:1"], pageFilter: "Provider No Longer Eligible", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
            providerDeactivatedRenewal: { textIncludes: /Provider has been deactivated.  Renewal/, noteCategory: "Provider Change", noteSummary: "Provider deactivated. Renewal was not received.", fetchData: ["CaseServiceAuthorizationOverview:1"], pageFilter: "Provider No Longer Eligible", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
            providerRegistrationClosed: { textIncludes: /Provider's Registration Status is closed/, noteCategory: "Provider Change", noteSummary: "Provider's Registration Status is closed.", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
            providerRegistrationReactivated: { textIncludes: /Registration for Provider/, noteCategory: "Provider Change", omniPageButtons: ["autonoteButton", "CaseServiceAuthorizationOverview"], },
            providerDeactivatedRegistration: { textIncludes: /Provider has been deactivated. Registration/, noteCategory: "Registration", noteSummary: "Provider deactivated. Reg. pended 30 days.", omniPageButtons: ["autonoteButton", "ProviderRegistrationAndRenewal"], },
            providerBackgroundStudy: { textIncludes: /Provider background study is due/, noteCategory: "Background Study", omniPageButtons: ["autonoteButton", "ProviderRegistrationAndRenewal"], },
        },
        serviceauthorization: {
            unapprovedSA: { textIncludes: /Unapproved Service Authorization results/, noteCategory: "Provider Change", omniPageButtons: ["CaseServiceAuthorizationApproval", "CaseServiceAuthorizationOverview"], },
        },
        workercreated: {
            approveMFIPclosing: { textIncludes: /Approve new results/, noteCategory: "Eligibility", noteSummary: "Approved CCMF to TY switch", omniPageButtons: ["CaseCreateEligibilityResults"], },
        },
    }
    const omniPages = new Map([
        ["CaseAction", "Case Action",], ["CaseAddress", "Address"], ["CaseCreateEligibilityResults", "Create Elig"], ["CaseCSE", "CSE"], ["CaseCSIA", "CSIA"], ["CaseDisability", "Disa"], ["CaseEarnedIncome", "Earned"], ["CaseEditSummary", "Edit Summary"],
        ["CaseEducationActivity", "Education"], ["CaseEmploymentActivity", "Employment"], ["CaseMember", "Member"], ["CaseMemberII", "Member II"], ["CaseParent", "Parent"], ["CaseRemoveMember", "Remo"], ["CaseSchool", "School"], ["CaseServiceAuthorizationApproval", "SA:A"],
        ["CaseSupportActivity", "Support"], ["CaseUnearnedIncome", "Unearned"], ["FinancialBillingApproval", "Billing"], ["FundingAvailability", "Funding"], ["ServicingAgencyIncomingTransfers", "Transfer"],
    ])
    function getAlertType(caseOrProviderTypeValue) {
        switch (caseOrProviderTypeValue) {
            case "Case": return { page: "CaseNotes.htm", type: "Case", numberId: 'caseNumber', numberId: document.getElementById('caseNumber').value, parameters: getParamsFromListOrAlertTable.case() };
            case "Provider": return { page: "ProviderNotes.htm", type: "Provider", numberId: 'providerIdVal', numberId: document.getElementById('providerIdVal').value, parameters: getParamsFromListOrAlertTable.provider() };
        }
    };
    let storeNumberTask = [gbl.eles.submitButton, createButton, document.getElementById('Alerts.htm')].forEach(ele => ele.addEventListener('click', () => {
        storeSelectedTableRow({ rowOrValToSearch: alertGroupId.value, clearEle: 'inputWorkerId', clearVal: document.getElementById('inputWorkerId').value })
    }) );
    evalData().then(( { 0: tableOneAlerts, 1: tableTwoAlerts } = {} ) => {
        if (!tableOneAlerts) { return };
        caseOrProviderAlertsTableTbody.addEventListener( 'click', clickEvent => {
            if (deleteAllActive || clickEvent.altKey ) { return };
            let tableRow = walkToTableRow(clickEvent.target)
            if (!tableRow) { return };
            fBaseCategoryButtons()
            selectedCaseOrProvider = { tableRow, idTd: tableRow.children[2] }
            selectedCaseOrProvider.caseIdVal = selectedCaseOrProvider.idTd?.textContent
        });
        caseOrProviderAlertsTableTbody.addEventListener( 'contextmenu', contextmenuCopy)
        alertTable.addEventListener('click', clickEvent => {
            if ( !['TR', 'TD', 'A'].includes(clickEvent.target.nodeName) || deleteAllActive ) { return };
            identifyAlertAndDoOmnibuttons( walkToTableRow(clickEvent.target) )
        });
        waitForElmHeight("#caseOrProviderAlertsTable > tbody > tr").then(() => {
            if (caseOrProviderAlertsTableTbody.firstElementChild.textContent === "No records found" && alertTotal.value > 0) { doClick(gbl.eles.submitButton); return; }; // reloads the page if it incorrectly shows 0 alerts;
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
                        thisRow.id = thisRow.children[2].textContent
                        checkCashArray.push(thisRow.id)
                        cashAlertResults[thisRow.id] = { rowIndex: item.rowIndex }
                    }
                })
                let existingCashResults = sanitize.json(sessionStorage.getItem('cashAlertResults')) ?? undefined
                if (existingCashResults) {
                    for (let caseNum in existingCashResults) { existingCashResults[caseNum].rowIndex = tableOneAlerts.find(data => data.caseNumberOrProviderId.indexOf(caseNum) > -1)?.rowIndex ?? undefined }
                    placeMfipResults(existingCashResults)
                } else if (existingCashResults && !checkCashArray.length) { sessionStorage.removeItem('cashAlertResults') }
                if (!checkCashArray.length) { return }
                alertDetailRow.insertAdjacentHTML('beforeend', '<button type="button" id="doMfipCheck" class="cButton" tabindex="-1">Check MFIP Alerts</button>')
                document.getElementById('doMfipCheck').addEventListener( 'click', () => checkMfipResults(checkCashArray) )
                function checkMfipResults(checkMFIPArray) {
                    forAwaitMultiCaseEval(checkCashArray, "CaseOverview.htm").then(function(checkMFIPArray) {
                        for (let thisCase in checkMFIPArray) {
                            let programTable = checkMFIPArray[thisCase][0]
                            for (let row in programTable) {
                                if ( ["MFIP", "DWP"].includes(programTable[row].programNameHistory) ) {
                                    cashAlertResults[thisCase] = {
                                        ...cashAlertResults[thisCase],
                                        mfipStatus: programTable[row].programNameHistory + ': ' + programTable[row].programStatusHistory,
                                        inactiveDate: programTable[row].programStatusHistory === "Inactive" ? ' ' + programTable[row].programBeginDateHistory.replace(/20(\d\d)/, '$1').replace(/0(\d)/g, '$1') : '',
                                        ccapStatus: ' | CCAP: ' + programTable[0].programNameHistory,
                                    }
                                    break
                                }
                            }
                        }
                        placeMfipResults(cashAlertResults)
                        sessionStorage.setItem('cashAlertResults', JSON.stringify(cashAlertResults))
                    })
                }
                function placeMfipResults(resultsObj) {
                    for (let caseNum in resultsObj) {
                        let thisCaseObj = resultsObj[caseNum]
                        if (!thisCaseObj.rowIndex) { continue }
                        let resultsTd = caseOrProviderAlertsTableTbodyChildren[thisCaseObj.rowIndex]?.children[1]
                        !resultsTd.children.length && resultsTd.insertAdjacentHTML('beforeend', '<span class="tableSpan">' + thisCaseObj.mfipStatus + thisCaseObj.inactiveDate + thisCaseObj.ccapStatus +'</span>')
                        }
                }
            }();
            !function preWorkerAlertClick() {
                setTimeout(() => {
                    reselectSelectedTableRow('table', 1);
                    setTimeout(() => { if (!findSelected()) { console.log('Clicking due to no alert being selected'); doClick(caseOrProviderAlertsTableTbodyChildren[0]) } }, 500)
                }, 600)
            }();
        });

        deleteButton.insertAdjacentElement('afterend', createButton)
        let deleteAllButton = createNewEle('button', { type: 'button', classList: 'form-button', id: 'deleteAll', title: 'Delete All', value: 'Delete All', textContent: 'Delete All', }),
            stopDeleteAllButton = createNewEle('button', { type: 'button', classList: 'form-button hidden', id: 'stopDeleteAll', title: 'Stop Deleting', value: 'Stop Deleting', textContent: 'Deleting...', }),
            deleteTopButton = createNewEle('button', { type: 'button', classList: 'form-button ulfl', id: 'deleteTop', textContent: 'Delete Alert', })
        alertTotal.insertAdjacentElement('afterend', deleteTopButton).insertAdjacentElement('afterend', deleteAllButton).insertAdjacentElement('afterend', stopDeleteAllButton)
        doNotDupe.buttons.push('#deleteAll', '#stopDeleteAll', '#deleteTop')
        let deleteAllButtons = [deleteAllButton, stopDeleteAllButton], deleteButtons = [deleteButton, deleteTopButton, deleteAllButton]
        deleteTopButton.addEventListener( 'click', () => doClick(deleteButton) );
        // SECTION_START Delete_all_alerts
        doWrap({ ele: h4objects.caseproviderlist.h4 })
        let alertMessageh4 = createNewEle('h4', { classList: "float-right-imp", style: "display:inline-flex;", id: "alertMessageh4" })
        h4objects.caseproviderlist.h4.insertAdjacentElement( 'afterend', alertMessageh4 )
        let manualHaltDeleting = 0
        stopDeleteAllButton.addEventListener("click", () => { manualHaltDeleting = 1 });
        deleteAllButton.addEventListener("click", () => {
            manualHaltDeleting = 0
            let caseDetails = structuredClone(getAlertType(caseOrProviderType.value))
            if ( !["Case", "Provider"].includes(caseDetails.type) ) { return };
            deleteAllButtons.forEach( ele => ele.classList.toggle('hidden') )
            doDeleteAll(caseDetails)
        });
        function doDeleteAll({ type: caseOrProvider, numberId: numberToDelete } = {}) {
            deleteAllActive = 1
            const observerDelete = new MutationObserver( () => deleteAll() )
            observerDelete.observe(deleteButton, { attributeFilter: ['value'] })
            let alertRowIndexValue = alertRowIndx.value, alertCount = () => caseOrProviderAlertsTableTbody.children[alertRowIndexValue]?.children[3]?.innerText
            let caseProviderRow = caseOrProviderAlertsTableTbody.children[alertRowIndx.value], isCaseProviderRowSelected = () => caseProviderRow?.classList?.contains('selected')
            selectedCaseOrProvider.idTd = (selectedCaseOrProvider.idTd ? selectedCaseOrProvider.idTd : caseOrProviderAlertsTableTbody.querySelector('.selected').children[2]) ?? undefined
            storeSelectedTableRow()
            deleteAll()
            function deleteAllMsg(h4MsgText) { alertMessageh4.innerText = h4MsgText };
            function deleteAll() {
                selectedCaseOrProvider.caseIdVal = selectedCaseOrProvider.idTd?.textContent
                const isCaseProviderRowSelectedBool = isCaseProviderRowSelected(), alertCountNumber = Number(alertCount())
                if (manualHaltDeleting) { endDeleteAll(); return deleteAllMsg("Halting Delete All") }
                if (deleteButton.value === "Please wait") { return }
                if (alertCountNumber < 0) { endDeleteAll(); return deleteAllMsg(["Delete All halted for", numberToDelete, "- reload page (MEC2 database mismatch)"].join(' ')) }
                if (alertCountNumber < 1) { endDeleteAll(); return deleteAllMsg( ['Delete All ended - all alerts deleted from', caseOrProvider.toLowerCase(), numberToDelete].join(' ') ); }
                if (isCaseProviderRowSelectedBool && alertCountNumber > 0 && selectedCaseOrProvider.caseIdVal === numberToDelete && deleteButton.value === "Delete Alert") { return doClick(deleteButton) }
                else {
                    if (selectedCaseOrProvider.caseIdVal === undefined) {
                        deleteAllMsg(["Delete All halted for", numberToDelete, "- no row was 'clicked' in Case/Provider"].join(' '))
                        return deleteAllErrorLogging("selectedCaseOrProvider.caseIdVal is undefined. '.selected' row in caseOrProviderAlertsTableTbody is ", caseOrProviderAlertsTableTbody.querySelector('.selected'))
                    } else if (selectedCaseOrProvider.caseIdVal && alertCountNumber > 0 && (selectedCaseOrProvider.caseIdVal !== numberToDelete) || !isCaseProviderRowSelectedBool ) {
                        deleteAllMsg(["Delete All halted for", numberToDelete, "- reload page (MEC2 database mismatch)"].join(' '))
                        deleteButtons.forEach(ele => { ele.disabled = true })
                        return deleteAllErrorLogging( "selectedCaseOrProvider.caseIdVal: ", selectedCaseOrProvider.caseIdVal, "\nalertCount(): ", alertCount(), "\nselectedCaseOrProvider.caseIdVal !== numberToDelete: ", selectedCaseOrProvider.caseIdVal, numberToDelete, "\n!isCaseProviderRowSelected(): ", !isCaseProviderRowSelectedBool )
                    } else if ( numberToDelete !== selectedCaseOrProvider.caseIdVal || !isCaseProviderRowSelectedBool ) {
                        deleteAllMsg(caseOrProvider === "Case" ? "Case number doesn't match." : "Provider ID doesn't match.")
                        return deleteAllErrorLogging( "numberToDelete !== selectedCaseOrProvider.caseIdVal: ", numberToDelete, selectedCaseOrProvider.caseIdVal, "\n!isCaseProviderRowSelected(): ", !isCaseProviderRowSelectedBool )
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
                deleteAllActive = 0
            };
        };
        localStorage.setItem( 'MECH2.alertsPageReload', Math.random() )
        addEventListener('storage', (key, newValue) => {
            if (event.key === 'MECH2.alertsPageReload') {
                deleteButtons.forEach(ele => { ele.disabled = true })
                alertMessageh4.innerText = "Alert page loaded in new tab. Reload or close this tab."
                eleFocus(gbl.eles.submitButton)
            }
        });
        // SECTION_END Delete_all_alerts

        // SECTION_START Alert_Type_Based_Action
        let caseCategoriesButtonsDiv = createNewEle('div', { id: "caseCategoriesButtonsDiv", classList: "hidden" })
        let providerCategoriesButtonsDiv = createNewEle('div', { id: "providerCategoriesButtonsDiv", classList: "hidden" })
        let omniButtonsDiv = createNewEle('div', { id: "omniButtonsDiv" })
        deleteButton.parentElement.appendChild(createNewEle('div', { id: "baseCategoryButtonsDiv", classList: "form-group-no-margins form-group-button-parent" })).append(caseCategoriesButtonsDiv, providerCategoriesButtonsDiv, omniButtonsDiv)
        !function categoryButtonsInnerHTML() {
            const aCaseCategoryButtons = [ ["Notes", "CaseNotes"], ["Overview", "CaseOverview"], ["Elig.", "CaseEligibilityResultSelection"], ["SA:O", "CaseServiceAuthorizationOverview"], ["Provider", "CaseChildProvider"], ["Page Summary", "CasePageSummary"], ]
            caseCategoriesButtonsDiv.insertAdjacentHTML("beforeend", aCaseCategoryButtons.map(([ buttonText, buttonId ] = []) => '<button type="button" class="form-button" id="' + buttonId + '">' + buttonText + '</button>').join(''))
            const aProviderCategoryButtons = [ ["Address", "ProviderAddress"], ["Alias", "ProviderAlias"], ["Info", "ProviderInformation"], ["Notices", "ProviderNotices"], ["Overview", "ProviderOverview"], ["Rates", "ProviderRates"], ["Registration", "ProviderRegistrationAndRenewal"], ]
            providerCategoriesButtonsDiv.insertAdjacentHTML("beforeend", aProviderCategoryButtons.map(([ buttonText, buttonId ] = []) => '<button type="button" class="form-button" id="' + buttonId + '">' + buttonText + '</button>').join(''))
        }();
        function fBaseCategoryButtons() {
            switch (caseOrProviderType.value) {
                case "Case": if (caseCategoriesButtonsDiv.classList.contains('hidden')) { providerCategoriesButtonsDiv.classList.add('hidden'); caseCategoriesButtonsDiv.classList.remove('hidden'); } break;
                case "Provider": if (providerCategoriesButtonsDiv.classList.contains('hidden')) { caseCategoriesButtonsDiv.classList.add('hidden'); providerCategoriesButtonsDiv.classList.remove('hidden'); } break;
            }
        };
        document.getElementById('baseCategoryButtonsDiv').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            let alertTypeParameters = getAlertType(caseOrProviderType.value).parameters
            if (foundAlert.noteMessage === "Approve new results (BSF/TY/extended eligibility) if MFIP not reopened.") {
                let eligChangeDate = Date.parse(selectedCaseOrProvider.tableRow.innerText.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/)[0]), baseDate = 1748192400000
                while (baseDate < eligChangeDate) { baseDate += dateFuncs.bwpInMs }
                let thirteenDays = 1123200000
                alertTypeParameters.parm3 = "&parm3=" + dateFuncs.parm3date(baseDate - thirteenDays) + dateFuncs.parm3date(baseDate)
            }
            window.open('/ChildCare/' + clickEvent.target.id + '.htm' + alertTypeParameters.parm2 + alertTypeParameters.parm3, '_blank')
        });
        // SECTION_END Alert_Type_Based_Action

        // SECTION_START AutoCaseNoting
        function groupTableTwoAlerts() {
            let alertsByRowIndex = {}
            for (let index in tableTwoAlerts) {
                let currentIndex = alertsByRowIndex[tableTwoAlerts[index].rowIndex] ?? []
                currentIndex.push(tableTwoAlerts[index].message + "newline    (Intended Person: " + tableTwoAlerts[index].intendedPersonName + ")" )
                alertsByRowIndex[tableTwoAlerts[index].rowIndex] = currentIndex
            }
            return alertsByRowIndex
        };
        let tableTwoAlertsGrouped = groupTableTwoAlerts()
        const noteMsgFuncJoinReplace = msgArray => msgArray.join('newline').replace(/\\/g, '').replace(/newline/g, '\n').replace(/Snoozed: [a-z ]+: /ig,'')
        function identifyAlertAndDoOmnibuttons(selectedAlertTableRow) {
            if (selectedAlertTableRow === undefined) { return undefined };
            omniButtonsDiv.replaceChildren()
            let [selectedRowCategory, , selectedRowName ] = selectedAlertTableRow.children
            foundAlert = Object.assign( getMessageTextAndCategory(alertMessage.value, selectedRowCategory.textContent), { selectedAlertTableRow } )
            if (typeof alertsByCategories[foundAlert.messageCategory] !== "object") { return };
            fBaseCategoryButtons()
            let alertMessagesInCategory = alertsByCategories[foundAlert.messageCategory]
            if (!Object.keys(alertMessagesInCategory).length) { return };
            for (let message in alertMessagesInCategory) {
                if (alertMessagesInCategory[message]?.textIncludes.test(alertMessage.value) === false) { continue };
                if (!"omniPageButtons" in alertMessagesInCategory[message]) { break };
                foundAlert = Object.assign( foundAlert, alertMessagesInCategory[message], { message }, )
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
            };
            function getMessageTextAndCategory(alertMessageText, alertTableCategory) {
                let [ , messageCategory, noteMessage ] = alertMessageText.indexOf('Snoozed') === 0 ? alertMessageText.split(': ') : [ '', alertTableCategory, alertMessageText ]
                return { messageCategory: messageCategory.toLowerCase().replace(/\W/g, ""), noteMessage, noteCategory: 'Other', }
            };
        };

        doWrap({ ele: h4objects.alertdetail.h4 })
        h4objects.alertdetail.h4.parentElement.style.display = "inline-block"
        let alertDetailRow = createNewEle( 'div', { style: 'display: inline-flex; gap: 10px; margin-left: 10px;', id: 'alertDetailRow', }), autonoteButton = createNewEle( 'button', { type: 'button', classList: 'cButton', tabIndex: "-1", id: 'autonoteButton', textContent: 'Automated Note', })
        h4objects.alertdetail.h4.parentElement.insertAdjacentElement('afterend', alertDetailRow).appendChild(autonoteButton)
        // let alertDetailRow = document.getElementById('alertDetailRow')
        async function automatedCaseNote() {
            let alertType = getAlertType(caseOrProviderType.value)
            let [ , effectiveDate, selectedRowName ] = foundAlert.selectedAlertTableRow.children
            let dateRange = undefined // not yet implemented
            if ("intendedPerson" in foundAlert) { foundAlert.intendedPerson = nameFuncs.commaNameObject(selectedRowName.textContent).first }
            if ("noteSummary" in foundAlert) {
                if (foundAlert.noteSummary === "doFunction") { foundAlert.noteSummary = noteSummaryFunction({ alertByCategory: foundAlert.messageCategory + "." + foundAlert.message, effectiveDate, selectedRowName }) }
                else if (typeof foundAlert.noteSummary === "object") { foundAlert.noteSummary = await noteSummaryReplacement(foundAlert.noteSummary, foundAlert.noteMessage, foundAlert.intendedPerson) }
                if ("summaryFetchData" in foundAlert) {
                    for await ( let [i, page] of foundAlert.summaryFetchData.entries() ) { // reminder: can't .map() promises;
                        let [ pageName, evalString ] = page.split(":")
                        let fetchedData = await evalData({ caseProviderNumber: alertType.numberId, pageName, dateRange, evalString })
                        foundAlert.noteSummary = foundAlert.noteSummary.replace("%" + i, fetchedData)
                    }
                }
            } else { foundAlert.noteSummary = foundAlert.noteMessage.slice(0, 50) }
            if ("noteMsgFunc" in foundAlert) {
                if ("noteMsgFetchData" in foundAlert) {
                    let textFetchedData = []
                    for await (let page of foundAlert.noteMsgFetchData) {
                        let [ pageName, evalString ] = page[0].split(":")
                        let fetchedData = await evalData({ caseProviderNumber: alertType.numberId, pageName, dateRange, evalString })
                        textFetchedData = page[1].map(prop => fetchedData[prop])
                    }
                    foundAlert.noteMessage = await noteMessageReplacement({ alertByCategory: foundAlert.messageCategory + "." + foundAlert.message, noteMessage: foundAlert.noteMessage, fetchedDataArray: textFetchedData, alertTableSelectedRow: foundAlert.selectedAlertTableRow}) ?? foundAlert.noteMessage
                } else { foundAlert.noteMessage = await noteMessageReplacement({ alertByCategory: foundAlert.messageCategory + "." + foundAlert.message, alertTableSelectedRow: foundAlert.selectedAlertTableRow }) ?? foundAlert.noteMessage }
            }
            // currently unused and untested - intended to include date range in evalData fetch // if ("dateRange" in foundAlert) { //     if (Number.isNaN(foundAlert.dateRange)) { return } //     let startDate = document.getElementById('periodBeginDate').value, endDate = document.getElementById('periodEndDate').value //     foundAlert.dateRange = foundAlert.dateRange !== 0 ? foundAlert.dateRange = (dateFuncs.formatDate(dateFuncs.addDays(startDate, dateRange * 14), "mmddyyyy") + dateFuncs.formatDate(dateFuncs.addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') : 0 //     if (foundAlert.dateRange !== 0) { foundAlert.dateRange = (dateFuncs.formatDate(dateFuncs.addDays(startDate, dateRange * 14), "mmddyyyy") + dateFuncs.formatDate(dateFuncs.addDays(endDate, dateRange * 14), "mmddyyyy")).replaceAll(/\//g, '') } // }
            let shortWorkerName = nameFuncs.LastFirstToFirstL(workerName.value)
            foundAlert.worker = shortWorkerName
            foundAlert.xNumber = inputWorkerId.value.toLowerCase()
            foundAlert.page = alertType.page
            foundAlert.parameters = alertType.parameters.parm2 + alertType.parameters.parm3
            foundAlert.numberId = alertType.numberId
            foundAlert.noteSummary = foundAlert.noteSummary.replace(/(\d{2}\/\d{2}\/\d{4}|\d{13})/g, (date) => dateFuncs.formatDate(date, "mdyy"))
            return foundAlert
            function noteMessageReplacement({ alertByCategory, noteMessage, fetchedDataArray, alertTableSelectedRow } = {}) {
                switch (alertByCategory) {
                    case "childsupport.csCSES": return tableTwoAlertsGrouped[getChildNum(alertTableSelectedRow)].filter( item => item.includes('CSES') )
                    case "childsupport.ncpAddress": {
                        let parentAndNCPAddress = foundAlert.noteSummary + "\n-\nCase Address: " + fetchedDataArray[0]
                        if ((noteMessage).includes(fetchedDataArray[0].slice(0, 12))) {
                            foundAlert.noteSummary = "MATCH: " + foundAlert.noteSummary
                            parentAndNCPAddress = parentAndNCPAddress.concat("\n-\nAddresses match. Sending special letter requesting additional information.")
                        }
                        return parentAndNCPAddress
                    }
                    case "eligibility.unpaidCopay": return tableTwoAlertsGrouped[getChildNum(alertTableSelectedRow)].filter( item => item.includes('Failure') )
                    case "maxis.gcReviewDate": return tableTwoAlertsGrouped[getChildNum(alertTableSelectedRow)].filter( item => item.includes('Good Cause') )
                    case "maxis.genGoodCauseChanged": return tableTwoAlertsGrouped[getChildNum(alertTableSelectedRow)].filter( item => item.includes('Good Cause') )
                    case "maxis.mailingAddress": return fetchedDataArray[0].length ? foundAlert.noteMessage + "\n-\nMailing Address: " + fetchedDataArray[0] + " " + fetchedDataArray[1] + " " + fetchedDataArray[2] : foundAlert.noteMessage + "\n-\nMailing address removed."
                    case "maxis.marriage": return tableTwoAlertsGrouped[getChildNum(alertTableSelectedRow)].filter( item => ['Marriag','Marital','Designa'].includes(item.slice(0, 7)) )
                    case "maxis.residenceAddress": return foundAlert.noteMessage + "\n-\nResidence Address: " + fetchedDataArray[0]
                }
            };
            function noteSummaryReplacement(noteSummaryArray, msgText, personName) { return msgText.replace(noteSummaryArray[0], noteSummaryArray[1]).replace("personName", personName) }
            function noteSummaryFunction({ alertByCategory, effectiveDate, selectedRowName } = {}) {
                switch (alertByCategory) {
                    case "maxis.memberJoined": { return foundAlert.noteMessage.replace(/(?:[A-Za-z0-9 ]+)(\d{1,2}\/\d{1,2}\/\d{2,4})./, "Added: $1: " + nameFuncs.commaNameObject(selectedRowName.textContent).first ) }
                    case "information.mailed": { return "Redetermination mailed, due " + dateFuncs.addDays(effectiveDate.textContent, 45) }
                }
            };
        };
        autonoteButton.addEventListener('click', () => {
            automatedCaseNote().then(returnedAlert => {
                let readiedAlert = {}
                readiedAlert[returnedAlert.numberId] = Object.assign({}, returnedAlert)
                localStorage.setItem("MECH2.note", JSON.stringify(readiedAlert))
                eleFocus(deleteButton)
                window.open('/ChildCare/' + returnedAlert.page + returnedAlert.parameters, '_blank')
            })
        }); // SECTION_END AutoCaseNoting
        createButton.addEventListener('click', () => {
            let { messageCategory, noteMessage } = foundAlert ?? {}
            let workerCreatedObject = JSON.stringify({ messageCategory, noteMessage })
            localStorage.setItem( 'MECH2.workerCreatedObject', workerCreatedObject )
        }) // Worker_Created_Alert_Data;
    }).catch(err => { console.trace(err) });
}(); // SECTION_END Alerts (major_subsection) ===========================================================================================================;
!function AlertWorkerCreatedAlert() {
    if (!["AlertWorkerCreatedAlert.htm"].includes(thisPageNameHtm)) { return }
    let workerCreatedAlert = sanitize.json(localStorage.getItem('MECH2.workerCreatedObject'))
    if (!workerCreatedAlert) { return }
    localStorage.removeItem('MECH2.workerCreatedObject')
    document.querySelector('label[for=message]').parentElement.insertAdjacentHTML('afterend', '<div class="form-group" id="workerAlertButtons" style="margin-top: 10px;"></div>')
    let workerAlertButtons = document.getElementById('workerAlertButtons')
    let matchesDelayStrings = ( ["Unapproved results", "The program switch", "Approve new result"].includes(workerCreatedAlert.noteMessage?.slice(0, 18)) ) ? delayMfipButtons() : snoozeButtons()
    function snoozeButtons() {
        workerAlertButtons.insertAdjacentHTML('beforeend','<button type="button" class="cButton delay" id="snooze1">Snooze One Day</button><button type="button" class="cButton delay" id="snooze7">Snooze One Week</button><button type="button" class="cButton delay" id="snooze14">Snooze Two Weeks</button>')
        workerAlertButtons.addEventListener('click', doSnooze )
        focusEle = '#snooze1'
        function doSnooze(clickEvent) {
            clickEvent.preventDefault()
            let snoozeDays = sanitize.number(clickEvent.target.id.slice(6))
            if (!snoozeDays) { return }
            let todayDate = new Date(), snoozeDate = dateFuncs.formatDate(todayDate.setDate(todayDate.getDate() + snoozeDays), 'mmddyyyy')
            enterAlertInfo("Snoozed: " + workerCreatedAlert.messageCategory + ": " + workerCreatedAlert.noteMessage, snoozeDate)
        }
    }
    function delayMfipButtons() {
        let todayDate = new Date()
        let nextMonth = dateFuncs.formatDate(dateFuncs.addMonths(todayDate, 1, 1), 'mmddyyyy')
        let monthAfter = dateFuncs.formatDate(dateFuncs.addMonths(todayDate, 1, 1), 'mmddyyyy')
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
        gbl.eles.save.click();
    }
    docReady(resetTabIndex())
}(); // SECTION_END Alert_Worker_Created_Alert;
!function _Application_Pages() {
    !function __ApplicationInformation() {
        if (!("ApplicationInformation.htm").includes(thisPageNameHtm)) { return }
        let appReceivedField = document.getElementById('receivedDate')
        let appReceivedDate = appReceivedField.value
        let appDateCompare = sanitize.date(appReceivedField.value, "number")
        if (appReceivedField.value !== '') {
            h4objects.dates.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton float-right-imp" style="margin-top: 5px;" tabindex="-1" id="appReceivedDateButton">Copy App Date</button>')
            document.getElementById('appReceivedDateButton').addEventListener('click', (() => {
                actualDate._setActualDate({adCaseNum: "noCaseNumberYet", adDate: appReceivedDate, adField: 'receivedDate'})
                sessionStorage.setItem('processingApplication', "yes")
                snackBar("Stored application date", 'notitle')
                if ( !inRange( appDateCompare, sanitize.date(selectPeriodDates.start, "number"), sanitize.date(selectPeriodDates.end, "number") ) ) {
                    document.getElementById('retroAppDateLbl').style.visibility = "hidden"
                    document.getElementById('retroAppDate').insertAdjacentHTML('afterend','<span>Notice: Application date is outside the current biweekly period.</span>')
                }
            }))
        }
    }(); // SECTION_END Application_Information;
    !function __CaseApplicationInitiation() {
        if (!("CaseApplicationInitiation.htm").includes(thisPageNameHtm) || !editMode) { return };
        countyInfo.userSettings?.selectPeriodReversal && selectPeriodReversal()
        let pmiNumber = document.getElementById('pmiNumber')
        pmiNumber?.addEventListener('blur', blurEvent => { if ( pmiNumber.value ) { eleFocus( firstEmptyElement() ) } })
        document.getElementById('next')?.addEventListener('click', () => { sessionStorage.setItem('processingApplication', "yes") })
        function appDateChanged(changeEvent) {
            let appDateChange = changeEvent.target.value
            if (appDateChange.length < 10) { return false }
            let appDate = sanitize.date(appDateChange, "number"), benPeriodDate = { start: sanitize.date(selectPeriodDates.start, "number"), end: sanitize.date(selectPeriodDates.end, "number") }
            const matchingPeriod = findContainingPeriod(selectPeriod, appDate)
            if (!matchingPeriod) { return };
            selectPeriod.value = matchingPeriod
            eleFocus(gbl.eles.save)
        }
        $('#applicationReceivedDate').on("change", appDateChanged ) // jQuery event doesn't allow for additional 'click' events on its datepicker, so can't replace.
    }(); // SECTION_END Case_Application_Initiation;
    !function __CaseReapplicationAddCcap() {
        if (!("CaseReapplicationAddCcap.htm").includes(thisPageNameHtm)) { return };
        gbl.eles.quit?.addEventListener('click', () => clearStorageItems("session") )
        let unchecked = [...document.querySelectorAll('input[type=checkbox]')].filter(box => box.checked === false).forEach(box2 => { box2.parentElement.style.backgroundColor = 'yellow' })
        }(); // SECTION_END Case_Reapplication_Add_Ccap;
}();
!function BillsList() {
    if (!"BillsList.htm".includes(thisPageNameHtm)) { return }; // This is intentionally querySelectorAll - there are 2 theads with this data, both must be changed;
    document.querySelectorAll('#billsTable_wrapper thead tr td:nth-child(3)').forEach(ele => { (ele.childElementCount ? ele.firstElementChild : ele).textContent = "PID" })
    document.querySelectorAll('#billsTable_wrapper thead tr td:nth-child(7)').forEach(ele => { (ele.childElementCount ? ele.firstElementChild : ele).textContent = "E-Bill" })
    document.querySelectorAll('#billsTable_wrapper thead tr td:nth-child(8)').forEach(ele => { (ele.childElementCount ? ele.firstElementChild : ele).textContent = "Manual" })
    listPageLinksAndList([ { listPageChild: 0, listPageParm3: 4, listPageLinkTo: "FinancialBilling", listPageReplace: ["\\D", "g", ""] }, { listPageChild: 2, listPageLinkTo: "ProviderInformation"} ])
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
    if (!("CaseAddress.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    if (!editMode) {
        let mailingStreet1 = document.getElementById('mailingStreet1'), edit = document.getElementById('edit'), caseName = nameFuncs.commaNameReorder(pageTitle), mailFields = [...document.querySelectorAll('#mailingAddressPanelData > div > div')]
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', '<button type="button" class="form-button" tabindex="-1" id="copyMailing">Copy Mail Address</button>');
        evalData().then(results => {
            if (results[0][0].email) {
                const emailSubject = encodeURIComponent(nameFuncs.LastFirstToFirstL(pageTitle) + ' - CCAP case ' + caseIdVal)
                document.querySelector('label[for=email]').innerHTML = '<a href="mailto:' + results[0][0].email + '?subject=' + emailSubject + '">Email:</a>'
            }
            document.getElementById('copyMailing').addEventListener('click', () => {
                let addressTableRow = getChildNum(document.querySelector('.selected')), addressData = results[0][addressTableRow]
                let mailingData = addressData.mailingStreet1 ? {
                    streetData: [addressData.mailingStreet1, addressData.mailingStreet2].join(' '),
                    cityData: addressData.mailingCity,
                    stateData: stateDataSwap.swapStateNameAndAcronym(addressData.mailingStateProvince),
                    zipData: [addressData.mailingZipCode, addressData.mailingZipCodePlus4].join('-'),
                } : {
                    streetData: [addressData.residenceStreet1, addressData.residenceStreet2].join(' '),
                    cityData: addressData.residenceCity,
                    stateData: stateDataSwap.swapStateNameAndAcronym(addressData.residenceStateProvince),
                    zipData: [addressData.residenceZipCode, addressData.residenceZipCodePlus4].join('-'),
                }
                let copyText = caseName + "\n" + mailingData.streetData + "\n" + mailingData.cityData + ", " + mailingData.stateData + " " + mailingData.zipData;
                navigator.clipboard.writeText(copyText);
                snackBar(copyText);
            })
            let phone2 = document.getElementById('phone2'); !phone2?.value && phone2.closest('.form-group').classList.add('hidden')
            let phone3 = document.getElementById('phone3'); !phone3?.value && [...phone3.closest('.form-group').children].forEach(ele => { if (ele.classList.contains('form-group')) { return }; ele.classList.add('hidden') })
            checkMailingAddress()
            function checkMailingAddress() { document.getElementById('mailingCountry').value ? h4objects.mailingaddress.siblings.forEach(ele => { ele.style.visibility = "visible" }) : h4objects.mailingaddress.siblings.forEach(ele => { ele.style.visibility = "hidden" }) };
            document.getElementById('caseAddressTable').addEventListener( 'click', () => checkMailingAddress() );
        }).catch(err => { console.trace(err) })
    };
}(); // SECTION_END Case_Address;
!function CaseChildProvider() { // ======================================================================================================================================================;
    if (!("CaseChildProvider.htm").includes(thisPageNameHtm)) { return };
    const ccpEle = Object.fromEntries([
        'providerType', 'providerId', 'carePeriodBeginDate', 'carePeriodEndDate', 'primaryBeginDate', 'primaryEndDate', 'secondaryBeginDate', 'secondaryEndDate', 'careEndReason', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild', 'relatedToChild',
        'careInHome', 'exemptionReason', 'exemptionPeriodBeginDate', 'formSent', 'providerLivesWithChildBeginDate', 'providerLivesWithChildEndDate', 'careInHomeOfChildBeginDate', 'careInHomeOfChildEndDate', 'childCareMatchesEmployer', 'reporterTypeCheckboxes'
    ].map(item => [item, document.getElementById(item)]) );
    let childProviderTableTbodyRows = [...document.querySelector('#childProviderTable > tbody').children]
    secondaryActionArea.style.justifyContent = "flex-start"
    document.getElementById('reporterType').setAttribute('tabIndex', '-1')
    !function enhanceChildProviderTable() {
        evalData().then(({ 0: childProvidersData} = {}) => { // Adds link to provider names, checks end dates and if after first date of period adds CSS.disabledRow;
            if (!childProvidersData) { return };
            let providerDataRowOffset = 0, periodStartParse = Date.parse(selectPeriodDates.start)
            childProvidersData.forEach(providerData => {
                if (providerData.providerId === "") { providerDataRowOffset++; return }
                let providerDataRow = editMode ? Number(providerData.rowIndex) + providerDataRowOffset : providerData.rowIndex
                childProviderTableTbodyRows[providerDataRow].children[2].innerHTML = '<span>' + sanitize.evalText(providerData.providerName) + ' </span><a href="https://mec2.childcare.dhs.state.mn.us/ChildCare/ProviderOverview.htm?providerId=' + providerData.providerId + '" target="_blank">(' + providerData.providerId + ')</a>'
                let endDate = childProviderTableTbodyRows[providerDataRow].children[4]?.textContent
                if ( Date.parse(endDate) < periodStartParse ) { childProviderTableTbodyRows[providerDataRow].classList.add('disabledRow')}
            })
        }).catch(err => { console.trace(err) });
    }();
    !function providerPagesButtons() { // adds nav buttons to provider pages; located inside form on the Provider Information H4 line;
        let providerButtonHTML = [ ["buttonProviderAddress", "Address"], ["buttonProviderInformation", "Contact"], ["buttonProviderParentAware", "Parent Aware"], ["buttonProviderAccreditation", "Accred."] ]
        .map(([id, name]) => { return '<button type="button" class="cButton sidePadding" tabindex="-1" id="' + id + '">' + name + '</button>' }).join('');
        h4objects.providerinformation.h4.insertAdjacentHTML('afterend','<div id="providerPageButtons" class="float-right-imp h4-line" style="display: flex; gap: 5px;">' + providerButtonHTML + '</div>');
        document.getElementById('providerPageButtons').addEventListener('click', clickEvent => {
            let providerPageName = clickEvent.target.id.split('button')[1]
            clickEvent.preventDefault()
            window.open("/ChildCare/" + providerPageName + ".htm?providerId=" + ccpEle.providerId.value, "_blank");
        })
    }();
    !function clearDatesAndHours() { // adds buttons inside form to clear input fields; located on Provider Designation H4 line;
        if (!editMode) { return };
        ccpEle.relatedToChild.insertAdjacentHTML('afterend', ''
                        + '<span class="tooltips" style="margin-left: 5px;">ⓘ'
                        + '<span class="tooltips-text tooltips-topleft">Child’s sibling, grandparent, great-grandparent, aunt, or uncle of the child.\n(Based on blood relationship, marriage or court decree.)</span>'
                        + '</span>')
        setTimeout(() => {
            resetTabIndex()
            !ccpEle.providerLivesWithChild?.value && ccpEle.providerLivesWithChild?.setAttribute('tabIndex', '-1')
            document.querySelectorAll('.borderless').forEach(ele => { ele.tabIndex = "-1" })
        }, 200)
        h4objects.providerdesignation.h4.insertAdjacentHTML(
            'afterend',''
            + '<div id="resetButtonsDiv" class="float-right-imp h4-line" style="display: flex; gap: 10px;">'
            + '<button type="button" class="cButton" tabindex="-1" id="resetCCPForm">Clear Dates & Hours</button>'
            + '<button type="button" class="cButton" tabindex="-1" id="unendSACCPForm">Clear End Dates & Reason</button>'
            + '</div>'
        )
        const resetButtons = {
            unendSACCPForm: { resetValueEles: [ "carePeriodEndDate", "primaryEndDate", "secondaryEndDate", "careEndReason" ], focus: "hoursOfCareAuthorized" },
            resetCCPForm: { resetValueEles: [ "carePeriodEndDate", "primaryEndDate", "secondaryEndDate", "careEndReason", "primaryBeginDate", "secondaryBeginDate", "carePeriodBeginDate", "hoursOfCareAuthorized" ], focus: "primaryBeginDate" }
        }
        document.getElementById('resetButtonsDiv').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            clickEvent.preventDefault()
            let resetTarget = resetButtons[clickEvent.target.id]
            resetTarget.resetValueEles.forEach(ele => { ccpEle[ele].value = '' })
            eleFocus(ccpEle[resetTarget.focus])
        })
        ccpEle.providerId.addEventListener('change', () => {
            let mute = new MutationObserver(() => { providerTypeExists(); mute.disconnect(); })
            mute.observe(ccpEle.formSent, { attributes: true })
        });
        function providerTypeExists() { // called from mutation observer;
            childProviderPage()
            switch (ccpEle.providerType.value) {
                case "": { console.trace('CaseChildProvider.htm section, !ccpEle.providerType.value'); break; }
                case "Legal Non-licensed": { eleFocus(ccpEle.providerLivesWithChild); break; }
                default: { eleFocus(ccpEle.primaryBeginDate); preventKeys(["Tab"]); break; }
            }
        };
    }();
    !function ccpStartEndDateButtons() {
        queueMicrotask(() => {
            if (!editMode) { // Copy/paste start/end dates
                let editDB = document.getElementById('editDB')
                document.getElementById('childProviderTable').addEventListener('click', () => {
                    childProviderPage()
                    checkForDates()
                    eleFocus(editDB)
                })
                tertiaryActionArea?.insertAdjacentHTML("afterbegin", "<button type='button' id='copyStart' class='form-button hidden'>Copy Start</button><button type='button' id='copyEndings' class='form-button hidden'>Copy Endings</button>")
                let copyStartButton = document.getElementById('copyStart'), copyEndingsButton = document.getElementById('copyEndings')
                copyStartButton.addEventListener('click', () => copyStartToSS() )
                copyEndingsButton.addEventListener('click', (() => copyEndingsToSS()))
                checkForDates()

                function checkForDates() {
                    (ccpEle.carePeriodBeginDate?.value && !ccpEle.carePeriodEndDate?.value) ? copyStartButton.classList.remove('hidden') : copyStartButton.classList.add('hidden')
                    ccpEle.carePeriodEndDate?.value ? copyEndingsButton.classList.remove('hidden') : copyEndingsButton.classList.add('hidden')
                }
                function copyStartToSS() {
                    let selectedRow = document.querySelector('.selected')
                    if (ccpEle.carePeriodBeginDate?.value && selectedRow) {
                        let oProviderStart = Object.fromEntries( ['providerId', 'primaryBeginDate', 'secondaryBeginDate', 'carePeriodBeginDate', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild', 'careInHome'].map(ele => [ele, ccpEle[ele].value]) )
                        sessionStorage.setItem("MECH2.providerStart", JSON.stringify(oProviderStart))
                        snackBar('Copied start data!', 'notitle')
                        eleFocus('#newDB')
                    } else if (!selectedRow) { snackBar('No entry selected') }
                }
                function copyEndingsToSS() {
                    let selectedRow = document.querySelector('.selected')
                    if (ccpEle.carePeriodEndDate?.value && selectedRow) {
                        let oProviderEndings = Object.fromEntries( ['primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason'].map(ele => [ele, ccpEle[ele].value]) )
                        sessionStorage.setItem("MECH2.providerEndings", JSON.stringify(oProviderEndings))
                        snackBar('Copied ending data!', 'notitle')
                    } else if (!selectedRow) { snackBar('No entry selected') }
                }
            }
            if (editMode) {
                let oProviderEndings = sanitize.json(sessionStorage.getItem("MECH2.providerEndings"))
                if (oProviderEndings) {
                    tertiaryActionArea?.insertAdjacentHTML("afterbegin", "<button type='button' id='pasteEndings' class='form-button'>Autofill Endings</button>")
                    document.getElementById('pasteEndings').addEventListener('click', pasteEndingData)
                    function pasteEndingData() {
                        if (ccpEle.providerId?.value?.length) {
                            [ 'primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason' ].forEach(item => { ccpEle[item].value = oProviderEndings[item] })
                            gbl.eles.save.click()
                        }
                    }
                }
                let oProviderStart = sanitize.json(sessionStorage.getItem("MECH2.providerStart"))
                if (oProviderStart) {
                    const childDropDown = document.getElementById('memberReferenceNumberNewMember')
                    tertiaryActionArea?.insertAdjacentHTML('afterbegin', "<button type='button' id='pasteStart' class='form-button'>Autofill Start</button>")
                    document.getElementById('pasteStart').addEventListener('click', pasteStartData)
                    function pasteStartData() {
                        if (!ccpEle.providerId?.value?.length) {
                            ccpEle.providerId.value = oProviderStart.providerId
                            doChange(ccpEle.providerId)
                        }
                        let setValues = ['primaryBeginDate', 'secondaryBeginDate', 'carePeriodBeginDate', 'hoursOfCareAuthorized', 'signedFormReceived', 'providerLivesWithChild', 'careInHome' ].forEach(item => { ccpEle[item].value = oProviderStart[item] })
                        let setValuesBlank = ['primaryEndDate', 'secondaryEndDate', 'carePeriodEndDate', 'careEndReason', ].forEach(item => { ccpEle[item].value = '' })
                        setTimeout(() => {
                            if (childDropDown && !childDropDown?.value?.length) { eleFocus(childDropDown) }
                            else if (ccpEle.providerType.value === "Legal Non-licensed") { eleFocus(ccpEle.relatedToChild) }
                            else { eleFocus(gbl.eles.save) }
                        }, 800)
                    }
                }
            }
        })
    }();
    function childProviderPage() {
        let resetTabIndex = [...document.querySelectorAll('form :is(input, select)')].forEach(ele => { if (ele.tabIndex > 0) { ele.removeAttribute("tabIndex") } })
        let licensedOnlyElements = [ 'childCareMatchesEmployer', 'primaryBeginDate', 'primaryEndDate', 'secondaryBeginDate', 'secondaryEndDate' ]
        let lnlOnlyElementsToNo = [ 'providerLivesWithChild', 'careInHome', 'relatedToChild' ]
        let lnlOnlyElements = [ 'providerLivesWithChild', 'careInHome', 'relatedToChild', 'exemptionReason', 'exemptionPeriodBeginDate', 'formSent', 'signedFormReceived', 'providerLivesWithChildBeginDate', 'providerLivesWithChildEndDate', 'careInHomeOfChildBeginDate', 'careInHomeOfChildEndDate' ]
        if (!ccpEle.providerType.value || !editMode) { return };
        if (ccpEle.providerType.value === "Legal Non-licensed") {
            document.querySelector('.lnlData')?.setAttribute('style', 'display: block;')
            ccpEle.reporterTypeCheckboxes.querySelector('input[value="LNL Provider Used"]').checked = true
            ccpEle.reporterTypeCheckboxes.querySelector('input[value="Not Applicable"]').checked = false
            activateDeactivate(lnlOnlyElements, licensedOnlyElements)
            lnlTrainingCheck()
        }
        !(async function accreditationOrParentAware() {
            let hasParentAware3plus = await nonLnlParentAware()
            if (!hasParentAware3plus) {
                let accredResult = await evalData({ caseProviderNumber: ccpEle.providerId.value, pageName: 'ProviderAccreditation.htm', evalString: '0.0', caseOrProvider: 'provider', })
                if (!accredResult || Date.parse(accredResult.accreditationPeriodEnd) < Date.parse(selectPeriodDates.start)) { return };
                ccpEle.hoursOfCareAuthorized.closest('.row').insertAdjacentHTML('beforeend', returnHqHTML("accreditation", "Accreditation"))
                document.getElementById('accreditation').value = accredResult.accreditationType
            }
        })()
        async function nonLnlParentAware() {
            if (ccpEle.providerType.value !== "Legal Non-licensed") {
                let boxesChecked = [...ccpEle.reporterTypeCheckboxes.children].filter(ele => ele.checked).forEach(ele2 => { ele2.setAttribute('tabIndex', '-1') });
                activateDeactivate(licensedOnlyElements, lnlOnlyElements, true)

                document.querySelector('.lnlData')?.setAttribute('style', 'display: none;');
                let parentAwareResult = await evalData({ caseProviderNumber: ccpEle.providerId.value, pageName: 'ProviderParentAware.htm', evalString: '0.0', caseOrProvider: 'provider', })
                if (!parentAwareResult || (Date.parse(parentAwareResult.parentAwarePeriodEnd) < Date.parse(selectPeriodDates.start)) ) { return 0 };
                let starRating = parentAwareResult.parentAwareType.slice(0, 1)
                if (starRating < 3) { return 0 };
                ccpEle.hoursOfCareAuthorized.closest('.row').insertAdjacentHTML('beforeend', returnHqHTML("parentAwareRating", "Parent Aware Rating"))
                document.getElementById('parentAwareRating').value = starRating + "⭐"
            }
            return 1
        }
        function returnHqHTML(hQid, hQtext) {
            return '<div class="col-lg-6 textInherit">'
                + '<label for="' + hQid + '" class="control-label textInherit col-lg-4 textR">' + hQtext + ': </label>'
                + '<div class="col-lg-6 textInherit">'
                + '<output id="' + hQid + '" title="' + hQtext + '" type="text" value="">'
                + '</div></div>'
        }
        const beginEndFields = { primary: { start: "primaryBeginDate", end: "primaryEndDate" }, secondary: { start: "secondaryBeginDate", end: "secondaryEndDate" }, carePeriod: { start: "carePeriodBeginDate", end: "carePeriodEndDate" } }
        for (let fields in beginEndFields) { if (!ccpEle[beginEndFields[fields].start]?.value) { setTimeout(() => ccpEle[beginEndFields[fields].end]?.setAttribute('tabIndex', '-1'), 500) } }
        function activateDeactivate(activate, deactivate, setToNo) {
            activate.forEach(element => {
                ccpEle[element].parentElement.parentElement.style.opacity = "1"
                // if (!editMode) { return }
                if (element.indexOf('End')) { if (!ccpEle[ (element.replace("End", "Begin")) ].value) { return; } }
                ccpEle[element].removeAttribute('tabIndex')
            })
            deactivate.forEach(element => {
                ccpEle[element].parentElement.parentElement.style.opacity = "0.3"
                // if (!editMode) { return }
                ccpEle[element].setAttribute('tabIndex', '-1')
                if (setToNo && lnlOnlyElementsToNo.includes(element) ) { ccpEle[element].value = "N" }
            })
        };
        async function lnlTrainingCheck() {
            ccpEle.relatedToChild.addEventListener( 'change', checkIfRelated )
            let ccpProvIdValue = ccpEle.providerId.value
            let lnlDataProvId = "lnlData" + ccpProvIdValue, lnlDataProvIdEle = document.getElementById(lnlDataProvId)
            let providerTypeFormGroup = ccpEle.providerType.closest('.row')
            let lnlSS = sessionStorage.getItem('lnlSS.' + ccpProvIdValue) ?? ""
            function replaceInputWithDiv(origEle) {
                origEle.parentElement.removeAttribute('style')
                origEle.parentElement.classList = 'col-lg-3'
                origEle.outerHTML = '<div value="' + origEle.value + '" title="' + origEle.title + '" id="' + origEle.id + '" ' + (origEle.id.indexOf('Date') > -1 ? 'class="trainingDate"' : "") + '>' + origEle.value + '</div>'
            };
            !function lnlHTML() {
                if (lnlDataProvIdEle) { checkIfRelated(); return };
                let lnlDiv = providerTypeFormGroup.insertAdjacentHTML('afterend', '<div class="lnlData" id=' + lnlDataProvId + '>' + lnlSS + '</div>')
                if (lnlSS) { checkIfRelated(); return; }
                const lnlTrainingFetch = fetchHTML('/ChildCare/ProviderTraining.htm?providerId=' + ccpProvIdValue, '#providerTrainingData', 'element').then(ptd => {
                    const providerIdEle = document.querySelector('#' + lnlDataProvId)
                    ptd.querySelector('div.form-group:has(input.form-button)').remove() // remove button div;
                    ptd.querySelectorAll('h4, br').forEach( ele => ele.remove() ) // remove junk;
                    ptd.querySelectorAll('input, select').forEach( ele => replaceInputWithDiv(ele) )
                    let trainingMap = new Map([
                        ["cardio", { name: "CPR", verified: "cardioVerification" }],
                        ["firstAid", { name: "First Aid", verified: "firstAidVerification" }],
                        ["suids", { name: "SUIDS", verified: "suidsVerification", related: "Yes", careForRelated: "Related child < 1 year" }],
                        ["headTrauma", { name: "AHT", verified: "headTraumaVerification", related: "Yes", careForRelated: "Related child < 5 years" }],
                        ["orientation", { name: "Supervising for Safety", verified: "orientationVerification", related: "No", careForRelated: "Related child instead of AHT if age < 5 years or SUIDS if age < 1 year", careForUnrelated: "Required for an unrelated child." }],
                        ["ongoing", { name: "Ongoing Training", verified: "ongoingVerification" }],
                        ["annual", { name: "Annual Inspection", verified: undefined }]
                    ])
                    ptd.querySelectorAll('.trainingDate').forEach(ele => {
                        let trainingName = ele.id.slice( 0, -4 )
                        ele.parentElement.previousElementSibling.textContent = trainingMap.get(trainingName).name + ": "
                    })
                    !function ptdHTML() {
                        ptd.insertAdjacentHTML(
                            'beforeend', ''
                            + '<div class="col-lg-6 textInherit" id="registrationGroup"></div>'
                            + '<div class="row">'
                            + '<div class="col-lg-6 textInherit related" id="hasRelatedCare">'
                            + '<label for="relatedCare" class="col-lg-4 control-label textR textInherit marginTop10 related">Related Care:</label> '
                            + '<div class="col-lg-8 padL0 textInherit" style="text-decoration: inherit;">'
                            + '<div id="relatedCare" type="text" class="inline-text related" style="display: inline-flex; flex-direction: row; gap: 10px;" title="LNL Related Care Breakdown"></div>'
                            + '</div>'
                            + '</div> '
                            + '<div class="col-lg-6 textInherit unrelated" id="hasUnrelatedCare">'
                            + '<label for="unrelatedCare" class="col-lg-4 control-label textR textInherit marginTop10 unrelated">Unrelated Care:</label> '
                            + '<div class="col-lg-8 padL0 textInherit">'
                            + '<div class="inline-text unrelated" id="unrelatedCare" style="display: inline-flex; flex-direction: row; gap: 10px;" type="text" title="LNL Unrelated Care Breakdown"></div>'
                            + '<span class="tooltips" style="margin-left: 5px;">ⓘ'
                            + '<span class="tooltips-text tooltips-topleft">Provider is eligible to be paid for up to 90 days without Supervising for Safety training. If the child is under 5, they must have age related trainings or SfS. The 90 days is NOT tracked by MEC2 automatically.</span>'
                            + '</span>'
                            + '</div>'
                            + '</div>'
                            + '</div>'
                        )
                    }();
                    document.querySelector('label[for=carePeriodBeginDate]').insertAdjacentHTML(
                        'beforebegin', ''
                        + '<span class="tooltips lnlInfo" style="position: absolute; width: 24%; text-align: right;">ⓘ'
                        + '<span class="tooltips-text tooltips-top">Provider is eligible to be registered and paid effective the date CPR and First Aid trainings are complete; however, the Service Authorization start date is the completion date for any required age-based trainings or SfS.</span>'
                        + '</span>'
                    )
                    let registrationArray = evalData({ caseProviderNumber: ccpProvIdValue, pageName: 'ProviderRegistrationAndRenewal.htm', evalString: '0.0', caseOrProvider: 'provider', }).then(registrationResult => {
                        let matchedRegistration = registrationResult.financiallyResponsibleAgency === 'Dept of Children, Youth & Families(DCYF)' ? registrationResult : {}
                        if ("financiallyResponsibleAgency" in matchedRegistration) {
                            let registrationGroup = ptd.querySelector('#registrationGroup'), registrationHTML = ''
                            let registrationData = new Map([
                                ['statusEffective', { dataName: "statusEffective", title: "LNL Registration Effective Date", label: "Registration", class: "col-lg-2" }],
                                ['registrationStatus', { dataName: "registrationStatus", title: "LNL Registration Status", label: "Status", class: "col-lg-1" }]
                            ]).forEach((item, key) => {
                                registrationHTML += '<label for="' + item.dataName + '" class="' + item.class + ' control-label textR textInherit marginTop10">' + item.label + ':</label> <div class="col-lg-3 padL0 textInherit"> <div id="' + item.dataName + '" type="text" tabindex="-1" title="' + item.title + '">' + matchedRegistration[key] + '</div> </div> '
                            })
                            registrationGroup.insertAdjacentHTML('beforeend', registrationHTML)
                        }
                        lnlTrainingFormatting()
                    }).catch(err => { console.trace(err) })
                    function lnlTrainingFormatting() {
                        ptd.querySelectorAll('.form-group').forEach(ele => { doUnwrap(ele); })
                        ptd.querySelectorAll('.col-lg-12').forEach(ele => { doUnwrap(ele); })
                        ptd.querySelectorAll('.col-lg-12').forEach(ele => { ele.classList = "col-lg-6" })
                        ptd.querySelectorAll('label.col-lg-2').forEach(ele => { ele.classList = "col-lg-4 textR" })
                        ptd.querySelectorAll('label.col-lg-1').forEach(ele => { ele.classList = "col-lg-2 textR" })
                        ptd.classList.remove('displayNone')
                        checkIfRelated()
                        sessionStorage.setItem('lnlSS.' + ccpProvIdValue, document.getElementById(lnlDataProvId).outerHTML)
                    };
                    providerIdEle.insertAdjacentElement('afterbegin', ptd)
                })
            }();
            let tableRow = -1
            function checkIfRelated() {
                let careFields = ['relatedCare', 'unrelatedCare', 'hasRelatedCare', 'hasUnrelatedCare'].forEach(eleName => { ccpEle[eleName] ??= document.getElementById(eleName) })
                // ccpEle.relatedCare ??= document.getElementById('relatedCare'); ccpEle.unrelatedCare ??= document.getElementById('unrelatedCare'); ccpEle.hasRelatedCare ??= document.getElementById('hasRelatedCare'); ccpEle.hasUnrelatedCare ??= document.getElementById('hasUnrelatedCare')
                let underOne = '<span>Under 1:</span>', underFive = '<span>Under 5:</span>', overFive = '<span>Over 5:</span>'
                let yieldSign = '<div style="background: center center / cover; line-height: 14px;"><span style="background: yellow; color: black;">⚠</span>.</div>'
                let careBreakdown = {
                    relatedLTone: "<span>Under 1: ❌.</span>", relatedLTfive: "<span>Under 5: ❌.</span>", relatedGTfive: "<span>Over 5: ✅</span>",
                    unrelatedLTone: "<span>Under 1: ❌.</span>", unrelatedLTfive: "<span>Under 5: ❌.</span>", unrelatedGTfive: overFive + yieldSign, sfsValue: 0 }
                const lnlTrainings = {
                    elements: {
                        aht: document.getElementById('headTraumaDate'),
                        suids: document.getElementById('suidsDate'),
                        sfs: document.getElementById('orientationDate'),
                    },
                    dateDiff: {},
                    aht: { related: careBreakdown.relatedLTfive, relatedVal: "Under 5: ✅.", unrelatedCat: careBreakdown.unrelatedLTfive, ageCat: underFive, },
                    suids: { related: careBreakdown.relatedLTone, relatedVal: "Under 1: ✅.", unrelatedCat: careBreakdown.unrelatedLTone, ageCat: underOne, },
                }
                lnlTrainings.dateDiff.sfs = dateFuncs.dateDiffInDays(lnlTrainings.elements.sfs.textContent, Date.now())
                if (inRange(lnlTrainings.dateDiff.sfs, 0, 730)) {
                    lnlTrainings.dateDiff.aht = lnlTrainings.dateDiff.sfs; lnlTrainings.dateDiff.suids = lnlTrainings.dateDiff.sfs;
                    careBreakdown.sfsValue = 1
                    careBreakdown.relatedLTone = "<span>Under 1: ✅.</span>"
                    careBreakdown.relatedLTfive = "<span>Under 5: ✅.</span>"
                    careBreakdown.unrelatedLTone = "<span>Under 1: ✅.</span>"
                    careBreakdown.unrelatedLTfive = "<span>Under 5: ✅.</span>"
                    careBreakdown.unrelatedGTfive = "<span>Over 5: ✅.</span>"
                } else {
                    lnlTrainings.elements.sfs.style = 'color: var(--textColorNegative) !important;';
                    ['aht', 'suids'].forEach(training => {
                        lnlTrainings.dateDiff[training] ??= ( dateFuncs.dateDiffInDays(lnlTrainings.elements[training].textContent, Date.now()) ?? "" )
                        if (inRange(lnlTrainings.dateDiff[training], 0, 730)) {
                            lnlTrainings[training].related = lnlTrainings[training].relatedVal;
                            lnlTrainings[training].unrelatedCat = lnlTrainings[training].ageCat + (careBreakdown.sfsValue === 1 ? "✅." : yieldSign)
                        } else { lnlTrainings.elements[training].style = 'color: var(--textColorNegative) !important;' }
                    })
                };
                ccpEle.relatedCare.innerHTML = careBreakdown.relatedLTone + careBreakdown.relatedLTfive + careBreakdown.relatedGTfive
                ccpEle.unrelatedCare.innerHTML = careBreakdown.unrelatedLTone + careBreakdown.unrelatedLTfive + careBreakdown.unrelatedGTfive
                switch (ccpEle.relatedToChild.value) {
                    case "Y": toggleVisible(ccpEle.hasRelatedCare, true); toggleVisible(ccpEle.hasUnrelatedCare, false); break;
                    case "N": toggleVisible(ccpEle.hasUnrelatedCare, true); toggleVisible(ccpEle.hasRelatedCare, false); break;
                    default: toggleVisible(ccpEle.hasUnrelatedCare, false); toggleVisible(ccpEle.hasRelatedCare, false); break;
                };
            };
        };
    };
    childProviderPage()
    !function updateValuesAndFocusEventsAndFunc() { // listens for primary/secondary start date changes, copies down to care start date, then focuses hours input;
        let listenForDateChange = [ "primaryBeginDate", "secondaryBeginDate" ].forEach(ele => {
            ccpEle[ele].addEventListener( 'keydown', () => updateValuesAndFocus(event) )
            ccpEle[ele].addEventListener( 'change', () => updateValuesAndFocus(event) )
        });
        function updateValuesAndFocus(event) {
            if (event.key && event.key !== "Tab") { return }
            if (!ccpEle.carePeriodBeginDate.value && event.target.value?.length === 10) {
                event.preventDefault()
                ccpEle.carePeriodBeginDate.value = event.target.value
                eleFocus(ccpEle.hoursOfCareAuthorized)
            }
        };
    }();
}(); // SECTION_END CaseChildProvider (major_subsection) =====================================================================================;
!function CaseCreateEligibilityResults() {
    if (!("CaseCreateEligibilityResults.htm").includes(thisPageNameHtm)) { return };
    if ( rederrortextContent.includes('Results successfully submitted.') ) {
        doNotDupe.pages.push(thisPageNameHtm)
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', '<button type="button" id="eligibilityResults" class="form-button">Eligibility Results</button>')
        document.getElementById('eligibilityResults').addEventListener('click', () => doClick(document.getElementById('Eligibility Results Selection').children[0]) )
        // document.getElementById('eligibilityResults').addEventListener('click', () => window.open('/ChildCare/CaseEligibilityResultSelection.htm?parm2=' + caseIdVal, '_self' ))
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
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', postWrapButtons())
        function postWrapButtons() { return [...postWrap].map( ([key, item] = []) => '<button class="form-button" type="button" id="'+ key +'">'+ item.name +'</button>').join('') }
        eleFocus('#goSAApproval')
        tertiaryActionArea?.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            window.open('/ChildCare/' + postWrap.get(clickEvent.target.id).page + '.htm?parm2=' + caseIdVal + '&parm3=' + selectPeriodDates.parm3, '_self')
        })
    } else { focusEle = '#createDB' }
}();
!function CaseCSE() {
    if (!("CaseCSE.htm").includes(thisPageNameHtm)) { return };
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
        if ("169".includes(userCountyObj?.code) ) { // SECTION_START Fill_Child_Support_PDF_Forms
            h4objects.details.h4.insertAdjacentHTML('afterend', '<button type="button" class="cButton float-right-imp" tabindex="-1" style="margin-top: 5px;" id="csForms">Generate CS Forms</button>');
            document.getElementById('csForms').addEventListener('click', () => {
                let cpInfo = nameFuncs.commaNameObject(document.querySelector('#csePriTable .selected td:nth-child(2)').firstChild.textContent)
                let ncpInfo = nameFuncs.commaNameObject(document.querySelector('#csePriTable .selected td:nth-child(3)').textContent)
                let childList = {};
                let createdList = [...document.querySelectorAll('#childrenTable tbody tr')].forEach( (row, index) => { childList["child" + index] = row.children[1].textContent } );
                const formInfo = { pdfType: "csForms", xNumber: countyInfo.info?.userIdNumber, caseNumber: caseIdVal, cpInfo, ncpInfo, ...childList };
                window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + JSON.stringify(formInfo), "_blank");
            });
        } // SUB_SECTION_END Fill_Child_Support_PDF_Forms
    }
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
    if (!("CaseCSIA.htm").includes(thisPageNameHtm)) { return };
    let csiahidden = ['middleInitial', 'birthDate', 'ssn', 'gender'].map(itemId => document.getElementById(itemId).parentElement.parentElement)
    let deceased = document.getElementById('deceased'), deceasedDateFormGroup = document.getElementById('deceasedDate').parentElement.parentElement
    let toggleAbsentParentName = createSlider({ label: "Show extra info", title: "Toggle displaying some name fields", id: "toggleAbsentParentNameSlider", defaultOn: false, classes: "h4-line float-right-imp", })
    h4objects.absentparent.h4.insertAdjacentHTML('afterend', toggleAbsentParentName)
    document.getElementById('toggleAbsentParentNameSlider').addEventListener( 'click', ele => unhideElement(csiahidden, ele.target.checked) )
    unhideElement(csiahidden, false)
    h4objects.address.h4.click()
    deceasedDateFormGroup.classList.add('hidden')
    if (editMode) {
        if (document.getElementById('lastName').value !== '') {
            addValueClassdoChange(document.getElementById('nameKnown'), 'Yes', 'red-outline', false)
            eleFocus(deceased)
        } else { eleFocus('#nameKnown') }
    }
    deceased.addEventListener('change', changeEvent => {
        changeEvent.target.value === "Yes" ? deceasedDateFormGroup.classList.remove('hidden') : deceasedDateFormGroup.classList.add('hidden')
    })
}(); // SECTION_END Case_CSIA;
!function CaseDisability() {
    if (!("CaseDisability.htm").includes(thisPageNameHtm)) { return };
    let generateCaseNote = addTertiaryEle('button', { classList: "form-button hidden", id: "generateCaseNote", textContent: "Generate Case Note" })
    let memberDisabilityType = document.getElementById('memberDisabilityType'), memberDisabilityPeriodFrom = document.getElementById('memberDisabilityPeriodFrom'), memberDisabilityPeriodTo = document.getElementById('memberDisabilityPeriodTo'),
        disabilityMemberTableTbody = document.querySelector('#disabilityMemberTable > tbody')
    disabilityMemberTableTbody.addEventListener('click', checkDisabilityType)
    tertiaryActionArea.addEventListener('click', doTertiaryAction)
    !async function checkTableOnLoad() {
        await waitForTableCells().then(e => { disabilityMemberTableTbody.children[0].click() })
    }();
    function doTertiaryAction({ target: clickEvent } = {}) {
        if (clickEvent.nodeName !== "BUTTON") { return };
        switch (clickEvent.id) {
            case "generateCaseNote": {
                let conditionEndDate = memberDisabilityPeriodTo.value ? dateFuncs.formatDate(memberDisabilityPeriodTo.value, "mdyy") : 'ongoing'
                let selectedRow = disabilityMemberTableTbody.querySelector('tr.selected'), exemptionDateRange = dateFuncs.formatDate(memberDisabilityPeriodFrom.value, "mdyy") + " - " + conditionEndDate
                let disabilityCaseNote = {
                    noteMemberReferenceNumber: selectedRow.children[0].textContent,
                    noteCategory: 'Absent Days',
                    noteSummary: 'Absent day exemption: ' + exemptionDateRange,
                    noteMessage: "Received Medical Condition Form for " + nameFuncs.LastFirstToFirstL(selectedRow.children[1].textContent) + " for " + exemptionDateRange + ". Entered absent day exemption.\n=====\n" + countyInfo.info?.userName + (countyInfo.userSettings?.promptUserNameTitle ? countyInfo.info?.inputUserNameTitle : ""),
                    identifier: caseIdVal,
            }
                localStorage.setItem("MECH2.copiedNote", JSON.stringify(disabilityCaseNote) )
                snackBar('Create new case note then click Autofill button.', 'Stored case note', "center")
            }
        }
    }
    function checkDisabilityType() { memberDisabilityType.value === "Medical Condition Absent Day Exemption" ? unhideElement(generateCaseNote, true) : unhideElement(generateCaseNote, false) }
}();
!function _Case_Activity_Pages() {
    if ( !["CaseEmploymentActivity.htm", "CaseEducationActivity.htm", "CaseSupportActivity.htm"].includes(thisPageNameHtm) ) { return };
    document.querySelectorAll('#leaveDetailExtendedEligibilityBegin, #leaveDetailExpires, #redeterminationDate, #extendedEligibilityBegin, #extendedEligibilityExpires, #leaveDetailRedeterminationDue').forEach(ele => { ele.tabIndex = "-1"; ele.classList.add('borderless') }) //extelig
    if (!editMode) { return };
    tabIndxNegOne('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')
    if (document.querySelector('#tempLeavePeriodBegin, #leaveDetailTemporaryLeavePeriodFrom')?.value === "") { tabIndxNegOne('#tempLeavePeriodEnd, #leaveDetailTemporaryLeavePeriodTo') }
    !function __CaseSupportActivity() {
        if (!("CaseSupportActivity.htm").includes(thisPageNameHtm)) { return }
        let doNotReset = [ "#tempLeavePeriodBegin", "#tempLeavePeriodEnd", "#activityEnd" ]
        let memberDescription = document.getElementById('memberDescription'), verification = document.getElementById('verification'), planRequired = document.getElementById('planRequired'), planApproved = document.getElementById('planApproved')
        let activityEnd = document.getElementById('activityEnd'), activityBegin = document.getElementById('activityBegin')
        activityBegin.addEventListener('blur', () => {
            if (memberDescription.value === "PE" || memberDescription.value === "NP") { //extended elig
                activityEnd.value = activityBegin.value
                doChange(activityEnd)
                eleFocus(gbl.eles.save)
            }
        })
        let beforeFirst = rederrortextContent.find(arrItem => arrItem.indexOf('before the first day') > -1) && eleFocus(gbl.eles.save)
        memberDescription.addEventListener('change', changeEvent => {
            const autofillValues = supportAutoFill.get(changeEvent.target.value)
            addValueClassdoChange(verification, autofillValues.verif, false, true)
            addValueClassdoChange(planRequired, autofillValues.plan, false, true)
            autofillValues.plan === "Yes" && addValueClassdoChange(planApproved, "Yes", false, true)
            activityBegin.value && autofillValues.focus && eleFocus(autofillValues.focus)
        })
        const supportAutoFill = new Map([
            [ "JS", { verif: "Other", plan: "No", focus: "#hoursPerWeek" } ],
            [ "ES", { verif: "Employment Plan", plan: "Yes" } ],
            [ "NP", { verif: "Other", plan: "No" } ],
            [ "PE", { verif: "Other", plan: "No" } ],
        ])
        void doChange(planRequired)
    }(); // SECTION_END Case_Support_Activity;
    !function CaseJobSearchTracking() {
        if (!("CaseJobSearchTracking.htm").includes(thisPageNameHtm)) { return }
        document.getElementById('hoursUsed').addEventListener('keydown', keydownEvent => {
            if (!['Enter', 'Tab'].includes(keydownEvent.key) ) { return }
            keydownEvent.preventDefault()
            keydownEvent.stopPropagation()
            keydownEvent.stopImmediatePropagation()
            gbl.eles.save.click()
        })
    }(); // SECTION_END Case_Job_Search_Tracking;
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
    if ( ["CaseEligibilityResultApprovalPackage.htm"].includes(thisPageNameHtm) ) { doNotDupe.doNotUnderline.push('cancel') };
    !function fixCopayLabels() {
        const copayElements = new Map([
            [ "CaseEligibilityResultOverview.htm", [ 'div[title="Current Copay"]', 'div[title="New Copay"]', 'div[title="Effective Date"]', 'Copay' ] ],
            [ "CaseEligibilityResultFinancial.htm", [ 'div[title="Current Copay"]', 'div[title="New Amount"]', 'div[title="Effective Date"]', 'Copay' ] ],
            [ "CaseEligibilityResultApproval.htm", [ 'div[title="Current Copay"]', 'div[title="New Copay"]', 'div[title="Effective Date"]', 'Copay' ] ],
        ])
        const recoupElements = new Map([
            [ "CaseEligibilityResultOverview.htm", [ 'div[title="Current Recoupment"]', 'div[title="New Recoupment"]', 'label[for=recoupmentEffDate]+div', 'Recoupment' ] ],
            [ "CaseEligibilityResultApproval.htm", [ 'div[title="Current Recoupment"]', 'div[title="New Recoupment"]', 'label[for=recoupEffective]+div', 'Recoupment' ] ],
        ])
        const fixCopayRecoup = [ copayElements, recoupElements ].forEach(map => {
            if (map.get(thisPageNameHtm)) {
                const [ currentAmount, newAmount, effectiveDate, paymentType ] = map.get(thisPageNameHtm)
                copayRecoupChanges(document.querySelector(currentAmount), document.querySelector(newAmount), document.querySelector(effectiveDate), paymentType)
            }
        })
        function copayRecoupChanges(currAmt, newAmt, effDate, payType) {
            if (effDate.innerText && Date.parse(effDate.innerText) <= Date.parse(selectPeriodDates.start)) {
                currAmt.style.opacity = '.5'
                let currAmtLabel = currAmt.previousElementSibling ?? currAmt.parentElement.previousElementSibling
                currAmtLabel.style.opacity = '.5'
                currAmtLabel.innerText = "Previous " + payType + ": "
                let newAmtLabel = newAmt.previousElementSibling ?? newAmt.parentElement.previousElementSibling
                newAmtLabel.innerText = "Current " + payType + ": "
            } else if (!effDate.innerText) {
                const noAmounts = [ newAmt.previousElementSibling ?? newAmt.parentElement.previousElementSibling, effDate.previousElementSibling ?? effDate.parentElement.previousElementSibling ].forEach(ele => { ele.style.opacity = '.5' })
            }
        };
    }();
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
    let setTrIds = tableRows?.forEach(ele => { ele.id = "ref" + (ele.firstElementChild.innerText) })
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
        if (sessionStorage.getItem('MECH2.TI.' + caseIdVal) !== null) {
            let tempInelig = sanitize.json(sessionStorage.getItem('MECH2.TI.' + caseIdVal))
            document.getElementById('type').value = tempInelig.type
            document.getElementById('reason').value = tempInelig.reason
            document.getElementById('beginDate').value = tempInelig.start
            document.getElementById('allowedExpirationDate').value = tempInelig.end
            $('.hasDatepicker').datepicker("hide")
            eleFocus(gbl.eles.save)
            return false
        }
        gbl.eles.save.addEventListener("click", () => {
            let tempInelig = { type: document.getElementById('type').value, reason: document.getElementById('reason').value, start: document.getElementById('beginDate').value, end: document.getElementById('allowedExpirationDate').value }
            sessionStorage.setItem('MECH2.TI.' + caseIdVal, JSON.stringify(tempInelig))
        })
        $('#beginDate').on("input change", changeEvent => {
            if (changeEvent.target.value.length < 10) { return false }
            let extEligPlus90 = dateFuncs.formatDate( dateFuncs.addDays(document.getElementById('beginDate').value, 90), "ddmmyyyy" )
            document.getElementById('allowedExpirationDate').value = extEligPlus90
            doChange('#allowedExpirationDate')
        })
    }
}(); // SECTION_END Case_Eligibility_Result_Approval;
!function __CaseEligibilityResultFinancial() {
    if (!("CaseEligibilityResultFinancial.htm").includes(thisPageNameHtm)) { return };
    let totalAnnualizedIncome = sanitize.number(document.querySelector('label[for="totalAnnualizedIncome"]+div').innerText), maxAllowed = sanitize.number(document.querySelector('label[for="maxIncomeAllowed"]+div').innerText)
    if (totalAnnualizedIncome > maxAllowed) { document.querySelector('label[for="totalAnnualizedIncome"]').closest('div').classList.add('eligibility-highlight', 'ineligible') }
    !function parensAroundExpenses() {
        const accountingNegative = [...document.querySelectorAll('table tbody tr')].forEach(tRow => {
            let [,,financialType,,, financialAmount] = tRow.children
            if (financialType?.innerText === "Expense") {
                financialAmount.innerText = "(" + financialAmount.innerText + ")"
            }
        });
    }();
}(); // SECTION_END Case_Eligibility_Result_Financial;
!function __CaseEligibilityResultSelection() {
    if (!("CaseEligibilityResultSelection.htm").includes(thisPageNameHtm)) { return };
    let eligibilityTableRows = [...document.querySelector('#caseEligibilitySelectionTable > tbody').children]
    if (eligibilityTableRows[0].children?.length === 1) { return };
    const eligibilityResults = {}
    function arrayCreatePush(arr, value) { !Array.isArray(arr) ? arr = [value] : arr.unshift(value); return arr }
    eligibilityTableRows.forEach(ele => {
        let [version, ofVersion] = ele.firstElementChild?.textContent.split(" of "), [,,,,, eligStatus, approvalStatus] = ele.children
        if (version === ofVersion) {
            ele.classList.add("current"); eligibilityResults.current = arrayCreatePush(eligibilityResults.current, ele)
            if (approvalStatus.textContent === "Unapproved") { ele.classList.add("unapproved"); eligibilityResults.unapproved = arrayCreatePush(eligibilityResults.unapproved, ele) }
            if (eligStatus.textContent.indexOf("Ineligible") > -1) { ele.classList.add("ineligible"); if (approvalStatus.textContent === "Unapproved") { eligibilityResults.ineligible = arrayCreatePush(eligibilityResults.ineligible, ele) } }
            if (eligStatus.textContent === "Eligible") { ele.classList.add("eligible"); if (approvalStatus.textContent === "Unapproved") { eligibilityResults.eligible = arrayCreatePush(eligibilityResults.eligible, ele) } }
        }
    })
    let priorityEligResult = "unapproved" in eligibilityResults ? ("eligible" in eligibilityResults ? eligibilityResults.eligible[0] : eligibilityResults.ineligible[0]) : eligibilityResults.current[0]
    priorityEligResult.click()
    if (!("unapproved" in eligibilityResults)) {
        document.getElementById('delete').insertAdjacentHTML('afterend', `
        <div id="goSA" style="display: inline-block; margin-left: 5rem;">
            <button type="button" id="goSAOverview" class="form-button">SA Overview</button>
            <button type="button" id="goSAApproval" class="form-button">SA Approval</button>
        </div>`)
        document.getElementById('goSA').addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return };
            clickEvent.preventDefault()
            window.open('/ChildCare/CaseServiceAuthorization' + clickEvent.target.id.slice(4) + '.htm?parm2=' + caseIdVal + '&parm3=' + selectPeriodDates.parm3, '_self');
        })
    };
    tbodiesFocus('#selectDB')
    if ("current" in eligibilityResults) { document.getElementsByClassName('sorting')[1].click() }; // sort by program type;
}(); // SECTION_END CaseEligibilityResultSelection;
!function __CaseEligibilityResultPerson() {
    if (!("CaseEligibilityResultPerson.htm").includes(thisPageNameHtm)) { return };
    let toLabel = document.createElement('label')
    toLabel.classList.add('to'); toLabel.innerHTML = "to";
    document.getElementById('eligibilityPeriodStart').nextSibling.replaceWith(toLabel)
}(); // SECTION_END Case_Eligibility_Result_Person;
}(); // SECTION_END _Case_Eligibility_Pages;
!function _Case_Income_Expense_Pages() {
!function __CaseEarnedIncome() {
    if (!("CaseEarnedIncome.htm").includes(thisPageNameHtm)) { return };
    const ceiIncomeType = document.getElementById('ceiIncomeType'), ceiEmpCountry = document.getElementById('ceiEmpCountry'), ceiTotalIncome = document.getElementById('ceiTotalIncome'), ceiGrossIncome = document.getElementById('ceiGrossIncome'), ceiGrossAllowExps = document.getElementById('ceiGrossAllowExps')
    let ceiAddressLabels = ['ceiEmpCountry', 'ceiEmpStreet', 'ceiEmpStreet2', 'ceiEmpCity', 'ceiEmpStateOrProvince', 'ceiEmpZipOrPostalCode', 'ceiPhone', ].map(ele => document.querySelector('label[for=' + ele + ']'))
    let ceiAddressLabelsAndDivs = [...ceiAddressLabels, ...ceiAddressLabels.map(ele => ele.nextElementSibling) ]
    let ceiAddressGroups = ['ceiEmpCountry', 'ceiEmpStreet', 'ceiEmpStreet2', 'ceiEmpCity', 'ceiEmpStateOrProvince', 'ceiEmpZipOrPostalCode', 'ceiPhone', ].map(ele => document.getElementById(ele)?.closest('.form-group'))
    // self-employment //
    const getCeiGrossIncomeFiftyPct = () => (ceiGrossIncome.value * .5).toFixed(2)
    h4objects.annualselfemploymentcalculation.h4.parentElement
        .appendChild(createNewEle('div', { classList: "col-lg-12 hidden", style: "text-align: center; cursor: pointer;", id:"seiHoursCalcDiv" }))
        .appendChild(createNewEle('label', { textContent: "Hours Per Week: " })).insertAdjacentElement('afterend', createNewEle('output', { id:"seiHoursText" })).insertAdjacentElement('afterend', createNewEle('output', { style: "padding-left: 0 !important;", id: "seiHoursCalculation" }))
    let seiHoursCalcDiv = document.getElementById('seiHoursCalcDiv'), seiHoursCalculation = document.getElementById('seiHoursCalculation'), seiHoursText = document.getElementById('seiHoursText')
    function addHoursPerWeekToSelfEmployment() {
        verbose(ceiTotalIncome.value)
        seiHoursText.textContent = '"Total Income" of ' + ceiTotalIncome.value + ' / 52 weeks / $7.25 = '
        seiHoursCalculation.value = Math.round(100*( sanitize.number(ceiTotalIncome.value) )/52/7.25)/100 + " hours"
    };
    if (seiHoursCalculation.value) { addHoursPerWeekToSelfEmployment() }
    if (editMode) {
        ceiGrossIncome.parentElement.insertAdjacentElement('afterend', createNewEle('div', { id: "autoFiftyPercent" })).appendChild(createNewEle('label', { classList: 'textR', textContent: "50%: " })).insertAdjacentElement('afterend', createNewEle('output', { id: "fiftyPercentGross" })).insertAdjacentElement('afterend', createNewEle('button', { type: "button", id: "useFiftyPercent", classList: "cButton", tabIndex: "27", textContent: "Use 50%" }))
        let fiftyPercentGross = document.getElementById('fiftyPercentGross')
        fiftyPercentGross.value = getCeiGrossIncomeFiftyPct()
        ceiGrossIncome.addEventListener('blur', () => { fiftyPercentGross.value = getCeiGrossIncomeFiftyPct(); addHoursPerWeekToSelfEmployment() })
        ceiGrossAllowExps.addEventListener('input', addHoursPerWeekToSelfEmployment)
        document.getElementById('useFiftyPercent').addEventListener('click', () => {
            ceiGrossAllowExps.value = getCeiGrossIncomeFiftyPct()
            doChange(ceiGrossAllowExps)
            addHoursPerWeekToSelfEmployment()
            eleFocus(gbl.eles.save)
        })
    }
    seiHoursCalcDiv.addEventListener('click', clickEvent => copy(seiHoursCalcDiv.textContent, seiHoursCalcDiv.textContent, "Copied!", "center"))
    // all employment //
    h4objects.actualincome.h4.click();
    tabIndxNegOne('#providerId, #providerSearch, #ceiCPUnitType, #ceiNbrUnits, #ceiTotalIncome, #ceiPaymentChange')
    function checkEmploymentType() {
        let ceiIncomeTypeValue = ceiIncomeType?.value
        if (ceiIncomeTypeValue === "Self-employment") {
            unhideElement(h4objects.annualselfemploymentcalculation.siblings, true)
            unhideElement(h4objects.incomeprojection.siblings, false)
            unhideElement(seiHoursCalcDiv, true)
            addHoursPerWeekToSelfEmployment()
        } else if (ceiIncomeTypeValue !== "Self-employment" || (!editMode && !ceiTotalIncome?.value)) {
            unhideElement(h4objects.annualselfemploymentcalculation.siblings, false)
            unhideElement(h4objects.incomeprojection.siblings, true)
            unhideElement(seiHoursCalcDiv, false)
        }
    };
    checkEmploymentType()
    let toggleEmployerAddress = createSlider({ label: "Display Employer Address", title: "Toggle displaying Employer Address labels and fields", id: "toggleEmployerAddressSlider", defaultOn: false, classes: "float-right-imp h4-line", })
    h4objects.details.h4.insertAdjacentHTML('afterend', toggleEmployerAddress)
    document.getElementById('toggleEmployerAddressSlider').addEventListener('click', ele => unhideElement(ceiAddressGroups, ele.target.checked) )
    unhideElement(ceiAddressGroups, false)
    if (editMode) {
        ceiIncomeType.addEventListener('change', changeEvent => {
            checkEmploymentType()
            if ( changeEvent.target.value === "Self-employment") { return }
            addValueClassdoChange(ceiEmpCountry, 'USA', false, true)
        })
        ifNoPersonUntabEndAndDisableChange('#memberReferenceNumberNewMember', '#ceiPaymentEnd')
    } else if (!editMode) {
        document.getElementById('earnedIncomeMemberTable').addEventListener('click', () => checkEmploymentType() );
    }
}(); // SECTION_END Case_Earned_Income;
!function __CaseExpense() {
    if (!("CaseExpense.htm").includes(thisPageNameHtm)) { return };
    h4objects.actualexpense.h4.click();
    addToFooter("https://www.ssa.gov/oact/cola/SSI.html", "RSDI Exclusion", "_blank", "", "page-specific")
    if (editMode) {
        let paymentEndDate = document.getElementById('paymentEndDate')
        ifNoPersonUntabEndAndDisableChange('#refPersonName', paymentEndDate, '#paymentChangeDate')
        paymentEndDate.addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
        })
        tempIncomes('#temporaryExpense', paymentEndDate)
    }
}(); // SECTION_END Case_Expense;
!function __CaseUnearnedIncome() {
    if (!("CaseUnearnedIncome.htm").includes(thisPageNameHtm)) { return };
    let paymentFrequency = document.getElementById('paymentFrequency'), paymentFrequencyFormGroup = paymentFrequency.closest('.form-group'), paymentChangeDate = document.getElementById('paymentChangeDate').parentElement, paymentChangeDateLabel = paymentChangeDate.previousElementSibling
    paymentFrequencyFormGroup.appendChild(paymentChangeDateLabel)
    paymentFrequencyFormGroup.insertAdjacentText('beforeend', " ")
    paymentFrequencyFormGroup.appendChild(paymentChangeDate)
    h4objects.actualincome.h4.click();
    h4objects.studentincome.h4.click();
    if (editMode) {
        let paymentEndDate = document.getElementById('paymentEndDate'), tempIncome = document.getElementById('tempIncome')
        ifNoPersonUntabEndAndDisableChange('#memberReferenceNumberNewMember', paymentEndDate, '#paymentChangeDate')
        paymentEndDate.addEventListener('keydown', keydownEvent => {
            if (keydownEvent.key === "2") { document.getElementById('paymentChangeDate').tabIndex = -1 }
        }, { once: true } )
        document.getElementById('incomeType').addEventListener('blur', blurEvent => {
            switch (blurEvent.target.value) {
                case "Unemployment Insurance":
                    document.getElementById('tempIncome').value = "Yes"
                    paymentEndDate.tabIndex = "9"
                    break;
                case "RSDI":
                case "SSI":
                    paymentFrequency.value = "Monthly"
                    document.getElementById('incomeProjectionAmountFrequency').value = "Monthly"
                    blurEvent.target.value === "RSDI" && (document.getElementById('verification').value = "Award Statement")
                    break;
            }
        })
        tempIncomes(tempIncome, paymentEndDate)
    }
    // if (!editMode) {
    //     evalData().then(({ 0: unearnedData } = {}) => {
    //     }).catch(err => { console.trace(err) });
    // }
}(); // SECTION_END Unearned_Income;
}(); // SECTION_END _Case_Income_Expense_Pages;
!function _Case_ServiceAuthorization_Copay_Pages() {
!function __CaseCopayDistribution() {
    if (!("CaseCopayDistribution.htm").includes(thisPageNameHtm)) { return };
    listPageLinksAndList([ { listPageChild: 0, listPageLinkTo: "ProviderOverview" }, ])
    if (!editMode) { return };
    waitForTableCells('#providerInformationTable').then(() => {
        let copayproviderIdVal = document.querySelector('#providerInformationTable > tbody > tr.selected > td:nth-child(1)'), overrideReason = document.getElementById('overrideReason'), recoupment = document.getElementById('recoupment'), copay = document.getElementById('copay')
        let storedCopayInfo = sessionStorage.getItem('MECH2.copayDist.' + caseIdVal + '.' + copayproviderIdVal.textContent)
        if (storedCopayInfo !== null) {
            let copayDist = sanitize.json(storedCopayInfo)
            copay.value = copayDist.copay
            recoupment.value = copayDist.recoupment
            overrideReason.value = copayDist.overrideReason
            eleFocus(gbl.eles.save)
        } else {
            addValueClassdoChange(overrideReason, 'Copay Distribution Adjustment', 'red-outline', false)
            eleFocus(copay)
        }
        gbl.eles.save.addEventListener("click", () => {
            let copayDist = {
                copay: copay.value,
                recoupment: recoupment.value,
                overrideReason: overrideReason.value,
                copayproviderIdVal: copayproviderIdVal.textContent,
            }
            sessionStorage.setItem('MECH2.copayDist.' + caseIdVal + '.' + copayDist.copayproviderIdVal, JSON.stringify(copayDist))
        })
    })
}(); // SECTION_END Case_Copay_Distribution;
!function __CaseServiceAuthorizationApproval() { // overrideReason: "Copay Distribution Adjustment"
    if (!["CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) { return };
    listPageLinksAndList([ { listPageChild: 0, listPageLinkTo: "ProviderOverview" }, ])
    evalData().then( ({ 0: versions, 1: dataByProvider } = {}) => {
        let latestVersion = versions.slice(-1)[0], previousVersion = versions.slice(-2, -1)[0]
        if ( latestVersion.version === "01 of 01" ) { return };
        !function checkForPreviousOverrides() {
            const versionWithOverrides = versions.slice(0, -1)?.find(item => item.overrideReason === "Copay Distribution Adjustment")?.version.slice(0, 1)
            if (!versionWithOverrides) { return };
            addRedTextWarning('Copay Override found in version ' + versionWithOverrides)
        }();
        async function providerEmail(billProviderId, billProviderName) {
            const providerEmailLink = await fetchHTML('/ChildCare/ProviderOverview.htm?providerId=' + billProviderId, '#contactEmailURL', 'element')
                .then(emailEle => {
                    return '<a href="mailto:' + emailEle?.children[0]?.value + '?subject=CCAP - case ' + caseIdVal + ' (authorization resumed in the ' + dateFuncs.formatDate(selectPeriodDates.start, 'mdyy') + ' period)"> ' + billProviderName + '</a>'
                })
            return providerEmailLink
        }
        !async function checkIfResumingSA() {
            if (previousVersion.dataSource !== "Eligibility Approval") { return };
            const latestVersionByProvider = dataByProvider.filter( item => item.version.slice(0, 2) === item.version.slice(-2) )
            const billingApproval = await evalData({caseProviderNumber: caseIdVal, pageName: "FinancialBillingApproval.htm", dateRange: dateFuncs.parm3date(selectPeriodDates.range), evalString: '0', caseOrProvider: 'case'})
            if (!billingApproval) { return };
            const billingEntered = latestVersionByProvider.map( item => billingApproval.find(billed => billed.totalAmountAllowed && billed.memberProviderId === item.providerId) ).filter(notEmpty => notEmpty)
            billingEntered.forEach(async bill => {
                let paymentStatus = bill.status, eBill = !!bill.submittedElectronicallyBy, billProviderName = bill.memberProviderName, billProviderId = bill.memberProviderId
                let whoToEmail = eBill ? await providerEmail(bill.memberProviderId, bill.memberProviderName) : 'the Payment Worker'
                let instructionsToWorker = eBill ? ' and inform them the SA has resumed if they need to submit a correction. Ref: ' : ' and inform them the SA has resumed so the remainder of the period can be paid. Ref: '
                addRedTextWarning('Email ' + whoToEmail + instructionsToWorker + ' <a href="FinancialBilling.htm?parm2=' + caseIdVal + '&parm3=' + dateFuncs.parm3date(selectPeriodDates.range) + '" target="_blank">Processed bill.</a>')
            })
        }();
    })
}();
!function __CaseServiceAuthorization_And_Copay() { // Hide_Duplicate_Buttons_when_no_SA
    if (!["CaseServiceAuthorizationOverview.htm", "CaseCopayDistribution.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) { return };
    if (rederrortextContent.find(arrItem => arrItem.indexOf('No results') > -1)) {
        doNotDupe.pages.push(thisPageNameHtm)
        eleFocus(gbl.eles.submitButton)
    }
    !function checkFra() {
        let fraSelect = document.getElementById('fra')
        if (fraSelect?.value?.indexOf(userCountyObj?.county) < 0) { fraSelect.classList.add('red-outline') }
    }();
}(); // SECTION_END Hide_Duplicate_Buttons_when_no_SA;
!function __CaseServiceAuthorizationApprovalPackage() {
    if (!("CaseServiceAuthorizationApprovalPackage.htm").includes(thisPageNameHtm)) { return };
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
    let status = document.getElementById('status'), providerInfoTable = document.getElementById('providerInfoTable')
    listPageLinksAndList([{listPageChild: 0, listPageLinkTo: "ProviderOverview"}])
    !function billingFormGen() {
        if ( !["169"].includes(userCountyObj?.code) ) { return };
        document.getElementById('csicTableData1')?.insertAdjacentHTML('beforebegin', ''
  + '<div style="overflow: hidden" id="billingFormDiv">'
    + '<div class="form-group" style="display: flex; gap: 15px; margin-left: 10px; align-items: center;">'
      + '<button type="button" class="cButton" tabindex="-1" id="billingForm" style="display: inline-flex;">Create Billing Form</button>'
      + '<label for="copayAmountGet" class="control-label" style="display: inline-flex;"> Copay Amount: $</label>'
      + '<input id="copayAmountGet" class="form-control" style="display: inline-flex; margin-left: -10px; width: 7.2ch; visibility: hidden;">'
      + '<button type="button" class="cButton" tabindex="-1" id="providerAddressButton" style="display: inline-flex;">Copy Provider Address</button>'
    + '</div>'
  + '</div>');
        let copayAmountManual = document.getElementById('copayAmountManual'), copayAmountGet = document.getElementById('copayAmountGet')
        status.style.width = "15ch"
        status?.closest('.col-lg-4').insertAdjacentHTML('beforeend', '<button type="button" class="cButton float-right-imp" tabindex="-1" id="copySAinfo" style="display: inline-flex;">Copy for Email</button>')
        document.getElementById('providerAddressButton')?.addEventListener('click', () => {
            let selectedProviderChildren = providerInfoTable.querySelector('.selected').children, providerIdValInTable = selectedProviderChildren[0].textContent, providerNameInTable = selectedProviderChildren[1].textContent
            evalData({ caseProviderNumber: providerIdValInTable, pageName: 'ProviderAddress.htm', evalString: '0.0', caseOrProvider: 'provider', }).then(providerAddress => {
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
            if (copayAmountGet?.value) { billingFormInfo(sanitize.number(copayAmountGet.value), destination) }
            else if (copayAmountGet.nextElementSibling.nodeName === "A") { snackBar('Enter copay manually.', 'notitle'); return undefined }
            else {
                evalData({ caseProviderNumber: caseIdVal, pageName: 'CaseCopayDistribution.htm', dateRange: selectPeriodDates.parm3, caseOrProvider: 'case', }).then(result => {
                    getCopayFromResult(result, destination)
                }).catch(err => { console.trace(err) });
            }
            function getCopayFromResult(result, destination) {
                copayAmountGet.style.visibility = "visible"
                if (!copayAmountGet?.value && !Object.keys(result).length) {
                    copayAmountGet.insertAdjacentHTML('afterend', '<a href="/ChildCare/CaseCopayDistribution.htm?parm2=' + caseIdVal + '&parm3=' + selectPeriodDates.parm3 + '" target="_blank">Copay Page</a>')
                    snackBar('Auto-retrieval of copay failed.', 'notitle')
                    return undefined
                } else {
                    let { 1: copayArray } = result
                    const providerMatch = copayArray.find(provider => {
                        let [ versionA, versionB ] = provider.version.split(' of ')
                        return (versionA === versionB) && providerNameInTable === sanitize.html(provider.providerName)
                    })
                    const copayAmt = sanitize.number(providerMatch.copay).toString()
                    copayAmountGet.value = copayAmt
                    return saFilterEvalData(copayAmt, destination)
                }
            };
            async function saFilterEvalData(copayAmount, destination) {
                evalData().then(({ 0: providers, 1: children } = {}) => {
                    const providerMatch = providers.find( saRow => providerNameInTable === sanitize.html(saRow.providerName) )
                    return billingFormInfo(children.filter( child => child.providerRowIndex === providerMatch.providerRowIndex ), copayAmount, destination)
                }).catch(err => { console.trace(err) });
            };
            function billingFormInfo(childMatches, copayAmount, destination) {
                let childList = {};
                for (let child in childMatches) {
                    let thisChild = childMatches[child]
                    childList[child] = { name: nameFuncs.commaNameReorder(thisChild.childName), authHours: thisChild.authorizedHours, ageCat0: thisChild.ageRateCategory, ageCat1: thisChild.ageRateCategory2 }
                }
                let oCaseName = nameFuncs.commaNameObject(pageTitle)
                const formInfo = {
                    pdfType: "BillingForm",
                    xNumber: countyInfo.info?.userIdNumber,
                    caseFirstName: oCaseName.first,
                    caseLastName: oCaseName.last,
                    caseName: oCaseName.full,
                    caseNumber: caseIdVal,
                    startDate: selectPeriodDates.start,
                    providerIdVal: document.querySelector('#providerInfoTable .selected td:nth-child(1)').textContent,
                    providerName: document.querySelector('#providerInfoTable .selected td:nth-child(2)').textContent,
                    copayAmount: copayAmount ?? document.getElementById('copayAmountManual').value,
                    children: childList,
                }
                if (destination === "billingForm") { window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?parm1=" + encodeURIComponent(JSON.stringify(formInfo)), "_blank") }
                // if (destination === "billingForm") { window.open("http://nt-webster/slcportal/Portals/65/Divisions/FAD/IM/CCAP/index.html?" + new URLSearchParams(formInfo).toString(), "_blank") } // would have to rework childList as objects don't work //
                else if (destination === "clipboard") {
                    let childInfoArray = [formInfo.caseName + " - CCAP case number: " + formInfo.caseNumber + "\n", "Copayment for biweekly period " + selectPeriodDates.range + ": $" + formInfo.copayAmount]
                    for (let child in formInfo.children) {
                        childInfoArray.splice(-1, 0, ["Child: " + formInfo.children[child].name, "Authorized Hours: " + formInfo.children[child].authHours, "Age Category: " + (formInfo.children[child].ageCat0 || formInfo.children[child].ageCat1), "Authorization Start Date: " + childMatches[child].saBegin].join(",  "),
                                              ["Max Rates: Hourly: $" + (childMatches[child].hourly || childMatches[child].hourly2) + ", Daily: $" + (childMatches[child].daily || childMatches[child].daily2) + ", Weekly: $" + (childMatches[child].weekly || childMatches[child].weekly2), "Provider Primary/Secondary Designation: " + (childMatches[child].providerDesignation || childMatches[child].providerDesignation2) + "\n"].join(",  ") )
                    }
                    let joinedChildInfoArray = childInfoArray.join("\n")
                    navigator.clipboard.writeText(joinedChildInfoArray)
                    snackBar('Copied Service Authorization Info!', 'notitle')
                }
            };
        }
    }();
}(); // SECTION_END Case SA_Overview Fill_manual_Billing_Forms;
}();
!function CaseMember() {
    if (!("CaseMember.htm").includes(thisPageNameHtm) || !caseIdVal) { return }
    let memberReferenceNumberLabel = document.querySelector('label[for="memberReferenceNumber"]'), memberBirthDate = document.getElementById('memberBirthDate')
    memberReferenceNumberLabel.onclick = () => void window.open('/ChildCare/CaseMemberHistory.htm?parm2=' + caseIdVal, '_blank')
    memberReferenceNumberLabel.style.cursor = "pointer"
    memberBirthDate?.insertAdjacentHTML('afterend', '<div style="display: inline-block; margin-left: 15px;" id="birthMonths">')
    let today = new Date(), firstDateOfPeriod = new Date(selectPeriodDates.start), birthMonths = document.getElementById('birthMonths')
    let caseMemberTable = document.getElementById('caseMemberTable'), caseMemberTableChildren = caseMemberTable?.children[1]?.children
    function determineAge({ determinationDate, memberAge, birthDate } = {}) {
        let plusAge = memberAge?.includes("+") ? '+' : ''
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
            if (!memberData[member].memberBirthDate || parseInt(memberAge) > 5) { continue };
            let memberTableAgeCell = caseMemberTableChildren[member].children[2]
            let birthDate = memberData[member].memberBirthDate
            memberTableAgeCell.textContent = determineAge({ determinationDate: firstDateOfPeriod, memberAge, birthDate})
            memberObject[memberData[member].memberReferenceNumber] = determineAge({ determinationDate: today, birthDate })
        }
        document.querySelector('table > thead > tr > td:nth-child(3)').textContent = "Age (BWP start)"
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
                memberSsnVerification: { id: "memberSsnVerification", value: "SSN Not Provided", class: "red-outline", doChange: false, },
                memberBirthDateVerification: { id: "memberBirthDateVerification", value: "No Verification Provided", class: "red-outline", doChange: false, },
                memberIdVerification: { id: "memberIdVerification", value: "No Verification Provided", class: "red-outline", doChange: false, },
                memberKnownRace: { id: "memberKnownRace", value: "No", class: "red-outline", doChange: true, },
                memberSpokenLanguage: { id: "memberSpokenLanguage", value: "English", class: "red-outline", doChange: true, },
                memberWrittenLanguage: { id: "memberWrittenLanguage", value: "English", class: "red-outline", doChange: true, },
                memberNeedsInterpreter: { id: "memberNeedsInterpreter", value: "No", class: "red-outline", doChange: false, },
            }
            for (let memberData in memberFillData) {
                let member = memberFillData[memberData];
                let memberDataField = document.getElementById(member.id)
                !memberDataField.value && addValueClassdoChange(memberDataField, member.value, member.class, member.doChange)
            }
            if (membRefNum.value > 2 && membRefNum.value < 11 && dateFuncs.getMonthDifference(today, document.getElementById('memberBirthDate').value) < 216) { // Younger than 18, within typical child member ref #s;
                let memberRelationshipToApplicant = document.getElementById('memberRelationshipToApplicant')
                if (!memberRelationshipToApplicant.value) { addValueClassdoChange(memberRelationshipToApplicant, "Child", "red-outline", true) }
            }
            let arrivalDate = document.querySelector('#arrivalDate:not(:disabled)')
            arrivalDate && addValueClassdoChange(arrivalDate, "", 'red-outline', false)
        }
        fillMemberData()
    }
}(); // SECTION_END Case_Member;
!function CaseMemberII() {
    if (!("CaseMemberII.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    !function memberIIeditMode() {
        if (!editMode || appModeNotEdit) { return };
        let memberMaritalStatus = document.getElementById('memberMaritalStatus'), memberCitizenshipVerification = document.getElementById('memberCitizenshipVerification'), memberSpouseReferenceNumber = document.getElementById('memberSpouseReferenceNumber'), membRef = document.getElementById('memberReferenceNumberNewMember')
        function fillMemberIIDataForChildren() {
            membRef ??= document.querySelector('table > tbody > tr.selected > td:nth-child(1)')
            let membRefNum = membRef.nodeName === "SELECT" ? parseInt(membRef.value) : parseInt(membRef.textContent)
            if ( isNaN(membRefNum) || membRefNum < 3 || membRefNum > 9 ) { return };
            const memberiiFillDataForChildren = {
                memberMaritalStatus: { id: "memberMaritalStatus", value: "Never Married", class: 'red-outline', doChange: true, },
                memberLastGradeCompleted : { id: "memberLastGradeCompleted", value: "Pre-First Grade or Never Attended", class: 'red-outline', doChange: false },
                memberUSCitizen : { id: 'memberUSCitizen', value: "Yes", class: 'red-outline', doChange: true },
                memberCitizenshipVerification : { id: 'memberCitizenshipVerification', value: "No Verification Provided", class: 'red-outline', doChange: false },
            }
            for (let memberFillData in memberiiFillDataForChildren) {
                let member = memberiiFillDataForChildren[memberFillData];
                let memberDataField = document.getElementById(member.id);
                !memberDataField.value && addValueClassdoChange(memberDataField, member.value, member.class, member.doChange);
            };
            memberSpouseReferenceNumber.tabIndex = '-1'
            eleFocus(memberCitizenshipVerification)
        }
        fillMemberIIDataForChildren()
        membRef?.addEventListener('blur', fillMemberIIDataForChildren)
    }();
    evalData().then(({ 0: memberData } = {}) => {
        let caseMemberTableChildren = document.querySelector('#memberIITable > tbody').children
        let memberDataObject = {
            memberUSCitizen: { label: 'Cit/Imm', keywords: ["", "Unknown", ], requiredFunc(membObj) { return membObj.memberAge.replace(/\D/g, '') < 15 }},
            memberCitizenshipVerification: { label: 'Cit Ver', keywords: ["No Verification Provided", "", ], requiredFunc(membObj) { return membObj.memberAge.replace(/\D/g, '') < 15 }},
            memberMaritalStatus: { label: 'Marr', keywords: [""], },
        }
        checkTablesForBlankOrNo(memberData, memberDataObject, caseMemberTableChildren)
    }).catch(err => { console.trace(err) })
}(); // SECTION_END Case_Member_II;
!function CaseNotes() { // =====================================================================================================================================;
    if (["ProviderNotes.htm"].includes(thisPageNameHtm)) { restyleCreated(); doNotDupe.buttons.push('#changeType', '#search', '#reset', '#storage'); return };
    if (!["CaseNotes.htm"].includes(thisPageNameHtm)) { return };
    doNotDupe.buttons.push('#changeType', '#search', '#reset', '#storage')
    let noteCategory = document.getElementById('noteCategory'), noteSummary = document.getElementById('noteSummary'), noteStringText = document.getElementById('noteStringText'), noteMemberReferenceNumber = document.getElementById('noteMemberReferenceNumber'), newButton = document.getElementById('new')
    let caseNotesTableTbody = document.querySelector('table#caseNotesTable > tbody'), notesTableNoRecords = caseNotesTableTbody?.firstElementChild.textContent === "No records found" ? 1 : 0
    let noteTable = document.querySelector('.dataTables_scrollBody'), noteTableStyle = editMode ? "line-height:24px; overflow: auto; max-height: 4lh !important;" : "line-height:24px; overflow: auto; max-height: 7lh !important;"
    noteCategory?.removeAttribute('onchange')
    noteTable && (document.querySelector('.dataTables_scrollBody').setAttribute('style', noteTableStyle))
    editMode && unhideElement(document.querySelector('div.form-group:has(#noteArchiveType)'), false)
    function restyleCreated() { // Case_Notes_and_Provider_Notes_layout_fix
        document.getElementById('noteCreateDate')?.closest('div.panel-box-format').classList.add('hidden')
        let noteCreatorChildren = [...document.querySelector('label[for=noteCreator]')?.parentElement.children], noteSummaryRow = document.getElementById('noteSummary')?.closest('.row')
        noteCreatorChildren.forEach(ele => noteSummaryRow.append(ele))
        tabIndxNegOne('#noteArchiveType, #noteSearchStringText, #noteImportant #noteCreator')
    }
    document.addEventListener('paste', pasteEventAHK )
    function pasteEventAHK(event) { //pasted from AHK
        let pastedText = (event.clipboardData || window.clipboardData).getData("text")
        if (pastedText.indexOf("FromAHKJSON") < 0) { return };
        event.preventDefault()
        event.stopImmediatePropagation()
        if (!editMode) {
            noteSummary.value = "Click the 'New' button first 🡇"
            noteStringText.value = "Click the 'New' button first 🡇"
            document.getElementById('noteCreator').value = "X1D10T"
            flashRedOutline(newButton)
            return
        } else {
            const noteCategoryObj = {
                Application: { pends: " Incomplete", elig: " Approved", ineligible: "" },
                Redetermination: { incomplete: " Incomplete", elig: " Complete", ineligible: "" }
            }
            let ahkObj = convertFromAHK(pastedText)
            let noteCategoryRegExp = new RegExp(ahkObj.noteDocType + "(?:.*?)" + noteCategoryObj[ahkObj.noteDocType][ahkObj.noteElig], "i")
            noteCategory.value = [...document.getElementById('noteCategory').children]?.find( ele => ele.innerText.match(noteCategoryRegExp) ).value
            // noteCategory.value = noteDetails.noteElig === '' ? noteDetails.noteDocType : noteDetails.noteDocType + noteCategoryObj[noteDetails.noteDocType][noteDetails.noteElig]
            noteSummary.value = decodeURIComponent(ahkObj.noteTitle)
            noteStringText.value = decodeURIComponent(ahkObj.noteText)
            eleFocus(gbl.eles.save)
        }
    }
    let noteInfo = localStorage.getItem("MECH2.note") !== null ? sanitize.json(localStorage.getItem("MECH2.note"))[caseOrproviderIdVal] : undefined
    evalData().then( ({ 0: notesTableData} = []) => {
        if (notesTableData === undefined) { return };
        if (noteInfo) {
            !function doAutoNote() { // Auto_Case_Noting
                if (!editMode) {
                    !function checkForDuplicates() {
                        let continueToMakeNote = 1
                        let firstTenAlerts = notesTableData.slice(0, 10)
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
                                    let noteInfocaseIdVal = {}
                                    noteInfocaseIdVal[caseOrproviderIdVal] = noteInfo
                                    localStorage.setItem( "MECH2.note", JSON.stringify(noteInfocaseIdVal) )
                                    doClick(newButton)
                                })
                                restyleCreated()
                            }
                        })
                        continueToMakeNote && doClick(newButton)
                    }();
                    return;
                } else if (editMode) {
                    let userNameTitle = countyInfo.userSettings?.promptUserNameTitle ? countyInfo.info?.inputUserNameTitle : ""
                    // document.querySelector('option[value="Application Incomplete"]')?.insertAdjacentHTML('afterend', '<option value="Application">Application</option><option value="Child Support Note">Child Support Note</option>');
                    // document.querySelector('option[value="Reinstatement"]')?.insertAdjacentHTML('beforebegin', '<option value="Redetermination">Redetermination</option>');
                    let signatureName, workerName = countyInfo.info?.userName
                    if (["CaseNotes.htm"].includes(thisPageNameHtm)) {
                        if (noteInfo.xNumber) { signatureName = document.getElementById('noteCreator').value.toLowerCase() === noteInfo.xNumber ? countyInfo.info?.userName + userNameTitle : countyInfo.info?.userName + userNameTitle + " for " + noteInfo.worker }
                        else { signatureName = countyInfo.info?.userName + userNameTitle }
                    }
                    setTimeout(() => {
                        if (noteInfo.intendedPerson) {
                            noteMemberReferenceNumber.value = [...document.querySelectorAll('#noteMemberReferenceNumber > option')]?.find( ele => ele.innerText.includes(noteInfo.intendedPerson.toUpperCase()) )?.value
                        }
                        noteCategory.value = noteInfo.noteCategory
                        noteSummary.value = noteInfo.noteSummary
                        noteStringText.value = noteInfo.noteMessage + "\n=====\n" + signatureName
                        localStorage.removeItem("MECH2.note")
                        gbl.eles.save.click()
                    }, 50)
                }
            }(); // END Auto_Case_Noting
        } else if (!noteInfo) {
            restyleCreated()
            secondaryActionArea.style.justifyContent = "flex-start"
            secondaryActionArea.style.gap = "60px"
            noteCategory.addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName === "OPTION") {
                    noteSummary.focus()
                    noteSummary.setSelectionRange(50, 50)
                }
            })
            !function duplicateNote() { // SECTION_START Duplicate_Note
                let storedNoteDetails = sanitize.json(localStorage.getItem("MECH2.storedNote")) ?? {}, storedNoteExists = "noteCategory" in storedNoteDetails ? 1 : 0
                if (!storedNoteExists || storedNoteDetails?.noteSummary?.trim() === noteSummary?.value?.trim()) { localStorage.removeItem("MECH2.storedNote"); storedNoteExists = 0 }
                if (!editMode) {
                    let storedNoteInfoHTML = storedNoteExists ? '<div id="unsavedNoteDiv" style="display: flex; align-items: center; gap: 5px;"><span style="margin-left: 10px;" title="' + storedNoteDetails.noteSummary + '">Unsaved note exists for case</span><a target="_self" href="/ChildCare/CaseNotes.htm?parm2=' + storedNoteDetails.identifier + '">'+ storedNoteDetails.identifier +'</a><span id="deleteUnsaved" style="cursor: pointer; color: red !important; padding-bottom: 2px;">✖</span></div>' : ''
                    tertiaryActionArea?.insertAdjacentHTML('afterbegin', '<button type="button" id="duplicate" class="form-button">Duplicate</button> ' + storedNoteInfoHTML)
                    document.getElementById('deleteUnsaved')?.addEventListener('click', () => { localStorage.removeItem("MECH2.storedNote"); document.getElementById('unsavedNoteDiv').remove() }, { once: true })
                    document.getElementById('duplicate')?.addEventListener('click', copyNoteToLS)
                    function copyNoteToLS() {
                        let selectedLength = document.getElementsByClassName('selected')?.length
                        if (noteCategory?.value && selectedLength) {
                            localStorage.setItem("MECH2.copiedNote", JSON.stringify( getNoteDetails() ))
                            snackBar('Copied note!', 'notitle')
                        } else if (!selectedLength) { snackBar('No note selected') }
                        eleFocus("#newDB")
                    }
                } else if (editMode) {
                    window.addEventListener('beforeunload', getDetailsStoreInLS)
                    document.getElementById('cancel')?.addEventListener('click', () => window.removeEventListener('beforeunload', getDetailsStoreInLS) )
                    if (noteStringText.value) { noteStringText.value = convertLineBreakToSpace(noteStringText.value) }
                    let noteDetails = sanitize.json(localStorage.getItem("MECH2.copiedNote")) ?? {}, noteDetailsExists = "noteCategory" in noteDetails ? 1 : 0
                    if (!noteDetailsExists && !storedNoteExists) { return };
                    //
                    let noteCategorySplit0 = noteDetails.noteCategory.split(' ')[0]
                    if (noteDetailsExists && ["Application", "Redetermination" ].includes(noteCategorySplit0)) { noteDetails.noteSummary = noteCategorySplit0 + " update"; noteDetails.noteCategory = noteCategorySplit0 + " Incomplete" }
                    let autofillButton = noteDetailsExists ? '<button type="button" id="autofill" class="form-button">Autofill</button>' : '', storedNoteButton = storedNoteExists ? '<button type="button" id="storedNote" class="form-button">Stored Note</button>' : ''
                    tertiaryActionArea?.insertAdjacentHTML('afterbegin', autofillButton + storedNoteButton)
                    tertiaryActionArea?.addEventListener('click', clickEvent => {
                        if (clickEvent.target.nodeName !== "BUTTON" || noteCategory?.value) { return };
                        let selectedNoteDetails = clickEvent.target.id === "autofill" ? noteDetails : storedNoteDetails
                        fillNoteDetails(selectedNoteDetails)
                    })
                    gbl.eles.save?.addEventListener('click', function() { localStorage.removeItem('MECH2.storedNote') })
                    function getDetailsStoreInLS() { if (noteCategory?.value === '') { return }; localStorage.setItem('MECH2.storedNote', JSON.stringify( getNoteDetails() )) };
                }
                function getNoteDetails() { return { noteSummary: noteSummary.value, noteCategory: noteCategory.value, noteMessage: noteStringText.value, noteMemberReferenceNumber: noteMemberReferenceNumber.value, identifier: caseOrproviderIdVal, }; };
                function fillNoteDetails(noteDetails) {
                    noteSummary.value = noteDetails.noteSummary
                    noteCategory.value = noteDetails.noteCategory
                    noteMemberReferenceNumber.value = noteDetails.noteMemberReferenceNumber
                    noteStringText.value = convertLineBreakToSpace(noteDetails.noteMessage)
                    eleFocus(noteStringText)
                    noteStringText.setSelectionRange(0, 0)
                };
            }(); // End Duplicate_Note
            !function caseNotes() { // SECTION_START Case_Notes_Only
                if (!caseIdVal) { return };
                if (editMode && !notesTableNoRecords) {
                    document.querySelector('option[value="Application Incomplete"]')?.insertAdjacentHTML('afterend', '<option value="Child Support Note">Child Support Note</option>');
                    document.querySelector('option[value="Reinstatement"]')?.insertAdjacentHTML('beforebegin', '<option value="Redetermination">Redetermination</option>');
                    let autoFormatSlider = createSlider({ label: "Auto-Formatting", title: "Auto-Format Note text when pasting and saving.", id: "autoFormat", defaultOn: true, classes: "float-right-imp h4-line", })
                    h4objects.note.h4.insertAdjacentHTML('afterend', autoFormatSlider)
                    let autoFormat = document.getElementById('autoFormat')
                    gbl.eles.save.addEventListener('click', () => { // fixing spacing around titles;
                        if (!autoFormat.checked) { return }
                        noteStringText.value = noteStringText.value.replace(/\:\,/g, ': ,').replace(/^( {0,6}[A-Z ]{2,8}: *)/gm, (wholeMatch, captured1) => captured1.trim().padStart(9, ' ').padEnd(13, ' ') ) // Spacing around categories;
                    })
                    noteStringText.addEventListener('paste', pasteEvent => {
                        if (!autoFormat.checked) { return }
                        let pastedText = (pasteEvent.clipboardData || window.clipboardData).getData("text")
                        let formattedPastedText = convertLineBreakToSpace(pastedText)
                        .replace(/([a-z0-9]+)(\()/gi, "$1 $2").replace(/([a-z]+)([0-9]+)/gi, "$1 $2").replace(/(\))([a-z0-9]+)/gi, "$1 $2") //Spaces around parentheses;
                        .replace(/\u0009/g, "    ") //excel "tab"
                        .replace(/^\n+/g, "\n")//Multiple new lines to single new line;
                        if (pastedText !== formattedPastedText) {
                            pasteEvent.preventDefault()
                            insertTextAndMoveCursor(formattedPastedText)
                        }
                    })
                    noteStringText.addEventListener('keydown', keydownEvent => {
                        if (keydownEvent.key !== "Tab" || keydownEvent.shiftKey) { return };
                        keydownEvent.preventDefault()
                        let preceedingCharacter = noteStringText.value.charAt(noteStringText.selectionStart-1)
                        insertTextAndMoveCursor( ["", "\n"].includes(preceedingCharacter) ? "             " : "    " )
                    })
                }
                !function autoStoreNotes() {
                    if (editMode) { return };
                    let notesTableDataLength = notesTableData.length
                    !function hideMergeDisbursed() {
                        let hiddenTrCount = 0 //Hiding PMI/SMI Merge and Disbursed Child Care Support Payment rows in the first 100 entries;
                        if (!notesTableDataLength) { return };
                        notesTableData.slice(0, 100).forEach(note => {
                            if ( note.noteSummary.indexOf("Disbursed child care") > -1 || note.noteCategory === "PMI/SMI Merge" ) {
                                hiddenTrCount++
                                caseNotesTableTbody.children[note.rowIndex].classList.add('hiddenRow')
                            }
                        })
                        if (!hiddenTrCount) { return };
                        const invisEle = document.createElement('div')
                        let noteStyle = cssStyle()
                        noteStyle.replaceSync(doTableStyleToggle(invisEle, 'hiddenRow') + " .hiddenRow { display: none !important; }" );
                        caseNotesTableTbody.parentElement.classList.add('toggledTable')
                        let unhideElementCaseNotes = createSlider({ label: 'Show ' + hiddenTrCount + ' Hidden Notes', title: "Shows or hides PMI Merge and CS disbursion auto-notes.", id: 'unhideElementCaseNotes', defaultOn: false, classes: 'float-right-imp h4-line', })
                        document.getElementById('reset').insertAdjacentHTML('afterend', unhideElementCaseNotes)
                        let toggleRule = doTableStyleToggle(invisEle, 'hiddenRow')
                        document.getElementById('unhideElementCaseNotes').addEventListener('click', clickEvent => {
                            clickEvent.target.checked === true ? noteStyle.replaceSync(toggleRule + " .hiddenRow { display: table-row; }") : noteStyle.replaceSync(toggleRule + " .hiddenRow { display: none; }")
                        })
                        queueMicrotask(() => { document.querySelector('tbody > tr:not(.hiddenRow)')?.click() })
                    }();
                    function autoStoreEscapeToStop(keydownEvent) {
                        if (keydownEvent.key === "Escape") {
                            sessionStorage.removeItem('MECH2.storeOldNotes.' + caseIdVal)
                            sessionStorage.removeItem('MECH2.storePMIandCSnotes.' + caseIdVal)
                            window.removeEventListener('keydown', autoStoreEscapeToStop)
                        }
                    };
                    !function autoStoreOldNotes() {
                        if (!notesTableDataLength || document.getElementById('noteArchiveType').value !== "Current") { return };
                        let autoStoreNotes = sessionStorage.getItem('MECH2.storeOldNotes.' + caseIdVal) ?? false;
                        let nextStorableNoteRow = function() {
                            for (let i = notesTableDataLength; i--; i > 0) {
                                if (![ "Redetermination", "Application", "Appeal", "Special Needs", ].includes(notesTableData[i].noteCategory) && !notesTableData[i].noteImportant) { return i }
                            }
                        }();
                        if (!nextStorableNoteRow) { return };
                        let nextStorableNote = notesTableData[nextStorableNoteRow]
                        let today = Date.now(), tenYearsAgo = today - 315670320999
                        let lastNoteIsOld = Date.parse(nextStorableNote.noteCreateDate) < tenYearsAgo ? 1 : 0;
                        if (autoStoreNotes) {
                            if (!lastNoteIsOld) { sessionStorage.removeItem('MECH2.storeOldNotes.' + caseIdVal) }
                            else { window.addEventListener('keydown', autoStoreEscapeToStop); document.querySelector('tbody').rows[nextStorableNoteRow].click(); document.getElementById('storage').click() }
                        } else {
                            if (lastNoteIsOld) {
                                document.getElementById('notesActionsArea').children[0].setAttribute('class', 'col-lg-12 textInherit')
                                document.getElementById('storage').insertAdjacentHTML('afterend', '<button id="autoStorage" class="form-button" title="Archives eligible old (10 years+) notes." type="button">Auto-Store Old</button>')
                                document.getElementById('autoStorage').addEventListener('click', () => {
                                    sessionStorage.setItem('MECH2.storeOldNotes.' + caseIdVal, true)
                                    document.querySelector('tbody').rows[nextStorableNoteRow].click()
                                    document.getElementById('storage').click()
                                })
                            }
                        }
                    }();
                    !function autoStoreHiddenNotes() {
                        if (!notesTableDataLength || document.getElementById('noteArchiveType').value !== "Current") { return };
                        let autoStoreNotes = sessionStorage.getItem('MECH2.storePMIandCSnotes.' + caseIdVal) ?? false;
                        let nextStorableNoteRow = function() {
                            for (let i = notesTableDataLength; i--; i > 0) {
                                if ( [ "Child Support Note", "PMI/SMI Merge" ].includes(notesTableData[i].noteCategory) && ["Disbursed child care", "A PMI merge was comp"].includes(notesTableData[i].noteSummary.slice(20)) ) { return i }
                            }
                        }() ?? 0;
                        if (!nextStorableNoteRow) { return };
                        let nextStorableNote = notesTableData[nextStorableNoteRow]
                        let today = Date.now(), sixMonthsAgo = today - 15865482466
                        let isNoteStorable = Date.parse(nextStorableNote.noteCreateDate) < sixMonthsAgo ? 1 : 0;
                        if (autoStoreNotes) {
                            if (!isNoteStorable) { sessionStorage.removeItem('MECH2.storePMIandCSnotes.' + caseIdVal) }
                            else { window.addEventListener('keydown', autoStoreEscapeToStop); document.querySelector('tbody').rows[nextStorableNoteRow].click(); document.getElementById('storage').click() }
                        } else {
                            if (isNoteStorable) {
                                document.getElementById('notesActionsArea').children[0].setAttribute('class', 'col-lg-12 textInherit')
                                document.getElementById('storage').insertAdjacentHTML('afterend', '<button id="autoStorage" class="form-button" title="Archives old (6mo+) CS Payment and PMI Merge notes." type="button">Auto-Store Merge/CS</button>')
                                document.getElementById('autoStorage').addEventListener('click', () => {
                                    sessionStorage.setItem('MECH2.storePMIandCSnotes.' + caseIdVal, true)
                                    document.querySelector('tbody').rows[nextStorableNoteRow].click()
                                    document.getElementById('storage').click()
                                })
                            }
                        }
                    }();
                }();
            }(); // SECTION_END Case_Notes_Only
        }
    }).catch(err => { console.trace(err) });
}(); // SECTION_END _Notes__CaseNotes_ProviderNotes (major_subsection) ===============================================================================;
!function CaseOverview() {
    if (!("CaseOverview.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    $('#participantInformationData').DataTable().order([1, 'asc']).draw() // jQuery table sort order
    let redetLabel = document.querySelectorAll('div.visible-lg > label[for=servicingAgency]')[1], redetDate = redetLabel?.parentElement.nextElementSibling?.nextElementSibling?.innerText
    if (redetDate) {
        gbl.eles.submitButton.insertAdjacentHTML('afterend', '<button type="button" id="copyFollowUpButton" class="cButton afterH4" tabindex="-1">Redet Follow Up Date</button>');
        document.getElementById('copyFollowUpButton').addEventListener('click', () => {
            let redetPlus = dateFuncs.formatDate( dateFuncs.addDays(redetDate, 44), "mmddyyyy")
            copy(redetPlus, redetPlus, 'notitle')
        });
    }
    let programInformationData = document.getElementById('programInformationData')
    waitForElmHeight('#programInformationData > tbody > tr > td').then(() => {
        let programInformationDataTbody = programInformationData?.querySelector('tbody'), programInformationTrows = [...programInformationDataTbody?.children] || [], trLength = programInformationTrows.length
        let hcWbTrs = programInformationTrows.filter( ele => ["HC", "WB"].includes(ele.firstElementChild?.innerText) )
        let stickyTrs = programInformationTrows.filter( ele => ["MFIP", "DWP", "FS"].includes(ele.firstElementChild?.innerText) )
        if (stickyTrs.length && hcWbTrs.length) {
            hcWbTrs.forEach(ele => { stickyTrs[0].insertAdjacentElement('beforebegin', ele) })
            programInformationData?.classList.add('toggleTable')
        }
        if (programInformationTrows.length > 16) {
            programInformationTrows.slice(17).forEach(ele => {
                if (stickyTrs.includes(ele)) { return };
                ele.classList.add('hiddenRow')
            })
            programInformationData?.classList.add('toggledTable')
            let overviewStyle = cssStyle()
            const invisEle = document.createElement('div')
            overviewStyle.replaceSync(doTableStyleToggle(invisEle, 'hiddenRow') + " .hiddenRow { display: none !important; }" );
            let unhideElementProgInfo = createSlider({ label: 'Show hidden rows', title: "Shows or hides rows exceeding 20, including all 'HC' / 'WB' rows.", id: 'unhideElementProgInfo', defaultOn: false, classes: 'float-right-imp h4-line' }) // Reported Firefox bug: sticky rows > 20 break sticky.
            h4objects.programinformation.h4.insertAdjacentHTML('afterend', unhideElementProgInfo)
            let nothiddenTrCountLength = programInformationTrows.filter( ele => !ele.classList.contains('hiddenRow') ).length
            document.getElementById('unhideElementProgInfo').addEventListener('click', clickEvent => {
                let toggleRule = doTableStyleToggle(invisEle, 'hiddenRow')
                if (clickEvent.target.checked === true) {
                    overviewStyle.replaceSync(toggleRule + " .hiddenRow { display: table-row; }")
                    calculateAndSetBottomHeight(programInformationData, trLength, stickyTrs)
                } else {
                    overviewStyle.replaceSync(toggleRule + " .hiddenRow { display: none; }")
                    calculateAndSetBottomHeight(programInformationData, nothiddenTrCountLength, stickyTrs)
                }
            })
            calculateAndSetBottomHeight(programInformationData, nothiddenTrCountLength, stickyTrs);
            setTimeout(() => { programInformationDataTbody.style.scrollSnapAlign = "start" }, 500)
        } else { calculateAndSetBottomHeight(programInformationData, trLength, stickyTrs) }
    });
    function calculateAndSetBottomHeight(tableElement, tableRowCount, elementQuery) {
        tableElement = sanitize.query(tableElement)
        elementQuery = Array.isArray(elementQuery) ? elementQuery : sanitize.query(elementQuery)
        let bottomHeights = [...elementQuery].reverse().forEach((ele, index) => { ele.classList.add('stickyRow'); ele.style.bottom = index + 'lh' });
    };
    let personInformationData = document.querySelector('#personInformationData_wrapper table > tbody'), providerInformationData = document.querySelector('#providerInformationData > tbody')
    personInformationData?.addEventListener('click', () => {
        let providerTableTr = providerInformationData.children
        let addLinksToProviders = [...providerTableTr].forEach(ele => {
            if (!ele.children[1]) { return };
            let childTd = ele.firstElementChild
            childTd.innerHTML = '<a href="ProviderOverview.htm?providerId=' + childTd.textContent + '" target="_blank">' + childTd.textContent + '</a>'
        })
    })
}(); // SECTION_END Case_Overview;
!function CasePageSummary() {
    if (!("CasePageSummary.htm").includes(thisPageNameHtm)) { return };
    let wrapUpDropDown = document.querySelector('[id="Wrap Up"] > a')
    if (wrapUpDropDown && !wrapUpDropDown.classList.contains('disabled_lightgray') ) {
        gbl.eles.submitButton.insertAdjacentHTML('afterend', '<a href="/ChildCare/CaseWrapUp.htm?parm2=' + caseIdVal + '&parm3=' + selectPeriodDates.parm3 + '"> <input class="form-button" type="button" name="wrapUp" id="wrapUp" value="Wrap-Up" title="Wrap-Up"></a>')
        doNotDupe.buttons.push('#wrapUp')
    }
}(); // SECTION_END Case_Page_Summary;
!function CaseParent() {
    if (!("CaseParent.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
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
                caseMemberTableChildren[member.rowIndex].firstElementChild.insertAdjacentHTML('beforeend', '<span class="float-right-imp" style="color: var(--textColorNegative);">' + noResponses + '</span>')
            }
        })
    }).catch(err => { console.trace(err) });
}(); // SECTION_END Case_Parent;
!function CasePaymentHistory() {
    if (!("CasePaymentHistory.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    !function renameTableHeaders() {
        document.querySelectorAll('#paymentHistoryTable thead tr td')?.forEach(ele => { ele.textContent = '' })
        let theadChildren = document.querySelector('#paymentHistoryTable_wrapper .dataTables_scrollHeadInner thead tr')?.children
        if (!theadChildren) { return };
        let theadRename = [[1, "Transact ID"], [4, "Recoup"], [7, "Payment"], [8, "Type"]].forEach(([child, newText] = []) => { theadChildren[child].textContent = newText })
        }();
    document.querySelectorAll('#paymentHistoryTable > tbody > tr > td:nth-of-type(3)')?.forEach(ele => {
        ele.innerHTML = '<td><a href="FinancialBilling.htm?parm2=' + caseIdVal + '&parm3=' + ele.innerText.replace(/ - |\//g, "") + '", target="_blank">' + ele.innerText + '</a></td>'
    });
    let providerTableList = new Set(), childTableList = new Set()
    let getPaymentHTML = ''
    + '<select style="width: fit-content;" class="form-control" id="filterProvider"><option value>Provider Filter...</option></select>'
    + '<select style="width: fit-content;" class="form-control" id="filterChild"><option value>Child Filter...</option></select>'
    + '<button class="form-button" type="button" id="sendPaymentInfoToCB">Copy Payments</button>'
    tertiaryActionArea?.insertAdjacentHTML('afterbegin', getPaymentHTML)
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
            const childPaymentTableArray = [], providerPaymentTableArray = [], childDatesArray = [], providerDateArray = []
            let selectedChild = selectionChild?.value
            if (selectedChild) {
                concatPaymentHTML.childsProviderSetList = new Set()
                let childNameProper = nameFuncs.commaNameReorder(selectionChild?.value)
                childResult.forEach(thisRow => {
                    let correspondingTableOneRow = providerResult[thisRow.rowIndex2]
                    if (thisRow.childName !== selectedChild || (providerName && !!(correspondingTableOneRow.providerName !== providerName))) { return }
                    concatPaymentHTML.childsProviderSetList.add(correspondingTableOneRow.providerName)
                    concatPaymentHTML.childPaymentsTotal += sanitize.number(thisRow.amount) * 100
                    if (childDatesArray.includes(correspondingTableOneRow.billingPeriod)) { // in case of supplemental payments //
                        let childMatch = childPaymentTableArray.find(cptaArr => cptaArr[0] === correspondingTableOneRow.billingPeriod);
                        if (childMatch[1] === correspondingTableOneRow.providerName) {
                            childMatch[2] = numberFuncs.toUSD(sanitize.number(childMatch[2]) + sanitize.number(thisRow.amount) )
                            return;
                        }
                    }
                    childPaymentTableArray.push([ correspondingTableOneRow.billingPeriod, correspondingTableOneRow.providerName, thisRow.amount, thisRow.childName, ])
                    childDatesArray.push(correspondingTableOneRow.billingPeriod)
                })
                let childPaymentTableHeaderHTML = "<thead><tr><td>Care Period</td><td>Provider</td><td>Pre-Copay $</td><td>Child</td></tr></thead>"
                childPaymentTableArray.sort( (a, b) => Date.parse(b) > Date.parse(a) )
                let childPaymentTbodyHTML = childPaymentTableArray.map(trow => '<tr><td>' + trow.join('</td><td>') + '</td></tr>').join('')
                concatPaymentHTML.childTable = [ '<br><div class="marginBottom">Payment filter applied to table below. Child filter selected: ', childNameProper, '.</div><table class="marginBottom">', childPaymentTableHeaderHTML, childPaymentTbodyHTML, '</table>' ].join('')
                let childAmountsTotalCurrency = numberFuncs.toUSD( (concatPaymentHTML.childPaymentsTotal / 100) )
                concatPaymentHTML.footer = "<div>Filtered pre-Copay amounts total: " + childAmountsTotalCurrency + ".</div><div>(Pre-Copay $ means the payment amount calculated for the child prior to deducting the household's copay from the provider payment.)</div>"
            }
            let providerNameList = providerName.length ? [providerName]
            : concatPaymentHTML.childsProviderSetList?.size ? [...concatPaymentHTML.childsProviderSetList]
            : providerTableList
            concatPaymentHTML.style = '<style>table { border: 2px solid green !important; font-size: 24px; white-space: nowrap; table-layout: fixed; } table td { padding: 2px 20px; } table thead td { font-weight: 700; background: #07416f; color: white; } table tbody td { color: black; background: white; } .marginBottom { margin-bottom: 10px; }</style>'
            concatPaymentHTML.tableOneText = [ '<div class="marginBottom" id="casePaymentTitle"><span>', caseName, ' - ', caseIdVal, ' - CCAP payments from ', paymentPeriodBegin.value, ' to ', paymentPeriodEnd.value, '. </span>' ].join('')
            providerNameList.forEach(provider => {
                providerResult.forEach(thisRow => {
                    if (thisRow.providerName !== provider) { return };
                    concatPaymentHTML.providerPaymentsTotal += (sanitize.number( thisRow.issuanceAmount) * 100 )
                    if (providerDateArray.includes(thisRow.billingPeriod)) { // in case of supplemental payments //
                        let providerMatch = providerPaymentTableArray.find(pptaArr => pptaArr[0] === thisRow.billingPeriod);
                        if (providerMatch[1] === thisRow.providerName) {
                            providerMatch[2] = numberFuncs.toUSD( sanitize.number(providerMatch[2]) + sanitize.number(thisRow.issuanceAmount) )
                            providerMatch[3] = numberFuncs.toUSD( sanitize.number(providerMatch[3]) + sanitize.number(thisRow.copayAmount) )
                            providerMatch[4] = numberFuncs.toUSD( sanitize.number(providerMatch[4]) + sanitize.number(thisRow.recoupAmount) )
                            return;
                        }
                    }
                    providerPaymentTableArray.push([ thisRow.billingPeriod, thisRow.providerName, thisRow.issuanceAmount, thisRow.copayAmount, thisRow.recoupAmount ])
                    providerDateArray.push(thisRow.billingPeriod)
                })
                let providerPaymentsTotalCurrency = numberFuncs.toUSD(concatPaymentHTML.providerPaymentsTotal / 100)
                concatPaymentHTML.paymentsTotal = '<span>Payments Total: ' + providerPaymentsTotalCurrency + '.</span></div>'
            })
            providerPaymentTableArray.sort( (a, b) => Date.parse(b) > Date.parse(a) )
            let providerPaymentTbodyHTML = providerPaymentTableArray.map(trow => '<tr><td>' + trow.join('</td><td>') + '</td></tr>').join('')
            let providerPaymentTableHeaderHTML = '<thead><tr><td>Care Period</td><td>Provider</td><td>Payment</td><td>Copay</td><td>Recoup</td></tr></thead>'
            concatPaymentHTML.providerPaymentFilter = providerName ? '<div class="marginBottom">Payment filter applied to table below. Provider filter selected: ' + providerName + '.</div>' : ''
            concatPaymentHTML.providerTable = '<table><thead><tr><td>Care Period</td><td>Provider</td><td>Payment</td><td>Copay</td><td>Recoup</td></tr></thead>' + providerPaymentTbodyHTML + '</table>'

            let tableHTML = [ concatPaymentHTML.tableOneText, concatPaymentHTML.paymentsTotal, concatPaymentHTML.providerPaymentFilter, concatPaymentHTML.providerTable, (concatPaymentHTML.paymentFilter ?? ''), (concatPaymentHTML.childTable ?? ''), (concatPaymentHTML.footer ?? '') ].join('')
            copyFormattedHTML(formatHTMLtoCopy({ htmlCode: '<div id="paymentStyleAndData">' + tableHTML + '</div>', addTableStyle: true }))
            snackBar('Copied Payments', 'notitle')
        }
    }).catch(err => { console.trace(err) });
}(); // SECTION_END Case_Payment_History;
!function CaseRedetermination() {
    if (!("CaseRedetermination.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    let redeterminationDueDate = document.getElementById('redeterminationDueDate')
    let suspendPlus45 = sessionStorage.getItem('MECH2.suspendPlus45')
    if (iFramed && suspendPlus45) {
        if (!editMode) {
            if ( rederrortextContent.find(arrItem => arrItem.indexOf('CASE LOCKED') > -1) ) { sessionStorage.setItem('MECH2.suspendPlus45', "Case Locked") }
            else if (suspendPlus45 === 'needsWrapUp') { document.getElementById('wrapUp').click() }
            else { document.getElementById('edit').click() }
        }
        if (editMode) {
            suspendPlus45 = sanitize.json(suspendPlus45)
            if (caseIdVal === suspendPlus45.id) {
                redeterminationDueDate.value = suspendPlus45.delayDate
                doChange(redeterminationDueDate)
                sessionStorage.setItem('MECH2.suspendPlus45', 'needsWrapUp')
                gbl.eles.save.click()
            }
        }
    } else if (editMode) {
        sessionStorage.removeItem('MECH2.suspendPlus45')
        let today = Date.now()
        $('#receiveDate').on('keyup change', event => { //jQuery
            if (!event.target.value || event.target.value.length !== 10) { return }
            if (today - Date.parse(event.target.value) < 31536000000) { //365 days
                preventKeys(["Tab"])
                eleFocus(gbl.eles.save)
                $('.hasDatepicker').datepicker("hide")
            }
        })
    }
}(); // SECTION_END Case_Redetermination;
!function CaseReinstate() {
    if (!("CaseReinstate.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    let reinstateError = rederrortextContent.find(arrItem => arrItem.indexOf('This case can only be reinstated in the period') > -1)
    if (reinstateError) {
        let reinstatePeriod = dateFuncs.parm3date(reinstateError)
        document.querySelector('div.error_alertbox_new > strong.rederrortext').innerHTML = '<a href="/ChildCare/CaseReinstate.htm?parm2=' + caseIdVal + '&parm3=' + reinstatePeriod + '" target="_self" style="color: #CC0000 !important; text-decoration: underline;">' + reinstateError + '</a>'
    }
}(); // SECTION_END Case_Reinstate;
!function CaseSchool() {
    if (!("CaseSchool.htm").includes(thisPageNameHtm) || !caseIdVal) { return }
    if (!editMode) { return }
    let memberSchoolStatus = document.getElementById('memberSchoolStatus'), memberSchoolType = document.getElementById('memberSchoolType'), memberKindergartenStart = document.getElementById('memberKindergartenStart'),
        memberSchoolVerification = document.getElementById('memberSchoolVerification'), memberHeadStartParticipant = document.getElementById('memberHeadStartParticipant'), memberReferenceNumberNewMember = document.getElementById('memberReferenceNumberNewMember')
    let today = Date.now()
    function fiftyPercentFinancialSupport() {
        let eightteenButStillHHmember = document.getElementById('memberFinancialSupport50PercentOrMore')
        eightteenButStillHHmember.classList.add('borderless')
        eightteenButStillHHmember.value = ""
        eightteenButStillHHmember.tabIndex = "-1"
    }
    async function kindergartenStartDate(memberArray, memberNumber) {
        let memberMatch = memberArray.filter(obj => obj.memberReferenceNumber === memberNumber)
        let birthDate = new Date(memberMatch[0].memberBirthDate), approxAge = new Date().getFullYear() - birthDate.getFullYear()
        if (approxAge < 17) { fiftyPercentFinancialSupport() }
        if (approxAge > 10) { return false }
        let fifthBirthDate = new Date(birthDate.setFullYear(birthDate.getFullYear() + 5)), fifthBirthDateValue = sanitize.date(fifthBirthDate, "number")
        let laborDay = dateFuncs.getDateOfWeekdayWithWeek(fifthBirthDate.getFullYear(), 8, 0, 1), laborDayValue = sanitize.date(laborDay, "number")
        if (fifthBirthDateValue > laborDayValue) { laborDay = dateFuncs.getDateOfWeekdayWithWeek(fifthBirthDate.getFullYear() + 1, 8, 0, 1); laborDayValue = sanitize.date(laborDay, "number") }
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
        evalData({ pageName: 'CaseMember.htm', evalString: '0', }).then(memberArray => {
            let memberNumber = schoolMemberTableSelected[0].firstElementChild.textContent
            if (Number(memberNumber) > 2) { kindergartenStartDate(memberArray, memberNumber) }
        }).catch(err => { console.trace(err) })
    }
    if (memberReferenceNumberNewMember) {
        evalData({ pageName: 'CaseMember.htm', evalString: '0', }).then(memberArray => {
            memberReferenceNumberNewMember.addEventListener('blur', blurEvent => {
                let memberNumberValue = memberReferenceNumberNewMember.value
                if (Number(blurEvent.target.value) > 2) { kindergartenStartDate(memberArray, memberNumberValue) }
                else { fiftyPercentFinancialSupport() }
            })
        }).catch(err => { console.trace(err) })
    }
}(); // SECTION_END Case_School;
!function CaseSpecialNeeds() {
    if (!["CaseSpecialNeeds.htm"].includes(thisPageNameHtm) || !caseIdVal) { return }
    document.getElementById('reasonText')?.setAttribute('type', 'text')
}(); // SECTION_END Case_Special_Needs;
!function CaseTransfer() {
    if (!("CaseTransfer.htm").includes(thisPageNameHtm)) { return };
    if (iFramed && !editMode) {
        window.onmessage = (messageEvent) => {
            if (messageEvent.origin !== "https://mec2.childcare.dhs.state.mn.us") return false;
            if (messageEvent.data[0] === "newTransfer") { startWorkerTransfer(messageEvent.data[1]) }
        }
    }
    let ssTransferCase = 'MECH2.caseTransfer.' + caseIdVal
    let ssError = "MECH2.transferError"
    let transferWorkerId = countyInfo.info?.closedCaseBank ?? ''
    transferWorkerId = validateTransferWorkerId(transferWorkerId)
    let transferSS = sessionStorage.getItem(ssTransferCase) ?? ''
    if (!editMode && !iFramed) {
        let caseTransferButtons = ''
        // + '<button type="button" class="cButton" tabindex="-1" style="margin-right: 10px; padding: 3px 6px;" id="sendMemo">Memo</button>'
        // + '<button type="button" class="cButton" tabindex="-1" style="margin-right: 30px; padding: 3px 6px;" id="sendMemo">Reset</button>'
        + '<button type="button" class="cButton" tabindex="-1" id="closedTransfer">Transfer to:</button>'
        + '<input type="text" class="form-control" style="width: var(--8numbers);" id="transferWorker" placeholder="Worker #" value=' + transferWorkerId + '></input>'
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', caseTransferButtons)
        document.getElementById('transferWorker')?.addEventListener( 'blur', blurEvent => { transferWorkerId = validateTransferWorkerId(blurEvent.target.value) })
        document.getElementById('closedTransfer')?.addEventListener('click', () => {
            if (!transferWorkerId) { return };
            sessionStorage.setItem('MECH2.caseTransfer.' + caseIdVal, 'transferActive')
            document.getElementById('new').click()
        })
        // document.getElementById('sendMemo')?.addEventListener('click', () => {
        //     // todo: make into its own function so it can work on CaseList pages
        //     // on active case list page: make a button to "activate transfer mode" which then shows buttons by every case (akin to inactive). Clicking buttons transfers the case and sends a memo. Also shows the xfer worker and memo reset button.
        //     if (localStorage.getItem('transferMemo') === "") { return }
        // })
    }
    if (!iFramed) {
        document.getElementById('caseTransferFromType').addEventListener('blur', () => {
            eleFocus( firstEmptyElement() )
            setTimeout(() => {
                tabIndxNegOne('#workerSearch')
                let readOnly = [...document.querySelectorAll('form :is(input, select).form-control[readonly]')]
                readOnly.forEach(e => { e.tabIndex = "-1" })
            }, 300)
        });
        addToFooter("https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=mecc-000620020202", "Moving to New County", "_blank", "", "page-specific")
    }
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
            switch (transferSS) {
                case "transferStart":
                    sessionStorage.setItem(ssTransferCase, 'transferActive')
                    document.getElementById('new').click()
                    break
                case "transferError":
                    document.querySelector('form#caseTransferDetail').insertAdjacentHTML('afterbegin', '<div class="error_alertbox_new"><img src="images/error_alert_small.png"><strong class="rederrortext">' + sessionStorage.getItem(ssError) + '</strong></div>')
                    sessionStorage.removeItem(ssError)
                case "transferDone": // eslint-disable-line no-fallthrough
                    sessionStorage.removeItem(ssTransferCase)
                    parent.postMessage(['transferStatus', 'Success'], "https://mec2.childcare.dhs.state.mn.us")
                    break
            }
        }
        if (editMode && transferWorkerId && transferSS === "transferActive") { doCaseTransfer() }
    };
    if (iFramed && !editMode) {
        queueMicrotask(() => {
            if (!caseIdVal) { parent.postMessage(['transferStatus', 'pageLoaded'], "https://mec2.childcare.dhs.state.mn.us") }
        })
    }

    function checkRedErrorText() {
        let firstErrorMessage = rederrortextContent?.length ? rederrortextContent[0] : 0
        if (!firstErrorMessage) { return };
        if (editMode) {
            switch (firstErrorMessage) {
                case "Transfer To Worker ID is not valid for Servicing Agency.":
                case "Transfer To Worker ID is invalid.":
                    countyInfo.updateInfo('closedCaseBank', "delete")
                case "Transfer To Worker ID is missing.": // eslint-disable-line no-fallthrough
                case "Transfer From Worker ID cannot be the same as Transfer To Worker ID.":
                    sessionStorage.setItem(ssTransferCase, 'transferError')
                    sessionStorage.setItem(ssError, firstErrorMessage)
                    document.getElementById('cancel').click()
                    break
            }
        } else if (!editMode) {
            if (firstErrorMessage === "Case Number is missing.") { return }
            else if (firstErrorMessage.includes("CASE LOCKED")) {
                iFramed && parent.postMessage(['transferError', 'Locked Case'], "https://mec2.childcare.dhs.state.mn.us")
            } else {
                let errorMessage = redTextMap.get(firstErrorMessage)
                sessionStorage.removeItem(ssTransferCase)
                sessionStorage.removeItem(ssError)
                iFramed && parent.postMessage(['transferError', errorMessage], "https://mec2.childcare.dhs.state.mn.us")
            }
        }
    }
    function startWorkerTransfer(transferCase) {
        if (!transferCase) { return };
        sessionStorage.setItem('MECH2.caseTransfer.' + transferCase, 'transferStart')
        window.open("/ChildCare/CaseTransfer.htm?parm2=" + transferCase, '_self')
    }
    function doCaseTransfer() {
        let caseTransferFromType = document.getElementById('caseTransferFromType')
        if (!caseTransferFromType.querySelector('option[value="Worker To Worker"]')) { return }
        sessionStorage.setItem(ssTransferCase, 'transferDone')
        caseTransferFromType.value = "Worker To Worker"
        doChange('#caseTransferFromType')
        document.getElementById('caseTransferToWorkerId').value = transferWorkerId
        doChange('#caseTransferToWorkerId')
        gbl.eles.save.click() // disable for testing
    };
    function validateTransferWorkerId(testedWorkerId) {
        if ((/[a-z0-9]{7}/i).test(testedWorkerId)) {
            if (transferWorkerId !== testedWorkerId) {
                countyInfo.updateInfo('closedCaseBank', testedWorkerId)
            }
        } else {
            testedWorkerId = ''
            countyInfo.updateInfo('closedCaseBank', "delete")
            document.getElementById('transferWorker').placeholder = 'Invalid #'
            flashRedOutline(document.getElementById('transferWorker'))
            eleFocus('#transferWorker')
        }
        return testedWorkerId
    }
}(); // SECTION_END Case_Transfer;
!function CaseWrapUp() {
    if (!("CaseWrapUp.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
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
        !function checkIfInLastEditPeriod() {
            const earliestEditPeriod = sessionStorage.getItem('MECH2.earliestEditPeriod.' + caseIdVal)
            if (!earliestEditPeriod) { return }
            if ( Date.parse(earliestEditPeriod.slice(0, 10)) < Date.parse(selectPeriodDates.start) ) {
                // addRedTextWarning("Edits were made in the " + earliestEditPeriod + " period.")
                addRedTextWarning('Edits were made in the <a href="/ChildCare/CaseReinstate.htm?parm2=' + caseIdVal + '&parm3=' + dateFuncs.parm3(earliestEditPeriod) + '" target="_self" style="color: #CC0000 !important; text-decoration: underline;">earliestEditPeriod</a> period.')
            }
        }();
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
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', postWrapButtons())
        function postWrapButtons() { return [...postWrap].map( ([key, item] = []) => '<button class="form-button" type="button" id="'+ key +'">'+ item.name +'</button>').join('') }
        tertiaryActionArea?.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            window.open('/ChildCare/' + postWrap.get(clickEvent.target.id).page + '.htm?parm2=' + caseIdVal + '&parm3=' + selectPeriodDates.parm3, '_self')
        });
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
    //                 if (["MFIP/DWP Child Care", "Basic Sliding Fee", "Transition Year", "Transition Year Extension"].includes(td[2].textContent)) { td[1].classList.add('match'); td[0].firstElementChild.classList.add('match') }
    //                 if ( ['Current', 'PEND'].includes(td[2].textContent.split(' ')[1]) ) { td[2].classList.add('match'); td[0].firstElementChild.classList.add('match') }
    //                 if ( ['Current', 'PEND'].includes(td[3].textContent.split(' ')[1]) ) { td[3].classList.add('match'); td[0].firstElementChild.classList.add('match') }
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
    if (rederrortextContent.find(arrItem => arrItem.indexOf("Warning: SSN is missing") > -1)) { [document.getElementById('selectBtn'), document.getElementById('createPMIBtn')].forEach(ele => { ele.style.display = "inline-block" }) }
    let searchTableTbody = document.querySelector('#clientSearchTable > tbody'), selectBtn = document.getElementById('selectBtn'), programBtn = document.getElementById('programBtn'), returnBtn = document.getElementById('returnBtn'), h5 = document.querySelector('h5')
    if (selectBtn) {
        let focusBtn = selectBtn.style.display !== "none" ? selectBtn : programBtn;
        tbodiesFocus(focusBtn)
    }
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
    // if (returnBtn && returnBtn.style.display !== "none") {
    evalData().then( ({ 0: results } = {}) => {
        if (!results) { return };
        const resultTable = document.querySelector('#clientSearchProgramResults tbody')?.children
        if (!resultTable) { return };
        const testPendCurrent = text => { return (["PEND", "Current"].includes(text.split(" ")[1]) ) ? "match" : "disabledText" }
        results.forEach( ({ participationPeriod, affiliatedPeriod }, i) => {
            participationPeriod !== " " && resultTable[i].children[2].classList.add( testPendCurrent(participationPeriod) )
            affiliatedPeriod !== " " && resultTable[i].children[3].classList.add( testPendCurrent(affiliatedPeriod) )
        })
    })
    // }
    if ( programBtn ) {
        reselectSelectedTableRow();
        programBtn.addEventListener('click', storeSelectedTableRow)
    }
}(); // SECTION_END Client_Search;
!function ContactInformation() {
    if (!"ContactInformation.htm".includes(thisPageNameHtm)) { return };
    [...document.querySelector('.content_40pad').querySelectorAll('br')].forEach(ele => { let textNode = ele.previousSibling; if (textNode?.nodeType === 3 && textNode?.length > 5) { doWrap({ ele: textNode }) } })
}(); // SECTION_END Contact Information;
!function _Financial_Billing_Pages() {
    !function __ElectronicBills() {
        if (!"ElectronicBills.htm".includes(thisPageNameHtm)) { return };
        doNotDupe.buttons.push('#reset, #search')
        gbl.eles.selectPeriod.insertAdjacentElement('afterbegin', gbl.eles.selectPeriod.querySelector('[value=""]'))
    }(); // SECTION_END Electronic_Bills;
    if (thisPageNameHtm.indexOf("Financial") !== 0) { return };
    !function __FinancialAbsentDayHolidayTracking() {
        if (!("FinancialAbsentDayHolidayTracking.htm").includes(thisPageNameHtm)) { return };
        let allDays = [...document.querySelectorAll('.fc-daygrid-day-bg')]
        if (!allDays) { return };
        let start = allDays.findIndex(ele => ele === document.querySelector('div.fc-daygrid-day-bg:has(.fc-bg-event.fc-event.fc-event-start')), end = allDays.findIndex(ele => ele === document.querySelector('div.fc-daygrid-day-bg:has(.fc-bg-event.fc-event.fc-event-end'))
        allDays.slice(start, end+1).forEach(ele => { ele.closest('.fc-daygrid-day:not(.fc-day-disabled)')?.classList.add('currentPeriod') })
    }(); // SECTION_END Financial_Absent_Day_Holiday_Tracking;
    !function __FinancialBillingRegistrationFeeTracking() {
        if (!"FinancialBillingRegistrationFeeTracking.htm".includes(thisPageNameHtm) || !editMode) { return };
        selectPeriodReversal(document.getElementById('providerBillingPeriod'))
    }();
    !function __FinancialBilling() {
        if (!("FinancialBilling.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
        if (!document.querySelector('table#billingProviderTable > tbody').children[0].children[1]) { return };
        listPageLinksAndList([ {listPageChild: 4, listPageLinkTo: "ProviderInformation"} ])
        !function shrinkPage() {
            if (countyInfo.info?.baseCssOnlyList?.includes(thisPageNameHtm)) { return };
            const regFeeAddDeleteDiv = document.querySelector('div:has(> #addRegistrationFee)'), regFeeAddDeleteDivParent = regFeeAddDeleteDiv.parentElement, regFeeTableParent = document.getElementById('billingRegistrationFeesTable_wrapper').parentElement
            regFeeAddDeleteDiv.removeAttribute('class'); regFeeAddDeleteDiv.setAttribute('style', "width: fit-content; display: inline-block; vertical-align: top; margin: 10px 0 0 4%;"); regFeeTableParent.insertAdjacentElement('afterend', regFeeAddDeleteDiv)
            const addBilledTimeDiv = document.querySelector('div:has(> #addBilledTime)'), addBilledTimeDivInsert = document.querySelector('label[for=totalAmountBilled]').parentElement
            addBilledTimeDivInsert.appendChild(addBilledTimeDiv)
            const calculateDiv = document.querySelector('div:has(> #calculate)'), calculateDivInsert = document.getElementById('carryBilledAmountsForward').parentElement
            calculateDiv.style.margin = "5px 0 0 15%"; calculateDivInsert.appendChild(calculateDiv)
            const cappingInfoDiv = document.getElementById('cappingInfo').parentElement
            cappingInfoDiv.style.verticalAlign = "text-bottom"
            const allowedRegistrationFeeTable = document.getElementById('allowedRegistrationFeeTable_wrapper'); allowedRegistrationFeeTable.style.margin = "0"; allowedRegistrationFeeTable.closest('.form-group').style.lineHeight = "unset";
        }();
        let billingProviderTableTbody = document.querySelector('table#billingProviderTable > tbody')
        let totalHoursBilledWeekOne = document.getElementById('totalHoursBilledWeekOne'), totalHoursBilledWeekTwo = document.getElementById('totalHoursBilledWeekTwo'), totalHoursOfCareAuthorized = document.getElementById('totalHoursOfCareAuthorized'), totalHours = [ totalHoursBilledWeekOne, totalHoursBilledWeekTwo, totalHoursOfCareAuthorized ]
        let daysArray = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], weekOneDays = weekHtmlCollection('weekOne'), weekTwoDays = weekHtmlCollection('weekTwo'), weekOneMonday = weekOneDays[0]
        function weekHtmlCollection(weekOneOrTwo) { return daysArray.map( ele => document.getElementById(weekOneOrTwo + ele) ) }
        let providerName = billingProviderTableTbody.querySelector('tr.selected > td:nth-child(1)').textContent
        let billedHoursTbody = weekOneMonday.closest('tbody'), billedHoursPanel = h4objects.billedhours.h4.parentElement
        if (editMode) {
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
        !function billingInfoForEmails() {
            if (editMode) { return };
            let twoOrFourWeeksSlider = createSlider({ label: "", title: "", id: "twoOrFourWeeks", defaultOn: 0, classes: "slider-always-color" })
            tertiaryActionArea?.insertAdjacentHTML('beforeend', '<div id="weekBillingToggle" class="db-container"><span id="is2WkBilling">2-Week</span>' + twoOrFourWeeksSlider + '<span id="is4WkBilling" style="opacity: .6;">4-Week</span></div><div id="copyButtons" class="db-container"><button class="form-button" id="billingEmailTemplate">Template</button></div>')
            let billingEmailTemplate = document.getElementById('billingEmailTemplate'), is2WkBilling = document.getElementById('is2WkBilling'), is4WkBilling = document.getElementById('is4WkBilling'), twoOrFourWeeks = document.getElementById('twoOrFourWeeks')
            twoOrFourWeeks.addEventListener('click', clickEvent => {
                switch(clickEvent.target.checked) {
                    case true: is2WkBilling.style.opacity = ".6"; is4WkBilling.style.opacity = "1"; break;
                    case false: is4WkBilling.style.opacity = ".6"; is2WkBilling.style.opacity = "1"; break;
                }
            })
            const billings = { providers: {}, children: {}, issues: {} }
            let workerInfo, absentDays = {}
            evalData().then(({ 0: providersData, 1: billedData } = {}) => {
                if (!providersData[0].providerId) { return };
                const periodStart = Date.parse(selectPeriodDates.start), periodEnd = Date.parse(selectPeriodDates.end)
                providersData.forEach(providerData => {
                    billings.providers[providerData.rowIndex] = {
                        providerName: providerData.providerName.replace(/\\/g, ''),
                        providerRow: providerData.rowIndex,
                        providerId: providerData.providerId,
                        providerType: providerData.providerType,
                        childrenInCare: [],
                        buttonTitle: [],
                    }
                })
                billedData.forEach(child => {
                    billings.children[child.referenceNumber] = { childName: child.childName }
                    !billings.providers[child.rowIndex2].childrenInCare.includes(child.referenceNumber) && billings.providers[child.rowIndex2].childrenInCare.push(child.referenceNumber)
                })
                !async function findBillingIssues() {
                    for await (let child of billedData) {
                        billings.children[child.referenceNumber][child.rowIndex2] = {
                            providerName: billings.providers[child.rowIndex2].providerName,
                            providerRow: billings.providers[child.rowIndex2].providerRow,
                            childName: nameFuncs.commaNameReorder(child.childName),
                            totalHoursOfCareAuthorized: Number(child.totalHoursOfCareAuthorized),
                            totalHoursAllowed: (Number(child.totalHoursAllowedWeekOne) + Number(child.totalHoursAllowedWeekTwo)),
                            totalHoursBilled: (Number(child.totalHoursBilledWeekOne) + Number(child.totalHoursBilledWeekTwo)),
                            dailyHours: [
                                [ child.weekOneMonday, child.weekOneTuesday, child.weekOneWednesday, child.weekOneThursday, child.weekOneFriday, child.weekOneSaturday, child.weekOneSunday, child.providerDesignationWeekOne ?? "LNL", child.totalHoursBilledWeekOne, child.totalHoursAllowedWeekOne ],
                                [ child.weekTwoMonday, child.weekTwoTuesday, child.weekTwoWednesday, child.weekTwoThursday, child.weekTwoFriday, child.weekTwoSaturday, child.weekTwoSunday, child.providerDesignationWeekTwo ?? "LNL", child.totalHoursBilledWeekTwo, child.totalHoursAllowedWeekTwo ],
                            ],
                            startDate: Date.parse(child.effectiveStartDate),
                            endDate: Date.parse(child.effectiveEndDate),
                            childDetailIndex: child.childDetailIndex,
                            childTableDataCommon: [child.childAgeCategory, child.effectiveDateRange, child.amountAllowed ],
                            childTableData: [ child.referenceNumber, child.childName, child.childAgeCategory, child.effectiveDateRange, child.amountAllowed ],
                            childTableDataUnique: [ child.referenceNumber, child.childName ],
                            // billedTableData: (function() { return child.billedTimeList.map(item => { if (item.grandChildIndex == child.childDetailIndex2) { return [ item.billedTimeType, item.billedTimeNumber, item.billedTimeRate, item.billedTimeTotal, ] } }).filter(e => e) }()), // not used?
                        }
                        let childAtProvider = billings.children[child.referenceNumber][child.rowIndex2]
                        let cappingInfo = child.cappingInfoText ? child.cappingInfoText.replace(/<.+?>Week.+?<LI>|<\/.+>|Amount allowed.+?\.00\./g, '') : ''
                        function createOrAdd(childArray, issueText, startEnd, firstOrLast) {
                            let existingIssue = billings.issues[childAtProvider.providerRow]?.findIndex(i => i.indexOf(issueText) > -1)
                            if (existingIssue > -1) {
                                billings.issues[childAtProvider.providerRow][existingIssue] = childAtProvider.childName + ", " + billings.issues[childAtProvider.providerRow][existingIssue]
                                let existingButtonTitle = billings.providers[childAtProvider.providerRow].buttonTitle.findIndex(i => i.indexOf(issueText) > -1)
                                billings.providers[childAtProvider.providerRow].buttonTitle[existingButtonTitle] = billings.providers[childAtProvider.providerRow].buttonTitle[existingButtonTitle].slice(0, -1) + ", " + childAtProvider.childName + ")"
                            } else {
                                addToNewArray(billings.issues, childAtProvider.providerRow, childAtProvider.childName + " - " + issueText + " (" + dateFuncs.formatDate(childAtProvider[startEnd], "mdyy") + ") is " + firstOrLast + " date of the period.");
                                addToNewArray(billings.providers[childAtProvider.providerRow], "buttonTitle", issueText + " (" + childAtProvider.childName + ")")
                            }
                        }
                        if (childAtProvider.startDate > periodStart) { createOrAdd(childAtProvider, "SA start date", "startDate", "after the first") }
                        if (childAtProvider.endDate < periodEnd) { createOrAdd(childAtProvider, "SA end date", "endDate", "before the last") }
                        if (childAtProvider.totalHoursBilled > childAtProvider.totalHoursOfCareAuthorized) { addToNewArray(billings.issues, childAtProvider.providerRow, childAtProvider.childName + " - More hours billed than authorized: " + childAtProvider.totalHoursBilled + " billed vs " + childAtProvider.totalHoursOfCareAuthorized + " authorized."); addToNewArray(billings.providers[childAtProvider.providerRow], "buttonTitle", "Exceeds authorized hours (" + childAtProvider.childName + ")") }
                        if (childAtProvider.totalHoursBilled > childAtProvider.totalHoursAllowed && cappingInfo && (/secondary/i).test(cappingInfo)) {
                            addToNewArray(billings.issues, childAtProvider.providerRow, childAtProvider.childName + " - Unpayable hours: " + childAtProvider.totalHoursBilled + " billed vs " + childAtProvider.totalHoursAllowed + " allowed. " + cappingInfo)
                            addToNewArray(billings.providers[childAtProvider.providerRow], "buttonTitle", "Unpayable Hours - Secondary Provider (" + childAtProvider.childName + ")")
                        }
                    };
                    if (!billings.issues) { return };
                    !function makeBillingButtons() {
                        for (let providerObj of Object.entries(billings.providers)) {
                            if (providerObj[0] in billings.issues) {
                                billingEmailTemplate.insertAdjacentHTML('afterend', '<button class="form-button" id="' + providerObj[0] + '" title="' + providerObj[1].buttonTitle.join(", ") + '">' + providerObj[1].providerName.slice(0, 29) + '</button>')
                            }
                        }
                    }();
                }();
                function addToNewArray(obj, arrayName, value) {
                    if (!value) { return };
                    if (!obj[arrayName]) { obj[arrayName] = []}
                    if (obj[arrayName].includes(value)) { return };
                    obj[arrayName].push(value)
                }
            })
            let billingTextIterator = 0;
            function billingTextCounter() { return billingTextIterator++ }
            document.getElementById('copyButtons')?.addEventListener( 'click', clickEvent => copyBillingInfoForEmails(clickEvent.target.id, clickEvent.target.textContent, twoOrFourWeeks?.checked ? 4 : 2, "email" ) )
            document.getElementById('copyButtons')?.addEventListener( 'contextmenu', clickEvent => { clickEvent.preventDefault(); copyBillingInfoForEmails(clickEvent.target.id, clickEvent.target.textContent, twoOrFourWeeks?.checked ? 4 : 2, "clipboard" ) })
            async function copyBillingInfoForEmails(clickedButtonId, clickedButtonName, billingWeeks, emailOrClipboard) {
                workerInfo ??= await getWorkerInfo()
                let typeAndNameColumns = { FinancialBilling: { type: 1, name: 0, id: 4 }, FinancialBillingApproval: { type: 2, name: 1, id: 0 }, }
                let caseName = nameFuncs.commaNameReorder(pageTitle)
                let billingFormDates = { start: dateFuncs.formatDate(selectPeriodDates.start, "mdyy"), end: dateFuncs.formatDate(selectPeriodDates.end, "mdyy"), }
                if (billingWeeks === 4) {
                    fourWeekStart(selectPeriodDates.start) === 0.5 ? billingFormDates.start = dateFuncs.formatDate(dateFuncs.addDays(selectPeriodDates.start, -14), "mdyy") : billingFormDates.end = dateFuncs.formatDate(dateFuncs.addDays(selectPeriodDates.end, 14), "mdyy")
                }
                let selectedTRow = billingProviderTableTbody.querySelector('tr.selected')
                let selectedTRowChildren = selectedTRow.children
                let selectedProviderName = clickedButtonName !== "Template" ? clickedButtonName : selectedTRowChildren[typeAndNameColumns[thisPageName].name].textContent
                let emailSubject = selectedProviderName + '  Case: ' + caseIdVal + ', ' + caseName + '  ' + billingFormDates.start + '-' + billingFormDates.end
                let emailBody = clickedButtonName === "Template" ? "" : billings.issues[clickedButtonId].join("%0A")
                // if (clickedButtonId !== "billingEmailTemplate") { createCopy(clickedButtonId) }
                if (emailOrClipboard === "email") {
                    copyTableData((clickedButtonId === "billingEmailTemplate" ? getChildNum( document.querySelector('#billingProviderTable .selected') ) : clickedButtonId))
                    if (clickedButtonName === "Template") {
                        window.open('mailto:' + workerInfo + '?subject=' + emailSubject, "_self")
                    } else {
                        window.open('mailto:' + workerInfo + '?subject=' + emailSubject + '&body=' + emailBody + "%0A%0A%0A", "_self")
                    }
                } else if (emailOrClipboard === "clipboard") {
                    let isTemplate = clickedButtonName === "Template", subjectOrBody = isTemplate ? true : billingTextCounter() % 2 === 0
                    let billingTextToCopy = isTemplate ? emailSubject : subjectOrBody ? emailSubject : emailBody
                    copy(billingTextToCopy, billingTextToCopy, subjectOrBody ? "Copied email subject!" : "Copied email body!", "center")
                }
            };
            function createCopy(clickedButtonId) {
                let cloneHouse = document.querySelector('form').appendChild(document.createElement('div')), lineBreak = document.createElement('p') //'<p></p>'
                cloneHouse.style.display = "none"
                let billingProviderTableClone = document.getElementById('billingProviderTable').cloneNode(true), billingProviderTableCloneChildren = billingProviderTableClone.querySelector('tbody').children, billingProviderTableCloneProvider = billingProviderTableCloneChildren[clickedButtonId],
                    billingProviderTableCloneSolo = [...billingProviderTableCloneChildren].forEach(providers => { if (providers !== billingProviderTableCloneProvider) { providers.remove() } })
                cloneHouse.appendChild(billingProviderTableClone)
                cloneHouse.appendChild(lineBreak)

                // !function testing() {
                //     return;
                //     const childBillingDataUnique = { children: [], dataArrays: [] };
                //     const childBillingData = billings.providers[clickedButtonId].childrenInCare.forEach(childId => {
                //         if (billings.children[childId][clickedButtonId].totalHoursBilled === 0) { return };
                //         let childBillingData = [ billings.children[childId][clickedButtonId].totalHoursOfCareAuthorized, billings.children[childId][clickedButtonId].childTableData, billings.children[childId][clickedButtonId].dailyHours ];
                //         let childBillingIndex = findIndexOfArrs( childBillingData, childBillingDataUnique.dataArrays )
                //         if (childBillingIndex < 0) {
                //             childBillingDataUnique.children.push(childId)
                //         }
                //     });
                // }();

                // let testObj = { membs: [["01", "02"], ["03"]], stringified: ['["a", "b", ["c", "d"]]', '["a", "b", ["c", "e"]]'], nonStringified: [["a", "b", ["c", "d"]], ["a", "b", ["c", "e"]]] }
                // or could nonStringified.map(arr => JSON.stringify(arr)) each time;
                // let dupeIndex = findIndexOfArrays()
                // if (dupeIndex > -1) { testObj.membs[dupeIndex].push(childId); }
                // else { testObj.membs.push(childId); testObj.stringified.push(JSON.stringify(newArray)); testObj.nonStringified.push(newArray); }
                // testObj.membs.forEach(groupOfMembs => mimic the below)

                billings.providers[clickedButtonId].childrenInCare.forEach(childId => {
                    let childAtProviderData = billings.children[childId][clickedButtonId]
                    if (billings.children[childId][clickedButtonId].totalHoursBilled === 0) { return };
                    cloneHouse.insertAdjacentHTML('beforeend', '<p></p><label>Total Hours of Care Authorized:</label><div>' + billings.children[childId][clickedButtonId].totalHoursOfCareAuthorized + '</div>')
                    // let billingChildTableClone = document.getElementById('billingChildTable').cloneNode(true), billingChildTableCloneChildren = billingChildTableClone.querySelector('tbody').children
                    // let billingChildTableCloneSolo = [...billingChildTableCloneChildren].forEach(row => { if (row !== billingChildTableCloneChildren[0]) { row.remove() } })
                    // let rewriteDataChildren = [...billingChildTableCloneChildren[0].children].forEach((cell, i) => { cell.textContent = billings.children[childId][clickedButtonId].childTableData[i] })
                    // cloneHouse.appendChild(billingChildTableClone)
                    // let billedTimeTableClone = document.getElementById('billedTimeTable').cloneNode(true)
                    // cloneHouse.appendChild(billedTimeTableClone)
                    let tableTableClone = (function() {
                        let tableTable = document.querySelector('table.table').cloneNode(true)
                        let dailyHoursData = billings.children[childId][clickedButtonId].dailyHours
                        let replaceInputs = [...tableTable.querySelectorAll('tbody tr')].forEach((tRow, tRowI) => { tRow.querySelectorAll('input').forEach((input, inputI) => { input.parentElement.outerHTML = '<td class="col-lg-1">' + (dailyHoursData[tRowI][inputI] ?? "") + '</td>' }) })
                        return tableTable
                    })()
                    cloneHouse.appendChild(tableTableClone)
                    cloneHouse.appendChild(lineBreak)
                })
                let cleanup = [...cloneHouse.querySelectorAll('.dataTables_paginate, .paging_simple_numbers, .dataTables_scrollHead')].forEach(e => e.remove())
                let cloneToReturn = cloneHouse.cloneNode(true)
                cloneHouse.remove()
                return cloneToReturn
            }
            // tertiaryActionArea?.insertAdjacentHTML('beforeend', '<button id="copyBillingForEmailForTesting" class="form-button">Copy</button>')
            function findIndexOfArrs(needleArray, haystackArray) {
                if (!haystackArray.length) { return }
                haystackArray = haystackArray.map(arr => JSON.stringify(arr))
                needleArray = JSON.stringify(needleArray)
                return haystackArray.findIndex(arr => arr === needleArray)
            }
            function copyTableData(rowId) {
                let copiedData = createCopy(rowId)
                let removeDataTables = [...copiedData.querySelectorAll('.dataTables_sizing')].forEach(ele => ele.removeAttribute('class'))
                copyFormattedHTML(formatHTMLtoCopy({ htmlCode: copiedData, extraStyle: 'table.display, table.table { width: 60em; }' }))
            }
        }(); // END financial_info_for_emails
    }(); // SECTION_END Financial_Billing;
    !function __FinancialBillingApproval() {
        if (!("FinancialBillingApproval.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
        doNotDupe.doNotUnderline.push('fundingSourceDetails')
        listPageLinksAndList([ {listPageChild: 0, listPageLinkTo: "ProviderInformation"} ])
        const caseNotesData = {}
        const periodShortDates = dateFuncs.formatDate(selectPeriodDates.start, 'mdyy') + ' - ' + dateFuncs.formatDate(selectPeriodDates.end, 'mdyy')
        function checkReasons(reprocessData) {
            const userCommentArr = (reprocessData.remittanceComments + ' ' + reprocessData.userComments).toLowerCase().replace(/ +/g, " ").replace(/[^a-z0-9 ]/g, '').split(' ')
            const reasonsArr = [
                [ "correction", "Provider submitted a correction on " + reprocessData.receivedDate + ". SA reopened, and the billing correction includes hours on the days that were previously grayed out." ],
                [ "exemption", "Medical Exemption - Absent Days form received." ],
            ]
            return reasonsArr.find( entry => userCommentArr.includes(entry[0]) )
        }

        evalData({evalString: '0'}).then(billingApproval => {
            !function autoCaseNoteButtons() {
                return; // FUNCTION NOT YET READY //
                if (editMode) { return };
                Object.entries(billingApproval).forEach( ([, reprocess] = []) => {
                    if (reprocess.underpaymentAmount === "$0.00") { return };
                    reprocess.userComments = reprocess.userComments.replace(/\\n/g, ' ').replace(/\\\//g, '/')
                    let matchedReason = checkReasons(reprocess)
                    if (!matchedReason) { return };
                    caseNotesData[reprocess.memberProviderId] = Object.assign( reprocess, { matchReason: matchedReason[1] } )
                })
                Object.entries(caseNotesData).forEach( ([, paymentData] = []) => {
                    addTertiaryEle('button', { id: paymentData.memberProviderId, classList: "form-button", textContent: paymentData.memberProviderName })
                })
                tertiaryActionArea.addEventListener('click', ({ target: doNoteButton } = {}) => {
                    if (doNoteButton.nodeName !== "BUTTON") { return };
                    const caseNoteData = caseNotesData[doNoteButton.id]
                    caseNoteData.paymentReason = prompt("Enter reason for supplement", caseNoteData.userComments ?? caseNoteData.remittanceComments) ?? caseNoteData.matchReason
                })
                function createCaseNote(caseNoteData) {
                    let billingCaseNote = {
                        noteSummary: 'Supplemental Payment: ' + periodShortDates + ' period',
                        noteMessage: 'Billing form correction received for supplemental payment.'
                        + '\n\nBilling Period: ' + periodShortDates
                        + '\nProvider: ' + [ caseNoteData.memberProviderName, caseNoteData.memberProviderId ].join(' ')
                        + '\nReason for payment: ' + caseNoteData.paymentReason
                        + '\nPayment Amount: ' + caseNoteData.underpaymentAmount + ' (supplement) + ' + caseNoteData.amountAlreadyIssued + ' (previous payment) = ' + caseNoteData.amountToBeIssued
                        + '\nAction Taken: Bill reprocessed for supplemental issuance.'
                        + '\nWorker Name: ',
                        noteCategory: 'Billing/Payment'
                    }
                    localStorage.setItem("MECH2.copiedNote", JSON.stringify(billingCaseNote))
                    snackBar('Create new case note then click Autofill button.', 'Stored case note', "center")
                }
            }();
            !function autoCommentButtons() {
                if (!editMode) { return };
                let commentsButtonsDiv = createNewEle('div', { id: "commentsButtons", classList: "absPos", style: "right: 2em; top: 1em;" })
                h4objects.comments.h4.insertAdjacentElement('afterend', commentsButtonsDiv)
                const commentButtons = [
                    { id: "unpaidCopayNote", textContent: "Unpaid Copay", },
                    { id: "paymentPlanNote", textContent: "Payment Plan", },
                    { id: "absentDayExemptionNote", textContent: "Absent Day Exemption", },
                    { id: "absentDayLimitNote", textContent: "Absent Day Limit", },
                    { id: "saReopenedNote", textContent: "SA Reopened", },
                    { id: "providerCorrectionNote", textContent: "Provider Correction", },
                    { id: "workerCorrectionNote", textContent: "Worker Correction", },
                ]
                .forEach(buttonObj => commentsButtonsDiv.appendChild(createNewEle('button', Object.assign(buttonObj, { classList: "cButton inColumn", tabindex: "-1", type: "button"}) )))

                document.getElementById('commentsButtons').addEventListener('click', async ({ target: clickEvent} = {}) => {
                    if (clickEvent.nodeName !== "BUTTON") { return };
                    document.getElementById('userComments').value = await getUserCommentsText()
                    function getUserCommentsText() {
                        const selectedProviderRow = getChildNum(document.querySelector('.selected')), selectedProviderData = billingApproval[Number(selectedProviderRow)]
                        switch (clickEvent.id) {
                            case "unpaidCopayNote": return 'Copay is unpaid, provider did not indicate if there is a payment plan. '
                            case "paymentPlanNote": return 'Provider indicated there is a payment plan for the unpaid copay. '
                            case "absentDayExemptionNote": return '"Medical Condition - Absent Days" documentation received that exempts absent days during this period. '
                            case "absentDayLimitNote": return 'Absent days expended. '
                            case "saReopenedNote": return 'SA reopened. Provider submitted a correction on ' + selectedProviderData.receivedDate + ' and the billing correction includes days that were previously not authorized. '
                            case "providerCorrectionNote": return 'Provider submitted a correction on ' + selectedProviderData.receivedDate + '.  '
                            case "workerCorrectionNote": return 'Case Worker updated SA. New billing version generated and approved. '
                            default: return ''
                        }
                    }
                })
            }();
        })
    }(); // SECTION_END Financial_Billing_Approval;
    !function __FinancialBilling_FinancialBillingApproval() {
        if (!["FinancialBillingApproval.htm", "FinancialBilling.htm"].includes(thisPageNameHtm)) { return };
        let billingProviderTableTbody = document.querySelector('table#billingProviderTable > tbody, table#financialBillingApprovalTable > tbody')
        if (!billingProviderTableTbody.children[0].children[1]) { return };
        !function reselectSelectedProvider() { // when switching between these pages, remembers selected provider, and reselects on page load //
            if (editMode) { return };
            let billingEvalLookup = { FinancialBilling: { child: 4, providerIdInArr: "providerId" }, FinancialBillingApproval: { child: 0, providerIdInArr: "memberproviderId" }, }
            let billingProviderTableChildren = document.querySelector(':is(table#billingProviderTable, table#financialBillingApprovalTable) > tbody').children
            document.getElementById('buttonPanelThree')?.addEventListener('click', () => {
                let selectedTRow = billingProviderTableTbody.querySelector('tr.selected')
                if (selectedTRow) { sessionStorage.setItem('MECH2.billingApproval.' + caseIdVal, selectedTRow.children[billingEvalLookup[thisPageName].child]?.textContent) }
            })
            evalData().then(({ 0: billingProviderListDataArr } = {}) => {
                if (!billingProviderListDataArr) { return };
                let lastSelectedProvider = sessionStorage.getItem('MECH2.billingApproval.' + caseIdVal), billingReferAndSelectedProvider = document.referrer.indexOf("FinancialBilling") > -1 && lastSelectedProvider
                if (!billingReferAndSelectedProvider) { return };
                let match = billingProviderListDataArr.find( (item, i) => { if (item[billingEvalLookup[thisPageName].providerIdInArr] === lastSelectedProvider) { billingProviderTableChildren[i].click() } })
                }).catch(err => { console.trace(err) })
        }();
    }(); // SECTION_END Financial_Billing_Financial_Billing_Approval_page_switch;
    function fourWeekStart(date) {
        let [ month, day, year ] = date.split('/'), baseParseDate = 1702252800000 // Date.UTC(2023, 12-1, 11); // month is -1 indexed;
        let num = ( (Date.UTC(year, month-1, day) - baseParseDate) / 2419200000) // 28 days;
        return ( num - Math.floor(num) )
    }
    async function getWorkerInfo() {
        let workerData = await evalData({caseProviderNumber: caseIdVal, pageName: "CaseWorker.htm", dateRange: selectPeriodDates.parm3, evalString: '0', caseOrProvider: 'case'});
        return workerData.find(data => data.progId === "CC")?.workerName.split(" ")[0] ?? ""
    }
    !function __FinancialManualPayment() {
        if (!("FinancialManualPayment.htm").includes(thisPageNameHtm)) { return };
        selectPeriodReversal( document.getElementById('mpSelectBillingPeriod') )
    }(); // SECTION_END Financial_Manual_Payment;
}(); // SECTION_END _Financial_Pages;
!function FundingAvailability() {
    if (!("FundingAvailability.htm").includes(thisPageNameHtm) || !caseIdVal) { return };
    if (!editMode) {
        focusEle = document.getElementById('new').disabled ? '#wrapUpDB' : '#newDB'
    } else if (editMode) {
        let basicSlidingFeeFundsAvailableCode = document.getElementById('basicSlidingFeeFundsAvailableCode'), bSfEffectiveDate = document.getElementById('bSfEffectiveDate')
        if (countyInfo.userSettings?.fundsAvailable) { basicSlidingFeeFundsAvailableCode.value = 'Y' }
        focusEle = basicSlidingFeeFundsAvailableCode.value && bSfEffectiveDate.value ? '#saveDB' : bSfEffectiveDate
    }
}(); // SECTION_END Funding_Availability;
!function Login_ChangePassword() {
    if (!["Login.htm", "ChangePassword.htm", "ChildCare/"].includes(thisPageNameHtm)) { return }; // Looks dumb, but catches if there's no Page.htm, which can only happen when logging in.
    let userId = document.getElementById('userId'), terms = document.getElementById('terms'), password = document.getElementById('password')
    if (rederrortextContent.find(arrItem => arrItem.indexOf("Password has expired.") > -1)) {
        focusEle = password
        return;
    };
    if (countyInfo.info?.userIdNumber && terms) {
        userId.value = countyInfo.info?.userIdNumber;
        terms.click();
        focusEle = password
    } else {
        focusEle = userId
    }
}(); // SECTION_END Log_in;
!function MaximumRates() {
    if (!("MaximumRates.htm").includes(thisPageNameHtm)) { return };
    addToFooter("https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_0927", "Accreditations", "_blank", "", "page-specific")
    addToFooter("https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_092406", "Age Provisions", "_blank", "", "page-specific")
    let ratesProviderType = document.getElementById('ratesProviderType'), providerType = ratesProviderType.value, maxRatesTable = document.querySelector('table')
    let maximumRatesCounty = document.getElementById('maximumRatesCounty'), maximumRatesPeriod = document.getElementById('maximumRatesPeriod'), firstNonBlankPeriod = maximumRatesPeriod.children[1]
    !function fixLayout() {
        let wrongSettingsDiv = document.querySelector('.col-lg-16')
        wrongSettingsDiv.setAttribute("class", "col-lg-6 col-md-6 col-sm-6 col-xs-6 textInherit")
        wrongSettingsDiv.style.textAlign = "right"
        maxRatesTable.insertAdjacentElement('afterbegin', document.createElement('thead'))
        maxRatesTable.querySelector('thead').insertAdjacentElement('afterbegin', maxRatesTable.querySelector('tr'))
    }();
    !function fixRegFeeAgesHTML() {
        let regFeeLabel = document.querySelector('label[for=registrationFee]')
        regFeeLabel.closest('.form-group').outerHTML = '<div class="form-group"><label for="registrationFee" control-label textR textInherit">Registration Fee:</label> <div>' + regFeeLabel.parentElement.nextElementSibling.innerText + '</div></div>'
        let ageDefinitions = providerType === "Child Care Center" ? '<div><label>Infant:</label><span> Birth until 16 months.</span></div> <div><label>Toddler:</label><span> 16 months until 33 months.</span></div> <div><label>Preschooler:</label><span> 33 months until the August prior to the Kindergarten date.</span></div>'
        : '<div><label>Infant:</label><span> Birth until 12 months.</span></div> <div><label>Toddler:</label><span> 12 months until 24 months.</span></div> <div><label>Preschooler:</label><span> 24 months until the August prior to the Kindergarten date.</span></div>'
        document.querySelector('div.panel-box-format > div.form-group').insertAdjacentHTML('afterend', '<div id="ageCategories">' + ageDefinitions + '</div>')
    }();
    !function addTextToTable() {
        if (providerType === '') { return };
        if (providerType !== "Legal Non-licensed") {
            document.querySelectorAll('thead > tr > th:nth-child(n+2):nth-child(-n+4)').forEach( ele => ele.insertAdjacentHTML('beforeend', '<span class="maxRates"> (15%, 20%)</span>') )
            let maxRatesTds = [...document.querySelectorAll('tbody > tr > td')].forEach(ele2 => {
                if (!ele2.textContent || ele2.textContent === "0.00" || isNaN(Number(ele2.textContent))) { return }
                ele2.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (ele2.textContent * 1.15).toFixed(2) + ", " + (ele2.textContent * 1.2).toFixed(2) + ')</span>')
            })
            maxRatesTable.insertAdjacentHTML('afterend', '<span id="diffDisclaimer" class="maxRates" style="display: block; width: 100%; font-style: italic; text-align: center;">Note: Table includes max rates for providers with approved accreditations (15%) and Parent Aware 3★ (15%) and 4★ (20%) ratings.</span>')
        } else if (providerType === "Legal Non-licensed") {
            document.querySelector('thead > tr > th:nth-child(2)').insertAdjacentHTML('beforeend', '<span class="maxRates">(15%)</span>')
            let maxRatesTds = [...document.querySelectorAll('tbody > tr > td')].forEach(ele3 => {
                if ( !ele3.textContent || ele3.textContent === "0.00" || isNaN(Number(ele3.textContent)) ) { return }
                ele3.insertAdjacentHTML('beforeend', '<span class="maxRates"> (' + (ele3.textContent * 1.15).toFixed(2) + ')</span>')
            });
            maxRatesTable.insertAdjacentHTML('afterend', '<span id="diffDisclaimer" class="maxRates" style="display: block; width: 100%; font-style: italic; text-align: center;">Note: Table includes max rates for providers with approved accreditations (15%).</span>')
        }
        document.querySelector('h4').innerText = "Maximum Rates for " + providerType + " effective " + maximumRatesPeriod.value
    }();
    !function copyRates() {
        let toggleDifferentialRates = createSlider({ label: "Show Differential Rates", title: "Toggle differential rates being added to the provider payment rate table", id: "toggleDifferentialRatesSlider", defaultOn: true })
        tertiaryActionArea?.insertAdjacentHTML(
            'afterbegin', ''
            + '<button type="button" class="form-button" id="copyRates">Copy Rates</button>'
            + toggleDifferentialRates)
        document.getElementById('copyRates').addEventListener('click', () => {
            copyFormattedHTML(formatHTMLtoCopy({ htmlCode: maxRatesTable.parentElement.innerHTML.replace(/(<span class="maxRates hidden".+?<\/span>)/g, ''), addTableStyle: true, removeStyles: true, extraStyle: 'table.display { width: 50em; }' }))
        })
        let maxRatesSpans = [...document.querySelectorAll('.maxRates')]
        document.getElementById('toggleDifferentialRatesSlider').addEventListener( 'click', ele => unhideElement(maxRatesSpans, ele.target.checked) )
    }();
    ratesProviderType.addEventListener('change', () => { maximumRatesPeriod.value = firstNonBlankPeriod.value; doChange(maximumRatesPeriod) })
    maximumRatesCounty.addEventListener('change', () => { maximumRatesPeriod.value = firstNonBlankPeriod.value; doChange(maximumRatesPeriod) })
    if (maximumRatesCounty.value === "" && typeof userCountyObj !== undefined) { maximumRatesCounty.value = userCountyObj.county; doChange('#maximumRatesCounty') }
    if (providerType === '') { ratesProviderType.value = "Child Care Center"; doChange(ratesProviderType) }
    if (maximumRatesPeriod.value === '') { maximumRatesPeriod.value = firstNonBlankPeriod.value; doChange(maximumRatesPeriod) }
}(); // SECTION_END Maximum_Rates;
!function Notices_Case_Provider() {
    if (!["CaseNotices.htm", "ProviderNotices.htm"].includes(thisPageNameHtm)) { return };
    if (!editMode) {
        addDateControls("month", '#selectionBeginDate', '#selectionEndDate')
    }
    !function Notices_PdfExport() {
        let textbox1 = document.getElementById('textbox1'), textbox2 = document.getElementById('textbox2')
        if ( textbox2?.disabled ) {
            textbox2.style.fieldSizing = "content"
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
            document.getElementById('downloadAsPdf').addEventListener( 'click', () => createPdfThenDownload(mergeTextboxesText(), pageTitle + " " + caseOrproviderIdVal) )
        } else if ( textbox2?.disabled === false ) { focusEle = textbox2 }
    }(); // SECTION_END Notices__Export_to_PDF;
}();
// !function __CaseNotices() {
//     if ("CaseNotices.htm" !== thisPageNameHtm) { return };
//     evalData().then( ({ 0: noticesData } = []) => {
//         if (!noticesData.find(e => e.caseNoticePrintStatus === "Waiting to Print" && e.caseNoticeTitleDescription.indexOf("Parent Special Letter") > -1)?.caseNoticePrintStatus) { return };
//     })
// }(); // tertiaryActionArea: Button with case email address, opens CaseAddress mailto.
!function CaseNotices_CaseSpecialLetter_CaseMemo() {
    if (!["CaseSpecialLetter.htm", "CaseMemo.htm", "CaseNotices.htm"].includes(thisPageNameHtm) || !editMode) { return };
    let textbox = document.querySelector('textarea:not([disabled])')
    if (!textbox) { return };
    let status = document.getElementById('status')
    if (status) {
        status.value = "Application"
        void doChange(status)
        status.value = ""
    }
    document.querySelector('.panel-default.panel-box-format')?.addEventListener('click', clickEvent => { //click checkbox if clicking label
        if (clickEvent.target.nodeName !== "STRONG") { return }
        let checkboxParent = clickEvent.target.closest('div.col-lg-4')
        checkboxParent?.querySelector('input[type="checkbox"]:not(:disabled)')?.click()
    })
    document.querySelector('#caseData input#other')?.addEventListener('click', clickEvent => { document.getElementById('otherTextbox').value = clickEvent.target.checked ? 'See Worker Comments below' : '' })
    document.querySelectorAll('div.col-lg-offset-3')?.forEach( ele => ele.firstElementChild.setAttribute("for", ele.querySelector('input.checkbox').id) )
    function pasteEventAHK(pasteEvent) { //AHK code: "LetterTextFromAHKJSON{"IdList":"List, comma separated", "CaseStatus":"status", "LetterText":"letter text"}
        let pastedText = (event.clipboardData || window.clipboardData).getData("text")
        if (pastedText.indexOf("FromAHKJSON") < 0) { return }
        // if (pastedText.indexOf("LetterTextFromAHKJSON") < 0) { return }
        pasteEvent.preventDefault()
        pasteEvent.stopImmediatePropagation()
        let ahkObj = convertFromAHK(pastedText)
        if (status) {
            status.value = decodeURIComponent(ahkObj.CaseStatus)
            void doChange(status)
            queueMicrotask(() => { ahkObj.IdList.split(',').forEach( ele => document.getElementById(ele)?.click() ) })
            /* [ "proofOfIdentity", "proofOfActivitySchedule", "proofOfBirth", "providerInformation", "proofOfRelation", "childSchoolSchedule", "citizenStatus", "proofOfDeductions", "proofOfResidence", "scheduleReporter", "proofOfAty", "twelveMonthReporter", "proofOfFInfo", "other" ] */
        }
        textbox.value = decodeURIComponent(ahkObj.LetterText)
        eleFocus(gbl.eles.save)
    }
    document.addEventListener('paste', pasteEventAHK )
    !function addTextareaButtons() {
        let textareaButtonText = {
            jsHoursUsed() { return 'Your case is closing because you have expended your available job search hours.\nTo continue to be eligible for Child Care Assistance, you must have an eligible activity from one of the following:'
                + '\n* Employment of a verified 20 hours per week minimum\n* Education with an approved education plan\n* Activities listed on a DWP/MFIP Employment Plan\nContact me with any questions.' },
            extEligEnds() { return 'Your case is closing because your 3 months of Extended Eligibility are ending and you have not reported participation in an eligible activity.\nTo continue to be eligible for Child Care Assistance,'
                + ' you must have an eligible activity from one of the following:\n* Employment\n* Education with an approved education plan\n* Activities listed on a DWP/MFIP Employment Plan\nContact me with any questions.' },
            closingUnpaidCopay() { return 'Your case is closing because your provider indicated that you are not up-to-date paying your CCAP copayments.\nBefore your case closes, you must either submit a receipt confirming your copay has been paid, or your provider must contact us and confirm payment.\n'
                + 'If your case closes, you will need to reapply and your copays must be paid in full as a requirement of eligibility.' },
            abpsInHh() {
                let abpsInput = prompt("What is the absent parent's name?")
                return 'I have been notified that ' + abpsInput + '\'s address has been changed to match your address. If ' + abpsInput + ' is now residing in your household, please submit the following verifications:'
                    + '\n1. Verification of ' + abpsInput + '\'s work schedule, which must include the days of the week and start/end times\n2. Most recent 30 days income for ' + abpsInput + '\n3. ID for ' + abpsInput + '\n'
                    + 'If this household change is not accurate, please contact me for further instructions. Otherwise ' + abpsInput + ' will be added to your household in 15 days.' },
            lnlSfsTraining() {
                return 'As a reminder, you must complete "Supervising for Safety" through DevelopMN to receive payments for care provided past 90 days for any unrelated children. \nVisit: https://app.developtoolmn.org/v7/trainings/search\n'
                    + 'and search for Course Title:\n "Supervising for Safety Legally Nonlicensed"\nContact DCYF through the Provider Hub with questions about trainings and your registration.' },
            deniedOpen() { return 'Recently you submitted an application for the Child Care Assistance Program (CCAP). Your request has been denied for the following reason:\n\nYour CCAP case is currently open.\n\nYour CCAP case will remain open and has been updated with the information reported on this application.' },
            noNoticeProviderSwitch() { return "CCAP is required to give your currently authorized daycare provider a 15-day advance notice of adverse changes.\nAs your change is earlier than 15 days, I must contact the provider and confirm they were given proper notice.\nIf not, the provider can bill absent days during those 15 days, and we aren't able to pay another provider until either after those 15 days, or they bill 10 consecutive absent days during those 15 days." },
            fosterChildCcap() { return 'You must report receiving Child Care Assistance for a foster child if you receive payments from:\n• Foster Care maintenance\n    (Report to: child\'s Tribal or county case manager.)\n• Northstar Kinship/Adoption Assistance\n    (Report to: adoption.assistance@state.mn.us.)' },
        }
        let textareaButtonsDivHTML = (
            '<div class="float-right-imp" id="textareaButtonsDiv" style="display: flex; flex-direction: column; gap: 8px;">'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Job Search hours are expended, explains eligible activities" id="jsHoursUsed">JS Hours Used</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Extended Eligibility ending, explains eligible activities" id="extEligEnds">Ext Elig Ends</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: ABPS allegedly in the household, need confirm/deny" id="abpsInHh">ABPS in HH</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Client must report receiving CCAP to their Foster Care case manager" id="fosterChildCcap">CCAP for Foster</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Applied for CCAP with open CCAP case" id="deniedOpen">Denied, Case Open</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Provider reported copay as unpaid, submit verification of it being paid" id="closingUnpaidCopay">Closing, Unpaid Copay</button>'
            + '<button type="button" class="cButton" tabindex="-1" title="Client: Client didn\'t give 15-day notice to CCAP of provider switch" id="noNoticeProviderSwitch">Provider Switch: Notice</button>'
            + ("CaseMemo.htm".includes(thisPageNameHtm) ? '<button type="button" class="cButton" tabindex="-1" title="LNL provider: Supervising for Safety training requirement" id="lnlSfsTraining">LNL SfS Training</button>' : '')
            + '</div>'
        )
        let targetDiv = "CaseMemo.htm".includes(thisPageNameHtm) ? textbox.closest('.form-group')
        : "CaseNotices.htm".includes(thisPageNameHtm) ? textbox.closest('.form-group').firstElementChild
        : textbox.closest('.col-lg-12')
        targetDiv?.insertAdjacentHTML('beforeend', textareaButtonsDivHTML)
        document.getElementById('textareaButtonsDiv')?.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            insertTextAndMoveCursor( (textbox.value ? '\n\n' : '') + textareaButtonText[clickEvent.target.id](), textbox )
            let keyboardEvent = new KeyboardEvent('keyup')
            textbox.dispatchEvent(keyboardEvent);
        })
    }();
}(); // SECTION_END _Notices_SpecialLetter_Memo__Case_Provider;
!function _Provider_Pages() {
    if ( thisPageNameHtm.indexOf("Provider") !== 0 ) { return; }
    !function __ProviderAddress() {
        if (!("ProviderAddress.htm").includes(thisPageNameHtm) || editMode) { return };
        let mailingStreet1 = document.getElementById('mailingStreet1'), edit = document.getElementById('edit'), addrBillFormDisplay = document.getElementById('addrBillFormDisplay'), mailingCountry = document.getElementById('mailingCountry')
        let providerType = document.getElementById('providerData').children[3].firstElementChild.childNodes[2].textContent.trim()
        let providerName = ["Legal Non-licensed", "MN DHS Licensed Family"].includes(providerType) && pageTitle.indexOf(',') ? nameFuncs.commaNameReorder(pageTitle) : pageTitle
        tertiaryActionArea?.insertAdjacentHTML('afterbegin', ''
                                               + '<button type="button" class="form-button" tabindex="-1" id="copySiteHome">Copy Site/Home Address</button>'
                                               + '<button type="button" class="form-button" tabindex="-1" id="copyMailing">Copy Mailing Address</button>');
        evalData().then( ({ 0: addressData } = {}) => {
            let childNum = 0
            function copyAddress(addressType) {
                let addressDatum = addressData[ childNum ], addMid = addressType === "copySiteHome" ? "SiteHome" : ""
                if (addressType === "copyMailing" && !addressDatum.mailingStreet1) { snackBar('No mailing address.', 'notitle'); return };
                const mailingDataCheck = () => {
                    return {
                        streetData: [addressDatum["mailing" + addMid + "Street1"], addressDatum["mailing" + addMid + "Street2"]].join(' '),
                        cityData: addressDatum["mailing" + addMid + "City"],
                        stateData: stateDataSwap.swapStateNameAndAcronym(addressDatum["mailing" + addMid + "State"]),
                        zipData: [addressDatum["mailing" + addMid + "ZipCode"], addressDatum["mailing" + addMid + "ZipCodePlus4"]].join('-'),
                        zipData: addressDatum["mailing" + addMid + "ZipCodePlus4"] !== "" ? [ addressDatum.mailingZipCode, addressDatum["mailing" + addMid + "ZipCodePlus4"] ].join('-') : addressDatum["mailing" + addMid + "ZipCode"],
                    }
                }
                let mailingData = mailingDataCheck()
                let copyText = providerName + "\n" + mailingData.streetData + "\n" + mailingData.cityData + ", " + mailingData.stateData + " " + mailingData.zipData;
                copy(copyText, copyText)
            }
            tertiaryActionArea?.addEventListener('click', clickEvent => {
                if (clickEvent.target.nodeName !== "BUTTON") { return }
                copyAddress(clickEvent.target.id)
            })
            !function makeSelectsDoAddressCopy() {
                let whereinfoissentParent = h4objects.whereinfoissent.h4.parentElement
                whereinfoissentParent.id = "whereinfoissentParent"
                whereinfoissentParent.insertAdjacentHTML('afterbegin', '<style>#whereinfoissentParent select { cursor: pointer !important; }</style>')
                whereinfoissentParent.addEventListener('click', clickEvent => {
                    if (clickEvent.target.nodeName !== "SELECT") { return }
                    copyAddress(clickEvent.target.value === "Mailing" ? "copyMailing" : "copySiteHome")
                })
            }();
            !mailingStreet1?.value && !edit.disabled && (checkMailingAddress()) // Collapses mailing address fields if blank;
            checkMailingAddress()
            function checkMailingAddress() {
                mailingCountry.value ? h4objects.mailingaddress.siblings.forEach(ele => ele.classList.remove('hidden')) : h4objects.mailingaddress.siblings.forEach(ele => ele.classList.add('hidden'))
                childNum = getChildNum(document.querySelector('.selected'))
            };
            document.getElementById('providerAddressData').addEventListener('click', () => { checkMailingAddress() });
        }).catch(err => { console.trace(err) });
    }(); // SECTION_END Provider_Address;
    !function __ProviderInformation() {
        if (!("ProviderInformation.htm").includes(thisPageNameHtm)) { return }
        document.querySelector('label[for=contactEmail]').innerHTML = '<a href="mailto:' + document.getElementById('contactEmail').value + '?subject=CCAP">Email:</a>'
    }(); // SECTION_END Provider_Information;
    !function __ProviderNotices() {
        if (!("ProviderNotices.htm").includes(thisPageNameHtm)) { return };
        let removeButton = document.getElementById('remove'), cancelButton = document.getElementById('cancel'), resendButton = document.getElementById('resend')
        let providerNoticesTableTbody = document.querySelector('#providerNoticesSearchData > tbody')
        if (removeButton && providerNoticesTableTbody.firstElementChild.textContent !== "No records found") {
            function addRemDisabled(target) {
                if (!cancelButton.disabled && target.nodeName === "TR" && target.children[5].textContent.indexOf("Waiting") > -1) { cancelButton.disabled = false; resendButton.disabled = true }//says waiting, cancel is disabled: disable resend, remove disable cancel;
                else if (resendButton.disabled && target.nodeName === "TR" && target.children[5].textContent.indexOf("Waiting") < 0) { resendButton.disabled = false; cancelButton.disabled = true }//doesn't say waiting, disable cancel, remove disable resend;
            }
            waitForTableCells('#providerNoticesSearchData').then( () => addRemDisabled( providerNoticesTableTbody.firstElementChild ) )
            providerNoticesTableTbody.addEventListener('click', clickEvent => { addRemDisabled( walkToTableRow(clickEvent.target) ) })
        }
    }(); // SECTION_END Provider_Notices;
    !function __ProviderOverview() {
        if (!["ProviderOverview.htm", "getProviderOverview.htm"].includes(thisPageNameHtm)) { return }
        let contactEmailURL = document.getElementById('contactEmailURL'), contactEmailURLaddress = contactEmailURL?.children[0]?.value
        if (!contactEmailURLaddress) { return };
        contactEmailURL.outerHTML = '<a id="contactEmailURL" href="mailto:' + contactEmailURLaddress + '?subject=CCAP">' + contactEmailURLaddress + '</a>'
    }(); // SECTION_END Provider_Information;
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
    }(); // SECTION_END Provider_Registration_and_Renewal;
    !function __ProviderTraining() {
        if (!("ProviderTraining.htm").includes(thisPageNameHtm)) { return };
        document.querySelector('div#providerTrainingData > div.form-group').insertAdjacentHTML('beforebegin', '<div style="text-align: right;"><a href="https://www.dhs.state.mn.us/main/idcplg?IdcService=GET_DYNAMIC_CONVERSION&RevisionSelectionMethod=LatestReleased&dDocName=CCAP_090118" target="_blank">CCAP Policy Manual - Legal Non-Licensed Provider Trainings</a></div>')
    }(); // SECTION_END Provider_Training;
}(); // SECTION_END _Provider_Pages;
!function ProviderSearch() {
    if (!("ProviderSearch.htm").includes(thisPageNameHtm)) { return };
    document.getElementById('providerSearchTable')?.classList.add('toggledTable')
    let providerSearchTableTbody = document.querySelector('#providerSearchTable > tbody'), providerSearchTableTbodyChildren = providerSearchTableTbody?.children, providerSearchResultsLength = providerSearchTableTbodyChildren?.length ?? 0
    tabIndxNegOne('#ssn, #itin, #fein, #licenseNumber, #middleInitName')
    if (providerSearchResultsLength > 1) {
        providerSearchTableTbody?.addEventListener('contextmenu', contextmenuCopy)
        let localCounties = {
            neighborsAndSelf: [...userCountyObj?.neighbors, userCountyObj?.county],
            outOfState: userCountyObj?.outOfState
        }
        const invisEle = document.createElement('div')
        document.body.append(invisEle)
        invisEle.classList.add('inactiveToggle')
        const hiddenClassSet = new Set(['inactiveToggle', 'outOfAreaToggle'])
        let searchStyle = cssStyle(), replaceStyle = doTableStyleToggle(invisEle, 'outOfAreaToggle')
        searchStyle.replaceSync( replaceStyle + " tbody .inactiveToggle { display: none !important; } tbody .outOfAreaToggle { display: none !important; }" );
        evalData().then(providerObj => {
            const { 0: providerArray } = providerObj
            for (let index in providerArray) {
                let providerData = providerArray[index], countyName = providerData.county.replace(/<.*?>/g, '')
                if (providerData.status.indexOf("Inactive") > -1) { providerSearchTableTbodyChildren[providerData.selectedRowIndex].classList.add('inactiveToggle') } // adding inactive
                if ( !localCounties.neighborsAndSelf?.includes(countyName) ) { // not local county
                    let providerZip = providerData.address.split("  ")[1]?.slice(0, 5)
                    if (!providerZip) { continue };
                    if (countyName === "Out-of-State" && localCounties.outOfState) { if ( inRange(providerZip, localCounties.outOfState[0], localCounties.outOfState[1]) ) { continue } }; // skip zip codes within the ranges from userCountyObj.outOfState
                    providerSearchTableTbodyChildren[providerData.selectedRowIndex].classList.add('outOfAreaToggle')
                }
            }
            let openActiveNearby = providerSearchTableTbody.querySelectorAll('tr:not(.inactiveToggle, .outOfAreaToggle').length, openActive = providerSearchTableTbody.querySelectorAll('tr:not(.inactiveToggle').length
            let inactiveCount = document.getElementsByClassName('inactiveToggle').length, outOfAreaCount = document.getElementsByClassName('outOfAreaToggle').length
            let inactiveToggle = inactiveCount > 0 ? createSlider({ label: "Show Inactive", title: "Toggle showing providers that are inactive", id: "inactiveToggle", defaultOn: false, }) : "", outOfAreaToggle = outOfAreaCount > 0 ? createSlider({ label: "Show Out-of-Area", title: "Toggle showing providers that are further than 1 county away", id: "outOfAreaToggle", defaultOn: false, }) : ""
            if ( (inactiveCount + outOfAreaCount) > 0 ) {
                let h5element = document.querySelector('h5')
                let h5elementText = document.querySelector('h5').innerText.split(".")
                h5element.textContent = h5elementText[0] + ". " + openActiveNearby + " active local providers. " + openActive + " active providers total." + h5elementText[1] + "."
                h5element.insertAdjacentHTML('afterend', '<div id="searchFilters" style="gap: 30px; display: flex; justify-content: center; margin: -2px 0 5px;">' + inactiveToggle + outOfAreaToggle + '</div>')
                document.getElementById('searchFilters')?.addEventListener('click', clickEvent => {
                    if (clickEvent.target.nodeName !== "INPUT") { return }
                    let replaceStyle = doTableStyleToggle(invisEle, clickEvent.target.id)
                    let nonHidden = hiddenClassSet.difference(new Set([...invisEle.classList])), hidden = hiddenClassSet.difference(nonHidden)
                    let nonHiddenRule = [...nonHidden].map(item1 => " ." + item1 + " { display: table-row; }").join(''), hiddenRule = [...hidden].map(item2 => " ." + item2 + " { display: none; }").join('')
                    searchStyle.replaceSync( replaceStyle + nonHiddenRule + hiddenRule )
                })
            }
            queueMicrotask(() => { providerSearchTableTbody.querySelector('tr:not(.inactiveToggle, .outOfAreaToggle)')?.click() })
        }).catch(err => { console.trace(err) });
    }
    if (providerSearchResultsLength === 1 && providerSearchTableTbodyChildren[0]?.textContent !== "No records found" ) {
        [...providerSearchTableTbody.querySelectorAll('a')].forEach(ele => { ele.target = '_self' })
    }
    // let docRef = document.referrer
    // if (!['CaseChildProvider.htm?', 'ProviderSearch.htm?'].includes(docRef.slice(docRef.indexOf("/ChildCare/") + 11, docRef.indexOf(".htm") + 5))) { [...document.querySelectorAll('#back, #select, #backDB, #selectDB')].forEach(ele => { ele.style.display = "none" }) }
}(); // SECTION_END Provider_Search;
!function _Transfers_ServicingAgency_Incoming_Outgoing() {
    if (!["ServicingAgencyIncomingTransfers.htm", "ServicingAgencyOutgoingTransfers.htm"].includes(thisPageNameHtm)) { return };
    listPageLinksAndList([{ listPageChild: 5, listPageLinkTo: "CaseAddress" }])
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
// } catch(err) { console.trace(err) }; }();
// ////////////////////////////////////////////////////////////////////////// PAGE_SPECIFIC_CHANGES SECTION END \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// ======================================================================================================================================================================================================
!function duplicateFormButtons() { // SECTION_START Duplicate_Form_Buttons_Above_Form
    if (iFramed || !duplicateButtons || !countyInfo.userSettings?.duplicateFormButtons) { return };
    if ("CaseWrapUp.htm".includes(thisPageNameHtm) && document.querySelector('.rederrortext')?.innerText === 'Case Wrap-Up successfully submitted.') { return };
    if (thisPageNameHtm.indexOf('List.htm') > -1 || doNotDupe.pages.includes(thisPageNameHtm)) { return; }
    if (thisPageNameHtm.indexOf('Provider') > -1 && rederrortextContent.find(arrItem => arrItem.indexOf("This page is not available") > -1)) { return };
    let mutable = document.getElementsByClassName('mutable')
    try {
        document.querySelectorAll('tbody').forEach(table => { table.addEventListener( 'click', () => checkDBclickability() ) })
        let doNotDupeButtons = doNotDupe.buttons.length ? ', ' + doNotDupe.buttons.join() : ''
        let dupeButtons = document.querySelectorAll('input.form-button:not(.panel-box-format input.form-button, form > div.form-group input.form-button, .modal-button, .modal .form-button, [hidden]' + doNotDupeButtons + ')')
        dupeButtons.forEach(button => {
            if (!button.value) { return };
            let idName = button.id + "DB";
            let underlineFirst = !doNotDupe.doNotUnderline.includes(button.id) ? ' ulfl' : ''
            duplicateButtons.insertAdjacentHTML('beforeend', '<button type="button" class="form-button mutable' + underlineFirst + '" id="' + idName + '" disabled="disabled">' + button.value + '</button>');
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
const firstEmptyElement = (values = ['']) => [...document.querySelectorAll('.panel-box-format .form-control:not(:disabled, [readonly])')].find( ele => values.includes(ele.value) );
!function focusElement() {
    if (iFramed) { return };
    !function autoFocusOnPageLoad() {
    try { //========== Auto_Focus_On_Page_Load Start =================
        if ( gbl.eles.caseIdElement && !caseIdVal ) { focusEle = gbl.eles.caseIdElement; return; }
        else if ( gbl.eles.providerIdElement && !providerIdVal ) { focusEle = gbl.eles.providerIdElement; return; }
        if (!countyInfo.userSettings?.eleFocus) { return };
        !function autoFocusCase() {
            if (("CaseApplicationInitiation.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#new' : document.getElementById('pmiNumber').disabled ? '#next' : '#pmiNumber' };
            if (!caseIdVal) { return };
            !function activity_income_tab_pages() {
                if (["CaseEarnedIncome.htm", "CaseUnearnedIncome.htm", "CaseExpense.htm"].includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB'; return };
                    let warning = rederrortextContent.find(arrItem => arrItem.indexOf('Warning: This data will expire') > -1)
                    let newMember = document.querySelector('#memberReferenceNumberNewMember, #refPersonName'), hasVerif = document.querySelector('#ceiVerification, #verification, #verificationType')
                    focusEle = warning ? '#saveDB'
                    : newMember ? newMember
                    : hasVerif?.value === 'No Verification Provided' ? hasVerif
                    : document.getElementById('ceiIncomeType')?.value === "Self-employment" ? "#ceiGrossIncome" : document.querySelector('#ceiPrjAmount, #incomeProjectionAmount, #projectionExpenseAmount')
                }
                if (("CaseLumpSum.htm").includes(thisPageNameHtm)) {
                    focusEle = !editMode ? '#newDB' : document.getElementById('lumpSumVerification').value === 'No Verification Provided' ? '#lumpSumVerification' : '#memberReferenceNumberNewMember'
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
                        : firstEmptyElement(["No Verification Provided", 'No', 'Not Cooperating', ''])
                    }
                };
                if (("CaseChildProvider.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = '#newDB' }
                    else if (editMode) {
                        focusEle = rederrortextContent.find(arrItem => arrItem.indexOf("Warning") > -1) ? '#saveDB'
                        : document.getElementById('memberReferenceNumberNewMember') && !document.getElementById('memberReferenceNumberNewMember')?.value ? '#memberReferenceNumberNewMember'
                        : document.getElementById('providerType').value === "Legal Non-licensed" ? '#hoursOfCareAuthorized'
                        : (!document.getElementById('primaryBeginDate').value && !document.getElementById('secondaryBeginDate').value) && document.getElementById('providerType').value !== "Legal Non-licensed" ? '#primaryBeginDate'
                        : '#hoursOfCareAuthorized'
                    }
                }
                if (["CaseFraud.htm", "CaseImmigration.htm"].includes(thisPageNameHtm)) { if (!editMode) { focusEle = '#newDB' } }
                if (("CaseMember.htm").includes(thisPageNameHtm)) {
                    tbodyFocusNextEdit()
                        focusEle = !editMode ? '#newDB'
                        : document.getElementById('next')?.disabled === false ? '#next'
                        : !document.getElementById('memberReferenceNumber')?.value ? '#memberReferenceNumber'
                        : firstEmptyElement(["No Verification Provided", 'No', 'Not Cooperating', ''])
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
                                else { focusEle = firstEmptyElement(["No Verification Provided", 'No', 'Not Cooperating', '']) }
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
                    focusEle = editMode ? '#memberReferenceNumberNewMember, #actualReturnDate' : '#newDB'
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
                    if (editMode && rederrortextContent.length === 1 && rederrortextContent[0].indexOf("Review Living Situation") > -1) { focusEle = gbl.eles.save }
                    else {
                        let previousButton = document.getElementById('previous'), residenceStreet1 = document.getElementById('residenceStreet1')
                        let editingMode = ( previousButton )
                            ? previousButton.disabled ? "appEditing"
                            : "appNotEditing" : document.getElementById('edit').disabled ? "editing" : "notEditing"
                        if (editingMode === "appNotEditing") { focusEle = residenceStreet1?.value ? '#wrapUpDB' : '#new' }
                        if (editingMode === "notEditing") { focusEle = '#editDB' }
                        if (["editing", "appEditing"].includes(editingMode)) {
                            let subsidizedHousing = document.getElementById('subsidizedHousing')
                            if (!subsidizedHousing?.value) { focusEle = subsidizedHousing }
                            else if (residenceStreet1?.value) { focusEle = '#effectiveDate' }
                        }
                    }
                }
                if (("CaseDisability.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#memberReferenceNumberNewMember' }
                if (("CaseRedetermination.htm").includes(thisPageNameHtm)) {
                    if (!editMode) { focusEle = document.getElementById('redeterminationStatus').value === 'Updates Required' ? '#wrapUpDB' : '#editDB' }
                    else if ( rederrortextContent.find(arrItem => arrItem.indexOf("Warning") > -1 )) { focusEle = '#saveDB' }
                    else { document.getElementById('redeterminationStatus').value = 'Updates Required'; focusEle = '#receiveDate' }
                }
                if (("CaseReinstate.htm").includes(thisPageNameHtm)) {
                    focusEle = !editMode ? document.getElementById('reason')?.value?.length ? '#wrapUpDB' : '#editDB'
                    : document.getElementById('reason')?.value?.length ? '#saveDB' : '#reason'
                }
            }();
            !function eligibility_SA_tabs_pages() {
                if (["CaseEligibilityResultSelection.htm", "CaseServiceAuthorizationApproval.htm"].includes(thisPageNameHtm)) {
                    !function checkIfBackground() {
                        let proceedButton = document.querySelector('#approveDB, #selectDB')
                        setTimeout(() => { // eleFocus due to timeout;
                            if (rederrortextContent.find(arrItem => arrItem.indexOf("Background transaction") > -1 || arrItem.indexOf("	No results for case") > -1) ) {
                                document.querySelector('#approve, #select').disabled = true
                                proceedButton.disabled = true
                                eleFocus(gbl.eles.submitButton)
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
                // if (["CaseCreateEligibilityResults.htm", "CaseCreateServiceAuthorizationResults.htm"].includes(thisPageNameHtm) && !editMode) { focusEle = !rederrortextContent.includes("Results successfully submitted.") ? '#createDB' : '#postWrapUpButtons > button' }
                if (("CaseServiceAuthorizationOverview.htm").includes(thisPageNameHtm)) { focusEle = !editMode && !noResultsForCase ? '#nextDB' : "#ageRateCategory" }
                if (("CaseCopayDistribution.htm").includes(thisPageNameHtm)) { let overrideReason = document.getElementById('overrideReason'); focusEle = !editMode && !noResultsForCase ? '#nextDB' : overrideReason.value ? overrideReason : "#copay" }
            }();
            !function case_other_pages() {
                if (["CaseSpecialLetter.htm", "CaseMemo.htm"].includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : document.querySelector('#memberComments, #status') }
                if (("CaseTransfer.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#newDB' : '#caseTransferFromType' }
                if (["CaseCSIA.htm", "CaseCSIB.htm", "CaseCSIC.htm", "CaseCSID.htm"].includes(thisPageNameHtm)) {
                    focusEle = !editMode ? '#newDB' : firstEmptyElement(["No Verification Provided", 'No', 'Not Cooperating', ''])
                    tbodiesFocus('#newDB')
                }
                if (("CaseNotes.htm").includes(thisPageNameHtm)) {
                    if (!editMode) {
                        waitForElmHeight('#caseNotesTable > tbody > tr:not(.hidden-tr)').then(() => {
                            let nothiddenTrCounts = document.querySelectorAll('#caseNotesTable > tbody > tr:not(.hidden-tr)')
                            if (nothiddenTrCounts.length) { nothiddenTrCounts[0].click(); focusEle = '#newDB' }
                        })
                    } else if (!localStorage.getItem("MECH2.note")?.length) {
                        let noteMemberReferenceNumber = document.getElementById('noteMemberReferenceNumber')
                        noteMemberReferenceNumber.addEventListener( 'focus', () => setTimeout(gbl.eles.save.scrollIntoView({ behavior: 'smooth', block: 'end' }), 0) )
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
                if (("FinancialBilling.htm").includes(thisPageNameHtm)) { !editMode ? focusEle = '#editDB' : setTimeout(() => { eleFocus('#billedTimeType') }, 1000) }
                if (("FinancialBillingApproval.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#approveBillingDB' : '#remittanceComments' }
                if (("FinancialBillingRegistrationFeeTracking.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#addDB' : '#providerSiteId' }
                if (("FinancialAbsentDayHolidayTracking.htm").includes(thisPageNameHtm)) { focusEle = !editMode ? '#addDB' : '#dayType' }
                if (("FinancialManualPayment.htm").includes(thisPageNameHtm)) { focusEle = '#mpproviderIdVal' }
            }();
        }();
        !function autoFocusProvider() {
            if (!providerIdVal || rederrortextContent[0] === "This page is not available for this provider type.") { return };
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
            if ( rederrortextContent.find( item => item.indexOf('is missing') > -1 ) ) {
                focusEle = document.querySelector('errordiv').closest('div').querySelector('input, select') ?? document.querySelector('errordiv').closest('div').previousElementSibling.querySelector('input, select')
            }
        }();
    } catch (error) { console.trace("eleFocus section", focusEle, error) } //========== Auto_Focus_On_Page_Load End =================
    }();
}();
function eleFocus(ele) {
    if (ele === "blank") { return };
    let eleToFocus = sanitize.query(ele)
    eleToFocus = eleToFocus instanceof NodeList ? eleToFocus[0] : eleToFocus
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
//
//           datePicker related;
let datepickerDiv = document.getElementById('ui-datepicker-div');
!function jQueryDatePickerSettings() {
    if (iFramed) { return }; // Sets jQ calendar to show 3 months
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
}(); // Sets jQ calendar to show 3 months;
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
    if (!countyInfo.userSettings?.autoHideDatePicker || !datepickerDiv) { return }
    datepickerDiv?.classList.add('hidden')
    let datepickerFields = [...document.querySelectorAll('.hasDatepicker')]
    let removeHidden = datepickerFields?.forEach(ele => ele.addEventListener('click', () => datepickerDiv.classList.remove('hidden') ))
    let addHidden = datepickerFields?.forEach( ele2 => ele2.addEventListener('input', inputEvent => { if (inputEvent.data && parseInt(inputEvent.data) < 10) { datepickerDiv.classList.add('hidden') } }) )
    let pasteDate = datepickerFields?.forEach( ele3 => ele3.addEventListener('keydown', datepickerCtrlKeys) )
    async function datepickerCtrlKeys(keydownEvent) {
        if (keydownEvent.ctrlKey && ["a", "x", "c", "v"].includes(keydownEvent.key)) {
            keydownEvent.preventDefault();
            switch (keydownEvent.key) {
                case 'x': navigator.clipboard.writeText(keydownEvent.target.value); keydownEvent.target.value = ""; break;
                case 'a': keydownEvent.target.select(); break;
                case 'c': navigator.clipboard.writeText(keydownEvent.target.value); break;
                case 'v': {
                    let clipboardContents = await getClipboardText()
                    clipboardContents = dateFuncs.formatDate(clipboardContents.trim(), "mmddyyyy")
                    if (clipboardContents) { keydownEvent.target.value = clipboardContents }
                    doKeyup(keydownEvent.target)
                    doChange(keydownEvent.target)
                    doInput(keydownEvent.target)
                    return;
                }
            }
        }
    }
}();
function datepickerDateChanged(dateField, fn) {
    dateField = sanitize.query(dateField)
//     // dateField.addEventListener('keyup', )
//     // dateField.addEventListener('blur', )
//     const datepicker = document.getElementById('ui-datepicker-div')
//     if (!datepicker) { return }
//     const datepickerObserver = new MutationObserver(() => {
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
        if (dateControlParent.nodeName !== "DIV") { doWrap({ ele: dateControl }); dateControlParent = dateControl.parentElement }
        dateControlParent.classList.add('has-controls')
        dateControl.insertAdjacentHTML('beforebegin', '<button type="button" class="controls prev-control" id="prev.' + dateControl.id + '">-</button>')
        dateControl.insertAdjacentHTML('afterend', '<button type="button" class="controls next-control" id="next.' + dateControl.id + '">+</button>')
        dateControlParent.addEventListener('click', clickEvent => {
            if (clickEvent.target.nodeName !== "BUTTON") { return }
            let prevOrNext = clickEvent.target.id.split(".")[0], datePickerElement = prevOrNext === "prev" ? clickEvent.target.nextElementSibling : clickEvent.target.previousElementSibling, controlDate = sanitize.date(datePickerElement.value)
            if (increment === "month") {
                if (prevOrNext === "prev") { datePickerElement.value = dateFuncs.formatDate(dateFuncs.addMonths(controlDate, -1), "mmddyyyy") }
                else if (prevOrNext === "next") { datePickerElement.value = dateFuncs.formatDate(dateFuncs.addMonths(controlDate, 1), "mmddyyyy") }
            } else if (increment === "day") {
                if (prevOrNext === "prev") { datePickerElement.value = dateFuncs.formatDate( dateFuncs.addDays(controlDate, -1), "mmddyyyy" ) }
                else if (prevOrNext === "next") { datePickerElement.value = dateFuncs.formatDate( dateFuncs.addDays(controlDate, 1), "mmddyyyy" ) }
            }
        })
    })
};
//
//           highly specific operations;
function ifNoPersonUntabEndAndDisableChange(member, end, change='') {
    if (member = sanitize.query(member)) {
        sanitize.query(end).tabIndex = "-1"
        if (!change) { return };
        change = sanitize.query(change)
        change.readOnly = true
        change.tabIndex = "-1"
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
			caseMemberTableChildren[member].children[1].appendChild(createNewEle('span', { classList: "float-right-imp", style: "color: var(--textColorNegative);", textContent: noResponses.join(', ') }))
			// caseMemberTableChildren[member].children[1].insertAdjacentHTML('beforeend', '<span class="float-right-imp" style="color: var(--textColorNegative);">' + noResponses.join(', ') + '</span>')
		}
	}
};
function addValueClassdoChange(ele, addValue, addClass, event) {
    ele = sanitize.query(ele)
    if (!ele) { return }
    addValue ? ele.value = addValue : 0
    addClass && ele.classList.add(addClass)
    event && doChange(ele)
};
//
//           add/change element styles;
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
//
//           evalData to fetch and parse table data;
async function multiEvalData(listArray) {
    // const evalObj = {}
    // for await (const [index, caseNum] of listArray.entries()) {
    // }
    // return evalObj
};
async function forAwaitMultiCaseEval(listArray, pageName) {
    pleaseWait('Please Wait... ', true)
    let progressReport = document.getElementById('progressReport'), progressBar = document.getElementById('progressBar')
    const evalObj = {}
    let listArrayLength = listArray.length
    for await (const [index, caseNum] of listArray.entries()) {
        let indexNumber = index+1
        progressReport.textContent = "Please wait... " + indexNumber + " of " + listArrayLength
        progressBar.value = (indexNumber/listArrayLength)
        evalObj[caseNum] = await evalData({ caseProviderNumber: caseNum, pageName: pageName }).then().catch(err => { console.trace(err); });
        if (!evalObj[caseNum]) { thankYouForWaiting(); snackBar('Error: Data fetch failed.', '') ;return }
    }
    thankYouForWaiting()
    return evalObj
};
async function evalData({caseProviderNumber = caseIdVal, pageName = thisPageNameHtm, dateRange = '', evalString = '', caseOrProvider = 'case'} = {}) { // evalData({ caseProviderNumber: '', pageName: '', dateRange: '', evalString: '', caseOrProvider: '', })
    const searchParams = new URLSearchParams()
    searchParams.append(caseOrProvider === "case" ? "parm2" : "providerId", caseProviderNumber)
    dateRange.length && searchParams.append("parm3", dateFuncs.parm3date(dateRange))
    let unParsedEvalData = (pageName === thisPageNameHtm && !dateRange)
        ? [...document.querySelectorAll('script')].find(scr => scr.textContent.indexOf('eval') > -1)?.getHTML()
        : await getEvalData(pageName, searchParams.toString()).catch(err => { console.trace(err) })
    if (!unParsedEvalData?.length) { return false };
    let parsedEvalData = await parseEvalData(unParsedEvalData).catch(err => { console.trace(err, unParsedEvalData); })
    if (evalString) { parsedEvalData = await resolveEvalData(parsedEvalData, evalString) }
    return parsedEvalData

    async function getEvalData(pageName, searchParamString) {
        if (countyInfo.info?.userAccessDenied?.includes(allPagesMap.get(pageName)?.parentId)) { return undefined };
        return await fetchHTML('/ChildCare/' + pageName + '?' + searchParamString)
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
                parsedEvalData[i] = sanitize.json(match)
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
//
//           delay until condition is met; waitFor functions based on https://stackoverflow.com/a/61511955 //
function setIntervalLimited(callback, interval=100, x=1) {
    if (Number.isNaN(x)) { return };
    for (let i = 0; i < x; i++) {
        setTimeout(callback, i * interval);
    };
}; // setIntervalLimited(() => { alert('hit') }, 1000, 10);//=> hit...hit...etc (every second, stops after 10);
function intervalCheckForValue({ element, interval=100, iterations=1 }) {
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
        if (waitForTable?.children[1]?.firstElementChild?.children) {
            let recordsFound = waitForTable?.children[1]?.firstElementChild?.children.length
            return resolve(waitForTable, recordsFound);
        };
        const observer = new MutationObserver(mutations => {
            waitForTable = document.querySelector('div.dataTables_scrollBody > ' + tableStr)
            if (waitForTable?.children[1]?.firstElementChild?.children) {
                let recordsFound = waitForTable?.children[1]?.firstElementChild?.children.length
                observer.disconnect();
                resolve(waitForTable, recordsFound);
            };
        });
        observer.observe(document.body, { childList: true, subtree: true, });
    })
};
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
};
//
//           show user text via popup (typical: copied text);
function snackBar(sbText, title = "Copied!", textAlign = "left") {
    document.getElementById('snackBarDiv')?.remove()
    let snackBarDiv = createNewEle('div', { id: "snackBarDiv" })
    title !== "notitle" && snackBarDiv.appendChild(createNewEle('span', { classList: "snackBar-title", textContent: title }))
    sbText.split('\n').forEach( textLine => snackBarDiv.appendChild( createNewEle('span', { textContent: textLine }) ) )
    document.body.appendChild(snackBarDiv)
};
function userPrompt() {
    const popupHTML = createNewEle('dialog', { classList: 'helpOuter', style: 'max-width: 50%;', open: "" }).appendChild(createNewEle('div', { style: "display: flex; flex-direction: column; gap: .5em; align-items: center; padding: 1em;"}))
    const popupChildren = [ ['h2', { textContent: "Enter the reason for the supplemental approval.", style: "margin: 0;" }], [ 'textarea', { rows: "5", cols: "60" }, ], [ 'button', { id: "savePopup", textContent: "Save", classList: "cButton", style: "width: fit-content;" } ], ]
    .forEach( ([nodeName, options]=[]) => popupHTML.appendChild(createNewEle(nodeName, options)))
    document.body.appendChild(popupHTML.parentElement)
    popupHTML.parentElement.showModal()
    popupHTML.querySelector('#savePopup').addEventListener('click', ({ target: clickEvent } = {}) => {
        popupHTML.parentElement.remove()
    })
}
//
//           clipboard functions;
function copyMailing() {
    // let providerData = document.getElementById('providerData'), providerType = providerData.children[3].firstElementChild.childNodes[2].textContent.trim(), providerName = providerData.firstElementChild.childNodes[4].textContent.trim()
    // if ( ["Legal Non-licensed", "MN DHS Licensed Family"].includes(providerType) ) { providerName = nameFuncs.commaNameReorder(providerName) }
    // if (document.getElementById('addrBillFormDisplay').value === "Site/Home") {
    //     let state = stateDataSwap.swapStateNameAndAcronym(document.getElementById('mailingSiteHomeState').value)
    //     let copyText = providerName + "\n" + document.getElementById('mailingSiteHomeStreet1').value + " " + document.getElementById('mailingSiteHomeStreet2').value + "\n" + document.getElementById('mailingSiteHomeCity').value + ", " + state + " " + document.getElementById('mailingSiteHomeZipCode').value
    //     navigator.clipboard.writeText(copyText);
    //     snackBar(copyText);
    // } else {
    //     let state = stateDataSwap.swapStateNameAndAcronym(document.getElementById('mailingState').value)
    //     let copyText = providerName + "\n" + document.getElementById('mailingStreet1').value + " " + document.getElementById('mailingStreet2').value + "\n" + document.getElementById('mailingCity').value + ", " + state + " " + document.getElementById('mailingZipCode').value
    //     navigator.clipboard.writeText(copyText);
    //     snackBar(copyText);
    // };
}; // unused function, designed for provider addresses;
function copy(clipText, sbText, sbTitle, sbAlign) {
    navigator.clipboard.writeText(clipText)
    sbText?.length > 0 && snackBar(sbText, sbTitle ?? 'notitle', sbAlign ?? 'left')
};
function formatHTMLtoCopy({ htmlCode, extraStyle='', addTableStyle=true, removeStyles=true } = {}) {
    if (typeof htmlCode === "object") {
        let clonedLabels = [...htmlCode.querySelectorAll('label')].forEach(ele => {
            if (!ele.nextElementSibling) { return };
            ele.insertAdjacentHTML('beforebegin', '<!--[if (gte mso 9)|(IE)]><table class="noBorder label"><tr><td><![endif]-->')
            ele.insertAdjacentHTML('afterend', '<!--[if (gte mso 9)|(IE)]></td><td><![endif]-->')
            ele.nextElementSibling.insertAdjacentHTML('afterend', '<!--[if (gte mso 9)|(IE)]></td></tr></table><![endif]-->')
        })
        htmlCode = htmlCode.outerHTML
    }
    let tableStyle = "table { border: solid green 1.5pt !important; white-space: nowrap; table-layout: fixed; border-collapse: collapse; line-height:1; margin: 0in; }"
    // let tableStyle = "table { border: 2px solid green !important; white-space: nowrap; table-layout: fixed; border-collapse: collapse; line-height:1; }"
    + " td, th { padding: 2px 10px; margin: auto; text-wrap: nowrap; }"
    + " thead td, th { font-weight: 700; background: #07416f; color: white; }"
    + " table tbody td { color: black; background: white; }"
    + " .noBorder { border: none !important; margin: 0in !important; padding: 0 !important; text-align: left; }"
    // + " .noBorder { border: none !important; margin: 0 !important; }"
    // + " .noBorder div { text-align: left; }"
    // + " .noBorder td { padding: 0 !important; }"
    let baseStyle = "body { font-size: 14pt; font-family: Calibri, sans-serif !important; mso-line-height-rule:exactly; line-height: 14pt; margin: 0in !important; }"
    // let baseStyle = "body, table, td, span, p, div { font-size: 14pt; font-family: Calibri, sans-serif !important; mso-line-height-rule:exactly; line-height:14px; }"
    // + " .MsoNormal { font-size:12.0pt; font-family:'Calibri',sans-serif !important; }"
    + " .hidden { display: none !important; }"
    + " .center { text-align: center; }"
    + " p, span, td, tr, th, tbody, thead, table { margin: 0in !important; }"
    // + " label, .label { font-weight: bold; }"
    htmlCode = htmlCode.replace(/\n|\t|&nbsp;|<br>| >/g, '').replace(/ *onkeypress=".+?" */ig, ' ').replace(/aria-(label|controls|describedby|live)=".+?"/ig, '').replace(/(class="sorting"|rowspan="1"|colspan="1")/ig, '').replace(/label>/ig, 'b>') // fixing/removing extra code
    htmlCode = removeStyles ? htmlCode.replace(/style=(".*?"|'.*?')/ig, ' ') : htmlCode
    let style = '<style type="text/css">' + [ baseStyle, (addTableStyle ? tableStyle : ''), extraStyle ].join(' ') + '</style>'
    htmlCode = htmlCode.replace(/\s+/g, ' ')
    // htmlCode = '<html><head>' + style + '</head><body>' + htmlCode + '</body></html>'
    // htmlCode = htmlCode.replace(/<p><\/p>/gi,'<p><span style="font-family:Calibri,sans-serif;display: block;"><o:p>&nbsp;</o:p></span></p>') // inserting dummy characters so that Outlook formats properly //
    htmlCode = htmlCode.replace(/<p><\/p>/gi,'<p style="margin: 0in !important; line-height: 14pt !important;">&nbsp;&nbsp;&nbsp;&nbsp;</p>') // inserting dummy characters so that Outlook formats properly //
    return style + htmlCode
    // return '<html><head>' + style + '</head><body>' + htmlCode + '</body></html>'
}
async function copyFormattedHTML(formattedHTML, doSnackBar=true) {
    const htmlBlob = new Blob([formattedHTML], { type: "text/html" });
    const data = new ClipboardItem({ "text/html": htmlBlob, });
    await navigator.clipboard.write([data]);
    doSnackBar && snackBar('Copied!', 'notitle');
};
async function getClipboardText() { return await navigator.clipboard.readText() }
function contextmenuCopy(contextmenuEvent) {
    if (!["TD", "A", "SPAN"].includes(contextmenuEvent.target.nodeName)) { return };
    contextmenuEvent.preventDefault()
    copy(contextmenuEvent.target.innerText, contextmenuEvent.target.innerText, "Copied", "center")
};
//
//           send value to sessionStorage;
function storeSelectedTableRow({ storeTable = 'table', rowOrValToSearch = 'row', clearEle = undefined, clearVal = undefined } = {}) {
    let rowOrVal = ( rowOrValToSearch === "row" ? getChildNum(sanitize.query(storeTable + ' .selected') ) : rowOrValToSearch ) ?? 0
    sessionStorage.setItem( 'selectedTableRow', JSON.stringify({ rowOrVal, clearEle, clearVal }) )
};
//
//           return value, no page changes;
async function fetchHTML(url, filterEle, textOrElement) {
    return await fetch(url)
        .then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`) }
        return response.text()
    })
        .then(htmlContent => {
        if (!filterEle) { return htmlContent }
        const tempHTML = document.createElement('html')
        tempHTML.innerHTML = htmlContent
        return textOrElement === "element" ? tempHTML.querySelector(filterEle) : tempHTML.querySelector(filterEle)?.outerHTML
    })
        .catch(error => { console.error('There was a problem with the fetch operation:', error) });
};
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
function inRange(x, min, max) { return Number(x).isNan ? undefined : x >= min && x <= max };
function getChildNum(childEle) { return ( childEle.nodeName === "TR" ? (childEle.rowIndex -1) : [...childEle.parentElement.children].indexOf(childEle) ) ?? undefined };
!function wordwrapTextareaElements() {
    const editableTextareas = [...document.querySelectorAll('textarea:not(:read-only)')]
    if (!editableTextareas.length) { return };
    const maxRowsTable = {}
    let saveButton = gbl.eles.save ?? gbl.eles.submitButton
    saveButton?.addEventListener('click', saveEvent => {
        editableTextareas.forEach(textbox => {
            textbox.value = textbox.value.replace(/–|—/g, '-').replace(/“|”/g, '"').replace(/‘|’/g, "'").replace(/•/g, '*')
            let maxColumns = Math.round(textbox.cols/10)*10, maxRows = 30 // rounding because they set casenotes to be 97 instead of coding the html/css correctly;
            let totalRows = splitStringAtWordBoundary({ textbox, maxColumns, maxRows })
            if (totalRows > maxRows) {
                if (!document.getElementById('maxRowsExceeded')) {
                    saveEvent.preventDefault()
                    document.querySelector('form')?.insertAdjacentHTML('afterbegin', '<div class="error_alertbox_new" id="maxRowsExceeded"><strong class="rederrortext">Warning: Number of lines of text (' + totalRows + ') exceeds maximum textbox lines (' + maxRows + ') and you will be logged out if you save.</strong></div>');
                    let maxRowsExceeded = document.getElementById('maxRowsExceeded')
                    flashRedOutline(maxRowsExceeded)
                    textbox.addEventListener('keydown', () => { maxRowsExceeded?.remove(); }, { once: true })
                }
            }
        })
    })
    function splitStringAtWordBoundary({ textbox, maxColumns=60, maxRows=30 } = {}) {
        let tbVal = textbox.value, tbLen = textbox.value.length
        if (tbVal.indexOf('\n') === -1 && ( tbLen <= maxColumns || ( tbLen === (maxColumns+1) && tbVal[ tbLen-1 ] === " " ) )) { return 1 }
        const splitStringArray = tbVal.split('\n').map( item => doStringSplitAtBoundary(item) )
        let tbRows = splitStringArray.length
        textbox.value = splitStringArray.join('\n')
        return tbRows
        function doStringSplitAtBoundary(stringItem) {
            const tempStringArray = []
            while (stringItem.length > maxColumns) {
                const lastSpaceIndex = stringItem.lastIndexOf(' ', maxColumns);
                tempStringArray.push(stringItem.substring(0, lastSpaceIndex+1))
                stringItem = stringItem.substring(lastSpaceIndex+1)
            }
            stringItem.length && tempStringArray.push(stringItem) // last line;
            return tempStringArray.join('\n')
        }
    };
}();
function convertFromAHK(ahkString) { // don't decode at this step - string may contain newlines which breaks JSON //
    ahkString = ahkString.split('AHKJSON')[1].replace(/(%(?![A-Z0-9]))/g, "%25") // Failsafe if AHK fails to encode % as %25 //
    return sanitize.json(ahkString)
};
function reduceArrToUniques(redArray=[]) {
    return redArray.reduce((accumulator, currentValue) => {
        let areValuesEqual = Array.isArray(currentValue) ? accumulator.some(accum => arraysEqual(accum, currentValue)) : accumulator.includes(currentValue)
        if (!areValuesEqual) { accumulator.push(currentValue) }
        return accumulator;
    }, []);
};
function arraysEqual(a, b) {
    if (JSON.stringify(a) === JSON.stringify(b)) { return true };
    if (a === b) { return true };
    if (a == null || b == null || a.length !== b.length) { return false };
    for (let i = 0; i < a.length; ++i) {
        if (a[i] !== b[i]) { return false };
    }
    return true;
};
function tableHasData(table) { return !!sanitize.query(table)?.querySelector('tbody > tr:nth-child(2)') };
//
//           return value to operate on page;
function createSlider({ label, title, id: sliderId, defaultOn: isChecked, font: sliderFontSize, classes: extraClasses, styles: extraStyles } = {}) {
    isChecked = isChecked ? "checked" : ''
    extraClasses = !extraClasses ? ' "'
    : Array.isArray(extraClasses) ? ' ' + extraClasses.join(" ") + '"' : ' ' + extraClasses + '"'
    extraStyles = !extraStyles ? ''
    : Array.isArray(extraStyles) ? ' style="' + extraStyles.join(" ") + '"' : ' style="' + extraStyles + '"'
    sliderFontSize = !sliderFontSize ? '' : ' style="font-size: ' + sliderFontSize + ';"'
    return '<div class="toggle-slider' + extraClasses + extraStyles + '><label title="' + title + '">' + label + '</label><label class="switch"' + sliderFontSize + '><input type="checkbox" id="' + sliderId + '" ' + isChecked + '><span class="slider round"></span></label></div>'
};
function createNewEle(nodeName, attribObj={}, dataObj) {
    let newEle = Object.assign(document.createElement(nodeName), attribObj);
    if (dataObj !== undefined) {
        for (const [dataName, dataValue] of Object.entries(dataObj)) { newEle.dataset[dataName] = dataValue }
    }
    return newEle
};
function htmlToEle(htmlString) { return htmlString.replace(/([a-z]+)=['"]([a-z -]+)['"]/gi, "$1: '$2', ").replace(/class:/, 'classList:').replace(/>(.+)<\//, "textContent: '$1', </").replace(/<([a-z]+)/, "'$1', {").replace(/<\/[a-z]+>/, "}") };
function addTertiaryEle(nodeName, attribObj) { return tertiaryActionArea.appendChild(createNewEle(nodeName, attribObj)) };
//
//           perform basic operations on page, don't return anything. some replacements for jQuery;
function doClick(ele) {
    ele = sanitize.query(ele)
    if (!ele) { return }
    let clickEvent = new MouseEvent('click')
    ele.dispatchEvent(clickEvent);
};
function doWrap({ ele, type='div', classNames='' } = {}) {
    ele = ele.nodeType === 3 ? ele : sanitize.query(ele)
    // if (!ele) { return }
    const wrappingElement = document.createElement(type);
    classNames !== '' && wrappingElement.setAttribute('class', classNames)
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
function doUnwrap(ele) { ele = sanitize.query(ele); ele.parentElement.outerHTML = ele.parentElement.innerHTML };
function unhideElement(element, trueFalse) { // true to remove hidden, false to add hidden;
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); trueFalse ? ele.classList.remove('hidden') : ele.classList.add('hidden') } );
};
function toggleVisible(element, trueFalse) {
    element = Array.isArray(element) ? element : element instanceof NodeList ? [...element] : [element]
    element.forEach( ele => { ele = sanitize.query(ele); ele.style.visibility = trueFalse ? 'visible' : 'hidden' } );
};
function clickCountEvents(clickEvent, singleClickFn, doubleClickFn) {
    if (clickCount) {
        clearTimeout(clickCount);
        clickCount = null;
    }
    switch (clickEvent.detail) {
        case 1: // single click action //
            clickCount = setTimeout(singleClickFn, 300); break;
        case 2: // double click action //
            setTimeout(doubleClickFn, 1); break;
        default: // higher than 2 click actions //
            break;
    }
}
function tbodiesFocus(elementToFocus, tablesForFocus) {
    elementToFocus = sanitize.query(elementToFocus)
    if (!elementToFocus) { return };
    tablesForFocus = tablesForFocus ? sanitize.query(tablesForFocus) : document.querySelectorAll('tbody')
    document.querySelectorAll('tbody')?.forEach(ele => {
        ele?.addEventListener('click', clickEvent => {
            if (clickEvent.altKey || clickEvent.shiftKey) { return };
            clickCountEvents(clickEvent, function() { eleFocus(elementToFocus) })
        })
        ele?.addEventListener('contextmenu', contextmenuCopy)
    })
};
function tbodyFocusNextEdit() {
    if (!appModeNotEdit) { return };
    document.querySelector('tbody').addEventListener('click', clickEvent => {
        if (clickEvent.altKey) { return }
        let next = document.getElementById('next'), wrapUpDB = document.getElementById('wrapUpDB')
        next?.disabled === false ? eleFocus(next) : eleFocus(wrapUpDB)
    })
};
function reselectSelectedTableRow(storedTable = 'table', scroll=0) {
    waitForTableCells(storedTable).then((storeTable, recordsFound) => {
        if (!storeTable || recordsFound < 2) { return };
        let storedTableRow = sanitize.json(sessionStorage.getItem('selectedTableRow')) ?? { rowOrVal: 0 }
        sessionStorage.removeItem('selectedTableRow')
        if ('clearEle' in storedTableRow) { if (document.getElementById(storedTableRow.clearEle).value !== storedTableRow.clearVal) { return } }
        let foundRow = storedTableRow.rowOrVal < 999 ? storeTable.children[1].children[storedTableRow.rowOrVal] : [...storeTable.children[1].children].find(row => row.textContent.indexOf(storedTableRow.rowOrVal) > -1)
        foundRow && foundRow.click()
        if (!foundRow || storedTableRow < 5 || !scroll) { return }
        let tableParams = storeTable.parentElement.getBoundingClientRect(), rowParams = foundRow.getBoundingClientRect()
        if (rowParams.top < tableParams.top || rowParams.bottom > tableParams.bottom) { foundRow.scrollIntoView({ behavior: "smooth", block: "center" }) }
    })
};
async function listPageLinksAndList(rowAndPageArrays = [{ listPageChild: 0, listPageLinkTo: "", listPageParm3: "", listPageReplace: [] }]) { // listPageLinksAndList([ { listPageLinkTo:"listPageLinkTo.htm", listPageChild: columnIfNot0, listPageParm3: columnIfRelevant }, { etc } ])
    let trNumberArray = []
    await waitForTableCells()
    rowAndPageArrays.forEach( ({ listPageChild, listPageLinkTo, listPageParm3, listPageReplace } = {}) => {
        let trs = [...document.querySelector('tbody').children]
        trs.forEach(tRow => {
            rowAndPageForEach({ tRow, listPageChild, listPageLinkTo, listPageParm3, listPageReplace })
        }) })
    return trNumberArray
    function rowAndPageForEach({ tRow, listPageChild, listPageLinkTo, listPageParm3 = "", listPageReplace = [] }) {
        let tRowChildren = tRow.children, tdWithNumber = tRowChildren[listPageChild]
        let tdWithNumberText = tdWithNumber.textContent
        tRow.id = tdWithNumberText
        trNumberArray.push(tdWithNumberText)
        if (listPageLinkTo) {
            let paramName = listPageLinkTo.indexOf("Provider") === 0 ? "providerId" : "parm2"
            let parm3 = !listPageParm3 ? ''
            : "&parm3=" + ( !listPageReplace.length ? tRowChildren[listPageParm3].textContent : tRowChildren[listPageParm3].textContent.replace(new RegExp(listPageReplace[0], listPageReplace[1]), listPageReplace[2]) )
            tdWithNumber.innerHTML = '<a target="_blank" href="/ChildCare/' + listPageLinkTo + '.htm?' + paramName + '=' + tdWithNumberText + parm3 + '">' + tdWithNumberText + '</a>'
        }
    }
};
function insertTextAndMoveCursor(textToInsert, activeEle) {
    activeEle = activeEle ? sanitize.query(activeEle) : document.activeElement
    if (!activeEle) { return }
    let cursorStart = activeEle.selectionStart; // current position of the cursor
    let activeEleText = activeEle.value
    let afterSelection = activeEleText.slice(activeEle.selectionEnd)
    activeEle.value = activeEleText.slice(0, cursorStart) + textToInsert + afterSelection // setting the modified text in the text area
    textSelect(activeEle, cursorStart + textToInsert.length);
    function textSelect(element, start, end) { //moves cursor to selected position (start) or selects text between (start) and (end);
        if (!element.setSelectionRange) { return };
        end ??= start;
        element.focus();
        element.setSelectionRange(start, end);
    };
};
function tabIndxNegOne(elementStringList) { queueMicrotask(() => { [...sanitize.query(elementStringList, true)].forEach(ele => { ele.tabIndex = '-1' }) }) };
function tempIncomes(tempIncomeEle, endDateEle) {
    tempIncomeEle = sanitize.query(tempIncomeEle)
    endDateEle = sanitize.query(endDateEle)
    document.querySelector('.stylus')?.insertAdjacentHTML('beforeend', 'label[for=' + tempIncomeEle.id + ']:first-letter { text-decoration:underline; }')
    window.addEventListener('keydown', keydownEvent => { //Keyboard shortcut
        if (keydownEvent.altKey && keydownEvent.key === 't') {
            keydownEvent.preventDefault()
            if (tempIncomeEle.value === "") { tempIncomeEle.value = "Yes"; endDateEle.tabIndex = 0; }
            else { tempIncomeEle.value = ""; endDateEle.tabIndex = -1; }
        }
    })
};
//
//           keydown/paste event related;
function preventKeys(keyArray, ms=1500) {
    window.addEventListener('keydown', keyShortDisable)
    function keyShortDisable(keydownEvent) { if (keyArray.includes(keydownEvent.key)) { keydownEvent.preventDefault() } }
    setTimeout(() => { window.removeEventListener('keydown', keyShortDisable) }, ms)
};
!function keyboardHotkeys() {
    if (iFramed) { return };
    window.addEventListener('keydown', async keydownEvent => {
        if (keydownEvent.key === "Alt") { keydownEvent.preventDefault(); return; }; // alt pressed without additional key;
        if (keydownEvent.key === "Tab" && keydownEvent.target.classList?.contains('hasDatepicker') && keydownEvent.target.value.length > 0 && keydownEvent.target.value.length < 10) { keydownEvent.preventDefault() }
        if (keydownEvent.altKey) {
            if (![ "d", "s", "n", "c", "e", "r", "w", "a", "p", "ArrowLeft", "ArrowRight", ].includes(keydownEvent.key)) { return };
            keydownEvent.preventDefault()
            switch (keydownEvent.key) {
                case 'd': document.querySelector(':is(#done, #delete):not(:disabled)')?.click(); break;
                case 's': document.querySelector('#save:not(:disabled)')?.click(); break;
                case 'n': document.querySelector(':is(#new, #next):not(:disabled)')?.click(); break;
                case 'p': document.querySelector(':is(#previous):not(:disabled)')?.click(); break;
                case 'c': document.querySelector(':is(#confirm:not(.modal #confirm), #Cancel, #cancel, #cancelnotice, #revert, #exit):not(:disabled)')?.click(); break;
                case 'e': document.querySelector('#edit:not(:disabled)')?.click(); break;
                case 'r': document.querySelector(':is(#resend, #return, #removecancel):not(:disabled)')?.click(); break;
                case 'w': document.querySelector('#wrapUp:not(:disabled)')?.click(); break;
                case 'a': document.querySelector(':is(#add, #approve, #approveBilling):not(:disabled)')?.click(); break;
                case 'ArrowLeft': document.querySelector('#previous:not(:disabled)')?.click(); break;
                case 'ArrowRight': document.querySelector('#next:not(:disabled)')?.click(); break;
                default: break;
            }
        } else if (keydownEvent.ctrlKey) {
            if (keydownEvent.target.classList.contains('hasDatepicker') || ['ssnReq'].includes(keydownEvent.target.id) || !["v", "s", "w" ].includes(keydownEvent.key)) { return };
            if (keydownEvent.target.nodeName === "INPUT" && keydownEvent.key === "v" && keydownEvent.target.closest('.panel-box-format') && !keydownEvent.target.classList.contains('form-button')) {
                pasteInput(keydownEvent)
            } else if ([ "s", "w" ].includes(keydownEvent.key)) {
                keydownEvent.preventDefault()
                switch (keydownEvent.key) {
                    case 's': gbl.eles.save?.disabled === false && gbl.eles.save.click(); break;
                    case 'w': { if (editMode || gbl.eles.wrapUp?.disabled === false) { gbl.eles.wrapUp.click(); } else { window.close() } break }
                    default: break;
                }
            }
        }
    });
    async function pasteInput(event) {
        event.preventDefault()
        let clipboardContents = await getClipboardText()
        if ((/[\{\}\[\]]/).test(clipboardContents) || clipboardContents.trim().length > 50) { return };
        insertTextAndMoveCursor(clipboardContents.trim().replace(/(?<=\d),(?=\d)|\$/g, ''), event.target) // remove ,$ from paste
        doChange(event.target)
        doInput(event.target)
    };
    !function hotkeysForModals() {
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
    }();
}();
!function openIdOnPasteFromAnywhere() {
    try {
        let caseOrProviderInput = gbl.eles.caseIdElement ?? gbl.eles.providerIdElement ?? undefined
        if (editMode || iFramed || caseOrProviderInput?.disabled) { return }
        window.addEventListener('paste', async () => {
            navigator.clipboard.readText()
                .then(pastedText => {
                pastedText = pastedText.trim()
                if ( (["TEXTAREA", "INPUT"].includes(document.activeElement.nodeName) && document.activeElement !== caseOrProviderInput) || !(/^[0-9]{1,8}$/).test(pastedText)) { return }
                if (!caseOrProviderInput) { window.open('/ChildCare/CaseNotes.htm?parm2=' + pastedText, '_blank'); return; }
                caseOrProviderInput.value = pastedText
                gbl.eles.submitButton.click()
            })
        })
    } catch (error) { console.trace(error) };
}(); // Accepts paste input from non-input fields, assumes it to be case or provider #, loads the page with that #. Also allows pasting into the Provider ID field.
function verbose() { if (!verboseMode) { return }; console.log(...arguments) };
//
//           personal amusement;
!function starFall() {
    if (!countyInfo.userSettings?.starFall) { return };
    document.body.classList.add('starfall')
    let start = Date.now()
    const originPosition = { x: 0, y: 0 };
    const last = { starTimestamp: start, starPosition: originPosition, mousePosition: originPosition }
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
    const calcDistance = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
    const calcElapsedTime = (start, end) => end - start;
    const appendElement = element => document.body.append(element), removeElement = (element, delay) => setTimeout(() => document.body.removeChild(element), delay);
    const createStar = position => {
        const star = document.createElement("span"), color = selectRandom(config.colors);
        star.className = "star fa-solid fa-sparkle";
        star.setAttribute('style', 'color: '+ color +'; left: '+ position.x +'px; top: '+ position.y +'px; font-size: '+ selectRandom(config.sizes) +'; text-shadow: 0px 0px 1.5rem '+ color +' / 0.5; animation-name: '+ config.animations[count++ % 3] +'; star-animation-duration: '+ config.starAnimationDuration +'ms;')
        appendElement(star);
        removeElement(star, config.starAnimationDuration);
    }
    const updateLastStar = position => { last.starTimestamp = Date.now(); last.starPosition = position; };
    const updateLastMousePosition = position => { last.mousePosition = position };
    const adjustLastMousePosition = position => {
        if (last.mousePosition.x === 0 && last.mousePosition.y === 0) { last.mousePosition = position }
    };
    const handleOnMove = e => {
        const mousePosition = { x: e.clientX, y: e.clientY }
        adjustLastMousePosition(mousePosition);
        const hasMovedFarEnough = calcDistance(last.starPosition, mousePosition) >= config.minimumDistanceBetweenStars,
            hasBeenLongEnough = calcElapsedTime(last.starTimestamp, Date.now()) > config.minimumTimeBetweenStars;
        if (hasMovedFarEnough || hasBeenLongEnough) {
            createStar(mousePosition);
            updateLastStar(mousePosition);
        }
        updateLastMousePosition(mousePosition);
    }
    window.onmousemove = mousemoveEvent => handleOnMove(mousemoveEvent);
    document.body.onmouseleave = () => updateLastMousePosition(originPosition);
}();
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
    function addPulsateAnimation(selector, styleSheet) {
        let firstVisibleOfSelector = document.querySelector(selector)
        firstVisibleOfSelector.scrollIntoView(false, { behavior: "smooth", })
        firstVisibleOfSelector.addEventListener( 'animationend', () => { styleSheet.replaceSync(""); }, { once: true } )
        styleSheet.replaceSync( selector + " { animation: shake-top 3.5s cubic-bezier(0.455, 0.030, 0.515, 0.955) 1 both; box-shadow: var(--highlightFocus) !important; }" );
        // helpStyleSheet.replaceSync( selector + " { animation: pulsate 0.5s linear 5 both; box-shadow: var(--highlightFocus) !important; }" ); ; alternative animation;
    };
};
!function postLoadChanges() {
    !function fixToLabels() {
        [...document.querySelectorAll('div.col-md-2 + label.col-lg-1:has(+ div.col-md-2)')].forEach(label => {
            if ( (["DIV", "INPUT"].includes(label.nextElementSibling.nodeName) && label.nextElementSibling.firstElementChild?.type === "text") ) {
                label.previousElementSibling.classList.add('to-next')
                label.nextElementSibling.classList.add('to-next')
            }
        });
    }();
    !function tabIndexFixes() {
        queueMicrotask(() => { // Removing items from the tabindex // also see resetTabIndex()
            let negOneElements = '#quit, #countiesTable #letterChoice, #reset, #noteCreator, #leaveDetailTemporaryLeavePeriodFrom, #leaveDetailTemporaryLeavePeriodTo, #leaveDetailExtendedEligibilityBegin, #tempLeavePeriodBegin, #tempLeavePeriodEnd'
            + '#extendedEligibilityBegin, #extendedEligibilityExpires, #redeterminationDate, #tempPeriodStart, #tempPeriodEnd, #deferValue, #leaveDetailRedeterminationDue, #leaveDetailExpires, #caseInputSubmit, #caseIdVal, #selectPeriod'
            tabIndxNegOne(negOneElements); //quit, countiesTable=application; redet date, eEE=activity pages; cIS=submit button; lC=specialletter; reset=caseNotes; tempLeave = activities; defer=redet
            !countyInfo.userSettings?.userAccessibility && tabIndxNegOne(document.querySelectorAll('table>thead>tr>td'))
            tabIndxNegOne(document.querySelectorAll('.borderless'))
        })
    }();
    !function changeTargetAttribToBlank() { if (!editMode) { ['Report\ a\ Problem', 'Maximum\ Rates'].forEach(ele => document.getElementById(ele)?.firstElementChild?.setAttribute('target', '_blank')) }; }();
    // if (!editMode) { document.getElementById('Report\ a\ Problem')?.firstElementChild?.setAttribute('target', '_blank'); document.getElementById('Maximum\ Rates')?.firstElementChild?.setAttribute('target', '_blank'); }; //change_to_open_in_new_tab
    document.querySelector('h1')?.closest('div.row')?.classList.add('h1-parent-row');
    !function disableAutoComplete() {
        if (!editMode || ["CaseNotes.htm", "CaseMemo.htm", "CaseSpecialLetter.htm", "CaseLetter.htm", ].includes(thisPageNameHtm)) { return };
        document.querySelector('form').autocomplete = "off"
    }();
}();
console.timeEnd('mec2functions load time');



//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
//
