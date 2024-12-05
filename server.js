const { serveHTTP } = require("stremio-addon-sdk");
console.log("Stremio Addon is starting");

// Import the addon interface
const addonInterface = require("./addon");

// Serve the add-on on port 7000
serveHTTP(addonInterface, { port: 7000 });

console.log("HTTP addon accessible at: http://127.0.0.1:7000/manifest.json");