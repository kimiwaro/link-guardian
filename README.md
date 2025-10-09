
# Link Guardian 🔒
A simple tool to help you (and your family) check if a link is real or fake.  
Paste a link, get a quick verdict, and share the result back to WhatsApp.  
Built because too many scam links are floating around in our chats.

## What it does
- Paste any link into the box  
- Runs a few quick checks (domain age, weird patterns, reputation)  
- Shows a verdict: ✅ Likely Genuine / ⚠️ Likely Fake / ❓ Unverified  
- Explains *why* in plain language (no jargon)  
- Lets you copy a short WhatsApp‑friendly summary to warn others  

## Why I built this
I wanted something **simple, free, and easy to use**, especially for parents and relatives who aren’t techy.  
If it helps even one person avoid a scam, it’s worth it.

## Tech
- HTML, CSS, JavaScript (for the MVP)  
- Hosted free on Netlify/Vercel  
- Future: WHOIS API, Google Safe Browsing, VirusTotal  

## Roadmap
- [x] Basic input + output  
- [x] Simple pattern checks (e.g. suspicious words, odd domains)  
- [ ] Domain age check via WHOIS  
- [ ] Reputation check via Safe Browsing  
- [ ] WhatsApp share button  
- [ ] Bilingual support (EN/BM)  

## Example
Input:  
```
https://maybank-login-secure.xyz
```

Output:  
- ⚠️ Likely Fake  
- Domain registered only 14 days ago  
- Doesn’t match official Maybank domain  
- Uses urgent/scare wording  

WhatsApp summary:  
```
I checked this link: maybank-login-secure.xyz
Verdict: ⚠️ Likely Fake
Reason: New domain, suspicious name, urgent wording.
Better not click/share until confirmed.


