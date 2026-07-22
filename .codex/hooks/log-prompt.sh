#!/usr/bin/env bash

set -euo pipefail

prompt="${CODEX_USER_PROMPT:-${1:-}}"
stdin_payload="$(cat)"

if [[ -z "${prompt//[[:space:]]/}" && -n "${stdin_payload//[[:space:]]/}" ]]; then
  if parsed_prompt="$(jq -er '.prompt // .user_prompt // .message // empty' <<<"$stdin_payload" 2>/dev/null)"; then
    prompt="$parsed_prompt"
  else
    prompt="$stdin_payload"
  fi
fi

if [[ -z "${prompt//[[:space:]]/}" ]]; then
  printf 'Prompt is required. Pass it as an argument or set CODEX_USER_PROMPT.\n' >&2
  exit 1
fi

script_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd -- "$script_dir/../.." && pwd)"
prompt_file="$repo_root/.codex/log.md"
single_line_prompt="$(printf '%s' "$prompt" | tr '\r\n' ' ' | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//')"

printf -- '- %s: %s\n' "$(date +%F)" "$single_line_prompt" >>"$prompt_file"
