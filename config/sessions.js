// Booking session settings. Hours are clinic local time.
// Must match the clinic operating hours in controllers/bookings.js (Mon-Fri, 09:00 - 17:00).
//
// Team convention: every date in the API is Thai (clinic) wall-clock time written with "Z".
// e.g. a booking at 14:00 in Thailand is sent and stored as "2026-11-20T14:00:00.000Z".
// So the server must compare dates with nowInClinic(), not new Date().
const CLINIC_OFFSET_MS = 7 * 60 * 60 * 1000; // Thailand is UTC+7

module.exports = {
    // Suffix used when building dates (see the convention above)
    TIMEZONE_OFFSET: 'Z',

    // Current Thai time, in the same "Thai time with Z" format as the stored dates
    nowInClinic: () => new Date(Date.now() + CLINIC_OFFSET_MS),

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
