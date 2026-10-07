# Simplify person form

Implement the user's seven explicit browser annotations while preserving existing styling and private-account isolation.

1. Remove source, import, certainty, timezone, permission checkbox and footer explanation from the person editor.
2. Require date, time and place. Infer Chinese regional timezone from existing location service; overseas results require an explicit matching city selection with coordinate timezone lookup. Never default an unresolved foreign place to Shanghai. Retain clock-change ambiguity selection only when necessary.
3. New entries use a neutral `entered` source, never fabricated permission. Existing source and legacy records remain readable. Own-context AI consent remains separate and unchanged.
4. Verify validation, SQL compatibility, responsive editor and publish H5 only after checks.
