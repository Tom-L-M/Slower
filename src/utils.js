

// https://dev.to/thiagomr/como-funciona-o-express-js-criando-um-http-server-express-like-do-zero-sem-frameworks-125p

// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-1-basics-methods-and-routing-a8
// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-2-middlewares-and-controllers-2fbc
// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-3-treating-request-and-response-objects-4ecf
// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-4-modular-router-and-global-middlewares-560m
// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-5-serving-static-files-3e11
// https://dev.to/wesleymreng7/creating-your-own-expressjs-from-scratch-part-6-creating-a-body-parser-middleware-15e7

// https://thecodebarbarian.com/write-your-own-express-from-scratch

const { statSync, readdirSync } = require('node:fs')
const { join } = require('node:path');
const { parse } = require('node:querystring');

function* getFiles(folder) {
    const files = readdirSync(folder);
    for (const file of files) {
        const absolutePath = join(folder, file)
        if (statSync(absolutePath).isDirectory()) {
            yield* getFiles(absolutePath)
        }
        else {
            yield absolutePath.replaceAll('..\\','')
        }
    }
}

const getMatchingRoute = (url, method, layers) => {
    method = method.toLowerCase();
    let list = [];
    // Get only the layers from the proper HTTP verb
    let routes = layers.get(method) || new Map();
    // Iterate through all routes, and get the one that match
    for (let [ pathFn, callback ] of routes) {
        let params = pathFn(getURLPathBody(url));
        // Return the matching route
        if (!!params) {
            // add to list
            let built = ({ callback });
            if (params.params && params.params['0'] === undefined)
                built['params'] = params.params;
            list.push(built);
        }
    }
    return list;
}

const normalizeAddress = addr => addr.startsWith('::') ? addr : addr.substring(addr.indexOf(':',2)+1);

const getFileExtension = (fname) => fname.split('.').filter(Boolean).slice(-1)[0];

// /page?foo=bar&abc=123    ->  /page
const getURLPathBody = (urlPath = '') => urlPath.split('?')[0] || '';

// /page?foo=bar&abc=123    ->  { foo: 'bar', abc: '123' }
const getURLQueryString = (urlPath = '') => parse((urlPath.split('?')[1] || '').split('#')[0]);

module.exports = { getMatchingRoute, getFiles, normalizeAddress, getFileExtension, getURLPathBody, getURLQueryString };