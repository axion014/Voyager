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

		var map = phina.display.CircleShape({x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100,
			radius: 75, fill: 'hsla(0, 0%, 30%, 0.5)', stroke: null});
		var playerpos = fly.DirectionShape({
			x: SCREEN_WIDTH - 100, y: SCREEN_HEIGHT - 100, fill: 'hsla(0, 50%, 70%, 0.5)',
			stroke: 'hsla(0, 0%, 0%, 0.5)', strokeWidth: 1, width: 2.5, height: 4});
		var direction = [];

		var gauge_h = phina.ui.Gauge({x: 80, y: SCREEN_HEIGHT - 100, fill: 'rgba(0, 0, 0, 0)',
			gaugeColor: 'rgba(255, 64, 64, 0.3)', value: 1000, maxValue: 1000, strokeWidth: 1, width: 128, height: 16});
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

		var enemyManager = fly.EnemyManager(this, threelayer.scene, gauge_boss_h, message);
		var effectManager = enemyManager.effectmanager;
		var enmBulletManager = fly.BulletManager(threelayer.scene);
		enemyManager.enmBulletManager = enmBulletManager;
		var obstacleManager = fly.ObstacleManager(threelayer.scene);
		var windManager = fly.WindManager(threelayer.scene);

		var player = phina.asset.AssetManager.get('threejson', 'fighter').get();
		var plane = new THREE.GridHelper(20400, 100);
		this.load([[
			function(resolve) { // Load Player
				player.position.y = 1000;
				player.geometry.computeBoundingBox();
				// console.log(player)
				player.add(new THREE.AxisHelper(1000));
				player.tweener.setUpdateType('fps');
				player.$safe({ // Player control
					myrot: {x: 0, y: 0, z1: 0, z2: 0},
					pitch: 0, yo: 0, v: 0, s1c: 0, s2c: 0, e: 2000, hp: 1000, speed: 0.95,
					av: new THREE.Vector3(), sub1id: 0, sub2id: 1,
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
						var maxrot = 0.04 - this.v * 0.001;
						if (Math.abs(rot) > 2.5) {
							this.way = 'back';
						} else {
							rot = Math.max(Math.min(rot * 0.07, maxrot), -maxrot);
							this.myrot.z1 += rot * 0.00008;
							this.yo += rot;
						}

						if (enemyManager.elements.length !== 0) {
							var targetingEnemy = enemyManager.elements.reduce(function(o, enm) { // Select targeting enemy
								var v = enm.position.clone().sub(this.position.clone().addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v * 5 + 25));
								v.y = 0;
								var d = v.angleTo(Axis.z.clone().applyQuaternion(new	 THREE.Quaternion().rotateY(this.myrot.y + this.yo * 0.5 + (this.way === 'back' ? Math.PI : 0))));
								if (d > Math.PI / 2) return o;
								d *= v.length();
								if (d < o.d) return {d: d, enm: enm};
								return o;
							}.bind(this), {d: Infinity, enm: null}).enm;
						}
						if (targetingEnemy) {
							target.show();
							var pos = targetingEnemy.position.clone().project(threelayer.camera);
							target.x = (pos.x + 1) * s.width / 2;
							target.y = (1 - pos.y) * s.height / 2;
						} else target.hide();


						var shift = k.getKey(16);

						if (this.way) {
							if (k.getKeyUp(87) || k.getKeyUp(83) || (this.way === 'back' && !targetingEnemy)) this.way = null;
						} else {
							if (k.getKeyDown(87)) this.way = 'up'; // W Key
							if (k.getKeyDown(83)) this.way = 'down'; // S Key
						}

						var maxrot = 0.02 - this.v * 0.0005;

						if (this.position.y < 100 || this.way === 'up') this.pitch -= maxrot * (1.55 - (reverse ? 1 : -1) * this.myrot.x);
						else if (this.way === 'down') this.pitch += maxrot * (1.55 - (reverse ? -1 : 1) * this.myrot.x);
						else if (targetingEnemy) {
							var v = targetingEnemy.position.clone().add(targetingEnemy.geometry.boundingSphere.center).sub(this.position);
							rot = Math.atan2(-v.y, Math.sqrt(v.x * v.x + v.z * v.z) * (this.way === 'back' && Math.abs(Math.atan2(v.z, v.x) + this.myrot.y) > Math.PI ? -1 : 1)) - this.myrot.x - this.pitch;
							if (rot > Math.PI) rot -= Math.PI * 2;
							if (rot < -Math.PI) rot += Math.PI * 2;
							this.pitch += Math.clamp(rot * 0.15, -maxrot, maxrot);
						}

						// Move and Rotate
						this.myrot.x += this.pitch * 0.1;
						this.myrot.y -= this.yo * 0.1;
						this.myrot.x = normalizeAngle(this.myrot.x);
						this.myrot.y = normalizeAngle(this.myrot.y);
						this.quaternion.copy(new THREE.Quaternion());
						this.rotate(this.myrot.x, this.myrot.y);
						this.rotateZ(this.myrot.z1 + this.myrot.z2);

						if (p.getPointing()) { // Speed up
							this.consumeEnergy(this.speed, function() {
								if (s.space) {
									this.av.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.speed);
								} else {
									this.v += this.speed;
								}
							});
						}

						if (!s.space) {
							this.position.addScaledVector(Axis.z.clone().applyQuaternion(this.quaternion).normalize(), this.v + 5);
						}
						this.position.add(this.av);

						this.myrot.z1 *= 0.95;

						this.yo *= 0.95 - (Math.PI / 2 - Math.abs(Math.abs(this.myrot.x) - Math.PI / 2)) * 0.1;
						this.pitch *= 0.9;
						if (s.space) { // Speed loss
							this.av.multiplyScalar(0.996);
						} else {
							this.v *= 0.98 - Math.abs(rot) * 0.06;
							this.av.multiplyScalar(0.98);
						}

						if (k.getKey(32)) { // Space Key
							this.consumeEnergy(2, function() {
								var rnd1 = this.quaternion.clone();
								rnd1.rotate(Math.random() * 0.06 - 0.03, Math.random() * 0.06 - 0.03);
								var rnd2 = this.quaternion.clone();
								rnd2.rotate(Math.random() * 0.06 - 0.03, Math.random() * 0.06 - 0.03);
								this.attack(rnd1, s);
								this.attack(rnd2, s);
							});
						}

						if (this.s1c > 0) this.s1c--;
						else if (k.getKey(65)) this.s1c = this.sub[this.sub1id].call(this, s); // A Key
						if (this.s2c > 0) this.s2c--;
						else if (k.getKey(68)) this.s2c = this.sub[this.sub2id].call(this, s); // D Key

						if (this.rgl > 0) {
							this.rgl--;
							this.beam(35, 2, 15, 0, s);
						}
						if (this.brl > 0) {
							this.brl--;
							this.beam(25, 3, 25, 30, s);
						}
						if (this.e < 2000) this.e += 4;
						gauge_e.value = this.e;
						gauge_h.value = this.hp;

						windManager.each(function(wind) {
							var radius = 15 + wind.size;
							if (Math.sqrt(this.position.x * wind.position.x + this.position.z * wind.position.y) <= radius) this.av.y += wind.v / 2;
						}, this);
						// hit vs bullet
						for (var i = 0; i < enmBulletManager.elements.length; i++) {
							if (this.position.clone().sub(enmBulletManager.get(i).position).length() < 5 + enmBulletManager.get(i).size) {
								effectManager.explode(enmBulletManager.get(i).position, enmBulletManager.get(i).size, 10);
								this.hp -= enmBulletManager.get(i).atk * s.difficulty;
								s.score--;
								enmBulletManager.removeBullet(i);
							}
						}
						// hit vs enemy
						for (var i = 0; i < enemyManager.elements.length; i++) {
							var v = Axis.z.clone().applyQuaternion(this.quaternion)
								.setLength(this.geometry.boundingBox.getSize().z);
							if (fly.colcupsphere(this.position.clone().sub(v.clone().multiplyScalar(-0.5)), v,
									enemyManager.get(i).position.clone().add(enemyManager.get(i).geometry.boundingSphere.center),
									this.geometry.boundingBox.max.x + enemyManager.get(i).geometry.boundingSphere.radius)) {
								effectManager.explode(enemyManager.get(i).position, enemyManager.get(i).size, 30);
								this.hp -= enemyManager.get(i).hp * 30 * s.difficulty / (this.v + 5);
								s.score -= 3;
								if (this.hp > 0) enemyManager.kill(i);
							}
						}
						// hit vs obstacle
						obstacleManager.each(function(obstacle) {
							if (fly.colobbsphere(obstacle.position, this.position, obstacle.size, obstacle.quaternion, this.geometry.boundingBox.max.x)) this.hp = 0;
						}, this);
					},
					sub: [
						/*
						 * those skills receive the scene for the first argument.
						 * should return cooldown time for frame. return 0 when the energy is insufficient.
						 */
						function() {
							return this.consumeEnergy(250, function() {
								this.rgl = 2;
								effectManager.ray(this, [
									{color: 0xffffff, opacity: 0.2, radius: 1},
									{color: 0x00ffff, opacity: 0.2, radius: 2},
									{color: 0x0000ff, opacity: 0.2, radius: 4}
								], 7, function(t, m) {
									return 1 - t / m;
								});
								return 20;
							}, 0);
						},
						function(s) {
							return this.consumeEnergy(1500, function() {
								this.brl = 17;
								// flash effect
								var fade = new THREE.ShaderPass(phina.display.three.FadeShader);
								fade.uniforms.color.value = new THREE.Vector4(1, 1, 1, 0.5);
								s.app.composer.addPass(fade);
								var frame = s.frame;
								s.on('enterframe', function tmp() {
									if (s.frame - frame > 1) {
										s.app.composer.passes.erase(fade);
										s.off('enterframe', tmp);
									}
								});
								effectManager.ray(this, 0xffffff, 0.5, 500, 2);
								effectManager.ray(this, [
									{color: 0xffffff, opacity: 0.2, radius: 8},
									{color: 0xffcccc, opacity: 0.2, radius: 12},
									{color: 0xff8888, opacity: 0.2, radius: 18},
									{color: 0xff4444, opacity: 0.2, radius: 24},
									{color: 0xff0000, opacity: 0.2, radius: 30}
								], 24, function(t, m) {
									return t < 2 ? 2 : (t < 4 ? 0.5 : 1 - (t - 4) / (m - 4));
								});
								return 250;
							}, 0);
						}
					],
					attack: function(rot, s) {
						var caster = new THREE.Raycaster();
						caster.set(this.position.clone(), Axis.z.clone().applyQuaternion(rot).normalize());
						var hit = caster.intersectObjects(enemyManager.elements);
						if (hit.length !== 0) {
							effectManager.explode(hit[0].point, 1, 10);
							hit[0].object.hp -= 5 / s.difficulty;
						}
					},
					beam: function(atk, exps, expt, radius, s) {
						var vec = Axis.z.clone().applyQuaternion(this.quaternion).normalize();
						if (radius === 0) {
							var hit = new THREE.Raycaster(this.position.clone(), vec).intersectObjects(enemyManager.elements);
						} else {
							var hit = [];
							for (var i = 0; i < enemyManager.elements.length; i++) {
								if (fly.colcupsphere(
									this.position.clone().add(vec.clone().multiplyScalar(this.geometry.boundingBox.max.z + radius)),
									vec,
									enemyManager.get(i).position,
									radius + enemyManager.get(i).size * 5
								)) {
									hit.push({point: enemyManager.get(i).position.clone(), object: enemyManager.get(i)});
								}
							}
						}
						for (var i = 0; i < hit.length; i++) {
							effectManager.explode(hit[i].point, exps, expt);
							hit[i].object.hp -= atk / s.difficulty;
						}
					},
					consumeEnergy: function(amount, f, defaultreturn) {
						if (this.e >= amount) {
							this.e -= amount;
							return f.call(this);
						}
						return defaultreturn;
					}
				});
				enemyManager.player = player;
				resolve();
			}
		], [
			function(resolve) { // Stage loading
				if (this.stage !== 'arcade') {
					var load = function() {
						var stage = phina.asset.AssetManager.get('stage', this.stage).get();
						name.label.text = stage.name;
						stage.enemys.each(function(enemy) {
							if (!enemyManager.loadedenemy[enemy.name]) enemyManager.loadEnemy(enemy.name);
							enemyManager.createEnemyMulti(enemy.name, enemy.option, enemy.autospawn, enemy.killmes);
						});
						stage.obstacles.each(function(obstacle) {
							obstacleManager.createObstacle(obstacle.position, obstacle.quaternion, obstacle.scale);
						});
						stage.winds.each(function(wind) {
							windManager.createWind({v: wind.v, position: wind.position, size: wind.size}, wind.color);
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
										asset.threejson[enemy.name] = 'data/models/' + enemyManager.enemys[enemy.name].filename + '.min.json';
									}
								});
								loader.onload = load;
								loader.load(asset);
							} else {
								load();
							}
						}.bind(this));
					} else {
						load();
					}
				} else {
					name.label.text = 'Free play';
					var loader = phina.asset.AssetLoader();
					var asset = {threejson: {}};
					enemyManager.enemys.forIn(function(key, value) {
						if (!phina.asset.AssetManager.get('threejson', key)) {
							asset.threejson[key] = 'data/models/' + value.filename + '.min.json';
						}
					});
					loader.load(asset).then(function() {
						enemyManager.enemys.forIn(function(key) {
							if (!enemyManager.loadedenemy[key]) {enemyManager.loadEnemy(key);}
						});
					}.bind(this));
					resolve();
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

				enemyManager.addChildTo(this);
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
				threelayer.camera.rotate(-Math.PI / 2, Math.PI);
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
								enemyManager.createEnemyMulti(enmname, params, {random: {x: 50, y: 10, z: 50}});
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
						if (this.frame % 10 === 0) for (var i = 0; i < enmBulletManager.elements.length; i++) {
							if (enmBulletManager.get(i).position.clone().sub(player.position).length > 800) enmBulletManager.removeBullet(i);
						}
						if (enmBulletManager.count() > 1600) {for(; enmBulletManager.count() > 1550;) {enmBulletManager.removeBullet(0);}}

						this.flare('frame' + this.frame);
						enemyManager.flare('frame' + this.frame);
						player.flare('enterframe');
						player.update(p, k, this);
						plane.update();
						windManager.playerposy = player.position.y;

						playerpos.rotation = Math.radToDeg(-player.myrot.y) + (Math.abs(player.myrot.x) > Math.PI / 2 && Math.abs(player.myrot.x) < Math.PI * 1.5 ? 0 : 180);


						// Camera control

						threelayer.camera.position.copy(player.position.clone().add(new THREE.Vector3(0, 650, -200)));
						threelayer.camera.lookAt(player.position);

						/*if (k.getKeyDown(53)) { // 5 Key
							threelayer.camera.radius++;
							threelayer.camera.radius %= threelayer.camera.radiuses.length;
						}
						threelayer.camera.quaternion.copy(new THREE.Quaternion());
						threelayer.camera.rotate(new THREE.Quaternion().setFromAxisAngle(Axis.z, -player.myrot.z2 + (threelayer.camera.radius !== 0 ? -player.myrot.z1 : 0)));
						threelayer.camera.rotate(new THREE.Quaternion().setFromAxisAngle(Axis.x, -player.myrot.x));
						threelayer.camera.rotate(new THREE.Quaternion().setFromAxisAngle(Axis.y, player.myrot.y + Math.PI));
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
							enemyManager.effectmanager.explode(player.position, 10, 30);
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
