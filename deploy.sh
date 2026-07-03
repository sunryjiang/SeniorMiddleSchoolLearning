#!/usr/bin/env bash
# 一键把"高中全科复习"静态网站部署到本服务器的 /seniormiddleschool/ 子路径。
# 站点包通过国内可达的 CDN（jsDelivr）下载，无需服务器直连 GitHub。
# 用法（服务器 root 终端执行）：
#   curl -fsSL https://cdn.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy.sh | bash
set -e

SUB="seniormiddleschool"
DOMAIN="www.wangxiaoyanjiazheng.cn"
TARB="/tmp/smsl.tar.gz"
WWW="/tmp/smsl-www"

# 站点包的多个下载源（国内优先）
URLS=(
  "https://cdn.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/seniormiddleschool.tar.gz"
  "https://fastly.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/seniormiddleschool.tar.gz"
  "https://gcore.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/seniormiddleschool.tar.gz"
  "https://ghproxy.net/https://raw.githubusercontent.com/sunryjiang/SeniorMiddleSchoolLearning/main/deploy/seniormiddleschool.tar.gz"
  "https://raw.githubusercontent.com/sunryjiang/SeniorMiddleSchoolLearning/main/deploy/seniormiddleschool.tar.gz"
)

echo "==================================================="
echo " 部署 高中全科复习 → /$SUB/"
echo "==================================================="
if [ "$(id -u)" != "0" ]; then echo "请用 root 运行"; exit 1; fi

echo "[1/4] 下载站点包 ..."
rm -f "$TARB"
for u in "${URLS[@]}"; do
  echo "  尝试: $u"
  if curl -fsSL --connect-timeout 15 -o "$TARB" "$u" && [ -s "$TARB" ]; then
    echo "  ✓ 下载成功"; break
  fi
done
if [ ! -s "$TARB" ]; then echo "下载失败：所有源都不可用。请把此信息发我。"; exit 1; fi

echo "[2/4] 解包 ..."
rm -rf "$WWW"; mkdir -p "$WWW"; tar xzf "$TARB" -C "$WWW"
if [ ! -f "$WWW/index.html" ]; then echo "错误：包内缺少 index.html"; exit 1; fi

echo "[3/4] 探测网站根目录 ..."
CAND=""
for d in /usr/share/nginx/html /var/www/html /www/wwwroot/* /data/wwwroot/* /home/www/* /var/www/*; do
  [ -d "$d" ] && CAND="$CAND $d"
done
if command -v nginx >/dev/null 2>&1; then
  for r in $(grep -rhoE '^[[:space:]]*root[[:space:]]+[^;]+;' /etc/nginx 2>/dev/null | sed -E 's/^[[:space:]]*root[[:space:]]+//; s/;//' | tr -d '"' | sort -u); do
    [ -d "$r" ] && CAND="$CAND $r"
  done
fi
if ! (command -v nginx >/dev/null 2>&1 || command -v apache2 >/dev/null 2>&1 || command -v httpd >/dev/null 2>&1); then
  echo "  未发现网页服务器，安装 nginx ..."
  (command -v apt-get >/dev/null && apt-get update -y && apt-get install -y nginx) \
    || (command -v yum >/dev/null && yum install -y nginx) \
    || (command -v dnf >/dev/null && dnf install -y nginx) || true
  systemctl enable nginx 2>/dev/null || true; systemctl start nginx 2>/dev/null || true
  mkdir -p /usr/share/nginx/html /var/www/html
  CAND="$CAND /usr/share/nginx/html /var/www/html"
fi
ROOTS=$(echo $CAND | tr ' ' '\n' | grep -v '^$' | sort -u)
echo "  候选根目录："; echo "$ROOTS" | sed 's/^/    /'

echo "[4/4] 部署站点到各候选根目录的 /$SUB ..."
N=0
for d in $ROOTS; do
  mkdir -p "$d/$SUB"
  cp -rf "$WWW/." "$d/$SUB/"
  chmod -R 755 "$d/$SUB" 2>/dev/null || true
  echo "  ✓ $d/$SUB"
  N=$((N+1))
done
[ "$N" = "0" ] && { echo "错误：未找到网站根目录"; exit 1; }
command -v nginx >/dev/null 2>&1 && { nginx -t 2>/dev/null && (systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null) || true; }

echo "==================================================="
echo " 部署完成！浏览器访问："
echo "   http://$DOMAIN/$SUB/"
echo " 打不开的话，把下面命令的输出发我："
echo "   nginx -T 2>/dev/null | grep -E \"server_name|root\""
echo "==================================================="
