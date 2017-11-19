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
				if (this.startframe === 40) {
					this.exit({stage: nowarg.stage, difficulty: nowarg.difficulty});
				} else {
					this.startframe++;
				}
			}.bind(this);
			this.on('enterframe', setFilter);
		}.bind(this);
		var nowarg = {};
		var menu = {
			title: {
				x: 0, y: 0, sub: [
					{type: 'label', value: 'Re:Flight', y: this.gridY.center(-3), size: 64},
					{type: 'label', value: 'Click start', y: this.gridY.center(3), size: 32},
					{type: 'model', name: 'player', value: phina.asset.AssetManager.get('threejson', 'fighter').get(), x: 0, y: 0, z: 0},
					{type: 'model', value: new THREE.Mesh(new THREE.CircleGeometry(10000, 100), new THREE.MeshBasicMaterial({
						map: phina.asset.AssetManager.get('threetexture', 'plane').get()
					})), x: 0, y: -1000, z: 0, init: function(model) {model.rotate(-Math.PI / 2, 0, 0);}}
				]
			},
			main: {
				x: -500, y: -500, sub: [
					{type: 'label', value: 'Main Menu', y: this.gridY.center(-4), size: 64},
					{type: 'label', value: 'Campaign', y: this.gridY.center(-2), size: 32, link: 'difficulty'},
					{type: 'label', value: 'Stage Select', y: this.gridY.center(-1), size: 32, link: 'stageselect'},
					{type: 'label', value: 'Ship Select', size: 32, link: 'shipselect'},
					{type: 'label', value: 'Tutorial', y: this.gridY.center(1), size: 32, link: 'tutorial'},
					{type: 'label', value: 'Free Mode', y: this.gridY.center(2), size: 32, link: 'difficulty', callback: function() {nowarg.stage = 'arcade'}},
					{type: 'label', value: 'Settings', y: this.gridY.center(3), size: 32, link: 'setting'},
					{type: 'label', value: 'Back', y: this.gridY.center(5), size: 32, link: 'title'}
				]
			},
			tutorial: {
				x: 750, y: 750, sub: [
					{type: 'label', value: 'Tutorial', x: this.gridX.center(), y: this.gridY.span(4.5), size: 64},
					{type: 'label', value: 'Move', x: this.gridX.center(), y: this.gridY.span(6.5), size: 32, callback: function() {nowarg.stage = 'tutorial_move';start();}},
					{type: 'label', value: 'Attack', x: this.gridX.center(), y: this.gridY.span(7.5), size: 32, callback: function() {nowarg.stage = 'tutorial_attack';start();}},
					{type: 'label', value: 'Special', x: this.gridX.center(), y: this.gridY.span(8.5), size: 32, callback: function() {nowarg.stage = 'tutorial_special';start();}},
					{type: 'label', value: 'Space', x: this.gridX.center(), y: this.gridY.span(9.5), size: 32, callback: function() {nowarg.stage = 'tutorial_space';start();}},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(11.5), size: 32, link: 'main'}
				]
			},
			stageselect: {
				x: 500, y: -250, sub: [
					{type: 'label', value: 'Stage Select', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'},
				]
			},
			shipselect: {
				x: 0, y: 0, z: -30, sub: [
					{type: 'label', value: 'Ship Select', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Main Menu', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'},
				]
			},
			difficulty: {
				x: -1000, y: -750, sub: [
					{type: 'label', value: 'Difficulty', x: this.gridX.center(), y: this.gridY.span(5), size: 64},
					{type: 'label', value: 'Easy', x: this.gridX.center(), y: this.gridY.span(7), size: 32, callback: function() {nowarg.difficulty = 0.8;start()}},
					{type: 'label', value: 'Normal', x: this.gridX.center(), y: this.gridY.span(8), size: 32, callback: start},
					{type: 'label', value: 'Hard', x: this.gridX.center(), y: this.gridY.span(9), size: 32, callback: function() {nowarg.difficulty = 1.25;start()}},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(11), size: 32, link: 'main'}
				]
			},
			setting: {
				x: -250, y: -1250, sub: [
					{type: 'label', value: 'Settings', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Credit', x: this.gridX.center(), y: this.gridY.span(8), size: 32, link: 'credit'},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'main'}
				]
			},
			credit: {
				x: -5000, y: -5000, sub: [
					{type: 'label', value: 'Credit', x: this.gridX.center(), y: this.gridY.span(4), size: 64},
					{type: 'label', value: 'Programing: axion014', x: this.gridX.center(), y: this.gridY.span(6), size: 32},
					{type: 'label', value: 'Back', x: this.gridX.center(), y: this.gridY.span(12), size: 32, link: 'setting'}
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
		threelayer.scene.fog = new THREE.FogExp2(0x66aaee, 0.0004);
		threelayer.camera.position.z = 100;
		threelayer.update = function(app) { // Update routine
			// Camera control
			this.player.quaternion.copy(new THREE.Quaternion());
			this.player.rotateX(Math.sin(this.frame * 0.01) * 0.25);
			this.player.rotateY(-Math.PI / 2 + this.frame * 0.005);
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
			var time = Math.max(dist / 3, 1000);
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
		var labels = [], buttons = [];
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
						}.bind(this));
					}
					if (selects.callback) {
						button = true;
						label.onclick.push(selects.callback);
					}
					labels.push(label);
					if (button) buttons.push(label);
				} else if (selects.type === 'model') {
					threelayer.scene.add(selects.value);
					selects.value.position.set(selects.x, selects.y, selects.z);
					if(selects.init) selects.init(selects.value);
					if(selects.name) this[selects.name] = selects.value;
				}
			}, this);
		}, this);
		this.onpointstart = moveToMain;
	}
});
