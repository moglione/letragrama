// Constants
const rows = 8,
    cols = 6,
    minLen = 6,
    vowelWeight = 2;

// DOM Elements
const gridEl = document.getElementById('grid');
const themeInput = document.getElementById('themeInput');
const authorInput = document.getElementById('authorInput');
const wordInput = document.getElementById('wordInput');
const cluesInput = document.getElementById('cluesInput');
const locateAllBtn = document.getElementById('locateAllBtn');
const editModeBtn = document.getElementById('editModeBtn');
const addWordBtn = document.getElementById('addWordBtn');
const saveBtn = document.getElementById('saveBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const resetBtn = document.getElementById('resetBtn');
const messagesEl = document.getElementById('messages');
const errorModal = document.getElementById('errorModal');
const successModal = document.getElementById('successModal');
const errorMessage = document.getElementById('errorMessage');
const successMessage = document.getElementById('successMessage');
const savedBoardsContainer = document.getElementById('savedBoards');

// State
let placedSegments = [];
let placedCells = [];
let placedWords = [];
let editMode = false;
let undoStack = [];
let redoStack = [];
let selectedCell = null;
let manualWords = new Set(); // Track manually added words

// Constants
const vowels = ['A', 'E', 'I', 'O', 'U'];
const consonants = 'BCDFGHJKLMNPQRSTVWXYZ'.split('');
const deltas = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
];
const opposite = {
    top: 'bottom',
    bottom: 'top',
    left: 'right',
    right: 'left'
};

// Modal Functions
function showMessage(message, type) {
    const messagesEl = document.getElementById('messages');
    messagesEl.textContent = message;
    messagesEl.className = `messages ${type}`;
    messagesEl.classList.add('show');
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
        messagesEl.classList.remove('show');
    }, 3000);
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

// Grid Functions
function createGrid() {
    gridEl.innerHTML = '';
    placedSegments = [];
    placedCells = [];
    placedWords = [];
    undoStack = [];
    redoStack = [];
    updateUndoRedoButtons();
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = r;
            cell.dataset.col = c;
            cell.tabIndex = -1;
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
    saveState();
}

function resetBoard() {
    if (confirm('¿Estás seguro de que quieres reiniciar el tablero? Se perderán todos los cambios.')) {
        clearGrid();
        createGrid();
        showSuccess('Tablero reiniciado correctamente');
    }
}

// State Management
function saveState() {
    const state = {
        placedSegments: [...placedSegments],
        placedCells: [...placedCells],
        placedWords: [...placedWords],
        grid: Array.from(document.querySelectorAll('.cell')).map(cell => ({
            row: cell.dataset.row,
            col: cell.dataset.col,
            html: cell.innerHTML
        }))
    };
    
    undoStack.push(state);
    redoStack = [];
    updateUndoRedoButtons();
}

function restoreState(state) {
    placedSegments = [...state.placedSegments];
    placedCells = [...state.placedCells];
    placedWords = [...state.placedWords];
    
    document.querySelectorAll('.cell').forEach(cell => {
        const savedCell = state.grid.find(
            g => g.row === cell.dataset.row && g.col === cell.dataset.col
        );
        if (savedCell) {
            cell.innerHTML = savedCell.html;
        }
    });
    
    updateUndoRedoButtons();
}

function undo() {
    if (undoStack.length > 1) {
        const currentState = undoStack.pop();
        redoStack.push(currentState);
        restoreState(undoStack[undoStack.length - 1]);
    }
}

function redo() {
    if (redoStack.length > 0) {
        const state = redoStack.pop();
        undoStack.push(state);
        restoreState(state);
    }
}

function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length <= 1;
    redoBtn.disabled = redoStack.length === 0;
}

// Helper Functions
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

