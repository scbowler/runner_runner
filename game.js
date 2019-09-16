let game = null;
let gameOptions = {
    platformSpeedRange: [300, 400],
    spawnRange: [80, 300],
    platformSizeRange: [90, 300],
    platformHeightRange: [-10, 10],
    platformHighScale: 10,
    platformVerticalLimit: [0.4, 0.8],
    playerGravity: 900,
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2
};

window.onload = function(){
    let gameConfig = {
        type: this.Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: PlayGame,
        backgroundColor: 0x87CEEB,
        physics: {
            default: 'arcade'
        }
    };

    game = new this.Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener('resize', resize, false);
    window.addEventListener('keypress', e => {
        if(e.keyCode === 112){
            if (game.scene.isPaused('PlayGame')){
                return game.scene.resume('PlayGame');
            }

            game.scene.pause('PlayGame');
        }
    });
}


class PlayGame extends Phaser.Scene {
    constructor(){
        super('PlayGame');
    }
    
    preload(){
        this.load.image('platform', 'assets/platform.png');
        this.load.spritesheet('player', 'assets/player.png', {
            frameWidth: 24,
            frameHeight: 48
        });
    }

    create(){
        this.platformGroup = this.add.group({
            removeCallback: (platform) => {
                platform.scene.platformPool.add(platform);
            }
        });

        this.platformPool = this.add.group({
            removeCallback: platform => {
                platform.scene.platformGroup.add(platform);
            }
        });

        this.playerJumps = 0;

        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, 'player');
        this.player.setGravityY(gameOptions.playerGravity);

        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('player', {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        });

        this.physics.add.collider(this.player, this.platformGroup, function(){
            if(!this.player.anims.isPlaying){
                this.player.anims.play('run');
            }
        }, null, this);

        this.input.on('pointerdown', this.jump, this);
    }

    addPlatform(platformWidth, posX, posY){
        let platform = null;

        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        } else {
            const [min, max] = gameOptions.platformSpeedRange;
            platform = this.physics.add.sprite(posX, posY, 'platform');
            platform.setImmovable(true);
            platform.setVelocityX(Phaser.Math.Between(min, max) * -1);
            this.platformGroup.add(platform);
        }
        const [min, max] = gameOptions.spawnRange;

        platform.displayWidth = platformWidth;
        this.nextPlatformDistance = Phaser.Math.Between(min, max);
    }

    jump(){
        const down = this.player.body.touching.down;
        if(down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps)){
            if(down){
                this.playerJumps = 0;
            }

            this.player.setVelocityY(gameOptions.jumpForce * -1);
            this.playerJumps++;

            this.player.anims.stop();
        }
    }

    update(){
        if(this.player.y > game.config.height){
            this.scene.start('PlayGame');
        }

        this.player.x = gameOptions.playerStartPosition;

        let minDistance = game.config.width;
        let rightMostPlatformHeight = 0;

        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            if(platformDistance < minDistance){
                minDistance = platformDistance;
                rightMostPlatformHeight = platform.y;
            }

            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if(minDistance > this.nextPlatformDistance){
            const [sizeMin, sizeMax] = gameOptions.platformSizeRange;
            const [heightMin, heightMax] = gameOptions.platformHeightRange;
            const [vertMin, vertMax] = gameOptions.platformVerticalLimit;
            const nextPlatformWidth = Phaser.Math.Between(sizeMin, sizeMax);
            const platformRandomHeight = gameOptions.platformHighScale * Phaser.Math.Between(heightMin, heightMax);
            const nextPlatformGap = rightMostPlatformHeight + platformRandomHeight;
            const minPlatformHeight = game.config.height * vertMin;
            const maxPlatformHeight = game.config.height * vertMax;
            const nextPlatformHeight = Phaser.Math.Clamp(nextPlatformGap, minPlatformHeight, maxPlatformHeight);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2, nextPlatformHeight);
        }
    }
};

function resize(){
    const canvas = document.querySelector('canvas');
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    const windowRatio = windowWidth / windowHeight;
    const gameRatio = game.config.width / game.config.height;

    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + 'px';
        canvas.style.height = (windowWidth / gameRatio) + 'px';
    } else {
        canvas.style.width = (windowHeight * gameRatio) + 'px';
        canvas.style.height = windowHeight + 'px';
    }
}
