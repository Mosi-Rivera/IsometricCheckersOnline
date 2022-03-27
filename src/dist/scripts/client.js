let joinGame;
let joinChatRoom;
(function(){
    let TEXT_AREA = document.getElementById('chat-text-area');
    let CHAT_DISPLAY = document.getElementById('chat-display');
    var client = new Colyseus.Client('ws://localhost:3000');
    let sendMessage = () => true;
    let sendMessageFunc = room => str => room.send('message',str);

    joinChatRoom = async () => {
        try
        {
            let room = await client.joinOrCreate('chat');
            room.onMessage('message', message => {
                let li = document.createElement('li');
                let span = document.createElement('span');
                let mess = document.createElement('div');
                span.innerHTML = message.from;
                mess.innerHTML = message.message;
                li.appendChild(span);
                li.appendChild(mess);
                CHAT_DISPLAY.appendChild(li);
            });
            sendMessage = sendMessageFunc(room);
        }
        catch(err)
        {
            console.log(err);
        }
    }
    
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

    const dragElement = elmnt => {
        var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
        if (document.getElementById(elmnt.id + "-header")) {
            // if present, the header is where you move the DIV from:
            document.getElementById(elmnt.id + "-header").onmousedown = dragMouseDown;
        } else {
            // otherwise, move the DIV from anywhere inside the DIV:
            elmnt.onmousedown = dragMouseDown;
        }

        function dragMouseDown(e) {
            e = e || window.event;
            e.preventDefault();
            // get the mouse cursor position at startup:
            pos3 = e.clientX;
            pos4 = e.clientY;
            document.onmouseup = closeDragElement;
            // call a function whenever the cursor moves:
            document.onmousemove = elementDrag;
        }

        function elementDrag(e) {
            e = e || window.event;
            e.preventDefault();
            // calculate the new cursor position:
            pos1 = pos3 - e.clientX;
            pos2 = pos4 - e.clientY;
            pos3 = e.clientX;
            pos4 = e.clientY;
            // set the element's new position:
            elmnt.style.top = (elmnt.offsetTop - pos2) + "px";
            elmnt.style.left = (elmnt.offsetLeft - pos1) + "px";
        }

        function closeDragElement() {
            // stop moving when mouse button is released:
            document.onmouseup = null;
            document.onmousemove = null;
        }
    }

    TEXT_AREA.addEventListener('keydown',e => {
        if (e.code === 'Enter')
        {
            e.preventDefault();
            sendMessage(e.currentTarget.value);
            e.currentTarget.value = "";
        }
    });

    dragElement(document.getElementById('chat'));
}());