phina.define('SplashLoadingScene', {
	superClass: 'phina.display.DisplayScene',

	init: function(options) {
		options = (options || {}).$safe(phina.game.SplashScene.defaults);
		this.superInit(options);
		var loader = phina.asset.AssetLoader();
		var progress = 0;
		var texture = phina.asset.Texture();
		texture.load(options.imageURL).then(function() {
			this.sprite = phina.display.Sprite(texture).addChildTo(this);
			this.sprite.setPosition(this.gridX.center(), this.gridY.center());
			this.sprite.alpha = 0;
			this.sprite.tweener.to({alpha: 1}, 200, 'easeOutCubic').wait(1000)
				.call(function() {
					if (loader.loaded) return;
					this.label = phina.display.Label('Loading... ' + Math.round(progress * 100) + '%').addChildTo(this);
					this.label.setPosition(this.gridX.center(), this.gridY.center());
					this.label.alpha = 0;
					this.label.tweener.to({alpha: 1}, 200, 'easeOutCubic');
					loader.onprogress = function(e) {
						this.label.text = 'Loading... ' + Math.round(e.progress * 100) + '%';
					}.bind(this);
				}, this)
				.to({alpha: 0}, 200, 'easeOutCubic')
				.call(function() {this.remove();});
		}.bind(this));
		loader.onprogress = function(e) {progress = e.progress;};
		loader.load(options.assets).then(function() {
			loader.loaded = true;
			if (this.label && this.label.alpha > this.sprite.alpha) {
				this.label.tweener.clear()
					.to({alpha: 0}, 200 * this.label.alpha, 'easeOutCubic')
					.wait(500).call(function() {this.app.popScene();}, this)
				.play();
			} else {
				this.sprite.tweener.wait(500).call(function() {this.app.popScene();}, this)
				.play();
			}
		}.bind(this));
	}
});
