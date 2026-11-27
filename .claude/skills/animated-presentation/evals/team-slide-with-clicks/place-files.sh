#!/usr/bin/env bash
set -eu
# the presentation built in the animated-presentation project (four folders up), as deck.html
cp "$(dirname "$0")/../../../../Presentation.html" ./deck.html
