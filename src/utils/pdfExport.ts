import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { RetailerSummary, RetailerMonthly } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fe2 = (v: number) => `EUR ${Number(v || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;
const fn2 = (v: number) => Number(v || 0).toLocaleString('en', { maximumFractionDigits: 0 });
const fp2 = (v: number) => `${Number(v || 0).toFixed(1)}%`;

const hR = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16)
];

async function drawLogoW(pdf: jsPDF, x: number, y: number, h: number): Promise<number> {
  return new Promise((res) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const ar = img.naturalWidth / img.naturalHeight;
      try {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pdf.addImage(cv.toDataURL('image/png'), 'PNG', x, y, ar * h, h);
        }
      } catch (e) { console.warn('Logo fail', e); }
      res(ar * h);
    };
    img.onerror = () => res(0);
    img.src = 'https://cms-assets.ldsvcplatform.com/IT/s3fs-public/inline-images/logo_new1.png';
  });
}

function addFooter(pdf: jsPDF, n: number, W: number, H: number, M: number, branch: string, userName: string) {
  pdf.setDrawColor(200, 200, 210);
  pdf.setLineWidth(0.25);
  pdf.line(M, H - 9, W - M, H - 9);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'italic');
  pdf.setTextColor(140, 140, 150);
  pdf.text('CONFIDENTIAL -- Proprietary retailer performance data. For internal use only. Unauthorised distribution prohibited.', M, H - 5.5);
  pdf.setFont('helvetica', 'normal');
  const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  pdf.text(`Page ${n} | ${dateStr} | ${branch.replace('LMIT-HS-', '')} | Exported by: ${userName}`, W - M, H - 5.5, { align: 'right' });
}

async function addPageHeader(pdf: jsPDF, n: number, sub: string, W: number, M: number, id: string): Promise<number> {
  pdf.setFillColor(33, 38, 78);
  pdf.rect(0, 0, W, 13, 'F');
  const lw = await drawLogoW(pdf, M, 1.5, 10);
  if (lw > 0) {
    pdf.setDrawColor(200, 210, 240);
    pdf.setLineWidth(0.25);
    pdf.line(M + lw + 4, 2, M + lw + 4, 11);
  }
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(id, M + (lw > 0 ? lw + 6 : 0), 7);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(6.5);
  pdf.setTextColor(160, 175, 215);
  pdf.text(sub, M + (lw > 0 ? lw + 6 : 0), 11.5);
  pdf.setTextColor(150, 165, 200);
  pdf.text(`Page ${n} | CONFIDENTIAL`, W - M, 7, { align: 'right' });
  return 17;
}

function sectionHeader(pdf: jsPDF, lbl: string, yp: number, M: number, IW: number): number {
  pdf.setFillColor(33, 38, 78);
  pdf.rect(M, yp, IW, 6.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(7.5);
  pdf.setFont('helvetica', 'bold');
  pdf.text(lbl, M + 2.5, yp + 4.5);
  return yp + 8;
}

function tableHeader(pdf: jsPDF, cols: number[], hdrs: string[], yp: number, rh: number, M: number, IW: number): number {
  pdf.setFillColor(235, 232, 228);
  pdf.rect(M, yp, IW, rh, 'F');
  pdf.setTextColor(100, 100, 120);
  pdf.setFontSize(5.8);
  pdf.setFont('helvetica', 'bold');
  hdrs.forEach((h, i) => {
    pdf.text(h, cols[i], yp + rh - 1.5);
  });
  return yp + rh;
}

async function addChartToPDF(pdf: jsPDF, cid: string, x: number, yp: number, cw: number, ch: number, title: string) {
  const el = document.getElementById(cid);
  if (!el) return;
  try {
    const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
    const url = canvas.toDataURL('image/png', 0.93);
    pdf.setFillColor(250, 248, 245);
    pdf.setDrawColor(220, 215, 210);
    pdf.setLineWidth(0.25);
    pdf.roundedRect(x, yp, cw, ch + 7, 2, 2, 'FD');
    pdf.setTextColor(100, 100, 120);
    pdf.setFontSize(6);
    pdf.setFont('helvetica', 'bold');
    pdf.text(title, x + 2, yp + 4.5);
    pdf.addImage(url, 'PNG', x + 1, yp + 6, cw - 2, ch);
  } catch (e) {
    console.warn('Chart fail:', cid, e);
  }
}

export async function generatePDF(summary: RetailerSummary, monthly: RetailerMonthly[], user: any, setProgress?: (p: number) => void) {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const W = 210, H = 297, M = 10, IW = 190;

  const ID = summary.retailer_id;
  const BRANCH = summary.branch;
  const ZONE = summary.zone;
  const GA = summary.ga_cnt;
  const PI_L6 = summary.pi_l6;
  const PI_G6 = summary.pi_g6;
  const NP_L6 = summary.np_l6;
  const NP_G6 = summary.np_g6;
  const PORT_IN = summary.port_in;
  const PORT_OUT = summary.port_out;
  const DEDUCTIONS = summary.total_deductions;
  const PI_RAW = summary.pi_raw;
  const ADD_GARA = summary.add_gara;
  const PI_TOTAL = summary.pi_total;
  const INCENTIVE = summary.incentive;
  const RENEWAL = summary.renewal_rate;
  const PO_DED = summary.po_deduction;
  const CLAWBACK = summary.clawback;
  const REN_IMP = summary.renewal_impact;

  const years = [...new Set(monthly.map(m => m.month.substring(0, 4)))].sort();
  const yd = (yr: string) => {
    const mos = monthly.filter(m => m.month.startsWith(yr));
    const sum = (fn: (m: RetailerMonthly) => number) => mos.reduce((s, m) => s + fn(m), 0);
    return [
      sum(m => m.ga_cnt),      // 0
      sum(m => m.pi_l6),       // 1
      sum(m => m.pi_g6),       // 2
      sum(m => m.np_l6),       // 3
      sum(m => m.np_g6),       // 4
      sum(m => m.port_in),     // 5
      sum(m => m.port_out),    // 6
      sum(m => m.total_ded),   // 7
      sum(m => m.pi_raw),      // 8
      sum(m => m.add_gara),    // 9
      sum(m => m.pi_total),    // 10
      sum(m => m.incentive),   // 11
      mos.length,              // 12
      sum(m => m.po_deduction),// 13
      sum(m => m.clawback),    // 14
      sum(m => m.renewal_impact)// 15
    ];
  };

  const tD = () => pdf.setTextColor(33, 38, 78);
  const tM = () => pdf.setTextColor(100, 100, 120);
  const tW = () => pdf.setTextColor(255, 255, 255);
  const tG = () => pdf.setTextColor(5, 163, 93);
  const tR = () => pdf.setTextColor(240, 68, 56);
  const tB = () => pdf.setTextColor(0, 106, 224);
  const tY = () => pdf.setTextColor(155, 120, 0);
  const sF = (r: number, g: number, b: number) => pdf.setFillColor(r, g, b);

  let pn = 1;
  setProgress?.(10);

  // Page 1 — Cover
  sF(33, 38, 78);
  pdf.rect(0, 0, W, 50, 'F');
  const lw0 = await drawLogoW(pdf, M, 5, 16);
  if (lw0 > 0) {
    pdf.setDrawColor(200, 215, 240);
    pdf.setLineWidth(0.3);
    pdf.line(M + lw0 + 5, 5, M + lw0 + 5, 20);
  }
  tW();
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Retailer Performance Report', M + (lw0 > 0 ? lw0 + 8 : 0), 14);
  pdf.setFontSize(8.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(170, 185, 215);
  pdf.text('Year-on-Year Analysis: 2024 - 2025 - 2026 YTD', M + (lw0 > 0 ? lw0 + 8 : 0), 21);
  pdf.setFontSize(7.5);
  pdf.setTextColor(140, 155, 195);
  pdf.text(`Retailer: ${ID} | Branch: ${BRANCH.replace('LMIT-HS-', '')} | Zone: ${ZONE}`, M + (lw0 > 0 ? lw0 + 8 : 0), 27);
  const dateStrLong = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  pdf.text(`Report Date: ${dateStrLong} | Exported by: ${user.full_name} (${user.role})`, M + (lw0 > 0 ? lw0 + 8 : 0), 32.5);
  
  pdf.setTextColor(255, 213, 79);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fe2(INCENTIVE), W - M, 28, { align: 'right' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(150, 165, 205);
  pdf.text('All-Time Total Incentive (2024-2026)', W - M, 33, { align: 'right' });

  [['#006AE0', '2024'], ['#08DC7D', '2025'], ['#FFD54F', '2026 YTD']].forEach((p, i) => {
    const cx = W - M - 55 + (i * 19);
    const rgb = hR(p[0]);
    sF(rgb[0], rgb[1], rgb[2]);
    pdf.circle(cx, 44, 1.8, 'F');
    pdf.setTextColor(170, 185, 215);
    pdf.setFontSize(6.5);
    pdf.text(p[1], cx + 3, 44.8);
  });

  let y = 56;
  y = sectionHeader(pdf, 'YEAR-ON-YEAR SUMMARY', y, M, IW);
  const cw3 = IW / 3;
  ['2024', '2025', '2026'].forEach((y2, i) => {
    const d = yd(y2);
    const pv = i > 0 ? yd(['2024', '2025', '2026'][i - 1]) : null;
    const cx = M + i * cw3;
    const rgb = hR(y2 === '2024' ? '#006AE0' : y2 === '2025' ? '#08DC7D' : '#FFD54F');
    sF(255, 255, 255);
    pdf.setDrawColor(rgb[0], rgb[1], rgb[2]);
    pdf.setLineWidth(0.6);
    pdf.roundedRect(cx, y, cw3 - 2, 40, 2, 2, 'FD');
    sF(rgb[0], rgb[1], rgb[2]);
    pdf.roundedRect(cx + 2, y + 2, 26, 7, 1.5, 1.5, 'F');
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(y2 === '2026' ? 33 : 255, y2 === '2026' ? 38 : 255, y2 === '2026' ? 78 : 255);
    pdf.text(y2 + (y2 === '2026' ? ' YTD' : ''), cx + 15, y + 6.8, { align: 'center' });

    [['Total Incentive', fe2(d[11]), 'B'], ['GA Count', fn2(d[0]), 'D'], ['Port-In', fn2(d[5]), 'G'], ['PORT IN Inc.', fe2(d[10]), 'B'], ['Deductions', fe2(d[7]), 'R']].forEach((s: any, si) => {
      tM(); pdf.setFontSize(5.8); pdf.setFont('helvetica', 'normal'); pdf.text(s[0], cx + 2.5, y + 13 + si * 4.9);
      if (s[2] === 'B') tB(); else if (s[2] === 'R') tR(); else if (s[2] === 'G') tG(); else tD();
      pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.text(s[1], cx + cw3 - 3.5, y + 13 + si * 4.9, { align: 'right' });
    });
    if (pv && pv[11] > 0) {
      const cv = ((d[11] - pv[11]) / pv[11] * 100);
      cv >= 0 ? tG() : tR(); pdf.setFontSize(6.5); pdf.setFont('helvetica', 'bold');
      pdf.text((cv >= 0 ? '+ ' : '- ') + Math.abs(cv).toFixed(1) + '% vs prior yr', cx + 2.5, y + 39);
    }
  });
  y += 43;

  y = sectionHeader(pdf, 'ALL-TIME KPI SUMMARY', y + 1, M, IW);
  const kA = [['Total Incentive', fe2(INCENTIVE), 'B'], ['Monthly Avg', fe2(INCENTIVE / Math.max(monthly.length, 1)), 'D'], ['GA Activations', fn2(GA), 'D'], ['Port-In Total', fn2(PORT_IN), 'G'], ['PORT IN Inc.', fe2(PI_RAW), 'B'], ['GARA Bonus', fe2(ADD_GARA), 'Y'], ['Total PI Inc.', fe2(PI_TOTAL), 'B'], ['Total Deductions', fe2(DEDUCTIONS), 'R']];
  const kw2 = IW / 4;
  kA.forEach((k, i) => {
    const row = Math.floor(i / 4), col = i % 4, kx = M + col * kw2, ky = y + row * 14;
    sF(255, 255, 255); pdf.setDrawColor(220, 215, 210); pdf.setLineWidth(0.3); pdf.roundedRect(kx, ky, kw2 - 1.5, 12, 1.5, 1.5, 'FD');
    const ac = k[2] === 'B' ? hR('#006AE0') : k[2] === 'G' ? hR('#08DC7D') : k[2] === 'R' ? hR('#F04438') : k[2] === 'Y' ? [180, 140, 0] : [100, 100, 120];
    sF(ac[0], ac[1], ac[2]); pdf.roundedRect(kx, ky, kw2 - 1.5, 2.5, 1, 1, 'F');
    tM(); pdf.setFontSize(5.5); pdf.setFont('helvetica', 'normal'); pdf.text(k[0], kx + 2, ky + 6);
    if (k[2] === 'B') tB(); else if (k[2] === 'R') tR(); else if (k[2] === 'G') tG(); else if (k[2] === 'Y') tY(); else tD();
    pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.text(k[1], kx + 2, ky + 11.5);
  });
  y += 30;

  const ins2 = [];
  const y24 = yd('2024'), y25 = yd('2025');
  const yc2 = y24[11] > 0 ? ((y25[11] - y24[11]) / y24[11] * 100) : null;
  if (yc2 !== null && yc2 > 10) ins2.push(`Strong 2025 Growth: +${yc2.toFixed(0)}% vs 2024 (${fe2(y24[11])} -> ${fe2(y25[11])})`);
  else if (yc2 !== null && yc2 < -10) ins2.push(`2025 Decline: -${Math.abs(yc2).toFixed(0)}% vs 2024`);
  if (PI_TOTAL > INCENTIVE * 0.4) ins2.push(`Port-In Driven: ${fp2(PI_TOTAL / INCENTIVE * 100)} from port-in (${fe2(PI_TOTAL)})`);
  if (ADD_GARA > 0) ins2.push(`GARA Bonus Earner: ${fe2(ADD_GARA)} additional bonus`);
  if (CLAWBACK > INCENTIVE * 0.25) ins2.push(`High Clawback Risk: ${fe2(CLAWBACK)} = ${fp2(CLAWBACK / INCENTIVE * 100)} of incentive`);
  if (PORT_IN > 200) ins2.push(`Strong Port-In: ${fn2(PORT_IN)} total port-ins`);
  if (RENEWAL > 70) ins2.push(`High Renewal Rate: ${fp2(RENEWAL)} average`);
  if (ins2.length === 0) ins2.push(`Active ${monthly.length} months, cumulative ${fe2(INCENTIVE)}`);

  y = sectionHeader(pdf, 'PERFORMANCE INSIGHTS', y + 1, M, IW);
  ins2.slice(0, 5).forEach((txt, i) => {
    sF(i % 2 === 0 ? 252 : 248, i % 2 === 0 ? 249 : 246, i % 2 === 0 ? 247 : 244);
    pdf.rect(M, y, IW, 6.5, 'F'); tD(); pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); pdf.text(`- ${txt}`, M + 3, y + 4.5);
    y += 6.5;
  });
  y += 2;

  const HW = (IW - 3) / 2, HR = 52;
  setProgress?.(30);
  await addChartToPDF(pdf, 'cYB', M, y, HW, HR, 'Annual Incentive YoY');
  await addChartToPDF(pdf, 'cMO', M + HW + 3, y, HW, HR, 'Monthly Incentive Overlay (3 Years)');
  y += HR + 10;
  await addChartToPDF(pdf, 'cMF', M, y, IW, 36, 'Full Monthly Incentive (PORT IN + GA-Based)');
  addFooter(pdf, pn, W, H, M, BRANCH, user.full_name);

  // Page 2 — Tables
  pn++; setProgress?.(50);
  pdf.addPage(); y = await addPageHeader(pdf, pn, 'Plan Activation & Deductions Detail', W, M, ID);
  y = sectionHeader(pdf, 'ANNUAL PLAN ACTIVATION', y, M, IW);
  const pC = [M + 1, 30, 53, 76, 99, 120, 140, 161, 183];
  y = tableHeader(pdf, pC, ['Year', 'P-IN <=6.99', 'P-IN >6.99', 'NEW <=6.99', 'NEW >6.99', 'Port-In', 'PORT IN Inc.', 'GARA Bonus', 'Total PI Inc.'], y, 6, M, IW);
  ['2024', '2025', '2026'].forEach((y2, ri) => {
    const d = yd(y2); sF(ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 250 : 247, ri % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 6.5, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
    [String(y2 + (y2 === '2026' ? ' YTD' : '')), fn2(d[1]), fn2(d[2]), fn2(d[3]), fn2(d[4]), fn2(d[5]), fe2(d[8]), fe2(d[9]), fe2(d[10])].forEach((v, i) => {
      if (i === 5) tG(); else if (i >= 6) tB(); else tD(); pdf.text(v, pC[i], y + 4.5);
    }); y += 6.5;
  });
  sF(220, 215, 210); pdf.rect(M, y, IW, 6.5, 'F'); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  ['TOTAL', fn2(PI_L6), fn2(PI_G6), fn2(NP_L6), fn2(NP_G6), fn2(PORT_IN), fe2(PI_RAW), fe2(ADD_GARA), fe2(PI_TOTAL)].forEach((v, i) => {
    if (i === 5) tG(); else if (i >= 6) tB(); else tD(); pdf.text(v, pC[i], y + 4.5);
  }); y += 10;
  y += 0.5;
  await addChartToPDF(pdf, 'cPI', M, y, HW, HR, 'P-IN <=6.99 vs P-IN >6.99');
  await addChartToPDF(pdf, 'cNP', M + HW + 3, y, HW, HR, 'NEW <=6.99 vs NEW >6.99');
  y += HR + 10;

  y = sectionHeader(pdf, 'PORT-IN INCENTIVE BY YEAR', y, M, IW);
  const piC = [M + 1, 42, 80, 120, 155, 185];
  y = tableHeader(pdf, piC, ['Year', 'PORT IN Incentive', 'GARA Bonus', 'Total Port-In Inc.', 'vs Prior Year', '% of Total Inc.'], y, 6, M, IW);
  ['2024', '2025', '2026'].forEach((y2, ri) => {
    const d = yd(y2), pv = ri > 0 ? yd(['2024', '2025', '2026'][ri - 1]) : null;
    sF(ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 252 : 249, ri % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 6.5, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); tD(); pdf.text(String(y2 + (y2 === '2026' ? ' YTD' : '')), piC[0], y + 4.5);
    tB(); pdf.text(fe2(d[8]), piC[1], y + 4.5); tY(); pdf.text(fe2(d[9]), piC[2], y + 4.5);
    tB(); pdf.setFont('helvetica', 'bold'); pdf.text(fe2(d[10]), piC[3], y + 4.5); pdf.setFont('helvetica', 'normal');
    if (pv && pv[10] > 0) { const cv = ((d[10] - pv[10]) / pv[10] * 100); cv >= 0 ? tG() : tR(); pdf.text((cv >= 0 ? '+ ' : '- ') + Math.abs(cv).toFixed(1) + '%', piC[4], y + 4.5); }
    else { tM(); pdf.text('--', piC[4], y + 4.5); }
    tD(); pdf.text(d[11] > 0 ? fp2(d[10] / d[11] * 100) : '--', piC[5], y + 4.5); y += 6.5;
  });
  sF(220, 215, 210); pdf.rect(M, y, IW, 6.5, 'F'); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  tD(); pdf.text('TOTAL', piC[0], y + 4.5); tB(); pdf.text(fe2(PI_RAW), piC[1], y + 4.5);
  tY(); pdf.text(fe2(ADD_GARA), piC[2], y + 4.5); tB(); pdf.text(fe2(PI_TOTAL), piC[3], y + 4.5);
  tD(); pdf.text(INCENTIVE > 0 ? fp2(PI_TOTAL / INCENTIVE * 100) : '--', piC[5], y + 4.5); y += 11;
  y += 0.5;
  await addChartToPDF(pdf, 'cPF', M, y, HW, HR, 'Port-In vs Port-Out Monthly');
  await addChartToPDF(pdf, 'cPII', M + HW + 3, y, HW, HR, 'PORT IN Inc. + GARA Monthly');
  y += HR + 10;
  await addChartToPDF(pdf, 'cPY', M, y, HW, HR, 'Plan Mix by Year');
  await addChartToPDF(pdf, 'cGA', M + HW + 3, y, HW, HR, 'GA Activations Overlay');
  addFooter(pdf, pn, W, H, M, BRANCH, user.full_name);

  // Page 3 — Monthly data
  pn++; setProgress?.(70);
  pdf.addPage(); y = await addPageHeader(pdf, pn, 'Port-In Monthly Detail & Full Monthly Breakdown', W, M, ID);
  y = sectionHeader(pdf, 'PORT-IN ACTIVATION & INCENTIVE - MoM', y, M, IW);
  const mC = [M + 1, 18, 27, 40, 53, 66, 77, 88, 110, 135, 160, 185];
  y = tableHeader(pdf, mC, ['Month', 'Yr', 'P-IN<=6', 'P-IN>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PORT IN Inc.', 'GARA Bonus', 'Total PI Inc.', '%Total'], y, 6, M, IW);
  let hasPiR = false, ri2 = 0;
  const sortedMonthly = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
  sortedMonthly.forEach((mo) => {
    if (mo.port_in === 0 && mo.pi_total === 0) return;
    hasPiR = true; const yr3 = mo.month.startsWith('2026') ? '26' : mo.month.startsWith('2025') ? '25' : '24';
    if (y > 275) { addFooter(pdf, pn, W, H, M, BRANCH, user.full_name); pn++; pdf.addPage(); y = 17; y = tableHeader(pdf, mC, ['Month', 'Yr', 'P-IN<=6', 'P-IN>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PORT IN Inc.', 'GARA Bonus', 'Total PI Inc.', '%Total'], y, 6, M, IW); }
    sF(ri2 % 2 === 0 ? 252 : 248, ri2 % 2 === 0 ? 250 : 247, ri2 % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 5.5, 'F');
    pdf.setFontSize(6.5); pdf.setFont('helvetica', 'normal'); const pctT = mo.incentive > 0 ? fp2(mo.pi_total / mo.incentive * 100) : '0%';
    const [yr, mon] = mo.month.split('-'); const mName = MONTH_NAMES[parseInt(mon) - 1];
    [mName, yr3, fn2(mo.pi_l6), fn2(mo.pi_g6), fn2(mo.np_l6), fn2(mo.np_g6), fn2(mo.port_in), fn2(mo.port_out), fe2(mo.pi_raw), fe2(mo.add_gara), fe2(mo.pi_total), pctT].forEach((v, i) => {
      if (i === 6) tG(); else if (i === 7 && mo.port_out > 0) tR(); else if (i === 8) tB(); else if (i === 9) tY(); else if (i === 10) tB(); else tD(); pdf.text(v, mC[i], y + 3.9);
    }); y += 5.5; ri2++;
  });
  if (!hasPiR) { tM(); pdf.setFontSize(8); pdf.text('No port-in activity.', M + 3, y + 5); y += 10; }
  y += 2;
  await addChartToPDF(pdf, 'cPD', M, y, IW, 40, 'Port-In Incentive vs Deductions - Annual'); y += 54;
  addFooter(pdf, pn, W, H, M, BRANCH, user.full_name);

  // Page 4 — Full Monthly Tables
  pn++; setProgress?.(85);
  pdf.addPage(); y = await addPageHeader(pdf, pn, 'Performance Charts', W, M, ID);
  if (y < 200) {
    y += 4; y = sectionHeader(pdf, 'COMPLETE MONTHLY DATA', y, M, IW);
    const fC = [M + 1, 16, 23, 31, 39, 47, 55, 63, 71, 84, 97, 110, 123, 138, 153, 168, 183, 195];
    y = tableHeader(pdf, fC, ['Month', 'Yr', 'GA', 'PI<=6', 'PI>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PO Ded', 'Clawbk', 'RenImp', 'TotDed', 'PIInc', 'GARA', 'PITot', 'Ren%', 'TotInc'], y, 6, M, IW);
    let ri3 = 0;
    sortedMonthly.forEach((mo) => {
      const yr3 = mo.month.startsWith('2026') ? '26' : mo.month.startsWith('2025') ? '25' : '24';
      if (y > 282) { addFooter(pdf, pn, W, H, M, BRANCH, user.full_name); pn++; pdf.addPage(); y = 17; y = tableHeader(pdf, fC, ['Month', 'Yr', 'GA', 'PI<=6', 'PI>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PO Ded', 'Clawbk', 'RenImp', 'TotDed', 'PIInc', 'GARA', 'PITot', 'Ren%', 'TotInc'], y, 6, M, IW); }
      sF(ri3 % 2 === 0 ? 252 : 248, ri3 % 2 === 0 ? 250 : 247, ri3 % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 5.2, 'F');
      pdf.setFontSize(6); pdf.setFont('helvetica', 'normal');
      const [yr, mon] = mo.month.split('-'); const mName = MONTH_NAMES[parseInt(mon) - 1];
      const vals = [mName, yr3, fn2(mo.ga_cnt), fn2(mo.pi_l6), fn2(mo.pi_g6), fn2(mo.np_l6), fn2(mo.np_g6), fn2(mo.port_in), fn2(mo.port_out), fe2(mo.po_deduction), fe2(mo.clawback), fe2(mo.renewal_impact), fe2(mo.total_ded), fe2(mo.pi_raw), fe2(mo.add_gara), fe2(mo.pi_total), fp2(mo.renewal_rate), fe2(mo.incentive)];
      vals.forEach((v, i) => {
        if (i === 7 && mo.port_in > 0) tG(); else if (i === 8 && mo.port_out > 0) tR(); else if (i >= 9 && i <= 12 && mo.total_ded > 0) tR(); else if (i === 13 && mo.pi_raw > 0) tB(); else if (i === 14 && mo.add_gara > 0) tY(); else if (i === 15 && mo.pi_total > 0) tB(); else if (i === 17 && mo.incentive > 0) tG(); else tD();
        if (i === 17 || i === 12) pdf.setFont('helvetica', 'bold'); else pdf.setFont('helvetica', 'normal'); pdf.text(v, fC[i], y + 3.8);
      }); y += 5.2; ri3++;
    });
    y += 2; sF(220, 215, 210); pdf.rect(M, y, IW, 6, 'F'); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
    tD(); pdf.text('TOTALS', fC[0], y + 4.2);
    [[2, GA], [7, PORT_IN], [8, PORT_OUT], [9, PO_DED], [10, CLAWBACK], [11, REN_IMP], [12, DEDUCTIONS], [13, PI_RAW], [14, ADD_GARA], [15, PI_TOTAL], [17, INCENTIVE]].forEach((p) => {
      const ci = p[0] as number, val = p[1] as number;
      if (ci === 7) tG(); else if (ci === 8 || (ci >= 9 && ci <= 12)) tR(); else if (ci >= 13 && ci <= 15) tB(); else if (ci === 17) tG(); else tD();
      pdf.text(ci >= 9 ? fe2(val) : fn2(val), fC[ci], y + 4.2);
    });
  }
  y += 10;
  y = sectionHeader(pdf, 'ANNUAL COMPARISON - ALL METRICS', y, M, IW);
  const aC = [M + 1, 22, 36, 48, 60, 72, 84, 96, 110, 124, 138, 152, 165, 178, 192];
  y = tableHeader(pdf, aC, ['Year', 'GA', 'PI<=6', 'PI>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PO Ded', 'Clawbk', 'RenImp', 'TotDed', 'PIInc', 'GARA', 'TotInc'], y, 6, M, IW);
  ['2024', '2025', '2026'].forEach((y2, ri) => {
    const d = yd(y2); sF(ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 250 : 247, ri % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 7, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); const rgb2 = hR(y2 === '2024' ? '#006AE0' : y2 === '2025' ? '#08DC7D' : '#FFD54F');
    sF(rgb2[0], rgb2[1], rgb2[2]); pdf.circle(M + 3.5, y + 3.5, 1.5, 'F'); tD(); pdf.text(String(y2 + (y2 === '2026' ? ' YTD' : '')), M + 6, y + 4.8);
    [fn2(d[0]), fn2(d[1]), fn2(d[2]), fn2(d[3]), fn2(d[4]), fn2(d[5]), fn2(d[6]), fe2(d[13]), fe2(d[14]), fe2(d[15]), fe2(d[7]), fe2(d[8]), fe2(d[9]), fe2(d[11])].forEach((v, idx2) => {
      const ci = idx2 + 1; if (ci === 6) tG(); else if (ci === 7 || (ci >= 8 && ci <= 11)) tR(); else if (ci === 12 || ci === 13) tB(); else if (ci === 14) tG(); else tD(); pdf.text(v, aC[ci], y + 4.8);
    }); y += 7;
  });
  sF(220, 215, 210); pdf.rect(M, y, IW, 7, 'F'); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  tD(); pdf.text('TOTAL', aC[0], y + 4.8);
  [fn2(GA), fn2(PI_L6), fn2(PI_G6), fn2(NP_L6), fn2(NP_G6), fn2(PORT_IN), fn2(PORT_OUT), fe2(PO_DED), fe2(CLAWBACK), fe2(REN_IMP), fe2(DEDUCTIONS), fe2(PI_RAW), fe2(ADD_GARA), fe2(INCENTIVE)].forEach((v, idx2) => {
    const ci = idx2 + 1; if (ci === 6) tG(); else if (ci === 7 || (ci >= 8 && ci <= 11)) tR(); else if (ci === 12 || ci === 13) tB(); else if (ci === 14) tG(); else tD(); pdf.text(v, aC[ci], y + 4.8);
  });
  addFooter(pdf, pn, W, H, M, BRANCH, user.full_name);

  // Page 5 — Deduction charts
  pn++; setProgress?.(95);
  pdf.addPage(); y = await addPageHeader(pdf, pn, 'Deductions & Renewal %', W, M, ID);
  y = sectionHeader(pdf, 'DEDUCTIONS BY YEAR', y, M, IW);
  const dC = [M + 1, 40, 78, 116, 154, 185];
  y = tableHeader(pdf, dC, ['Year', 'Port-Out Deduction', 'Usage Clawback', 'Renewal Impact', 'Total Deductions', '% of Incentive'], y, 6, M, IW);
  ['2024', '2025', '2026'].forEach((y2, ri) => {
    const d = yd(y2); sF(ri % 2 === 0 ? 255 : 250, ri % 2 === 0 ? 248 : 246, ri % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 6.5, 'F');
    pdf.setFontSize(7); pdf.setFont('helvetica', 'normal'); tD(); pdf.text(String(y2 + (y2 === '2026' ? ' YTD' : '')), dC[0], y + 4.5);
    tR(); [fe2(d[13]), fe2(d[14]), fe2(d[15]), fe2(d[7])].forEach((v, i) => { pdf.text(v, dC[i + 1], y + 4.5); });
    tD(); pdf.text(d[11] > 0 ? fp2(d[7] / d[11] * 100) : '--', dC[5], y + 4.5); y += 6.5;
  });
  sF(220, 215, 210); pdf.rect(M, y, IW, 6.5, 'F'); pdf.setFontSize(7); pdf.setFont('helvetica', 'bold');
  tD(); pdf.text('TOTAL', dC[0], y + 4.5); tR(); [fe2(PO_DED), fe2(CLAWBACK), fe2(REN_IMP), fe2(DEDUCTIONS)].forEach((v, i) => { pdf.text(v, dC[i + 1], y + 4.5); });
  tD(); pdf.text(INCENTIVE > 0 ? fp2(DEDUCTIONS / INCENTIVE * 100) : '--', dC[5], y + 4.5); y += 11;
  y += 4;
  await addChartToPDF(pdf, 'cDM', M, y, HW, HR, 'Monthly Deductions (Stacked)');
  await addChartToPDF(pdf, 'cDY', M + HW + 3, y, HW, HR, 'Annual Deductions Breakdown');
  y += HR + 10;
  await addChartToPDF(pdf, 'cRN', M, y, IW, 60, 'Renewal Rate Monthly Trend');
  addFooter(pdf, pn, W, H, M, BRANCH, user.full_name);

  setProgress?.(100);
  pdf.save(`Retailer_Report_${ID}_${new Date().toISOString().split('T')[0]}.pdf`);
}
