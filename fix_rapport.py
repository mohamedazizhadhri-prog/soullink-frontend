import re, pathlib

SRC = pathlib.Path("rapport_for_google.html")
DST = pathlib.Path("rapport_for_google_clean.html")

raw = SRC.read_bytes()
try:
    text = raw.decode("utf-8")
except Exception:
    text = raw.decode("latin-1")

# Fix mojibake
try:
    text = text.encode("latin-1").decode("utf-8")
except Exception:
    pass

# Remove old style block
text = re.sub(r"<style[^>]*>.*?</style>", "", text, flags=re.DOTALL)

# Remove === banner p tags
text = re.sub(r"<p>\s*[=]{10,}.*?</p>", "", text, flags=re.DOTALL)

# Remove box-drawing lines (unicode box chars the mojibake fix leaves behind)
text = re.sub(r"[\u2500-\u257f]+", "", text)

# Fix tables: remove :--- separator rows and merge continuation rows
def clean_table(m):
    t = m.group(0)
    rows = re.findall(r"<tr[^>]*>.*?</tr>", t, re.DOTALL)
    good = []
    prev = None
    for row in rows:
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.DOTALL)
        if not cells:
            good.append(row); prev = None; continue
        s = [c.strip() for c in cells]
        if all(re.match(r"^:?-+:?$", x) or x=="" for x in s):
            continue  # skip separator
        if s[0]=="" and prev:
            for i,c in enumerate(s):
                if c and i < len(prev): prev[i] = (prev[i]+" "+c).strip()
            for j in range(len(good)-1,-1,-1):
                if "<td" in good[j]:
                    ms = list(re.finditer(r"<td([^>]*)>(.*?)</td>", good[j], re.DOTALL))
                    rebuilt = ""
                    for k,cm in enumerate(ms):
                        rebuilt += f"<td{cm.group(1)}>{prev[k] if k < len(prev) else cm.group(2)}</td>"
                    good[j] = re.sub(r"(<tr[^>]*>).*?(</tr>)", r"\g<1>"+rebuilt+r"\g<2>", good[j], flags=re.DOTALL)
                    break
            continue
        prev = list(s); good.append(row)
    hd = re.search(r"<thead>.*?</thead>", t, re.DOTALL)
    hd = hd.group(0) if hd else ""
    return f"<table>{hd}<tbody>" + "".join(good) + "</tbody></table>"

text = re.sub(r"<table>.*?</table>", clean_table, text, flags=re.DOTALL)

# Table captions
text = re.sub(r"<p>\s*(Table\s+[\d\.]+\s*[-\u2013\u2014]+\s*[^<]+?)\s*</p>", r'<p class="table-caption">\1</p>', text)
text = re.sub(r'(<p class="table-caption">[^<]+</p>)\s*<hr\s*/?>', r"\1", text, flags=re.DOTALL)

# Remove double hr
text = re.sub(r"(<hr[^>]*>)\s*(<hr[^>]*>)", r"\1", text)

# Priority cell coloring
def clr(m):
    at=m.group(1); v=m.group(2).strip()
    c={"Critical":"prio-critical","High":"prio-high","Medium":"prio-medium","Low":"prio-low"}.get(v,"")
    return f'<td{at} class="{c}">{v}</td>' if c else m.group(0)
text = re.sub(r"<td([^>]*)>\s*(Critical|High|Medium|Low)\s*</td>", clr, text)

# PS notes -> callout
def ps_note(m):
    inner = re.sub(r"<br\s*/?>", " ", m.group(1))
    inner = re.sub(r"\[PS:\s*","",inner); inner = re.sub(r"\]","",inner).strip()
    return f'<div class="ps-note"><strong>Note:</strong> {inner}</div>'
text = re.sub(r"<p>(\[PS:.*?)\s*</p>", ps_note, text, flags=re.DOTALL)

# Fix h2 subsections to h3
def fix_lv(m):
    attrs = m.group(1); inner = m.group(2)
    nm = re.match(r"(\d+(?:\.\d+)+)", re.sub(r"<[^>]+>","",inner).strip())
    if nm and nm.group(1).count(".") >= 2:
        return f"<h3{attrs}>{inner}</h3>"
    return m.group(0)
