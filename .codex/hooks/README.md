# Codex Hooks

## Prompt logger

Appends a user prompt to `.codex/log.md`.

Codex runs this automatically through `.codex/hooks.json` on the `UserPromptSubmit` event.

### Ubuntu/Linux

```bash
bash .codex/hooks/log-prompt.sh "your prompt"
```

The Bash script also accepts hook JSON through stdin or the `CODEX_USER_PROMPT` environment
variable.

### Windows

Usage:

```powershell
powershell -ExecutionPolicy Bypass -File .codex/hooks/log-prompt.ps1 "your prompt"
```

Or with an environment variable:

```powershell
$env:CODEX_USER_PROMPT = "your prompt"
powershell -ExecutionPolicy Bypass -File .codex/hooks/log-prompt.ps1
```
