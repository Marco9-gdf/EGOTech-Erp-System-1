import crypto from 'node:crypto';

/**
 * 🏛️ Indian Statutory Compliance & Labour Codes 2025/2026 Engine
 * Implements:
 * 1. Uniform Definition of Wages (Code on Wages 50% Rule)
 * 2. EPF / EPFO Statutory Calculation & ECR Generator
 * 3. ESIC Statutory Calculation
 * 4. State-Wise Professional Tax (PT) Slabs
 * 5. Labour Welfare Fund (LWF)
 * 6. Dual-Regime TDS Calculator (Section 192, New vs Old Regime with Form 12BB)
 * 7. DPDP Act Aadhaar Masking & IT Act Digital Verification Seal
 */

// 1. Uniform Definition of Wages (Labour Codes 50% Rule)
export function evaluateLabourCodeWageCompliance(salary = {}) {
  const baseSalary = Number(salary.base_salary) || 0;
  const da = Number(salary.da) || 0;
  const retaining = Number(salary.retaining_allowance) || 0;
  const wages = baseSalary + da + retaining;

  const hra = Number(salary.hra) || 0;
  const conveyance = Number(salary.conveyance_allowance) || 0;
  const medical = Number(salary.medical_allowance) || 0;
  const specialAllowance = Number(salary.special_allowance) || 0;
  const otherAllowances = hra + conveyance + medical + specialAllowance;

  const totalGross = wages + otherAllowances;

  if (totalGross === 0) {
    return {
      isCompliant: true,
      ratio: 1.0,
      percentage: '100%',
      wages,
      allowances: 0,
      totalGross: 0,
      excessAllowances: 0,
      deemedWages: 0,
      message: 'No remuneration specified.',
    };
  }

  const ratio = wages / totalGross;
  const percentage = (ratio * 100).toFixed(1) + '%';
  const halfGross = Math.round((totalGross * 0.5) * 100) / 100;

  if (wages >= halfGross) {
    return {
      isCompliant: true,
      ratio,
      percentage,
      wages,
      allowances: otherAllowances,
      totalGross,
      excessAllowances: 0,
      deemedWages: wages,
      message: `Compliant with Code on Wages: Basic + DA forms ${percentage} of remuneration (minimum 50% required).`,
    };
  }

  // Allowances exceed 50%: excess is deemed wages
  const excessAllowances = Math.round((otherAllowances - halfGross) * 100) / 100;
  const deemedWages = halfGross; // Wages base elevated to 50% for statutory computation

  // Suggested re-balancing without changing total remuneration
  const suggestedBase = Math.round((halfGross - da - retaining) * 100) / 100;
  const suggestedSpecial = Math.max(0, Math.round((specialAllowance - excessAllowances) * 100) / 100);

  return {
    isCompliant: false,
    ratio,
    percentage,
    wages,
    allowances: otherAllowances,
    totalGross,
    excessAllowances,
    deemedWages,
    message: `Non-compliant: Basic + DA is only ${percentage} of remuneration. Under the Four Labour Codes, allowances exceeding 50% (₹${excessAllowances}) are deemed wages for PF and statutory liability.`,
    rebalancing: {
      suggestedBase,
      suggestedDA: da,
      suggestedSpecialAllowance: suggestedSpecial,
      note: `Increasing Basic to ₹${suggestedBase} and reducing Special Allowance to ₹${suggestedSpecial} achieves 50% statutory compliance.`,
    },
  };
}

