import {
	DirectionalLight, AmbientLight,
	Mesh,
	IcosahedronGeometry,
	ShaderMaterial,
	GridHelper, AxesHelper, Raycaster,
	Vector4, Vector3, Quaternion, Color, Matrix4,
	EventDispatcher
} from "three";

import ShaderPass from "w3g/three-effect/ShaderPass";
import FadeShader from "w3g/three-effect/FadeShader";

import * as THREE_Utils from "w3g/threeutil";
import {get, free} from "w3g/utils";
import {vw, vh} from "w3g/main";
import assets, {setupLoader} from "w3g/loading";
import {createRectangle, createEllipse, createSymmetricTriangle} from "w3g/geometries";
import {createLabel, createGauge, textAlign} from "w3g/uielements";
import Easing from "w3g/easing";

import SceneLoadingScene from "./sceneloadingscene";
import {UnitManager, units, builds} from "./units";
import EffectManager from "./effects";
import BulletManager from "./bullet";

export const minimapScale = 1 / 15;

export default class MainScene extends SceneLoadingScene {

	time = 0;
	progress = 0;
	score = 0;
	goaled = false;
	bossdefeated = true;
	cameraPosition = new Vector3(0, 650, -200);

	constructor(options) {
		this.stage = options.stage || 'arcade';
		this.difficulty = options.difficulty || 1;
		this.space = options.space || false;
		super();
		// Variables

		const map = createEllipse({x: vw - 100, y: vh - 100, radius: 75, fillColor: 'hsl(0, 0%, 30%)', opacity: 0.5});

		const playerpos = createSymmetricTriangle({
			x: vw - 100, y: vh - 100, fillColor: 'hsl(0, 50%, 70%)',
			stroke: 'black', strokeWidth: 1, opacity: 0.5, width: 2.5, height: 4, rotation: Math.PI
		});

		const direction = [];

		const gauge_h = createGauge({x: 80, y: vh - 100, strokeColor: '#aaa',
			gaugeColor: 'rgb(255, 64, 64)', value: 100, maxValue: 100, strokeWidth: 1, gaugeOpacity: 0.3, width: 128, height: 16});
		const gauge_e = createGauge({x: 80, y: vh - 80, strokeColor: '#aaa',
			gaugeColor: 'rgb(64, 64, 255)', value: 2000, maxValue: 2000, strokeWidth: 1, gaugeOpacity: 0.3, width: 128, height: 16});
		const gauge_boss_h = createGauge({x: vw / 2, y: 20, strokeColor: '#aaa',
			gaugeColor: 'rgb(200, 16, 16)', strokeWidth: 1, gaugeOpacity: 0.3, width: vw / 1.2, height: 16, opacity: 0});

		const msgbox = createRectangle({y: vh, fillColor: 'hsl(0, 0%, 30%)', strokeColor: 'hsl(0, 0%, 30%)',
			strokeWidth: 1, fillOpacity: 0.5, strokeOpacity: 0.25, cornerRadius: 5, width: vw / 5, height: vh / 12});
		const message = createLabel(" ", {y: vh, font: "16px 'HiraKakuProN-W3'", fillStyle: 'hsl(0, 0%, 0%, 0.6)', align: textAlign.left});
		const mark = createMark({x: vw - 100, y: vh - 100, width: 30, height: 30, opacity: 0.5});
		const target = createMark({width: 30, height: 30, opacity: 0.7});
		target.visible = false;
		const name = createLabel(" ", {
			x: vw / 2, y: vh / 2, font: "24px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
		});

		const goals = [];
		const goalraders = [];
		//const rates;

		const resulttitle = createLabel("Result", {
			x: vw / 2, font: "48px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
		});
		const resulttext = createLabel(" ", {
			x: vw / 2, font: "24px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
		});

		const effectManager = new EffectManager(this.threeScene);
		const allyBulletManager = new BulletManager(this, false);
		const allyManager = new UnitManager(this, allyBulletManager);
		const enmBulletManager = new BulletManager(this, true);
		const enemyManager = new UnitManager(this, enmBulletManager);
		allyManager.opponents = enemyManager;
		enemyManager.opponents = allyManager;
		const obstacleManager = new ObstacleManager(this.threeScene);
		const windManager = new WindManager(this.threeScene);

		const plane = new GridHelper(20400, 100);
		const scene = this;
		this.load([[
			resolve => { // Load Player
				this.player = allyManager.create("player1");
				this.player.position.y = 1000;
				this.player.geometry.computeBoundingBox();
				this.player.addEventListener('hitByBullet', bullet => {
					this.shakeScreen(bullet.atk / this.player.armor / this.player.maxhp * 100);
					this.score -= 1;
				});
				// console.log(player)
				this.player.add(new AxesHelper(1000));
				const onload = () => {
					player.sub = options.skills.map(sub => sub.klass(player, this, sub.level));
					resolve();
				};
				const asset = {THREE_Model_JSON: {}};
				options.skills.forEach(sub => {
					if (sub.klass.usingModels) sub.klass.usingModels.forEach(name => {
						if (!assets.THREE_Model_JSON[name]) {
							asset.THREE_Model_JSON[name] = 'data/models/' + units[name].filename + '.min.json';
						}
					});
				});
				setupLoader(asset).load(onload);
			}, resolve => { // Stage loading
				if (this.stage !== 'arcade') {
					const load = () => {
						const stage = assets.STAGES[this.stage];
						name.label.text = stage.name;
						stage.enemys.forEach(enemy => {
							enemyManager.createMulti(enemy.name, enemy.option, enemy.autospawn, enemy.killmes);
						});
						stage.obstacles.forEach(obstacle => {
							obstacleManager.create(obstacle.position, obstacle.quaternion, obstacle.scale);
						});
						stage.winds.forEach(wind => {
							windManager.create({v: wind.v, position: wind.position, size: wind.size}, wind.color);
						});
						stage.messages.forEach(imessage => {
							if (!imessage.progress) {
								window.setTimeout(() => message.text = '', imessage.time - 180);
								window.setTimeout(() => message.text = imessage.text, imessage.time);
							} else {
								const checkForProgress = () => {
									if (imessage.progress < this.progress) {
										window.setTimeout(() => message.text = '', imessage.time - 180);
										window.setTimeout(() => message.text = imessage.text, imessage.time);
										this.removeEventListener('update', checkForProgress);
									}
								}
								this.addEventListener('update', checkForProgress);
							}
						});
						stage.goals.forEach(goal => {
							const material = new ShaderMaterial({
								transparent: true,
								uniforms: {
									tex1: {type: "t", value: assets.THREE_Texture.goal},
									tex2: {type: "t", value: assets.THREE_Texture.goal_disable},
									tex1_percentage: Object.assign(new EventDispatcher(), {type: "f", value: 0.0}),
									time: {type: "f", value: 100 * Math.random()},
									opacity: {type: "f", value: 1}
								},
								vertexShader: assets.GLSL.goalvertexshader,
								fragmentShader: assets.GLSL.goalfragshader
							});
							goals.push(new Mesh(Object.assign(new IcosahedronGeometry(goal.size, 2), material), {
								size: goal.size, kill: goal.kill, message: goal.message, enable: false,
								update(delta) {
									material.uniforms.time.value += delta * Math.random();
									if (!this.enable && this === goals.first && (this !== goals.last || scene.bossdefeated) && enemyManager.deathcount >= enemyManager.spawncount * this.kill) {
										scene.addEasing(new Easing(material.uniforms.tex1_percentage).add({value: 1}, 1700));
										goalraders.first.fillColor = 'hsl(190, 100%, 70%)';
										this.enable = true;
									}
								}
							}));
							goals.last.position.set(goal.x, goal.y, goal.z);
							const xdist = (player.position.x - goals.last.position.x) * minimapScale;
							const zdist = (player.position.z - goals.last.position.z) * minimapScale;
							const distance = Math.min(Math.hypot(xdist, zdist), 75);
							const angle = Math.atan2(xdist, zdist) - player.myrot.y + (Math.abs(player.myrot.x) > Math.PI / 2 && Math.abs(player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
							goalraders.push(
								createEllipse({
									x: vw - 100 + Math.sin(angle) * distance, y: vh - 100 + Math.cos(angle) * distance, radius: 5,
									fillColor: '#aaa', strokeColor: 'black', strokeWidth: 1, opacity: 0.5
								})
							);
						});
						this.rate = stage.rate;
						this.space = stage.space;
						resolve();
					};
					if (assets.STAGES[this.stage]) {
						const list = {STAGES: {}};
						list.STAGES[this.stage] = 'data/stages/' + this.stage + '.min.json';
						setupLoader(list).load(() => {
							const list = {THREE_Model_JSON: {}};
							assets.STAGES[this.stage].enemys.forEach(enemy => {
								if (assets.THREE_Model_JSON[enemy.name]) {
									list.THREE_Model_JSON[enemy.name] = 'data/models/' + units[enemy.name].filename + '.min.json';
								}
							});
							setupLoader(list).load(load);
						});
					} else load();
				} else {
					const list = {THREE_Model_JSON: {}};
					units.forEach((key, value) => {
						if (list.THREE_Model_JSON[key]) list.THREE_Model_JSON[key] = 'data/models/' + value.filename + '.min.json';
					});
					setupLoader(list).load(resolve);
				}
			}
		], [
			resolve => { // Screen Setup
				const fade = new ShaderPass(new FadeShader());
				fade.uniforms.color.value.set(1, 1, 1, 1);
				this.threePasses.push(fade);
				this.addEasing(new Easing(fade.uniforms.color.value).add({w: 0}, 1250, Easing.LINEAR));

				this.UIScene.add(map);
				this.UIScene.add(playerpos);

				this.UIScene.add(name);
				this.addEasing(new Easing(name).wait(350).add({opacity: 1}, 1000).wait(1250).add({opacity: 0}, 1000));

				for(var i = 0; i < 4; i++) {
					direction[i] = createSymmetricTriangle({
						x: vw - 100 - 75 * Math.sin(i * Math.PI / 2), y: vh - 100 - 75 * Math.cos(i * Math.PI / 2),
						fillColor: '#181818', width: 12, height: 7.5, opacity: 0.5, rotation: -i * Math.PI / 4 // this doesn't mean e/4 :P
					});
					this.UIScene.add(direction[i]);
				}
				this.UIScene.add(mark);
				this.UIScene.add(target);
				this.UIScene.add(gauge_h);
				this.UIScene.add(gauge_e);

				if (this.stage !== 'arcade') {
					for(var i = 0; i < goalraders.length; i++) this.UIScene.add(goalraders[i]);
					this.UIScene.add(gauge_boss_h);
					this.UIScene.add(msgbox);
					msgbox.live = 0;
					this.UIScene.add(message);
				}
				this.UIScene.add(resulttitle);
				this.UIScene.add(resulttext);

				this.effectManager = effectManager;
				resolve();
			}, resolve => { // Stage Setup
				const directionalLight = new DirectionalLight(0xffffff, 1);
				directionalLight.position.set(0, 0, 30);
				plane.update = function() {
					this.position.x = this.player.position.x - this.player.position.x % 200;
					this.position.z = this.player.position.z - this.player.position.z % 200;
				};
				//plane.rotateX(-Math.PI / 2);
				if (this.stage !== 'arcade') {
					for(var i = 0; i < goals.length; i++) {
						goals[i].tweener.setUpdateType('fps');
						this.threeScene.add(goals[i]);
					}
				}
				this.threeScene.add(directionalLight);
				this.threeScene.add(new AmbientLight(0x606060));
				this.threeScene.add(plane);
				this.camera.fov = 100;
				this.camera.radiuses = [-100, 10, 28];
				this.camera.radius = 0;
				this.camera.rotateY(Math.PI)
				this.camera.rotateX(-Math.PI / 2);
				resolve();
			}
		]]);
	}

	update(delta) {
		super.update(delta);
		if (!this.player) {
			this.camera.rotateAbsY(delta * -0.0001);
		} else if (this.goaled) {
			this.player.flare('enterframe');
			this.camera.rotateAbsY(delta * -0.0001);
		} else {
			if (this.stage === 'arcade') { // Arcade mode (random enemy spawn)
				if (enemyManager.count === 0) {
					let totalValue = 100 * this.difficulty;

					while (totalValue > 1) {
						const build = builds[Math.floor(Math.random() * builds.length)];
						if (build.value > totalValue) continue;
						const quantity = Math.ceil((1 - Math.random()) * (totalValue / build.value - 1)); // this ensures at least one unit will be generated
						const params = {
							position: new Vector3(Math.random() * 2000 - 1000, Math.random() * 200 - 100, Math.random() * 5000 - 1000).add(this.player.position),
							quaternion: new Quaternion().rotateY(Math.random() * Math.PI * 2)
						};
						Object.assign(params, build.properties);
						const volume = Math.cbrt(units[build.name].properties.size ** 3 * quantity) * 2;
						const autospawn = {
							rep: quantity,
							random: new Vector3(volume, volume, volume)
						};
						enemyManager.createMulti(build.name, params, autospawn);
					}
				}
				this.difficulty += 0.0001;
			} else {
				for(let i = 0; i < goals.length; i++) {
					const xdist = (this.player.position.x - goals[i].position.x) * minimapScale;
					const zdist = (this.player.position.z - goals[i].position.z) * minimapScale;
					const distance = Math.min(Math.hypot(xdist, zdist), 75);
					const angle = Math.atan2(xdist, zdist) - this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? Math.PI : 0);
					goalraders[i].setPosition(vw - 100 + Math.sin(angle) * distance, vh - 100 + Math.cos(angle) * distance);
				}
				this.progress = player.position.dot(goals.last.position) / goals.last.position.dot(goals.last.position);
			}
			if (this.time % 600 < delta) {
				for (let i = 0; i < allyBulletManager.count; i++) {
					if (allyBulletManager.get(i).position.distanceTo(this.player.position) > 800) {
						allyBulletManager.remove(i);
						i--;
					}
				}
				for (let i = 0; i < enmBulletManager.count; i++) {
					if (enmBulletManager.get(i).position.distanceTo(this.player.position) > 800) {
						enmBulletManager.remove(i);
						i--;
					}
				}
			}
			if (allyBulletManager.count > 1050) while (allyBulletManager.count > 1000) allyBulletManager.remove(0);
			if (enmBulletManager.count > 1600) while (enmBulletManager.count > 1550) enmBulletManager.remove(0);

			// Camera control

			this.camera.position.addVectors(this.player.position, this.cameraPosition);
			this.camera.lookAt(player.position);

			// Trigger events

			this.player.flare('enterframe');
			this.enemyManager.update();
			this.allyManager.update();
			this.effectManager.update();

			this.allyManager.elements.forEach(ally => {
				if (ally.excludeFromHitTest) return;
				this.enemyManager.elements.forEach(enemy => {
					if (enemy.position.distanceTo(ally.position) <
						enemy.geometry.boundingSphere.radius * enemy.scale.x +
						ally.geometry.boundingSphere.radius * ally.scale.x) {
						if (enemy === ally.target) ally.dispatchEvent('targetAttacked');
						enemy.hp -= Math.min(ally.hp, 2.5) * ally.sharpness / enemy.armor;
						ally.hp -= 2.5 * enemy.sharpness / ally.armor;
					}
				});
			});
			windManager.playerposy = this.player.position.y;

			playerpos.rotation = -this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? 0 : Math.PI);

			/*if (k.getKeyDown(53)) { // 5 Key
				this.camera.radius++;
				this.camera.radius %= this.camera.radiuses.length;
			}
			this.camera.quaternion.copy(new Quaternion());
			this.camera.rotateZ(-player.myrot.z2 + (this.camera.radius !== 0 ? -player.myrot.z1 : 0));
			this.camera.rotateX(-player.myrot.x);
			this.camera.rotateY(player.myrot.y + Math.PI);
			var vec = Axis.z.clone().applyQuaternion(this.camera.quaternion).negate().setLength(this.camera.radiuses[this.camera.radius]);
			this.camera.position.copy(player.position.clone().add(vec));*/

			const h = this.player.geometry.boundingBox.max.x * 2;

			const setColor = e => {
				const l = 1 - Math.clamp(Math.abs(this.player.position.y - e.position.y) / h * 5 - 4.5, 0, 1);

				if (Array.isArray(e.material)) for (let i = 0; i < e.material.length; i++) m[i].opacity = l * 0.8 + 0.2;
				else m.opacity = l * 0.8 + 0.2;
			}

			enemyManager.elements.forEach(setColor);
			enmBulletManager.elements.forEach(setColor);

			if (this.bosscoming) {
				if (this.boss.parent === null) {
					this.bosscoming = false;
					gauge_boss_h.tweener.fadeOut(10).play();
					this.bossdefeated = true;
				} else {
					gauge_boss_h.value = this.boss.hp;
				}
			}

			if (keyDown.Space) message.text = ''; // Space Key

			function changeToResultScreenMode() {
				this.addEasing(new Easing(resulttitle).add({opacity: 1, y: 0.5 * vh / 3}, 100));
				this.addEasing(new Easing(resulttext).wait(350).add({opacity: 1, y: 0.5 * vh * 0.6}, 100));
				message.text = '';
				this.addEasing(new Easing(map).add({opacity: 0}, 650));

				if (this.stage !== 'arcade') for (let i = 0; i < goalraders.length; i++)
					this.addEasing(new Easing(goalraders[i]).add({opacity: 0}, 650));

				for (let i = 0; i < enemyManager.count; i++) this.addEasing(new Easing(enemyManager.raders[i]).add({opacity: 0}, 650));
				for (let i = 0; i < 4; i++) this.addEasing(new Easing(direction[i]).add({opacity: 0}, 650));
				this.addEasing(new Easing(playerpos).add({opacity: 0}, 650));
				this.addEasing(new Easing(gauge_h).add({opacity: 0}, 650));
				this.addEasing(new Easing(gauge_e).add({opacity: 0}, 650));
				this.addEasing(new Easing(msgbox).add({opacity: 0}, 650));
				this.addEasing(new Easing(mark).add({opacity: 0}, 650));
			}

			if (player.hp <= 0) {
				effectManager.explode(this.player.position, 10, 30);
				this.threeScene.remove(this.player);
				this.player = null;

				resulttext.text = 'Score: ' + Math.max(this.score, 0).toFixed(0)
					+ '\nKill: ' + enemyManager.deathcount + '(' + (enemyManager.deathcount / enemyManager.spawncount * 100).toFixed(1) + '%)'
				resulttitle.text = 'Game Over';
				changeToResultScreenMode();
			} else if (this.stage !== 'arcade' && goals[0].enable) {
				const v = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion);
				const p = get(Vector3).copy(this.position)
					.addScaledVector(v, -this.player.geometry.boundingBox.min.z + this.player.geometry.boundingBox.max.x);
				v.multiplyScalar(this.player.geometry.boundingBox.getSize().z - this.player.geometry.boundingBox.getSize().x);
				if (testCupsuleSphere(p, v, goals[0].position, this.player.geometry.boundingBox.max.x + goals[0].size / 2)) {
					if (goals.length === 1) {
						this.addEasing(new Easing(player).add({auto: 1}, 2000));
						const rate = '';
						this.score += this.rate[0] * player.hp / player.maxhp;
						if (this.score >= this.rate[3]) rate = 'Perfect';
						else if (this.score >= this.rate[2]) rate = 'Good';
						else if (this.score >= this.rate[1]) rate = 'Decent';
						else rate = 'Bad';
						resulttext.text = 'Score: ' + Math.max(this.score, 0).toFixed(0)
							+ (enemyManager.spawncount !== 0 ? '\nKill: ' + enemyManager.deathcount + '('
							+ (enemyManager.deathcount / 	enemyManager.spawncount * 100).toFixed(1) + '%)' : '')
							+ '\nLife: ' + (player.hp / player.maxhp * 100).toFixed(1) + '%'
							+ '\nRate: ' + rate;
						changeToResultScreenMode();
						this.goaled = true;
					} else {
						const currentMessage = goals[0].message;
						window.setTimeout(() => message.text = currentMessage, 1000);
						goals[0].parent.remove(goals[0]);
						goals.shift();
						goalraders[0].remove();
						goalraders.shift();
					}
				}
				free(v, p);
			}

			this.time += delta;
			if (this.time % 600 < delta) this.score--;
		}


		function updateMessageBoxPlacement() {
			msgbox.position.x = 0.5 * vx * msgbox.live;
			msgbox.position.y = vh - 0.5 * vy * 0.3 * msgbox.live;
			msgbox.width = vw / 10 + vw / 1.3 * msgbox.live;
			msgbox.height = vh / 12 + vh / 8 * msgbox.live;
			message.position.x = 0.1 * vx * msgbox.live;
			message.position.y = vh - 0.5 * vy * 0.3 * msgbox.live;
		}
		if (message.text !== '') {
			if (msgbox.live < 1) {
				msgbox.live = Math.min(msgbox.live + delta / 60, 1);
				updateMessageBoxPlacement();
			}
		} else if (msgbox.live > 0) {
			msgbox.live = Math.max(msgbox.live - delta / 60, 0);
			updateMessageBoxPlacement();
		}
	}
	shakeScreen(amount) {
		const angle = Math.randfloat(0, Math.PI * 2);
		this.camera.position.x += Math.sin(angle) * amount;
		this.camera.position.z += Math.cos(angle) * amount;
	}
}
