var spreadsheetinput;
var errorAlert;
var outputCsv;
var removeDuplicates;
var addressSet = new Set();

function onLoad() {
    errorAlert = document.getElementById("errorAlert");
    spreadsheetinput = document.getElementById("spreadsheetinput");
    spreadsheetinput.addEventListener("change", () => {

    });
    removeDuplicates = document.getElementById("removeDuplicatesCheckbox").checked;
}

function onFileOrSettingChange(wasSettingChange) {
    // If the file was removed call some function to clean up the UI
    if (spreadsheetinput.files.length == 0) {
        if (!wasSettingChange) {
            fileRemoved();
        }
        return;
    }

    //Update the settings
    removeDuplicates = document.getElementById("removeDuplicatesCheckbox").checked;
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

function fileParsed(results) {
    if (removeDuplicates) {
        console.log("Hi");
    }
    hideError();
    resetOutputCsv();
    resetTable();
    // parse the addresses to make a csv array and fill out the table
    var tableBody = document.getElementById("previewTableBody");
    for (var i = 0; i < results.data.length; i++) {
        if (removeDuplicates) {
            let standardized = standardizeAddress(results.data[i]["Address"]);
            if (addressSet.has(standardized)) {
                console.log(standardized);
                continue;
            }
            addressSet.add(standardized);
        }
        let parsed = parseAddress(results.data[i]["Address"])
        if (parsed == null) {
            outputCsv.push([results.data[i]["Address"], "", "", ""]);

            let row = tableBody.insertRow();
            row.classList.add("table-danger");
            let cell = row.insertCell();
            cell.textContent = results.data[i]["Address"];
            cell = row.insertCell();
            cell = row.insertCell();
            cell = row.insertCell();
            continue;
        }
        outputCsv.push([parsed.address, parsed.city, parsed.state, parsed.zip]);

        let row = tableBody.insertRow();
        let cell = row.insertCell();
        cell.textContent = parsed.address;
        if (/^\s*[0-9]+\s*$/.test(parsed.address)) {
            row.classList.add("table-warning");
        }
        cell = row.insertCell();
        cell.textContent = parsed.city;
        cell = row.insertCell();
        cell.textContent = parsed.state;
        cell = row.insertCell();
        cell.textContent = parsed.zip;
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
    outputCsv = [["Address", "City", "State", "Zip Code"]];
}

function resetTable() {
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