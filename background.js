chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.method == "getLocalStorage") {
        sendResponse({
            githubUsername: (localStorage['githubUsername'] || ''),
            githubPassword: (localStorage['githubPassword'] || ''),
            githubUser: (localStorage['githubUser'] || ''),
            githubRepo: (localStorage['githubRepo'] || ''),
            watchersNames: (localStorage['watchersNames'] || ''),
            hoverDescription: (localStorage['hoverDescription'] || 'true'),
            lastComment: (localStorage['lastComment'] || 'true'),
            relatedCards: (localStorage['relatedCards'] || 'true'),
            fixVersion: (localStorage['fixVersion'] || 'true')
        });
    }
    else
        sendResponse({});
});
