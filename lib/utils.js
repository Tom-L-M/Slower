const noop = function () {};

const last = (array) => { return array[array.length-1]; }

const slugify = (string, replacement = '-', replaceSpaces = true) => {
    return (string
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/[!\"#$%&'\(\)\*\+,\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '')
        .replace((replaceSpaces ? /(\s|\.)/g : /(\.)/g), replacement)
        .replace(/—/g, replacement)
        .replace(/-{2,}/g, replacement));
}

/**
 * Compares two strings in 'sparse' mode. Using the wildcards '{*}' and '{?}' to match strings. 
 * Use '{*}' for any number of (any) characters, and {?}' for one (any) character.
 * 
 * @since 1.2.7 
 * 
 * @param  {String} str1 The first string to compare
 * @param  {String} str2 The second string to compare
 * @return {Boolean} If the strings are sparsely equal or not
 * @example <caption> Comparing simple strings: </caption>
 * isSparseEqual("hello", "hello")
 * // => true
 * isSparseEqual("hello", "wello")
 * // => false
 * @example <caption> Comparing complex strings: </caption>
 * isSparseEqual("{?}ello", "hello")
 * // => true
 * isSparseEqual("h*", "hello")
 * // => true
 * isSparseEqual("h{*}e", "hello")
 * // => false
 * isSparseEqual("h{*}e", "helle")
 * // => true
*/
const isSparseEqual = (str1 = '', str2 = '') => {
    const string1 = str1.replace(/{\?}/g, '.').replace(/{\*}/g, '.*');
    const string2 = str2.replace(/{\?}/g, '.').replace(/{\*}/g, '.*');
    const regex = new RegExp(`^${string1}$`);
    return regex.test(string2);
}

/**
 * It's a template engine, to render HTML containing template spaces.
 * The charset for replacement is {{content}}
 * @since 1.2.5
 * 
 * @param  {String} html The HTML code
 * @param  {Object} patterns The patterns to replace in the HTML code
 * @return {String} The HTML with the templates replaces
 * 
 * @example <caption> Rendering: </caption>
 * var template = 'Hello, my name is {{name}}. I\\'m {{age}} years old.';
 * console.log(TemplateEngine(template, {
 *   name: "Krasimir",
 *   age: 29
 * }));
*/
const renderDynamicHTML = (html, patterns) => {
    let template = html;
    for (let item in patterns) {
        template = template.replace(
            new RegExp('{{'+item+'}}', 'gim'), 
            patterns[item]
        );
    }
    return template;
}

const setSocketLocals = (reqSocket) => {
    reqSocket.session = {};
    reqSocket.session.port = reqSocket.socket.localPort;
    reqSocket.session.rport = reqSocket.socket.remotePort;
    reqSocket.session.host = (
        reqSocket.socket.localAddress.startsWith('::') ? 
        reqSocket.socket.localAddress.substring(
            reqSocket.socket.localAddress.indexOf(':',2)+1
        ) : reqSocket.socket.localAddress);
        reqSocket.session.rhost = (
        reqSocket.socket.remoteAddress.startsWith('::') ? 
        reqSocket.socket.remoteAddress.substring(
            reqSocket.socket.remoteAddress.indexOf(':',2)+1
        ) : reqSocket.socket.remoteAddress);
    return reqSocket;
}

const setResponseAssessors = (resSocket) => {
    resSocket.sendText = (data, code = 200) => {
        resSocket.writeHead(code, { 'Content-Type': 'text/plain' }); 
        resSocket.write(data);
        resSocket.end();
    };
    resSocket.sendJSON = (data, code = 200) => {
        resSocket.writeHead(code, { 'Content-Type': 'application/json' }); 
        resSocket.write(typeof data === 'string' ? data : JSON.stringify(data));
        resSocket.end();
    };
    resSocket.sendHTML = (data, code = 200) => {
        resSocket.writeHead(code, { 'Content-Type': 'text/html' }); 
        resSocket.write(data);
        resSocket.end();
    };
}

const setSocketSecurityHeaders = (req) => {
    // This should be set in a regular website:
    // Forces the use of HTTPS for a long time, including subDomains - and prevent MitM attacks
    // Does not work in servers that don't allow HTTPS (like this one)
    // req.setHeader('Strict-Transport-Security', ['max-age=31536000', 'includeSubDomains']); // Only works on HTTPS

    // This blocks requests with MIME type different from style/css and */script
    // TODO test this - probably gonna break the server, as MIMEs are not overriden here
    // req.setHeader('X-Content-Type-Options', 'nosniff'); 

    // This deines the main security policy - Usually, when using a website, 
    // this should be highly customized, but, for simple sites, it can be leaved like that:
    req.setHeader('Content-Security-Policy', [
        'default-src=none',
        'script-src=self',
        'connect-src=self',
        'img-src=self',
        'style-src=self',
        'frame-ancestors=none',
        'form-action=self',
        // 'upgrade-insecure-requests' // Only works on HTTPS
    ]);
    // Isolates the browsing context exclusively to same-origin documents. 
    // Cross-origin documents are not loaded in the same browsing context.
    req.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    // The HTTP Cross-Origin-Resource-Policy response header conveys a desire 
    // that the browser blocks no-cors cross-origin/cross-site requests to the given resource.
    req.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    // A new HTTP response header that instructs the browser 
    // to prevent synchronous scripting access between same-site cross-origin pages.
    req.setHeader('Origin-Agent-Cluster', '?1');
    // Blocks information about the website when sending 
    // local requests or redirections to other sites
    req.setHeader('Referrer-Policy', 'no-referrer');
    // Enabling this makes all URLs in a page (even the cross domain ones)
    // to be prefetched - This is dangerouns in terms of DNS queries
    req.setHeader('X-DNS-Prefetch-Control', 'off');
    // A legacy header, just for IE, and is highly dangerous
    // Not setting this as disabled can cause malicious 
    // HTML+JS code to be loaded in the wrong context
    req.setHeader('X-Download-Options', 'noopen');
    // Blocks attempts to display the website as an IFrame
    // If another website tries to display this website as a frame,
    // this header will block it
    req.setHeader('X-Frame-Options', 'DENY');
    // Set the unnecessary XSS-Protection legacy header to disabled
    // This header increases the number of vulnerabilities, and is used only in IE
    req.setHeader('X-XSS-Protection', 0);
    // Remove X-Powered-By - This header allows attackers to 
    // gather information about the application engine
    if (req.hasHeader('X-Powered-By')) req.removeHeader('X-Powered-By');
}

const toBool = [() => true, () => false];

const clone = (object) => JSON.parse(JSON.stringify(object));

const isPromise = obj => {
    return obj !== null &&
    (typeof obj === 'object' || typeof obj === 'function') &&
    typeof obj.then === 'function';
}

const UUID = () => '################################'.replace(new RegExp(`[#]`, 'gim'), () => Math.random().toString(16)[6]);

module.exports = { clone, noop, slugify, isSparseEqual, toBool, last, renderDynamicHTML, setSocketLocals, setSocketSecurityHeaders, setResponseAssessors, isPromise, UUID };