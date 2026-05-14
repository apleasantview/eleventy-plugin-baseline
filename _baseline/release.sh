#!/bin/bash -
#title          :release.sh
#description    :Bump, pack and publish a new pre-release of eleventy-plugin-baseline
#author         :Cristovao Verstraeten
#date           :20260329
#version        :2026.04.26
#usage          :./release.sh [tag]
#example        :cd _baseline && ./release.sh        # bump, pack and publish as next
#               :./_baseline/release.sh              # same, called from repo root
#               :./_baseline/release.sh tag          # also promote to latest dist-tag
#notes          :Run from anywhere. Pass "tag" to also promote to latest dist-tag.
#bash_version   :5.0+
#============================================================================

# "strict mode"
# http://redsymbol.net/articles/unofficial-bash-strict-mode/
set -euo pipefail
IFS=$'\n\t'

## VARIABLES
cwd=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
packages_dir="${cwd}/packages"
promote_to_latest="${1:-false}"
local_only=false

if [[ "${1:-}" == "local" ]]; then
  local_only=true
fi

### FUNCTIONS
main() {
  if [[ "${local_only}" == true ]]; then
    echo "Running in local mode (no auth, no publish, no version bump)..."
    preview
    confirm "Tarball looks good? Proceed with local package?" || exit 0
    bump_version
    pack
    exit 0
  fi

  check_auth
  preview
  confirm "Tarball looks good? Proceed with publish?" || exit 0
  bump_version
  pack
  publish
  if [[ "${promote_to_latest}" == "tag" ]]; then
    tag_latest
  else
    echo "Skipping latest tag. Run './_baseline/release.sh tag' to promote."
  fi
}

check_auth() {
  echo "Checking npm auth..."
  npm whoami
}

bump_version() {
  echo "Bumping version..."
  npm version prerelease --preid next
}

preview() {
  local current next
  current=$(grep '"version"' "${cwd}/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
  next="${current%.*}.$((${current##*.} + 1))"
  echo ""
  echo "Preview of what will be packed for ${next} (currently ${current}):"
  npm pack --dry-run
  echo ""
  echo "Pack destination: ${packages_dir}"
  echo "Pack version: v${next}"
}

confirm() {
  local prompt="${1}"
  read -r -p "${prompt} [y/N] " response
  [[ "${response}" =~ ^[Yy]$ ]]
}

pack() {
  echo "Packing tarball to ${packages_dir}..."
  npm pack --pack-destination "${packages_dir}"
}

publish() {
  echo "Publishing to npm..."
  npm publish --tag next --access public
}

tag_latest() {
  local version
  version=$(grep '"version"' "${cwd}/package.json" | head -1 | sed 's/.*"version": "\(.*\)".*/\1/')
  echo "Tagging ${version} as latest..."
  npm dist-tag add @apleasantview/eleventy-plugin-baseline@"${version}" latest
}

### SCRIPT
cd "${cwd}"
main
