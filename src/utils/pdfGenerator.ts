import { Expense, Category, PaymentMode } from '../context/ExpenseContext';
import { AccountTransaction } from '../context/TransactionContext';
import { formatAmount } from './format';

export const generateDashboardPDFHTML = (
  expenses: Expense[],
  categories: Category[],
  paymentModes: PaymentMode[],
  currency: string
) => {
  // 1. Sort ascending by date
  const sortedExpenses = [...expenses].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Group by month
  const grouped = sortedExpenses.reduce((acc, exp) => {
    const d = new Date(exp.date);
    const monthName = d.toLocaleString('default', { month: 'long' });
    const year = d.getFullYear();
    const key = `${monthName} ${year}`;
    if (!acc[key]) acc[key] = { expenses: [], total: 0, monthName, year };
    acc[key].expenses.push(exp);
    acc[key].total += exp.amount;
    return acc;
  }, {} as Record<string, { expenses: Expense[], total: number, monthName: string, year: number }>);

  // 5. Format DD-MM-YY
  const formatDDMMYY = (dateStr: string) => {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = String(d.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  let contentHTML = '';

  if (sortedExpenses.length === 0) {
    contentHTML = '<div style="text-align: center; margin-top: 50px; font-size: 16px;">No expenses found</div>';
  } else {
    contentHTML = Object.entries(grouped).map(([monthYear, data], index) => {
      // 2. New month starts from a new page (except the first one)
      const pageBreak = index > 0 ? 'page-break-before: always;' : '';

      const rows = data.expenses.map(exp => {
        const cat = categories.find(c => c.id === exp.categoryId);
        const mode = paymentModes.find(m => m.id === exp.paymentModeId);
        return `
          <tr>
            <td class="nowrap" style="width: 150px;">${formatDDMMYY(exp.date)}</td>
            <td class="nowrap amount-col debit-text" style="width: 150px;">${formatAmount(exp.amount)}</td>
            <td class="description-col" style="width: 500px;">${exp.description}</td>
            <td class="nowrap" style="width: 150px;">${cat ? cat.name : ''}</td>
            <td class="nowrap" style="width: 150px;">${mode ? mode.name : ''}</td>
          </tr>
        `;
      }).join('');

      return `
        <div style="${pageBreak}">
          <table>
            <colgroup>
              <col style="width: 150px;" />
              <col style="width: 150px;" />
              <col style="width: 500px;" />
              <col style="width: 150px;" />
              <col style="width: 150px;" />
            </colgroup>
            <thead>
              <tr style="background-color: transparent;">
                <th colspan="5" style="border: none; background-color: transparent; text-align: left; padding: 0 0 10px 0;">
                  <div class="header-container">
                    <span style="font-size: 18px; color: #000; font-weight: normal;">Account - ${data.year}</span>
                    <span style="font-size: 18px; color: #000; font-weight: normal;">${data.monthName}</span>
                  </div>
                </th>
              </tr>
              <tr>
                <th class="col-header" style="width: 150px;">Date</th>
                <th class="col-header" style="width: 150px;">Amount Spent</th>
                <th class="col-header" style="width: 500px;">Description</th>
                <th class="col-header" style="width: 150px;">Category</th>
                <th class="col-header" style="width: 150px;">Payment Mode</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
              <tr class="total-row">
                <td class="nowrap total-label" style="width: 150px;">Total</td>
                <td class="amount-col total-debit" style="width: 150px;">${formatAmount(data.total)}</td>
                <td class="description-col total-dashes" style="width: 500px;">---------------------------------------------------------------------------------------------------------</td>
                <td class="amount-col total-dashes" style="width: 150px;">-------------------------</td>
                <td class="amount-col total-dashes" style="width: 150px;">-------------------------</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    }).join('');
  }

  const grandTotal = sortedExpenses.reduce((sum, e) => sum + e.amount, 0);

  return `
    <html>
      <head>
        <meta name="viewport" content="width=1150" />
        <style>
          @page { 
            size: letter portrait;
            margin: 10mm;
            @bottom-right {
              content: counter(page);
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #888;
            }
          }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          
          .header-container { display: flex; justify-content: space-between; align-items: center; width: 100%; font-family: Arial, sans-serif; }
          
          table { width: 1100px; border-collapse: collapse; table-layout: fixed; zoom: 0.67; margin: 0 auto; }
          th, td { border: 1px solid #000; padding: 6px; text-align: left; overflow: hidden; font-size: 10px; }
          .col-header { background-color: #d0a060; color: #000; font-weight: bold; text-align: center; font-size: 10px; }
          
          tr:nth-child(even) { background-color: #e6d3ba; }
          tr:nth-child(odd) { background-color: #f8f2eb; }
          
          .nowrap { white-space: nowrap; }
          .description-col { width: 100%; }
          .amount-col { text-align: left; }
          
          .debit-text { color: #ff0000; }
          .credit-text { color: #6aa84f; }
          
          .total-row { font-weight: bold; background-color: #d0a060 !important; }
          .total-row td { border-top: 1px solid #000; }
          .total-row .total-label { background-color: #d0a060 !important; color: #000 !important; }
          .total-row .total-dashes { background-color: #d0a060 !important; color: #000 !important; text-align: center; }
          .total-debit { background-color: #e06666 !important; color: #990000 !important; }
        </style>
      </head>
      <body>
        ${contentHTML}
      </body>
    </html>
  `;
};

export const generateAccountTransactionsPDFHTML = (
  accountGroups: { accountName: string, transactions: AccountTransaction[] }[],
  currency: string
) => {
  const contentHTML = accountGroups.map((group, index) => {
    // Sort transactions from oldest to newest to calculate running balance correctly
    const sortedTransactions = [...group.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let runningBalance = 0;
    let totalDebits = 0;
    let totalCredits = 0;

    const tableRows = sortedTransactions.map(tx => {
      const dateObj = new Date(tx.date);
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yy = String(dateObj.getFullYear()).slice(-2);
      const dateStr = `${dd}-${mm}-${yy}`;

      const isCredit = tx.type === 'Credit';

      let debitStr = '0.00';
      let creditStr = '0.00';

      if (isCredit) {
        creditStr = formatAmount(tx.amount);
        totalCredits += tx.amount;
        runningBalance += tx.amount;
      } else {
        debitStr = formatAmount(tx.amount);
        totalDebits += tx.amount;
        runningBalance -= tx.amount;
      }

      return `
        <tr>
          <td class="nowrap" style="width: 150px;">${dateStr}</td>
          <td class="description-col" style="width: 500px;">${tx.description}</td>
          <td class="amount-col debit-text" style="width: 150px;">${debitStr}</td>
          <td class="amount-col credit-text" style="width: 150px;">${creditStr}</td>
          <td class="amount-col" style="width: 150px;">${formatAmount(runningBalance)}</td>
        </tr>
      `;
    }).join('');

    const pageBreak = index > 0 ? 'page-break-before: always;' : '';

    return `
      <div style="${pageBreak}">
        <table>
          <colgroup>
            <col style="width: 150px;" />
            <col style="width: 500px;" />
            <col style="width: 150px;" />
            <col style="width: 150px;" />
            <col style="width: 150px;" />
          </colgroup>
          <thead>
            <tr style="background-color: transparent;">
              <th colspan="5" style="border: none; background-color: transparent; text-align: left; padding: 0 0 10px 0;">
                <div class="header-container">
                  <span style="font-size: 18px; color: #000; font-weight: normal;">Transactional Accounts</span>
                  <span style="font-size: 18px; color: #000; font-weight: normal;">${group.accountName}</span>
                </div>
              </th>
            </tr>
            <tr>
              <th class="col-header" style="width: 150px;">Date</th>
              <th class="col-header" style="width: 500px;">Description</th>
              <th class="col-header" style="width: 150px;">Debit</th>
              <th class="col-header" style="width: 150px;">Credit</th>
              <th class="col-header" style="width: 150px;">Available Balance</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="text-align: center;">No transactions found</td></tr>'}
            ${tableRows.length > 0 ? `
            <tr class="total-row">
              <td class="nowrap total-label" style="width: 150px;">Total</td>
              <td class="description-col total-dashes" style="width: 500px;">---------------------------------------------------------------------------------------------------------</td>
              <td class="amount-col total-debit" style="width: 150px;">${formatAmount(totalDebits)}</td>
              <td class="amount-col total-credit" style="width: 150px;">${formatAmount(totalCredits)}</td>
              <td class="amount-col total-balance" style="width: 150px;">${formatAmount(runningBalance)}</td>
            </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  }).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=1350" />
        <style>
          @page { 
            size: letter portrait;
            margin: 10mm;
            @bottom-right {
              content: counter(page);
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #888;
            }
          }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          
          .header-container { display: flex; justify-content: space-between; align-items: center; width: 100%; font-family: Arial, sans-serif; }
          
          table { width: 1100px; border-collapse: collapse; table-layout: fixed; zoom: 0.67; margin: 0 auto; }
          th, td { border: 1px solid #000; padding: 6px; text-align: left; overflow: hidden; font-size: 10px; }
          .col-header { background-color: #d0a060; color: #000; font-weight: bold; text-align: center; font-size: 10px; }
          
          tr:nth-child(even) { background-color: #e6d3ba; }
          tr:nth-child(odd) { background-color: #f8f2eb; }
          
          .nowrap { white-space: nowrap; }
          .description-col { width: 100%; }
          .amount-col { text-align: left; }
          
          .debit-text { color: #ff0000; }
          .credit-text { color: #6aa84f; }
          
          .total-row { font-weight: bold; background-color: #d0a060 !important; }
          .total-row td { border-top: 1px solid #000; }
          .total-row .total-label { background-color: #d0a060 !important; color: #000 !important; text-align: center; }
          .total-row .total-dashes { background-color: #d0a060 !important; color: #000 !important; text-align: center; }
          .total-debit { background-color: #e06666 !important; color: #990000 !important; }
          .total-credit { background-color: #93c47d !important; color: #38761d !important; }
          .total-balance { background-color: #d0a060 !important; color: #000 !important; }
        </style>
      </head>
      <body>
        ${contentHTML}
      </body>
    </html>
  `;
};

const darkenColor = (color: string, amount: number) => {
  let hex = color.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (hex.length !== 6) return color;
  let r = parseInt(hex.substring(0, 2), 16) - amount;
  let g = parseInt(hex.substring(2, 4), 16) - amount;
  let b = parseInt(hex.substring(4, 6), 16) - amount;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const generateSVGChart = (
  data: { amount: number; color: string }[],
  chartType: 'Pie' | 'Donut',
  chartStyle: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle'
) => {
  const total = data.reduce((sum, item) => sum + item.amount, 0);
  if (total === 0) {
    return `<div style="text-align: center; margin: 20px 0;"><svg width="200" height="200" viewBox="-1.1 -1.1 2.2 2.2"><circle cx="0" cy="0" r="1" fill="#eee" /></svg></div>`;
  }

  const isSemi = chartStyle === 'Semi-Circle';
  const isDonut = chartType === 'Donut';
  const isSpaced = chartStyle === 'Spaced';

  let svgContent = '';
  let cumulativePercent = 0;
  const paths: { d: string; color: string; strokeAttr: string }[] = [];

  const angleMultiplier = isSemi ? 1 : 2;

  data.forEach((slice) => {
    if (slice.amount === 0) return;
    const percent = slice.amount / total;

    if (percent === 1) {
      if (isSemi) {
        // Draw a half circle
        const d = "M 1 0 A 1 1 0 0 1 -1 0 Z";
        svgContent += `<path d="${d}" fill="${slice.color}" />`;
        paths.push({ d, color: slice.color, strokeAttr: '' });
      } else {
        svgContent += `<circle cx="0" cy="0" r="1" fill="${slice.color}" />`;
        paths.push({ d: `M 0 0 m -1, 0 a 1,1 0 1,0 2,0 a 1,1 0 1,0 -2,0`, color: slice.color, strokeAttr: '' });
      }
      return;
    }

    const startX = Math.cos(angleMultiplier * Math.PI * cumulativePercent);
    const startY = Math.sin(angleMultiplier * Math.PI * cumulativePercent);
    cumulativePercent += percent;
    const endX = Math.cos(angleMultiplier * Math.PI * cumulativePercent);
    const endY = Math.sin(angleMultiplier * Math.PI * cumulativePercent);

    const largeArcFlag = isSemi ? 0 : (percent > 0.5 ? 1 : 0);

    const strokeAttr = isSpaced ? 'stroke="#ffffff" stroke-width="0.05"' : '';

    // Store the path data so we can loop it for 3D
    paths.push({ d: `M 0 0 L ${startX} ${startY} A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY} Z`, color: slice.color, strokeAttr });
  });

  const is3D = chartStyle === '3D';
  const layers = is3D ? 15 : 1;
  const shiftPerLayer = 0.02; // in user units (viewBox is 2.2 tall)

  const maskDef = isDonut ? `
    <defs>
      <mask id="donut-mask">
        <rect x="-1.5" y="-1.5" width="3" height="3" fill="white" />
        <circle cx="0" cy="0" r="0.5" fill="black" />
      </mask>
    </defs>
  ` : '';

  const groupAttr = isDonut ? `mask="url(#donut-mask)"` : '';
  const transformAttr = isSemi ? `rotate(180)` : `rotate(-90)`;
  const filterAttr = is3D ? `transform: rotateX(60deg);` : ``;

  let layeredContent = '';
  for (let i = layers - 1; i >= 0; i--) {
    const isTop = i === 0;
    const shiftY = i * shiftPerLayer;
    let currentLayer = '';

    paths.forEach(p => {
      const color = isTop ? p.color : darkenColor(p.color, 40);
      currentLayer += `<path d="${p.d}" fill="${color}" ${p.strokeAttr} />`;
    });

    // The translation must happen outside the rotation!
    layeredContent += `
      <g transform="translate(0, ${shiftY})">
        <g transform="${transformAttr}" ${groupAttr}>
          ${currentLayer}
        </g>
      </g>
    `;
  }

  const viewBoxHeight = isSemi ? 1.1 : (is3D ? 2.5 : 2.2);
  const svgHeight = isSemi ? 100 : (is3D ? 230 : 200);

  return `
    <div style="text-align: center; margin: 20px 0; display: flex; justify-content: center;">
      <svg width="200" height="${svgHeight}" viewBox="-1.1 -1.1 2.2 ${viewBoxHeight}" style="${filterAttr}">
        ${maskDef}
        ${layeredContent}
      </svg>
    </div>
  `;
};

export const generateAnalyticsPDFHTML = (
  filterName: string,
  totalSpent: number,
  categoryData: { name: string; amount: number; color: string; text: string }[],
  paymentModeData: { name: string; amount: number; color: string; text: string }[],
  currency: string,
  chartType: 'Pie' | 'Donut' = 'Pie',
  chartStyle: 'Classic' | '3D' | 'Spaced' | 'Semi-Circle' = 'Classic',
  categoryChartBase64: string = '',
  paymentChartBase64: string = ''
) => {
  const catRows = categoryData.map(cat => `
    <tr>
      <td>
        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${cat.color}; margin-right:8px;"></span>
        ${cat.name}
      </td>
      <td style="text-align: right;">${cat.text}</td>
      <td style="text-align: right;">${currency}${formatAmount(cat.amount)}</td>
    </tr>
  `).join('');

  const modeRows = paymentModeData.map(mode => `
    <tr>
      <td>
        <span style="display:inline-block; width:12px; height:12px; border-radius:50%; background-color:${mode.color}; margin-right:8px;"></span>
        ${mode.name}
      </td>
      <td style="text-align: right;">${mode.text}</td>
      <td style="text-align: right;">${currency}${formatAmount(mode.amount)}</td>
    </tr>
  `).join('');

  return `
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { 
            size: letter portrait;
            margin: 10mm; /* Narrow margin */
            @bottom-right {
              content: counter(page);
              font-family: Arial, sans-serif;
              font-size: 10px;
              color: #888;
            }
          }
          body { font-family: Arial, sans-serif; font-size: 10px; color: #333; margin: 0; padding: 0; }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
          h1 { text-align: center; color: #2c3e50; margin-bottom: 5px; }
          .subtitle { text-align: center; color: #7f8c8d; font-size: 16px; margin-bottom: 30px; }
          .card { background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin-bottom: 20px; }
          .card h2 { margin-top: 0; color: #2c3e50; font-size: 18px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .total-spent { font-size: 32px; font-weight: bold; color: #2c3e50; text-align: center; margin: 10px 0; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 12px 8px; border-bottom: 1px solid #eee; text-align: left; }
          th { color: #888; font-size: 12px; text-transform: uppercase; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #888; }
        </style>
      </head>
      <body>
        <h1>Analytics Report</h1>
        <div class="subtitle">Period: ${filterName}</div>
        
        <div class="card">
          <h2>Total Spent</h2>
          <div class="total-spent">${currency}${formatAmount(totalSpent)}</div>
        </div>

        <div class="card">
          <h2>Category Breakdown</h2>
          ${categoryChartBase64
      ? `<div style="text-align: center; margin: 20px 0;"><img src="data:image/png;base64,${categoryChartBase64}" style="max-width: 100%; max-height: 250px; object-fit: contain;" /></div>`
      : generateSVGChart(categoryData, chartType, chartStyle)}
          <table>
            <thead>
              <tr>
                <th>Category</th>
                <th style="text-align: right;">Percentage (%)</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${catRows.length > 0 ? catRows : '<tr><td colspan="3" style="text-align: center;">No data</td></tr>'}
            </tbody>
          </table>
        </div>

        <div class="card" style="page-break-before: always;">
          <h2>Payment Mode</h2>
          ${paymentChartBase64
      ? `<div style="text-align: center; margin: 20px 0;"><img src="data:image/png;base64,${paymentChartBase64}" style="max-width: 100%; max-height: 250px; object-fit: contain;" /></div>`
      : generateSVGChart(paymentModeData, chartType, chartStyle)}
          <table>
            <thead>
              <tr>
                <th>Payment Mode</th>
                <th style="text-align: right;">Percentage (%)</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${modeRows.length > 0 ? modeRows : '<tr><td colspan="3" style="text-align: center;">No data</td></tr>'}
            </tbody>
          </table>
        </div>


      </body>
    </html>
  `;
};
