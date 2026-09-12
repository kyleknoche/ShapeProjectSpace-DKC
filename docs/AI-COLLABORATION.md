# Scaffolding for machine collaborators

An engineering note, not a manifesto.

---

## The proposition

> AI-assisted coding is not inherently easy merely because code generation is
> fast. The principal difficulty is preserving intention and architecture across
> probabilistic implementation decisions and independent sessions.

This is worth stating carefully, because the usual framing is about correctness,
and correctness is not the hard part. A capable model writes a correct control.
It writes fifteen correct controls. The problem appears later, and it is a
problem of *consistency under independence*.

## What actually goes wrong

Four failure modes, all observed rather than imagined.

**Drift between sessions.** A session that has no memory of the previous one
re-derives the architecture from whatever the repository states plainly. Whatever
was implicit gets re-decided, usually differently, usually in a way that is
locally reasonable. Two reasonable decisions about the same thing are an
inconsistency.

**Reinterpreted abstractions.** An abstraction named but not demonstrated will be
reinterpreted. Given a class called `AbstractElement` and no examples, one session
reads it as a base for widgets, another as a place for shared utilities, and by
the third session it is a junk drawer with a noble name.

**Accumulated assumptions.** Generic code acquires application knowledge one
convenience at a time. Never as a decision — as a default value, then a special
case, then a hardcoded label. No individual step is worth objecting to, and the
end state is a generic library that only works in one application.

**Expedient bypass.** Application code skips the generic layer because doing the
thing directly is shorter than doing it properly. The architecture is not
violated so much as ignored, which is harder to see in a diff.

The common factor: **none of these produce a failure**. Nothing breaks. The tests
still pass, because the tests were about behaviour. The documentation still
describes the original design, because documentation is not executable. The decay
is invisible until somebody tries to make a change that the architecture was
supposed to make easy, and finds that it no longer is.

## The response: make the structure carry the intent

A comment asking for discipline is a comment. The approach here is to arrange the
repository so that the intended move is the cheapest move and the unintended move
fails a command.

Nine mechanisms, in roughly increasing strength.

### 1. Generational boundaries

`src/gen1`, `src/gen2`, `src/gen3`. A file's folder is its permission set, and
the permissions are short enough to hold in mind: Gen 1 imports the platform,
Gen 2 imports Gen 1 and its own support folder, Gen 3 imports Gen 2.

This matters more for a machine than for a person. A model deciding where to put
a new module is making a classification decision, and classification is something
it does well when the categories are crisp. "Does this know about the
application?" is crisp. "Is this the right level of abstraction?" is not.

### 2. Naming that carries the layer

`tg-` is generic, `shape-` is the application. A class named `ShapeProjectTree`
is self-evidently not a generic control. The file name equals the class name, so
the tree view is findable without a search.

Naming is weak on its own and strong in combination: once every file follows it,
a file that does not is visible at a glance, including to a model scanning a
directory listing.

### 3. Source layout as an instruction

Fifteen controls, written the same way: the same lifecycle hooks in the same
order, the same property-setter shape, the same comment block, the same handler
naming. This is the single most effective mechanism in the repository, and it is
the one that requires no enforcement at all.

Asked to add a control, the cheapest correct action is to copy the file next door.
A model is exceptionally good at pattern continuation. That tendency is usually
discussed as a weakness; here it is load-bearing. **Fifteen consistent examples
instruct more reliably than any paragraph, because they are the thing being
imitated rather than a description of it.**

The corollary is uncomfortable and worth stating: it also means that one
inconsistent file is a strong instruction in the wrong direction. Consistency is
not tidiness here, it is the interface to the collaborator.

### 4. Coding standards that are absolute

`CODING-STANDARDS.md` is short, and its rules are not preferences. "No
`innerHTML`" admits no judgement call. A rule with an exception invites the
question "is this an exception?", which is exactly the question a session with no
context is worst at answering.

### 5. Automated architecture checks

`tools/check-architecture.mjs` fails on a crossed generational boundary, an
inverted dependency, generated markup, an anonymous listener, a global
assignment, a misnamed class or tag, application vocabulary below Gen 3, an
unresolved import, a missing barrel entry, a page referencing a file that does
not exist, or an application selector in the generic stylesheet.

