const fs = require('fs');

console.log('===========================================================');
console.log('FIXING EARLY PERIOD END GAP IN FERTILITY WINDOW & CALENDAR');
console.log('===========================================================');

let appJs = fs.readFileSync('c:/Users/MustafaGOCUK/Desktop/cyclecare/app.js', 'utf8');

// 1. UPDATE COMPUTEPREDICTIONS FERTILITY CALCULATION WHEN PERIOD ENDS EARLY
const oldFertileCalc = `  // Ovulation: luteal phase is fixed at ~14 days before next period
  const ovulationDayNum = avgCycle - 14;  // day-in-cycle when ovulation occurs
  // addDays is hoisted (function declaration), safe to call here
  const ovulationDate  = addDays(lastPeriodDate, ovulationDayNum - 1);
  const fertileStart   = addDays(ovulationDate, -5);    // sperm survival window
  const fertileEnd     = ovulationDate;                  // peak day`;

const newFertileCalc = `  // Ovulation & Fertile window calculation (adjusts dynamically if period ended early)
  let ovulationDayNum = avgCycle - 14;
  let fertileStartDayNum = ovulationDayNum - 5;
  let fertileEndDayNum = ovulationDayNum + 1;

  if (state && state.periodEndedEarly && state.actualPeriodLength) {
    const savedDays = avgPeriod - state.actualPeriodLength;
    if (savedDays > 0) {
      // Shift ovulation date earlier to reflect early follicular phase transition
      const shift = Math.floor(savedDays / 2);
      ovulationDayNum = Math.max(state.actualPeriodLength + 5, ovulationDayNum - shift);
      // Connect fertile window start directly to the day after period ended early (eliminating empty gap)
      fertileStartDayNum = state.actualPeriodLength + 1;
      fertileEndDayNum = ovulationDayNum + 1;
    }
  }

  const ovulationDate = addDays(lastPeriodDate, ovulationDayNum - 1);
  const fertileStart  = addDays(lastPeriodDate, fertileStartDayNum - 1);
  const fertileEnd    = addDays(lastPeriodDate, fertileEndDayNum - 1);`;

if (appJs.includes(oldFertileCalc)) {
  appJs = appJs.replace(oldFertileCalc, newFertileCalc);
  console.log(' ✅ FIX 1: computePredictions() fertile window now connects directly to early period end without gaps');
} else {
  console.log(' ⚠️ FIX 1: oldFertileCalc pattern not found by exact string');
}

// 2. UPDATE FUTURE PERIODS FERTILITY CALCULATION WHEN PERIOD ENDS EARLY
const oldFutureLoop = `    const ovDate = addDays(pStart, -14);
    const fStart = addDays(ovDate, -5);
    const fEnd   = ovDate;`;

const newFutureLoop = `    const ovDate = addDays(pStart, -14);
    const fStart = addDays(ovDate, -5);
    const fEnd   = addDays(ovDate, 1);`;

if (appJs.includes(oldFutureLoop)) {
  appJs = appJs.replace(oldFutureLoop, newFutureLoop);
  console.log(' ✅ FIX 2: futurePeriods fertile window updated to include peak ovulation day');
}

fs.writeFileSync('c:/Users/MustafaGOCUK/Desktop/cyclecare/app.js', appJs, 'utf8');

console.log('===========================================================');
console.log('EARLY PERIOD GAP FIX COMPLETE!');
console.log('===========================================================');
