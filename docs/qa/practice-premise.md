# Practice Premise: The Clockwork Library (Testing Draft)

Use this 3,000-word practice premise to run end-to-end generation tests. It’s intentionally rich with structure, character arcs, and repeatable constraints so results are comparable across runs.

---

## One-Sentence Hook
A junior archivist discovers a hidden clockwork library that can rewind moments from any book—at a cost—and must decide what she’s willing to erase to stop a city-wide memory collapse.

## Elevator Pitch
In the river-walled city of Dorsen, stories are currency. Elara Ward, a twenty-two-year-old archivist, tracks narrative debts in a bureaucratic labyrinth. When a mysterious ledger and a mechanical key arrive with no sender, Elara unlocks a subterranean library whose shelves rearrange themselves to the tick of unseen gears. Each room can rewind moments from books into living memory—but every rewind steals something from the city above: a street name, a lullaby, an old promise. As erasures accelerate, Elara must collaborate with a cynical watchmaker, a beleaguered city historian, and a chorus of stray children who remember what adults forget.

## Tone, Audience, and Style
- Tone: Hopeful, melancholic, occasionally whimsical
- Audience: General fantasy readers (YA-to-adult crossover)
- Style: Lyrical, vivid sensory detail; short chapters; alternating close-third POV (Elara, Cass, Historian)
- Content Rating: PG-13 (peril, thematic loss, no graphic violence)

## Themes
- Memory vs. record; what a city chooses to remember
- Cost of revision; ethics of restoring vs. rewriting
- Found family; bureaucrats as hidden heroes

## World & Rules
- Dorsen: A city built around clocktowers and canals. Official notices are embossed on copper plates. A fog of brass filings sometimes drifts from the old watch foundry.
- The Clockwork Library (“The Stacks Below”): Mechanical stacks respond to the Librarian’s key; rooms manifest book moments as living vignettes.
- Rules of Rewind:
  1. A rewind “borrows” a continuous scene (max 30 minutes) from any written narrative in the stacks.
  2. The city pays a price in erasure proportional to the narrative weight of what was borrowed (a trivial scene costs a forgotten weather report; a climactic scene costs a shared proverb).
  3. Debt accumulates invisibly until midnight when bells reconcile.
  4. Debts can be settled by donating an original story (told live to the Librarian) of equal or greater weight.

## Major Characters
- Elara Ward (22): Junior archivist, organized, soft-spoken; compulsive list-maker. Motivation: make order out of loss. Flaw: avoids confrontation; believes systems are neutral.
- Cass Fen (27): Watchmaker and black-market parts broker; sarcastic, practical. Motivation: keep the foundry running for the neighborhood kids; distrusts institutions. Flaw: impulsive fixes that ignore long-term costs.
- Dr. Maerlin Roche (58): City historian; meticulous, exhausted, politically cornered. Motivation: preserve Dorsen’s civic identity; protect the archive. Flaw: pride; thinks context can redeem any compromise.
- The Librarian (ageless): Voice embedded in the library’s mechanism; compassionate but bound to the rules. Speaks in aphorisms and chimes.
- The Strays (8-13): A rotating chorus of children who remember erased things; they pass along songs and chalk maps that adults can no longer read.

## Antagonistic Forces
- The Revisionist Circle: An elite committee that wants to weaponize the library—erase dissent, rewrite charters.
- Narrative Debt: The unseen ledger ticking toward midnight; structural pressure rather than a villain with a face.

## Act Structure (12 Chapters; 2–3 pages each)
1. Notices and Keys — Elara receives the anonymous key; a copper notice loses its street name overnight.
2. The Stacks Below — Discovery of the subterranean library; first rewind (minor) restores a shattered ledger page; a nursery rhyme disappears from the market.
3. The Cost — City historian shows the first signs of mass forgetting; Elara hears the Librarian’s rules.
4. Cass at the Foundry — Clocktower falters; Cass introduces practical constraints and skepticism.
5. Ledger of Debts — Midnight bells; list of citywide erasures posted; the Strays hum a tune adults can’t hear.
6. A Civic Bargain — The Circle proposes “authorized rewinds” to fix a bridge collapse; Maerlin argues it’s acceptable.
7. Lives on Loan — Montage of small rewinds to help citizens; cumulative losses become visible (lost recipes, street games).
8. The Breaking Point — A catastrophic rewind to save a ferry erases an entire neighborhood’s festival.
9. Found Story — The Strays lead Elara to a hidden amphitheater; she collects true stories to pay the debt.
10. Reconciliation — The Librarian accepts the donated stories; gears strain; the Circle attempts a hostile takeover.
11. The Choice — Elara can erase the Circle’s charter—or her own apprenticeship oath that binds her to the archive.
12. Bells at Dawn — She sacrifices the oath; remains outside the archive, free to remember and organize memory from the streets.

## Beats and Scene Prompts (per chapter)
- Include a concrete sensory anchor (metal smell, bell toll count, texture of damp ledgers).
- Show a micro-loss after each rewind (forgotten shop sign, misremembered recipe step).
- Surface a choice that costs a sliver of identity.

## Character Arcs
- Elara: From rule-bound clerk to guardian of living memory; learns that systems encode values.
- Cass: From fixer-for-hire to community engineer; learns to build for stewardship, not speed.
- Maerlin: From institutional apologist to witness; chooses truth-telling over job security.

## Constraints for the Generator (for consistent testing)
- Chapter length target: 800–1,100 words.
- POV alternation order: Elara → Cass → Historian → repeat; final chapter in Elara.
- Recurring motifs: bell counts, brass filings in fog, lists!
- Style constraints: short paragraphs, strong verbs, minimize adverbs.
- Safety: avoid gore; keep stakes emotional and civic.

## Sample Opening Paragraph (for calibration)
Dorsen woke to a missing street. The copper plate that named it was still bolted to the brick—blank as fog. Elara Ward traced the bevel with one gloved finger, the imprint of letters she remembered but could no longer read pressing against her skin like a phantom bruise. Behind her, the city’s western clocktower coughed once and held its breath. She added a line to her ledger in tidy script: “Absence, 6th of Rainmonth, cost—unknown.”

## Test Hooks & Observability Notes
- Log an event each time a “micro-loss” appears; include a counter.
- Emit a domain event `realtime:debt-updated` after every rewind; assert it reaches the web client in < 600ms.
- Attach a `correlationId` to each chapter (chapter-001, etc.) and include in logs.

## Acceptance Criteria for Successful Generation
- 12 chapters generated, alternation rule preserved
- At least 10 distinct micro-losses described
- One explicit moral decision in Chapter 12
- Ending reflects sacrifice of apprenticeship oath; hopeful tone

---

Use this premise to stress-test long-running generation, WebSocket updates, and retry behaviour. Keep it consistent across runs so we can compare performance and quality over time.