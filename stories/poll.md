# Story: Polls in the quack feed

**As a** signed-in user
**I want to** ask a question with a few answers to choose from, and see how many people picked each one
**So that** a group can decide something (like where to go for lunch) without anyone counting replies by hand and without the question getting buried under them.

**Why now:** This is an experiment. We're shipping the simplest useful version and measuring whether people use it.

## Acceptance criteria

**Creating a poll**

1. The "post a quack" form has an _Add poll_ switch, off by default. With it off, the form works exactly as before.
2. With it on, the form shows the poll options below the text. The quack text is the question. The mood stays optional.
3. The form starts with 2 option fields. An _Add option_ button adds more, up to **5** options in total. At 5 the button is gone. A remove (×) button on each option removes it, but never below 2.
4. An option can be at most **60 characters**. Leading and trailing spaces are removed.
5. The form can't be submitted if an option is empty or if two options are the same, ignoring letter case. The form says which option is wrong and why.
6. After posting, the quack appears at the top of the feed with the poll under the question, and the form resets with the switch off.

**Voting**

7. Every signed-in user can vote in every poll, including its author.
8. Each poll shows its options as buttons. Clicking an option votes for it.
9. A user has **one vote per poll**. Their chosen option is visually highlighted, and this is still so after a page reload.
10. Clicking a different option moves the vote: the old option loses one vote, the new one gains one, immediately.
11. Clicking the option you already voted for does nothing. There is no way to withdraw a vote.
12. Nobody can edit, close or delete a poll.

**Results**

13. Each option shows its number of votes and its share of all votes in that poll (e.g. _Thai 3 · 50 %_). Percentages are whole numbers. The poll also shows the total (e.g. _6 votes_, _1 vote_).
14. Results are visible to everyone at all times, including before they vote. Who voted for what is not shown.
15. The user's own click updates the numbers and the highlight **immediately**, before the server answers.
16. When another user votes, the numbers change for everyone who has the feed open within about **5 seconds**, without a reload. Two browser windows with different users show the same numbers.
17. Reloading the page shows the same numbers as the other open windows.

**When saving a vote fails**

18. If the vote can't be saved, the numbers and highlight go back to what they were before the click.
19. The poll then shows the message _Your vote wasn't saved._ with a _Try again_ button. Clicking it repeats the vote.
20. The message disappears when the user clicks _Try again_ and it succeeds, when they vote again, or when they reload the page.

**When there's nothing to show**

21. A poll nobody has voted in shows 0 votes for every option, no percentages, and the text _Be the first to vote_.
22. Quacks without a poll look and work exactly as before.

## Out of scope

- Multiple choice (voting for several options)
- Withdrawing a vote
- Editing, closing, deleting a poll or setting an expiry time
- Showing who voted for what
- Adding options to someone else's poll
- Polls in a separate page or as a separate post type
- Searching in poll options (the existing search still looks only at post text and author name)
- Pushing updates to the browser faster than about 5 seconds, or notifications about new votes
- An analytics dashboard or database table for poll usage

## Technical notes (not browser-checked)

- A poll belongs to a quack: one quack has zero or one poll. A poll has 2–5 options. A vote is one row per user and poll, so the database itself guarantees "one person, one vote". Changing a vote updates that row.
- Counts come from the server and are the only source of truth. The optimistic update in the browser is replaced by the server's numbers when they arrive.
- Voting must be atomic: two clicks from the same user at once must not leave two votes or wrong totals.
- The feed refreshes by polling (about every 5 s, with TanStack Query), not by websockets.
- Server validation repeats the form rules (2–5 options, 60 characters, no empty, no duplicates) and rejects votes for an option that isn't in that poll.
- Each poll created and each vote writes one backend log line with the user id and the poll id. Question and option text are not logged. This is how we measure whether people use the feature.
