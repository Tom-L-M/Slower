# Slower

Slower is a small web framework, express-like, but simpler and limited.
It allows for generic route-declaration, fallback pages, and multiple middleware functions.


Example usage:
```
const Slower = require('.');
const port = 8080;

let app = Slower();

app.setMiddleware((req, res) => {
    req.time = Date.now();
    console.log(`${req.time} - ${req.method} : ${req.url}`);
});

app.setMiddleware((req, res) => {
    req.local = 'sp';
    console.log(req.local);
});

app.setStatic('/favicon.ico', __dirname+'/public/favicon.ico');

app.setRoute('/', 'GET', (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); 
    res.write('<html><body><p>This is the / page.</p></body></html>');
    res.end();
});

app.setFallback((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' }); 
    res.write('<html><body><p>This is the fallback page.</p></body></html>');
    res.end();
});

app.start(port, () => {
    console.log(`Running on localhost:${port}`);
    console.log(app);
});
```