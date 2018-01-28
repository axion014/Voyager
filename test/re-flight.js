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

function Slot(selects) {
	var rnd = Math.random() * selects.reduce(function(w, o) {return w + o.weight}, 0);
	var progress = 0;
	for (var i = 0;; i++) {
		progress += selects[i].weight;
		if (progress >= rnd) {
			if (typeof selects[i].target === "function") {
				return selects[i].target();
			}
			return selects[i].target;
		}
	}
}


var SCREEN_WIDTH = 640;
var SCREEN_HEIGHT = 960;
var SCREEN_CENTER_X = SCREEN_WIDTH / 2;
var SCREEN_CENTER_Y = SCREEN_HEIGHT / 2;

//3軸
var Axis = {
	x : new THREE.Vector3(1,0,0).normalize(),
	y : new THREE.Vector3(0,1,0).normalize(),
	z : new THREE.Vector3(0,0,1).normalize()
};

var opt = function(base, key) {
	if (base[key] === undefined) return function() {};
	if (base[key] instanceof Function) return base[key].bind(base);
	return base[key];
};

var threeext = threeext || {};
threeext.$method('extention', function() {
	THREE.$method('$extend', function(a, o) {
		var arg = Array.prototype.slice.call(arguments);
		arg.shift();
		Array.prototype.forEach.call(arg, function(source) {
			for (var property in source) {
				if (a[property] && o[property] && o[property].className && o[property].className.substr(0, 6) === 'THREE.') {
					a[property].copy(o[property]);
				} else {
					a[property] = o[property];
				}
			}
		}, this);
		return a;
	});
	THREE.$method('$add', function(a, o) {
		var arg = Array.prototype.slice.call(arguments);
		arg.shift();
		Array.prototype.forEach.call(arg, function(source) {
			for (var property in source) {
				if (o[property]) {
				} else {
					if (a[property] && o[property] && o[property].className && o[property].className.substr(0, 6) === 'THREE.') {
						a[property].add(o[property]);
					} else {
						a[property] += o[property];
					}
				}
			}
		}, this);
		return a;
	});
	THREE.$method('applyToAllMaterial', function(m, f) {
		if (Array.isArray(m)) m.each(f);
		else f(m);
	});
	THREE.Object3D.prototype.$method('rotate', function(a, r) {
		this.quaternion.rotate(a, r);
	});
	THREE.Object3D.prototype.$method('rotateAbs', function(a, r) {
		this.quaternion.rotateAbs(a, r);
	});
	THREE.Object3D.prototype.$method('move', function(d) {
		this.position.x = d.x;
		this.position.y = d.y;
		this.position.z = d.z;
		return this;
	});
	THREE.Object3D.prototype.$method('rotateAbsX', function(r) {
		this.quaternion.rotateAbsX(r);
	});
	THREE.Object3D.prototype.$method('rotateAbsY', function(r) {
		this.quaternion.rotateAbsY(r);
	});
	THREE.Object3D.prototype.$method('rotateAbsZ', function(r) {
		this.quaternion.rotateAbsZ(r);
	});
	THREE.Mesh.prototype.$method('deepclone', function (clonegeometry, clonematerial) {
		return new this.constructor(clonegeometry ? this.geometry.clone() : this.geometry, clonematerial ? this.material.clone(true) : this.material).copy(this);
	});
	THREE.Mesh.prototype.getter('tweener', function() {
    if (!this._tweener) {
      this._tweener = phina.accessory.Tweener().attachTo(this);
    }
    return this._tweener;
  });
	(function() {
	  var methods = [
	    'addEventListener', 'on',
	    'removeEventListener', 'off',
	    'clearEventListener', 'clear',
	    'hasEventListener', 'has',
	    'dispatchEvent', 'fire',
	    'dispatchEventByType', 'flare',
			'attach', 'attachTo', 'detach',
	  ];
	  methods.each(function(name) {
	    THREE.Mesh.prototype.$method(name, phina.app.Element.prototype[name]);
			THREE.Vector3.prototype.$method(name, phina.app.Element.prototype[name]);
	  });
	})();
	THREE.Mesh.prototype._listeners = {};
	THREE.Vector3.prototype._listeners = {};
	THREE.Vector3.prototype.className = 'THREE.Vector3';
	THREE.Quaternion.prototype.className = 'THREE.Quaternion';
	THREE.Quaternion.prototype.$method('rotate', function(a, r) {
		return this.multiply(new THREE.Quaternion().setFromAxisAngle(a, r));
	});
	THREE.Quaternion.prototype.$method('rotateX', function(r) {
		return this.rotate(Axis.x, r);
	});
	THREE.Quaternion.prototype.$method('rotateY', function(r) {
		return this.rotate(Axis.y, r);
	});
	THREE.Quaternion.prototype.$method('rotateZ', function(r) {
		return this.rotate(Axis.z, r);
	});
	THREE.Quaternion.prototype.$method('rotateAbs', function(a, r) {
		return this.premultiply(new THREE.Quaternion().setFromAxisAngle(a, r));
	});
	THREE.Quaternion.prototype.$method('rotateAbsX', function(r) {
		return this.rotateAbs(Axis.x, r);
	});
	THREE.Quaternion.prototype.$method('rotateAbsY', function(r) {
		return this.rotateAbs(Axis.y, r);
	});
	THREE.Quaternion.prototype.$method('rotateAbsZ', function(r) {
		return this.rotateAbs(Axis.z, r);
	});
	THREE.Vector3.prototype.getter('tweener', function() {
    if (!this._tweener) {
      this._tweener = phina.accessory.Tweener().attachTo(this);
    }
    return this._tweener;
  });
	THREE.MultiMaterial.prototype.accessor('opacity', {
		set: function(p) {
			for (var i = 0; i < this.materials.length; i++) {
				this.materials[i].opacity = p;
			}
		},
		get: function() {return this.materials[0].opacity;}
  });
});

phina.define('SimpleUpdater', {
	superClass: 'phina.app.Element',

	init: function() {
		this.superInit();
		this.elements = [];
	},

	update: function() {this.each(function(element) {element.update();});},
	get: function(i) {return this.elements[i];},
	remove: function(i) {this.elements.splice(i, 1);},
	count: function(i) {return this.elements.length;},
	each: function(f, t) {this.elements.each(f, t);}
});


phina.define('fly.DirectionShape', {
	superClass: 'phina.display.Shape',

	init: function(options) {
		options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			fill: '#ff5050',
			stroke: '#aaa',
			strokeWidth: 2,

			width: 16,
			height: 32
		});
		this.superInit(options);
	},

	prerender: function(canvas) {
		canvas.beginPath()
			.moveTo(0, this.height)
			.lineTo(this.width, -this.height)
			.lineTo(-this.width, -this.height)
			.closePath();
	},

	initThreeMesh: function() {
		var group = new THREE.Group();
		var shape = new THREE.Shape();
		shape.moveTo(0, -1)
		shape.lineTo(1, 1)
		shape.lineTo(-1, 1)
		shape.lineTo(0, -1);
		var geometry = new THREE.ShapeGeometry(shape);
		group.fill = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.fill.position.z = 1;
		group.stroke = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.add(group.stroke);
		group.add(group.fill);
		return group;
	},
	updateThreeMesh: function(group, alpha) {
		function setColor(material, str, opacity) {
	    if (!str) {
	      material.visible = false;
	      return;
	    }
	    var color = phina.util.Color().setFromString(str);
	    if (!color.a) {
	      material.visible = false;
	      return;
	    }
	    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
	    color.a *= opacity !== undefined ? opacity : 1;
	    material.opacity = color.a;
	    material.transparent = color.a !== 1;
	    material.visible = true;
	  }
		setColor(group.fill.material, this.fill, alpha);
		group.fill.scale.set(this.width * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.stroke.material, this.stroke, alpha);
		group.stroke.scale.set((1 + this.strokeWidth / this.width) * this.width * this.scaleX, (1 +   this.strokeWidth / this.height) * this.height * this.scaleY, 1);
	}


});

phina.define('MarkShape', {
	superClass: 'phina.display.Shape',
	init: function(options) {
		options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			stroke: '#444',
			strokeWidth: 1,

			width: 16,
			height: 16
		});
		this.superInit(options);
	},

	render: function(canvas) {
		canvas.clearColor(this.backgroundColor);
		canvas.transformCenter();

		if (this.isStrokable()) {
			canvas.lineWidth = this.strokeWidth;
			canvas.strokeStyle = this.stroke;
			canvas.drawLine(-this.width, 0, this.width, 0);
			canvas.drawLine(0, -this.height, 0, this.height);
		}
	},

	initThreeMesh: function() {
		var group = new THREE.Group();
		var geometry = new THREE.PlaneGeometry(1, 1);
		group.vertical = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.horizontal = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
		group.add(group.vertical);
		group.add(group.horizontal);
		return group;
	},
	updateThreeMesh: function(group, alpha) {
		function setColor(material, str, opacity) {
	    if (!str) {
	      material.visible = false;
	      return;
	    }
	    var color = phina.util.Color().setFromString(str);
	    if (!color.a) {
	      material.visible = false;
	      return;
	    }
	    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
	    color.a *= opacity !== undefined ? opacity : 1;
	    material.opacity = color.a;
	    material.transparent = color.a !== 1;
	    material.visible = true;
	  }
		setColor(group.vertical.material, this.stroke, alpha);
		group.vertical.scale.set(this.strokeWidth * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.horizontal.material, this.stroke, alpha);
		group.horizontal.scale.set(this.width * this.scaleX, this.strokeWidth * this.scaleY, 1);
	}
});

phina.define('fly.asset.ThreeJSON', {
	superClass: 'phina.asset.Asset',

	data: null,
	init: function() {this.superInit();},

	_load: function(resolve) {
		var self = this;
		new THREE.JSONLoader().load(this.src, function(geometry, materials) {
			self.data = new THREE.Mesh(geometry, materials);
			resolve(self);
		});
	},
	get: function() {return this.data.deepclone.apply(this.data, arguments);}
});

phina.define('fly.asset.ThreeTexture', {
	superClass: 'phina.asset.Asset',

	_asset: null,
	init: function() {this.superInit();},

	_load: function(resolve) {
		var self = this;
		new THREE.TextureLoader().load(this.src, function(texture) {
			self._asset = texture;
			resolve(self);
		});
	},

	get: function() {
		var clone = this._asset.clone();
		clone.needsUpdate = true;
		return clone;
	}
});

phina.define('fly.asset.ThreeCubeTex', {
	superClass: 'phina.asset.Asset',

	_asset: null,
	init: function() {this.superInit();},

	_load: function(resolve) {
		var self = this;
		var src = this.src.split(' ', 2);
		var imgs = [];
		for (i = 0; i < 6; i++) {
			imgs[i] = src[0] + i + src[1];
		}
		new THREE.CubeTextureLoader().load(imgs, function(texture) {
			var cubeShader = THREE.ShaderLib["cube"];
			cubeShader.uniforms["tCube"].value = texture;
			self._asset = new THREE.Mesh(new THREE.BoxGeometry(10000, 10000, 10000),
				new THREE.ShaderMaterial({fragmentShader: cubeShader.fragmentShader,
				vertexShader: cubeShader.vertexShader, uniforms: cubeShader.uniforms, depthWrite: false,
				side: THREE.BackSide}));
			resolve(self);
		});
	},

	get: function() {return this._asset.clone();}
});

phina.define('fly.asset.Stage', {
	superClass: 'phina.asset.Asset',

	data: {},
	init: function() {this.superInit();},

	_load: function(resolve) {
		var self = this;
		var json = phina.asset.File();
		json.load({path: this.src, dataType: 'json'}).then(function() {
			var stage = json.data;
			stage.$safe({enemys: [], obstacles: [], winds: [], messages: [], goals: []});
			for(var i = 0; i < stage.enemys.length; i++) {
				stage.enemys[i].$safe({position: {}, rotation: {}, option: {}, autospawn: {}, random: {}, killmes: {}});
				stage.enemys[i].rotation.$safe({a: {}});
				stage.enemys[i].autospawn.$safe({time: 0, progress: 0, random: {}});
				stage.enemys[i].autospawn.random.$safe({x: 0, y: 0, z: 0});
				stage.enemys[i].killmes.$safe({time: 0, text: '', offkill: false});
				stage.enemys[i].option.$safe({
					position: new THREE.Vector3(stage.enemys[i].position.x || 0, stage.enemys[i].position.y || 0, stage.enemys[i].position.z || 0),
					quaternion: new THREE.Quaternion().rotate(new THREE.Vector3(stage.enemys[i].rotation.a.x || 0, stage.enemys[i].rotation.a.y || 0, stage.enemys[i].rotation.a.z || 0), stage.enemys[i].rotation.r || 0),
					c: new THREE.Quaternion().rotate(new THREE.Vector3(stage.enemys[i].rotation.a.cx || 0, stage.enemys[i].rotation.a.cy || 0, stage.enemys[i].rotation.a.cz || 0), stage.enemys[i].rotation.cr || 0)
				});
			}
			for(var i = 0; i < stage.winds.length; i++) {
				stage.winds[i].$safe({v: 0.2, x: 0, y: 0, color: [0, 0, 0]});
				stage.winds[i].position = new THREE.Vector2(stage.winds[i].x, stage.winds[i].y);
				stage.winds[i].c = stage.winds[i].color[0] << 16 | stage.winds[i].color[1] << 8 | stage.winds[i].color[2];
			}
			for(var i = 0; i < stage.obstacles.length; i++) {
				stage.obstacles[i].$safe({position: {}, rotation: {}, scale: {}});
				stage.obstacles[i].rotation.$safe({a: {}});
				stage.obstacles[i].position = new THREE.Vector3(stage.obstacles[i].position.x || 0, stage.obstacles[i].position.y || 0, stage.obstacles[i].position.z || 0);
				stage.obstacles[i].quaternion = new THREE.Quaternion().rotate(new THREE.Vector3(stage.obstacles[i].rotation.a.x || 0, stage.obstacles[i].rotation.a.y || 0, stage.obstacles[i].rotation.a.z || 0), stage.obstacles[i].rotation.r || 0);
				stage.obstacles[i].scale = new THREE.Vector3(stage.obstacles[i].scale.x || 100, stage.obstacles[i].scale.y || 100, stage.obstacles[i].scale.z || 100);
			}
			for(var i = 0; i < stage.messages.length; i++) {stage.messages[i].$safe({time: 0, text: ''});}
			for(var i = 0; i < stage.goals.length; i++) {stage.goals[i].$safe({x: 0, y: 0, z: 0, size: 100, kill: 0, message: ''});}
			this.data = stage;
			resolve(self);
		}.bind(this))
	},

	get: function() {return this.data;}
});

