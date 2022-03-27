import http from "http";
import {GameState} from './schemas/GameState';
import { Room, Client } from "colyseus";

interface IInput
{
    from: number;
    to: number;
}

class Vector2
{
    x:number;
    y:number;
    constructor(x:number,y:number)
    {
        this.x = x;
        this.y = y;
    }
}

const getOtherRange = (is_p1:boolean) => {
    if (is_p1)
        return (i:number) => i > 12 && i < 25;
    return (i:number) => i > 0 && i < 13;
}

const cleanInput = (message:any) : IInput => {
    return {
        from: Math.round(message.from),
        to: Math.round(message.to)
    };
}

export default class GameRoom extends Room<GameState> {
    maxClients: number = 2;
    pieces:{[key: string]: number};
    game_over:boolean = false;
    // When room is initialized
    onCreate (options: any) {
        this.setState(new GameState());
        this.onMessage("turn",this.validateMove.bind(this));
        this.onMessage('continue',this.validateContinue.bind(this));
        this.onMessage('break',this.continueBreak.bind(this));
    }

    // Authorize client based on provided options before WebSocket handshake is complete
    onAuth (client: Client, options: any, request: http.IncomingMessage) { return true; }

    // When client successfully join the room
    onJoin (client: Client, options: any, auth: any) {
        if (this.clients.length == 2)
        {
            this.state.playerOne = client.id;
            this.state.currentTurn = client.id;
            this.state.waiting = false;
            this.pieces = {
                [this.clients[0].id]: 12,
                [this.clients[1].id]: 12
            };
            this.broadcast('game-start');
            this.lock();
        }
    }

    continueBreak(client:Client)
    {
        this.state.continueIndex = -1;
        this.state.currentTurn = this.findOtherclientId(client.id);
    }

    gameOver(winner:Client,loser:Client)
    {
        winner.send('game-over',{result: 'win',board: this.state.board});
        loser.send('game-over',{result: 'lose',board: this.state.board});
        this.game_over = true;
        this.disconnect();
    }

    // When a client leaves the room
    onLeave (client: Client, consented: boolean) {
        if (!this.game_over)
        {
            this.game_over = true;
            this.broadcast('game-over',{result: 'win',board: this.state.board});
            this.disconnect();
        }
    }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose () { }

    validateContinue(client:Client,message: any)
    {
        if (this.state.continueIndex != -1)
            this.validateMove(client,{from: this.state.continueIndex, to: message});
    }

    validateMove(client: Client, message: any)
    {
        if (this.state.currentTurn !== client.id)
                return;
        if (typeof message !== "object")
            return client.send('invalid-input');
        let {from,to} = cleanInput(message);
        let position_from = this.validateBoardIndex(from);
        let position_to = this.validateBoardIndex(to);
        if (!position_from || !position_to)
            return client.send('invalid-input');
        
        if (!this.validatePiece(client.id,from) || this.state.board[to] !== 0)
            return client.send('invalid-input');
        
        if (!this.executeMove(client,from,position_from,to,position_to))
            return client.send('invalid-input');

        this.state.continueIndex = -1;

        if (!this.checkGameOver(client))
            this.state.currentTurn = this.findOtherclientId(client.id);
    }
    checkGameOver(client:Client) : boolean
    {
        let otherClient: Client = this.findOtherClient(client.id);
        if (this.pieces[client.id] == 0)
        {
            this.gameOver(otherClient,client);
            return true;
        }
        else if (this.pieces[otherClient.id] == 0)
        {
            this.gameOver(client,otherClient);
            return true;
        }
        return false;
    }
    findOtherClient(id: String) : Client
    {
        return this.clients[this.clients[0].id == id ? 1 : 0];
    }
    findOtherclientId(id: string) : string
    {
        return this.clients[this.clients[0].id == id ? 1 : 0].id;
    }
    getPlayerIndex(client:Client)
    {
        return this.state.playerOne === client.id ? 0 : 1;
    }
    getOtherPlayerIndex(client:Client)
    {
        return this.state.playerOne === client.id ? 1 : 0;
    }
    executeMove(client:Client,from:number,position_from:Vector2,to:number,position_to:Vector2) : boolean
    {
        let cx = position_to.x - position_from.x;
        let cy = position_to.y - position_from.y;
        let abs_cx = Math.abs(cx);
        let abs_cy = Math.abs(cy);
        if (abs_cy !== abs_cx || abs_cx > 2)
            return false;
        if (abs_cx == 1)
        {
            this.state.board[to] = this.state.board[from];
            this.state.board[from] = 0;
            this.state.board[to] += client.id === this.state.playerOne ? (Math.floor(to / 8) === 7 ? 100 : 0) : (Math.floor(to / 8) === 0 ? 100 : 0);
            return true;
        }
        else if (abs_cx == 2)
        {
            let piece = this.state.board[from] % 100;
            let _x:number = position_from.x + Math.sign(cx);
            let _y:number = position_from.y + Math.sign(cy);
            let other_piece_index:number = _y * 8 + _x;
            let other_piece = this.state.board[other_piece_index];
            if (other_piece === 0)
                return false;
            if ((piece <= 12 && other_piece > 12) || (piece > 12 && other_piece <= 12))
            {
                this.state.board[to] = this.state.board[from];
                this.state.board[from] = 0;
                this.state.board[other_piece_index] = 0;
                this.state.board[to] += client.id === this.state.playerOne ? (Math.floor(to / 8) === 7 ? 100 : 0) : (Math.floor(to / 8) === 0 ? 100 : 0);
                this.pieces[this.findOtherclientId(client.id)]--;
                if (this.checkForMoreMoves(client,to))
                {
                    this.state.continueIndex = to;
                    return false;
                }
                return true;
            }
        }
        return false;;
    }

    checkForMoreMoves(client:Client,to:number) : boolean
    {
        let board = this.state.board;
        let piece = board[to] % 100;
        let dirs: Array<{x: number, y: number}>;
        if (board[to] > 100)
            dirs = [{x:1,y:1},{x:-1,y:1},{x:1,y:-1},{x:-1,y:-1}];
        else
            dirs = this.state.playerOne === client.id ? [{x:1,y:1},{x:-1,y:1}] : [{x:1,y:-1},{x:-1,y:-1}];
        let other_range = getOtherRange(this.state.playerOne === client.id);
        let x = to % 8;
        let y = Math.floor(to / 8);
        for(let i = 2; i--;)
        {
            let {x:cx,y:cy} = dirs[i];
            let nx = x + cx;
            let ny = y + cy;
            if (other_range(board[ny * 8 + nx]) && board[(ny + cy) * 8 + (nx + cx)] == 0)
                return true;
        }
        return false;
    }

    validatePiece(id:string,index:number) : boolean
    {
        let piece = this.state.board[index] % 100;
        return id === this.state.playerOne ? (piece >= 1 && piece <= 12) : (piece >= 13 && piece <= 24);
    }

    validateCoordinates(x:number,y:number) : boolean
    {
        return !(
            x < 0 ||
            x >= 8 ||
            y < 0 || y >= 8
        );
    }

    validateBoardIndex(index:any) : Vector2 | false
    {
        if (typeof index !== 'number' || isNaN(index))
            return false;
        index = Math.round(index);
        let x = index % 8;
        let y = Math.floor(index / 8);
        return this.validateCoordinates(x,y) ? new Vector2(x,y) : false;
    }
}