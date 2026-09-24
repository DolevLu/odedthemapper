#!/bin/sh
# Runs the Google enrichment for several destinations in sequence, one log per destination.
# usage: scripts/run-enrichment-batch.sh "slug:City:lang2" "slug:City:lang2" ...
for spec in "$@"; do
  slug=${spec%%:*}; rest=${spec#*:}; city=${rest%%:*}; lang=${rest#*:}
  echo "=== $slug ($city) $(date +%H:%M:%S)"
  node scripts/enrich-from-google.cjs --slug "$slug" --city "$city" ${lang:+--lang2 "$lang"} --workers 6 --beneath 2>&1 | tail -3
done
