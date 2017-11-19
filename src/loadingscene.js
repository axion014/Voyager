phina.define('LoadingScene', {
	superClass: 'phina.display.DisplayScene',

	init: function(options) {
		options = (options || {})
		this.superInit(options);
		var loader = phina.asset.AssetLoader();
		var progress = 0;
		this.label = phina.display.Label('Loading... ' + Math.round(progress * 100) + '%').addChildTo(this);
		this.label.setPosition(this.gridX.center(), this.gridY.center());
		loader.onprogress = function(e) {
			this.label.text = 'Loading... ' + Math.round(e.progress * 100) + '%';
		}.bind(this);
		loader.load(options.assets).then(function() {
			this.label.tweener
				.to({alpha: 0}, 200 * this.label.alpha, 'easeOutCubic')
				.wait(500).call(function() {this.app.popScene();}, this);
		}.bind(this));
	}
});
