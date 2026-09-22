---
name: API client TypeScript DOM libs
description: Generated browser clients may use Headers.entries and need iterable DOM typings.
---

Generated API client code can call `Headers.entries()`. The API client library's TypeScript config must include both `dom` and `dom.iterable` libs or workspace typechecking fails even when codegen succeeds.

**Why:** The generated client uses browser `Headers` APIs while the shared base config only targets ES libraries.

**How to apply:** Keep `dom.iterable` enabled for browser client packages that consume Orval output; do not patch generated files.