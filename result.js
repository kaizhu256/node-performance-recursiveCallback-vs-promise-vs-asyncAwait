/*jslint
    bitwise: true,
    browser: true,
    maxerr: 4,
    maxlen: 100,
    node: true,
    nomen: true,
    regexp: true,
    stupid: true
*/

(function () {
    'use strict';
    var Highcharts, avg, categories, local, series, std, tmp;
    local = {};
    // select-all
    local.domOnEventSelecAllInsidePre = function (event) {
    /*
     * this function will, if triggered inside <pre> element,
     * only select-all inside the <pre> element
     * https://stackoverflow.com/questions/985272/selecting-text-in-an-element-akin-to-highlighting-with-your-mouse
     */
        var range, selection;
        // init event-handling
        if (event && event.modeInit) {
            document.removeEventListener("keydown", window.domOnEventSelecAllInsidePre);
            window.domOnEventSelecAllInsidePre = local.domOnEventSelecAllInsidePre;
            document.addEventListener("keydown", window.domOnEventSelecAllInsidePre);
        }
        // select-all inside <pre> element
        if (event &&
                event.code === "KeyA" &&
                (event.ctrlKey || event.metaKey) &&
                event.target.closest("pre")) {
            range = document.createRange();
            range.selectNodeContents(event.target.closest("pre"));
            selection = window.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            event.preventDefault();
        }
    };
    local.domOnEventSelecAllInsidePre({ modeInit: true });
    // init debug_inline
    console['debug_inlineConsoleError'.replace('_i', 'I')] =
        console['debug_inlineConsoleError'.replace('_i', 'I')] ||
        console.error;
    console[
        'debug_inline'.replace('_i', 'I')
    ] = console[
        'debug_inline'.replace('_i', 'I')
    ] || function (arg0) {
    /*
     * this function will both print arg0 to stderr and return it
     */
        var consoleError;
        // debug arguments
        console['debug_inlineArguments'.replace('_i', 'I')] = arguments;
        consoleError = console['debug_inlineConsoleError'.replace('_i', 'I')];
        consoleError('\n\n\ndebug_inline'.replace('_i', 'I'));
        consoleError.apply(console, arguments);
        consoleError();
        // return arg0 for inspection
        return arg0;
    };
    ((typeof window === 'object' && window) || global)['debug_inline'.replace('_i', 'I')] =
        console['debug_inline'.replace('_i', 'I')];
    // plot data
    categories = [];
    series = [];
    window.data.data.forEach(function (element) {
        categories.push('v8-' + element.v8 + '<br>node-' + element.node);
        [
            'clientHttpRequestWithRecursiveCallback',
            'clientHttpRequestWithPromise',
            'clientHttpRequestWithAsyncAwait'
        ].forEach(function (name, ii) {
            // plot data
            tmp = series[ii] = series[ii] || {
                data: [],
                name: name
            };
            avg = Number(String(element[name]).split(' ')[0]) || 0;
            tmp.data.push(avg);
            // plot error
            tmp = series[ii + 3] = series[ii + 3] || {
                data: [],
                name: name + ' error',
                tooltip: {
                    pointFormat: '(error range: {point.low}-{point.high})<br/>'
                },
                type: 'errorbar'
            };
            std = Number(String(String(element[name]).split(' ')[1]).slice(1)) || 0;
            tmp.data.push([avg - std, avg + std]);
        });
    });
    window.data2.data.forEach(function (element) {
        [
            'clientHttpRequestWithRecursiveCallback',
            'clientHttpRequestWithPromise',
            'clientHttpRequestWithAsyncAwait'
        ].forEach(function (name, ii) {
            // plot data
            tmp = series[ii + 6] = series[ii + 6] || {
                data: [],
                name: name + '-rerun'
            };
            avg = Number(String(element[name]).split(' ')[0]) || 0;
            tmp.data.push(avg);
            // plot error
            tmp = series[ii + 9] = series[ii + 9] || {
                data: [],
                name: name + '-rerun error',
                tooltip: {
                    pointFormat: '(error range: {point.low}-{point.high})<br/>'
                },
                type: 'errorbar'
            };
            std = Number(String(String(element[name]).split(' ')[1]).slice(1)) || 0;
            tmp.data.push([avg - std, avg + std]);
        });
    });
    Highcharts = window.Highcharts;
    Highcharts.chart('container', {
        chart: {
            zoomType: 'xy'
        },
        title: {
            text: 'client-http-requests/second vs v8/nodejs-version'
        },
        xAxis: [{
            categories: categories,
            title: {
                text: 'v8/nodejs version'
            }
        }],
        yAxis: [{ // Primary yAxis
            labels: {
                format: '{value} req/s',
                style: {
                    color: Highcharts.getOptions().colors[1]
                }
            },
            max: 4900,
            min: 1700,
            title: {
                text: 'client-http-requests / second'
            }
            //!! type: 'logarithmic'
        }],

        tooltip: {
            shared: true
        },

        //!! series: [{
            //!! name: 'Rainfall',
            //!! type: 'column',
            //!! yAxis: 1,
            //!! data: [49.9, 71.5, 106.4, 129.2, 144.0, 176.0, 135.6, 148.5, 216.4, 194.1, 95.6, 54.4],
            //!! tooltip: {
                //!! pointFormat: '<span style="font-weight: bold; color: {series.color}">{series.name}</span>: <b>{point.y:.1f} mm</b> '
            //!! }
        //!! }, {
            //!! name: 'Rainfall error',
            //!! type: 'errorbar',
            //!! yAxis: 1,
            //!! data: [[48, 51], [68, 73], [92, 110], [128, 136], [140, 150], [171, 179], [135, 143], [142, 149], [204, 220], [189, 199], [95, 110], [52, 56]],
            //!! tooltip: {
                //!! pointFormat: '(error range: {point.low}-{point.high} mm)<br/>'
            //!! }
        //!! }, {
            //!! name: 'v8/nodejs',
            //!! //!! type: 'spline',
            //!! data: [7.0, 6.9, 9.5, 14.5, 18.2, 21.5, 25.2, 26.5, 23.3, 18.3, 13.9, 9.6],
            //!! tooltip: {
                //!! pointFormat: '<span style="font-weight: bold; color: {series.color}">{series.name}</span>: <b>{point.y:.1f}°C</b> '
            //!! }
        //!! }, {
            //!! name: 'v8/nodejs error',
            //!! type: 'errorbar',
            //!! data: [[6, 8], [5.9, 7.6], [9.4, 10.4], [14.1, 15.9], [18.0, 20.1], [21.0, 24.0], [23.2, 25.3], [26.1, 27.8], [23.2, 23.9], [18.0, 21.1], [12.9, 14.0], [7.6, 10.0]],
            //!! tooltip: {
                //!! pointFormat: '(error range: {point.low}-{point.high}°C)<br/>'
            //!! }
        //!! }],
        series: series
    });
    tmp = [];
    window.data.data.forEach(function (element, ii) {
        tmp.push({
            version: categories[ii],
            clientHttpRequestWithRecursiveCallback: element.clientHttpRequestWithRecursiveCallback,
            clientHttpRequestWithPromise: element.clientHttpRequestWithPromise,
            clientHttpRequestWithAsyncAwait: element.clientHttpRequestWithAsyncAwait,
            recursiveCallbackVsPromiseRatio: series[0].data[ii] / series[1].data[ii]
        });
    });
    window.data2.data.forEach(function (element, ii) {
        tmp.push({
            version: categories[ii],
            'clientHttpRequestWithRecursiveCallback-rerun':
                element.clientHttpRequestWithRecursiveCallback,
            'clientHttpRequestWithPromise-rerun': element.clientHttpRequestWithPromise,
            'clientHttpRequestWithAsyncAwait-rerun': element.clientHttpRequestWithAsyncAwait,
            'recursiveCallbackVsPromiseRatio-rerun': series[0].data[ii] / series[1].data[ii]
        });
    });
    // output json data to pre1
    document.querySelector(
        '#pre1'
    ).textContent = JSON.stringify(tmp, null, 4);
}());
