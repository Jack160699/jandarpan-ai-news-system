import sqlite3
import shutil

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_branding.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("SELECT url, title, last_visit_time FROM urls WHERE url LIKE '%branding%' OR url LIKE '%consent%' OR url LIKE '%auth%' ORDER BY last_visit_time DESC LIMIT 30")
for r in c.fetchall():
    print(r[0], "-->", r[1])
