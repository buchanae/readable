
var DEFAULT_TAGS_TO_SCORE = "section,h2,h3,h4,h5,h6,p,td,pre".toUpperCase().split(",");

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
  cssPseudoContent: /advertisement/i,
  replaceFonts: /<(\/?)font[^>]*>/gi,
  normalize: /\s{2,}/g,
  videos: /\/\/(www\.)?((dailymotion|youtube|youtube-nocookie|player\.vimeo|v\.qq)\.com|(archive|upload\.wikimedia)\.org|player\.twitch\.tv)/i,
  nextLink: /(next|weiter|continue|>([^\|]|$)|»([^\|]|$))/i,
  prevLink: /(prev|earl|old|new|<|«)/i,
  whitespace: /^\s*$/,
  hasContent: /\S$/,
}

function getNodeAncestors(node, maxDepth) {
  maxDepth = maxDepth || 0;
  var i = 0, ancestors = [];
  while (node.parentNode) {
    ancestors.push(node.parentNode);
    if (maxDepth && ++i === maxDepth)
      break;
    node = node.parentNode;
  }
  return ancestors;
}

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

function shouldRemovePost(node) {
  console.log("visit post", node)
  if (node.nodeType != Node.ELEMENT_NODE) {
    console.log("skipping non-element node type")
    return
  }

  var after = window.getComputedStyle(node, ":after").getPropertyValue("content")
  var before = window.getComputedStyle(node, ":before").getPropertyValue("content")

  console.log("before/after", before, after)
  if (REGEXPS.cssPseudoContent.test(after)) {
    return "cheeky :after"
  }

  if (REGEXPS.cssPseudoContent.test(before)) {
    return "cheeky :before"
  }
}


function shouldRemove(node) {
  var name = node.tagName

  if (node.nodeType != Node.ELEMENT_NODE) {
    console.log("skipping non-element node type")
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

  var candidates = []

  while(walkerTR.nextNode()) {
    scoreNode(walkerTR.currentNode, candidates)
  }

  for (var i = 0; i < candidates.length; i++) {
    console.log("candidate", candidates[i], candidates[i].readability)
  }

  for (var i = 0; i < remove.length; i++) {
    var node = remove[i]

    if (opts.debug && node.tagName != "script") {
      node.style.border = "5px solid red"
    } else {
      node.parentNode.removeChild(node)
    }
  }
}

/**
 * Initialize a node with the readability object. Also checks the
 * className/id for special names to add to its score.
 *
 * @param Element
 * @return void
**/
function initializeNode(node) {
  node.readability = {"contentScore": 0};

  switch (node.tagName) {
    case "DIV":
      node.readability.contentScore += 5;
      break;

    case "PRE":
    case "TD":
    case "BLOCKQUOTE":
      node.readability.contentScore += 3;
      break;

    case "ADDRESS":
    case "OL":
    case "UL":
    case "DL":
    case "DD":
    case "DT":
    case "LI":
    case "FORM":
      node.readability.contentScore -= 3;
      break;

    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
    case "TH":
      node.readability.contentScore -= 5;
      break;
  }

  node.readability.contentScore += getClassWeight(node);
}

/**
 * Get an elements class/id weight. Uses regular expressions to tell if this
 * element looks good or bad.
 *
 * @param Element
 * @return number (Integer)
**/
function getClassWeight(e) {
  var weight = 0;

  // Look for a special classname
  if (typeof(e.className) === "string" && e.className !== "") {
    if (REGEXPS.negative.test(e.className))
      weight -= 25;

    if (REGEXPS.positive.test(e.className))
      weight += 25;
  }

  // Look for a special ID
  if (typeof(e.id) === "string" && e.id !== "") {
    if (REGEXPS.negative.test(e.id))
      weight -= 25;

    if (REGEXPS.positive.test(e.id))
      weight += 25;
  }

  return weight;
}

function scoreNode(node, candidates) {
  if (!node.parentNode || typeof(node.parentNode.tagName) === "undefined") {
    return;
  }

  if (DEFAULT_TAGS_TO_SCORE.indexOf(node.tagName) === -1) {
    return
  }

  // If this paragraph is less than 25 characters, don't even count it.
  var innerText = node.textContent.trim()
  if (innerText.length < 25) {
    return;
   }

  // Exclude nodes with no ancestor.
  var ancestors = getNodeAncestors(node, 3);
  if (ancestors.length === 0) {
    return;
  }

  var contentScore = 0;

  // Add a point for the paragraph itself as a base.
  contentScore += 1;

  // Add points for any commas within this paragraph.
  contentScore += innerText.split(",").length;

  // For every 100 characters in this paragraph, add another point. Up to 3 points.
  contentScore += Math.min(Math.floor(innerText.length / 100), 3);

  // Initialize and score ancestors.
  for (var i = 0; i < ancestors.length; i++) {
    var ancestor = ancestors[i];
    var level = i;

    if (!ancestor.tagName || !ancestor.parentNode || typeof(ancestor.parentNode.tagName) === "undefined") {
      break;
    }

    if (typeof(ancestor.readability) === "undefined") {
      initializeNode(ancestor)
      candidates.push(ancestor);
    }

    // Node score divider:
    // - parent:             1 (no division)
    // - grandparent:        2
    // - great grandparent+: ancestor level * 3
    if (level === 0) {
      var scoreDivider = 1;
    } else if (level === 1) {
      scoreDivider = 2;
    } else {
      scoreDivider = level * 3;
    }
    ancestor.readability.contentScore += contentScore / scoreDivider;
  }
}

function postClean(doc, opts) {
  console.log("starting readable post clean", doc)

  var remove = []
  var walkerTR = document.createTreeWalker(doc, NodeFilter.SHOW_ALL, {
    acceptNode: function(node) {

      var reason = shouldRemovePost(node);
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

        document.addEventListener("readystatechange", function(){
          postClean(document.body, opts)
        })

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
