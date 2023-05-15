const noop = function () {};

const last = (array) => { return array[array.length-1]; }

const slugify = (string, replacement = '-', replaceSpaces = true) => {
    return (string
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/[!\"#$%&'\(\)\*\+,\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '')
        .replace((replaceSpaces ? /(\s|\.)/g : /(\.)/g), replacement)
        .replace(/—/g, replacement)
        .replace(/-{2,}/g, replacement));
}

/**
 * Compares two strings in 'sparse' mode. Using the wildcards '{*}' and '{?}' to match strings. 
 * Use '{*}' for any number of (any) characters, and {?}' for one (any) character.
 * 
 * @since 1.2.7 
 * 
 * @param  {String} str1 The first string to compare
 * @param  {String} str2 The second string to compare
 * @return {Boolean} If the strings are sparsely equal or not
 * @example <caption> Comparing simple strings: </caption>
 * isSparseEqual("hello", "hello")
 * // => true
 * isSparseEqual("hello", "wello")
 * // => false
 * @example <caption> Comparing complex strings: </caption>
 * isSparseEqual("{?}ello", "hello")
 * // => true
 * isSparseEqual("h*", "hello")
 * // => true
 * isSparseEqual("h{*}e", "hello")
 * // => false
 * isSparseEqual("h{*}e", "helle")
 * // => true
*/
const isSparseEqual = (str1 = '', str2 = '') => {
    const string1 = str1.replace(/{\?}/g, '.').replace(/{\*}/g, '.*');
    const string2 = str2.replace(/{\?}/g, '.').replace(/{\*}/g, '.*');
    const regex = new RegExp(`^${string1}$`);
    return regex.test(string2);
}

/**
 * It's a template engine, to render HTML containing template spaces.
 * The charset for replacement is <{content}>
 * @since 1.2.5
 * 
 * @param  {String} html The HTML code
 * @param  {Object} patterns The patterns to replace in the HTML code
 * @return {String} The HTML with the templates replaces
 * 
 * @example <caption> Rendering: </caption>
 * var template = 'Hello, my name is <{name}>. I\\'m <{age}> years old.';
 * console.log(TemplateEngine(template, {
 *   name: "Krasimir",
 *   age: 29
 * }));
*/
const renderDynamicHTML = (html, patterns) => {
    let template = html;
    for (let item in patterns) {
        template = html.replace(
            new RegExp('<{'+item+'}>', 'gim'), 
            patterns[item]
        );
    }
    return template;
}

const toBool = [() => true, () => false];

module.exports = { noop, slugify, isSparseEqual, toBool, last, renderDynamicHTML };