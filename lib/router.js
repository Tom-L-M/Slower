const http = require('http');
const { noop, slugify, isSparseEqual } = require('./utils');

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