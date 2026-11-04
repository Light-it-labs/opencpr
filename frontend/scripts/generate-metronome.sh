#!/usr/bin/env bash
# Generates src/assets/audio/metronome.mp3: a 110 bpm click, mono 44.1 kHz,
# exactly 66 beats (36 s) long so the kiosk can loop it without drifting.
# Requires ffmpeg built with libmp3lame.
# cspell:words aevalsrc atrim bitexact fflags lavfi libmp loglevel
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
output="${1:-${script_dir}/../src/assets/audio/metronome.mp3}"

sample_rate=44100
bpm=110
beats=66
total_samples=$((sample_rate * 60 * beats / bpm))

# One beat is 44100 * 60 / 110 = 24054.54... samples, not a whole number, so
# beat k starts at round(k * beat) and the error never accumulates. The click
# is a 1.5 kHz sine with an 8 ms exponential decay, cut after 40 ms.
beat="(${sample_rate}*60/${bpm})"
beat_start="round(floor((n+0.5)/${beat})*${beat})"
t="((n-${beat_start})/${sample_rate})"
click="0.89*sin(2*PI*1500*${t})*exp(-${t}/0.008)*lt(${t},0.04)"

ffmpeg -hide_banner -loglevel error -y \
  -f lavfi -i "aevalsrc=exprs='${click}':s=${sample_rate}:c=mono" \
  -af "atrim=end_sample=${total_samples}" \
  -map_metadata -1 -fflags +bitexact -flags:a +bitexact \
  -metadata title="OpenCPR metronome 110 bpm" \
  -c:a libmp3lame -b:a 64k \
  "${output}"
