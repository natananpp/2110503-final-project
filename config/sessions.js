// Booking session settings. Hours are clinic local time.
// Must match the clinic operating hours in controllers/bookings.js (Mon-Fri, 09:00 - 17:00).
module.exports = {
    // Clinic time zone (Thailand)
    TIMEZONE_OFFSET: '+07:00',

    // Length of one session in minutes
    SESSION_MINUTES: 60,

    // Open days: 0 = Sunday ... 6 = Saturday
    WORKING_DAYS: [1, 2, 3, 4, 5],

    // Time period tags: [start hour, end hour)
    PERIODS: {
        Morning: { start: 9, end: 12 },
        Afternoon: { start: 12, end: 15 },
        Evening: { start: 15, end: 17 }
    }
};
