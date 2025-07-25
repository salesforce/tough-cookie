<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [tough-cookie](./tough-cookie.md) &gt; [CookieJar](./tough-cookie.cookiejar.md) &gt; [getCookies](./tough-cookie.cookiejar.getcookies_1.md)

## CookieJar.getCookies() method

Retrieve the list of cookies that can be sent in a Cookie header for the current URL.

**Signature:**

```typescript
getCookies(url: string, callback: Callback<Cookie[]>): void;
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

url


</td><td>

string


</td><td>

The domain to store the cookie with.


</td></tr>
<tr><td>

callback


</td><td>

[Callback](./tough-cookie.callback.md)<!-- -->&lt;[Cookie](./tough-cookie.cookie.md)<!-- -->\[\]&gt;


</td><td>

A function to call after a cookie has been successfully retrieved.


</td></tr>
</tbody></table>

**Returns:**

void

## Remarks

- The array of cookies returned will be sorted according to [cookieCompare()](./tough-cookie.cookiecompare.md)<!-- -->.

- The [Cookie.lastAccessed](./tough-cookie.cookie.lastaccessed.md) property will be updated on all returned cookies.

