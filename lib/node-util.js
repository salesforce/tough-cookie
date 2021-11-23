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
      process && process.env && process.env.JSC_COMPATIBILITY === "enabled";
    if (!jscCompatibility) {
      return require("util");
    }
  } catch (e) {
    // ignore
  }
  return nullUtil;
};
