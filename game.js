let game = null;
let gameOptions = {
    platformSpeedRange: [300, 300],
    mountainSpeed: 80,
    spawnRange: [80, 300],
    platformSizeRange: [90, 300],
    platformHeightRange: [-5, 5],
    platformHighScale: 20,
    platformVerticalLimit: [0.4, 0.8],
    playerGravity: 900,
    jumpForce: 400,
    playerStartPosition: 200,
    jumps: 2,
    coinPercent: 45,
    firePercent: 25
};

window.onload = function(){
    let gameConfig = {
        type: this.Phaser.AUTO,
        width: 1334,
        height: 750,
        scene: [PreloadGame, PlayGame, GameOver],
        backgroundColor: 0x0C88C7,
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

class PreloadGame extends Phaser.Scene {
    constructor(){
        super('PreloadGame');
    }

    preload(){
        this.load.image('platform', 'assets/platform.png');
        this.load.spritesheet('player', 'assets/player.png', {
            frameWidth: 24,
            frameHeight: 48
        });
        this.load.spritesheet('coin', 'assets/coin.png', {
            frameWidth: 20,
            frameHeight: 20
        });
        this.load.spritesheet('fire', 'assets/fire.png', {
            frameWidth: 40,
            frameHeight: 70
        });
        this.load.spritesheet('mountain', 'assets/mountain.png', {
            frameWidth: 512,
            frameHeight: 512
        });
    }

    create(){
        this.anims.create({
            key: 'run',
            frames: this.anims.generateFrameNumbers('player', {
                start: 0,
                end: 1
            }),
            frameRate: 8,
            repeat: -1
        });

        this.anims.create({
            key: 'rotate',
            frames: this.anims.generateFrameNumbers('coin', {
                start: 0,
                end: 5
            }),
            frameRate: 15,
            yoyo: true,
            repeat: -1
        });

        this.anims.create({
            key: 'burn',
            frames: this.anims.generateFrameNumbers('fire', {
                start: 0,
                end: 4
            }),
            frameRate: 15,
            repeat: -1
        });

        this.scene.start('PlayGame');
    }
}

class PlayGame extends Phaser.Scene {
    constructor(){
        super('PlayGame');
    }

    create(){
        this.score = 0;

        this.mountainGroup = this.add.group();

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

        this.coinGroup = this.add.group({
            removeCallback: coin => {
                coin.scene.coinPool.add(coin);
            }
        });
        this.coinPool = this.add.group({
            removeCallback: coin => {
                coin.scene.coinGroup.add(coin);
            }
        });

        this.fireGroup = this.add.group({
            removeCallback: fire => {
                fire.scene.firePool.add(fire);
            }
        });
        this.firePool = this.add.group(fire => {
            removeCallback: fire => {
                fire.scene.fireGroup.add(fire);
            }
        });

        this.addMountains();

        this.addedPlatforms = 0;

        this.playerJumps = 0;

        this.addPlatform(game.config.width, game.config.width / 2, game.config.height * gameOptions.platformVerticalLimit[1]);

        this.player = this.physics.add.sprite(gameOptions.playerStartPosition, game.config.height * 0.7, 'player');
        this.player.setGravityY(gameOptions.playerGravity);
        this.player.setDepth(2);

        this.dying = false;

        this.scoreText = this.add.text(16, 16, 'Score 0', {
            fontSize: '32px',
            fill: '#000'
        });

        this.platformCollider = this.physics.add.collider(this.player, this.platformGroup, function(){
            if(!this.player.anims.isPlaying){
                this.player.anims.play('run');
            }
        }, null, this);

        this.physics.add.overlap(this.player, this.coinGroup, function(player, coin){
            coin.disableBody(true, false);
            this.score += 10;
            this.scoreText.setText(`Score ${this.score}`);

            this.tweens.add({
                targets: coin,
                y: coin.y - 100,
                alpha: 0,
                duration: 800,
                ease: 'Cubic.easeOut',
                callbackScope: this,
                onComplete: function(){
                    this.coinGroup.killAndHide(coin);
                    this.coinGroup.remove(coin);
                }
            });
        }, null, this);

        this.physics.add.overlap(this.player, this.fireGroup, function(player, fire){
            this.dying = true;
            this.player.anims.stop();
            this.player.setFrame(0);
            this.player.tint = 1;
            this.player.angle = 90;
            this.player.body.setVelocityY(-200);
            this.physics.world.removeCollider(this.platformCollider);
        }, null, this);

        this.input.on('pointerdown', this.jump, this);

        this.input.keyboard.on('keydown-SPACE', this.jump, this);
    }

    addMountains(){
        let rightmostMountain = this.getRightmostMountain();
        if(rightmostMountain < game.config.width * 2){
            const mountain = this.physics.add.sprite(rightmostMountain + Phaser.Math.Between(100, 350), game.config.height + Phaser.Math.Between(0, 100), 'mountain');
            mountain.setOrigin(0.5, 1);
            mountain.body.setVelocityX(gameOptions.mountainSpeed * -1);
            this.mountainGroup.add(mountain);
            if(Phaser.Math.Between(0, 1)){
                mountain.setDepth(1);
            }
            mountain.setFrame(Phaser.Math.Between(0, 3));
            this.addMountains();
        }
    }

    getRightmostMountain(){
        let rightmostMountain = -200;
        this.mountainGroup.getChildren().forEach(function(mountain){
            rightmostMountain = Math.max(rightmostMountain, mountain.x);
        });
        return rightmostMountain;
    }

    addPlatform(platformWidth, posX, posY){
        this.addedPlatforms++;
        let platform = null;

        if(this.platformPool.getLength()){
            platform = this.platformPool.getFirst();
            platform.x = posX;
            platform.y = posY;
            platform.active = true;
            platform.visible = true;
            this.platformPool.remove(platform);
            platform.displayWidth = platformWidth;
            platform.titleScaleX = 1 / platform.scaleX;
        } else {
            const [min, max] = gameOptions.platformSpeedRange;
            platform = this.add.tileSprite(posX, posY, platformWidth, 32, 'platform');
            this.physics.add.existing(platform);
            platform.body.setImmovable(true);
            platform.body.setVelocityX(Phaser.Math.Between(min, max) * -1);
            platform.setDepth(2);
            this.platformGroup.add(platform);
        }
        const [min, max] = gameOptions.spawnRange;
        this.nextPlatformDistance = Phaser.Math.Between(min, max);

        if(this.addedPlatforms > 1){
            if(Phaser.Math.Between(1, 100) <= gameOptions.coinPercent){
                if (this.coinPool.getLength()) {
                    const coin = this.coinPool.getFirst();
                    coin.x = posX;
                    coin.y = posY - 96;
                    coin.alpha = 1;
                    coin.active = true;
                    coin.visible = true;
                    this.coinPool.remove(coin);
                } else {
                    const coin = this.physics.add.sprite(posX, posY - 96, 'coin');
                    coin.setImmovable(true);
                    coin.setVelocityX(platform.body.velocity.x);
                    coin.anims.play('rotate');
                    coin.setDepth(2);
                    this.coinGroup.add(coin);
                }
            }

            if(Phaser.Math.Between(1, 100) <= gameOptions.firePercent){
                const fireX = posX - platformWidth / 2 + Phaser.Math.Between(1, platformWidth);
                const fireY = posY - 46;
                if(this.firePool.getLength()) {
                    const fire = this.firePool.getFirst();
                    fire.x = fireX;
                    fire.y = fireY;
                    fire.alpha = 1;
                    fire.active = true;
                    fire.visible = true;
                    this.firePool.remove(fire);
                } else {
                    const fire = this.physics.add.sprite(fireX, fireY, 'fire');
                    fire.setImmovable(true);
                    fire.setVelocityX(platform.body.velocity.x);
                    fire.setSize(8, 2, true);
                    fire.anims.play('burn');
                    fire.setDepth(2);
                    this.fireGroup.add(fire);
                }
            }
        }
    }

    jump(){
        const down = this.player.body.touching.down;
        if((!this.dying) && (down || (this.playerJumps > 0 && this.playerJumps < gameOptions.jumps))){
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
            this.scene.start('GameOver', {score: this.score});
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

        this.coinGroup.getChildren().forEach(function(coin){
            if(coin.x < -coin.displayWidth / 2){
                this.coinGroup.killAndHide(coin);
                this.coinGroup.remove(coin);
            }
        }, this);

        this.fireGroup.getChildren().forEach(function(fire){
            if(fire.x < -fire.displayWidth / 2){
                this.fireGroup.killAndHide(fire);
                this.fireGroup.remove(fire);
            }
        }, this);

        this.mountainGroup.getChildren().forEach(function(mountain){
            if(mountain.x < -mountain.displayWidth){
                const rightmostMountain = this.getRightmostMountain();
                mountain.x = rightmostMountain + Phaser.Math.Between(100, 350);
                mountain.y = game.config.height + Phaser.Math.Between(0, 100);
                mountain.setFrame(Phaser.Math.Between(0, 3));
                if(Phaser.Math.Between(0, 1)){
                    mountain.setDepth(1);
                }
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

class GameOver extends Phaser.Scene {
    constructor(data){
        super('GameOver');
    }

    init(data){
        this.score = data.score;
    }

    create(){
        const qh = this.game.config.height / 4;

        this.add.text(this.game.config.width / 2, qh, 'Game Over', {
            fontSize: '50px',
            fill: '#000'
        }).setOrigin(0.5, 0.5);
        this.add.text(this.game.config.width / 2, qh * 2, `Final Score: ${this.score}`, {
            fontSize: '65px',
            fill: '#000'
        }).setOrigin(0.5, 0.5);
        this.add.text(this.game.config.width / 2, qh * 3, 'Press any key to play again', {
            fontSize: '30px',
            fill: '#000'
        }).setOrigin(0.5, 0.5);

        this.input.keyboard.on('keydown', () => {
            this.scene.start('PlayGame')
        })
    }

    update(){

    }
}

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
