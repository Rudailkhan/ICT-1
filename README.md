# ICT Trade Journal

## Deploy karne ke steps:

### Step 1 — GitHub pe upload karo
1. github.com pe jao, account banao
2. "New Repository" click karo
3. Name: `ict-journal` rakho
4. Public select karo
5. Create Repository click karo
6. "uploading an existing file" link click karo
7. Is folder ke saare files drag & drop karo (src folder, public folder, package.json, netlify.toml)
8. Commit changes click karo

### Step 2 — Netlify se deploy karo
1. netlify.com pe jao, free account banao
2. "Add new site" → "Import an existing project" click karo
3. GitHub select karo
4. Apna `ict-journal` repo select karo
5. Build command: `npm run build`
6. Publish directory: `build`
7. Deploy site click karo
8. 2-3 minute mein tera app live ho jayega!

### Baad mein
- Netlify ek URL dega jese: `https://ict-journal-xyz.netlify.app`
- Yeh URL bookmark karo mobile pe
- Data browser localStorage mein save hoga permanently
