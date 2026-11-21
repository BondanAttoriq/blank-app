// Simbol SVG unit HMI, bentuk diturunkan dari PFD berwarna. Semua digambar berpusat di (0,0) dengan lebar w, tinggi h.
// Warna isi per area: cokelat (LPP/OEC), hijau (LFG), biru (gas cleaning/CCU), ungu (PEME), emas (sintesis/distilasi), merah muda (ORC), teal (air).
export const AREA_COL = {
  brown: ['#6E4A35', '#C79572', '#E2B897'], green: ['#3B6E39', '#8CC57E', '#B8E3A9'], blue: ['#2F567E', '#7FAEDB', '#B5D5F2'],
  purple: ['#544577', '#A894D6', '#D0C3F2'], gold: ['#7E6328', '#D9B866', '#F0DA9C'], pink: ['#7C3940', '#D88A92', '#F2BAC0'],
  teal: ['#1F6767', '#6FC6C0', '#A9E7E2'], gray: ['#3E4F49', '#7D9289', '#A9BAB3'],
};
export function defs() {
  return Object.entries(AREA_COL).map(([k, [a, b, c]]) =>
    `<linearGradient id="g-${k}" x1="0" x2="1"><stop offset="0" stop-color="${a}"/><stop offset=".45" stop-color="${c}"/><stop offset=".62" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>` +
    `<linearGradient id="gv-${k}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}"/><stop offset=".5" stop-color="${b}"/><stop offset="1" stop-color="${a}"/></linearGradient>`).join('') +
    `<marker id="arw" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L10,5 L0,9 z" fill="context-stroke"/></marker>`;
}
const ST = 'stroke="#0B1F1A" stroke-width="1.4"';
const LN = 'stroke="#0B1F1A" stroke-width="1.6" fill="none"';

