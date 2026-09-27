import sqlite3
import shutil

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 3\History"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_p3.db"
shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()
c.execute("SELECT url, title FROM urls WHERE url LIKE '%console.cloud%' OR url LIKE '%supabase%' OR url LIKE '%jandarpan%' OR url LIKE '%analytics%' ORDER BY last_visit_time DESC LIMIT 40")
for row in c.fetchall():
    print(f"{row[0][:100]} | {row[1]}")
