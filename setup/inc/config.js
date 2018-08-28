$(function () {
    var BASE_URL = 'https://hawksey.info/tagsexplorer/widget/?';
    var QS = '';
    M.AutoInit();

    document.addEventListener('DOMContentLoaded', function () {
        var elems = document.querySelectorAll('.tooltipped');
        var instances = M.Tooltip.init(elems, options);
    });

    document.addEventListener('DOMContentLoaded', function () {
        var elems = document.querySelectorAll('.collapsible');
        var instances = M.Collapsible.init(elems, options);
    });

    //Loading Google Visualisation API
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {
        'packages': ['table']
    });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(getColumns);

    function getColumns() {
        var d = $('#d').val().match(/[-\w]{25,}/)[0];
        var sheet = $('#sheet').val();
        var queryString = encodeURIComponent("SELECT * LIMIT 1");
        var query = new google.visualization.Query('https://docs.google.com/spreadsheets/d/' + d + '/gviz/tq?sheet=' + sheet + '&headers=1&tq=' + queryString);
        query.send(handleSampleDataQueryResponse);
    }



    function handleSampleDataQueryResponse(response) {
        if (response.isError()) {
            if (response.getMessage() === 'ACCESS_DENIED') {
                M.toast({
                    html: 'The owner of the TAGS Google Sheet has not shared so that anyone with the link can view'
                });
            } else {
                M.toast({
                    html: 'Error in query: ' + response.getMessage() + ' ' + response.getDetailedMessage()
                });
            }
            return;
        }
        // extract column index by name
        var c = [];
        var data = response.getDataTable();
        for (i = 0; i < data.getNumberOfColumns(); i++) {
            c[data.getColumnLabel(i)] = data.getColumnId(i);
        }

        // check it's a TAGS sheet we can use
        if (!c['from_user'] || !c['text'] || !c['time'] || !c['id_str']) {
            M.toast({
                html: 'This isn\'t a usable TAGS archive. The widget requires the following columns: <code>id_str</code>, <code>from_user</code>, <code>text</code> and <code>time</code>.'
            });
            return;
        }

        // build query to select columns
        var where = ($('#includeRT').is(":checked")) ? "" : "WHERE NOT(" + c['text'] + " starts with 'RT ')";
        var cols = c['from_user'] + ', ' + c['id_str'] + ', ' + c['text'] + ', ' + c['time'];
        QS = 'SELECT ' + cols + ', COUNT(' + c['id_str'] + ') ' +
            where + ' GROUP BY ' + cols +
            ' ORDER BY ' + c['time'] + ' DESC LIMIT 10';

        console.log(QS);
        updateEmbed();
    }


    $('#d, #sheet').on('change input paste', function (e) {
        getColumns();
    });

    $('.setting').on('change', function (e) {
        updateEmbed();
    });

    $('#includeRT').on('change', function (e) {
        getColumns();
    });

    $('#linkColor,#linkColorPicker').on('change input paste', function (e) {
        console.log($('#linkColor').val())
        if ($(this).attr('type') === 'color') {
            $('#linkColor').val($(this).val());
        } else {
            $('#linkColorPicker').val($(this).val());
        }
    });


    function updateEmbed() {
        var h = $('#widgetHeight').val();
        // ?linkColor=a23456&theme=dark&excludeMedia=true&excludeThread=true&d=15Bgx1cYH5FtFNjvOzBqrXF_eD4HUhxU7KWjDFL_3syw&sheet=Archive
        var params = {
            q: QS
        };
        $('input:not(".ex")').each(function () {
            if ($(this).attr('type') === 'checkbox') {
                var val = $(this).is(':checked');
            } else if ($(this).attr('type') === 'radio') {
                var val = $('input[name=' + $(this).attr('name') + ']:checked').val();
            } else if ($(this).attr('name') === 'd') {
                var val = $(this).val().match(/[-\w]{25,}/)[0]
            } else {
                var val = $(this).val();
            }
            params[$(this).attr('name')] = val;
        });

        var url = BASE_URL
        url += Object.keys(params).map(key => key + '=' + encodeURIComponent(params[key])).join('&')
        var iframe = '<iframe style="border:0; width:100%;max-width:500px;height:' + h + 'px" src="' + url + '" ></iframe>';
        $('#embed').html(iframe);
        M.textareaAutoResize($('#embed'));
        $('#preview').html(iframe);
    }
});