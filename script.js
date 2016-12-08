window.sortAllJiraIssues = function(attr, order, valueType) {
    (function( $ ) {
        $('.ghx-columns .ghx-column, .ghx-has-issues').each(function() {
            var mylist = $(this);
            var listitems = mylist.find('.ghx-issue, .ghx-issue-compact').get();
            listitems.sort(function(a, b) {
                var compA;
                var compB;
                if (valueType == 'string') {
                    compA = $(a).attr(attr);
                    compB = $(b).attr(attr);
                }
                else if (valueType == 'integer'){
                    compA = parseInt($(a).attr(attr));
                    compB = parseInt($(b).attr(attr));
                }

                if (order == 'asc') {
                    return (compA < compB) ? -1 : (compA > compB) ? 1 : 0;
                }
                else {
                    return (compA > compB) ? -1 : (compA < compB) ? 1 : 0;
                }
            });
            $.each(listitems, function(idx, itm) {
                mylist.append(itm);
            });
        });
    })(jQuery);
}

var hidingHeight = 0;

function pluginAdjustSpace(){
    (function( $ ) {
        var mainHeight = 0;
        if($('#ghx-plan-group').length == 0){
            mainHeight = pluginToInt($('#ghx-work').css('height'));
        }
        else {
            mainHeight = pluginToInt($('#ghx-plan-group').css('height'));
        }

        if ($('#announcement-banner').is(":visible")){
            $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight - hidingHeight);
        }
        else {
            $('#ghx-report, #ghx-work, #ghx-plan, #ghx-plan-group').css('height', mainHeight + hidingHeight);
        }

        // Work View
        if($('#ghx-plan-group').length == 0){
            GH.SwimlaneStalker.poolStalker(); // Move the work view column header up
        }
    })(jQuery);
}

function pluginToggleMenu(){
    (function( $ ) {
        var src = $('#imgToggle').attr('src');
        if(src.indexOf('arrow_down') > 0){
            $('#intu-side-menu > a').not('.toggleMenu, .disabledMenu').css('display','block');
            $('#imgToggle').attr('src', src.replace('arrow_down', 'arrow_up'));
        }
        else {
            $('#intu-side-menu > a').not('.toggleMenu, .disabledMenu').css('display','none');
            $('#imgToggle').attr('src', src.replace('arrow_up', 'arrow_down'));
        }
    })(jQuery);
}

function pluginMaxSpace(){
    (function( $ ) {
        if (hidingHeight == 0) {
            hidingHeight = $('#announcement-banner').height() + $('header .aui-header').height() + $('#ghx-operations').height();
        }

        $('#announcement-banner, #header, #ghx-operations').toggle();
        if ($('#announcement-banner').is(":visible")){
            hidingHeight = 0;
        }

        pluginAdjustSpace();
    })(jQuery);
}

function pluginToInt(str){
    return parseInt(str.substring(0, str.length - 2));
}

function pluginCardsWatching(myName){
    (function( $ ) {
        $("div.ghx-issue").not("div.ghx-issue[_watchers*='" + myName + "']").toggle();
        $("div.ghx-issue-compact").not("div.ghx-issue-compact[_watchers*='" + myName + "']").toggle();
    })(jQuery);
}

function pluginToggleStatus(){
    (function( $ ) {
        $('#intu-filter-users, #intu-filter-components, #intu-mention, #intu-github').hide();
        $('#intu-status').toggle();
    })(jQuery);
}

function pluginShowGithubDashboard(){
    (function( $ ) {
        $('#intu-filter-users, #intu-filter-components, #intu-mention').hide();
        $('#intu-github').toggle();
    })(jQuery);
}

var lastEditPopup = '';
function checkACPopup(){
    jQuery(function($) {
        var textarea =  $('.jeditor_inst[name=customfield_13624]');
        if(textarea.length == 0) {
            lastEditPopup = '';
        }

        var ckeId = textarea.attr('id');
        var editor = CKEDITOR.instances[ckeId];

        if(editor !== undefined) {
            if(lastEditPopup != $('.jira-dialog-heading h2').text()){
                lastEditPopup = $('.jira-dialog-heading h2').text();
                convertToCheckboxesPopup();
            }
        }
    });
}

