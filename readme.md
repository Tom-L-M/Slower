# Slower

Slower is a small web framework, express-like, but simpler and limited.
It allows for generic route-declaration, fallback pages, and multiple middleware functions.

### API Methods:

```
app.enableStrictHeaders(): this

> Enables the use of the set of 'Strict Headers'.
> These headers increase security levels, and are a good practice to apply.
> However, using these headers in testing scenarios are not a need, 
  and may have buggy or negative effects. So, apply those to simulate scenarios only.
> Headers configured:
    > Content-Security-Policy
    > Cross-Origin-Opener-Policy
    > Cross-Origin-Resource-Policy 
    > Origin-Agent-Cluster
    > Referrer-Policy 
    > X-DNS-Prefetch-Control (disabled)
    > X-Download-Options
    > X-Frame-Options
    > X-XSS-Protection (disabled)
    > X-Powered-By (removed)
> Returns the own object instance, so that methods can be chained.
```
```
app.disableStrictHeaders(): this

> Disables the use of the set of 'Strict Headers'.
> See 'enableStrictHeaders()' for more information.
> Returns the own object instance, so that methods can be chained.
```
```
app.setRoute(string: path = '/', string: type = 'GET', function: callback): this

> Creates a new route for path defined in 'path', responding to the HTTP verb defined in 'type' argument.
> The callback is executed when the route is accessed.
> Returns the own object instance, so that methods can be chained.
```
```
app.setMiddleware(function: callback): this

> Sets a new middleware function: callback function will be accessed for every server access.
> Many middlewares can be defined, and will be applied in the order they are defined.
> Returns the own object instance, so that methods can be chained.
```
```
app.setDynamic(string: path, string: file = '', string: mime = '', object: replacementData = null): this

> Creates a new GET route for path defined in 'path'. 
> This is a custom file-response route, configured for template rendering just before response.
> Providing an object as 'replacementData' in this format { valueToBeReplaced: valueToReplace },
  allows for template rendering. The value to replace in the file, uses this notation: '<{content}>'.
> URL reference in filename:
    > For direct references, it is possible to use the token '{%}' to replace the filename for the URL.
    > Ex:
        app.setStatic('/login', './templates/{%}.html', 'text/html');
        This will access the 'login.html' file when the route '/login' is accessed.
> Example:
  Responding a route for '/custom' with file 'custom.html':
    app.setDynamic('/custom', './templates/custom.html', 'text/html', { smile: ':)' })
  In file './templates/custom.html':
    "<h2> This is a custom thing:        <{smile}>      </h2>"
  Rendered in browser:
    <h2> This is a custom thing:        :)      </h2>
> Returns the own object instance, so that methods can be chained.
```
```
app.setStatic(string: path, string: file = '', string: mime = ''): this

> Creates a new GET route for path defined in 'path', responding with the specified file and MIME type.
> URL reference in filename:
    > For direct references, it is possible to use the token '{%}' to replace the filename for the URL.
    > Ex:
        app.setStatic('/login', './templates/{%}.html', 'text/html');
        This will access the 'login.html' file when the route '/login' is accessed.
> Example: A route for '/login' page, responding with 'login.html' file
    setStatic('/login', __dirname+'/public/static/views/login.html', 'text/html');
> Returns the own object instance, so that methods can be chained.
```
```
app.setFallback(function: callback): this

> Creates a function for fallback state. When no other routes intercept the route, this will be used.
> Special use for 'page not found' fallback pages or highly customized routes and situations.
> Returns the own object instance, so that methods can be chained.
```
```
app.setFallbackFile (string: file = '', string: mime = '', object: replacementData = null): this

> Creates a function for fallback state. When no other routes intercept the route, this will be used.
> Equivalent to setFallback, but responds with a file. Allows for template rendering.
> See 'setDynamic' for more information about template rendering.
> Special use for 'page not found' fallback pages, ex: './e404.html'.
> Returns the own object instance, so that methods can be chained.
```
```
app.setAllowedMethods(array: methods = []): this

> Sets a list of methods to respond to.
> By using this, it is possible to restrict the application to avoid
  responding to dangerous HTTP verbs, such as 'DELETE'.
> By default, all methods are allowed (see Slower.constructor.http_methods)
> Calling this function without parameters is an easy way to block responses to all requests (lock server). 
> Returns the own object instance, so that methods can be chained.
```
```
app.start(number|string: port = 8080, string: host = undefined, function: callback = ()=>{}): this

> Starts the server, at a specific host and port, then calling the callback function.
> Not defining a specific port or host will start the server at '0.0.0.0:8080'.
> Returns the own object instance, so that methods can be chained.
```

