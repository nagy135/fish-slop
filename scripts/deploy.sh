#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -n "$(git status --porcelain)" ]]; then
  printf '%s\n' 'Commit your changes before deploying.' >&2
  exit 1
fi

deploy_host="${FISH_DEPLOY_HOST:-infiniter@nixpi.tail6650cb.ts.net}"
deploy_repo='/home/infiniter/services/fish-slop'
web_root='/var/www/fish'
release="$(git rev-parse --short=12 HEAD)-$(date -u +%Y%m%dT%H%M%SZ)"

npm test
npm run build

# The Pi receives committed source over Git; the provider remote is unchanged.
git push "ssh://${deploy_host}${deploy_repo}" HEAD:main

ssh "$deploy_host" "install -d -m 0755 '${web_root}/releases/${release}'"
rsync -az --chmod=D755,F644 dist/ "${deploy_host}:${web_root}/releases/${release}/"

# Switch the served release atomically. Existing releases remain for rollback.
ssh "$deploy_host" "ln -s 'releases/${release}' '${web_root}/.current-${release}' && mv -Tf '${web_root}/.current-${release}' '${web_root}/current'"

printf 'Deployed release %s to https://fish.infiniter.tech\n' "$release"
