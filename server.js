const { serveHTTP } = require("stremio-addon-sdk");
console.log("Stremio Addon is starting");

// Import the addon interface
const addonInterface = require("./addon");

// Get the port from the environment variable or use a default
const port = process.env.PORT || 7000;

// Serve the add-on
serveHTTP(addonInterface, { port });

console.log(`Stremio Addon is running on port ${port}`);