// Word Placement Functions
function findPath(start, len) {
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const path = [];
    const localSegs = [];

    function dfs(r, c, depth) {
        if (depth === len) return true;
        const neigh = [];
        for (const [dr, dc] of deltas) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < rows && cc >= 0 && cc < cols && 
                !visited[rr][cc] && !isPlacedCell(rr, cc)) {
                neigh.push({ rr, cc });
            }
        }
        shuffle(neigh);
        for (const { rr, cc } of neigh) {
            const seg = { r1: r, c1: c, r2: rr, c2: cc };
            if (localSegs.some(s => segmentsIntersect(s, seg)) || 
                placedSegments.some(ps => segmentsIntersect(ps, seg))) continue;
            visited[rr][cc] = true;
            path.push({ r: rr, c: cc });
            localSegs.push(seg);
            if (dfs(rr, cc, depth + 1)) return true;
            localSegs.pop();
            path.pop();
            visited[rr][cc] = false;
        }
        return false;
    }
    
    visited[start.r][start.c] = true;
    path.push({ r: start.r, c: start.c });
    return dfs(start.r, start.c, 1) ? path : null;
}

function drawConnector(p, nx, type) {
    const rect = gridEl.getBoundingClientRect();
    const c1 = document.querySelector(`.cell[data-row="${p.r}"][data-col="${p.c}"]`).getBoundingClientRect();
    const c2 = document.querySelector(`.cell[data-row="${nx.r}"][data-col="${nx.c}"]`).getBoundingClientRect();
    
    const x1 = c1.left - rect.left + c1.width / 2;
    const y1 = c1.top - rect.top + c1.height / 2;
    const x2 = c2.left - rect.left + c2.width / 2;
    const y2 = c2.top - rect.top + c2.height / 2;
    
    const dx = x2 - x1, dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    
    const line = document.createElement('div');
    line.className = `connector ${type}`;
    line.style.width = `${length}px`;
    
    const half = parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--connector-width')) / 2;
    const offX = (dy / length) * half;
    const offY = (-dx / length) * half;
    
    line.style.left = `${x1 + offX}px`;
    line.style.top = `${y1 + offY}px`;
    line.style.transform = `rotate(${angle}deg)`;
    
    gridEl.appendChild(line);
    placedSegments.push({ r1: p.r, c1: p.c, r2: nx.r, c2: nx.c });
}