text = re.sub(r"<h2([^>]*)>(.*?)</h2>", fix_lv, text, flags=re.DOTALL)

# Add heading IDs
seen = {}
def add_id(m):
    lv=m.group(1); inner=m.group(2)
    sl = re.sub(r"<[^>]+>","",inner).strip()
    sl = re.sub(r"[^a-z0-9]+","-",sl.lower()).strip("-")[:55] or f"h{lv}"
    if sl in seen: seen[sl]+=1; sl=f"{sl}-{seen[sl]}"
    else: seen[sl]=0
    return f'<h{lv} id="{sl}">{inner}</h{lv}>'
text = re.sub(r"<(h[123])>(.*?)</h[123]>", add_id, text, flags=re.DOTALL)
# Also add IDs to already-existing h tags without id (from fix_lv step)
text = re.sub(r"<(h[123])(?![^>]*\bid=)(>| [^i][^d][^>]*>)(.*?)</h\1>", add_id, text, flags=re.DOTALL)

# Get body
bm = re.search(r"<body[^>]*>(.*)</body>", text, re.DOTALL)
body = bm.group(1).strip() if bm else text
body = re.sub(r"\n{3,}", "\n\n", body)

# TOC
heads = re.findall(r'<h([123])\s+id="([^"]+)"[^>]*>(.*?)</h\1>', text, re.DOTALL)
toc_li = []
for lv,hid,cont in heads:
    ti = re.sub(r"<[^>]+>","",cont).strip()
    cls = {"1":"toc-chapter","2":"toc-sub","3":"toc-sub2"}.get(lv,"toc-sub")
    toc_li.append(f'<li class="{cls}"><a href="#{hid}">{ti}</a></li>')

