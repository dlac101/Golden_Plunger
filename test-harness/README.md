# Local QA harness

These files are QA-only scaffolding and are never deployed to Google Apps Script.

Open `Entry.test.html` or `Dashboard.test.html` directly with a Chromium-based browser using a `file://` path, or serve this folder with any static file server.

In DevTools, `window.__mock.reset()` clears scores, `window.__mock.rows()` returns the in-memory rows, and `window.__mock.setFailNext(n)` forces the next `n` RPC calls to fail.
