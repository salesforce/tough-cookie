<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [tough-cookie](./tough-cookie.md) &gt; [Store](./tough-cookie.store.md) &gt; [findCookies](./tough-cookie.store.findcookies_1.md)

## Store.findCookies() method

Locates all [Cookie](./tough-cookie.cookie.md) values matching the given `domain` and `path`<!-- -->.

The resulting list is checked for applicability to the current request according to the RFC (`domain-match`<!-- -->, `path-match`<!-- -->, `http-only-flag`<!-- -->, `secure-flag`<!-- -->, `expiry`<!-- -->, and so on), so it's OK to use an optimistic search algorithm when implementing this method. However, the search algorithm used SHOULD try to find cookies that [domainMatch()](./tough-cookie.domainmatch.md) the `domain` and [pathMatch()](./tough-cookie.pathmatch.md) the `path` in order to limit the amount of checking that needs to be done.

**Signature:**

```typescript
findCookies(domain: Nullable<string>, path: Nullable<string>, allowSpecialUseDomain?: boolean, callback?: Callback<Cookie[]>): void;
```

## Parameters

<table><thead><tr><th>

Parameter


</th><th>

Type


</th><th>

Description


</th></tr></thead>
<tbody><tr><td>

domain


</td><td>

[Nullable](./tough-cookie.nullable.md)<!-- -->&lt;string&gt;


</td><td>

The cookie domain to match against.


</td></tr>
<tr><td>

path


</td><td>

[Nullable](./tough-cookie.nullable.md)<!-- -->&lt;string&gt;


</td><td>

The cookie path to match against.


</td></tr>
<tr><td>

allowSpecialUseDomain


</td><td>

boolean


</td><td>

_(Optional)_ If `true` then special-use domain suffixes, will be allowed in matches. Defaults to `false`<!-- -->.


</td></tr>
<tr><td>

callback


</td><td>

[Callback](./tough-cookie.callback.md)<!-- -->&lt;[Cookie](./tough-cookie.cookie.md)<!-- -->\[\]&gt;


</td><td>

_(Optional)_ A function to call with either the found cookies or an error.


</td></tr>
</tbody></table>

**Returns:**

void

## Remarks

- As of version `0.9.12`<!-- -->, the `allPaths` option to cookiejar.getCookies() above causes the path here to be `null`<!-- -->.

- If the `path` is `null`<!-- -->, `path-matching` MUST NOT be performed (that is, `domain-matching` only).

