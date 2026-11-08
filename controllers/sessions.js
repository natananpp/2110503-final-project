const Booking = require('../models/Booking');
const Dentist = require('../models/Dentist');
const { TIMEZONE_OFFSET, SESSION_MINUTES, WORKING_DAYS, PERIODS } = require('../config/sessions');

const pad = (n) => String(n).padStart(2, '0');

// Date in clinic time, e.g. ('2026-11-20', 9, 30) -> 2026-11-20 09:30 +07:00
const clinicTime = (date, hour, minute = 0) =>
    new Date(`${date}T${pad(hour)}:${pad(minute)}:00${TIMEZONE_OFFSET}`);

// Turns "morning,Evening" into ['Morning', 'Evening'].
// Returns null if a tag is unknown.
const parsePeriods = (value) => {
    if (!value) return Object.keys(PERIODS);
    const names = Object.keys(PERIODS);
    const picked = [];
    for (const tag of String(value).split(',')) {
        const name = names.find(n => n.toLowerCase() === tag.trim().toLowerCase());
        if (!name) return null;
        if (!picked.includes(name)) picked.push(name);
    }
    return picked;
};

//@desc     Get available sessions of a dentist on a date, filtered by time period tags
//@route    GET /api/v1/dentists/:dentistId/sessions?date=YYYY-MM-DD&period=Morning,Evening
//@access   Public
exports.getSessions = async (req, res, next) => {
    try {
        const { date, period } = req.query;

        if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || isNaN(clinicTime(date, 0).getTime())) {
            return res.status(400).json({ success: false, message: 'Please provide a date as YYYY-MM-DD' });
        }

        const periods = parsePeriods(period);
        if (!periods) {
            return res.status(400).json({
                success: false,
                message: `Unknown period. Use: ${Object.keys(PERIODS).join(', ')}`
            });
        }

        const dentist = await Dentist.findById(req.params.dentistId).catch(() => null);
        if (!dentist) {
            return res.status(404).json({ success: false, message: `No dentist with the id of ${req.params.dentistId}` });
        }

        // Clinic is closed on this day -> no sessions
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        if (!WORKING_DAYS.includes(weekday)) {
            return res.status(200).json({ success: true, count: 0, data: [] });
        }

        // Bookings of this dentist on that day
        const dayStart = clinicTime(date, 0);
        const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
        const booked = await Booking.find({
            dentist: dentist._id,
            bookingDate: { $gte: dayStart, $lt: dayEnd }
        }).select('bookingDate');

        const now = new Date();
        const sessions = [];
        for (const name of periods) {
            const { start, end } = PERIODS[name];
            for (let m = start * 60; m + SESSION_MINUTES <= end * 60; m += SESSION_MINUTES) {
                const from = clinicTime(date, Math.floor(m / 60), m % 60);
                const to = new Date(from.getTime() + SESSION_MINUTES * 60 * 1000);

                const isPast = from <= now;
                const isTaken = booked.some(b => b.bookingDate >= from && b.bookingDate < to);
                if (!isPast && !isTaken) {
                    sessions.push({ start: from, end: to, period: name });
                }
            }
        }
        sessions.sort((a, b) => a.start - b.start);

        res.status(200).json({ success: true, count: sessions.length, data: sessions });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Cannot get sessions' });
    }
};
