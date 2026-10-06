// Standalone SSR does not load CSS. Layout and image decoding are checked by
// the post-publication browser; preserve CSS module class names here.
require.extensions['.css'] = module => {
  module.exports = new Proxy({}, {get: (_target, key) => key === '__esModule' ? false : String(key)});
};
