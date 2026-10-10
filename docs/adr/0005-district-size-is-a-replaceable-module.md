# District size comes from one replaceable module

How big each sizable place appears is computed in a single module. The rest of the application asks that module for a size and does not keep a second copy of the formula, so the formula can change without touching the city, the history, or the session record. A sub-district is sizable on its own. A district with no sub-districts is sizable as a whole.

The first formula is weekly frequency from Garmin sessions, averaged across the six weeks the city shows: how often the athlete trained that place. An easy session and a hard session count as the same hit. Zero sessions leave the remnant size. A later switch to Garmin's own load figures is a change inside this module.
