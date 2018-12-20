browser.browserAction.onClicked.addListener(function(tab) {

  browser.storage.local.get(tab.url).then((data) => {
    var options = data[tab.url] || {clean: false, debug: false}
    options.clean = !options.clean
    data[tab.url] = options

    console.log("set data", data)
    browser.storage.local.set(data).then(() => {
      browser.tabs.reload({ bypassCache: true })
    })
  })
})

// TODO change context menu per page?
browser.menus.create({
  id: "debug",
  title: "Debug",
  contexts: ["browser_action"]
})

function setDebug(url, debug) {
  browser.storage.local.get(url).then((data) => {
    var options = data[url] || {clean: false, debug: false}
    options.clean = true
    options.debug = !options.debug
    data[url] = options
    browser.storage.local.set(data).then(() => {
      browser.tabs.reload({ bypassCache: true })
    })
  })
}

browser.menus.onClicked.addListener((info, tab) => {
  if (info.menuItemId == "debug") {
    setDebug(tab.url)
  }
})

browser.runtime.onMessage.addListener((message, sender, respond) => {
  return browser.storage.local.get(sender.url).then((data) => {
    var options = data[sender.url] || {clean: false, debug: false}
    respond(options)
    return options
  })
})

browser.webRequest.onHeadersReceived.addListener(
  function(req) {
    console.log("REQUEST", req)

    return browser.storage.local.get(req.url).then((data) => {
      var options = data[req.url] || {clean: false, debug: false}

      if (!options.clean) {
        return
      }

      req.responseHeaders.push({
        name: 'Content-Security-Policy',
        value: "script-src 'none';"
      });
      return {responseHeaders: req.responseHeaders};
    })
  },
  {
    urls:["<all_urls>"],
    //types:["main_frame", "sub_frame", "script"]
    types:["main_frame", "sub_frame"]
  },
  ["blocking", "responseHeaders"]
);
