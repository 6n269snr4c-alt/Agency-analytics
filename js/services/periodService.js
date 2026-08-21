// periodService.js - v4: só mês de referência, sem histórico.

import storage from '../store/storage.js';

class PeriodService {
    getCurrentPeriod()     { return storage.getCurrentPeriod(); }
    setCurrentPeriod(id)   { storage.setCurrentPeriod(id); }

    getPreviousPeriod(periodId) {
        const [year, month] = periodId.split('-').map(Number);
        const m = month === 1 ? 12 : month - 1;
        const y = month === 1 ? year - 1 : year;
        return `${y}-${String(m).padStart(2, '0')}`;
    }

    getNextPeriod(periodId) {
        const [year, month] = periodId.split('-').map(Number);
        const m = month === 12 ? 1 : month + 1;
        const y = month === 12 ? year + 1 : year;
        return `${y}-${String(m).padStart(2, '0')}`;
    }

    getPeriodLabel(periodId) {
        if (!periodId) return '';
        const [year, month] = periodId.split('-');
        const names = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${names[parseInt(month) - 1]}/${year}`;
    }

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
