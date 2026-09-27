import sqlite3
import shutil
import glob
import sys

sys.stdout.reconfigure(encoding='utf-8')

for hist_file in glob.glob(r'C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\*\History'):
    try:
        dst = r'C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_search.db'
        shutil.copyfile(hist_file, dst)
        conn = sqlite3.connect(dst)
        c = conn.cursor()
        c.execute("""
            SELECT url, title, datetime(last_visit_time/1000000-11644473600, 'unixepoch', 'localtime') 
            FROM urls 
            WHERE url LIKE '%console.cloud.google.com%' 
               OR url LIKE '%console.developers.google.com%'
               OR url LIKE '%jan-daarpan%'
               OR url LIKE '%jandarpan%'
            ORDER BY last_visit_time DESC LIMIT 60
        """)
        rows = c.fetchall()
        if rows:
            print(f'=== Matches in {hist_file} ({len(rows)}) ===')
            for r in rows:
                print(f'{r[2]} | {r[0]} | {r[1]}')
        conn.close()
    except Exception as e:
        print('Error:', e)