// 2. EPF / EPFO Statutory Calculation
export function calculateEPF(wages, isEligible = true, options = {}) {
  if (!isEligible || wages <= 0) {
    return {
      applicable: false,
      pfWages: 0,
      employeePF: 0,
      employerEPF: 0,
      employerEPS: 0,
      edli: 0,
      adminCharges: 0,
      totalEmployerContribution: 0,
    };
  }

  const statutoryCeiling = options.ceiling != null ? Number(options.ceiling) : 15000;
  const enforceCeiling = options.enforceCeiling !== false; // Default true (capped at 15k)
  const pfWages = enforceCeiling ? Math.min(wages, statutoryCeiling) : wages;

  const employeePF = Math.round(pfWages * 0.12 * 100) / 100;

  // Employer share: 8.33% to EPS (capped at 8.33% of 15,000 = 1250), remainder to EPF
  const employerEPS = Math.min(1250, Math.round(pfWages * 0.0833 * 100) / 100);
  const employerEPF = Math.round((employeePF - employerEPS) * 100) / 100;
  const edli = Math.min(75, Math.round(pfWages * 0.005 * 100) / 100);
  const adminCharges = Math.round(pfWages * 0.005 * 100) / 100;

  return {
    applicable: true,
    pfWages,
    employeePF,
    employerEPF,
    employerEPS,
    edli,
    adminCharges,
    totalEmployerContribution: Math.round((employerEPF + employerEPS + edli + adminCharges) * 100) / 100,
  };
}

// 3. ESIC Statutory Calculation
export function calculateESIC(grossSalary, isEligible = true) {
  const esicWageLimit = 21000;
  if (!isEligible || grossSalary <= 0 || grossSalary > esicWageLimit) {
    return {
      applicable: false,
      grossSalary,
      wageLimit: esicWageLimit,
      employeeESIC: 0,
      employerESIC: 0,
      reason: grossSalary > esicWageLimit ? `Gross salary (₹${grossSalary}) exceeds ESIC statutory limit of ₹21,000.` : 'Not eligible or zero earnings',
    };
  }

  const employeeESIC = Math.ceil(grossSalary * 0.0075); // 0.75% rounded up to rupee
  const employerESIC = Math.ceil(grossSalary * 0.0325); // 3.25% rounded up to rupee

  return {
    applicable: true,
    grossSalary,
    wageLimit: esicWageLimit,
    employeeESIC,
    employerESIC,
    totalESIC: employeeESIC + employerESIC,
  };
}

// 4. State-Wise Professional Tax (PT) Slabs
export function calculateProfessionalTax(state = 'Maharashtra', grossSalary = 0, month = 10, gender = 'M') {
  const normState = (state || 'Maharashtra').toLowerCase().trim();
  const gross = Number(grossSalary) || 0;

  if (normState.includes('maharashtra') || normState.includes('mh')) {
    if (gender === 'F' && gross <= 25000) return 0;
    if (gross <= 7500) return 0;
    if (gross <= 10000) return 175;
    // February is ₹300 in Maharashtra to round out ₹2,500 annual PT
    return month === 2 ? 300 : 200;
  }

  if (normState.includes('karnataka') || normState.includes('ka')) {
    return gross > 15000 ? 200 : 0;
  }

  if (normState.includes('telangana') || normState.includes('andhra') || normState.includes('ts') || normState.includes('ap')) {
    if (gross <= 15000) return 0;
    if (gross <= 20000) return 150;
    return 200;
  }

  if (normState.includes('tamil') || normState.includes('tn')) {
    if (gross <= 3500) return 0;
    if (gross <= 5000) return 40;
    if (gross <= 7500) return 85;
    if (gross <= 10000) return 150;
    if (gross <= 12500) return 180;
    return 208;
  }

  if (normState.includes('delhi')) {
    return 0; // Delhi does not levy Professional Tax
  }

  if (normState.includes('gujarat')) {
    if (gross <= 5999) return 0;
    if (gross <= 8999) return 80;
    if (gross <= 11999) return 150;
    return 200;
  }

  if (normState.includes('west bengal') || normState.includes('wb')) {
    if (gross <= 10000) return 0;
    if (gross <= 15000) return 110;
    if (gross <= 25000) return 130;
    if (gross <= 40000) return 150;
    return 200;
  }

  // Default fallback: ₹200 if > ₹15k
  return gross > 15000 ? 200 : 0;
}

