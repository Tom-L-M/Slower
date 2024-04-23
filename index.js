const Slower = require('./src/slower');
module.exports = Slower;

// TODO __
// const setSocketSecurityHeaders = (req) => {
//     // This should be set in a regular website:
//     // Forces the use of HTTPS for a long time, including subDomains - and prevent MitM attacks
//     // Does not work in servers that don't allow HTTPS (like this one)
//     // req.setHeader('Strict-Transport-Security', ['max-age=31536000', 'includeSubDomains']); // Only works on HTTPS
//     // This blocks requests with MIME type different from style/css and */script
//     // This denies the main security policy - Usually, when using a website, 
//     // this should be highly customized, but, for simple sites, it can be left like that:
//     req.setHeader('Content-Security-Policy', [
//         'default-src=none',
//         'script-src=self',
//         'connect-src=self',
//         'img-src=self',
//         'style-src=self',
//         'frame-ancestors=none',
//         'form-action=self',
//         // 'upgrade-insecure-requests' // Only works on HTTPS
//     ]);
//     // Isolates the browsing context exclusively to same-origin documents. 
//     // Cross-origin documents are not loaded in the same browsing context.
//     req.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
//     // The HTTP Cross-Origin-Resource-Policy response header conveys a desire 
//     // that the browser blocks no-cors cross-origin/cross-site requests to the given resource.
//     req.setHeader('Cross-Origin-Resource-Policy', 'same-site');
//     // A new HTTP response header that instructs the browser 
//     // to prevent synchronous scripting access between same-site cross-origin pages.
//     req.setHeader('Origin-Agent-Cluster', '?1');
//     // Blocks information about the website when sending 
//     // local requests or redirections to other sites
//     req.setHeader('Referrer-Policy', 'no-referrer');
//     // Enabling this makes all URLs in a page (even the cross domain ones)
//     // to be prefetched - This is dangerouns in terms of DNS queries
//     req.setHeader('X-DNS-Prefetch-Control', 'off');
//     // A legacy header, just for IE, and is highly dangerous
//     // Not setting this as disabled can cause malicious 
//     // HTML+JS code to be loaded in the wrong context
//     req.setHeader('X-Download-Options', 'noopen');
//     // Blocks attempts to display the website as an IFrame
//     // If another website tries to display this website as a frame,
//     // this header will block it
//     req.setHeader('X-Frame-Options', 'DENY');
//     // Set the unnecessary XSS-Protection legacy header to disabled
//     // This header increases the number of vulnerabilities, and is used only in IE
//     req.setHeader('X-XSS-Protection', 0);
//     // Remove X-Powered-By - This header allows attackers to 
//     // gather information about the application engine
//     if (req.hasHeader('X-Powered-By')) req.removeHeader('X-Powered-By');
// }