function drawWord(path, word, type) {
    const wIdx = placedWords.length;
    placedWords.push({ word, path, isSpangram: type === 'spangram' });
    
    path.forEach((pos, i) => {
        const cell = document.querySelector(`.cell[data-row="${pos.r}"][data-col="${pos.c}"]`);
        const ld = document.createElement('div');
        ld.className = `letter ${type}`;
        ld.textContent = word[i];
        ld.dataset.wIdx = wIdx;
        ld.dataset.lIdx = i;
        cell.appendChild(ld);
        placedCells.push({ r: pos.r, c: pos.c });
    });
    
    for (let i = 0; i < path.length - 1; i++) {
        drawConnector(path[i], path[i + 1], type);
    }
    
    saveState();
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

// Manual Edit Functions
function selectCell(cell) {
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    selectedCell = cell;
    cell.classList.add('selected');
}

function handleCellKeydown(event) {
    const input = event.target;
    const currentCell = input.parentElement;
    const cells = Array.from(document.querySelectorAll('.cell'));
    const currentIndex = cells.indexOf(currentCell);
    
    let nextIndex = currentIndex;
    
    switch(event.key) {
        case 'ArrowRight':
            event.preventDefault();
            nextIndex = currentIndex + 1;
            break;
        case 'ArrowLeft':
            event.preventDefault();
            nextIndex = currentIndex - 1;
            break;
        case 'ArrowUp':
            event.preventDefault();
            nextIndex = currentIndex - 6;
            break;
        case 'ArrowDown':
            event.preventDefault();
            nextIndex = currentIndex + 6;
            break;
        default:
            return;
    }
    
    // Find next available input cell in the direction
    while (nextIndex >= 0 && nextIndex < cells.length) {
        const nextInput = cells[nextIndex].querySelector('input');
        if (nextInput) {
            nextInput.focus();
            nextInput.select();
            break;
        }
        // Continue in same direction if cell doesn't have input
        nextIndex += (nextIndex > currentIndex ? 1 : -1);
    }
}

function handleCellInput(event) {
    const input = event.target;
    input.value = input.value.toUpperCase();
    
    // Only move to next cell if a letter was typed (not on delete/backspace)
    if (input.value && event.inputType !== 'deleteContentBackward') {
        const cells = Array.from(document.querySelectorAll('.cell'));
        const currentIndex = cells.indexOf(input.parentElement);
        
        // Find next available input cell
        let nextIndex = currentIndex + 1;
        while (nextIndex < cells.length) {
            const nextInput = cells[nextIndex].querySelector('input');
            if (nextInput) {
                nextInput.focus();
                nextInput.select();
                break;
            }
            nextIndex++;
        }
    }
}

function addManualWord() {
    const cells = document.querySelectorAll('.cell');
    let word = '';
    let wordCells = [];
    let hasLetters = false;
    
    cells.forEach(cell => {
        const input = cell.querySelector('input');
        if (input && input.value) {
            word += input.value;
            wordCells.push(cell);
            hasLetters = true;
        }
    });
    
    if (!hasLetters) {
        showError('No hay letras ingresadas para formar una palabra');
        return;
    }
    
    // Add word to clues
    const cluesInput = document.getElementById('cluesInput');
    const currentClues = cluesInput.value.split('\n').filter(clue => clue.trim());
    currentClues.push(word);
    cluesInput.value = currentClues.join('\n');
    
    // Convert inputs to letters
    const path = wordCells.map(cell => ({
        r: parseInt(cell.dataset.row),
        c: parseInt(cell.dataset.col)
    }));
    
    // Clear all inputs before drawing word
    cells.forEach(cell => {
        const input = cell.querySelector('input');
        if (input) {
            cell.innerHTML = '';
        }
    });
    
    // Add to manual words set and draw with lock
    manualWords.add(word);
    drawWord(path, word, 'clue');
    path.forEach(pos => {
        const letter = document.querySelector(`.cell[data-row="${pos.r}"][data-col="${pos.c}"] .letter`);
        if (letter) letter.classList.add('locked');
    });
    
    // Re-setup manual editing for empty cells
    cells.forEach(cell => {
        if (!cell.querySelector('.letter')) {
            cell.classList.add('editable');
            const input = document.createElement('input');
            input.maxLength = 1;
            input.addEventListener('keydown', handleCellKeydown);
            input.addEventListener('input', handleCellInput);
            input.addEventListener('focus', () => selectCell(cell));
            cell.appendChild(input);
        }
    });
    
    showSuccess(`Palabra "${word}" agregada como palabra clave`);
}

// Drag and Drop Handlers
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
    
    const r = +cell.dataset.row;
    const c = +cell.dataset.col;
    const sel = document.querySelector(
        `.letter[data-w-idx="${dragData.w}"][data-l-idx="${dragData.i}"]`
    );
    
    cell.appendChild(sel);
    placedWords[dragData.w].path[dragData.i] = { r, c };
    
    document.querySelectorAll('.connector').forEach(l => l.remove());
    placedSegments = [];
    
    placedWords.forEach(wObj => {
        for (let j = 0; j < wObj.path.length - 1; j++) {
            drawConnector(
                wObj.path[j],
                wObj.path[j + 1],
                wObj.isSpangram ? 'spangram' : 'clue'
            );
        }
    });
    
    saveState();
}

// Edit Mode Functions
function toggleEditMode() {
    editMode = !editMode;
    const editModeBtn = document.getElementById('editModeBtn');
    const addWordBtn = document.getElementById('addWordBtn');
    
    editModeBtn.classList.toggle('active');
    editModeBtn.innerHTML = editMode ? 
        '<i class="fas fa-check"></i> Terminar edición' : 
        '<i class="fas fa-edit"></i> Edición manual';
    
    addWordBtn.disabled = !editMode;
    
    // Enable/disable drag and drop and cell editing
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        if (editMode) {
            // Setup for both drag-drop and manual editing
            cell.setAttribute('draggable', 'true');
            cell.addEventListener('dragstart', handleDragStart);
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('drop', handleDrop);
            
            // Setup for manual editing
            const letter = cell.querySelector('.letter');
            if (!letter || letter.classList.contains('fill')) {
                // Clear filler letters or empty cells
                cell.innerHTML = '';
                cell.classList.add('editable');
                const input = document.createElement('input');
                input.maxLength = 1;
                input.addEventListener('keydown', handleCellKeydown);
                input.addEventListener('input', handleCellInput);
                input.addEventListener('focus', () => selectCell(cell));
                cell.appendChild(input);
                
                // Add click handler to focus input
                cell.addEventListener('click', () => {
                    const input = cell.querySelector('input');
                    if (input) {
                        input.focus();
                    }
                });
            }
        } else {
            // Cleanup
            cell.setAttribute('draggable', 'false');
            cell.removeEventListener('dragstart', handleDragStart);
            cell.removeEventListener('dragover', handleDragOver);
            cell.removeEventListener('drop', handleDrop);
            cell.classList.remove('editable', 'selected');
            
            const input = cell.querySelector('input');
            if (input) {
                if (input.value) {
                    const letter = createLetter(input.value);
                    cell.innerHTML = '';
                    cell.appendChild(letter);
                } else {
                    cell.innerHTML = '';
                }
            }
        }
    });
    
    if (!editMode) {
        selectedCell = null;
        fillEmpty();
    }
}

