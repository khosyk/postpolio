#!/usr/bin/env bash
set -euo pipefail
cmd="${1:-}"; name="${2:-}"
if [[ -z "${cmd}" || -z "${name}" ]]; then
  echo "usage: gitflow {start|release|finish-release} <name>" >&2
  exit 1
fi
case "$cmd" in
  start)
    git checkout main && git pull --ff-only &&
    git checkout -b "feature/$name" &&
    git push -u origin "feature/$name"
    ;;
  release)
    git checkout main && git pull --ff-only &&
    git checkout -b "release/$name" &&
    git push -u origin "release/$name"
    ;;
  finish-release)
    git checkout master && git pull --ff-only &&
    git merge --no-ff "release/$name" &&
    git tag -a "v$name" -m "v$name" &&
    git push origin master --tags &&
    git checkout main && git pull --ff-only &&
    git merge --no-ff "release/$name" &&
    git push origin main
    ;;
  *)
    echo "usage: gitflow {start|release|finish-release} <name>" >&2
    exit 1
    ;;

esac
