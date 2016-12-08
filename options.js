function loadOptions() {
    if(document.getElementById("githubUsername")){
        document.getElementById("githubUsername").value = localStorage["githubUsername"] || '';
        document.getElementById("githubPassword").value = localStorage["githubPassword"] || '';
        document.getElementById("githubUser").value = localStorage["githubUser"] || 'live-community';
        document.getElementById("githubRepo").value = localStorage["githubRepo"] || 'live_community';
//        document.getElementById("watchersNames").value = localStorage["watchersNames"] || '';
    }
    document.getElementById("hoverDescription").checked = checkBool(localStorage["hoverDescription"]);
    document.getElementById("lastComment").checked = checkBool(localStorage["lastComment"]);
    document.getElementById("relatedCards").checked = checkBool(localStorage["relatedCards"]);
    document.getElementById("fixVersion").checked = checkBool(localStorage["fixVersion"]);

    document.getElementById("ck1").checked = checkBool(localStorage["ck1"]);
    document.getElementById("ck2").checked = checkBool(localStorage["ck2"]);
    document.getElementById("ck3").checked = checkBool(localStorage["ck3"]);
    document.getElementById("ck4").checked = checkBool(localStorage["ck4"]);
    document.getElementById("ck5").checked = checkBool(localStorage["ck5"]);
    document.getElementById("ck6").checked = checkBool(localStorage["ck6"]);
    document.getElementById("ck7").checked = checkBool(localStorage["ck7"]);
    document.getElementById("ck8").checked = checkBool(localStorage["ck8"]);
    document.getElementById("ck9").checked = checkBool(localStorage["ck9"]);
    document.getElementById("ck10").checked = checkBool(localStorage["ck10"]);
}

function checkBool(value){
    if(value === undefined || value == 'true'){
        return true;
    }
    else {
        return false
    }
}

function saveOptions() {
    if(document.getElementById("githubUsername")){
        localStorage["githubUsername"] = document.getElementById("githubUsername").value;
        localStorage["githubPassword"] = document.getElementById("githubPassword").value;
        localStorage["githubUser"] = document.getElementById("githubUser").value;
        localStorage["githubRepo"] = document.getElementById("githubRepo").value;
//        localStorage["watchersNames"] = document.getElementById("watchersNames").value;
    }
    localStorage["hoverDescription"] = document.getElementById("hoverDescription").checked;
    localStorage["lastComment"] = document.getElementById("lastComment").checked;
    localStorage["relatedCards"] = document.getElementById("relatedCards").checked;
    localStorage["fixVersion"] = document.getElementById("fixVersion").checked;

    localStorage["ck1"] = document.getElementById("ck1").checked;
    localStorage["ck2"] = document.getElementById("ck2").checked;
    localStorage["ck3"] = document.getElementById("ck3").checked;
    localStorage["ck4"] = document.getElementById("ck4").checked;
    localStorage["ck5"] = document.getElementById("ck5").checked;
    localStorage["ck6"] = document.getElementById("ck6").checked;
    localStorage["ck7"] = document.getElementById("ck7").checked;
    localStorage["ck8"] = document.getElementById("ck8").checked;
    localStorage["ck9"] = document.getElementById("ck9").checked;
    localStorage["ck10"] = document.getElementById("ck10").checked;

    document.getElementById("savedMsg1").style.display = 'inline-block';
    document.getElementById("savedMsg2").style.display = 'inline-block';
}

window.addEventListener("load", loadOptions);
document.getElementById("saveButton1").addEventListener("click",saveOptions);
document.getElementById("saveButton2").addEventListener("click",saveOptions);

document.getElementById("menubar").src = chrome.extension.getURL("images/menubar.png");