// Board Generation and Saving
function locateAll() {
    clearGrid();
    if (editMode) toggleEditMode();
    
    const sp = wordInput.value.trim().toUpperCase();
    if (sp.length < minLen) {
        showError(`El spangrama debe tener al menos ${minLen} letras.`);
        return;
    }
    
    const borders = getAllCells().filter(
        c => c.r === 0 || c.r === rows - 1 || c.c === 0 || c.c === cols - 1
    );
    shuffle(borders);
    
    let spPath = null;
    for (const s of borders) {
        const sb = getBorders(s);
        const ob = sb.map(b => opposite[b]);
        const p = findPath(s, sp.length);
        if (p && getBorders(p[p.length - 1]).some(b => ob.includes(b))) {
            spPath = p;
            break;
        }
    }
    
    if (!spPath) {
        showError('No se pudo ubicar el spangrama en el tablero.');
        return;
    }
    
    drawWord(spPath, sp, 'spangram');
    
    const clues = cluesInput.value.trim().split(/\r?\n/)
        .map(w => w.trim().toUpperCase())
        .filter(w => w);
    
    const unplacedWords = [];
    
    // First place manual words in their existing positions
    const manualWordObjs = placedWords.filter(w => manualWords.has(w.word));
    manualWordObjs.forEach(w => {
        drawWord(w.path, w.word, 'clue');
        w.path.forEach(pos => {
            const letter = document.querySelector(`.cell[data-row="${pos.r}"][data-col="${pos.c}"] .letter`);
            if (letter) letter.classList.add('locked');
        });
    });
    
    // Then try to place remaining words
    for (const wd of clues) {
        if (!wd || manualWords.has(wd)) continue;
        
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
        
        if (placed) {
            drawWord(placed, wd, 'clue');
        } else {
            unplacedWords.push(wd);
        }
    }
    
    fillEmpty();
    
    if (unplacedWords.length > 0) {
        showError(
            'No se pudieron ubicar las siguientes palabras:\n' +
            unplacedWords.join(', ')
        );
    } else {
        showSuccess('¡Tablero generado correctamente!');
    }
}

function regenerateBoard() {
    // Clear manual word tracking to allow all words to be repositioned
    manualWords.clear();
    document.querySelectorAll('.letter.locked').forEach(l => l.classList.remove('locked'));
    locateAll();
}

