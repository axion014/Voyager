phina.define("phina.display.Screen", {
  superClass: 'phina.display.RectangleShape',

  init: function(options) {
    options = (options || {}).$safe({
			fill: null,
			backgroundColor: 'transparent'
		});
    this.superInit(options);
    this.scroll = phina.geom.Vector2(0, 0);
    this.zoom = 1;
  },

  /*
   * 毎フレーム描画時にこの関数が呼び出され、その後canvas.clipが呼びだされる。
   * canvas.clipはパスの範囲外が描画されないようにする。
   */
  clip: function(canvas) {
    canvas.beginPath();
    canvas.setTransform(this._cr * this.scale.x, this._sr * this.scale.y,
      -this._sr * this.scale.x, this._cr * this.scale.y, this.position.x, this.position.y);
    canvas.rect(-this.width * this.origin.x, -this.height * this.origin.y, this.width, this.height);
  },

  // コード一部変更のためコピペ。position, scaleに加えscroll, zoomなどを使用する。
  _calcWorldMatrix: function() {
    if (!this.parent) return ;
    if (this.rotation != this._cachedRotation) {
      this._cachedRotation = this.rotation;

      var r = this.rotation*(Math.PI/180);
      this._sr = Math.sin(r);
      this._cr = Math.cos(r);
    }

    var local = this._matrix;
    var parent = this.parent._worldMatrix || phina.geom.Matrix33.IDENTITY;
    var world = this._worldMatrix;

    local.m00 = this._cr * this.scale.x * this.zoom;
    local.m01 =-this._sr * this.scale.y * this.zoom;
    local.m10 = this._sr * this.scale.x * this.zoom;
    local.m11 = this._cr * this.scale.y * this.zoom;
    var x = -this.scroll.x * this.zoom * this.scale.x;
    var y = -this.scroll.y * this.zoom * this.scale.y;
    local.m02 = this.position.x - this.width * (this.origin.x - 0.5) + x * this._cr - y * this._sr;
    local.m12 = this.position.y - this.height * (this.origin.y - 0.5) + x * this._sr + y * this._cr;

    var a00 = local.m00; var a01 = local.m01; var a02 = local.m02;
    var a10 = local.m10; var a11 = local.m11; var a12 = local.m12;
    var b00 = parent.m00; var b01 = parent.m01; var b02 = parent.m02;
    var b10 = parent.m10; var b11 = parent.m11; var b12 = parent.m12;

    world.m00 = b00 * a00 + b01 * a10;
    world.m01 = b00 * a01 + b01 * a11;
    world.m02 = b00 * a02 + b01 * a12 + b02;
    world.m10 = b10 * a00 + b11 * a10;
    world.m11 = b10 * a01 + b11 * a11;
    world.m12 = b10 * a02 + b11 * a12 + b12;

    return this;
  },
  where: function(target) { // あるオブジェクトが画面のどこにあるか
    return Vector2((target.x - this.scroll.x) * this.zoom + this.width / 2,
      (target.y - this.scroll.y) * this.zoom + this.height / 2);
  },
	_accessor: {
	  scrollX: {
	    "get": function()   {return this.scroll.x},
	    "set": function(v)  {this.scroll.x = v}
	  },
	  scrollY: {
	    "get": function()   {return this.scroll.y},
	    "set": function(v)  {this.scroll.y = v}
	  }
	}
});
