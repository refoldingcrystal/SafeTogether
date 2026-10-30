# Mobile shared contracts

`models.ts` defines the records exchanged between the Expo resident app and the future authority web dashboard: incidents, help offers, official notices, guides, audit events, locations, and freshness states.

`demo.ts` contains only clearly labeled local demonstration data. It is the temporary mock-data boundary until a backend API replaces it.

Public client records must use approximate locations only. Private contact details, exact residential addresses, internal notes, and unapproved attachments must never be added to this module or sent to public mobile screens.
