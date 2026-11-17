# LeBron James - Why Guy-Style Short

## Production Workflow

### 1. Research (15-20 min)
- Open `RESEARCH.md`
- Find 10 verified facts about LeBron James
- Rank by shock value (mild → shocking)
- Note sources for each fact

### 2. Script (10 min)
- Open `SCRIPT.md`
- Fill in each fact (15-18 words per fact)
- Total word count: 150-180 words
- Target duration: 60-70 seconds

### 3. Voice Recording (10 min)
- Record narration using script
- Clear, conversational tone
- Pace: ~2.5-3 words/second
- Save as `voice.wav` (48kHz, mono)
- Place in: `/root/shorts-studio/app/voice/`

### 4. Images (15 min)
- Download 10 images from Wikimedia Commons
- Crop to 1080x1920 (9:16 vertical)
- Rename: `lebron_james_fact_10.jpg` through `_fact_1.jpg`
- Place in: `/root/shorts-studio/app/public/images/`

### 5. Update Composition (5 min)
- Edit `WhyGuyShort.tsx`
- Replace FACTS array with your 10 facts
- Update image URLs to match your files

### 6. Render (async)
```bash
# Preview
python3 app/scripts/render.py WhyGuyShort --quality=preview

# Final (via GitHub Actions)
python3 app/scripts/render.py WhyGuyShort --quality=final --trigger
```

### 7. Verify
- Check QA stills for image quality
- Verify audio sync
- Confirm duration is 60-70 seconds
- Upload to YouTube Shorts

## Total Production Time: ~1 hour
