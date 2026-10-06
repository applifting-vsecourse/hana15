# Story: Search the quack feed

**As a** signed-in user
**I want to** type a word I remember, or the author's name, and see only the quacks that match
**So that** I can find a post I saw earlier without scrolling the whole feed.

**Why now:** This is an experiment. We're shipping the simplest useful version and measuring whether people use it.

## Acceptance criteria

**Search box**

1. There is a search box at the top of the quacks feed page.
2. Results update while typing. The user doesn't press Enter or a button.
3. Search starts only when the input, with leading and trailing spaces removed, is **at least 2 characters**. Shorter input shows the full feed.
4. A clear (×) button empties the box. Clearing it, or deleting the text by hand, brings back the full feed.
5. The search resets when the page reloads. It is **not** kept in the URL.

**Matching**

6. A quack matches if it contains **every** typed word, in any order. Words are separated by spaces.
7. Each word is matched against the **post text** and the **author's display name**. Words can be split between the two: "critic bread" finds a post by _Bread Critic_ that mentions bread.
8. Matching ignores letter case and allows partial words: "brea" finds "Bread".
9. Matching is literal apart from letter case:
   - "kava" does **not** find "káva"
   - "bred" does **not** find "bread"
   - "ducks" does **not** find "duck"
10. Search covers all quacks, whatever their age.

**Results**

11. Matching quacks show in the normal feed layout, newest first. No relevance ranking and no highlighting.
12. If nothing matches, the page says _No quacks match "‹query›"_.
13. The "post a quack" form is **hidden** while a search is active and comes back when the search is cleared.

## Out of scope

- Searching by @username or by mood
- Typo tolerance, ignoring accents, relevance ranking, highlighting
- Keeping the search in the URL or sharing it as a link
- An analytics dashboard or database table for search usage

## Technical notes (not browser-checked)

- Each search writes one backend log line with the user id, the query length and the number of results. The query text is not logged. This is how we measure whether people use the feature.
- Wait about 300 ms after the last keystroke before searching.
- Filtering happens on the server, by extending the existing feed endpoint (e.g. `GET /api/quacks?q=…`). That's what makes the usage log line possible.
