param(
  [string]$Prompt = $env:CODEX_USER_PROMPT
)

# Codex sends hook JSON through stdin as UTF-8. Windows PowerShell otherwise
# decodes redirected stdin with the active OEM code page, which corrupts
# Vietnamese text before it reaches Add-Content.
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
$stdinPayload = [Console]::In.ReadToEnd()
if ([string]::IsNullOrWhiteSpace($Prompt) -and -not [string]::IsNullOrWhiteSpace($stdinPayload)) {
  try {
    $hookInput = $stdinPayload | ConvertFrom-Json
    $Prompt = $hookInput.prompt
    if ([string]::IsNullOrWhiteSpace($Prompt)) {
      $Prompt = $hookInput.user_prompt
    }
    if ([string]::IsNullOrWhiteSpace($Prompt)) {
      $Prompt = $hookInput.message
    }
  } catch {
    $Prompt = $stdinPayload
  }
}

if ([string]::IsNullOrWhiteSpace($Prompt)) {
  Write-Error "Prompt is required. Pass it as an argument or set CODEX_USER_PROMPT."
  exit 1
}

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$promptFile = Join-Path $repoRoot ".codex\log.md"
$date = Get-Date -Format "yyyy-MM-dd"
$singleLinePrompt = ($Prompt -replace "\r?\n", " ").Trim()

Add-Content -LiteralPath $promptFile -Value "- ${date}: ${singleLinePrompt}" -Encoding utf8
