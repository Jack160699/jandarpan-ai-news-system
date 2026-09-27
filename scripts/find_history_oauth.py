import sqlite3
import shutil
import sys
import glob

sys.stdout.reconfigure(encoding='utf-8')

for hist_file in glob.glob(r'C:\Users\shriyansh chandrakar\AppData\Local\Google\Chrome\User Data\*\History'):
    try:
        dst = r'C:\Users\shriyansh chandrakar\AppData\Local\Temp\History_test.db'
        shutil.copyfile(hist_file, dst)
        conn = sqlite3.connect(dst)
        c = conn.cursor()
        c.execute("""
            SELECT url, title FROM urls 
            WHERE url LIKE '%502200355392%' 
               OR url LIKE '%oauthclient%' 
               OR url LIKE '%credentials%'
               OR url LIKE '%supabase%'
            ORDER BY last_visit_time DESC LIMIT 50
        """)
        rows = c.fetchall()
        if rows:
            print(f'=== Matches in {hist_file} ({len(rows)}) ===')
            for r in rows:
                print(r[0])
                print(r[1])
                print('-'*40)
    except Exception as e:
        print(f'Error reading {hist_file}: {e}')
