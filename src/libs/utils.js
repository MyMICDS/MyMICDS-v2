/**
 * @file Some general use functions we can use throughout the project
 * @module utils
 */

 /**
  * Decodes HTML text into HTML entities (For example: &amp; to &)
  * @function decodeHTMLEntity
  *
  * @param {string} str - String to decode
  * @returns {string}
  */

function decodeHTMLEntity(str) {
    if(typeof str !== 'string') return;
    return str.replace(/&#(\d+);/g, function(match, dec) {
        return String.fromCharCode(dec);
    });
};

/**
 * Encodes HTML text into HTML entities (For example: & to &amp;)
 * @function encodeHTMLEntity
 *
 * @param {string} str - String to encode
 * @returns {string}
 */

function encodeHTMLEntity(str) {
    if(typeof str !== 'string') return;
    var buf = [];
    for (var i = str.length-1; i>=0; i--) {
        buf.unshift(['&#', str[i].charCodeAt(), ';'].join(''));
    }
    return buf.join('');
};

module.exports.decodeHTMLEntity = decodeHTMLEntity;
module.exports.encodeHTMLEntity = encodeHTMLEntity;