This is the difference between a documented boundary and a real one. A documented
boundary is crossed and discovered in review, if there is a review. A checked
boundary is crossed and discovered in seconds, by the agent that crossed it,
while it still has the context to fix it.

The checks also have a second job: **they are the argument to the model.** An
agent that runs `npm run check`, reads
`"A Gen-2 control may not import another Gen-2 control"` and a file and line
number, does not need to have understood the pattern in advance. It needs to have
run the command.

Which is why `AGENTS.md` says, plainly, not to weaken a check in the same change
as the code that fails it. That is the one move that turns the whole apparatus
into decoration, and it is exactly the move that an agent optimising for "make
the command pass" would otherwise find attractive.

### 6. Tests of the pattern, not only the behaviour

Ordinary tests would not catch any of the four failure modes. These do:

- an element that does not implement the abstract action cannot be constructed;
- every Gen-2 control extends the foundation *directly*;
- every Gen-3 element extends a Gen-2 control, exactly two steps down;
- a whole working screen builds in a process where no application class exists;
- owned DOM references survive updates, reorders and reconnection;
- managed listeners return to zero on disconnect and rebind on reconnect;
- every Gen-3 hook override calls its `super`;
- the application layer stays smaller than the generic layer it binds.

That last one is a blunt instrument and deliberately so. It is a tripwire for
"Gen 3 has started re-implementing Gen 2", which is a thing you cannot test for
directly but can notice in aggregate.

### 7. Worked examples at both extremes

`Label` is the smallest complete control; `ListBox` and `DataGrid` are the
fullest. Between them they demonstrate every technique the library uses. A
session that reads both has seen the whole vocabulary.

### 8. Decision records

`docs/DECISIONS.md` records *why*. This is the mechanism for the case that checks
cannot cover: a later session looking at something that appears wrong.

`TreeListView` not extending `TreeView` looks like an oversight. A session that
"fixes" it has destroyed a deliberate property of the architecture and will have
believed it was tidying up. With decision 1 in front of it, the same session is
arguing with a reason instead of with an absence — and if the reason is bad, it
can say so and change it, which is a different and much better outcome than
silently reversing it.

### 9. Handoff state

`docs/HANDOFF.md` is the current operational state in one page: what changed,
what is in flight, what to be careful of. `AGENTS.md` names it as the first thing
to read.

Its discipline is that it must stay short. A handoff document that tries to be
complete becomes a document nobody trusts, and an untrusted document is worse
than none because it still costs context to read.

## What this does not solve

Being honest about the limits, because a note that claims too much is another
form of drift.

**Checks catch the mechanical, not the meaningful.** Nothing here detects a
control with a coherent API and incoherent semantics. `tools/check-architecture.mjs`
verifies that a Gen-2 file does not import Gen 3; it cannot verify that the file
contains a well-designed control. The judgement that produces good abstractions
is not being automated. It is only being *protected* once exercised.

**A rule can be wrong.** Decision 15 in the record is exactly that case: the
vocabulary check flagged the foundation's own comment because the rule was
over-broad. The repository's answer is procedural — change the rule alone, record
why — which depends on a collaborator following procedure. Nothing enforces the
enforcement.

**Consistency can preserve a bad idea.** The same mechanism that stops the
architecture decaying would also propagate a mistake through fifteen files. If
the base contract is wrong, everything built on it inherits the wrongness with
great regularity. Scaffolding preserves intention; it does not evaluate it.

**Line counts are proxies.** "Gen 3 stays under 60% of Gen 2" is a heuristic, not
a property. It will produce a false alarm eventually, and somebody will have to
use judgement about whether to raise the threshold or fix the code. That is fine,
as long as they record which.

## The claim, stated precisely

Not that a model will understand the intent. Not that the architecture cannot be
damaged.

Only this: **a session with no memory of any previous session should find the
architecturally correct change easier to make than the incorrect one, and should
find out within seconds when it gets one wrong.**

Everything in this repository that looks like overhead — the barrels, the
duplicated inventory, the checks that verify the documentation, the tests that
assert inheritance distance — exists to make that one sentence true.
