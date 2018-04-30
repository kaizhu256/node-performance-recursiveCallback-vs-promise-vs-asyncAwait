# node-performance-recursiveCallback-vs-promise-vs-asyncAwait
benchmark js design-patterns recursive-callbacks vs promises vs async/await

#### result
```shell
state 1 - node (v9.11.1)
state 2 - http-server listening on port 3000
...
state 3 - clientHttpRequestWithRecursiveCallback - flooding http-server with request "http://localhost:3000"
state 5 - clientHttpRequestWithRecursiveCallback - testRun #99
state 5 - clientHttpRequestWithRecursiveCallback - requestsTotal = 14690 (in 5009 ms)
state 5 - clientHttpRequestWithRecursiveCallback - requestsPassed = 7349
state 5 - clientHttpRequestWithRecursiveCallback - requestsFailed = 7341 ({
    "statusCode - 500": true
})
state 5 - clientHttpRequestWithRecursiveCallback - 2933 requests / second
state 5 - mean requests / second = {
    "clientHttpRequestWithRecursiveCallback": "3059 (156 sigma)",
    "clientHttpRequestWithPromise": "2615 (106 sigma)",
    "clientHttpRequestWithAsyncAwait": "2591 (71 sigma)"
}
```

#### instructions
to reproduce result, run this standalone, zero-dependency/zero-config script:

