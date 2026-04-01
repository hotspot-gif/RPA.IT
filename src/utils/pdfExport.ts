import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { RetailerSummary, RetailerMonthly } from '@/types';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const fe2 = (v: number) => `EUR ${Number(v || 0).toLocaleString('en', { maximumFractionDigits: 0 })}`;
const fn2 = (v: number) => Number(v || 0).toLocaleString('en', { maximumFractionDigits: 0 });

const hR = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16)
];

async function drawLogoW(pdf: jsPDF, x: number, y: number, h: number): Promise<number> {
  return new Promise((res) => {
    const timeout = setTimeout(() => res(0), 1000);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      clearTimeout(timeout);
      const ar = img.naturalWidth / img.naturalHeight;
      try {
        const cv = document.createElement('canvas');
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        const ctx = cv.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          pdf.addImage(cv.toDataURL('image/png'), 'PNG', x, y, ar * h, h, undefined, 'FAST');
        }
      } catch (e) { console.warn('Logo fail', e); }
      res(ar * h);
    };
    img.onerror = () => { clearTimeout(timeout); res(0); };
    img.src = 'https://cms-assets.ldsvcplatform.com/IT/s3fs-public/inline-images/logo_new1.png';
  });
}

function addFooter(pdf: jsPDF, n: number, W: number, H: number, M: number, branch: string, userName: string) {
  pdf.setDrawColor(200, 200, 210);
  pdf.setLineWidth(0.2);
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

function getCaptureRect(el: HTMLElement) {
  const elRect = el.getBoundingClientRect();
  let left = elRect.left;
  let top = elRect.top;
  let right = elRect.right;
  let bottom = elRect.bottom;

  const parts: Element[] = [
    ...Array.from(el.querySelectorAll('svg')),
    ...Array.from(el.querySelectorAll('.recharts-legend-wrapper'))
  ];

  for (const p of parts) {
    const r = (p as HTMLElement).getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) continue;
    left = Math.min(left, r.left);
    top = Math.min(top, r.top);
    right = Math.max(right, r.right);
    bottom = Math.max(bottom, r.bottom);
  }

  const width = Math.max(1, right - left);
  const height = Math.max(1, bottom - top);
  return { left, top, width, height };
}

async function fastChartCapture(el: HTMLElement): Promise<string | null> {
  const svgs = el.querySelectorAll('svg');
  if (svgs.length === 0) return null;

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const scale = 2.5;
  const captureRect = getCaptureRect(el);

  canvas.width = Math.ceil(captureRect.width * scale);
  canvas.height = Math.ceil(captureRect.height * scale);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);

  for (let i = 0; i < svgs.length; i++) {
    const svg = svgs[i];
    
    const svgRect = svg.getBoundingClientRect();
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement;
    clonedSvg.setAttribute('width', svgRect.width.toString());
    clonedSvg.setAttribute('height', svgRect.height.toString());
    
    const xml = new XMLSerializer().serializeToString(clonedSvg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const image64 = 'data:image/svg+xml;base64,' + svg64;

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const x = svgRect.left - captureRect.left;
        const y = svgRect.top - captureRect.top;
        ctx.drawImage(img, x, y, svgRect.width, svgRect.height);
        resolve();
      };
      img.onerror = () => resolve();
      img.src = image64;
    });
  }

  const legends = el.querySelectorAll('.recharts-legend-wrapper');
  for (let i = 0; i < legends.length; i++) {
    const legendEl = legends[i] as HTMLElement;
    const legendRect = legendEl.getBoundingClientRect();
    if (legendRect.width <= 0 || legendRect.height <= 0) continue;
    try {
      const legendCanvas = await html2canvas(legendEl, {
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        logging: false,
        imageTimeout: 800
      });
      const x = legendRect.left - captureRect.left;
      const y = legendRect.top - captureRect.top;
      ctx.drawImage(legendCanvas, x, y, legendRect.width, legendRect.height);
      legendCanvas.width = 0;
      legendCanvas.height = 0;
    } catch {
    }
  }

  const dataUrl = canvas.toDataURL('image/png');
  canvas.width = 0; canvas.height = 0;
  return dataUrl;
}

