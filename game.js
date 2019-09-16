let game = null;
let gameOptions = {
    platformsStartSpeed: 350,
    spawnRange: [100, 350],
    platformSizeRange: [50, 250],
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
        backgroundColor: 0x444444,
        physics: {
            default: 'arcade'
        }
    };

    game = new this.Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener('resize', resize, false);
}


class PlayGame extends Phaser.Scene {
    constructor(){
        super('PlayGame');
    }
    
    preload(){
        this.load.image('platform', 'assets/platform.png');
        this.load.image('player', 'assets/player.png');
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

        this.addPlatform(game.config.width, game.config.width / 2);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height / 2, 'player');
        this.player.setGravityY(gameOptions.playerGravity);

        this.physics.add.collider(this.player, this.platformGroup);

        this.input.on('pointerdown', this.jump, this);
    }

    addPlatform(platformWidth, posX){
        let platform = null;

        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
        } else {
            platform = this.physics.add.sprite(posX, game.config.height * 0.8, 'platform');
            platform.setImmovable(true);
            platform.setVelocityX(gameOptions.platformsStartSpeed * -1);
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
        }
    }

    update(){
        if(this.player.y > game.config.height){
            this.scene.start('PlayGame');
        }

        this.player.x = gameOptions.playerStartPosition;

        let minDistance = game.config.width;

        this.platformGroup.getChildren().forEach(function(platform){
            let platformDistance = game.config.width - platform.x - platform.displayWidth / 2;
            minDistance = Math.min(minDistance, platformDistance);

            if(platform.x < - platform.displayWidth / 2){
                this.platformGroup.killAndHide(platform);
                this.platformGroup.remove(platform);
            }
        }, this);

        if(minDistance > this.nextPlatformDistance){
            const [min, max] = gameOptions.platformSizeRange;
            const nextPlatformWidth = Phaser.Math.Between(min, max);
            this.addPlatform(nextPlatformWidth, game.config.width + nextPlatformWidth / 2);
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
