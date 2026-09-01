# Architecture checker

`check.ps1` is intentionally a readable filesystem rule checker, not a compiler. It applies repository file-size and forbidden-filename rules while excluding generated/vendor output. Add an exception to `allowlist.json` only with a narrow path pattern, concrete reason, and ADR/owner reference.
