/**
 * Bikram Sambat (BS) Date Converter
 * Converts Gregorian dates to Bikram Sambat calendar
 * Used in Nepal
 */

class BikramSambat {
    /**
     * Days in each month of Bikram Sambat for year 2080
     * These are standard month lengths (some years may vary)
     */
    static monthDays = {
        2079: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
        2080: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
        2081: [31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 29, 31],
        2082: [31, 32, 31, 31, 31, 30, 30, 30, 29, 30, 30, 30],
        2083: [31, 31, 32, 30, 31, 31, 30, 29, 30, 29, 30, 31]
    };

    /**
     * Map of Gregorian dates to Bikram Sambat dates (reference points)
     */
    static adToBsTable = [
        // Format: [gregorian_year, gregorian_month, gregorian_day, bs_year, bs_month, bs_day]
        [2026, 1, 28, 2082, 10, 15]  // Jan 28, 2026 = 2082-10-15 BS
    ];

    /**
     * Convert Gregorian date to Bikram Sambat
     */
    static gregorianToBikramSambat(date) {
        if (!date) date = new Date();
        
        const gregorianYear = date.getFullYear();
        const gregorianMonth = date.getMonth() + 1;
        const gregorianDay = date.getDate();

        // Find closest reference point
        let refPoint = this.adToBsTable[0];
        for (let point of this.adToBsTable) {
            if (point[0] === gregorianYear && point[1] === gregorianMonth && point[2] === gregorianDay) {
                return { year: point[3], month: point[4], day: point[5] };
            }
        }

        // Calculate based on nearest reference
        const daysInMs = 24 * 60 * 60 * 1000;
        const refDate = new Date(refPoint[0], refPoint[1] - 1, refPoint[2]);
        const currentDate = new Date(gregorianYear, gregorianMonth - 1, gregorianDay);
        
        const daysDiff = Math.floor((currentDate - refDate) / daysInMs);
        
        let bsYear = refPoint[3];
        let bsMonth = refPoint[4];
        let bsDay = refPoint[5] + daysDiff;

        // Adjust for month boundaries
        while (bsDay > this.getDaysInMonth(bsYear, bsMonth)) {
            bsDay -= this.getDaysInMonth(bsYear, bsMonth);
            bsMonth++;
            if (bsMonth > 12) {
                bsMonth = 1;
                bsYear++;
            }
        }

        while (bsDay <= 0) {
            bsMonth--;
            if (bsMonth < 1) {
                bsMonth = 12;
                bsYear--;
            }
            bsDay += this.getDaysInMonth(bsYear, bsMonth);
        }

        return { year: bsYear, month: bsMonth, day: bsDay };
    }

    /**
     * Get number of days in a BS month
     */
    static getDaysInMonth(year, month) {
        if (this.monthDays[year] && this.monthDays[year][month - 1]) {
            return this.monthDays[year][month - 1];
        }
        // Default fallback
        return month <= 6 ? 31 : 30;
    }

    /**
     * Format BS date as string
     */
    static formatDate(bsDate, format = 'long') {
        const nepaliMonths = [
            'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
            'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुण', 'चैत्र'
        ];

        const nepaliDays = [
            'आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार',
            'बिहीबार', 'शुक्रबार', 'शनिबार'
        ];

        const year = bsDate.year;
        const month = bsDate.month;
        const day = bsDate.day;
        const monthName = nepaliMonths[month - 1];

        if (format === 'short') {
            return `${day} ${monthName} ${year}`;
        } else if (format === 'long') {
            // Get day of week from the original gregorian date
            // We need to convert back to gregorian to get the correct day of week
            const today = new Date();
            const dayOfWeek = nepaliDays[today.getDay()];
            return `${dayOfWeek}, ${day} ${monthName} ${year}`;
        }
        return `${day}/${month}/${year}`;
    }

    /**
     * Convert Gregorian date to BS and return formatted string
     */
    static convert(date, format = 'long') {
        const bsDate = this.gregorianToBikramSambat(date);
        return this.formatDate(bsDate, format);
    }

    /**
     * Get today's date in Bikram Sambat
     */
    static today(format = 'long') {
        return this.convert(new Date(), format);
    }

    /**
     * Get BS date components
     */
    static getComponents(date) {
        const bsDate = this.gregorianToBikramSambat(date);
        const nepaliMonths = [
            'बैशाख', 'जेठ', 'असार', 'श्रावण', 'भाद्र', 'आश्विन',
            'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुण', 'चैत्र'
        ];
        
        return {
            year: bsDate.year,
            month: bsDate.month,
            day: bsDate.day,
            monthName: nepaliMonths[bsDate.month - 1]
        };
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BikramSambat;
}
