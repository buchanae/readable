
// All of the regular expressions in use within readability.
// Defined up here so we don't instantiate them repeatedly in loops.
var REGEXPS = {
  header: /head/i,
  social: /facebook|twitter|pinterest|stumbleupon|reddit|google|linkedin|email|print/i,
  unlikelyCandidates: /-ad-|banner|breadcrumbs|combx|comment|community|cover-wrap|disqus|extra|facebook|foot|legends|menu|related|remark|replies|rss|share|shoutbox|sidebar|skyscraper|social|sponsor|supplemental|syndicat|twitter|pinterest|ad-break|agegate|pagination|pager|popup|yom-remote/i,
  okMaybeItsACandidate: /and|article|body|column|main|shadow/i,
  positive: /article|body|content|entry|hentry|h-entry|main|page|pagination|post|text|blog|story/i,
  negative: /hidden|^hid$| hid$| hid |^hid |banner|combx|comment|com-|contact|foot|footer|footnote|masthead|media|meta|outbrain|promo|related|scroll|share|shoutbox|sidebar|skyscraper|sponsor|shopping|tags|tool|widget/i,
  extraneous: /print|archive|comment|discuss|e[\-]?mail|share|reply|all|login|sign|single|utility/i,
  byline: /byline|author|dateline|writtenby|p-author/i,
  replaceFonts: /<(\/?)font[^>]*>/gi,
  normalize: /\s{2,}/g,
  videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
  nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
  prevLink: /(prev|earl|old|new|<|«)/i,
  whitespace: /^\s*$/,
  hasContent: /\S$/,
}

// TODO https://stackoverflow.com/questions/28573225/intercept-and-modify-dom-before-page-is-displayed-to-user/36097573#36097573
// https://stackoverflow.com/questions/18354668/how-to-implement-xpcom-component-nsicontentpolicy-in-bootstrapped-firefox-exte

/**
 * Removes script tags from the document.
 *
 * @param Element
**/
function removeScripts(doc) {
  // Remove <script>
  removeNodes(doc.getElementsByTagName("script"), function(scriptNode) {
    console.log('removing script')
    scriptNode.nodeValue = "";
    scriptNode.removeAttribute("src");
    return true;
  });
  // Remove <noscript>
  removeNodes(doc.getElementsByTagName("noscript"));
}

/**
 * Iterates over a NodeList, calls `filterFn` for each node and removes node
 * if function returned `true`.
 *
 * If function is not passed, removes all the nodes in node list.
 *
 * @param NodeList nodeList The nodes to operate on
 * @param Function filterFn the function to use as a filter
 * @return void
 */
function removeNodes(nodeList, filterFn) {
  for (var i = nodeList.length - 1; i >= 0; i--) {
    var node = nodeList[i];
    var parentNode = node.parentNode;
    if (parentNode) {
      if (!filterFn || filterFn.call(this, node, i, nodeList)) {
        parentNode.removeChild(node);
      }
    }
  }
}

// TODO oops, removing doctype
function isProbablyInvisible(node) {
  return node.nodeType == Node.ELEMENT_NODE && ((node.style && node.style.display == "none") || node.hasAttribute("hidden"));
}

function isElementWithoutContent(node) {
  return node.nodeType === this.ELEMENT_NODE &&
    node.textContent.trim().length == 0 &&
    (node.children.length == 0 ||
     node.children.length == node.getElementsByTagName("br").length + node.getElementsByTagName("hr").length);
}

function childOfArticle(node) {
  var parent = node.parentNode
  while (parent) {
    if (parent.tagName == "ARTICLE") {
      return true
    }
    parent = parent.parentNode
  }
}

function shouldRemove(node) {
  var name = node.tagName

  if (node.nodeType != Node.ELEMENT_NODE) {
    return
  }

  if (isProbablyInvisible(node)) {
    return "hidden node"
  }

  // Remove DIV, SECTION, and HEADER nodes without any content(e.g. text, image, video, or iframe).
  if ((node.tagName == "DIV" || node.tagName == "SECTION" || node.tagName == "HEADER" ||
       node.tagName == "H1" || node.tagName == "H2" || node.tagName == "H3" ||
       node.tagName == "H4" || node.tagName == "H5" || node.tagName == "H6") &&
      isElementWithoutContent(node)) {
    return "no content"
  }

  if (name == "SCRIPT" || name == "NOSCRIPT" || name == "IFRAME") {
    return "script or iframe"
  }

  var matchString = node.className + " " + node.id;
  //console.log("match", matchString, node)
  if (REGEXPS.unlikelyCandidates.test(matchString) &&
      !REGEXPS.okMaybeItsACandidate.test(matchString) &&
      node.tagName !== "BODY" &&
      node.tagName !== "A") {
    return "unlikely candidate"
  }

  if (REGEXPS.social.test(matchString)) {
    return "socal link"
  }

  if (REGEXPS.header.test(matchString) &&
      !REGEXPS.okMaybeItsACandidate.test(matchString) &&
      !childOfArticle(node) &&
      node.tagName !== "BODY" &&
      node.tagName !== "A") {
    return "page header"
  }
}

function cleanDoc(doc, opts) {
  console.log("starting readable", doc)

  var remove = []
  var walkerTR = document.createTreeWalker(doc, NodeFilter.SHOW_ALL, {
    acceptNode: function(node) {

      var reason = shouldRemove(node);
      if (reason) {
        remove.push(node)
        console.log(reason, node)
        return NodeFilter.FILTER_REJECT
      }
      return NodeFilter.FILTER_ACCEPT
    },
  })

  while(walkerTR.nextNode()) {}

  for (var i = 0; i < remove.length; i++) {
    var node = remove[i]

    if (opts.debug && node.tagName != "script") {
      node.style.border = "5px solid red"
    } else {
      node.parentNode.removeChild(node)
    }
  }
}

function readable(opts) {
  opts = opts || {}
  
  document.replaceChild(
    document.createElement("html"), document.children[0]);

  fetch(document.URL)
    .then(resp => resp.text())
    .then(function(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(html, "text/html");
        cleanDoc(doc.children[0], opts);
        document.replaceChild(doc.children[0], document.children[0]);
    })
    .catch(function(err) {  
        console.log('Failed to fetch page: ', err);  
    });
}

browser.runtime.sendMessage("start").then((options) => {
  options = options || {clean: false, debug: false}
  if (!options.clean) {
    return
  }
  readable(options)
})