function saveBoard() {
    if (!placedWords.length) {
        showError('Genera primero el tablero antes de guardar.');
        return;
    }
    
    const theme = themeInput.value.trim();
    const author = authorInput.value.trim();
    
    if (!theme || !author) {
        showError('Por favor, completa el tema y el autor antes de guardar.');
        return;
    }
    
    const letters = [];
    for (let r = 0; r < rows; r++) {
        let rowStr = '';
        for (let c = 0; c < cols; c++) {
            const cell = document.querySelector(`.cell[data-row="${r}"][data-col="${c}"]`);
            const ld = cell.querySelector('.letter');
            rowStr += ld ? ld.textContent.toUpperCase() : '';
        }
        letters.push(rowStr);
    }
    
    const bonds = placedWords.map(wObj => [
        wObj.word.toUpperCase(),
        wObj.path.map(p => `${p.c},${rows-1-p.r}`),
        wObj.isSpangram
    ]);
    
    const output = {
        theme,
        author,
        letters,
        bonds,
        timestamp: new Date().toISOString()
    };
    
    // Save to localStorage
    try {
        const savedBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
        savedBoards.push(output);
        localStorage.setItem('savedBoards', JSON.stringify(savedBoards));
        updateSavedBoardsPanel();
    } catch (e) {
        console.error('Error saving to localStorage:', e);
    }
    
    // Download as JSON
    const dataStr = 'data:text/json;charset=utf-8,' + 
        encodeURIComponent(JSON.stringify(output));
    const a = document.createElement('a');
    a.href = dataStr;
    a.download = `tablero_${theme.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    
    showSuccess('¡Tablero guardado correctamente!');
}

// Saved Boards Panel
function updateSavedBoardsPanel() {
    try {
        const savedBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
        savedBoardsContainer.innerHTML = '';
        
        if (savedBoards.length === 0) {
            savedBoardsContainer.innerHTML = 
                '<p class="text-light">No hay tableros guardados</p>';
            return;
        }
        
        savedBoards.reverse().forEach((board, index) => {
            const boardEl = document.createElement('div');
            boardEl.className = 'saved-board';
            
            const date = new Date(board.timestamp);
            const dateStr = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            
            boardEl.innerHTML = `
                <div class="saved-board-details">
                    <strong>${board.theme}</strong>
                    <div class="text-light">
                        por ${board.author}<br>
                        ${dateStr}
                    </div>
                </div>
            `;
            
            boardEl.addEventListener('click', () => loadSavedBoard(index));
            savedBoardsContainer.appendChild(boardEl);
        });
    } catch (e) {
        console.error('Error loading saved boards:', e);
        savedBoardsContainer.innerHTML = 
            '<p class="text-light">Error al cargar los tableros guardados</p>';
    }
}

function loadSavedBoard(index) {
    try {
        const savedBoards = JSON.parse(localStorage.getItem('savedBoards') || '[]');
        const board = savedBoards[savedBoards.length - 1 - index];
        
        if (!board) {
            showError('No se pudo cargar el tablero seleccionado.');
            return;
        }
        
        themeInput.value = board.theme;
        authorInput.value = board.author;
        // TODO: Implement board loading logic
        showSuccess('Tablero cargado correctamente');
    } catch (e) {
        console.error('Error loading board:', e);
        showError('Error al cargar el tablero');
    }
}

// Geometry Helper
function segmentsIntersect(a, b) {
    const p1 = { x: a.r1, y: a.c1 },
          p2 = { x: a.r2, y: a.c2 },
          q1 = { x: b.r1, y: b.c1 },
          q2 = { x: b.r2, y: b.c2 };
    
    if ((a.r1 === b.r1 && a.c1 === b.c1) || 
        (a.r1 === b.r2 && a.c1 === b.c2) || 
        (a.r2 === b.r1 && a.c2 === b.c1) || 
        (a.r2 === b.r2 && a.c2 === b.c2)) return false;
    
    function orient(p, q, r) {
        return (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
    }
    
    return orient(p1, p2, q1) * orient(p1, p2, q2) < 0 && 
           orient(q1, q2, p1) * orient(q1, q2, p2) < 0;
}

// Helper function to create letter elements
function createLetter(text) {
    const letter = document.createElement('div');
    letter.className = 'letter';
    letter.textContent = text;
    return letter;
}

// Event Listeners
locateAllBtn.addEventListener('click', locateAll);
document.getElementById('regenerateBtn').addEventListener('click', regenerateBoard);
editModeBtn.addEventListener('click', toggleEditMode);
addWordBtn.addEventListener('click', addManualWord);
saveBtn.addEventListener('click', saveBoard);
undoBtn.addEventListener('click', undo);
redoBtn.addEventListener('click', redo);
resetBtn.addEventListener('click', resetBoard);

document.querySelectorAll('.modal-close').forEach(close => {
    close.addEventListener('click', closeModals);
});

// Initialize
createGrid();
updateSavedBoardsPanel();
window.addEventListener('resize', createGrid);
