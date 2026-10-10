# Cardio City

Cardio City is how an age-group triathlete sees the shape of their own training across a season.

## Language

**Athlete**:
An age-group triathlete who trains across a season, identified by their Garmin connection. Each athlete has their own city.
_Avoid_: user, player

**City**:
One athlete's recent training, about the last six weeks on their local calendar, shown as a three-dimensional city of four districts the athlete can move through. Where a district has sub-districts, each has its own size. A quiet one shrinks and remains.
_Avoid_: map, world, dashboard, shared city

**District**:
One of the four regions of a city: Swim, Bike, Run, or Strength. Each stands for a single discipline. Swim contains Pool and Open water. Bike contains Indoor and Road.
_Avoid_: zone, sport, category

**Sub-district**:
A part of a district with its own size. The artwork inside one sub-district scales together. A quiet one shrinks and remains.
_Avoid_: zone, variant, object

**Pool**:
The Swim sub-district for pool swimming.
_Avoid_: laps

**Open water**:
The Swim sub-district for open-water swimming. It is drawn as a lake.
_Avoid_: lake

**Indoor**:
The Bike sub-district for indoor cycling.
_Avoid_: trainer

**Road**:
The Bike sub-district for road cycling. It is drawn as roads.
_Avoid_: outdoor, gravel

**Run**:
The district for running. Road, trail, treadmill, track, and virtual runs are all Run.
_Avoid_: jog

**Strength**:
The district for strength training.
_Avoid_: gym, weights, S&C

**Session**:
A completed bout of real-world training placed in exactly one district. When that district has sub-districts, the session is placed in exactly one of them. Garmin holds the session. Cardio City keeps a local copy of the sessions that size the city and of the latest ones shown for a quick open.
_Avoid_: visit, activity, workout

**Record**:
A personal best shown for a district. Garmin supplies it when Garmin has one. The athlete can change it or add one.
_Avoid_: PR, achievement

**District stat**:
A running total for one district across its whole Garmin history. The athlete chooses which of these to show on that district. The starting ones are total time, average session duration, and the share of sessions in each effort zone.
_Avoid_: metric, widget

**Goal**:
A race the athlete intends to contest on a stated local date, in one or more named districts.
_Avoid_: event, target, plan

**Countdown**:
The time remaining until one goal, shown on the city. It is that goal's reminder. The athlete can hide it.
_Avoid_: timer, event, notification

**Competition**:
A session that counts as a race. The athlete can mark one. A session is also marked when its date is a goal's date and its district is one that goal uses.
_Avoid_: race, event

**Shared city**:
A city that a group of athletes enlarge together. Separate from each athlete's own city.
_Avoid_: group mode
