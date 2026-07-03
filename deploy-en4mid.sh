#!/usr/bin/env bash
# 一键把"初中英语提升"静态网站部署到本服务器的 /English4MiddleSchool/ 子路径，
# 并自动在 Nginx 里加好静态托管规则（不影响现有站点）。
# 用法：curl -fsSL https://cdn.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy-en4mid.sh | bash
set +e

SUB="English4MiddleSchool"
DOMAIN="www.wangxiaoyanjiazheng.cn"
TARB="/tmp/en4mid.tar.gz"
WWW="/tmp/en4mid-www"
DEST="/var/www/html/$SUB"

URLS=(
  "https://cdn.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/english4middleschool.tar.gz"
  "https://fastly.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/english4middleschool.tar.gz"
  "https://gcore.jsdelivr.net/gh/sunryjiang/SeniorMiddleSchoolLearning@main/deploy/english4middleschool.tar.gz"
  "https://ghproxy.net/https://raw.githubusercontent.com/sunryjiang/SeniorMiddleSchoolLearning/main/deploy/english4middleschool.tar.gz"
)

echo "==================================================="
echo " 部署 初中英语提升 → /$SUB/"
echo "==================================================="
[ "$(id -u)" != "0" ] && { echo "请用 root 运行"; exit 1; }

echo "[1/5] 下载站点包 ..."
rm -f "$TARB"
for u in "${URLS[@]}"; do
  echo "  尝试: $u"
  if curl -fsSL --connect-timeout 15 -o "$TARB" "$u" && [ -s "$TARB" ]; then echo "  ✓ 下载成功"; break; fi
done
[ ! -s "$TARB" ] && { echo "下载失败：所有源都不可用。"; exit 1; }

echo "[2/5] 解包 ..."
rm -rf "$WWW"; mkdir -p "$WWW"; tar xzf "$TARB" -C "$WWW"
[ ! -f "$WWW/index.html" ] && { echo "错误：包内缺少 index.html"; exit 1; }

echo "[3/5] 部署文件到 $DEST ..."
mkdir -p "$DEST"; cp -rf "$WWW/." "$DEST/"; chmod -R 755 "$DEST" 2>/dev/null
# 同步一份到 nginx 默认目录，双保险
mkdir -p "/usr/share/nginx/html/$SUB"; cp -rf "$WWW/." "/usr/share/nginx/html/$SUB/" 2>/dev/null
echo "  ✓ 已复制"

echo "[4/5] 配置 Nginx ..."
# 只改真正启用的配置，排除备份文件(*.bak*)
CONF=$(grep -rls "wangxiaoyanjiazheng" /etc/nginx 2>/dev/null | grep -v '\.bak')
echo "  站点配置文件: $CONF"
for f in $CONF; do
  if grep -q "/$SUB/" "$f"; then echo "  跳过(已配置): $f"; continue; fi
  cp "$f" "$f.bak_en4mid"
  # 注意：不要用变量名 sub（是 awk 内置函数）；用 sp/ds
  if awk -v sp="$SUB" -v ds="$DEST" '/server_name[^;]*wangxiaoyanjiazheng/{print; print "    location = /" sp " { return 301 /" sp "/; }"; print "    location ^~ /" sp "/ { alias " ds "/; index index.html; }"; next} {print}' "$f" > "$f.new" && [ -s "$f.new" ]; then
    mv "$f.new" "$f"; echo "  ✓ 已插入规则: $f"
  else
    rm -f "$f.new"; echo "  ✗ 插入失败，已保留原文件: $f"
  fi
done

echo "[5/5] 测试并重载 Nginx ..."
if nginx -t 2>&1 | grep -q successful; then
  systemctl reload nginx 2>/dev/null || nginx -s reload 2>/dev/null
  echo "  ✓ 重载成功"
else
  echo "  ✗ nginx 配置测试未通过，请把上面 nginx -t 的输出发我"; nginx -t
fi

echo "== 本地自测 =="
curl -sI -H "Host: $DOMAIN" http://127.0.0.1/$SUB/ | head -1
echo "==================================================="
echo " 完成！浏览器访问： https://$DOMAIN/$SUB/"
echo "==================================================="
