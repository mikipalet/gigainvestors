// Reuse an installed Inter font for an entirely offline production build.
module.exports = new Proxy({}, {get: () => `/* latin */
@font-face {
 font-family: 'Inter'; font-style: normal; font-weight: 100 900; font-display: swap;
 src: url(${process.env.PUBFIX_ROOT}/storage/inter.woff2) format('woff2');
 unicode-range: U+0000-00FF;
}`});
