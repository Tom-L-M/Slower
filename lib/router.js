const http = require('http');
const https = require('https');
const fs = require('fs');
const { clone, noop, slugify, isSparseEqual, last, renderDynamicHTML, setSocketLocals, setSocketSecurityHeaders } = require('./utils');
const mimetable = require('./mimetable.json');

class Route {
    constructor (path, type, callback) {
        this.path = (path.startsWith('/') ? path : '/' + path);
        this.type = SlowerRouter.http_methods.includes(slugify(type).toUpperCase()) ? slugify(type).toUpperCase() : null;
        this.callback = (typeof callback == 'function' ? callback : noop);
    }
}

class SlowerRouter {
    static http_methods = [
        'GET',       'POST',        'PUT',
        'HEAD',      'DELETE',      'OPTIONS',
        'TRACE',     'COPY',        'LOCK',
        'MKCOL',     'MOVE',        'PURGE',
        'PROPFIND',  'PROPPATCH',   'UNLOCK',
        'REPORT',    'MKACTIVITY',  'CHECKOUT',
        'MERGE',     'M-SEARCH',    'NOTIFY',
        'SUBSCRIBE', 'UNSUBSCRIBE', 'PATCH',
        'SEARCH',    'CONNECT'
    ];

    static mime_table = mimetable; 
    // {
    //     'txt' : ['text/plain', 'utf-8'],
    //     'html': ['text/html', 'utf-8'],
    //     'js'  : ['text/javascript', 'utf-8'],
    //     'css' : ['text/css', 'utf-8'],
    //     'ico' : ['image/png'],
    //     'json': ['application/json'],
    //     'default': ['application/octet-stream']
    // }

    constructor () {
        this.strictHeaders = false;
        this.routes = [];
        this.middleware = [noop];
        this.fallback = noop;
        this.allowedMethods = clone(SlowerRouter.http_methods);
        this.blockedMethodCallback = noop;
        this.mime_table = SlowerRouter.mime_table;
        this.tls = { use: false, key: null, cert: null };
    }

    enableStrictHeaders () {
        // This activates the responses with many security-related response headers.
        //  It is not enabled by default, as some header are very restrictive
        this.strictHeaders = true;
        return this;
    }

    disableStrictHeaders () {
        // This deactivates the responses with many security-related response headers.
        //  It is not enabled by default, as some headers are very restrictive
        this.strictHeaders = false;
        return this;
    }

    setSecureContext (key = null, cert = null) {
        // Activates TLS and HTTPS using a certificate and a key
        if (!key || !cert || !Buffer.isBuffer(key) || !Buffer.isBuffer(cert)) {
            throw new Error ("INVALID SECURE CONTEXT INFORMATION PROVIDED - CHECK KEY AND CERTIFICATE");
        }
        this.tls.use = true;
        this.tls.key = key;
        this.tls.cert = cert;
        return this;
    }

    /**
     * Defines a route for a determined request method 
     * @category Router
     * @param {String} path The route that will be defined
     * @param {String} type The method to respond to
     * @param {Function} callback Callback to use when the chosen route is accessed
     * @returns {Object} An Route object
     * @example <caption> Defining a simple GET route:</caption>
     * setRoute('/', 'GET', (req, res) => {
     *     console.log(res.url);
     *     res.end('received');
     * });
     * // => <Route> { path:..., type:..., callback:... }
    */
    setRoute = function (path = '/', type = 'GET', callback) {
        let stat = new Route(path, type, callback);
        this.routes.push(stat);
        return this;
    }

    /**
     * Defines a middleware for all requests 
     * @category Middleware 
     * @param {Function} callback Callback to use when the requests are made
     * @returns {Array} The used middlewares list
    */
    setMiddleware = function (callback) {
        this.middleware.push((typeof callback == 'function' ? callback : noop));
        return this;
    }
    
