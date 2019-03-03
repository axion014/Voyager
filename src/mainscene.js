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
import assets, {loadResources} from "w3g/loading";
import {Rectangle, Ellipse, SymmetricTriangle} from "w3g/geometries";
import {Label, Gauge, textAlign} from "w3g/uielements";
import Easing from "w3g/easing";
import {keyDown} from "w3g/input";
import Scene from "w3g/scene";

import SceneLoadingScene from "./sceneloadingscene";
import {UnitManager, units, builds} from "./units";
import EffectManager from "./effects";
import BulletManager from "./bullet";
import ObstacleManager from "./obstacle";
import WindManager from "./wind";
import {
	bossHPGaugeFadeTime, messageDelay, gridSize,
	maxAlliedBullets, maxEnemyBullets, bulletRemovalMargin, bulletRetainingRadius
} from "./constants";
import {Mark} from "./geometries";
import Minimap from "./minimap";

import regeneratorRuntime from "regenerator-runtime"; // async requires this

const autospawn = {
	random: new Vector3()
};

export default class MainScene extends Scene {

	time = 0;
	progress = 0;
	score = 0;
	goals = [];
	goalraders = [];
	direction = [];
	goaled = false;
	bossdefeated = true;
	cameraPosition = new Vector3(0, 650, -200);

