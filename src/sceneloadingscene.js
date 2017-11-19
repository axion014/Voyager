phina.define('fly.SceneLoadingScene', {
	superClass: 'phina.display.DisplayScene',

	init: function(options) {
		options = (options || {}).$safe(fly.SceneLoadingScene.defaults)
		this.superInit(options);
		this.options = options;
		this.loadprogress = 0;
		this.loadfrequenry = 0;
	},

	load: function(params) {
		this.label = phina.display.Label({
			text: 'Loading... 0%',
			fill: 'hsla(0, 0%, 0%, 0.6)',
			fontSize: 15,
		}).addChildTo(this).setPosition(SCREEN_CENTER_X, SCREEN_CENTER_Y);
		for(var i = 0; i < params.length; i++) {for(var j = 0; j < params[i].length; j++) {this.loadfrequenry++;}}
		var exec = function() {
			flows = [];
			for(var j = 0; j < params[ii].length; j++) {
				phina.namespace(function() {
					var flow = phina.util.Flow(params[ii][j].bind(this));
					flow.then(function() {
						this.label.text = 'Loading... ' + ++this.loadprogress / this.loadfrequenry * 100 + '%';
						if (this.loadprogress === this.loadfrequenry) {this.removeChild(this.label);}
					}.bind(this));
					flows.push(flow);
				}.bind(this));
			}
		}.bind(this);
		var ii = 0;
		var flows = [];
		exec();
		for(i = 1; i < params.length; i++) {
			var ii = i;
			phina.util.Flow.all(flows).then(exec);
		}
	}
});
