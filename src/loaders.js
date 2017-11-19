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
				stage.enemys[i].autospawn.$safe({time: 0, progress: 0, random: {}});
				stage.enemys[i].autospawn.random.$safe({x: 0, y: 0, z: 0});
				stage.enemys[i].killmes.$safe({time: 0, text: '', offkill: false});
				stage.enemys[i].option.$safe({
					position: new THREE.Vector3(stage.enemys[i].position.x || 0, stage.enemys[i].position.y || 0, stage.enemys[i].position.z || 0),
					quaternion: new THREE.Quaternion().rotate(stage.enemys[i].rotation.x || 0, stage.enemys[i].rotation.y || 0, stage.enemys[i].rotation.z || 0),
					c: new THREE.Quaternion().rotate(stage.enemys[i].rotation.cx || 0, stage.enemys[i].rotation.cy || 0, stage.enemys[i].rotation.cz || 0)
				});
			}
			for(var i = 0; i < stage.winds.length; i++) {
				stage.winds[i].$safe({v: 0.2, x: 0, y: 0, color: [0, 0, 0]});
				stage.winds[i].position = new THREE.Vector2(stage.winds[i].x, stage.winds[i].y);
				stage.winds[i].c = stage.winds[i].color[0] << 16 | stage.winds[i].color[1] << 8 | stage.winds[i].color[2];
			}
			for(var i = 0; i < stage.obstacles.length; i++) {
				stage.obstacles[i].$safe({position: {}, rotation: {}, scale: {}});
				stage.obstacles[i].position = new THREE.Vector3(stage.obstacles[i].position.x || 0, stage.obstacles[i].position.y || 0, stage.obstacles[i].position.z || 0);
				stage.obstacles[i].quaternion = new THREE.Quaternion().rotate(stage.obstacles[i].rotation.x || 0, stage.obstacles[i].rotation.y || 0, stage.obstacles[i].rotation.z || 0);
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