phina.asset.AssetLoader.assetLoadFunctions.threejson = function(key, path) {
	var asset = fly.asset.ThreeJSON();
	var flow = asset.load(path);
	return flow;
};

phina.asset.AssetLoader.assetLoadFunctions.threetexture = function(key, path) {
	var asset = fly.asset.ThreeTexture();
	var flow = asset.load(path);
	return flow;
};

phina.asset.AssetLoader.assetLoadFunctions.threecubetex = function(key, path) {
	var asset = fly.asset.ThreeCubeTex();
	var flow = asset.load(path);
	return flow;
};

phina.asset.AssetLoader.assetLoadFunctions.stage = function(key, path) {
	var asset = fly.asset.Stage();
	var flow = asset.load(path);
	return flow;
};

fly.colCup2D3 = function(p1, p2, v1, v2, r) { // http://marupeke296.com/COL_3D_No27_CapsuleCapsule.html
	var t = p2.clone().sub(p1);
	var la = v2.clone().multiplyScalar(v1.clone().dot(v2) / v2.clone().dot(v2)).sub(v1);
	var la2 = la.clone().dot(la);
	if (la2 < 0.00001) {
		var min = p2.clone().sub(p1).length();
		min = Math.min(min, p2.clone().add(v2).sub(p1).length());
		min = Math.min(min, p2.clone().sub(p1.clone().add(v1)).length());
		min = Math.min(min, p2.clone().add(v2).sub(p1.clone().add(v1)).length());
		var p = p2.clone().add(v2.multiplyScalar(t.clone().dot(v2) / v2.clone().dot(v2) * -1));
		var df = Math.min(min, p.sub(p1).length());
	} else {
		var d = v2.clone().dot(v2);
		var a = Math.clamp(la.clone().dot(t.clone().dot(v2) / d * v2.clone().sub(t)) / la2, 0, 1);
		var b = Math.clamp(v1.clone().multiplyScalar(a).sub(t).dot(v2) / d, 0, 1);
		var df = p2.clone().add(v2.clone().multiplyScalar(b)).sub(p1.clone().add(v1.clone().multiplyScalar(a))).length();
	}
	return df <= r;
};

fly.colcupsphere = function(pc, v, ps, r, usetmax) {
	var t = Math.max(ps.clone().sub(pc).dot(v), 0);
	if (usetmax && t > 1) t = 1;
	return ps.clone().sub(pc.clone().addScaledVector(v, t)).length() <= r;
};

fly.colobbsphere = function(p1, p2, l, q, r) { // http://marupeke296.com/COL_3D_No12_OBBvsPoint.html
	var vec = new THREE.Vector3(0, 0, 0);
	var d = p2.clone().sub(p1);
	if (l.x > 0) {
		var direct = Axis.x.clone().applyQuaternion(q);
		var s = Math.abs(d.dot(direct) / l.x);
		if (s > 1) vec.add((1 - s) * l.x * direct);
	}
	if (l.y > 0) {
		direct = Axis.y.clone().applyQuaternion(q);
		s = Math.abs(d.dot(direct) / l.y);
		if (s > 1) vec.add((1 - s) * l.y * direct);
	}
	if (l.z > 0) {
		direct = Axis.z.clone().applyQuaternion(q);
		s = Math.abs(d.dot(direct) / l.z);
		if (s > 1) vec.add((1 - s) * l.z * direct);
	}
	return vec.length() <= r;
};

phina.define('fly.Popup', {
	superClass: 'phina.display.Shape',
	init: function(options) {
    options = ({}).$safe(options, {
			backgroundColor: 'transparent',
			fill: 'hsla(0, 0%, 0%, 0.6)',
			stroke: null,
			strokeWidth: 2,

			width: 512,
			height: 48,
			sideIndent: 32
		});
    this.superInit(options);
		this.sideIndent = options.sideIndent;
		this.label = phina.display.Label(options.label).addChildTo(this);
	},
	prerender: function(canvas) {
		var w = this.width / 2;
		var h = this.height / 2;
		canvas.beginPath()
			.moveTo(-w, -h)
			.lineTo(this.sideIndent - w, 0)
			.lineTo(-w, h)
			.lineTo(w, h)
			.lineTo(w - this.sideIndent, 0)
			.lineTo(w, -h)
			.closePath();
	},
	initThreeMesh: function() {
		var group = new THREE.Group();
		var shape = new THREE.Shape();
		shape.moveTo(-1, -0.5)
		shape.lineTo(0, 0)
		shape.lineTo(-1, 0.5)
		shape.lineTo(0, 0.5)
		shape.lineTo(0, -0.5)
		shape.lineTo(-1, -0.5)
		var side = new THREE.ShapeGeometry(shape);
		var center = new THREE.PlaneGeometry(1, 1);
		group.fill = new THREE.Mesh(center, new THREE.MeshBasicMaterial());
		group.fill.position.z = 1;
		group.stroke = new THREE.Mesh(center, new THREE.MeshBasicMaterial());
		group.fillleft = new THREE.Mesh(side, new THREE.MeshBasicMaterial());
		group.fillleft.position.z = 1;
		group.strokeleft = new THREE.Mesh(side, new THREE.MeshBasicMaterial());
		group.fillright = new THREE.Mesh(side, new THREE.MeshBasicMaterial({side: THREE.BackSide}));
		group.fillright.position.z = 1;
		group.strokeright = new THREE.Mesh(side, new THREE.MeshBasicMaterial({side: THREE.BackSide}));
		group.add(group.stroke);
		group.add(group.fill);
		group.add(group.strokeleft);
		group.add(group.fillleft);
		group.add(group.strokeright);
		group.add(group.fillright);
		return group;
	},
	updateThreeMesh: function(group, alpha) {
		function setColor(material, str, opacity) {
	    if (!str) {
	      material.visible = false;
	      return;
	    }
	    var color = phina.util.Color().setFromString(str);
	    if (!color.a) {
	      material.visible = false;
	      return;
	    }
	    material.color = new THREE.Color(color.r / 255, color.g / 255, color.b / 255);
	    color.a *= opacity !== undefined ? opacity : 1;
	    material.opacity = color.a;
	    material.transparent = color.a !== 1;
	    material.visible = true;
	  }
		var centerwidth = this.width - this.sideIndent * 2;
		setColor(group.fill.material, this.fill, alpha);
		group.fill.scale.set(centerwidth * this.scaleX, this.height * this.scaleY, 1);
		setColor(group.stroke.material, this.stroke, alpha);
		group.stroke.scale.set((1 + this.strokeWidth / centerwidth) * centerwidth * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		setColor(group.fillleft.material, this.fill, alpha);
		group.fillleft.scale.set(this.sideIndent * 2 * this.scaleX, this.height * this.scaleY, 1);
		group.fillleft.position.x = -centerwidth * this.scaleX / 2;
		setColor(group.strokeleft.material, this.stroke, alpha);
		group.strokeleft.scale.set((1 + this.strokeWidth / this.sideIndent / 2) * this.sideIndent * 2 * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		group.strokeleft.position.x = -centerwidth * this.scaleX / 2;
		setColor(group.fillright.material, this.fill, alpha);
		group.fillright.scale.set(-this.sideIndent * 2 * this.scaleX, this.height * this.scaleY, 1);
		group.fillright.position.x = centerwidth * this.scaleX / 2;
		setColor(group.strokeright.material, this.stroke, alpha);
		group.strokeright.scale.set(-(1 + this.strokeWidth / this.sideIndent / 2) * this.sideIndent * 2 * this.scaleX, (1 + this.strokeWidth / this.height) * this.height * this.scaleY, 1);
		group.strokeright.position.x = centerwidth * this.scaleX / 2;
	}
});

phina.define('EffectManager', {
	superClass: 'SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.explodeManager = ExplodeManager(ts).addChildTo(this);
		this.rayManager = RayManager(ts).addChildTo(this);
		this.threescene = ts;
	},

	explode: function(p, s, t) {return this.explodeManager.explode(p, s, t);},
	ray: function(g, c, o, w, mw, t) {return this.rayManager.ray(g, c, o, w, mw, t);},
});

phina.define('ExplodeManager', {
	superClass: 'SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	explode: function(p, s, t) {
		var material = new THREE.ShaderMaterial({
			transparent: true,
			uniforms: {
				tExplosion: {type: "t", value: phina.asset.AssetManager.get('threetexture', 'explode').get()},
				time: {type: "f", value: 100 * Math.random()}, alpha: {type: "f", value: 1.0}
			},
			vertexShader: phina.asset.AssetManager.get('text', 'expvertexshader').data,
			fragmentShader: phina.asset.AssetManager.get('text', 'expfragshader').data
		});
		var mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(20, 2), material).$safe({
			time: t, timeMax: t
		}).$safe({
			time: 10, timeMax: 10,
			update: function() {
				this.time--;
				material.uniforms.time.value += 0.015 * Math.random();
				material.uniforms.alpha.value = this.time / this.timeMax;
			}
		});
		mesh.move(p);
		mesh.scale.set(s, s, s);
		this.threescene.add(mesh);
		this.elements.push(mesh);
		return mesh;
	},

	update: function() {
		for (var i = 0; i < this.count(); i++) {
			this.get(i).update();
			if (this.get(i).time === 0) {
				this.get(i).parent.remove(this.get(i));
				this.remove(i);
				i--;
			}
		}
	}
});

phina.define('RayManager', {
	superClass: 'SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	ray: function(g, a, b, c, d) {
		g.geometry.boundingBox || g.geometry.computeBoundingBox();
		var self = this;
		if (d) {
			var upperSphere = new THREE.Mesh(new THREE.SphereGeometry(c, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			var ray = new THREE.Mesh(
				new THREE.CylinderGeometry(c, c, 1000, 20, 10),
				new THREE.MeshBasicMaterial({color: a, opacity: b, transparent: true})
			).$safe({
				generator: g,
				offset: 500 + c + g.geometry.boundingBox.max.z,
				time: d,
				update: function() {
					this.time--;
					if (this.time === 0) {
						this.parent.remove(this);
						self.elements.erase(this);
						return;
					}
					this.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
							this.generator.quaternion).setLength(this.offset)));
					this.quaternion.copy(new THREE.Quaternion());
					this.rotateY(Math.PI);
					this.rotateX(Math.PI / 2);
					this.quaternion.premultiply(this.generator.quaternion);
				}
			});
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			this.elements.push(ray);
			return ray;
		}
		var data = a;
		var rays = [];
		rays.$safe({
			generator: g,
			offset: 500 + data.reduce(function(a, b) {return a > b.radius ? a : b.radius}, 0) + g.geometry.boundingBox.max.z,
			time: 0,
			timeMax: b,
			radiusfunc: c,
			update: function() {
				this.time++;

				var scale = rays.radiusfunc(this.time, this.timeMax);
				this.each(function(ray) {
					if (this.time === this.timeMax) {
						ray.parent.remove(ray);
						return;
					}
					ray.move(this.generator.position.clone().add(Axis.z.clone().applyQuaternion(
						this.generator.quaternion).setLength(this.offset)));
					ray.quaternion.copy(new THREE.Quaternion());
					ray.rotateY(Math.PI);
					ray.rotateX(Math.PI / 2);
					ray.quaternion.premultiply(this.generator.quaternion);
					ray.scale.x = ray.scale.z = scale;
				}, this);
				if (this.time === this.timeMax) self.elements.erase(this);
			}
		});
		data.each(function(data) {
			var upperSphere = new THREE.Mesh(new THREE.SphereGeometry(data.radius, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2));
			upperSphere.position.y = 500;
			var ray = new THREE.Mesh(
				new THREE.CylinderGeometry(data.radius, data.radius, 1000, 20, 10),
				new THREE.MeshBasicMaterial({color: data.color, opacity: data.opacity, transparent: true})
			);
			ray.geometry.mergeMesh(upperSphere);
			this.threescene.add(ray);
			rays.push(ray);
		}, this);

		this.elements.push(rays);
		return rays;
	}
});

