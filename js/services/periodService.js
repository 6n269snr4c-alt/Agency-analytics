// periodService.js - Period management service

import storage from '../store/storage.js';

class PeriodService {
    // Get current period
    getCurrentPeriod() {
        return storage.getCurrentPeriod();
    }

    // Set current period
    setCurrentPeriod(periodId) {
        storage.setCurrentPeriod(periodId);
    }

    // Get all periods sorted by date (newest first)
    getAllPeriods() {
        return storage.getPeriods().sort((a, b) => {
            if (a.year !== b.year) return b.year - a.year;
            return b.month - a.month;
        });
    }

    // Get period info
    getPeriod(periodId) {
        return storage.getPeriod(periodId);
    }

    // Navigate to previous month
    getPreviousPeriod(periodId) {
        const [year, month] = periodId.split('-').map(Number);
        const prevMonth = month === 1 ? 12 : month - 1;
        const prevYear = month === 1 ? year - 1 : year;
        return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
    }

    // Navigate to next month
    getNextPeriod(periodId) {
        const [year, month] = periodId.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        return `${nextYear}-${String(nextMonth).padStart(2, '0')}`;
    }

    // Check if period exists
    periodExists(periodId) {
        return !!storage.getPeriod(periodId);
    }

    // Create new period by copying from previous
    createPeriodFromPrevious(newPeriodId) {
        const prevPeriodId = this.getPreviousPeriod(newPeriodId);
        
        // Set as current period (this creates it)
        storage.setCurrentPeriod(newPeriodId);
        
        // Copy data if previous period exists
        if (this.periodExists(prevPeriodId)) {
            storage.copyPeriodData(prevPeriodId, newPeriodId);
        }
        
        return storage.getPeriod(newPeriodId);
    }

    // Get formatted label for period
    getPeriodLabel(periodId) {
        if (!periodId) return '';
        const period = storage.getPeriod(periodId);
        return period ? period.label : periodId;
    }

    // Get current month/year
    getCurrentMonthYear() {
        const now = new Date();
        return {
            month: now.getMonth() + 1,
            year: now.getFullYear(),
            periodId: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
        };
    }
}

const periodService = new PeriodService();
export default periodService;
