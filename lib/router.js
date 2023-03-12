const http = require('http');
const fs = require('fs');
const { noop, slugify, isSparseEqual, last } = require('./utils');

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

    static mime_table = {
        'txt' : ['text/plain', 'utf-8'],
        'html': ['text/html', 'utf-8'],
        'js'  : ['text/javascript', 'utf-8'],
        'css' : ['text/css', 'utf-8'],
        'ico' : ['image/png'],
        'default': ['application/octet-stream']
    }

    constructor () {
        this.routes = [];
        this.middleware = [noop];
        this.fallback = noop;
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
        return stat;
    }

    setMiddleware = function (callback) {
        return this.middleware.push((typeof callback == 'function' ? callback : noop));
    }
    
    // SERVES FILES FOR SPECIFIC PATHS. WILDCARS ALLOWED. BE CAREFUL - PATH TRAVERSAL MAY BE POSSIBLE
    // USE app.setStatic('/*', __dirname+'/') for serving all local files. 
    // OR USE app.setStatic('/*', __dirname+'/public/') for serving files in a specific folder (public). 
    setStatic = function (path, file = '', mime = '', encoding = '') {
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
        return stat;
    }

    setFallback = function (callback) {
        return this.fallback = callback;
    }

    start = function (port = 8080, callback) {
        let routes = this.routes;
        let middle = this.middleware;
        let fallback = this.fallback;

        let server = http.createServer(function (req, res) {
            try {
                for (let i = 0; i < middle.length; i++) { middle[i](req, res); }
                for (let i = 0; i < routes.length; i++) {
                    let route = routes[i];
                    if (route.type === req.method && route.path === req.url) {
                        i = routes.length;
                        route.callback(req, res);
                        return;
                    } else if (route.type === req.method && isSparseEqual(route.path, req.url)) {
                        i = routes.length;
                        route.callback(req, res);
                        return;
                    }
                }
                fallback(req,res);
            } catch(err) {
                console.log(err);
            }
        });
        callback(server);
        return server.listen(port);
    }
}

const Slower = function () { return new SlowerRouter(); }

module.exports = Slower;