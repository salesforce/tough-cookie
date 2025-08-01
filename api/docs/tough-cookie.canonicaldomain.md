<!-- Do not edit this file. It is automatically generated by API Documenter. -->

[Home](./index.md) &gt; [tough-cookie](./tough-cookie.md) &gt; [canonicalDomain](./tough-cookie.canonicaldomain.md)

## canonicalDomain() function

Transforms a domain name into a canonical domain name. The canonical domain name is a domain name that has been trimmed, lowercased, stripped of leading dot, and optionally punycode-encoded ([Section 5.1.2 of RFC 6265](https://www.rfc-editor.org/rfc/rfc6265.html#section-5.1.2)<!-- -->). For the most part, this function is idempotent (calling the function with the output from a previous call returns the same output).

**Signature:**

```typescript
declare function canonicalDomain(domainName: Nullable<string>): string | undefined;
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

domainName


</td><td>

[Nullable](./tough-cookie.nullable.md)<!-- -->&lt;string&gt;


</td><td>

the domain name to generate the canonical domain from


</td></tr>
</tbody></table>

**Returns:**

string \| undefined

## Remarks

A canonicalized host name is the string generated by the following algorithm:

1. Convert the host name to a sequence of individual domain name labels.

2. Convert each label that is not a Non-Reserved LDH (NR-LDH) label, to an A-label (see Section 2.3.2.1 of \[RFC5890\] for the former and latter), or to a "punycode label" (a label resulting from the "ToASCII" conversion in Section 4 of \[RFC3490\]), as appropriate (see Section 6.3 of this specification).

3. Concatenate the resulting labels, separated by a %x2E (".") character.

## Example


```
canonicalDomain('.EXAMPLE.com') === 'example.com'
```