Example usage:
```
const Slower = require('slower');
const port = 8080;

let app = Slower();

app.setMiddleware((req, res) => {
    req.time = Date.now();
    console.log(`${req.time} - ${req.method} : ${req.url}`);
});

app.setStatic('/favicon.ico', __dirname+'/public/{%}');

app.setRoute('/', 'GET', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); 
    res.write('<html><body><p>This is the / page.</p></body></html>');
    res.end();
});

app.setRoute('/{*}.css', 'GET', (req, res) => {
    let data = fs.readFileSync(...some.css.file...)
    res.writeHead(200, { 'Content-Type': 'text/css' }); 
    res.write(data);
    res.end();
});

const generateDownloadNumber = () => { Math.round(Math.random() * 10) }
app.setDynamic('/download/{?}/', './main-download.txt', { DowloadName: generateDownloadNumber });
// Responds to download routes such as '/download/2/'

app.setFallback((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); 
    res.write('<html><body><p>This is the fallback page.</p></body></html>');
    res.end();
});

// Start app listening on all interfaces (0.0.0.0)
app.start(port, null, () => {
    console.log(`Running on localhost:${port}`);
    console.log(app);
});

```
### API modifications on 'net.Socket' instances:
 - The API modifies every ```net.Socket``` instance BEFORE it is passed 
to ```app.connectionListener```. This means that all events receiving 
a socket will receive the modified socket instead.
 - The modifications adds the following properties to the socket instance:
```
 <socket>.session: Object           => A container for persistent data appended to sockets
 <socket>.session.port: Number      => The local port number
 <socket>.session.rport: Number     => The remote port number
 <socket>.session.host: String      => The local host interface address
 <socket>.session.rhost: String     => The remote host interface address
```
- It is possible to use the ```socket.session``` object to append data that will persist 
during the lifetime of a single connection. Useful for keeping short-life local variables.

- In HTTP ```http.IncomingMessage``` instances, the 'socket' instance is found over 'request'.
So, considering the common callback of ```(req, res)```, the session container will be ```req.session```

### API security headers implementation:
 - It is possible to enforce a higher set of security headers on responses 
   without having to set them manually. The API 'enableStrictHeaders' and 'disableStrictHeaders' 
   methods do exacly that. The strict headers are disabled by default, as some resources are too strict, 
   but it is also possible to enable them all, and then set a middleware to override any header.
 - Headers set by 'enableStrictHeaders':
```
    Content-Security-Policy: default-src=none; script-src=self; connect-src=self; img-src=self;
        style-src=self; frame-ancestors=none; form-action=self;
    Cross-Origin-Opener-Policy:  same-origin
    Cross-Origin-Resource-Policy: same-site
    Origin-Agent-Cluster: ?1
    Referrer-Policy: no-referrer
    Strict-Transport-Security: max-age=31536000; includeSubDomains // temporarily disabled for maintenance
    X-Content-Type-Options: nosniff // temporarily disabled for maintenance
    X-DNS-Prefetch-Control: off
    X-Download-Options: noopen
    X-Frame-Options: DENY
    X-Powered-By: (This header is removed if a response includes it)
    X-XSS-Protection: 0 
```