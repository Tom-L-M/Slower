const noop = function () {};

const slugify = (string, replacement = '-', replaceSpaces = true) => {
    return (string
        .replace(/<(?:.|\n)*?>/gm, '')
        .replace(/[!\"#$%&'\(\)\*\+,\/:;<=>\?\@\[\\\]\^`\{\|\}~]/g, '')
        .replace((replaceSpaces ? /(\s|\.)/g : /(\.)/g), replacement)
        .replace(/—/g, replacement)
        .replace(/-{2,}/g, replacement));
}

const isSparseEqual = (str1 = '', str2 = '') => {
    let singleReplace = '?', globalReplace = '*';
    let alt1 = str1.split(''), alt2 = str2.split('');
    let tmp = '';
    if (alt1.includes(globalReplace)) {
        tmp = (alt1.join('').substring(0, alt1.indexOf(globalReplace))).split('');
        alt2 = (alt2.join('').substring(0, alt1.indexOf(globalReplace))).split('');
        alt1 = tmp;
    } else if (alt2.includes(globalReplace)) {
        tmp = (alt2.join('').substring(0, alt2.indexOf(globalReplace))).split('');
        alt1 = (alt1.join('').substring(0, alt2.indexOf(globalReplace))).split('');
        alt2 = tmp;
    }
    for (let i = 0; i < alt1.length; i++) {
        if (alt1[i] === singleReplace || alt2[i] === singleReplace) { alt1[i] = alt2[i] = singleReplace; }
    }
    return alt1.join('') === alt2.join('');
}

const toBool = [() => true, () => false];

module.exports = { noop, slugify, isSparseEqual, toBool };