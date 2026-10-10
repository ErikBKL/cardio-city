# Sync when the app opens

New Garmin sessions are pulled when the athlete opens Cardio City. That sync fills the session cache and adds any not-yet-counted ids to the district tallies. A refresh on a district rebuilds that district's counters from Garmin. V1 does not sync while the app is closed, because a web app has no reliable background run and the city only needs to be current when someone is looking at it.
