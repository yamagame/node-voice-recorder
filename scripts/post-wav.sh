#!/bin/bash
#
# Reazonサーバーに wav ファイル名を POST して音声認識する。
# ./scripts/post-wav.sh XXXXXXXXX.wav
#
# 認識したい wav ファイルは ./work ディレクトリに配置しておく。
#
curl -X POST -d "{\"filename\":\"${1}\"}" --header "Content-Type:application/json" http://localhost:9002/wav/transcribe
