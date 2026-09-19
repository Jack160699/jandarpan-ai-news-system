import sys
content = open('src/lib/newsroom/generated/read.ts').read()
content = content.replace(
    '\"id,event_id,slug,headline,summary,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,created_at\";',
    '\"id,event_id,slug,headline,summary,hero_image_url,seo_title,seo_description,reading_time,language,tags,published_at,editorial_status,workflow_status,homepage_pin,pinned_at,editorial_metadata,geo_metadata,created_at\";'
)
open('src/lib/newsroom/generated/read.ts', 'w').write(content)