// 5. State-Wise Labour Welfare Fund (LWF)
export function calculateLWF(state = 'Maharashtra', month = 10) {
  const normState = (state || 'Maharashtra').toLowerCase().trim();
  // Most states deduct LWF twice a year (June & December) or monthly
  if (normState.includes('maharashtra')) {
    // In Maharashtra: June (month 6) and December (month 12), Employee ₹12, Employer ₹36
    return month === 6 || month === 12 ? 12 : 0;
  }
  if (normState.includes('karnataka')) {
    // December only: Employee ₹20, Employer ₹40
    return month === 12 ? 20 : 0;
  }
  if (normState.includes('delhi')) {
    // Every 6 months: ₹0.75 monthly
    return 6;
  }
  return 10;
}

// 6. Dual-Regime TDS Calculator (Section 192 Income Tax)
export function calculateAnnualTDS(grossMonthly, regime = 'New', declarations = {}) {
  const grossAnnual = (Number(grossMonthly) || 0) * 12;

  // New Tax Regime (Default, FY 2024-25 / 2025-26 Budget Slabs)
  const newStdDeduction = 75000;
  const newTaxableIncome = Math.max(0, grossAnnual - newStdDeduction);

  let newTax = 0;
  if (newTaxableIncome <= 300000) {
    newTax = 0;
  } else if (newTaxableIncome <= 700000) {
    newTax = (newTaxableIncome - 300000) * 0.05;
  } else if (newTaxableIncome <= 1000000) {
    newTax = 20000 + (newTaxableIncome - 700000) * 0.10;
  } else if (newTaxableIncome <= 1200000) {
    newTax = 50000 + (newTaxableIncome - 1000000) * 0.15;
  } else if (newTaxableIncome <= 1500000) {
    newTax = 80000 + (newTaxableIncome - 1200000) * 0.20;
  } else {
    newTax = 140000 + (newTaxableIncome - 1500000) * 0.30;
  }

  // Section 87A rebate under New Regime (Rebate up to ₹25,000 for taxable income <= ₹7,00,000)
  if (newTaxableIncome <= 700000) {
    newTax = 0;
  }
  const newCess = Math.round(newTax * 0.04);
  const totalNewTax = Math.round(newTax + newCess);
  const monthlyNewTDS = Math.round(totalNewTax / 12);

  // Old Tax Regime
  const oldStdDeduction = 50000;
  const sec80C = Math.min(150000, Number(declarations.sec_80c_amount) || 0);
  const sec80D = Math.min(25000, Number(declarations.sec_80d_amount) || 0);
  const hraExemption = Number(declarations.hra_rent_paid_annual) ? Math.min(Number(declarations.hra_rent_paid_annual) * 0.5, grossAnnual * 0.2) : 0;
  const homeLoan24b = Math.min(200000, Number(declarations.home_loan_interest_24b) || 0);

  const totalExemptions = oldStdDeduction + sec80C + sec80D + hraExemption + homeLoan24b;
  const oldTaxableIncome = Math.max(0, grossAnnual - totalExemptions);

  let oldTax = 0;
  if (oldTaxableIncome <= 250000) {
    oldTax = 0;
  } else if (oldTaxableIncome <= 500000) {
    oldTax = (oldTaxableIncome - 250000) * 0.05;
  } else if (oldTaxableIncome <= 1000000) {
    oldTax = 12500 + (oldTaxableIncome - 500000) * 0.20;
  } else {
    oldTax = 112500 + (oldTaxableIncome - 1000000) * 0.30;
  }

  // Section 87A rebate under Old Regime (Taxable income <= ₹5,00,000)
  if (oldTaxableIncome <= 500000) {
    oldTax = 0;
  }
  const oldCess = Math.round(oldTax * 0.04);
  const totalOldTax = Math.round(oldTax + oldCess);
  const monthlyOldTDS = Math.round(totalOldTax / 12);

  const selectedRegime = regime === 'Old' ? 'Old' : 'New';
  const effectiveMonthlyTDS = selectedRegime === 'Old' ? monthlyOldTDS : monthlyNewTDS;
  const effectiveAnnualTax = selectedRegime === 'Old' ? totalOldTax : totalNewTax;

  return {
    selectedRegime,
    grossAnnual,
    effectiveMonthlyTDS,
    effectiveAnnualTax,
    comparison: {
      newRegime: {
        taxableIncome: newTaxableIncome,
        annualTax: totalNewTax,
        monthlyTDS: monthlyNewTDS,
        standardDeduction: newStdDeduction,
      },
      oldRegime: {
        taxableIncome: oldTaxableIncome,
        annualTax: totalOldTax,
        monthlyTDS: monthlyOldTDS,
        totalExemptions,
      },
      recommendedRegime: totalNewTax <= totalOldTax ? 'New' : 'Old',
      annualSavings: Math.abs(totalNewTax - totalOldTax),
    },
  };
}

