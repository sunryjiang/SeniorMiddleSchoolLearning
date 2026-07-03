#!/usr/bin/env bash
# 一键把"高中全科复习"静态网站部署到本服务器的 /seniormiddleschool/ 子路径。
# 用法（在服务器 root 终端里执行其一）：
#   方式1（已装 git）：  git clone --depth 1 https://github.com/sunryjiang/SeniorMiddleSchoolLearning.git /opt/smsl && bash /opt/smsl/deploy.sh
#   方式2（一行流）：    curl -fsSL https://raw.githubusercontent.com/sunryjiang/SeniorMiddleSchoolLearning/main/deploy.sh | bash
set -e

REPO="https://github.com/sunryjiang/SeniorMiddleSchoolLearning.git"
SRC="/opt/smsl"
SUB="seniormiddleschool"
DOMAIN="www.wangxiaoyanjiazheng.cn"

echo "==================================================="
echo " 部署 高中全科复习 → /$SUB/"
echo "==================================================="

# 0) 需要 root
if [ "$(id -u)" != "0" ]; then echo "请用 root 运行（sudo bash ...）"; exit 1; fi

# 1) 确保 git
if ! command -v git >/dev/null 2>&1; then
  echo "[1/5] 安装 git ..."
  (command -v apt-get >/dev/null && apt-get update -y && apt-get install -y git) \
    || (command -v yum >/dev/null && yum install -y git) \
    || (command -v dnf >/dev/null && dnf install -y git) || true
fi

# 2) 拉取/更新代码
echo "[2/5] 获取代码 ..."
if [ -d "$SRC/.git" ]; then
  git -C "$SRC" fetch --depth 1 origin main && git -C "$SRC" reset --hard origin/main
else
  rm -rf "$SRC"; git clone --depth 1 "$REPO" "$SRC"
fi
WWW="$SRC/www"
if [ ! -f "$WWW/index.html" ]; then echo "错误：未找到 $WWW/index.html"; exit 1; fi

# 3) 探测网站根目录（宝塔/常见 Nginx/Apache 目录 + Nginx 配置里的 root）
echo "[3/5] 探测网站根目录 ..."
CAND=""
for d in /usr/share/nginx/html /var/www/html /www/wwwroot/* /data/wwwroot/* /home/www/* /var/www/*; do
  [ -d "$d" ] && CAND="$CAND $d"
done
if command -v nginx >/dev/null 2>&1; then
  for r in $(grep -rhoE '^[[:space:]]*root[[:space:]]+[^;]+;' /etc/nginx 2>/dev/null | sed -E 's/^[[:space:]]*root[[:space:]]+//; s/;//' | tr -d '"' | sort -u); do
    [ -d "$r" ] && CAND="$CAND $r"
  done
fi

# 若完全没有网页服务器：安装 nginx 并使用其默认根目录
if [ -z "$(echo $CAND | tr -s ' ')" ] || ! (command -v nginx >/dev/null 2>&1 || command -v apache2 >/dev/null 2>&1 || command -v httpd >/dev/null 2>&1); then
  echo "  未发现网页服务器，正在安装 nginx ..."
  (command -v apt-get >/dev/null && apt-get update -y && apt-get install -y nginx) \
    || (command -v yum >/dev/null && yum install -y nginx) \
    || (command -v dnf >/dev/null && dnf install -y nginx) || true
  systemctl enable nginx 2>/dev/null || true
  systemctl start nginx 2>/dev/null || true
  mkdir -p /usr/share/nginx/html
  CAND="$CAND /usr/share/nginx/html /var/www/html"
fi

ROOTS=$(echo $CAND | tr ' ' '\n' | grep -v '^$' | sort -u)
echo "  候选根目录："; echo "$ROOTS" | sed 's/^/    /'

# 4) 把站点复制进每个候选根目录的 /seniormiddleschool（附加式，低风险）
echo "[4/5] 部署站点 ..."
N=0
for d in $ROOTS; do
  mkdir -p "$d/$SUB"
  cp -rf "$WWW/." "$d/$SUB/"
  chmod -R 755 "$d/$SUB" 2>/dev/null || true
  echo "  ✓ 已部署到 $d/$SUB"
  N=$((N+1))
done
if [ "$N" = "0" ]; then echo "错误：未找到任何网站根目录"; exit 1; fi

# 5) 重载网页服务器
echo "[5/5] 重载服务 ..."
if command -v nginx >/dev/null 2>&1; then nginx -t 2>/dev/null && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null) || true; fi

echo "==================================================="
echo " 部署完成！请在浏览器访问："
echo "   http://$DOMAIN/$SUB/"
echo " （若你的站点已配置 HTTPS，则用 https://$DOMAIN/$SUB/）"
echo " 若打不开：多半是该域名的网站根目录不在上面候选里，"
echo " 请把 'nginx -T | grep -E \"server_name|root\"' 的结果发给我。"
echo "==================================================="
