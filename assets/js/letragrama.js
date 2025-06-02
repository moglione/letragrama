const rows = 8,
    cols = 6,
    minLen = 6,
    vowelWeight = 2;
const gridEl = document.getElementById('grid');
const themeInput = document.getElementById('themeInput');
const authorInput = document.getElementById('authorInput');
const wordInput = document.getElementById('wordInput');
const cluesInput = document.getElementById('cluesInput');
const locateAllBtn = document.getElementById('locateAllBtn');
const editModeBtn = document.getElementById('editModeBtn');
const saveBtn = document.getElementById('saveBtn');
const messagesEl = document.getElementById('messages');

let placedSegments = [],
    placedCells = [],
    placedWords = [];
let editMode = false;
const vowels = ['A', 'E', 'I', 'O', 'U'];
const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const deltas = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1]
];
const opposite = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

function createGrid() {
    gridEl.innerHTML = '';
    placedSegments = [];
    placedCells = [];
    placedWords = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            gridEl.appendChild(cell);
        }
    }
    messagesEl.textContent = '';
}

function clearGrid() {
    document.querySelectorAll('.cell').forEach(c => c.innerHTML = '');
    document.querySelectorAll('.connector').forEach(l => l.remove());
    placedSegments = [];
    placedCells = [];
    placedWords = [];
    messagesEl.textContent = '';
}

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

function isPlacedCell(r, c) {
    return placedCells.some(pc => pc.r === r && pc.c === c);
}

function getAllCells() {
    return Array.from(document.querySelectorAll('.cell')).map(c => ({
        r: +c.dataset.row,
        c: +c.dataset.col
    }));
}

function findPath(start, len) {
    const visited = Array.from({
        length: rows
    }, () => Array(cols).fill(false));
    const path = [];
    const localSegs = [];

    function dfs(r, c, depth) {
        if (depth === len) return true;
        const neigh = [];
        for (const [dr, dc] of deltas) {
            const rr = r + dr,
                cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && !visited[rr][cc] && !isPlacedCell(rr, cc)) {
                neigh.push({
                    rr,
                    cc
                });
            }
        }
        shuffle(neigh);
        for (const {
                rr,
                cc
            }
            of neigh) {
            const seg = {
                r1: r,
                c1: c,
                r2: rr,
                c2: cc
            };
            if (localSegs.some(s => segmentsIntersect(s, seg)) || placedSegments.some(ps => segmentsIntersect(ps, seg))) continue;
            visited[rr][cc] = true;
            path.push({
                r: rr,
                c: cc
            });
            localSegs.push(seg);
            if (dfs(rr, cc, depth + 1)) return true;
            localSegs.pop();
            path.pop();
            visited[rr][cc] = false;
        }
        return false;
    }
    visited[start.r][start.c] = true;
    path.push({
        r: start.r,
        c: start.c
    });
    return dfs(start.r, start.c, 1) ? path : null;
}

function getBorders(p) {
    const b = [];
    if (p.r === 0) b.push('top');
    if (p.r === rows - 1) b.push('bottom');
    if (p.c === 0) b.push('left');
    if (p.c === cols - 1) b.push('right');
    return b;
}

function pickRandomLetter() {
    const pool = [];
    vowels.forEach(v => {
        for (let i = 0; i < vowelWeight; i++) pool.push(v);
    });
    consonants.forEach(c => pool.push(c));
    return pool[Math.floor(Math.random() * pool.length)];
}

function fillEmpty() {
    document.querySelectorAll('.cell').forEach(cell => {
        if (!cell.querySelector('.letter')) {
            const ld = document.createElement('div');
            ld.className = 'letter fill';
            ld.textContent = pickRandomLetter();
            cell.appendChild(ld);
        }
    });
}

function drawConnector(p, nx, type) {
    const rect = gridEl.getBoundingClientRect();
    const c1 = document.querySelector('.cell[data-row="' + p.r + '"][data-col="' + p.c + '"]').getBoundingClientRect();
    const c2 = document.querySelector('.cell[data-row="' + nx.r + '"][data-col="' + nx.c + '"]').getBoundingClientRect();
    const x1 = c1.left - rect.left + c1.width / 2;
    const y1 = c1.top - rect.top + c1.height / 2;
    const x2 = c2.left - rect.left + c2.width / 2;
    const y2 = c2.top - rect.top + c2.height / 2;
    const dx = x2 - x1,
        dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    const line = document.createElement('div');
    line.className = 'connector ' + type;
    line.style.width = length + 'px';
    const half = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--connector-width')) / 2;
    const offX = (dy / length) * half,
        offY = (-dx / length) * half;
    line.style.left = (x1 + offX) + 'px';
    line.style.top = (y1 + offY) + 'px';
    line.style.transform = 'rotate(' + angle + 'deg)';
    gridEl.appendChild(line);
    placedSegments.push({
        r1: p.r,
        c1: p.c,
        r2: nx.r,
        c2: nx.c
    });
}

function drawWord(path, word, type) {
    const wIdx = placedWords.length;
    placedWords.push({
        word,
        path,
        isSpangram: type === 'spangram'
    });
    path.forEach((pos, i) => {
        const cell = document.querySelector('.cell[data-row="' + pos.r + '"][data-col="' + pos.c + '"]');
        const ld = document.createElement('div');
        ld.className = 'letter ' + type;
        ld.textContent = word[i];
        ld.dataset.wIdx = wIdx;
        ld.dataset.lIdx = i;
        cell.appendChild(ld);
        placedCells.push({
            r: pos.r,
            c: pos.c
        });
    });
    for (let i = 0; i < path.length - 1; i++) drawConnector(path[i], path[i + 1], type);
}

let dragData = null;

