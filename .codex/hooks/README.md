# Codex Hooks

## log-prompt.ps1

Appends a user prompt to `.codex/log.md`.

Codex runs this automatically through `.codex/hooks.json` on the `UserPromptSubmit` event.

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/hooks/log-prompt.ps1 "your prompt"
```

Or with an environment variable:

```powershell
$env:CODEX_USER_PROMPT = "your prompt"
powershell -ExecutionPolicy Bypass -File .codex/hooks/log-prompt.ps1
```
