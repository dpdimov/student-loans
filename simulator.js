// UK student loan vs. investment simulator.
//
// Monthly model over the term (30 years = 360 months):
//   - Salary is set annually: in year y it is startingSalary * (1 + salaryGrowth)^(y-1).
//   - The repayment threshold rises with inflation: threshold * (1 + inflationRate)^(y-1).
//   - Interest is calculated daily on the outstanding balance at interestRate / 365
//     and added to the balance at the end of each month (compounded monthly).
//   - Each month's repayment = repaymentRate * max(0, salary - threshold) / 12,
//     capped at the balance.
//   - Anything still owed after the final month is written off.
//
// Comparison: the loan amount invested on day one and compounded annually at
// investmentReturn for the same term, against the total actually repaid.
//
// Equivalent standard loan: the principal of a conventional level-payment loan
// at interestRate (compounded monthly) whose total repayments over the same
// period (until cleared, or the full term) equal the total actually repaid.

(function (root) {
  const DEFAULTS = {
    loanAmount: 50000,
    startingSalary: 28000,
    threshold: 25000,
    salaryGrowth: 0.03,
    inflationRate: 0.025,
    investmentReturn: 0.05,
    interestRate: 0.06,
    repaymentRate: 0.09,
    term: 30,
  };

  const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  function simulate(params) {
    const p = Object.assign({}, DEFAULTS, params);
    const dailyRate = p.interestRate / 365;
    let balance = p.loanAmount;
    let totalRepaid = 0;
    let totalInterest = 0;
    let repaidInYear = null;
    let monthsActive = p.term * 12;
    const years = [];

    for (let y = 1; y <= p.term; y++) {
      const salary = p.startingSalary * Math.pow(1 + p.salaryGrowth, y - 1);
      const threshold = p.threshold * Math.pow(1 + p.inflationRate, y - 1);
      const monthlyDue = (p.repaymentRate * Math.max(0, salary - threshold)) / 12;
      let interestYear = 0;
      let paidYear = 0;

      for (let m = 0; m < 12; m++) {
        if (balance <= 0) continue;

        const interest = balance * dailyRate * DAYS_IN_MONTH[m];
        balance += interest;
        interestYear += interest;

        const payment = Math.min(monthlyDue, balance);
        balance -= payment;
        paidYear += payment;

        if (balance < 0.005) {
          balance = 0;
          repaidInYear = y;
          monthsActive = (y - 1) * 12 + m + 1;
        }
      }

      totalInterest += interestYear;
      totalRepaid += paidYear;
      years.push({
        year: y,
        salary,
        threshold,
        interest: interestYear,
        payment: paidYear,
        balance,
        totalRepaid,
        investmentValue: p.loanAmount * Math.pow(1 + p.investmentReturn, y),
      });
    }

    const last = years[years.length - 1];
    return {
      params: p,
      years,
      repaidInYear,
      totalRepaid,
      totalInterest,
      writtenOff: last.balance,
      investmentValue: last.investmentValue,
      // Invested loan at the end of the term minus everything repaid.
      netAdvantage: last.investmentValue - totalRepaid,
      monthsActive,
      equivalentLoan: equivalentLoan(totalRepaid, p.interestRate, monthsActive),
      // Level monthly instalment of that loan: the total repaid spread evenly.
      equivalentMonthlyPayment: monthsActive > 0 ? totalRepaid / monthsActive : 0,
    };
  }

  // Principal of a standard loan at annual rate `rate` (compounded monthly),
  // repaid in `months` equal instalments, whose instalments sum to `total`.
  function equivalentLoan(total, rate, months) {
    if (months <= 0) return 0;
    const r = rate / 12;
    const payment = total / months;
    return r === 0 ? total : (payment * (1 - Math.pow(1 + r, -months))) / r;
  }

  const api = { simulate, equivalentLoan, DEFAULTS };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.StudentLoan = api;
})(this);
