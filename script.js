const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 640;
canvas.height = 480;
ctx.fillStyle = '#ffffff';
ctx.fillRect(0, 0, canvas.width, canvas.height);
const drawingDiv = document.querySelector('#drawing');
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

const undoButton = document.querySelector('#undo');
undoButton.setAttribute('disabled', '');

const undoStack = [];

function pushImageState() {
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    undoButton.removeAttribute('disabled');
}

function restoreImageState() {
    if (undoStack.length > 0) {
        ctx.putImageData(undoStack[undoStack.length - 1], 0, 0);
    }
}

function popImageState() {
    if (undoStack.length > 0) {
        const imageData = undoStack.pop();
        if (imageData.width != canvas.width || imageData.height != canvas.height) {
            canvas.width = imageData.width;
            canvas.height = imageData.height;
            widthInput.value = imageData.width;
            heightInput.value = imageData.height;
        }
        ctx.putImageData(imageData, 0, 0);
    }
    if (undoStack.length == 0) {
        undoButton.setAttribute('disabled', '');
    }
}

undoButton.onclick = popImageState;

window.onkeydown = e => {
    // handle Ctrl+Z
    if (e.ctrlKey && e.code == 'KeyZ')
        popImageState();
}

let mode = 'brush';
let colorPicking = false;
let mouseDown = false;
let zoomLevel = 1;
let lastX = 0;
let lastY = 0;

function setColor(color) {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    colorInput.value = color;
}

function toCanvasCoordinates(x, y) {
    const {x: canvasX, y: canvasY} = canvas.getBoundingClientRect();
    return [(x - canvasX) / zoomLevel, (y - canvasY) / zoomLevel];
}

document.onmouseup = () => mouseDown = false;

canvas.onmousedown = e => {
    const [currentX, currentY] = toCanvasCoordinates(e.clientX, e.clientY);
    if (!mouseDown) {
        lastX = currentX;
        lastY = currentY;
        if (colorPicking) {
            const data = ctx.getImageData(currentX, currentY, 1, 1).data;
            // turn image data into hex color
            const color = '#' + [data[0], data[1], data[2]].map(n => ('0' + n.toString(16)).slice(-2)).join('')
            setColor(color);
            colorPicker.removeAttribute('disabled');
            colorPicking = false;
        } else {
            mouseDown = true;
            pushImageState();
        }
    }
};

document.onmousemove = e => {
    const [currentX, currentY] = toCanvasCoordinates(e.clientX, e.clientY);
    if (mouseDown && !colorPicking) {
        switch (mode) {
        case 'brush':
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            lastX = currentX;
            lastY = currentY;
            break;
        case 'line':
            restoreImageState();
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(currentX, currentY);
            ctx.stroke();
            break;
        case 'rectangle':
            restoreImageState();
            ctx.strokeRect(lastX, lastY, currentX - lastX, currentY - lastY);
            break;
        case 'filled_rectangle':
            restoreImageState();
            ctx.fillRect(lastX, lastY, currentX - lastX, currentY - lastY);
            break;
        case 'ellipse':
        case 'filled_ellipse':
            restoreImageState();
            ctx.beginPath();
            ctx.ellipse((currentX + lastX) / 2, (currentY + lastY) / 2, Math.abs(currentX - lastX) / 2, Math.abs(currentY - lastY) / 2, 0, 0, 2 * Math.PI);
            if (mode == 'filled_ellipse')
                ctx.fill();
            else
                ctx.stroke();
            break;
        }
    }
};

function resizeCanvas(width, height) {
    pushImageState();
    canvas.width = width;
    canvas.height = height;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    restoreImageState();
}

const widthInput = document.querySelector('#width');
widthInput.value = canvas.width;
widthInput.onchange = () => {
    if (widthInput.value)
        resizeCanvas(widthInput.value, canvas.height);
}

const heightInput = document.querySelector('#height');
heightInput.value = canvas.height;
heightInput.onchange = () => {
    if (heightInput.value)
        resizeCanvas(canvas.width, heightInput.value);
}

const zoomInput = document.querySelector('#zoom');
zoomInput.value = zoomLevel;
zoomInput.oninput = () => {
    if (zoomInput.value > 0) {
        const drawingDivRect = drawingDiv.getBoundingClientRect();
        const [centerX, centerY] = toCanvasCoordinates((drawingDivRect.left + drawingDivRect.right) / 2, (drawingDivRect.bottom - drawingDivRect.top) / 2);
        zoomLevel = zoomInput.value;
        canvas.style.width = zoomLevel * canvas.width + 'px';
        canvas.style.height = zoomLevel * canvas.height + 'px';
        // set scroll to ensure center stays the same
        drawingDiv.scrollLeft = centerX * zoomLevel - (drawingDivRect.right - drawingDivRect.left) / 2;
        drawingDiv.scrollTop = centerY * zoomLevel - (drawingDivRect.bottom - drawingDivRect.top) / 2;
    }
}

const thicknessInput = document.querySelector('#thickness');
thicknessInput.value = 1;
ctx.lineWidth = thicknessInput.value;
thicknessInput.oninput = () => {
    if (thicknessInput.value > 0)
        ctx.lineWidth = thicknessInput.value;
}

const colorInput = document.querySelector('#color');
setColor('#000000');
colorInput.onchange = () => setColor(colorInput.value);

for (const id of ['brush', 'line', 'rectangle', 'filled_rectangle', 'ellipse', 'filled_ellipse']) {
    document.querySelector('#' + id).onclick = () => {
        mouseDown = false;
        mode = id;
    };
}

const colorPicker = document.querySelector('#color_picker');
colorPicker.onclick = () => {
    mouseDown = false;
    colorPicking = true;
    colorPicker.setAttribute('disabled', '');
}
