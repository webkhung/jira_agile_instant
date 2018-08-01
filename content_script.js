var hostname = "https://" + window.location.hostname;
var documentUrl = document.URL.toString()
var baseUrl = documentUrl.substring(0, documentUrl.indexOf('/secure/'));
var hoverDescription, showLastComment, relatedCards, fixVersion, ck1, ck2, ck3, ck4, ck5, ck6, ck7, ck8, ck9, ck10;
var statusCounts = {};
var statusStoryPoints = {};
var workFields = "&maxResults=1000&fields=key,priority,created,updated,status,summary,description,parent,labels,subtasks,assignee,issuelinks,fixVersions,comment,components,issuetype," + storyPointsField + extraFields;
var planFields = "&maxResults=1000&fields=key,priority,created,updated,status,summary,description,parent,labels,subtasks,assignee,issuelinks,fixVersions,comment,components,issuetype," + planExtraFields;
var planIssueQuery = " and issuetype in standardIssueTypes() and ((sprint is empty and resolutiondate is empty) or sprint in openSprints() or sprint in futureSprints())"
var workIssueQuery = " and (sprint in openSprints())";
var kanbanIssueQuery = "";
var jiraGithub = new JiraGithub();
var localStorageSet = false;
var workColumnStatuses = {}
var setTimeoutLoadPlugin;
var hasGithub;
var rapidViewID;
var bHasStarted = false;

chrome.storage.sync.get('enabled', function(value) {
    if(value.enabled || value.enabled === undefined) {
        startPlugin();
    }
});

chrome.storage.onChanged.addListener(function(changes, namespace) {
    for (key in changes) {
        var storageChange = changes[key];
        if(key == 'enabled' && storageChange.newValue == true){
            startPlugin()
        }
    }
});

function startPlugin(){
    if(bHasStarted){
        return;
    }
    bHasStarted = true;

    if(window.location.href.indexOf('RapidBoard') > 0) {
        setupRapidBoard();
    }
    //else if(window.location.href.indexOf('browse') > 0){
    //    setupIssuePage();
    //}
    else {
        jiraGithub.setIntervalChangeGithubPage();
    }
}

function setupIssuePage(){
    appendScriptsToPage();
    getLocalStorage();
    addPluginMenu();
}

function setupRapidBoard(){
    // Inject Js to document
    var script = document.createElement('script');
    script.appendChild(document.createTextNode('('+ setupClientLoadPluginEvent +')();'));
    (document.body || document.head || document.documentElement).appendChild(script);

    // Inject Css to document
    var css = '.ghx-issue .ghx-end { box-shadow: none !important; background: transparent !important; bottom: 12px !important;}',
        head = document.head || document.getElementsByTagName('head')[0],
        style = document.createElement('style');

    style.type = 'text/css';
    if (style.styleSheet){
        style.styleSheet.cssText = css;
    } else {
        style.appendChild(document.createTextNode(css));
    }
    head.appendChild(style);

    // Hide buttons / filters on the board are clicked.
    $('#work-toggle, #plan-toggle').on('click', function(){
        $('#intu-status-issues').html('');
        $('#intu-status').hide();
        $('#intu-menu-load').show();
    });

    appendScriptsToPage();

    getLocalStorage();

    // go will be an event sent from the document when call window.go()
    document.addEventListener("go", function(data) {
        updateJiraBoard();
    });

    document.addEventListener("loadPlugin", function(data) {
        loadPlugin();
    });

    setTimeoutLoadPlugin = setTimeout(function(){
        loadPlugin();
    }, 4000);
}

// Called whenever Jira refreshes the page or when the board is ready initially
function loadPlugin(){
    clearTimeout(setTimeoutLoadPlugin);

    console.log('--- loadPlugin');
    if(localStorageSet){
        jiraGithub.getGithubIssues();
        updateJiraBoard();
    }
    else {
        setTimeout(function(){
            loadPlugin();
        }, 2000);
    }
}

