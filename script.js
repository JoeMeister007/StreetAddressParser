var spreadsheetinput;
var errorAlert;
var outputCsv;
var removeDuplicates;
var addressSet = new Set();
var removeDuplicatesCheckbox;
var includeOtherColsCheckbox;
var includeOtherCols;


function onLoad() {
    errorAlert = document.getElementById("errorAlert");
    spreadsheetinput = document.getElementById("spreadsheetinput");
    spreadsheetinput.addEventListener("change", () => {

    });

    //load user settings from local storage or set defaults
    let lsRemoveDuplicates = localStorage.getItem("removeDuplicates");
    removeDuplicatesCheckbox = document.getElementById("removeDuplicatesCheckbox");
    if (lsRemoveDuplicates == null) {
        removeDuplicates = removeDuplicatesCheckbox.checked;
        localStorage.setItem("removeDuplicates", removeDuplicates);
    }
    else {
        removeDuplicates = 'true' == lsRemoveDuplicates;
        removeDuplicatesCheckbox.checked = removeDuplicates;

    }

    let lsIncludeOtherCols = localStorage.getItem("includeOtherCols");
    includeOtherColsCheckbox = document.getElementById("includeOtherColsCheckbox");
    if (lsIncludeOtherCols == null) {
        includeOtherCols = includeOtherColsCheckbox.checked;
        localStorage.setItem("includeOtherCols", includeOtherCols);
    }
    else {
        includeOtherCols = 'true' == lsIncludeOtherCols;
        includeOtherColsCheckbox.checked = includeOtherCols;

    }

}

function onFileOrSettingChange(wasSettingChange) {
    //Update the settings
    if (removeDuplicatesCheckbox.checked != removeDuplicates) {
        removeDuplicates = removeDuplicatesCheckbox.checked;
        localStorage.setItem("removeDuplicates", removeDuplicates);
    }

    if (includeOtherColsCheckbox.checked != includeOtherCols) {
        includeOtherCols = includeOtherColsCheckbox.checked;
        localStorage.setItem("includeOtherCols", includeOtherCols);
    }

    // If the file was removed call some function to clean up the UI
    if (spreadsheetinput.files.length == 0) {
        if (!wasSettingChange) {
            fileRemoved();
        }
        return;
    }

    addressSet = new Set();

    //Parse the file
    Papa.parse(spreadsheetinput.files[0], {
        complete: fileParsed,
        header: true,
        skipEmptyLines: true,
    });
}

// Takes an address and puts in in lowercase, removing extra spaces and non-alphanumeric characters
// This is a helper function for recognizing duplicates
function standardizeAddress(address) {
    address = address.toLowerCase();
    address = address.trim();
    address = address.replace(/\s+/g, " ");
    address.replace(/[^a-z0-9]/g, "");
    return address;
}

function insertHead(headerRow) {
    let th = document.createElement("th");
    headerRow.appendChild(th);
    return th;
}

function fileParsed(results) {
    hideError();
    resetOutputCsv();
    resetTable();

    if (results.errors.length > 0) {
        showError();
        return;
    }

    // set up the csv header row
    var addressIndex = 0;
    var tableHead = document.getElementById("previewTableHead");
    var headerRow = tableHead.insertRow();
    var headCsvRow = [];
    for (var i = 0; i < results.meta.fields.length; i++) {
        if (results.meta.fields[i] == "Address") {
            addressIndex = includeOtherCols ? i : 0;
            headCsvRow = headCsvRow.concat(["Address", "City", "State", "Zip"]);
            let cell = insertHead(headerRow);
            cell.textContent = "Address";
            cell = insertHead(headerRow);
            cell.textContent = "City";
            cell = insertHead(headerRow);
            cell.textContent = "State";
            cell = insertHead(headerRow);
            cell.textContent = "Zip";
            continue;
        }
        if (includeOtherCols) {
            headCsvRow.push(results.meta.fields[i]);
            let cell = insertHead(headerRow);
            cell.textContent = results.meta.fields[i];
        }
    }
    outputCsv.push(headCsvRow);
    
    // parse the addresses to make a csv array and fill out the table
    var tableBody = document.getElementById("previewTableBody");
    for (var i = 0; i < results.data.length; i++) {
        if (removeDuplicates) {
            let standardized = standardizeAddress(results.data[i]["Address"]);
            if (addressSet.has(standardized)) {
                continue;
            }
            addressSet.add(standardized);
        }
        let parsed = parseAddress(results.data[i]["Address"])
        var csvRow = [];
        for (var j = 0; j < outputCsv[0].length; j++) {
            //just put in a placeholder value for the address columns for now
            if (j >= addressIndex && j < addressIndex + 4) {
                csvRow.push("");
                continue;
            }
            if (includeOtherCols) {
                csvRow.push(results.data[i][outputCsv[0][j]]);
            }
        }

        let row = tableBody.insertRow();

        if (parsed == null) {
            csvRow[addressIndex] = results.data[i]["Address"];
            row.classList.add("table-danger");
        }
        else {
            csvRow[addressIndex] = parsed.address;
            csvRow[addressIndex + 1] = parsed.city;
            csvRow[addressIndex + 2] = parsed.state;
            csvRow[addressIndex + 3] = parsed.zip;

            if (/^\s*[0-9]+\s*$/.test(parsed.address)) {
                row.classList.add("table-warning");
            }
        }
        outputCsv.push(csvRow);

        for (var j = 0; j < csvRow.length; j++) {
            let cell = row.insertCell();
            cell.textContent = csvRow[j];
        }
    }

    showTable();
}

function fileRemoved() {
    hideError();
    hideTable();
    resetOutputCsv();
}

function showError() {
    errorAlert.classList.remove("d-none");
}
function hideError() {
    errorAlert.classList.add("d-none");
}

function resetOutputCsv() {
    outputCsv = [];
}

function resetTable() {
    var tableHead = document.getElementById("previewTableHead");
    while (tableHead.rows.length > 0) {
        tableHead.deleteRow(0);
    }
    var tableBody = document.getElementById("previewTableBody");
    while (tableBody.rows.length > 0) {
        tableBody.deleteRow(0);
    }
}

function showTable() {
    var tableContainer = document.getElementById("tableContainer");
    tableContainer.classList.remove("d-none");
    var downloadButton = document.getElementById("downloadBtnContainer");
    downloadButton.classList.remove("d-none");
}

function hideTable() {
    var tableContainer = document.getElementById("tableContainer");
    tableContainer.classList.add("d-none");
    var downloadButton = document.getElementById("downloadBtnContainer");
    downloadButton.classList.add("d-none");
}

function downloadCSV() {
    if (outputCsv.length <= 1) {
        return;
    }

    var csv = Papa.unparse(outputCsv);
    var blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "addresses.csv";
    if (spreadsheetinput.files.length > 0) {
        a.download = spreadsheetinput.files[0].name.split(".")[0] + "-addresses.csv";
    }
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}