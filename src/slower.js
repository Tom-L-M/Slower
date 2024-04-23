
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { createReadStream } = require('node:fs');
const { pipeline } = require('node:stream/promises');

const { match } = require('path-to-regexp');

const { setupRequest, setupResponse } = require('./decorators');
const utils = require('./utils');

const MIME_TABLE = require('./mimetable.json');
const HTTP_VERBS = http.METHODS.map(v => v.toLowerCase());

class SlowerRouter {
    #server;

    // You can create it with HTTPS options here
    /**
     * Use HTTPS server instead of HTTP. 
     * Pass in all regular HTTPS options as parameters.
     * 'key' and 'cert' options are required for HTTPS.
     * @param {object} options 
     * @returns {http.Server|https.Server}
     * @example
     *  SlowerRouter({https:true, key:'...', cert:'...'}); // Create HTTPS server
     *  SlowerRouter(); // Create regular HTTP
     */
    constructor (options = {}) {
        this.METHODS = HTTP_VERBS;
        this.layers = new Map();

        // Create basic route shortcuts
        // get(), post(), put(), delete()
        for (let verb of HTTP_VERBS) {
            this.layers.set(verb, new Map());
            this[verb] = function (path, callback) {
                return this.#setRoute(verb, path, callback);
            };
        }

        if (options.https) 
            this.#server = https.createServer(options);
        else
            this.#server = http.createServer(options);

        this.#server.on('request', this.#requestHandlerWrapper(this));
    }
    
    #requestHandlerWrapper () {
        // Save the 'this' scope
        // Inside the requestHandler function, 'this' corresponds to the http.Server instance
        const self = this;

        return (async function requestHandler (req, res) {
            // Get all routes that match the URL and join with middlewares to cycle
            let foundRoutes = utils.getMatchingRoute(req.url, req.method, self.layers);
            let layers = foundRoutes;

            // Set properties on request and response objects
            req = await setupRequest(req);
            res = await setupResponse(res);

            // Cycle throught all middlewares and proper routes and call with 'next()' as third argument
            ;(async function cycleMatching (routes) {
                if (routes.length === 0) return;
                let route = routes[0];
                if (route.params) req.params = route.params;
                if (route.callback) route = route.callback;
                route(req, res, async () => cycleMatching(routes.slice(1)));
            })(layers);
        });
    }

    listen (...v) { return this.#server.listen(...v); }
    close (callback) { return this.#server.close(callback); }

    // Add any type of route
    #setRoute (method, path, handler) {
        if (typeof method !== 'string') 
            throw new Error('<SlowerRouter>.route :: "method" parameter must be of type String');
        if (typeof path !== 'string' && path?.constructor?.name !== 'RegExp')
            throw new Error('<SlowerRouter>.route :: "path" parameter must be of type String or RegExp');
        if (typeof handler !== 'function')
            throw new Error('<SlowerRouter>.route :: "handler" parameter must be of type Function');
        if (!this.layers.get(method))
            this.layers.set(method, new Map());
        if (typeof path === 'string') 
            path = match(path, { decode: decodeURIComponent }); // 'path' is a function now
        this.layers.get(method).set(path, handler);
        return this;
    }

    // Add middleware
    /**
     * Create a middleware for all HTTP methods, for a specific path
     * @overload
     * @param {String} path 
     * @param {Function} handler 
     * @returns {SlowerRouter}
     */
    /**
     * Create a global middleware (all paths and all HTTP methods)
     * @overload 
     * @param {Function} handler 
     * @returns {SlowerRouter}
     */
    all (path, handler) {
        if (typeof path === 'string')
            for (let verb of HTTP_VERBS) this.#setRoute(verb, path, handler);
        else if (typeof path !== 'function')
            throw new Error('<SlowerRouter>.use :: "handler" parameter must be of type Function');
        else for (let verb of HTTP_VERBS) this.#setRoute(verb, '/(.{0,})', path);
        // this.middlewares.add(handlerA);
        return this;
    }
    // Just a more comprehensive call to app.all for defining middlewares
    use (...b) { this.all(...b); return this; };

    /**
     * Serve static files from a directory
     * @param {String} directoryPath The directory to serve
     * @param {String} mountPath A path to use as mounting point
     * @returns {SlowerRouter}
     * @example
     * // Using a mounting poing:
     *  app.static('./public', '/files') // Access with 'GET /files/{filename}'
     * 
     * // Not using a mounting point:
     *  app.static('./public') // Access with 'GET /public/{filename}'
     * 
     * // Using root ('/') as mounting point:
     *  app.static('./public', '/') // Access with 'GET /{filename}'
     */
    static (directoryPath, mountPath = '') {
        let folderRelative = directoryPath.replace('./', '');
        for (const file of utils.getFiles(directoryPath)) {
            let pathWithoutBase = '/' + file.replace(folderRelative, '').replaceAll('\\', '/');
            if (mountPath) pathWithoutBase = mountPath + '/' + pathWithoutBase.slice(1).split('/').slice(1).join('/');
            pathWithoutBase = pathWithoutBase.replaceAll('//', '/');
            this.get(pathWithoutBase, async (req, res, next) => {
                const relativePath = path.join(__dirname, '../../', file); // TODO: Test this as module, and maybe replace '../../' with '../'
                const fileStream = createReadStream(relativePath);
                res.setHeader('Content-Type', MIME_TABLE[utils.getFileExtension(file)] || MIME_TABLE['default']);
                return await pipeline(fileStream, res);
            });
        }
        return this;
    }
}

module.exports = Slower = options => new SlowerRouter(options);
