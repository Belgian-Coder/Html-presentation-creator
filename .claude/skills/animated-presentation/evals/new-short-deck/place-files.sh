#!/usr/bin/env bash
set -eu
# the presentation file in the repository root (five folders up), as deck.html
cp "$(dirname "$0")/../../../../../Presentation.html" ./deck.html
