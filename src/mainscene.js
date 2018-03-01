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
					myrot: {x: 0, y: 0, z1: 0, z2: 0}, pitch: 0, yaw: 0, v: 5, av: new THREE.Vector3(),
					maxenergy: 2000, maxhp: 100, speed: 0.95, armor: 1, rotspeed: 1, sharpness: 1, weight: 100,
					summons: allyManager,
					update: function(p, k, s) {
						function normalizeAngle(t) {
							t %= Math.PI * 2;
							if (t > Math.PI) t -= Math.PI * 2;
							if (t < -Math.PI) t += Math.PI * 2;
							return t;
						}

						var reverse = Math.abs(this.myrot.x) > Math.PI / 2;

						if (reverse) this.myrot.z2 += (Math.PI - this.myrot.z2) * 0.05;
						else this.myrot.z2 *= 0.95;

						reverse = this.myrot.z2 > Math.PI / 2;

						var rot = normalizeAngle(
							Math.atan2(p.y - SCREEN_CENTER_Y, p.x - SCREEN_CENTER_X) +
							this.myrot.y - this.yaw + (reverse ? Math.PI * 1.5 : Math.PI / 2)
						);
						var maxrot = (0.04 - this.v * 0.001) * this.rotspeed;
						if (Math.abs(rot) > 2.5) this.mode = 'back';
						else {
							if (this.mode === 'back') this.mode = null;
							rot = Math.clamp(rot * 0.07, -maxrot, maxrot);
							this.myrot.z1 += rot * 0.3;
							this.yaw += rot;
						}

						if (enemyManager.elements.length !== 0) {
							var targetingEnemy = enemyManager.elements.reduce(function(o, enm) { // Select targeting enemy
								var v = enm.position.clone().sub(this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v * 5 + 25));
								v.y = 0;
								var d = v.angleTo(Axis.z.clone().applyQuaternion(new THREE.Quaternion().rotateY(this.myrot.y - this.yaw * 0.5 + ((this.mode === 'back') !== reverse ? Math.PI : 0))));
								if (d > Math.PI / (this.mode === 'back' ? 6 : 2)) return o;
								d *= v.length();
								return d < o.d ? {d: d, enm: enm} : o;
							}.bind(this), {d: Infinity, enm: null}).enm;
						}

						var shift = k.getKey(16);

						if (this.way) {
							if (k.getKeyUp(87) || k.getKeyUp(83)) this.way = null;
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
							target.stroke = this.mode === 'back' ? "#a44" : "#444";
						} else target.hide();

						maxrot /= 2;

						if (this.position.y < 100 || this.way === 'up') this.pitch -= (reverse ? -1 : 1) * maxrot * (this.mode === 'back' ? 2 : 1 - (reverse ? (this.myrot.x + (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6 : -this.myrot.x / 1.6));
						else if (this.way === 'down') this.pitch += (reverse ? -1 : 1) * maxrot * (this.mode === 'back' ? 2 : 1 - (reverse ? (-this.myrot.x - (this.myrot.x > 0 ? -Math.PI : Math.PI)) / 1.6 : this.myrot.x / 1.6));
						else if (targetingEnemy) {
							var v = targetingEnemy.position.clone().add(targetingEnemy.geometry.boundingSphere.center).sub(this.position);
							var b = (this.mode === 'back') !== reverse;
							rot = normalizeAngle(Math.atan2(-v.y, Math.sqrt(v.x * v.x + v.z * v.z) * (b ? -1 : 1)) - this.myrot.x - this.pitch);
							this.pitch += Math.clamp(rot * 0.15, -maxrot, maxrot);
						}

						// Move and rotate
						this.myrot.x += this.pitch * 0.1;
						this.myrot.y -= this.yaw * 0.1;
						this.myrot.x = normalizeAngle(this.myrot.x);
						this.myrot.y = normalizeAngle(this.myrot.y);
						this.quaternion.copy(new THREE.Quaternion());
						this.applyRotation();

						if (p.getPointing()) this.consumeEnergy(this.speed * 3, function() { // Speed up
							if (s.space) this.av.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.speed);
							else this.v += this.speed;
						});

						if (!s.space) {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v);
							s.shakeScreen((this.v - 5) / 20);
						}
						this.position.add(this.av);

						this.myrot.z1 *= 0.95;

						this.yaw *= 0.95 - (Math.PI / 2 - Math.abs(Math.abs(this.myrot.x) - Math.PI / 2)) * 0.1;
						this.pitch *= 0.9;
						if (s.space) this.av.multiplyScalar(0.996); // Speed loss
						else {
							this.v *= 0.98 - (this.pitch + this.yaw) * 0.06;
							if (this.v < 5) this.v = 5;
							this.av.multiplyScalar(0.98);
						}


						if (k.getKey(32)) this.consumeEnergy(1.5, function() { // Space Key
							this.attack(6);
							s.shakeScreen(2);
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
								s.shakeScreen(enmBulletManager.get(i).atk);
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
								s.shakeScreen(this.v);
								this.hp -= Math.min(enemy.hp, 2.5) * s.difficulty * enemy.sharpness / this.armor;
								if (enemy.size < 15) {
									s.score--;
									this.v /= 2;
								}
								if (this.hp > 0) enemy.hp -= this.v * this.sharpness / s.difficulty / enemy.armor;
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
					},
					applyRotation: function() {
						// The order is important, even with quaternion.
						this.rotateY(this.myrot.y);
						this.rotateX(this.myrot.x);
						this.rotateZ(this.myrot.z1 + this.myrot.z2);
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
									{weight: 24, target: 'enem1'},
									{weight: 12, target: function() {
										params.aim = true;
										return 'enem1';
									}},
									{weight: 8, target: 'enem2'},
									{weight: 4, target: 'enem3'},
									{weight: 3, target: 'airballoon'},
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
	},
	shakeScreen: function(amount) {
		var angle = Math.randfloat(0, Math.PI * 2);
		this.threelayer.camera.position.x += Math.sin(angle) * amount;
		this.threelayer.camera.position.z += Math.cos(angle) * amount;
	}
});
