// 5.2. "Same-site" and "cross-site" Requests
// Two origins are same-site if they satisfy the "same site" criteria defined in [SAMESITE]. A request is "same-site" if the following criteria are true:

// The request is not the result of a cross-site redirect. That is, the origin of every url in the request's url list is same-site with the request's current url's origin.
// The request is not the result of a reload navigation triggered through a user interface element (as defined by the user agent; e.g., a request triggered by the user clicking a refresh button on a toolbar).
// The request's current url's origin is same-site with the request's client's "site for cookies" (which is an origin), or if the request has no client or the request's client is null.
// Requests which are the result of a reload navigation triggered through a user interface element are same-site if the reloaded document was originally navigated to via a same-site request. A request that is not "same-site" is instead "cross-site".

// The request's client's "site for cookies" is calculated depending upon its client's type, as described in the following subsections:

// 5.2.1. Document-based requests
// The URI displayed in a user agent's address bar is the only security context directly exposed to users, and therefore the only signal users can reasonably rely upon to determine whether or not they trust a particular website. The origin of that URI represents the context in which a user most likely believes themselves to be interacting. We'll define this origin, the top-level traversable's active document's origin, as the "top-level origin".

// For a document displayed in a top-level traversable, we can stop here: the document's "site for cookies" is the top-level origin.

// For container documents, we need to audit the origins of each of a document's ancestor navigables' active documents in order to account for the "multiple-nested scenarios" described in Section 4 of [RFC7034]. A document's "site for cookies" is the top-level origin if and only if the top-level origin is same-site with the document's origin, and with each of the document's ancestor documents' origins. Otherwise its "site for cookies" is an origin set to an opaque origin.

// Given a Document (document), the following algorithm returns its "site for cookies":

// Let top-document be the active document in document's navigable's top-level traversable.
// Let top-origin be the origin of top-document's URI if top-document's sandboxed origin browsing context flag is set, and top-document's origin otherwise.
// Let documents be a list consisting of the active documents of document's inclusive ancestor navigables.
// For each item in documents:

// Let origin be the origin of item's URI if item's sandboxed origin browsing context flag is set, and item's origin otherwise.
// If origin is not same-site with top-origin, return an origin set to an opaque origin.
// Return top-origin.
// Note: This algorithm only applies when the entire chain of documents from top-document to document are all active.

// 5.2.2. Worker-based requests
// Worker-driven requests aren't as clear-cut as document-driven requests, as there isn't a clear link between a top-level traversable and a worker. This is especially true for Service Workers [SERVICE-WORKERS], which may execute code in the background, without any document visible at all.

// Note: The descriptions below assume that workers must be same-origin with the documents that instantiate them. If this invariant changes, we'll need to take the worker's script's URI into account when determining their status.

// 5.2.2.1. Dedicated and Shared Workers
// Dedicated workers are simple, as each dedicated worker is bound to one and only one document. Requests generated from a dedicated worker (via importScripts, XMLHttpRequest, fetch(), etc) define their "site for cookies" as that document's "site for cookies".

// Shared workers may be bound to multiple documents at once. As it is quite possible for those documents to have distinct "site for cookies" values, the worker's "site for cookies" will be an origin set to an opaque origin in cases where the values are not all same-site with the worker's origin, and the worker's origin in cases where the values agree.

// Given a WorkerGlobalScope (worker), the following algorithm returns its "site for cookies":

// Let site be worker's origin.
// For each document in worker's Documents:

// Let document-site be document's "site for cookies" (as defined in Section 5.2.1).
// If document-site is not same-site with site, return an origin set to an opaque origin.
// Return site.
// 5.2.2.2. Service Workers
// Service Workers are more complicated, as they act as a completely separate execution context with only tangential relationship to the Document which registered them.

// How user agents handle Service Workers may differ, but user agents SHOULD match the [SERVICE-WORKERS] specification.