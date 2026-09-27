import sqlite3
import shutil
import datetime

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_p1_allgcp.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("""
    SELECT url, title, last_visit_time 
    FROM urls 
    WHERE url LIKE '%console.cloud.google.com%' OR url LIKE '%supabase.com/dashboard%'
    ORDER BY last_visit_time DESC
""")
for r in c.fetchall()[:50]:
    t = r[2]
    dt = datetime.datetime(1601, 1, 1) + datetime.timedelta(microseconds=t)
    try:
        print(f"{dt} | {r[0]} | {r[1]}")
    except Exception:
        print(f"{dt} | {r[0]}")
