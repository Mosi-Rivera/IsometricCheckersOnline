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

const cleanInput = (message:any) : IInput => {
    return {
        from: Math.round(message.from),
        to: Math.round(message.to)
    };
}

export default class GameRoom extends Room<GameState> {
    maxClients: number = 2;
    // When room is initialized
    onCreate (options: any) {
        this.setState(new GameState());
        this.onMessage("turn",this.validateMove);
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
            this.broadcast('game-start');
            this.lock();
        }
    }

    // When a client leaves the room
    onLeave (client: Client, consented: boolean) { }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose () { }

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
            
        
        if (!this.executeMove(from,position_from,to,position_to))
            return client.send('invalid-input');

        this.state.currentTurn = this.findOtherclientId(client.id);
    }

    findOtherclientId(id: string) : string
    {
        return this.clients[this.clients[0].id == id ? 1 : 0].id;
    }

    executeMove(from:number,position_from:Vector2,to:number,position_to:Vector2) : boolean
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
            return true;
        }
        else if (abs_cx == 2)
        {
            let piece = this.state.board[from];
            let other_piece = this.state.board[Math.sign(cy) * 8 + Math.sign(cx)];
            if (other_piece === 0)
                return false;
            if ((piece <= 12 && other_piece > 12) || (piece > 12 && other_piece <= 12))
            {
                this.state.board[to] = this.state.board[from];
                this.state.board[from] = 0;
                this.state.board[Math.sign(cy) * 8 + Math.sign(cx)] = 0;
                return true;
            }
        }
        return false;;
    }

    validatePiece(id:string,index:number) : boolean
    {
        let piece = this.state.board[index];
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