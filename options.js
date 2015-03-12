function loadOptions() {
    if(document.getElementById("githubUsername")){
        document.getElementById("githubUsername").value = localStorage["githubUsername"] || '';
        document.getElementById("githubPassword").value = localStorage["githubPassword"] || '';
        document.getElementById("githubUser").value = localStorage["githubUser"] || 'live-community';
        document.getElementById("githubRepo").value = localStorage["githubRepo"] || 'live_community';
        document.getElementById("watchersNames").value = localStorage["watchersNames"] || '';
    }
    document.getElementById("hoverDescription").checked = localStorage["hoverDescription"] || true;
    document.getElementById("lastComment").checked = localStorage["lastComment"] || true;
    document.getElementById("relatedCards").checked = localStorage["relatedCards"] || true;
    document.getElementById("fixVersion").checked = localStorage["fixVersion"] || true;
}

function saveOptions() {
    if(document.getElementById("githubUsername")){
        localStorage["githubUsername"] = document.getElementById("githubUsername").value;
        localStorage["githubPassword"] = document.getElementById("githubPassword").value;
        localStorage["githubUser"] = document.getElementById("githubUser").value;
        localStorage["githubRepo"] = document.getElementById("githubRepo").value;
        localStorage["watchersNames"] = document.getElementById("watchersNames").value;
    }
    localStorage["hoverDescription"] = document.getElementById("hoverDescription").checked;
    localStorage["lastComment"] = document.getElementById("lastComment").checked;
    localStorage["relatedCards"] = document.getElementById("relatedCards").checked;
    localStorage["fixVersion"] = document.getElementById("fixVersion").checked;

    document.getElementById("savedMsg").style.display = 'inline-block';
}

window.addEventListener("load", loadOptions);
document.getElementById("saveButton").addEventListener("click",saveOptions);
