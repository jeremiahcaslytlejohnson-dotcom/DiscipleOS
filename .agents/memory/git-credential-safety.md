---
name: Git credential safety
description: Safe command-line Git authentication and local Git metadata changes in this Replit workspace.
---

Keep GitHub tokens out of remote URLs and command arguments. Git may print malformed remote arguments in an error, exposing credentials. Use an environment-backed credential helper while keeping the `origin` URL credential-free.

**Why:** A token-only secret passed as a remote can be interpreted as a local path, and Git may include that argument in its error output.

**How to apply:** Store the token in Replit Secrets and have a local credential helper read it at runtime. Before updating `.git` metadata, verify the target ref and that the update is non-destructive. The workspace shell blocks `.git` writes unless prefixed with `DANGEROUSLY_ALLOW_GIT=1`; use that bypass only for a verified, scoped metadata change.
