// パーティクルエフェクト用
let particles = [];

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 4;
        this.vy = (Math.random() - 0.5) * 4;
        this.life = 1.0;
        this.decay = Math.random() * 0.02 + 0.01;
        this.color = color;
        this.size = Math.random() * 3 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= this.decay;
        this.size *= 0.98;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// ゲーム状態管理
class GameManager {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.nextCanvas = document.getElementById('next-canvas');
        this.nextCtx = this.nextCanvas.getContext('2d');
        this.holdCanvas = document.getElementById('hold-canvas');
        this.holdCtx = this.holdCanvas.getContext('2d');
        
        this.field = [];
        this.currentTetromino = null;
        this.nextTetromino = null;
        this.holdTetromino = null;
        this.canHold = true;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.paused = false;
        this.gameRunning = false;
        
        this.dropTime = GAME_CONFIG.INITIAL_DROP_TIME;
        this.lastTime = 0;
        this.dropCounter = 0;
        
        this.init();
    }

    init() {
        this.field = Array(GAME_CONFIG.FIELD_HEIGHT).fill().map(() => 
            Array(GAME_CONFIG.FIELD_WIDTH).fill(0)
        );
        this.setupEventListeners();
        this.draw();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.getElementById('start-btn').addEventListener('click', () => this.start());
        document.getElementById('pause-btn').addEventListener('click', () => this.togglePause());
        
        // タッチコントローラーのイベントリスナー
        const touchButtons = [
            { id: 'btn-left', action: () => this.move(-1) },
            { id: 'btn-right', action: () => this.move(1) },
            { id: 'btn-down', action: () => this.softDrop() },
            { id: 'btn-hard-drop', action: () => this.hardDrop() },
            { id: 'btn-rotate', action: () => this.rotate() },
            { id: 'btn-hold', action: () => this.hold() }
        ];
        
        // ホールドボタンのイベントリスナー
        document.getElementById('hold-btn').addEventListener('click', () => this.hold());
        
        // モバイル用のスタート・ポーズボタン
        const mobileStartBtn = document.getElementById('mobile-start-btn');
        const mobilePauseBtn = document.getElementById('mobile-pause-btn');
        
        // タッチイベント
        mobileStartBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.start();
        });
        mobilePauseBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.togglePause();
        });
        
        // クリックイベント
        mobileStartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.start();
        });
        mobilePauseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.togglePause();
        });

        touchButtons.forEach(button => {
            const element = document.getElementById(button.id);
            
            // タッチイベント
            element.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (this.gameRunning && !this.paused && !this.gameOver) {
                    button.action();
                }
            });
            
            // マウスイベント（PC用）
            element.addEventListener('click', (e) => {
                e.preventDefault();
                if (this.gameRunning && !this.paused && !this.gameOver) {
                    button.action();
                }
            });
        });
    }

    start() {
        this.gameRunning = true;
        this.gameOver = false;
        this.paused = false;
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.dropTime = GAME_CONFIG.INITIAL_DROP_TIME;
        
        this.field = Array(GAME_CONFIG.FIELD_HEIGHT).fill().map(() => 
            Array(GAME_CONFIG.FIELD_WIDTH).fill(0)
        );
        
        // ホールド状態をリセット
        this.holdTetromino = null;
        this.canHold = true;
        
        this.currentTetromino = this.createTetromino();
        this.nextTetromino = this.createTetromino();
        
        document.getElementById('start-btn').disabled = true;
        document.getElementById('pause-btn').disabled = false;
        document.getElementById('game-over').style.display = 'none';
        
        this.updateUI();
        this.gameLoop();
    }

    togglePause() {
        if (!this.gameRunning || this.gameOver) return;
        
        this.paused = !this.paused;
        document.getElementById('pause-btn').textContent = this.paused ? '再開' : '一時停止';
        
        if (!this.paused) {
            this.gameLoop();
        }
    }

    gameLoop(time = 0) {
        if (!this.gameRunning || this.paused || this.gameOver) return;

        const deltaTime = time - this.lastTime;
        this.lastTime = time;
        this.dropCounter += deltaTime;

        if (this.dropCounter > this.dropTime) {
            this.drop();
            this.dropCounter = 0;
        }

        this.draw();
        requestAnimationFrame((time) => this.gameLoop(time));
    }

    createTetromino() {
        const types = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        return {
            type: type,
            x: Math.floor(GAME_CONFIG.FIELD_WIDTH / 2) - 1,
            y: 0,
            rotation: 0,
            shape: TETROMINOES[type][0]
        };
    }

    drop() {
        if (this.canMove(0, 1)) {
            this.currentTetromino.y++;
        } else {
            this.placeTetromino();
            this.clearLines();
            this.currentTetromino = this.nextTetromino;
            this.nextTetromino = this.createTetromino();
            
            // 新しいピースでホールド可能にリセット
            this.canHold = true;
            
            // 次のピース表示を更新
            this.drawNextPiece();
            
            if (!this.canPlace(this.currentTetromino)) {
                this.endGame();
            }
        }
    }

    canMove(dx, dy) {
        return this.canPlace({
            ...this.currentTetromino,
            x: this.currentTetromino.x + dx,
            y: this.currentTetromino.y + dy
        });
    }

    canPlace(tetromino) {
        for (let y = 0; y < tetromino.shape.length; y++) {
            for (let x = 0; x < tetromino.shape[y].length; x++) {
                if (tetromino.shape[y][x]) {
                    const newX = tetromino.x + x;
                    const newY = tetromino.y + y;
                    
                    if (newX < 0 || newX >= GAME_CONFIG.FIELD_WIDTH || 
                        newY >= GAME_CONFIG.FIELD_HEIGHT) {
                        return false;
                    }
                    
                    if (newY >= 0 && this.field[newY][newX]) {
                        return false;
                    }
                }
            }
        }
        return true;
    }

    move(dx) {
        if (this.canMove(dx, 0)) {
            this.currentTetromino.x += dx;
        }
    }

    rotate() {
        const currentShapes = TETROMINOES[this.currentTetromino.type];
        const nextRotation = (this.currentTetromino.rotation + 1) % currentShapes.length;
        
        const rotatedTetromino = {
            ...this.currentTetromino,
            rotation: nextRotation,
            shape: currentShapes[nextRotation]
        };
        
        if (this.canPlace(rotatedTetromino)) {
            this.currentTetromino = rotatedTetromino;
        }
    }

    softDrop() {
        if (this.canMove(0, 1)) {
            this.currentTetromino.y++;
            this.score += 1;
        }
    }

    hardDrop() {
        while (this.canMove(0, 1)) {
            this.currentTetromino.y++;
            this.score += 2;
        }
        this.drop();
    }

    hold() {
        if (!this.canHold || !this.gameRunning || this.paused || this.gameOver) return;

        if (this.holdTetromino === null) {
            // 初回ホールド
            this.holdTetromino = { ...this.currentTetromino };
            this.currentTetromino = this.nextTetromino;
            this.nextTetromino = this.createTetromino();
        } else {
            // ホールドとの交換
            const temp = { ...this.holdTetromino };
            this.holdTetromino = { ...this.currentTetromino };
            this.currentTetromino = temp;
        }

        // 位置をリセット
        this.currentTetromino.x = Math.floor(GAME_CONFIG.FIELD_WIDTH / 2) - 1;
        this.currentTetromino.y = 0;
        this.currentTetromino.rotation = 0;
        this.currentTetromino.shape = TETROMINOES[this.currentTetromino.type][0];

        // ホールド不可にする（1回のピースにつき1回まで）
        this.canHold = false;

        // UI更新
        this.drawNextPiece();
        this.drawHoldPiece();
    }

    placeTetromino() {
        for (let y = 0; y < this.currentTetromino.shape.length; y++) {
            for (let x = 0; x < this.currentTetromino.shape[y].length; x++) {
                if (this.currentTetromino.shape[y][x]) {
                    const fieldX = this.currentTetromino.x + x;
                    const fieldY = this.currentTetromino.y + y;
                    
                    if (fieldY >= 0) {
                        this.field[fieldY][fieldX] = this.currentTetromino.type;
                    }
                }
            }
        }
    }

    clearLines() {
        const linesToClear = [];
        
        for (let y = 0; y < GAME_CONFIG.FIELD_HEIGHT; y++) {
            if (this.field[y].every(cell => cell !== 0)) {
                linesToClear.push(y);
            }
        }
        
        if (linesToClear.length > 0) {
            // パーティクルエフェクトを生成
            linesToClear.forEach(lineY => {
                for (let x = 0; x < GAME_CONFIG.FIELD_WIDTH; x++) {
                    const blockType = this.field[lineY][x];
                    const color = COLORS[blockType] ? COLORS[blockType].main : '#ffffff';
                    
                    // ブロック位置からパーティクルを生成
                    for (let i = 0; i < 3; i++) {
                        const particleX = x * GAME_CONFIG.BLOCK_SIZE + GAME_CONFIG.BLOCK_SIZE / 2;
                        const particleY = lineY * GAME_CONFIG.BLOCK_SIZE + GAME_CONFIG.BLOCK_SIZE / 2;
                        particles.push(new Particle(particleX, particleY, color));
                    }
                }
            });
            
            // ライン消去
            linesToClear.forEach(lineY => {
                this.field.splice(lineY, 1);
                this.field.unshift(Array(GAME_CONFIG.FIELD_WIDTH).fill(0));
            });
            
            // スコア計算
            const linesCleared = linesToClear.length;
            this.lines += linesCleared;
            this.score += GAME_CONFIG.SCORE_MULTIPLIER[linesCleared] * this.level;
            
            // レベルアップ
            const newLevel = Math.floor(this.lines / GAME_CONFIG.LEVEL_UP_LINES) + 1;
            if (newLevel > this.level) {
                this.level = newLevel;
                this.dropTime = Math.max(50, GAME_CONFIG.INITIAL_DROP_TIME - (this.level - 1) * 100);
            }
            
            this.updateUI();
        }
    }

    handleKeyDown(event) {
        // 十字キーとスペースキーのページスクロール・デフォルト動作を防止
        if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space'].includes(event.code)) {
            event.preventDefault();
        }

        if (!this.gameRunning || this.paused || this.gameOver) return;

        switch(event.code) {
            case 'ArrowLeft':
                this.move(-1);
                break;
            case 'ArrowRight':
                this.move(1);
                break;
            case 'ArrowDown':
                this.softDrop();
                break;
            case 'ArrowUp':
                this.hardDrop();
                break;
            case 'Space':
                this.rotate();
                break;
            case 'KeyC':
                this.hold();
                break;
        }
    }

    endGame() {
        this.gameOver = true;
        this.gameRunning = false;
        document.getElementById('start-btn').disabled = false;
        document.getElementById('pause-btn').disabled = true;
        document.getElementById('final-score').textContent = this.score;
        document.getElementById('game-over').style.display = 'block';
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
        this.drawNextPiece();
        this.drawHoldPiece();
    }

    drawNextPiece() {
        this.nextCtx.clearRect(0, 0, 80, 80);
        
        if (this.nextTetromino) {
            const shape = this.nextTetromino.shape;
            const blockSize = 15;
            const offsetX = (80 - shape[0].length * blockSize) / 2;
            const offsetY = (80 - shape.length * blockSize) / 2;
            
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        this.drawNextGradientBlock(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1,
                            COLORS[this.nextTetromino.type]
                        );
                    }
                }
            }
        }
    }

    // ホールドピース描画
    drawHoldPiece() {
        this.holdCtx.clearRect(0, 0, 80, 80);
        
        if (this.holdTetromino) {
            const shape = TETROMINOES[this.holdTetromino.type][0];
            const blockSize = 15;
            const offsetX = (80 - shape[0].length * blockSize) / 2;
            const offsetY = (80 - shape.length * blockSize) / 2;
            
            for (let y = 0; y < shape.length; y++) {
                for (let x = 0; x < shape[y].length; x++) {
                    if (shape[y][x]) {
                        this.drawHoldGradientBlock(
                            offsetX + x * blockSize,
                            offsetY + y * blockSize,
                            blockSize - 1,
                            blockSize - 1,
                            COLORS[this.holdTetromino.type],
                            this.canHold
                        );
                    }
                }
            }
        }
    }

    // Next ピース用のグラデーションブロック描画
    drawNextGradientBlock(x, y, width, height, colorSet) {
        // メインブロック（グラデーション）
        const gradient = this.nextCtx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, colorSet.light);
        gradient.addColorStop(0.5, colorSet.main);
        gradient.addColorStop(1, colorSet.dark);
        
        this.nextCtx.fillStyle = gradient;
        this.nextCtx.fillRect(x, y, width, height);
        
        // ハイライト効果
        this.nextCtx.fillStyle = colorSet.light + '60'; // 透明度37.5%
        this.nextCtx.fillRect(x, y, width / 3, height / 3);
    }

    // ホールドピース用のグラデーションブロック描画
    drawHoldGradientBlock(x, y, width, height, colorSet, canUse) {
        // メインブロック（グラデーション）
        const gradient = this.holdCtx.createLinearGradient(x, y, x + width, y + height);
        
        if (canUse) {
            // 使用可能時は通常の色
            gradient.addColorStop(0, colorSet.light);
            gradient.addColorStop(0.5, colorSet.main);
            gradient.addColorStop(1, colorSet.dark);
        } else {
            // 使用不可時はグレーアウト
            gradient.addColorStop(0, '#888');
            gradient.addColorStop(0.5, '#555');
            gradient.addColorStop(1, '#333');
        }
        
        this.holdCtx.fillStyle = gradient;
        this.holdCtx.fillRect(x, y, width, height);
        
        // ハイライト効果
        if (canUse) {
            this.holdCtx.fillStyle = colorSet.light + '60';
        } else {
            this.holdCtx.fillStyle = '#aaa60';
        }
        this.holdCtx.fillRect(x, y, width / 3, height / 3);
    }

    // 落下予測（ゴーストピース）描画
    drawGhostPiece() {
        // 現在のテトロミノの落下予測位置を計算
        const ghostTetromino = {
            ...this.currentTetromino,
            y: this.currentTetromino.y
        };
        
        // 最下点まで下げる
        while (this.canPlace({
            ...ghostTetromino,
            y: ghostTetromino.y + 1
        })) {
            ghostTetromino.y++;
        }
        
        // 現在位置と同じ場合は描画しない
        if (ghostTetromino.y === this.currentTetromino.y) {
            return;
        }
        
        // ゴーストピースを半透明の枠線で描画
        this.ctx.strokeStyle = COLORS[this.currentTetromino.type].main;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]); // 点線パターン
        
        for (let y = 0; y < ghostTetromino.shape.length; y++) {
            for (let x = 0; x < ghostTetromino.shape[y].length; x++) {
                if (ghostTetromino.shape[y][x]) {
                    const drawX = (ghostTetromino.x + x) * GAME_CONFIG.BLOCK_SIZE;
                    const drawY = (ghostTetromino.y + y) * GAME_CONFIG.BLOCK_SIZE;
                    
                    if (drawY >= 0) {
                        this.ctx.strokeRect(
                            drawX + 2,
                            drawY + 2,
                            GAME_CONFIG.BLOCK_SIZE - 4,
                            GAME_CONFIG.BLOCK_SIZE - 4
                        );
                    }
                }
            }
        }
        
        // 点線パターンをリセット
        this.ctx.setLineDash([]);
    }

    draw() {
        // フィールドクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // ゲームフィールドのサイズ計算
        const fieldWidth = GAME_CONFIG.FIELD_WIDTH * GAME_CONFIG.BLOCK_SIZE;
        const fieldHeight = GAME_CONFIG.FIELD_HEIGHT * GAME_CONFIG.BLOCK_SIZE;

        // グリッド描画（ゲームフィールド内のみ）
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x <= GAME_CONFIG.FIELD_WIDTH; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * GAME_CONFIG.BLOCK_SIZE, 0);
            this.ctx.lineTo(x * GAME_CONFIG.BLOCK_SIZE, fieldHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y <= GAME_CONFIG.FIELD_HEIGHT; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * GAME_CONFIG.BLOCK_SIZE);
            this.ctx.lineTo(fieldWidth, y * GAME_CONFIG.BLOCK_SIZE);
            this.ctx.stroke();
        }

        // 固定済みブロック描画（グラデーション効果付き）
        for (let y = 0; y < GAME_CONFIG.FIELD_HEIGHT; y++) {
            for (let x = 0; x < GAME_CONFIG.FIELD_WIDTH; x++) {
                if (this.field[y][x]) {
                    this.drawGradientBlock(
                        x * GAME_CONFIG.BLOCK_SIZE + 1,
                        y * GAME_CONFIG.BLOCK_SIZE + 1,
                        GAME_CONFIG.BLOCK_SIZE - 2,
                        GAME_CONFIG.BLOCK_SIZE - 2,
                        COLORS[this.field[y][x]]
                    );
                }
            }
        }

        // 落下予測線を描画
        if (this.currentTetromino) {
            this.drawGhostPiece();
        }

        // 現在のテトロミノ描画（グラデーション効果付き）
        if (this.currentTetromino) {
            for (let y = 0; y < this.currentTetromino.shape.length; y++) {
                for (let x = 0; x < this.currentTetromino.shape[y].length; x++) {
                    if (this.currentTetromino.shape[y][x]) {
                        const drawX = (this.currentTetromino.x + x) * GAME_CONFIG.BLOCK_SIZE;
                        const drawY = (this.currentTetromino.y + y) * GAME_CONFIG.BLOCK_SIZE;
                        
                        if (drawY >= 0) {
                            this.drawGradientBlock(
                                drawX + 1,
                                drawY + 1,
                                GAME_CONFIG.BLOCK_SIZE - 2,
                                GAME_CONFIG.BLOCK_SIZE - 2,
                                COLORS[this.currentTetromino.type]
                            );
                        }
                    }
                }
            }
        }

        // パーティクル更新と描画
        particles = particles.filter(particle => {
            particle.update();
            particle.draw(this.ctx);
            return particle.life > 0;
        });
    }

    // グラデーションブロック描画関数
    drawGradientBlock(x, y, width, height, colorSet) {
        // メインブロック（グラデーション）
        const gradient = this.ctx.createLinearGradient(x, y, x + width, y + height);
        gradient.addColorStop(0, colorSet.light);
        gradient.addColorStop(0.5, colorSet.main);
        gradient.addColorStop(1, colorSet.dark);
        
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(x, y, width, height);
        
        // ハイライト効果
        this.ctx.fillStyle = colorSet.light + '40'; // 透明度25%
        this.ctx.fillRect(x, y, width / 3, height / 3);
        
        // 境界線
        this.ctx.strokeStyle = colorSet.dark;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }
}

// ゲーム再開関数
function restartGame() {
    game.start();
}

// ゲーム初期化
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new GameManager();
});