#!/bin/bash
#
# Reazonサーバーを起動する。
# ./scripts/start-server.sh
#
uvicorn server:app --host 0.0.0.0 --port 9002
# uvicorn server:app --reload --host 0.0.0.0 --port 9002
