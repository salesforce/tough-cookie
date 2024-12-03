#!/usr/bin/env node
/**
 * @fileoverview Vows logs using methods from `util` that were removed in node v12. To avoid cryptic
 * error messages when tests fail, we patch those methods using `console.log`.
 * @see {@link https://nodejs.org/api/deprecations.html#DEP0026|`util.print` deprecation}
 * @see {@link https://nodejs.org/api/deprecations.html#DEP0027|`util.puts` deprecation}
 * @see {@link https://nodejs.org/docs/latest-v0.10.x/api/util.html|Docs for deprecated `util` methods}
 */

// Patch deprecated util methods
const util = require("node:util");
util.print = (...args) => console.log(args.join(''));
util.puts = (...args) => console.log(args.join('\n'));
// Call vows executable
require("vows/bin/vows");
