# Installation
This script includes all user functions for MEC2 and is not meant to be used with MEC2Navigation. If MEC2Navigation is installed, disable or uninstall before using or it will cause double navigation bars.

Install instructions:

1. Install a UserScript extension, such as [ TamperMonkey on the Chrome Web Store.](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo). Other (untested) extensions are ViolentMonkey and GreaseMonkey.
2. Open [MEC2Functions Install](https://github.com/MECH2-at-Github/MEC2Functions-PROD/raw/main/MEC2Functions.user.js) and click the [ Install ] button
3. Done!

# Features
* Navigation buttons added to the top of MEC2
  * [+] buttons open the page in a new tab.
  * Buttons will highlight the current category and page in blue.
  * Buttons can also be used to navigate when on the Alerts and Provider or CaseList pages. Click a provider or case row, then click a navigation button.
* 'Open in a new tab' Case number field, along with two destination pages (Notes, Overview) at the top right of the Navigation buttons
  * Pressing enter after typing a case number selects 'CaseOverview'
* Period navigation buttons change periods without the select dropdown
  * Earlier + Submit, Earlier [Dropdown] Later, Later + Submit - « ‹ [Dropdown] › »
* Period order in the dropdown is reversed to be most recent on top, and future periods are displayed without needing to scroll

* Focus on page load:
  *Almost all pages have a default field or button that is 'focused' on page load to allow for quicker data entry or button press. By default, spacebar 'presses' a focused button.

* New! Massive rework done to style rules to prevent a page from 'bouncing' before the page is fully loaded.

* New! Load a case or provider by pasting the case number or provider ID from anywhere on the page, not just in the "Case:" or "Provider:" field (if the page has an editable Case or Provided # field)

* New! The top Navigation buttons can now be used from Alerts and the CaseLoad/ProviderList pages.

* Dark Mode will be selected if your Windows "Colors" theme is set to Dark. (Search for "Colors" via the Windows start menu or in Windows settings.)

* Pages with addresses have buttons to copy the mailing address to the clipboard.

* Hotkeys are available. ALT + _: N (new), W (wrap-up), S (save), C (cancel), D (delete), E (edit), R (resend), ArrowLeft (previous), ArrowRight (next)

* Footer Links:
  * Many new sites added to the Footer. User Manual link is changed to the old User Manual while the new manual is being created.

* CaseNotes & ProviderNotes pages: 
  * A "Duplicate" button has been added to the upper 'mimic' button row. This will store the Category, Summary, and Text of the note. When a new note is created, the button will change to Autofill. 
    * For CaseNotes, if the category is Application or Redetermination, the summary will change to "______ Update" 
  * The "`" key (located left of the 1 key typically) will insert an indent into a note that matches the Application/Redetermination category indent.
  * A 'green box' section of the page is removed and the "Worker" label and field is now located next to "Summary:". The only hidden field is "Created" which is the "Date" in the table.
  * "Note" size increased to 30 lines so that 100% of a note can be viewed at once. (Default site setting is 15 lines (50%).)
  * For CaseNotes:
    * "PMI/SMI Merge" and "Disbursed child care support arrears" are filtered. If the case has these notes, a button will appear above the table labeled [ Show # Extra Rows ]. Clicking toggles the filter.

* Maximum Rates: 
  * The link from the drop-down opens in a new window, fills the drop downs with SLC, Center, and the most recent rate period. Page also calculates the 15% and 20% amounts.

* CaseAddress: 
  * Blank mailing fields are hidden.

* Alerts:
  * [ Delete All ] will change to [ Deleting... ] and clicking [ Deleting... ] will stop the Delete All process (may still delete 1 or 2 alerts after clicking)
  * [ Create Alert ] moved next to [ Delete ].
  * Duplicate [ Delete ] created next to the alert count.
  * [ Automated Note ] will create a case/provider note based on the "Explanation:". 
  * Specific Explanations will have the "Summary" replaced to either fit in the available space or to include dates/member #.
  * Extra specific Explanations will change the "Member:".
  * An auto-case note is signed with the worker's name. When assisting other case workers, the signature will be "Worker A for Worker B".

* WorkerCreatedAlerts:
  * Buttons on the right will input a date and message intended for when a case has MFIP closing but needs the approval delayed. Dates are always set for the 1st of the month.

* ProviderSearch:
  * For searches that return more than 1 result: Filter buttons are available to filter out Inactive and county non-adjacent providers. Default behavior is both inactive and out-of-area providers are filtered.
  * For searches with 1 result: Results are not filtered, and clicking the provider link will open ProviderOverview in the same tab.
	
* CaseCSE (Child Support Enforcement):
  * [ Generate CS Forms ] loads a page to create, fill, and save CS Referral and CS Good Cause forms with client, children, case, and NCP filled.
  * Irrelevant fields are hidden by default.
	
* CaseServiceAuthorizationOverview:
  * [ Create Billing Form ] loads a page to create, fill, and save a manual billing form for the current period with all county fields filled. If there is more than one child, a billing form 'page 2' is created with a $0 copay.
  * [ Open Provider Address Page ] loads the ProviderAddress page.
	
* CaseSpecialLetter:
  * Clicking "Other" auto-fills the field with "See worker comments below".
	
* CaseMember:
  * "Ref #:" label is now a button that opens CaseMemberHistory.
  * "Birthdate:" will calculate the age of a child (years/months, months).
	
* CaseChildProvider:
  * New entry: Fields will auto-hide after a Provider ID is entered (either via search, or manual entry and then 'tabbing out' of the field). Most commonly this will hide questions that only apply to LNL providers.
    * These fields are also auto-hidden when viewing entries, based on provider type.
  * Start Date: date duplicates the Primary or Secondary start date when entered.
  * Buttons added for faster processing
    * [ Copy Start ] and [ Copy Endings ] buttons appear next to the duplicate [ Wrap-Up ] button. 
    * [ Copy Start ] copies the Provider ID, start dates, and Total Hours. The only manual entry is Member.
    * [ Copy Endings ] copies the end dates and End Reason.
    * [ Clear Dates & Hours ] removes all dates, hours, and end reason (for resuming care after a break).
    * [ Clear End Dates & Reason ] removes the end dates and reason, but preserve the start dates and hours.
    * [ Provider Contact ] opens the provider page with phone and email.
    * [ Provider Address ] opens the provider page with address.
	
* CaseEligibility pages:
  * Selection: Highlights unapproved eligible and ineligible results, and selects a result based on eligible/ineligible, and approved/unapproved. Eligible unapproved has the highest priority.
  * Family, Person, Activity, Financial: Highlights fields that require attention (such as 'In Family Size: No').
  * Approval: Temporary Ineligibility fields are stored, and automatically entered when editing an Approval page with blank TI fields (for when multiple periods need the same TI entries). Data is cleared on clicking [ Approve ].
	
* CaseApplicationInitiation:
  * "Benefit Period" automatically changes to the period containing the Application Received date.
  * The Application Received date is stored until "Wrap Up" and is used for "Actual Date" fields and the Funding Availability date.

* FundingAvailability:
  * Automatically set to Yes.
	
* CaseRedetermination:
  * Automatically set to Updates Required.
	
* CaseTransfer:
  * [ Transfer to X169CCA ] creates a worker-to-worker transfer entry with X169CCA as the worker.
	
* InactiveCaseList:
  * End/Denial dates over 45 days prior are now a link to the CaseTransfer page.
  * [ -> CCA ] next to the End/Denial date links will perform the worker-to-worker transfer from the InactiveCaseList page in an iframe.
  * [ Transfer All Old Cases ] will transfer all cases closed for more than 45 days via the iframe.
	
* ActiveCaseList:
  * "Search Results" at the top of the table breaks down Active and Suspended/TI numbers.
	
* CasePageSummary: 
  * [ Wrap-Up ] added next to [ Submit ] if changes have occurred.
	
* CaseSupportActivity:
  * "Extended Elig" activity end date automatically entered when a start date is entered.
	
* ProviderNotices:
  * [ Resend ] enabled for everyone.
	
* CasePaymentHistory:
  * Dates in the table are now links to the Financial Billing page.
	
* Login:
  * X number is stored and autofilled upon return.

* Welcome:
  * Automatically forwards to Alerts.


# MEC2Functions-PROD
