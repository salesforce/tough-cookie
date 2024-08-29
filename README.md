# tough-cookie 2.5.0 Vulnerability Patch

## Overview
Version 2.5.0 of the tough-cookie package contained a Prototype Pollution vulnerability, which allowed attackers to modify the prototype of objects within the package, potentially leading to security issues.

## The Issue
The vulnerability stems from the __proto__ property in JavaScript objects. Every object has a __proto__ property, which links it to its prototype and provides access to inherited properties and methods.
If an attacker can manipulate this property, they can alter the behavior of all objects that share the same prototype.

When objects are initialized in an unsafe manner, such as by directly assigning an empty object ({}), the __proto__ property can be modified by reference. This means that if one object is polluted (i.e., its __proto__ is modified), all objects sharing the same prototype can be affected.

Vulnerable Code
In the original tough-cookie code, within the memstore.js file at line 39, the variable this.idx was initialized as an empty object ({}). This initialization allowed the vulnerability to manifest in the putCookie function (line 116).

For example, if a cookie was set with the domain "https://__proto__/" and rejectPublicSuffixes: false was specified in the new Cookie jar initialization, the putCookie function would assign cookie.domain to __proto__. This led to the following issues:

``` javascript this.idx.__proto__[cookie.path]``` was set to an empty object ({}).
``` javascript this.idx.__proto__[cookie.path][cookie.key]``` could then be set to any value the attacker chose.
As a result, the entire this.idx object and any other objects sharing the same prototype would become polluted with these unwanted properties.

## The Fix
To address the issue, this.idx was initialized using ``` javascript Object.create(null)``` instead of {}. This approach ensures that this.idx is created without a prototype, meaning it does not inherit from Object.prototype and therefore cannot be polluted via __proto__.
This change isolates the object and prevents prototype pollution from affecting other parts of the code.

## Test
to run a unit test, run the command ``` bash npx vows .\test\prototype_pollution_test.js```, or run ``` node index.js``` after npm install the package.