async function addChartToPDF(pdf: jsPDF, cid: string, x: number, yp: number, cw: number, ch: number, title: string) {
  const el = document.getElementById(cid);
  pdf.setFillColor(250, 248, 245);
  pdf.setDrawColor(220, 215, 210);
  pdf.setLineWidth(0.2);
  pdf.roundedRect(x, yp, cw, ch + 7, 2, 2, 'FD');
  pdf.setTextColor(100, 100, 120);
  pdf.setFontSize(6);
  pdf.setFont('helvetica', 'bold');
  pdf.text(title, x + 2, yp + 4.5);

  if (!el) return;

  try {
    // 1. Try high-res SVG capture
    let url = await fastChartCapture(el);
    
    // 2. Fallback to html2canvas if SVG capture failed
    if (!url) {
      const canvas = await html2canvas(el, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff', 
        logging: false
      });
      url = canvas.toDataURL('image/png');
      canvas.width = 0; canvas.height = 0;
    }

    if (url) {
      // Calculate aspect ratio to prevent stretching
      const captureRect = getCaptureRect(el);
      const aspectRatio = captureRect.width / captureRect.height;
      
      // Calculate display width/height in PDF while maintaining aspect ratio
      // We prioritize the provided width (cw - 2) and adjust height
      const displayW = cw - 2;
      const displayH = displayW / aspectRatio;
      
      // If the calculated height is too tall for the box, we scale by height instead
      let finalW = displayW;
      let finalH = displayH;
      
      if (finalH > ch) {
        finalH = ch;
        finalW = finalH * aspectRatio;
      }

      // Center the image in the box
      const offsetX = (cw - 2 - finalW) / 2;
      const offsetY = (ch - finalH) / 2;

      pdf.addImage(url, 'PNG', x + 1 + offsetX, yp + 6 + offsetY, finalW, finalH, undefined, 'FAST');
    }
  } catch (e) {
    console.warn('Capture fail', cid, e);
  }
}