CSS = """<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>SoulLink - PFE Technical Report</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto+Mono&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
<style>
:root{--p:#6c63ff;--pd:#4f46c0;--t:#1e1e2e;--b:#e5e7eb;--s:#f9fafb;--w:#fff;--sb:#1e1e2e;--sa:#cba6f7;--sh:rgba(203,166,247,.12);--cg:linear-gradient(135deg,#1e1e2e,#313244);--r:10px;--sw:280px;--f:'Inter',-apple-system,sans-serif;--m:'Roboto Mono',monospace;--d:'Playfair Display',Georgia,serif}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:var(--f);font-size:15px;line-height:1.8;color:var(--t);background:var(--w);display:flex;min-height:100vh}
#toc-sidebar{position:fixed;top:0;left:0;bottom:0;width:var(--sw);background:var(--sb);overflow-y:auto;padding-bottom:40px;z-index:100;box-shadow:4px 0 24px rgba(0,0,0,.25)}
#toc-sidebar::-webkit-scrollbar{width:4px}
#toc-sidebar::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:4px}
.toc-logo{padding:28px 24px 20px;border-bottom:1px solid rgba(255,255,255,.08);margin-bottom:16px}
.toc-logo-title{font-family:var(--d);font-size:1.4rem;color:#cba6f7}
.toc-logo-sub{font-size:.7rem;color:rgba(205,214,244,.4);margin-top:4px;text-transform:uppercase;letter-spacing:.1em}
.toc-section-label{font-size:.64rem;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:rgba(205,214,244,.35);padding:14px 24px 6px}
#toc-sidebar nav ul{list-style:none}
#toc-sidebar nav ul li a{display:block;padding:7px 24px;font-size:.8rem;color:#cdd6f4;text-decoration:none;border-left:2px solid transparent;transition:all .2s;line-height:1.4}
#toc-sidebar nav ul li a:hover,#toc-sidebar nav ul li a.active{background:var(--sh);color:var(--sa);border-left-color:var(--sa)}
.toc-chapter>a{font-weight:600!important;font-size:.84rem!important;color:#cba6f7!important;padding-top:12px!important}
.toc-sub>a{padding-left:36px!important;color:rgba(205,214,244,.75)!important}
.toc-sub2>a{padding-left:48px!important;font-size:.77rem!important;color:rgba(205,214,244,.5)!important}
#main-content{margin-left:var(--sw);flex:1;padding:0 60px 80px;max-width:calc(100% - var(--sw))}
.report-cover{background:var(--cg);color:#fff;padding:80px 60px;margin:0 -60px 60px;text-align:center;position:relative;overflow:hidden}
.report-cover::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 30% 50%,rgba(108,99,255,.3),transparent 60%),radial-gradient(ellipse at 80% 20%,rgba(255,101,132,.2),transparent 50%)}
.report-cover>*{position:relative;z-index:1}
.cover-badge{display:inline-block;background:rgba(108,99,255,.3);border:1px solid rgba(108,99,255,.6);color:#c0b5ff;font-size:.7rem;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:5px 14px;border-radius:20px;margin-bottom:24px}
.report-cover h1{font-family:var(--d);font-size:2.8rem;color:#fff;margin:0 0 12px;line-height:1.2;border:none;text-transform:none;padding:0}
.cover-subtitle{font-size:1.05rem;color:rgba(255,255,255,.65);margin:0}
.cover-meta{display:flex;justify-content:center;gap:36px;flex-wrap:wrap;margin-top:32px}
.cover-meta-item{text-align:center}
.cover-meta-item .label{font-size:.64rem;text-transform:uppercase;letter-spacing:.12em;color:rgba(255,255,255,.4);margin-bottom:4px}
.cover-meta-item .value{font-size:.85rem;color:rgba(255,255,255,.8);font-weight:500}
.chapter-banner{background:var(--cg);color:#fff;padding:48px 56px;margin:60px -60px 48px;position:relative;overflow:hidden}
.chapter-banner::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(108,99,255,.35),transparent 60%)}
.chapter-banner>*{position:relative;z-index:1}
.chapter-banner h1{font-family:var(--d);font-size:2rem;color:#fff;border:none;text-transform:none;padding:0;margin:0;line-height:1.3}
.chapter-banner .chapter-sub{margin-top:10px;font-size:.8rem;color:rgba(255,255,255,.45)}
h1{font-family:var(--d);font-size:1.9rem;color:var(--t);border-bottom:3px solid var(--p);padding-bottom:14px;margin:64px 0 20px;line-height:1.3;text-transform:none}
h2{font-size:1.3rem;font-weight:700;color:#1e1e2e;margin:44px 0 14px;padding-bottom:8px;border-bottom:2px solid var(--b);position:relative}
h2::before{content:'';position:absolute;bottom:-2px;left:0;width:44px;height:2px;background:var(--p)}
h3{font-size:1.08rem;font-weight:600;color:#313244;margin:28px 0 10px}
p{margin-bottom:.95em}
ul,ol{padding-left:1.8em;margin:.6em 0 .95em}
li{margin-bottom:.35em;line-height:1.7}
.steps-list{counter-reset:steps;list-style:none;padding-left:0}
.steps-list li{padding:12px 16px 12px 52px;background:var(--s);border-left:3px solid var(--p);border-radius:0 var(--r) var(--r) 0;margin-bottom:10px;position:relative;counter-increment:steps}
.steps-list li::before{content:counter(steps);position:absolute;left:12px;top:50%;transform:translateY(-50%);background:var(--p);color:#fff;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700}
.table-caption{font-weight:600;font-size:.82rem;color:var(--pd);text-transform:uppercase;letter-spacing:.06em;margin:28px 0 8px;border-left:3px solid var(--p);padding-left:10px}
table{width:100%;border-collapse:collapse;margin:0 0 28px;font-size:.875rem;border-radius:var(--r);overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,.1)}
thead tr{background:linear-gradient(90deg,#1e1e2e,#313244)}
th{padding:12px 16px;font-weight:600;font-size:.78rem;letter-spacing:.05em;text-transform:uppercase;color:#cba6f7;text-align:left}
td{padding:10px 16px;border-bottom:1px solid var(--b);vertical-align:top}
tbody tr:nth-child(even){background:var(--s)}
tbody tr:hover{background:rgba(108,99,255,.04)}
td:first-child{font-weight:500;color:var(--pd)}
pre{background:#282a36;color:#f8f8f2;padding:20px 24px;border-radius:var(--r);overflow-x:auto;font-family:var(--m);font-size:.82rem;line-height:1.65;margin:20px 0}
code{background:rgba(108,99,255,.08);color:var(--pd);padding:2px 7px;border-radius:5px;font-family:var(--m);font-size:.85em;border:1px solid rgba(108,99,255,.15)}
pre code{background:none;color:inherit;padding:0;border:none}
.ps-note{background:linear-gradient(135deg,#fef9c3,#fefce8);border-left:4px solid #eab308;padding:16px 20px;margin:22px 0;border-radius:0 var(--r) var(--r) 0;font-size:.87rem;color:#713f12}
.ps-note strong{color:#92400e}
hr{border:none;border-top:1px solid var(--b);margin:44px 0}
td.prio-critical{color:#dc2626;font-weight:700}
td.prio-high{color:#d97706;font-weight:600}
td.prio-medium{color:#0891b2}
td.prio-low{color:#6b7280}
#scroll-top{position:fixed;bottom:28px;right:28px;background:var(--p);color:#fff;border:none;border-radius:50%;width:44px;height:44px;font-size:1.3rem;cursor:pointer;box-shadow:0 4px 16px rgba(108,99,255,.4);display:none;align-items:center;justify-content:center;z-index:200;transition:all .2s}
#scroll-top:hover{background:var(--pd);transform:translateY(-2px)}
#scroll-top.visible{display:flex}
@media(max-width:900px){
  #toc-sidebar{transform:translateX(-280px);transition:transform .3s;width:280px}
  #toc-sidebar.open{transform:translateX(0)}
  #main-content{margin-left:0;max-width:100%;padding:0 20px 60px}
  .chapter-banner{margin:44px -20px 32px;padding:36px 24px}
  .report-cover{padding:50px 20px;margin:0 -20px 44px}
}
@media print{#toc-sidebar,#scroll-top{display:none}#main-content{margin-left:0;max-width:100%;padding:0}}
</style>"""