export function symbol(t, w, h, c) {
  const f = `url(#g-${c})`, fv = `url(#gv-${c})`, x0 = -w / 2, y0 = -h / 2;
  switch (t) {
    case 'hopper': return `<polygon points="${x0},${y0} ${-x0},${y0} ${w * .1},${h * .3} ${w * .1},${-y0} ${-w * .1},${-y0} ${-w * .1},${h * .3}" fill="${f}" ${ST}/>`;
    case 'conveyor': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="${fv}" ${ST}/><ellipse cx="${x0 + h / 2}" cy="0" rx="${h * .3}" ry="${h / 2 - 1}" fill="none" stroke="#0B1F1A" stroke-width="1"/><ellipse cx="${-x0 - h / 2}" cy="0" rx="${h * .3}" ry="${h / 2 - 1}" fill="none" stroke="#0B1F1A" stroke-width="1"/>`;
    case 'sorter': return `<path d="M${x0},${y0}H${-x0}V${h * .08}L0,${-y0}L${x0},${h * .08}Z" fill="${f}" ${ST}/><path d="M${x0 + 8},${y0 + 10}h${w - 22}m-6,-4l6,4l-6,4" ${LN}/><path d="M${x0 + 6},${h * .08}H${-x0 - 6}" stroke="#0B1F1A" stroke-dasharray="3 3"/>`;
    case 'shredder': return `<polygon points="${x0},${y0} ${-x0},${y0} ${w * .36},${-y0} ${-w * .36},${-y0}" fill="${f}" ${ST}/><path d="M-7,-7L7,7M7,-7L-7,7" ${LN}/>`;
    case 'dryer': return `<path d="M${x0 + 10},${y0}H${-x0 - 10}L${-x0},${y0 + 14}V${-y0}H${x0}V${y0 + 14}Z" fill="${f}" ${ST}/><circle cx="0" cy="${y0 + h * .34}" r="${w * .2}" ${LN}/><path d="M${-w * .12},${y0 + h * .34 - 4}a${w * .12},${w * .12} 0 0 1 ${w * .24},0" ${LN}/>`;
    case 'furnace': return `<rect x="${-w * .3}" y="${y0}" width="${w * .6}" height="${h * .38}" fill="${f}" ${ST}/><path d="M${-w * .38},${y0 + h * .38}H${w * .38}L${-x0},${y0 + h * .5}V${-y0 - 8}H${x0}V${y0 + h * .5}Z" fill="${f}" ${ST}/><path d="M${-w * .3},${y0 + h * .58}H${w * .26}L${-w * .3},${y0 + h * .86}H${w * .3}" ${LN}/><path d="M${x0 - 8},${y0 + h * .55}h${w + 16}M${x0 - 8},${y0 + h * .88}h${w + 16}" stroke="#0B1F1A" stroke-width="1"/>`;
    case 'burner': return `<polygon points="0,${y0} ${-x0},${-y0} ${x0},${-y0}" fill="${f}" ${ST}/><polygon points="0,${y0 + h * .35} ${w * .25},${-y0 - 5} ${-w * .25},${-y0 - 5}" ${LN}/>`;
    case 'whb': return `<rect x="${x0}" y="${y0 + h * .16}" width="${w}" height="${h * .84}" rx="3" fill="${f}" ${ST}/><path d="M${-w * .18},${y0 + h * .16}a${w * .18},${h * .16} 0 0 1 ${w * .36},0Z" fill="${f}" ${ST}/>`;
    case 'esp': return `<path d="M${x0},${y0}H${-x0}V${h * .1}L${w * .08},${-y0}H${-w * .08}L${x0},${h * .1}Z" fill="${f}" ${ST}/><path d="M-12,${-h * .12}h8M-4,${-h * .22}v20M4,${-h * .22}v20M4,${-h * .12}h8" ${LN}/>`;
    case 'scrubber': return `<path d="M${x0},${y0}H${-x0}V${h * .1}L${w * .08},${-y0}H${-w * .08}L${x0},${h * .1}Z" fill="${f}" ${ST}/><path d="M-8,${y0 + 8}q8,4 16,0M0,${y0 + 10}v${h * .38}" ${LN}/><path d="M-4,${y0 + h * .48}l4,6l4,-6" ${LN}/>`;
    case 'hx': { const r = Math.min(w, h) / 2; return `<circle r="${r}" fill="${f}" ${ST}/><path d="M${-r * .8},${r * .2}l${r * .35},${-r * .55}l${r * .35},${r * .7}l${r * .35},${-r * .7}l${r * .35},${r * .7}l${r * .2},${-r * .3}" ${LN}/>`; }
    case 'vessel': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/><rect x="${x0 + 1}" y="${y0 + h * .17}" width="${w - 2}" height="${h * .12}" fill="url(#mesh)" stroke="#0B1F1A" stroke-width=".8"/><rect x="${-x0}" y="${-4}" width="5" height="10" fill="#0B1F1A"/>`;
    case 'adsorber': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0},${y0 + 8}H${-x0}M${x0},${-y0 - 8}H${-x0}M${x0},${y0 + 8}L${-x0},${-y0 - 8}M${-x0},${y0 + 8}L${x0},${-y0 - 8}" stroke="#0B1F1A" stroke-width="1.1"/>`;
    case 'compressor': { const r = h * .45; return `<path d="M${-r},0a${r},${r} 0 1 0 ${r},${-r}H${w / 2}V${-r + h * .36}H${r * .6}" fill="${f}" ${ST}/><circle r="${r * .45}" ${LN}/>`; }
    case 'electrolyzer': { let c = ''; const n = 12, cw = (w - 40) / n; for (let i = 0; i < n; i++) c += `<rect x="${x0 + 20 + i * cw + cw * .2}" y="${y0 + h * .32}" width="${cw * .6}" height="${h * .56}" rx="3" fill="url(#gv-${t === 'electrolyzer' ? 'purple' : c})" stroke="#2A2340" stroke-width=".8"/>`;
      return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="4" fill="${fv}" ${ST}/>${c}`; }
    case 'mixer': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="${f}" ${ST}/><path d="M${x0},${-y0}L${-x0},${y0}" stroke="#0B1F1A" stroke-width="1.1"/><path d="M${x0 + 6},${-6}l6,-6l6,6l6,-6" ${LN}/>`;
    case 'reactor': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/>${[0.12, 0.52].map(k => `<rect x="${x0 + 3}" y="${y0 + h * k}" width="${w - 6}" height="${h * .36}" fill="none" stroke="#0B1F1A" stroke-width="1"/><path d="M${x0 + 3},${y0 + h * k}L${-x0 - 3},${y0 + h * (k + .36)}M${-x0 - 3},${y0 + h * k}L${x0 + 3},${y0 + h * (k + .36)}" stroke="#0B1F1A" stroke-width="1"/>`).join('')}`;
    case 'column': { let tr = ''; for (let i = 1; i < 16; i++) tr += `<path d="M${x0 + 8},${y0 + i * h / 16}h${w - 16}" stroke="#0B1F1A" stroke-width=".9" stroke-dasharray="4 3"/>`; return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${w / 2}" fill="${f}" ${ST}/>${tr}`; }
    case 'hdrum': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="${h / 2}" fill="${fv}" ${ST}/><path d="M${x0 + h * .5},${y0}v${h}M${-x0 - h * .5},${y0}v${h}" stroke="#0B1F1A" stroke-width=".8"/>`;
    case 'pump': { const r = Math.min(w, h) / 2; return `<circle r="${r}" fill="${f}" ${ST}/><path d="M${r * .35},${-r * .45}a${r * .55},${r * .55} 0 1 0 0,${r * .9}" ${LN}/><path d="M${-r},${r}h${2 * r}" stroke="#0B1F1A" stroke-width="2"/>`; }
    case 'tank': return `<path d="M${x0},${y0 + h * .28}L0,${y0}L${-x0},${y0 + h * .28}V${-y0}H${x0}Z" fill="${f}" ${ST}/><path d="M${x0},${y0 + h * .28}H${-x0}" stroke="#0B1F1A" stroke-width="1"/>`;
    case 'turbine': return `<polygon points="${x0},${y0 + h * .3} ${-x0},${y0} ${-x0},${-y0} ${x0},${-y0 - h * .3}" fill="${f}" ${ST}/>`;
    case 'generator': { const r = Math.min(w, h) / 2; return `<circle r="${r}" fill="${f}" ${ST}/><text y="6" text-anchor="middle" font-size="17" font-weight="800" fill="#0B1F1A" style="font-family:Poppins,sans-serif">G</text>`; }
    case 'stack': return `<polygon points="${-w * .3},${y0} ${w * .3},${y0} ${-x0},${-y0} ${x0},${-y0}" fill="${f}" ${ST}/>`;
    case 'oxidizer': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0 + 10},${-y0 - 6}L0,${y0 + 8}L${-x0 - 10},${-y0 - 6}ZM${x0 + 22},${-y0 - 6}L0,${y0 + 22}L${-x0 - 22},${-y0 - 6}" ${LN}/>`;
    case 'polish': case 'watertreat': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/><path d="M${x0 + 4},${y0 + h * .3}h${w - 8}M${x0 + 4},${y0 + h * .7}h${w - 8}" stroke="#0B1F1A" stroke-dasharray="4 3"/>`;
    case 'header': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="3" fill="${f}" ${ST}/>`;
    case 'bus': return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" rx="2" fill="#7D9289" ${ST}/>`;
    case 'splitter': return `<polygon points="0,${y0} ${-x0},0 0,${-y0} ${x0},0" fill="${f}" ${ST}/>`;
    case 'node': return `<circle r="3.5" fill="#8FB3A5"/>`;
    case 'term': return `<polygon points="${x0 + 8},${y0} ${-x0},${y0} ${-x0 - 8},${-y0} ${x0},${-y0}" fill="#0F2620" stroke="#8FB3A5" stroke-width="1.3"/>`;
    default: return `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="${f}" ${ST}/>`;
  }
}
export const meshPattern = `<pattern id="mesh" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0,0V5M2.5,0V5" stroke="#0B1F1A" stroke-width=".8"/></pattern>`;
export function hexConn(x, y, label, color) {
  const w = Math.max(34, label.length * 7 + 12), h = 16, a = 7;
  return `<g class="conn" transform="translate(${x} ${y})"><polygon points="${-w / 2},0 ${-w / 2 + a},${-h / 2} ${w / 2 - a},${-h / 2} ${w / 2},0 ${w / 2 - a},${h / 2} ${-w / 2 + a},${h / 2}" style="stroke:${color}"/><text y="3.6" text-anchor="middle" style="fill:${color}">${label}</text></g>`;
}
export function diamond(x, y, label, color) {
  const r = label.length > 2 ? 13 : 11.5;
  return `<polygon points="0,${-r} ${r},0 0,${r} ${-r},0" style="stroke:${color}"/><text y="3.5" text-anchor="middle">${label}</text>`;
}
export function valve(x, y, o) {
  return o === 'v' ? `<g transform="translate(${x} ${y})" class="valve"><polygon points="-6,-7 6,-7 0,0" fill="#0B1F1A" stroke="#BFD9CE" stroke-width="1.2"/><polygon points="-6,7 6,7 0,0" fill="#0B1F1A" stroke="#BFD9CE" stroke-width="1.2"/></g>`
    : `<g transform="translate(${x} ${y})" class="valve"><polygon points="-7,-6 -7,6 0,0" fill="#0B1F1A" stroke="#BFD9CE" stroke-width="1.2"/><polygon points="7,-6 7,6 0,0" fill="#0B1F1A" stroke="#BFD9CE" stroke-width="1.2"/></g>`;
}