function setupClientLoadPluginEvent() {
    console.log('--- setupClientLoadPluginEvent');

    // Allow document to call window.go()
    window.go = function() {
        var event = document.createEvent('Event');
        event.initEvent('go');
        document.dispatchEvent(event);
    }

    // Detect Jira message
    GH.Logger.lo = GH.Logger.log;
    GH.Logger.log=function(c,b){
        if (c.indexOf('Finished callbacks for gh.work.pool.rendered') >= 0 || c.indexOf('GH.BacklogView.draw') >= 0){
            var event = document.createEvent('Event');
            event.initEvent('loadPlugin');
            document.dispatchEvent(event);
        }
        GH.Logger.lo(c,b);
    };

    setTimeout(function(){
        (function($) {
            $('#ghx-pool').on('click', '.issueLink', function(e){
                var issueKey = $(this).parents('.ghx-issue').data('issue-key');
                window.open("https://" + window.location.hostname + '/browse/' + issueKey);
                e.stopPropagation();
            });

            $('#work-toggle, #plan-toggle').on('click', function(){
                hidingHeight = 0;
                $('#announcement-banner, #header, #ghx-operations').show();
            });

            $(window).resize(function() {
                setTimeout(function(){pluginAdjustSpace()}, 1000);
            });
        })(jQuery);
    }, 4000);

    console.yo = console.log;
    console.log = function(str){
        if (str != null && str.indexOf('submit field: compare') >= 0){
            var event = document.createEvent('Event');
            event.initEvent('loadPlugin');
            document.dispatchEvent(event);
        }
        console.yo(str);
    }
}

function processIssues(data){
    console.log('--- processIssues');
    updateLoadStatus('Received ' + data.issues.length + ' issues details');

    $('.ghx-summary, .js-key-link').removeAttr('title'); // Dont like their <a> title so remove it.
    $('.columnStatus').remove();

    for(var key in workColumnStatuses) {
        workColumnStatuses[key].count = 0;
    }

    addIssueTypeFilter('Hide all sub-tasks');
    addUserFilter('Unassigned');

    console.log('--- processing data size ' + data.issues.length);
    data.issues.forEach(function(issue) {
        var elIssue = $("div[data-issue-key='" + issue.key + "'].ghx-issue, div[data-issue-key='" + issue.key + "'].ghx-issue-compact").first();
        if (elIssue.length == 0) return; // in case the card doesn't exist on the UI
        var fields = issue.fields;

        if(workColumnStatuses[parseInt(fields.status.id)]) {
            workColumnStatuses[parseInt(fields.status.id)].increment();
        }

        resetIssue(elIssue);
        var issueIsPR = jiraGithub.addPullRequestLabel(issue.key, elIssue);
        addHovercardTo(elIssue, fields, issue.key);
        addLabelTo(elIssue, createLabelFrom(fields.labels, issueIsPR, elIssue), 'top-right');
        addAttributesTo(elIssue, fields, issueIsPR);
        addOpenIssueLinkTo(elIssue, issue.key);

        if(fields.customfield_11712){
            addWatchersTo(elIssue, fields.assignee, fields.customfield_11712, watchersNames);
        }
    });

    for(var key in workColumnStatuses) {
        var wc = workColumnStatuses[key];
        if($(".columnStatus[data-id='" + wc.columnId + "']").length == 0) {
            $(".ghx-column[data-id='" + wc.columnId + "']").append("<div class='columnStatus' data-id='" + wc.columnId + "'></div>");
        }
        $(".columnStatus[data-id='" + wc.columnId + "']").append("<span>" + wc.name + ":" + wc.count + "</span>");
    }

    setIssueStatus(statusCounts, statusStoryPoints);
}

