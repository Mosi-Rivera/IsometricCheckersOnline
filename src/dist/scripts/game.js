class LandingScene {
    constructor(game)
    {
        this.game = game;
    }
    load()
    {

    }
    start()
    {
        joinGame((client,room) => {
            this.game.scene_manager.setScene('game_scene',{room,client});
        })
    }
    dispose(){}
}

class GameScene {
    highlighted_tile = null;
    selected_tile = null;
    move_option_tiles = {};
    constructor(game,{room,client})
    {
        this.game = game;
        this.scale_manager = game.scale_manager;
        this.room = room;
        this.client = client;
        this.start_x = this.scale_manager.virtual_width / 2;
        this.offset_x = (this.scale_manager.virtual_width - 16 * 8) / 2;
        this.start_y = (this.scale_manager.virtual_height - 16 * 8) / 2;
    }
    load(graphics,audio)
    {
        graphics.loadSprite('spritesheet','assets/spritesheet.png');
        graphics.addSection('tile-b','spritesheet',0,0,32,32);
        graphics.addSection('tile-w','spritesheet',32,0,32,32);
        graphics.addSection('tile-h','spritesheet',0,32,32,32);
        graphics.addSection('tile-m','spritesheet',32,32,32,32);
        graphics.addSection('piece-r','spritesheet',0,64,32,32);
        graphics.addSection('piece-r-crown','spritesheet',32,64,32,32);
        graphics.addSection('piece-b','spritesheet',0,96,32,32);
        graphics.addSection('piece-b-crown','spritesheet',32,96,32,32);
    }
    start(){}
    dispose(){}
    update(dt)
    {
        let {x,y} = this.game.input_manager;
        x -= this.start_x;
        y -= this.start_y;
        let cart_x = Math.round(((2 * y + x) / 2) / 16) - 1;
        let cart_y = Math.round(((2 * y - x) / 2) / 16);
        let index = cart_y * 8 + cart_x;
        this.highlighted_tile = cart_x < 0 || cart_x > 7 || cart_y < 0 || cart_y > 7 ? null : index;
    }
    draw(graphics)
    {
        let board = this.room.state.board;
        if (this.client.id === this.room.state.playerOne)
        {
            for (let i = 0, l = board.length; i < l; i++)
                this.drawBoardTile(board[i],i,graphics);
        }
        else
        {
            for (let i = 0, l = board.length; i < l; i++)
                this.drawBoardTile(board[i + l],i + l,graphics);
        }
    }
    drawBoardTile(tile,index,graphics)
    {
        let ix = (index % 8);
        let iy = Math.floor(index / 8) ;
        let x = ix * 16;
        let y = iy * 16;
        let tile_key = index == this.highlighted_tile ? 'tile-h' : ((iy + ix) % 2 == 0 ? 'tile-b' : 'tile-w');
        graphics.drawSection(tile_key,this.start_x + x - y,this.start_y + (x + y) / 2);
        // graphics.drawSection((index + y) % 2 == 1 ? 'tile-b' : 'tile-w',10,10);
        if (tile != 0)
            graphics.drawSection(tile <= 12 ? 'piece-r' : 'piece-b',this.start_x + x - y,this.start_y + (x + y) / 2 - 19);
    }
}

let G_GAME = new LIB.Game({
    width: 340,
    height: 260,
    scenes: {game_scene: GameScene,landing_scene: LandingScene},
    default_scene: 'landing_scene'
});