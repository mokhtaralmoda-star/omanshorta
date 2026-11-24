const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously" });

// Mock socket.io
dom.window.io = () => ({
  on: () => {},
  emit: () => {}
});

// Mock localStorage
dom.window.localStorage = {
  getItem: () => 'test',
  setItem: () => {}
};

// Mock Audio
dom.window.Audio = class {
  play() { return Promise.resolve(); }
};

try {
  // Trigger DOMContentLoaded
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded'));
  console.log("No immediate errors on load.");
} catch (e) {
  console.error("Error:", e);
}
