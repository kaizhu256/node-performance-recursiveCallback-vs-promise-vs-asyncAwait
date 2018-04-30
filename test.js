/* istanbul instrument in package node_performance_recursiveCallback_vs_promise_vs_asyncAwait */
/* jslint-utility2 */
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
'use strict';
(function () {
    switch (process.version.split('.')[0]) {
    case 'v0':
    case 'v1':
    case 'v2':
    case 'v3':
    case 'v4':
    case 'v5':
    case 'v6':
        require('fs').readFileSync('./example.js')
            .replace((/jslint-ignore-begin[\S\s]*?jslint-ignore-end/), '');
        break;
    default:
        require('./example.js');
    }
}());