	constructor(skills, stage, difficulty) {
		super();

		this.stage = stage || 'arcade';
		this.difficulty = /*difficulty || */1;
		this.space = /*options.space || */false;

		//const rates;

		let stagename;

		const scene = this;
		console.log(this);
		return new SceneLoadingScene(this, [
			loadResources.bind(null, [EffectManager, BulletManager, {
				THREE_Model_GLTF: {bullet: "data/models/bullet.glb"}
			}])
		], [
			() => { // build data structure
				this.effectManager = new EffectManager(this.threeScene);
				this.allyBulletManager = new BulletManager(this, false);
				this.allyManager = new UnitManager(this, this.allyBulletManager);
				this.enmBulletManager = new BulletManager(this, true);
				this.enemyManager = new UnitManager(this, this.enmBulletManager);
				this.allyManager.opponents = this.enemyManager;
				this.enemyManager.opponents = this.allyManager;
				this.obstacleManager = new ObstacleManager(this.threeScene);
				this.windManager = new WindManager(this.threeScene);

				this.minimap = new Minimap();
			}
		], [
			async () => { // Load Player
				this.player = this.allyManager.create("player1");
				this.player.position.y = 1000;
				this.player.geometry.computeBoundingBox();
				this.player.addEventListener('hitByBullet', e => {
					this.shakeScreen(e.source.atk / this.player.armor / this.player.maxhp * 100);
					this.score -= 1;
				});
				// console.log(player)
				this.player.add(new AxesHelper(1000));
				const list = {THREE_Model_GLTF: []};
				skills.forEach(sub => {
					if (sub.klass.usingModels) sub.klass.usingModels.forEach(name => {
						if (!assets.THREE_Model_GLTF[name]) asset.THREE_Model_GLTF.push(name);
					});
				});
				await loadResources(list);
				this.player.sub = skills.map(sub => new sub.klass(this.player, this, sub.level));
			}, async () => { // Stage loading
				if (this.stage !== 'arcade') {
					if (!assets.STAGE[this.stage]) {
						await loadResource("STAGE", this.stage, `data/stages/${this.stage}.min.json`);
						const list = {THREE_Model_GLTF: []};
						const stage = assets.STAGE[this.stage];
						stage.enemys.forEach(enemy => {
							if (!assets.THREE_Model_GLTF[enemy.name]) list.THREE_Model_GLTF.push(enemy.name);
						});
						if (stage.goals.length > 0 && (!assets.goalVertex)) list.GLSL = {
							goalVertex: "data/glsl/goalvertex.min.glsl",
							goalFragment: "data/glsl/goalfrag.min.glsl"
						};
						await loadResources(list);
					}
					const stage = assets.STAGE[this.stage];
					stagename = stage.name;
					stage.enemys.forEach(this.enemyManager.createMulti);
					stage.obstacles.forEach(this.obstacleManager.create);
					stage.winds.forEach(this.windManager.create);
					stage.messages.forEach(imessage => {
						const swapMessage = () => {
							window.setTimeout(() => this.message.visible = false, imessage.time - messageDelay);
							window.setTimeout(() => {
								this.message.visible = true;
								this.message.text = imessage.text;
							}, imessage.time);
						}
						if (!imessage.progress) swapMessage();
						else {
							const checkForProgress = () => {
								if (imessage.progress < this.progress) {
									swapMessage();
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
								tex1: {value: assets.THREE_Texture.goal},
								tex2: {value: assets.THREE_Texture.goal_disable},
								tex1_percentage: {value: 0},
								time: {value: 100 * Math.random()},
								opacity: {value: 1}
							},
							vertexShader: assets.GLSL.goalVertex,
							fragmentShader: assets.GLSL.goalFragment
						});
						const mesh = new Mesh(Object.assign(new IcosahedronGeometry(goal.size, 2), material), {
							size: goal.size, kill: goal.kill, message: goal.message, enable: false,
							update(delta) {
								material.uniforms.time.value += delta;
								if (!this.enable && this === goals[0] && (goals.length > 1 || scene.bossdefeated) && this.enemyManager.deathcount >= this.enemyManager.spawncount * this.kill) {
									scene.addEasing(new Easing(material.uniforms.tex1_percentage).add({value: 1}, 1700, Easing.LINEAR));
									goalraders[0].fillColor = 'hsl(190, 100%, 70%)';
									this.enable = true;
								}
							}
						})
						this.threeScene.add(mesh);
						this.goals.push(mesh);
						mesh.position.copy(goal.position);
						this.minimap.addObject(mesh, {radius: 5, fillColor: '#aaa'});
						goalraders.push(rader);
					});
					this.rate = stage.rate;
					this.space = stage.space;
				} else {
					const list = {THREE_Model_GLTF: []};
					Object.keys(units).forEach(key => {
						if (!assets.THREE_Model_GLTF[key]) list.THREE_Model_GLTF.push(key);
					});
					await loadResources(list);
				}
			}
		], [
			() => { // Screen Setup
				const fade = new ShaderPass(new FadeShader());
				fade.uniforms.color.value.set(1, 1, 1, 1);
				this.threePasses.push(fade);
				this.addEasing(new Easing(fade.uniforms.color.value).add({w: 0}, 1250, Easing.LINEAR).trigger(() => {
					this.threePasses.pop();
				}));

				this.minimap.radius = 75;
				this.minimap.fillColor.set('hsl(0, 0%, 30%)');
				this.minimap.opacity = 0.5;
				this.minimap.position.set(vw - 100, vh - 100, 0);
				this.UIScene.add(this.minimap);

				this.playerpos = new SymmetricTriangle({
					fillColor: 'hsl(0, 50%, 70%)', strokeColor: 'black', opacity: 0.5,
					strokeWidth: 1, width: 2.5, height: 4, rotation: Math.PI
				});
				this.minimap.add(this.playerpos);

				this.name = new Label(stagename, {
					x: vw / 2, y: vh / 2, font: "24px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
				});
				this.UIScene.add(this.name);
				this.addEasing(new Easing(this.name)
					.wait(350).add({opacity: 1}, 1000, Easing.LINEAR)
					.wait(1250).add({opacity: 0}, 1000, Easing.LINEAR)
				);

				for(let i = 0; i < 4; i++) {
					const rotation = i * Math.PI / 2;
					this.direction[i] = new SymmetricTriangle({
						x: this.minimap.radius * Math.sin(rotation), y: this.minimap.radius * Math.cos(rotation),
						fillColor: '#181818', width: 12, height: 7.5, opacity: 0.5, rotation: rotation
					});
					this.minimap.add(this.direction[i]);
				}

				this.mark = new Mark({width: 30, height: 30, opacity: 0.5, strokeWidth: 1});
				this.minimap.add(this.mark);

				this.target = new Mark({width: 30, height: 30, opacity: 0.7, strokeWidth: 1});
				this.target.visible = false;
				this.UIScene.add(this.target);
				this.player.targetMarker = this.target;

				this.gauge_h = new Gauge({
					strokeColor: '#aaa', gaugeColor: 'rgb(255, 64, 64)', gaugeOpacity: 0.3,
					x: 80, y: vh - 100, value: 100, maxValue: 100, strokeWidth: 1, width: 128, height: 16
				});
				this.UIScene.add(this.gauge_h);

				this.gauge_e = new Gauge({
					strokeColor: '#aaa', gaugeColor: 'rgb(64, 64, 255)', gaugeOpacity: 0.3,
					x: 80, y: vh - 80, value: 2000, maxValue: 2000, strokeWidth: 1, width: 128, height: 16
				});
				this.UIScene.add(this.gauge_e);

				if (this.stage !== 'arcade') {
					for(let i = 0; i < goalraders.length; i++) this.UIScene.add(goalraders[i]);
					this.gauge_boss_h = new Gauge({
						strokeColor: '#aaa', gaugeColor: 'rgb(200, 16, 16)', gaugeOpacity: 0.3,
						x: vw / 2, y: 20, strokeWidth: 1, width: vw / 1.2, height: 16, opacity: 0
					});
					this.UIScene.add(this.gauge_boss_h);
					this.msgbox = new Rectangle({
						fillColor: 'hsl(0, 0%, 30%)', strokeColor: 'hsl(0, 0%, 30%)',
						fillOpacity: 0.5, strokeOpacity: 0.25,
						y: vh, strokeWidth: 1, cornerRadius: 5, width: vw / 5, height: vh / 12
					});
					this.msgbox.live = 0;
					this.UIScene.add(this.msgbox);
					this.message = new Label(" ", {
						y: vh, font: "16px 'HiraKakuProN-W3'", fillStyle: 'hsl(0, 0%, 0%, 0.6)', align: textAlign.left
					});
					this.message.visible = false;
					this.UIScene.add(this.message);
				}

				this.resulttitle = new Label("Result", {
					font: "48px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
				});
				this.UIScene.add(this.resulttitle);

				this.resulttext = new Label(" ", {
					font: "24px 'HiraKakuProN-W3'", fillStyle: 'hsla(0, 0%, 0%, 0.8)', opacity: 0
				});
				this.UIScene.add(this.resulttext);
			}, () => { // Stage Setup
				const directionalLight = new DirectionalLight(0xffffff, 1);
				directionalLight.position.set(0, 0, 30);
				this.threeScene.add(directionalLight);
				this.threeScene.add(new AmbientLight(0x606060));

				const plane = new GridHelper(20400, gridSize)
				plane.update = function() {
					if (scene.player) {
						this.position.x = scene.player.position.x - scene.player.position.x % gridSize;
						this.position.z = scene.player.position.z - scene.player.position.z % gridSize;
					}
				};
				this.threeScene.add(plane);

				//this.plane.rotateX(-Math.PI / 2);
				if (this.stage !== 'arcade') for(let i = 0; i < goals.length; i++) this.threeScene.add(goals[i]);

				this.camera.fov = 100;
				this.camera.rotateY(Math.PI);
				this.camera.rotateX(-Math.PI / 2);
			}
		]);
	}

