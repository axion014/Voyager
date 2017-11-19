phina.namespace(function() {
	var original = phina.display.Label.prototype.init;
	phina.display.Label.prototype.init = function() {
		original.apply(this, arguments);
		this.accessor("width", {
			get: phina.display.Label.prototype.calcCanvasWidth,
			set: function(d) {}
		});
		this.accessor("height", {
			get: phina.display.Label.prototype.calcCanvasHeight,
			set: function(d) {}
		});
	}
});
