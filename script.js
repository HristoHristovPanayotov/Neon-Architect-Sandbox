const State = {
    selectedElement: null,
    multiSelected: [],
    isDragging: false,
    isSelecting: false,
    selectionStart: { x: 0, y: 0 },
    prevMousePos: { x: 0, y: 0 },
    zCounter: 1
};

const COLORS = ['#00f2ff', '#00ff9d', '#ff007b', '#ad00ff', '#ffcf00'];

function init() {
    const app = document.getElementById('app');

    const canvas = document.createElement('div');
    canvas.id = 'canvas';
    canvas.addEventListener('mousedown', startMarquee);
    app.appendChild(canvas);

    const uiLayer = document.createElement('div');
    uiLayer.id = 'ui-layer';
    uiLayer.innerHTML = `
        <div class="controls">
            <button id="btnCube">+ Create Cube</button>
            <button id="btnCircle">+ Create Sphere</button>
            <div class="instructions">
                • <b>Space Drag:</b> Multi-select<br>
                • <b>Object Drag:</b> Move single or group<br>
                • <b>Backspace/Del:</b> Delete selected<br>
                • <b>Wheel:</b> Resize shapes<br>
                • <b>Right-Click:</b> Morph shape
            </div>
        </div>
    `;
    app.appendChild(uiLayer);

    document.getElementById('btnCube').onclick = () => createShape('cube');
    document.getElementById('btnCircle').onclick = () => createShape('circle');

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
}

// --- CORE FUNCTIONS ---

function createShape(type) {
    const shape = document.createElement('div');
    shape.className = `shape ${type}`;
    
    // Position center-ish
    const randomX = Math.random() * 200 + (window.innerWidth / 2 - 100);
    const randomY = Math.random() * 200 + (window.innerHeight / 2 - 100);

    shape.style.left = `${randomX}px`;
    shape.style.top = `${randomY}px`;
    shape.style.backgroundColor = COLORS[Math.floor(Math.random() * COLORS.length)];
    shape.style.zIndex = State.zCounter++;

    shape.addEventListener('mousedown', handleMouseDown);
    shape.addEventListener('dblclick', handleExplode);
    shape.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.target.classList.toggle('circle');
    });
    shape.addEventListener('wheel', handleScale);

    document.getElementById('canvas').appendChild(shape);
}

function handleMouseDown(e) {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    State.isDragging = true;
    State.prevMousePos = { x: e.clientX, y: e.clientY };

    // Selection management
    if (!State.multiSelected.includes(e.target)) {
        clearSelections();
        State.selectedElement = e.target;
        State.selectedElement.classList.add('active');
        State.selectedElement.style.zIndex = State.zCounter++;
    }
}

function handleMouseMove(e) {
    // 1. Group/Single Dragging
    if (State.isDragging) {
        const dx = e.clientX - State.prevMousePos.x;
        const dy = e.clientY - State.prevMousePos.y;

        const targets = State.multiSelected.length > 0 ? State.multiSelected : [State.selectedElement];
        
        targets.forEach(el => {
            if (!el) return;
            const currentLeft = parseInt(el.style.left);
            const currentTop = parseInt(el.style.top);
            el.style.left = `${currentLeft + dx}px`;
            el.style.top = `${currentTop + dy}px`;
        });

        State.prevMousePos = { x: e.clientX, y: e.clientY };
    }

    // 2. Marquee Drawing
    if (State.isSelecting) {
        const box = document.getElementById('selection-box');
        const width = Math.abs(e.clientX - State.selectionStart.x);
        const height = Math.abs(e.clientY - State.selectionStart.y);
        const left = Math.min(e.clientX, State.selectionStart.x);
        const top = Math.min(e.clientY, State.selectionStart.y);

        box.style.width = `${width}px`;
        box.style.height = `${height}px`;
        box.style.left = `${left}px`;
        box.style.top = `${top}px`;

        const shapes = document.querySelectorAll('.shape');
        const boxRect = box.getBoundingClientRect();

        State.multiSelected = [];
        shapes.forEach(shape => {
            const sRect = shape.getBoundingClientRect();
            const overlap = !(boxRect.right < sRect.left || 
                             boxRect.left > sRect.right || 
                             boxRect.bottom < sRect.top || 
                             boxRect.top > sRect.bottom);
            
            if (overlap) {
                shape.classList.add('multi-selected');
                State.multiSelected.push(shape);
            } else {
                shape.classList.remove('multi-selected');
            }
        });
    }
}

function startMarquee(e) {
    if (e.target !== document.getElementById('canvas')) return;
    State.isSelecting = true;
    State.selectionStart = { x: e.clientX, y: e.clientY };
    clearSelections();

    const box = document.createElement('div');
    box.id = 'selection-box';
    box.className = 'selection-box';
    document.body.appendChild(box);
}

function clearSelections() {
    if (State.selectedElement) State.selectedElement.classList.remove('active');
    State.selectedElement = null;
    State.multiSelected.forEach(el => el.classList.remove('multi-selected'));
    State.multiSelected = [];
}

function handleMouseUp() {
    State.isDragging = false;
    State.isSelecting = false;
    const box = document.getElementById('selection-box');
    if (box) box.remove();
}

function handleKeyDown(e) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        const toDelete = State.multiSelected.length > 0 ? [...State.multiSelected] : (State.selectedElement ? [State.selectedElement] : []);
        toDelete.forEach(el => handleExplode({ target: el }));
        clearSelections();
    }

    // Nudge logic
    if (State.selectedElement) {
        const style = State.selectedElement.style;
        const top = parseInt(style.top);
        const left = parseInt(style.left);
        const step = 10;

        if (e.key === 'ArrowUp') style.top = `${top - step}px`;
        if (e.key === 'ArrowDown') style.top = `${top + step}px`;
        if (e.key === 'ArrowLeft') style.left = `${left - step}px`;
        if (e.key === 'ArrowRight') style.left = `${left + step}px`;
    }
}

function handleScale(e) {
    e.preventDefault();
    const scale = e.deltaY > 0 ? 0.9 : 1.1;
    const targets = State.multiSelected.length > 0 ? State.multiSelected : [e.target];
    
    targets.forEach(el => {
        const size = parseInt(window.getComputedStyle(el).width) * scale;
        if (size > 20 && size < 400) {
            el.style.width = `${size}px`;
            el.style.height = `${size}px`;
        }
    });
}

function handleExplode(e) {
    const el = e.target;
    el.classList.add('exploding');
    el.addEventListener('animationend', () => el.remove(), { once: true });
}

window.onload = init;