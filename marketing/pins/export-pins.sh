#!/bin/bash
# Renders pin SVGs to 1000x1500 PNGs (Pinterest's 2:3 ratio) using built-in macOS tools.
set -e
cd "$(dirname "$0")"
node pin.js
for f in *.svg; do
  qlmanage -t -s 1500 -o . "$f" >/dev/null 2>&1
  sips -c 1500 1000 "$f.png" --out "${f%.svg}.png" >/dev/null
  rm -f "$f.png"
done
echo "Pins ready:"; for f in *.png; do echo "  $f  $(sips -g pixelWidth -g pixelHeight "$f" | tail -2 | tr -d ' \n' | sed 's/pixelWidth:/ /;s/pixelHeight:/x/')"; done
