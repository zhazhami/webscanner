window.alert = function () { return false; };
window.prompt = function (msg, input) { return input; };
window.confirm = function () { return true; };
window.close = function () { return false; };
window.open = function (url) {
    console.log(JSON.stringify({ "url": url }));
}
XMLHttpRequest.prototype.__originalOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
    console.log(JSON.stringify({ "url": url }));
}