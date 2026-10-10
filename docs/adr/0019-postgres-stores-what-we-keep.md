# Postgres stores what we keep

Athletes, goals, counters, counted Garmin ids, and the session cache are relational rows. Postgres holds them. SQLite gets awkward as soon as a second backend process is running, and a document store makes counters and goal-to-session marks clumsier.