phina.define('AllyManager', {
	superClass: 'SimpleUpdater',

	allyraders: [], deathcount: 0,

	init: function(s, ts) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
	},
	create: function(n, r, t, p) {
		if(p) {
			var func = function(e) {
				if (e.progress > p) {
					this.create(n, r, t);
					this.off('frame', func)
				}
			}
			this.on('frame', func);
		} else if (t) this.on('frame' + (this.scene.frame + t), this.create.bind(this, n, r));
		else {
			var unit = UnitManager.get(n).mesh.get(false, true);
			THREE.$extend(unit, UnitManager.get(n).routine);
			THREE.$extend(unit, r);
			unit.summons = this;
			this.threescene.add(unit);
			this.elements.push(unit);
			var rader = phina.display.CircleShape({radius: 3, fill: 'hsla(210, 80%, 60%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1}).addChildTo(this.scene);
			var xdist = (this.player.position.x - unit.position.x);
			var zdist = (this.player.position.z - unit.position.z);
			var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25, 75);
			var angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			this.allyraders.push(rader);
			if (unit.stealth) rader.hide();
			return unit;
		}
	},
	createMulti: function(n, r, as, km) {
		var autospawn = as.$safe(UnitManager.get(n).autospawn);
		if (r.boss) {this.scene.bossdefeated = false;}
		for(var i = 0; i < autospawn.rep; i++) {
			var nr = {position: new THREE.Vector3()};
			THREE.$extend(nr, r);
			this.create(n, nr, this.groups.last, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			THREE.$add(r, autospawn.options);
			r.position.add(new THREE.Vector3(
				Math.random() * autospawn.random.x * 2 - autospawn.random.x,
				Math.random() * autospawn.random.y * 2 - autospawn.random.y,
				Math.random() * autospawn.random.z * 2 - autospawn.random.z));
		}
	},

	update: function() {
		this.each(function(unit, i) {
			this.opponents.bulletManager.hitTest(unit);
			unit.update(this);
			if (unit.despawn) {
				this.removeAlly(i);
				return;
			}
			if (unit.hp <= 0) {
				this.kill(i);
				return;
			}
			unit.time++;
			var xdist = (this.player.position.x - unit.position.x);
			var zdist = (this.player.position.z - unit.position.z);
			var distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25;
			if (unit.stealth || distance > 100) {
				this.allyraders[i].hide();
				return;
			}
			this.allyraders[i].show();
			var distance = Math.min(distance, 75);
			var angle = Math.atan2(xdist, zdist);
			this.allyraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
		}, this);
	},

	removeAlly: function(i) {
		var ally = this.get(i);
		ally.parent.remove(ally);
		THREE.applyToAllMaterial(ally.material, function(m) {m.dispose();});
		this.remove(i);
		this.allyraders[i].remove();
		this.allyraders.splice(i, 1);
	},

	kill: function(i) {
		var ally = this.get(i);
		this.effectManager.explode(ally.position, ally.size, ally.explodeTime);
		this.deathcount++;
		this.removeAlly(i);
	}
});

phina.define('EnemyManager', {
	superClass: 'SimpleUpdater',

	enemyraders: [], groups: [],
	killcount: 0, allcount: 0,

	init: function(s, ts, bh, ms) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
		this.gauge_boss_h = bh;
		this.message = ms;
	},

	create: function() {
		this.allcount++;
		this._create.apply(this, arguments);
	},

	_create: function(n, r, g, t, p) {
		if(p) {
			var func = function(e) {
				if (e.progress > p) {
					this._create(n, r, g, t);
					this.off('frame', func)
				}
			}
			this.on('frame', func);
		} else if (t) this.on('frame' + (this.scene.frame + t), this._create.bind(this, n, r, g));
		else {
			var enemy = UnitManager.get(n).mesh.get(false, true);
			THREE.$extend(enemy, UnitManager.get(n).routine);
			THREE.$extend(enemy, r);
			enemy.summons = this;
			enemy.group = g;
			this.threescene.add(enemy);
			this.elements.push(enemy);
			var rader = phina.display.CircleShape({radius: 3, fill: 'hsla(0, 80%, 60%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1}).addChildTo(this.scene);
			var xdist = (this.player.position.x - enemy.position.x);
			var zdist = (this.player.position.z - enemy.position.z);
			var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25, 75);
			var angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
			rader.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
			this.enemyraders.push(rader);
			if (enemy.stealth) rader.hide();
			if (r.boss) {
				this.scene.bosscoming = true;
				this.scene.boss = enemy;
				this.gauge_boss_h.tweener.fadeIn(10).play();
				this.gauge_boss_h.value = enemy.hp;
				this.gauge_boss_h.maxValue = enemy.hp;
			}
			return enemy;
		}
	},
	createMulti: function(n, r, as, km) {
		var autospawn = as.$safe(UnitManager.get(n).autospawn);
		this.groups.push({num: autospawn.rep, message: km});
		if (r.boss) {this.scene.bossdefeated = false;}
		for(var i = 0; i < autospawn.rep; i++) {
			var nr = {position: new THREE.Vector3()};
			THREE.$extend(nr, r);
			this.create(n, nr, this.groups.last, autospawn.time, autospawn.progress);
			if (autospawn.delay) {autospawn.time += autospawn.delay;}
			THREE.$add(r, autospawn.options);
			r.position.add(new THREE.Vector3(
				Math.random() * autospawn.random.x * 2 - autospawn.random.x,
				Math.random() * autospawn.random.y * 2 - autospawn.random.y,
				Math.random() * autospawn.random.z * 2 - autospawn.random.z));
		}
	},

	update: function() {
		this.each(function(enemy, i) {
			this.opponents.bulletManager.hitTest(enemy);
			this.opponents.elements.each(function(ally) {
				if (enemy.position.clone().sub(ally.position).length() < enemy.geometry.boundingSphere.radius + ally.size) {
					if (enemy === ally.target) ally.targetAttacked();
					enemy.hp -= Math.min(ally.hp, 2.5) / this.scene.difficulty * ally.sharpness / enemy.armor;
					ally.hp -= 2.5 * this.scene.difficulty * enemy.sharpness / ally.armor;
				}
			}, this);
			enemy.update(this);
			if (enemy.despawn) {
				this.removeEnemy(i);
				return;
			}
			if (enemy.hp <= 0) {
				this.kill(i);
				return;
			}
			enemy.time++;
			var xdist = (this.player.position.x - enemy.position.x);
			var zdist = (this.player.position.z - enemy.position.z);
			var distance = Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)) / 25;
			if (enemy.stealth || distance > 100) {
				this.enemyraders[i].hide();
				return;
			}
			this.enemyraders[i].show();
			var distance = Math.min(distance, 75);
			var angle = Math.atan2(xdist, zdist);
			this.enemyraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
		}, this);
	},

	removeEnemy: function(i) {
		var enemy = this.get(i);
		if (enemy.group) {
			enemy.group.num--;
			if (enemy.group.num === 0 && enemy.group.message) {
				var text = enemy.group.message.text;
				if (enemy.group.message.offkill) {this.message.text = '';}
				if (text !== '') {
					this.on('frame' + (this.scene.frame + (enemy.group.message.time - 5)), function() 	{this.message.text = '';});
					this.on('frame' + (this.scene.frame + enemy.group.message.time), function() 	{this.message.text = text;});
				}
			}
		}
		if (this.player.targetingEnemy === enemy) {
			this.player.way = null;
			this.player.targetingEnemy = null;
		}
		enemy.parent.remove(enemy);
		THREE.applyToAllMaterial(enemy.material, function(m) {m.dispose();});
		this.remove(i);
		this.enemyraders[i].remove();
		this.enemyraders.splice(i, 1);
	},

	kill: function(i) {
		this.effectManager.explode(this.get(i).position, this.get(i).size, this.get(i).explodeTime);
		this.scene.score += this.get(i).size;
		this.killcount++;
		this.removeEnemy(i);
	}
});

/*
 * About units
 *
 * The 3D Mesh of any unit have all their property
 *
 * extends THREE.Mesh
 *
 * ==== propertys ====
 *
 * hp					hitpoint
 * armor			most of damage this unit takes will divided by this value
 * sharpness	multiplier of body damage
 * time 			number of frames count up from 0
 * target			refer to a enemy unit used to trigger targetAttacked(optional)
 * summons		refer to the AllyManager or the EnemyManager
 * stealth		unit with this property true never shown in the rader
 * despawn		set this property to true will cause despawning of the unit without any death trigger. will checked after each update
 * --size--
 *
 * ===== methods =====
 *
 * update						the update routine will called each frame, and recieves this.summons to first argument
 * targetAttacked		this function will called when the unit ram to a enemy of this.target
 *									(optional but required if the unit has property 'target')
 */

phina.define('UnitManager', {
	init: function() {console.error(this.className + " is static")},
	_static: {
		loadedunit: {},
		get: function(n) {
			if (this.loadedunit[n]) return this.loadedunit[n];
			this.loadedunit[n] = {mesh: phina.asset.AssetManager.get('threejson', n), routine: this.units[n].routine.$safe({
				hp: 5, armor: 1, size: 1, v: 0, c: new THREE.Quaternion(), time: 0, sharpness: 1, update: function(){}
			}), autospawn: (this.units[n].autospawn || {}).$safe({rep: 1, options: {}})};
			if (!this.loadedunit[n].mesh) throw Error(n);
			this.loadedunit[n].mesh.data.geometry.computeBoundingBox();
			this.loadedunit[n].mesh.data.geometry.computeBoundingSphere();
			return this.loadedunit[n];
		},
		units: {
			enem1: {
				filename: 'enem-1',
				routine: {
					v: 0.6, chase: 0, firerate: 100, mindist: 0, aim: false,
					update: function(em) {
						var vecToTarget = em.player.position.clone().sub(this.position);
						var dir = new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget.clone().normalize()).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget.clone().normalize())));
						if (!em.player.position.equals(this.position) && this.chase !== 0) {
							var spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
							this.quaternion.slerp(dir, this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), spd);
						} else {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position, quaternion: this.aim ? dir : this.quaternion,
								v: 3.5, atk: 7
							});
						}
						this.quaternion.premultiply(this.c);
					}
				},
				autospawn: {rep: 6, delay: 15}
			},
			enem2: {
				filename: 'enem-2',
				routine: {
					hp: 75, v: 5, size: 15, chase: 0.04, sharpness: 2, firerate: 15, explodeTime: 30,
					update: function(em) {
						if (!em.player.position.equals(this.position)) {
							var dir = em.player.position.clone().sub(this.position);
							dir.normalize();
							this.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(dir).normalize(), Math.acos(Axis.z.clone().dot(dir))), this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.geometry.boundingBox.max.z), quaternion: this.quaternion,
								v: 6, size: 1.5, atk: 10
							});
						}
					}
				}
			},
			enem3: {
				filename: 'enem-3',
				routine: {
					hp: 500, v: 0.25, size: 30, firerate: 1, r: 0.1, explodeTime: 30,
					scale: new THREE.Vector3(3, 3, 3),
					update: function(em) {
						this.quaternion.premultiply(this.c);
						this.rotateZ(this.r);
						this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						if (this.time % this.firerate === 0) {
							em.bulletManager.createBullet('bullet', {
								position: this.position, quaternion: this.quaternion.clone().multiply(new THREE.Quaternion().setFromAxisAngle(
									Axis.x, 0.1 + (Math.PI - 0.1) * (this.time % (this.firerate * 8) / this.firerate / 8) / 20 * (Math.random() + 9))
								), v: 2.5, size: 0.5, atk: 5
							});
						}
					}
				}
			},
			blademinion: {
				filename: 'slicer',
				routine: {
					hp: 50, chase: 0.07, v: 7.5, sharpness: 3, size: 5, explodeTime: 30, stealth: true,
					scale: new THREE.Vector3(7, 7, 7),
					update: function(um) {
						if (this.active) {
							if (this.target.hp <= 0 || !this.target.parent) {
								if (this.target === this.base.user) {
									this.despawn = true;
									return;
								}
								this.target = this.base.user;
							}
							if (this.target === this.base.user && this.target.position.clone().sub(this.position).length() < this.v) {
								this.active = false;
								this.base.cooldown = 75;
							}
							if (!this.target.position.equals(this.position) && this.chase !== 0) {
								var vecToTarget = this.target.position.clone().sub(this.position).normalize();
								this.quaternion.slerp(new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget))), this.chase);
							}
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						} else {
							this.hp = Math.min(this.hp + 0.01, 50);
							if (this.base.user.hp <= 0) this.hp = 0;
							this.position.copy(this.base.user.position);
							this.quaternion.copy(this.base.user.quaternion);
						}
						this.stealth = !this.active;
					},
					targetAttacked: function() {
						this.target = this.base.user;
					}
				}
			},
			assaultdrone: {
				filename: 'assault',
				routine: {
					hp: 10, chase: 0.07, v: 6, bv: 7, atk: 8, sharpness: 1.4, firerate: 28, size: 5,
					mindist: 50, explodeTime: 20, expire: Infinity,
					update: function(um) {
						this.expire--;
						if (this.expire <= 0) {
							this.despawn = true;
							return;
						}
						if (!this.target || this.target.hp <= 0 || !this.target.parent) {
							if (um.opponents.elements.length !== 0) {
								this.target = um.opponents.elements.reduce(function(o, enm) {
									var d = enm.position.clone().sub(this.position).length();
									return d < o.d ? {d: d, enm: enm} : o;
								}.bind(this), {d: Infinity, enm: null}).enm;
							}
							if (!this.target) {
								this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
								return;
							}
						}
						var vecToTarget = this.target.position.clone().sub(this.position);
						var dir = new THREE.Quaternion().setFromAxisAngle(Axis.z.clone().cross(vecToTarget.clone().normalize()).normalize(), Math.acos(Axis.z.clone().dot(vecToTarget.clone().normalize())));
						if (!this.target.position.equals(this.position) && this.chase !== 0) {
							var spd = this.v * (this.mindist !== 0 ? Math.clamp((vecToTarget.length() - this.mindist) * 2 / this.mindist, -1, 1) : 1);
							this.quaternion.slerp(dir, this.chase);
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), spd);
						} else {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
						}
						if (this.time % this.firerate === 0) {
							um.bulletManager.createBullet('bullet', {
								position: this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.geometry.boundingBox.max.z), quaternion: this.quaternion,
								v: this.bv, atk: this.atk
							});
						}
					},
					targetAttacked: function() {}
				}
			}
		}
	}
});

phina.define('BulletManager', {
	superClass: 'SimpleUpdater',

	init: function(s, ts, c) {
		this.superInit();
		this.scene = s;
		this.threescene = ts;
		// Put some variant of model of bullet here
		// maybe laser
		this.models = {
			bullet: phina.asset.AssetManager.get('threejson', 'bullet')
		};
		// Material pool to reduce GC, is this right way to increase performance?
		this.materials = {
			bullet: []
		};
		this.cloneMaterial = c;
	},

	createBullet: function(n, r, k) {
		if (k === undefined) k = this.cloneMaterial;
		var bullet = this.models[n].get(false, k && this.materials[n].length === 0);
		if (k && this.materials[n].length !== 0) bullet.material = this.materials[n].pop();
		THREE.$extend(bullet, r).$safe({
			v: 1, size: 1, atk: 1, ownMaterial: k,
			update: function() {
				this.position.add(this.velocity);
			}
		});
		bullet.velocity = Axis.z.clone().applyQuaternion(bullet.quaternion).setLength(bullet.v);
		bullet.name = n;
		bullet.scale.setScalar(bullet.size * 2);
		this.threescene.add(bullet);
		this.elements.push(bullet);
		return bullet;
	},

	hitTest: function(unit) {
		this.each(function(bullet, j) {
			if (unit.position.clone().sub(bullet.position).length() < unit.geometry.boundingSphere.radius * unit.scale.x + bullet.size) {
				unit.summons.effectManager.explode(bullet.position, 1, 10);
				//effectManager.explode(this.allyBulletManager.get(j).position, this.allyBulletManager.get(j).size, 10);
				unit.hp -= bullet.atk * this.scene.difficulty / unit.armor;
				if (!bullet.pierce) this.removeBullet(j);
			}
		}, this);
	},

	update: function() {this.each(function(bullet) {bullet.update();});},

	removeBullet: function(i) {
		var bullet = this.get(i);
		bullet.parent.remove(bullet);
		if (bullet.ownMaterial) this.materials[bullet.name].push(bullet.material);
		this.remove(i);
	}
});