    /**
     * Defines a route for a determined request method 
     * @category Router
     * @param {String} path The route that will be defined
     * @param {String} file The file path that will be used to respond to the route
     * @param {String} mime The file's mime type
     * @param {Object} replacementData The replacement data map for the dynamic HTML rendering
     * @returns {Object} An Route object already configured
    */
    /**
    * Dynamic rendering example:
        * It's a template engine, to render HTML containing template spaces.
        * The charset for replacement is <{content}>
        * @since 1.2.5
        * 
        * @param  {String} html The HTML code
        * @param  {Object} patterns The patterns to replace in the HTML code
        * @return {String} The HTML with the templates replaces
        * 
        * @example <caption> Rendering: </caption>
        * var template = 'Hello, my name is <{name}>. I\\'m <{age}> years old.';
        * console.log(TemplateEngine(template, {
        *   name: "Krasimir",
        *   age: 29
        * }));
    */
    setDynamic = function (path, file = '', mime = '', replacementData = null) {
        let encoding = (mime === SlowerRouter.mime_table['default'] ? undefined : 'utf-8');
        if (file.includes('{%}')) { file = file.replace(/\{\%\}/gim, path.replace(/\//gim,'')); }
        let stat = new Route(path, 'GET', (req, res) => {
            let data, targetFile, extension, targetMime, targetEncoding;
            if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
                targetFile = file.replace(/\//gim, '\\');
                targetFile = ((targetFile.endsWith('\\')) ? targetFile : targetFile+'\\') + req.url.replace('/', '');
            } else {
                targetFile = ((file == '' || !file) ? req.url : file);
            }
            extension = last(targetFile.split('.'));
            targetMime = mime || (SlowerRouter.mime_table[extension]?.[0] || SlowerRouter.mime_table.default[0]);
            targetEncoding = encoding || (SlowerRouter.mime_table[extension]?.[1] || SlowerRouter.mime_table.default[1]);
            try {
                data = fs.readFileSync(targetFile, targetEncoding);
            } catch (err) {
                data = ''; 
            }
            try {
                if (replacementData) data = renderDynamicHTML(data, replacementData);
            } catch (err) {}
            res.writeHead(200, { 'Content-Type': targetMime }); 
            res.write(data);
            res.end();
        });
        this.routes.push(stat);
        return this;
    }
    
    // SERVES FILES FOR SPECIFIC PATHS. WILDCARS ALLOWED. BE CAREFUL - PATH TRAVERSAL MAY BE POSSIBLE
    // Use app.setStatic('/*', __dirname+'/') for serving all local files. 
    // or use app.setStatic('/*', __dirname+'/public/') for serving files in a specific folder (public). 
    // This is a one-liner for the setRoute function, when the route responds with a simple page or document
    /**
     * Defines a route for a determined request method 
     * @category Router
     * @param {String} path The route that will be defined
     * @param {String} file The file path that will be used to respond to the route
     * @param {String} mime The file's mime type
     * @returns {Object} An Route object already configured
     * @example <caption> Defining a simple GET route:</caption>
     * setStatic('/login', __dirname+'/public/static/views/{%}.html', 'text/html');
    */
    setStatic = function (path, file = '', mime = '') {
        let encoding = (mime === SlowerRouter.mime_table['default'] ? undefined : 'utf-8');
        if (file.includes('{%}')) { file = file.replace(/\{\%\}/gim, path.replace(/\//gim,'')); }
        let stat = new Route(path, 'GET', (req, res) => { 
            let data, targetFile, extension, targetMime, targetEncoding;
            if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
                targetFile = file.replace(/\//gim, '\\');
                targetFile = ((targetFile.endsWith('\\')) ? targetFile : targetFile+'\\') + req.url.replace('/', '');
            } else {
                targetFile = ((file == '' || !file) ? req.url : file);
            }
            extension  = last(targetFile.split('.'));
            targetMime = mime || (SlowerRouter.mime_table[extension]?.[0] || SlowerRouter.mime_table.default[0]);
            targetEncoding = encoding || (SlowerRouter.mime_table[extension]?.[1] || SlowerRouter.mime_table.default[1]);
            try { 
                data = fs.readFileSync(targetFile, targetEncoding); 
            } catch (err) { 
                data = ''; 
            }
            res.writeHead(200, { 'Content-Type': targetMime }); 
            res.write(data);
            res.end(); 
        });
        this.routes.push(stat);
        return this;
    }

    /**
     * Defines a default response for non-defined routes (custom treated 404 error) 
     * @category Router
     * @param {String} callback The function to execute for unhandled routes
     * @returns {undefined}
    */
    setFallback = function (callback) { this.fallback = callback; return this; }

    // SERVES FILES FOR SPECIFIC PATHS. WILDCARS ALLOWED. BE CAREFUL - PATH TRAVERSAL MAY BE POSSIBLE
    // Use app.setStatic('/*', __dirname+'/') for serving all local files. 
    // or use app.setStatic('/*', __dirname+'/public/') for serving files in a specific folder (public). 
    // This is a one-liner for the setRoute function, when the route responds with a simple page or document
    /**
     * Defines a route for a determined request method 
     * @category Router
     * @param {String} path The route that will be defined
     * @param {String} file The file path that will be used to respond to the route
     * @param {String} mime The file's mime type
     * @param {Object} replacementData The replacement data map for the dynamic HTML rendering
     * @returns {Object} An Route object already configured
     * @example <caption> Defining a simple GET route:</caption>
     * setStatic('/login', __dirname+'/public/static/views/login.html', 'text/html', 'utf8');
    */
    /**
    * Dynamic rendering example:
        * It's a template engine, to render HTML containing template spaces.
        * The charset for replacement is <{content}>
        * @since 1.2.5
        * 
        * @param  {String} html The HTML code
        * @param  {Object} patterns The patterns to replace in the HTML code
        * @return {String} The HTML with the templates replaces
        * 
        * @example <caption> Rendering: </caption>
        * var template = 'Hello, my name is <{name}>. I\\'m <{age}> years old.';
        * console.log(TemplateEngine(template, {
        *   name: "Krasimir",
        *   age: 29
        * }));
    */
    setFallbackFile = function (file = '', mime = '', replacementData = null) {
        this.fallback = function fb (req,res) {
            let encoding = (mime === SlowerRouter.mime_table['default'] ? undefined : 'utf-8');
            let data, targetFile, extension, targetMime, targetEncoding;
            if (fs.existsSync(file) && fs.lstatSync(file).isDirectory()) {
                targetFile = file.replace(/\//gim, '\\');
                targetFile = ((targetFile.endsWith('\\')) ? targetFile : targetFile+'\\') + req.url.replace('/', '');
            } else {
                targetFile = ((file == '' || !file) ? req.url : file);
            }
            extension = last(targetFile.split('.'));
            targetMime = mime || (SlowerRouter.mime_table[extension]?.[0] || SlowerRouter.mime_table.default[0]);
            targetEncoding = encoding || (SlowerRouter.mime_table[extension]?.[1] || SlowerRouter.mime_table.default[1]);
            try {
                data = fs.readFileSync(targetFile, targetEncoding);
            } catch (err) {
                data = ''; 
            }
            try {
                if (replacementData) data = renderDynamicHTML(data, replacementData);
            } catch (err) {}
            res.writeHead(200, { 'Content-Type': targetMime }); 
            res.write(data);
            res.end();
        }
        return this;
    }

    // Sets the methods that the application will respond to. The rest is simply discarded with empty responses.
    // To configure a deeper level of error handling, or to serve customized 'METHOD_NOT_ALLOWED' errors,
    // use 'setRoute' with params ('/*', {{method_name}}, (req,res) => { and serve the error file here });
    // INFO: Middlewares are still triggered when a blocked method request comes.
    /**
     * Defines a route for a determined request method 
     * @category Router
     * @param {Array} methods The methods that are allowed by the application. Methods that do not conform with standards are ignored.
     * @returns {Object} The AllowedMethods Array object.
     * @example <caption> Allowing only GET and POST:</caption>
     * app.setAllowedMethods(['GET', 'POST']);
    */
    setAllowedMethods = function (methods = []) {
        // If not specified, all methods are allowed
        if (methods.length == 0 || methods  == '*') {
            return this.allowedMethods = JSON.parse(JSON.stringify(SlowerRouter.http_methods));
        }
        for (let i = 0; i < methods.length; i++) {
            if (!SlowerRouter.http_methods.includes(methods[i])) continue;
            this.allowedMethods.push(methods[i]);
        }
        // Default callback for blocked methods respond with code 200 and an empty response
        this.blockedMethodCallback = function (req,res) {
            res.writeHead(405); // sends the meme error 418 'i am a teapot'
            res.end();
        };
        return this;
    }

    // Starts the server - listening at <host>:<port>
    /**
     * @category Router
     * @param {Number} port The port number the server will listen to.
     * @param {String} host The host's network interface address the server will listen into (use a falsy value or '0.0.0.0' for listening on all).
     * @param {Function} callback The function to execute after starting the server.
     * @returns {Object<http.Server>} The server instance 
    */
    start = function (port = 8080, host = undefined, callback = () => {}) {
        let routes = this.routes;
        let middle = this.middleware;
        let fallback = this.fallback;
        let allowedMethods = this.allowedMethods;
        let blockedMethodCallback = this.blockedMethodCallback;

        let server;
        
        if (this.tls.use && this.tls.cert && this.tls.key) {
            server = https.createServer({ key:this.tls.key, cert: this.tls.cert }, mainServerHandler);

        } else {
            server = http.createServer({}, mainServerHandler);
        }

        function mainServerHandler (req, res) {
            try {
                // Sets local req.session object
                setSocketLocals(req);
                // Sets security headers in req.headers
                // This is set before custom callbacks are applies
                // so it is possible to override all of the headers
                if (!!this.strictHeaders) setSocketSecurityHeaders(req); 
                // Runs all middlewares
                for (let i = 0; i < middle.length; i++) { middle[i](req, res); }
                // Only respond to allowed methods with callbacks, else, use the default empty response.
                if (
                    allowedMethods.includes(req.method)) {
                    for (let i = 0; i < routes.length; i++) {
                        let route = routes[i];
                        if (
                            route.type === req.method && 
                            (
                                route.path === req.url || 
                                isSparseEqual(route.path, req.url)
                            )
                        ) {
                            i = routes.length;
                            route.callback(req, res);
                            return;
                        }
                    }
                    fallback(req,res);
                } else {
                    blockedMethodCallback(req, res);
                }
            } catch(err) {
                console.log(err);
            }
        }

        callback(server);
        if (!host) host = undefined; // Turn falsy values into undefined, for default behaviour
        server.listen(port, host);
        return this;
    }
}

const Slower = function () { return new SlowerRouter(); }

module.exports = Slower;