let LIB = {};
(function(){
    class SceneManager
    {
        active_scene = null;
        scenes = null;
        game = null;
        constructor(game,scenes,default_scene)
        {
            this.game = game;
            this.game = game;
            this.scenes = scenes;
            this.active_scene = new scenes[default_scene](game);
            this.startLoad();
        }
        setScene(key,params)
        {
            this.active_scene.dispose();
            this.active_scene = new this.scenes[key](this.game,params);
            this.game.stop();
            this.startLoad();
        }
        update(dt)
        {
            this.active_scene.update(dt);
        }
        draw(graphics)
        {
            this.active_scene.draw(graphics);
        }
        async startLoad()
        {
            let game = this.game;
            this.active_scene.load(game.graphics,game.audio);
            try
            {
                await Promise.all([game.graphics.load(),game.audio.load()]);
                this.active_scene.start();
                this.game.start();
            }
            catch(err)
            {
                console.log(err);
            }
        }
    }
    class ScaleManager
    {
        scale_x;
        scale_y;
        offset_x;
        offset_y;
        virtual_width;
        virtual_height;
        constructor(game,w,h)
        {
            this.game = game;
            this.virtual_width = w;
            this.virtual_height = h;
            this.resize();
            console.log(this);
        }
        resize()
        {
            let w = window.innerWidth;
            let h = window.innerHeight;
            let scale_x = w / this.virtual_width;
            let scale_y = h / this.virtual_height;
            let scale = Math.min(scale_x,scale_y);
            this.scale_x = this.scale_y = scale;
            this.offset_x = (w - this.virtual_width * scale) / 2;
            this.offset_y = (h - this.virtual_height * scale) / 2;
            let canvas = this.game.canvas;
            canvas.width = w;
            canvas.height = h;
            this.game.ctx.imageSmoothingEnabled = false;
        }
    }
    class Audio
    {
        load_list = [];
        audio = {};
        constructor(game)
        {
            this.game = game;
        }
        loadAudio(key,src)
        {
            this.load_list.push(new Promise(resolve => resolve()));
        }
        load()
        {
            let result = Promise.all(this.load_list);
            this.load_list = [];
            return result;
        }
    }
    class Graphics
    {
        load_list = [];
        sprites = {};
        sections = {};
        scale_manager;
        constructor(game)
        {
            this.scale_manager = game.scale_manager;
            this.ctx = game.ctx;
        }
        drawSection(key,x,y)
        {
            let section = this.sections[key];
            let sprite = this.sprites[section.sprite_key];
            let {
                scale_x,
                scale_y,
                offset_x,
                offset_y
            } = this.scale_manager;
            this.ctx.drawImage(
                sprite,
                section.x,
                section.y,
                section.w,
                section.h,
                Math.round(offset_x + x * scale_x),
                Math.round(offset_y + y * scale_y),
                Math.round(section.w * scale_x),
                Math.round(section.h * scale_y)
            );
            // this.ctx.drawImage(this.sprites['spritesheet'],0,0);
        }
        addSection(key,sprite_key,x,y,w,h)
        {
            this.sections[key] = {sprite_key,x,y,w,h};
        }
        loadSprite(key,src)
        {
            this.load_list.push(new Promise((resolve,reject) => {
                let img = new Image();
                img.src = src;
                img.onload = () => {
                    this.sprites[key] = img;
                    resolve();
                }
                img.onerror = err => {
                    reject(err);
                }
            }));
        }
        load()
        {
            let result = Promise.all(this.load_list);
            this.load_list = [];
            return result;
        }
    }
    class InputManager
    {
        x = 0;
        y = 0;
        constructor(game)
        {
            this.game = game;
            document.addEventListener('mouseup',this.mouseup.bind(this));
            document.addEventListener('mousemove',this.mousemove.bind(this));
        }
        mouseup()
        {
            this.click = true;
        }
        mousemove(e)
        {
            let scale_manager = this.game.scale_manager;
            this.x = (e.clientX - scale_manager.offset_x) / scale_manager.scale_x;
            this.y = (e.clientY - scale_manager.offset_y) / scale_manager.scale_x;
            
        }
        update()
        {
            this.click = false;
        }
    }
    LIB.Game = class
    {
        load_list = [];
        last_tick = 0;
        fps = 1/30;
        constructor(config)
        {
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d');
            let container = document.createElement('div');
            container.classList.add('canvas-container');
            container.appendChild(this.canvas);
            document.getElementsByTagName('body')[0].appendChild(container);
            this.scale_manager = new ScaleManager(this,config.width,config.height);
            window.addEventListener('resize',this.scale_manager.resize.bind(this.scale_manager));
            this.graphics = new Graphics(this);
            this.audio = new Audio(this);
            this.scene_manager = new SceneManager(this,config.scenes,config.default_scene);
            this.input_manager = new InputManager(this);
        }
        start()
        {
            this.last_tick = Date.now();
            this.raf_index = requestAnimationFrame(this.update.bind(this));
        }
        stop()
        {
            cancelAnimationFrame(this.raf_index);
            this.raf_index = null;
        }
        update()
        {
            let now = Date.now();
            let delta = (now - this.last_tick) / 1000;
            if (delta >= this.fps)
            {
                this.ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
                this.scene_manager.update(delta);
                this.scene_manager.draw(this.graphics);
            }
            if (this.raf_index !== null)
                this.raf_index = requestAnimationFrame(this.update.bind(this));
        }
    }
}());