phina.define('Skill', {
	init: function(user, scene, level) {
		this.user = user;
		this.scene = scene;
		this.level = level;
	},
	update: function() {
	},
	_static: {
		place: ['core'], // any number of string id which shows where this module can be installed

		maxLevel: 2, // level of this module never be more than the max level(permanent)
		unlockedLevel: -1 // works similar to variable above but can change sometimes
	}
});

phina.define('ActiveSkill', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.cooldown = 0;
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
	},
	activate: function() {
		if (this.cooldown === 0) {
			//this.activate();
			//console.log('Active Skill ' + this.className + ' seems not implemented');
		}
	},

});

phina.define('DeactivatableSkill', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.active = false;
	},
	activate: function() {
		this.active = !this.active;
	}
});

var skills = {};
skills.byName = {};

var registerSkill = function(klass) {
	var lvlfrom = klass;
	while(lvlfrom.unlockedLevel === undefined) lvlfrom = lvlfrom.prototype.superClass;
	klass.unlockedLevel = lvlfrom.unlockedLevel;
	klass.place.each(function(place) {
		if (!skills[place]) skills[place] = [];
		skills[place].push(klass);
	});
	skills.byName[klass.prototype.className] = klass;
};

registerSkill(phina.define('Empty', { // dont modify, this module is so special
	superClass: 'Skill',
	init: function() {
		this.superInit();
	},
	_static: {
		skillName: 'Uninstall',
		place: ['top', 'core', 'front'],
		unlockedLevel: 0,
		getDescription: function(level) {return '';}
	}
}));

registerSkill(phina.define('ExtraArmor', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.user.armor *= [1.175, 1.19, 1.205][level];
	},
	_static: {
		skillName: 'Extra armor',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Reduce damage taken by ' + [15, 16, 17][level] + '%.';
		}
	}
}));

registerSkill(phina.define('Acrobat', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.user.speed *= [1.2, 1.213, 1.22][level];
		this.user.rotspeed *= [1.3, 1.32, 1.33][level];
	},
	_static: {
		skillName: 'Acrobat',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Greatly increase your mobility.';
		}
	}
}));

registerSkill(phina.define('SelfRepair', {
	superClass: 'DeactivatableSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (!this.active) return;
		var costrate = [50, 70, 100][this.level];
		var amount = Math.min([0.01, 0.0125, 0.015][this.level], this.user.maxhp - this.user.hp, this.user.energy / costrate);
		this.user.energy -= amount * costrate;
		this.user.hp += amount;
	},
	_static: {
		skillName: 'Self repair',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'With this skill, your HP is no\nlonger limited.\nHigher level one is faster but\nless energy efficient.\nCan toggle on/off by pushing activate key.\n';
		}
	}
}));

registerSkill(phina.define('ExtraGenerator', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		this.user.energy += Math.min([0.6, 0.63, 0.65][this.level], this.user.maxenergy - this.user.energy);
	},
	_static: {
		skillName: 'Extra generator',
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Allows you to use skills more by increasing energy\nreplenish speed.';
		}
	}
}));

registerSkill(phina.define('OverHeating', {
	superClass: 'DeactivatableSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.activated = false;
		var original = this.user.getDamage;
		this.user.getDamage = function(rawdmg) {
			if (this.active) {
				if (!this.activated) {
					this.activated = true;
					this.user.hp -= [0.02, 0.036, 0.056][level];
				}
				return original(rawdmg) * [1.2, 1.25, 1.3][level];
			}
			return original(rawdmg);
		}.bind(this);
	},
	update: function() {
		this.activated = false;
	},
	_static: {
		skillName: 'Overheating',
		place: ['top', 'core'],
		getDescription: function(level) {
			return 'Sacrifice your HP and increase firepower by ' + [20, 25, 30] + '%.\nCan toggle on/off by pushing activate key.';
		}
	}
}));

registerSkill(phina.define('Railgun', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
		if (this.duration > 0) {
			this.duration--;
			var angle = Math.randfloat(0, Math.PI * 2);
			this.scene.threelayer.camera.position.x += Math.sin(angle) * this.duration * 8;
			this.scene.threelayer.camera.position.z += Math.cos(angle) * this.duration * 8;
			this.user.beam([36, 45, 50][this.level], 3, 25, 0, this.scene);
		}
	},
	activate: function() {
		if (this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([150, 250, 320][this.level], function() {
			this.duration = 3;
			this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.2, radius: 1},
				{color: 0x00ffff, opacity: 0.2, radius: 2},
				{color: 0x0000ff, opacity: 0.2, radius: 4}
			], 7, function(t, m) {
				return 1 - t / m;
			});
			return 15;
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Railgun',
		place: ['front'],
		unlockedLevel: 1,
		getDescription: function(level) {
			return 'Shot deadly laser.\nProvides good firepower by\nconsuming large amount of\nenergy.';
		}
	}
}));

