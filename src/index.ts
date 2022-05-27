import {Server} from 'colyseus';
import {createServer} from 'http';
import express from 'express';
import ChatRoom from './rooms/chat/ChatRoom';
import GameRoom from './rooms/game/GameRoom';
import path from 'path';

const port = Number(process.env.PORT) || 3000;

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')))
app.set('views', path.join(__dirname, '/dist'));
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'ejs');

const gameServer = new Server({
    server: createServer(app)
});

gameServer.define("chat",ChatRoom);
gameServer.define("game",GameRoom);

app.get('*',(req,res) => {
    res.render('views/client.html');
});

gameServer.listen(port);