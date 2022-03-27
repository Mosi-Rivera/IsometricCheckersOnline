let move_directions = {
    one: [
        {x: 1, y: 1},
        {x: -1, y: 1}
    ],
    two: [
        {x: 1, y: -1},
        {x: -1, y: -1}
    ],
    crowned: [
        {x: 1, y: -1},
        {x: -1, y: -1},
        {x: 1, y: 1},
        {x: -1, y: 1}
    ]
}

class HoverButton extends LIB.Button
{
    constructor(game,config)
    {
        super(game,config);
        this.section_key = config.section_key;
        this.hover_section_key = config.hover_section_key;
        this.pressed_section_key = config.pressed_section_key;
    }
    update(dt)
    {
        if (!this.pressed)
        {
            this.hovering = this.isMouseHovering();
            if (this.hovering)
            {
                this.game.input_manager.setHover(true);
                if (this.game.input_manager.click)
                {
                    this.onclick();
                    this.pressed = true;
                }
            }
        }
    }
    draw(graphics)
    {
        let key = this.pressed ? this.pressed_section_key : (this.hovering ? this.hover_section_key  : this.section_key);
        graphics.drawSection(key,this.x,this.y);
        this.hovering = false;
    }

}

class LoadScene {
    load(graphics)
    {
        graphics.loadSprite('spritesheet','assets/spritesheet.png');
        graphics.loadSprite('background','assets/background.png');
        graphics.loadSprite('buttons','assets/buttons.png');
        graphics.loadSprite('cursors','assets/cursors.png');
        graphics.loadSprite('win_lose','assets/win_lose_buttons.png')
        //tiles 32x32
        graphics.addSection('tile-b','spritesheet',0,   0,  32, 32);
        graphics.addSection('tile-w','spritesheet',32,  0,  32, 32);
        graphics.addSection('tile-h','spritesheet',0,   32, 32, 32);
        graphics.addSection('tile-m','spritesheet',32,  32, 32, 32);
        //pieces 32x32
        graphics.addSection('piece-r','spritesheet',        0,  64, 32, 32);
        graphics.addSection('piece-r-crown','spritesheet',  32, 64, 32, 32);
        graphics.addSection('piece-b','spritesheet',        0,  96, 32, 32);
        graphics.addSection('piece-b-crown','spritesheet',  32, 96, 32, 32);
        //buttons 53x19
        graphics.addSection('button-find-game','buttons',           0,   0,  53, 19);
        graphics.addSection('button-find-game-hover','buttons',     53,  0,  53, 19);
        graphics.addSection('button-find-game-pressed','buttons',   106, 0,  53, 19);
        graphics.addSection('display-opponent-inactive','buttons',  159, 0,  53, 19);
        graphics.addSection('display-opponent-active','buttons',    212, 0,  53, 19);
        graphics.addSection('display-player-inactive','buttons',    265, 0,  53, 19);
        graphics.addSection('display-player-active','buttons',      318, 0,  53, 19);
        //cursors 13x13
        graphics.addSection('cursor','cursors',           13,  0,  13, 13);
        graphics.addSection('cursor-hover','cursors',     0, 0,  13, 13);
        //win lose 79x26
        graphics.addSection('win','win_lose',           0,  0,  79, 26);
        graphics.addSection('win-hover','win_lose',     79,  0,  79, 26);
        graphics.addSection('lose','win_lose',          158,  0,  79, 26);
        graphics.addSection('lose-hover','win_lose',    158 + 79,  0,  79, 26);
    }
    start()
    {
        G_GAME.scene_manager.setScene('landing_scene');
        joinChatRoom();
    }
    update(){}
    draw(){}
    dispose(){}
}

