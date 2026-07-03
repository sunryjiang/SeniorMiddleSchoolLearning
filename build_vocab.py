# -*- coding: utf-8 -*-
"""合并 vocab/*.csv（高考3600词）生成 www/data/vocab.json。
CSV 列：序号,单词,词性,音标,中文意思,简易英文例句,主题
"""
import csv, glob, json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
CSV_DIR = os.path.join(BASE, "vocab")
OUT = os.path.join(BASE, "www", "data", "vocab.json")

def strip_ipa(s):
    s = (s or "").strip()
    return s.strip("/").strip()

files = sorted(glob.glob(os.path.join(CSV_DIR, "*.csv")))
seen = set()
units_order = []   # topic order
units = {}         # topic -> list of words
total = 0

for fp in files:
    with open(fp, "r", encoding="utf-8-sig", newline="") as f:
        for raw in f:
            raw = raw.rstrip("\n").rstrip("\r")
            if not raw.strip():
                continue
            cols = raw.split(",")
            if len(cols) < 7:
                continue
            if cols[0].strip() in ("序号", "") or not re.match(r"^\d+$", cols[0].strip()):
                continue  # 跳过表头/异常行
            # 若例句中含英文逗号导致列变多：首4列固定，末列为主题，中间合并给例句/中文
            idx, word, pos, ipa = cols[0], cols[1].strip(), cols[2].strip(), cols[3].strip()
            topic = cols[-1].strip()
            if len(cols) == 7:
                cn, eg = cols[4].strip(), cols[5].strip()
            else:
                cn = cols[4].strip()
                eg = ",".join(cols[5:-1]).strip()
            if not word:
                continue
            key = word.lower()
            if key in seen:
                continue
            seen.add(key)
            topic = topic or "其他"
            if topic not in units:
                units[topic] = []
                units_order.append(topic)
            units[topic].append({
                "word": word,
                "pos": pos,
                "ipa": strip_ipa(ipa),
                "cn": cn,
                "eg": eg,
            })
            total += 1

data = {"units": []}
for i, topic in enumerate(units_order, 1):
    data["units"].append({
        "id": "hs_%02d" % i,
        "title": topic,
        "count": len(units[topic]),
        "words": units[topic],
    })

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print("单元数:", len(data["units"]))
print("总词数:", total)
for u in data["units"]:
    print("  %-24s %d" % (u["title"], u["count"]))
