#!/bin/bash
# Chrome DevTools MCP - Profile Pool Picker
# 풀에서 사용 중이지 않은 프로필을 골라 chrome-devtools-mcp를 실행

POOL_DIR="$HOME/.cache/chrome-devtools-mcp/pool"
POOL_SIZE="${CHROME_MCP_POOL_SIZE:-3}"

# 풀 사이즈 유효성 검증
if ! [[ "$POOL_SIZE" =~ ^[0-9]+$ ]] || [ "$POOL_SIZE" -lt 1 ]; then
  echo "[chrome-mcp-pool] ERROR: Invalid CHROME_MCP_POOL_SIZE: $POOL_SIZE" >&2
  exit 1
fi

# 풀 디렉토리 생성
mkdir -p "$POOL_DIR"

# 사용 가능한 프로필 찾기
SELECTED=""
for i in $(seq 1 $POOL_SIZE); do
  PROFILE_DIR="$POOL_DIR/profile-$i"
  LOCK_FILE="$PROFILE_DIR/SingletonLock"

  # 프로필 디렉토리 없으면 새로 사용
  if [ ! -d "$PROFILE_DIR" ]; then
    SELECTED="$PROFILE_DIR"
    break
  fi

  # SingletonLock 없으면 사용 가능 (-L: 심볼릭 링크 자체 존재 여부도 체크)
  if [ ! -L "$LOCK_FILE" ] && [ ! -e "$LOCK_FILE" ]; then
    SELECTED="$PROFILE_DIR"
    break
  fi

  # SingletonLock 있어도 프로세스가 죽었으면 사용 가능 (stale lock)
  # macOS에서 SingletonLock은 심볼릭 링크로 호스트명-PID를 가리킴
  if [ -L "$LOCK_FILE" ]; then
    LOCK_TARGET=$(readlink "$LOCK_FILE" 2>/dev/null)
    PID=$(echo "$LOCK_TARGET" | grep -oE '[0-9]+$')
    if [ -n "$PID" ] && ! kill -0 "$PID" 2>/dev/null; then
      echo "[chrome-mcp-pool] WARNING: Removing stale lock for profile-$i (dead PID: $PID)" >&2
      rm -f "$LOCK_FILE"
      SELECTED="$PROFILE_DIR"
      break
    fi
  fi
done

if [ -z "$SELECTED" ]; then
  echo "[chrome-mcp-pool] ERROR: All $POOL_SIZE profiles are in use:" >&2
  for i in $(seq 1 $POOL_SIZE); do
    PROFILE_DIR="$POOL_DIR/profile-$i"
    LOCK_FILE="$PROFILE_DIR/SingletonLock"
    if [ -L "$LOCK_FILE" ]; then
      LOCK_TARGET=$(readlink "$LOCK_FILE" 2>/dev/null)
      PID=$(echo "$LOCK_TARGET" | grep -oE '[0-9]+$')
      echo "  profile-$i: PID $PID ($LOCK_TARGET)" >&2
    else
      echo "  profile-$i: locked (non-symlink lock)" >&2
    fi
  done
  echo "[chrome-mcp-pool] Tip: Increase pool size with CHROME_MCP_POOL_SIZE env var" >&2
  exit 1
fi

echo "[chrome-mcp-pool] Using profile: $(basename "$SELECTED") (pool size: $POOL_SIZE)" >&2

exec pnpx chrome-devtools-mcp@latest --userDataDir "$SELECTED" "$@"
