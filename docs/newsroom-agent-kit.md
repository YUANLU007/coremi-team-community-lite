# Coremi Newsroom Agent Kit

Coremi Newsroom Agent Kit is a public, lightweight pattern for running an AI-assisted newsroom discussion. It is designed for journalists, analysts, researchers, and independent creators who want multiple AI agents to challenge each other before a story is written.

The goal is simple:

> Break the information cocoon. Find the counterintuitive truth.

This public kit is intentionally generic. It does not include Coremi's private institutional research prompts, paid workflows, source lists, client material, trading models, or internal editorial SOP.

## When To Use It

Use this workflow when you have a question, a pile of notes, field material, documents, or links, and you want a structured path from raw information to a defensible draft.

Good inputs:

- Field notes from conferences, interviews, demos, or briefings.
- News links, public filings, company pages, transcripts, PDFs, screenshots, and photos.
- A rough hypothesis that needs to be challenged.
- A long conversation that needs to be turned into publishable insight.

Avoid:

- Confidential sources that have not consented to AI processing.
- Regulated personal data.
- Material whose platform or copyright terms do not allow reuse.
- Claims that cannot be checked against primary or reputable secondary sources.

## The Public 9-Step Workflow

### 1. Soul

Clarify the user's real question.

Output:

- What is the user really asking?
- Why does this matter now?
- What would make the answer surprising?
- What evidence would change our mind?

### 2. News Fetcher

Collect relevant public material.

Output:

- Source list.
- Source tier.
- Timestamp.
- One-line relevance note.
- Missing source warnings.

Suggested source tiers:

- Tier 1: official filings, company announcements, regulators, courts, public datasets.
- Tier 2: reputable news organizations, trade media, expert interviews.
- Tier 3: newsletters, podcasts, conference material, analyst notes.
- Tier 4: social media and forum discussion.
- Tier 5: unattributed screenshots, anonymous claims, AI-generated summaries.

### 3. Pitch

Turn the material into possible story angles.

Output:

- Three to five candidate angles.
- Why each angle matters.
- What evidence supports it.
- What evidence is still weak.
- Which angle has the highest editorial value.

### 4. Financial Analyst

If the story touches companies, markets, business models, or funding, build a basic business and financial read.

Output:

- Key companies and entities.
- Revenue, cost, margin, valuation, or funding clues where available.
- What the numbers prove.
- What the numbers do not prove.

For non-financial stories, this step can become a "structure analyst" step: incentives, constraints, and business model.

### 5. Competitor Monitor

Map the competitive field.

Output:

- Who else is in the same race?
- What each player wants.
- What each player has.
- What the market narrative gets wrong.
- Where the overlooked player or hidden bottleneck may be.

### 6. Beneficial Related

Trace who benefits if the thesis is true.

Output:

- Direct beneficiaries.
- Indirect beneficiaries.
- Suppliers, channels, infrastructure, and second-order winners.
- Parties that may lose or be exposed.

### 7. PSC Engine

PSC means primary source check, public source check, and cross-source check.

Output:

- Claim table.
- Evidence for each claim.
- Evidence against each claim.
- Confidence level.
- What cannot be verified yet.

Rule of thumb:

- If a claim comes from Tier 1 or a highly reputable Tier 2 source, summarize the evidence and cite it.
- If a claim comes from social media, forums, or hearsay, require at least one independent corroborating source before treating it as fact.

### 8. Writer

Write the draft.

Output:

- Lead.
- Nut graph.
- Evidence body.
- Counterargument.
- What remains uncertain.
- Disclosure and caveats where needed.

The writer should not hide uncertainty. A useful draft tells the reader what is known, what is likely, and what remains unproven.

### 9. Editor

Run a final editorial review.

Output:

- Factual risk.
- Legal or attribution risk.
- Unsupported claims.
- Overstated language.
- Missing context.
- Final publication recommendation.

## Artifact Contract

Each run should produce readable Markdown files:

- `00_index.md`
- `01_soul.md`
- `02_fetcher.md`
- `03_pitch.md`
- `04_financial_analyst.md`
- `05_competitor_monitor.md`
- `06_beneficial_related.md`
- `07_psc.md`
- `08_writer.md`
- `09_editor.md`

The public version does not require a server, database, or proprietary orchestration layer. You can run the workflow manually with Coremi Team Community Lite by assigning one AI member to each role, or by asking several models to debate the same step.

## Suggested Coremi Team Setup

Create a room called `Newsroom`.

Suggested people:

- `Soul`: question clarifier.
- `Fetcher`: public source collector.
- `Pitch`: angle challenger.
- `Analyst`: business and incentive analyst.
- `Competitor`: market map builder.
- `Beneficiary`: second-order effects analyst.
- `PSC`: verification editor.
- `Writer`: draft writer.
- `Editor`: final review.

You can assign different AI services to different roles. For example, use one model for breadth, one for skeptical checking, and one for prose.

## Prompt Seed

Use this as a starting point:

```text
You are part of a public Coremi-style newsroom agent workflow.

User question:
{{QUESTION}}

Available material:
{{MATERIAL}}

Your role:
{{ROLE_NAME}}

Work only on your role. Separate facts from inference. If a claim is unverified, mark it clearly. Prefer primary sources and reputable sources. Do not invent quotes, numbers, links, or citations.

Return Markdown with:
1. Key findings
2. Evidence
3. Uncertainties
4. Recommended next step
```

## Safety Notes

- Do not present AI output as verified reporting until it has been checked.
- Do not publish private names, phone numbers, account numbers, addresses, or confidential documents.
- Do not let speed replace attribution.
- Keep screenshots, videos, and quotes within copyright and platform rules.
- When using AI websites, users are responsible for following each service's terms.

## How To Contribute

Useful contributions include:

- New public role templates.
- Better verification checklists.
- Source-tier taxonomies for different beats.
- Examples of transparent uncertainty language.
- Export formats for Markdown, Substack drafts, or newsroom handoff notes.

Please keep contributions generic and public-safe. Do not submit private sources, client material, internal Coremi research prompts, trading templates, or sensitive data.