class LandingScene {
    constructor(game)
    {
        this.game = game;
        this.button = new HoverButton(game,{
            onclick: () => {
                joinGame((client,room) => {
                    room.onMessage('game-start',() => {
                        this.game.scene_manager.setScene('game_scene',{room,client}); 
                    });
                    room.onMessage('invalid-input',() => console.log('err: Invali input.'));
                })
            },
            x: 176 - 53 / 2,
            y: 225,
            w: 53,
            h: 19,
            hover_section_key: 'button-find-game-hover',
            section_key: 'button-find-game',
            pressed_section_key: 'button-find-game-pressed'
        });
    }
    load()
    {

    }
    start()
    {

    }
    update()
    {
        this.button.update();
    }
    draw(graphics)
    {
        graphics.drawSprite('background',0,0);
        this.button.draw(graphics);
    }
    dispose(){}
}

class GameScene {
    highlighted_tile = null;
    selected_tile = null;
    move_option_tiles = {};
    constructor(game,{room,client})
    {
        this.is_player_one = room.sessionId === room.state.playerOne;
        this.game = game;
        this.scale_manager = game.scale_manager;
        this.room = room;
        this.client = client;
        this.start_x = this.scale_manager.virtual_width / 2 - 16;
        this.offset_x = (this.scale_manager.virtual_width - 16 * 8) / 2 - 16;
        this.start_y = (this.scale_manager.virtual_height - 16 * 8) / 2;
        let b = this.room.state.playerOne === this.room.sessionId;
        this.player_display = {
            x: b ? 352 - 45 - 53 : 45,
            y: b ? 65 + 10 : 260 - 65 - 19
        };
        this.opponent_display = {
            x: b ? 45 : 352 - 45 - 53,
            y: b ? 260 - 65 - 19 : 65 + 10
        };
        this.stateChange(this.room.state);
        room.onStateChange(this.stateChange.bind(this));
        room.onMessage("game-over",this.gameOver.bind(this));
    }
    gameOver({result,board})
    {
        console.log(result,board);
        this.game_over_button = new HoverButton(this.game,{
            w: 79,
            h: 26,
            x: 352 / 2 - 79 / 2,
            y: 235 - 26 / 2,
            hover_section_key: result + '-hover',
            section_key: result,
            pressed_section_key: result + '-hover',
            onclick: () => {
                this.game.scene_manager.setScene('landing_scene');
            }
        });
        this.board = board;
        this.draw = this.gameOverDraw;
        this.update = this.gameOverUpdate;
    }
    gameOverUpdate()
    {
        this.game_over_button.update();
    }
    gameOverDraw(graphics)
    {
        graphics.drawSprite('background',0,0);
        for (let i = 0, l = 64; i < l; i++)
            this.drawBoardTile(this.board[i],i,graphics);
        this.game_over_button.draw(graphics);
    }
    stateChange({currentTurn,continueIndex})
    {
        let b = currentTurn === this.room.sessionId;
        this.player_display.key = b ? 'display-player-active' : 'display-player-inactive';
        this.opponent_display.key = b ? 'display-opponent-inactive' : 'display-opponent-active';

        if (continueIndex != -1)
        {
            this.selected_tile = continueIndex;
            this.generateMoveOptionTiles(this.selected_tile,true);
            console.log('continueIndex',continueIndex);
        }
    }
    load(graphics,audio)
    {
        
    }
    start(){}
    dispose(){}
    update(dt)
    {
        let {x,y,click} = this.game.input_manager;
        x -= this.start_x;
        y -= this.start_y;
        let cart_x = Math.round(((2 * y + x) / 2) / 16) - 1;
        let cart_y = Math.round(((2 * y - x) / 2) / 16);
        let index = cart_y * 8 + cart_x;
        index = cart_x < 0 || cart_x > 7 || cart_y < 0 || cart_y > 7 ? null : index;
        if (this.room.state.continueIndex != -1)
        {
            if (click && index === this.selected_tile)
            {
                this.room.send('break');
            }
            else if (click && this.room.state.currentTurn === this.room.sessionId && this.move_option_tiles[index])
            {
                this.room.send('continue',index);
                this.selected_tile = null;
                this.move_option_tiles = {};
            }
        }
        else if (index)
        {
            this.highlighted_tile = index;
            let board = this.room.state.board;
            if (click && this.room.state.currentTurn === this.room.sessionId)
            {
                if (this.isPlayerPiece([board[index]] % 100))
                {
                    this.selected_tile = index;
                    this.generateMoveOptionTiles(index);
                }
                else if (this.move_option_tiles[index])
                {
                    //TODO: Send input data;
                    this.room.send('turn',{from: this.selected_tile,to: index});
                    this.selected_tile = null;
                    this.move_option_tiles = {};
                }
                else
                {
                    this.selected_tile = null;
                    this.move_option_tiles = {};
                }
            }
        }
    }
    indexToCoordinates(index)
    {
        return {
            x: index % 8,
            y: Math.floor(index / 8)
        }
    }
    validateCoords(x,y)
    {
        return !(x < 0 || x > 7 || y < 0 || y > 7);
    }
    generateMoveOptionTiles(index,eat_only = false)
    {
        this.move_option_tiles = {};
        let {x,y} = this.indexToCoordinates(index);
        let board = this.room.state.board;
        let move_direction = board[index] > 100 ? move_directions.crowned : move_directions[this.is_player_one ? 'one' : 'two'];
        for (let i = move_direction.length; i--;)
        {
            let {x: cx,y: cy} = move_direction[i];
            let nx = x + cx;
            let ny = y + cy;
            if (!this.validateCoords(nx,ny))
                continue;
            let to_index = ny * 8 + nx;
            let to_tile = board[to_index];
            if (to_tile === 0 && !eat_only)
            {
                this.move_option_tiles[to_index] = true;
                continue;
            }
            else if (!this.isPlayerPiece(to_tile % 100) && to_tile != 0)
            {
                nx += cx;
                ny += cy;
                if (!this.validateCoords(nx,ny))
                    continue;
                to_index = ny * 8 + nx;
                to_tile = board[to_index];
                if (to_tile === 0)
                {
                    this.move_option_tiles[to_index] = true;
                    continue;
                }
            }
        }
    }
    isPlayerPiece(index)
    {
        return this.room.sessionId === this.room.state.playerOne ? !(index < 1 || index > 12) : !(index < 13 || index > 24);
        
    }
    drawTurnDisplay(graphics,{key,x,y})
    {
        graphics.drawSection(key,x,y);
    }
    draw(graphics)
    {
        // graphics.drawBackground('background');
        graphics.drawSprite('background',0,0);
        let board = this.room.state.board;
        for (let i = 0, l = board.length; i < l; i++)
            this.drawBoardTile(board[i],i,graphics);
        this.drawTurnDisplay(graphics,this.player_display);
        this.drawTurnDisplay(graphics,this.opponent_display);
    }
    drawBoardTile(tile,index,graphics)
    {
        let ix = (index % 8);
        let iy = Math.floor(index / 8) ;
        let x = ix * 16;
        let y = iy * 16;
        let tile_key = this.move_option_tiles[index] ? 'tile-m' : (index == this.highlighted_tile || index == this.selected_tile ? 'tile-h' : ((iy + ix) % 2 == 0 ? 'tile-b' : 'tile-w'));
        graphics.drawSection(tile_key,this.start_x + x - y,this.start_y + (x + y) / 2);
        // graphics.drawSection((index + y) % 2 == 1 ? 'tile-b' : 'tile-w',10,10);
        if (tile != 0)
        {
            let piece_key = !this.isPlayerPiece(tile % 100) ? (tile > 100 ? 'piece-r-crown' : 'piece-r') : (tile > 100 ? 'piece-b-crown' : 'piece-b');
            graphics.drawSection(piece_key,this.start_x + x - y,this.start_y + (x + y) / 2 - 19);
        }
    }
}

let G_GAME = new LIB.Game({
    width: 352,
    height: 260,
    scenes: {game_scene: GameScene,landing_scene: LandingScene, load_scene: LoadScene},
    default_scene: 'load_scene'
});