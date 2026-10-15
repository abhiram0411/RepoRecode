# Current plan

State relationships trace up to two const-initializer steps in the same function, with intermediate source links. Bounds: 200 candidate bindings, eight paths per binding, 200 indexed relationships and 60 diagram arrows. Calls, property access, mutation, mutable aliases and closures are excluded from propagation. This is lexical source evidence, not evaluated values or execution order. Analysis version 6 enables refresh of old indexes. Numbered arrows and a keyboard-accessible relationship picker keep full explanations and source links readable.

Publish the verified state-chain update. Version 13 remains the latest public release; its GitHub commit 9b1298ed9cda294baee82046cec63129f26837e6 passed CI run 38770487895.

Continue the implementation, provider and operations backlog in RESUME.md and MASTER_SPEC.md. Keep the app free, preserve finite coverage and accurate unsupported labels. Continue in this chat; no handoff requested.
