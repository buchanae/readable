# Challenges

1. You want the heavy, ugly pages *never* to load, but how do you
  apply readable to all pages? Some pages are not articles, but
  are more like applications – these are outside the scope of readable,
  but in order to be automatic, readable needs to be able to detect
  which pages it can safely ignore.

2. Hand-writing rules in javascript is a decent first pass, but a precise
  system wants a more scalable approach to human curation of rules.
  How could we build a distributed community for quickly editing articles
  into their best form? Could such a system solve #1 above?

3. Some articles include junk images that are "fun" but don't add any
   substance to the content. An automated script can't resolve these.
   Human curation is needed.


# To do / Issues / Ideas

1. Unload page completely when starting readable. Possibly requires
   a navigation event, which leads to adding an entry to the back
   button history, which is something I don't like about Firefox's
   reader mode. Hmmmm. Possibly "loadReplace" in tabs.update().

2. Possibly block large images? Or deprioritize them? Could use
   content-length headers?
