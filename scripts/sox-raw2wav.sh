#!/bin/bash
#
# sox コマンドを使って raw ファイルを wav ファイルに変換する
# ./scripts/sox-raw2wav.sh ./work/XXXXXXXXX.raw
#
FILENAME=$1
BASENAME=${FILENAME%.*}
sox -t raw --endian big -e signed-integer -b 16 -r 48000 $FILENAME -t wav $BASENAME.wav
