#!/bin/bash
#
# dora-engine に接続する
# 事前に ./scripts/start-server.sh を実行すること
# ./scripts/start-server.sh の実行方法については README.md を参照
# 

PWD=`dirname $0`
read -p "dora-engineのIPアドレスを入力 > " DORA_IP
HOST_IP=`node $PWD/hostip.js`
echo connecting $DORA_IP from $HOST_IP
curl -X POST --data "{\"host\":\"${HOST_IP}\", \"port\":\"3093\"}" --header "content-type:application/json" http://$DORA_IP:3090/reazon/config
export VOICE_RECORDER_SERVER_PORT=3093
export VOICE_RECORDER_ENERGY_POS=5
export AGENT_HOST=http://$HOST_IP:3090
yarn start
