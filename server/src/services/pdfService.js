import PDFDocument from 'pdfkit';

// Helper to convert number to words (simple and clean for currency)
function numberToWords(amount) {
  const words = [
    '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function numToWords(n) {
    if (n === 0) return 'Zero';
    if (n < 20) return words[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + words[n % 10] : '');
    if (n < 1000) return words[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + numToWords(n % 100) : '');
    if (n < 1000000) return numToWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + numToWords(n % 1000) : '');
    return numToWords(Math.floor(n / 1000000)) + ' Million' + (n % 1000000 !== 0 ? ' ' + numToWords(n % 1000000) : '');
  }

  const intPart = Math.floor(amount);
  const cents = Math.round((amount - intPart) * 100);
  let result = numToWords(intPart) + ' Dollars';
  if (cents > 0) {
    result += ' and ' + numToWords(cents) + ' Cents';
  }
  return result + ' Only';
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export function generatePayslipPDF(payslipData, company = {}) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const currency = company.currency_symbol || '$';
      const companyName = company.name || company.company_name || 'Egotech Technologies Inc.';
      const companyAddress = company.address || company.company_address || '100 Innovation Way, Suite 400, Silicon Valley, CA 94025';
      const companyEmail = company.email || company.company_email || 'hr@company.com';
      const companyPhone = company.phone || company.company_phone || '+1 (555) 019-2834';
      const primaryColor = company.primary_color || '#1e293b';
      const poweredByText = company.powered_by_text || 'Powered by Egotech';

      const monthName = MONTH_NAMES[(payslipData.month - 1)] || `Month ${payslipData.month}`;
      const year = payslipData.year;

      // Header Banner (Co-Branded Client & Platform)
      doc.rect(40, 40, 515, 68).fill('#0f172a');
      doc.rect(40, 106, 515, 3).fill(primaryColor);

      // Client Company Name & Details
      doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold')
         .text(companyName.toUpperCase(), 55, 50, { width: 320, lineBreak: false });
      doc.fillColor('#94a3b8').fontSize(8.5).font('Helvetica')
         .text(`${companyAddress}`, 55, 72, { width: 320, lineBreak: false });
      doc.text(`Email: ${companyEmail} | Tel: ${companyPhone}`, 55, 85, { width: 320, lineBreak: false });

      // Co-Branding Badge: "Powered by [Owner Company]"
      doc.roundedRect(380, 48, 160, 22, 4).fill('#1e293b');
      doc.roundedRect(380, 48, 160, 22, 4).strokeColor(primaryColor).lineWidth(1).stroke();
      doc.fillColor('#e2e8f0').fontSize(8).font('Helvetica-Bold')
         .text(poweredByText.toUpperCase(), 385, 54, { align: 'center', width: 150 });

      // Payslip Title Bar
      doc.rect(40, 115, 515, 28).fill('#f1f5f9');
      doc.fillColor('#0f172a').fontSize(12).font('Helvetica-Bold')
         .text(`PAYSLIP FOR THE MONTH OF ${monthName.toUpperCase()} ${year}`, 55, 123);
      doc.fillColor('#64748b').fontSize(9).font('Helvetica')
         .text(`Status: ${payslipData.status || 'Generated'}`, 450, 123, { align: 'right' });

      // Employee Details Grid
      let y = 155;
      doc.rect(40, y, 515, 85).strokeColor('#e2e8f0').lineWidth(1).stroke();

      doc.fillColor('#475569').fontSize(9).font('Helvetica');
      const col1 = 55;
      const col2 = 180;
      const col3 = 320;
      const col4 = 440;

      // Row 1
      doc.font('Helvetica-Bold').text('Employee ID:', col1, y + 10);
      doc.font('Helvetica').text(payslipData.employee_code || `EMP00${payslipData.employee_id}`, col2, y + 10);
      doc.font('Helvetica-Bold').text('Employee Name:', col3, y + 10);
      doc.font('Helvetica').text(payslipData.employee_name || 'N/A', col4, y + 10);

      // Row 2
      doc.font('Helvetica-Bold').text('Designation:', col1, y + 28);
      doc.font('Helvetica').text(payslipData.designation || 'N/A', col2, y + 28);
      doc.font('Helvetica-Bold').text('Department:', col3, y + 28);
      doc.font('Helvetica').text(payslipData.department_name || payslipData.department || 'N/A', col4, y + 28);

      // Row 3
      doc.font('Helvetica-Bold').text('Bank Account:', col1, y + 46);
      doc.font('Helvetica').text(payslipData.bank_account_no ? `•••• ${payslipData.bank_account_no.slice(-4)}` : 'N/A', col2, y + 46);
      doc.font('Helvetica-Bold').text('PAN / Tax ID:', col3, y + 46);
      doc.font('Helvetica').text(payslipData.pan_number || payslipData.tax_id || 'N/A', col4, y + 46);

      // Row 4
      doc.font('Helvetica-Bold').text('UAN (EPFO):', col1, y + 64);
      doc.font('Helvetica').text(payslipData.uan_number || '101234567890', col2, y + 64);
      doc.font('Helvetica-Bold').text('Aadhaar (Masked):', col3, y + 64);
      doc.font('Helvetica').text(payslipData.aadhaar_masked || 'XXXX-XXXX-8901', col4, y + 64);

      // Earnings & Deductions Tables
      y = 255;
      const halfWidth = 252;
      const rightX = 302;

      // Earnings Table Header
      doc.rect(40, y, halfWidth, 24).fill('#2563eb');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('EARNINGS', 55, y + 7);
      doc.text('AMOUNT', 40 + halfWidth - 70, y + 7, { width: 60, align: 'right' });

      // Deductions Table Header
      doc.rect(rightX, y, halfWidth, 24).fill('#dc2626');
      doc.fillColor('#ffffff').fontSize(10).font('Helvetica-Bold').text('DEDUCTIONS', rightX + 15, y + 7);
      doc.text('AMOUNT', rightX + halfWidth - 70, y + 7, { width: 60, align: 'right' });

      // Rows
      const earnings = [
        { label: 'Basic Salary (Code on Wages)', amount: payslipData.base_salary || 0 },
        { label: 'Dearness Allowance (DA)', amount: payslipData.da || 0 },
        { label: 'House Rent Allowance (HRA)', amount: payslipData.hra || 0 },
        { label: 'Conveyance Allowance', amount: payslipData.conveyance || 0 },
        { label: 'Medical Allowance', amount: payslipData.medical || 0 },
        { label: 'Special Allowance', amount: payslipData.special_allowance || 0 },
        { label: 'Performance Bonus', amount: payslipData.bonus || 0 },
        { label: `Overtime Pay (${payslipData.overtime_hours || 0} hrs)`, amount: payslipData.overtime_pay || 0 },
      ];

      const deductions = [
        { label: 'Employee Provident Fund (EPF 12%)', amount: payslipData.provident_fund || 0 },
        { label: 'Professional Tax (State PT)', amount: payslipData.professional_tax || 0 },
        { label: 'Employee State Insurance (ESIC 0.75%)', amount: payslipData.health_insurance || 0 },
        { label: `TDS on Salary (Sec 192 - ${payslipData.tax_regime || 'New'} Regime)`, amount: payslipData.tds_tax || 0 },
        { label: 'Labour Welfare Fund (LWF)', amount: payslipData.lwf_deduction || 0 },
        { label: `Loss of Pay (${payslipData.unpaid_leaves || 0} days)`, amount: payslipData.lop_deduction || 0 },
        { label: 'Other Deductions', amount: payslipData.other_deductions || 0 },
      ];

      const maxRows = Math.max(earnings.length, deductions.length);
      let rowY = y + 24;

      for (let i = 0; i < maxRows; i++) {
        const bg = i % 2 === 0 ? '#f8fafc' : '#ffffff';
        doc.rect(40, rowY, halfWidth, 20).fill(bg);
        doc.rect(rightX, rowY, halfWidth, 20).fill(bg);

        // Earning item
        if (earnings[i]) {
          doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
             .text(earnings[i].label, 55, rowY + 5);
          doc.font('Helvetica-Bold')
             .text(`${currency} ${Number(earnings[i].amount).toFixed(2)}`, 40 + halfWidth - 75, rowY + 5, { width: 65, align: 'right' });
        }

        // Deduction item
        if (deductions[i]) {
          doc.fillColor('#1e293b').fontSize(8.5).font('Helvetica')
             .text(deductions[i].label, rightX + 15, rowY + 5);
          doc.font('Helvetica-Bold')
             .text(`${currency} ${Number(deductions[i].amount).toFixed(2)}`, rightX + halfWidth - 75, rowY + 5, { width: 65, align: 'right' });
        }

        rowY += 20;
      }

      // Totals Row
      doc.rect(40, rowY, halfWidth, 24).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('TOTAL GROSS EARNINGS', 55, rowY + 7);
      doc.text(`${currency} ${Number(payslipData.total_earnings || 0).toFixed(2)}`, 40 + halfWidth - 75, rowY + 7, { width: 65, align: 'right' });

      doc.rect(rightX, rowY, halfWidth, 24).fill('#e2e8f0');
      doc.fillColor('#0f172a').fontSize(9).font('Helvetica-Bold').text('TOTAL DEDUCTIONS', rightX + 15, rowY + 7);
      doc.text(`${currency} ${Number(payslipData.total_deductions || 0).toFixed(2)}`, rightX + halfWidth - 75, rowY + 7, { width: 65, align: 'right' });

      rowY += 34;

      // Net Pay Highlight Box
      doc.rect(40, rowY, 515, 50).fill('#059669');
      doc.fillColor('#ffffff').fontSize(11).font('Helvetica-Bold')
         .text('NET SALARY PAYABLE:', 55, rowY + 12);
      doc.fontSize(18).font('Helvetica-Bold')
         .text(`${currency} ${Number(payslipData.net_salary || 0).toFixed(2)}`, 55, rowY + 26);

      const netWords = numberToWords(payslipData.net_salary || 0);
      doc.fontSize(8.5).font('Helvetica')
         .text(`Amount in Words: ${netWords}`, 300, rowY + 28, { width: 245, align: 'right' });

      rowY += 65;

      // Payment Details & Footer Note
      doc.rect(40, rowY, 515, 52).fill('#f8fafc').strokeColor('#e2e8f0').stroke();
      doc.fillColor('#475569').fontSize(8).font('Helvetica')
         .text(`Payment Mode: ${payslipData.payment_method || 'Corporate Direct Bank Transfer (NEFT/RTGS)'}`, 55, rowY + 8)
         .text(`Disbursement Date: ${payslipData.created_at ? payslipData.created_at.split(' ')[0] : 'N/A'}`, 55, rowY + 22)
         .text(`Digital Seal: SHA256-${payslipData.digital_sign_hash || 'EGO-VERIFIED-SEAL'}`, 55, rowY + 36)
         .font('Helvetica-Bold').text('Authorized Compliance Signatory', 370, rowY + 8)
         .font('Helvetica').text(`${companyName.slice(0, 24)} HR & Finance`, 370, rowY + 22)
         .text(`Statutory Retention: 8 Years (DPDP Act 2023)`, 370, rowY + 36);

      // Co-Branded Footer Note
      doc.fillColor('#64748b').fontSize(8).font('Helvetica-Bold')
         .text(`${companyName}  •  ${poweredByText}`, 40, 765, { align: 'center', width: 515 });

      // Digital Sign Disclaimer
      doc.fillColor('#94a3b8').fontSize(7.5).font('Helvetica')
         .text(`CONFIDENTIAL: Digitally generated under IT Act 2000 & Code on Wages 2025. Issued by ${companyName} via ${poweredByText}. Contact: ${companyEmail}`, 40, 780, { align: 'center', width: 515 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