function handleDragStart(e) {
    dragData = {
        w: e.target.dataset.wIdx,
        i: e.target.dataset.lIdx
    };
}

function handleDragOver(e) {
    e.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    const cell = e.currentTarget;
    if (cell.querySelector('.letter')) return;
    const r = +cell.dataset.row,
        c = +cell.dataset.col;
    const sel = document.querySelector('.letter[data-w-idx="' + dragData.w + '"][data-l-idx="' + dragData.i + '"]');
    cell.appendChild(sel);
    placedWords[dragData.w].path[dragData.i] = {
        r,
        c
    };
    document.querySelectorAll('.connector').forEach(l => l.remove());
    placedSegments = [];
    placedWords.forEach(wObj => {
        for (let j = 0; j < wObj.path.length - 1; j++) drawConnector(wObj.path[j], wObj.path[j + 1], wObj.isSpangram ? 'spangram' : 'clue');
    });
}

function enterManual() {
    editMode = true;
    editModeBtn.textContent = 'Terminar edición';
    document.querySelectorAll('.letter.fill').forEach(ld => ld.remove());
    document.querySelectorAll('.letter.spangram, .letter.clue').forEach(ld => {
        ld.draggable = true;
        ld.addEventListener('dragstart', handleDragStart);
    });
    document.querySelectorAll('.cell').forEach(cell => {
        cell.addEventListener('dragover', handleDragOver);
        cell.addEventListener('drop', handleDrop);
    });
}

function exitManual() {
    editMode = false;
    editModeBtn.textContent = 'Edición manual';
    document.querySelectorAll('.letter.spangram, .letter.clue').forEach(ld => {
        ld.removeAttribute('draggable');
        ld.removeEventListener('dragstart', handleDragStart);
    });
    document.querySelectorAll('.cell').forEach(cell => {
        cell.removeEventListener('dragover', handleDragOver);
        cell.removeEventListener('drop', handleDrop);
    });
    document.querySelectorAll('.connector').forEach(l => l.remove());
    placedSegments = [];
    placedWords.forEach(wObj => {
        for (let j = 0; j < wObj.path.length - 1; j++) drawConnector(wObj.path[j], wObj.path[j + 1], wObj.isSpangram ? 'spangram' : 'clue');
    });
    fillEmpty();
}

function locateAll() {
    clearGrid();
    if (editMode) exitManual();
    const sp = wordInput.value.trim();
    messagesEl.textContent = '';
    if (sp.length < minLen) {
        messagesEl.textContent = `Debes ingresar un spangrama de al menos ${minLen} letras.`;
        return;
    }
    const borders = getAllCells().filter(c => c.r === 0 || c.r === rows - 1 || c.c === 0 || c.c === cols - 1);
    shuffle(borders);
    let spPath = null;
    for (const s of borders) {
        const sb = getBorders(s),
            ob = sb.map(b => opposite[b]),
            p = findPath(s, sp.length);
        if (p && getBorders(p[p.length - 1]).some(b => ob.includes(b))) {
            spPath = p;
            break;
        }
    }
    if (!spPath) {
        messagesEl.textContent = 'No se pudo ubicar el spangrama.';
        return;
    }
    drawWord(spPath, sp, 'spangram');
    const clues = cluesInput.value.trim().split(/\r?\n/).filter(w => w);
    for (const wd of clues) {
        if (!wd) continue;
        const cells = getAllCells();
        shuffle(cells);
        let placed = null;
        for (const c of cells) {
            if (isPlacedCell(c.r, c.c)) continue;
            const p = findPath(c, wd.length);
            if (p) {
                placed = p;
                break;
            }
        }
        if (placed) drawWord(placed, wd, 'clue');
        else {
            const m = document.createElement('div');
            m.textContent = 'No se pudo ubicar la palabra: ' + wd;
            messagesEl.appendChild(m);
        }
    }
    fillEmpty();
}

function saveBoard() {
    if (!placedWords.length) {
        messagesEl.textContent = 'Genera primero el tablero antes de guardar.';
        return;
    }
    const theme = themeInput.value.trim();
    const author = authorInput.value.trim();
    const letters = [];
    for (let r = 0; r < rows; r++) {
        let rowStr = '';
        for (let c = 0; c < cols; c++) {
            const cell = document.querySelector('.cell[data-row="' + r + '"][data-col="' + c + '"]'),
                ld = cell.querySelector('.letter');
            rowStr += ld ? ld.textContent.toUpperCase() : '';
        }
        letters.push(rowStr);
    }
    const bonds = placedWords.map(wObj => [wObj.word.toUpperCase(), wObj.path.map(p => `${p.c},${rows-1-p.r}`), wObj.isSpangram]);
    const output = {
        theme,
        author,
        letters,
        bonds
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(output));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = 'tablero.json';
    a.click();
}

locateAllBtn.addEventListener('click', locateAll);
editModeBtn.addEventListener('click', () => editMode ? exitManual() : enterManual());
saveBtn.addEventListener('click', saveBoard);
createGrid();
window.addEventListener('resize', createGrid);

function orient(p, q, r) {
    return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
}

function segmentsIntersect(a, b) {
    const p1 = {
            x: a.r1,
            y: a.c1
        },
        p2 = {
            x: a.r2,
            y: a.c2
        },
        q1 = {
            x: b.r1,
            y: b.c1
        },
        q2 = {
            x: b.r2,
            y: b.c2
        };
    if ((a.r1 === b.r1 && a.c1 === b.c1) || (a.r1 === b.r2 && a.c1 === b.c2) || (a.r2 === b.r1 && a.c2 === b.c1) || (a.r2 === b.r2 && a.c2 === b.c2)) return false;
    return orient(p1, p2, q1) * orient(p1, p2, q2) < 0 && orient(q1, q2, p1) * orient(q1, q2, p2) < 0;
}