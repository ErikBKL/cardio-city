# The backend is the only path to Garmin

The athlete reaches Garmin through our backend. Signing in connects Garmin, and that connection is the account. The backend keeps the athlete's choices, the stat counters, the Garmin ids already counted, and the session cache, and it runs the size module. The client asks the backend for sizes, sessions, and stats. It does not hold Garmin's secret, and it does not keep the archive.
