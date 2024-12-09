<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [tough-cookie](./tough-cookie.md) &gt; [Cookie](./tough-cookie.cookie.md) &gt; [expiryDate](./tough-cookie.cookie.expirydate.md)

## Cookie.expiryDate() method

Similar to [Cookie.expiryTime()](./tough-cookie.cookie.expirytime.md)<!-- -->, computes the absolute unix-epoch milliseconds that this cookie expires and returns it as a Date.

The "Max-Age" attribute takes precedence over "Expires" (as per the RFC). The [Cookie.lastAccessed](./tough-cookie.cookie.lastaccessed.md) attribute (or the `now` parameter if given) is used to offset the [Cookie.maxAge](./tough-cookie.cookie.maxage.md) attribute.

If Expires ([Cookie.expires](./tough-cookie.cookie.expires.md)<!-- -->) is set, that's returned.

**Signature:**

```typescript
expiryDate(now?: Date): Date | undefined;
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

now


</td><td>

Date


</td><td>

_(Optional)_ can be used to provide a time offset (instead of [Cookie.lastAccessed](./tough-cookie.cookie.lastaccessed.md)<!-- -->) to use when calculating the "Max-Age" value


</td></tr>
</tbody></table>
**Returns:**

Date \| undefined