function checkACBrowse(){
    jQuery(function($) {
        if($('#field-customfield_13624 .verbose .flooded').length > 0){
            var html = $('#field-customfield_13624 .verbose .flooded').html();
            if(html == '' || html.indexOf('[]') > 0 || html.indexOf('[+]') > 0){
                convertToCheckboxesBrowse();
            }
        }
    });
}

function checkboxClicked(checkbox){
    jQuery(function($) {
        $(checkbox).attr('checked', $(checkbox).attr('checked') == 'checked' ? 'checked' : false);

        $newHtml = $($('.jira-dialog #ac_list').html());
        $newHtml.find('p').each(function(){

            if($(this).find('input').attr('checked') == 'checked'){
                $(this).find('input').remove();
                $(this).prepend('[+]');
            }
            else {
                $(this).find('input').remove();
                $(this).prepend('[]');
            }
        });
        newHtml = $newHtml[0].outerHTML;
        var editor = getEditor();
        editor.setData(newHtml);
    });
}

function AddNewCheckboxItem(){
    jQuery(function($) {
        var itemText = $('#checkbox_item_text').val();
        if(itemText == '') return;
        itemText = '<p>[]' + itemText + '</span></p>';

        var editor = getEditor();
        var html = editor.getData();

        var newHtml = '';
        if($(html).prop("tagName") != 'DIV'){
            html = '<div>' + html + '</div>';
        }
        $(html).find('p').each(function(){
            newHtml += '<p>' + $(this).html() + '</p>';
        });

        editor.setData(newHtml + itemText);

        convertToCheckboxesPopup();

        $('#checkbox_item_text').val('');
    });
}

function getTextarea(){
    var textarea =  jQuery('.jira-dialog .jeditor_inst[name=customfield_13624]');
    return textarea;
}

function getEditor(){
    var textarea = getTextarea();
    if(textarea.length == 0) return null;
    var ckeId = textarea.attr('id');
    var editor = CKEDITOR.instances[ckeId];
    return editor;
}

var intervalIdCheckPopupReady;

function triggerPopup(){
    jQuery(document).trigger({ type: 'keypress', which: "e".charCodeAt(0) });
    intervalIdCheckPopupReady = setInterval(function(){checkPopupReady()}, 2000);
}

function checkPopupReady(){
    console.log('------- checkPopupReady');
    var textarea = getTextarea();
    if(textarea == null || textarea.length == 0) return;
    clearTimeout(intervalIdCheckPopupReady);
    convertToCheckboxesPopup();
}

function convertToCheckboxesBrowse(){
    jQuery(function($) {
        var html = $('#field-customfield_13624 .verbose .flooded').html();
        var lines = html.split('\n');
        var newHtml = '';
        for(var i=0; i<lines.length; i++){
            var original = lines[i].trim();
            if(original.indexOf('[]') >= 0) {
                newHtml += original.replace('[]',"<input type=checkbox disabled>");
            }
            else if(original.indexOf('[+]') >= 0){
                newHtml += original.replace('[+]',"<input type=checkbox disabled checked>");
            }
        }

        if($('#ac_list').length == 0){
            jQuery('#customfield_13624-val').hide();
            jQuery('#customfield_13624-val').before('<div id=ac_list onclick="triggerPopup()">' + newHtml + '</div>');
        }
        else {
            $('#ac_list').html(newHtml);
        }
    });
}

