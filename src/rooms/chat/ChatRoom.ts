import http from "http";
import { Room, Client } from "colyseus";
import striptags from "striptags";

export default class ChatRoom extends Room {
    // When room is initialized
    onCreate (options: any) {
        this.onMessage('message',(client:Client,str:any) => {
            if (typeof str !== 'string')
                return;
            str = striptags(str);
            this.broadcast('message',{from: 'user-' + client.id.slice(1,4), message: str});
        })
     }

    // Authorize client based on provided options before WebSocket handshake is complete
    onAuth (client: Client, options: any, request: http.IncomingMessage) { return true; }

    // When client successfully join the room
    onJoin (client: Client, options: any, auth: any) { }

    // When a client leaves the room
    onLeave (client: Client, consented: boolean) { }

    // Cleanup callback, called after there are no more clients in the room. (see `autoDispose`)
    onDispose () { }
}