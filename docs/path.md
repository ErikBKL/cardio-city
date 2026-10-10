# The implementation path

Cardio City is built as tracer bullets. One bullet is one path from something the athlete does to something they can see. Inside a bullet, write one failing test at a public seam, make it pass, and repeat. When the path is wired, one integration test exercises it, then the app is used once before the next bullet starts.

The ADRs in [docs/adr/](adr/) are the rules. This file is only the order. A bullet does not reopen a decision. The next plan is written from the next bullet below: what it proves, what it leaves, and which seams to test. Work from a later bullet does not come forward.

**Standing:** done through The city survives a restart. Next is The athlete's choices.

## Done

### 1. Fetch and place

A Garmin account is fetched and each activity is placed.

`DataFetcher.fetchActivities` returns an `Activity` in our sports. Garmin's field names and `typeKey`s stay in [server/src/garmin/](../server/src/garmin/). [`place`](../server/src/place.ts) returns a district place, unplaced, or a race. The report counts them. A live fetch is the integration, and it runs when credentials are present.

Left for later: size, HTTP, the scene, one activity's detail, storage.

### 2. Size and draw

Opening the app shows the last six weeks as six boxes.

[`sizeCity`](../server/src/size-city.ts) owns the window and the formula. The window is the 42 local dates ending on `until`. Six sessions is once a week and size `1`. Each session adds `1/6`. Zero sessions is the remnant, `1/12`. Pool, Open water, Indoor, Road, Run, and Strength are always returned. A race or an unplaced sport adds nothing. Sub-districts are sized apart.

`GET /city` takes a `DataFetcher` and a local date and returns those sizes. The client does not import the size module. [client/](../client/) draws one box per place at that scale, and the athlete can orbit and zoom. The dev server uses the live fetcher. Tests use a fixture. The integration boots that fixture, requests `/city`, and checks the scene scales against the JSON.

The season's places are in this bullet. A quiet place is a remnant box, not a missing one.

Left for later: a click, the district record, zones, Postgres, and a sign-in that is the account. The dev server still uses the Garmin token on this machine.

### 3. Open a district

Clicking a box plays the bump and opens that district's record.

`GET /city` carries each place's sessions from the six-week window: name, local start, duration, and distance, newest first. A gravel ride, a race, and a session from the day before the window are absent. [`chooseRecord`](../client/src/record.ts) lists Run or Strength whole. Pool, Open water, Indoor, or Road open Swim or Bike filtered to that sub-district. Choosing the district title clears the filter. The client does not import the size module. A hit on a box selects that place; a drag does not. The bump starts larger and returns to the payload size.

The integration boots a fixture, requests `/city`, chooses Run, and reads that list.

Leaves the record shelf. The ten most recent sessions in each district arrive with the cache.

### 4. One activity's zone

Clicking a session reads the time in each heart-rate zone.

The zone we keep is the one with the most time. A tie goes to the higher zone. All zeroes is no zone. Garmin's field names stay in the adapter. Power zones stay out. The client does not import the zone rule.

### 5. District stats

Clicking a box opens the record for that district's whole Garmin history.

The header is the session count, the total time, the average session duration, and the share of sessions in the zone with the most time. Sessions with no zone data stay in the count and the total time, and stay out of the share. A session older than six weeks counts in the header and stays off the skyline. Size does not change.

Leaves the athlete's own choices: goals, countdowns, record edits, and competition marks.

### 6. The city survives a restart

Postgres keeps the athlete, the session cache, the counters, and the counted Garmin ids.

The cache holds the mapped sessions in the six-week window and the ten most recent sessions in each district. Unplaced sports are not stored. Opening the app syncs, and a second open does not count an id twice. A session older than six weeks can be counted and stays off the skyline. A refresh of one district rebuilds that district's counters and leaves the others. The athlete is still the one Garmin connection on the server. There is no sign-in screen.

## Next

### 7. The athlete's choices

The athlete can keep what Garmin does not store in the form they set.

A goal has a name, a local date, and the districts it uses. Each goal has a countdown on the city, and the athlete can hide it. Hiding the countdown leaves the goal in place. The record shelf starts from Garmin when Garmin has a record, and the athlete can change one or add one. A sync does not overwrite an edit. The athlete can mark a session as a competition. A session on a goal's date in a district that goal uses is a competition without a separate mark. A strength session on a half-ironman day stays ordinary.

Seam: storing a goal, a hidden countdown, a record edit, and a competition mark, then reading them back after a sync. It misses pixels.

Integration: a half-ironman goal marks that day's swim, bike, and run, leaves strength ordinary, and shows the countdown.

### 8. Trust the edges

The rules that are easy to get wrong, each as its own test on the seam that owns it.

- A session on the first and last local date of the six weeks counts, and the day before does not. Size already covers this; the sync must use that same window.
- A refresh rebuilds one district's counters from Garmin and leaves the other districts alone.
- A sync that changes a session's duration keeps the athlete's competition mark and record edit.
- A multisport file stays on the goal and does not add a hit. Its legs place on their own.

Integration: the half-ironman week runs through sync and refresh.

## Not a bullet

These stay as the ADRs left them. A plan does not pick them up unless an ADR changes.

- The shared city.
- A second source, or replacing the Connect sign-in with Garmin's Activity API. Both use the `DataFetcher` seam.
- The phone shell around the web app.
- An athlete-created district, or hand logging.
- Push or email. The countdown is the reminder.
- A different size formula, including Garmin's load. That change stays inside `sizeCity`.
- Streets, an aura on hover, and moving along the streets. The bump belongs to Open a district. The rest waits until a bullet is already changing the scene.

## When a bullet finishes

Mark it done in this file in the same change, and move the standing line. The following plan starts from the new next bullet.
