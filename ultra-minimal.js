const http = require('http');

const port = process.env.PORT || 3001;

console.log('Ultra minimal server starting on port:', port);

const server = http.createServer((req, res) => {
  console.log('Request:', req.url);
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Hello Railway! Server is working.\n');
});

server.listen(port, '0.0.0.0', () => {
  console.log('Server running on http://0.0.0.0:' + port);
});

console.log('Script completed'); 