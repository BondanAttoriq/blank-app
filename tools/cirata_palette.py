"""Ganti palet hijau METHACYCLE menjadi palet biru CIRATA-RESILIENT (Canva) pada CSS/JS/HTML cirata-site.
Pemakaian: python3 tools/cirata_palette.py <file>..."""
import re, sys
MAP = {
 '#17322A': '#13294B', '#1F7A4D': '#1F5FA8', '#127466': '#2C76AD', '#0C5A72': '#184F8E', '#0B2E23': '#0A1F3D', '#0E3B2E': '#0F2B50',
 '#D8F2B8': '#CDE7F7', '#CFE8DB': '#CFE2F2', '#9FB5AC': '#9FB1C4', '#B9E58A': '#8FD3F0', '#B7D3C7': '#B7CDE2', '#8CC63F': '#47B3D1',
 '#8A9A94': '#8A97A6', '#6B7F77': '#6B7B8C', '#14532D': '#163E6E', '#129B8A': '#3692BD', '#CFE6DC': '#D5E3EC', '#4F655D': '#4A6078',
 '#3AA76D': '#2C8FC9', '#2E9A63': '#2E86C9', '#2BA58A': '#47B3D1', '#EEF7F1': '#F0F6FC', '#E2F4EA': '#E3EEF9', '#E2E9E2': '#E2E8EF',
 '#DFF1E6': '#E4EFF8', '#C9D9D2': '#C9D6E2', '#C9D4CF': '#C9D3DE', '#5CC6B5': '#7FCBE3', '#127E86': '#2C76AD', '#0E7C72': '#1F6FB5',
 '#0E5E68': '#164E80', '#0C8EA6': '#2A9BD0', '#0B1F1A': '#0A1A2E', '#F6FBF8': '#F5F9FD', '#E9F8DA': '#E3F2FB', '#E3F4EA': '#E4EFF8',
 '#E3EEE8': '#E3EAF2', '#DFE8E2': '#DFE6EE', '#DDEFE6': '#DDE8F2', '#D6EDE2': '#D6E5F2', '#C9EE9C': '#9FD8F0', '#C9E7D4': '#C9DDEE',
 '#C2DDD0': '#C2D6E8', '#BFE6CF': '#BFDDF0', '#B9D6CA': '#B9D0E4', '#A9D8B8': '#A9CDE8', '#9FD3B9': '#9FC9E8', '#8FD3AE': '#8FC3E8',
 '#8FB3A5': '#8FA9C2', '#58B98A': '#58A8DB', '#4DB585': '#4DA3D9', '#2B9A6C': '#2B86C4', '#26987C': '#2683BF', '#1F8A6C': '#1F6FB5',
 '#1E4136': '#1E3A5C', '#17603C': '#164E80', '#147A53': '#14609A', '#102A23': '#10233F', '#F1FAF5': '#F1F7FD', '#E2F4EA': '#E3EEF9',
}
RGBA = {'140,198,63': '71,179,209', '14,59,46': '15,43,80', '11,46,35': '10,31,61', '31,122,77': '31,95,168', '9,38,29': '9,27,52',
        '6,20,15': '6,14,28', '207,230,220': '213,227,236', '20,40,30': '20,32,50', '18,155,138': '54,146,189', '18,116,102': '44,118,173', '12,90,114': '24,79,142'}
for p in sys.argv[1:]:
    s = open(p, encoding='utf-8').read(); n0 = s
    s = re.sub(r'#[0-9A-Fa-f]{6}\b', lambda m: MAP.get(m.group(0).upper(), m.group(0)), s)
    s = re.sub(r'rgba\((\d+,\d+,\d+)', lambda m: 'rgba(' + RGBA.get(m.group(1), m.group(1)), s)
    open(p, 'w', encoding='utf-8').write(s); print(p, 'diubah' if s != n0 else 'tetap')