```javascript
/*
 * example.js
 *
 * this zero-dependency example will benchmark nodejs' client-based http-requests throughput,
 * using recursive-callback/promise/async-await design-patterns.
 *
 * the program will make 100 test-runs (randomly picking a design-pattern per test-run),
 * measuring client-based http-requests/seconde over a 5000 ms interval.
 * it will save the 16 most recent test-runs for each design-pattern,
 * and print the mean and standard deviation.
 * any test-run with unusual errors (timeouts, econnreset, etc),
 * will be discarded and not used in calculations
 *
 * the script accepts one env variable $REQUESTS_PER_TICK, which defaults to 10
 * (you can try increasing it if you have a high-performance machine)
 *
 *
 *
 * example usage:
 * $ REQUESTS_PER_TICK=10 node example.js
 *
 * example output:
 *
 * state 1 - node (v9.11.1)
 * state 2 - http-server listening on port 3000
 * ...
 * state 3 - clientHttpRequestWithRecursiveCallback - flooding http-server with request "http://localhost:3000"
 * state 5 - clientHttpRequestWithRecursiveCallback - testRun #99
 * state 5 - clientHttpRequestWithRecursiveCallback - requestsTotal = 14690 (in 5009 ms)
 * state 5 - clientHttpRequestWithRecursiveCallback - requestsPassed = 7349
 * state 5 - clientHttpRequestWithRecursiveCallback - requestsFailed = 7341 ({
 *     "statusCode - 500": true
 * })
 * state 5 - clientHttpRequestWithRecursiveCallback - 2933 requests / second
 * state 5 - mean requests / second = {
 *     "clientHttpRequestWithRecursiveCallback": "3059 (156 sigma)",
 *     "clientHttpRequestWithPromise": "2615 (106 sigma)",
 *     "clientHttpRequestWithAsyncAwait": "2591 (71 sigma)"
 * }
 *
 * state 6 - process.exit(0)
 */

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
    var local;
    local = {};

    // require modules
    local.http = require('http');
    local.url = require('url');

    /* jslint-ignore-begin */
    local.clientHttpRequestWithAsyncAwait = async function (url, onError) {
    /*
     * this function will make an http-request using async/await design-pattern
     */
        var request, response, timerTimeout;
        try {
            response = await new Promise(function (resolve, reject) {
                // init timeout
                timerTimeout = setTimeout(function () {
                    reject(new Error('timeout - 2000 ms'));
                }, 2000);
                request = local.http.request(local.url.parse(url), resolve);
                request.on('error', reject);
                request.end();
            });
            await new Promise(function (resolve, reject) {
                // ignore stream-data
                response.on('data', local.nop);
                if (response.statusCode >= 400) {
                    reject(new Error('statusCode - ' + response.statusCode));
                    return;
                }
                response.on('end', resolve);
                response.on('error', reject);
            });
        } catch (error) {
            // cleanup timerTimeout
            clearTimeout(timerTimeout);
            onError(error);
            return;
        }
        onError();
    };
    /* jslint-ignore-end */

    local.clientHttpRequestWithPromise = function (url, onError) {
    /*
     * this function will make an http-request using promise design-pattern
     */
        var request, response, timerTimeout;
        new Promise(function (resolve, reject) {
            // init timeout
            timerTimeout = setTimeout(function () {
                reject(new Error('timeout - 2000 ms'));
            }, 2000);
            request = local.http.request(local.url.parse(url), resolve);
            request.on('error', reject);
            request.end();
        }).then(function (result) {
            return new Promise(function (resolve, reject) {
                response = result;
                // ignore stream-data
                response.on('data', local.nop);
                if (response.statusCode >= 400) {
                    reject(new Error('statusCode - ' + response.statusCode));
                    return;
                }
                response.on('end', resolve);
                response.on('error', reject);
            });
        }).then(onError).catch(function (error) {
            // cleanup timerTimeout
            clearTimeout(timerTimeout);
            onError(error);
        });
    };

    local.clientHttpRequestWithRecursiveCallback = function (url, onError) {
    /*
     * this function will make an http-request using recursive-callback design-pattern
     */
        var isDone, modeNext, request, response, onNext, timerTimeout;
        onNext = function (error) {
            modeNext += error instanceof Error
                ? Infinity
                : 1;
            switch (modeNext) {
            case 1:
                // init timeout
                timerTimeout = setTimeout(function () {
                    onNext(new Error('timeout - 2000 ms'));
                }, 2000);
                request = local.http.request(local.url.parse(url), onNext);
                request.on('error', onNext);
                request.end();
                break;
            case 2:
                response = error;
                // ignore stream-data
                response.on('data', local.nop);
                if (response.statusCode >= 400) {
                    onNext(new Error('statusCode - ' + response.statusCode));
                }
                response.on('end', onNext);
                response.on('error', onNext);
                break;
            default:
                if (isDone) {
                    return;
                }
                // cleanup timerTimeout
                clearTimeout(timerTimeout);
                isDone = true;
                onError(error);
            }
        };
        modeNext = 0;
        onNext();
    };

    local.clientHttpRequestOnError = function (error) {
    /*
     * this function is the callback for clientHttpRequest
     */
        if (error) {
            local.errorDict[error.message] = true;
            local.requestsFailed += 1;
        } else {
            local.requestsPassed += 1;
        }
        if (local.timeElapsed >= 5000 &&
                (local.requestsFailed + local.requestsPassed) === local.requestsTotal) {
            local.main();
        }
    };

    local.nop = function () {
    /*
     * this function will do nothing
     */
        return;
    };

    local.templateRenderAndPrint = function (template) {
    /*
     * this function render simple double-mustache templates with the local dict,
     * and print to stderr
     */
        console.error(template.replace((/\{\{.*?\}\}/g), function (match0) {
            return local[match0.slice(2, -2)];
        }));
    };

    local.main = function (error) {
    /*
     * this function will fun the main-loop
     */
        local.state += error
            ? Infinity
            : 1;
        switch (local.state) {
        case 1:
            // init local var
            local.clientHttpRequestUrl = 'http://localhost:3000';
            local.version = process.version;
            local.versionsJson = JSON.stringify(process.versions, null, 4);
            local.templateRenderAndPrint('state {{state}} - node ({{version}}) {{versionsJson}}');
            // create simple http-server that responds with random 200 or 500 statusCode
            local.http.createServer(function (request, response) {
                request
                    // ignore stream-data
                    .on('data', local.nop)
                    .on('error', console.error);
                // respond randomly with either 200 or 500 statusCode
                response.statusCode = Math.random() < 0.5
                    ? 200
                    : 500;
                response
                    .on('error', console.error)
                    .end();
            // listen on port 3000
            }).listen(3000, local.main);
            break;
        case 2:
            local.templateRenderAndPrint('state {{state}} - http-server listening on port 3000');
            local.main();
            break;
        case 3:
            local.clientHttpRequestState = local.clientHttpRequestState || 0;
            local.clientHttpRequestState += 1;
            if (local.clientHttpRequestState < 100) {
                switch (Math.floor(Math.random() * 3)) {
                case 0:
                    local.clientHttpRequest = local.clientHttpRequestWithAsyncAwait
                        ? 'clientHttpRequestWithAsyncAwait'
                        : 'clientHttpRequestWithRecursiveCallback';
                    break;
                case 1:
                    local.clientHttpRequest = global.Promise
                        ? 'clientHttpRequestWithPromise'
                        : 'clientHttpRequestWithRecursiveCallback';
                    break;
                case 2:
                    local.clientHttpRequest = 'clientHttpRequestWithRecursiveCallback';
                    break;
                }
            } else {
                local.state += 2;
                local.main();
                return;
            }
            local.templateRenderAndPrint('\nstate {{state}} - {{clientHttpRequest}} - ' +
                'flooding http-server with request "{{clientHttpRequestUrl}}"');
            local.errorDict = {};
            local.requestsFailed = 0;
            local.requestsPassed = 0;
            local.requestsTotal = 0;
            local.timeElapsed = 0;
            local.timeStart = Date.now();
            local.main();
            break;
        case 4:
            setTimeout(function () {
                for (local.ii = 0;
                        // configurable REQUESTS_PER_TICK
                        local.ii < (Number(process.env.REQUESTS_PER_TICK) || 10);
                        local.ii += 1) {
                    local.requestsTotal += 1;
                    local[local.clientHttpRequest](
                        local.clientHttpRequestUrl,
                        local.clientHttpRequestOnError
                    );
                }
                // recurse / repeat this step for 5000 ms
                local.timeElapsed = Date.now() - local.timeStart;
                if (local.timeElapsed < 5000) {
                    local.state -= 1;
                    local.main();
                }
            });
            break;
        case 5:
            local.timeElapsed = Date.now() - local.timeStart;
            local.requestsPerSecond = Math.round(1000 * local.requestsTotal / local.timeElapsed);
            local.errorDictJson = JSON.stringify(local.errorDict, null, 4);
            local.resultList = local.resultList || {};
            local.resultMean = local.resultMean || {};
            // only save result if no unusual errors occurred
            if (Object.keys(local.errorDict).length <= 1) {
                local.resultList[local.clientHttpRequest] =
                    local.resultList[local.clientHttpRequest] || [];
                local.resultList[local.clientHttpRequest].push(local.requestsPerSecond);
                // remove old data
                if (local.resultList[local.clientHttpRequest].length > 16) {
                    local.resultList[local.clientHttpRequest].shift();
                }
                // calculate mean
                local.resultMean[local.clientHttpRequest] = Math.round(
                    local.resultList[local.clientHttpRequest].reduce(function (aa, bb) {
                        return aa + (bb || 0);
                    }, 0) / local.resultList[local.clientHttpRequest].length
                );
                // calculate sigma
                local.resultMean[local.clientHttpRequest] += ' (' + Math.round(Math.sqrt(
                    local.resultList[local.clientHttpRequest].reduce(function (aa, bb) {
                        return aa + Math.pow(
                            (bb || 0) - local.resultMean[local.clientHttpRequest],
                            2
                        );
                    }, 0) / (local.resultList[local.clientHttpRequest].length - 1)
                )) + ' sigma)';
            }
            local.resultJson = JSON.stringify(local.resultMean, null, 4);
            local.templateRenderAndPrint(
/* jslint-ignore-begin */
'\
state {{state}} - {{clientHttpRequest}} - testRun #{{clientHttpRequestState}}\n\
state {{state}} - {{clientHttpRequest}} - requestsTotal = {{requestsTotal}} (in {{timeElapsed}} ms)\n\
state {{state}} - {{clientHttpRequest}} - requestsPassed = {{requestsPassed}}\n\
state {{state}} - {{clientHttpRequest}} - requestsFailed = {{requestsFailed}} ({{errorDictJson}})\n\
state {{state}} - {{clientHttpRequest}} - {{requestsPerSecond}} requests / second\n\
state {{state}} - mean requests / second = {{resultJson}}\n\
'
/* jslint-ignore-end */
            );
            // repeat test with other design-patterns
            local.state -= 3;
            local.main();
            break;
        default:
            if (error) {
                console.error(error);
            }
            local.exitCode = Number(!!error);
            local.templateRenderAndPrint('state {{state}} - process.exit({{exitCode}})');
            process.exit(local.exitCode);
        }
    };
    // run main-loop
    local.state = 0;
    local.main();
}());
```
