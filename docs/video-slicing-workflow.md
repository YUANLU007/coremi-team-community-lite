# Lightweight Video Slicing Workflow

This workflow is for turning long field videos, conference footage, and one-hour interviews into short clips that travel better on social platforms.

It is intentionally simple. The first goal is not a perfect documentary. The first goal is to find the strong moments, cut them cleanly, and publish consistently.

## Input

Collect:

- Original video files.
- Auto-transcript from CapCut, Jianying, Kapwing, Descript, Whisper, or another transcription tool.
- A rough description of the event.
- Names and roles of speakers if public.
- Any photos, slides, product shots, or B-roll.
- The intended platform: X, Bilibili, YouTube, Xiaohongshu, TikTok, Shorts, Reels, or WeChat Channels.

## Output

For each long video, aim for:

- 3 to 8 short clips.
- 1 headline per clip.
- 1 hook line.
- 1 caption.
- 1 fact-check note.
- 1 suggested cover title.

## Step 1: Transcript Map

Split the transcript into chunks.

For each chunk, record:

- Timestamp.
- Speaker.
- Topic.
- Strong quote.
- Visual quality.
- Audio quality.
- Whether it is safe to publish.

## Step 2: Find The Moment

Good clips usually contain one of these:

- A counterintuitive claim.
- A concrete number.
- A disagreement.
- A confession of uncertainty.
- A surprising field observation.
- A practical lesson.
- A useful framework.
- A funny or human moment.

Discard clips that are only polite, generic, or context-heavy.

## Step 3: Choose Clip Type

Use one of these formats:

### Insight Clip

Length: 30 to 90 seconds.

Structure:

1. Hook.
2. Context.
3. Key sentence.
4. Why it matters.

### Debate Clip

Length: 45 to 120 seconds.

Structure:

1. Tension.
2. Speaker position.
3. Counterpoint.
4. What remains unresolved.

### Field Note Clip

Length: 30 to 75 seconds.

Structure:

1. What I saw.
2. What surprised me.
3. What it may mean.

### Story Clip

Length: 60 to 180 seconds.

Structure:

1. Scene.
2. Character.
3. Conflict.
4. Turning point.
5. Takeaway.

## Step 4: Rewrite The Hook

A weak hook says:

> I went to a robotics conference today.

A stronger hook says:

> The most interesting thing I saw at the robotics conference was not the robot. It was the supply chain behind it.

Hook rules:

- Start with tension.
- Avoid abstract nouns.
- Use one clear claim.
- Do not overpromise.
- Do not create a claim the clip cannot support.

## Step 5: Add Visual Rhythm

For a simple cut:

- Speaker video for the strongest sentence.
- B-roll for context.
- Screenshot or photo for the entity being discussed.
- Text overlay for the key number or concept.
- Return to speaker for conclusion.

Suggested rhythm:

- 0-3 seconds: title card or direct quote.
- 3-20 seconds: speaker or scene.
- 20-45 seconds: B-roll and supporting visuals.
- Final 5 seconds: takeaway and follow CTA.

## Step 6: Caption And Fact Check

Before publishing:

- Check names.
- Check company names.
- Check numbers.
- Check dates.
- Remove private conversations.
- Remove non-consenting faces if needed.
- Mark opinions as opinions.
- Mark unverified claims as unverified.

## Prompt For Clip Selection

```text
You are a video editor for a research-driven technology media brand.

Input transcript:
{{TRANSCRIPT}}

Event context:
{{CONTEXT}}

Find 5 short-video candidates.

For each candidate, return:
- Clip title
- Start timestamp
- End timestamp
- Why it may travel
- Hook line
- Platform caption
- Visual notes
- Fact-check notes

Prefer counterintuitive, concrete, human, and research-relevant moments. Avoid generic introductions.
```

## Prompt For Rewriting Captions

```text
Rewrite the following clip into 5 caption options.

Clip summary:
{{SUMMARY}}

Audience:
{{AUDIENCE}}

Style:
Clear, sharp, research-driven, not clickbait.

Return:
1. X caption
2. Bilibili title
3. Xiaohongshu title
4. YouTube Shorts title
5. WeChat Channels caption
```

## Practical First Version

For now, a simple stack is enough:

1. Use a transcript tool to get text and timestamps.
2. Use this workflow to pick moments.
3. Cut in Jianying or CapCut.
4. Publish 3 clips per long conversation.
5. Track which hook gets comments, saves, and follows.

Automation can come later. The first advantage is editorial taste.