function updateJiraBoard() {
    console.log('updateJiraBoard');

    var sprintID = param('sprint');
    rapidViewID = param('rapidView');

    addPluginMenu();
    resetIssueStatus();


    chrome.runtime.sendMessage({method: "updateJiraBoard", id: sprintID + '_' + rapidViewID}, function(response) {});


    if (sprintID.length == 0 && rapidViewID.length == 0) {
        updateLoadStatus('Not a RapidBoard Url');
    }
    else {
        workColumnStatuses = {};
        // Disable caching for now.
        if(localStorage["JIS" + rapidViewID] === undefined) {
            $.get(baseUrl + "/rest/greenhopper/1.0/rapidviewconfig/editmodel.json?rapidViewId=" + rapidViewID, function( data ) {
                data.rapidListConfig.mappedColumns.forEach(function(mappedColumn) {
                    mappedColumn.mappedStatuses.forEach(function(mappedStatus){
                        var workStatus = new WorkStatus(mappedStatus.name, mappedColumn.id);
                        workColumnStatuses[mappedStatus.id] = workStatus;
                    });
                });

                localStorage["JIS" + data.id] = data.filterConfig.id;
                localStorage["JIS_ColumnStatuses" + rapidViewID] = workColumnStatusesToString();
                localStorage["JIS_kanban" + rapidViewID] = !data.isSprintSupportEnabled;

                callJira(sprintID, data.filterConfig.id, !data.isSprintSupportEnabled);
            });
        }
        else {
            var filterId = localStorage["JIS" + rapidViewID];
            var isKanban = localStorage["JIS_kanban" + rapidViewID]
            workColumnStatusesStringToHash(localStorage["JIS_ColumnStatuses" + rapidViewID]);
            callJira(sprintID, filterId, isKanban);
        }
    }
}

function callJira(sprintID, filterId, isKanban){
    if (sprintID !== undefined && sprintID != '') {
        makeApiRequest(baseUrl + "/rest/api/latest/search?jql=sprint%3D" + sprintID + searchFields());
    }
    else {
        var query = (isPlanView()? planIssueQuery : (isKanban ? kanbanIssueQuery : workIssueQuery));
        makeApiRequest(baseUrl + "/rest/api/latest/search?jql=filter=" + filterId + query + searchFields());
    }
}

function makeApiRequest(url){
    console.log('--- makeApiRequest' + url)
    updateLoadStatus('Calling JIRA API for issues details');
    $.get(url, processIssues, "json")
        .fail(function() {
            updateLoadStatus('Error calling JIRA search api"', true);
        });
}

function workColumnStatusesToString(){
    var hashString = '';
    for(var key in workColumnStatuses) {
        var wc = workColumnStatuses[key];
        hashString += key + '=' + wc.name + "%" + wc.columnId + ';';
    }
    return hashString;
}

function workColumnStatusesStringToHash(hashString){
    var pieces = hashString.split(';');
    pieces.forEach(function(piece){
        var p = piece.split('=');
        if(p == '') return;
        workColumnStatuses[p[0]] = new WorkStatus(p[1].split('%')[0], p[1].split('%')[1]);
    });
}

function searchFields(){
    if(isPlanView())
        return planFields;
    else
        return workFields;
}

