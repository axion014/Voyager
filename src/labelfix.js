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
	};
});
phina.namespace(function() {
	var original = phina.ui.LabelArea.prototype.init;
	phina.ui.LabelArea.prototype.init = function(options) {
		options = {}.$safe(options, phina.ui.LabelArea.defaults);
		original.call(this, options);
		Object.defineProperty(this, "width", {
  		value: options.width === undefined ? 64 : options.width,
  		enumerable: true,
  		writable: true
  	});
		Object.defineProperty(this, "height", {
  		value: options.height === undefined ? 64 : options.height,
  		enumerable: true,
  		writable: true
  	});
	};
});
