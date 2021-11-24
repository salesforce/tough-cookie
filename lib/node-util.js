// a stand-in for util that does nothing but prevent the existing
// node:util code paths from exploding
function nullUtilInspect() {
  return "";
}
nullUtilInspect.custom = Symbol.for("nodejs.util.inspect.custom");
const nullUtil = { inspect: nullUtilInspect };

module.exports = function nodeUtil() {
  try {
    const jscCompatibility =
      process && process.env && process.env.NODE_UTIL_FALLBACK === "enabled";
    if (!jscCompatibility) {
      // we want the real "util" module if we are in a node environment
      // eslint-disable-next-line no-restricted-modules
      return require("util");
    }
  } catch (e) {
    // ignored
  }
  return nullUtil;
};
