import sqlite3
import shutil

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_p1_all.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("SELECT url, title FROM urls WHERE url LIKE '%console.cloud%' OR url LIKE '%console.developers%' OR url LIKE '%supabase.com%' ORDER BY last_visit_time DESC LIMIT 50")
rows = c.fetchall()
print(f"Total matching rows: {len(rows)}")
for r in rows:
    print(r[0], "-->", r[1])
