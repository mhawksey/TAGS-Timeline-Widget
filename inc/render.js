// Query string handler
// https://gist.github.com/pirate/9298155edda679510723
function getUrlParams(search) {
    let hashes = search.slice(search.indexOf('?') + 1).split('&')
    let params = {}
    hashes.map(hash => {
        let [key, val] = hash.split('=')
        params[key] = decodeURIComponent(val)
    })

    return params
}

function loaded() {
    if (PARAMS.theme === 'dark') {
        document.body.className = 'dark';
    } else {
        document.body.className = '';
    }
    document.getElementById('chart_div').className = '';
    document.getElementById('tagsLink').setAttribute('href', "../?key=" + PARAMS.d + "&sheet=" + PARAMS.sheet);
    if (PARAMS.excludeTracking !== 'true') {
        document.getElementById('tracker').setAttribute('src', "https://ga-beacon.appspot.com/UA-48225260-1/TAGS/Widget/" + PARAMS.d + "?pixel");
    }
}

// get querystring params
var PARAMS = getUrlParams(window.location.search);

if (!PARAMS.d || !PARAMS.sheet) {
    // if no sheet or key
    console.log("No key or sheet...");
    loaded()
} else {
    // try to render
    // set meta options for Twitter embed
    if (PARAMS.theme) {
        document.querySelector('meta[name="twitter:widgets:theme"]').setAttribute("content", PARAMS.theme);
    }

    if (PARAMS.linkColor) {
        document.querySelector('meta[name="twitter:widgets:link-color"]').setAttribute("content", PARAMS.linkColor);
    }
    // Twitter JavaScript API Loading
    window.twttr = (function (d, s, id) {
        var js, fjs = d.getElementsByTagName(s)[0],
            t = window.twttr || {};
        if (d.getElementById(id)) return t;
        js = d.createElement(s);
        js.id = id;
        js.src = "https://platform.twitter.com/widgets.js";
        fjs.parentNode.insertBefore(js, fjs);

        t._e = [];
        t.ready = function (f) {
            t._e.push(f);
        };

        return t;
    }(document, "script", "twitter-wjs"));

    //Loading Google Visualisation API
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {
        'packages': ['table']
    });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawSheetName);
}

function drawSheetName() {
    var query = new google.visualization.Query(
        'https://docs.google.com/spreadsheets/d/' + PARAMS.d + '/gviz/tq?sheet=' + PARAMS.sheet + '&headers=1&tq=' + PARAMS.q);
    query.send(handleSampleDataQueryResponse);
}

function handleSampleDataQueryResponse(response) {
    if (response.isError()) {
        if (response.getMessage() === 'ACCESS_DENIED') {
            document.getElementById('msg').innerHTML = 'The owner of the TAGS Google Sheet has not shared so that anyone with the link can view';
        } else {
            document.getElementById('msg').innerHTML = 'Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage();
        }
        loaded();
        return;
    }

    // extract column index by name
    var c = [];
    var data = response.getDataTable();
    for (i = 0; i < data.getNumberOfColumns(); i++) {
        c[data.getColumnLabel(i)] = i;
    }

    // check it's a TAGS sheet we can use
    if (!(c['from_user'] >= 0 || c['text'] >= 0 || c['time'] >= 0 || c['id_str'] >= 0)) {
        document.getElementById('msg').innerHTML = 'This isn\'t a usable TAGS archive. The widget requires the following columns: <code>id_str</code>, <code>from_user</code>, <code>text</code> and <code>time</code>.';
        loaded();
        console.log("Not a useable TAGS Sheet");
        return;
    }

    var media = (PARAMS.includeMedia === 'false') ? 'data-cards="hidden"' : '';
    var thread = (PARAMS.excludeThread === 'false') ? 'data-conversation="none"' : '';

    // format the text column into a format that Twitter will convert into a tweet 
    var formatter = new google.visualization.PatternFormat('<blockquote class="twitter-tweet" data-lang="en" data-dnt="true" data-align="center" ' + media + ' ' + thread + '><p lang="en" dir="ltr">{1}</p>&mdash; @{0} <a href="https://twitter.com/{0}/status/{3}?ref_src=twsrc%5Etfw">{2}</a></blockquote>');
    formatter.format(data, [c['from_user'], c['text'], c['time'], c['id_str']], c['text']); // Apply formatter and set the formatted value of the first column.

    // only wan to display the text column
    var view = new google.visualization.DataView(data);
    view.setColumns([c['text']]);

    // Define a table css
    var cssClassNames = {
        'headerRow': 'headerRow',
        'tableRow': 'row',
        'tableCell': 'cell',
        'selectedTableRow': 'over',
        'hoverTableRow': 'over'
    };
    // create our table of tweets
    var table = new google.visualization.Table(document.getElementById('chart_div'));
    // When the table is ready, render the tweets.
    google.visualization.events.addListener(table, 'ready', function () {
        twttr.widgets.load();
        
        twttr.events.bind('rendered', function (event) {
            // host is the element that holds the shadow root:
            /* wasn't working in Edge... 
            const hosts = [...document.getElementsByTagName('twitterwidget')];
            // for each embedded tweet tweak the css to reduce the font
            hosts.forEach((el) => {
                var style = document.createElement('style');
                style.innerHTML = '.SandboxRoot.env-bp-min, .SandboxRoot.env-bp-min .TweetAction-stat, .SandboxRoot.env-bp-min .TweetAuthor-screenName, .SandboxRoot.env-bp-min .Tweet-alert, .SandboxRoot.env-bp-min .Tweet-authorScreenName, .SandboxRoot.env-bp-min .Tweet-card, .SandboxRoot.env-bp-min .Tweet-inReplyTo, .SandboxRoot.env-bp-min .Tweet-metadata { font-size: 0.9em; }';
                el.shadowRoot.appendChild(style)
            }); */
            var hosts = document.getElementsByTagName('twitterwidget');
            var hostList = [].slice.call(hosts);
            hostList.forEach(function(el){
                var style = document.createElement('style');
                style.innerHTML = '.SandboxRoot.env-bp-min, .SandboxRoot.env-bp-min .TweetAction-stat, .SandboxRoot.env-bp-min .TweetAuthor-screenName, .SandboxRoot.env-bp-min .Tweet-alert, .SandboxRoot.env-bp-min .Tweet-authorScreenName, .SandboxRoot.env-bp-min .Tweet-card, .SandboxRoot.env-bp-min .Tweet-inReplyTo, .SandboxRoot.env-bp-min .Tweet-metadata { font-size: 0.9em; }';
                el.shadowRoot.appendChild(style)
            })
            // when tweets have rendered remove loader
            loaded();
        });

    });
    // draw the table
    table.draw(view, {
        'allowHtml': true,
        'cssClassNames': cssClassNames,
        'alternatingRowStyle': false,
        'width': '100%',
        'height': (PARAMS.widgetHeight - 30) + 'px'
    });

}