SCRIPT = """<script>
document.addEventListener("DOMContentLoaded",function(){
var links=document.querySelectorAll("#toc-sidebar nav a");
var btn=document.getElementById("scroll-top");
window.addEventListener("scroll",function(){
  if(btn)btn.classList.toggle("visible",window.scrollY>400);
  var y=window.scrollY+130,active=null;
  document.querySelectorAll("[id]").forEach(function(el){if(el.offsetTop<=y)active=el;});
  links.forEach(function(l){l.classList.remove("active");});
  if(active){var a=document.querySelector("#toc-sidebar a[href='#"+active.id+"']");if(a)a.classList.add("active");}
});
});
</script>"""

TOC = '<nav id="toc-sidebar"><div class="toc-logo"><div class="toc-logo-title">SoulLink</div><div class="toc-logo-sub">Technical Report</div></div><div class="toc-section-label">Contents</div><nav><ul>' + "\n".join(toc_li) + "</ul></nav></nav>"

COVER = """<div class="report-cover">
<div class="cover-badge">PFE Report &mdash; Academic Year 2025&ndash;2026</div>
<h1>SoulLink</h1>
<p class="cover-subtitle">Web Platform for Authentic Human Connections</p>
<hr style="border-color:rgba(255,255,255,.15);margin:28px 0">
<div class="cover-meta">
<div class="cover-meta-item"><div class="label">Language</div><div class="value">English</div></div>
<div class="cover-meta-item"><div class="label">Methodology</div><div class="value">Agile &mdash; Scrum</div></div>
<div class="cover-meta-item"><div class="label">Modeling</div><div class="value">UML</div></div>
<div class="cover-meta-item"><div class="label">Source</div><div class="value">Verified vs Code &amp; CDC</div></div>
</div></div>"""

out = f"""<!DOCTYPE html>
<html lang="en">
<head>
{CSS}
</head>
<body>
{TOC}
<div id="main-content">
{COVER}
{body}
</div>
<button id="scroll-top" onclick="window.scrollTo({{top:0,behavior:'smooth'}})">&uarr;</button>
{SCRIPT}
</body>
</html>"""

DST.write_text(out, encoding="utf-8")
print("Done:", DST, DST.stat().st_size, "bytes")