function convertToCheckboxesPopup(){
    jQuery(function($) {
        console.log('----------- convertToCheckboxesPopup');

        var textarea = getTextarea();
        if(textarea == null) return;
        var editor = getEditor();

        // Hide the rich text editor
        $('.jeditor_inst[name=customfield_13624]').next().hide();

        // Get data
        var html = editor.getData();
        if($(html).prop("tagName") != 'DIV'){
            html = '<div>' + html + '</div>';
        }

        // Convert mark down to checkbox
        var newHtml = $(html);
        newHtml.find('p').each(function(index){
            var original = $(this).html();
            if(original.indexOf('[]') >= 0) {
                $(this).html("<input type=checkbox onclick='checkboxClicked(this)'>" + original.replace('[]',''));
            }
            else if(original.indexOf('[+]') >= 0){
                $(this).html("<input type=checkbox checked onclick='checkboxClicked(this)'>" + original.replace('[+]',''));
            }
        });
        newHtml = newHtml[0].outerHTML;

        if($('.jira-dialog #ac_list').length == 0){
            textarea.parent().prepend(
                '<div id=ac_list>' + newHtml + '</div>' +
                    '<div style="margin-bottom:30px;">' +
                    '<input type="text" id="checkbox_item_text">' +
                    '<a href="javascript:AddNewCheckboxItem();">Add New</a>' +
                    '</div>'
            );
        }
        else {
            $('.jira-dialog #ac_list').html(newHtml);
        }
    });
}

function pluginShowUserFilter(){
    (function( $ ) {
        pluginClose();
        $('#intu-filter-users').toggle();
    })(jQuery);
}

function pluginShowPriorityFilter(){
    (function( $ ) {
        pluginClose();
        $('#intu-filter-priorities').toggle();
    })(jQuery);
}

function pluginShowFixVersionFilter(){
    (function( $ ) {
        pluginClose();
        $('#intu-filter-fixversion').toggle();
    })(jQuery);
}

function pluginShowIssuetypeFilter(){
    (function( $ ) {
        pluginClose();
        $('#intu-filter-issuetype').toggle();
    })(jQuery);
}

function pluginShowComponentFilter(){
    (function( $ ) {
        pluginClose();
        $('#intu-filter-components').toggle();
    })(jQuery);
}

function pluginMention(){
    (function( $ ) {
        pluginClose();
        $('#intu-mention').toggle();
    })(jQuery);
}

function pluginFilterUser(name){
    (function( $ ) {
        $('.ghx-issue, .ghx-issue-compact').hide();
        $(".ghx-issue[_displayName='" + name + "']").show();
        $(".ghx-issue-compact[_displayName='" + name + "']").show();
    })(jQuery);
}

function pluginFilterPriority(name){
    (function( $ ) {
        $('.ghx-issue, .ghx-issue-compact').hide();
        $(".ghx-issue[_priority='" + name + "']").show();
        $(".ghx-issue-compact[_priority='" + name + "']").show();
    })(jQuery);
}

function pluginFilterFixVersion(name){
    (function( $ ) {
        $('.ghx-issue, .ghx-issue-compact').hide();
        $(".ghx-issue[_fixVersion='" + name + "']").show();
        $(".ghx-issue-compact[_fixVersion='" + name + "']").show();
    })(jQuery);
}

function pluginFilterIssuetype(name){
    (function( $ ) {
        if(name == 'Hide all sub-tasks'){
            $('.ghx-issue, .ghx-issue-compact').show();
            $(".ghx-issue-subtask").hide();
        }
        else {
            $('.ghx-issue, .ghx-issue-compact').hide();
            $(".ghx-issue[_issuetype='" + name + "']").show();
            $(".ghx-issue-compact[_issuetype='" + name + "']").show();
        }
    })(jQuery);
}

function pluginFilterComponent(name){
    (function( $ ) {
        $('.ghx-issue, .ghx-issue-compact').hide();
        $(".ghx-issue[_componentName*='|" + name + "']").show();
        $(".ghx-issue-compact[_componentName*='|" + name + "']").show();
    })(jQuery);
}

function pluginClearFilter(){
    (function( $ ) {
        $('.ghx-issue, .ghx-issue-compact').show();
    })(jQuery);
}

function pluginClose(){
    (function( $ ) {
        $('#intu-side-menu > div').hide();
    })(jQuery);
}