registerSkill(phina.define('ParticleCannon', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	update: function() {
		if (this.cooldown > 0) this.cooldown--;
		if (this.duration > 0) {
			this.duration--;
			var angle = Math.randfloat(0, Math.PI * 2);
			this.scene.threelayer.camera.position.x += Math.sin(angle) * this.duration;
			this.scene.threelayer.camera.position.z += Math.cos(angle) * this.duration;
			this.user.beam([10, 12, 15][this.level], 2, 15, [20, 25, 30][this.level], this.scene);
			if (this.duration === 0) {
				this.user.rotspeed *= [2, 4, 8][this.level];
			}
		}
		if (this.delay > 0) {
			this.delay--;
			if (this.delay === 0) {
				this.duration = [20, 30, 40][this.level];
				// flash effect
				var fade = new THREE.ShaderPass(phina.display.three.FadeShader);
				fade.uniforms.color.value = new THREE.Vector4(1, 1, 1, 0.8);
				this.scene.app.composer.addPass(fade);
				var frame = this.scene.frame;
				this.scene.on('enterframe', function tmp() {
					if (this.scene.frame - frame > 1) {
						this.scene.app.composer.passes.erase(fade);
						this.scene.off('enterframe', tmp);
					}
				}.bind(this));
				this.scene.effectManager.ray(this.user, 0xffffff, 0.5, 500, 2);
				this.scene.effectManager.ray(this.user, [
					{color: 0xffffff, opacity: 0.2, radius: [5, 6, 8][this.level]},
					{color: 0xffcccc, opacity: 0.2, radius: [8, 10, 12][this.level]},
					{color: 0xff8888, opacity: 0.2, radius: [12, 15, 18][this.level]},
					{color: 0xff4444, opacity: 0.2, radius: [16, 20, 24][this.level]},
					{color: 0xff0000, opacity: 0.2, radius: [20, 25, 30][this.level]}
				], [25, 35, 45][this.level], function(t, m) {return t < 4 ? 2 : (t < 6 ? 0.25 : 1 - (t - 6) / (m - 6));});
			}
		}
	},
	activate: function(trigger) {
		if (!trigger || this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([1000, 1200, 1600][this.level], function() {
			this.delay = [5, 8, 12][this.level];
			this.user.rotspeed /= [2, 4, 8][this.level];
			this.scene.effectManager.ray(this.user, [
				{color: 0xffffff, opacity: 0.8, radius: [3, 3.75, 5][this.level]},
			], this.delay, function(t, m) {return t / m;});
			return [250, 300, 400][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Particle cannon',
		place: ['front'],
		getDescription: function(level) {
			return 'Powerful cannon that destroy ' + (level === 2 ? '' : 'almost ') + 'anything front of it.';
		}
	}
}));

registerSkill(phina.define('Lasergun', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	activate: function(trigger) {
		if (!trigger || this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([500, 630, 800][this.level], function() {
			this.user.summons.bulletManager.createBullet('bullet', {
				position: this.user.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.user.geometry.boundingBox.max.z), quaternion: this.user.quaternion,
				v: 18, atk: [60, 70, 75], pierce: true
			});
			return [180, 200, 240][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Laser gun',
		place: ['front'],
		getDescription: function(level) {
			return 'The Laser can pierce enemies.\nDeals massive damage\nagainst huge enemy by\nhitting their core.';
		}
	}
}));

registerSkill(phina.define('BladeMinion', {
	superClass: 'Skill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
		this.instance = this.user.summons.create('blademinion', {
			position: this.user.position.clone(),
			active: false,
			stealth: true,
			base: this,
			hp: [50, 52, 52][level],
			sharpness: [3, 3.1, 3.1][level]
		});
		this.instance.material.color = new THREE.Color(0x111111);
		if (level >= 2) {
			this.instance2 = this.user.summons.create('blademinion', {
				position: this.user.position.clone(),
				active: false,
				stealth: true,
				base: this,
				hp: [50, 52, 52][level],
				sharpness: [3, 3.1, 3.1][level]
			});
			this.instance2.material.color = new THREE.Color(0x111111);
		}
	},
	activate: function(trigger) {
		if (!trigger) return;
		if (this.instance.active || (this.level >= 2 && this.instance2.active)) {
			this.instance.target = this.user;
			this.instance2.target = this.user;
			return;
		}
		if (!this.user.targetingEnemy) return;
		this.user.consumeEnergy([280, 280, 600][this.level], function() {
			this.instance.active = true;
			this.instance.target = this.user.targetingEnemy;
			if (this.level >= 2) {
				this.instance2.active = true;
				this.instance2.target = this.user.targetingEnemy;
				this.instance.quaternion.copy(this.user.quaternion).rotateY(0.5);
				this.instance2.quaternion.copy(this.user.quaternion).rotateY(-0.5);
			} else {
				this.instance.quaternion = this.user.quaternion.clone();
			}
		}.bind(this));
	},
	_static: {
		skillName: 'Anti-material blade',
		usingModels: ['blademinion'],
		place: ['top'],
		getDescription: function(level) {
			return 'This blade will spawn out on\nactivation and automatically\nchase your enemy.\nCan pull back with pushing\nactivate key again.';
		}
	}
}));

registerSkill(phina.define('Reinforce', {
	superClass: 'ActiveSkill',
	init: function(user, scene, level) {
		this.superInit(user, scene, level);
	},
	activate: function() {
		if (this.cooldown > 0) return;
		this.cooldown = this.user.consumeEnergy([200, 750, 1500][this.level], function() {
			var repeat = [2, 4, 6][this.level];
			repeat.times(function(i) {
				this.user.summons.create('assaultdrone', {
					position: this.user.position.clone().sub(Axis.z.clone().applyQuaternion(this.user.quaternion).setLength(500)).add(Axis.x.clone().applyQuaternion(this.user.quaternion).setLength(((repeat - 1) / 2 - i) * 150)),
					quaternion: this.user.quaternion.clone(),
					expire: [2000, 1800, 1500][this.level],
					hp: [8, 10, 11][this.level],
					chase: [0.06, 0.07, 0.08][this.level],
					v: [5.6, 6, 6.3][this.level],
					sharpness: [1.2, 1.4, 1.5][this.level],
					firerate: [28, 25, 24][this.level],
					bv: [7, 7.5, 8][this.level],
					atk: [7, 8, 8.5][this.level]
				});
			}, this);
			return [2000, 2400, 3000][this.level];
		}.bind(this), 0);
	},
	_static: {
		skillName: 'Reinforce',
		usingModels: ['assaultdrone'],
		place: ['top', 'core'],
		unlockedLevel: 0,
		getDescription: function(level) {
			return 'Larger fleet ascend you to the\nvictory.';
		}
	}
}));

phina.define('ObstacleManager', {
	superClass: 'SimpleUpdater',

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	create: function(p, q, s) {
		var obstacle = THREE.$extend(new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshPhongMaterial({
			color: '#888888'
		})), {position: p, quaternion: q, size: s});
		this.threescene.add(obstacle);
		this.elements.push(obstacle);
		return obstacle;
	},

	update: function() {
	},

	removeObstacle: function(i) {
		this.get(i).parent.remove(this.get(i));
		this.remove(i);
	}
});

phina.define('WindManager', {
	superClass: 'SimpleUpdater',

	time: 0, flyerposy: 0,

	init: function(ts) {
		this.superInit();
		this.threescene = ts;
	},

	create: function(r, c) {
		var wind = {
			v: 0.2, size: 100,
			position: new THREE.Vector2(),
			winds: [], update: function(){}
		}.$extend(r);
		wind.mesh = THREE.$extend(new THREE.Mesh(new THREE.RingGeometry(wind.size - 0.4, wind.size, 50, 5), new THREE.MeshBasicMaterial({
			color: c, side: THREE.DoubleSide
		})), {position: new THREE.Vector3(wind.position.x, 0, wind.position.y)});
		for (var i = -10000 * Math.sign(wind.v); Math.abs(i) <= 10000; i += wind.v * 300) {
			wind.winds.push(wind.mesh.clone());
			wind.winds.last.rotateX(Math.PI / 2);
			wind.winds.last.position.y = this.flyerposy + i;
			this.threescene.add(wind.winds.last);
		}
		this.elements.push(wind);
		return wind;
	},

	update: function() {
		this.each(function(wind) {
			if (this.time % 30 === 0) {
				wind.winds.push(wind.mesh.clone());
				wind.winds.last.rotateX(Math.PI / 2);
				wind.winds.last.position.y = this.flyerposy - 10000 * Math.sign(wind.v);
				this.threescene.add(wind.winds.last);
			}
			if (wind.winds.first && wind.winds.first.parent && Math.abs(wind.winds.first.position.y - this.flyerposy) > 10000) {
				wind.winds.first.parent.remove(wind.winds.first);
			}
			for (var i = 0; i < wind.winds.length; i++) {
				wind.winds[i].position.y += wind.v * 10;
			}
		});
		this.time++;
	},

	removeWind: function(i) {
		this.get(i).winds.each(function(wind) {wind.parent.remove(wind);});
		this.remove(i);
	}
});

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

phina.define('TitleScene', {
	superClass: 'phina.display.ThreeScene',

	frame: 0,

	init: function(params) {
		this.superInit(params);
		var start = function() {
			var fade = new THREE.ShaderPass(phina.display.three.FadeShader);
			this.app.composer.addPass(fade);
			var zoomblur = new THREE.ShaderPass({
				uniforms: {
					tDiffuse: {value: null},
					strength: {value: 0},
				},

				vertexShader: "varying vec2 vUv;void main() {vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",

				fragmentShader: "uniform float strength;uniform sampler2D tDiffuse;varying vec2 vUv;const float nFrag=1.0/30.0;float rnd(vec3 scale,float seed){return fract(sin(dot(gl_FragCoord.stp+seed,scale))*43758.5453+seed);}void main(void){vec4 destColor=vec4(0.0);float random=rnd(vec3(12.9898,78.233,151.7182),0.0);float totalWeight=0.0;for(float i=0.0;i<=30.0;i++){float percent=(i+random)*nFrag;float weight=percent-percent*percent;destColor+=texture2D(tDiffuse,vUv-(vUv-vec2(0.5,0.5))*percent*strength*nFrag)*weight;totalWeight+=weight;}gl_FragColor=destColor/totalWeight;}"
			});
			this.app.composer.addPass(zoomblur);
			this.startframe = 0;
			var setFilter = function() {
				fade.uniforms.color.value.w = this.startframe * 0.025;
				zoomblur.uniforms.strength.value = this.startframe * 0.4;
				if (this.startframe === 40) this.exit(nowarg);
				else this.startframe++;
			}.bind(this);
			this.on('enterframe', setFilter);
		}.bind(this);
		var nowarg = {};
		nowarg.skills = JSON.parse(localStorage.getItem('skills-pre')) || [
			{klass: Railgun, level: 0},
			{klass: Empty, level: 0},
			{klass: Empty, level: 0},
			//{klass: BladeMinion, level: 0},
			//{klass: Reinforce, level: 2},
			{klass: SelfRepair, level: 0}
		];
		nowarg.skills.each(function(skill) {
			if (skill.name) skill.klass = skills.byName[skill.name];
		});
		var menu = {
			title: {
				x: 0, y: 0, sub: [
					{type: 'label', value: 'Forever Flight', y: this.gridY.center(-3), size: 64},
					{type: 'label', value: 'Click start', y: this.gridY.center(3), size: 32},
					{type: 'model', name: 'player', value: phina.asset.AssetManager.get('threejson', 'fighter').get(), x: 0, y: 50, z: 0},
					{type: 'model', value: new THREE.Mesh(new THREE.CircleGeometry(10000, 100), new THREE.MeshBasicMaterial({
						map: phina.asset.AssetManager.get('threetexture', 'plane').get()
					})), x: 0, y: 10000, z: 0, init: function(model) {model.rotateX(-Math.PI / 2);}}
				]
			},
			main: {
				x: -500, y: -500, sub: [
					{type: 'label', value: 'Main Menu', y: this.gridY.center(-4), size: 64},
					{type: 'label', value: 'Campaign', y: this.gridY.center(-2), size: 32, link: 'difficulty'},
					{type: 'label', value: 'Stage Select', y: this.gridY.center(-1), size: 32, link: 'stageselect'},
					{type: 'label', value: 'Ship Select', size: 32, link: 'shipselect'},
					{type: 'label', value: 'Free Play', y: this.gridY.center(1), size: 32, link: 'difficulty', callback: function() {nowarg.stage = 'arcade'}},
					{type: 'label', value: 'How to play', y: this.gridY.center(2), size: 32, link: 'help'},
					{type: 'label', value: 'Settings', y: this.gridY.center(3), size: 32, link: 'setting'},
					{type: 'label', value: 'Credit', x: this.gridX.center(6), y: this.gridY.center(7), size: 24, link: 'credit'},
					{type: 'label', value: 'Back', y: this.gridY.center(5), size: 32, link: 'title'}
				]
			},
			help: {
				x: 750, y: 750, sub: [
					{type: 'label', value: 'How to play', x: this.gridX.center(), y: this.gridY.span(4.5), size: 64},
					{type: 'label', value: 'Your airplane moves automatically', x: this.gridX.center(), y: this.gridY.center(1.5), size: 18},
					{type: 'label', value: 'to direction of your mouse pointer', x: this.gridX.center(), y: this.gridY.center(2), size: 18},
					{type: 'label', value: '>', x: this.gridX.center(6), y: this.gridY.center(), size: 48, link: 'help2'},
					{type: 'label', value: '(1/5)', x: this.gridX.center(), y: this.gridY.center(2.75), size: 18},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			help2: {
				x: 0, y: 750, sub: [
					{type: 'label', value: 'Speed-up by pressing your left mouse button', x: this.gridX.center(), y: this.gridY.center(1.5), size: 18},
					{type: 'label', value: '<', x: this.gridX.center(-6), y: this.gridY.center(), size: 48, link: 'help'},
					{type: 'label', value: '>', x: this.gridX.center(6), y: this.gridY.center(), size: 48, link: 'help3'},
					{type: 'label', value: '(2/5)', x: this.gridX.center(), y: this.gridY.center(2.75), size: 18},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			help3: {
				x: -750, y: 750, sub: [
					{type: 'label', value: 'Press W/S key to up/down vertically', x: this.gridX.center(), y: this.gridY.center(1.5), size: 18},
					{type: 'label', value: '(any key in this help is default key bind)', x: this.gridX.center(), y: this.gridY.center(2), size: 18},
					{type: 'label', value: '<', x: this.gridX.center(-6), y: this.gridY.center(), size: 48, link: 'help2'},
					{type: 'label', value: '>', x: this.gridX.center(6), y: this.gridY.center(), size: 48, link: 'help4'},
					{type: 'label', value: '(3/5)', x: this.gridX.center(), y: this.gridY.center(2.75), size: 18},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			help4: {
				x: -1500, y: 750, sub: [
					{type: 'label', value: 'Press space key to attack', x: this.gridX.center(), y: this.gridY.center(1.5), size: 18},
					{type: 'label', value: '<', x: this.gridX.center(-6), y: this.gridY.center(), size: 48, link: 'help3'},
					{type: 'label', value: '>', x: this.gridX.center(6), y: this.gridY.center(), size: 48, link: 'help5'},
					{type: 'label', value: '(4/5)', x: this.gridX.center(), y: this.gridY.center(2.75), size: 18},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			help5: {
				x: -2250, y: 750, sub: [
					{type: 'label', value: 'A/D key and Shift key to use up to 4 kind of skill', x: this.gridX.center(), y: this.gridY.center(1.5), size: 18},
					{type: 'label', value: '<', x: this.gridX.center(-6), y: this.gridY.center(), size: 48, link: 'help4'},
					{type: 'label', value: '(5/5)', x: this.gridX.center(), y: this.gridY.center(2.75), size: 18},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			stageselect: {
				x: 560, y: -250, sub: [
					{type: 'label', value: 'Stage Select', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'},
				]
			},
			shipselect: {
				x: 0, y: 0, z: -20, sub: [
					{type: 'label', value: 'Ship Select', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: '(You cannot select ship in this version)', x: this.gridX.center(), y: this.gridY.span(5), size: 20},
					{type: 'label', value: '<', x: this.gridX.span(2), y: this.gridY.center(), size: 64},
					{type: 'label', value: '>', x: this.gridX.span(14), y: this.gridY.center(), size: 64},
					{type: 'label', value: 'Modify Ship', x: this.gridX.center(), y: this.gridY.span(10.5), size: 32, link: 'shipmodify'},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'},
				]
			},
			shipmodify: {
				x: 0, y: 0, z: -40, sub: [
					{type: 'label', value: 'Ship Modify', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'point', parent: 'player', index: 0, place: "front", x: 2, y: 5, z: 20},
					{type: 'point', parent: 'player', index: 1, place: "front", x: -2, y: 5, z: 20},
					{type: 'point', parent: 'player', index: 2, place: "top", x: 0, y: 8, z: -5},
					{type: 'point', parent: 'player', index: 3, place: "core", x: 0, y: 4.5, z: 0},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(11), size: 32, link: 'shipselect'},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'},
				]
			},
			difficulty: {
				x: -1250, y: -1000, sub: [
					{type: 'label', value: 'Difficulty', x: this.gridX.center(), y: this.gridY.span(5), size: 64},
					{type: 'label', value: 'Easy', x: this.gridX.center(), y: this.gridY.span(7), size: 32, callback: function() {nowarg.difficulty = 0.8;start()}},
					{type: 'label', value: 'Normal', x: this.gridX.center(), y: this.gridY.span(8), size: 32, callback: start},
					{type: 'label', value: 'Hard', x: this.gridX.center(), y: this.gridY.span(9), size: 32, callback: function() {nowarg.difficulty = 1.25;start()}},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(11), size: 32, link: 'main'},
					{
						type: 'model', name: 'enem1', value: phina.asset.AssetManager.get('threejson', 'enem1').get(), x: 200, y: 50, z: 0,
						init: function(model) {model.rotate(new THREE.Vector3(1, -1, -1).normalize(), 1);}
					},
					{
						type: 'model', name: 'enem1', value: phina.asset.AssetManager.get('threejson', 'enem1').get(), x: -250, y: -50, z: 0,
						init: function(model) {model.rotate(new THREE.Vector3(1, -1, -1).normalize(), 1);}
					},
					{
						type: 'model', name: 'enem1', value: phina.asset.AssetManager.get('threejson', 'enem1').get(), x: -280, y: 160, z: 40,
						init: function(model) {model.rotate(new THREE.Vector3(1, -1, -1).normalize(), 1);}
					}
				]
			},
			setting: {
				x: -250, y: -1440, sub: [
					{type: 'label', value: 'Settings', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'KeyBinding', x: this.gridX.center(), y: this.gridY.center(-0.5), size: 32},
					{type: 'label', value: 'Sound Volume', x: this.gridX.center(), y: this.gridY.center(0.5), size: 32},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'}
				]
			},
			credit: {
				x: -5000, y: -5000, sub: [
					{type: 'label', value: 'Credit', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Programing: axion014', x: this.gridX.center(), y: this.gridY.span(6), size: 32},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'}
				]
			}
		}

		var threelayer = phina.display.ThreeLayer({
			x: SCREEN_CENTER_X, y: SCREEN_CENTER_Y, width: SCREEN_WIDTH, height: SCREEN_HEIGHT,
			antialias: true
		});

		var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
		directionalLight.position.set(0, 0, 30);
		threelayer.scene.add(directionalLight);
		threelayer.scene.add(new THREE.AmbientLight(0x606060));
		threelayer.renderer.setClearColor(0x66aaee);
		threelayer.scene.fog = new THREE.FogExp2(0x66aaee, 0.00025);
		threelayer.camera.position.z = 100;
		var time = 0;
		threelayer.update = function(app) { // Update routine
			time += this.position === 'shipmodify' ? 0.2 : 1;
			// Camera control
			this.player.quaternion.copy(new THREE.Quaternion());
			this.player.rotateX(Math.sin(time * 0.01) * 0.25);
			this.player.rotateY(-Math.PI / 2 + time * 0.005);
			threelayer.camera.position.tweener.update(app);
			threelayer.camera.updateMatrixWorld();

			labels.each(function(label) {
				label.material.opacity = 1 - Math.min(Math.max(Math.abs(threelayer.camera.position.z - label.position.z - 50) - 10, 0) * 0.1, 1);
			});
			this.frame++;
		}.bind(this);
		threelayer.addChildTo(this);
		var amp = 0.085;
		var moveTo = function(x, y, z) {
			var dist = phina.geom.Vector2(threelayer.camera.position.x / amp, threelayer.camera.position.y / amp).distance(phina.geom.Vector2(x, y));
			var time = Math.max(dist / 3, 900);
			var tween = dist > 3000 ? 'easeInOutQuint' : 'easeInOutCubic';
			threelayer.camera.position.tweener.to({x: -x * amp, y: y * amp, z: 100 + z}, time, tween).play();
		}.bind(this);
		var moveToMain = function() {
			moveTo(-500, -500, 0);
			this.onpointstart = function(e) {
				buttons.each(function(button) {
					var pos = button.position.clone().project(threelayer.camera);
					if (Math.abs(e.pointer.x - (pos.x + 1) * e.pointer.width / 2) < button.canvas.textWidth / 2 && Math.abs(e.pointer.y - (1 - pos.y) * e.pointer.height / 2) < button.canvas.textHeight / 2 && Math.abs(threelayer.camera.position.z - button.position.z - 50) < 1) button.onclick.each(function(cb) {cb()});
				});
			};
		}.bind(this);
		var labels = [], buttons = [], points = [];
		var equipmentEdit = phina.display.RectangleShape({
			x: SCREEN_CENTER_X, y: SCREEN_CENTER_Y,
			stroke: null, fill: "#6668",
			width: this.gridX.span(12), height: this.gridY.span(12)
		});
		equipmentEdit.alpha = 0;
		var scene = this;
		menu.forIn(function(key, value) {
			value.z = value.z || 0;
			value.sub.each(function(selects) {
				if (selects.type === 'label') {
					selects.$safe({
						x: this.gridX.center(), y: this.gridY.center()
					});
					var pixratio = 16;
					var label = new THREE_text2d.SpriteText2D(selects.value, {
						align: new THREE.Vector2(0, 0.5),
						fillStyle: 'hsla(0, 0%, 0%, 0.6)',
						font: (selects.size * amp * pixratio) + "px " + phina.display.Label.defaults.fontFamily
					});
					label.scale.set(1 / pixratio, 1 / pixratio, 1);
					threelayer.scene.add(label);
					label.position.set((-value.x + selects.x - SCREEN_CENTER_X) * amp, (value.y - selects.y + SCREEN_CENTER_Y) * amp, value.z + 50);
					label.material.opacity = 1 - Math.min(Math.max(Math.abs(value.z) - 10, 0) * 0.1, 1);
					label.onclick = [];
					var button = false;
					if (selects.link) {
						button = true;
						label.onclick.push(function() {
							moveTo(menu[selects.link].x, menu[selects.link].y, menu[selects.link].z || 0);
							if (selects.link === 'title') this.one('enterframe', function() {
								this.onpointstart = moveToMain;
							}.bind(this));
							else if (selects.link === 'shipmodify') points.each(function(point) {point.setInteractive(true).show();});
							else points.each(function(point) {point.setInteractive(false).hide();});
							this.position = selects.link;
						}.bind(this));
					}
					if (selects.callback) {
						button = true;
						label.onclick.push(selects.callback);
					}
					labels.push(label);
					if (button) buttons.push(label);
				} else if (selects.type === 'model') {
					var add = function(parent, models) {
						models.each(function(model) {
							parent.add(model.value);
							model.value.position.set((-value.x + model.x) * amp, (value.y - model.y) * amp, model.z);
							if(model.init) model.init(model.value);
							if(model.name) this[model.name] = model.value;
							model.childrens && add(model.value, model.childrens);
						}, this);
					}.bind(this);
					add(threelayer.scene, [selects]);
				} else if (selects.type === 'point') {
					var EquipSlot = phina.createClass({
						superClass: phina.display.DisplayElement,
						init: function(options) {
							this.superInit(options);
							this.data = options.data;
							this.hide();
							MarkShape({stroke: "#4a4", width: 48, height: 48}).addChildTo(this);
							phina.display.CircleShape({fill: "#4a48", stroke: null, radius: 16}).addChildTo(this);
						},
						update: function() {
							var pos = scene[this.data.parent].localToWorld(new THREE.Vector3(this.data.x, this.data.y, this.data.z))
								.project(threelayer.camera);
							this.x = (pos.x + 1) * SCREEN_CENTER_X;
							this.y = (1 - pos.y) * SCREEN_CENTER_Y;
						},
						onpointstart: function() {
							scene.interactive = false;
							points.each(function(point) {point.interactive = false;});
							equipmentEdit.children.each(function(child) {child.interactive = true;});
							equipmentEdit.target = this.data;
							equipmentEdit.addChildTo(scene);
							equipmentEdit.tweener.fadeIn(250).play();
							equipmentEdit.updateCurrent(nowarg.skills[this.data.index].klass, nowarg.skills[this.data.index].level);
						}
					});
					points.push(EquipSlot({
						data: selects
					}).addChildTo(this));
				}
			}, this);
		}, this);
		this.onpointstart = moveToMain;
		equipmentEdit.skill = {};
		equipmentEdit.name = phina.display.Label({y: this.gridY.span(-3)}).addChildTo(equipmentEdit);
		equipmentEdit.description = phina.ui.LabelArea({
			width: this.gridX.span(6.8), height: this.gridY.span(2),
			y: this.gridY.span(-1), fontSize: 18
		}).addChildTo(equipmentEdit);
		phina.display.Label({x: this.gridX.span(-4.5), y: this.gridY.span(-1), text: "<", fontSize: 48}).addChildTo(equipmentEdit).on('pointstart', function() {
			var index = skills[equipmentEdit.target.place].indexOf(equipmentEdit.skill.klass);
			do var klass = skills[equipmentEdit.target.place][index === 0 ? (index = skills[equipmentEdit.target.place].length - 1) : --index];
			while (klass.unlockedLevel < 0);
			equipmentEdit.updateCurrent(klass, Math.min(equipmentEdit.skill.level, klass.unlockedLevel));
		});
		phina.display.Label({x: this.gridX.span(4.5), y: this.gridY.span(-1), text: ">", fontSize: 48}).addChildTo(equipmentEdit).on('pointstart', function() {
			var index = skills[equipmentEdit.target.place].indexOf(equipmentEdit.skill.klass);
			do var klass = skills[equipmentEdit.target.place][index === skills[equipmentEdit.target.place].length - 1 ? (index = 0) : ++index];
			while (klass.unlockedLevel < 0);
			equipmentEdit.updateCurrent(klass, Math.min(equipmentEdit.skill.level, klass.unlockedLevel));
		});
		var up = phina.display.Label({y: this.gridY.span(-4), text: "<", fontSize: 48}).addChildTo(equipmentEdit).on('pointstart', function() {
			if (equipmentEdit.skill.level < equipmentEdit.skill.klass.unlockedLevel) equipmentEdit.updateCurrent(equipmentEdit.skill.klass, equipmentEdit.skill.level + 1);
		});
		up.rotation = 90;
		var down = phina.display.Label({y: this.gridY.span(2), text: ">", fontSize: 48}).addChildTo(equipmentEdit).on('pointstart', function() {
			if (equipmentEdit.skill.level > 0) equipmentEdit.updateCurrent(equipmentEdit.skill.klass, equipmentEdit.skill.level - 1);
		});
		down.rotation = 90;
		equipmentEdit.ok = phina.display.Label({y: this.gridY.span(3.25), text: "Replace"}).addChildTo(equipmentEdit).on('pointstart', function() {
			nowarg.skills[equipmentEdit.target.index] = {klass: equipmentEdit.skill.klass, level: equipmentEdit.skill.level};
			nowarg.skills.each(function(skill) {skill.name = skill.klass.prototype.className;});
			localStorage.setItem('skills-pre', JSON.stringify(nowarg.skills));
			equipmentEdit.close();
		});
		phina.display.Label({y: this.gridY.span(4), text: "Back"}).addChildTo(equipmentEdit).on('pointstart', function() {
			equipmentEdit.close();
		});
		equipmentEdit.close = function() {
			this.one('enterframe', function() {scene.interactive = true});
			points.each(function(point) {point.interactive = true;});
			this.children.each(function(child) {child.interactive = false;});
			this.tweener.fadeOut(250).call(function() {this.target.remove()}).play();
		};
		equipmentEdit.updateCurrent = function(klass, level) {
			this.skill.klass = klass;
			this.skill.level = level;
			var changeing = this.skill.klass !== nowarg.skills[this.target.index].klass || this.skill.level !== nowarg.skills[this.target.index].level;
			this.ok.setVisible(changeing).setInteractive(changeing);
			this.ok.text = nowarg.skills[this.target.index].klass.prototype.className === 'Empty' ? 'Install' : 'Replace';
			this.ok.y = scene.gridY.span(3.25);
			if (klass.prototype.className === 'Empty') {
				if (changeing) {
					this.name.text = '';
					this.ok.text = 'Uninstall';
					this.ok.y = scene.gridY.span(-1);
				} else this.name.text = 'No module';
			} else this.name.text = klass.skillName + ' ' + (level + 1);
			this.description.text = klass.getDescription(level);
		};
	}
});

phina.define('MainScene', {
	superClass: 'fly.SceneLoadingScene',

	frame: 0, progress: 0, score: 0, goaled: false, bossdefeated: true,

	init: function(options) {
		this.stage = options.stage || 'arcade';
		this.difficulty = options.difficulty || 1;
		this.space = options.space || false;
		this.superInit();
		// Variables
		var threelayer = phina.display.ThreeLayer({width: SCREEN_WIDTH, height: SCREEN_HEIGHT});
		threelayer.setOrigin(0, 0);
		this.threelayer = threelayer;

		var map = phina.display.CircleShape({x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100,
			radius: 75, fill: 'hsla(0, 0%, 30%, 0.5)', stroke: null});
		var playerpos = fly.DirectionShape({
			x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100, fill: 'hsla(0, 50%, 70%, 0.5)',
			stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1, width: 2.5, height: 4});
		var direction = [];

		var gauge_h = phina.ui.Gauge({x: 80, y: SCREEN_HEIGHT - 100, fill: 'rgba(0, 0, 0, 0)',
			gaugeColor: 'rgba(255, 64, 64, 0.3)', value: 1000, maxValue: 100, strokeWidth: 1, width: 128, height: 16});
		var gauge_e = phina.ui.Gauge({x: 80, y: SCREEN_HEIGHT - 80, fill: 'rgba(0, 0, 0, 0)',
			gaugeColor: 'rgba(64, 64, 255, 0.3)', value: 2000, maxValue: 2000, strokeWidth: 1, width: 128, height: 16});
		var gauge_boss_h = phina.ui.Gauge({x: this.gridX.center(), y: 20, fill: 'rgba(0, 0, 0, 0)',
			gaugeColor: 'rgba(200, 16, 16, 0.3)', strokeWidth: 1, width: SCREEN_WIDTH / 1.2, height: 16});

		var msgbox = phina.display.RectangleShape({y: SCREEN_HEIGHT, fill: 'hsla(0, 0%, 30%, 0.5)', stroke: 'hsla(0, 0%, 30%, 0.25)',
			strokeWidth: 1, cornerRadius: 5, width: SCREEN_WIDTH / 5, height: SCREEN_HEIGHT / 12});
		var message = phina.display.Label({y: SCREEN_HEIGHT, text: '', fontSize: 16, fill: 'hsla(0, 0%, 0%, 0.6)', align: 'left'});
		var mark = MarkShape({x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100, width: 30, height: 30});
		var target = MarkShape({width: 30, height: 30}).hide();
		var name = fly.Popup({x: this.gridX.center(), y: this.gridY.center(), label: {text: '', fontSize: 23, fill: 'hsla(0, 0%, 0%, 0.8)'}});

		var goals = [];
		var goalraders = [];
		var rates;

		var resultbg = phina.display.RectangleShape({x: this.gridX.center(), width: 360, stroke: null});
		var resulttitle = phina.display.Label({x: this.gridX.center(), text: 'Result', fontSize: 48, fill: 'hsla(0, 0%, 0%, 0.8)'});
		var resulttext = phina.display.Label({x: this.gridX.center(), text: '', fontSize: 24, fill: 'hsla(0, 0%, 0%, 0.8)'});

		var allyManager = AllyManager(this, threelayer.scene);
		var enemyManager = EnemyManager(this, threelayer.scene, gauge_boss_h, message);
		var effectManager = EffectManager(threelayer.scene);
		allyManager.effectManager = effectManager;
		enemyManager.effectManager = effectManager;
		var allyBulletManager = BulletManager(this, threelayer.scene, false);
		var enmBulletManager = BulletManager(this, threelayer.scene, true);
		allyManager.bulletManager = allyBulletManager;
		enemyManager.bulletManager = enmBulletManager;
		allyManager.opponents = enemyManager;
		enemyManager.opponents = allyManager;
		var obstacleManager = ObstacleManager(threelayer.scene);
		var windManager = WindManager(threelayer.scene);

		var player = phina.asset.AssetManager.get('threejson', 'fighter').get();
		var plane = new THREE.GridHelper(20400, 100);
		this.load([[
			function(resolve) { // Load Player
				player.position.y = 1000;
				player.geometry.computeBoundingBox();
				// console.log(player)
				player.add(new THREE.AxesHelper(1000));
				player.tweener.setUpdateType('fps');
				player.$safe({ // Player control
					myrot: {x: 0, y: 0, z1: 0, z2: 0}, pitch: 0, yo: 0, v: 0, av: new THREE.Vector3(),
					maxenergy: 2000, maxhp: 100, speed: 0.95, armor: 1, rotspeed: 1,
					summons: allyManager,
					update: function(p, k, s) {
						function normalizeAngle(t) {
							t %= Math.PI * 2;
							if (t > Math.PI) t -= Math.PI * 2;
							if (t < -Math.PI) t += Math.PI * 2;
							return t;
						}

						var reverse = Math.abs(this.myrot.x) > Math.PI / 2 && Math.abs(this.myrot.x) < Math.PI * 1.5;

						if (reverse) this.myrot.z2 += (Math.PI - this.myrot.z2) * 0.05;
						else this.myrot.z2 *= 0.95;

						var rot = Math.atan2(p.y - SCREEN_CENTER_Y, p.x - SCREEN_CENTER_X) + this.myrot.y - this.yo + Math.PI / 2 + (reverse ? Math.PI : 0);
						rot = normalizeAngle(rot);
						var maxrot = (0.04 - this.v * 0.001) * this.rotspeed;
						if (Math.abs(rot) > 2.5) this.way = 'back';
						else {
							rot = Math.max(Math.min(rot * 0.07, maxrot), -maxrot);
							this.myrot.z1 += rot * 0.00008;
							this.yo += rot;
						}

						if (enemyManager.elements.length !== 0) {
							var h = player.geometry.boundingBox.max.x * 2;
							var targetingEnemy = enemyManager.elements.reduce(function(o, enm) { // Select targeting enemy
								var v = enm.position.clone().sub(this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v * 5 + 25));
								var l = Math.clamp(Math.abs(v.y) / h * 5 - 4.5, 0, 1) * 0.8 + 0.2;
								v.y = 0;
								var d = v.angleTo(Axis.z.clone().applyQuaternion(new THREE.Quaternion().rotateY(this.myrot.y + this.yo * 0.5 + (this.way === 'back' ? Math.PI : 0))));
								if (d > Math.PI / (this.way === 'back' ? 6 : 2)) return o;
								d *= v.length() * l;
								return d < o.d ? {d: d, enm: enm} : o;
							}.bind(this), {d: Infinity, enm: null}).enm;
						}

						var shift = k.getKey(16);

						if (this.way) {
							if (k.getKeyUp(87) || k.getKeyUp(83) || (this.way === 'back' && !targetingEnemy)) this.way = null;
						} else {
							if (k.getKeyDown(87)) this.way = 'up'; // W Key
							if (k.getKeyDown(83)) this.way = 'down'; // S Key
						}

						this.targetingEnemy = targetingEnemy;
						if (targetingEnemy) {
							target.show();
							var pos = targetingEnemy.position.clone().project(threelayer.camera);
							target.x = (pos.x + 1) * s.width / 2;
							target.y = (1 - pos.y) * s.height / 2;
							target.stroke = this.way === 'back' ? "#a44" : "#444";
						} else target.hide();

						maxrot /= 2;

						if (this.position.y < 100 || this.way === 'up') this.pitch -= maxrot * (1.55 - (reverse ? 1 : -1) * this.myrot.x);
						else if (this.way === 'down') this.pitch += maxrot * (1.55 - (reverse ? -1 : 1) * this.myrot.x);
						else if (targetingEnemy) {
							var v = targetingEnemy.position.clone().add(targetingEnemy.geometry.boundingSphere.center).sub(this.position);
							var b = this.way === 'back' && Math.abs(normalizeAngle(Math.atan2(v.z, v.x) + this.myrot.y)) > Math.PI / 2;
							rot = normalizeAngle(Math.atan2(-v.y, Math.sqrt(v.x * v.x + v.z * v.z) * (b ? -1 : 1)) - this.myrot.x - this.pitch);
							this.pitch += Math.clamp(rot * 0.15, -maxrot, maxrot);
						}

						// Move and rotate
						this.myrot.x += this.pitch * 0.1;
						this.myrot.y -= this.yo * 0.1;
						this.myrot.x = normalizeAngle(this.myrot.x);
						this.myrot.y = normalizeAngle(this.myrot.y);
						this.quaternion.copy(new THREE.Quaternion());
						// The order is important, even with quaternion.
						this.rotateY(this.myrot.y)
						this.rotateX(this.myrot.x);
						this.rotateZ(this.myrot.z1 + this.myrot.z2);

						if (p.getPointing()) this.consumeEnergy(this.speed * 3, function() { // Speed up
							if (s.space) this.av.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.speed);
							else this.v += this.speed;
						});

						if (!s.space) {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v + 5);
							var angle = Math.randfloat(0, Math.PI * 2);
							threelayer.camera.position.x += Math.sin(angle) * this.v / 20;
							threelayer.camera.position.z += Math.cos(angle) * this.v / 20;
						}
						this.position.add(this.av);

						this.myrot.z1 *= 0.95;

						this.yo *= 0.95 - (Math.PI / 2 - Math.abs(Math.abs(this.myrot.x) - Math.PI / 2)) * 0.1;
						this.pitch *= 0.9;
						if (s.space) this.av.multiplyScalar(0.996); // Speed loss
						else {
							this.v *= 0.98 - Math.abs(rot) * 0.06;
							this.av.multiplyScalar(0.98);
						}


						if (k.getKey(32)) this.consumeEnergy(1.5, function() { // Space Key
							this.attack(6);
							var angle = Math.randfloat(0, Math.PI * 2);
							threelayer.camera.position.x += Math.sin(angle) * 2;
							threelayer.camera.position.z += Math.cos(angle) * 2;
						});

						this.sub.each(function(sub) {
							if (sub.active === false) return;
							sub.update();
						});

						if (k.getKey(65)) opt(opt(this.sub, shift ? 2 : 0), 'activate')(k.getKeyDown(65)); // A Key
						if (k.getKey(68)) opt(opt(this.sub, shift ? 3 : 1), 'activate')(k.getKeyDown(68)); // D Key

						this.energy = Math.min(this.energy + 2, this.maxenergy);
						gauge_e.value = this.energy;
						gauge_h.value = this.hp;

						windManager.each(function(wind) {
							var radius = 15 + wind.size;
							if (Math.sqrt(this.position.x * wind.position.x + this.position.z * wind.position.y) <= radius) this.av.y += wind.v / 2;
						}, this);
						// hit vs bullet
						for (var i = 0; i < enmBulletManager.elements.length; i++) {
							if (this.position.clone().sub(enmBulletManager.get(i).position).length() < 5 + enmBulletManager.get(i).size) {
								//effectManager.explode(enmBulletManager.get(i).position, enmBulletManager.get(i).size, 10);
								var angle = Math.randfloat(0, Math.PI * 2);
								threelayer.camera.position.x += Math.sin(angle) * enmBulletManager.get(i).atk;
								threelayer.camera.position.z += Math.cos(angle) * enmBulletManager.get(i).atk;
								this.hp -= enmBulletManager.get(i).atk * s.difficulty / this.armor;
								s.score--;
								enmBulletManager.removeBullet(i);
							}
						}
						// hit vs enemy
						enemyManager.elements.each(function(enemy) {
							var v = Axis.z.clone().applyQuaternion(this.quaternion).setLength(this.geometry.boundingBox.getSize().z);
							if (fly.colcupsphere(this.position.clone().sub(v.clone().multiplyScalar(-0.5)), v,
									enemy.position.clone().add(enemy.geometry.boundingSphere.center),
									this.geometry.boundingBox.max.x + enemy.geometry.boundingSphere.radius * enemy.scale.x)) {
								var angle = Math.randfloat(0, Math.PI * 2);
								threelayer.camera.position.x += Math.sin(angle) * this.v;
								threelayer.camera.position.z += Math.cos(angle) * this.v;
								this.hp -= Math.min(enemy.hp, 2.5) * s.difficulty * enemy.sharpness / this.armor;
								if (enemy.size < 15) s.score--;
								if (this.hp > 0) enemy.hp -= (this.v + 5) / s.difficulty / enemy.armor;
							}
						}, this);
						// hit vs obstacle
						obstacleManager.each(function(obstacle) {
							if (fly.colobbsphere(obstacle.position, this.position, obstacle.size, obstacle.quaternion, this.geometry.boundingBox.max.x)) this.hp = 0;
						}, this);
					},
					getDamage: function(rawdmg) {
						return rawdmg;
					},
					attack: function(atk) {
						var a = Math.random() * Math.PI * 2;
						allyBulletManager.createBullet('bullet', {
							position: this.position.clone().add(Axis.z.clone().applyQuaternion(this.quaternion).normalize().multiplyScalar(this.geometry.boundingBox.max.z)),
							quaternion: this.quaternion.clone().rotate(new THREE.Vector3(Math.sin(a), Math.cos(a), 0), Math.sqrt(Math.random() * 0.0009)),
							v: 15, atk: this.getDamage(atk)
						});
					},
					beam: function(atk, exps, expt, radius, s) {
						var vec = Axis.z.clone().applyQuaternion(this.quaternion).normalize();
						if (radius === 0) {
							var hits = new THREE.Raycaster(this.position.clone(), vec).intersectObjects(enemyManager.elements);
						} else {
							var hits = [];
							for (var i = 0; i < enemyManager.elements.length; i++) {
								if (fly.colcupsphere(
									this.position.clone().add(vec.clone().multiplyScalar(this.geometry.boundingBox.max.z + radius)),
									vec,
									enemyManager.get(i).position,
									radius + enemyManager.get(i).size * 5
								)) {
									hits.push({point: enemyManager.get(i).position.clone(), object: enemyManager.get(i)});
								}
							}
						}
						hits.each(function(hit) {
							effectManager.explode(hit.point, exps, expt);
							hit.object.hp -= this.getDamage(atk) / s.difficulty;
						}, this);
					},
					consumeEnergy: function(amount, f, defaultreturn) {
						if (this.energy >= amount) {
							this.energy -= amount;
							return f.call(this);
						}
						return defaultreturn;
					}
				});
				player.hp = player.maxhp;
				player.energy = player.maxenergy;
				allyManager.player = player;
				enemyManager.player = player;
				var load = function() {
					player.sub = options.skills.map(function(sub) {
						return sub.klass(player, this, sub.level);
					}, this);
					resolve();
				}.bind(this);
				var asset = {threejson: {}};
				var loadany = false;
				options.skills.each(function(sub) {
					sub.klass.usingModels && sub.klass.usingModels.each(function(name) {
						loadany = true;
						if (!phina.asset.AssetManager.get('threejson', UnitManager.units[name].filename)) asset.threejson[name] = 'data/models/' + UnitManager.units[name].filename + '.min.json';
					});
				});
				if (loadany) phina.asset.AssetLoader().load(asset).then(load);
				else load();
			}, function(resolve) { // Stage loading
				if (this.stage !== 'arcade') {
					var load = function() {
						var stage = phina.asset.AssetManager.get('stage', this.stage).get();
						name.label.text = stage.name;
						stage.enemys.each(function(enemy) {
							enemyManager.createMulti(enemy.name, enemy.option, enemy.autospawn, enemy.killmes);
						});
						stage.obstacles.each(function(obstacle) {
							obstacleManager.create(obstacle.position, obstacle.quaternion, obstacle.scale);
						});
						stage.winds.each(function(wind) {
							windManager.create({v: wind.v, position: wind.position, size: wind.size}, wind.color);
						});
						stage.messages.each(function(imessage) {
							if (!imessage.progress || imessage.progress < 0.00001) {
								phina.namespace(function() {
									var tmp = imessage;
									this.on('frame' + (imessage.time - 5), function() {message.text = '';});
									this.on('frame' + imessage.time, function() {message.text = tmp.text;});
								}.bind(this));
							} else {
								phina.namespace(function() {
									var tmp = imessage;
									var func = function() {
										if (tmp.progress < this.progress) {
											this.on('frame' + (this.frame + tmp.time - 5), function() {message.text = '';});
											this.on('frame' + (this.frame + tmp.time), function() {message.text = tmp.text;});
											this.off('enterframe', func);
										}
									}
									this.on('enterframe', func, this);
								}.bind(this));
							}
						}, this);
						stage.goals.each(function(goal) {
							phina.namespace(function() {
								var material = new THREE.ShaderMaterial({
									transparent: true,
									uniforms: {
										tex1: {type: "t", value: phina.asset.AssetManager.get('threetexture', 'goal').get()},
										tex2: {type: "t", value: phina.asset.AssetManager.get('threetexture', 'goal_disable').get()},
										tex1_percentage: phina.app.Element().$safe({type: "f", value: 0.0}).addChildTo(this), time: {type: "f", value: 100 * Math.random()}, alpha: {type: "f", value: 1.0}
									},
									vertexShader: phina.asset.AssetManager.get('text', 'goalvertexshader').data,
									fragmentShader: phina.asset.AssetManager.get('text', 'goalfragshader').data
								});
								goals.push(new THREE.Mesh(new THREE.IcosahedronGeometry(goal.size, 2), material).$safe({
									size: goal.size, kill: goal.kill, message: goal.message, enable: false,
									update: function(s) {
										material.uniforms.time.value += 0.005 * Math.random();
										if (!this.enable) {
											if (this === goals.first && (this !== goals.last || s.bossdefeated) && enemyManager.killcount >= enemyManager.allcount * this.kill) {
												material.uniforms.tex1_percentage.tweener.to({value: 1}, 50).play();
												goalraders.first.fill = 'hsla(190, 100%, 70%, 0.5)'
												this.enable = true;
											}
										}
									}
								}));
								material.uniforms.tex1_percentage.tweener.setUpdateType('fps');
								goals.last.move(new THREE.Vector3(goal.x, goal.y, goal.z));
								var xdist = player.position.x / 15 - goals.last.position.x / 15;
								var zdist = player.position.z / 15 - goals.last.position.z / 15;
								var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)), 75);
								var angle = Math.atan2(xdist, zdist) - player.myrot.y + (Math.abs(player.myrot.x) > Math.PI / 2 && Math.abs(player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
								goalraders.push(phina.display.CircleShape({radius: 5, fill: 'hsla(0, 0%, 70%, 0.5)', stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1})
									.setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance));
							}.bind(this));
						}, this);
						this.rate = stage.rate;
						this.space = stage.space;
						resolve();
					}.bind(this);
					if (!phina.asset.AssetManager.get('stage', this.stage)) {
						var loader = phina.asset.AssetLoader();
						var asset = {stage: {}};
						asset.stage[this.stage] = 'data/stages/' + this.stage + '.min.json';
						loader.load(asset).then(function() {
							var stage = phina.asset.AssetManager.get('stage', this.stage).get();
							asset = {threejson: {}};
							if (stage.enemys.length !== 0) {
								stage.enemys.each(function(enemy) {
									if (!phina.asset.AssetManager.get('threejson', enemy.name)) {
										asset.threejson[enemy.name] = 'data/models/' + UnitManager.units[enemy.name].filename + '.min.json';
									}
								});
								loader.load(asset).then(load);
							} else {
								load();
							}
						}.bind(this));
					} else {
						load();
					}
				} else {
					name.label.text = 'Free play';
					var asset = {threejson: {}};
					UnitManager.units.forIn(function(key, value) {
						if (!phina.asset.AssetManager.get('threejson', key)) asset.threejson[key] = 'data/models/' + value.filename + '.min.json';
					});
					phina.asset.AssetLoader().load(asset).then(resolve);
				}
			}
		], [
			function(resolve) { // Screen Setup
				this.on('enter', function() {
					var fade = new THREE.ShaderPass(phina.display.three.FadeShader);
					fade.uniforms.color.value = new THREE.Vector4(1, 1, 1, 1);
					this.app.composer.addPass(fade);
					this.on('enterframe', function setalpha() {
						if (this.frame === 40) {
							this.app.composer.passes.erase(fade);
							this.off('enterframe', setalpha);
						} else fade.uniforms.color.value.w = 1 - this.frame * 0.025;
					}.bind(this));
				});
				threelayer.addChildTo(this);
				map.addChildTo(this);
				playerpos.addChildTo(this);
				playerpos.rotation = 180;

				name.fill = "hsla(0, 0%, 50%, 0.5)";
				name.addChildTo(this);
				name.tweener2 = phina.accessory.Tweener().attachTo(name);
				name.tweener.setUpdateType('fps');
				name.tweener2.setUpdateType('fps');
				name.tweener.set({width: 0, height: 72}).wait(10).to({width: 720, height: 3}, 100, 'easeOutInCubic');
				name.tweener2.set({alpha: 0}).wait(10).fadeIn(30).wait(40).fadeOut(30);

				for(var i = 0; i < 4; i++) {
					direction[i] = fly.DirectionShape({
						x: SCREEN_WIDTH - 100 - 75 * Math.sin(i * Math.PI / 2), y: SCREEN_HEIGHT - 100 - 75 * Math.cos(i * Math.PI / 2),
						fill: 'hsla(0, 0%, 10%, 0.5)', stroke: null, width: 12, height: 7.5
					}).addChildTo(this);
					direction[i].rotation = -i * 90;
				}
				mark.alpha = 0.5;
				mark.addChildTo(this);
				target.alpha = 0.7;
				target.addChildTo(this);

				gauge_h.addChildTo(this);
				gauge_h.animation = false;
				gauge_e.addChildTo(this);
				gauge_e.animation = false;
				if (this.stage !== 'arcade') {
					for(var i = 0; i < goalraders.length; i++) goalraders[i].addChildTo(this);
					gauge_boss_h.addChildTo(this);
					gauge_boss_h.tweener.setUpdateType('fps');
					gauge_boss_h.alpha = 0;
					gauge_boss_h.animation = false;
					msgbox.addChildTo(this);
					msgbox.live = 0;
					message.addChildTo(this);
				}
				resultbg.fill = "hsla(0, 0%, 50%, 0.5)";
				resultbg.addChildTo(this);
				resulttitle.addChildTo(this);
				resulttext.addChildTo(this);
				resultbg.tweener.setUpdateType('fps');
				resulttitle.tweener.setUpdateType('fps');
				resulttext.tweener.setUpdateType('fps');
				resultbg.alpha = 0;
				resulttitle.alpha = 0;
				resulttext.alpha = 0;

				allyManager.addChildTo(this);
				enemyManager.addChildTo(this);
				effectManager.addChildTo(this);
				this.effectManager = effectManager;
				allyBulletManager.addChildTo(this);
				enmBulletManager.addChildTo(this);
				windManager.addChildTo(this);
				resolve();
			}, function(resolve) { // Stage Setup
				var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
				directionalLight.position.set(0, 0, 30);
				plane.update = function() {
					this.position.x = player.position.x - player.position.x % 200;
					this.position.z = player.position.z - player.position.z % 200;
				};
				//plane.rotateX(-Math.PI / 2);
				if (this.stage !== 'arcade') {
					for(var i = 0; i < goals.length; i++) {
						goals[i].tweener.setUpdateType('fps');
						threelayer.scene.add(goals[i]);
					}
				}
				threelayer.scene.add(directionalLight);
				threelayer.scene.add(new THREE.AmbientLight(0x606060));
				threelayer.scene.add(player);
				threelayer.scene.add(plane);
				threelayer.camera.fov = 100;
				threelayer.camera.radiuses = [-100, 10, 28];
				threelayer.camera.radius = 0;
				threelayer.camera.rotateY(Math.PI)
				threelayer.camera.rotateX(-Math.PI / 2);
				resolve();
			}, function(resolve) {
				threelayer.update = function(app) { // Update routine
					var p = app.pointer;
					var k = app.keyboard;
					if (!player) {
						threelayer.camera.rotateAbsY(-0.002);
					} else if (this.goaled) {
						player.flare('enterframe');
						player.update(p, k, this);
						plane.update();
						threelayer.camera.rotateAbsY(-0.002);
					} else {
						if (this.stage === 'arcade') { // Arcade mode (random enemy spawn)
							var rand = Math.random();
							if (rand > 1 - 0.01 * this.difficulty && enemyManager.count() < 100) {
								var params = {
									position: new THREE.Vector3(Math.randint(-1000, 1000), Math.randint(-100, 100), Math.randint(-1000, 4000)).add(player.position),
									quaternion: new THREE.Quaternion().rotateY(Math.random() * Math.PI * 2)
								};

								var enmname = Slot([
									{weight: 6, target: 'enem1'},
									{weight: 3, target: function() {
										params.aim = true;
										return 'enem1';
									}},
									{weight: 2, target: 'enem2'},
									{weight: 1, target: 'enem3'},
								]);
								enemyManager.createMulti(enmname, params, {random: {x: 50, y: 10, z: 50}});
							}
							this.difficulty += 0.0001;
							if (enemyManager.count() > 50) {enemyManager.removeEnemy(0);}
						} else {
							for(var i = 0; i < goals.length; i++) {
								var xdist = (player.position.x - goals[i].position.x) / 25;
								var zdist = (player.position.z - goals[i].position.z) / 25;
								var distance = Math.min(Math.sqrt(Math.pow(xdist, 2) + Math.pow(zdist, 2)), 75);
								var angle = Math.atan2(xdist, zdist) - player.myrot.y + (Math.abs(player.myrot.x) > Math.PI / 2 && Math.abs(player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
								goalraders[i].setPosition(SCREEN_WIDTH - 100 + Math.sin(angle) * distance, SCREEN_HEIGHT - 100 + Math.cos(angle) * distance);
								goals[i].update(this);
							}
							this.progress = player.position.clone().dot(goals.last.position) / goals.last.position.clone().dot(goals.last.position);
							enemyManager.flare('frame', {progress: this.progress});
						}
						if (this.frame % 10 === 0) {
							for (var i = 0; i < allyBulletManager.elements.length; i++) {
								if (allyBulletManager.get(i).position.clone().sub(player.position).length > 800) allyBulletManager.removeBullet(i);
							}
							for (var i = 0; i < enmBulletManager.elements.length; i++) {
								if (enmBulletManager.get(i).position.clone().sub(player.position).length > 800) enmBulletManager.removeBullet(i);
							}
						}
						if (allyBulletManager.count() > 1050) {for(; allyBulletManager.count() > 1000;) {allyBulletManager.removeBullet(0);}}
						if (enmBulletManager.count() > 1600) {for(; enmBulletManager.count() > 1550;) {enmBulletManager.removeBullet(0);}}

						// Camera control

						threelayer.camera.position.copy(player.position.clone().add(new THREE.Vector3(0, 650, -200)));
						threelayer.camera.lookAt(player.position);

						this.flare('frame' + this.frame);
						enemyManager.flare('frame' + this.frame);
						player.flare('enterframe');
						player.update(p, k, this);
						plane.update();
						windManager.playerposy = player.position.y;

						playerpos.rotation = Math.radToDeg(-player.myrot.y) + (Math.abs(player.myrot.x) > Math.PI / 2 && Math.abs(player.myrot.x) < Math.PI * 1.5 ? 0 : 180);

						/*if (k.getKeyDown(53)) { // 5 Key
							threelayer.camera.radius++;
							threelayer.camera.radius %= threelayer.camera.radiuses.length;
						}
						threelayer.camera.quaternion.copy(new THREE.Quaternion());
						threelayer.camera.rotateZ(-player.myrot.z2 + (threelayer.camera.radius !== 0 ? -player.myrot.z1 : 0));
						threelayer.camera.rotateX(-player.myrot.x);
						threelayer.camera.rotateY(player.myrot.y + Math.PI);
						var vec = Axis.z.clone().applyQuaternion(threelayer.camera.quaternion).negate().setLength(threelayer.camera.radiuses[threelayer.camera.radius]);
						threelayer.camera.position.copy(player.position.clone().add(vec));*/

						var h = player.geometry.boundingBox.max.x * 2;

						function setColor(e) {
							var l = 1 - Math.clamp(Math.abs(player.position.y - e.position.y) / h * 5 - 4.5, 0, 1);
							//THREE.applyToAllMaterial(e.material, function(m) {m.color.setScalar(l)});
							THREE.applyToAllMaterial(e.material, function(m) {
								m.opacity = l * 0.8 + 0.2;
								m.transparent = l !== 1;
							});
						}

						enemyManager.elements.each(setColor);
						enmBulletManager.elements.each(setColor);

						if (this.bosscoming) {
							if (this.boss.parent === null) {
								this.bosscoming = false;
								gauge_boss_h.tweener.fadeOut(10).play();
								this.bossdefeated = true;
							} else {
								gauge_boss_h.value = this.boss.hp;
							}
						}

						if (k.getKeyDown(32)) {message.text = '';} // Space Key

						if (player.hp <= 0) {
							effectManager.explode(player.position, 10, 30);
							threelayer.scene.remove(player);
							player = null;
							resultbg.tweener.to({alpha: 1, height: SCREEN_HEIGHT, y: SCREEN_CENTER_Y}, 5).play();
							resulttitle.tweener.to({alpha: 1, y: SCREEN_CENTER_Y / 3}, 3).play();
							resulttext.tweener.wait(10).to({alpha: 1, y: SCREEN_CENTER_Y * 0.6}, 3).play();
							if (this.score < 0) {this.score = 0;}
							resulttext.text = 'Score: ' + this.score.toFixed(0)
								+ '\nKill: ' + enemyManager.killcount + '(' + (enemyManager.killcount / enemyManager.allcount * 100).toFixed(1) + '%)'
							resulttitle.text = 'Game Over';
							message.text = '';
							map.tweener.fadeOut(20).play();
							if (this.stage !== 'arcade') {
								for (var i = 0; i < goalraders.length; i++) {goalraders[i].tweener.fadeOut(20).play();}
							}
							for (var i = 0; i < enemyManager.count(); i++) {enemyManager.enemyraders[i].tweener.fadeOut(20).play();}
							for(var i = 0; i < 4; i++) {direction[i].tweener.fadeOut(20).play();}
							playerpos.tweener.fadeOut(20).play();
							gauge_h.tweener.fadeOut(20).play();
							gauge_e.tweener.fadeOut(20).play();
							msgbox.tweener.fadeOut(20).play();
							mark.tweener.fadeOut(20).play();
						} else if (this.stage !== 'arcade' && goals.first.enable && fly.colCup2D3(p1, goals.first.position.clone(), v1, new THREE.Vector3(0, 0, 0), 15 + goals.first.size / 2)) {
							if (goals.length === 1) {
								player.tweener.to({auto: 1}, 60).play();
								resultbg.tweener.to({alpha: 1, height: SCREEN_HEIGHT, y: SCREEN_CENTER_Y}, 5).play();
								resulttitle.tweener.to({alpha: 1, y: SCREEN_CENTER_Y / 3}, 3).play();
								resulttext.tweener.wait(10).to({alpha: 1, y: SCREEN_CENTER_Y * 0.6}, 3).play();
								var rate = '';
								this.score += this.rate[0] * player.hp / 1000;
								if (this.score >= this.rate[3]) {
									rate = 'Perfect';
								} else if (this.score >= this.rate[2]) {
									rate = 'Good';
								} else if (this.score >= this.rate[1]) {
									rate = 'Middle';
								} else {
									rate = 'Bad';
								}
								if (this.score < 0) {this.score = 0;}
								resulttext.text = 'Score: ' + this.score.toFixed(0)
									+ (enemyManager.allcount !== 0 ? '\nKill: ' + enemyManager.killcount + '(' + (enemyManager.killcount / enemyManager.allcount * 100).toFixed(1) + '%)' : '')
									+ '\nLife: ' + (player.hp / 10).toFixed(1) + '%'
									+ '\nRate: ' + rate;
								message.text = '';
								map.tweener.fadeOut(20).play();
								for (var i = 0; i < goalraders.length; i++) {goalraders[i].tweener.fadeOut(20).play();}
								for (var i = 0; i < enemyManager.count(); i++) {enemyManager.enemyraders[i].tweener.fadeOut(20).play();}
								for(var i = 0; i < 4; i++) {direction[i].tweener.fadeOut(20).play();}
								playerpos.tweener.fadeOut(20).play();
								gauge_h.tweener.fadeOut(20).play();
								gauge_e.tweener.fadeOut(20).play();
								msgbox.tweener.fadeOut(20).play();
								mark.tweener.fadeOut(20).play();
								this.goaled = true;
							} else {
								var tmp = goals.first.message;
								this.on('frame' + (this.frame + 30), function() {message.text = tmp;}.bind(this));
								goals.first.parent.remove(goals.first);
								goals.splice(0, 1);
								goalraders.first.remove();
								goalraders.splice(0, 1);
							}
						}

						if (this.frame % 600 === 0) {this.score--;}

						this.frame++;
					}
					if (message.text !== '') {
						if (msgbox.live < 0.99999) {
							msgbox.live += 0.5;
							msgbox.setPosition(SCREEN_CENTER_X * msgbox.live, SCREEN_HEIGHT - SCREEN_CENTER_Y * 0.3 * msgbox.live);
							msgbox.width = SCREEN_WIDTH / 10 + SCREEN_WIDTH / 1.3 * msgbox.live;
							msgbox.height = SCREEN_HEIGHT / 12 + SCREEN_HEIGHT / 8 * msgbox.live;
							message.setPosition(SCREEN_CENTER_X  * 0.2 * msgbox.live, SCREEN_HEIGHT - SCREEN_CENTER_Y * 0.3 * msgbox.live);
						}
					} else if (msgbox.live > 0.00001) {
						msgbox.live -= 0.5;
						msgbox.setPosition(SCREEN_CENTER_X * msgbox.live, SCREEN_HEIGHT - SCREEN_CENTER_Y * 0.3 * msgbox.live);
						msgbox.width = SCREEN_WIDTH / 10 + SCREEN_WIDTH / 1.3 * msgbox.live;
						msgbox.height = SCREEN_HEIGHT / 12 + SCREEN_HEIGHT / 5 * msgbox.live;
						message.setPosition(SCREEN_CENTER_X * 0.2 * msgbox.live, SCREEN_HEIGHT - SCREEN_CENTER_Y * 0.3 * msgbox.live);
					}
					threelayer.camera.updateMatrixWorld();
				}.bind(this);
				resolve();
			}
		]]);
	}
});

phina.define('MainSequence', {
	superClass: 'phina.game.ManagerScene',
	init: function() {
		this.superInit({
			scenes: [
				{
					className: 'LoadingScene',
					arguments: {
						lie: false,
						assets: {
							threejson: {
								fighter: 'data/models/fighter-1.min.json',
								bullet: 'data/models/bullet-lq.min.json',
								enem1: 'data/models/enem-1.min.json',
							},
							threetexture: {
								//fighter: 'data/models/fighter-1.png',
								plane: 'data/images/3.png',
								explode: 'data/images/explosion.png'
							},
							text: {
								expvertexshader: 'data/glsl/expvertexshader.glsl',
								expfragshader: 'data/glsl/expfragshader.glsl'
							}
						}
					}
				},
				{
					label: 'title',
					className: 'TitleScene',
					arguments: {
						width: SCREEN_WIDTH,
						height: SCREEN_HEIGHT
					}
				},
				{
					label: 'main',
					className: 'MainScene',
					arguments: {
						width: SCREEN_WIDTH,
						height: SCREEN_HEIGHT
					}
				}
			]
		});
	}
});

phina.define('Application', {
	superClass: 'phina.display.ThreeApp',
	init: function() {
		this.superInit({
			width: SCREEN_WIDTH,
			height: SCREEN_HEIGHT,
			query: '#game',
			fit: true
		});
		threeext.extention();
		this.replaceScene(MainSequence());
		this.enableStats();
	},
});

phina.main(function() {
	var app = Application();
	app.setupEffect().then(function() {
		app.run();
	});
});
