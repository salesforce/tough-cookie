<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [tough-cookie](./tough-cookie.md) &gt; [GetCookiesOptions](./tough-cookie.getcookiesoptions.md)

## GetCookiesOptions interface

Configuration options used when calling `CookieJar.getCookies(...)`<!-- -->.

**Signature:**

```typescript
interface GetCookiesOptions 
```

## Properties

<table><thead><tr><th>

Property


</th><th>

Modifiers


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

[allPaths?](./tough-cookie.getcookiesoptions.allpaths.md)


</td><td>


</td><td>

boolean \| undefined


</td><td>

_(Optional)_ If `true`<!-- -->, do not scope cookies by path. If `false`<!-- -->, then RFC-compliant path scoping will be used.


</td></tr>
<tr><td>

[expire?](./tough-cookie.getcookiesoptions.expire.md)


</td><td>


</td><td>

boolean \| undefined


</td><td>

_(Optional)_ Perform `expiry-time` checking of cookies and asynchronously remove expired cookies from the store.


</td></tr>
<tr><td>

[http?](./tough-cookie.getcookiesoptions.http.md)


</td><td>


</td><td>

boolean \| undefined


</td><td>

_(Optional)_ Indicates if this is an HTTP or non-HTTP API. Affects HttpOnly cookies.

Defaults to `true` if not provided.


</td></tr>
<tr><td>

[sameSiteContext?](./tough-cookie.getcookiesoptions.samesitecontext.md)


</td><td>


</td><td>

'none' \| 'lax' \| 'strict' \| undefined


</td><td>

_(Optional)_ Set this to 'none', 'lax', or 'strict' to enforce SameSite cookies upon retrieval.

- `'strict'` - If the request is on the same "site for cookies" (see the RFC draft for more information), pass this option to add a layer of defense against CSRF.

- `'lax'` - If the request is from another site, but is directly because of navigation by the user, such as, `<link type=prefetch>` or `<a href="...">`<!-- -->, then use `lax`<!-- -->.

- `'none'` - This indicates a cross-origin request.

- `undefined` - SameSite is not enforced! This can be a valid use-case for when CSRF isn't in the threat model of the system being built.

Defaults to `undefined` if not provided.


</td></tr>
<tr><td>

[sort?](./tough-cookie.getcookiesoptions.sort.md)


</td><td>


</td><td>

boolean \| undefined


</td><td>

_(Optional)_ Flag to indicate if the returned cookies should be sorted or not.

Defaults to `undefined` if not provided.


</td></tr>
</tbody></table>