	update(delta) {
		super.update(delta);
		if (!this.player) {
			THREE_Utils.rotateAbsY(this.camera, delta * -0.0001);
		} else if (this.goaled) {
			this.player.flare('enterframe');
			THREE_Utils.rotateAbsY(this.camera, delta * -0.0001);
		} else {
			if (this.stage === 'arcade') { // Arcade mode (random enemy spawn)
				if (this.enemyManager.count === 0) {
					let totalValue = 100 * this.difficulty;

					const position = get(Vector3);
					const quaternion = get(Quaternion);

					while (totalValue > 1) {
						const build = builds[Math.floor(Math.random() * builds.length)];
						if (build.value > totalValue) continue;

						// this ensures at least one unit will be generated
						const quantity = Math.ceil((1 - Math.random()) * (totalValue / build.value - 1));
						totalValue -= build.value * quantity;

						position.set(Math.random() * 2000 - 1000, Math.random() * 200 - 100, Math.random() * 5000 - 1000)
							.add(this.player.position);
						THREE_Utils.rotateY(quaternion.set(0, 0, 0, 1), Math.random() * Math.PI * 2);

						autospawn.rep = quantity;
						autospawn.random.setScalar(Math.cbrt(units[build.name].properties.size ** 3 * quantity) * 2);

						this.enemyManager.createMulti(build, position, quaternion, autospawn);
					}

					free(position, quaternion);
					this.difficulty += 0.01;
				}
			} else {
				const currentGoal = goals[goals.length - 1];
				this.progress = player.position.dot(currentGoal.position) /
					currentGoal.position.dot(currentGoal.position);
			}
			if (this.time % 20000 < delta) {
				for (let i = 0; i < this.allyBulletManager.count; i++) {
					if (this.allyBulletManager.get(i).position.distanceTo(this.player.position) > bulletRetainingRadius) {
						this.allyBulletManager.remove(i);
						i--;
					}
				}
				for (let i = 0; i < this.enmBulletManager.count; i++) {
					if (this.enmBulletManager.get(i).position.distanceTo(this.player.position) > bulletRetainingRadius) {
						this.enmBulletManager.remove(i);
						i--;
					}
				}
			}
			if (this.allyBulletManager.count > maxAlliedBullets + bulletRemovalMargin)
				while (this.allyBulletManager.count > maxAlliedBullets) this.allyBulletManager.remove(0);
			if (this.enmBulletManager.count > maxEnemyBullets + bulletRemovalMargin)
				while (this.enmBulletManager.count > maxEnemyBullets) this.enmBulletManager.remove(0);

			// Camera control

			this.camera.position.addVectors(this.player.position, this.cameraPosition);
			this.camera.lookAt(this.player.position);

			// Trigger events
			this.enemyManager.update(delta);
			this.allyManager.update(delta);
			this.effectManager.update(delta);

			this.allyManager.elements.forEach(ally => {
				if (ally.excludeFromHitTest) return;
				this.enemyManager.elements.forEach(enemy => {
					if (enemy.position.distanceTo(ally.position) <
						enemy.geometry.boundingSphere.radius * enemy.scale.x +
						ally.geometry.boundingSphere.radius * ally.scale.x) {
						if (enemy === ally.target) ally.dispatchEvent({type: 'targetAttacked'});
						enemy.hp -= Math.min(ally.hp, 2.5) * ally.sharpness / enemy.armor;
						ally.hp -= 2.5 * enemy.sharpness / ally.armor;
					}
				});
			});
			this.windManager.playerposy = this.player.position.y;

			this.playerpos.rotation = -this.player.myrot.y + (Math.abs(this.player.myrot.x) > Math.PI / 2 && Math.abs(this.player.myrot.x) < Math.PI * 1.5 ? 0 : Math.PI);

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
				const l = 1 - Math.min(Math.max(Math.abs(this.player.position.y - e.position.y) / h * 5 - 4.5, 0), 1);

				if (Array.isArray(e.material))
					for (let i = 0; i < e.material.length; i++) e.material[i].opacity = l * 0.8 + 0.2;
				else e.material.opacity = l * 0.8 + 0.2;
			}

			this.enemyManager.elements.forEach(setColor);
			this.enmBulletManager.elements.forEach(setColor);

			if (this.bosscoming) {
				if (this.boss.parent === null) {
					this.bosscoming = false;
					this.addEasing(new Easing(this.gauge_boss_h).add({opacity: 0}, bossHPGaugeFadeTime, Easing.LINEAR));
					this.bossdefeated = true;
				} else {
					this.gauge_boss_h.value = this.boss.hp;
				}
			}

			if (keyDown.Space) this.message.visible = false; // Space Key

			const changeToResultScreenMode = () => {
				this.addEasing(new Easing(this.resulttitle).add({opacity: 1, y: 0.17 * vh}, 100, Easing.LINEAR));
				this.addEasing(new Easing(this.resulttext).wait(350).add({opacity: 1, y: 0.3 * vh}, 100, Easing.LINEAR));
				if (this.message) this.message.visible = false;
				this.addEasing(new Easing(this.minimap).add({opacity: 0}, 650, Easing.LINEAR));

				if (this.stage !== 'arcade') for (let i = 0; i < goalraders.length; i++)
					this.addEasing(new Easing(this.goalraders[i]).add({opacity: 0}, 650, Easing.LINEAR));

				for (let i = 0; i < this.enemyManager.count; i++)
					this.addEasing(new Easing(this.minimap.getObject(this.enemyManager.get(i))).add({opacity: 0}, 650, Easing.LINEAR));
				for (let i = 0; i < 4; i++) this.addEasing(new Easing(this.direction[i]).add({opacity: 0}, 650, Easing.LINEAR));
				this.addEasing(new Easing(this.playerpos).add({opacity: 0}, 650, Easing.LINEAR));
				this.addEasing(new Easing(this.gauge_h).add({opacity: 0}, 650, Easing.LINEAR));
				this.addEasing(new Easing(this.gauge_e).add({opacity: 0}, 650, Easing.LINEAR));
				if (this.msgbox) this.addEasing(new Easing(this.msgbox).add({opacity: 0}, 650, Easing.LINEAR));
				this.addEasing(new Easing(this.mark).add({opacity: 0}, 650, Easing.LINEAR));
			}

			if (this.player.hp <= 0) {
				this.effectManager.explode(this.player.position, 10, 30);
				this.threeScene.remove(this.player);
				this.player = null;

				this.resulttext.text = 'Score: ' + Math.max(this.score, 0).toFixed(0)
					+ '\nKill: ' + this.enemyManager.deathcount + '(' + (this.enemyManager.deathcount / this.enemyManager.spawncount * 100).toFixed(1) + '%)'
				this.resulttitle.text = 'Game Over';
				changeToResultScreenMode();
			} else if (this.stage !== 'arcade' && goals[0].enable) {
				const v = get(Vector3).copy(Axis.z).applyQuaternion(this.quaternion);
				const p = get(Vector3).copy(this.position)
					.addScaledVector(v, -this.player.geometry.boundingBox.min.z +
					this.player.geometry.boundingBox.max.x);
				v.multiplyScalar(this.player.geometry.boundingBox.getSize().z -
					this.player.geometry.boundingBox.getSize().x);
				if (testCupsuleSphere(p, v, goals[0].position, this.player.geometry.boundingBox.max.x + goals[0].size / 2)) {
					if (goals.length === 1) {
						this.addEasing(new Easing(player).add({auto: 1}, 2000, Easing.LINEAR));
						const rate = '';
						this.score += this.rate[0] * player.hp / player.maxhp;
						if (this.score >= this.rate[3]) rate = 'Perfect';
						else if (this.score >= this.rate[2]) rate = 'Good';
						else if (this.score >= this.rate[1]) rate = 'Decent';
						else rate = 'Bad';
						this.resulttext.text = 'Score: ' + Math.max(this.score, 0).toFixed(0)
							+ (this.enemyManager.spawncount !== 0 ? '\nKill: ' + this.enemyManager.deathcount + '('
							+ (this.enemyManager.deathcount / this.enemyManager.spawncount * 100).toFixed(1) + '%)' : '')
							+ '\nLife: ' + (player.hp / player.maxhp * 100).toFixed(1) + '%'
							+ '\nRate: ' + rate;
						changeToResultScreenMode();
						this.goaled = true;
					} else {
						const currentMessage = goals[0].message;
						window.setTimeout(() => this.message.text = currentMessage, 1000);
						goals[0].parent.remove(goals[0]);
						goals.shift();
						goalraders[0].remove();
						goalraders.shift();
					}
				}
				free(v, p);
			}

			this.time += delta;
			if (this.time % 20000 < delta) this.score--;
		}


		function updateMessageBoxPlacement() {
			this.msgbox.position.x = 0.5 * vx * this.msgbox.live;
			this.msgbox.position.y = vh - 0.5 * vy * 0.3 * this.msgbox.live;
			this.msgbox.width = vw / 10 + vw / 1.3 * this.msgbox.live;
			this.msgbox.height = vh / 12 + vh / 8 * this.msgbox.live;
			this.message.position.x = 0.1 * vx * this.msgbox.live;
			this.message.position.y = vh - 0.5 * vy * 0.3 * this.msgbox.live;
		}
		if (this.stage !== 'arcade') {
			if (this.message.visible) {
				if (this.msgbox.live < 1) {
					this.msgbox.live = Math.min(this.msgbox.live + delta / 60, 1);
					updateMessageBoxPlacement();
				}
			} else if (this.msgbox.live > 0) {
				this.msgbox.live = Math.max(this.msgbox.live - delta / 60, 0);
				updateMessageBoxPlacement();
			}
		}
	}
	shakeScreen(amount) {
		const angle = Math.random() * Math.PI * 2;
		this.camera.position.x += Math.sin(angle) * amount;
		this.camera.position.z += Math.cos(angle) * amount;
	}
}
