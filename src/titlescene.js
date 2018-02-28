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
					{
						type: 'model', name: 'airballoon', value: phina.asset.AssetManager.get('threejson', 'airballoon').get(), x: 0, y: 0, z: 0,
						init: function(model) {model.rotate(new THREE.Vector3(1, -1, -1).normalize(), 1);}
					},
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
							model.value.position.set((-value.x + model.x) * amp, (value.y - model.y) * amp, value.z + model.z);
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
