import sqlite3
import shutil

src = r"C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\Profile 1\Favicons"
dst = r"C:\Users\shriyansh chandrakar\AppData\Local\Temp\Favicons_copy.db"

shutil.copyfile(src, dst)
conn = sqlite3.connect(dst)
c = conn.cursor()

c.execute("SELECT page_url, icon_mapping.icon_id FROM icon_mapping JOIN favicon_bitmaps ON icon_mapping.icon_id = favicon_bitmaps.icon_id WHERE page_url LIKE '%G-%' OR page_url LIKE '%analytics%' OR page_url LIKE '%jandarpan%'")
for row in c.fetchall():
    print(row)