export async function generatePDF(summary: RetailerSummary, monthly: RetailerMonthly[], user: any, setProgress?: (p: number) => void) {
  try {
    const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4', compress: true });
    const W = 210, H = 297, M = 10, IW = 190;
    const ID = summary.retailer_id;
    const BRANCH = summary.branch;
    const ZONE = summary.zone;
    const INCENTIVE = summary.incentive;
    const GA = summary.ga_cnt;
    const PORT_IN = summary.port_in;
    const PI_RAW = summary.pi_raw;
    const ADD_GARA = summary.add_gara;
    const PI_TOTAL = summary.pi_total;
    const DEDUCTIONS = summary.total_deductions;

    const yd = (yr: string) => {
      const mos = monthly.filter(m => m.month.startsWith(yr));
      const sum = (fn: (m: RetailerMonthly) => number) => mos.reduce((s, m) => s + fn(m), 0);
      return [sum(m=>m.ga_cnt), sum(m=>m.pi_l6), sum(m=>m.pi_g6), sum(m=>m.np_l6), sum(m=>m.np_g6), sum(m=>m.port_in), sum(m=>m.port_out), sum(m=>m.total_ded), sum(m=>m.pi_raw), sum(m=>m.add_gara), sum(m=>m.pi_total), sum(m=>m.incentive), mos.length, sum(m=>m.po_deduction), sum(m=>m.clawback), sum(m=>m.renewal_impact)];
    };

    const tD = () => pdf.setTextColor(33, 38, 78);
    const tM = () => pdf.setTextColor(100, 100, 120);
    const tW = () => pdf.setTextColor(255, 255, 255);
    const tG = () => pdf.setTextColor(5, 163, 93);
    const tR = () => pdf.setTextColor(240, 68, 56);
    const tB = () => pdf.setTextColor(0, 106, 224);
    const sF = (r: number, g: number, b: number) => pdf.setFillColor(r, g, b);

    // Page 1
    setProgress?.(10);
    sF(33, 38, 78); pdf.rect(0, 0, W, 50, 'F');
    const lw0 = await drawLogoW(pdf, M, 5, 16);
    tW(); pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.text('Retailer Performance Report', M + (lw0 > 0 ? lw0 + 8 : 0), 14);
    pdf.setFontSize(8.5); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(170, 185, 215);
    pdf.text('Year-on-Year Analysis: 2024 - 2025 - 2026 YTD', M + (lw0 > 0 ? lw0 + 8 : 0), 21);
    pdf.setFontSize(7.5); pdf.setTextColor(140, 155, 195);
    pdf.text(`Retailer: ${ID} | Branch: ${BRANCH.replace('LMIT-HS-', '')} | Zone: ${ZONE}`, M + (lw0 > 0 ? lw0 + 8 : 0), 27);
    pdf.setTextColor(255, 213, 79); pdf.setFontSize(16); pdf.setFont('helvetica', 'bold'); pdf.text(fe2(INCENTIVE), W - M, 28, { align: 'right' });
    
    let y = 56; y = sectionHeader(pdf, 'YEAR-ON-YEAR SUMMARY', y, M, IW);
    const cw3 = IW / 3;
    ['2024', '2025', '2026'].forEach((y2, i) => {
      const d = yd(y2); const cx = M + i * cw3; const rgb = hR(y2 === '2024' ? '#006AE0' : y2 === '2025' ? '#08DC7D' : '#FFD54F');
      sF(255, 255, 255); pdf.setDrawColor(rgb[0], rgb[1], rgb[2]); pdf.setLineWidth(0.4); pdf.roundedRect(cx, y, cw3 - 2, 40, 2, 2, 'FD');
      sF(rgb[0], rgb[1], rgb[2]); pdf.roundedRect(cx + 2, y + 2, 26, 7, 1.5, 1.5, 'F');
      pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(y2 === '2026' ? 33 : 255, y2 === '2026' ? 38 : 255, y2 === '2026' ? 78 : 255);
      pdf.text(y2 + (y2 === '2026' ? ' YTD' : ''), cx + 15, y + 6.8, { align: 'center' });
      [['Total Inc.', fe2(d[11]), 'B'], ['GA Count', fn2(d[0]), 'D'], ['Port-In', fn2(d[5]), 'G'], ['PI Inc.', fe2(d[10]), 'B'], ['Deductions', fe2(d[7]), 'R']].forEach((s: any, si) => {
        tM(); pdf.setFontSize(5.8); pdf.setFont('helvetica', 'normal'); pdf.text(s[0], cx + 2.5, y + 13 + si * 4.9);
        if (s[2] === 'B') tB(); else if (s[2] === 'R') tR(); else if (s[2] === 'G') tG(); else tD();
        pdf.setFontSize(7); pdf.setFont('helvetica', 'bold'); pdf.text(s[1], cx + cw3 - 3.5, y + 13 + si * 4.9, { align: 'right' });
      });
    });
    y += 48;

    y = sectionHeader(pdf, 'ALL-TIME KPI SUMMARY', y, M, IW);
    const kpis: Array<[string, string, 'B' | 'G' | 'R' | 'D' | 'Y']> = [
      ['Total Incentive', fe2(INCENTIVE), 'B'],
      ['Monthly Avg', fe2(INCENTIVE / Math.max(monthly.length, 1)), 'D'],
      ['GA Activations', fn2(GA), 'D'],
      ['Port-In Total', fn2(PORT_IN), 'G'],
      ['PORT IN Inc.', fe2(PI_RAW), 'B'],
      ['GARA Bonus', fe2(ADD_GARA), 'Y'],
      ['Total PI Inc.', fe2(PI_TOTAL), 'B'],
      ['Total Deductions', fe2(DEDUCTIONS), 'R']
    ];
    const tw = IW / 4;
    const th = 12;
    kpis.forEach((k, idx) => {
      const row = Math.floor(idx / 4);
      const col = idx % 4;
      const kx = M + col * tw;
      const ky = y + row * (th + 2);
      sF(255, 255, 255);
      pdf.setDrawColor(220, 215, 210);
      pdf.setLineWidth(0.25);
      pdf.roundedRect(kx, ky, tw - 1.5, th, 1.5, 1.5, 'FD');
      const ac = k[2] === 'B' ? hR('#006AE0') : k[2] === 'G' ? hR('#08DC7D') : k[2] === 'R' ? hR('#F04438') : k[2] === 'Y' ? [180, 140, 0] : [100, 100, 120];
      sF(ac[0], ac[1], ac[2]);
      pdf.roundedRect(kx, ky, tw - 1.5, 2.4, 1.2, 1.2, 'F');
      tM();
      pdf.setFontSize(5.4);
      pdf.setFont('helvetica', 'normal');
      pdf.text(k[0], kx + 2, ky + 6);
      if (k[2] === 'B') tB(); else if (k[2] === 'R') tR(); else if (k[2] === 'G') tG(); else tD();
      pdf.setFontSize(7.5);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k[1], kx + 2, ky + 11);
    });
    y += (th + 2) * 2 + 6;
    const HW = (IW - 3) / 2, HR = 45;
    setProgress?.(25);
    await addChartToPDF(pdf, 'cYB', M, y, HW, HR, 'Annual Incentive YoY');
    await addChartToPDF(pdf, 'cMO', M + HW + 3, y, HW, HR, 'Monthly Incentive Overlay');
    y += HR + 10;
    y += HR + 10;
    await addChartToPDF(pdf, 'cMF', M, y, IW, 36, 'Full Monthly Incentive Timeline');
    addFooter(pdf, 1, W, H, M, BRANCH, user.full_name);

    // Page 2
    setProgress?.(35);
    pdf.addPage(); y = await addPageHeader(pdf, 2, 'GA Report', W, M, ID);
    y = sectionHeader(pdf, 'GA REPORT', y, M, IW);
    await addChartToPDF(pdf, 'cGA', M, y, IW, 120, 'GA Activations - Calendar Overlay');
    y += 135;
    await addChartToPDF(pdf, 'cGT', M, y, IW, 90, 'GA Activations - Full Timeline');
    addFooter(pdf, 2, W, H, M, BRANCH, user.full_name);

    // Page 3
    setProgress?.(50);
    pdf.addPage(); y = await addPageHeader(pdf, 3, 'Plan Activation & Deductions Detail', W, M, ID);
    y = sectionHeader(pdf, 'ANNUAL PLAN ACTIVATION', y, M, IW);
    const pC = [M + 1, 30, 53, 76, 99, 120, 140, 161, 183];
    y = tableHeader(pdf, pC, ['Year', 'PI<=6', 'PI>6', 'NP<=6', 'NP>6', 'P-In', 'PI Inc.', 'Gara', 'Total PI'], y, 6, M, IW);
    ['2024', '2025', '2026'].forEach((y2, ri) => {
      const d = yd(y2); sF(ri % 2 === 0 ? 252 : 248, ri % 2 === 0 ? 250 : 247, ri % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 6.5, 'F');
      pdf.setFontSize(7); pdf.setFont('helvetica', 'normal');
      [String(y2), fn2(d[1]), fn2(d[2]), fn2(d[3]), fn2(d[4]), fn2(d[5]), fe2(d[8]), fe2(d[9]), fe2(d[10])].forEach((v, i) => {
        if (i === 5) tG(); else if (i >= 6) tB(); else tD(); pdf.text(v, pC[i], y + 4.5);
      }); y += 6.5;
    });
    y += 10; setProgress?.(65);
    await addChartToPDF(pdf, 'cPI', M, y, HW, HR, 'P-IN <=6.99 vs P-IN >6.99');
    await addChartToPDF(pdf, 'cNP', M + HW + 3, y, HW, HR, 'NEW <=6.99 vs NEW >6.99');
    y += HR + 10;
    await addChartToPDF(pdf, 'cPY', M, y, IW, HR, 'Plan Mix by Year');
    addFooter(pdf, 3, W, H, M, BRANCH, user.full_name);

    // Page 4
    setProgress?.(78);
    pdf.addPage(); y = await addPageHeader(pdf, 4, 'Port-In Monthly Detail', W, M, ID);
    y = sectionHeader(pdf, 'PORT-IN ACTIVATION & INCENTIVE - MoM', y, M, IW);
    const mC = [M + 1, 18, 27, 40, 53, 66, 77, 88, 110, 135, 160, 185];
    y = tableHeader(pdf, mC, ['Month', 'Yr', 'PI<=6', 'PI>6', 'NP<=6', 'NP>6', 'P-In', 'P-Out', 'PI Inc.', 'Gara', 'Tot PI', '%Tot'], y, 6, M, IW);
    const sortedMonthly = [...monthly].sort((a, b) => a.month.localeCompare(b.month));
    let ri2 = 0;
    sortedMonthly.slice(-12).forEach((mo) => {
      const yr3 = mo.month.split('-')[0].slice(2); const mName = MONTH_NAMES[parseInt(mo.month.split('-')[1]) - 1];
      sF(ri2 % 2 === 0 ? 252 : 248, ri2 % 2 === 0 ? 250 : 247, ri2 % 2 === 0 ? 248 : 245); pdf.rect(M, y, IW, 5.5, 'F');
      [mName, yr3, fn2(mo.pi_l6), fn2(mo.pi_g6), fn2(mo.np_l6), fn2(mo.np_g6), fn2(mo.port_in), fn2(mo.port_out), fe2(mo.pi_raw), fe2(mo.add_gara), fe2(mo.pi_total), '0%'].forEach((v, i) => {
        if (i === 6) tG(); else if (i === 7 && mo.port_out > 0) tR(); else if (i === 10) tB(); else tD(); pdf.text(v, mC[i], y + 3.9);
      }); y += 5.5; ri2++;
    });
    y += 10; setProgress?.(88);
    await addChartToPDF(pdf, 'cPII', M, y, HW, HR, 'PI Incentive + Gara Monthly');
    await addChartToPDF(pdf, 'cPF', M + HW + 3, y, HW, HR, 'Port-In vs Port-Out');
    y += HR + 10;
    await addChartToPDF(pdf, 'cPD', M, y, IW, 40, 'Total Port-In Bonus vs Incentive');
    addFooter(pdf, 4, W, H, M, BRANCH, user.full_name);

    // Page 5
    setProgress?.(95);
    pdf.addPage(); y = await addPageHeader(pdf, 5, 'Deductions & Renewal %', W, M, ID);
    await addChartToPDF(pdf, 'cDM', M, y, IW, 50, 'Monthly Deductions (Stacked)');
    y += 65;
    await addChartToPDF(pdf, 'cDY', M, y, HW, HR, 'Annual Deductions Breakdown');
    await addChartToPDF(pdf, 'cRN', M + HW + 3, y, HW, HR, 'Renewal Rate Monthly');
    addFooter(pdf, 5, W, H, M, BRANCH, user.full_name);

    setProgress?.(100);
    pdf.save(`Retailer_Report_${ID}.pdf`);
  } catch (err) {
    console.error('PDF ERROR:', err);
    alert('PDF export failed. Try again or check console.');
    setProgress?.(0);
  }
}
