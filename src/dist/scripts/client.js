let joinGame;
(function(){
    var client = new Colyseus.Client('ws://localhost:3000');
    joinGame = async cb => {
        try
        {
            let room = await client.joinOrCreate('game');
            console.log(room.sessionId + ': joined ' + room.name);
            cb(client,room);
        }
        catch(err)
        {
            console.log(err);
        }
    }
}());