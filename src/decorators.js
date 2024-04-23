const fs = require('node:fs');
const MIME_TABLE = require('./mimetable.json');
const utils = require('./utils');

/**
 * Receives and configures the HTTP Response object
 * @param {http.ServerResponse} response 
 * @returns {http.ServerResponse} 
 * @exposes .status()
 * @exposes .send()
 * @exposes .json()
 * @exposes .file()
 */
function setupResponse (response) {
    /**
     * Sets the response status code
     * @chainable
     * @param {number} statusCode The response status code
     * @returns {http.ServerResponse}
     */
    response.status = function (statusCode) {
        response.statusCode = statusCode;
        return response;
    };

    /**
     * Sets a response header to a specified value
     * @chainable
     * @overload
     * @param {string} header 
     * @param {string} value 
     * @returns {http.ServerResponse}
     * @info Pass in an object of "header":"value" entries 
     *       to set multiple headers at once
     * @example
     *  res.set('Content-Length', 1000)
     */
    /**
     * Sets multiple response headers to specified values
     * @chainable
     * @overload
     * @param {object} headers
     * @returns {http.ServerResponse}
     * @example
     *  res.set({ 'Content-Length':1000, 'Content-Type':'text/plain' })
     */
    response.set = function (header, value) {
        if (typeof header === 'string')
            response.setHeader(header, value);
        else
            for (let prop of header)
                response.setHeader(prop, header[prop]);
        return response;
    }

    /**
     * An alias for 'res.getHeader()'.
     * @param {string} header 
     * @returns {string}
     */
    response.get = function(header) {
        return response.getHeader(header);
    }

    /**
     * Sets the Content-Type header with a specific MIME type.
     * @chainable
     * @param {string} mime The MIME type to set (can be: complete, like "text/html" or from a file extension, like "html")
     * @returns {http.ServerResponse}
     * @info And if no type is specified, binary type is used (application/octet-stream)
     */
    response.type = function (mime) {
        let mimetype = MIME_TABLE[mime] || mime || MIME_TABLE[extension] || MIME_TABLE['default'];
        response.setHeader('Content-type', mimetype);
        return response;
    }

    /**
     * Sends a string or buffer as JSON and ends the response
     * @param {string|Buffer} data 
     * @returns {undefined}
     */
    response.json = function json (data) {
        if (response.statusCode === undefined) response.status(200);
        response.setHeader('Content-type', 'application/json');
        response.write(JSON.stringify(data));
        response.end();
        return undefined;
    }

    /**
     * Sends a string or buffer as HTML data and ends the response
     * @param {string|Buffer} data 
     * @returns {undefined}
     */
    response.send = function (data) {
        if (response.statusCode === undefined) response.status(200);
        if (!response.getHeader('Content-Type')) 
            response.setHeader('Content-Type', 'text/html');
        response.write(data);
        response.end();
        return undefined;
    };

    /**
     * Sends a file and ends the response
     * @param {String} filename The name of the file to send
     * @returns {undefined}
     */
    response.file = function (filename) {
        if (response.statusCode === undefined) response.status(200);
        if (!response.getHeader('Content-Type')) {
            let extension = (filename||'').split('.').slice(-1)[0];
            response.setHeader('Content-Type', MIME_TABLE[extension] || MIME_TABLE['default']);
        }
        const stream = fs.createReadStream(filename);
        stream.pipe(response);
        return undefined;
    }

    /**
    * Renders an HTML document and sends it to client
    * @param {string} filename The file to use as rendering View
    * @param {object} locals The properties to replace in the View
    * @info The locals object may contain either strings or functions or objects with 'toString' method.
    * @returns {undefined}
    * @example
    *   // In 'home.html:
    *       <h2>{{user}}</h2> has <h2>{{count}}</h2> items
    *   // In server.js: (generates a new random item for each request)
    *       res.render('./views/home.html', { user: 'Mike', count: () => randomInt() });
    */
    response.render = function (filename, locals = {}) {
        let html = fs.readFileSync(filename, 'utf-8');
        for (let item in locals) {
            html = html.replace(
                new RegExp('{{'+item+'}}', 'gim'), 
                typeof locals[item] === 'function' ?
                    locals[item]() : locals[item]?.toString() || ''
            );
        }
        response.setHeader('Content-type', 'text/html');
        response.write(html);
        response.end();
        return undefined;
    }
        
    /**
     * Sets the 'Location' header and redirects to a given path, URL, or link.
     * @param {string} location An URL, link, path, or the string 'back' to set the target
     * @returns {http.undefined}
     * @info If location is not passed, it is assumed to be '/'
     * @info If location is set to the string 'back' it redirects to the link in the request 'Referrer' header
     * @example
     *  // Redirecting out of the site to the clients previous URL:
     *      res.status(300).redirect('back');
     *  // Redirecting to other page in current domain:
     *      res.status(300).redirect('/other/page');
     *  // Redirecting to other URL:
     *      res.status(300).redirect('http://example.com');
     */
    response.redirect = function (location) {
        response.setHeader('Location', location === 'back' ? request.getHeader('Referrer') : location || '/');
        response.end();
        return undefined;
    }


    return response;
}

/**
 * Receives and configures the HTTP Request object
 * @param {http.IncomingMessage} request 
 * @returns {http.IncomingMessage}
 * @exposes req.body
 * @exposes req.urlParts
 * @exposes req.query
 * @exposes req.session = { port, rport, host, rhost }
 */
function setupRequest (request) {
    /**
     * @property
     * Holds the request body data as a buffer
     */
    return new Promise (resolve => {
        // Set classical socket locals
        request.session = {
            port: request.socket.localPort,
            rport: request.socket.remotePort,
            host: utils.normalizeAddress(request.socket.localAddress),
            rhost: utils.normalizeAddress(request.socket.remoteAddress)
        };

        
        /**
         * An alias for 'req.getHeader()'.
         * @param {string} header 
         * @returns {string}
         */
        request.get = function(header) {
            return request.getHeader(header);
        }

        // Add req.params placeholder, it is added in the main router, not here
        request.params = undefined;

        // Add a req.query object, containing the pairs of key=value queries (if any)
        request.query = utils.getURLQueryString(request.url);

        request.urlParts = request.url.split('/').filter(Boolean);
        request.body = [];
        request.on('timeout', () => reject(new Error('Timeout')));
        request.on('data', chunk => request.body.push(chunk));
        request.on('error', (err) => reject(err));
        request.on('end', () => {
            let tmp = Buffer.concat(request.body);
            request.body = {
                buffer: tmp,
                text: () => tmp.toString(),
                json: () => JSON.parse(tmp)
            }
            return resolve(request);
        });
    });
}

module.exports = { setupRequest, setupResponse };