function addPluginMenu(){
    $('#intu-menu').html("<span id='intu-menu-load'></span><span id='intu-menu-error'></span>");
    $('#intu-side-menu').remove();
    $('body').append("<div id='intu-side-menu'></div>");

    $('#intu-side-menu').append("<a href='javascript:pluginToggleMenu();' id='toggleMenu' title='Toggle Menu' class='toggleMenu'><img id='imgToggle' width=16 height=16 src=" + chrome.extension.getURL('images/arrow_down.png') + "></a>");
    $('#intu-side-menu').append("<a href='javascript:pluginMaxSpace();' id='maxSpace' title='Maximize Space' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/max.png') + "></a>");

    if(hasGithub && rapidViewID == 13709){
        $('#intu-side-menu').append("<a href='javascript:pluginShowGithubDashboard();' id='githubDashboard' title='Github Dashboard' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/github.png') + "></a>");
    }

    if(extraFields.indexOf('customfield_11712')>=0)
        $('#intu-side-menu').append("<a id='cardsWatching' href='javascript:pluginCardsWatching(\"" + myName() + "\");' title='Show cards I am watching' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/watching.png') + "></a>");

    var sorts = {
        label:        { id: 'sortLabel', image: "images/label.png", title: "Sort by labels", attr: "_label", order: "desc", valueType: "string" },
        assignee:     { id: 'sortAssignee', image: "images/assignee.png", title: "Sort by assignees", attr: "_displayName", order: "asc", valueType: "string" }
        // story_points: { image: "images/story_points.png", title: "Sort by story points", attr: "_storyPoint", order: "desc", valueType: "integer" },
    }
    for(var sortKey in sorts) {
        sort = sorts[sortKey];
        var img = $('<img />').attr({ src: chrome.extension.getURL(sort['image']), width:'16', height:'16' })
        var anchor = $('<a />').attr({ id: sort['id'], title: sort['title'], class: 'sort-icon masterTooltip', href: "javascript:window.sortAllJiraIssues('" + sort['attr'] + "', '" + sort['order'] + "', '" + sort['valueType'] + "')" });
        $('#intu-side-menu').append(anchor.append(img));
    };
    $('#intu-side-menu')
        .append("\
            <a href='javascript:pluginShowComponentFilter();' id='componentFilter' title='Component Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/component.png') + "></a>  \
            <a href='javascript:pluginShowUserFilter();' id='userFilter' title='User Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/users.png') + "></a>  \
            <a href='javascript:pluginShowPriorityFilter();' id='priorityFilter' title='Priority Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/priority2.png') + "></a>  \
            <a href='javascript:pluginShowFixVersionFilter();' id='fixversionFilter' title='FixVersion Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/fixversion.png') + "></a>  \
            <a href='javascript:pluginShowIssuetypeFilter();' id='issuetypeFilter' title='Issuetype Filters' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/story_points.png') + "></a>  \
            <a href='javascript:pluginToggleStatus();' id='issueStatus' title='Issue Status' class='masterTooltip'><img width=16 height=16 src=" + chrome.extension.getURL('images/status.png') + "></a>  \
            <a id='pluginMentionCount' href='javascript:pluginMention();' title='You are mentioned' class='masterTooltip'></a>")
        .append("<div id='intu-mention'></div>")
        .append("\
            <div id='intu-filter-components' class='intu-container'> \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <strong>Filter By Component:</strong> <a href='javascript:pluginClearFilter()' style='color:red'>Clear Filter</a> </div> \
            <div id='intu-filter-users' class='intu-container'> \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <strong>Filter By Assignee:</strong> <a href='javascript:pluginClearFilter()' style='color:red'>Clear Filter</a></div> \
            <div id='intu-filter-priorities' class='intu-container'> \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <strong>Filter By Priorities:</strong> <a href='javascript:pluginClearFilter()' style='color:red'>Clear Filter</a></div> \
            <div id='intu-filter-fixversion' class='intu-container'> \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <strong>Filter By Fix Versions:</strong> <a href='javascript:pluginClearFilter()' style='color:red'>Clear Filter</a></div> \
            <div id='intu-filter-issuetype' class='intu-container'>  \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <strong>Filter By Issue Types:</strong> <a href='javascript:pluginClearFilter()' style='color:red'>Clear Filter</a></div> \
            <div id='intu-status'>  \
                <a href='javascript:pluginClose();' class='close-button'>Close</a>\
                <div id='num-of-issues'><strong># of Issues : </strong><span id='intu-status-issues'></span></div>  \
                <div id='num-of-points'><strong># of Story Pts : </strong><span id='intu-status-points'></span></div></div>");

    if(!ck1) $('#maxSpace').addClass('disabledMenu').hide();
    if(!ck2) $('#cardsWatching').addClass('disabledMenu').hide();
    if(!ck3) $('#sortLabel').addClass('disabledMenu').hide();
    if(!ck4) $('#sortAssignee').addClass('disabledMenu').hide();
    if(!ck5) $('#componentFilter').addClass('disabledMenu').hide();
    if(!ck6) $('#userFilter').addClass('disabledMenu').hide();
    if(!ck7) $('#priorityFilter').addClass('disabledMenu').hide();
    if(!ck8) $('#fixversionFilter').addClass('disabledMenu').hide();
    if(!ck9) $('#issuetypeFilter').addClass('disabledMenu').hide();
    if(!ck10) $('#issueStatus').addClass('disabledMenu').hide();


    $('.masterTooltip').hover(function(){
        var title = $(this).attr('title');
        $(this).data('tipText', title).removeAttr('title');
        $('<p class="tooltip2"></p>').text(title).appendTo('body').fadeIn('fast');
    }, function() {
        $(this).attr('title', $(this).data('tipText'));
        $('.tooltip2').remove();
    }).mousemove(function(e) {
            var mousey = e.pageY - 15; //Get Y coordinates
            $('.tooltip2').css({ top: mousey })
        });
}

function setIssueStatus(statusCounts, statusStoryPoints) {
    var strStatusCounts = '';
    Object.keys(statusCounts).forEach(function (key) {
        var value = statusCounts[key];
        strStatusCounts += key + ": <strong>" + value + "</strong>&nbsp;&nbsp;&nbsp;";
    });

    var strStatusStoryPoints = '';
    Object.keys(statusStoryPoints).forEach(function (key) {
        var value = statusStoryPoints[key];
        strStatusStoryPoints += key + ": <strong>" + value + "</strong>&nbsp;&nbsp;&nbsp;";
    });

    $('#intu-menu-load').hide();
    $('#intu-status-issues').html(strStatusCounts);
    $('#intu-status-points').html(strStatusStoryPoints);
}

function addAttributesTo(elIssue, fields, issueIsPR){
    var storyPoint = 0;
    if (fields[storyPointsField]) storyPoint = fields[[storyPointsField]];

    var displayName = 'Unassigned';
    if (fields.assignee) displayName = fields.assignee.displayName;

    var priority = '';
    if (fields.priority) priority = fields.priority.name;

    var issuetype = '';
    if (fields.issuetype) issuetype = fields.issuetype.name;

    var fixVersions = '';
    if (fields.fixVersions) {
        for (var i=0; i < fields.fixVersions.length; i++){
            var fixVersionName = fields.fixVersions[i].name;
            fixVersions += (fixVersionName + ",");
        }
    }

    var label = "";
    if (issueIsPR) label = "Pull Request";

    labels = fields.labels.sort();
    if (labels.length > 0){
        for(var j=0; j<labels.length; j++){
            if(labels[j].indexOf('_') == 0){
                label += labels[j].substring(1).toLowerCase();
            }
        }
    }

    var watchers = '';
    if(fields.assignee) watchers = fields.assignee.name + ',';
    if(fields.customfield_11712) {
        for(var i=0; i < fields.customfield_11712.length; i++){
            var watcherName = fields.customfield_11712[i].name;
            watchers += (watcherName + ",");
        }
    }

    elIssue.attr('_displayName', displayName);
    elIssue.attr('_storyPoint', storyPoint);
    elIssue.attr('_label', label);
    elIssue.attr('_watchers', watchers);
    elIssue.attr('_priority', priority);
    elIssue.attr('_fixVersion', fixVersions);
    elIssue.attr('_issuetype', issuetype);

    // Add name filter
    addUserFilter(displayName);

    // Add priority filter
    addPriorityFilter(priority);

    //Add fix version filter
    addFixVersionFilter(fixVersions);

    //Add the issuetype filter
    addIssueTypeFilter(issuetype);

    if(fields.components){
        for(var i=0; i<fields.components.length; i++){
            var componentName = fields.components[i].name;

            // Add component filter
            if(componentName.length > 0 && $(".intu-filter-component[_componentName='" + componentName.replace(/'/g, "\\'") + "']").length == 0){
                var linkComponent = $('<a />').attr({
                    class: 'intu-filter-component',
                    href: "javascript:pluginFilterComponent('" + componentName + "')",
                    _componentName: componentName.replace(/'/g, "\\'")
                }).text(componentName);
                $('#intu-filter-components').append(linkComponent);
            }

            var currentComponent = '';
            if(elIssue.attr('_componentName') !== undefined)
                currentComponent = elIssue.attr('_componentName')
            elIssue.attr('_componentName',  currentComponent + "|" + componentName);

            if(ck5) $('#componentFilter').css('display', 'block');
        }
    }
}

function createLabelFrom(labels, issueIsPR, elIssue){
    var displayLabel = '';
    labels = labels.sort();

    for(var j=0; j<labels.length; j++){
        if(labels[j].indexOf('_') == 0){
            label = labels[j].substring(1);
            displayLabel += (label + ' ');
        }
    }

    if (displayLabel.length > 0) {
        elIssue.css('background-color', 'rgba('+ hexToRgb(shadeColor(stringToColour(displayLabel), 20)) + ',0.35)');
    }

    if(issueIsPR){
        if (displayLabel.length == 0){
            elIssue.css('background-color', '#C9FEFE');
        }
        displayLabel += 'Pull Request';
    }

    return displayLabel;
}

function addLabelTo(elIssue, label, position){
    label = label.trim();
    if (label.length > 0) {
        if (position == 'bottom-left')
            cssClass = 'intu-label-bottom-left';
        else if (position == 'bottom-top-left')
            cssClass = 'intu-label-bottom-top-left';
        else if (position == 'bottom-right')
            cssClass = 'intu-label-bottom-right';
        else if (position == 'top-left')
            cssClass = 'intu-label-top-left';
        else
            cssClass = "intu-label-top-right";
        elIssue.append("<div class='intu-label " + cssClass + "'>" + label + "</div>");
    }
}

function addOpenIssueLinkTo(elIssue, issueKey){
    if (elIssue.hasClass('ghx-issue-compact')) return
    var img = $('<img />').attr({
        src: chrome.extension.getURL("images/open.png"),
        width:'14',
        height:'13'
    })
    elIssue.find('.ghx-key').append(issueLinkJsHtml(issueKey, 'open-icon').append(img));
}


function addWatchersTo(elIssue, assignee, watchersField, watchersNames){
    var watchers = '';
    if(watchersField) {
        for(var i=0; i < watchersField.length; i++){
            var shortName = shortenName(watchersField[i].displayName); //.name
            if(watchersNames.indexOf(shortName.toLowerCase()) >= 0){
                watchers += (shortName + ", ");
            }
        }
    }

    if(assignee && watchers.indexOf(shortenName(assignee.displayName)) < 0){
        shortName = shortenName(assignee.displayName);
        if(watchersNames.toLowerCase().indexOf(shortName.toLowerCase()) >= 0){
            watchers = (shortName + ', ');
        }
    }

    watchers = watchers.substring(0, watchers.length - 2);

    if(watchers.length > 0)
        elIssue.find('.ghx-summary').append("<span class='intu-watchers'>" + watchers + "</span>");
}

function addHovercardTo(elIssue, fields, issueKey){
    // Subtasks
    var subtaskHtml = '';
    var subtaskKeys = [];

    fields.subtasks.forEach(function(subtask) {
        subtaskKeys.push(subtask.key);
        subtaskHtml += "<p>" + subtask.key + ' ' + subtask.fields.summary + " (" + subtask.fields.status.name + ")</p>";
    });
    if(subtaskHtml.length > 0) subtaskHtml = '<h3>Sub tasks</h3>' + subtaskHtml;

    // Parent
    var parentHtml = '';
    var parentKey = [];
    if (fields.parent) {
        parentKey.push(fields.parent.key);
        parentHtml += "<p>" + fields.parent.key + ' ' + fields.parent.fields.summary + " (" + fields.parent.fields.status.name + ")</p>";
    }
    if(parentHtml.length > 0) parentHtml = '<h3>Parent</h3>' + parentHtml;

    // Blocking and Blocked By
    var blocking = "";
    var blockedBy = "";
    var blockHtml = "";
    var blocks = [];

    if(fields.issuelinks) {
        fields.issuelinks.forEach(function(issuelink) {
            if(issuelink.type.name == 'Blocks'){
                if(issuelink.outwardIssue) { // means blocking this key
                    blocking += (issuelink.outwardIssue.key + ' ');
                    blocks.push(issuelink.outwardIssue.key);
                    blockHtml += "<p>Blocking: " + issuelink.outwardIssue.key + ' ' + issuelink.outwardIssue.fields.summary + " (" + issuelink.outwardIssue.fields.status.name + ")</p>";
                }
                else if(issuelink.inwardIssue && issuelink.inwardIssue.fields.status.name != 'Closed') { // means this issue is blocked by this key
                    blockedBy += (issuelink.inwardIssue.key) + ' ';
                    blocks.push(issuelink.inwardIssue.key);
                    blockHtml += "<p>Blocked By: " + issuelink.inwardIssue.key + ' ' + issuelink.inwardIssue.fields.summary + " (" + issuelink.inwardIssue.fields.status.name + ")</p>";
                }
            }
        });
    }

    if (blocking.length > 0) blocking = "Blocking " + blocking;
    if (blockedBy.length > 0) blockedBy = "Blocked By " + blockedBy;
    if(blockHtml.length > 0) blockHtml = '<h3>Block</h3>' + blockHtml;

    // Comment & Mentioning
    var commentHtml = "";
    if(fields.comment && fields.comment.comments.length > 0) {
        var lastComment = fields.comment.comments[fields.comment.comments.length-1];
        commentHtml += commentDisplayHtml(lastComment);
        if(!isPlanView()) {
            mentionHtml(issueKey, lastComment, fields.summary);
        }
    }

    if(commentHtml.length > 0){
        commentHtml = "<h3>Last Comment</h3><div class='hovercard-comment'>" + commentHtml + "</div>";
    }

    // fixVersion
    var fixVersionHtml = "";
    if(fields.fixVersions && fields.fixVersions.length > 0){
        fixVersions = fields.fixVersions[0];
        fixVersionHtml = "<h3>Fix Version</h3>" + fixVersions.name;
    }

    addLabelTo(elIssue, blocking + blockedBy, 'top-left');

    // Hygenie
    if (fields.customfield_14107 && fields.customfield_14107[0].value == 'Yes') {
        addLabelTo(elIssue, 'Hygiene', 'bottom-left');
    }

    // Acceptance Criteria
//    if (fields.customfield_13624 && fields.customfield_13624.length > 0) {
//        var accpCount = $('<p>' + fields.customfield_13624 + '</p>').find('li').length;
//        if(accpCount == 0) accpCount = 1;
//        addLabelTo(elIssue, 'AC ' + accpCount, 'bottom-top-left');
//    }

    // Status count
    if(statusCounts[fields.status.name] === undefined) statusCounts[fields.status.name] = 0;
    statusCounts[fields.status.name] = statusCounts[fields.status.name] + 1;

    // StoryPoint
    if(statusStoryPoints[fields.status.name] === undefined) statusStoryPoints[fields.status.name] = 0;
    if(fields[storyPointsField]) statusStoryPoints[fields.status.name] = statusStoryPoints[fields.status.name] + fields[storyPointsField];


    // This is on Plan view. Add summary
    var summaryHtml = '';
    if (elIssue.hasClass('ghx-issue-compact')){
        summaryHtml = "<h3>Summary</h3>" + fields.summary;
    }

    var descriptionHtml = '';
    if (fields.description && hoverDescription) {
        descriptionHtml = "<h3>Description</h3><div class='hovercard-desc'>" + fields.description + "</div>";
    }

    // Attach hovercard event to each jira issue element
    elIssue.find('.ghx-key').first().hovercard({ // Removed ".ghx-issue-fields:first" because it is too big.
        detailsHTML:
            "<h3 style='float:left;padding-top:0px;'>Status</h3>" +
                "<div style='float:right'><b>Created</b>: " + daysDiff(new Date(fields.created), new Date()) + ' days ago ' + " <b>Updated:</b> "+ daysDiff(new Date(fields.updated), new Date()) + ' days ago' + /*(new Date(fields.updated)).toLocaleDateString()*/
                "</div><div style='clear:both'></div>" +
                fields.status.name +
                (fixVersion ? fixVersionHtml : "")+
                summaryHtml +
                descriptionHtml +
                (relatedCards ? parentHtml : "")+
                (relatedCards ? subtaskHtml : "")+
                (relatedCards ? blockHtml : "")+
                (showLastComment? commentHtml : ""),
        width: 450,
        relatedIssues: subtaskKeys.concat(parentKey),
        blocks: blocks
    });
}

$.fn.hovercard = function(options) {
    $(this).unbind('mouseenter mouseleave');
    $(this).hover(
        function(e){
            var offset = $(this).offset();
            $('.hovercard').html(options.detailsHTML);

            var width = $('.hovercard').width();
            var height = $('.hovercard').height();
            var top = 0, left = 0;

            // Top
            if (($(this).offset().top + height/2) >  window.innerHeight){
                top = window.innerHeight - height - 20;
            }
            else {
                top = $(this).offset().top - height/2;
            }

            // Left - different cases for plan view and work view
            if ($(this).hasClass('ghx-key')){
                if ((window.innerWidth - (offset.left + $(this).width() + 50)) < 300) {
                    left = offset.left - 340;
                }
                else {
                    left = offset.left + $(this).width() + 50;
                }
            }
            else {
                if( (offset.left + $(this).width() + 45 + width) > window.innerWidth){
                    left = offset.left - width - 20;
                    if (left < 0) left = offset.left + $(this).width() + 45; // ugly.... fix late.
                }
                else {
                    left = offset.left + $(this).width() + 45;
                }
            }

            $('.hovercard').show().offset({'top': top, 'left': left});

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','dotted 2px red');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','dotted 2px red');
            }

            $(this).find('.open-icon').show();

            e.stopPropagation();
        },
        function(){
            $(this).find('.open-icon').hide();
            $('.hovercard').hide();
            $('.hovercard').html('');

            for(var i=0; i < options.relatedIssues.length; i++){
                var elIssue = $("div[data-issue-key='" + options.relatedIssues[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','none');
            }

            for(var i=0; i < options.blocks.length; i++){
                var elIssue = $("div[data-issue-key='" + options.blocks[i] + "'].ghx-issue");
                elIssue.find('.ghx-issue-fields:first').css('border','none');
            }
        }
    );
}

function getLocalStorage(){
    chrome.runtime.sendMessage({method: "getLocalStorage", key: "settings"}, function(response) {
        localStorageSet = true;
        hasGithub = jiraGithub.initVariables(response);
        watchersNames = response.watchersNames;
        hoverDescription = response.hoverDescription != 'false';
        showLastComment = response.lastComment != 'false';
        relatedCards = response.relatedCards != 'false';
        fixVersion = response.fixVersion != 'false';

        ck1 = response.ck1 != 'false';
        ck2 = response.ck2 != 'false';
        ck3 = response.ck3 != 'false';
        ck4 = response.ck4 != 'false';
        ck5 = response.ck5 != 'false';
        ck6 = response.ck6 != 'false';
        ck7 = response.ck7 != 'false';
        ck8 = response.ck8 != 'false';
        ck9 = response.ck9 != 'false';
        ck10 = response.ck10 != 'false';
    });
}

function appendScriptsToPage(){
    // Inject script.js to the document
    var s = document.createElement('script');
    s.src = chrome.extension.getURL('script.js');
    (document.head||document.documentElement).appendChild(s);
    s.onload = function() {
        s.parentNode.removeChild(s);
    };

    $('body').append("<div class='hovercard'></div>");
    $('body').append("<div id='intu-menu'></div>");
}