// 7. Mask Aadhaar Number (DPDP Act & Aadhaar Act Compliance)
export function maskAadhaar(raw) {
  if (!raw) return '';
  const cleaned = String(raw).replace(/[\s-]/g, '');
  if (cleaned.length === 12 && /^\d+$/.test(cleaned)) {
    return `XXXX-XXXX-${cleaned.slice(8)}`;
  }
  if (cleaned.startsWith('XXXX') || cleaned.includes('X')) {
    return cleaned;
  }
  return raw;
}

// 8. IT Act Digital Verification Signature Seal
export function generatePayslipVerificationHash(data) {
  const payload = `${data.employee_id}:${data.month}:${data.year}:${data.net_salary}:${data.employee_code}`;
  return crypto.createHash('sha256').update(payload).digest('hex').slice(0, 32).toUpperCase();
}

// 9. EPFO ECR (Electronic Challan cum Return) Export Generator
export function generateEpfoEcrText(payslips = []) {
  // ECR format standard: UAN#Member Name#Gross Wages#EPF Wages#EPS Wages#EDLI Wages#EE Share#ER Share#EPS Contri#Diff#NCP Days#Refund
  const lines = [];
  payslips.forEach((p) => {
    const uan = p.uan_number || '101234567890';
    const name = (p.employee_name || 'Staff Member').toUpperCase();
    const gross = Math.round(p.total_earnings || 0);
    const epfWages = Math.min(15000, Math.round(p.base_salary || 0));
    const epsWages = epfWages;
    const edliWages = epfWages;
    const eeShare = Math.round(epfWages * 0.12);
    const epsShare = Math.min(1250, Math.round(epfWages * 0.0833));
    const erShare = eeShare - epsShare;
    const ncpDays = Math.round(p.unpaid_leaves || 0);
    const line = `${uan}#~#${name}#~#${gross}#~#${epfWages}#~#${epsWages}#~#${edliWages}#~#${eeShare}#~#${erShare}#~#${epsShare}#~#0#~#${ncpDays}#~#0`;
    lines.push(line);
  });
  return lines.join('\n');
}

// 10. Corporate Bank Batch Transfer (NACH / NEFT) CSV Generator
export function generateBankBatchCsv(payslips = [], company = {}) {
  const headers = ['Sr No', 'Beneficiary Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Amount', 'Currency', 'Payment Remarks', 'Batch Reference'];
  const rows = [headers.join(',')];

  payslips.forEach((p, idx) => {
    const sr = idx + 1;
    const name = `"${(p.employee_name || 'Employee').replace(/"/g, '""')}"`;
    const bank = `"${(p.bank_name || 'HDFC Bank').replace(/"/g, '""')}"`;
    const account = `"${p.bank_account_no || '987654321012'}"`;
    const ifsc = `"${p.bank_ifsc || 'HDFC0001234'}"`;
    const amount = Number(p.net_salary || 0).toFixed(2);
    const currency = company.currency_code || 'INR';
    const remarks = `"Salary ${p.month}/${p.year}"`;
    const ref = `"PAY-${p.year}${String(p.month).padStart(2, '0')}-${p.employee_code || sr}"`;

    rows.push([sr, name, bank, account, ifsc, amount, currency, remarks, ref].join(','));
  });

  return rows.join('\n');
}
